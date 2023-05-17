
'use strict';
const defaultConfig = require('./config/defaultConfig.json');
const appLogName = "radarMonitor"
const express = require('express');
const extend = require('extend');
const http = require('http');
const path = require('path');
const favicon = require('serve-favicon');
const ConfigHandler = require("@andrewiski/confighandler");
const LogUtilHelper = require("@andrewiski/logutilhelper");
const cookieParser = require('cookie-parser');
const fs = require('fs');

const RadarStalker2 = require("./modules/radarStalker2.js");
const BatteryMonitor = require("./modules/batteryMonitor.js");
const GpsMonitor = require("./modules/gpsMonitor.js");
const DataDisplay = require("./modules/dataDisplay.js");
const RadarDatabase = require("./modules/radarDatabase.js");
//const FfmpegOverlay = require("./modules/ffmpegOverlay.js");
const FfmpegRtmp = require("./modules/ffmpegRtmp.js");
const FfmpegVideoInput = require("./modules/ffmpegVideoInput.js");
const VideoOverlayParser = require("./modules/videoOverlayParser.js");
const FFplay = require('./modules/ffplay.js');
const { v4: uuidv4 } = require('uuid');
const common = require('mongodb/lib/bulk/common');
const { re } = require('mathjs');

var configFileOptions = {
    "configDirectory": "config",
    "configFileName": "config.json"
}

var localDebug = false;
if (process.env.LOCALDEBUG === "true") {
    localDebug = true;
}
if (process.env.CONFIGDIRECTORY) {
    configFileOptions.configDirectory =process.env.CONFIGDIRECTORY;
}
if (process.env.CONFIGFILENAME) {
    configFileOptions.configFileName =process.env.CONFIGFILENAME;
}
if (process.env.DATADIRECTORY) {
    defaultConfig.dataDirectory =process.env.DATADIRECTORY;
}

if (process.env.LOGDIRECTORY) {
    defaultConfig.logDirectory =process.env.LOGDIRECTORY;
}


if (defaultConfig.deviceId === undefined || defaultConfig.deviceId === '') {
    defaultConfig.deviceId = uuidv4();
}

console.log("configDirectory is " + configFileOptions.configDirectory);
console.log("configFileName is " + configFileOptions.configFileName);

var configHandler = new ConfigHandler(configFileOptions, defaultConfig);

var objOptions = configHandler.config;
console.log("Data Directory is " + objOptions.dataDirectory);
console.log("Log Directory is " + objOptions.logDirectory);


var logUnfilteredEventHandler = function(logdata){
    try{
        //This gets called on every log event even if AppLogLevels specificaly stop it so webBrowsers clients can view trace events
        //console.log("logUnfilteredEventHandler", logdata);
        if(sendToSubscribedSocketClients){
            sendToSubscribedSocketClients("serverLogs", "liveLog", logdata);
        }
    }catch(ex){
        try{
            logUtilHelper.log(appLogName, "app", "error", "logUnfilteredEventHandler", ex);
        }catch(ex){
            console.log("error","logUnfilteredEventHandler", ex);
        }
    }
}


let logUtilHelper = new LogUtilHelper({
    appLogLevels: objOptions.appLogLevels,
    logEventHandler: null,
    logUnfilteredEventHandler: logUnfilteredEventHandler,
    logFolder: objOptions.logDirectory,
    logName: appLogName,
    debugUtilEnabled: (process.env.DEBUG ? true : undefined) || false,
    debugUtilName:appLogName,
    debugUtilUseUtilName: false,
    debugUtilUseAppName: true,
    debugUtilUseAppSubName: false,
    includeErrorStackTrace: localDebug,
    logToFile: !localDebug,
    logToFileLogLevel: objOptions.logLevel,
    logToMemoryObject: true,
    logToMemoryObjectMaxLogLength: objOptions.maxLogLength,
    logSocketConnectionName: "socketIo",
    logRequestsName: "access"

})

if (configHandler.config.deviceId === undefined || configHandler.config.deviceId === '') {
    configHandler.config.deviceId = uuidv4();
    try {
        configHandler.configFileSave();
        logUtilHelper.log(appLogName, "app", "debug", 'deviceId Setting Saved');
    } catch (ex) {
        logUtilHelper.log(appLogName, "app", "error", 'Error Saving Config DeviceId', ex);
        console.log("Error Saving Config DeviceId " + ex.message);
    }
}
console.log("DeviceId " + configHandler.config.deviceId);

logUtilHelper.log(appLogName, "app", "info", "DeviceId " + configHandler.config.deviceId);
logUtilHelper.log(appLogName, "app", "info", "configDirectory is " + configFileOptions.configDirectory);
logUtilHelper.log(appLogName, "app", "info", "configFileName is " + configFileOptions.configFileName);
logUtilHelper.log(appLogName, "app", "info", "Data Directory is " + objOptions.dataDirectory);
logUtilHelper.log(appLogName, "app", "info", "Log Directory is " + objOptions.logDirectory);


var audioFileDirectory = path.join(objOptions.dataDirectory, "audioFiles");
var walkupAudioDirectory = path.join(audioFileDirectory, "walkup");
var fullSongAudioDirectory = path.join(audioFileDirectory, "fullSongs");
var videoFileDirectory = path.join(objOptions.dataDirectory, "videos");
var app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// all environments

var radarStalker2 = new RadarStalker2(objOptions.radarStalker2, logUtilHelper);
var batteryMonitor = new BatteryMonitor(objOptions.batteryMonitor, logUtilHelper);
var gpsMonitor = new GpsMonitor(objOptions.gpsMonitor, logUtilHelper);
var dataDisplay = new DataDisplay(objOptions.dataDisplay, logUtilHelper);
//var ffmpegOverlay = new FfmpegOverlay(objOptions.ffmpegOverlay, logUtilHelper);
var videoOverlayParser = new VideoOverlayParser(objOptions.videoOverlayParser, logUtilHelper);
//var ffmpegVideoInput = new FfmpegVideoInput(objOptions.ffmpegVideoInput, videoOverlayParser, logUtilHelper);

