'use strict';
const appLogName = "ffmpegRtmp";
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const path = require('path');
const extend = require('extend');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { Stream } = require("stream");

/*
    This File does not Buffer to memory like ffmpegVideoInput input and output both handled by ffmpeg

*/
var FfmpegRtmp = function (options, videoOverlayParser, logUtilHelper) {

    if(logUtilHelper === null){
        throw new Error("logUtilHelper Can't be Null");
    }

    var self = this;
    var defaultOptions = 
    {
        "input": "",
        "rtmpUrl": "",
        "inputOptions": [ "-rtsp_transport tcp" ],
        "outputOptions": [ "-c:v copy", "-c:a aac", "-f flv" ],
        "overlayFileName": "overlay.txt",
        "videoFilters": {
          "filter": "drawtext",
          "options": "fontfile=arial.ttf:fontsize=50:box=1:boxcolor=black@0.75:boxborderw=5:fontcolor=white:x=(w-text_w)/2:y=((h-text_h)/2)+((h-text_h)/2):textfile=overlay.txt:reload=1"
        } 
    }
   
    self.options = extend({}, defaultOptions, options);
    self.videoOverlayParser = videoOverlayParser;

    if (process.platform === 'win32' && (process.env.FFMPEG_PATH === undefined || process.env.FFMPEG_PATH === '')) {
        process.env.FFMPEG_PATH = path.join(__dirname, '..', 'ffmpeg', 'ffmpeg.exe');
    }

    if (process.platform === 'win32' && (process.env.FFPROBE_PATH === undefined || process.env.FFPROBE_PATH === '')) {
        process.env.FFPROBE_PATH = path.join(__dirname, '..', 'ffmpeg', 'ffprobe.exe');
    }

    var commonData = {
        streamStats: {
            status: "disconnected",
            info: null,
            warning: null,
            error: null,
            commandError: null,
            restarting: null,
            restartCounter: 0,
            metadata: {},
        },
        shouldRestartStream: false,
        restartTimer: null
    };

    var command = null;
    var parseStdOutput = function (stderr) {
        //assumes // Assumes .outputOptions('-loglevel level')  so loglevel proceeds information
        var data = {
            type: "N/A", value: stderr, values: {}
        };

        try {
            var startPosition = 0;
            var name = '';
            var value = '';
            if (stderr[0] === '[') {
                //string
                startPosition = stderr.indexOf(']');
                var type = stderr.slice(1, startPosition);
                //sometimes the message has two [] ie  [mp3 @ 000001ef0c8d9f00] [info] Skipping 33 bytes of junk at 0.  or  [https @ 000001b6622fc0c0] [verbose] Metadata update for StreamTitle: Halsey - New Americana
                startPosition = startPosition + 2;
                stopPosition = stderr.indexOf(']', startPosition);
                if (stopPosition >= 0) {
                    data.postion = type;
                    type = stderr.slice(startPosition + 1, stopPosition);
                    startPosition = stopPosition + 2;
                    data.type = type;
                } else {
                    data.type = type;
                }
                var stopPosition = stderr.indexOf('=', startPosition);

                //there is a = delimited and a : delimited message
                if (stopPosition >= 0) {
                    //this ia an = delimited message
                    //stopPosition = stderr.indexOf('=', startPosition);


                    while (startPosition >= 0) {
                        stopPosition = stderr.indexOf('=', startPosition);
                        name = '';
                        value = '';
                        if (stopPosition > 0) {
                            name = stderr.slice(startPosition, stopPosition);
                            if (name) {
                                name = name.trim().replace(/-/g, '').replace(/ /g, '');
                            }
                            startPosition = stopPosition + 1;
                            //because there can be whitespace between = and value we need to find next = or end of string then backtrack
                            stopPosition = stderr.indexOf('=', startPosition);
                            if (stopPosition >= 0) {
                                stopPosition = stderr.lastIndexOf(' ', stopPosition);
                                value = stderr.slice(startPosition, stopPosition);
                                if (value) {
                                    value = value.trim();
                                }
                            } else {
                                //this is the last value so end of string is
                                value = stderr.slice(startPosition);
                                if (value) {
                                    value = value.trim();
                                }
                            }
                            if (name && value) {
                                data.values[name] = value;
                            }
                        }
                        startPosition = stopPosition;

                    }
                } else {
                    stopPosition = stderr.indexOf(':', startPosition);
                    if (stopPosition >= 0) {

                        while (startPosition >= 0) {
                            stopPosition = stderr.indexOf(':', startPosition);
                            name = '';
                            value = '';
                            if (stopPosition > 0) {
                                name = stderr.slice(startPosition, stopPosition);
                                if (name) {
                                    name = name.trim().replace(/-/g, '').replace(/ /g, '');
                                    if (name === "MetadataupdateforStreamTitle") {
                                        name = "StreamTitle";
                                    }
                                }
                                startPosition = stopPosition + 1;
                                //because there can be whitespace between = and value we need to find next = or end of string then backtrack
                                stopPosition = stderr.indexOf(':', startPosition);
                                //if (stopPosition >= 0) {
                                //    stopPosition = stderr.lastIndexOf(' ', stopPosition);
                                //    value = stderr.slice(startPosition, stopPosition);
                                //    if (value) {
                                //        value = value.trim();
                                //    }
                                //} else {
                                //this is the last value so end of string is
                                value = stderr.slice(startPosition);
                                if (value) {
                                    value = value.trim();
                                }
                                // }
                                if (name && value) {
                                    data.values[name] = value;
                                }
                            }
                            startPosition = stopPosition;

                        }
                    }
                }
            }
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", 'error', self.options.rtmpUrl, "error parsing stderror", stderr);
        }
        return data;
    };

    var commandStdError = function (stderr) {

        if(stderr.startsWith('[') === true){
            var stdOut = parseStdOutput(stderr);

            switch (stdOut.type) {
                case 'info':
                case 'verbose':
                    if (stdOut.values.size) {
                        commonData.streamStats.info = stdOut.values;
                        if (commonData.streamStats.status !== "connected") {
                            commonData.streamStats.status = "connected";
                        }
                        self.emit('streamStats', commonData.streamStats);
                        logUtilHelper.log(appLogName, "app", 'trace', self.options.rtmpUrl,  'parsed stdErr:', stdOut);
                    } else {
                        logUtilHelper.log(appLogName, "app", 'debug', self.options.rtmpUrl, 'parsed stdErr:', stdOut);
                    }
                    break;
                case 'warning':
                    if(stdOut.value){
                        commonData.streamStats.warning = stdOut.value;
                        self.emit('streamStats', commonData.streamStats);
                    }
                    
                    logUtilHelper.log(appLogName, "app", 'warning', self.options.rtmpUrl, 'parsed stderr:', stdOut);
                    break;
                case 'error':
                    if(stdOut.value){
                        commonData.streamStats.error = stdOut.value;
                        self.emit('streamStats', commonData.streamStats);
                    }
                    logUtilHelper.log(appLogName, "app", 'error', self.options.rtmpUrl, 'parsed stderr:', stdOut);
                    break;
                default:
                    logUtilHelper.log(appLogName, "app", 'info', self.options.rtmpUrl, 'parsed stderr:', stdOut);
            }
        }else{
            logUtilHelper.log(appLogName, "app", 'debug', self.options.rtmpUrl, 'stderr:', stderr);
        }

    
    };

    var clearRestartTimer = function () {
        if (commonData.restartTimer) {
            clearTimeout(commonData.restartTimer);
            commonData.restartTimer = null;
        }
    }

    var startRestartTimer = function () {
        clearRestartTimer();
        if(commonData.shouldRestartStream === true){
            if(commonData.streamStats.restartCounter <= 5){
                logUtilHelper.log(appLogName, "app", 'warning', self.options.rtmpUrl, 'starting restart Timer');
                commonData.streamStats.status = "restarting";
                commonData.streamStats.restarting = "Restarting at " + new Date().toISOString() + " after " + commonData.streamStats.restartCounter + " restarts";
                self.emit('streamStats', commonData.streamStats);
                commonData.restartTimer = setTimeout(restartStream, 30000);
            }else{
                logUtilHelper.log(appLogName, "app", 'warning', self.options.rtmpUrl, 'max restart attemps reached, not restarting stream');
                commonData.streamStats.status = "not restarting";
                commonData.streamStats.restarting = "Max restart attemps reached, not restarting stream " + new Date().toISOString() + " after " + commonData.streamStats.restartCounter + " restarts";
                self.emit('streamStats', commonData.streamStats);
            }
        }
    }

    var commandError = function (err, stdout, stderr) {
        logUtilHelper.log(appLogName, "app", 'error', self.options.rtmpUrl, 'an error happened: ' + err.message, err);
        commonData.streamStats.status = "errored";
        if(err && err.message){
            commonData.streamStats.commandError = "commandError: " + err.message;
        }else{
            commonData.streamStats.commandError = "commandError: " + err;
        }
        //commonData.streamStats.stdout = stdout;
        //commonData.streamStats.stderr = stderr;
        self.emit('streamStats', commonData.streamStats);
        if (err && err.message && err.message.startsWith('ffmpeg exited with code') === true) {
            startRestartTimer();
        }
    };

    var commandProgress = function (progress) {

        if (commonData.streamStats.status !== "connected") {
            commonData.streamStats.status = "connected";
            self.emit('streamStats', commonData.streamStats);
            logUtilHelper.log(appLogName, "app", 'info', self.options.rtmpUrl, 'commandProgress Called', progress);
        
        }
        //proc_count++;
    };

    var commandEnd = function (result) {
        commonData.streamStats.status = "ended";
        self.emit('streamStats', commonData.streamStats);
        logUtilHelper.log(appLogName, "app", 'error', self.options.rtmpUrl, 'Source Stream Closed');
        startRestartTimer();
    };

    var restartStream = function () {
        clearRestartTimer();
        if(commonData.shouldRestartStream === true){
            commonData.streamStats.restartCounter = commonData.streamStats.restartCounter + 1;
            logUtilHelper.log(appLogName, "app", 'error', self.options.rtmpUrl, 'Restarting');
            startIncomingStream();
        }
    };

    var startIncomingStream = function () {
        commonData.shouldRestartStream = false;
        
        if (!(command === null || command === undefined)) {
            command.kill();
        }
        commonData.streamStats.status = "starting"; 
        commonData.streamStats.info = null;
        
        commonData.streamStats.chunkCounter = 0;
        commonData.streamStats.chunkShow = 0;
        commonData.streamStats.transChunkCounterCounter = 0;
        commonData.streamStats.transChunkShow = 0;
        commonData.streamStats.rtmpUrl = self.options.rtmpUrl;
        self.emit('streamStats', commonData.streamStats);
        logUtilHelper.log(appLogName, "app", "debug", "Source Video", self.options.input, "Destination", self.options.rtmpUrl);
        command = ffmpeg({ source: self.options.input });   
        command.inputOptions(self.options.inputOptions);
        command.outputOptions(self.options.outputOptions);
        command.addOption('-loglevel level+info');       //added by Andy so we can parse out stream info            
        command.addOption('-hide_banner'); //Hide the banner
        command.on('error', commandError);
        command.on('progress', commandProgress);
        command.on('stderr', commandStdError);
        command.on('end', commandEnd);
        
        if (self.options.videoFilters) {
            command.videoFilters(self.options.videoFilters);
        }
        command.output(self.options.rtmpUrl);
        command.run();
        commonData.shouldRestartStream = true;
        logUtilHelper.log(appLogName, "app", "info", self.options.rtmpUrl, "ffmpeg Started");
    };

    var streamStart = function (throwError) {
        logUtilHelper.log(appLogName, "app", 'info', self.options.rtmpUrl, 'streamStart Command');
        try {
            commonData.streamStats.restartCounter = 0;
            commonData.streamStats.warning = null;
            commonData.streamStats.error = null;
            commonData.streamStats.restarting = null;
            commonData.streamStats.commandError = null;
            startIncomingStream();
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", 'error', self.options.rtmpUrl, 'Error Starting Video Stream ', ex);
            if (throwError === true) {
                throw ex;
            }
        }
    };

    var streamStop = function (throwError) {
        logUtilHelper.log(appLogName, "app", 'warning', self.options.rtmpUrl, 'streamStop command');
        try {
            commonData.shouldRestartStream = false;
            clearRestartTimer();
            if (!(command === null || command === undefined || command.ffmpegProc === null || command.ffmpegProc === undefined || command.ffmpegProc.stdin === null || command.ffmpegProc.stdin === undefined)) {
                commonData.streamStats.status = "stopping";
                self.emit("streamStats", commonData.streamStats);
                command.ffmpegProc.stdin.write('q');
            }else{
                streamKill(throwError);
            }
            commonData.streamStats.status = "stopped";
            self.emit("streamStats", commonData.streamStats);
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", 'error', self.options.rtmpUrl, 'Error Stopping Video Stream ', ex);
            if (throwError === true) {
                throw ex;
            }
        }
    };

    var streamKill = function (throwError) {
        logUtilHelper.log(appLogName, "app", 'warning', self.options.rtmpUrl, 'streamKill command');
        try {
            commonData.streamStats.status = "killing";
            self.emit("streamStats", commonData.streamStats);
            commonData.shouldRestartStream = false;
            if (!(command === null || command === undefined)) {
                command.kill();
            }
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", 'error', self.options.rtmpUrl, 'Error Stopping Video Stream ', ex);
            if (throwError === true) {
                throw ex;
            }
        }
    };

    var updateOverlay= function (options) {
        try {
            if(self.videoOverlayParser && self.videoOverlayParser.getOverlayText){
                var overlayText = self.videoOverlayParser.getOverlayText(options)
                if(self.options.overlayFileName != null ){
                    var overlayFilePath = path.join(__dirname, '..', self.options.overlayFileName);
                    try {
                        fs.writeFileSync(overlayFilePath, overlayText);
                    } catch (ex) {
                        logUtilHelper.log(appLogName, "app", "error", self.options.rtmpUrl, "Error Writing OverlayText File", ex);
                    }
                }
            }else{
                logUtilHelper.log(appLogName, "app", "warning", self.options.rtmpUrl, "videoOverlayParser is null");    
            }
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", "error", self.options.rtmpUrl, "Error Writing OverlayText File", ex);
        }

    }

   
    
    self.updateOverlay = updateOverlay;

    self.streamStart = streamStart;
    self.streamStop = streamStop;
    
    self.commonData = function () {
        return commonData;
    }

}
// extend the EventEmitter class using our RadarMonitor class
util.inherits(FfmpegRtmp, EventEmitter);

module.exports = FfmpegRtmp;

