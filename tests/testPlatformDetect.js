'use strict';
const PlatformDetect = require("../modules/platformDetect");
const LogUtilHelper = require("@andrewiski/logutilhelper");

var objOptions = {
    "appLogLevels":{
        "platformDetect" :{
            "app":"info"
        }
    },
    logDirectory: "log",

}


let logUtilHelper = new LogUtilHelper({
    appLogLevels: objOptions.appLogLevels,
    logEventHandler: null,
    logUnfilteredEventHandler: null,
    logFolder: "log",
    logName: "testPlatformDetect",
    debugUtilEnabled: true,
    debugUtilName:"testPlatformDetect",
    debugUtilUseUtilName: false,
    debugUtilUseAppName: true,
    debugUtilUseAppSubName: false,
    includeErrorStackTrace: true,
    logToFile: false,
    logToFileLogLevel: "trace",
    logToMemoryObject: false,
    logToMemoryObjectMaxLogLength: 10,
    logSocketConnectionName: "socketIo",
    logRequestsName: "access"

})

var platformDetect = new PlatformDetect({}, logUtilHelper)

console.log(platformDetect.isPi());
console.log("platformDetect.data", platformDetect.data)