var radarDatabase = new RadarDatabase(objOptions.radarDatabase, logUtilHelper, objOptions.dataDirectory);

var commonData = {
    game: null,
    currentRadarSpeedData: null,
    radar: {log:[]},
    videoStreamStats : {
        youtube: null,
        gamechanger: null,
        file: null
    },
    practiceMode: {
        pitcher: null,
        batter: null
    }
}

var privateData = {
    videoStreams : {
        youtube: null,
        gamechanger: null,
        file: null
    },
    subscribedSocketIOClients: {}
    
}

//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
  
//app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/javascript/angular', express.static(path.join(__dirname, 'node_modules', 'angular')));
app.use('/javascript/angular-route', express.static(path.join(__dirname, 'node_modules', 'angular-route')));
app.use('/javascript/angular-animate', express.static(path.join(__dirname, 'node_modules', 'angular-animate')));
app.use('/javascript/angular-ui-bootstrap', express.static(path.join(__dirname, 'node_modules', 'angular-ui-bootstrap', 'dist')));
app.use('/javascript/angular-ui-router', express.static(path.join(__dirname, 'node_modules', '@uirouter', 'angularjs', 'release')));
app.use('/javascript/angular-ui-switch', express.static(path.join(__dirname, 'node_modules', 'angular-ui-switch')));
app.use('/javascript/angular-ui-utils', express.static(path.join(__dirname, 'node_modules', 'angular-ui-utils', 'modules')));
app.use('/javascript/angular-sanitize', express.static(path.join(__dirname, 'node_modules', 'angular-sanitize')));
app.use('/javascript/angular-ui-event', express.static(path.join(__dirname, 'node_modules', 'angular-ui-event', 'dist')));
app.use('/javascript/angular-ui-date', express.static(path.join(__dirname, 'node_modules', 'angular-ui-date', 'dist')));
app.use('/javascript/angular-ui-select', express.static(path.join(__dirname, 'node_modules', 'ui-select', 'dist')));
// not needed already served up by io app.use('/javascript/socket.io', express.static(path.join(__dirname, 'node_modules', 'socket.io', 'node_modules', 'socket.io-client', 'dist')));
app.use('/javascript/fontawesome', express.static(path.join(__dirname, 'node_modules', '@fortawesome','fontawesome-free')));
app.use('/javascript/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
app.use('/javascript/jquery', express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist')));
app.use('/javascript/moment', express.static(path.join(__dirname, 'node_modules', 'moment', 'min')));
app.use('/javascript/jsoneditor', express.static(path.join(__dirname, 'node_modules', 'jsoneditor', 'dist')));
//app.use('/javascript/bootstrap-table', express.static(path.join(__dirname, 'node_modules', 'bootstrap-table', 'dist')));
//app.use('/javascript/dragtable', express.static(path.join(__dirname, 'node_modules', 'dragtable')));
//app.use('/javascript/jquery-ui', express.static(path.join(__dirname, 'node_modules', 'jquery-ui', 'ui')));
// development only

app.set('port', objOptions.webserverPort);

app.use(favicon(__dirname + '/public/favicon.ico'));
//app.use(logger('dev'));

//app.use(logger.express);
//app.use(express.json());
//app.use(express.urlencoded({ extended: false }));
app.use(function (req, res, next) {
    try{
    var connInfo = logUtilHelper.getRequestConnectionInfo(req);
    logUtilHelper.logRequestConnectionInfo(appLogName, "browser", "debug", req);
    //logUtilHelper.log(appLogName, "browser", 'debug',  "url:" + req.originalUrl + ", ip:" + connInfo.ip + ", port:" + connInfo.port + ", ua:" + connInfo.ua);
    next();
    return;
    }catch(err){
        logUtilHelper.log(appLogName, "browser", "error", "Error logging request connection info.", err);
        next();
    }
})

app.use(cookieParser());



var routes = express.Router();


/* GET home page. */
routes.get('/', function (req, res) {
    try{
        res.sendFile(path.join(__dirname, 'public/index.htm'));
    }catch(err){
        logUtilHelper.log(appLogName, "browser", "error", "Error getting index.htm.", err);
        res.json(500, { err: err });
    }
});

routes.get('/data/teams', function (req, res) {
    try{
        radarDatabase.team_getAll(function (err, response) {
            if (err) {
                res.json(500, {err:err})
            } else {
                res.json(response);
            }
        })  
    }catch(err){
        logUtilHelper.log(appLogName, "browser", "error", "Error getting teams.", err);
        res.json(500, { err: err });
    }
});

routes.put('/data/team', function (req, res) {
    try{
        radarDatabase.team_upsert(req.body, function (err, response) {
            if (err) {
                res.json(500, { err: err })
            } else {
                res.json(response);
            }
        })
    }catch(err){
        logUtilHelper.log(appLogName, "browser", "error", "Error upserting team.", err);
        res.json(500, { err: err });
    }
});

routes.delete('/data/team/:id', function (req, res) {
    try{
        radarDatabase.team_delete(req.params.id, function (err, response) {
            if (err) {
                res.json(500, { err: err })
            } else {
                res.json(response);
            }
        })
    }catch(err){
        logUtilHelper.log(appLogName, "browser", "error", "Error deleting team.", err);
        res.json(500, { err: err });
    }
});

routes.put('/data/uuidv4', function (req, res) {
    try{
        res.json({ id: uuidv4()});
    }catch(err){    
        logUtilHelper.log(appLogName, "browser", "error", "Error generating uuidv4.", err);
        res.json(500, { err: err });
    }
    
    
});


routes.put('/data/scoregame', function (req, res) {
    try{
        var game = req.body;

        //radarDatabase.game_upsert(game, function (err, response) {
        //    if (err) {
        //        res.json(500, { err: err })
        //    } else {
                
        //        res.json(response);
        //    }
        //})
        commonData.game = game;
        updateOverlays({gameData:commonData.game, radarData:commonData.currentRadarSpeedData});
        io.emit("gameChanged", { cmd: "scoreGame", data: { game: commonData.game } });
        res.json({ game: commonData.game });
    } catch (err) {
        logUtilHelper.log(appLogName, "browser", "error", "Error scoring game.", err);
        res.json(500, { err: err });
    }
    
});

routes.get('/data/games', function (req, res) {
    try{
        radarDatabase.game_getAll(function (err, response) {
            if (err) {
                res.json(500, { err: err })
            } else {
                res.json(response);
            }
        })
    } catch (err) {
        logUtilHelper.log(appLogName, "browser", "error", "Error getting games.", err);
        res.json(500, { err: err })
    }
});

routes.get('/data/game', function (req, res) {
    try{
        res.json(commonData.game);
    } catch (err) {
        res.json(500, { err: err })
    }
});

routes.get('/data/audioFiles/walkup', function (req, res) {
    try{
        let walkupFiles = [];
        fs.readdir(walkupAudioDirectory, function (err, files) {
            if (err) {
                logUtilHelper.log(appLogName, "browser", "error", "Error getting walkup directory information.", walkupAudioDirectory);
            } else {
                files.forEach(function (file) {
                    //console.log(file);
                    if (path.extname(file) !== ".txt") {
                        walkupFiles.push({ fileName: file });
                    }
                })
                res.json(walkupFiles);
            }
        })
    } catch (err) {
        logUtilHelper.log(appLogName, "browser", "error", "Error getting walkup directory information.", walkupAudioDirectory);
        res.json(500, { err: err });
    }
});

routes.get('/data/audioFiles/fullSongs', function (req, res) {
    try{
        let fullsongFiles = [];
        fs.readdir(fullSongAudioDirectory, function (err, files) {
            if (err) {
                logUtilHelper.log(appLogName, "browser", "error", "Error getting audio directory information.", fullSongAudioDirectory);
            } else {
                files.forEach(function (file) {
                    //console.log(file);
                    if (path.extname(file) !== ".txt") {
                        fullsongFiles.push({ fileName: file });
                    }
                })
                res.json(fullsongFiles);
            }
        })   
    } catch (err) {
        logUtilHelper.log(appLogName, "browser", "error", "Error getting audio directory information.", fullSongAudioDirectory);
        res.json(500, { err: err });
    } 
});

routes.get('/data/audioFiles/fullSongs/:filename', (req, res) => {
    try {
        const filePath = `./data/audioFiles/fullSongs/${req.params.filename}`;
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        // Set the content-type header to indicate that this is an audio file
        res.setHeader('Content-Type', 'audio/mp4');

        // If a range header was provided, only send the requested portion of the file
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] 
                ? parseInt(parts[1], 10)
                : fileSize-1;
            const chunksize = (end-start)+1;
            const file = fs.createReadStream(filePath, {start, end});
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'audio/mp4',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // If no range header was provided, send the entire file
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'audio/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (err) {
        logUtilHelper.log(appLogName, "browser", "error", "Error getting audio file.", req.params.filename);
        res.sendStatus(500);
    }
  });

  routes.get('/data/audioFiles/walkup/:filename', (req, res) => {
    try{
        const filePath = `./data/audioFiles/walkup/${req.params.filename}`;
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        // Set the content-type header to indicate that this is an audio file
        res.setHeader('Content-Type', 'audio/mp4');

        // If a range header was provided, only send the requested portion of the file
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] 
                ? parseInt(parts[1], 10)
                : fileSize-1;
            const chunksize = (end-start)+1;
            const file = fs.createReadStream(filePath, {start, end});
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'audio/mp4',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // If no range header was provided, send the entire file
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'audio/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }
    }catch(err){
        logUtilHelper.log(appLogName, "browser", "error", "Error getting audio file.", filePath);
        res.json(500, { err: err });
    }

  });

