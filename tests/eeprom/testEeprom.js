//testEEprom.Js
//This Module will connect to the i2c eeprom and read data
var Eeprom = require('./eeprom.js');
var Hexy = require('hexy')
var debug = require('debug')('testEeprom');
var options = {
    I2CAddress: "0x50", //the i2c address of the eeprom
    I2CDevice: 1,
    EepromSizeKb: 512,  //Tested on a Microchip 24LC512
    EepromWritePageSize: 128
}
debug("starting with options", options);
var eeprom = new Eeprom(options);

let testData = Buffer.alloc(256, 0x00);
// for(var i=0; i < testData.length; i++){
//     testData[i] = 256 - i;
// }

let data = null; 

for(i=0; i< options.EepromSizeKb * 1000; i= i + testData.length){
    eeprom.writeDataSync(i, testData.length, testData);
    debug("Success Writing Test Data", i);
    data = eeprom.readDataSync(i, testData.length);
    let badData = false;
    for(k=0; k < testData.length; k++){
        if (data[k] !== testData[k]){
            debug("Bad Data", i, data[k], testData[k]);
            let badData = true;
        }
    }
    if (badData){
        debug(Hexy.hexy(data));
        break;
    }else{
        debug("Good Data Read", i);
    }
}



for(i=0; i< options.EepromSizeKb * 1000; i= i+ testData.length){
    data = eeprom.readDataSync(i, testData.length);
    let badData = false;
    for(k=0; k < testData.length; k++){
        if (data[k] !== testData[k]){
            debug("Bad Data", i, data[k], testData[k]);
            let badData = true;
        }
    }
    if (badData){
        debug(Hexy.hexy(data));
        break;
    }else{
        debug("Good Data", i);
    }
}









