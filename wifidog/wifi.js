process.env.DISPLAY = ':0';
process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/dbus/system_bus_socket';

var logger = require(__dirname + '/logger');
var wifidog = require(__dirname + '/wifidog');
var connman = require(__dirname + '/connman');
var led = require(__dirname + '/led');
//var button = require(__dirname + '/button');
var hostapd = require(__dirname + '/hostapd');
var config = require(__dirname+ "/../config");

var child_process = require('child_process');
var EventEmitter = require('events').EventEmitter; 
var fs = require('fs');
var ssid_list;
var lan_info;
var event = new EventEmitter(); 
var connman_flag = false;

module.exports = function(io) {
    event.on('startAp', function() { 
       var options = config.hostapd; 
        fs.open('/sys/devices/platform/ocp/44e0b000.i2c/i2c-0/0-0050/eeprom' , 'r' , function (err,fd){ 
            var buffer=new Buffer(28)
            fs.read(fd, buffer, 0, 28, null, function(err,bytesRead, buffer){ 
                if(err) throw err;
		if(isNaN(parseInt(buffer.toString().substr(-6,6))) == true ){
			var m = Math.random()*1000000;
			options.ssid = "BeagleBone"+Math.round(m).toString();
		}else
            options.ssid = "BeagleBone"+buffer.toString().substr(22);
            var apFlag = false;
            var file = options.interface + '-hostapd.conf';
            var last = child_process.exec('pgrep -f "hostapd -B ' + file + '"',function(err) {
                logger.info(err); 
            });
            
            last.stdout.on('data', function (data) {
                 logger.info("last pid:"+last.pid); 
                 logger.info("pid:"+data); 
                if(data != last.pid){
                     logger.info("hostapd is running");
                    apFlag = true; 
                }
                if(apFlag == false && data == last.pid){
                     logger.info("hostapd start");
                    hostapd.enable(options,function(err){
                    });
                }
            });
            });
        });
    });
    event.on('startWifiDog', function() { 
         logger.info("startWifiDog"); 
        wifidog.on('on');
    });
    event.on('scanWifi', function() { 
         logger.info("scanWifi ...");
        connman.on('scan',function(services){
             logger.info("scan ...");
             ssid_list = services;
            io.emit('ssidList', services);
            for(var serviceName in services) {
                if(services[serviceName].ip4Address != null)
                {
                    //console.log(services[serviceName]);
                    lan_info = services[serviceName];
                    io.emit('lan_info', services[serviceName]);
                    break;
                }
            }
        });  
    });
    /*
    event.on('lanStatus', function() { 
         logger.info("lanStatus ...");
        connman.on('status',function(err,IPv4){
            if(IPv4 != null){
                lan_info = IPv4;
                io.emit('lan_info', lan_info);
            }
        });
    });
    */
    event.on('initConnMan', function() { 
        logger.info("ConnMan init ....");
        connman.on('init',function(){
            event.emit('scanWifi');    
        });  
    });    
    // if(config.button.isUsed == 1){
        // button.on('on',function(){
            // var last = child_process.exec('pgrep -f hostapd.conf',function(err) {
            // logger.info(err); 
            // });
            // last.stdout.on('data', function (data) {
                //  logger.info(data); 
                // if(data == null){
                    //event.emit('startAp'); 
                // }
            // });
        // });
    // }
    function initWork(){
        event.emit('startAp');         
    }
    led.on("start");
    event.emit('startWifiDog');
    //wait for wifidog ready
    setTimeout(initWork,1000);
    function initConnMan(){
       event.emit('initConnMan');  
    }
    setTimeout(initConnMan,2000);
    
    fs.open(config.admin.file,"a+",function(){
        fs.readFile(config.admin.file, 'utf8', function (err, data) {
            if(data != ''){
                config.admin.flag = 1;
                config.admin.password = data;
            }
            else{
                config.admin.flag = 0;
            }
        });
    });
    
    io.on('connection', function(socket) {
         logger.info("connect!.............");
         // if(connman_flag == false)
         // {
            // connman_flag = true;
            // event.emit('initConnMan'); 
         // }
        //event.emit('scanWifi');
        io.emit('ssidList', ssid_list);
        io.emit('lan_info', lan_info);
        
        socket.on("scanWifi",function(message) {
             logger.info("websocket.....");
            event.emit('scanWifi');
            //event.emit('lanStatus');
        });
        
        socket.on("getLanInfo",function(message) {
             logger.info("getLanInfo.....");
            //event.emit('lanStatus');
        });
        
        socket.on("configWifi",function(message) {
            logger.info("configWifi.....");
            logger.info(message.ssid);
            logger.info(message.password);
//            if(message.admin != null || message.admin != ''){
//                    fs.writeFile(config.admin.file, message.admin, function (err) {
//                        if (err) logger.info(err);
//                    });
//            }
            connman.on('sta',message.ssid.toString(),message.password.toString(),function(status){ 
                     logger.info(status);
                     var wifiResult;
                    if(status == null)
                    {                       
                        //event.emit('lanStatus');
                        led.on("ok"); 
                        wifiResult = "ready";
                        event.emit('scanWifi');
                    }else{
                        led.on("error");
                        wifiResult = "failure";
                    }
                    io.emit('wifiResult', wifiResult);
                });       
            //event.emit('lanStatus');
        });
        socket.on("admin",function(message) {
           logger.info("admin....."); 
            fs.readFile(config.admin.file, 'utf8', function (err, data) {
               //logger.info(data.slice(0,-1));
               //logger.info(message);
               //remove blank space
                if(data.replace(/(\s*$)/g, "") == message){
                    io.emit('adminResult', "ok");
                }
                else{
                    io.emit('adminResult', "error");
                }
            });   
        });
    }); 
};
