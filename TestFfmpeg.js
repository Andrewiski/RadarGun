'use strict';


const http = require('http');
const https = require('https');
const debug = require('debug')('testFfmpeg');
const path = require('path');
const nconf = require('nconf');
const extend = require('extend');
const { Stream } = require("stream");
const express = require('express');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
//const morgan = require('morgan');
//const rfs = require('rotating-file-stream');
//const nodemailer = require("nodemailer");
//var version = process.env.npm_package_version;
const packagejson = require('./package.json');
const version = packagejson.version;
const os = require('os');


var defaultOptions = {
    "rtspUrl": "rtsp://10.100.32.95:7447/0MxYqhH8uDMLeQ4j",
    "rtmpUrl": "rtmp://a.rtmp.youtube.com/live2/7w0t-zhy3-0wzw-9kw8-b1md",
    "videoRoute": "/videotest",
    "logLevel": "debug",
    "useHttp": true,
    "useHttps": false,
    "useHttpsClientCertAuth": false,
    "httpport": 1445,
    "httpsport": 1446,
    "audioCodec": "copy",
    "videoCodec": "libx264"
}

var objOptions = extend({}, defaultOptions);

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
            //add to the top of the 
            privateData.logs.push(logData);

            if (privateData.logs.length > objOptions.maxLogLength) {
                privateData.logs.shift();
            }

            //debug(arrayPrint(arguments));
            console.log(arrayPrint(arguments));
            //debug(arguments[0], arguments[1]);  // attempt to make a one line log entry
            //if (objOptions.loglevel === 'trace') {
            //    console.log(arguments);
            //}
        }
        if (io && privateData.browserSockets) {
            for (const item of Object.values(privateData.browserSockets)) {
                if (shouldLog(logLevel, item.logLevel)) {
                    item.socket.emit("streamerLog", logData);
                }
            }
        }
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

var app = express();

if (process.env.FFMPEG_PATH === undefined || process.env.FFMPEG_PATH === '') {
    process.env.FFMPEG_PATH = path.join(__dirname, 'ffmpeg', 'ffmpeg.exe');
}

if (process.env.FFPROBE_PATH === undefined || process.env.FFPROBE_PATH === '') {
    process.env.FFPROBE_PATH = path.join(__dirname, 'ffmpeg', 'ffmpeg.exe');
}

var ffmpeg = require('fluent-ffmpeg');


var commonData = {
    startupStats: {
        startupDate: new Date(),
        nodeVersion: process.version,
        nodeVersions: process.versions,
        platform: process.platform,
        arch: process.arch,
        ipAddress: process.env.IP_ADDR,
        streamerVersion: version
    },
    logs: [],
    activeStreams: {},

    streamStats: {
        chunkCounter: 0,
        chunkShow: 0,
        status: "disconnected",
        error: null,
        metadata: {},
    },
    clientStats: {
        clientCounter: 0,
        maxClients: 0
    },
    machineStats: {
        cpuCount: os.cpus,
        freeMem: 0.0,
        cpuUsage: 0.0,
        loadAvg1: 0.0,
        loadAvg5: 0.0,
        sysUptime: 0.0,
        ipAddress: process.env.IP_ADDR
    }
};

var privateData = {
    logs: [],
    browserSockets: {}
};


let proc_count = 0;
let i = 0;
var transStream = null;

var machineStats = function () {
    updateMachineStats();
    writeToLog("debug", JSON.stringify(commonData.machineStats));
    if (io) {
        io.emit('machineStats', commonData.machineStats);
    }


};

var updateMachineStats = function () {
    commonData.machineStats.freeMem = (os.freemem() / 1000000000).toFixed(2);
    // library on git has fix for os.cpuUsage
    //commonData.machineStats.cpuUsage = os.cpuUsage();
    commonData.machineStats.cpus = (os.cpus);
    commonData.machineStats.cpuUsage = (os.loadavg()[0].toFixed(1));
    commonData.machineStats.loadAvg1 = (os.loadavg()[0].toFixed(1));
    commonData.machineStats.loadAvg5 = (os.loadavg()[1]).toFixed(1);
    commonData.machineStats.loadAvg15 = (os.loadavg()[2]).toFixed(1);
    commonData.machineStats.sysUptime = os.uptime(); //(os.uptime()).toFixed(0);
    commonData.machineStats.release = os.release;



};

//machineStats();
setInterval(machineStats, 15000);

