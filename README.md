# Digital Example LLC Radar Gun Monitor
# Stalker Pro II Radar OEM Sensor Web Based Monitor #

### Intro ###
This application is under active development by Andrew DeVries for Digital Example, LLC all rights reserved.

The Radar Gun Monitor is a BeagleBone application using a Stalker Pro II OEM Speed Sensor as its primary speed sensor. Speed data is recorded and logged on local flash memory as well as presented to multiple clients over tcp web client.

Socket IO is used to give real time radar speed updates tot he web browser and works with Apple/Andriod mobile devices. 

### Installation and Setup ###
Due to the current state of rapid changes to Beaglebone Debian images with the move to Cape Manager and Jessie. I decided to go with the bleeding edge release
of Debian 8.6 2016-12-13.   Since there is a web front end I have no need for HDMI I used a Beaglebone Green Wireless as its cheaper and I have no plans to use the HDMI port.
That being said any version of the Beaglebone can be used but having built in wifi makes it easier for mounting external antenna

Tested setup is as follows.

Download and flash a micro sd or onboard emmc with the following debian 8.6 console image (Instruction on how to flash the image can be found here <https://beagleboard.org/getting-started#update>)

<https://rcn-ee.com/rootfs/bb.org/testing/2016-12-18/console/BBB-blank-debian-8.6-console-armhf-2016-12-18-2gb.img.xz>

Connect the BeagleBone to the internet as we need to install some software including nodejs version 4.0 for now as bonescript just moved there.

Also note as of 12/28/2016 we are using beta bonescript 6.0 as packages config is pointed directly to master branch as not yet published to npm

```
 sudo apt-get update
sudo apt-get install -y git curl i2c-tools
sudo apt-get install -y build-essential g++ python-setuptools python2.7-dev
curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
sudo apt-get install -y nodejs
 ```

 Do to missing files in the current console image the following needs to be ran to fix the universal image not being loaded
 which can be tested by viewing the loaded cape slots.
 We need the universial cape so that we can access the io pins for i2c and drive the relays.
 If output does not show  a universal cape then you may have load the universial cape manual or fix the image so it loads at boot.

 ```
 #show loaded Capes
 cat /sys/devices/platform/bone_capemgr/slots
 ```

  ```
 0: PF----  -1
 1: PF----  -1
 2: PF----  -1
 3: PF----  -1
 4: P-O-L-   0 Override Board Name,00A0,Override Manuf,univ-emmc
 ```

 If you are missing the universal cape which in example above is slot 4 then

To Fix the console image so it loads universial capes at boot via the /opt/scripts/boot/am335x_evm.sh that excutes at boot
do the following
 ```
 cd /opt/source/
 sudo  git clone https://github.com/cdsteinkuehler/beaglebone-universal-io.git
 sudo chmod a+rwx /opt/source/beaglebone-universal-io/config-pin
 cd /usr/local/bin/
 sudo ln -s /opt/source/beaglebone-universal-io/config-pin config-pin
```
after a reboot you should now see the universal cape loaded on boot
 ```
 cat /sys/devices/platform/bone_capemgr/slots
 ```
results should show a univ cape loaded
```
 0: PF----  -1
 1: PF----  -1
 2: PF----  -1
 3: PF----  -1
 4: P-O-L-   0 Override Board Name,00A0,Override Manuf,univ-emmc
 
 ```

 if we are using i2c ledDisplays lets make sure we can detect them on the i2c bus

```
##sudo apt-get install i2c-tools
ls -l /dev/i2c*
sudo i2cdetect -l
sudo i2cdetect -r 2
```
Setup hvac Controller

```
 sudo mkdir /var/radar
 sudo chmod a+rw /var/radar
 cd  /var/radar
 git clone https://github.com/Andrewiski/RadarGun.git .
 # no sudo for this one
 npm install
 sudo DEBUG=app,dataDisplay,radar,adafruitLedBackck,gpsMonitor npm start

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

The radar should be setup with direction to both,  hit and peak speeds disabled, no message delay, baud rate of 115200, and in be2 format. This application does allow for the limited
 config of setting via the web interface but port speed is not one of them. I susgest using the scoreboard app that comes with the OEM unit for inital config.  
 Note that with message delay set to none the data stream can over whelm the scoreboard app so I suggest do a soft off on the transmiter called a hold before attemping to change settings.

 Then use the web app to enable (turn on) the radar transmitter.

 

 ### UART Setup and Testing ###
 
 we are using three of the uarts so we need to load the overlays so we can access them

 ```
 sudo nano /boot/uEnv.txt
 ```

 find and add to the cape_enable=bone_capemgr.enable_partno=
   BB-UART1,BB-UART2,BB-UART4  so we can use the three uarts.  UART2 (/dev/ttyO2) is on BBG main board where we connect the stalker radar via a rs232 level converter

   UART1 and UART4 are exposed on the seed studio groove v2 cape [https://www.seeedstudio.com/Grove-Base-Cape-for-Beaglebone-v2.0-p-2644.html].
   I am using a GPS to give me location and Time data at UART1 (/dev/ttyO1)
   I am currently not using UART4 but added it for future use sure as remote scoreboard control. (More to come on this idea)

   We are using /dev/i2c-2 to control our adafruit I2C ledDisplays so we need BB-I2C2 as well

   We are using the ADC to measure batter voltage as well as I need battery voltage monitor for my portable unit etc so need analog pins. Nee BB-ADC


 ```
       
##Example v4.1.x
#cape_disable=bone_capemgr.disable_partno=
cape_enable=bone_capemgr.enable_partno=BB-UART1,BB-UART2,BB-UART4,BB-I2C2,BB-ADC

 ```

 after a reboot you should now see the universal cape and Uarts loaded on boot
 ```
 cat /sys/devices/platform/bone_capemgr/slots
 ```
results should show a univ cape loaded
```
 0: PF----  -1
 1: PF----  -1
 2: PF----  -1
 3: PF----  -1
 4: P-O-L-   0 Override Board Name,00A0,Override Manuf,univ-emmc
 
 ```


 ```
 sudo apt-get install minicom

 ```

 open two terminal windows

 ```
 minicom -D /dev/ttyO2 -b 9600
 minicom -D /dev/ttyO4 -b 9600
 ```