'use strict';

const extend = require('extend');
const FfmpegVideoInput = require("../modules/ffmpegVideoInput.js");
//const RtspVideoCapture = require("../modules/rtspVideoInput.js");
const LogUtilHelper = require("@andrewiski/logutilhelper");
const appLogName = "testVideoCapture";
const path = require('path');
//ffmpeg -h encoder=h264_nvenc
var objOptions = {
    appLogLevels:{
        "testVideoCapture" :{
            "app":"debug"
        },
        "rtspVideoInput" :{
            "app":"debug"
        },
        "ffmpegVideoInput" :{
            "app":"debug"
        },
        "ffmpegVideoOutputRtmp" :{
            "app":"debug"
        },
        "ffmpegVideoOutputMp4File" : {
            "app":"debug"
        }
    },
    logDirectory: "logs",
    ffmpegVideoInput: {
        //input:"rtsps://10.100.1.1:7441/f724nSZ9iebgPS9e?enableSrtp",
        //input:"rtsp://10.100.32.91:554/s0",
        input:"libcamera-vid",
        
        inputOptions: {"libcamaraPath": path.join(__dirname,"libcamera"), "libcamaraPathExt" : ".cmd", "width": "1080", "height": "768", "autofocus-mode": "manual", "inline":true, "nopreview":1, timeout:100000 }, // ["-rtsp_transport tcp","-stimeout 30000000"]
        capture:true,
        outputs: {
            ffmpegVideoOutputRtmp : {
                "rtmpUrl": "rtmp://a.rtmp.youtube.com/live2/a5fv-d7rc-7jsa-v7g4-2c70",
                //"rtmpUrl2": "rtmps://601c62c19c9e.global-contribute.live-video.net:443/app/sk_us-east-1_gIgq11gfyeCV_yCYDarNv5iHdMgZJbDHnAhfjWPKvjt",
                //"rtmpUrlRtp": "rtp://127.0.0.1:3000",
                "inputOptions": [ "-y", "-vsync 0", "-hwaccel cuda"],
                "outputOptions": [ "-c:a copy", "-pix_fmt +", "-c:v h264_nvenc", "-use_wallclock_as_timestamps 1",  "-g 12", "-preset hq", "-f flv" ],
                //"outputOptions2": [ "-c:a copy", "-pix_fmt +", "-c:v h264_nvenc", "-use_wallclock_as_timestamps 1",  "-g 48", "-preset hq", "-f flv" ],
                //"outputOptionsRtp": [ "-c:a copy", "-pix_fmt +", "-c:v h264_nvenc", "-b:v 4.5M",  "-use_wallclock_as_timestamps 1", "-fflags +genpts",  "-preset llhq", "-rc vbr_hq", "-sdp_file video.sdp", "-f rtp" ],
                "overlayFileName": "overlay.txt",
                "videoFilters": {
                    "filter": "drawtext",
                    "options": "fontfile=arial.ttf:fontsize=50:box=1:boxcolor=black@0.75:boxborderw=5:fontcolor=white:x=(w-text_w)/2:y=((h-text_h)/2)+((h-text_h)/2):textfile=overlay.txt:reload=1"
                }
            },
           
            ffmpegVideoOutputMp4File :  {
                "inputOptions": [ "-y", "-vsync 0", "-hwaccel cuda",],
                "outputOptions": [ "-c:a copy", "-pix_fmt +", "-c:v h264_nvenc", "-use_wallclock_as_timestamps 1" ],
                "outputFile": "d:\\videos\\test5.flv",
                //"outputOptionsRtp": [ "-c:a copy", "-pix_fmt +", "-c:v h264_nvenc", "-b:v 4.5M",  "-use_wallclock_as_timestamps 1", "-fflags +genpts",  "-preset llhq", "-rc vbr_hq", "-sdp_file video.sdp", "-f rtp" ],
                "overlayFileName": "overlay.txt",
                "videoFilters": {
                    "filter": "drawtext",
                    "options": "fontfile=arial.ttf:fontsize=50:box=1:boxcolor=black@0.75:boxborderw=5:fontcolor=white:x=(w-text_w)/2:y=((h-text_h)/2)+((h-text_h)/2):textfile=overlay.txt:reload=1"
                }
            }
        }
            
    }
    // ,
    // rtspVideoCapture: {
    //     input:"rtsp://10.100.32.91:554/s0",
    //     capture:true,
    //     outputs: {
    //         ffmpegVideoOutputRtmp : {
    //             "rtmpUrl": "rtmp://a.rtmp.youtube.com/live2/a5fv-d7rc-7jsa-v7g4-2c70",
    //             //"rtmpUrlRtp": "rtp://127.0.0.1:3000",
    //             "inputOptions": [ "-y", "-vsync 0", "-hwaccel cuda"],
    //             "outputOptions": [ "-c:a copy", "-pix_fmt +", "-c:v h264_nvenc", "-g 12", "-preset hq", "-f flv" ],
    //             //"outputOptionsRtp": [ "-c:a copy", "-pix_fmt +", "-c:v h264_nvenc", "-b:v 4.5M",  "-use_wallclock_as_timestamps 1", "-fflags +genpts",  "-preset llhq", "-rc vbr_hq", "-sdp_file video.sdp", "-f rtp" ],
    //             "overlayFileName": "overlay.txt",
    //             "videoFilters": {
    //                 "filter": "drawtext",
    //                 "options": "fontfile=arial.ttf:fontsize=50:box=1:boxcolor=black@0.75:boxborderw=5:fontcolor=white:x=(w-text_w)/2:y=((h-text_h)/2)+((h-text_h)/2):textfile=overlay.txt:reload=1"
    //             }
    //         },
    //         ffmpegVideoOutputMp4File :  {
    //             "inputOptions": [ "-y", "-vsync 0", "-hwaccel cuda",],
    //             "outputOptions": [ "-c:a copy", "-pix_fmt +", "-c:v h264_nvenc", "-g 12", "-b:v 5M", "-f flv" ],
    //             "outputFile": "e:\\games\\test.flv",
    //             //"outputOptionsRtp": [ "-c:a copy", "-pix_fmt +", "-c:v h264_nvenc", "-b:v 4.5M",  "-use_wallclock_as_timestamps 1", "-fflags +genpts",  "-preset llhq", "-rc vbr_hq", "-sdp_file video.sdp", "-f rtp" ],
    //             "overlayFileName": "overlay.txt",
    //             "videoFilters": {
    //                 "filter": "drawtext",
    //                 "options": "fontfile=arial.ttf:fontsize=50:box=1:boxcolor=black@0.75:boxborderw=5:fontcolor=white:x=(w-text_w)/2:y=((h-text_h)/2)+((h-text_h)/2):textfile=overlay.txt:reload=1"
    //             }
    //         }
    //     }
    // }
}


let logUtilHelper = new LogUtilHelper({
    appLogLevels: objOptions.appLogLevels,
    logEventHandler: null,
    logUnfilteredEventHandler: null,
    logFolder: "log",
    logName: "testVideoCapture",
    debugUtilEnabled: true,
    debugUtilName:"testVideoCapture",
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




try{
    var ffmpegVideoInput = new FfmpegVideoInput(objOptions.ffmpegVideoInput,logUtilHelper); // Loads the sound file and automatically starts playing
    logUtilHelper.log(appLogName, "app", "info", "starting Stream");
    ffmpegVideoInput.streamStart(true);

    // var rtspVideoCapture = new RtspVideoCapture(objOptions.rtspVideoCapture,logUtilHelper); // Loads the sound file and automatically starts playing
    // logUtilHelper.log(appLogName, "app", "info", "starting Stream");
    // rtspVideoCapture.streamStart(true);
    
}catch(ex){
    logUtilHelper.log(appLogName, "app", "error", ex);
}







 




