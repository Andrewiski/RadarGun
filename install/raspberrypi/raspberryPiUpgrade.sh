#!/bin/bash     
echo "Starting Raspberry Pi Upgrade Script"
cd /opt/de/radar
#sudu su radar
echo downloading latest version of code
curl -s https://api.github.com/repos/Andrewiski/RadarGun/releases/latest | sed -n 's/.*"tarball_url": "\(.*\)",.*/\1/p' | xargs -n1 wget -O - -q | tar -xz --strip-components=1
npm install
#exit
sudo chown -R radar:radar /opt/de/appdata/radar
sudo chmod -R g+rw /opt/de/appdata/radar
sudo chown -R radar:radar /opt/de/radar
sudo chmod -R g+rw /opt/de/radar
sudo systemctl restart radar

