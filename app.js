
/**
 * Module dependencies.
 */

var express = require('express');
var extend = require('extend');
var routes = require('./routes');
var user = require('./routes/user');
var team = require('./routes/team');
var http = require('http');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var nconf = require('nconf');

var debug = require('debug')('app');
var RadarStalker2 = require("./modules/radarStalker2.js");
var BatteryMonitor = require("./modules/batteryMonitor.js");
var GpsMonitor = require("./modules/gpsMonitor.js");
var DataDisplay = require("./modules/dataDisplay.js");
nconf.file('./configs/radarGunMonitorConfig.json');
var configFileSettings = nconf.get();
var defaultOptions = {
    //loaded from the config file
};
//var bonescript;
var objOptions = extend({}, defaultOptions, configFileSettings);
var app = express();
// all environments



//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
  
//app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/javascript/angular', express.static(path.join(__dirname, 'node_modules', 'angular')));
app.use('/javascript/angular-route', express.static(path.join(__dirname, 'node_modules', 'angular-route')));
app.use('/javascript/angular-animate', express.static(path.join(__dirname, 'node_modules', 'angular-animate')));
app.use('/javascript/angular-ui-bootstrap', express.static(path.join(__dirname, 'node_modules', 'angular-ui-bootstrap', 'dist')));
app.use('/javascript/angular-ui-router', express.static(path.join(__dirname, 'node_modules', '@uirouter', 'angularjs', 'release')));
app.use('/javascript/angular-ui-switch', express.static(path.join(__dirname, 'node_modules', 'angular-ui-switch')));
app.use('/javascript/angular-ui-utils', express.static(path.join(__dirname, 'node_modules', 'angular-ui-utils', 'modules')));
app.use('/javascript/angular-sanitize', express.static(path.join(__dirname, 'node_modules', 'angular-sanitize')));
app.use('/javascript/angular-ui-event', express.static(path.join(__dirname, 'node_modules', 'angular-ui-event', 'dist')));
app.use('/javascript/angular-ui-date', express.static(path.join(__dirname, 'node_modules', 'angular-ui-date', 'dist')));
app.use('/javascript/angular-ui-select', express.static(path.join(__dirname, 'node_modules', 'ui-select', 'dist')));
app.use('/javascript/socket.io', express.static(path.join(__dirname, 'node_modules', 'socket.io', 'node_modules','socket.io-client')));
app.use('/javascript/fontawesome', express.static(path.join(__dirname, 'node_modules', 'font-awesome')));
app.use('/javascript/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
app.use('/javascript/jquery', express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist')));
// development only
if (process.platform === 'win32') {
    app.set('port', objOptions.win32WebserverPort);
    //app.use(express.favicon());
   // app.use(express.logger('dev'));
    //app.use(express.json());
    //app.use(express.urlencoded());
    //app.use(express.methodOverride());
    //app.use(app.router);
    //app.use(express.errorHandler());
} else {
    app.set('port', objOptions.webserverPort);
    //boneScript = require('bonescript');
    //boneScript.getPlatform(function (x) {
    //    console.log('bonescript getPlatform');
    //    console.log('name = ' + x.name);
    //    console.log('bonescript = ' + x.bonescript);
    //    console.log('serialNumber = ' + x.serialNumber);
    //    console.log('dogtag = ' + x.dogtag);
    //    console.log('os = ', x.os);
    //});
}
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/', routes);
//app.get('/', routes.index);
//app.get('/scoreboard', routes.index);
//app.get('/users', user.list);
//app.get('/teams', team.list);

var server = http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
    debug('Express server listening on port ' + app.get('port'));
}); 

var radarStalker2 = new RadarStalker2({});
var batteryMonitor = new BatteryMonitor({});
var gpsMonitor = new GpsMonitor({});
var dataDisplay = new DataDisplay({});
var io = require('socket.io')(server);
io.on('connection', function(socket) {
    debug('socket.io client Connection');
    socket.on('radarConfigCommand', function(data) {
        debug('radarConfigCommand:' + data.cmd + ', value:' + data.data + ', client id:' + socket.id);
        radarStalker2.radarConfigCommand({ data: data, socket: socket });
    });
    socket.on('radarEmulatorCommand', function(data) {
        debug('radarEmulatorCommand:' + data.cmd + ', value:' + data.data + ', client id:' + socket.id);
        radarStalker2.radarEmulatorCommand({ data: data, socket: socket });
    });
    socket.on('ping', function(data) {
        debug('ping: client id:' + socket.id);
    });
    if (socket.client.request.headers["origin"] != "ArduinoSocketIo") {
        //send the current Config to the new client Connections
        io.emit('radarConfig', radarStalker2.getRadarConfig());
        io.emit('softwareConfig', radarStalker2.getSoftwareConfig());
        io.emit('radarSpeedDataHistory', radarStalker2.getradarSpeedDataHistory());
    }
    //send the current Battery Voltage
    io.emit('batteryVoltage', batteryMonitor.getBatteryVoltage());
    console.log("gpsState", gpsMonitor.getGpsState())
});

radarStalker2.on('radarSpeed', function(data){
    dataDisplay.updateSpeedData(data);
    io.emit('radarSpeed', data);
    
});
radarStalker2.on('radarTimeout', function (data) {
    io.emit('radarTimeout', data);
});
radarStalker2.on('radarCommand',function(data){
    io.emit('radarCommand', data);
});

radarStalker2.on('softwareCommand', function (data) {
    io.emit('softwareCommand', data);
});

radarStalker2.on('radarConfigProperty', function (data) {
    io.emit('radarConfigProperty', data);
});
radarStalker2.on('softwareConfigProperty', function (data) {
    io.emit('softwareConfigProperty', data);
});

batteryMonitor.on("batteryVoltage",function(data){
    io.emit("batteryVoltage", data)
})


//io.route('radarSpeed', function(req) {
//    debug('radarSpeed Connection');
//    req.io.emit('connected', {
//        message: 'Connected to Server'
//    })
//})

// command is the Comm
    

   

