(function () {

   'use strict';

    angular.module('scoreboardapp')
       .factory('radarMonitor', ['$q', '$rootScope', function($q, $rootScope) {
            // We return this object to anything injecting our service
           var Service = { socket: io.connect()};
            // Create our socket.io object and connect it to express
            
           Service.socket.on('Connected', function(message) {
                console.log('radarMonitorService Connected Data', message);
                 $rootScope.$emit("radarMonitor:Connected", message);
            });

           Service.socket.on('Disconnect', function (message) {
                console.log('radarMonitorService Disconnect',);
                $rootScope.$emit("radarMonitor:Disconnect", message);
           });

           Service.socket.on('reconnecting', function (message) {
               console.log('radarMonitorService reconnecting', message);
               $rootScope.$emit("radarMonitor:reconnecting", message);
           });
           Service.socket.on('reconnect', function (message) {
               console.log('radarMonitorService reconnect', message);
               $rootScope.$emit("radarMonitor:reconnect", message);
           });

           Service.socket.on('ping', function (message) {
               //console.log('radarMonitorService ping', message);
               $rootScope.$emit("radarMonitor:ping", message);
           });

           Service.socket.on('pong', function (message) {
               //console.log('radarMonitorService pong', );
               $rootScope.$emit("radarMonitor:ping", message);
           });

           Service.socket.on('radarSpeed', function(message) {
                console.log('radarMonitorService received Speed Data', message);
                $rootScope.$emit("radarMonitor:radarSpeed", message);
           });

           Service.socket.on('radarTimeout', function (message) {
               console.log('radarMonitorService received Radar Timeout', message);
               $rootScope.$emit("radarMonitor:radarTimeout", message);
           });

           Service.socket.on('radarSpeedDataHistory', function(message) {
               console.log('radarMonitorService received  Radar Speed Data History', message);
               $rootScope.$emit("radarMonitor:radarSpeedDataHistory", message);
           });
           Service.socket.on('radarConfig', function(message) {
                console.log('radarMonitorService received  Radar Config Data', message);
                $rootScope.$emit("radarMonitor:radarConfig", message);
            });
           Service.socket.on('radarConfigProperty', function(message) {
                console.log('radarMonitorService received Radar Config Data Property', message);
                $rootScope.$emit("radarMonitor:radarConfigProperty", message);
            });
           Service.socket.on('radarCommand', function(message) {
                 console.log('radarMonitorService received radarCommand', message);
                $rootScope.$emit("radarMonitor:radarCommand", message);
           });

           Service.socket.on('softwareConfig', function (message) {
               console.log('radarMonitorService received software Config Data', message);
               $rootScope.$emit("radarMonitor:softwareConfig", message);
           });
           Service.socket.on('softwareConfigProperty', function (message) {
               console.log('radarMonitorService received software Config Data Property', message);
               $rootScope.$emit("radarMonitor:softwareConfigProperty", message);
           });
           

           Service.socket.on('batteryVoltage',function(message){
                console.log('radarMonitorService received batteryVoltage Data', message);
                $rootScope.$emit("radarMonitor:batteryVoltage", message);
            });
           Service.sendRadarConfigCommand = function(cmd,data){
               Service.socket.emit('radarConfigCommand',{cmd:cmd,data:data});
           };
           Service.sendRadarEmulatorCommand = function (cmd, data) {
               Service.socket.emit('radarEmulatorCommand', { cmd: cmd, data: data });
           };

           Service.sendResetRadarSettings = function () {
               Service.socket.emit('resetRadarSettings', {cmd: "resetRadarSettings"});
           }
           Service.sendServerCommand = function (cmd, data) {
               Service.socket.emit(cmd, data );
           };

           Service.socket.on('gameChanged', function (message) {
               //console.log('radarMonitorService received gameChanged', message);
               $rootScope.$emit("gameChanged", message);
           });

           Service.socket.on('videoStreams', function (message) {
                //console.log('radarMonitorService received videoStreams', message);
                $rootScope.$emit("videoStreams", message);
           });
           
           /** Generate a guid / uuid  --  682db637-0f31-4847-9cdf-25ba9613a75c
            */
           Service.uuid = function uuid() {
               var chars = '0123456789abcdef'.split('');

               var uuid = [], rnd = Math.random, r;
               uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
               uuid[14] = '4'; // version 4

               for (var i = 0; i < 36; i++) {
                   if (!uuid[i]) {
                       r = 0 | rnd() * 16;

                       uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r & 0xf];
                   }
               }

               return uuid.join('');
           }

            return Service;
        }]);
})();