routes.get('/data/videoFiles', function (req, res) {
    try{
        let videoFiles = [];
        fs.readdir(videoFileDirectory, function (err, files) {
            if (err) {
                logUtilHelper.log(appLogName, "browser", "error", "Error getting avideo directory information.", videoFileDirectory);
            } else {
                files.forEach(function (file) {
                    //console.log(file);
                    if (path.extname(file) !== ".txt") {
                        videoFiles.push({ fileName: file });
                    }
                })
                res.json(videoFiles);
            }
        })
    }catch(err){
        logUtilHelper.log(appLogName, "browser", "error", "Error getting video directory information.", videoFileDirectory);
        res.json(500, { err: err });
    } 
});



routes.get('/data/game/:id', function (req, res) {
    try{
    //res.json(commonData.game);
        radarDatabase.game_get(req.params.id, function (err, response) {
            if (err) {
                res.json(500, { err: err })
            } else {
                res.json(response);
            }
        })
    }catch(err){
        logUtilHelper.log(appLogName, "browser", "error", "Error getting game.", err);
        res.json(500, { err: err })
    }
});

routes.put('/data/game', function (req, res) {
    try{
        radarDatabase.game_upsert(req.body, function (err, response) {
            if (err) {
                res.json(500, { err: err })
            } else {
                res.json(response);
            }
        })
    }catch(err){
        logUtilHelper.log(appLogName, "browser", "error", "Error upserting game.", err);
        res.json(500, { err: err })
    }
});


routes.put('/data/team', function (req, res) {
    try{
        radarDatabase.team_upsert(req.body, function (err, response) {
            if (err) {
                res.json(500, { err: err })
            } else {
                res.json(response);
            }
        })
    }catch(err){
        logUtilHelper.log(appLogName, "browser", "error", "Error upserting team.", err);
        res.json(500, { err: err })
    }
});


routes.get('/data/settings/videostreams', function (req, res) {
    try{
        let response = {
            teamName: objOptions.videoStreams.teamName,
            opponentTeamName: objOptions.videoStreams.opponentTeamName,
            youtubeRtspUrl: objOptions.videoStreams.youtube.input,
            youtubeRtmpUrl: objOptions.videoStreams.youtube.rtmpUrl,
            gamechangerRtspUrl: objOptions.videoStreams.gamechanger.input,
            gamechangerRtmpUrl: objOptions.videoStreams.gamechanger.rtmpUrl,
            fileRtspUrl: objOptions.videoStreams.file.input
        }
        res.json(response);
    }catch(err){
        logUtilHelper.log(appLogName, "browser", "error", "Error getting video stream settings.", err);
        res.json(500, { err: err })
    }
});

