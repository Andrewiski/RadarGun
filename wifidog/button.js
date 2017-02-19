var m = require('mraa'); //require mraa

var myDigitalPin = new m.Gpio(43); //setup digital read on pin 6
myDigitalPin.dir(m.DIR_IN); //set the gpio direction to input
var startReadPin;

exports.on = function(opt,callback){
    function periodicActivity() //
    {
      var myDigitalValue =  myDigitalPin.read(); //read the digital value of the pin
      //console.log('Gpio is ' + myDigitalValue); //write the read value out to the console
       if(myDigitalValue == 0){
               callback();
       }
    }
    if(opt == 'on')
     startReadPin = setInterval(periodicActivity,100);
    if(opt == 'off'){
        clearInterval(startReadPin);  
        startReadPin = null;         
    }      
}