//eeprom.Js
//This Module will connect to the i2c ht16k33 led Backpack and allow setting of the display
var util = require('util');
var extend = require('extend');
var i2c;
var debug = require('debug')('eeprom');
const Deferred = require('node-promise').defer;

var eeprom = function (options) {
    var self = this;
    var defaultOptions = {
        I2CAddress: "0x50", //the i2c address of the eeprom
        I2CDevice: 1,
        EepromSizeKb: 512,  //Tested on a Microchip 24LC512
        EepromWritePageSize: 128
    }
    self.options = extend({}, defaultOptions, options);
    self.busy = false;
    if (process.platform != 'win32') {
        i2c = require('i2c-bus');
    }
    debug('i2c eeprom Address ' + self.options.I2CDevice + '/' + self.options.I2CAddress);
    if (typeof (self.options.I2CAddress) === "string") {   //if string convert to int
        console.log('I2CAddress must be int parsing ' + self.options.I2CAddress);
        self.options.I2CAddress = parseInt(self.options.I2CAddress);
    }
    console.log('I2CAddress set to ' + self.options.I2CAddress);  

    function ReadDataSync(Address, Length) {
        
        try{
            if (self.busy === true) {
                throw new Error("Device already in Use");
            }          
            if (i2c != null) {
                self.busy = true;
                i2cbus = i2c.openSync(self.options.I2CDevice)
                //debug('i2c.open success ' + self.options.I2CDevice );
                var memaddressBuf = Buffer.alloc(2);
                memaddressBuf[0] = ((Address & 0xff00) >> 8);
                memaddressBuf[1] = ((Address & 0x00ff));
                
                //debug('Read Data ', "0x" + memaddressBuf.toString("hex"), Length);
                var data = Buffer.alloc(Length)
                let bytesWrite = i2cbus.i2cWriteSync(self.options.I2CAddress, 2, memaddressBuf);
                let bytesRead = i2cbus.i2cReadSync(self.options.I2CAddress, Length, data);
                self.busy = false;
                i2cbus.closeSync();
                return data;
            } else {
                self.busy = false;
                debug("no i2c bus on win32");
                throw new Error("no i2c bus on win32");   
            }
        }catch(ex){
            self.busy = false;
            if(i2cbus){
                i2cbus.closeSync();
            }
            debug('error', 'Error Reading eeprom', ex);
            throw ex
        }
    }

    function ReadData(Address, Length) {
        let deferred = Deferred();
        try{
            let data = ReadDataSync(Address,Length)
            deferred.resolve(data);
        }catch(ex){
            debug('error', 'Error Reading eeprom', ex);
            deferred.reject('error', ex);
        }
        return deferred.promise;
    }

    function WriteDataSync(Address, Length, Data) {
        
        try{
            if (self.busy === true) {
                throw new error("Device already in Use");
            }
            if (i2c != null) {
                self.busy = true;
                i2cbus = i2c.openSync(self.options.I2CDevice);     
                //debug('i2c.open success ' + self.options.I2CDevice );
                var numPageWrites = Math.floor(Length/self.options.EepromWritePageSize);
                var remainder = Length % self.options.EepromWritePageSize;
                var currentAddress = Address;
                for(var i = 0; i < numPageWrites; i++ ){
                    let dataBuf = Buffer.alloc( self.options.EepromWritePageSize + 2);
                    dataBuf[0] = ((currentAddress & 0xff00) >> 8);
                    dataBuf[1] = ((currentAddress & 0x00ff));
                    Data.copy(dataBuf,2,i * self.options.EepromWritePageSize, (i * self.options.EepromWritePageSize) + self.options.EepromWritePageSize);
                    let bytesWriten = i2cbus.i2cWriteSync(self.options.I2CAddress, dataBuf.length, dataBuf);
                    debug('info', 'Wrote eeprom page write',  currentAddress, i,  bytesWriten);
                    //Too Ensure the previous write is complete we run a loop polling for an ack then do next write
                    
                    currentAddress = currentAddress + self.options.EepromWritePageSize;
                    dataBuf[0] = ((currentAddress & 0xff00) >> 8);
                    dataBuf[1] = ((currentAddress & 0x00ff));
                    let readyForNextWrite = false;
                    let readyForNextWriteTimeout = 0;
                    while(readyForNextWrite === false){
                        try{
                            let bytesWriten = i2cbus.i2cWriteSync(self.options.I2CAddress, 2, dataBuf);
                            if (bytesWriten === 2){
                                //debug('info', 'Ready for Next Write'); 
                                readyForNextWrite = true;
                                break; 
                            }else if(readyForNextWriteTimeout > 15){
                                debug('info', 'We reached max loop waiting on eeprom to say it was ready'); 
                                readyForNextWrite = true;
                                break;  
                            }else{
                                debug('info', 'Not enough Bytes Writen Ready for Next Write'); 
                                readyForNextWrite = true;
                                break;
                            }
                        }catch(ex){
                            //debug('info', 'Not ready for Next Write yet');
                        }
                    }
                }
                
                if(remainder > 0){
                    let dataBuf = Buffer.alloc(remainder + 2);
                    dataBuf[0] = ((currentAddress & 0xff00) >> 8);
                    dataBuf[1] = ((currentAddress & 0x00ff));
                    Data.copy(dataBuf,2, numPageWrites * self.options.EepromWritePageSize, (numPageWrites * self.options.EepromWritePageSize) + remainder);
                    let bytesWriten = i2cbus.i2cWriteSync(self.options.I2CAddress, dataBuf.length, dataBuf);
                    //debug('info', 'Wrote eeprom last page write', currentAddress,  numPageWrites + 1,  bytesWriten - 2);
                    let readyForNextWrite = false;
                    let readyForNextWriteTimeout = 0;
                    while(readyForNextWrite === false){
                        try{
                            let bytesWriten = i2cbus.i2cWriteSync(self.options.I2CAddress, 2, dataBuf);
                            readyForNextWriteTimeout++;
                            if (bytesWriten === 2){
                                //debug('info', 'Ready for Next Write'); 
                                readyForNextWrite = true;
                                break;   
                            }else if(readyForNextWriteTimeout > 15){
                                debug('info', 'We reached max loop waiting on eeprom to say it was ready'); 
                                readyForNextWrite = true;
                                break;
                            }else{
                                debug('info', 'Not enough Bytes Writen Ready for Next Write'); 
                                readyForNextWrite = true;
                                break;
                            }
                        }catch(ex){
                            //debug('info', 'Not ready for Next Write yet');
                        }
                    }
                }
                i2cbus.closeSync();
                self.busy = false;
                return;
            } else {
                self.busy = false;
                debug("no i2c bus on win32");
                throw new error("no i2c bus on win32");
            }
        }catch(ex){
            self.busy = false;
            if(i2cbus){
                i2cbus.closeSync();
            }
            debug('error', 'Error Writing eeprom', ex);
            throw ex;
        }
    }

    function WriteData(Address, Length, Data) {
        let deferred = Deferred();
        try{
            WriteDataSync(Address, Length, Data)
            deferred.resolve();
        }catch(ex){
            deferred.reject('error', ex);
        }
        return deferred.promise;
    }

    self.readData = ReadData;
    self.readDataSync = ReadDataSync;
    self.writeData = WriteData;
    self.writeDataSync = WriteDataSync;

}


module.exports = eeprom;