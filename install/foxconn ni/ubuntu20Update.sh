#!/bin/bash     
rm -R /opt/de/radarOld # remove the old radar directory
mv /opt/de/radar /opt/de/radarOld # move the current radar directory to radarOld
mkdir -p /opt/de/radar
echo downloading latest version of code
DOWNLOAD_URL=$(curl -s https://api.github.com/repos/Andrewiski/RadarGun/releases/latest | grep -o '"browser_download_url": *"[^"]*radargunmonitor\.zip"' | grep -o 'https://[^"]*')
wget -q -O /opt/de/radar/radargunmonitor.zip "$DOWNLOAD_URL"
unzip -q /opt/de/radar/radargunmonitor.zip -d /opt/de/radar
rm /opt/de/radar/radargunmonitor.zip
cd /opt/de/radar
npm install