routes.get("/data/appLogLevels", function (req, res) {
    res.json(logUtilHelper.options.appLogLevels);
});

routes.get("/data/serverLogs", function (req, res) {
    res.json(logUtilHelper.memoryData.logs);
});



app.use('/', routes);


var server = http.createServer(app).listen(app.get('port'), function(){
    logUtilHelper.log(appLogName, "app", "info", 'Express server listening on port ' + app.get('port'));
}); 


var updateOverlays = function (data) {
    //updateOverlays({gameData: commonData.game, radarData: commonData.currentRadarSpeedData});
    try{
        if(privateData.videoStreams.youtube != null){
            privateData.videoStreams.youtube.updateOverlay();
        }
        if(privateData.videoStreams.gamechanger != null){
            privateData.videoStreams.gamechanger.updateOverlay();
        }
        if(privateData.videoStreams.file != null){
            privateData.videoStreams.file.updateOverlay();
        }
    }catch(ex){
        logUtilHelper.log(appLogName, "app", "error", "Error updating overlays.", ex);
    }
}

let periodicTimer = null;
const periodicTimerInterval = 60000;

var periodicTimerEvent = function () {
    if (commonData.gameIsDirty) {
        radarDatabase.game_upsert(commonData.game);
        commonData.gameIsDirty = false;
    }
}

var StartPeriodicTimerEvent = function () {
    if (periodicTimer !== null) {
        clearTimeout(periodicTimer);
        periodicTimer = null
    }
    setTimeout(periodicTimerEvent, periodicTimerInterval )
}

var StopPeriodicTimerEvent = function () {
    if (periodicTimer !== null) {
        clearTimeout(periodicTimer);
        periodicTimer = null
    }
}

var audioFilePlayer = null;

var playAudioFileComplete = function (audioFile) {
    sendToSocketClients("audio", { cmd: "audioPlayComplete", data: { audioFile: audioFile } });
}

var audioFilePlay = function (audioFolder, audioFile, options) {
    try{
        if (audioFilePlayer !== null) {
            audioFilePlayer.stop();
            audioFilePlayer = null;
        }
        audioFilePlayer = new FFplay(audioFolder, audioFile.fileName, options, logUtilHelper);
        audioFilePlayer.on("stopped", playAudioFileComplete);
    }catch(ex){
        logUtilHelper.log(appLogName, "app", "error", "Error playing audio file.", ex);
    }

}
var audioFileStop = function () {
    try{
        if (audioFilePlayer !== null) {
            audioFilePlayer.stop();
            audioFilePlayer = null;
        }
    }catch(ex){
        logUtilHelper.log(appLogName, "app", "error", "Error stopping audio file.", ex);
    }
}

var videoStreamYoutubeStart = function (options) {
    
    try{
        logUtilHelper.log(appLogName, "app", "info",'videoStream', 'videoStreamYoutubeStart');           
        if(privateData.videoStreams.youtube ===null){
            privateData.videoStreams.youtube = new FfmpegRtmp(objOptions.videoStreams.youtube, videoOverlayParser, logUtilHelper);
            privateData.videoStreams.youtube.on("stopped", function(){
                logUtilHelper.log(appLogName, "app", "info",'videoStream', 'Youtube was Stopped');
                sendToSocketClients("videoStreams", { cmd: "youtubeStopped" });
            });
            privateData.videoStreams.youtube.on("started", function(){
                logUtilHelper.log(appLogName, "app", "info",'videoStream', 'Youtube was Started');
                sendToSocketClients("videoStreams", { cmd: "youtubeStarted" });
            });
            privateData.videoStreams.youtube.on("streamStats", function(data){
                //logUtilHelper.log(appLogName, "app", "debug",'videoStream', 'Youtube Stream Stats', data);
                //sendToVideoStreamSubscribedSocketClients("videoStreams", { cmd: "youtubeStreamStats", data: data });
                commonData.videoStreamStats.youtube = data;
                sendToSubscribedSocketClients("videoStreams", "videoStreams", { cmd: "youtubeStreamStats", data: data });
            });
        }
        
        if(options){
            let settingsUpdated = false;
            if(options.teamName != objOptions.videoStreams.teamName){
                objOptions.videoStreams.teamName = options.teamName;
                settingsUpdated = true;
            }
            if(options.opponetTeamName != objOptions.videoStreams.opponetTeamName){
                objOptions.videoStreams.opponetTeamName = options.opponetTeamName;
                settingsUpdated = true;
            }
            if(options.youtubeRtmpUrl != objOptions.videoStreams.youtube.rtmpUrl){
                objOptions.videoStreams.youtube.rtmpUrl = options.youtubeRtmpUrl;
                privateData.videoStreams.youtube.options.rtmpUrl = options.youtubeRtmpUrl;
                settingsUpdated = true;
            }
            if(settingsUpdated){
                sendToSocketClients("videoStreams", { cmd: "settingsUpdated", data: objOptions.videoStreams });
            }
        }
        privateData.videoStreams.youtube.streamStart();
    }catch(ex){
        logUtilHelper.log(appLogName, "app", "error", 'videoStream', 'videoStreamYoutubeStart', ex);           
    }
    
}
var videoStreamYoutubeStop = function () {
    try{
        logUtilHelper.log(appLogName, "app", "info",'videoStream',  'videoStreamYoutubeStop');           
        if(privateData.videoStreams.youtube !==null){
            privateData.videoStreams.youtube.streamStop();    
        }else{
            logUtilHelper.log(appLogName, "app", "warning",'videoStream',  'videoStreamYoutubeStop', 'videoStreams.youtube is null' );           
        }
        
    }catch(ex){
        logUtilHelper.log(appLogName, "app", "error", 'videoStream', 'videoStreamYoutubeStop', ex);           
    }
}

