
/**
 * Module dependencies.
 */

var express = require('express');
var extend = require('extend');
var http = require('http');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
//var bodyParser = require('body-parser');
var nconf = require('nconf');

var debug = require('debug')('app');
var RadarStalker2 = require("./modules/radarStalker2.js");
var BatteryMonitor = require("./modules/batteryMonitor.js");
var GpsMonitor = require("./modules/gpsMonitor.js");
var DataDisplay = require("./modules/dataDisplay.js");
var RadarDatabase = require("./modules/radarDatabase.js");
var FfmpegOverlay = require("./modules/ffmpegOverlay.js");
const uuidv4 = require('uuid/v4');
nconf.file('./configs/radarGunMonitorConfig.json');
var configFileSettings = nconf.get();
var defaultOptions = {
    //loaded from the config file
};

var objOptions = extend({}, defaultOptions, configFileSettings);
var app = express();
// all environments

var radarStalker2 = new RadarStalker2({});
var batteryMonitor = new BatteryMonitor({});
var gpsMonitor = new GpsMonitor({});
var dataDisplay = new DataDisplay({});
var ffmpegOverlay = new FfmpegOverlay({});
var radarDatabase = new RadarDatabase({});;



var commonData = {
    game: {},
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
if (process.platform === 'win32') {
    app.set('port', objOptions.win32WebserverPort);
    //app.use(express.favicon());
   // app.use(express.logger('dev'));
    //app.use(express.json());
    //app.use(express.urlencoded());
    //app.use(express.methodOverride());
    //app.use(app.router);
    //app.use(express.errorHandler());
} else {
    app.set('port', objOptions.webserverPort);
    //boneScript = require('bonescript');
    //boneScript.getPlatform(function (x) {
    //    console.log('bonescript getPlatform');
    //    console.log('name = ' + x.name);
    //    console.log('bonescript = ' + x.bonescript);
    //    console.log('serialNumber = ' + x.serialNumber);
    //    console.log('dogtag = ' + x.dogtag);
    //    console.log('os = ', x.os);
    //});
}
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

var routes = express.Router();


/* GET home page. */
routes.get('/', function (req, res) {
    req.sendfile(path.join(__dirname, 'public/index.htm'));
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

    radarDatabase.game_upsert(game, function (err, response) {
        if (err) {
            res.json(500, { err: err })
        } else {
            commonData.game = game;
            res.json(response);
        }
    })
    io.emit("gameChanged", { cmd: "scoreGame", data: { game: commonData.game } });
    
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
            if (commonData.game.pitcher) {
                OverlayText = "P: "
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
            OverlayText += " PV: " + commonData.currentRadarSpeedData.inMaxSpeed.toFixed(1).toString().padStart(4, "0") + " MPH"
        } else {
            OverlayText += " PV: 00.0 MPH"
        }
        if (commonData.game) {
            let homeTeamName = "Home";
            if (commonData.game && commonData.game.home && commonData.game.home.team && commonData.game.home.team.name) {
                homeTeamName = commonData.game.home.team.shortName
            }
            if (commonData.game.score && commonData.game.score.home) {
                OverlayText += homeTeamName.padStart(16) + ": " + commonData.game.score.home.toString().padStart(2);
            }
            if (commonData.game.outs) {
                OverlayText += " Outs: " + commonData.game.outs.toString();
            }
            if (commonData.game.balls && commonData.game.strikes) {
                OverlayText += " B-S: " + commonData.game.balls + "-" + commonData.game.strikes;
            }
            OverlayText += "\n";

            if (commonData.game.batter ) {
                OverlayText += "B: ";
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
            OverlayText += " EV: " + commonData.currentRadarSpeedData.outMaxSpeed.toFixed(1).toString().padStart(4, "0") + " MPH";
        } else {
            OverlayText += " EV: 00.0 MPH";
        }
        if (commonData.game) {
            let guestTeamName = "Guest";
            if (commonData.game && commonData.game.guest && commonData.game.guest.team && commonData.game.guest.team.name) {
                guestTeamName = commonData.game.guest.team.shortName;
            }
            if (commonData.game.score && commonData.game.score.home) {
                OverlayText += guestTeamName.padStart(16) + ": " + commonData.game.score.guest.toString().padStart(2);
            }
            if (commonData.game.inning && commonData.game.inningPosition) {
                OverlayText += " Inning: " + commonData.game.inning.toString().padStart(2) + " " + commonData.game.inningPosition.substring(0, 3);
            }
        }

        ffmpegOverlay.updateOverlayText(OverlayText);
    } catch (ex) {
        debug("error", "error updating Overlay text", ex);
        try {
            ffmpegOverlay.updateOverlayText("");
        } catch (ex2) {
            debug("error", "error blanking Overlay text", ex2)
        }
    }
}

app.use('/', routes);


var server = http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
    debug('Express server listening on port ' + app.get('port'));
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

var io = require('socket.io')(server);
io.on('connection', function(socket) {
    debug('socket.io client Connection');
    socket.on('radarConfigCommand', function(data) {
        debug('radarConfigCommand:' + data.cmd + ', value:' + data.data + ', client id:' + socket.id);
        radarStalker2.radarConfigCommand({ data: data, socket: socket });
    });
    socket.on('radarEmulatorCommand', function(data) {
        debug('radarEmulatorCommand:' + data.cmd + ', value:' + data.data + ', client id:' + socket.id);
        radarStalker2.radarEmulatorCommand({ data: data, socket: socket });
    });


    socket.on('stream', function (message) {
        debug('stream:' + message.cmd + ', client id:' + socket.id);
        switch (message.cmd) {
            case "start":
                ffmpegOverlay.streamStart();
                break;
            case "stop":
                ffmpegOverlay.streamStop();
                break;
        }
        
    });

    socket.on("gameChange", function (message) {
        debug('gameChange:' + ', message:' + message + ', client id:' + socket.id);

        switch (message.cmd) {
            case "inningChange":
                commonData.game.inning = message.data.inning;
                commonData.gameIsDirty = true;
                io.emit("gameChanged", { cmd: "inningChanged", data: { inning: commonData.game.inning } });      //use io to send it to everyone
                updateOverlayText();
                break;
            case "inningPositionChange":
                commonData.game.inningPosition = message.data.inningPosition;
                commonData.gameIsDirty = true;
                io.emit("gameChanged", { cmd: "inningPositionChanged", data: { inningPosition: commonData.game.inningPosition } });      //use io to send it to everyone
                updateOverlayText();
                break;
            case "homeScoreChange":
                if (commonData.game.score === undefined) {
                    commonData.game.score = {};
                }
                commonData.game.score.home = message.data.score.home;
                commonData.gameIsDirty = true;
                io.emit("gameChanged", { cmd: "homeScoreChanged", data: { score: { home: commonData.game.score.home } } });      //use io to send it to everyone
                updateOverlayText();
                break;
            case "guestScoreChange":
                if (commonData.game.score === undefined) {
                    commonData.game.score = {};
                }
                commonData.game.score.guest = message.data.score.guest;
                commonData.gameIsDirty = true;
                io.emit("gameChanged", { cmd: "guestScoreChanged", data: { score: { guest: commonData.game.score.guest } } });      //use io to send it to everyone
                updateOverlayText();
                break;
            case "outsChange":
                commonData.game.outs = message.data.outs;
                commonData.gameIsDirty = true;
                io.emit("gameChanged", { cmd: "outsChanged", data: { outs: commonData.game.outs } });      //use io to send it to everyone
                updateOverlayText();
                break;
            case "strikesChange":
                commonData.game.strikes = message.data.strikes;
                commonData.gameIsDirty = true;
                io.emit("gameChanged", { cmd: "strikesChanged", data: { strikes: commonData.game.strikes } });      //use io to send it to everyone
                updateOverlayText();
                break;
            case "ballsChange":
                commonData.game.balls = message.data.balls;
                commonData.gameIsDirty = true;
                io.emit("gameChanged", { cmd: "ballsChanged", data: { balls: commonData.game.balls } });      //use io to send it to everyone
                updateOverlayText();
                break;
            case "pitcherChange":
                commonData.game.pitcher = message.data.pitcher;
                commonData.gameIsDirty = true;
                io.emit("gameChanged", { cmd: "pitcherChanged", data: { pitcher: commonData.game.pitcher } });      //use io to send it to everyone
                //radarStalker2.pitcher({ data: data.pitcher, socket: socket });
                updateOverlayText();
                break;
            case "batterChange":
                commonData.game.batter = message.data.batter;
                commonData.gameIsDirty = true;
                io.emit("gameChanged", { cmd: "batterChanged", data: { batter: commonData.game.batter } });      //use io to send it to everyone
                //radarStalker2.batter({ data: data.batter, socket: socket });
                updateOverlayText();
                break;
            
        }

        updateOverlayText();
        
    })

    //socket.on("pitcher", function (data) {
    //    debug('pitcher:'  + ', value:' + data.data + ', client id:' + socket.id);
    //    radarStalker2.pitcher({ data: data, socket: socket });
    //})

    //socket.on("batter", function (data) {
    //    debug('batter:' + data.cmd + ', value:' + data.data + ', client id:' + socket.id);
    //    radarStalker2.batter({ data: data, socket: socket });
    //})

    socket.on("pitch", function (data) {
        debug('pitch:' + data.cmd + ', value:' + data.data + ', client id:' + socket.id);
        radarStalker2.pitch({ data: data, socket: socket });
    })

    socket.on('ping', function(data) {
        debug('ping: client id:' + socket.id);
    });

    socket.on("startStream", function (data) {
        ffmpegOverlay.startStream();
    })
    socket.on("stopStream", function (data) {
        ffmpegOverlay.stopStream();
    })

    if (socket.client.request.headers["origin"] != "ArduinoSocketIo") {
        //send the current Config to the new client Connections
        io.emit('radarConfig', radarStalker2.getRadarConfig());
        io.emit('softwareConfig', radarStalker2.getSoftwareConfig());
        io.emit('radarSpeedDataHistory', radarStalker2.getradarSpeedDataHistory());
    }
    //send the current Battery Voltage
    io.emit('batteryVoltage', batteryMonitor.getBatteryVoltage());
    //console.log("gpsState", gpsMonitor.getGpsState())

    
});

radarStalker2.on('radarSpeed', function (data) {
    if (commonData.game) {
        data.pitcher = commonData.game.pitcher;
        data.batter = commonData.game.batter;
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
//    debug('radarSpeed Connection');
//    req.io.emit('connected', {
//        message: 'Connected to Server'
//    })
//})

// command is the Comm
    

   

