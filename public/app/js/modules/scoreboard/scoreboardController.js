(function () {

   'use strict';

    angular.module('scoreboardapp')
       .controller('scoreboardController', ['$rootScope', '$scope', '$uibModal', '$filter', 'radarMonitor', function ($rootScope, $scope, $uibModal, $filter, radarMonitor) {
           $scope.commonData = {
               teams:[{ TeamID: 1, Name: 'Marrons' }, { TeamID: 2, Name: 'PrimeTime' }],
               radarSpeedDataHistory:[],
               editRadarConfig: false,
               radarSpeedData: {
                   id: 0,
                   time: new Date(),
                   unitConfig: {
                       resolution: false,
                       peakSpeed: false,
                       forkMode: false
                   },
                   liveSpeedDirection: '',
                   liveSpeed2Direction: '',
                   liveSpeed: 0,
                   liveSpeed2: 0,
                   peakSpeedDirection: '',
                   peakSpeed2Direction: '',
                   peakSpeed: 0,
                   peakSpeed2: 0,
                   hitSpeedDirection: '',
                   hitSpeed2Direction: '',
                   hitSpeed: 0,
                   hitSpeed2: 0,
                   speeds:[]
               },
               radarConfig: {},
               batteryVoltage: -0.01,
               isradarCommandPending : false
           }
          
            $rootScope.$on('radarMonitor:Connected', function(event, data) {
                // use the data accordingly
                console.log('radarMonitor:Connected detected');
                
            });

            $rootScope.$on('radarMonitor:radarConfig', function(event, data) {
                // use the data accordingly
                
                console.log('radarMonitor:radarConfig detected');
                console.debug(data);
                $scope.commonData.radarConfig = data;
                
                $scope.$apply();
            });

            $rootScope.$on('radarMonitor:radarConfigProperty', function(event, data) {
                // use the data accordingly
                
                console.log('radarMonitor:radarConfigProperty detected ' + data.Property + ' ' + data.data);
                console.debug(data);
                $scope.commonData.radarConfig[data.Property].value = data.data;
                $scope.$apply();
            });

            $rootScope.$on('radarMonitor:radarSpeed', function(event, data) {
                // use the data accordingly
                console.log('radarMonitor:radarSpeed detected scoreboardController l:' + data.liveSpeed + ' p:' + data.peakSpeed + ' h:' + data.hitSpeed);
                console.debug(data);
                $scope.commonData.radarSpeedData = data;
                var datacopy = angular.copy(data);
                $scope.commonData.radarSpeedDataHistory.push(datacopy);
                $scope.$apply();
            });
            
             $rootScope.$on('radarMonitor:radarCommand', function(event, data) {
                 console.log('radarMonitor:radarCommand Command Sent ' + data.cmd);
                 console.debug(data);
                 $scope.commonData.isradarCommandPending = false;
                $scope.$apply();
            });
             $rootScope.$on('radarMonitor:batteryVoltage', function (event, data) {
                 console.log('radarMonitor:batteryVoltage ' + data);
                 console.debug(data);
                 $scope.commonData.batteryVoltage = data;
                $scope.$apply();
            });
             
            $scope.radarCommand = function(cmd, data) {
                $scope.commonData.isradarCommandPending = true;
               radarMonitor.sendRadarCommand(cmd,data); 
            }

            $scope.updateRadarConfig = function(){
                $scope.commonData.isradarCommandPending = true;
                for (var key in $scope.radarConfig){
                    var radarConfigProperty = $scope.radarConfig[key];
                    if (radarConfigProperty.isDirty == true){
                        radarConfigProperty.isDirty = false;
                        $scope.radarCommand(key,radarConfigProperty.value);
                    }
                }
                $scope.commonData.isradarCommandPending = false;
            }
          }
       ]);
})();