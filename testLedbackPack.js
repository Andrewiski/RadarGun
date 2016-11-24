
var boneScript;
var AdafruitLedBackpack;
var adafruitLedBackpack; 
var adafruitLedBackpack2;   
var adafruitLedBackpack3;   
var debug = require('debug')('test');
try {
    //boneScript = require('bonescript');
    //process.env['AUTO_LOAD_CAPE'] = '0';  //disable autoload of capes since on BBG there is a bug
    boneScript = require('bonescript');
    boneScript.getPlatform(function (err, x) {
        console.log('bonescript getPlatform');
        console.log('version = ' + x.version);
        console.log('serialNumber = ' + x.serialNumber);
        console.log('dogtag = ' + x.dogtag);
    });
        
    //boneScript.getPlatform(function (err, x) {
    //    console.log('bonescript getPlatform');
    //    console.log('version = ' + x.version);
    //    console.log('serialNumber = ' + x.serialNumber);
    //    console.log('dogtag = ' + x.dogtag);
    //    AdafruitLedBackpack = require('./AdafruitLedBackpack.js');
    //    adafruitLedBackpack = new AdafruitLedBackpack(boneScript);
    //    debug('attempting adafruitLedBackpack init');
    //    adafruitLedBackpack.Initialize({ I2CAddress: '0x72' }, function (err) {
    //        debug('i2c adafruitLedBackpack Inited ', err);
    //    });
    //    adafruitLedBackpack2 = new AdafruitLedBackpack(boneScript);
    //    debug('attempting adafruitLedBackpack init');
    //    adafruitLedBackpack2.Initialize({ I2CAddress:'0x70'}, function (err) {
    //        debug('i2c adafruitLedBackpack Inited ', err);
    //    });
    //    adafruitLedBackpack3 = new AdafruitLedBackpack(boneScript);
    //    debug('attempting adafruitLedBackpack init');
    //    adafruitLedBackpack3.Initialize({ I2CAddress: '0x72'}, function (err) {
    //        debug('i2c adafruitLedBackpack Inited ', err);
    //    });
        
    //});
    AdafruitLedBackpack = require('./AdafruitLedBackpack.js');
    adafruitLedBackpack = new AdafruitLedBackpack();
    debug('attempting adafruitLedBackpack init');
    adafruitLedBackpack.Initialize({ I2CAddress: '0x72', I2CDevice: '/dev/i2c-2' }, function (err) {
        //adafruitLedBackpack.writeNumber(1234, true, function (err) {
        //    debug('i2c adafruitLedBackpack2 writeNumber ', err);
        //})
        debug('i2c adafruitLedBackpack Inited ', err);
    });
    
    adafruitLedBackpack2 = new AdafruitLedBackpack();
    debug('attempting adafruitLedBackpack2 init');
    adafruitLedBackpack2.Initialize({ I2CAddress: '0x70', I2CDevice: '/dev/i2c-2' }, function (err) {
        debug('i2c adafruitLedBackpack2 Inited ', err);
        //adafruitLedBackpack2.writeNumber(70.32, false, function (err) {
        //    debug('i2c adafruitLedBackpack2 writeNumber ', err);
        //})
    });
    adafruitLedBackpack3 = new AdafruitLedBackpack();
    debug('attempting adafruitLedBackpack3 init');
    adafruitLedBackpack3.Initialize({ I2CAddress: '0x71', I2CDevice: '/dev/i2c-2' }, function (err) {
        debug('i2c adafruitLedBackpack3 Inited ', err);
        //adafruitLedBackpack3.writeNumber('beef', false, function (err) {
        //    debug('i2c adafruitLedBackpack3 writeNumber ', err);
        //})
    });
} catch (e) {
    console.log(e);
}
   

