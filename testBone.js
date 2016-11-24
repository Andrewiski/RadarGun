
var boneScript;
   
try {
     boneScript = require('bonescript');
    //boneScript = require('octalbonescript');
    boneScript.getPlatform(function (err, x) {
        console.log('bonescript getPlatform');
        console.log('version = ' + x.version);
        console.log('serialNumber = ' + x.serialNumber);
        console.log('dogtag = ' + x.dogtag);
    });
} catch (e) {
    console.log(e);
}
   

