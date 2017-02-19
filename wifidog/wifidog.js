var spawn = require('child_process').spawn; 
var logger = require(__dirname + '/logger');
var wifidog_process = null;
exports.on = function(name){
    if(name == 'on'){
        wifidog_process = spawn('wdctl',['restart']);  
    }
    wifidog_process.stdout.on('data', function(data) {
        //console.log('stdout: ${data}');
    });
    wifidog_process.stderr.on('data', function(data){
        //console.log('stderr: ${data}');
    });
    wifidog_process.on('close', function(code){
        //console.log('child process exited with code ${code}');
    }); 
    if(name == 'off'){
        wifidog_process = spawn('wdctl',['stop']); 
    }
};