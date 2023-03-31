##Raspberry Pi 4


serial port /dev/ttyS0
i2c port is  /dev/i2c-1  use i2CDevice = 1 in dataDisplays



Bullseye Camera Updates means we have to you libcamera 

libcamera-vid -t 0  --width 1024 --height 768 --inline -o - | cvlc stream:///dev/stdin --sout '#rtp{sdp=rtsp://:8554/stream1}' :demux=h264

libcamera-vid -t 0  --width 1920 --height 1024 --autofocus-mode manual --inline --listen -o tcp://0.0.0.0:8888
tcp/h264://raspberrypi.local:8888

-f video4linux2

#Capture Devices
```
ffmpeg -list_devices true -f video4linux2 -i dummy

ffmpeg -f dshow -list_options true -i video="Integrated Camera"

```