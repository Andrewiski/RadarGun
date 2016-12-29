var AdafruitLedBackpack;
var adafruitLedBackpack; 
var adafruitLedBackpack2;   
var adafruitLedBackpack3;   
var debug = require('debug')('test');
//var bonescript;
try {
    //boneScript = require('bonescript');
    //boneScript.getPlatform(function (x) {
    //    console.log('bonescript getPlatform');
    //    console.log('name = ' + x.name);
    //    console.log('bonescript = ' + x.bonescript);
    //    console.log('serialNumber = ' + x.serialNumber);
    //    console.log('dogtag = ' + x.dogtag);
    //    console.log('os = ', x.os);
    //});
    AdafruitLedBackpack = require('./../modules/AdafruitLedBackpack.js');
    adafruitLedBackpack = new AdafruitLedBackpack();
    debug('attempting adafruitLedBackpack init');
    adafruitLedBackpack.Initialize({ I2CAddress: 0x70, I2CDevice: '/dev/i2c-2' }, function (err) {
        adafruitLedBackpack.writeNumber(1234, true, function (err) {
            debug('i2c adafruitLedBackpack2 writeNumber ', err);
        })
        debug('i2c adafruitLedBackpack Inited ', err);
    });
    
    adafruitLedBackpack2 = new AdafruitLedBackpack();
    debug('attempting adafruitLedBackpack2 init');
    adafruitLedBackpack2.Initialize({ I2CAddress: 0x71, I2CDevice: '/dev/i2c-2' }, function (err) {
        debug('i2c adafruitLedBackpack2 Inited ', err);
        adafruitLedBackpack2.writeNumber(70.32, false, function (err) {
            debug('i2c adafruitLedBackpack2 writeNumber ', err);
        })
    });
    adafruitLedBackpack3 = new AdafruitLedBackpack();
    debug('attempting adafruitLedBackpack3 init');
    adafruitLedBackpack3.Initialize({ I2CAddress: 0x72, I2CDevice: '/dev/i2c-2' }, function (err) {
        debug('i2c adafruitLedBackpack3 Inited ', err);
        adafruitLedBackpack3.writeNumber('beef', false, function (err) {
            debug('i2c adafruitLedBackpack3 writeNumber ', err);
        })
    });
    adafruitLedBackpack4 = new AdafruitLedBackpack();
    debug('attempting adafruitLedBackpack3 init');
    adafruitLedBackpack4.Initialize({ I2CAddress: 0x77, I2CDevice: '/dev/i2c-2' }, function (err) {
        debug('i2c adafruitLedBackpack4 Inited ', err);
        adafruitLedBackpack4.writeNumber(43.54, false, function (err) {
            debug('i2c adafruitLedBackpack4 writeNumber ', err);
        })
    });
} catch (e) {
    console.log(e);
}
   

