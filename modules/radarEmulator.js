var util = require('util');
var extend = require('extend');
var EventEmitter = require('events').EventEmitter;
var math = require('mathjs');
var debug = require('debug')('radar');
var nconf = require('nconf');
  
var fakeRadarPacketParser = function (options) {

        var self = this;
        var defaultOptions = {
            uart:'',
            bufferSize:1024
        }
        // Delimiter buffer saved in closure
        var radarDataBuffer = new Buffer(bufferSize);
        radarDataBuffer.fill(0);  //init buffer to Zeros
        var radarDataBufferLength = 0;

        return function (emitter, buffer) {
          // Collect data
          if (buffer != undefined && buffer.length > 0){

            var packets = [];

            if ((radarDataBufferLength + buffer.length) > bufferSize) {
                //We Are going to blow are max buffer size as something has gone wrong so discard saved buffer and start over
                console.log('We are over our radarDataBufferSize discarding partial packet buffer');
                radarDataBufferLength = 0;
                return;
            }else{
                //Take what ever was pending in our buffer and append the incomming data so we can use it for processing
                buffer.copy(radarDataBuffer,radarDataBufferLength, 0, buffer.length);
                radarDataBufferLength = radarDataBufferLength + buffer.length;
            }
        
              //data should have the any pending and current data in it lets process what ever full packets we have and if any left over bytes
              // we will copy to start of radarDataBuffer and set the radarDataBufferLength
              var needmoredata = false;
              var i = 0;
              for (i = 0; i < radarDataBufferLength; i++){

              //The radar unit doesn't have a consistant output data format while using the streaming format as it doesn't have a checksum at the end
              // all it has is Termination Char which can be changed via a setting we are expecting default sitting of Carrage Return 0x0D (13)
              // Polling mode has Checksum but no Peak and Hit speed. So BE streaming mode which is what we need to use as for the application
              // we need peak and hit speed 
              // So the only thing we can do is look for our two Start ID's 0x88 (136) streaming data and 0xEF (239) Configuration Data     
           
                  switch(radarDataBuffer.readUInt8(i)){
                        case 136: // 0x88 BE Speed Stream Packet
                                if (radarDataBufferLength > i + 6){
                                    var speedPacketLength = 0;
                                     switch(radarDataBuffer.readUInt8(i + 6)){   
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
                                            console.log("Invalid Byte detected in Speed Stream Packet " + radarDataBuffer.readUInt8(i) + " at position " + (i + 6));
                                            break;
                                     }
                                     if (speedPacketLength > 0){
                                        if (radarDataBufferLength >= i + speedPacketLength){
                                            var speedPacket = new Buffer(speedPacketLength);
                                            radarDataBuffer.copy(speedPacket,0,i, i + speedPacketLength);
                                            i = i + speedPacketLength - 1;
                                            packets.push(speedPacket);
                                        }else{
                                            needmoredata = true;
                                        }
                                    }else{
                                        needmoredata = true;
                                    }
                                }else{
                                    needmoredata = true;
                                }
                            break;
                       case 239: // 0xEF  Configuration Data
                            var configPacketLength = 0;
                            // Config Packets have Packet length as 2 byte Word LSB first at index 4
                            if (radarDataBufferLength > i + 6){
                                configPacketLength = radarDataBuffer.readUInt16LE(i + 4) + 8; //9 = 6 header + 2 checksum 
                                //Proboly should check for a max packet length here in case we get a bad length 

                                if (configPacketLength > 128){
                                    console.log('Invalid Config Data Packet Length ' + configPacketLength);
                                    break;
                                }

                                if (radarDataBufferLength >= i + configPacketLength){  
                                    var configPacket = new Buffer(configPacketLength);
                                    radarDataBuffer.copy(configPacket,0,i, i + configPacketLength);
                                    i = i + configPacketLength - 1;
                                    //Todo Check Checksum to make sure its a valid packet
                                    packets.push(configPacket);
                                }else{
                                    needmoredata = true;
                                }
                            }else{
                                needmoredata = true;
                            }
                            break;
                        default:
                            console.log("Invalid Byte detected " + radarDataBuffer.readUInt8(i) + " at position " + i);
                            break;
                  }
                  if (needmoredata == true){
                      break;
                  }
            }  //end of for loop
            packets.forEach(function (part, i, array) {
                emitter.emit('data', part);
            });
            if (needmoredata == true){
                //i should be where we left off with partial packet so we need to copy from i to length to start of radarDataBuffer
                if (i != 0) {
                    //No need to do any copying here as we are already starting at the begining  
                    radarDataBuffer.copy(radarDataBuffer,0, i, radarDataBufferLength);
                    radarDataBufferLength = radarDataBufferLength - i
                }
            }else{
                radarDataBufferLength = 0
            }
        } //end of If (data != undefined)


      
      
        };
      }

   var SerialPortFakeRadar = require("serialport").SerialPort;
   var radarSerialPortFakeRadar = new SerialPortFakeRadar(portname, {
      baudrate: 38400 ,  parser: fakeRadarPacketParser(1024)
    }, false);
   

    radarSerialPortFakeRadar.open(function (err) {
        if (err != undefined){
            console.log("error opening FakeRadar Port " + portname + " " + err);
        }else{
            recursiveTimerStartFakeRadar();
        }
   });

   var recursiveTimerStartFakeRadar = function () {
        console.log("Fake Radar Timer Execute!");
        
        radarSerialPortFakeRadar.write(new Buffer("885244202020333441205353532052525220525220523541205151512020512051205120203641202050205020502050205020200d","hex"), function(err) {
            if (err != undefined){
                console.log('Error writing Fake Radar');
            }
        });

        setTimeout(function(){
            radarSerialPortFakeRadar.write(new Buffer("885244202020333441205353522052525220525220523541205151512020512051205120203641202050205020502050205020200d","hex"), function(err) {
                if (err != undefined){
                    console.log('Error writing Fake Radar');
                }
            });

            setTimeout(function(){
                radarSerialPortFakeRadar.write(new Buffer("885244202020333441205353512052525220525220523541205151512020512051205120203641202050205020502050205020200d","hex"), function(err) {
                    if (err != undefined){
                        console.log('Error writing Fake Radar');
                    }
                });
                
                 setTimeout(function(){
                    radarSerialPortFakeRadar.write(new Buffer("885244202020333441205353502052525220525220523541205151512020512051205120203641202050205020502050205020200d","hex"), function(err) {
                        if (err != undefined){
                            console.log('Error writing Fake Radar');
                        }
                    });
                    setTimeout(function(){
                        radarSerialPortFakeRadar.write(new Buffer("885244202020333441202020202020202020202020203541202020202020202020202020203641202020202020202020202020200d","hex"), function(err) {
                            if (err != undefined){
                                console.log('Error writing Fake Radar');
                            }
                        });
                    },500);
                },500);

            },500);
        },500);

        
        setTimeout(recursiveTimerStartFakeRadar,60000);
    }
};