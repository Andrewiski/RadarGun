//GpsMonitor.js
//This Module will open uart and connect to a nmea gps sensor using a serial port
//it then raises events based on events
const appLogName = "gpsMonitor";
const util = require('util');
const extend = require('extend');
const EventEmitter = require('events').EventEmitter;

//var debug = require('debug')('gpsMonitor');
var exec = require('child_process').exec;
const { SerialPort } = require('serialport')
const { Readline } = require('@serialport/parser-readline')


var GpsMonitor = function (options, logUtilHelper) {
    var self = this;
    var defaultOptions = {
        "updateHostDateTime": false,
        "portName": "",
        "baudrate": 9600
    };
    
    var objOptions = extend({}, defaultOptions, options);
    // EventEmitters inherit a single event listener, see it in action
    this.on('newListener', function (listener) {
        logUtilHelper.log(appLogName, "app", "debug", 'gpsMonitor Event Listener: ' + listener);
    });

    var commonData = {
        needToUpdateHostDateTime: objOptions.updateHostDateTime
    }
    var isBeagleBone = false
    
    var isEnabled = false;

    
    var gpsSerialPortName = '';

    var gpsSerialPort;
    try{
        if (process.platform === 'win32') {
            isBeagleBone === false; 
        } else {
            isBeagleBone === true;
        }
        gpsSerialPortName = objOptions.portName;
        if (gpsSerialPortName) {
            gpsSerialPort = new SerialPort({path: gpsSerialPortName,
                baudRate: objOptions.baudrate,
                //parser: SerialPort.parsers.readline('\r\n'),
                autoOpen: false
            }); // this is the openImmediately flag [default is true]
            isEnabled = true;
        }
        
    } catch (ex) {
        debug('error  ' + gpsSerialPortName, ex);
    }


    logUtilHelper.log(appLogName, "app", "debug", 'started gpsMonitor on port ' + gpsSerialPortName);
    var GPS = require('gps');
    var gps = new GPS();
    gps.on('data', function (data) {
        //debug(data, gps.state);
        
        if (isBeagleBone && commonData.needToUpdateHostDateTime === true && !data.time) {

            exec('date -s "' + data.time.toString() + '"', function (error, stdout, stderr) {
                if (error) {
                    //throw error
                    logUtilHelper.log(appLogName, "app", "debug", "error setting host time to " + data.time.toString(), error);
                } else {
                    // Clock should be set now
                    commonData.needToUpdateHostDateTime == true
                    logUtilHelper.log(appLogName, "app", "debug", "Set host time to " + data.time.toString());
                    self.emit('gpsHostTime', { msg: "Set host time to " + data.time.toString(), data: data });
                }
            });
        }

        if (this.needGpsUpdate(data) === true) {
            logUtilHelper.log(appLogName, "app", "debug", "Gps " + data.time.toString());
            self.emit('gpsHostTime', { msg: "Set host time to " + data.time.toString(), data: data });
        }

    });

    this.needGpsUpdate = function (data) {
        return true;
    }
    var handleGpsSerialData =  function (data) {
        //debug("Gps Data" + data.toString());
        gps.update(data);
    }

    // Call the update routine directly with a NMEA sentence, which would
    // come from the serial port or stream-reader normally
    if (gpsSerialPort) {
        const readlineParser = new Readline('\r\n');
        gpsSerialPort.pipe(readlineParser);
        readlineParser.on('data', handleGpsSerialData);
        //gpsSerialPort.on('data', handleGpsSerialData);
        gpsSerialPort.open(function (err) {
            if (err) {
                logUtilHelper.log(appLogName, "app", "debug", 'open Error' + err);
            }
        });
    }

    this.getGpsState = function () {
        if (isEnabled === true) {
            return gps.state;
        }
    }
};
// extend the EventEmitter class using our RadarMonitor class
util.inherits(GpsMonitor, EventEmitter);

module.exports = GpsMonitor;