#!/bin/bash     
echo Add Node.JS 16 repo
curl -sSL https://deb.nodesource.com/setup_16.x | sudo bash -
echo Install Node.JS
sudo apt install -y nodejs
echo downloading latest version of code from 
echo Starting Radar App with Node JS Port 80
#curl -sSL https://github.com/Andrewiski/RadarGun/archive/refs/tags/v0.0.5.tar.gz
sudo mkdir /opt/de
sudo chown $(id -u):$(id -g) /opt/de
mkdir /opt/de/radar
cd /opt/de/radar
curl -s https://api.github.com/repos/Andrewiski/RadarGun/releases/latest | sed -n 's/.*"tarball_url": "\(.*\)",.*/\1/p' | xargs -n1 wget -O - -q | tar -xz --strip-components=1
npm install