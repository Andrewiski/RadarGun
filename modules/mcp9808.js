//mcp9808.Js
//This Module will connect to the i2c MCP9808 Temp Controller and read the tempature




var util = require('util');
var extend = require('extend');
var EventEmitter = require('events').EventEmitter;
//var bonescript = require('octalbonescript');
var i2c = require('i2c');
var debug = require('debug')('mcp9808');

var mcp9808 = function () {
    var self = this;
    var defaultOptions = {
        I2CAddress: "0x18", //the address of the wire
        I2CDevice: '/dev/i2c-2'
    }
    
    var isInited = false;
 
//registers
var AMBIENT_TEMP_REGISTER = 0x05;
var DEVICE_ID_REGISTER = 0x07;
var MANUFACTURER_ID_REGISTER = 0x06;
var RESOLUTION_REGISTER = 0x08;
var CONFIGURATION_REGISTER = 0x01;
var UPPER_TEMPERATURE_REGISTER = 0x02;
var LOWER_TEMPERATURE_REGISTER = 0x03;
var CRITICAL_TEMPERATURE_REGISTER = 0x04;

//info
//The read command reads the 0x0080 from right to left

//Configuration register values.
var CONFIGURATION_SHUTDOWN_BYTES = 0x0100;
var CONFIGURATION_CRITICAL_LOCK = 0x0080;
var CONFIGURATION_WINDOW_LOCK = 0x0040;
var CONFIGURATION_INTERRUPT_CLEAR = 0x0020;
var CONFIGURATION_ALERT_STATUS = 0x0010;
var CONFIGURATION_ALERT_CONTROL = 0x0008;
var CONFIGURATION_ALERT_SELECT = 0x0004;
var CONFIGURATION_ALERT_POLARITY = 0x0002;
var CONFIGURATION_ALERT_MODE = 0x0001;

var exports = module.exports = {};
var i2cdevice;

self.Initialize = function (options, Callback) {
    //sets up the device
    //needed to open the cape manager port
    var objOptions = extend({}, defaultOptions, options);
    debug('i2c new Address ' + objOptions.I2CAddress + " device " + objOptions.I2CDevice);
    //octalbonescript i2c has issues with multiple devices just use i2c instead
    //bonescript.i2c.open(objOptions.I2CDevice, objOptions.I2CAddress, function () {
    //    debug('bonescript i2c.open handler');
        
    //}, function (err, port) {
    //    console.log('bonescript i2c.open');
    //    if (err) {
    //        console.log('bonescript i2c.open Error');
    //        console.dir(err, { depth: null });
    //        isInited = false;
    //    } else {
    //        isInited = true;
    //    }
    //    i2cdevice = port;
    //    Callback(err);
    //});
    
    debug('i2c new Address ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress);
    i2cdevice = new i2c(objOptions.I2CAddress, { device: objOptions.I2CDevice, debug: false });
    i2cdevice.open(objOptions.I2CDevice,
        function (err) {
            debug('i2c open ' + objOptions.I2CDevice + '/' + objOptions.I2CAddress, err); 
        //self.emit('hvacEvent', { type: "init", data: {} });
            if (Callback) {
                Callback(err);
            }
    });
}

//make these private
function IsFloat(n) {
    return n === +n && n !== (n | 0);
}

function IsInteger(n) {
    return n === +n && n === (n | 0);
}

    function ReadData(Register, Bytes, Callback) {
        if (i2cdevice) {
            i2cdevice.readBytes(Register, Bytes, function (err, data) {
                var ParsedData;
                if (Bytes == 1) {
                    ParsedData = data.readUInt8(0);
                }
                else if (Bytes == 2) {
                    ParsedData = data.readUInt16BE(0);
                }

                Callback(err, ParsedData);
            });
        } else {
            Callback('No i2cDevice', null);
        }
}

//sends the LSB first. The device wants the MSB first. 
    function WriteData(Register, ByteArray, Callback) {
    if (i2cdevice) {
        i2cdevice.writeBytes(Register, ByteArray, function (err) {
            Callback(err);
        });
    } else {
        Callback('No i2cDevice', null);
    }
}

function ReverseByte(val) {
    return ((val & 0xFF) << 8) 
           | ((val >> 8) & 0xFF);
}

self.SetShutdown = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        WriteData(CONFIGURATION_REGISTER, [ReverseByte(Configuration | CONFIGURATION_SHUTDOWN_BYTES)], function (err) {
            Callback(err);
        });
    });
}

