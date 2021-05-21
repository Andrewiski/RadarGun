
var extend = require('extend');
var nconf = require('nconf');
var debug = require('debug')('youtubeEncoderClient');
var FfmpegOverlay = require("./modules/ffmpegOverlay.js");
try {
    var defaultOptions = {
        //loaded from the config file
        host: "http://127.0.0.1:12336"
    };
    if (process.env.localDebug === 'true') {
        nconf.file('./configs/debug/youtubeEncoderClientConfig.json');
    } else {
        nconf.file('./configs/youtubeEncoderClientConfig.json');
    }
    var configFileSettings = nconf.get();
    var objOptions = extend({}, defaultOptions, configFileSettings);

    var commonData = {
        game: null,
        currentRadarSpeedData: null

    }

    var ffmpegOverlay = new FfmpegOverlay(objOptions.ffmpegOverlayConfig);

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

                if (commonData.game.batter) {
                    OverlayText += "   B: ";
                    var batterName = "";
                    if (commonData.game.batter.player) {
                        batterName = "#" + commonData.game.batter.player.jerseyNumber + " " + commonData.game.batter.player.firstName + " " + commonData.game.batter.player.lastName;

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

    var socket = require('socket.io-client')(objOptions.host);
    socket.on('connect', function () {
        console.log('Socket Connected');
    });
    socket.on('radarSpeed', function (data) {
        if (commonData.game) {
            data.pitcher = commonData.game.pitcher;
            data.batter = commonData.game.batter;
        }
        commonData.currentRadarSpeedData = data;
        updateOverlayText();
    });

    socket.on("stream", function (data) {
        switch (data.cmd) {
            case "startRemote":
                ffmpegOverlay.streamStart();
                break;
            case "stopRemote":
                ffmpegOverlay.streamStop();
                break;
        }
        
    })
    

    socket.on("gameChange", function (message) {
        debug('gameChange:' + ', message:' + message + ', client id:' + socket.id);
        if (commonData.game === null) {
            commonData.game = {};
        }
        switch (message.cmd) {
            case "scoreGame":
                commonData.game = message.data.game;
                break;
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

    socket.on('batteryVoltage', function (data) {
        console.log('Socket batteryVoltage Event', data);
    });
    socket.on('radarConfig', function (data) {
        console.log('Socket radarConfig Event', data);
    });
    socket.on('radarCommand', function (data) {
        console.log('Socket radarCommand Event', data);
    });
    socket.on('disconnect', function () {
        console.log('Socket Disconnected');
    });
} catch (e) {
    console.log(e);
}