//radarStalker2.js
//This Module will open uart and connect to a stalker Pro II radar sensor using a serial port
//it then raises events based on events
//The Best Config I have found is 115200 baud Peak and Hit turned off, with direction set to both now we look at inbound as pitch and outbound as hit.
var util = require('util');
var extend = require('extend');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('radar');
var nconf = require('nconf');
//var SerialPort = require("serialport").SerialPort;
// version 4 syntax 
var SerialPort = require("serialport");
var RadarEmulator = require("./radarEmulator.js");
var RadarPacketParser = require("./radarPacketParser.js");
var RadarStalker2 = function (options){
    var self = this;
    var defaultOptions = {
        //loaded from the config file
        emulator:false
    };
    nconf.file('./configs/radarStalker2Config.json');
    var configFileSettings = nconf.get();
    var objOptions = extend({}, defaultOptions, configFileSettings, options);


    // EventEmitters inherit a single event listener, see it in action
    this.on('newListener', function (listener) {
        debug('radarStalker2 Event Listener: ' + listener);
    });
    
    var emptySpeedData = {
        id: 0,
        firstDirection: null,
        firstTime:null,
        inMaxSpeed: 0,
        inMinSpeed: 0,
        outMaxSpeed: 0,
        outMinSpeed: 0,
        inSpeeds:[],
        outSpeeds: [],
        pitchCount: 0,
        radarRawData:[]
    }

    var commonData = {
        currentRadarSpeedData: {},
        lastSpeedDataTimestamp: new Date(),
        radarSpeedDataHistory: []
    }

    extend(commonData.currentRadarSpeedData, emptySpeedData);
    
    

    
    
    
    //use Global so we can access our instance of Serial Port from RadarCommandFiles

    var radarSerialPortName = '';
    
    

    if (process.platform === 'win32') {

        radarSerialPortName = objOptions.win32.portName;
        objOptions.emulator = objOptions.win32.emulator; 

    } else {
        //
        radarSerialPortName = objOptions.portName;
    }


    var radarSpeedRelatedData = { GameID: 0, VisitorTeamID: 0, HomeTeamID: 0, PitcherPlayerID: 0, HitterPlayerID: 0 };
    var radarSpeedDataStmt;

    var radarSerialPortDataHandler =  function(data) {

      

            //See RadarDataParser below to view Code that Parses raw Serial Data into Data Packets

            if (data != undefined && data.length > 0){
                if (objOptions.softwareConfig.logRawRadarPackets) {
                    commonData.currentRadarSpeedData.radarRawData.push(data.toString('hex'));
                }
                switch(data.readUInt8(0)){
                    case 136: // 0x88 BE Speed Stream Packet
                       
                        ProcessRadarDataPacket_BESpeed(data);
                        break;
                    case 239: // 0xEF  Configuration Data
                        ProcessRadarDataPacket_Config(data);
                    
                        break;
                    default:
                        debug("Invalid Packet Type detected " + data.readUInt8(0));
                        break;
                }
          

            } //end of If (data != undefined)
            // if radarConfigGetComplete = false then we need to run through the radarConfigProperties and ask Radar for settings.

            if (radarConfigGetComplete === false && configRequestPending === false){
                var foundone = false;
                for(var key in objOptions.radarConfig){
                    var radarConfigProperty = objOptions.radarConfig[key];
                    if (radarConfigProperty.value === undefined || radarConfigProperty.value === null ){ 
                        foundone = true;
                        mybuff = getRadarPacket(radarConfigProperty.id, 0, new Buffer([0])); // new Buffer.alloc(1));
                        radarSerialPort.write(mybuff, function(err) {
                            if (err === undefined){
                                configRequestPending = true;
                                debug('request Radar Config ' + key);
                            }else{
                                data.success = false;
                                data.error = err;
                                debug('Serial Port Write Error ' + err);
                            }
                        });
                        break;
                    }
                }
                if (foundone === false){
                    radarConfigGetComplete = true;
                }
            }
        };

    //var radarPacketParser = function (bufferSize) {
    //    // Delimiter buffer saved in closure
    //    var radarDataBuffer = new Buffer(bufferSize);
    //    radarDataBuffer.fill(0);  //init buffer to Zeros
    //    var radarDataBufferLength = 0;

    //    return function (emitter, buffer) {
    //        // Collect data
    //        if (buffer != undefined && buffer.length > 0) {

    //            var packets = [];

    //            if ((radarDataBufferLength + buffer.length) > bufferSize) {
    //                //We Are going to blow are max buffer size as something has gone wrong so discard saved buffer and start over
    //                debug('We are over our radarDataBufferSize discarding partial packet buffer');
    //                radarDataBufferLength = 0;
    //                return;
    //            } else {
    //                //Take what ever was pending in our buffer and append the incomming data so we can use it for processing
    //                buffer.copy(radarDataBuffer, radarDataBufferLength, 0, buffer.length);
    //                radarDataBufferLength = radarDataBufferLength + buffer.length;
    //            }

    //            //data should have the any pending and current data in it lets process what ever full packets we have and if any left over bytes
    //            // we will copy to start of radarDataBuffer and set the radarDataBufferLength
    //            var needmoredata = false;
    //            var i = 0;
    //            for (i = 0; i < radarDataBufferLength; i++) {

    //                //The radar unit doesn't have a consistant output data format while using the streaming format as it doesn't have a checksum at the end
    //                // all it has is Termination Char which can be changed via a setting we are expecting default sitting of Carrage Return 0x0D (13)
    //                // Polling mode has Checksum but no Peak and Hit speed. So BE streaming mode which is what we need to use as for the application
    //                // we need peak and hit speed 
    //                // So the only thing we can do is look for our two Start ID's 0x88 (136) streaming data and 0xEF (239) Configuration Data  


    //                switch (radarDataBuffer.readUInt8(i)) {
    //                    case 136: // 0x88 BE Speed Stream Packet
    //                        if (radarDataBufferLength > i + 6) {
    //                            var speedPacketLength = 0;
    //                            switch (radarDataBuffer.readUInt8(i + 6)) {
    //                                //this is the Number of Speed Blocks but its in Ascii and each is 15 bytes long + 7 in Header + Delimeter 0x0D = 8
    //                                case 49: //1
    //                                    speedPacketLength = 23; // (7 + 15 + 1)
    //                                    break;
    //                                case 50: //2
    //                                    speedPacketLength = 38; // (7 + (15 * 2) + 1)
    //                                    break;
    //                                case 51: //3
    //                                    speedPacketLength = 53; // (7 + (15 * 2) + 1)
    //                                    break;
    //                                default:
    //                                    debug("Invalid Byte detected in Speed Stream Packet " + radarDataBuffer.readUInt8(i) + " at position " + (i + 6));
    //                                    break;
    //                            }
    //                            if (speedPacketLength > 0) {
    //                                if (radarDataBufferLength >= i + speedPacketLength) {
    //                                    var speedPacket = new Buffer(speedPacketLength);
    //                                    radarDataBuffer.copy(speedPacket, 0, i, i + speedPacketLength);
    //                                    i = i + speedPacketLength - 1;
    //                                    packets.push(speedPacket);
    //                                } else {
    //                                    needmoredata = true;
    //                                }
    //                            } else {
    //                                needmoredata = true;
    //                            }
    //                        } else {
    //                            needmoredata = true;
    //                        }
    //                        break;
    //                    case 239: // 0xEF  Configuration Data
    //                        var configPacketLength = 0;
    //                        // Config Packets have Packet length as 2 byte Word LSB first at index 4
    //                        if (radarDataBufferLength > i + 6) {
    //                            configPacketLength = radarDataBuffer.readUInt16LE(i + 4) + 8; //9 = 6 header + 2 checksum 
    //                            //Proboly should check for a max packet length here in case we get a bad length 

    //                            if (configPacketLength > 128) {
    //                                debug('Invalid Config Data Packet Length ' + configPacketLength);
    //                                break;
    //                            }

    //                            if (radarDataBufferLength >= i + configPacketLength) {
    //                                var configPacket = new Buffer(configPacketLength);
    //                                radarDataBuffer.copy(configPacket, 0, i, i + configPacketLength);
    //                                i = i + configPacketLength - 1;
    //                                //Todo Check Checksum to make sure its a valid packet
    //                                packets.push(configPacket);
    //                            } else {
    //                                needmoredata = true;
    //                            }
    //                        } else {
    //                            needmoredata = true;
    //                        }
    //                        break;
    //                    default:
    //                        debug("Invalid Byte detected " + radarDataBuffer.readUInt8(i) + " at position " + i);
    //                        break;
    //                }
    //                if (needmoredata == true) {
    //                    break;
    //                }
    //            }  //end of for loop
    //            packets.forEach(function (part, i, array) {
    //                emitter.emit('data', part);
    //            });
    //            if (needmoredata == true) {
    //                //i should be where we left off with partial packet so we need to copy from i to length to start of radarDataBuffer
    //                if (i != 0) {
    //                    //No need to do any copying here as we are already starting at the begining  
    //                    radarDataBuffer.copy(radarDataBuffer, 0, i, radarDataBufferLength);
    //                    radarDataBufferLength = radarDataBufferLength - i
    //                }
    //            } else {
    //                radarDataBufferLength = 0
    //            }
    //        } //end of If (data != undefined)




    //    };
    //}

    this.getradarSpeedDataHistory = function() {
        return commonData.radarSpeedDataHistory;
    }

    this.getSoftwareConfig = function () {
        return objOptions.softwareConfig;
    }

    this.getRadarConfig = function(){
        return objOptions.radarConfig;
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
        if (objOptions.emulator == true) {
            radarSerialPort.radarEmulatorCommand(options);
        }
    }
    this.softwareConfigCommand = function (options) {
        var data = options.data;
        var socket = options.socket;
        var socketid = null;
        if (socket) {
            socketid = socket.id;
        } else {
            socketid = "radar";
        }
        debug('softwareConfigCommand:' + data.cmd + ', value:' + data.data + ', client socket id:' + socketid);
        
        var softwareConfigProperty = objOptions.softwareConfig[data.cmd];
        if (softwareConfigProperty == undefined) {
            debug('softwareConfigCommand: Error Config Property Not Found' + data.cmd + ', value:' + data.data + ', client socket id:' + socketid);
        } else
        {
            var myConfigVal;
            switch (softwareConfigProperty.datatype) {
                case 'int':
                    var numvalue = parseInt(data.data);
                    if (!isNaN(numvalue) == true) {
                        softwareConfigProperty.value = numvalue;
                    }
                    break;
                case 'string':
                    //debug('Error So far no Config accepts String as setable value not implemented');
                    softwareConfigProperty.value = data.data;
                    break;
            }
            self.emit('softwareConfigProperty', data);
        }
    };

    this.radarConfigCommand = function (options) {
        var data = options.data;
        var socket = options.socket;
        var socketid = null;
        if (socket) {
            socketid = socket.id;
        } else {
            socketid = "radar";
        }
        debug('radarConfigCommand:' + data.cmd + ', value:' + data.data + ', client socket id:' + socketid);

        //if this is a radarpower command reset the lastspeedtimestamp
        if (data.cmd === "TransmiterControl" && data.data === 1) {
            commonData.lastSpeedDataTimestamp = new Date();
        }

        var sendSerialData = false;
        var mybuff = undefined;

        var radarConfigProperty = objOptions.radarConfig[data.cmd];
        if (radarConfigProperty === undefined) {
            //No Matching
        } else if (radarConfigProperty.id === -1) {
            //if its -1 this is not a radar Unit command but software config command
            radarConfigProperty.value = data.data;
            try{
                nconf.save();
                debug('Settings Saved');
            } catch (ex) {
                debug('setting save Error:' + ex);
            }
        } else {
            var myConfigVal;
            switch (radarConfigProperty.datatype) {
                case 'int':
                    var numvalue = parseInt(data.data);
                    if (!isNaN(numvalue) == true) {
                        if (numvalue < 256) {
                            myConfigVal = new Buffer.alloc(1);
                            myConfigVal.writeUInt8(numvalue, 0);
                        } else {
                            myConfigVal = new Buffer.alloc(2);
                            myConfigVal.writeUInt16LE(numvalue, 0);
                        }
                    }
                    break;

                case 'hex':
                    //debug('Error So far no Config accepts hex as setable value not implemented');
                    myConfigVal = Buffer.from(data.data, 'hex');
                    break;
                case 'string':
                    //debug('Error So far no Config accepts String as setable value not implemented');
                    myConfigVal = Buffer.from(data.data);
                    break;
            }
            mybuff = getRadarPacket(radarConfigProperty.id, 128, myConfigVal);
            radarSerialPort.write(mybuff, function (err) {
                if (err == undefined) {
                    radarSerialPort.drain(function () {
                        data.success = true;
                        data.error = '';
                        self.emit('radarCommand', data);
                    });
                } else {
                    data.success = false;
                    data.error = err;
                    debug('Serial Port Write Error ' + err);
                }
            });
        }
    };

    var getRadarPacket = function (settingid, getsetchange, valueBuff) {
        var myBuf = new Buffer.alloc(10 + valueBuff.length);
        myBuf[0] = 239;     // Start ID = 239
        myBuf[1] = 2;       // Destination Address = 2
        myBuf[2] = 1;       // Source Address = 1
        myBuf[3] = 1;       // Packet Type = 0
        //myBuf[4] = 0        // Packet Length LSB = 3
        //myBuf[5] = 0        // Packet Length MSB = 0
        myBuf.writeUInt16LE(valueBuff.length + 2, 4);
        myBuf[6] = settingid + getsetchange;      // Command 20 + 128 = 148
        myBuf[7] = 0;        // Antenna Number = 0
        valueBuff.copy(myBuf, 8);  // Config Value = 1
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

    var serialPacketCount = 0;
    var radarConfigGetComplete = false;
    var configRequestPending = false;

    var ProcessRadarDataPacket_Config = function (data) {
        if (data.readUInt8(1) == 1) { // make sure this packet is for us We are always ID 1
            //We assume only RS232 Radar is Attached as that is the only one that support BE protocol
            var PayloadSource = data.readUInt8(2);
            var PayloadLength = data.readUInt16LE(4);
            var updateRadarConfig = false;

            var PacketConfigID = data.readUInt8(6);
            if (PacketConfigID > 128) {
                PacketConfigID = (PacketConfigID & 127);

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
                if (ConfigProperty.value !== value) {
                    ConfigProperty.value = value;
                    updateRadarConfigProperty = true;
                    debug("radarConfigProperty received ", ConfigPropertyName, value)
                }
                if (updateRadarConfigProperty == true) {
                    //raise the event to app.js so it can emit it via socket.io to the browser
                    var cdp = { Property: ConfigPropertyName, data: value };
                    self.emit('radarConfigProperty', cdp);
                }
                configRequestPending = false;
            } else {
                debug('Invalid Config ID ' + PacketConfigID);
            }
        } else {
            debug("Packet is Not For Us its For Device Address " + data.readUInt8(1));
        }

    }

    var pitchCounter = 0;
    var zeroCounter = 0;
    //this is used below to send the speed to the client so we have to reach this value in low speed countes before we decide this is a valid speed
    //we do this as sometimes the radar gives two pitches as the ball reading are a zero as it passes in front of a player of bounces etc.
    

    var ProcessRadarDataPacket_BESpeed = function (data) {
        var UnitConfig = data.readUInt8(1);
        UnitConfig = { resolution: (8 == (8 & UnitConfig)), peakSpeed: (2 == (2 & UnitConfig)), forkMode: (1 == (1 & UnitConfig)) };
        var speedData = {
            liveSpeed: 0,
            liveSpeedDirection:'',
            liveSpeed2: 0,
            liveSpeed2Direction:''
        };
        speedData.id = serialPacketCount;
        var NumberOfSpeedBlocks = 0;
        switch (data.readUInt8(6)) {
            case 49: //'1':
                NumberOfSpeedBlocks = 1;
                break;
            case 50: //'2':  
                NumberOfSpeedBlocks = 2;
                break;
            case 51: // '3':  
                NumberOfSpeedBlocks = 3;
                break;
        }

        var Offset = 0;
        for (var i = 0; i < NumberOfSpeedBlocks; i++) {
            //Next 15 bytes is the speedBlock
            if (data.length <= 8 + Offset) {
                console.log('Invalid Length');
            }
            var UnitSpeedBlockStatusByte = data.readUInt8(8 + Offset);
            var UnitSpeedBlockStatus = { primaryDirection: ((2 == (2 & UnitSpeedBlockStatusByte)) ? 'in' : 'out'), secondaryDirection: ((4 == (4 & UnitSpeedBlockStatusByte)) ? 'in' : 'out'), transmiterStatus: ((1 == (1 & UnitSpeedBlockStatusByte)) ? 'on' : 'off') }
            var Speed = data.toString("ascii", 9 + Offset, 12 + Offset);  //data[9 + Offset] + data[10 + Offset] + data[11 + Offset];
            var Tenths = data.toString("ascii", 12 + Offset, 13 + Offset);
            if (Tenths != ' ') {
                Speed = Speed + '.' + Tenths; //data[12 + Offset];
            }
            var Speed2 = data.toString("ascii", 13 + Offset, 16 + Offset); // data[13 + Offset] + data[14 + Offset] + data[15 + Offset] + '.' + data[16 + Offset];
            var Tenths2 = data.toString("ascii", 16 + Offset, 17 + Offset);
            if (Tenths2 != ' ') {
                Speed2 = Speed2 + '.' + Tenths2; //data[16 + Offset];
            }
            switch (data.readUInt8(7 + Offset)) {
                case 52: //'4': //Live Speed Block
                    speedData.liveSpeedDirection = UnitSpeedBlockStatus.primaryDirection;
                    speedData.liveSpeed2Direction = UnitSpeedBlockStatus.secondaryDirection;
                    if (Speed.trim() != '') {
                        speedData.liveSpeed = parseFloat(Speed);
                    }
                    if (Speed2.trim() != '') {
                        speedData.liveSpeed2 = parseFloat(Speed2);
                    }
                    Offset = Offset + 15;
                    break;
                case 53: // '5': //Peak Speed Block
                    speedData.peakSpeedDirection = UnitSpeedBlockStatus.primaryDirection;
                    speedData.peakSpeed2Direction = UnitSpeedBlockStatus.secondaryDirection;
                    if (Speed.trim() != '') {
                        speedData.peakSpeed = parseFloat(Speed);
                    }
                    if (Speed2.trim() != '') {
                        speedData.peakSpeed2 = parseFloat(Speed2);
                    }
                    Offset = Offset + 15;
                    break;
                case 54: // '6': //Hit Speed Block
                    speedData.hitSpeedDirection = UnitSpeedBlockStatus.primaryDirection;
                    speedData.hitSpeed2Direction = UnitSpeedBlockStatus.secondaryDirection;
                    if (Speed.trim() != '') {
                        speedData.hitSpeed = parseFloat(Speed);
                    }
                    if (Speed2.trim() != '') {
                        speedData.hitSpeed2 = parseFloat(Speed2);
                    }
                    Offset = Offset + 15;
                    break;
                default:
                    debug('Invalid Speed Block Id');
                    break;
            }
        }
       
        if (speedData.liveSpeed > objOptions.radarConfig.LowSpeedThreshold.value || speedData.peakSpeed > objOptions.radarConfig.LowSpeedThreshold.value) {
            debug("Speed Data live:" + speedData.liveSpeed + " " + speedData.liveSpeedDirection + " live2:" + speedData.liveSpeed2 + " " + speedData.liveSpeed2Direction);
        } 
        //debug('data received ' + speedData.liveSpeed);
        // If PeakSpeed is Enabled then we can group packets with the exact same PeakSpeed as a baseball can't speed up only slow down.
        //if (speedData.liveSpeed > 0 || speedData.peakSpeed > 0 || speedData.liveSpeed2 > 0 || speedData.hitSpeed > 0 || speedData.hitSpeed2 > 0) {
          //  debug("Andy Remove me p:" + speedData.peakSpeed + " " + speedData.peakSpeedDirection + " l:" + speedData.liveSpeed + " " + speedData.liveSpeedDirection + " h:" + speedData.hitSpeed + " " + speedData.hitSpeedDirection + " p2:" + speedData.peakSpeed2 + " " + speedData.peakSpeed2Direction + " l2:" + speedData.liveSpeed2 + " " + speedData.liveSpeed2Direction + " h2:" + speedData.hitSpeed2 + " " + speedData.hitSpeed2Direction);
        //}
        
        if (speedData.liveSpeed >= objOptions.radarConfig.LowSpeedThreshold.value) {
            if (commonData.currentRadarSpeedData.firstDirection == null) {
                commonData.currentRadarSpeedData.firstDirection = speedData.liveSpeedDirection;
                commonData.currentRadarSpeedData.firstTime = new Date().getTime();
            }
            if (speedData.liveSpeedDirection == "in") {
                //commonData.currentRadarSpeedData.inSpeeds.push(speedData.liveSpeed)
                
                if (commonData.currentRadarSpeedData.inMaxSpeed < speedData.liveSpeed) {
                    commonData.currentRadarSpeedData.inMaxSpeed = speedData.liveSpeed;
                }
                if (commonData.currentRadarSpeedData.inMinSpeed == 0 || commonData.currentRadarSpeedData.inMinSpeed > speedData.liveSpeed) {
                    commonData.currentRadarSpeedData.inMinSpeed = speedData.liveSpeed;
                }
            } else if (speedData.liveSpeedDirection == "out") {
                
                //commonData.currentRadarSpeedData.outSpeeds.push(speedData.liveSpeed)
                if (commonData.currentRadarSpeedData.outMaxSpeed < speedData.liveSpeed) {
                    commonData.currentRadarSpeedData.outMaxSpeed = speedData.liveSpeed;
                }
                if (commonData.currentRadarSpeedData.outMinSpeed == 0 || commonData.currentRadarSpeedData.outMinSpeed > speedData.liveSpeed) {
                    commonData.currentRadarSpeedData.outMinSpeed = speedData.liveSpeed;
                }
            }
        }
        if (speedData.liveSpeed2 >= objOptions.radarConfig.LowSpeedThreshold.value) {
            if (commonData.currentRadarSpeedData.firstDirection == "") {
                commonData.currentRadarSpeedData.firstDirection = speedData.liveSpeed2Direction;
                commonData.currentRadarSpeedData.firstTime = new Date().getTime();
            }
            if (speedData.liveSpeed2Direction == "in") {
                //commonData.currentRadarSpeedData.inSpeeds.push(speedData.liveSpeed2)
                if (commonData.currentRadarSpeedData.inMaxSpeed < speedData.liveSpeed2) {
                    commonData.currentRadarSpeedData.inMaxSpeed = speedData.liveSpeed2;
                }
                if (commonData.currentRadarSpeedData.inMinSpeed == 0 || commonData.currentRadarSpeedData.inMinSpeed > speedData.liveSpeed2) {
                    commonData.currentRadarSpeedData.inMinSpeed = speedData.liveSpeed2;
                }
            } else if (speedData.liveSpeed2Direction == "out") {
                //commonData.currentRadarSpeedData.outSpeeds.push(speedData.liveSpeed2)
                if (commonData.currentRadarSpeedData.outMaxSpeed < speedData.liveSpeed2) {
                    commonData.currentRadarSpeedData.outMaxSpeed = speedData.liveSpeed2;
                }
                if (commonData.currentRadarSpeedData.outMinSpeed == 0 || commonData.currentRadarSpeedData.outMinSpeed > speedData.liveSpeed2) {
                    commonData.currentRadarSpeedData.outMinSpeed = speedData.liveSpeed2;
                }
            }
        }

        if (speedData.liveSpeed <= objOptions.radarConfig.LowSpeedThreshold.value 
            && speedData.liveSpeed2 <= objOptions.radarConfig.LowSpeedThreshold.value 
            && (
                commonData.currentRadarSpeedData.inMinSpeed >= objOptions.radarConfig.LowSpeedThreshold.value
                ||
                commonData.currentRadarSpeedData.outMinSpeed >= objOptions.radarConfig.LowSpeedThreshold.value
                )            
            ) {

            if (zeroCounter < objOptions.softwareConfig.zeroCounterLimit) {
                zeroCounter++;
            } else {
                zeroCounter = 0;
                pitchCounter++;
                //extend(commonData.currentRadarSpeedData, speedData);
                commonData.currentRadarSpeedData.time = new Date();
                //commonData.currentRadarSpeedData.pitcherPlayerID = radarSpeedRelatedData.PitcherPlayerID,
                //commonData.currentRadarSpeedData.batterPlayerID = radarSpeedRelatedData.BatterPlayerID,
                //commonData.currentRadarSpeedData.pitchCount = pitchCounter;
                commonData.lastSpeedDataTimestamp = new Date();
                commonData.radarSpeedDataHistory.unshift(extend({}, commonData.currentRadarSpeedData));
                if (commonData.radarSpeedDataHistory.length > objOptions.softwareConfig.radarSpeedHistoryCount) {
                    commonData.radarSpeedDataHistory.pop();
                }
                self.emit('radarSpeed', commonData.currentRadarSpeedData);

                commonData.currentRadarSpeedData = extend({}, emptySpeedData);
            }
        } 
        
        //if ( ((speedData.LiveSpeed > radarConfig.LowSpeedThreshold && speedData.PeakSpeed > radarConfig.LowSpeedThreshold) && (speedData.LiveSpeed != LastValidRadarSpeedData.LiveSpeed && speedData.PeakSpeed != LastValidRadarSpeedData.PeakSpeed && speedData.HitSpeed != LastValidRadarSpeedData.HitSpeed) ) || (LastValidRadarSpeedData.LiveSpeed > 0 && speedData.LiveSpeed == 0 && zeroCounter == zeroCounterLimit)){
        //    LastValidRadarSpeedData = speedData;
        //    debug('data sent to clients');
        //    if (DbInited){
        //        radarSpeedDataStmt.run(speedData.time, radarSpeedRelatedData.GameID, radarSpeedRelatedData.PitcherPlayerID, radarSpeedRelatedData.HitterPlayerID, speedData.LiveSpeedDirection, speedData.LiveSpeed, speedData.LiveSpeed2Direction, speedData.LiveSpeed2, speedData.PeakSpeedDirection,  speedData.PeakSpeed, speedData.PeakSpeedDirection2, speedData.PeakSpeed2, speedData.HitSpeedDirection, speedData.HitSpeed, speedData.HitSpeedDirection2, speedData.HitSpeed2);
        //    }
        //    io.emit('radarSpeed', speedData);
        //}
    };
    var recursiveTimerStart = function () {
        debug("Keep alive Timer Execute!");
        configRequestPending = false;
        

        var lastSpeedTimeOut = new Date();
        lastSpeedTimeOut = new Date(lastSpeedTimeOut.getTime() - (objOptions.softwareConfig.radarSpeedTimeOutMinutes * 60 * 1000));
        if (commonData.lastSpeedDataTimestamp < lastSpeedTimeOut) {
            //send power down radar command
            if (objOptions.radarConfig.TransmiterControl.value != 0) {
                
                self.emit('radarTimeout', { lastSpeedDataTimestamp: commonData.lastSpeedDataTimestamp });
                self.radarConfigCommand({
                    data: {
                        cmd: "TransmiterControl",
                        data: 0
                    }
                })
            }
        } else {
            self.emit('radarTimeout', { lastSpeedDataTimestamp: commonData.lastSpeedDataTimestamp });
            radarSerialPort.write(getRadarPacket(81, 0, new Buffer.alloc(1)), function (err) {
                if (err == undefined) {
                    debug('request Radar Software Version Keep Alive');
                } else {
                    debug('Serial Port Write Error Software Version Keep Alive' + err);
                }
            });
        }
        
        setTimeout(recursiveTimerStart,60000);
    };

    var radarSerialPort = null;
    if (objOptions.emulator == true) {
        debug('starting radarStalker2 emulator on Fake Port ' + radarSerialPortName);
        
        radarSerialPort = new RadarEmulator(radarSerialPortName, {
            baudrate: objOptions.baudrate,
            autoOpen: false
        });
        
    } else {
        debug('starting radarStalker2 on serial port ' + radarSerialPortName);
        //version 4 syntax
        radarSerialPort = new SerialPort(radarSerialPortName, {
            baudRate: objOptions.baudrate,
            autoOpen:false}); 
        
    }
    const radarPacketParser = radarSerialPort.pipe(new RadarPacketParser({ bufferSize: 512 }));
    radarPacketParser.on('data', radarSerialPortDataHandler);
    //set things in motion by opening the serial port and starting the keepalive timer
    radarSerialPort.open(function (err) {
        if (err) {
            debug('open Error' + err);
        }
        //Set things in motion by starting the recursiveTimer so we ask Software Version
        recursiveTimerStart();
    });
    
    
};
// extend the EventEmitter class using our RadarMonitor class
util.inherits(RadarStalker2, EventEmitter);

module.exports = RadarStalker2;