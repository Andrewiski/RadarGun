var SerialPort = require("serialport");
const { Stream } = require("stream");

let serialPort = new SerialPort("com3", {
    baudRate: 19200,
    autoOpen: false
}); 
        

var incomingMonitorStream = new Stream.Writable({});
// Consume the stream
incomingMonitorStream._write = (chunk, encoding, next) => {
    
    console.log('trace', "incomingTransStream Monitor: " + chunk.toString('hex'));
     
    next();
};

serialPort.pipe(incomingMonitorStream);
//set things in motion by opening the serial port and starting the keepalive timer
serialPort.open(function (err) {
    if (err) {
        console.log('open Error' + err);
    }
    
});