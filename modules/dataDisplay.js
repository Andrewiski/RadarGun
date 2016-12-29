//dataDisplay.js
//This Module will manage displaying speedData to lcd and led displays directly connected to the beaglebone
//

var util = require('util');
var extend = require('extend');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('dataDisplay');
var nconf = require('nconf');
var AdafruitLedBackpack;

var dataDisplay = function (options) {
    var self = this;
    var commonData = { ledDisplays: [], lcdDisplays: [] };
    var defaultOptions = {
        "ledDisplays":
            [
              {
                  "name": "Led 0",
                  "I2CAddress": "0x70",
                  "I2CDevice": "/dev/i2c-2",
                  "enabled": false
              },
              {
                  "name": "Led 1",
                  "I2CAddress": "0x71",
                  "I2CDevice": "/dev/i2c-2",
                  "enabled": false
              },
              {
                  "name": "Led 2",
                  "I2CAddress": "0x72",
                  "I2CDevice": "/dev/i2c-2",
                  "enabled": false
              },
              {
                  "name": "Led 3",
                  "I2CAddress": "0x77",
                  "I2CDevice": "/dev/i2c-2",
                  "enabled": false
              }
            ]
          ,
        "lcdDisplays": [
          {
              "name": "Led 0",
              "I2CAddress": "0x37",
              "I2CDevice": "/dev/i2c-2",
              "enabled": false
          }
        ],
        "displayLocation": {
            "inMaxSpeed": {
                "type": "ledDisplays",
                "index": 0,
                "enabled": false
            },
            "inMinSpeed": {
                "type": "ledDisplays",
                "index": 0,
                "enabled": false
            },
            "outMaxSpeed": {
                "type": "ledDisplays",
                "index": 0,
                "enabled": false
            },
            "outMinSpeed": {
                "type": "ledDisplays",
                "index": 0,
                "enabled": false
            },
            "speedHistory": {
                "type": "lcdDisplays",
                "index": 0,
                "enabled": false
            }

        }
    }



    // EventEmitters inherit a single event listener, see it in action
    this.on('newListener', function (listener) {
        debug('dataDisplay Event Listener: ' + listener);
    });

    this.updateSpeedData = function (speedData) {
        debug('updateSpeedData ', speedData);
        if (objOptions.displayLocation) {
            if (objOptions.displayLocation.inMaxSpeed && objOptions.displayLocation.inMaxSpeed.enabled == true) {
                switch (objOptions.displayLocation.inMaxSpeed.type) {
                    case "ledDisplays":
                        if (commonData[objOptions.displayLocation.inMaxSpeed.type] && commonData[objOptions.displayLocation.inMaxSpeed.type][objOptions.displayLocation.inMaxSpeed.index]) {
                            var myAdafruitLedbackPack = commonData[objOptions.displayLocation.inMaxSpeed.type][objOptions.displayLocation.inMaxSpeed.index];
                            myAdafruitLedbackPack.writeNumber(speedData.inMaxSpeed, false, function (err) {
                                debug('inMaxSpeed ledDisplay ' + objOptions.displayLocation.inMaxSpeed.index + ' writeNumber ' + speedData.inMaxSpeed, err);
                            });
                        }
                        break;
                }

            }

            if (objOptions.displayLocation.outMaxSpeed && objOptions.displayLocation.outMaxSpeed.enabled == true) {
                switch (objOptions.displayLocation.outMaxSpeed.type) {
                    case "ledDisplays":
                        if (commonData[objOptions.displayLocation.outMaxSpeed.type] && commonData[objOptions.displayLocation.outMaxSpeed.type][objOptions.displayLocation.outMaxSpeed.index]) {
                            var myAdafruitLedbackPack = commonData[objOptions.displayLocation.outMaxSpeed.type][objOptions.displayLocation.outMaxSpeed.index];
                            myAdafruitLedbackPack.writeNumber(speedData.outMaxSpeed, false, function (err) {
                                debug('outMaxSpeed ledDisplay ' + objOptions.displayLocation.outMaxSpeed.index + ' writeNumber ' + speedData.outMaxSpeed, err);
                            });
                        }
                        break;
                }

            }
        }
        
    }

    

            
    nconf.file('./configs/dataDisplayConfig.json');
    var configFileSettings = nconf.get();
    var objOptions = extend({}, defaultOptions, configFileSettings);

    var commonData = { ledDisplays: [], lcdDisplays: [] };
    
    //this is no i2c on Windows so init Adafruit var here
    AdafruitLedBackpack = require('./AdafruitLedBackpack.js');
    if (objOptions.ledDisplays) {

        for (var i = 0; i < objOptions.ledDisplays.length; i++) {
            var ledDisplay = extend({},objOptions.ledDisplays[i]);
            var ledData = { ledDisplay: ledDisplay, index: i };
            commonData.ledDisplays.push[ledData];
            ledData.led = new AdafruitLedBackpack();
            debug('attempting adafruitLedBackpack init', ledDisplay);
            if (ledDisplay.enabled == true) {
                ledData.led.Initialize({ I2CAddress: ledDisplay.I2CAddress, I2CDevice: ledDisplay.I2CDevice }, function (err, ledData) {
                    debug('i2c adafruitLedBackpack Inited ', err, ledData.index);
                        
                    ledData.led.writeNumber(ledData.index, false, function (err, ledData) {
                        debug('i2c adafruitLedBackpack ledDisplay ' + ledData.index + ' writeNumber ', err);
                    }, ledData);
                       
                }, ledData);
            }
                
        }
    }

    

}
util.inherits(dataDisplay, EventEmitter);

module.exports = dataDisplay;