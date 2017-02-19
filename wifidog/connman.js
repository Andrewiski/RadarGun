var connman = require('connman-simplified')();
var logger = require(__dirname + '/logger');
var EventEmitter = require('events').EventEmitter; 
var wifi_obj;
var ssid;
var password;
var event = new EventEmitter(); 

exports.on = function(opt,callback){
    if(opt == 'init'){
        connman.init(function(err) {
            connman.initWiFi(function(err,wifi,properties) {
                wifi_obj = wifi; 
                callback();
            });
        });
    }
    if(opt == 'sta'){
        ssid = arguments[1];
        password = arguments[2];
        callback = arguments[3];
        wifi_obj.join(ssid,password,function(err){
            callback(err);
        });
    } 
    if(opt == 'scan'){
        wifi_obj.getNetworks(function(err,list) {
              // get more readable list using getServicesString:
              //console.log(list);
              callback(list);
              //console.log("networks: ",wifi.getServicesString(list));
            });           
    }
}