var videoStreamGamechangerStart = function (options) {
    try{
        logUtilHelper.log(appLogName, "app", "info",'videoStream',  'videoStreamGamechangerStart');           
        if(privateData.videoStreams.gamechanger ===null){
            privateData.videoStreams.gamechanger = new FfmpegRtmp(objOptions.videoStreams.gamechanger, videoOverlayParser, logUtilHelper);
            privateData.videoStreams.gamechanger.on("stopped", function(){
                logUtilHelper.log(appLogName, "app", "info",'videoStream', 'Gamechanger was Stopped');
                sendToSocketClients("videoStreams", { cmd: "gamechangerStopped" });
            });
            privateData.videoStreams.gamechanger.on("started", function(){
                logUtilHelper.log(appLogName, "app", "info",'videoStream', 'Gamechanger was Started');
                sendToSocketClients("videoStreams", { cmd: "gamechangerStarted" });
            });
            privateData.videoStreams.gamechanger.on("streamStats", function(data){
                //logUtilHelper.log(appLogName, "app", "debug",'videoStream', 'Gamechanger Stream Stats', data);
                commonData.videoStreamStats.gamechanger = data;
                sendToSubscribedSocketClients("videoStreams", "videoStreams", { cmd: "gamechangerStreamStats", data: data });
            });
        }
        if(options){
            let settingsUpdated = false;
            if(options.gameChangerRtmpUrl != objOptions.videoStreams.gamechanger.rtmpUrl){
                objOptions.videoStreams.gamechanger.rtmpUrl = options.gamechangerRtmpUrl;
                privateData.videoStreams.gamechanger.options.rtmpUrl = options.gamechangerRtmpUrl;
                settingsUpdated = true;
            }
            if(settingsUpdated){
                sendToSocketClients("videoStreams", { cmd: "settingsUpdated", data: objOptions.videoStreams });
            }
        }

        privateData.videoStreams.gamechanger.streamStart();
    }catch(ex){
        logUtilHelper.log(appLogName, "app", "error", 'videoStream', 'videoStreamGamechangerStart', ex);           
    }
}
var videoStreamGamechangerStop = function () {
    try{
        logUtilHelper.log(appLogName, "app", "info",'videoStream',  'videoStreamGamechangerStop');           
        if(privateData.videoStreams.gamechanger !==null){
            privateData.videoStreams.gamechanger.streamStop();    
        }else{
            logUtilHelper.log(appLogName, "app", "warning",'videoStream',  'videoStreamGameChangerStop', 'videoStreams.gamechanger is null' );           
        }
    }catch(ex){
        logUtilHelper.log(appLogName, "app", "error", 'videoStream', 'videoStreamGamechangerStop', ex);           
    }
}

var getDateFileName = function () {
    try{
        let objectDate = new Date();
        let hour = objectDate.getHours().toString();
        let minute = objectDate.getMinutes().toString();
        let day = objectDate.getDate().toString();
        let month = (objectDate.getMonth() + 1).toString();
        let year = objectDate.getFullYear().toString();
        if (day.length == 1){
            day = "0" + day;
        }
        if (month.length == 1){
            month = "0" + month;
        }
        if (hour.length == 1){
            hour = "0" + hour;
        }
        if (minute.length == 1){
            minute = "0" + minute;
        }
        return year + month + day + "T" + hour + minute;
    }catch(ex){
        logUtilHelper.log(appLogName, "app", "error", 'videoStream', 'getDateFileName', ex);           
        return "InvalidDateFileName"
    }
}

var videoStreamFileStart = function (options) {
    try{
        logUtilHelper.log(appLogName, "app", "info",'videoStream',  'videoStreamFileStart');  
                 
        if(privateData.videoStreams.file ===null){
            
            privateData.videoStreams.file = new FfmpegVideoInput(objOptions.videoStreams.file, videoOverlayParser, logUtilHelper);
            privateData.videoStreams.file.on("stopped", function(){
                logUtilHelper.log(appLogName, "app", "info",'videoStream', 'File was Stopped');
                sendToSocketClients("videoStreams", { cmd: "fileStopped" });
            });
            privateData.videoStreams.file.on("started", function(){
                logUtilHelper.log(appLogName, "app", "info",'videoStream', 'File was Started');
                sendToSocketClients("videoStreams", { cmd: "fileStarted" });
            });
            privateData.videoStreams.file.on("streamStats", function(data){
                //logUtilHelper.log(appLogName, "app", "debug",'videoStream', 'File Stream Stats', data);
                commonData.videoStreamStats.file = data;
                sendToSubscribedSocketClients("videoStreams", "videoStreams", { cmd: "fileStreamStats", data: data });
                
            });
        }
        if (options){
            var settingsUpdated = false;
            if(options.teamName != objOptions.videoStreams.teamName){
                objOptions.videoStreams.teamName = options.teamName;
                settingsUpdated = true;
            }
            if(options.opponentTeamName != objOptions.videoStreams.opponentTeamName){
                objOptions.videoStreams.opponentTeamName = options.opponentTeamName;
                settingsUpdated = true;
            }
            if(options.fileRtspUrl != objOptions.videoStreams.file.input){
                objOptions.videoStreams.file.input = options.fileRtspUrl;
                settingsUpdated = true;
            }
            if(settingsUpdated){
                sendToSocketClients("videoStreams", { cmd: "settingsUpdated", data: objOptions.videoStreams });
            }
            let fileName = getDateFileName() + "_" + objOptions.videoStreams.teamName.replace(/[^a-zA-Z0-9]/g,"_") + "_vs_" + objOptions.videoStreams.opponentTeamName.replace(/[^a-zA-Z0-9]/g,"_")  +  ".flv";
            fileName = path.join(objOptions.videoStreams.videosFolder, fileName);
            //objOptions.videoStreams.file.outputs.ffmpegVideoOutputFile.outputFile = fileName; 
            privateData.videoStreams.file.options.outputs.ffmpegVideoOutputFile.outputFile = fileName;
        }
        privateData.videoStreams.file.streamStart();
    }catch(ex){
        logUtilHelper.log(appLogName, "app", "error", 'videoStream', 'videoStreamFileStart', ex);           
    }
}
var videoStreamFileStop = function () {
    try{
        logUtilHelper.log(appLogName, "app", "debug",'videoStream',  'videoStreamFileStop');           
        if(privateData.videoStreams.file !==null){
            privateData.videoStreams.file.streamStop();    
        }else{
            logUtilHelper.log(appLogName, "app", "warning",'videoStream',  'videoStreamFileStop', 'videoStreams.file is null' );           
        }
    }catch(ex){
        logUtilHelper.log(appLogName, "app", "error", 'videoStream', 'videoStreamFileStop', ex);           
    }
}

