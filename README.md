# RadarGunMonitor
# Beaglebone Server Room Hvac Controller #

### Intro ###
This application is under active development by Andrew DeVries for Digital Example, LLC all rights reserved.

The Radar Gun Monitor is a BeagleBone application using a Stalker Pro II OEM Speed Sensor as its primary speed sensor. Speed data is recorded and logged on local flassh memeory as well as presented to multiple clients over tcp web client.

Socket IO is used to give real time radar speed updates tot he web browser and works with Apple/Andriod mobile devices. 

### Installation and Setup ###
Due to the current state of rapid changes to Beaglebone Debian images with the move to Cape Manager and Jessie. I decided to go with the bleeding edge release
of Debian 8.4 2016-05-13.   Since there is a web front end I have no need for HDMI I used a Beaglebone Green Wireless as its cheaper and I have no plans to use the HDMI port.
That being said any version of the Beaglebone can be used but having built in wifi makes it easier for mounting external antenna

Tested setup is as follows.

Download and flash a micro sd or onboard emmc with the following debian 8.4 console image (Instruction on how to flash the image can be found here <https://beagleboard.org/getting-started#update>)

<https://rcn-ee.net/rootfs/bb.org/testing/2016-05-13/console/bone-debian-8.4-console-armhf-2016-05-13-2gb.img.xz>

Connect the BeagleBone to the internet as we need to install some software

```
 sudo apt-get update
 sudo apt-get install -y git
 sudo apt-get install -y build-essential g++ python-setuptools python2.7-dev
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


 We can load the cape manual like so for BeagleBone Green
 ```   
 #BBG
  sudo sh -c "echo 'univ-emmc' > /sys/devices/platform/bone_capemgr/slots"
 #BBGW
 sudo sh -c "echo 'univ-bbgw' > /sys/devices/platform/bone_capemgr/slots"
 
 ```


