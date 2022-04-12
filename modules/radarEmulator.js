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
        portIsOpen: false,
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
                        sendData(mybuff);
                        //self.emit('data', mybuff);
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
        objOptions.portIsOpen = true;
        if (callback) { callback.call(this, null) };
        recursiveTimerStartFakeRadar();
    };
    this.close = function (callback) {
        debug('close');
        objOptions.portIsOpen = false;
        if (callback) { callback.call(this, null) };
        
    };
    var parserEventEmiter = null;
    this.pipe = function (parserMethod) {
        debug('pipe');
        parserEventEmiter = parserMethod;
        //util.inherits(parserEventEmiter, EventEmitter);
        return parserEventEmiter;

    }

    this.radarEmulatorCommand = function (options) {
        var data = options.data;
        var socket = options.socket;
        var socketid
        if (socket) {
            socketid = socket.id;
        } else {
            socketid = "radar"
        }
        debug('radarEmulatorCommand:' + data.cmd + ', value:' + data.data + ', client socket id:' + socketid);
        switch (data.cmd) {
            case "radarEmulatorSpeed":
                //We are going to emulate a pitch coming in with roll out
                //followed by a hit with slow down as it goes out if hit greater then 0
                var inSpeed = parseFloat(data.data.in);
                var outSpeed = parseFloat(data.data.out);
                for (var i = 0; i < 5; i++){
                    //
                    sendData(getRadarSpeedPacket(inSpeed, 0.0, true, true));
                    //self.emit('data', getRadarSpeedPacket(inSpeed, 0.0, true, true));
                    inSpeed = inSpeed - 1.3;
                }
                sendData(getRadarSpeedPacket(0.0, 0.0, false, false));
                sendData(getRadarSpeedPacket(45.3, 45.0, true, true));
                sendData(getRadarSpeedPacket(43.3, 43.0, true, true));
                sendData(getRadarSpeedPacket(42.3, 44.0, true, true));
                for (var i = 0; i < 5; i++){
                    //
                    sendData(getRadarSpeedPacket(outSpeed, 0.0, false, false));
                    //self.emit('data', getRadarSpeedPacket(outSpeed, 0.0, false, false));
                    outSpeed = outSpeed - 1.3;
                }

                for (var i = 0; i < 25; i++) {
                    //need to send some zero at the end
                    sendData(getRadarSpeedPacket(0.0, 0.0, false, false));
                }
                
                break;
        }
    };

    //Speed1 and Speed 2 should always be floats
    var getRadarSpeedPacket = function (Speed1, Speed2, Speed1DirectionIsIn, Speed2DirectionIsIn) {
        /*
        bE Format – All Speeds + Status
            Byte # Description Value
            1 Message Type 0x88
            2 Unit Configuration (see detail below)
            3 Unit Status (see detail below)
            4 - 6 reserved bytes ASCII ‘0’ or space
            7 Number of Speed Blocks Reported ASCII ‘1’ through ‘3’: One for live
            speed + one for Peak Speed if
            enabled + one for Hit Speed if
            enabled.
            Fifteen bytes for each Speed Block:
            1 Speed ID ASCII ‘4’: Live Speed Block
            ASCII ‘5’: Peak Speed Block
            ASCII ‘6’: Hit Speed Block
            2 Speed Block Status (see detail below)
            3 Primary speed hundreds digit ASCII ‘0’ through ‘9’ or space
            4 Primary speed tens digit ASCII ‘0’ through ‘9’ or space
            5 Primary speed ones digit ASCII ‘0’ through ‘9’ or space
            6 Primary speed tenths digit ASCII ‘0’ through ‘9’ or space
            7 Secondary speed hundreds digit ASCII ‘0’ through ‘9’ or space
            8 Secondary speed tens digit ASCII ‘0’ through ‘9’ or space
            9 Secondary speed ones digit ASCII ‘0’ through ‘9’ or space
            10 Secondary speed tenths digit ASCII ‘0’ through ‘9’ or space
            11-15 reserved bytes ASCII Space (0x20)
            Last Byte Carriage Return 0x0D
            The bE Format can report multiple speeds in each message (live, peak, hit) as well as
            configuration and status information. It always contains a live speed block. It also
            contains a peak speed block if peak speeds are enabled (using the Peak Speed Enable
            setting 13) and a hit speed block if hit speeds are enabled (using the Hit Speed Enable
            setting 105).


        Unit Configuration byte
            Bit 7-6: always = 01 (to force displayable ASCII characters)
            Bit 5: always = 0
            Bit 4: unit resolution (0=ones, 1=tenths)
            Bit 3-2: always = 00
            Bit 1: peak speeds enabled (0=disabled, 1=enabled)
            Bit 0: fork mode (0=off/normal, 1=fork mode enabled)
        Unit Status byte
            Bit 7-6: always = 01 (to force displayable ASCII characters)
            Bit 5-0: always = 000100
        Speed Block Status byte
            Bit 7-6: always = 01 (to force displayable ASCII characters)
            Bit 5-3: always = 000
            Bit 2: secondary target direction (0=outbound, 1=inbound)
            Bit 1: primary target direction (0=outbound, 1=inbound)
            Bit 0: transmitter status (0=Hold, 1=Transmit)
              
            Buffer.from("885244202020333441205353532052525220525220523541205151512020512051205120203641202050205020502050205020200d", 'hex')
        */
        var myBuff = new Buffer(23); 
        myBuff[0] = 0x88; //be Speed Data
        myBuff[1] = 0x50; //01010000   Unit Config
        myBuff[2] = 0x44; //01000100  Unit Status
        myBuff[3] = 0x20; // Reserved Space
        myBuff[4] = 0x20; // Reserved Space
        myBuff[5] = 0x20; // Reserved Space
        myBuff[6] = 0x31; //01010000  Number of Speed Blocks Reported Ascii 1 Just Live Speed
        
        myBuff[7] =  0x34; //Speed ID  Ascii "4" Live, "5" Peak, "6" Hit
        myBuff[8] = 0x44; // Default 01000001  Speed Block Status  We change Bits 2 and 1 based on passed in direction
        if (Speed1DirectionIsIn) {
            myBuff[8] = (myBuff[8] | 0x02)
        }
        if (Speed2DirectionIsIn) {
            myBuff[8] = (myBuff[8] | 0x04)
        }
        var strSpeed1 = Speed1.toFixed(1).toString();
        if (strSpeed1.length < 5) {
            for (var i = strSpeed1.length; i < 5; i++) {
                strSpeed1 = "0" + strSpeed1;
            } 
        }
        myBuff[9] = strSpeed1.charCodeAt(0); //Primary speed Hundreds
        myBuff[10] = strSpeed1.charCodeAt(1); //Primary speed Tens
        myBuff[11] = strSpeed1.charCodeAt(2); //Primary speed Ones
        myBuff[12] = strSpeed1.charCodeAt(4); //Primary speed Tenths
        var strSpeed2 = Speed2.toFixed(1).toString();
        if (strSpeed2.length < 5) {
            for (var i = strSpeed2.length; i < 5; i++) {
                strSpeed2 = "0" + strSpeed2;
            }
        }
        myBuff[13] = strSpeed2.charCodeAt(0); //Secondary speed Hundreds
        myBuff[14] = strSpeed2.charCodeAt(1); //Secondary speed Tens
        myBuff[15] = strSpeed2.charCodeAt(2); //Secondary speed Ones
        myBuff[16] = strSpeed2.charCodeAt(4); //Secondary speed Tenths

        myBuff[17] = 0x20; //Reserved Space
        myBuff[18] = 0x20; //Reserved Space
        myBuff[19] = 0x20; //Reserved Space
        myBuff[20] = 0x20; //Reserved Space
        myBuff[21] = 0x20; //Reserved Space
        myBuff[22] = 0x0D; //Last Byte Carriage Return
        return myBuff;
    }
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

    var sendData = function (data) {
        //if (objOptions.parser) {
        //    objOptions.parser(self, data);
        //} else {
            self.emit('data', data);  
        //}
        if (parserEventEmiter) {
            parserEventEmiter.push(data, 'ascii');
        }
    }
    var recursiveTimerStartFakeRadar = function () {
        //console.log("Radar Emulator Timer Execute!");
        if (objOptions.radarConfig["TransmiterControl"].value == 1) {
            sendData(getRadarSpeedPacket(0.0, 0.0, false, false));
        }
        if (objOptions.portIsOpen) {
            setTimeout(recursiveTimerStartFakeRadar, 1000);
        }
    }
};

// extend the EventEmitter class using our RadarMonitor class
util.inherits(RadarEmulator, EventEmitter);

module.exports = RadarEmulator;