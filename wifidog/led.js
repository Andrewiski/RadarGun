var fs = require('fs');
var error_led_timer = null;
var start_led_timer = null;
var config_led_timer =null;
var flag = 0;
var counter = 0;
var led1_trigger = '/sys/class/leds/beaglebone\:green\:usr0/trigger';
var led2_trigger = '/sys/class/leds/beaglebone\:green\:usr1/trigger';
var led3_trigger = '/sys/class/leds/beaglebone\:green\:usr2/trigger';
var led4_trigger = '/sys/class/leds/beaglebone\:green\:usr3/trigger';

var led1_brightness = '/sys/class/leds/beaglebone\:green\:usr0/brightness';
var led2_brightness = '/sys/class/leds/beaglebone\:green\:usr1/brightness';
var led3_brightness = '/sys/class/leds/beaglebone\:green\:usr2/brightness';
var led4_brightness = '/sys/class/leds/beaglebone\:green\:usr3/brightness';
function error_led_state(){
    flag = ~flag;
    var value;
    if(flag == 0) value = 0;else value = 1;
    fs.writeFile(led1_brightness,value.toString(),function(err){});
    fs.writeFile(led2_brightness,value.toString(),function(err){});
    fs.writeFile(led3_brightness,value.toString(),function(err){});
    fs.writeFile(led4_brightness,value.toString(),function(err){});
}
function start_led_state(){
    flag = ~flag;
    var value;
    if(flag == 0) value = 0;else value = 1;
    fs.writeFile(led1_brightness,value.toString(),function(err){});
    fs.writeFile(led3_brightness,value.toString(),function(err){});

    if(flag == 0) value = 1;else value = 0;
    fs.writeFile(led2_brightness,value.toString(),function(err){});
    fs.writeFile(led4_brightness,value.toString(),function(err){});    
}
function config_led_state(){
    counter++;
    var remain = counter % 4;
    var led1 = 0;
    var led2 = 0;
    var led3 = 0;
    var led4 = 0;
    if(0 == remain){
        led1 = 1;
    }
    if(1 == remain){
        led2 = 1;
    }
    if(2 == remain){
        led3 = 1;
    }
    if(3 == remain){
        led4 = 1;
    }
    fs.writeFile(led1_brightness,led1.toString(),function(err){});
    fs.writeFile(led2_brightness,led2.toString(),function(err){});
    fs.writeFile(led3_brightness,led3.toString(),function(err){});
    fs.writeFile(led4_brightness,led4.toString(),function(err){});
    
}
function clearAllInterval(){
    clearInterval(error_led_timer);
    clearInterval(start_led_timer);
    clearInterval(config_led_timer);
    error_led_timer = null;
    start_led_timer = null;
    config_led_timer = null;
}
exports.on = function(state){
    if(state == 'ok'){
        clearAllInterval();
        fs.writeFile(led1_trigger,'heartbeat',function(err){});
        fs.writeFile(led2_trigger,'none',function(err){});
        fs.writeFile(led3_trigger,'none',function(err){});
        fs.writeFile(led4_trigger,'none',function(err){});
    }
    if(state == 'error'){
        clearAllInterval();
        error_led_timer = setInterval(error_led_state,500);
    }
    if(state == 'start'){
        clearAllInterval();
        start_led_timer = setInterval(start_led_state,500);        
    }
    if(state == 'config'){
        clearAllInterval();
        config_led_timer = setInterval(config_led_state,200);        
    }
}