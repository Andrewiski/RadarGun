//var child = require('child_process');

//var cmd = 'gst-launch-1.0';

// ksvideosrc var devicePath = "\\\\\\\\\\?\\\\usb\\#vid_046d\\&pid_0825\\&mi_00\\#8\\&31cb511d\\&0\\&0000\\#\\{6994ad05-93ef-11d0-a3cc-00a0c9223196\\}\\\\\\{bbefb6c7-2fc4-4139-bb8b-a58bba724083\\}";
//var devicePath = "\\\\\\\\\\?\\\\usb\\#vid_046d\\&pid_0825\\&mi_00\\#8\\&31cb511d\\&0\\&0000\\#\\{e5323777-f976-4f5b-9b55-b94699c46e44\\}\\\\\\{bbefb6c7-2fc4-4139-bb8b-a58bba724083\\}";

var devicePath = "\\\\\\\\\\?\\\\usb\\#vid_32e4\\&pid_9230\\&mi_00\\#8\\&2c85d0dd\\&0\\&0000\\#\\{e5323777-f976-4f5b-9b55-b94699c46e44\\}\\\\global"

console.log("opening devicePath " + devicePath);
//var args =
//    [
//        'ksvideosrc', 'device-path="' + devicePath + '"',
//        '!', 'video/x-raw,framerate=30/1,width=1280,height=960',
//        //'videotestsrc',
//        //'!', 'textoverlay text="Room A" valignment=top halignment=left font-desc="Sans, 72"',
//        '!', 'autovideosink'
//    ];

//var gstMuxer = child.spawn(cmd, args);

//gstMuxer.stderr.on('data', onSpawnError);
//gstMuxer.on('exit', onSpawnExit);


//function onSpawnError(data) {
//    console.log(data.toString());
//}

//function onSpawnExit(code) {
//    if (code !== null) {
//        console.log('GStreamer error, exit code ' + code);
//    }
//}


const gstreamer = require('gstreamer-superficial');
//const pipeline = new gstreamer.Pipeline(`videotestsrc ! textoverlay name=text ! d3d11videosink`);

//const pipeline = new gstreamer.Pipeline(`mfvideosrc device-path="' + devicePath + '" ! textoverlay text="Room A" valignment=top halignment=left font-desc="Sans, 72" ! d3d11videosink`);

const pipeline = new gstreamer.Pipeline(`v4l2src device=/dev/video1 ! textoverlay name=text ! autovideosink`);


pipeline.play();

const target = pipeline.findChild('text');

target.text = 'Hello';
Object.assign(target.text, {
	text: 'Hello',
	'font-desc': 'Helvetica 32',
})


//const pipeline = new gstreamer.Pipeline([
//    'input-selector name=sel',
//    '! autovideosink',
//    'videotestsrc pattern=0',
//    '! sel.sink_0',
//    'videotestsrc pattern=1',
//    '! sel.sink_1'
//].join(' '));
//pipeline.play();

//let t = 0;
//setInterval(function () {
//    t++;
//    console.log('t: %d', t)

//    if (t % 2 === 0) {
//        pipeline.setPad('sel', 'active-pad', 'sink_0')
//    }
//    else {
//        pipeline.setPad('sel', 'active-pad', 'sink_1')
//    }

//}, 1000);

pipeline.pollBus(msg => {
	console.log(msg);
});

process.on('uncaughtException', function (err) {
    console.log(err);
});