self.ClearShutdown = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        NewConfig = Configuration & ~CONFIGURATION_SHUTDOWN_BYTES;
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

self.SetTemperatureHysteresis = function (Hysteresis, Callback) {
    //throw an error if the nubmer passed is wrong
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        if (Hysteresis == 0) {
            Configuration = (Configuration & 0xF9FF) | 0x0000;
        }
        else if (Hysteresis == 1.5) {
            Configuration = (Configuration & 0xF9FF) | 0x0200;
        }
        else if (Hysteresis == 3) {
            Configuration = (Configuration & 0xF9FF) | 0x0400;
        }
        else if (Hysteresis == 6) {
            Configuration = (Configuration & 0xF9FF) | 0x0600;
        }
        
        WriteData(CONFIGURATION_REGISTER, [ReverseByte(Configuration)], function (err) {
            Callback(err);
        });
    });
}

self.GetConfigurationRegister = function (Callback) {
    ReadData(CONFIGURATION_REGISTER, 2, function (err, data) {
        Callback(err, data);
    });
}

self.ClearConfigurationRegister = function (Callback) {
    WriteData(CONFIGURATION_REGISTER, [0x00, 0x00], function (err) {
        Callback(err);
    });
}

//works
self.SetCriticalLock = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        
        NewConfig = (Configuration | CONFIGURATION_CRITICAL_LOCK);
        
        //this effectively reverses the byte order
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

//works
self.SetWindowLock = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        
        NewConfig = (Configuration | CONFIGURATION_WINDOW_LOCK);
        
        //this effectively reverses the byte order
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

//might work: documentation says that when read it reverts to 0
self.SetInterruptClear = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        NewConfig = (Configuration | CONFIGURATION_INTERRUPT_CLEAR);
        
        
        //this effectively reverses the byte order
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

self.SetAlertStatus = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        
        NewConfig = (Configuration | CONFIGURATION_ALERT_STATUS);
        
        //this effectively reverses the byte order
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

//works
self.SetAlertControl = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        
        NewConfig = (Configuration | CONFIGURATION_ALERT_CONTROL);
        
        //this effectively reverses the byte order
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

//works
self.SetAlertSelect = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        
        NewConfig = (Configuration | CONFIGURATION_ALERT_SELECT);
        
        //this effectively reverses the byte order
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

//works
self.SetAlertPolarity = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        
        NewConfig = (Configuration | CONFIGURATION_ALERT_POLARITY);
        
        //this effectively reverses the byte order
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

//works
self.SetAlertMode = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        
        NewConfig = (Configuration | CONFIGURATION_ALERT_MODE);
        
        //this effectively reverses the byte order
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

self.ClearAlertMode = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        NewConfig = Configuration & ~CONFIGURATION_ALERT_MODE;
        
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

self.ClearAlertPolarity = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        NewConfig = Configuration & ~CONFIGURATION_ALERT_POLARITY;
        
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

exports.ClearAlertSelect = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        NewConfig = Configuration & ~CONFIGURATION_ALERT_SELECT;
        
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

self.ClearAlertControl = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        NewConfig = Configuration & ~CONFIGURATION_ALERT_CONTROL;
        
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

exports.ClearAlertStatus = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        NewConfig = Configuration & ~CONFIGURATION_ALERT_STATUS;
        
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

self.ClearInterruptClear = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        NewConfig = Configuration & ~CONFIGURATION_INTERRUPT_CLEAR;
        
        WriteData(CONFIGURATION_REGISTER, [NewConfig >> 8, NewConfig], function (err) {
            Callback(err);
        });
    });
}

