
var extend = require('extend');
var nconf = require('nconf');
require('nconf-strip-json-comments')(nconf);
var debug = require('debug')('app');
var boneScript;
var AdafruitLedBackpack;
try {
    var defaultOptions = {
        //loaded from the config file
        host: "http://127.0.0.1:12336"
    };
    nconf.file('./configs/radarMonitorClientConfig.json');
    var configFileSettings = nconf.get();
    var objOptions = extend({}, defaultOptions, configFileSettings);

    //boneScript = require('bonescript');
    //process.env['AUTO_LOAD_CAPE'] = '0';  //disable autoload of capes since on BBG there is a bug
    if (process.platform != 'win32') {
        boneScript = require('bonescript');
        boneScript.getPlatform(function (err, x) {
            console.log('bonescript getPlatform');
            console.log('version = ' + x.version);
            console.log('serialNumber = ' + x.serialNumber);
            console.log('dogtag = ' + x.dogtag);
        });
        AdafruitLedBackpack = require('./AdafruitLedBackpack.js');
        adafruitLedBackpack = new AdafruitLedBackpack();
        debug('attempting adafruitLedBackpack init');
        adafruitLedBackpack.Initialize({ I2CAddress: '0x72', I2CDevice: '/dev/i2c-2' }, function (err) {
            //adafruitLedBackpack.writeNumber(1234, true, function (err) {
            //    debug('i2c adafruitLedBackpack2 writeNumber ', err);
            //})
            debug('i2c adafruitLedBackpack Inited ', err);
        });
    }
    var socket = require('socket.io-client')(objOptions.host);
    socket.on('connect', function () {
        console.log('Socket Connected');
    });
    socket.on('radarSpeed', function (data) {
        console.log('Socket radarSpeed Event', data);
    });
    socket.on('batteryVoltage', function (data) {
        console.log('Socket batteryVoltage Event', data);
    });
    socket.on('radarConfig', function (data) {
        console.log('Socket radarConfig Event', data);
    });
    socket.on('radarCommand', function (data) {
        console.log('Socket radarCommand Event', data);
    });
    socket.on('disconnect', function () {
        console.log('Socket Disconnected');
    });
} catch (e) {
    console.log(e);
}