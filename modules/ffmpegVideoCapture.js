'use strict';
var util = require('util');
var EventEmitter = require('events').EventEmitter;
const debug = require('debug')('ffmpegVideoCapture');
const path = require('path');
const nconf = require('nconf');
const extend = require('extend');
var ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { Stream } = require("stream");
var FfmpegOverlay = function (options) {

    var self = this;
    var defaultOptions = {
        "input": "video='Integrated Camera':audio='Microphone (Realtek High Definition Audio)'",  // "rtsp://10.199.0.2:7447/t2N7OTZ2n8ScSTtu",
        "rtmpUrl": "rtmp://a.rtmp.youtube.com/live2/7w0t-zhy3-0wzw-9kw8-b1md",
        "logLevel": "debug",
        //"videoCodec": "h264_nvenc",  // libx264
        "inputOptions": ["-f dshow", "-stimeout 30000000"], // ["-rtsp_transport tcp","-stimeout 30000000"]
        "outputOptions": ["-pix_fmt +", "-keyint_min 4", "-c:v h264_nvenc", "-c:a aac", "-f flv"],    //["-x264-params keyint=4:scenecut=0", "-pix_fmt +", "-keyint_min 4", "-c:v libx264","-c:a aac"]
        "capture":true
    }

    //
    if (process.env.localDebug === 'true') {
        nconf.file('./configs/debug/ffmpegConfig.json');
    } else {
        nconf.file('./configs/ffmpegConfig.json');
    }


    var configFileSettings = nconf.get();


    var objOptions = extend({}, defaultOptions, configFileSettings, options);

    var isObject = function (a) {
        return (!!a) && (a.constructor === Object);
    };

    var isArray = function (a) {
        return (!!a) && (a.constructor === Array);
    };

    var CircularChunkArray = [];

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
        },
        activeMp4Streams: []
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


    //var overlayFileName = "overlay.txt"; //path.join(__dirname, "overlay.txt").replace(":", "\\:");


    var transStream = null;


    var first100 = false;

    // incoming and backup transtream pipe to this depending on active source  to transform stream
    var transChunkCounter = 0;
    transStream = new Stream.Transform();
    transStream._transform = function (chunk, encoding, done) {
        try {
            writeToLog('debug', '[' + transChunkCounter + '] transform stream chunk length: ' + chunk.length + ', highwater: ' + this.readableHighWaterMark);
            this.push(chunk);
            //Write to any active mp4 streams
            //for (const item of Object.values(commonData.activeMp4Streams)) {
            //    //if (item.type === "mp3") {
            //    item.res.write(chunk);
            //    //}
            //}
            CircularChunkArray.push(new Buffer(chunk))
            if (CircularChunkArray.length > 100) {
                if (first100 === false) {
                    first100 = true;
                    var mp4Stream = fs.createWriteStream('./output.mp4');
                    for (var i = 0; i < CircularChunkArray.length; i++) {
                        mp4Stream.write(CircularChunkArray[i]);
                    }

                }
                CircularChunkArray.shift()
            }

            return done();
        } catch (ex) {
            writeToLog('trace', "error", ex);
        }
    };



    var startIncomingStream = function () {
    
        if (!(command === null || command === undefined)) {
            command.kill();
        }
        commonData.streamStats.status = "connected"; 
        self.emit('streamStats', commonData.streamStats);
        writeToLog("debug", "Source Video URL", objOptions.input)

        command = ffmpeg({ source: objOptions.input });

            
        command.inputOptions(objOptions.inputOptions)
            
        
        command.outputOptions(objOptions.outputOptions)
        command.addOption('-loglevel level+info')       //added by Andy so we can parse out stream info            
        command.on('error', commandError)
        command.on('progress', commandProgress)
        command.on('stderr', commandStdError)
        command.on('end', commandEnd);
        if (objOptions.capture === true) {
            command.pipe(transStream, { end: false });
        } else {
            if (objOptions.videoFilters) {
                command.videoFilters(objOptions.videoFilters);
            }
            command.output(objOptions.rtmpUrl)
            command.run();
        }
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
        var overlayFilePath = path.join(__dirname, '..', objOptions.overlayFileName);
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

