
var extend = require('extend');
var nconf = require('nconf');
var debug = require('debug')('radarMonitorClient');

try {
    var defaultOptions = {
        //loaded from the config file
        host: "http://127.0.0.1:12336"
    };
    nconf.file('./configs/radarMonitorClientConfig.json');
    var configFileSettings = nconf.get();
    var objOptions = extend({}, defaultOptions, configFileSettings);

    
    if (process.platform != 'win32') {
       
        
        
            
            
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