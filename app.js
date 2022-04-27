
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
const FfmpegOverlay = require("./modules/ffmpegOverlay.js");
const FFplay = require('./modules/ffplay.js');
const { v4: uuidv4 } = require('uuid');

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
console.log("configDirectory is " + configFileOptions.configDirectory);
console.log("configFileName is " + configFileOptions.configFileName);

var configHandler = new ConfigHandler(configFileOptions, defaultConfig);

var objOptions = configHandler.config;


let logUtilHelper = new LogUtilHelper({
    appLogLevels: objOptions.appLogLevels,
    logEventHandler: null,
    logUnfilteredEventHandler: null,
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

var app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// all environments

var radarStalker2 = new RadarStalker2(objOptions.radarStalker2, logUtilHelper);
var batteryMonitor = new BatteryMonitor(objOptions.batteryMonitor, logUtilHelper);
var gpsMonitor = new GpsMonitor(objOptions.gpsMonitor, logUtilHelper);
var dataDisplay = new DataDisplay(objOptions.dataDisplay, logUtilHelper);
var ffmpegOverlay = new FfmpegOverlay(objOptions.ffmpegOverlay, logUtilHelper);
var radarDatabase = new RadarDatabase(objOptions.radarDatabase, logUtilHelper);

var commonData = {
    game: null,
    currentRadarSpeedData: null
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
app.use('/javascript/fontawesome', express.static(path.join(__dirname, 'node_modules', 'font-awesome')));
app.use('/javascript/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
app.use('/javascript/jquery', express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist')));
app.use('/javascript/moment', express.static(path.join(__dirname, 'node_modules', 'moment', 'min')));
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
    var connInfo = logUtilHelper.getRequestConnectionInfo(req);
    logUtilHelper.logRequestConnectionInfo(appLogName, "browser", "debug", req);
    //logUtilHelper.log(appLogName, "browser", 'debug',  "url:" + req.originalUrl + ", ip:" + connInfo.ip + ", port:" + connInfo.port + ", ua:" + connInfo.ua);
    next();
    return;
})

app.use(cookieParser());



var routes = express.Router();


/* GET home page. */
routes.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'public/index.htm'));
});

routes.get('/data/teams', function (req, res) {
    radarDatabase.team_getAll(function (err, response) {
        if (err) {
            res.json(500, {err:err})
        } else {
            res.json(response);
        }
    })  
});

routes.put('/data/team', function (req, res) {
    radarDatabase.team_upsert(req.body, function (err, response) {
        if (err) {
            res.json(500, { err: err })
        } else {
            res.json(response);
        }
    })
});

routes.put('/data/uuidv4', function (req, res) {
    
    res.json({ id: uuidv4()});
    
    
});


routes.put('/data/scoregame', function (req, res) {
    var game = req.body;

    //radarDatabase.game_upsert(game, function (err, response) {
    //    if (err) {
    //        res.json(500, { err: err })
    //    } else {
            
    //        res.json(response);
    //    }
    //})
    commonData.game = game;
    updateOverlayText();
    io.emit("gameChanged", { cmd: "scoreGame", data: { game: commonData.game } });
    res.json({ game: commonData.game });
    
});

routes.get('/data/games', function (req, res) {
    radarDatabase.game_getAll(function (err, response) {
        if (err) {
            res.json(500, { err: err })
        } else {
            res.json(response);
        }
    })
});

routes.get('/data/game', function (req, res) {
    res.json(commonData.game);
});

