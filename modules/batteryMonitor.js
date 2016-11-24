//radarStalker2.js
//This Module will open uart and connect to a stalker Pro II radar sensor using a serial port
//it then raises events based on events

var util = require('util');
var extend = require('extend');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('batteryMonitor');
var nconf = require('nconf');
var BatteryMonitor = function (options) {
    var self = this;
    var defaultOptions = {
        "fakeBatteryVoltage": 14.001,
        "fakeBatteryVoltageMin": 10.001,
        "fakeBatteryDecreaseValue": 0.001,
        "analogPin": "P9_33",
        "timerInterval": 60000,
        "maxHistoryCount": 500,
        "changeMinHistory": .2,
        "changeMinEmit": .1
    }
    nconf.file('./configs/batteryMonitorConfig.json');
    var configFileSettings = nconf.get();
    var objOptions = extend({}, defaultOptions, configFileSettings, options);


    // EventEmitters inherit a single event listener, see it in action
    this.on('newListener', function (listener) {
        debug('batteryMonitor Event Listener: ' + listener);
    });

    var commonData = {
        lastBatteryVoltage:  {time: new Date(), batteryVoltage:-0.001},
        batteryVoltage: { time: new Date(), batteryVoltage: -0.001 },
        voltageHistory: [],
        isEmulationEnabled: false
    }
    
    var b = undefined;
    if (process.platform !== 'win32') {
        b = require('bonescript');
    }

    var readBatteryVoltage = function () {

        if (process.platform === 'win32') {
            //if we are windows they we are debug so no way to read voltage so fake it

            if (objOptions.fakeBatteryVoltage > objOptions.fakeBatteryVoltageMin) {
                objOptions.fakeBatteryVoltage = objOptions.fakeBatteryVoltage - objOptions.fakeBatteryDecreaseValue;
            }
            var x = { value: (objOptions.fakeBatteryVoltage * .107142857) / 1.800 };
            processBatteryVoltage(x);
        } else {
            b.analogRead(objOptions.analogPin, processBatteryVoltage);
        }


    }

    var processBatteryVoltage = function (x) {
        var BatteryVoltage = ((x.value * 1.800) / (.107142857));
        debug('Battery Voltage ' + BatteryVoltage);
        var difference = commonData.lastBatteryVoltage.batteryVoltage - BatteryVoltage;
        if (difference < 0) {
            //if negitive make it a positive value
            difference = 0 - difference;
        }
        var batteryVoltage = { time: new Date(), batteryVoltage: BatteryVoltage };
        commonData.lastBatteryVoltage = commonData.batteryVoltage;
        commonData.batteryVoltage = batteryVoltage;
        if (difference > objOptions.changeMinHistory) {
            commonData.voltageHistory.push(batteryVoltage); //Add to end of history array
            if (commonData.voltageHistory.length > objOptions.maxHistoryCount) {
                //remove first
                commonData.voltageHistory.shift();
            }
        }
        if (difference > objOptions.changeMinEmit) {
            self.emit('batteryVoltage', batteryVoltage);
        }
    }

    this.getBatteryVoltage = function () {
        return commonData.batteryVoltage;
    }

    var recursiveTimerStart = function () {
        debug("Timer Execute!");
        readBatteryVoltage();
        setTimeout(recursiveTimerStart, objOptions.timerInterval);
    };
    recursiveTimerStart();
}
// extend the EventEmitter class using our RadarMonitor class
util.inherits(BatteryMonitor, EventEmitter);

module.exports = BatteryMonitor;