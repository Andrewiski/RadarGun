'use strict';
var util = require('util');
var EventEmitter = require('events').EventEmitter;
const debug = require('debug')('ffmpegOverlay');
const path = require('path');
const nconf = require('nconf');
const extend = require('extend');
var ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

var FfmpegOverlay = function (options) {

    var self = this;
    var defaultOptions = {
        "rtspUrl": "rtsp://10.100.32.95:7447/0MxYqhH8uDMLeQ4j",
        "rtmpUrl": "rtmp://a.rtmp.youtube.com/live2/7w0t-zhy3-0wzw-9kw8-b1md",
        "logLevel": "debug",
        "audioCodec": "copy",
        "videoCodec": "libx264"
    }

    nconf.file('./configs/ffmpegConfig.json');


    var configFileSettings = nconf.get();


    var objOptions = extend({}, defaultOptions, configFileSettings);

    var isObject = function (a) {
        return (!!a) && (a.constructor === Object);
    };

    var isArray = function (a) {
        return (!!a) && (a.constructor === Array);
    };

    var arrayPrint = function (obj) {
        var retval = '';
        var i;
        for (i = 0; i < obj.length; i++) {
            if (retval.length > 0) {
                retval = retval + ', ';
            }
            retval = retval + objPrint(obj[i]);
        }

        return retval;
    };

    var objPrint = function (obj) {
        if (obj === null) {
            return 'null';
        } else if (obj === undefined) {
            return 'undefined';
        } else if (isArray(obj)) {
            return arrayPrint(obj);
        } else if (isObject(obj)) {
            return JSON.stringify(obj);
        } else {
            return obj.toString();
        }
    };

    var logLevels = {
        'quiet': -8, //Show nothing at all; be silent.
        'panic': 0, //Only show fatal errors which could lead the process to crash, such as an assertion failure.This is not currently used for anything.
        'fatal': 8, //Only show fatal errors.These are errors after which the process absolutely cannot continue.
        'error': 16, //Show all errors, including ones which can be recovered from.
        'warning': 24, //Show all warnings and errors.Any message related to possibly incorrect or unexpected events will be shown.
        'info': 32, //Show informative messages during processing.This is in addition to warnings and errors.This is the default value.
        'verbose': 40,  //Same as info, except more verbose.
        'debug': 48, //Show everything, including debugging information.
        'trace': 56
    };


    var writeToLog = function (logLevel) {
        try {
            if (shouldLog(logLevel, objOptions.logLevel) === true) {
                var logData = { timestamp: new Date(), logLevel: logLevel, args: arguments };
                debug(arrayPrint(arguments));
                //console.log(arrayPrint(arguments));
            }
            self.emit("Log", logData);
        } catch (ex) {
            debug('error', 'Error WriteToLog', ex);
        }
    };

    var getLogLevel = function (logLevelName) {

        if (logLevels[logLevelName]) {
            return logLevels[logLevelName];
        } else {
            return 100;
        }
    };



    var shouldLog = function (logLevelName, logLevel) {

        if (getLogLevel(logLevelName) <= getLogLevel(logLevel)) {
            return true;
        } else {
            return false;
        }
    };



    if (process.platform === 'win32' && (process.env.FFMPEG_PATH === undefined || process.env.FFMPEG_PATH === '')) {
        process.env.FFMPEG_PATH = path.join(__dirname, '..', 'ffmpeg', 'ffmpeg.exe');
    }

    if (process.platform === 'win32' && (process.env.FFPROBE_PATH === undefined || process.env.FFPROBE_PATH === '')) {
        process.env.FFPROBE_PATH = path.join(__dirname, '..', 'ffmpeg', 'ffprobe.exe');
    }

    




    var commonData = {
   
        streamStats: {
            chunkCounter: 0,
            chunkShow: 0,
            status: "disconnected",
            error: null,
            metadata: {},
        }
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
            writeToLog('error', "error parsing stderror", stderr);
        }
        return data;
    };

    var commandStdError = function (stderr) {

        var stdOut = parseStdOutput(stderr);

        switch (stdOut.type) {
            case 'info':
            case 'verbose':
                if (stdOut.values.size) {
                    commonData.streamStats.info = stdOut.values;
                    writeToLog('trace', 'parsed stdErr: ', stdOut);
                } else {
                    writeToLog('debug', 'parsed stdErr: ', stdOut);
                }
            
                break;
            default:
                writeToLog('debug', 'parsed stderr: ', stdOut);
        }

    
    };

    var commandError = function (err, stdout, stderr) {
        writeToLog('error', 'an error happened: ' + err.message, err, stdout, stderr);
        commonData.streamStats.status = "disconnected";
        commonData.streamStats.error = err;
        commonData.streamStats.stdout = stdout;
        commonData.streamStats.stderr = stderr;
        self.emit('streamStats', commonData.streamStats);
        if (err && err.message && err.message.startsWith('ffmpeg exited with code') === true) {
            setTimeout(restartStream, 30000);
        }
    };

    var commandProgress = function (progress) {

        if (commonData.streamStats.status === "disconnected") {
            commonData.streamStats.status = "connected";
            self.emit('streamStats', commonData.streamStats);
        
        }
        //proc_count++;
    };

    var commandEnd = function (result) {
        commonData.streamStats.status = "disconnected";
        commonData.streamStats.error = "commandEnd Called";
        self.emit('streamStats', commonData.streamStats);
        writeToLog('error', 'Source Stream Closed');
        setTimeout(restartStream, 30000);
    };

    var restartStream = function () {
        //this is where we would play a local file until we get reconnected to internet.
        writeToLog('error', 'Restarting incoming Stream because it was Closed');
   
        startIncomingStream();
    };


    var overlayFileName = "overlay.txt"; //path.join(__dirname, "overlay.txt").replace(":", "\\:");

    var startIncomingStream = function () {
    
        if (!(command === null || command === undefined)) {
            command.kill();
        }
        commonData.streamStats.status = "connected"; 
        self.emit('streamStats', commonData.streamStats);
        writeToLog("debug", "Source Video URL", objOptions.rtspUrl)

        command = ffmpeg({ source: objOptions.rtspUrl })
            //.addInputOption('-r 24')
            .addInputOption('-rtsp_transport tcp')
            .addInputOption('-stimeout 30000000')
            .output(objOptions.rtmpUrl)
            .withOutputFormat('flv')
            .videoCodec('libx264')
            .outputOptions("-x264-params keyint=4:scenecut=0")
            .outputOptions('-pix_fmt +')    //If pix_fmt is a single +, ffmpeg selects the same pixel format as the input (or graph output) and automatic conversions are disabled.
            //.outputOptions('-g 4')
            .outputOptions('-keyint_min 4')
            .outputOptions('-c:v libx264')
            .outputOptions('-c:a aac')
            .videoFilters({
                filter: "drawtext",
                options: 'fontfile=arial.ttf:fontsize=50:box=1:boxcolor=black@0.75:boxborderw=5:fontcolor=white:x=(w-text_w)/2:y=((h-text_h)/2)+((h-text_h)/2):textfile=' + overlayFileName + ':reload=1'
            })
            .addOption('-loglevel level+warning')       //added by Andy so we can parse out stream info
            //.audioChannels(2)
            // TODO: make audioCodec a config item
            //.audioFilters(['volume=0.5', 'silencedetect=n=-50dB:d=5'])
            //.audioCodec(objOptions.audioCodec)  //pcm_mulaw or pcm_alaw
            //.audioFrequency('8000')
            //.audioBitrate('100k')

            .on('error', commandError)
            .on('progress', commandProgress)
            .on('stderr', commandStdError)
            .on('end', commandEnd)

            //.pipe(transStream, { end: false });
            .run();
        debug("info", "ffmpeg Started");
    };







    var streamStart = function (throwError) {
    writeToLog('info', 'streamStart Command');
    try {
        startIncomingStream();
    } catch (ex) {
        writeToLog('error', 'Error Starting Video Stream ', ex);
        if (throwError === true) {
            throw ex;
        }
    }
};

    var streamStop = function (throwError) {
        writeToLog('warning', 'streamStop command');
        try {
            if (!(command === null || command === undefined)) {
                command.kill();
            }
        } catch (ex) {
            writeToLog('error', 'Error Stopping Video Stream ', ex);
            if (throwError === true) {
                throw ex;
            }
        }
    };

    var updateOverlayText = function (overlayText) {
        var overlayFilePath = path.join(__dirname, '..', overlayFileName);
        try {
            fs.writeFileSync(overlayFilePath, overlayText);

        } catch (ex) {
            debug("error", "Error Writing OverlayText File", ex);
        }
    }

   

    // disable for port http; force authentication
    self.on('streamStop', function (data) {
        writeToLog('debug', 'event', 'streamStop');
        streamStop();
    });

    self.on('streamStart', function (data) {
        writeToLog('debug', 'event', 'streamStart');
        streamStart();
    });

    self.updateOverlayText = updateOverlayText;


    self.on('commonData', function (data) {
        writeToLog('debug', 'event', 'commonData');
        self.emit('commonData', commonData);
    });

    self.streamStart = streamStart;
    self.streamStop = streamStop;

    self.commonData = function () {
        return commonData;
    }

}
// extend the EventEmitter class using our RadarMonitor class
util.inherits(FfmpegOverlay, EventEmitter);

module.exports = FfmpegOverlay;

