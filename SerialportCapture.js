var SerialPort = require("serialport");
const { Stream } = require("stream");

let serialPort = new SerialPort("com5", {
    baudRate: 9600,
    autoOpen: false
}); 
        

var incomingMonitorStream = new Stream.Writable({});
// Consume the stream
incomingMonitorStream._write = (chunk, encoding, next) => {
    
    console.log('trace', "incomingTransStream Monitor: length " + chunk.length + " : "  + chunk.toString('hex'));
     
    next();
};

serialPort.pipe(incomingMonitorStream);
//set things in motion by opening the serial port and starting the keepalive timer
serialPort.open(function (err) {
    if (err) {
        console.log('open Error' + err);
    }
    console.log('Port opened');
});