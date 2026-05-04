#!/bin/bash     
echo Add Node.JS 22 repo
curl -sSL https://deb.nodesource.com/setup_22.x | sudo bash -
echo Install Node.JS
sudo apt install -y nodejs

cd /opt/de/radar
echo downloading latest version of code
curl -s https://api.github.com/repos/Andrewiski/RadarGun/releases/latest | sed -n 's/.*"tarball_url": "\(.*\)",.*/\1/p' | xargs -n1 wget -O - -q | tar -xz --strip-components=1
npm install

