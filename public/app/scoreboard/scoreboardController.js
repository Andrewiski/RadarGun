(function () {
   'use strict';

    angular.module('scoreboardapp')

        .filter('uniquePlayer', function () {
            return function (allPlayers, selectedPlayersIndex,  selectedPlayers, selectedPlayersPlayerProperty, allPlayersPlayerProperty) {
                if (allPlayers && Array.isArray(allPlayers) === true && Array.isArray(selectedPlayers) === true) {
                    var filtered = [];
                    
                    angular.forEach(allPlayers, function (allItem) {
                        var playerFound = false;
                        for (var i = 0; i < selectedPlayers.length; i++) {
                            let selectedItem = selectedPlayers[i];
                            let selectedPlayer = null;
                            if (selectedPlayersPlayerProperty) {
                                selectedPlayer = selectedItem[selectedPlayersPlayerProperty];
                            } else {
                                selectedPlayer = selectedItem;
                            }
                            let allPlayer = null;
                            if (allPlayersPlayerProperty) {
                                allPlayer = allItem[allPlayersPlayerProperty];
                            } else {
                                allPlayer = allItem;
                            }
                            if (selectedPlayer && allPlayer && i !== selectedPlayersIndex) {
                                if (selectedPlayer.jerseyNumber === allPlayer.jerseyNumber && selectedPlayer.firstName === allPlayer.firstName && selectedPlayer.lastName === allPlayer.lastName) {
                                    playerFound = true;  
                                    
                                    break;
                                }
                            }
                        }
                        if (playerFound === false) {
                            filtered.push(allItem);
                        }
                    });

                    return filtered;

                } else {
                    return allPlayers;
                }
            }
        })

        .filter('uniqueLineupPosition', function () {
            return function (allPositions, selectedPlayersIndex, selectedPlayers) {
                if (allPositions && Array.isArray(allPositions) === true && Array.isArray(selectedPlayers) === true) {
                    var filtered = [];

                    angular.forEach(allPositions, function (allPosition) {
                        var positionFound = false;
                        if (allPosition.value !== "99" && allPosition.value !== "12") {  // always add bench 99  Position  and EH 12 as can have multple EH if batting open
                            for (var i = 0; i < selectedPlayers.length; i++) {
                                let selectedPlayer = selectedPlayers[i];
                                if (selectedPlayer && i !== selectedPlayersIndex) {
                                    if (selectedPlayer.fieldingPosition === allPosition.value) {
                                        positionFound = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (positionFound === false) {
                            filtered.push(allPosition);
                        }
                    });

                    return filtered;

                } else {
                    return allPositions;
                }
            }
        })
        
       .controller('scoreboardController', ['$rootScope', '$scope', '$uibModal', '$filter', '$log', '$http', 'radarMonitor', function ($rootScope, $scope, $uibModal, $filter, $log, $http, radarMonitor) {
           $scope.commonData = {
               activeTabIndex : 1,
               emptyPlayer: { "firstName": "", "lastName": "", "jerseyNumber": "" },
               emptyLineup: { player: null, fieldingPosition: "99" },
               teams: [],
               pitchers: null,
               batters: null,
               walkupFiles: null,
               isGameAdmin: false,
               isGameSelect: false,
               isGameSelected: false,
               isGameEdit: false,
               isSelectHomeTeam: false,
               isSelectGuestTeam: false,
               isHomeTeamEdit: false,
               isGuestTeamEdit: false,
               isGameScore: false,
               selectedGame: null,
               game: null,
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
               isConnected: true,
               fieldingPositions: [
                   { name: "Bench", value: "99", longName:"Bench" },
                   { name: "1 (P)", value: "1", longName: "Pitcher" },
                   { name: "2 (C)", value: "2", longName: "Catcher" },
                   { name: "3 (1st)", value: "3", longName: "1st Base"},
                   { name: "4 (2nd)", value: "4", longName: "2nd Base"},
                   { name: "5 (3rd)", value: "5", longName: "3rd Base"},
                   { name: "6 (SS)", value: "6", longName: "Short Stop"},
                   { name: "7 (LF)", value: "7", longName: "Left Field"},
                   { name: "8 (CF)", value: "8", longName: "Center Field"},
                   { name: "9 (RF)", value: "9", longName: "Right Field"},
                   { name: "11 (DH)", value: "11", longName: "Designated Hitter"},
                   { name: "12 (EH)", value: "12", longName: "Extra Hitter"},
               ]
           }


           var refreshTeams = function () {
               return $http.get('/data/teams').
                   then(function (response) {
                       $scope.commonData.teams = response.data;
                   });
           }

           var refreshGames = function () {
               return $http.get('/data/games').
                   then(function (response) {
                       $scope.commonData.games = response.data;
                   });
           }

           var getCurrentGame = function () {
               return $http.get('/data/game').
                   then(function (response) {
                       $scope.commonData.game = response.data;
                   });
           }

           var refreshWalkupFiles = function () {
               return $http.get('/data/audioFiles/walkup').
                   then(function (response) {
                       $scope.commonData.walkupFiles = response.data;
                   });
           }

           var initData = function () {
               refreshTeams();
               refreshGames();
               getCurrentGame().then(
                   function (response) {
                       if (window.location.hash === "#scoreGame") {
                           $scope.commonData.selectedGame = $scope.commonData.game;
                           $scope.commonData.isGameSelected = true;
                           $scope.commonData.isGameScore = true;
                           $scope.commonData.isGameAdmin = true;
                           $scope.updatePitchersBatters();
                       }
                   }
               );

               
               
           }

           var addToGameLog = function(data){
               if ($scope.commonData.selectedGame.log === undefined) {
                   $scope.commonData.selectedGame.log = [];
               }
               $scope.commonData.selectedGame.log.push({ timestamp: moment(), data: data });
           }

           $scope.refreshWalkupFiles = function () {
               refreshWalkupFiles();
           }


           $scope.gameSelect = function () {
               $scope.commonData.isGameSelect = true;
           }

           $scope.gameScore = function () {
               if ($scope.commonData.selectedGame.id === '00000000-0000-0000-0000-000000000000') {
                   $scope.commonData.selectedGame.id = null;
               }
               //$scope.commonData.game = $scope.commonData.selectedGame;
               $http.put('/data/scoreGame', $scope.commonData.selectedGame).
                   then(function (response) {
                       $scope.commonData.isGameEdit = false;
                       $scope.commonData.isGameSelected = true;
                       $scope.commonData.isGameScore = true;
                       window.location.hash="#scoreGame"
                   });

               
           }

           $scope.gameSave = function () {

               if ($scope.commonData.selectedGame.id === '00000000-0000-0000-0000-000000000000') {
                   $scope.commonData.selectedGame.id = null;
               }
               $http.put('/data/game', $scope.commonData.selectedGame).
                   then(function (response) {
                       $scope.commonData.isGameEdit = false;
                       //$scope.commonData.isGameSelect = false;
                       $scope.commonData.isGameSelected = true;
                   });
               
           }

           $scope.gameSelected = function () {
               if ($scope.commonData.selectedGame && $scope.commonData.selectedGame.id === "00000000-0000-0000-0000-000000000000") {
                   //this is a new game
                   $scope.commonData.selectedGame = JSON.parse(JSON.stringify($scope.commonData.selectedGame));
                   $scope.commonData.selectedGame.id = radarMonitor.uuid();
                   $scope.commonData.selectedGame.name = "";
                   $scope.commonData.selectedGame.startDate = moment();
                   $scope.commonData.isGameEdit = true;
                   $scope.commonData.isSelectHomeTeam = true;
                   $scope.commonData.isSelectGuestTeam = true;
                   $scope.commonData.isGameSelected = true;
                   $scope.commonData.isGameSelect = false;
               } else {
                   $http.get('/data/game/' + $scope.commonData.selectedGame.id).
                       then(function (response) {
                           $scope.commonData.selectedGame = response.data;
                           $scope.commonData.isGameEdit = false;
                           $scope.commonData.isSelectHomeTeam = false;
                           $scope.commonData.isSelectGuestTeam = false;
                           $scope.commonData.isGameSelected = true;
                           $scope.commonData.isGameSelect = false;
                       });
               }
               
               

           }

           $scope.streamStart = function () {
               //Tell server the inningChanged
               radarMonitor.sendServerCommand("stream", { cmd: "start"});
           }

           $scope.streamStop= function () {
               //Tell server the inningChanged
               radarMonitor.sendServerCommand("stream", { cmd: "stop" });
           }


           $scope.streamStartRemote = function () {
               //Tell server the inningChanged
               radarMonitor.sendServerCommand("stream", { cmd: "startRemote" });
           }

           $scope.streamStopRemote = function () {
               //Tell server the inningChanged
               radarMonitor.sendServerCommand("stream", { cmd: "stopRemote" });
           }


           $scope.batterChange = function () {
               
               let data = {};

               
               if ($scope.commonData.selectedGame.inningPosition === "top") {
                   let index = $scope.commonData.selectedGame.guest.lineup.indexOf($scope.commonData.selectedGame.batter);
                   $scope.commonData.selectedGame.guest.batterIndex = index;
                   data.guest = { batterIndex: index };
               } else {
                   let index = $scope.commonData.selectedGame.home.lineup.indexOf($scope.commonData.selectedGame.batter);
                   $scope.commonData.selectedGame.home.batterIndex = index;
                   data.home = { batterIndex: index };
               }
               data.batter = $scope.commonData.selectedGame.batter;
               addToGameLog(data);
               radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
           }

           $scope.pitcherChange = function () {
               let data = { pitcher: $scope.commonData.selectedGame.pitcher };
               addToGameLog(data );
               radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
           }

           $scope.batterOut = function () {
               
               if ($scope.commonData.selectedGame.outs >= 2) {
                   var data = {};
                   $scope.nextBatter(data);
                   $scope.inning(data); 
               } else {
                   var data = {};
                   $scope.commonData.selectedGame.outs++;
                   //$scope.commonData.selectedGame.balls = 0;
                   //$scope.commonData.selectedGame.strikes = 0;
                   data.outs = $scope.commonData.selectedGame.outs;
                   //data.strikes = 0;
                   //data.balls = 0;
                   $scope.nextBatter(data);
                   addToGameLog(data);
                   radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
               }  
           }

           $scope.runnerOut = function () {

               if ($scope.commonData.selectedGame.outs >= 2) {
                   
                   $scope.inning();
               } else {
                   var data = {};
                   $scope.commonData.selectedGame.outs++;
                   data.outs = $scope.commonData.selectedGame.outs;
                   addToGameLog(data );
                   radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
               }
           }

           $scope.ball = function () {
               
               if ($scope.commonData.selectedGame.balls >= 3) {
                   $scope.nextBatter();
               } else {
                   var data = {};
                   $scope.commonData.selectedGame.balls++;
                   data.balls = $scope.commonData.selectedGame.balls;
                   addToGameLog(data);
                   radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
               }
           }

           $scope.strike = function () {

               if ($scope.commonData.selectedGame.strikes >= 2) {
                   //$scope.nextBatter();
                   $scope.batterOut();
               } else {
                   var data = {};
                   $scope.commonData.selectedGame.strikes++;
                   data.strikes = $scope.commonData.selectedGame.strikes;
                   addToGameLog( data);
                   radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
               }
           }

           $scope.foul = function () {
               if ($scope.commonData.selectedGame.fouls === undefined) {
                   $scope.commonData.selectedGame.fouls = 0;
               }
               if ($scope.commonData.selectedGame.strikes >= 2) {
                   //tag Pitch as foul
                   var data = {};
                   $scope.commonData.selectedGame.fouls++;
                   data.fouls = $scope.commonData.selectedGame.fouls;
                   addToGameLog(data);
                   radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
               } else {
                   var data = {};
                   $scope.commonData.selectedGame.fouls++;
                   data.fouls = $scope.commonData.selectedGame.fouls;
                   $scope.commonData.selectedGame.strikes++;
                   data.strikes = $scope.commonData.selectedGame.strikes;
                   addToGameLog(data);
                   radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
               }
           }
           $scope.groundOut = function () {
               $scope.batterOut();
           }
           $scope.flyOut = function () {
               $scope.batterOut();
           }
           $scope.lineOut = function () {
               $scope.batterOut();
           }
           $scope.groundBall = function () {
               $scope.nextBatter();
           }
           $scope.flyBall = function () {
               $scope.nextBatter();
           }
           $scope.lineDrive = function () {
               $scope.nextBatter();
           }

           $scope.hitByPitch = function () {
               
               $scope.nextBatter();
           }

           $scope.nextBatter = function() {
               var data = {};
               if ($scope.commonData.selectedGame.inningPosition === "top") {
                   if ($scope.commonData.selectedGame.guest.batterIndex === undefined) {
                       $scope.commonData.selectedGame.guest.batterIndex = 0;
                   }
                   $scope.commonData.selectedGame.guest.batterIndex++;
                   if ($scope.commonData.selectedGame.guest.batterIndex >= $scope.commonData.selectedGame.guest.lineup.length) {
                       $scope.commonData.selectedGame.guest.batterIndex = 0;
                   }
                   $scope.commonData.selectedGame.batter = $scope.commonData.selectedGame.guest.lineup[$scope.commonData.selectedGame.guest.batterIndex]
                   
                   data.guest = { batterIndex: $scope.commonData.selectedGame.guest.batterIndex };
                   data.batter = $scope.commonData.selectedGame.batter;
               } else {
                   if ($scope.commonData.selectedGame.home.batterIndex === undefined) {
                       $scope.commonData.selectedGame.home.batterIndex = 0;
                   }
                   $scope.commonData.selectedGame.home.batterIndex++;
                   if ($scope.commonData.selectedGame.home.batterIndex >= $scope.commonData.selectedGame.home.lineup.length) {
                       $scope.commonData.selectedGame.home.batterIndex = 0;
                   }
                   $scope.commonData.selectedGame.batter = $scope.commonData.selectedGame.home.lineup[$scope.commonData.selectedGame.home.batterIndex]
                   data.home = { batterIndex: $scope.commonData.selectedGame.home.batterIndex };
                   data.batter = $scope.commonData.selectedGame.batter;
               }
               $scope.commonData.selectedGame.strikes = 0;
               $scope.commonData.selectedGame.balls = 0;
               data.strikes = $scope.commonData.selectedGame.strikes;
               data.balls = $scope.commonData.selectedGame.balls;
               addToGameLog(data);
               radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
           }

           $scope.inning = function () {
               //Tell server the inningChanged
               var data = {};
               if ($scope.commonData.selectedGame.inningPosition === "top") {
                   $scope.commonData.selectedGame.inningPosition = "bottom";
                   $scope.updatePitchersBatters();
                   data.inningPosition = $scope.commonData.selectedGame.inningPosition;
                   data.pitcher = $scope.commonData.selectedGame.pitcher;                   
                   data.batter = $scope.commonData.selectedGame.batter;
               } else {
                   $scope.commonData.selectedGame.inning++;
                   $scope.commonData.selectedGame.inningPosition = "top";
                   $scope.updatePitchersBatters();
                   data.inning = $scope.commonData.selectedGame.inning;
                   data.inningPosition = $scope.commonData.selectedGame.inningPosition;
                   data.pitcher = $scope.commonData.selectedGame.pitcher;
                   data.batter = $scope.commonData.selectedGame.batter;
               }

               if ($scope.commonData.selectedGame.strikes !== 0) {
                   $scope.commonData.selectedGame.strikes = 0;
                   data.strikes = $scope.commonData.selectedGame.strikes;
               }

               if ($scope.commonData.selectedGame.balls !== 0) {
                   $scope.commonData.selectedGame.balls = 0;
                   data.balls = $scope.commonData.selectedGame.balls;
               }

               if ($scope.commonData.selectedGame.outs !== 0) {
                   $scope.commonData.selectedGame.outs = 0;
                   data.outs = $scope.commonData.selectedGame.outs;
               }
               addToGameLog(data);
               radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
           }

           $scope.inningChange = function () {
               //Tell server the inningChanged
               let data = { inning: $scope.commonData.selectedGame.inning }
               addToGameLog(data);
               radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
           }

           $scope.inningPositionChange = function () {
               //Tell server the inningPositionChanged
               $scope.updatePitchersBatters();
               let data = { inningPosition: $scope.commonData.selectedGame.inningPosition, pitcher: $scope.commonData.selectedGame.pitcher, batter: $scope.commonData.selectedGame.batter }
               addToGameLog(data);
               radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
               
           }

           $scope.homeScoreChange = function () {
               let data = { score: { home: $scope.commonData.selectedGame.score.home } };
               addToGameLog(data);
               radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange",  data: data});               
           }

           $scope.audioFilePlay = function (audioFile) {
               radarMonitor.sendServerCommand("audio", { cmd: "audioFilePlay", data: { audioFile: audioFile } });
           }

           $scope.audioFilePlayWalkup = function (audioFile) {
               radarMonitor.sendServerCommand("audio", { cmd: "audioFilePlayWalkup", data: { audioFile: audioFile } });
           }

           $scope.audioFileStop = function () {
               radarMonitor.sendServerCommand("audio", { cmd: "audioFileStop", });
           }

           $scope.guestScoreChange = function () {
               let data = { score: { guest: $scope.commonData.selectedGame.score.guest } };
               addToGameLog(data);
               radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
           }

           $scope.outsChange = function () {
               let data = { outs: $scope.commonData.selectedGame.outs };
               addToGameLog(data);
               radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
           }

           $scope.ballsChange = function () {
               let data = { balls: $scope.commonData.selectedGame.balls };
               addToGameLog(data);
               radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
           }

           $scope.strikesChange = function () {
               let data = { strikes: $scope.commonData.selectedGame.strikes };
               addToGameLog(data);
               radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
           }

           $scope.refreshTeams = function () {
               refreshTeams();
           }

          
           $scope.homeLineupSub = function (index, player) {
                //make a log entry to the Substuition
               $scope.commonData.selectedGame.home.lineup[index].player = null;
               
               
           }
           $scope.homeLineupDeletePlayer = function (index, player) {
              
               $scope.commonData.selectedGame.home.lineup.splice(index, 1);
               
           }

           $scope.homeTeamDeletePlayer = function (index, player) {
               $scope.commonData.selectedGame.home.team.roster.splice(index, 1);
               //$scope.$apply();
           }


           $scope.guestLineupDeletePlayer = function (index, player) {

               $scope.commonData.selectedGame.guest.lineup.splice(index, 1);

           }

           $scope.guestTeamDeletePlayer = function (index, player) {
               $scope.commonData.selectedGame.guest.team.roster.splice(index, 1);
               //$scope.$apply();
           }

           $scope.homeTeamAddPlayer = function () {

               $scope.commonData.selectedGame.home.team.roster.push(angular.copy($scope.commonData.emptyPlayer))
           }

           $scope.homeTeamSave = function () {
               if ($scope.commonData.selectedGame.home.team.id === '00000000-0000-0000-0000-000000000000') {
                   $scope.commonData.selectedGame.home.team.id = null;
               }
               $http.put('/data/team', $scope.commonData.selectedGame.home.team).
                   then(function (response) {
                       //$scope.commonData.teams = response.data;
                       $scope.commonData.isHomeTeamEdit = false;
                   });

           }
           $scope.homeTeamCancel = function () {
               
               $scope.commonData.isHomeTeamEdit = false;
                   

           }

           $scope.guestTeamCancel = function () {

               $scope.commonData.isGuestTeamEdit = false;


           }

           var findPitcher = function(lineup){
               let pitcher = null;
               for (var i = 0; i < lineup.length; i++) {
                   if (lineup[i].fieldingPosition === "1" || lineup[i].fieldingPosition === 1) {
                       pitcher = lineup[i];
                       break;
                   } else {
                       if (lineup[i].fieldingPosition === "11" || lineup[i].fieldingPosition === 11) {
                           if (lineup[i].dhFieldingPosition === "1" || lineup[i].dhFieldingPosition === 1) {
                               pitcher = lineup[i].dhPlayer;
                               break;
                           }
                       }
                   }
                   
               }
               return pitcher;
           }

           $scope.updatePitchersBatters = function () {
               if ($scope.commonData.selectedGame.inningPosition === "top") {
                   $scope.commonData.batters = $scope.commonData.selectedGame.guest.lineup;
                   $scope.commonData.pitchers = $scope.commonData.selectedGame.home.lineup;

                   
                   $scope.commonData.selectedGame.pitcher = findPitcher($scope.commonData.selectedGame.home.lineup) ;
                   $scope.commonData.selectedGame.batter = $scope.commonData.selectedGame.guest.lineup[$scope.commonData.selectedGame.guest.batterIndex]
               } else {
                   $scope.commonData.batters = $scope.commonData.selectedGame.home.lineup;
                   $scope.commonData.pitchers = $scope.commonData.selectedGame.guest.lineup;
                   $scope.commonData.selectedGame.pitcher = findPitcher($scope.commonData.selectedGame.guest.lineup);
                   $scope.commonData.selectedGame.batter = $scope.commonData.selectedGame.home.lineup[$scope.commonData.selectedGame.home.batterIndex]
               }
           }

           $scope.guestTeamSave = function () {
               if ($scope.commonData.selectedGame.guest.team.id === '00000000-0000-0000-0000-000000000000') {
                   $scope.commonData.selectedGame.guest.team.id = null;
               }
               $http.put('/data/team', $scope.commonData.selectedGame.guest.team).
                   then(function (response) {
                       $scope.commonData.isGuestTeamEdit = false;
                   });

           }


           $scope.gameEdit = function () {
               $scope.commonData.isGameEdit = true;

           }

           $scope.guestTeamDeletePlayer = function (index, player) {
               $scope.commonData.selectedGame.guest.team.roster.splice(index, 1);

           }

           $scope.guestTeamAddPlayer = function () {
               $scope.commonData.selectedGame.guest.team.roster.push(angular.copy($scope.commonData.emptyPlayer))
           }

           $scope.guestTeamEdit = function () {
               $scope.commonData.isGuestTeamEdit = true;
               if ($scope.commonData.walkupFiles === null) {
                   refreshWalkupFiles();
               }
           }

           $scope.homeTeamEdit = function () {
               $scope.commonData.isHomeTeamEdit = true;
               if ($scope.commonData.walkupFiles === null) {
                   refreshWalkupFiles();
               }
           }

           $scope.homeTeamSelected = function () {
               if ($scope.commonData.selectedHomeTeam && $scope.commonData.selectedHomeTeam.id === '00000000-0000-0000-0000-000000000000') {
                   //this is a new Team
                   $scope.commonData.selectedGame.home.team = JSON.parse(JSON.stringify($scope.commonData.selectedHomeTeam));
                   $scope.commonData.selectedGame.home.team.id = radarMonitor.uuid();
                   $scope.commonData.selectedGame.home.team.name = "";
                   if ($scope.commonData.selectedGame.home.team.roster === undefined) {
                       $scope.commonData.selectedGame.home.team.roster = [];
                   }
                   for (var i = 0; i < 10; i++) {
                       $scope.commonData.selectedGame.home.team.roster.push(angular.copy($scope.commonData.emptyPlayer))
                   }

                   if ($scope.commonData.selectedGame.home.lineup === undefined) {
                       $scope.commonData.selectedGame.home.lineup = [];
                   }
                   for (var i = 0; i < 10; i++) {
                       $scope.commonData.selectedGame.home.lineup.push(angular.copy($scope.commonData.emptyLineup))
                   }
                   $scope.commonData.isHomeTeamEdit = true;
               } else {
                   $scope.commonData.selectedGame.home.team = $scope.commonData.selectedHomeTeam;
               }

               $scope.commonData.isSelectHomeTeam = false;
           }

           $scope.homeTeamSelect = function () {
               if ($scope.commonData.walkupFiles === null) {
                   refreshWalkupFiles();
               }
               $scope.commonData.isSelectHomeTeam = true;

           }

           $scope.guestTeamSelected = function () {

               if ($scope.commonData.selectedGuestTeam && $scope.commonData.selectedGuestTeam.id === '00000000-0000-0000-0000-000000000000') {
                   //this is a new Team
                   $scope.commonData.selectedGame.guest.team = JSON.parse(JSON.stringify($scope.commonData.selectedGuestTeam));
                   $scope.commonData.selectedGame.guest.team.id = radarMonitor.uuid();
                   $scope.commonData.selectedGame.guest.team.name = "";
                   if ($scope.commonData.selectedGame.guest.team.roster === undefined) {
                       $scope.commonData.selectedGame.guest.team.roster = [];
                   }
                   for (var i = 0; i < 10; i++) {
                       $scope.commonData.selectedGame.guest.team.roster.push(angular.copy($scope.commonData.emptyPlayer) )
                   }

                   if ($scope.commonData.selectedGame.guest.lineup === undefined) {
                       $scope.commonData.selectedGame.guest.lineup = [];
                   }
                   for (var i = 0; i < 10; i++) {
                       $scope.commonData.selectedGame.guest.lineup.push(angular.copy($scope.commonData.emptyLineup) )
                   }

                   $scope.commonData.isGuestTeamEdit = true;
               } else {
                   $scope.commonData.selectedGame.guest.team = $scope.commonData.selectedGuestTeam;
               }

               $scope.commonData.isSelectGuestTeam = false;
           }

           $scope.guestTeamSelect = function () {
               if ($scope.commonData.walkupFiles === null) {
                   refreshWalkupFiles();
               }
               $scope.commonData.isSelectGuestTeam = true;
           }

           $scope.getPlayerPositionLongName = function (position){
               for (var i = 0; i < $scope.commonData.fieldingPositions.length; i++) {
                   if ($scope.commonData.fieldingPositions[i].value === position) {
                       return $scope.commonData.fieldingPositions[i].longName;
                       
                   }
               }
               return "";
           }

           $scope.guestTeamLinupAdd = function () {
               $scope.commonData.selectedGame.guest.lineup.push(angular.copy($scope.commonData.emptyLineup) )
           }

           $scope.homeTeamLinupAdd = function () {
               $scope.commonData.selectedGame.home.lineup.push(angular.copy($scope.commonData.emptyLineup) )
           }


           $scope.showConfig = function () {
               $scope.commonData.showConfig = !$scope.commonData.showConfig;
           }

           $rootScope.$on('gameChanged', function (event, message) {
               // use the data accordingly
               console.log('gameChanged', message);
               if (!$scope.commonData.game) {
                   $scope.commonData.game = {};
               }
               switch (message.cmd) {
                   case "gameChanged":

                       if (message.data.inning !== undefined) {
                           $scope.commonData.game.inning = message.data.inning;
                       }
                       if (message.data.inningPosition !== undefined) {
                           $scope.commonData.game.inningPosition = message.data.inningPosition;
                       }

                       if (message.data.score !== undefined) {
                           if ($scope.commonData.game.score === undefined) {
                               $scope.commonData.game.score = {};
                           }
                           if (message.data.score.guest !== undefined) {
                               $scope.commonData.game.score.guest = message.data.score.guest;
                           }
                           if (message.data.score.home !== undefined) {
                               $scope.commonData.game.score.home = message.data.score.home;
                           }

                       }

                       if (message.data.outs !== undefined) {
                           $scope.commonData.game.outs = message.data.outs;
                       }
                       if (message.data.strikes !== undefined) {
                           $scope.commonData.game.strikes = message.data.strikes;
                       }
                       if (message.data.balls !== undefined) {
                           $scope.commonData.game.balls = message.data.balls;
                       }
                       if (message.data.pitcher !== undefined) {
                           $scope.commonData.game.pitcher = message.data.pitcher;
                       }
                       if (message.data.batter !== undefined) {
                           $scope.commonData.game.batter = message.data.batter;
                       }

                       if (message.data.guest !== undefined) {
                           if ($scope.commonData.game.guest === undefined) {
                               $scope.commonData.game.guest = {};
                           }
                           if (message.data.guest.team !== undefined) {
                               $scope.commonData.game.guest.team = message.data.guest.team;
                           }
                           if (message.data.guest.lineup !== undefined) {
                               $scope.commonData.game.guest.lineup = message.data.guest.lineup;
                           }
                           if (message.data.guest.batterIndex !== undefined) {
                               $scope.commonData.game.guest.batterIndex = message.data.guest.batterIndex;
                           }

                       }

                       if (message.data.home !== undefined) {
                           if ($scope.commonData.game.home === undefined) {
                               $scope.commonData.game.home = {};
                           }
                           if (message.data.home.team !== undefined) {
                               $scope.commonData.game.home.team = message.data.home.team;
                           }
                           if (message.data.home.lineup !== undefined) {
                               $scope.commonData.game.home.lineup = message.data.home.lineup;
                           }
                           if (message.data.home.batterIndex !== undefined) {
                               $scope.commonData.game.home.batterIndex = message.data.home.batterIndex;
                           }

                       }

                       break;
                   //case "homeTeamChanged":
                   //    if ($scope.commonData.isGameScore === false) {
                   //        $scope.commonData.game.home = message.data.home;
                   //    }
                   //    break;
                   //case "guestTeamChanged":
                   //    if ($scope.commonData.isGameScore === false) {
                   //        $scope.commonData.game.guest = message.data.guest;
                   //    }
                   //    break;
                   case "scoreGame":
                       if ($scope.commonData.isGameScore === false) {
                           $scope.commonData.game = message.data.game;
                           $scope.updatePitchersBatters();
                       }
                       
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
                if (radarOffModalInstance === null) {
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
                if (data.Property === "TransmiterControl") {
                    if (data.data === 0) {
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

           //$rootScope.$on('radarMonitor:batter', function (event, data) {
           //    // use the data accordingly
           //    //console.log('radarMonitor:softwareConfigProperty detected ' + data.Property + ' ' + data.data);
           //    console.debug('radarMonitor:batter detected ', data);
           //    $scope.commonData.batter = data.data;
           //    $scope.$apply();
           //});

           //$rootScope.$on('radarMonitor:pitcher', function (event, data) {
           //    // use the data accordingly
           //    //console.log('radarMonitor:softwareConfigProperty detected ' + data.Property + ' ' + data.data);
           //    console.debug('radarMonitor:pitcher detected ', data);
           //    $scope.commonData.pitcher = data.data;
           //    $scope.$apply();
           //});

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
                if ($scope.commonData.isGameScore === true) {
                    //addGameRadarData(datacopy)
                    if ($scope.commonData.selectedGame.radarSpeedData === undefined) {
                        $scope.commonData.selectedGame.radarSpeedData = [];
                    }
                    $scope.commonData.selectedGame.radarSpeedData.push(datacopy);
                }
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
                if ($scope.common.googleMap.inited === true) {
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

           initData();
          }
       ]);
})();