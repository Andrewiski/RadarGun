#!/bin/bash          
echo "Starting Radar App in debug mode" 
LOCALDEBUG="true" CONFIGDIRECTORY="/opt/de/appdata/radar/config" DATADIRECTORY="/opt/de/appdata/radar/data" LOGDIRECTORY="/opt/de/appdata/radar/logs" DEBUG="radarMonitor,radarStalker2,radarPacketParser,dataDisplay,adafruitLedBackpack" node app.js