process.on('SIGTERM', () => {
    try {
        writeToLog('warning', 'Server Shutdown SIGTERM');
        if (https_srv) {
            https_srv.close();
        }
        if (http_srv) {
            http_srv.close();
        }
    } catch (ex) {
        writeToLog('error', 'Error Closing down Servers on SIGTERM', ex);
    }

});



var sendAdminStreamDownMessage = function () {
    try {
        // create reusable transporter object using the default SMTP transport
        //let transporter = nodemailer.createTransport({
        //    host: "10.100.2.14",
        //    port: 587,
        //    secure: false,
        //    auth: {
        //        user: "smtpuser",
        //        pass: "N0t4Y0u"
        //    },
        //    tls: {
        //        // do not fail on invalid certs
        //        rejectUnauthorized: false
        //    }
        //});

        //// send mail with defined transport object
        //let info = transporter.sendMail({
        //    from: '"RtspRtmpStreamer" <smtpuser@digitalexample.com>', // sender address
        //    to: "adevries@digitalexample.com", // list of receivers
        //    subject: "RtspRtmpStreamer", // Subject line
        //    text: "The Source Stream has restarted", // plain text body
        //    html: "<b>The Source Stream Has Restarted</b>", // html body
        //},
        //    function (err, info) {
        //        if (err) {
        //            writeToLog("error", "sendAdminStreamDownMessage sendMail", err);
        //        } else {
        //            writeToLog("info", "Message sent: %s", info.messageId);
        //        }

        //    }
        //);
        writeToLog("info", "sendAdminStreamDownMessage", ex);
    } catch (ex) {
        writeToLog("error", "sendAdminStreamDownMessage", ex);
    }

}


//// start transform stream first, then connect monitor to it to consume....
//// then connect ffmpeg as source.
//transStream = new Stream.Transform();
//transStream._transform = function (chunk, encoding, done) {
//    //i++;
//    //writeToLog('trace' (i + ' transform: ' + chunk.length);
//    this.push(chunk);
//    return done();
//};

//// Start Monitor Stream 
//// Read from the source stream, to keeps it alive and flowing
//var monitorStream = new Stream.Writable({});
//// Consume the stream
//monitorStream._write = (chunk, encoding, next) => {
//    // Show less progress updates
//    if (commonData.streamStats.chunkCounter >= commonData.streamStats.chunkShow) {
//        writeToLog('trace', "[MONITOR] chunks processed: " + commonData.streamStats.chunkCounter);
//        commonData.streamStats.chunkShow = commonData.streamStats.chunkShow + 100;

//        if (io) {
//            io.emit('streamStats', commonData.streamStats);
//        }

//    }
//    commonData.streamStats.chunkCounter++;
//    next();
//};
//transStream.pipe(monitorStream);

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

    // Lets Parse Out the stderr and see if we can find any info

    //debug('source ffmpeg stderr: ' + stderr);


    var stdOut = parseStdOutput(stderr);

    switch (stdOut.type) {
        case 'info':
        case 'verbose':
            if (stdOut.values.size) {
                commonData.streamStats.info = stdOut.values;
                writeToLog('trace', 'parsed stdErr: ', stdOut);
            } else {
                if (stdOut.values.StreamTitle) {
                    commonData.streamStats.metadata.StreamTitle = stdOut.values.StreamTitle;

                }
                if (stdOut.values.icydescription) {
                    commonData.streamStats.metadata.icydescription = stdOut.values.icydescription;
                }
                if (stdOut.values.icygenre) {
                    commonData.streamStats.metadata.icygenre = stdOut.values.icygenre;
                }
                if (stdOut.values.icyname) {
                    commonData.streamStats.metadata.icyname = stdOut.values.icyname;
                }
                if (stdOut.values.icypub) {
                    commonData.streamStats.metadata.icypub = stdOut.values.icypub;
                }
                if (stdOut.values.icyurl) {
                    commonData.streamStats.metadata.icyurl = stdOut.values.icyurl;
                }
                writeToLog('debug', 'parsed stdErr: ', stdOut);
            }
            //debug('parsed stdErr: ', stdOut);
            break;
        default:
            writeToLog('debug', 'parsed stderr: ', stdOut);
    }

    //commonData.streamStats.status = "disconnected";
    //commonData.streamStats.error = stderr;
    //if (io) {
    //    io.emit('streamStats', commonData.streamStats);
    //}
};