self.IsLocked = function (Callback) {
    exports.GetConfigurationRegister(function (ReadError, Configuration) {
        Configuration = Configuration & 0x00C0;
        
        if (Configuration == 0x00C0 || Configuration == 0x0080 || Configuration == 0x0040) {
            Callback(ReadError, true);
        }
        else {
            Callback(ReadError, false);
        }
    });
}

self.SetResolution = function (Resolution, Callback) {
    //0x00 for lowest resoluton, 0x03 for highest resolution
    if (i2cdevice){
        i2cdevice.writeBytes(RESOLUTION_REGISTER, [Resolution], function (err) {
            Callback(err);
        });
    } else {
        Callback('No i2cDevice');
    }
}


//This function will return the cause of the alert output trigger, it will return
//the bits 13 14 and 15 of the TA Register mapped into an int
self.GetAlertOutput = function (Callback) {
    ReadData(AMBIENT_TEMP_REGISTER, 2, function (err, data) {
        Callback(err, (data & 0xE000) >> 13);
    });
}


self.IsReady = function (Callback) {
    var ManufacturerID;
    var DeviceID;

    if (i2cdevice) {
        i2cdevice.readBytes(MANUFACTURER_ID_REGISTER, 2, function (err, RawManufacturerID) {
            ManufacturerID = RawManufacturerID.readInt16BE(0);

            i2cdevice.readBytes(DEVICE_ID_REGISTER, 2, function (err, RawDeviceID) {
                DeviceID = RawDeviceID.readInt16BE(0);

                if (ManufacturerID == 0x0054 && DeviceID == 0x0400) {
                    Callback(err, true);
                }
                else {
                    Callback(err, false);
                }
            });
        });
    } else {
        Callback('No i2cDevice', false);
    }
}

self.GetResolution = function (Callback) {
    if (i2cdevice) {
        i2cdevice.readBytes(RESOLUTION_REGISTER, 1, function (err, data) {
            Resolution = data.readUInt8(0);
        
            Callback(err, Resolution);
            });
    } else {
        Callback('No i2cDevice', null);
    }
}

self.AmbientTemperature = function (Callback) {
    ReadData(AMBIENT_TEMP_REGISTER, 2, function (err, data) {
        if (err) {
            Callback(err);
        }
        else {
            var temp = (data & 0x0FFF) / 16.0;
            if (data & 0x1000) {
                temp -= 256.0;
            }
            
            Callback(null, temp);
        }
    });
}

//Set the Temperature Upper Register with a resolution of 0.25 Degree Celsius, if the temperature passed
//to the funcition is not in that resolution it will be rounded by defect to the nearest decimal resolution
//works
self.SetUpperTemperature = function (Temperature, Callback) {
    //Check if temp is float
    Temperature = Temperature * 1.00;
    
    //Divide Integer from decimal parts
    DecimalPart = (Math.abs(Temperature) % 1).toFixed(4);
    IntegerPart = Math.floor(Math.abs(Temperature));
    
    //Round decimal parts to 0.25 steps
    if (DecimalPart >= 0 && DecimalPart < 0.25) {
        DecimalPart = 0x00;
    }
    else if (DecimalPart >= 0.25 && DecimalPart < 0.5) {
        DecimalPart = 0x01;
    }
    else if (DecimalPart >= 0.5 && DecimalPart < 0.75) {
        DecimalPart = 0x02;
    }
    else if (DecimalPart >= 0.75 && DecimalPart < 1) {
        DecimalPart = 0x03;
    }
    //Calculate the new temperature to write
    FinalTemperature = 0;
    FinalTemperature = ((IntegerPart << 4) | (DecimalPart << 2)) & 0x0FFC;
    
    //Set Sign if it is negative
    if (Temperature < 0) {
        FinalTemperature = FinalTemperature | 0x1000;
    }
    
    //Write to Register
    WriteData(UPPER_TEMPERATURE_REGISTER, [FinalTemperature >> 8, FinalTemperature], function (err) {
        Callback(err);
    });
}

