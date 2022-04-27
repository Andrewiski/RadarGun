
const appLogName = "platformDetect"
const fs = require('fs');
const util = require('util');
var extend = require('extend');

var PlatformDetect = function (options, logUtilHelper) {

  self = this;
  var commonData = {
    platform:null,
    model:null
  }

  var PI_MODEL_NO = [
    // https://www.raspberrypi.org/documentation/hardware/raspberrypi/
    'BCM2708',
    'BCM2709',
    'BCM2710',
    'BCM2835', // Raspberry Pi 1 and Zero
    'BCM2836', // Raspberry Pi 2
    'BCM2837', // Raspberry Pi 3 (and later Raspberry Pi 2)
    'BCM2837B0', // Raspberry Pi 3B+ and 3A+
    'BCM2711' // Raspberry Pi 4B
  ];

  var checkIsPi = function  (model) {
    return PI_MODEL_NO.indexOf(model) > -1;
  }

  var isPi = function (){
    return commonData.platform === "raspberryPi";
  }

  var readPiPlatform = function () {
    try{
      var cpuInfo;
      try {
        
        cpuInfo = fs.readFileSync('/proc/cpuinfo', { encoding: 'utf8' });
        logUtilHelper.log(appLogName,"app", "debug", "readPiPlatform", "/proc/cpuinfo" , cpuInfo);
      }catch (e) {
        logUtilHelper.log(appLogName,"app", "error", "readPiPlatform", ex);
        // if this fails, this is probably not a pi
        return false;
      }

      var sysInfo = cpuInfo
      .split('\n')
      .map(line => line.replace(/\t/g, ''))
      .filter(line => line.length > 0)
      .map(line => line.split(':'))
      .map(pair => pair.map(entry => entry.trim()));
      //logUtilHelper.log(appLogName,"app", "debug", "readPiPlatform", "sysInfo" , sysInfo);

      var hardware = sysInfo.filter(pair => pair[0] === 'Hardware');
      var model = sysInfo.filter(pair => pair[0] === 'Model');
      var serial = sysInfo.filter(pair => pair[0] === 'Serial');
      var revision = sysInfo.filter(pair => pair[0] === 'Revision');
      
      logUtilHelper.log(appLogName,"app", "debug", "readPiPlatform", "sysInfo" , hardware, model, serial, revision); 
      if(!hardware || hardware.length == 0) {
        return false;
      } 
      var hardwareNumber =  hardware[0][1];
      var isRaspberryPi = checkIsPi(hardwareNumber);
      if(isRaspberryPi){
        commonData.model = model[0][1];
        commonData.hardware = hardware[0][1];
        commonData.serial = serial[0][1];
        commonData.revision = revision[0][1];
        commonData.platform = "raspberryPi";
      }
      return true;
    }catch(ex){
      logUtilHelper.log(appLogName,"app", "error", "readPiPlatform", ex);
    }
  }

  function readPlatform () {
    try{
      if(process.platform === 'win32'){
        logUtilHelper.log(appLogName,"app", "info", "readPlatform", "Is Win32");
        commonData.model = "windows";
        commonData.platform = process.platform;
      }else if(readPiPlatform()){
        logUtilHelper.log(appLogName,"app", "info", "readPlatform", "Is RaspberryPi");
      }else{
        logUtilHelper.log(appLogName,"app", "info", "readPlatform", "Is Unknown");
      }
    }catch(ex){
      logUtilHelper.log(appLogName,"app", "error", "readPlatform", ex);
    }
  }

  function getPlatform(){
    return commonData.platform;
  }

  
  function getModel(){
    return commonData.model;
  }

  function getInfo() {
    return comandData
  }

  readPlatform();

  self.isPi = isPi;
  
  self.data = commonData;
}

module.exports = PlatformDetect;