//rbatteryMonitor.js
const appLogName = "batteryMonitor"
var util = require('util');
var extend = require('extend');
var EventEmitter = require('events').EventEmitter;
var BatteryMonitor = function (options, logUtilHelper) {
    var self = this;
    var defaultOptions = {
        "fakeBatteryVoltage": 14.001,
        "fakeBatteryVoltageMin": 10.001,
        "fakeBatteryDecreaseValue": 0.001,
        "analogPin": "",
        "timerInterval": 60000,
        "maxHistoryCount": 500,
        "changeMinHistory": .2,
        "changeMinEmit": .1
    }
    
    var objOptions = extend({}, defaultOptions,  options);


    // EventEmitters inherit a single event listener, see it in action
    this.on('newListener', function (listener) {
        logUtilHelper.log(appLogName, "app", 'batteryMonitor Event Listener: ' + listener);
    });

    var commonData = {
        lastBatteryVoltage:  {time: new Date(), batteryVoltage:-0.001},
        batteryVoltage: { time: new Date(), batteryVoltage: -0.001 },
        voltageHistory: [],
        isEmulationEnabled: false
    }
    
    

    var readBatteryVoltage = function () {

        if (objOptions.analogPin === '') {
            //if we are windows they we are debug so no way to read voltage so fake it

            if (objOptions.fakeBatteryVoltage > objOptions.fakeBatteryVoltageMin) {
                objOptions.fakeBatteryVoltage = objOptions.fakeBatteryVoltage - objOptions.fakeBatteryDecreaseValue;
            }
            var x = { value: (objOptions.fakeBatteryVoltage * .107142857) / 1.800 };
            processBatteryVoltage(x);
        } else {
            if (self.platform === "beaglebone") {
                if (b) {
                    b.analogRead(objOptions.analogPin, processBatteryVoltage);
                }
            } else {
                //at Some point I will turn a board with a adc over i2c and we will read voltage that way.
                var x = { value: 99.99 };
                processBatteryVoltage(x);

            }
        }


    }

    var processBatteryVoltage = function (x) {
        var BatteryVoltage = ((x.value * 1.800) / (.107142857));
        logUtilHelper.log(appLogName, "app", 'Battery Voltage ' + BatteryVoltage);
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
        logUtilHelper.log(appLogName, "app", "Timer Execute!");
        readBatteryVoltage();
        setTimeout(recursiveTimerStart, objOptions.timerInterval);
    };

    var b = undefined;
    if (process.platform !== 'win32') {
        const isPi = require('./platformDetect.js');
        //b = require('bonescript');

        if (isPi()) {
            logUtilHelper.log(appLogName, "app", 'Running on Raspberry Pi!');
            self.platform = "raspberry";
        } else {
            try {
                if (objOptions.analogPin !== ""){
                    var BeagleBone = require('beaglebone-io');
                    b = new BeagleBone();
                    self.platform = "beaglebone";
                    b.on('ready', function () {
                        this.pinMode(objOptions.analogPin, this.MODES.ANALOG);
                        this.analogRead(objOptions.analogPin, processBatteryVoltage);
                    });
                }
            } catch (ex) {
                debug('Not running on Beagle Bone!');
            }
        }


        
    } else {
        self.platform = 'win32';
        
        recursiveTimerStart(); //Only need this in windows to fake it ne Beaglebone-io does this for us
    }
}
// extend the EventEmitter class using our RadarMonitor class
util.inherits(BatteryMonitor, EventEmitter);

module.exports = BatteryMonitor;