var commandError = function (err, stdout, stderr) {
    writeToLog('error', 'an error happened: ' + err.message, err, stdout, stderr);
    commonData.streamStats.status = "disconnected";
    commonData.streamStats.error = err;
    commonData.streamStats.stdout = stdout;
    commonData.streamStats.stderr = stderr;
    if (io) {
        io.emit('streamStats', commonData.streamStats);
    }
    if (err && err.message && err.message.startsWith('ffmpeg exited with code') === true) {
        setTimeout(restartStream, 30000);
    }
};

var commandProgress = function (progress) {

    if (commonData.streamStats.status === "disconnected") {
        commonData.streamStats.status = "connected";
        if (io) {
            io.emit('streamStats', commonData.streamStats);
        }
    }
    proc_count++;
};

var commandEnd = function (result) {
    commonData.streamStats.status = "disconnected";
    commonData.streamStats.error = "commandEnd Called";
    if (io) {
        io.emit('streamStats', commonData.streamStats);
    }
    writeToLog('error', 'Source Stream Closed');
    setTimeout(restartStream, 30000);
};

var restartStream = function () {
    //this is where we would play a local file until we get reconnected to internet.
    writeToLog('error', 'Restarting incoming Stream because it was Closed');
    sendAdminStreamDownMessage();
    startIncomingStream();
};


var overlayFile = "overlay.txt"; //path.join(__dirname, "overlay.txt").replace(":", "\\:");

var startIncomingStream = function () {
    //command = orginalCommand.clone();
    if (!(command === null || command === undefined)) {
        command.kill();
        //transStream.destroy();
    }


    commonData.streamStats.status = "connected";
    if (io) {
        io.emit('streamStats', commonData.streamStats);
    }

    writeToLog("debug", "Source Video URL", objOptions.rtspUrl)

    command = ffmpeg({ source: objOptions.rtspUrl })
        .addInputOption('-rtsp_transport tcp')
        //.addInputOption('-tune zerolatency ')
        //.addInputOption('-map 0')
        //.videoCodec(objOptions.videoCodec)
        //.audioCodec('libfdk_aac')
        // TODO: resolve / test ffmpeg retry:     stimeout
        .addInputOption('-stimeout 30000000')
        //.addOption('reconnect', 1)
        //.addOption('reconnect_at_eof', 1)
        //.addOption('reconnect_streamed', 1)
        //.addOption('reconnect_delay_max', 20)
        // .inputOptions([
        //     '-reconnect 1',
        //     '-reconnect_at_eof 1',
        //     '-reconnect_streamed 1',
        //     '-reconnect_delay_max 20'
        //   ])
        // https://lists.ffmpeg.org/ffmpeg.html#Generic-options     repeat+level+verbose
        .output(objOptions.rtmpUrl)
        .withOutputFormat('flv')
        .videoCodec('libx264')
        //.audioCodec('aac')
        .outputOptions('-pix_fmt +')    //If pix_fmt is a single +, ffmpeg selects the same pixel format as the input (or graph output) and automatic conversions are disabled.
        .outputOptions('-g 60')
        .outputOptions('-c:v libx264')
        .outputOptions('-c:a aac')
        .videoFilters({
            filter: "drawtext",
            options: 'fontfile=arial.ttf:fontsize=50:box=1:boxcolor=black@0.75:boxborderw=5:fontcolor=white:x=(w-text_w)/2:y=((h-text_h)/2)+((h-text_h)/2):textfile=' + overlayFile  + ':reload=1'
        })
        .addOption('-loglevel level+verbose')       //added by Andy so we can parse out stream info
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
};

startIncomingStream();


var ffstream = null;
var videoRoute = objOptions.videoRoute || "/video";

var getConnectionInfo = function (req) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (ip.substr(0, 7) === "::ffff:") {
        ip = ip.substr(7);
    }
    var port = req.connection.remotePort;
    var ua = req.headers['user-agent'];
    return { ip: ip, port: port, ua: ua };
};


var getSocketInfo = function (socket) {
    var ip = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;
    if (ip.substr(0, 7) === "::ffff:") {
        ip = ip.substr(7);
    }

    return { ip: ip };
};

app.use(express.static(path.join(__dirname, 'public')));

// disable the x-power-by express message in the header
app.disable('x-powered-by');


