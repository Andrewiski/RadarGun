
var boneScript;
  
try {
    boneScript = require('bonescript');
    boneScript.getPlatform(function (x) {
        console.log('bonescript getPlatform');
        console.log('name = ' + x.name);
        console.log('bonescript = ' + x.bonescript);
        console.log('serialNumber = ' + x.serialNumber);
        console.log('dogtag = ' + x.dogtag);
        console.log('os = ', x.os);
    });
} catch (e) {
    console.log(e);
}
   

