##Windows Install

#Capture Devices
```
ffmpeg -list_devices true -f dshow -i dummy

ffmpeg -f dshow -list_options true -i video="Integrated Camera"

```


```

input:"video=Integrated Camera:audio=Microphone (Realtek High Definition Audio)",
inputOptions: ["-f dshow", "-video_size 1280x720", "-rtbufsize 702000k", "-framerate 30"]

```