//// Log all requests to access_log.log
//// create using a rotating write stream
//var accessLogStream = rfs('access_log.log', {
//    interval: '1d', // rotate daily
//    path: path.join(__dirname, 'log')
//});
////app.use(morgan('combined', { stream: accessLogStream } ));
//app.use(morgan('[:date[iso]] :remote-addr :method :url :http-version :status ":user-agent" :response-time :referrer :remote-user ',
//    { stream: accessLogStream }
//));



// not needed already served up by io app.use('/javascript/socket.io', express.static(path.join(__dirname, 'node_modules', 'socket.io', 'node_modules', 'socket.io-client', 'dist')));
app.use('/javascript/fontawesome', express.static(path.join(__dirname, 'node_modules', 'font-awesome')));
app.use('/javascript/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
app.use('/javascript/jquery', express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist')));
app.use('/javascript/moment', express.static(path.join(__dirname, 'node_modules', 'moment', 'min')));
app.use('/javascript/bootstrap-notify', express.static(path.join(__dirname, 'node_modules', 'bootstrap-notify')));
app.use('/javascript/animate-css', express.static(path.join(__dirname, 'node_modules', 'animate.css')));
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

var routes = express.Router();

//routes.get(videoRoute, function (req, res) {
//    commonData.clientStats.clientCounter++;
//    if (commonData.clientStats.clientCounter > commonData.clientStats.maxClients) {
//        commonData.clientStats.maxClients = commonData.clientStats.clientCounter;
//    }

//    var connInfo = getConnectionInfo(req);
//    var connectionsStatus = "status: client connect" + ", count:" + commonData.clientStats.clientCounter + ", ip:" + connInfo.ip + ", port:" + connInfo.port + ", ua:" + connInfo.ua;
//    writeToLog('info', connectionsStatus);
//    res.setHeader('Connection', 'close');
//    res.setHeader('Transfer-Encoding', 'chunked');
//    res.setHeader('Content-Type', 'video/x-flv');
//    res.setHeader('Cache-Control', 'no-cache');
//    var connectionId = uuidv4();
//    var streamInfo = {
//        connectionId: connectionId,
//        clientId: null,
//        connInfo: connInfo,
//        timestamp: new Date()
//    };
//    if (req.cookies.clientId !== undefined) {
//        streamInfo.clientId = req.cookies.clientId;
//    } else {
//        streamInfo.clientId = uuidv4();
//    }
//    res.cookie('clientId', streamInfo.clientId, { maxAge: 900000, httpOnly: true });


//    commonData.activeStreams[connectionId] = streamInfo;
//    if (io) {
//        io.emit('streamStats', commonData.streamStats);
//        io.emit('clientStats', commonData.clientStats);
//        io.emit('machineStats', commonData.machineStats);
//        io.emit('streamConnect', commonData.activeStreams[connectionId]);
//        io.emit('startupStats', commonData.startupStats);

//    }



//    res.on('finish', function () {
//        commonData.clientStats.clientCounter--;

//        var connectionsStatus = "status: client finish" + ", count:" + commonData.clientStats.clientCounter + ", ip:" + connInfo.ip + ", port:" + connInfo.port + ", ua:" + connInfo.ua;
//        writeToLog('info', connectionsStatus);

//        if (io) {
//            io.emit('streamStats', commonData.streamStats);
//            io.emit('clientStats', commonData.clientStats);
//            io.emit('streamFinish', commonData.activeStreams[connectionId]);
//            delete commonData.activeStreams[connectionId];
//        }

//    });

//    res.on('close', function () {
//        commonData.clientStats.clientCounter--;

//        var connectionsStatus = "status: client close" + ",   count:" + commonData.clientStats.clientCounter + ", ip:" + connInfo.ip + ", port:" + connInfo.port + ", ua:" + connInfo.ua;
//        writeToLog('info', connectionsStatus);

//        if (io) {
//            io.emit('streamStats', commonData.streamStats);
//            io.emit('clientStats', commonData.clientStats);
//            io.emit('streamClose', commonData.activeStreams[connectionId]);
//            delete commonData.activeStreams[connectionId];
//        }

//    });
//    transStream.pipe(res, { end: true });
//});



routes.get('/', function (req, res) {
    var connInfo = getConnectionInfo(req);
    res.end();
    var connectionsStatus = "status: default route attempt" + ", count:" + commonData.clientStats.clientCounter + ", ip:" + connInfo.ip + ", port:" + connInfo.port + ", ua:" + connInfo.ua;
    writeToLog('info', connectionsStatus);
});

// Link to setup express to require client certs https://medium.com/@sevcsik/authentication-using-https-client-certificates-3c9d270e8326
// make route to admintool harder to guess
routes.get('/VideoStreamerAdminTool', function (req, res) {
    var connInfo = getConnectionInfo(req);
    var connectionsStatus = "status: admintool connect" + ", count:" + commonData.clientStats.clientCounter + ", ip:" + connInfo.ip + ", port:" + connInfo.port + ", ua:" + connInfo.ua;
    writeToLog('info', connectionsStatus);

    if (objOptions.useHttpsClientCertAuth) {
        const cert = req.connection.getPeerCertificate();
        if (req.client.authorized) {
            writeToLog('info', `Client Certificate Accepted ${cert.subject.CN}, certificate was issued by ${cert.issuer.CN}!`);
            res.sendFile(path.join(__dirname, 'admin/index.htm'));
        } else if (cert.subject) {
            writeToLog('warning', `Invalid Client Certificate ${cert.subject.CN}, certificate was issued by ${cert.issuer.CN}!`);
            res.status(403).send(`Sorry ${cert.subject.CN}, certificates from ${cert.issuer.CN} are not welcome here.`);
        } else {
            writeToLog('warning', 'Client Cert Auth Enabled but no Certificate was sent by client');
            res.status(401).send(`Sorry, but you need to provide a client certificate to continue.`);
        }
    } else {
        res.sendFile(path.join(__dirname, 'admin/index.htm'));
    }
});


app.use('/', routes);

const ioServer = require('socket.io');
var io = null;
//Only Wire up Admin Page and ??

io = new ioServer();

var https_srv = null;
if (objOptions.useHttps === true) {
    var httpsOptions = {
        key: fs.readFileSync(path.join(__dirname, 'config', 'server.key')),
        cert: fs.readFileSync(path.join(__dirname, 'config', 'server.cert'))
    };
    if (objOptions.useHttpsClientCertAuth) {
        httpsOptions.ca = [fs.readFileSync(path.join(__dirname, 'config', 'ca.cert'))];
        httpsOptions.requestCert = true;
        httpsOptions.rejectUnauthorized = false;
    }
    https_srv = https.createServer(httpsOptions, app).listen(objOptions.httpsport, function () {
        writeToLog('info', 'Express server listening on https port ' + objOptions.httpsport);
    });
    io.attach(https_srv);
}

var http_srv = null;
if (objOptions.useHttp === true) {
    http_srv = http.createServer(app).listen(objOptions.httpport, function () {
        writeToLog('info', 'Express server listening on http port ' + objOptions.httpport);
    });
    io.attach(http_srv);
};


var audioStart = function (throwError) {
    writeToLog('info', 'audiostart Command');
    try {
        startIncomingStream();
    } catch (ex) {
        writeToLog('error', 'Error Starting Audio Stream ', ex);
        if (throwError === true) {
            throw ex;
        }
    }
};

var audioStop = function (throwError) {
    writeToLog('warning', 'audiostop command');
    try {
        if (!(command === null || command === undefined)) {
            command.kill();
        }
    } catch (ex) {
        writeToLog('error', 'Error Stopping Audio Stream ', ex);
        if (throwError === true) {
            throw ex;
        }
    }
};

// This is the socket io for the local Admin page

//io = require('socket.io')(https_srv);
io.on('connection', function (socket) {


    writeToLog('trace', 'browser', socket.id, 'Connection');

    if (privateData.browserSockets[socket.id] === undefined) {
        privateData.browserSockets[socket.id] = {
            socket: socket,
            logLevel: objOptions.logLevel

        };
    }

    socket.on('ping', function (data) {
        writeToLog('trace', 'browser', socket.id, 'ping');
    });

    // disable for port http; force authentication
    socket.on('audiostop', function (data) {
        writeToLog('debug', 'browser', socket.id, 'audiostop');
        audioStop();
    });

    socket.on('audiostart', function (data) {
        writeToLog('debug', 'browser', socket.id, 'audiostart');
        audioStart();
    });

    socket.on("disconnect", function () {
        try {
            writeToLog("info", 'browser', socket.id, "disconnect", getSocketInfo(socket));
            if (privateData.browserSockets[socket.id]) {
                delete privateData.browserSockets[socket.id];
            }
        } catch (ex) {
            writeToLog('error', 'Error socket on', ex);
        }
    })


    //This is a new connection, so send info to commonData
    socket.emit('commonData', commonData);

});


