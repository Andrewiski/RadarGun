(function () {

   'use strict';

    angular.module('scoreboardapp')
       .controller('scoreboardController', ['$rootScope', '$scope', '$uibModal', '$filter', '$log', '$http', 'radarMonitor', function ($rootScope, $scope, $uibModal, $filter, $log, $http, radarMonitor) {
           $scope.commonData = {
               emptyPlayer: { "firstName": "", "lastName": "", "jerseyNumber": "", "fielding": "99", "batting": "99" },
               teams: [],
               pitcher: null,
               batter: null,
               pitchers: null,
               batters: null,
               isGameAdmin: false,
               gameEdit: false,
               homeTeamEdit: false,
               guestTeamEdit: false,
               game: {},
               
               radarSpeedDataHistory: [],
               showRadarConfig : true,
               editRadarConfig: false,
               radarSpeedData: {
                   id: 0,
                   time: new Date(),
                   
                   inMinSpeed: 0,
                   inMaxSpeed: 0,
                   outMinSpeed: 0,
                   outMaxSpeed: 0,
                   inSpeeds: [],
                   outSpeeds:[]
               },
               radarConfig: {},
               radarEmulator: {
                   data: { in: 57.4, out: 67.8 }
               },
               batteryVoltage: -0.01,
               isradarCommandPending: false,
               showConfig: false,
               googleMap: {
                   inited:false,
                   map: null,
                   state: null,
                   alpha: null,
                   marker:null
               },
               gpsPosition: null,
               isRadarEmulator: false,
               isConnected:true
           }


           var refreshTeams = function () {
               $http.get('/data/team').
                   then(function (response) {
                       $scope.commonData.teams = response.data;
                   });
           }

           var getCurrentGame = function () {
               $http.get('/data/game').
                   then(function (response) {
                       $scope.commonData.game = response.data;
                   });
           }

           var initData = function () {
               refreshTeams();
               getCurrentGame();
              
           }

           initData();

           $scope.inningChange = function () {
               //Tell server the inningChanged
               radarMonitor.sendServerCommand("gameChange", { cmd: "inningChange", data: { inning: $scope.commonData.game.inning } });
           }

           $scope.inningPositionChange = function () {
               //Tell server the inningPositionChanged
               radarMonitor.sendServerCommand("gameChange", { cmd: "inningPositionChange", data: { inningPosition: $scope.commonData.game.inningPosition } });
           }

           $scope.homeScoreChange = function () {
               radarMonitor.sendServerCommand("gameChange", { cmd: "homeScoreChange", data: { score: { home: $scope.commonData.game.score.home }} });               
           }

           $scope.guestScoreChange = function () {
               radarMonitor.sendServerCommand("gameChange", { cmd: "guestScoreChange", data: { score: { guest: $scope.commonData.game.score.guest } } });
           }

           $scope.outsChange = function () {
               radarMonitor.sendServerCommand("gameChange", { cmd: "outsChange", data: { outs:  $scope.commonData.game.outs } });
           }

           $scope.ballsChange = function () {
               radarMonitor.sendServerCommand("gameChange", { cmd: "ballsChange", data: { balls: $scope.commonData.game.balls } });
           }

           $scope.strikesChange = function () {
               radarMonitor.sendServerCommand("gameChange", { cmd: "strikesChange", data: { strikes: $scope.commonData.game.strikes } });
           }

           $rootScope.$on('gameChanged', function (event, message) {
               // use the data accordingly
               console.log('gameChanged', message);
               switch (message.cmd) {
                   case "inningChanged":
                       $scope.commonData.game.inning = message.data.inning;
                       break;
                   case "inningPositionChanged":
                       $scope.commonData.game.inningPosition = message.data.inningPosition;
                       if ($scope.commonData.game.inningPosition === "top") {
                           $scope.commonData.batters = $scope.commonData.game.guest.team.roster;
                           $scope.commonData.pitchers = $scope.commonData.game.home.team.roster;
                           $scope.commonData.pitcher = null;
                           $scope.commonData.batter = null;
                       } else {
                           $scope.commonData.batters = $scope.commonData.game.home.team.roster;
                           $scope.commonData.pitchers = $scope.commonData.game.guest.team.roster;
                           $scope.commonData.pitcher = null;
                           $scope.commonData.batter = null;
                       }
                       break;
                   case "homeScoreChanged":
                       $scope.commonData.game.score.home = message.data.score.home;
                       break;
                   case "guestScoreChanged":
                       $scope.commonData.game.score.guest = message.data.score.guest;
                       break;
                   case "outsChanged":
                       $scope.commonData.game.outs = message.data.outs;
                       break;
                   case "ballsChanged":
                       $scope.commonData.game.balls = message.data.balls;
                       break;
                   case "strikesChanged":
                       $scope.commonData.game.strikes = message.data.strikes;
                       break;
               }
               $scope.$apply();
           });


           $rootScope.$on('serverCommand', function (event, data) {
               // use the data accordingly
               console.log('radarMonitor:reconnect detected');
               $scope.commonData.isConnected = true;
               $scope.$apply();
           });


            $rootScope.$on('radarMonitor:reconnect', function(event, data) {
                // use the data accordingly
                console.log('radarMonitor:reconnect detected');
                $scope.commonData.isConnected = true;
                $scope.$apply();
            });

            $rootScope.$on('radarMonitor:radarTimeout', function (event, data) {
                // use the data accordingly
                console.log('radarMonitor:radarTimeout detected');
                $scope.commonData.lastSpeedDataTimestamp = data.lastSpeedDataTimestamp;
                $scope.$apply();
            });

            $rootScope.$on('radarMonitor:reconnecting', function (event, data) {
                // use the data accordingly
                console.log('radarMonitor:reconnecting detected');
                $scope.commonData.isConnected = false;
                $scope.$apply();
            });
            $rootScope.$on('radarMonitor:radarConfig', function(event, data) {
                // use the data accordingly
                
                console.log('radarMonitor:radarConfig detected');
                console.debug(data);
                $scope.commonData.radarConfig = data;
                if ($scope.commonData.radarConfig.TransmiterControl.value === 0) {
                    $scope.showRadarOffModal();
                }
                if ($scope.commonData.radarConfig.ProductID.value === 'Radar Emulator') {
                    $scope.commonData.isRadarEmulator = true;
                }
                $scope.$apply();
            });

            $rootScope.$on('radarMonitor:softwareConfig', function (event, data) {
                // use the data accordingly

                console.log('radarMonitor:softwareConfig detected');
                console.debug(data);
                $scope.commonData.softwareConfig = data;
                $scope.$apply();
            });
            var radarOffModalInstance = null;

            $scope.radarEmulatorSend = function () {
                radarMonitor.sendRadarEmulatorCommand('radarEmulatorSpeed', $scope.commonData.radarEmulator.data); 
            }

            $scope.showRadarOffModal = function () {
                if (radarOffModalInstance == null) {
                    radarOffModalInstance = $uibModal.open({
                        animation: $scope.animationsEnabled,
                        templateUrl: '/app/scoreboard/radarOffModal.html',
                        controller: function ($scope) {
                            $scope.turnRadarOn = function () {
                                $scope.$close({ turnOn: true });
                            };
                        },
                        controllerAs: '$ctrl',

                        resolve: {
                            item: function () {
                                return { turnOn: true };
                            }
                        }
                    });

                    radarOffModalInstance.result.then(function (selectedItem) {
                        if (selectedItem) {
                            $scope.radarCommand('TransmiterControl', 1);
                        }
                    }, function () {
                        $log.info('Modal dismissed at: ' + new Date());
                        $scope.radarCommand('TransmiterControl', 1);
                    });
                } else {
                    //radarOffModalInstance.show();
                }
            }

            $rootScope.$on('radarMonitor:radarConfigProperty', function(event, data) {
                // use the data accordingly
                
                console.log('radarMonitor:radarConfigProperty detected ' + data.Property + ' ' + data.data);
                console.debug(data);
                $scope.commonData.radarConfig[data.Property].value = data.data;
                //Handle Radar Off Pop the Dialog
                if (data.Property == "TransmiterControl") {
                    if (data.data == 0) {
                        $scope.showRadarOffModal();
                    } else {
                       // $('#radarOffDialog').modal('hide')
                        //$uibModalStack.dismissAll();
                        if (radarOffModalInstance) {
                            radarOffModalInstance.dismiss();
                            radarOffModalInstance = null;
                        }
                    }
                }
                $scope.$apply();
            });

            $rootScope.$on('radarMonitor:softwareConfigProperty', function (event, data) {
                // use the data accordingly
                //console.log('radarMonitor:softwareConfigProperty detected ' + data.Property + ' ' + data.data);
                console.debug('radarMonitor:softwareConfigProperty detected ', data);
                $scope.commonData.softwareConfig[data.Property].value = data.data;
                $scope.$apply();
            });

           $rootScope.$on('radarMonitor:batter', function (event, data) {
               // use the data accordingly
               //console.log('radarMonitor:softwareConfigProperty detected ' + data.Property + ' ' + data.data);
               console.debug('radarMonitor:batter detected ', data);
               $scope.commonData.batter = data.data;
               $scope.$apply();
           });

           $rootScope.$on('radarMonitor:pitcher', function (event, data) {
               // use the data accordingly
               //console.log('radarMonitor:softwareConfigProperty detected ' + data.Property + ' ' + data.data);
               console.debug('radarMonitor:pitcher detected ', data);
               $scope.commonData.pitcher = data.data;
               $scope.$apply();
           });

            $rootScope.$on('radarMonitor:radarSpeedDataHistory', function(event, data) {
                // use the data accordingly
                //console.log('radarMonitor:radarSpeedDataHistory detected ');
                console.debug(data);
                $scope.commonData.radarSpeedDataHistory = data;
                $scope.$apply();
            });
            

            $rootScope.$on('radarMonitor:radarSpeed', function(event, data) {
                // use the data accordingly
                //console.log('radarMonitor:radarSpeed detected scoreboardController l:' + data.liveSpeed + ' p:' + data.peakSpeed + ' h:' + data.hitSpeed);
                console.debug(data);
                $scope.commonData.radarSpeedData = data;
                var datacopy = angular.copy(data);
                //if (data.liveSpeed > 0 || data.peakSpeed > 0) {
                //$scope.commonData.radarSpeedDataHistory.push(datacopy);
                //$scope.commonData.radarSpeedDataHistory.splice(0, 0, datacopy);
                $scope.commonData.radarSpeedDataHistory.unshift(datacopy);
                //}
                if ($scope.commonData.radarSpeedDataHistory.length > $scope.commonData.softwareConfig.radarSpeedHistoryCount) {
                    $scope.commonData.radarSpeedDataHistory.pop();
                }
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
                radarMonitor.sendRadarConfigCommand(cmd,data); 
            }

            $scope.updateRadarConfig = function(){
                $scope.commonData.isradarCommandPending = true;
                for (var key in $scope.commonData.radarConfig){
                    var radarConfigProperty = $scope.commonData.radarConfig[key];
                    if (radarConfigProperty.isDirty === true){
                        radarConfigProperty.isDirty = false;
                        $scope.radarCommand(key,radarConfigProperty.value);
                    }
                }
                $scope.commonData.isradarCommandPending = false;
            }


           $scope.refreshTeams = function () {
               refreshTeams();
           }
           
           $scope.homeTeamDeletePlayer = function (index, player) {
               $scope.commonData.game.home.team.roster.splice(index, 1);
               //$scope.$apply();
           }

           $scope.homeTeamAddPlayer = function () {
               
               $scope.commonData.game.home.team.roster.push(angular.copy($scope.commonData.emptyPlayer))
           }

           $scope.homeTeamSave = function () {
               if ($scope.commonData.game.home.team.id === '00000000-0000-0000-0000-000000000000' ) {
                   $scope.commonData.game.home.team.id = null;
               }
               $http.put('/data/team', $scope.commonData.game.home.team).
                   then(function (response) {
                       //$scope.commonData.teams = response.data;
                   });
                
           }


           $scope.gameEdit = function () {
               $scope.commonData.gameEdit = true;
               
           }

           $scope.guestTeamDeletePlayer = function (index, player) {
               $scope.commonData.game.guest.team.roster.splice(index, 1);
               
           }

           $scope.guestTeamAddPlayer = function () {
               $scope.commonData.game.guest.team.roster.push(angular.copy($scope.commonData.emptyPlayer))
           }

           $scope.guestTeamEdit = function () {
               $scope.commonData.guestTeamEdit = true;
           }

           $scope.homeTeamEdit = function () {
               $scope.commonData.homeTeamEdit = true;
           }

           $scope.homeTeamLoad = function () {
               
               $scope.commonData.game.home.team = $scope.commonData.selectedHomeTeam;
               $scope.commonData.homeTeamEdit = false;
           }

           $scope.guestTeamLoad = function () {

               $scope.commonData.game.guest.team = $scope.commonData.selectedGuestTeam;
               $scope.commonData.guestTeamEdit = false;
           }
           

            //$scope.playerShow = function () {
                
            //    $scope.commonData.showPlayer = !$scope.commonData.showPlayer;
            //}

            //$scope.playerShowDone = function() {
            //    $scope.commonData.showPlayer = false;
            //}
            //$scope.playerEdit = function () {
            //    $scope.commonData.showPlayerEdit = true;
            //}
            //$scope.playerEditCancel = function () {
            //    $scope.commonData.showPlayerEdit = false;
            //}

            //$scope.playerEditSave = function () {
            //    $scope.commonData.showPlayerEdit = false;
            //}

            //$scope.teamShow = function () {

            //    $scope.commonData.showTeam = !$scope.commonData.showTeam;
            //}

            //$scope.teamShowDone = function() {
            //    $scope.commonData.showPlayer = true;
            //}
            //$scope.teamEdit = function () {
            //    $scope.commonData.showTeamEdit = true;
            //}
            //$scope.teamEditCancel = function () {
            //    $scope.commonData.showTeamEdit = false;
            //}

            //$scope.teamEditSave = function () {
            //    $scope.commonData.showTeamEdit = false;
            //}

            $scope.showConfig = function () {
                $scope.commonData.showConfig = !$scope.commonData.showConfig;
            }

            $rootScope.$on('radarMonitor:gpsPosition', function (event, data) {
                $scope.commonData.gpsPosition = data;
                
                if (googleMapInited === true && $scope.common.googleMapInited === false) {
                    $scope.commonData.googleMap.alpha = 0.4;
                    $scope.commonData.googleMap.state = { lat: data.lat, lng: data.lon };

                    $scope.commonData.googleMap.map = new google.maps.Map(document.getElementById('googleMap'), {
                        center: $scope.commonData.googleMap.state,
                        zoom: 15
                    });

                    $scope.commonData.googleMap.marker = new google.maps.Marker({
                        position: $scope.commonData.googleMap.state,
                        map: $scope.commonData.googleMap.map,
                        title: 'Live Position'
                    });
                    $scope.common.googleMap.inited = true;
                }
                if ($scope.common.googleMap.inited == true) {
                    console.log('radarMonitor:gpsPosition ' + data);
                    console.debug(data);
                    if (data.lat === null || data.lon === null) {
                        return;
                    }

                    if ($scope.common.googleMap.state.lat === 0 && $scope.common.googleMap.state.lng === 0) {
                        $scope.common.googleMap.state.lat = data.lat;
                        $scope.common.googleMap.state.lng = data.lon;
                    } else {
                        $scope.common.googleMap.state.lat = (1 - $scope.commonData.googleMap.alpha) * $scope.common.googleMap.state.lat + alpha * data.lat;
                        $scope.common.googleMap.state.lng = (1 - $scope.commonData.googleMap.alpha) * $scope.common.googleMap.state.lng + alpha * data.lon;
                    }

                    $scope.common.googleMap.map.setCenter($scope.common.googleMap.state);
                    $scope.common.googleMap.marker.setPosition($scope.common.googleMap.state);
                }
                //$scope.commonData.gpsPosition = data;
                $scope.$apply();
            });
            
          }
       ]);
})();