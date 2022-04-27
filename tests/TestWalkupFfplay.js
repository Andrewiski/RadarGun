'use strict';
const debug = require('debug')('testWalkupFFplay');
const path = require('path');
const fs = require('fs');
const extend = require('extend');

var defaultOptions = {
    "filePath": path.join(path.dirname(__dirname), 'data', 'audioFiles', 'walkup', "kickstartmyheart.mp3")
    
}

var objOptions = extend({}, defaultOptions);

var objOptions = {
    "appLogLevels":{
        "platformDetect" :{
            "app":"info"
        }
    },
    logDirectory: "log",

}


let logUtilHelper = new LogUtilHelper({
    appLogLevels: objOptions.appLogLevels,
    logEventHandler: null,
    logUnfilteredEventHandler: null,
    logFolder: "log",
    logName: "testPlatformDetect",
    debugUtilEnabled: true,
    debugUtilName:"testPlatformDetect",
    debugUtilUseUtilName: false,
    debugUtilUseAppName: true,
    debugUtilUseAppSubName: false,
    includeErrorStackTrace: true,
    logToFile: false,
    logToFileLogLevel: "trace",
    logToMemoryObject: false,
    logToMemoryObjectMaxLogLength: 10,
    logSocketConnectionName: "socketIo",
    logRequestsName: "access"

})


if (process.env.FFMPEG_PATH === undefined || process.env.FFMPEG_PATH === '') {
    process.env.FFMPEG_PATH = path.join(__dirname, 'ffmpeg', 'ffmpeg.exe');
}

if (process.env.FFPLAY_PATH === undefined || process.env.FFPLAY_PATH === '') {
    process.env.FFPLAY_PATH = path.join(__dirname, 'ffmpeg', 'ffplay.exe');
}

if (process.env.FFPROBE_PATH === undefined || process.env.FFPROBE_PATH === '') {
    process.env.FFPROBE_PATH = path.join(__dirname, 'ffmpeg', 'ffmpeg.exe');
}

var FFplay = require('../modules/ffplay.js');

var player = new FFplay(objOptions.filePath); // Loads the sound file and automatically starts playing
// It runs `ffplay` with the options `-nodisp` and `-autoexit` by default

//player.pause(); // Pauses playback

//player.resume(); // Resumes playback

//player.stop(); // Stops playback.

//// The player can't play again after being stopped,
//// so you should remove it
//player = null;









 




