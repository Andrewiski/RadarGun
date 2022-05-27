var SerialPort = require("serialport");
const { Stream } = require("stream");

let serialPort = new SerialPort({
    path:"/dev/ttyTHS1",
    baudRate: 19200,
    autoOpen: false,
    rtscts: false,
    xon:false, 
    xoff: false,
    xany: false
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