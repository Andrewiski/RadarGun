//adafruitLedBackpack.Js
//This Module will connect to the i2c ht16k33 led Backpack and allow setting of the display




var util = require('util');
var extend = require('extend');
var EventEmitter = require('events').EventEmitter;
//var bonescript = require('octalbonescript');
var i2c = require('i2c');
var debug = require('debug')('adafruitLedBackpack');

var adafruitLedBackpack = function () {
    var self = this;
    var defaultOptions = {
        I2CAddress: "0x70", //the i2c address of the LedBackpack
        I2CDevice: '/dev/i2c-2'
    }
    var objOptions = {};
    var isInited = false;
    var HT16K33_BLINK_CMD = 0x80;
    var HT16K33_BLINK_DISPLAYON = 0x01;
    var HT16K33_BLINK_OFF = 0;
    var HT16K33_BLINK_2HZ  = 1;
    var HT16K33_BLINK_1HZ = 2;
    var HT16K33_BLINK_HALFHZ = 3;
    var HT16K33_CMD_BRIGHTNESS = 0xE0;
    var HT16K33_CMD_SYSTEM = 0x20;
    var buffer = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var digits = [
        0x3F, //0
        0x06, //1
        0x5B, //2
        0x4F, //3
        0x66, //4
        0x6D, //5
        0x7D, //6
        0x07, //7
        0x7F, //8
        0x6F, //9
        0x77, //A
        0x7C, //B
        0x39, //C
        0x5E, //D
        0x79, //E
        0x71, //F
        0x00  //blank
        ];

    var exports = module.exports = {};
    var i2cdevice;

    self.Initialize = function (options, Callback) {
        objOptions = extend({}, defaultOptions, options);
        //sets up the device
        //needed to open the cape manager port
        debug('i2c new Address ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress);
        if (typeof (objOptions.I2CDevice) === "string") {   //if string convert to int
            objOptions.I2CDevice = parseInt(objOptions.I2CDevice);
        }
        i2cdevice = new i2c(objOptions.I2CAddress, { I2CDevice: objOptions.I2CDevice, debug: false }); 
        i2cdevice.open(objOptions.I2CDevice,
            function (err, port) {

                if (err) {
                    debug('bonescript i2c.open error %s ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress, err);
                    isInited = false;
                    if (Callback) {
                        Callback(err);
                    }
                } else {
                    // Turn on the LED Ocillator
                    //i2cdevice.setAddress(objOptions.I2CAddress);
                    i2cdevice.writeBytes(HT16K33_CMD_SYSTEM | HT16K33_BLINK_DISPLAYON, [0x00],
                        function (err) {
                            if (err) {
                                debug('Error in init DisplayOn %s ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress, err);
                                if (Callback) {
                                    Callback(err);
                                }
                            } else {
                                debug('ocillator enabled ' + objOptions.I2CDevice + '/' + + objOptions.I2CAddress);
                                i2cdevice.writeBytes(HT16K33_BLINK_CMD | 0x01, [0x00], function (err) {
                                    if (err) {
                                        debug('Error in init setBlinkRate %s ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress, err);
                                        if (Callback) {
                                            Callback(err);
                                        }
                                    } else {
                                        debug('display enabled ' + objOptions.I2CDevice + '/' + + objOptions.I2CAddress);
                                        i2cdevice.writeBytes(HT16K33_CMD_BRIGHTNESS | 15, [0x00], function (err) {
                                            if (err) {
                                                debug('Error in init setBrightness %s ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress, err);
                                            } else {
                                                debug('Brightness set to high ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress);
                                                i2cdevice.writeBytes([0x00], [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], function (err) {
                                                    if (err) {
                                                        debug('Error in init clear ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress, err);
                                                    } else {
                                                        debug('cleared display ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress);
                                                        isInited = true;
                                                        if (Callback) {
                                                            Callback(err);
                                                        }
                                                    }
                                                });
                                                
                                            }
                                        }); // setBrightness
                                    }
                                }); // setBlinkRate
                            }
                        }); //WriteData    // oscillator on
                }
             });//i2cOpen
    }  //Intilize Function Close

    self.setBrightness = function (brightness, Callback) {
        debug('setBrightness %s', brightness);
        WriteData(HT16K33_CMD_BRIGHTNESS | brightness, [0x00], Callback);
    }

    self.setBlinkRate = function (rate, Callback) {
        debug('setBlinkRate %s ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress, rate);
        WriteData(HT16K33_BLINK_CMD | 0x01 | rate, [0x00], Callback);
    }

    self.writeDisplay = function (Callback) {
        debug('writeDisplay ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress);
        WriteData(0x00, buffer, Callback);
    }

    function setBufferRow(row, value) {
        debug('setBufferRow ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress, row, value);
        buffer[row * 2] = value & 0xFF;
        buffer[row * 2 + 1] = 0x00; //(value >> 8);
        
    }
    function getBufferRow(row) {
        
        return buffer[row * 2];

    }

    self.clear = function (Callback) {
        debug('clear ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress);
        for (var i = 0; i < 16; i++) {
            buffer[i] = 0;
        }
        self.writeDisplay(Callback);
    }

   

    self.writeDigit = function (charNumber, value, dot, Callback) {
        debug('writeDigit ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress, charNumber, value, dot);
        setBufferRow(charNumber, digits[value] | (dot << 7), Callback);
        self.writeDisplay(Callback);
    }

    self.setColon = function (colonOn, Callback) {
        debug('setColon ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress, colonOn);
        if (colonOn) {
            setBufferRow(2, 0xFF, Callback);
        }
        else {
            setBufferRow(2, 0, Callback);
        }
        self.writeDisplay(Callback);
    }

    function ReadData(Register, Bytes, Callback) {
        if (i2cdevice && isInited) {
            i2cdevice.readBytes(Register, Bytes, function (err, data) {
                var ParsedData;
                if (Bytes == 1) {
                    ParsedData = data.readUInt8(0);
                }
                else if (Bytes == 2) {
                    ParsedData = data.readUInt16BE(0);
                }
                if (Callback) {
                    Callback(err, ParsedData);
                }
            });
        } else {
            debug('ReadData No i2cDevice ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress);
            if (Callback) {
                Callback('No i2cDevice ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress, null);
            }
        }
    }

    //sends the LSB first. The device wants the MSB first. 
    function WriteData(Register, ByteArray, Callback) {
        if (i2cdevice && isInited) {
            debug('WriteData ', Register)
            i2cdevice.writeBytes(Register, ByteArray, function (err) {
                if (Callback) {
                    Callback(err);
                }
            });
        } else {
            debug('WriteData No i2cDevice ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress)
            if (Callback) {
                Callback('No i2cDevice ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress, null);
            }
        }
    }

    function getDigitValue(digit) {
        if (digit =="0") {
            return digits[0];
        }else if (digit =="1") {
            return digits[1];
        } else if (digit =="2") {
            return digits[2];
        } else if (digit =="3") {
            return digits[3];
        } else if (digit =="4") {
            return digits[4];
        } else if (digit =="5") {
            return digits[5];
        } else if (digit =="6") {
            return digits[6];
        } else if (digit =="7") {
            return digits[7];
        } else if (digit =="8") {
            return digits[8];
        } else if (digit =="9") {
            return digits[9];
        } else if (digit.toLowerCase() =="a") {
            return digits[10];
        } else if (digit.toLowerCase() =="b") {
            return digits[11];              
        } else if (digit.toLowerCase() =="c") {
            return digits[12];
        } else if (digit.toLowerCase() =="d") {
            return digits[13];
        } else if (digit.toLowerCase() =="e") {
            return digits[14];
        } else if (digit.toLowerCase() =="f") {
            return digits[15];
        } else {
            return digits[16];
        }
}

   self.writeNumber = function(number, displayColon, Callback){
       try {
                debug('writeNumber %s ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress, number)
                var digitsToWrite = number.toString();
                if (digitsToWrite.length < 4) {
                    digitsToWrite = "    ".substring(digitsToWrite.length, 4) + digitsToWrite;
                } else if (digitsToWrite.length > 4) {

                    digitsToWrite = digitsToWrite.substring(0, 5)
                }

                if (displayColon) {
                    setBufferRow(2, 0xFF);
                } else {
                    setBufferRow(2, 0x00);
                }
                buffer[(i * 2) + 1] = 0x00;
                var decimalOffset = 0;
                var colonOffset = 0;
                for (var i = 0; i < digitsToWrite.length; i++){
                    var digitToWrite = digitsToWrite[i];
                    
                    if (digitToWrite == '.') {
                        decimalOffset++;
                        setBufferRow(i + colonOffset - decimalOffset, (getBufferRow(i + colonOffset - decimalOffset) | 0x80));  
                    } else {
                        if ((i - decimalOffset) == 2) {
                            colonOffset = 1;
                        }  
                        setBufferRow(i + colonOffset - decimalOffset, getDigitValue(digitToWrite));
                        //buffer[((i + colonOffset) * 2) - decimalOffset] = (getDigitValue(digitToWrite) & 0xFF);
                        //buffer[(((i + colonOffset) * 2) + 1) - decimalOffset] = 0xFF;
                    }  
                               
                }
                self.writeDisplay(Callback);
        } catch (err) {

            if (Callback) {
                Callback(err);
            }
        }

    }

}
util.inherits(adafruitLedBackpack, EventEmitter);

module.exports = adafruitLedBackpack;