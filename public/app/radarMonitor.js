(function () {

   'use strict';

    angular.module('scoreboardapp')
       .factory('radarMonitor', ['$q', '$rootScope', function($q, $rootScope) {
            // We return this object to anything injecting our service
            var Service = {};
            // Create our socket.io object and connect it to express
            io = io.connect();
            io.on('Connected', function(message) {
                console.log('radarMonitorService Connected Data', message);
                 $rootScope.$emit("radarMonitor:Connected", message);
            });

            io.on('radarSpeed', function(message) {
                console.log('radarMonitorService received Speed Data', message);
                $rootScope.$emit("radarMonitor:radarSpeed", message);
            });

            io.on('radarConfig', function(message) {
                console.log('radarMonitorService received Config Data', message);
                $rootScope.$emit("radarMonitor:radarConfig", message);
            });
            io.on('radarConfigProperty', function(message) {
                console.log('radarMonitorService received Config Data Property', message);
                $rootScope.$emit("radarMonitor:radarConfigProperty", message);
            });
            io.on('radarCommand', function(message) {
                 console.log('radarMonitorService received radarCommand', message);
                $rootScope.$emit("radarMonitor:radarCommand", message);
            });

            io.on('batteryVoltage',function(message){
                console.log('radarMonitorService received batteryVoltage Data', message);
                $rootScope.$emit("radarMonitor:batteryVoltage", message);
            });
            Service.sendRadarCommand = function(cmd,data){
                io.emit('radarCommand',{cmd:cmd,data:data});
            };

            return Service;
        }]);
})();