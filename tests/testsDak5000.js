var SerialPort = require("serialport");
const Stream = require('stream');
try {

    
    if (process.platform === 'win32') {
        port1 = 'COM1';
        
    }else{
        port1 = '/dev/ttyO1';
    }
    var options = { baudRate: 19200, autoOpen: false };

    var serialPort1 = new SerialPort(port1, options);
    

    var recursiveTimerStart = function () {
        console.log("Timer Execute!");     
        setTimeout(recursiveTimerStart, 2000);
    };


    // Start Monitor Stream 
    // Read from the source stream, to keeps it alive and flowing
    var monitorStream = new Stream.Writable({});
    // Consume the stream
    monitorStream._write = (chunk, encoding, next) => {
        
        console.log('app', 'trace', chunk.toString("hex"));
        console.log('app', 'trace', "---------------------------");
            
        
        
        next();
    }

    serialPort1.pipe(monitorStream);
    //set things in motion by opening the serial port and starting the keepalive timer
    serialPort1.open(function (err) {
        if (err) {
            console.log('open serialPort1 Error' + err);
        } else {
            console.log("Serial Port1 opened ");
        }
        
    });
    
    //setTimeout(recursiveTimerStart, 2000);
} catch (e) {
    console.log(e);
}