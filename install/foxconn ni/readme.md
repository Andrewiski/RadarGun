
### Ubuntu Server 20
Audio Trouble Shooting with Intell HDA 
```
sudo apt-get install ffmpeg

sudo apt-get install alsa
sudo alsa force-reload
ffplay -nodisp -autoexit Pitbull_Fireball.m4a


# no Video Device is due to no x11   sudo apt-get install xorg-dev

ffplay -devices 
```