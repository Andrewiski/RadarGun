#!/bin/bash     
echo Add Node.JS 22 repo
curl -sSL https://deb.nodesource.com/setup_22.x | sudo bash -
echo Install Node.JS
sudo apt-get install nodejs -y

sudo mkdir /opt/de
sudo chown $(id -u):$(id -g) /opt/de
sudo useradd -m radar
sudo groupadd radar
sudo usermod -a -G dialout radar
sudo usermod -a -G audio radar
sudo usermod -a -G i2c radar
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

mkdir /opt/de/appdata/radar/data/audioFiles
mkdir /opt/de/appdata/radar/data/nosql
mkdir /opt/de/appdata/radar/data/overlays
mkdir /opt/de/appdata/radar/data/videos

sudo chown radar:radar /opt/de/appdata/radar/data/audioFiles
sudo chown radar:radar /opt/de/appdata/radar/data/nosql
sudo chown radar:radar /opt/de/appdata/radar/data/overlays
sudo chown radar:radar /opt/de/appdata/radar/data/videos

cd /opt/de/radar
echo downloading latest version of code
curl -s https://api.github.com/repos/Andrewiski/RadarGun/releases/latest | sed -n 's/.*"tarball_url": "\(.*\)",.*/\1/p' | xargs -n1 wget -O - -q | tar -xz --strip-components=1
npm install
sudo cp /opt/de/radar/install/raspberrypi/service/radar.service /lib/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start radar
sudo systemctl enable radar

#Test Config do this as Radar after su radar
# DEBUG=app,dataDisplay,radar,adafruitLedBackpack,gpsMonitor,radarEmulato CONFIGDIRECTORY=/opt/de/appdata/radar/config DATADIRECTORY=/opt/de/appdata/radar/data LOGDIRECTORY=/opt/de/appdata/radar/logs npm start
sudo nmcli device wifi hotspot ssid "DE Radar" password "radarradar"
#To disable the hotspot network and resume use of your Pi as a wireless client, run the following command:
#sudo nmcli device disconnect wlan0
#sudo nmcli device up wlan0

#First, create a network bridge interface:
#sudo nmcli connection add type bridge con-name 'Bridge' ifname bridge0
#sudo nmcli connection modify 'Hotspot' master bridge0
#Now that you’ve configured your bridge, it’s time to activate it. Run the following command to activate the bridge:
#sudo nmcli connection add con-name 'Hotspot' ifname wlan0 type wifi slave-type bridge master bridge0  wifi.mode ap wifi.ssid "DE Radar" wifi-sec.key-mgmt wpa-psk  wifi-sec.proto rsn wifi-sec.pairwise ccmp wifi-sec.psk "radarradar"
#And run the following command to start hosting your wireless network:
#sudo nmcli connection up Bridge
