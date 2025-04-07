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

mkdir /opt/de/appdata/radar/config
mkdir /opt/de/appdata/radar/data
mkdir /opt/de/appdata/radar/logs

mkdir /opt/de/appdata/radar/data/audioFiles
mkdir /opt/de/appdata/radar/data/nosql
mkdir /opt/de/appdata/radar/data/overlays
mkdir /opt/de/appdata/radar/data/videos
# Set permissions for the directories
sudo chown -R radar:radar /opt/de/appdata/radar
sudo chmod -R g+rw /opt/de/appdata/radar
sudo chown -R radar:radar /opt/de/radar
sudo chmod -R g+rw /opt/de/radar
cd /opt/de/radar
sudo su radar
echo downloading latest version of code
curl -s https://api.github.com/repos/Andrewiski/RadarGun/releases/latest | sed -n 's/.*"tarball_url": "\(.*\)",.*/\1/p' | xargs -n1 wget -O - -q | tar -xz --strip-components=1
npm install
exit
sudo cp /opt/de/radar/install/raspberrypi/service/radar.service /lib/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start radar
sudo systemctl enable radar

#If the port is changed to something under port 1024 then needs to be allowed
# which node  
#allow Node to use Port 80 and port 443
#sudo setcap 'cap_nat_bind_service=+ep' /user/bin/node

#Test Config do this as Radar after su radar
# DEBUG=app,dataDisplay,radar,adafruitLedBackpack,gpsMonitor,radarEmulato CONFIGDIRECTORY=/opt/de/appdata/radar/config DATADIRECTORY=/opt/de/appdata/radar/data LOGDIRECTORY=/opt/de/appdata/radar/logs npm start


#Enable Wireless Hotspot on Raspberry Pi
# Before you start, ensure your Raspberry Pi has a Wi-Fi adapter that supports AP mode. Most modern Raspberry Pi models do.
#sudo nmcli device wifi hotspot ssid "DERadar" password "radarradar"
#To disable the hotspot network and resume use of your Pi as a wireless client, run the following command:
#sudo nmcli device disconnect wlan0
#sudo nmcli device up wlan0

#First, create a network bridge interface:
#sudo nmcli connection add type bridge con-name 'Bridge' ifname bridge0
#sudo nmcli connection modify 'Hotspot' master bridge0
#Now that you’ve configured your bridge, it’s time to activate it. Run the following command to activate the bridge:
#sudo nmcli connection add con-name 'Hotspot' ifname wlan0 type wifi slave-type bridge master bridge0  wifi.mode ap wifi.ssid "DERadar" wifi-sec.key-mgmt wpa-psk  wifi-sec.proto rsn wifi-sec.pairwise ccmp wifi-sec.psk "radarradar"
#And run the following command to start hosting your wireless network:
#sudo nmcli connection up Bridge
