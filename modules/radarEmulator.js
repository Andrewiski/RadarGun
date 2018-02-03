// This is used when Emulation is turned on to simulate a Stalker radar gun being attached, it respnses to config request and send speed at interval or on demand
// It is used to debug the application when no radar is avalible or when no one is avalible to throw objects at the radar gun to get a valid speed.

var util = require('util');
var extend = require('extend');
var EventEmitter = require('events').EventEmitter;
var math = require('mathjs');
var debug = require('debug')('radarEmulator');
var nconf = require('nconf');
  
var RadarEmulator = function (fakePortName, options) {

    var self = this;
    var defaultOptions = {
        mode: 'in',  //in, out, inout, outin
        inSpeed: 65,
        outSpeed: 70
    }
    nconf.file('./configs/radarEmulatorConfig.json');
    var configFileSettings = nconf.get();
    var objOptions = extend({}, defaultOptions, configFileSettings, options);
    this.write = function (buffer, callback) {
        debug('Received ', buffer);
        if (buffer != undefined && buffer.length > 0) {

            var packets = [];

            var radarDataBuffer = buffer;
            var radarDataBufferLength = buffer.length;

            //data should have the any pending and current data in it lets process what ever full packets we have and if any left over bytes
            // we will copy to start of radarDataBuffer and set the radarDataBufferLength
            var needmoredata = false;
            var i = 0;
            for (i = 0; i < radarDataBufferLength; i++) {

                //The radar unit doesn't have a consistant output data format while using the streaming format as it doesn't have a checksum at the end
                // all it has is Termination Char which can be changed via a setting we are expecting default sitting of Carrage Return 0x0D (13)
                // Polling mode has Checksum but no Peak and Hit speed. So BE streaming mode which is what we need to use as for the application
                // we need peak and hit speed 
                // So the only thing we can do is look for our two Start ID's 0x88 (136) streaming data and 0xEF (239) Configuration Data     

                switch (radarDataBuffer.readUInt8(i)) {
                    case 239: // 0xEF  Configuration Data
                        var configPacketLength = 0;
                        // Config Packets have Packet length as 2 byte Word LSB first at index 4
                        if (radarDataBufferLength > i + 6) {
                            configPacketLength = radarDataBuffer.readUInt16LE(i + 4) + 8; //9 = 6 header + 2 checksum 
                            //Proboly should check for a max packet length here in case we get a bad length 

                            if (configPacketLength > 128) {
                                console.log('Invalid Config Data Packet Length ' + configPacketLength);
                                break;
                            }

                            if (radarDataBufferLength >= i + configPacketLength) {
                                var configPacket = new Buffer(configPacketLength);
                                radarDataBuffer.copy(configPacket, 0, i, i + configPacketLength);
                                i = i + configPacketLength - 1;
                                //Todo Check Checksum to make sure its a valid packet
                                packets.push(configPacket);
                            } else {
                                needmoredata = true;
                            }
                        } else {
                            needmoredata = true;
                        }
                        break;
                    default:
                        console.log("Invalid Byte detected " + radarDataBuffer.readUInt8(i) + " at position " + i);
                        break;
                }
                if (needmoredata == true) {
                    break;
                }
            }  //end of for loop
            packets.forEach(function (data, i, array) {
                //process the Config Change
                if (data.readUInt8(1) == 2) { // make sure this packet is for us We are always ID 2 emulating the radar sensor
                    //We assume only Radar Attached below but proboly Should Build an Array incase we get a RS 485 Version
                    // We would need to store the Config Values per Address we are talking to
                    var PayloadSource = data.readUInt8(2);
                    var PayloadLength = data.readUInt16LE(4);
                    var updateRadarConfig = false;

                    var PacketConfigID = data.readUInt8(6);
                    if (PacketConfigID < 128) {  // If its less then 128 then its change or get Command have to read the data see if its a zero or 1
                        //we don't ever send 1 in our app so assume its a zero and send back the value
                        updateRadarConfig = false;

                    } else {
                        PacketConfigID = (PacketConfigID & 127);
                        updateRadarConfig = true;

                    }
                    var ConfigPropertyName = undefined;
                    var ConfigProperty = undefined;
                    for (var key in objOptions.radarConfig) {
                        if (objOptions.radarConfig[key].id == PacketConfigID) {
                            ConfigPropertyName = key;
                            ConfigProperty = objOptions.radarConfig[key];
                            break;
                        }
                    }
                    if (ConfigProperty != undefined) {
                        var value;
                        if (updateRadarConfig == true) {
                            //we need to update our value
                            switch (ConfigProperty.datatype) {
                                case 'int':
                                    if (PayloadLength == 3) {
                                        value = data.readUInt8(8);
                                    } else {
                                        value = data.readUInt16LE(8);
                                    }
                                    break;
                                case 'hex':
                                    //we encode as hex String currently only used for Model Number
                                    value = data.toString("hex", 8, PayloadLength + 6);
                                    break;
                                case 'string':
                                    value = data.toString("ascii", 8, PayloadLength + 6);
                                    break;
                                default:
                                    debug('Error no datatype set for ' + ConfigPropertyName);
                            }

                            ConfigProperty.value = value;

                            var cdp = { Property: ConfigPropertyName, data: value }
                            self.emit('radarConfigSetRequest', cdp);

                        }
                        //Send back the config setting value
                        var mybuff = getRadarConfigResponsePacket(ConfigProperty);

                        self.emit('data', mybuff);
                    } else {
                        debug('Invalid Config ID ' + PacketConfigID);
                    }
                } else {
                    debug("Packet is Not For Us its For Device Address " + data.readUInt8(1));
                }
            });
            
        } //end of If (data != undefined)
        if (callback) {
            callback.call(this, null)
        };

    };
    this.drain = function (callback) {
        debug('drain');
        if (callback) { callback.call(this, null) };
    };
    this.open = function (callback) {
        debug('open');
        if (callback) { callback.call(this, null) };
    };

    this.simulateRadarSpeedData = function (options) {

    };


    var getRadarConfigResponsePacket = function (ConfigProperty) {

        var valueBuff;
        switch (ConfigProperty.datatype) {
            case 'int':
                var numvalue
                if (ConfigProperty.value == null) {
                    numvalue = parseInt(ConfigProperty.def);
                } else {
                    numvalue = parseInt(ConfigProperty.value);
                }
                if (!isNaN(numvalue) == true) {
                    if (numvalue < 256) {
                        valueBuff = new Buffer(1);
                        valueBuff.writeUInt8(numvalue, 0);
                    } else {
                        valueBuff = new Buffer(2);
                        valueBuff.writeUInt16LE(numvalue, 0);
                    }
                }
                break;
            case 'hex':
                if (ConfigProperty.value == null) {
                    valueBuff = Buffer.from(ConfigProperty.def, 'hex');
                }
                else
                {
                    valueBuff = Buffer.from(ConfigProperty.value, 'hex');
                }
                break;
            case 'string':
                var strValue;
                if (ConfigProperty.value == null) {
                    
                    strValue = ConfigProperty.def
                    
                }
                else {
                    strValue = ConfigProperty.value;
                }
                //valueBuff = Buffer.from(ConfigProperty.def);
                valueBuff = new Buffer(strValue.length);
                for (var i = 0; i < strValue.length; i++) {
                    valueBuff[i] = strValue.charCodeAt(i);
                }
                break;
        }

        var myBuf = new Buffer(10 + valueBuff.length);
        myBuf[0] = 239;     // Start ID = 239
        myBuf[1] = 1;       // Destination Address = 1  back to the Computer
        myBuf[2] = 2;       // Source Address = 2  We are the radar gun 2 on rs232
        myBuf[3] = 1;       // Packet Type = 0
        //myBuf[4] = 0        // Packet Length LSB = 3
        //myBuf[5] = 0        // Packet Length MSB = 0
        

        myBuf.writeUInt16LE(valueBuff.length + 2, 4);
        myBuf[6] = ConfigProperty.id;      // Command ID
        myBuf[7] = 0;        // Antenna Number = 0
        valueBuff.copy(myBuf, 8);  // Config Value
        myBuf[8 + valueBuff.length] = 0;
        myBuf[9 + valueBuff.length] = 0;

        var checksum = 0;
        for (var i = 0; i < myBuf.length - 2; i = i + 2) {
            var tempval = myBuf.readUInt16LE(i, true)
            checksum = checksum + tempval;
            if (checksum > 65535) {
                checksum = checksum - 65535;
            }
        };
        myBuf.writeUInt16LE(checksum, 8 + valueBuff.length);

        //myBuf[8 + valueBuff.length] = 88       // Checksum LSB = 136
        //myBuf[9 + valueBuff.length] = 03       // Checksum MSB = 03
        return myBuf;
    }

   
   var recursiveTimerStartFakeRadar = function () {
        console.log("Fake Radar Timer Execute!");
        
        radarSerialPortFakeRadar.write(new Buffer("885244202020333441205353532052525220525220523541205151512020512051205120203641202050205020502050205020200d","hex"), function(err) {
            if (err != undefined){
                console.log('Error writing Fake Radar');
            }
        });

        setTimeout(function(){
            radarSerialPortFakeRadar.write(new Buffer("885244202020333441205353522052525220525220523541205151512020512051205120203641202050205020502050205020200d","hex"), function(err) {
                if (err != undefined){
                    console.log('Error writing Fake Radar');
                }
            });

            setTimeout(function(){
                radarSerialPortFakeRadar.write(new Buffer("885244202020333441205353512052525220525220523541205151512020512051205120203641202050205020502050205020200d","hex"), function(err) {
                    if (err != undefined){
                        console.log('Error writing Fake Radar');
                    }
                });
                
                 setTimeout(function(){
                    radarSerialPortFakeRadar.write(new Buffer("885244202020333441205353502052525220525220523541205151512020512051205120203641202050205020502050205020200d","hex"), function(err) {
                        if (err != undefined){
                            console.log('Error writing Fake Radar');
                        }
                    });
                    setTimeout(function(){
                        radarSerialPortFakeRadar.write(new Buffer("885244202020333441202020202020202020202020203541202020202020202020202020203641202020202020202020202020200d","hex"), function(err) {
                            if (err != undefined){
                                console.log('Error writing Fake Radar');
                            }
                        });
                    },500);
                },500);

            },500);
        },500);

        
        setTimeout(recursiveTimerStartFakeRadar,60000);
    }
};

// extend the EventEmitter class using our RadarMonitor class
util.inherits(RadarEmulator, EventEmitter);

module.exports = RadarEmulator;