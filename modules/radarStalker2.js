//radarStalker2.js
//This Module will open uart and connect to a stalker Pro II radar sensor using a serial port
//it then raises events based on events
//The Best Config I have found is 115200 baud Peak and Hit turned off, with direction set to both now we look at inbound as pitch and outbound as hit.
const appLogName = "radarStalker2";
const util = require('util');
const extend = require('extend');
const EventEmitter = require('events').EventEmitter;
const { SerialPort } = require('serialport')
const RadarEmulator = require("./radarEmulator.js");
const RadarPacketParser = require("./radarPacketParser.js");
const RadarStalker2 = function (options, logUtilHelper){
    var self = this;
    var defaultOptions = {
        "emulator": true,
        "portName": "/dev/ttyS0",
        "packetParserBufferSize": 1024,
        "baudrate": 115200,
        "softwareConfig": {
          "logRawRadarPackets": false,
          "radarSpeedTimeOutMinutes": 30,
          "radarSpeedHistoryCount": 20,
          "zeroCounterLimit": 15,
          "LiveGameMode": {
            "id": -1,
            "value": true,
            "def": true,
            "datatype": "bool",
            "notes": "true LiveGame Mode On, false Live Game Mode Off"
          },
          "LiveGameDirection": {
            "id": -1,
            "value": "in",
            "def": "in",
            "datatype": "string",
            "notes": "in Radar Behind Catcher, out Live Game Mode Off"
          },
          "ThrowDownMode": {
            "id": -1,
            "value": true,
            "def": true,
            "datatype": "bool",
            "notes": "true Throw Down Mode On, false Throw Down Mode Off"
          },
          "ThrowDownMinSpeed": {
            "id": -1,
            "value": true,
            "def": true,
            "datatype": "int",
            "notes": "Min Throw Down Speed, Min Throw Down Speed Off"
          }
        },
        "radarConfig": {
          "TargetDirection": {
            "id": 2,
            "value": null,
            "def": 2,
            "datatype": "int",
            "notes": "0 Outbound, 1 InBound, 2 Both"
          },
          "Range": {
            "id": 4,
            "value": null,
            "def": 7,
            "datatype": "int",
            "notes": "0(min) - 7(max)"
          },
          "LowSpeedThreshold": {
            "id": 7,
            "value": 50,
            "def": 30,
            "datatype": "int",
            "notes": "0 - 900 MPH"
          },
          "HighSpeedThreshold": {
            "id": 11,
            "value": 100,
            "def": 150,
            "datatype": "int",
            "notes": "0 - 900 MPH"
          },
          "AlarmApeedThreshold": {
            "id": 12,
            "value": null,
            "def": 1500,
            "datatype": "int",
            "notes": "0 - 1500 MPH Aux Pin Function"
          },
          "PeakSpeedEnable": {
            "id": 13,
            "value": null,
            "def": 0,
            "datatype": "int",
            "notes": "0 Disabled, 1 Enabled"
          },
          "AuxPinConfiguration": {
            "id": 16,
            "value": null,
            "def": 1,
            "datatype": "int",
            "notes": "0 = Radar Trigger, 1 = Off, 2 = SpeedAlarm, 3 = Doppler without Squeulch, 4 = Doopler with Sqeulch"
          },
          "CosignAngle1": {
            "id": 18,
            "value": null,
            "def": 0,
            "datatype": "int",
            "notes": "0-45 one degree increments"
          },
          "CosignAngle2": {
            "id": 19,
            "value": null,
            "def": 0,
            "datatype": "int",
            "notes": "0-45 one degree increments"
          },
          "Units": {
            "id": 20,
            "value": null,
            "def": 0,
            "datatype": "int",
            "notes": "0 MPH, 1 km/h, 2 knots, 3 feet/sec, 4 meters/sec"
          },
          "UnitResolution": {
            "id": 21,
            "value": null,
            "def": 1,
            "datatype": "int",
            "notes": "0 Ones, 1 Tenths"
          },
          "LeadingZeroCharacter": {
            "id": 23,
            "value": null,
            "def": 1,
            "datatype": "int",
            "notes": "0 Zero, 1 Space, 2 None"
          },
          "SerialPortBaudRate": {
            "id": 29,
            "value": null,
            "def": null,
            "readOnly": true,
            "datatype": "string",
            "notes": "0 300, 1 600, 2 1200, 3 2400, 4 4800, 5 9600, 6 19200, 7 38400, 8 57600, 9 115200"
          },
          "MessageFormat": {
            "id": 30,
            "value": null,
            "def": 3,
            "datatype": "int",
            "mandatory": true,
            "readOnly": true,
            "notes": "0 None, 1 A, 2 b, 3 bE, 4 S, 5 EE, 6 A1, 7 COL"
          },
          "MessagePeriod": {
            "id": 31,
            "value": null,
            "def": 0,
            "datatype": "int",
            "notes": "0 - 10000  10Sec delay"
          },
          "ProductID": {
            "id": 37,
            "value": null,
            "def": null,
            "readOnly": true,
            "datatype": "string",
            "notes": "Read Only Product ID In Ascii"
          },
          "TransmiterControl": {
            "id": 42,
            "value": null,
            "def": 1,
            "datatype": "int",
            "notes": "0 = Hold, 1 = Transmit"
          },
          "LiveTargetLock": {
            "id": 43,
            "value": null,
            "def": 0,
            "datatype": "int",
            "notes": "0 = Release, 1 = Lock"
          },
          "ForkMode": {
            "id": 47,
            "value": null,
            "def": 0,
            "datatype": "int",
            "notes": "0 Off, 1 On"
          },
          "RadarTriggerMode": {
            "id": 60,
            "value": null,
            "def": 2,
            "datatype": "int",
            "notes": "Aux Pin Function 0 Continuous, 1 Start - Stop, 2 Lock"
          },
          "ProductType": {
            "id": 79,
            "value": null,
            "def": null,
            "readOnly": true,
            "datatype": "hex",
            "notes": "3 Byte Code for Model"
          },
          "SoftwareVersion": {
            "id": 81,
            "value": null,
            "def": null,
            "readOnly": true,
            "datatype": "string",
            "notes": "Ascii String for Software Version"
          },
          "AutoClearDelay": {
            "id": 88,
            "value": null,
            "def": 0,
            "datatype": "int",
            "notes": "0 -10 sec, 11 20 sec, 12 30 sec, 13 Off"
          },
          "MessageTermination": {
            "id": 101,
            "value": null,
            "def": 0,
            "mandatory": true,
            "readOnly": true,
            "datatype": "int",
            "notes": "0 CR, 1 CRLF, 2 Unit CR, 3 Unit CRLF"
          },
          "PeakMessageType": {
            "id": 102,
            "value": null,
            "def": 1,
            "datatype": "int",
            "notes": "0 Continuous, 1 Single"
          },
          "TargetType": {
            "id": 103,
            "value": null,
            "def": 0,
            "datatype": "int",
            "notes": "0 Baseball, 1 Carnival, 2 Car, 3 Tennis"
          },
          "FormatASpeed": {
            "id": 104,
            "value": null,
            "def": 1,
            "datatype": "int",
            "notes": "0 Last/Live, 1 Peak, 2 Hit"
          },
          "HitSpeedEnable": {
            "id": 105,
            "value": null,
            "def": 0,
            "datatype": "int",
            "notes": "0 Disabled, 1 Enabled"
          },
          "SpeedSensorAddress": {
            "id": 116,
            "value": null,
            "def": 2,
            "readOnly": true,
            "datatype": "int",
            "notes": "2 RS-2323 is fixed at 2, RS-485 2 - 254"
          }
        }
    };

    var objOptions = extend({}, defaultOptions,  options);


    // EventEmitters inherit a single event listener, see it in action
    this.on('newListener', function (listener) {
        logUtilHelper.log(appLogName, "app", "debug", 'radarStalker2 Event Listener: ' + listener);
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

    var radarSerialPortName = objOptions.portName;
    


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
                        logUtilHelper.log(appLogName, "app", "error", "Invalid Packet Type detected " + data.readUInt8(0));
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
                        mybuff = getRadarPacket(radarConfigProperty.id, 0, new Buffer.alloc(1));  //04/24/2022 new Buffer([0])); // new Buffer.alloc(1));
                        radarSerialPort.write(mybuff, function(err) {
                            if (err === undefined){
                                configRequestPending = true;
                                logUtilHelper.log(appLogName, "app", "debug", 'request Radar Config ' + key);
                            }else{
                                data.success = false;
                                data.error = err;
                                logUtilHelper.log(appLogName, "app", "error", 'Serial Port Write Error ' + err);
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
        var socketid;
        if (socket) {
            socketid = socket.id;
        } else {
            socketid = "radar"
        }
        logUtilHelper.log(appLogName, "app", "debug", 'radarEmulatorCommand:' + data.cmd + ', value:' + data.data + ', client socket id:' + socketid);
        if (objOptions.emulator === true) {
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
        logUtilHelper.log(appLogName, "app", "debug", 'softwareConfigCommand:' + data.cmd + ', value:' + data.data + ', client socket id:' + socketid);
        
        var softwareConfigProperty = objOptions.softwareConfig[data.cmd];
        if (softwareConfigProperty === undefined) {
            logUtilHelper.log(appLogName, "app", "error", 'softwareConfigCommand: Error Config Property Not Found' + data.cmd + ', value:' + data.data + ', client socket id:' + socketid);
        } else
        {
            var myConfigVal;
            switch (softwareConfigProperty.datatype) {
                case 'int':
                    var numvalue = parseInt(data.data);
                    if (!isNaN(numvalue) === true) {
                        softwareConfigProperty.value = numvalue;
                    }
                    break;
                case 'string':
                    //logUtilHelper.log(appLogName, "app", "error", 'Error So far no Config accepts String as setable value not implemented');
                    softwareConfigProperty.value = data.data;
                    break;
            }
            self.emit('softwareConfigProperty', data);
        }
    };

    this.resetRadarSettings = function () {
        logUtilHelper.log(appLogName, "app", "debug",'resetRadarSettings called');
        //First Turn of the Transmitter so it stops sending us speed data to parse
        self.radarConfigCommand({
            data: {
                cmd: "TransmiterControl",
                data: 0
            }
        })

        for (var key in objOptions.radarConfig) {
            var radarConfigProperty = objOptions.radarConfig[key];
            if (radarConfigProperty.def !== null && (radarConfigProperty.mandatory === true || radarConfigProperty.readOnly !== true) && key !== "TransmiterControl" ) {
                
                self.radarConfigCommand({
                    data: {
                        cmd: key,
                        data: radarConfigProperty.def
                    }
                })
            }
        }
    }

    this.radarConfigCommand = function (options) {
        var data = options.data;
        var socket = options.socket;
        var socketid = null;
        if (socket) {
            socketid = socket.id;
        } else {
            socketid = "radar";
        }
        logUtilHelper.log(appLogName, "app", "debug", 'radarConfigCommand:' + data.cmd + ', value:' + data.data + ', client socket id:' + socketid);

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
                //nconf.save();
                self.emit('configSave', radarConfigProperty);
                logUtilHelper.log(appLogName, "app", "debug", 'Settings Saved');
            } catch (ex) {
                logUtilHelper.log(appLogName, "app", "error", 'setting save Error:' + ex);
            }
        } else {
            var myConfigVal;
            switch (radarConfigProperty.datatype) {
                case 'int':
                    var numvalue = parseInt(data.data);
                    if (!isNaN(numvalue) === true) {
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
                    //logUtilHelper.log(appLogName, "app", "debug", 'Error So far no Config accepts hex as setable value not implemented');
                    myConfigVal = Buffer.from(data.data, 'hex');
                    break;
                case 'string':
                    //logUtilHelper.log(appLogName, "app", "debug", 'Error So far no Config accepts String as setable value not implemented');
                    myConfigVal = Buffer.from(data.data);
                    break;
            }
            mybuff = getRadarPacket(radarConfigProperty.id, 128, myConfigVal);
            radarSerialPort.write(mybuff, function (err) {
                if (err === undefined) {
                    radarSerialPort.drain(function () {
                        data.success = true;
                        data.error = '';
                        self.emit('radarCommand', data);
                    });
                } else {
                    data.success = false;
                    data.error = err;
                    logUtilHelper.log(appLogName, "app", "error", 'Serial Port Write Error ' + err);
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
        if (data.readUInt8(1) === 1) { // make sure this packet is for us We are always ID 1
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
                if (objOptions.radarConfig[key].id === PacketConfigID) {
                    ConfigPropertyName = key;
                    ConfigProperty = objOptions.radarConfig[key];
                    break;
                }
            }
            if (ConfigProperty !== undefined) {
                var value;
                switch (ConfigProperty.datatype) {
                    case 'int':
                        if (PayloadLength === 3) {
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
                        logUtilHelper.log(appLogName, "app", "error", 'Error no datatype set for ' + ConfigPropertyName);
                }
                if (ConfigProperty.value !== value) {
                    ConfigProperty.value = value;
                    updateRadarConfigProperty = true;
                    logUtilHelper.log(appLogName, "app", "debug", "radarConfigProperty received ", ConfigPropertyName, value)
                }
                if (updateRadarConfigProperty === true) {
                    //raise the event to app.js so it can emit it via socket.io to the browser
                    var cdp = { Property: ConfigPropertyName, data: value };
                    self.emit('radarConfigProperty', cdp);
                }
                configRequestPending = false;
            } else {
                logUtilHelper.log(appLogName, "app", "error", 'Invalid Config ID ' + PacketConfigID);
            }
        } else {
            logUtilHelper.log(appLogName, "app", "error", "Packet is Not For Us its For Device Address " + data.readUInt8(1));
        }

    }

    var pitchCounter = 0;
    var zeroCounter = 0;
    //this is used below to send the speed to the client so we have to reach this value in low speed countes before we decide this is a valid speed
    //we do this as sometimes the radar gives two pitches as the ball reading are a zero as it passes in front of a player of bounces etc.
    

    var ProcessRadarDataPacket_BESpeed = function (data) {
        var UnitConfig = data.readUInt8(1);
        UnitConfig = { resolution: (8 === (8 & UnitConfig)), peakSpeed: (2 === (2 & UnitConfig)), forkMode: (1 === (1 & UnitConfig)) };
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
                logUtilHelper.log(appLogName, "app", "warning", 'Invalid Length');
            }
            var UnitSpeedBlockStatusByte = data.readUInt8(8 + Offset);
            var UnitSpeedBlockStatus = { primaryDirection: ((2 === (2 & UnitSpeedBlockStatusByte)) ? 'in' : 'out'), secondaryDirection: ((4 === (4 & UnitSpeedBlockStatusByte)) ? 'in' : 'out'), transmiterStatus: ((1 === (1 & UnitSpeedBlockStatusByte)) ? 'on' : 'off') }
            var Speed = data.toString("ascii", 9 + Offset, 12 + Offset);  //data[9 + Offset] + data[10 + Offset] + data[11 + Offset];
            var Tenths = data.toString("ascii", 12 + Offset, 13 + Offset);
            if (Tenths !== ' ') {
                Speed = Speed + '.' + Tenths; //data[12 + Offset];
            }
            var Speed2 = data.toString("ascii", 13 + Offset, 16 + Offset); // data[13 + Offset] + data[14 + Offset] + data[15 + Offset] + '.' + data[16 + Offset];
            var Tenths2 = data.toString("ascii", 16 + Offset, 17 + Offset);
            if (Tenths2 !== ' ') {
                Speed2 = Speed2 + '.' + Tenths2; //data[16 + Offset];
            }
            switch (data.readUInt8(7 + Offset)) {
                case 52: //'4': //Live Speed Block
                    speedData.liveSpeedDirection = UnitSpeedBlockStatus.primaryDirection;
                    speedData.liveSpeed2Direction = UnitSpeedBlockStatus.secondaryDirection;
                    if (Speed.trim() !== '') {
                        speedData.liveSpeed = parseFloat(Speed);
                    }
                    if (Speed2.trim() !== '') {
                        speedData.liveSpeed2 = parseFloat(Speed2);
                    }
                    Offset = Offset + 15;
                    break;
                case 53: // '5': //Peak Speed Block
                    speedData.peakSpeedDirection = UnitSpeedBlockStatus.primaryDirection;
                    speedData.peakSpeed2Direction = UnitSpeedBlockStatus.secondaryDirection;
                    if (Speed.trim() !== '') {
                        speedData.peakSpeed = parseFloat(Speed);
                    }
                    if (Speed2.trim() !== '') {
                        speedData.peakSpeed2 = parseFloat(Speed2);
                    }
                    Offset = Offset + 15;
                    break;
                case 54: // '6': //Hit Speed Block
                    speedData.hitSpeedDirection = UnitSpeedBlockStatus.primaryDirection;
                    speedData.hitSpeed2Direction = UnitSpeedBlockStatus.secondaryDirection;
                    if (Speed.trim() !== '') {
                        speedData.hitSpeed = parseFloat(Speed);
                    }
                    if (Speed2.trim() !== '') {
                        speedData.hitSpeed2 = parseFloat(Speed2);
                    }
                    Offset = Offset + 15;
                    break;
                default:
                    logUtilHelper.log(appLogName, "app", "error", 'Invalid Speed Block Id');
                    break;
            }
        }
       
        if (speedData.liveSpeed > objOptions.radarConfig.LowSpeedThreshold.value || speedData.peakSpeed > objOptions.radarConfig.LowSpeedThreshold.value) {
            logUtilHelper.log(appLogName, "app", "debug", "Speed Data live:" + speedData.liveSpeed + " " + speedData.liveSpeedDirection + " live2:" + speedData.liveSpeed2 + " " + speedData.liveSpeed2Direction);
        } 
        
        
        if (speedData.liveSpeed >= objOptions.radarConfig.LowSpeedThreshold.value) {
            if (commonData.currentRadarSpeedData.firstDirection === null) {
                commonData.currentRadarSpeedData.firstDirection = speedData.liveSpeedDirection;
                commonData.currentRadarSpeedData.firstTime = new Date().getTime();
            }
            if (speedData.liveSpeedDirection === "in") {
                //commonData.currentRadarSpeedData.inSpeeds.push(speedData.liveSpeed)
                
                if (commonData.currentRadarSpeedData.inMaxSpeed < speedData.liveSpeed) {
                    commonData.currentRadarSpeedData.inMaxSpeed = speedData.liveSpeed;
                }
                if (commonData.currentRadarSpeedData.inMinSpeed === 0 || commonData.currentRadarSpeedData.inMinSpeed > speedData.liveSpeed) {
                    commonData.currentRadarSpeedData.inMinSpeed = speedData.liveSpeed;
                }
            } else if (speedData.liveSpeedDirection === "out") {
                
                //commonData.currentRadarSpeedData.outSpeeds.push(speedData.liveSpeed)
                if (commonData.currentRadarSpeedData.outMaxSpeed < speedData.liveSpeed) {
                    commonData.currentRadarSpeedData.outMaxSpeed = speedData.liveSpeed;
                }
                if (commonData.currentRadarSpeedData.outMinSpeed === 0 || commonData.currentRadarSpeedData.outMinSpeed > speedData.liveSpeed) {
                    commonData.currentRadarSpeedData.outMinSpeed = speedData.liveSpeed;
                }
            }
        }
        if (speedData.liveSpeed2 >= objOptions.radarConfig.LowSpeedThreshold.value) {
            if (commonData.currentRadarSpeedData.firstDirection === "") {
                commonData.currentRadarSpeedData.firstDirection = speedData.liveSpeed2Direction;
                commonData.currentRadarSpeedData.firstTime = new Date().getTime();
            }
            if (speedData.liveSpeed2Direction === "in") {
                //commonData.currentRadarSpeedData.inSpeeds.push(speedData.liveSpeed2)
                if (commonData.currentRadarSpeedData.inMaxSpeed < speedData.liveSpeed2) {
                    commonData.currentRadarSpeedData.inMaxSpeed = speedData.liveSpeed2;
                }
                if (commonData.currentRadarSpeedData.inMinSpeed === 0 || commonData.currentRadarSpeedData.inMinSpeed > speedData.liveSpeed2) {
                    commonData.currentRadarSpeedData.inMinSpeed = speedData.liveSpeed2;
                }
            } else if (speedData.liveSpeed2Direction === "out") {
                //commonData.currentRadarSpeedData.outSpeeds.push(speedData.liveSpeed2)
                if (commonData.currentRadarSpeedData.outMaxSpeed < speedData.liveSpeed2) {
                    commonData.currentRadarSpeedData.outMaxSpeed = speedData.liveSpeed2;
                }
                if (commonData.currentRadarSpeedData.outMinSpeed === 0 || commonData.currentRadarSpeedData.outMinSpeed > speedData.liveSpeed2) {
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
        
        
    };
    var recursiveTimerStart = function () {
        logUtilHelper.log(appLogName, "app", "debug", "Keep alive Timer Execute!");
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
                if (err === undefined) {
                    logUtilHelper.log(appLogName, "app", "debug", 'request Radar Software Version Keep Alive');
                } else {
                    logUtilHelper.log(appLogName, "app", "error", 'Serial Port Write Error Software Version Keep Alive' + err);
                }
            });
        }
        
        setTimeout(recursiveTimerStart,60000);
    };

    var radarSerialPort = null;
    if (objOptions.emulator === true) {
        logUtilHelper.log(appLogName, "app", "info", 'starting radarStalker2 emulator on Fake Port ' + radarSerialPortName);
        
        radarSerialPort = new RadarEmulator(radarSerialPortName, {
            baudrate: objOptions.baudrate,
            autoOpen: false
        }, logUtilHelper);
        
    } else {
        logUtilHelper.log(appLogName, "app", "info", 'starting radarStalker2 on serial port ' + radarSerialPortName);
        //version 4 syntax
        radarSerialPort = new SerialPort({path: radarSerialPortName,
            baudRate: objOptions.baudrate,
            autoOpen:false}); 
        
    }
    const radarPacketParser = radarSerialPort.pipe(new RadarPacketParser({ bufferSize: objOptions.packetParserBufferSize }, logUtilHelper));
    radarPacketParser.on('data', radarSerialPortDataHandler);
    //set things in motion by opening the serial port and starting the keepalive timer
    radarSerialPort.open(function (err) {
        if (err) {
            logUtilHelper.log(appLogName, "app", "error", 'open Error' + err);
        }
        //Set things in motion by starting the recursiveTimer so we ask Software Version
        recursiveTimerStart();
    });
    
    
};
// extend the EventEmitter class using our RadarMonitor class
util.inherits(RadarStalker2, EventEmitter);

module.exports = RadarStalker2;