var io = require('socket.io')(server, {allowEIO3: true});

var subscribeToSocketClient = function (socket, type, data) {
    try{
        if(privateData.subscribedSocketIOClients[type] === undefined){
            privateData.subscribedSocketIOClients[type] = {};
        }
        if(privateData.subscribedSocketIOClients[type][socket.id] === undefined){
            privateData.subscribedSocketIOClients[type][socket.id] = {
                socket:socket,
                timestamp: new Date(),
                data: data
            };
        }else{
            privateData.subscribedSocketIOClients[type][socket.id].timestamp = new Date();
            if(data){
                privateData.subscribedSocketIOClients[type][socket.id].data = data;
            }
        }
    }catch(ex){
        logUtilHelper.log(appLogName, "app", "error", 'subscribeToSocketClient', ex);
    }
}

var unsubscribeToSocketClient = function (socket, type) {
    try{
        if(privateData.subscribedSocketIOClients[type] === undefined){
            privateData.subscribedSocketIOClients[type] = {};
        }
        if(privateData.subscribedSocketIOClients[type][socket.id] !== undefined){
            delete privateData.subscribedSocketIOClients[type][socket.id];
        }
    }catch(ex){
        logUtilHelper.log(appLogName, "app", "error", 'unsubscribeToSocketClient', ex);
    }
}

var sendToSubscribedSocketClients = function(type, cmd, message){
    try{
        if(privateData.subscribedSocketIOClients[type] === undefined){
            privateData.subscribedSocketIOClients[type] = {};
        }
        var socketIds = Object.getOwnPropertyNames(privateData.subscribedSocketIOClients[type]);
        for(var i=0; i<socketIds.length; i++){
            var socketId = socketIds[i];
            var client = privateData.subscribedSocketIOClients[type][socketId];
            if(client.timestamp < new Date().getTime() - 1000 * 60 * 2){  //older then two minutes
                delete privateData.subscribedSocketIOClients[type][socketId];
            }else{
                if (client && client.socket && client.socket.connected){
                    switch(type){
                        case "serverLogs":
                            if(cmd === "liveLog"){
                                if(client.data && client.data.appLogLevels ){
                                    if(logUtilHelper.shouldLogAppLogLevels(client.data.appLogLevels, message.appName, message.appSubname, message.logLevel)===true){
                                        client.socket.emit('serverLogs', {cmd: "liveLog", data: message});
                                    }
                                }
                            }else{
                                client.socket.emit(cmd, message);
                            }
                            break;
                        default:
                            client.socket.emit(cmd, message);
                    }
                    
                }
            }
        }
    }catch(ex){
        logUtilHelper.log(appLogName, "app", "error", 'sendToSubscribedSocketClients', ex);
    }
}

var sendToSocketClients = function (cmd, message, includeArduino, excludeSocketId){
    try{
        if (io) {
            if (includeArduino===true){
                io.emit(cmd, message);
            }else{
                const sockets = io.fetchSockets().then(sockets => {
                    sockets.forEach(socket => {
                        if(excludeSocketId !== socket.id){
                            if(socket.client.request.headers["origin"] !== "ArduinoSocketIo"){
                                socket.emit(cmd, message);
                            }
                        }   
                    })
                })
            }
        }
    }catch(ex){
        logUtilHelper.log(appLogName, "app", "error", 'sendToSocketClients', ex);
    }
}