routes.get('/data/audioFiles/walkup', function (req, res) {

    const directoryPath = path.join(__dirname, "data/audioFiles/walkup")
    let walkupFiles = [];
    fs.readdir(directoryPath, function (err, files) {
        if (err) {
            console.log("Error getting walkup directory information.");
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
    
    
});

routes.get('/data/game/:id', function (req, res) {
    //res.json(commonData.game);
    radarDatabase.game_get(req.params.id, function (err, response) {
        if (err) {
            res.json(500, { err: err })
        } else {
            res.json(response);
        }
    })
});

routes.put('/data/game', function (req, res) {
    radarDatabase.game_upsert(req.body, function (err, response) {
        if (err) {
            res.json(500, { err: err })
        } else {
            res.json(response);
        }
    })
});


routes.put('/data/team', function (req, res) {
    radarDatabase.team_upsert(req.body, function (err, response) {
        if (err) {
            res.json(500, { err: err })
        } else {
            res.json(response);
        }
    })
});


var updateOverlayText = function () {
    try {
        var OverlayText = ""
        if (commonData.game) {

            let homeTeamName = "Home";
            if (commonData.game && commonData.game.home && commonData.game.home.team && commonData.game.home.team.name) {
                homeTeamName = commonData.game.home.team.shortName
            }
            if (commonData.game.score && commonData.game.score.home) {
                OverlayText += homeTeamName.padStart(12) + ": " + commonData.game.score.home.toString().padStart(2);
            }


            if (commonData.game.pitcher) {
                OverlayText += "   P: "
                var pitcherName = " ";
                if (commonData.game.pitcher.player) {
                    pitcherName = "#" + commonData.game.pitcher.player.jerseyNumber + " " + commonData.game.pitcher.player.firstName + " " + commonData.game.pitcher.player.lastName;

                    if (pitcherName.length > 19) {
                        pitcherName = "#" + commonData.game.pitcher.player.jerseyNumber + " " + commonData.game.pitcher.player.firstName.substring(0, 1) + ".  " + commonData.game.pitcher.player.lastName;
                    }
                    if (pitcherName.length > 19) {
                        pitcherName = ("#" + commonData.game.pitcher.player.jerseyNumber + " " + commonData.game.pitcher.player.lastName).substring(0, 19);
                    }
                }
                //need checks to ControlLength pad and truncate
                OverlayText += pitcherName.padEnd(19);
            } else {
                OverlayText += " ".padEnd(22);
            }
        }

        if (commonData.currentRadarSpeedData) {
            OverlayText += " PV: " + commonData.currentRadarSpeedData.inMaxSpeed.toFixed(1).toString().padStart(4, "0") + " MPH   "
        } else {
            OverlayText += " PV: 00.0 MPH   "
        }

        if (commonData.game) {
           

            if (commonData.game.outs) {
                OverlayText += " O: " + commonData.game.outs.toString();
            }

            if (commonData.game.balls !== undefined && commonData.game.balls !== null) {
                OverlayText += " B: " + commonData.game.balls;
            }

            if (commonData.game.strikes !== undefined && commonData.game.strikes !== null) {
                OverlayText += " S: " + commonData.game.strikes;
            } 
            
        }
        
        if (commonData.game) {
            
            
            
            OverlayText += "\n";

            let guestTeamName = "Guest";
            if (commonData.game && commonData.game.guest && commonData.game.guest.team && commonData.game.guest.team.name) {
                guestTeamName = commonData.game.guest.team.shortName;
            }
            if (commonData.game.score && commonData.game.score.home) {
                OverlayText += guestTeamName.padStart(12) + ": " + commonData.game.score.guest.toString().padStart(2);
            }

            if (commonData.game.batter ) {
                OverlayText += "   B: ";
                var batterName = "";
                if (commonData.game.batter.player) {
                    batterName =  "#" + commonData.game.batter.player.jerseyNumber + " " + commonData.game.batter.player.firstName + " " + commonData.game.batter.player.lastName;

                    //need checks to ControlLength pad and truncate
                    if (batterName.length > 19) {
                        batterName = "#" + commonData.game.batter.player.jerseyNumber + " " + commonData.game.batter.player.firstName.substring(0, 1) + ".  " + commonData.game.batter.player.lastName;
                    }
                    if (batterName.length > 19) {
                        batterName = ("#" + commonData.game.batter.player.jerseyNumber + " " + commonData.game.batter.player.lastName).substring(0, 19);
                    }
                }

                OverlayText += batterName.padEnd(19);
            } else {
                OverlayText += " ".padEnd(22);
            }
        }
        if (commonData.currentRadarSpeedData) {
            OverlayText += " EV: " + commonData.currentRadarSpeedData.outMaxSpeed.toFixed(1).toString().padStart(4, "0") + " MPH   ";
        } else {
            OverlayText += " EV: 00.0 MPH   ";
        }
        if (commonData.game) {

            if (commonData.game.inning && commonData.game.inningPosition) {
                OverlayText += " I: " + commonData.game.inning.toString() + " " + commonData.game.inningPosition;
            }
        }


        logUtilHelper.log(appLogName, "app", "trace", "updateOverlayText", OverlayText);

        ffmpegOverlay.updateOverlayText(OverlayText);
    } catch (ex) {
        logUtilHelper.log(appLogName, "app", "error", "error updating Overlay text", ex);
        try {
            ffmpegOverlay.updateOverlayText("");
        } catch (ex2) {
            logUtilHelper.log(appLogName, "app", "error", "error blanking Overlay text", ex2)
        }
    }
}

app.use('/', routes);


var server = http.createServer(app).listen(app.get('port'), function(){
    logUtilHelper.log(appLogName, "app", "info", 'Express server listening on port ' + app.get('port'));
}); 


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
    io.emit("audio", { cmd: "audioPlayComplete", data: { audioFile: audioFile } });
}

var audioFilePlay = function (audioFilePath, audioFile, options) {

    if (audioFilePlayer !== null) {
        audioFilePlayer.stop();
        audioFilePlayer = null;
    }
    var audioFolderPath = path.join(__dirname, "data", audioFilePath);
    audioFilePlayer = new FFplay(audioFolderPath, audioFile.fileName, options);

    audioFilePlayer.on("stopped", playAudioFileComplete);

}
var audioFileStop = function () {
    if (audioFilePlayer !== null) {
        audioFilePlayer.stop();
        audioFilePlayer = null;
    }
}

var io = require('socket.io')(server, {allowEIO3: true});



var sendToSocketClients = function (cmd, message, includeArduino){
    if (io) {

    }
}




io.on('connection', function(socket) {
    //logUtilHelper.log(appLogName, "socketio", "info", "socket.io client Connection");
    logUtilHelper.logSocketConnection (appLogName, "socketio", "info",  socket, "socket.io client Connection" );
    socket.on('radarConfigCommand', function(data) {
        logUtilHelper.log(appLogName, "socketio", "debug",'radarConfigCommand:' + data.cmd + ', value:' + data.data + ', client id:' + socket.id);
        radarStalker2.radarConfigCommand({ data: data, socket: socket });
    });
    socket.on('radarEmulatorCommand', function(data) {
        logUtilHelper.log(appLogName, "socketio", "debug",'radarEmulatorCommand:' + data.cmd + ', value:' + data.data + ', client id:' + socket.id);
        radarStalker2.radarEmulatorCommand({ data: data, socket: socket });
    });


    socket.on('stream', function (message) {
        logUtilHelper.log(appLogName, "socketio", "debug",'stream:' + message.cmd + ', client id:' + socket.id);
        switch (message.cmd) {
            case "start":
                ffmpegOverlay.streamStart();
                break;
            case "stop":
                ffmpegOverlay.streamStop();
                break;
            case "startRemote":
                io.emit('stream', message);
                break;
            case "stopRemote":
                io.emit('stream', message);
                break;
        }

    });

    

    socket.on("audio", function (message) {
        //audioFile: audioFile

        logUtilHelper.log(appLogName, "socketio", "debug", 'audio:' + ', message:' + message + ', client id:' + socket.id);
        try {
            switch (message.cmd) {
                case "audioFilePlay":
                    audioFilePlay("", message.data.audioFile);
                    break;
                case "audioFilePlayWalkup":
                    audioFilePlay("audioFiles/walkup", message.data.audioFile, ['-nodisp', '-autoexit', '-af', 'afade=t=in:st=0:d=5,afade=t=out:st=10:d=5'])
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
                io.emit("gameChanged", { cmd: "gameChanged", data: message.data });      //use io to send it to everyone
                updateOverlayText();
                break;


            //case "inningChange":
            //    commonData.game.inning = message.data.inning;
            //    commonData.gameIsDirty = true;
            //    io.emit("gameChanged", { cmd: "inningChanged", data: { inning: commonData.game.inning } });      //use io to send it to everyone
            //    updateOverlayText();
            //    break;
            //case "inningPositionChange":
            //    commonData.game.inningPosition = message.data.inningPosition;
            //    commonData.gameIsDirty = true;
            //    io.emit("gameChanged", { cmd: "inningPositionChanged", data: { inningPosition: commonData.game.inningPosition } });      //use io to send it to everyone
            //    updateOverlayText();
            //    break;
            //case "homeScoreChange":
            //    if (commonData.game.score === undefined) {
            //        commonData.game.score = {};
            //    }
            //    commonData.game.score.home = message.data.score.home;
            //    commonData.gameIsDirty = true;
            //    io.emit("gameChanged", { cmd: "homeScoreChanged", data: { score: { home: commonData.game.score.home } } });      //use io to send it to everyone
            //    updateOverlayText();
            //    break;
            //case "guestScoreChange":
            //    if (commonData.game.score === undefined) {
            //        commonData.game.score = {};
            //    }
            //    commonData.game.score.guest = message.data.score.guest;
            //    commonData.gameIsDirty = true;
            //    io.emit("gameChanged", { cmd: "guestScoreChanged", data: { score: { guest: commonData.game.score.guest } } });      //use io to send it to everyone
            //    updateOverlayText();
            //    break;
            //case "outsChange":
            //    commonData.game.outs = message.data.outs;
            //    commonData.gameIsDirty = true;
            //    io.emit("gameChanged", { cmd: "outsChanged", data: { outs: commonData.game.outs } });      //use io to send it to everyone
            //    updateOverlayText();
            //    break;
            //case "strikesChange":
            //    commonData.game.strikes = message.data.strikes;
            //    commonData.gameIsDirty = true;
            //    io.emit("gameChanged", { cmd: "strikesChanged", data: { strikes: commonData.game.strikes } });      //use io to send it to everyone
            //    updateOverlayText();
            //    break;
            //case "ballsChange":
            //    commonData.game.balls = message.data.balls;
            //    commonData.gameIsDirty = true;
            //    io.emit("gameChanged", { cmd: "ballsChanged", data: { balls: commonData.game.balls } });      //use io to send it to everyone
            //    updateOverlayText();
            //    break;
            //case "pitcherChange":
            //    commonData.game.pitcher = message.data.pitcher;
            //    commonData.gameIsDirty = true;
            //    io.emit("gameChanged", { cmd: "pitcherChanged", data: { pitcher: commonData.game.pitcher } });      //use io to send it to everyone
            //    //radarStalker2.pitcher({ data: data.pitcher, socket: socket });
            //    updateOverlayText();
            //    break;
            //case "batterChange":
            //    commonData.game.batter = message.data.batter;
            //    commonData.gameIsDirty = true;
            //    io.emit("gameChanged", { cmd: "batterChanged", data: { batter: commonData.game.batter } });      //use io to send it to everyone
            //    //radarStalker2.batter({ data: data.batter, socket: socket });
            //    updateOverlayText();
            //    break;
            
        }

        //updateOverlayText();
        
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


    

    //socket.on("startStream", function (data) {
    //    ffmpegOverlay.startStream();
    //})
    //socket.on("stopStream", function (data) {
    //    ffmpegOverlay.stopStream();
    //})


    //socket.on("startRemoteStream", function (data) {
    //    io.emit('startRemoteStream', data);
    //})
    //socket.on("stopRemoteStream", function (data) {
    //    io.emit('stopRemoteStream', data);
    //})


    if (socket.client.request.headers["origin"] !== "ArduinoSocketIo") {
        //send the current Config to the new client Connections
        socket.emit('radarConfig', radarStalker2.getRadarConfig());
        socket.emit('softwareConfig', radarStalker2.getSoftwareConfig());
        socket.emit('radarSpeedDataHistory', radarStalker2.getradarSpeedDataHistory());
        socket.emit('gameChanged', {cmd:"gameChanged", data:commonData.game});
    }
    //send the current Battery Voltage
    socket.emit('batteryVoltage', batteryMonitor.getBatteryVoltage());
    //console.log("gpsState", gpsMonitor.getGpsState())

    
});

radarStalker2.on('radarSpeed', function (data) {
    if (commonData.game) {
        data.pitcher = commonData.game.pitcher;
        data.batter = commonData.game.batter;
        if (commonData.game.log === undefined) {
            commonData.game.log = [];
        }
        commonData.game.log.push(JSON.parse(JSON.stringify(data)));
        commonData.gameIsDirty = true;
    }    
    dataDisplay.updateSpeedData(data);
    io.emit('radarSpeed', data);
    commonData.currentRadarSpeedData = data;
    updateOverlayText();
});
radarStalker2.on('radarTimeout', function (data) {
    io.emit('radarTimeout', data);
});
radarStalker2.on('radarCommand',function(data){
    io.emit('radarCommand', data);
});

radarStalker2.on('softwareCommand', function (data) {
    io.emit('softwareCommand', data);
});

radarStalker2.on('radarConfigProperty', function (data) {
    io.emit('radarConfigProperty', data);
});
radarStalker2.on('softwareConfigProperty', function (data) {
    io.emit('softwareConfigProperty', data);
});

batteryMonitor.on("batteryVoltage",function(data){
    io.emit("batteryVoltage", data)
})


//io.route('radarSpeed', function(req) {
//    logUtilHelper.log(appLogName, "socketio", "debug",'radarSpeed Connection');
//    req.io.emit('connected', {
//        message: 'Connected to Server'
//    })
//})

// command is the Comm
    

   

