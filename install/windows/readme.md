##Windows Install

#Capture Devices
```
ffmpeg -list_devices true -f dshow -i dummy

ffmpeg -f dshow -list_options true -i video="Integrated Camera"


ffmpeg -f dshow -video_size 1280x720 -framerate 10 -pixel_format yuyv422 -i video="Integrated Camera" -f nut v:copy raw

ffmpeg -f dshow -video_size 1280x720 -framerate 30 -i video="Integrated Camera" -f nut v:copy testraw.raw


```


```

input:"video=Integrated Camera:audio=Microphone (Realtek High Definition Audio)",
inputOptions: ["-f dshow", "-video_size 1280x720", "-rtbufsize 702000k", "-framerate 30"]

```