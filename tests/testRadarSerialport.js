const appLogName = "testRadarSerialPort"
const { SerialPort } = require('serialport')
const RadarPacketParser = require("../modules/radarPacketParser.js");
const { ReadlineParser } = require('@serialport/parser-readline')
const LogUtilHelper = require("@andrewiski/logutilhelper");

const radarConnected = true;
try {

    var port1;
    
    var appLogLevels = {
        "testRadarSerialPort": {
            "app":"debug",
            "browser": "warning",
            "socketio": "warning"
        },
        "radarPacketParser" :{
            "app":"trace"
        }
    }

    if (process.platform === 'win32') {
        port1 = 'COM4';
    }else{
        port1 = '/dev/ttyTHS1';
    }
    var options = 
        {path: port1,
        baudRate: 115200,
        autoOpen:false,
        rtscts: false,
        xon:false, 
        xoff: false,
        xany: false
    }
    var serialPort1 = new SerialPort(options);
    
    const readlineParser = serialPort1.pipe(new ReadlineParser({ delimiter: '\r' }));
    
    let logUtilHelper = new LogUtilHelper({
        appLogLevels: appLogLevels,
        logEventHandler: null,
        logUnfilteredEventHandler: null,
        logFolder: "logs",
        logName: appLogName,
        debugUtilEnabled: (process.env.DEBUG ? true : undefined) || false,
        debugUtilName:appLogName,
        debugUtilUseUtilName: true,
        debugUtilUseAppName: true,
        debugUtilUseAppSubName: false,
        includeErrorStackTrace: true,
        logToFile: false,
        logToFileLogLevel: "debug",
        logToMemoryObject: true,
        logToMemoryObjectMaxLogLength: 100,
        logSocketConnectionName: "socketIo",
        logRequestsName: "access"
    
    })

    var serialPort1DataHandler = function (data) {
        console.log("Serial Port1 Data ", data);
    }

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
// getRadarPacket(radarConfigProperty.id, 0, new Buffer.alloc(1))
    var radarSoftwareVersionRequest = getRadarPacket(81, 0, new Buffer.alloc(1))

    var recursiveTimerStart = function () {
        console.log("Timer Execute!");
        if (radarConnected){
            serialPort1.write(radarSoftwareVersionRequest);
        }else{
            serialPort1.write("Testing 123 \r\n");
        }
        
        setTimeout(recursiveTimerStart, 5000);
    };

    var radarPacketParser = null;
    if (radarConnected){
        radarPacketParser = serialPort1.pipe(new RadarPacketParser({ bufferSize: 1024, traceLog: true }, logUtilHelper));
        radarPacketParser.on('data', serialPort1DataHandler);
    }else{
        readlineParser.on('data', serialPort1DataHandler);
    }
    
    
    //set things in motion by opening the serial port and starting the keepalive timer
    serialPort1.open(function (err) {
        if (err) {
            console.log('open serialPort1 Error' + err);
        } else {
            console.log("Serial Port1 opened ");
        }
        
    });
    //serialPort1.write(radarSoftwareVersionRequest);
    setTimeout(recursiveTimerStart, 5000);
} catch (e) {
    console.log("Fatal Error" , e);
}