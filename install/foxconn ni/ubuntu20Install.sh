#!/bin/bash     
echo Add Node.JS 16 repo
curl -sSL https://deb.nodesource.com/setup_16.x | sudo bash -
echo Install Node.JS
sudo apt install -y nodejs

sudo mkdir /opt/de
sudo chown $(id -u):$(id -g) /opt/de
sudo useradd -m radar
sudo groupadd radar
sudo usermod -a -G dialout radar
sudo usermod -a -G audio radar
#sudo usermod -a -G i2c radar
sudo usermod -a -G radar $(id -u -n)
newgrp radar
mkdir /opt/de/radar
mkdir /opt/de/appdata
mkdir /opt/de/appdata/radar
sudo chown radar:radar /opt/de/appdata/radar
sudo chmod g+rw /opt/de/appdata/radar
sudo chown radar:radar /opt/de/radar
sudo chmod g+rw /opt/de/radar

mkdir /opt/de/appdata/radar/config
mkdir /opt/de/appdata/radar/data
mkdir /opt/de/appdata/radar/logs

sudo chown radar:radar /opt/de/appdata/radar/config
sudo chown radar:radar /opt/de/appdata/radar/data
sudo chown radar:radar /opt/de/appdata/radar/logs

cd /opt/de/radar
echo downloading latest version of code
curl -s https://api.github.com/repos/Andrewiski/RadarGun/releases/latest | sed -n 's/.*"tarball_url": "\(.*\)",.*/\1/p' | xargs -n1 wget -O - -q | tar -xz --strip-components=1
npm install
sudo cp /opt/de/radar/install/raspberrypi/service/radar.service /lib/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start radar
sudo systemctl enable radar

# Make it so Node can use Port 80 no Root/Sudo user
#sudo apt-get install libcap2-bin
#sudo setcap cap_net_bind_service=+ep /usr/bin/node
#Test Config
#sudo DEBUG=app,dataDisplay,radar,adafruitLedBackpack,gpsMonitor,radarEmulato CONFIGDIRECTORY=/opt/de/appdata/radar/config DATADIRECTORY=/opt/de/appdata/radar/data LOGDIRECTORY=/opt/de/appdata/radar/logs npm start
