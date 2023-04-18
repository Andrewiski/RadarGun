'use strict';
const appLogName = "ffmpegVideoInput";
var util = require('util');
const EventEmitter = require('events').EventEmitter;
//const debug = require('debug')('ffmpegVideoCapture');
const path = require('path');
const extend = require('extend');
const ffmpeg = require('fluent-ffmpeg');
const { libcamera } = require('@andrewiski/libcamera');
const fs = require('fs');
const { Stream } = require("stream");
const FfmpegVideoOutputRtmp = require("./ffmpegVideoOutputRtmp");
const FfmpegVideoOutputFile = require("./ffmpegVideoOutputFile");
var FfmpegVideoInput = function (options, videoOverlayParser, logUtilHelper) {

    var self = this;
    var defaultOptions = {
        "input": "video='Integrated Camera':audio='Microphone (Realtek High Definition Audio)'",
        "inputOptions": ["-f dshow", "-video_size 1280x720", "-rtbufsize 702000k", "-framerate 30"], // ["-rtsp_transport tcp","-stimeout 30000000"]
        //"outputOptions": [ "-c:a copy", "-pix_fmt +", "-c:v h264_nvenc", "-g 50", "-use_wallclock_as_timestamps 1", "-fflags +genpts", "-r 50", "-preset llhq", "-rc vbr_hq", "-f flv" ],
        "capture":true,       
        outputs: null
    }

    if(logUtilHelper === null){
        throw new Error("logUtilHelper Can't be Null");
    }

    self.options = extend({}, defaultOptions, options);
    self.videoOverlayParser = videoOverlayParser;
    var CircularChunkArray = [];

    if (process.platform === 'win32' && (process.env.FFMPEG_PATH === undefined || process.env.FFMPEG_PATH === '')) {
        process.env.FFMPEG_PATH = path.join(__dirname, '..', 'ffmpeg', 'ffmpeg.exe');
    }

    if (process.platform === 'win32' && (process.env.FFPROBE_PATH === undefined || process.env.FFPROBE_PATH === '')) {
        process.env.FFPROBE_PATH = path.join(__dirname, '..', 'ffmpeg', 'ffprobe.exe');
    }

    var commonData = {
   
        streamStats: {
            incoming: {
                chunkCounter: 0,
                chunkShow: 0,
                status: "disconnected",
                error: null,
                metadata: {},
            }
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
            logUtilHelper.log(appLogName, "app", "error", "error parsing stderror", stderr);
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
                    logUtilHelper.log(appLogName, "app", 'trace', 'parsed stdErr: ', stdOut);
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
            //setTimeout(restartStream, 30000);
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
        setTimeout(restartStream, 30000);
    };

    var restartStream = function () {
        //this is where we would play a local file until we get reconnected to internet.
        logUtilHelper.log(appLogName, "app", 'error', 'Restarting incoming Stream because it was Closed');
   
        startIncomingStream();
    };

    var incomingTransStream = null;
    var first100 = false;
    // incoming and backup transtream pipe to this depending on active source  to transform stream
    commonData.streamStats.incoming.incomingChunkCounter = 0;
    commonData.streamStats.incoming.incomingChunkShow = 0;
    incomingTransStream = new Stream.Transform({highWaterMark: 1638400});
    incomingTransStream._transform = function (chunk, encoding, done) {
        try {
            if (commonData.streamStats.incoming.incomingChunkCounter >= commonData.streamStats.incoming.incomingChunkShow) {
                logUtilHelper.log(appLogName, "app", 'trace', "incomingTransStream", "chunks processed: " + commonData.streamStats.incoming.incomingChunkShow);
                commonData.streamStats.incoming.incomingChunkShow = commonData.streamStats.incoming.incomingChunkShow + 100;
            }
            commonData.streamStats.incoming.incomingChunkCounter++;
            this.push(chunk);
            return done();
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", 'trace', "error", ex);
        }
    };

    // Start incomingMonitor Stream 
    // Read from the source stream, to keeps it alive and flowing
    var incomingMonitorStream = new Stream.Writable({});
    // Consume the stream
    incomingMonitorStream._write = (chunk, encoding, next) => {
        
        commonData.streamStats.incoming.chunkCounter++;
        //commonData.streamStats.chunkCounter++; //remove after new Management Server
        if (commonData.streamStats.incoming.chunkCounter >= commonData.streamStats.incoming.chunkShow) {
            logUtilHelper.log(appLogName, "app", 'trace', "incomingMonitorStream", "chunks processed: " + commonData.streamStats.incoming.chunkCounter);
            commonData.streamStats.incoming.chunkShow = commonData.streamStats.incoming.chunkShow + 50;
        }
        // CircularChunkArray.push(new Buffer.from(chunk));
        // if (CircularChunkArray.length > 100) {
        //     if (first100 === false) {
        //         first100 = true;
        //         var mp4Stream = fs.createWriteStream('./output.mp4');
        //         for (var i = 0; i < CircularChunkArray.length; i++) {
        //             mp4Stream.write(CircularChunkArray[i]);
        //         }
        //         mp4Stream.end();
        //         mp4Stream.close();

        //     }
        //     CircularChunkArray.shift()
        // }
        //Write to any active mp4 streams
            //for (const item of Object.values(commonData.activeMp4Streams)) {
            //    //if (item.type === "mp3") {
            //    item.res.write(chunk);
            //    //}
            //}
        next();
    };

    incomingTransStream.pipe(incomingMonitorStream);

    var ffmpegVideoOutputRtmp = null;
    var ffmpegVideoOutputRtmp2 = null;
    var ffmpegVideoOutputFile = null;

    
    var startIncomingStream = function () {
    
        if (!(command === null || command === undefined)) {
            command.kill();
        }
        commonData.streamStats.status = "connected"; 
        self.emit('streamStats', commonData.streamStats);
        logUtilHelper.log(appLogName, "app", "debug", "Source Video URL", self.options.input)
        if(self.options.input.startsWith("libcamera")){
            self.options.inputOptions.output = incomingTransStream;
            let results = libcamera.vid({ config: self.options.inputOptions });
            results.then(executeResult => {
                console.log("Got Results");
                command = executeResult;
                command.on("exit", commandEnd);
                //executeResult.stdout.on("data",(data) => console.log(data.toString()))
                //executeResult.stdout.pipe( incomingMonitorStream);
                command.on('error', commandError)
                command.on('progress', commandProgress)
                command.stderr.on('data', commandStdError)
                command.on('end', commandEnd);
            });
            results.catch(err => {
                logUtilHelper.log(appLogName, "app", "error", "libcamera", err)
                //console.log(executeResult.message)
            });
        }else{
            command = ffmpeg({ source: self.options.input });    
            command.inputOptions(self.options.inputOptions)
            command.outputOptions(self.options.outputOptions)
            command.addOption('-loglevel level+info')       //added by Andy so we can parse out stream info            
            command.on('error', commandError)
            //command.on('progress', commandProgress)
            command.on('stderr', commandStdError)
            command.on('end', commandEnd);
            
            command.pipe(incomingTransStream, { end: false });
        }
        
        
        logUtilHelper.log(appLogName, "app","info", "ffmpeg Started");
    };

    var streamStart = function (throwError) {
        logUtilHelper.log(appLogName, "app", 'info', 'streamStart Command');
        try {
            startIncomingStream();
            streamStartRtmp();
            streamStartRtmp2();
            streamStartFile();
            self.emit("streamStarted",{});
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", 'error', 'Error Starting Video Stream ', ex);
            if (throwError === true) {
                throw ex;
            }
        }
    };

    var streamStop = function (throwError) {
        
        logUtilHelper.log(appLogName, "app", 'warning', 'streamStop command');
        streamStopRtmp();
        streamStopRtmp2();
        streamStopFile();
        try {
            if (!(command === null || command === undefined)) {
                command.kill();
            }
            self.emit("streamStopped",{});
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", 'error', 'Error Stopping Video Stream ', ex);
            if (throwError === true) {
                throw ex;
            }
        }
    };

    var streamStartRtmp = function (throwError){
        if (self.options.outputs && self.options.outputs.ffmpegVideoOutputRtmp && self.options.outputs.ffmpegVideoOutputRtmp.rtmpUrl) { 
                
            if (ffmpegVideoOutputRtmp === null) {
                ffmpegVideoOutputRtmp = new FfmpegVideoOutputRtmp(self.options.outputs.ffmpegVideoOutputRtmp, self.videoOverlayParser, logUtilHelper);
                ffmpegVideoOutputRtmp.on("streamStart", function (data) {
                    self.emit("streamStartRtmp",{});
                });
                ffmpegVideoOutputRtmp.on("streamStop", function (data) {
                    self.emit("streamStopRtmp",{});
                })
            }
            ffmpegVideoOutputRtmp.streamStart(incomingTransStream, throwError);
        }
    };
    var streamStopRtmp= function (throwError){
        if (ffmpegVideoOutputRtmp !== null) {
            ffmpegVideoOutputRtmp.streamStop(incomingTransStream, throwError);
        }
    };
    var streamStartRtmp2 = function (throwError){
        if (self.options.outputs && self.options.outputs.ffmpegVideoOutputRtmp2 && self.options.outputs.ffmpegVideoOutputRtmp2.rtmpUrl) { 
                
            if (ffmpegVideoOutputRtmp2 === null) {
                ffmpegVideoOutputRtmp2 = new FfmpegVideoOutputRtmp(self.options.outputs.ffmpegVideoOutputRtmp2, self.videoOverlayParser, logUtilHelper);
                ffmpegVideoOutputRtmp.on("streamStart", function (data) {
                    self.emit("streamStartRtmp2",{});
                });
                ffmpegVideoOutputRtmp.on("streamStop", function (data) {
                    self.emit("streamStopRtmp2",{});
                });
            }
            ffmpegVideoOutputRtmp2.streamStart(incomingTransStream, throwError);
        }
    };
    var streamStopRtmp2= function (throwError){
        if (ffmpegVideoOutputRtmp2 !== null) {
            ffmpegVideoOutputRtmp2.streamStop(incomingTransStream, throwError);
        }
    };
    var streamStartFile= function (throwError){
        if (self.options.outputs && self.options.outputs.ffmpegVideoOutputFile && self.options.outputs.ffmpegVideoOutputFile.outputFile) { 
                
            if (ffmpegVideoOutputFile === null) {
                ffmpegVideoOutputFile = new FfmpegVideoOutputFile(self.options.outputs.ffmpegVideoOutputFile, self.videoOverlayParser, logUtilHelper);
                ffmpegVideoOutputRtmp.on("streamStart", function (data) {
                    self.emit("streamStartFile",{});
                });
                ffmpegVideoOutputRtmp.on("streamStop", function (data) {
                    self.emit("streamStopFile",{});
                });
            }
            ffmpegVideoOutputFile.streamStart(incomingTransStream, throwError);
        }
    };
    var streamStopFile= function (throwError){
        if (ffmpegVideoOutputFile !== null) {
            ffmpegVideoOutputFile.streamStop(incomingTransStream, throwError);
        }
    };


    var updateOverlay= function (options) {
        try {
            if(self.videoOverlayParser !== null){
                var overlayText = self.videoOverlayParser.getOverlayText(options)
                if(self.options.overlayFileName != null ){
                    var overlayFilePath = path.join(__dirname, '..', self.options.overlayFileName);
                    try {
                        fs.writeFileSync(overlayFilePath, overlayText);

                    } catch (ex) {
                        logUtilHelper.log(appLogName, "app", "error", "Error Writing OverlayText File", ex);
                    }
                }
                if (ffmpegVideoOutputRtmp !== null) {
                    ffmpegVideoOutputRtmp.updateOverlay(options);
                }
                if (ffmpegVideoOutputRtmp2 !== null) {
                    ffmpegVideoOutputRtmp2.updateOverlay(options);
                }
                if (ffmpegVideoOutputFile !== null) {
                    ffmpegVideoOutputFile.updateOverlay(options);
                }
            }else{
                logUtilHelper.log(appLogName, "app", "warning", "videoOverlayParser is null");    
            }
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", "error", "Error Writing OverlayText File", ex);
        }

    }

   

    self.streamStart = streamStart;
    self.streamStop = streamStop;

    self.streamStartRtmp = streamStartRtmp;
    self.streamStopRtmp = streamStopRtmp;
    self.streamStartRtmp2 = streamStartRtmp2;
    self.streamStopRtmp2 = streamStopRtmp2;
    self.streamStartFile = streamStartFile;
    self.streamStopFile = streamStopFile;
    self.updateOverlay = updateOverlay;

    self.commonData = function () {
        return commonData;
    }

}
// extend the EventEmitter class using our RadarMonitor class
util.inherits(FfmpegVideoInput, EventEmitter);

module.exports = FfmpegVideoInput;

