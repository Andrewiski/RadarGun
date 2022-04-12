const { Transform } = require('stream');
var debug = require('debug')('radarPacketParser');
/**
 * Emit data every number of bytes
 * @extends Transform
 * @param {Object} options parser options object
 * @param {Number} options.length the number of bytes on each data event
 * @summary A transform stream that emits data as a buffer after a specific number of bytes are received. Runs in O(n) time.
 * @example
const SerialPort = require('serialport')
const RadarPacketParser = require('./radarPacketParser.js')
const port = new SerialPort('/dev/tty-usbserial1')
const parser = port.pipe(new RadarPacketParser({length: 8}))
parser.on('data', console.log) // will have 8 bytes per data event
 */
class RadarPacketParser extends Transform {
    constructor(options = {}) {
        super(options);

        if (options.bufferSize === undefined || options.bufferSize === 0 ) {
            throw new TypeError('"bufferSize" has a 0 or undefined length');
        }
        
        this.bufferSize = options.bufferSize;
        this.position = 0;
        this.buffer = Buffer.alloc(this.bufferSize);
    }

    _transform(chunk, encoding, cb) {        
        if (this.position + chunk.length > this.bufferSize) {
            //We Are going to blow are max buffer size as something has gone wrong so discard saved buffer and start over
            console.log('RadarPacketParser over our bufferSize discarding partial packet buffer. bufferSize = ' + this.bufferSize + " position = " + this.position + " chunk.length = " + chunk.length);

            debug(chunk.toString('hex') + "\n\n")
            this.position = 0;
            cb();
            return;
        } else {
            //Take what ever was pending in our buffer and append the incomming data so we can use it for processing
            chunk.copy(this.buffer, this.position, 0, chunk.length);
            this.position = this.position + chunk.length;
        }
        
                   

        //data should have the any pending and current data in it lets process what ever full packets we have and if any left over bytes
        // we will copy to start of this.buffer and set the this.position
        var needmoredata = false;
        var i = 0;
        for (i = 0; i < this.position; i++) {

            //The radar unit doesn't have a consistant output data format while using the streaming format as it doesn't have a checksum at the end
            // all it has is Termination Char which can be changed via a setting we are expecting default sitting of Carrage Return 0x0D (13)
            // Polling mode has Checksum but no Peak and Hit speed. So BE streaming mode which is what we need to use as for the application
            // we need peak and hit speed 
            // So the only thing we can do is look for our two Start ID's 0x88 (136) streaming data and 0xEF (239) Configuration Data  


            switch (this.buffer.readUInt8(i)) {
                case 136: // 0x88 BE Speed Stream Packet
                    if (this.position > i + 6) {
                        var speedPacketLength = 0;
                        switch (this.buffer.readUInt8(i + 6)) {
                            //this is the Number of Speed Blocks but its in Ascii and each is 15 bytes long + 7 in Header + Delimeter 0x0D = 8
                            case 49: //1
                                speedPacketLength = 23; // (7 + 15 + 1)
                                break;
                            case 50: //2
                                speedPacketLength = 38; // (7 + (15 * 2) + 1)
                                break;
                            case 51: //3
                                speedPacketLength = 53; // (7 + (15 * 2) + 1)
                                break;
                            default:
                                debug("Invalid Byte detected in Speed Stream Packet " + this.buffer.readUInt8(i) + " at position " + (i + 6));
                                break;
                        }
                        if (speedPacketLength > 0) {
                            if (this.position >= i + speedPacketLength) {
                                var speedPacket = new Buffer.alloc(speedPacketLength);
                                this.buffer.copy(speedPacket, 0, i, i + speedPacketLength);
                                i = i + speedPacketLength - 1;
                                this.push(speedPacket);
                            } else {
                                needmoredata = true;
                            }
                        } else {
                            needmoredata = true;
                        }
                    } else {
                        needmoredata = true;
                    }
                    break;
                case 239: // 0xEF  Configuration Data
                    var configPacketLength = 0;
                    // Config Packets have Packet length as 2 byte Word LSB first at index 4
                    if (this.position > i + 6) {
                        configPacketLength = this.buffer.readUInt16LE(i + 4) + 8; //9 = 6 header + 2 checksum 
                        //Proboly should check for a max packet length here in case we get a bad length 

                        if (configPacketLength > 128) {
                            debug('Invalid Config Data Packet Length ' + configPacketLength);
                            break;
                        }

                        if (this.position >= i + configPacketLength) {
                            var configPacket = new Buffer.alloc(configPacketLength);
                            this.buffer.copy(configPacket, 0, i, i + configPacketLength);
                            i = i + configPacketLength - 1;
                            //Todo Check Checksum to make sure its a valid packet
                            this.push(configPacket);
                        } else {
                            needmoredata = true;
                        }
                    } else {
                        needmoredata = true;
                    }
                    break;
                default:
                    debug("Invalid Byte detected " + this.buffer.readUInt8(i) + " at position " + i);
                    break;
            }
            if (needmoredata === true) {
                break;
            }
        }  //end of for loop
        
        if (needmoredata === true) {
            //i should be where we left off with partial packet so we need to copy from i to length to start of radarDataBuffer
            if (i !== 0) {
                 
                this.buffer.copy(this.buffer, 0, i, this.position);       //copy whats remaining to the front of the buffer
                this.position = this.position - i; //update the position pointer
                
            }
        } else {
            //No need to do any copying here just set the position to zero
            this.position = 0;
        }
        
        cb();
    }

    _flush(cb) {
        //this.push(this.buffer.slice(0, this.position));
        this.position = 0;
        this.buffer = Buffer.alloc(this.length);
        cb();
    }
}

module.exports = RadarPacketParser;