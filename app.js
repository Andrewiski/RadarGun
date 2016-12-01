
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
require('nconf-strip-json-comments')(nconf);
var debug = require('debug')('app');
var RadarStalker2 = require("./modules/radarStalker2.js");
var BatteryMonitor = require("./modules/batteryMonitor.js");
var GpsMonitor = require("./modules/gpsMonitor.js");
nconf.file('./configs/radarGunMonitorConfig.json');
var configFileSettings = nconf.get();
var defaultOptions = {
    //loaded from the config file
};
var objOptions = extend({}, defaultOptions, configFileSettings);
var app = express();
// all environments

app.set('port', objOptions.webserverPort);

//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');

//app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/javascript/angular', express.static(path.join(__dirname, 'node_modules', 'angular')));
app.use('/javascript/angular-route', express.static(path.join(__dirname, 'node_modules', 'angular-route')));
app.use('/javascript/angular-animate', express.static(path.join(__dirname, 'node_modules', 'angular-animate')));
app.use('/javascript/angular-ui-bootstrap', express.static(path.join(__dirname, 'node_modules', 'angular-ui-bootstrap', 'dist')));
app.use('/javascript/angular-ui-router', express.static(path.join(__dirname, 'node_modules', 'angular-ui-router', 'release')));
app.use('/javascript/angular-ui-switch', express.static(path.join(__dirname, 'node_modules', 'angular-ui-switch')));
app.use('/javascript/angular-ui-utils', express.static(path.join(__dirname, 'node_modules', 'angular-ui-utils', 'modules')));
app.use('/javascript/angular-sanitize', express.static(path.join(__dirname, 'node_modules', 'angular-sanitize')));
app.use('/javascript/angular-ui-event', express.static(path.join(__dirname, 'node_modules', 'angular-ui-event', 'dist')));
app.use('/javascript/angular-ui-date', express.static(path.join(__dirname, 'node_modules', 'angular-ui-date', 'dist')));
app.use('/javascript/angular-ui-select', express.static(path.join(__dirname, 'node_modules', 'angular-ui-select')));
app.use('/javascript/socket.io', express.static(path.join(__dirname, 'node_modules', 'socket.io', 'node_modules','socket.io-client')));

app.use('/javascript/fontawesome', express.static(path.join(__dirname, 'node_modules', 'font-awesome')));
app.use('/javascript/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
app.use('/javascript/jquery', express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist')));
// development only
if (process.platform === 'win32') {
    //app.use(express.favicon());
   // app.use(express.logger('dev'));
    //app.use(express.json());
    //app.use(express.urlencoded());
    //app.use(express.methodOverride());
    //app.use(app.router);
    //app.use(express.errorHandler());
}
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/teams', team.list);

var server = http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
    debug('Express server listening on port ' + app.get('port'));
}); 

var radarStalker2 = new RadarStalker2({});
var batteryMonitor = new BatteryMonitor({});
var gpsMonitor = new GpsMonitor({});
var io = require('socket.io')(server);
io.on('connection', function(socket){
    debug('socket.io client Connection');
    socket.on('radarCommand',function(data){
        debug('radarCommand:' + data.cmd + ', value:' + data.data + ', client id:' +  socket.id );
        radarStalker2.radarConfigCommand({ data: data, socket: socket });
    });
    io.emit('radarConfig', radarStalker2.getRadarConfig());
    io.emit('batteryVoltage', batteryMonitor.getBatteryVoltage());
});

radarStalker2.on('radarSpeed', function(data){
    io.emit('radarSpeed',data);
});
radarStalker2.on('radarCommand',function(data){
    io.emit('radarCommand', data);
});

radarStalker2.on('radarConfigProperty', function (data) {
    io.emit('radarConfigProperty', data);
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
    

   

