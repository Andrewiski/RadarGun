'use strict';
const appLogName = "videoOverlayParser";
const extend = require('extend');
var videoOverlayParser = function (options, logUtilHelper) {

    var self = this;
    var defaultOptions = {
        "capture":true,
        outputs: null
    }
    if(logUtilHelper === null){
        throw new Error("logUtilHelper Can't be Null");
    }
    self.options = extend({}, defaultOptions, options);



    var getOverlayText = function (options) {
        try {
            var gameData = options.gameData;
            var radarData = options.radarData;

            let defaultFilters = {
                showTeamNames: true,
                showPitcherName: true,
                showBatterName: true,
                showBalls: true,
                showStrikes: true,
                showOuts: true,
                showRadarPitchingVelocity: true,
                showRadarHittingVelocity: true
            }

            var overlayFilters = extend({},options.filters, defaultFilters);
            var overlayText = "";
            if (gameData) {
    
                if(overlayFilters.showTeamNames === true){
                    let homeTeamName = "Home";
                    if (gameData && gameData.home && gameData.home.team && gameData.home.team.name) {
                        homeTeamName = gameData.home.team.shortName;
                    }
                    if (gameData.score && gameData.score.home) {
                        overlayText += homeTeamName.padStart(12) + ": " + gameData.score.home.toString().padStart(2);
                    }
                }
                
                if (overlayFilters.showPitcherName && gameData.pitcher) {
                    overlayText += "   P: "
                    var pitcherName = " ";
                    if (gameData.pitcher.player) {
                        pitcherName = "#" + gameData.pitcher.player.jerseyNumber + " " + gameData.pitcher.player.firstName + " " + gameData.pitcher.player.lastName;
    
                        if (pitcherName.length > 19) {
                            pitcherName = "#" + gameData.pitcher.player.jerseyNumber + " " + gameData.pitcher.player.firstName.substring(0, 1) + ".  " + gameData.pitcher.player.lastName;
                        }
                        if (pitcherName.length > 19) {
                            pitcherName = ("#" + gameData.pitcher.player.jerseyNumber + " " + gameData.pitcher.player.lastName).substring(0, 19);
                        }
                    }
                    //need checks to ControlLength pad and truncate
                    overlayText += pitcherName.padEnd(19);
                } else {
                    overlayText += " ".padEnd(22);
                }
            }
    
            if (overlayFilters.showRadarPitchingVelocity){
                if(radarData) {
                    overlayText += " PV: " + radarData.inMaxSpeed.toFixed(1).toString().padStart(4, "0") + " MPH   ";
                } else {
                    overlayText += " PV: 00.0 MPH   ";
                }
            }
            if (gameData) {
                if (overlayFilters.showOuts && gameData.outs) {
                    overlayText += " O: " + gameData.outs.toString();
                }
    
                if (overlayFilters.showBalls && gameData.balls !== undefined && gameData.balls !== null) {
                    overlayText += " B: " + gameData.balls;
                }
    
                if (overlayFilters.showStrikes && gameData.strikes !== undefined && gameData.strikes !== null) {
                    overlayText += " S: " + gameData.strikes;
                } 
                
            }
            
            if (gameData) {
                
                
                
                overlayText += "\n";
                
                if(overlayFilters.showTeamNames === true){
                    let guestTeamName = "Guest";
                    if (gameData && gameData.guest && gameData.guest.team && gameData.guest.team.name) {
                        guestTeamName = gameData.guest.team.shortName;
                    }
                    if (gameData.score && gameData.score.home) {
                        overlayText += guestTeamName.padStart(12) + ": " + gameData.score.guest.toString().padStart(2);
                    }
                }
    
                if (overlayFilters.showBatterName && gameData.batter ) {
                    overlayText += "   B: ";
                    var batterName = "";
                    if (gameData.batter.player) {
                        batterName =  "#" + gameData.batter.player.jerseyNumber + " " + gameData.batter.player.firstName + " " + gameData.batter.player.lastName;
    
                        //need checks to ControlLength pad and truncate
                        if (batterName.length > 19) {
                            batterName = "#" + gameData.batter.player.jerseyNumber + " " + gameData.batter.player.firstName.substring(0, 1) + ".  " + gameData.batter.player.lastName;
                        }
                        if (batterName.length > 19) {
                            batterName = ("#" + gameData.batter.player.jerseyNumber + " " + gameData.batter.player.lastName).substring(0, 19);
                        }
                    }
                    overlayText += batterName.padEnd(19);
                } else {
                    overlayText += " ".padEnd(22);
                }
            }
            if(overlayFilters.showRadarHittingVelocity === true){
                if (radarData) {
                    overlayText += " EV: " + radarData.outMaxSpeed.toFixed(1).toString().padStart(4, "0") + " MPH   ";
                } else {
                    overlayText += " EV: 00.0 MPH   ";
                }
                if (gameData) {
                    if (gameData.inning && gameData.inningPosition) {
                        overlayText += " I: " + gameData.inning.toString() + " " + gameData.inningPosition;
                    }
                }
            }
    
            logUtilHelper.log(appLogName, "app", "trace", "updateOverlayText", overlayText);
    
            return overlayText;
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", "error", "error updating Overlay text", ex);
            try {
                return ""
            } catch (ex2) {
                logUtilHelper.log(appLogName, "app", "error", "error blanking Overlay text", ex2)
            }
        }
    }


    self.getOverlayText = getOverlayText;
    

    

}

module.exports = videoOverlayParser;