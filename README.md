# Digital Example LLC Radar Gun Monitor
# Stalker Pro II Radar OEM Sensor Web Based Monitor #

### Intro ###
This application is under active development by Andrew DeVries for Digital Example, LLC all rights reserved.

The Radar Gun Monitor is a BeagleBone application using a Stalker Pro II OEM Speed Sensor as its primary speed sensor. Speed data is recorded and logged on local flash memory as well as presented to multiple clients over tcp web client.

Socket IO is used to give real time radar speed updates tot he web browser and works with Apple/Andriod mobile devices. 

### Installation and Setup ###
Due to the current state of rapid changes to Beaglebone Debian images with the move to Cape Manager on Jessie, now moving to Stretch. I decided to go with the latest release
of Debian 9.2 IOT 2017-10-10. Since there is a web front end I have no need for HDMI I used a Beaglebone Green Wireless as its cheaper and I have no plans to use the HDMI port.
That being said any version of the Beaglebone can be used but having built in wifi makes it easier for mounting external antenna. For my always on in the cage setups I use the ethernet versions of
beagle bone black rev b or rev c boards as they are wired to the switch sit in my office and are conencted to the stalker pro units at the back of the chages via 200 foot serial cables. We have tv monitors in each cage runing andriod tv boxs for showing swing recordings
and also a web browser for speed display. When we setup on the field for game display the web interface is used by coaches in the dugout via there smart phones as well as parents fans in the stand as the softAP is also running.

The GPS is used to set the time so the logs are timestamped.  MongoDB is the plan for loggin with work on export to Google Sheets per session planned for charting graphing over time.


Tested setup is as follows.

bone-debian-9.2-iot-armhf-2017-10-10-4gb  image from beagleboard.org

Connect the BeagleBone to the internet as we need to install some software. Node 6.0 is now included in latest release so does not need to be installed.

Also note as of 2/06/2016 we are using released bonescript ^0.6.2 to check what version you have installed run.

```
node -pe "require('bonescript').getPlatform().bonescript"
```

```
 sudo apt-get update
sudo apt-get install -y git curl i2c-tools
 ```
 if we are using i2c ledDisplays lets make sure we can detect them on the i2c bus

```
##sudo apt-get install i2c-tools
ls -l /dev/i2c*
sudo i2cdetect -l
sudo i2cdetect -r 2
```

Download Setup the Radar Controller NPM Project

```
 sudo mkdir /var/radar
 sudo chmod a+rw /var/radar
 cd  /var/radar
 git clone https://github.com/Andrewiski/RadarGun.git .
 # no sudo for this one
 npm install
 sudo DEBUG=app,dataDisplay,radar,adafruitLedBackpack,gpsMonitor,radarEmulator npm start

```

Make it run as a service using Forever

```
 sudo npm install -g forever

 sudo cp /var/radar/service/radarMonitor /etc/init.d/radarMonitor
 sudo chmod a+x /etc/init.d/radarMonitor
 sudo update-rc.d radarMonitor defaults
 sudo service radarMonitor start
```

Now Open a web browser and connect to the Beaglebone.

http://192.168.7.2:12336 is your connected via usb port if not you will need the IP address of the beaglebone which maybe accessable by its host name.

port is configurable as is most everything else in the configs folder

```
 nano /var/radar/configs/radarGunMonitorConfig.json
```

http://beaglebone:12336

### Updates ###
Git commands can be used to get the latest version of posted software
```
cd  /var/radar
git pull

```

### Conectors ###
the sample config files expect the Stalker Pro 2 OEM Radar unit to be attached to Uart2. I chose that uart as its polulated to a grove connector on the Beaglebone Green so easy to access.
I use a simple 4 wire male rs232 signal converter to get the correct 3.3v ttl signals.

The radar should be setup with direction to both,  hit and peak speeds disabled, no message delay, baud rate of 115200, and in be format. This application does allow for the limited
 config of setting via the web interface but port speed is not one of them. I susgest using the scoreboard app that comes with the OEM unit for inital config.  
 Note that with message delay set to none the data stream can over whelm the scoreboard app so I suggest do a soft off on the transmiter called a hold before attemping to change settings.

 Then use the web app to enable (turn on) the radar transmitter.

 

 ### UART Setup and Testing ###
 
 we are using three of the uarts so we need to load the overlays so we can access them

 ```
 sudo nano /boot/uEnv.txt
 ```

 Updates 2/11/2018 Ne UBoot Overlays there is no longer a capes file
 
 UART2 (/dev/ttyO2) is on BBG main board where we connect the stalker radar via a rs232 level converter

   UART1 and UART4 are exposed on the seed studio groove v2 cape [https://www.seeedstudio.com/Grove-Base-Cape-for-Beaglebone-v2.0-p-2644.html].
 I am using a GPS to give me location and Time data at UART1 (/dev/ttyO1)
 I am currently not using UART4 but added it for future use sure as remote scoreboard control. (More to come on this idea)

 We are using /dev/i2c-2 to control our adafruit I2C ledDisplays so we need BB-I2C2 as well

  We are using the ADC to measure batter voltage as well as I need battery voltage monitor for my portable unit etc so need analog pins. Nee BB-ADC


 ```
       
##Example v4.4
###Overide capes with eeprom
uboot_overlay_addr0=/lib/firmware/BB-UART1-00A0.dtbo
uboot_overlay_addr1=/lib/firmware/BB-UART2-00A0.dtbo
uboot_overlay_addr2=/lib/firmware/BB-UART4-00A0.dtbo
uboot_overlay_addr3=/lib/firmware/BB-I2C2-00A0.dtbo
###
###Additional custom capes
uboot_overlay_addr4=/lib/firmware/BB-ADC-00A0.dtbo

 ```




 ```
 sudo apt-get install minicom

 ```

 open two terminal windows

 ```
 minicom -D /dev/ttyO2 -b 9600
 minicom -D /dev/ttyO4 -b 9600
 
 ```