self.SetLowerTemperature = function (Temperature, Callback) {
    //Check if temp is float
    Temperature = Temperature * 1.00;
    
    //Divide Integer from decimal parts
    DecimalPart = (Math.abs(Temperature) % 1).toFixed(4);
    IntegerPart = Math.floor(Math.abs(Temperature));
    
    //Round decimal parts to 0.25 steps
    if (DecimalPart >= 0 && DecimalPart < 0.25) {
        DecimalPart = 0x00;
    }
    else if (DecimalPart >= 0.25 && DecimalPart < 0.5) {
        DecimalPart = 0x01;
    }
    else if (DecimalPart >= 0.5 && DecimalPart < 0.75) {
        DecimalPart = 0x02;
    }
    else if (DecimalPart >= 0.75 && DecimalPart < 1) {
        DecimalPart = 0x03;
    }
    //Calculate the new temperature to write
    FinalTemperature = 0;
    FinalTemperature = ((IntegerPart << 4) | (DecimalPart << 2)) & 0x0FFC;
    
    //Set Sign if it is negative
    if (Temperature < 0) {
        FinalTemperature = FinalTemperature | 0x1000;
    }
    
    //Write to Register
    WriteData(LOWER_TEMPERATURE_REGISTER, [FinalTemperature >> 8, FinalTemperature], function (err) {
        Callback(err);
    });
}

self.SetCriticalTemperature = function (Temperature, Callback) {
    //Check if temp is float
    Temperature = Temperature * 1.00;
    
    //Divide Integer from decimal parts
    DecimalPart = (Math.abs(Temperature) % 1).toFixed(4);
    IntegerPart = Math.floor(Math.abs(Temperature));
    
    //Round decimal parts to 0.25 steps
    if (DecimalPart >= 0 && DecimalPart < 0.25) {
        DecimalPart = 0x00;
    }
    else if (DecimalPart >= 0.25 && DecimalPart < 0.5) {
        DecimalPart = 0x01;
    }
    else if (DecimalPart >= 0.5 && DecimalPart < 0.75) {
        DecimalPart = 0x02;
    }
    else if (DecimalPart >= 0.75 && DecimalPart < 1) {
        DecimalPart = 0x03;
    }
    //Calculate the new temperature to write
    FinalTemperature = 0;
    FinalTemperature = ((IntegerPart << 4) | (DecimalPart << 2)) & 0x0FFC;
    
    //Set Sign if it is negative
    if (Temperature < 0) {
        FinalTemperature = FinalTemperature | 0x1000;
    }
    
    //Write to Register
    WriteData(CRITICAL_TEMPERATURE_REGISTER, [FinalTemperature >> 8, FinalTemperature], function (err) {
        Callback(err);
    });
}

//Get the Temperature Upper Register
//works
self.GetUpperTemperature = function (Callback) {
    ReadData(UPPER_TEMPERATURE_REGISTER, 2, function (err, data) {
        UpperByte = data & 0x0FF0;
        LowerByte = data & 0x000C;
        Sign = 1;
        
        if (data & 0x1000) {
            Sign = -1;
        }
        
        Callback(err, (((UpperByte >> 4) + ((LowerByte >> 2) / 4))) * Sign);
    });
}

self.GetLowerTemperature = function (Callback) {
    ReadData(LOWER_TEMPERATURE_REGISTER, 2, function (err, data) {
        UpperByte = data & 0x0FF0;
        LowerByte = data & 0x000C;
        Sign = 1;
        
        if (data & 0x1000) {
            Sign = -1;
        }
        
        Callback(err, (((UpperByte >> 4) + ((LowerByte >> 2) / 4))) * Sign);
    });
}

self.GetCriticalTemperature = function (Callback) {
    ReadData(CRITICAL_TEMPERATURE_REGISTER, 2, function (err, data) {
        UpperByte = data & 0x0FF0;
        LowerByte = data & 0x000C;
        Sign = 1;
        
        if (data & 0x1000) {
            Sign = -1;
        }
        
        Callback(err, (((UpperByte >> 4) + ((LowerByte >> 2) / 4))) * Sign);
    });
}

};
// extend the EventEmitter class using our Radio class
util.inherits(mcp9808, EventEmitter);

module.exports = mcp9808;