'use strict';
const appLogName = "ffmpegOverlay";
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const path = require('path');
const extend = require('extend');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { Stream } = require("stream");
var FfmpegOverlay = function (options, logUtilHelper) {

    if(logUtilHelper === null){
        throw new Error("logUtilHelper Can't be Null");
    }

    var self = this;
    var defaultOptions = 
    {
        "input": "",
        "rtmpUrl": "",
        "inputOptions": [ "-rtsp_transport tcp", "-stimeout 30000000" ],
        "outputOptions": [ "-pix_fmt +", "-c:v libx264", "-preset:very fast", "-c:a aac", "-f flv" ],
        "capture": false,
        "overlayFileName": "overlay.txt",
        "videoFilters": {
          "filter": "drawtext",
          "options": "fontfile=arial.ttf:fontsize=50:box=1:boxcolor=black@0.75:boxborderw=5:fontcolor=white:x=(w-text_w)/2:y=((h-text_h)/2)+((h-text_h)/2):textfile=overlay.txt:reload=1"
        } 
    // {
    //     "input": "video='Integrated Camera':audio='Microphone (Realtek High Definition Audio)'",
    //     "rtmpUrl": "",
    //     "logLevel": "info",
    //     //"videoCodec": "h264_nvenc",  // libx264
    //     "inputOptions": ["-f dshow", "-stimeout 30000000"], // ["-rtsp_transport tcp","-stimeout 30000000"]
    //     "outputOptions": ["-pix_fmt +", "-keyint_min 4", "-c:v h264_nvenc", "-c:a aac", "-f flv"],    //["-x264-params keyint=4:scenecut=0", "-pix_fmt +", "-keyint_min 4", "-c:v libx264","-c:a aac"]
    //     "capture":true
    // }
    }
   
    var objOptions = extend({}, defaultOptions, options);

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
            info:null
        },
        activeMp4Streams: [],
        shouldAutoRestart: false
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
            logUtilHelper.log(appLogName, "app", 'error', "error parsing stderror", stderr);
        }
        return data;
    };

    var streamOutPutCounter = 0;
    var commandStdError = function (stderr) {

        var stdOut = parseStdOutput(stderr);

        switch (stdOut.type) {
            case 'info':
            case 'verbose':
                if (stdOut.values.size) {
                    commonData.streamStats.info = stdOut.values;
                    streamOutPutCounter++;
                    if(streamOutPutCounter >= 50){
                        self.emit('streamStatsUpdate');
                        logUtilHelper.log(appLogName, "app", 'info', 'parsed stdErr: ', stdOut);
                        streamOutPutCounter = 0;
                    }
                } else {
                    logUtilHelper.log(appLogName, "app", 'debug', 'parsed stdErr: ', stdOut);
                }
            
                break;
            default:
                logUtilHelper.log(appLogName, "app", 'debug', 'parsed stderr: ', stdOut);
        }

    
    };

    var commandError = function (err, stdout, stderr) {
        logUtilHelper.log(appLogName, "app", 'error', 'an error happened: ' + err.message, err, stdout, stderr);
        commonData.streamStats.status = "disconnected";
        commonData.streamStats.error = err;
        commonData.streamStats.stdout = stdout;
        commonData.streamStats.stderr = stderr;
        self.emit('streamStats', commonData.streamStats);
        if (err && err.message && err.message.startsWith('ffmpeg exited with code') === true) {
            if(commonData.shouldAutoRestart){
                logUtilHelper.log(appLogName, "app", 'info', 'Command Error', 'Will Autorestart');
                setTimeout(restartStream, 30000);
            }
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
        logUtilHelper.log(appLogName, "app", 'error', 'Source Stream Closed');
        if(commonData.shouldAutoRestart){
            logUtilHelper.log(appLogName, "app", 'info', 'Will Autorestart');
            setTimeout(restartStream, 30000);
        }
    };

    var restartStream = function () {
        
        logUtilHelper.log(appLogName, "app", 'error', 'Restarting incoming Stream because it was Closed');
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
            //logUtilHelper.log(appLogName, "app", 'trace', '[' + transChunkCounter + '] transform stream chunk length: ' + chunk.length + ', highwater: ' + this.readableHighWaterMark);
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
            logUtilHelper.log(appLogName, "app", 'trace', "error", ex);
        }
    };



    var startIncomingStream = function () {
        commonData.shouldAutoRestart = false;
        if (!(command === null || command === undefined)) {
            command.kill();
        }
        commonData.streamStats.status = "connected"; 
        self.emit('streamStats', commonData.streamStats);
        logUtilHelper.log(appLogName, "app", "debug", "Source Video URL", objOptions.input)

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
            if(objOptions.file){
                command.output(objOptions.file)
            }
            command.run();
        }
        logUtilHelper.log(appLogName, "app", "info", "ffmpeg Started", "Source Video URL", objOptions.input, "Output Url", objOptions.rtmpUrl);
        commonData.shouldAutoRestart = true;
        
    };

    var streamStart = function (throwError) {
        logUtilHelper.log(appLogName, "app", 'info', 'streamStart Command');
    try {
        startIncomingStream();
    } catch (ex) {
        logUtilHelper.log(appLogName, "app", 'error', 'Error Starting Video Stream ', ex);
        if (throwError === true) {
            throw ex;
        }
    }
};

    var streamStop = function (throwError) {
        commonData.shouldAutoRestart = false;
        logUtilHelper.log(appLogName, "app", 'warning', 'streamStop command');
        try {
            if (!(command === null || command === undefined)) {
                command.ffmpegProc.stdin.write('q');
            }
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", 'error', 'Error Stopping Video Stream ', ex);
            if (throwError === true) {
                throw ex;
            }
        }
    };

    var streamKill = function (throwError) {
        commonData.shouldAutoRestart = false;
            
        logUtilHelper.log(appLogName, "app", 'warning', 'streamKill command');
        try {
            if (!(command === null || command === undefined)) {
                
                command.kill();
            }
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", 'error', 'Error Killing Video Stream ', ex);
            if (throwError === true) {
                throw ex;
            }
        }
    };

    var updateOverlayText = function (overlayText) {
        var overlayFilePath = path.join(__dirname, '..', objOptions.overlayFileName);
        try {
            fs.writeFileSync(overlayFilePath, overlayText);
            logUtilHelper.log(appLogName, "app", "debug", "updateOverlayText", overlayText);
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", "error", "Error Writing OverlayText File", ex);
        }
    }

   

    // disable for port http; force authentication
    self.on('streamStop', function (data) {
        logUtilHelper.log(appLogName, "app", 'debug', 'event', 'streamStop');
        streamStop();
    });

    self.on('streamStart', function (data) {
        logUtilHelper.log(appLogName, "app", 'debug', 'event', 'streamStart');
        streamStart();
    });

    self.updateOverlayText = updateOverlayText;


    self.on('commonData', function (data) {
        logUtilHelper.log(appLogName, "app", 'debug', 'event', 'commonData');
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

