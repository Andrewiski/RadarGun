(function () {

   'use strict';

    angular.module('scoreboardapp')
       .controller('scoreboardController', ['$rootScope', '$scope', '$uibModal', '$filter', 'radarMonitor', function ($rootScope, $scope, $uibModal, $filter, radarMonitor) {
            $scope.teams = [{TeamID:1,Name:'Marrons'},{TeamID:2,Name:'PrimeTime'}];
           $scope.radarSpeedDataHistory = [];
           $scope.editRadarConfig = false;
            $scope.radarSpeedData = {id:0, time: new Date(), unitConfig:{resolution: false,peakSpeed: false,forkMode: false}, LiveSpeedDirection: '' , LiveSpeed2Direction: '', LiveSpeed:0, LiveSpeed2:0, PeakSpeedDirection: '' , PeakSpeed2Direction: '', PeakSpeed:0, PeakSpeed2:0, HitSpeedDirection: '' ,HitSpeed2Direction: '', HitSpeed:0, HitSpeed2:0};
            $rootScope.$on('radarMonitor:Connected', function(event, data) {
                // use the data accordingly
                console.log('radarMonitor:Connected detected');
                
            });

            $rootScope.$on('radarMonitor:radarConfig', function(event, data) {
                // use the data accordingly
                
                console.log('radarMonitor:radarConfig detected');
                $scope.radarConfig = data;
                $scope.$apply();
            });

            $rootScope.$on('radarMonitor:radarConfigProperty', function(event, data) {
                // use the data accordingly
                
                console.log('radarMonitor:radarConfigProperty detected ' + data.Property + ' ' + data.data);
                $scope.radarConfig[data.Property].value = data.data;
                $scope.$apply();
            });

            $rootScope.$on('radarMonitor:radarSpeed', function(event, data) {
                // use the data accordingly
                console.log('radarMonitor:radarSpeed detected scoreboardController ' + data.LiveSpeed + ' ' + data.PeakSpeed + ' ' + data.HitSpeed);
                $scope.radarSpeedData = data;
                var datacopy = angular.copy(data);
                $scope.radarSpeedDataHistory.push(datacopy);
                $scope.$apply();
            });
            
             $rootScope.$on('radarMonitor:radarCommand', function(event, data) {
                console.log('radarMonitor:radarCommand Command Sent ' + data.cmd);
                $scope.isradarCommandPending = false;
                $scope.$apply();
            });
             $rootScope.$on('radarMonitor:radarBattery', function(event, data) {
                console.log('radarMonitor:radarBattery ' + data);
                $scope.radarBattery = data;
                $scope.$apply();
            });
             
            $scope.radarCommand = function(cmd, data) {
               $scope.isradarCommandPending = true;
               radarMonitor.sendRadarCommand(cmd,data); 
            }

            $scope.updateRadarConfig = function(){
                $scope.isradarCommandPending = true;
                for (var key in $scope.radarConfig){
                    var radarConfigProperty = $scope.radarConfig[key];
                    if (radarConfigProperty.isDirty == true){
                        radarConfigProperty.isDirty = false;
                        $scope.radarCommand(key,radarConfigProperty.value);
                    }
                }
                $scope.isradarCommandPending = false;
            }
          }
       ]);
})();