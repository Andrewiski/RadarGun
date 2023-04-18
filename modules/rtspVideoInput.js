'use strict';
const appLogName = "rtspVideoInput";
var util = require('util');
const EventEmitter = require('events').EventEmitter;
//const debug = require('debug')('ffmpegVideoCapture');
const path = require('path');
const extend = require('extend');
const fs = require('fs');
const { Stream, pipeline } = require("stream");
var http = require('http');
const FfmpegVideoOutputRtmp = require("./ffmpegVideoOutputRtmp");
const FfmpegVideoOutputFile = require("./ffmpegVideoOutputFile");
var FfmpegVideoInput = function (options, logUtilHelper) {

    var self = this;
    var defaultOptions = {
        "capture":true,
        outputs: null
    }

    if(logUtilHelper === null){
        throw new Error("logUtilHelper Can't be Null");
    }

    self.options = extend({}, defaultOptions, options);
    var CircularChunkArray = [];

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

    

    var restartStream = function () {
        //this is where we would play a local file until we get reconnected to internet.
        logUtilHelper.log(appLogName, "app", 'error', 'Restarting incoming Stream because it was Closed');
   
        startIncomingStream();
    };

    var incomingTransStream = null;
    var first100 = false;
    // incoming and backup transtream pipe to this depending on active source  to transform stream
    var incomingTransStreamChunkCounter = 0;
    incomingTransStream = new Stream.Transform();
    incomingTransStream._transform = function (chunk, encoding, done) {
        try {
            //logUtilHelper.log(appLogName, "app", 'debug', '[' + incomingTransStreamChunkCounter + '] transform stream chunk length: ' + chunk.length + ', highwater: ' + this.readableHighWaterMark);
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
            self.emit('streamStats', commonData.streamStats, false);
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
    var ffmpegVideoOutputMp4File = null;
    
    var startIncomingStream = function () {
    
        if (!(command === null || command === undefined)) {
            command.kill();
        }
        commonData.streamStats.status = "connected"; 
        self.emit('streamStats', commonData.streamStats);
        logUtilHelper.log(appLogName, "app", "debug", "Source Video URL", self.options.input)
        
        

        http.get(self.options.input, function(res) {
            pipeline(res, incomingTransStream, function(err){
                logUtilHelper.log(appLogName, "app", "warning", "Source Video URL had Error", self.options.input, err)
            })
            // res.on('data', function(chunk) {
            //     body += chunk;
            // });
            res.on('end', function() {
                logUtilHelper.log(appLogName, "app", "warning", "Source Video URL was closed", self.options.input)
            });
        });

        
        logUtilHelper.log(appLogName, "app","info", "ffmpeg Started");
    };

    var streamStart = function (throwError) {
        logUtilHelper.log(appLogName, "app", 'info', 'streamStart Command');
        try {
            startIncomingStream();
            if (self.options.outputs && self.options.outputs.ffmpegVideoOutputRtmp) { 
                
                if (ffmpegVideoOutputRtmp === null) {
                    ffmpegVideoOutputRtmp = new FfmpegVideoOutputRtmp(self.options.outputs.ffmpegVideoOutputRtmp, logUtilHelper);
                }
                ffmpegVideoOutputRtmp.streamStart(incomingTransStream, throwError);
            }
            if (self.options.outputs && self.options.outputs.ffmpegVideoOutputMp4File) { 
                
                if (ffmpegVideoOutputFile === null) {
                    ffmpegVideoOutputFile = new FfmpegVideoOutputFile(self.options.outputs.ffmpegVideoOutputMp4File, logUtilHelper);
                }
                ffmpegVideoOutputMp4File.streamStart(incomingTransStream, throwError);
            }
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", 'error', 'Error Starting Video Stream ', ex);
            if (throwError === true) {
                throw ex;
            }
        }
    };

    var streamStop = function (throwError) {
        logUtilHelper.log(appLogName, "app", 'warning', 'streamStop command');
        if (ffmpegVideoOutputRtmp !== null) {
            ffmpegVideoOutputRtmp.streamStop(throwError);
        }
        if (ffmpegVideoOutputFile !== null) {
            ffmpegVideoOutputFile.streamStop(throwError);
        }
        try {
            if (!(command === null || command === undefined)) {
                command.kill();
            }
        } catch (ex) {
            logUtilHelper.log(appLogName, "app", 'error', 'Error Stopping Video Stream ', ex);
            if (throwError === true) {
                throw ex;
            }
        }
    };

    var updateOverlayText = function (overlayText) {
        var overlayFilePath = path.join(__dirname, '..', self.options.overlayFileName);
        try {
            fs.writeFileSync(overlayFilePath, overlayText);

        } catch (ex) {
            logUtilHelper.log(appLogName, "app", "error", "Error Writing OverlayText File", ex);
        }
    }

   

    self.streamStart = streamStart;
    self.streamStop = streamStop;

    self.commonData = function () {
        return commonData;
    }

}
// extend the EventEmitter class using our RadarMonitor class
util.inherits(FfmpegVideoInput, EventEmitter);

module.exports = FfmpegVideoInput;

