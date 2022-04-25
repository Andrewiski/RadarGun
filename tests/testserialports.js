//var SerialPort = require("serialport");   v4 syntax
var serialPort = require("serialport")
var SerialPort = serialPort.SerialPort

try {

    var port1;
    var port2;
    if (process.platform === 'win32') {
        port1 = 'COM7';
        port2 = 'COM12';
    }else{
        port1 = '/dev/ttyO1';
        port2 = '/dev/ttyO4';
    }
    var options = { baudrate: 115200, parser: serialPort.parsers.readline('\n') };
    var teststring = "This is the string I'm sending out as a test\n";
    var serialPort1 = new SerialPort(port1, options, false);
    var serialPort2 = new SerialPort(port2, options, false);

    var serialPort1DataHandler = function (data) {
        console.log("Serial Port1 Data ", data);
    }

    var serialPort2DataHandler = function (data) {
        console.log("Serial Port2 Data ", data);
    }
    var port1Write = true;
    var recursiveTimerStart = function () {
        console.log("Timer Execute!");
        
        if (serialPort1 == true) {
            port1Write = false;
            serialPort1.write("Port1->Port2 " + teststring, function (err) {
                if (err == undefined) {
                    console.log("Port1 Wrote Data") ;
                } else {
                    console.log('Port1 Write Error' + err);
                }
            });
        } else {
            port1Write = true;
            serialPort2.write("Port2->Port1 " + teststring, function (err) {
                if (err == undefined) {
                    console.log("Port2 Wrote Data");
                } else {
                    console.log('Port2 Write Error' + err);
                }
            });
        }
       
        setTimeout(recursiveTimerStart, 2000);
    };

    serialPort1.on('data', serialPort1DataHandler);
    serialPort2.on('data', serialPort2DataHandler);
    //set things in motion by opening the serial port and starting the keepalive timer
    serialPort1.open(function (err) {
        if (err) {
            console.log('open serialPort1 Error' + err);
        } else {
            console.log("Serial Port1 opened ");
        }
        
    });
    serialPort2.open(function (err) {
        if (err) {
            console.log('open serialPort2 Error' + err);
        } else {
            console.log("Serial Port2 opened ");
        }


    });
    setTimeout(recursiveTimerStart, 2000);
} catch (e) {
    console.log(e);
}