io.on('connection', function(socket) {
    try{
        //logUtilHelper.log(appLogName, "socketio", "info", "socket.io client Connection");
        logUtilHelper.logSocketConnection (appLogName, "socketio", "info",  socket, "socket.io client Connection" );

        socket.on('serverSubscribe', function(message) {
            try{
                logUtilHelper.log(appLogName, "socketio", "debug",'serverSubscribe', "cmd:" + message.cmd, "type:" + message.type, 'client id:' + socket.id);
                switch(message.cmd){
                    case "resubscribe":
                    case "subscribe":
                        subscribeToSocketClient(socket, message.type, message.data);
                        break;
                    case "unsubscribe":
                        unsubscribeToSocketClient(socket, message.type);
                        break;
                }
            }catch(ex){
                logUtilHelper.log(appLogName, "socketio", "error",'serverSubscribe', ex);
            }
        })

        socket.on('radarConfigCommand', function(data) {
            try{
                logUtilHelper.log(appLogName, "socketio", "debug",'radarConfigCommand:' + data.cmd + ', value:' + data.data + ', client id:' + socket.id);
                radarStalker2.radarConfigCommand({ data: data, socket: socket });
            }catch(ex){
                logUtilHelper.log(appLogName, "socketio", "error",'radarConfigCommand:', ex);
            }
        });
        socket.on('radarEmulatorCommand', function(data) {
            try{
                logUtilHelper.log(appLogName, "socketio", "debug",'radarEmulatorCommand:' + data.cmd + ', value:' + data.data + ', client id:' + socket.id);
                radarStalker2.radarEmulatorCommand({ data: data, socket: socket });
            }catch(ex){
                logUtilHelper.log(appLogName, "socketio", "error",'radarEmulatorCommand:', ex);
            }
        });


        socket.on('practiceMode', function (message) {
            try{
                logUtilHelper.log(appLogName, "socketio", "debug",'practiceMode:' + message.cmd + ', client id:' + socket.id);
                switch (message.cmd) {
                    case "pitcher":
                        commonData.practiceMode.pitcher = message.data.pitcher;
                        sendToSocketClients("practiceMode", { cmd: "pitcher", data: message.data }, true, socket.id); 
                        break;
                    case "batter":
                        commonData.practiceMode.batter = message.data.batter;
                        sendToSocketClients("practiceMode", { cmd: "batter", data: message.data }, true, socket.id); 
                        break;
                    
                }
            }catch(ex){
                logUtilHelper.log(appLogName, "socketio", "error",'practiceMode:', ex);
            }
        });


        socket.on('videoStream', function (message) {
            try{
                logUtilHelper.log(appLogName, "socketio", "debug",'videoStream:' + message.cmd + ', client id:' + socket.id);
                switch (message.cmd) {
                    case "start":
                        videoStreamYoutubeStart(message.data);
                        videoStreamGamechangerStart(message.data);
                        videoStreamFileStart(message.data);
                        break;
                    case "stop":
                        videoStreamYoutubeStop();
                        videoStreamGamechangerStop();
                        videoStreamFileStop();
                        break;
                    case "youtubeStart":
                        videoStreamYoutubeStart(message.data);
                        break;
                    case "youtubeStop":
                        videoStreamYoutubeStop();
                        break;
                    case "gamechangerStart":
                        videoStreamGamechangerStart(message.data);
                        break;
                    case "gamechangerStop":
                        videoStreamGamechangerStop();
                        break;
                    case "fileStart":
                        videoStreamFileStart(message.data);
                        break;
                    case "fileStop":
                        videoStreamFileStop();
                        break;
                    //Was used in cases where local CPU power not enough to encode so started encoding server side encoded and sent rtmp to distination
                    // case "startRemote":
                    //     io.emit('stream', message);
                    //     break;
                    // case "stopRemote":
                    //     io.emit('stream', message);
                    //     break;
                }
            }catch(ex){
                logUtilHelper.log(appLogName, "socketio", "error", 'videoStream', ex);
            }
        });
        socket.on("audio", function (message) {
            
            //audioFile: audioFile
            
            try {
                logUtilHelper.log(appLogName, "socketio", "debug", 'audio:' + ', message:' + message + ', client id:' + socket.id);
                switch (message.cmd) {
                    case "audioFileSaveFullSongPlaylist":
                        let fileStream = fs.createWriteStream(path.join(fullSongAudioDirectory, message.data.fileName),{flags:"w", encoding:"utf-8", autoClose:true, start:0})        
                        for(var i=0; i<message.data.audioFiles.length; i++){
                            let data = "file '" + message.data.audioFiles[i]  + "'\n";
                            fileStream.write(data);
                        }
                        fileStream.end();
                        fileStream.close();
                        break;
                    case "audioFilePlayFullSongPlaylist":
                        
                        if(message.data.loop === true){
                            //-safe 0 -autoexit -hide_banner -nodisp -f concat  -i data\audiofiles\fullsongs\playlist.txt
                            audioFilePlay(fullSongAudioDirectory, {fileName: message.data.fileName}, ['-hide_banner', '-nodisp', "-f", "concat", "-safe", "0", "-loop", "0" ]);
                        }else{
                            audioFilePlay(fullSongAudioDirectory, {fileName: message.data.fileName}, ['-hide_banner', '-nodisp', "-f", "concat", "-safe", "0", '-autoexit']);
                        }
                        break;
                    case "audioFilePlayFullSong":
                        audioFilePlay(fullSongAudioDirectory, message.data.audioFile, ['-hide_banner', '-nodisp', '-autoexit', '-af', 'afade=t=in:st=0:d=5']);
                        break;
                    case "audioFilePlayWalkup":
                        audioFilePlay(walkupAudioDirectory, message.data.audioFile, ['-hide_banner', '-nodisp', '-autoexit', '-af', 'afade=t=in:st=0:d=5,afade=t=out:st=10:d=5', "-t", "15"])
                        break;
                    case "audioFileStop":
                        audioFileStop();
                        break;
                }
            } catch (ex) {
                logUtilHelper.log(appLogName, "socketio", 'error', 'audio', ex);
            }
        });

        socket.on("resetRadarSettings", function (message) {
            logUtilHelper.log(appLogName, "socketio", "debug", 'resetRadarSettings:' + ', message:' + message + ', client id:' + socket.id);
            radarStalker2.resetRadarSettings();
        })

        socket.on("gameChange", function (message) {
            logUtilHelper.log(appLogName, "socketio", "debug", 'gameChange:' + ', message:' + message + ', client id:' + socket.id);
            if (commonData.game === null) {
                commonData.game = {};
            }
            switch (message.cmd) {
                case "gameChange":
                    if (message.data.inning !== undefined) {
                        commonData.game.inning = message.data.inning;
                    }
                    if (message.data.inningPosition !== undefined) {
                        commonData.game.inningPosition = message.data.inningPosition;
                    }
                    if (message.data.score !== undefined) {
                        if (commonData.game.score === undefined) {
                            commonData.game.score = {};
                        }
                        if (message.data.score.guest !== undefined) {
                            commonData.game.score.guest = message.data.score.guest;
                        }
                        if (message.data.score.home !== undefined) {
                            commonData.game.score.home = message.data.score.home;
                        }
                    }
                    if (message.data.guest !== undefined) {
                        if (commonData.game.guest === undefined) {
                            commonData.game.guest = {};
                        }
                        if (message.data.guest.team !== undefined) {
                            commonData.game.guest.team = message.data.guest.team;
                        }
                        if (message.data.guest.lineup !== undefined) {
                            commonData.game.guest.lineup = message.data.guest.lineup;
                        }
                        if (message.data.guest.batterIndex !== undefined) {
                            commonData.game.guest.batterIndex = message.data.guest.batterIndex;
                        }
                    }
                    if (message.data.home !== undefined) {
                        if (commonData.game.home === undefined) {
                            commonData.game.home = {};
                        }
                        if (message.data.home.team !== undefined) {
                            commonData.game.home.team = message.data.home.team;
                        }
                        if (message.data.home.lineup !== undefined) {
                            commonData.game.home.lineup = message.data.home.lineup;
                        }
                        if (message.data.home.batterIndex !== undefined) {
                            commonData.game.home.batterIndex = message.data.home.batterIndex;
                        }
                    }
                    if (message.data.outs !== undefined) {
                        commonData.game.outs = message.data.outs;
                    }
                    if (message.data.strikes !== undefined) {
                        commonData.game.strikes = message.data.strikes;
                    }
                    if (message.data.balls !== undefined) {
                        commonData.game.balls = message.data.balls;
                    }
                    if (message.data.pitcher !== undefined) {
                        commonData.game.pitcher = message.data.pitcher;
                    }
                    if (message.data.batter !== undefined) {
                        commonData.game.batter = message.data.batter;
                    }
                    commonData.gameIsDirty = true;
                    sendToSocketClients("gameChanged", { cmd: "gameChanged", data: message.data }, false, socket.id);      //use io to send it to everyone
                    updateOverlays({gameData: commonData.game, radarData: commonData.currentRadarSpeedData})
                    
                    break;
            }
            
        })

        //socket.on("pitcher", function (data) {
        //    debug('pitcher:'  + ', value:' + data.data + ', client id:' + socket.id);
        //    radarStalker2.pitcher({ data: data, socket: socket });
        //})

        //socket.on("batter", function (data) {
        //    debug('batter:' + data.cmd + ', value:' + data.data + ', client id:' + socket.id);
        //    radarStalker2.batter({ data: data, socket: socket });
        //})

        socket.on("pitch", function (message) {
            logUtilHelper.log(appLogName, "socketio", "debug", 'pitch:' + message.cmd + ', value:' + message.data + ', client id:' + socket.id);
            radarStalker2.pitch({ data: message, socket: socket });
        })

        socket.on('ping', function(data) {
            logUtilHelper.log(appLogName, "socketio", "debug", 'ping: client id:' + socket.id);
        });


        socket.on('config', function(message) {
            logUtilHelper.log(appLogName, "socketio", "debug", 'config:' + message.cmd + ' client id:' + socket.id);
            switch(message.cmd){
                case "get":
                    break;

            }
        });

        socket.on('serverLogs', function(message) {
            logUtilHelper.log(appLogName, "socketio", "debug", 'serverLogs:' + message.cmd + ' client id:' + socket.id);
            switch(message.cmd){
                case "getServerLogs":
                    socket.emit("serverLogs", {cmd:message.cmd, data: logUtilHelper.memoryData} )
                    break;
                case "getAppLogLevels":
                socket.emit("serverLogs", {cmd:message.cmd, data: logUtilHelper.getLogLevelAppLogLevels} );
                break;
                case "setAppLogLevels":
                    if(privateData.subscribedSocketIOClients.serverLogs === undefined){
                        privateData.subscribedSocketIOClients.serverLogs = {};
                    }
                    if(privateData.subscribedSocketIOClients.serverLogs[socket.id] !== undefined){
                        if(privateData.subscribedSocketIOClients.serverLogs[socket.id].data === undefined){
                            privateData.subscribedSocketIOClients.serverLogs[socket.id].data = {};
                        }
                        privateData.subscribedSocketIOClients.serverLogs[socket.id].data.appLogLevels =  message.data.appLogLevels;
                    }else{
                        privateData.subscribedSocketIOClients.serverLogs[socket.id] = {socket: socket, timestamp: new Date(), data: message.data};
                    }
                    break;
            }
            
            
        });

        if (socket.client.request.headers["origin"] !== "ArduinoSocketIo") {
            //send the current Config to the new client Connections
            socket.emit('radarConfig', radarStalker2.getRadarConfig());
            socket.emit('softwareConfig', radarStalker2.getSoftwareConfig());
            socket.emit('radarSpeedDataHistory', radarStalker2.getradarSpeedDataHistory());
            socket.emit('gameChanged', {cmd:"gameChanged", data:commonData.game});
            socket.emit('videoStreams', {cmd:"allStreamStats", data:commonData.videoStreamStats});
            
        }
        //send the current Battery Voltage
        socket.emit('batteryVoltage', batteryMonitor.getBatteryVoltage());
        //console.log("gpsState", gpsMonitor.getGpsState())
    }catch(ex){
        logUtilHelper.log(appLogName, "socketio", "error", "socketio.onConnection: " + ex);
    }
    
});

