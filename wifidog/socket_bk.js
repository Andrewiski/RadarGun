process.env.DISPLAY = ':0';
process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/dbus/system_bus_socket';

var exec = require('child_process').exec; 
var logger = require(__dirname + '/logger');
var wifidog = require(__dirname + '/wifidog_dev');

var fs = require('fs');
var ConnMan = require('connman-api');
var connman = new ConnMan();
var path = require('fs');

module.exports = function(io) {
       
    var wlan0_info = [];
    var StartwifidogInterval = null;
    var wifidog_process;
    connman.init(function() {
        var wifi = connman.technologies['WiFi'];
        var ScanWifiInterval = null;
        function StartWifidog(){
            console.log("StartWifidog");
           connman.getAllTechnologyInfo(function(err, technologies){
               if(technologies.WiFi.Tethering == false)
                   wifi.enableTethering('HotspotSSID', 'password123', function(err) {
                       console.log(err);
                   });
               
           });
           path.exists('/sys/class/net/tether',function(exists) {
               if(exists == true)
               {
                   wifidog.on('on');
                   // wifidog_process = exec('wifidog -f -d 7',function(error, stdout, stderr){
                       //console.log(stdout)
                       // clearInterval(StartwifidogInterval);
                   // });
               }
           });
        }
        function ListWifiAccessPoints(){
            //connmanctl scan wifi
            wifi.scan(function(err){
                if (err) {
                     console.log(err);
                }
                //connmanctl services
                wifi.getServices(function(err, services) { 
                    wlan0_info = services;
                    //console.log(wlan0_info);
                    for(var a_ssid in wlan0_info){
                       if(wlan0_info[a_ssid].Name != null){
                           //clear scan wifi interval
                           clearInterval(ScanWifiInterval);  
                            ScanWifiInterval = null;
                            //send wifi access points list to font page
                            io.emit('wlan0_info', wlan0_info);
                            //try to start wifidog
                            StartwifidogInterval  = setInterval(StartWifidog,1000,'Try to start wifidog');
                            console.log("ListWifiAccessPoints finished!....");
                            break;
                       }else
                            console.log('Sorry, We get nothing, try again.')
                    }
                });        
            });
        }
        wifi.disableTethering(function(err, res) {
           ScanWifiInterval =  setInterval(ListWifiAccessPoints,5000,'Get Wifi access points list');    
        });
        
    });
        //io.emit('wlan0_info', JSON.stringify(wlan0_info));
        //console.log(JSON.stringify(wlan0_info));
        
    io.on('connection', function(socket) {
        console.log("connect!.............");
        //io.emit('hello', "haha");
        io.emit('wlan0_info', wlan0_info);
         //console.log(wlan0_info);
    }); 
    
};