radarStalker2.on('radarSpeed', function (data) {
    try{
        if (commonData.game) {
            data.pitcher = commonData.game.pitcher.player;
            data.batter = commonData.game.batter.player;
            if (commonData.game.log === undefined) {
                commonData.game.log = [];
            }
            commonData.game.log.push(JSON.parse(JSON.stringify(data)));
            commonData.gameIsDirty = true;
        }else if(commonData.practiceMode){
            if(commonData.practiceMode.pitcher){
                data.pitcher = commonData.practiceMode.pitcher;
            }
            if(commonData.practiceMode.batter){
                data.batter = commonData.practiceMode.batter;
            }
        }  
        commonData.radar.log.push(JSON.parse(JSON.stringify(data)));
        if(commonData.radar.log.length>objOptions.maxRadarLogLength){
            commonData.radar.log.shift()
        } 
        dataDisplay.updateSpeedData(data);
        sendToSocketClients('radarSpeed', data,true);
        commonData.currentRadarSpeedData = data;
        logUtilHelper.log(appLogName, "app", "info", 'radarData', data);
        updateOverlays({gameData: commonData.game, radarData: commonData.currentRadarSpeedData});
    }catch(ex){
        logUtilHelper.log(appLogName, "socketio", "error", "radarStalker2.onRadarSpeed: " + ex);
    }
});
radarStalker2.on('radarTimeout', function (data) {
    sendToSocketClients('radarTimeout', data);
});
radarStalker2.on('radarCommand',function(data){
    sendToSocketClients('radarCommand', data);
});

radarStalker2.on('softwareCommand', function (data) {
    sendToSocketClients('softwareCommand', data);
});

radarStalker2.on('radarConfigProperty', function (data) {
    sendToSocketClients('radarConfigProperty', data);
});
radarStalker2.on('softwareConfigProperty', function (data) {
    sendToSocketClients('softwareConfigProperty', data);
});

batteryMonitor.on("batteryVoltage",function(data){
    sendToSocketClients("batteryVoltage", data)
})


//io.route('radarSpeed', function(req) {
//    logUtilHelper.log(appLogName, "socketio", "debug",'radarSpeed Connection');
//    req.io.emit('connected', {
//        message: 'Connected to Server'
//    })
//})

// command is the Comm
    

   

