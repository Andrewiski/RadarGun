﻿(function () {
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
               serverInfo :{
                version: "0.0.0", 
               },
               activeTabIndex : 1,
               emptyPlayer: { "firstName": "", "lastName": "", "jerseyNumber": "" },
               emptyLineup: { player: null, fieldingPosition: "99" },
               teams: [],
               pitchers: null,
               batters: null,
               walkupFiles: null,
               fullSongFiles: null,
               videoFiles: null,
               isGameAdmin: false,
               isGameSelect: false,
               isGameSelected: false,
               isGameEdit: false,
               isSelectTeam: true,
               isTeamEdit: false,
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
               serverLogsSubscribe: {timer:null,appLogLevels:null},
               practiceMode: {
                selectedTeam: null,
                selectedPitcher: null,
                selectedBatter: null
               },
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
               ],
               videoStreams: {
                teamName: "Vicksburg Bulldogs Varsity",
                opponentTeamName: "Andy Test Team",
                youtubeRtspUrl:"rtsp://10.100.34.112:554/s0",
                youtubeRtmpUrl: "rtmp://a.rtmp.youtube.com/live2/-d657-4j03-9ema-9m1r",
                gamechangerRtspUrl:"rtsp://10.100.34.112:554/s2",
                gamechangerRtmpUrl: "rtmps://601c62c19c9e.global-contribute.live-video.net:443/app/",
                fileRtspUrl:"rtsp://10.100.34.112:554/s0",
               },
               videoStreamStats: {
                youtube: {},
                gamechanger: {},
                file: {}
               }
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

        
        var updateVideoStreamSettings = function (data) {
            try{
                //extend($scope.commonData.videoStreams, data);
                $scope.commonData.videoStreams.teamName = data.teamName; 
                $scope.commonData.videoStreams.opponentTeamName, data.opponentTeamName; 
                $scope.commonData.videoStreams.youtubeRtmpUrl = data.youtubeRtmpUrl; 
                $scope.commonData.videoStreams.youtubeRtspUrl = data.youtubeRtspUrl; 
                $scope.commonData.videoStreams.gamechangerRtmpUrl = data.gamechangerRtmpUrl; 
                $scope.commonData.videoStreams.gamechangerRtspUrl = data.gamechangerRtspUrl; 
                $scope.commonData.videoStreams.fileRtspUrl = data.fileRtspUrl; 
            }catch(ex){
                console.log("error", "updateVideoStreamSettings",  ex.message, ex.stack);
            }
        }

        var refreshVideoStreamSettings = function () {
            return $http.get('/data/settings/videostreams').
                then(function (response) {
                    updateVideoStreamSettings(response.data);
                });
        }

        var refreshWalkupFiles = function () {
            return $http.get('/data/audioFiles/walkup').
                then(function (response) {
                    $scope.commonData.walkupFiles = response.data;
                });
        }

        var refreshFullSongFiles = function () {
        return $http.get('/data/audioFiles/fullSongs').
            then(function (response) {
                $scope.commonData.fullSongFiles = response.data;
            });
        }
        var refreshVideoFiles = function () {
            return $http.get('/data/videoFiles').
                then(function (response) {
                    $scope.commonData.videoFiles = response.data;
                });
        }
        
        var bindControls = function () {

            $("select.appLogName").on("change", function (evt) {
                var $appLogName = $(evt.target);
                var $appLogSubname = $appLogName.parent().find('select.appLogSubname');
                $appLogSubname.empty();
                $.each($scope.commonData.serverLogsSubscribe.appLogLevels[$appLogName.val()], function (appLogSubnameIndex, appLogSubname) {
                    $appLogSubname.append($('<option>', {
                        value: appLogSubnameIndex,
                        text: appLogSubnameIndex
                    }));

                })
                $appLogSubname.trigger("change");
                //onAppLogSubnameChange({ target: $appLogSubname})
            });
            $("select.appLogSubname").on("change", function (evt) {
                var $appLogSubname = $(evt.target);
                var $appLogName = $appLogSubname.parent().find('select.appLogName');
                var $appLogLevelName = $appLogSubname.parent().find('select.appLogLevelName');
                $appLogLevelName.val($scope.commonData.serverLogsSubscribe.appLogLevels[$appLogName.val()][$appLogSubname.val()]);
            });

            $("select.appLogLevelName").on("change", function (evt) {
                let $logLevelName = $(evt.target);
                let appLogName = $logLevelName.parent().find('select.appLogName').val();
                let appLogSubname = $logLevelName.parent().find("select.appLogSubname").val();
                let logLevelName = $logLevelName.val();
                if($scope.commonData.serverLogsSubscribe.appLogLevels[appLogName][appLogSubname] !== logLevelName){
                    $scope.commonData.serverLogsSubscribe.appLogLevels[appLogName][appLogSubname] = logLevelName;
                    radarMonitor.sendServerCommand("serverLogs", { "cmd": "setAppLogLevels", "data": {"appLogLevels": $scope.commonData.serverLogsSubscribe.appLogLevels} });
                }
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

        $scope.refreshFullSongFiles = function () {
            refreshFullSongFiles();
        }

        $scope.refreshVideoFiles = function () {
            refreshVideoFiles();
        }

        $scope.gameSelect = function () {
            $scope.commonData.isGameSelect = true;
        }

        var serverSubscribe = { timerID: null, type: null };    

        var resubscribeServerEvents = function () {
            console.log("resubscribeServerLogs", serverSubscribe.type);
            if (serverSubscribe.timerID && serverSubscribe.type) {
                if (radarMonitor.socket.connected){
                    radarMonitor.sendServerCommand("serverSubscribe", { "type": serverSubscribe.type, "cmd": "resubscribe" });
                }
                serverSubscribe.timerID = window.setTimeout(resubscribeServerEvents, 1 * 60 * 1000);
            }
        }
    
        var subscribeServerEvents = function (type, data) {
            console.log("subscribeServerEvent", type);
            if (serverSubscribe.timerID) {
                unsubscribeServerEvents();
            }
            radarMonitor.sendServerCommand("serverSubscribe", {"type": type, "cmd": "subscribe", data: data});
            serverSubscribe.type = type;
            serverSubscribe.timerID = window.setTimeout(resubscribeServerEvents, 1 * 60 * 1000 ); 
        }

        var unsubscribeServerEvents = function(type){
            console.log("unsubscribeServerEvents", type);
            if (serverSubscribe.timerID) {
                window.clearTimeout(serverSubscribe.timerID);
                serverSubscribe.timerID = null;
            }
            
            radarMonitor.sendServerCommand("serverSubscribe", {"type": type, "cmd": "unsubscribe"});
        }

        var getAppLogLevels = function(){
            return new Promise(function(resolve, reject) {
               
                $.ajax({
                    url: "/data/appLogLevels",
                    type: "GET"
                }).then(
                    function(data){
                        console.log("success", "getLogLevels", data);
                        $scope.commonData.serverLogsSubscribe.appLogLevels = data;
                        resolve(data);
                    },
                    function(ex){
                        console.error("error", "getLogLevels", ex);
                        reject(ex);
                    }
                );
               
            });
        };
        var getServerLogs = function(){
            return new Promise(function(resolve, reject) {
                $.ajax({
                    url: "/data/serverLogs",
                    type: "GET"
                }).then(
                    function(data){
                        console.log("success", "getLogs", data);
                        resolve(data);
                    },
                    function(ex){
                        console.error("error", "getLogs", ex);
                        reject(ex);
                    }
                );
            });
        };
        //var $logsContainer = $('.serverLogs');
        var updateServerLogs = function(logs){
            try{
                if(logs && logs.length > 0){
                    $('.serverLogs').empty();
                    $.each(logs, function(index, log){
                        addLogRow(log, $('.serverLogs'), false);
                    });
                }
            }catch(ex){
                console.error("error", "updateLogs", ex);
            }
        };

        var isObject = function (a) {
            return (!!a) && (a.constructor === Object);
        };
        var $logRowTemplate = $('.templates').find('.logTemplate').find('.logRow');
        var addLogRow = function (log, $logContainer, doFade) {
            try {
                let $logRow = $logRowTemplate.clone();
                let timestamp = moment(log.timestamp)
                //$streamerLogRow.find('.logTs').html(timestamp.format('L') + '&nbsp;' + timestamp.format('hh:mm:ss.SSS') + "&nbsp" + timestamp.format('A'));
                $logRow.find('.logTs').text(moment(log.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS'));

                $logRow.find('.logAppName').text(log.appName);
                $logRow.find('.logAppSubname').text(log.appSubname);
                $logRow.find('.logLevel').text(log.logLevel);
                //$streamerLogRow.find('.logTs').text(moment(log.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS') );
                let logLevelClass = "";
                switch (log.logLevel) {
                    case 'error':
                    case 'panic':
                    case 'fatal':
                        logLevelClass = 'danger';
                        break;
                    case 'warning':
                        logLevelClass = 'warning';
                        break;
                    case 'info':
                            logLevelClass = 'success';
                            break;
                    case 'debug':
                        logLevelClass = 'info';
                        break;
                    case 'trace':
                    case 'verbose':
                        break;
                }
                if(logLevelClass!== ""){
                    $logRow.addClass(logLevelClass);
                }
                $logRow.attr('title', log.logLevel);
                let logMessage = '';
                if (log.args) {
                    $.each(log.args, function (index, item) {
                        try {
                            if (logMessage.length > 0) {
                                logMessage = logMessage + ', ';
                            }
                            if (isObject(log.args[index])) {
                                logMessage = logMessage + JSON.stringify(log.args[index]);
                            } else {
                                if (log.args[index] === undefined) {
                                    logMessage = logMessage + 'undefined';
                                } else if (log.args[index] === null) {
                                    logMessage = logMessage + 'null';
                                }
                                else {
                                    logMessage = logMessage + log.args[index].toString();
                                }
                            }
                        } catch (ex) {
                            console.log('error', 'Error addServerLog args', ex);
                        }
                    });
                }
                $logRow.find('.logMsg').html(logMessage);
                
                if(doFade){
                    $logRow.hide();
                    $logContainer.prepend($logRow);
                    $logRow.fadeIn("slow", function () {

                    });
                }else{
                    $logContainer.prepend($logRow);
                    //$logRow.show();
                }
                if ($logContainer.length > 100) {
                    if(doFade){
                        $logContainer.last().fadeOut("slow", function () {
                            $(this).remove();
                        });
                    }else{
                        $logContainer.last().remove();
                    }
                }
            } catch (ex) {
                console.log('error', 'Error addLogRow', ex);
            }
        };

        var updateAppLogNames = function (appLogLevels) {
            try {
                var $appLogName = $('select.appLogName');
                $appLogName.empty();
                $.each(appLogLevels, function (appLogNameIndex, appLogName) {
                    $appLogName.append($('<option>', {
                        value: appLogNameIndex,
                        text: appLogNameIndex
                    }));
                })
                $appLogName.trigger("change");
                //onLogNameChange({ target: $appLogName });
            } catch (ex) {
                console.log('error', 'Error addStreamerLog', ex);
            }
        }

        $("select.appLogName").on("change", function (evt) {
            var $appLogName = $(evt.target);
            var $appLogSubname = $appLogName.parent().find('select.appLogSubname');
            $appLogSubname.empty();
            $.each($scope.commonData.serverLogsSubscribe.appLogLevels[$appLogName.val()], function (appLogSubnameIndex, appLogSubname) {
                $appLogSubname.append($('<option>', {
                    value: appLogSubnameIndex,
                    text: appLogSubnameIndex
                }));

            })
            $appLogSubname.trigger("change");
            //onAppLogSubnameChange({ target: $appLogSubname})
        });
        $("select.appLogSubname").on("change", function (evt) {
            var $appLogSubname = $(evt.target);
            var $appLogName = $appLogSubname.parent().find('select.appLogName');
            var $appLogLevelName = $appLogSubname.parent().find('select.appLogLevelName');
            $appLogLevelName.val($scope.commonData.serverLogsSubscribe.appLogLevels[$appLogName.val()][$appLogSubname.val()]);
        });

        $("select.appLogLevelName").on("change", function (evt) {

            let $logLevelName = $(evt.target);
            let appLogName = $logLevelName.parent().find('select.appLogName').val();
            let appLogSubname = $logLevelName.parent().find("select.appLogSubname").val();
            let logLevelName = $logLevelName.val();
            $scope.commonData.serverLogsSubscribe.appLogLevels[appLogName][appLogSubname] = logLevelName;
            commonData.socketIo.emit("serverLogs", {
                "cmd": "setAppLogLevels", "data": {"appLogLevels": $scope.commonData.serverLogsSubscribe.appLogLevels}
            });

        });


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

           $scope.commonData.lastTab = "radarHistory";
           
           $scope.tabClick = function(tabName) {
                console.log("tabClick", tabName);
                if(tabName === $scope.commonData.lastTab){
                    console.log("tabClick - same tab");
                    return;
                }
                if(tabName !== "videoStreams" && $scope.commonData.lastTab === "videoStreams"){
                    unsubscribeServerEvents("videoStreams");
                }
                if(tabName !== "serverLogs" && $scope.commonData.lastTab === "serverLogs"){
                    unsubscribeServerEvents("serverLogs");
                }
                switch(tabName){
                    case "walkupSongs":
                        console.log("tabWalkupSongsClick");
                        if($scope.commonData.walkupFiles === null){
                            refreshWalkupFiles();
                        }
                        break;
                    case "fullSongs":
                        console.log("tabFullSongsClick");
                        if($scope.commonData.fullSongFiles === null){
                            refreshFullSongFiles();
                        }
                        break;
                    case "playlists":
                        console.log("tabPlaylistsClick");
                        if($scope.commonData.fullSongFiles === null){
                            refreshFullSongFiles();
                        }
                        break;
                    case "videoFiles":
                        console.log("tabVideoFilesClick");
                        //if($scope.commonData.videoFiles === null){
                            refreshVideoFiles();
                        //}
                        break;
                    case "videoStreams":
                        console.log("tabVideoStreamsClick");
                        refreshVideoStreamSettings();
                        subscribeServerEvents("videoStreams");
                        break;
                    case "serverLogs":
                        console.log("tabLogsClick");
                        if($scope.commonData.serverLogsSubscribe.appLogLevels === null){
                            getAppLogLevels().then(
                                function (response) {
                                    $scope.commonData.serverLogsSubscribe.appLogLevels = response;
                                    updateAppLogNames($scope.commonData.serverLogsSubscribe.appLogLevels);
                                }
                            );
                        }
                        getServerLogs().then(
                            function (response) {
                                updateServerLogs(response);
                                subscribeServerEvents("serverLogs", {appLogLevels : $scope.commonData.serverLogsSubscribe.appLogLevels});
                            }
                        );
                        
                        break;
                    case "gameChangerWidget":
                        console.log("tabGameChangerWidgetClick");
                        break;

                }
                $scope.commonData.lastTab = tabName;
            }

            $scope.videoStreamStart = function () {
                radarMonitor.sendServerCommand("videoStream", { cmd: "start", data: $scope.commonData.videoStreams});
            }

            $scope.videoStreamStop= function () {
                radarMonitor.sendServerCommand("videoStream", { cmd: "stop" });
            }

            $scope.videoStreamYoutubeStart = function () {
                radarMonitor.sendServerCommand("videoStream", { cmd: "youtubeStart", data: $scope.commonData.videoStreams});
            }

            $scope.videoStreamYoutubeStop= function () {
                radarMonitor.sendServerCommand("videoStream", { cmd: "youtubeStop" });
            }

            $scope.videoStreamGameChangerStart = function () {
                radarMonitor.sendServerCommand("videoStream", { cmd: "gamechangerStart", data: $scope.commonData.videoStreams});
            }

            $scope.videoStreamGameChangerStop= function () {
                radarMonitor.sendServerCommand("videoStream", { cmd: "gamechangerStop" });
            }

            $scope.videoStreamFileStart = function () {            
                radarMonitor.sendServerCommand("videoStream", { cmd: "fileStart",  data: $scope.commonData.videoStreams});
            }

            $scope.videoStreamFileStop= function () {
                radarMonitor.sendServerCommand("videoStream", { cmd: "fileStop" });
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

           $scope.wildPitch = function () {
                $scope.ball();
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

           $scope.batterSafeError = function () {
                $scope.nextBatter();
           }

           $scope.batterOutMisc = function(){
                $scope.batterOut();
           }
           $scope.batterSafeFieldersChoice = function (){
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

           $scope.batterOutDoublePlay = function(){
                if ($scope.commonData.selectedGame.outs >= 1) {
                    var data = {};
                    $scope.nextBatter(data);
                    $scope.inning(data); 
                } else {
                    var data = {};
                    $scope.commonData.selectedGame.outs = 2;
                    data.outs = $scope.commonData.selectedGame.outs;
                    $scope.nextBatter(data);
                    addToGameLog(data);
                    radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
                }  
           }
           $scope.batterOutTripplePlay = function(){
                var data = {};
                $scope.commonData.selectedGame.outs = 3;
                data.outs = $scope.commonData.selectedGame.outs;
                $scope.nextBatter(data);
                addToGameLog(data);
                radarMonitor.sendServerCommand("gameChange", { cmd: "gameChange", data: data });
           }

           $scope.baulk = function () {
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

        //    $scope.audioFilePlay = function (audioFile) {
        //        radarMonitor.sendServerCommand("audio", { cmd: "audioFilePlay", data: { audioFile: audioFile } });
        //    }

        
            var shuffle = function (array) {
                let currentIndex = array.length,  randomIndex;
            
                // While there remain elements to shuffle.
                while (currentIndex != 0) {
            
                // Pick a remaining element.
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex--;
            
                // And swap it with the current element.
                [array[currentIndex], array[randomIndex]] = [
                    array[randomIndex], array[currentIndex]];
                }
            
                return array;
            }

            
            $scope.audioFileSaveFullSongPlaylist = function () {
                let audioFiles = [];
                $("input[name=playlistFullSong]:checked").each(function () {
                    audioFiles.push($(this).val());
                });

                if(audioFiles.length > 0 && true) {
                    shuffle(audioFiles);
                    
                }
                radarMonitor.sendServerCommand("audio", { cmd: "audioFileSaveFullSongPlaylist", data: { fileName:"playlist.txt", audioFiles: audioFiles } });
            }

            $scope.audioFilePlayFullSongPlaylist = function () {
                let shouldLoop = $("#playlistFullSongLoop").prop( "checked");
                radarMonitor.sendServerCommand("audio", { cmd: "audioFilePlayFullSongPlaylist", data: { fileName:"playlist.txt", loop: shouldLoop } });
            }


            $scope.audioFilePlayFullSong = function (audioFile) {
                radarMonitor.sendServerCommand("audio", { cmd: "audioFilePlayFullSong", data: { audioFile: audioFile } });
            }

           $scope.audioFilePlayWalkup = function (audioFile) {
               radarMonitor.sendServerCommand("audio", { cmd: "audioFilePlayWalkup", data: { audioFile: audioFile } });
           }

           $scope.audioFilePreviewFullSong = function ($event, fileName) {
                var filePath = '/data/audioFiles/fullSongs/' + fileName;
                let $audioPreviewControls = $("#audioPreviewControls");
                $($event.currentTarget).parent().find(".previewControl").append($audioPreviewControls);
                $audioPreviewControls.attr("src", filePath);
                $audioPreviewControls.get(0).play();
            }

            $scope.audioFilePreviewWalkup = function ($event, fileName) {
                var filePath = '/data/audioFiles/walkup/' + fileName;
                let $audioPreviewControls = $("#audioPreviewControls");
                $($event.currentTarget).parent().find(".previewControl").append($audioPreviewControls);
                $audioPreviewControls.attr("src", filePath);
                $audioPreviewControls.get(0).play();
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

           


           // Begin Team Tab Functions

            $scope.teamDeletePlayer = function (index, player) {
                $scope.commonData.selectedTeam.roster.splice(index, 1);
                //$scope.$apply();
            }
            $scope.teamAddPlayer = function () {

                $scope.commonData.selectedTeam.roster.push(angular.copy($scope.commonData.emptyPlayer))
            }

            $scope.teamSave = function () {
                if ($scope.commonData.selectedTeam.id === '00000000-0000-0000-0000-000000000000') {
                    $scope.commonData.selectedTeam.id = null;
                }
                $http.put('/data/team', $scope.commonData.selectedTeam).
                    then(function (response) {
                        //$scope.commonData.teams = response.data;
                        $scope.commonData.isTeamEdit = false;
                    });

            }
            $scope.teamCancel = function () {
                $scope.commonData.isTeamEdit = false;
            }

            $scope.teamDelete = function () {
                if ($scope.commonData.selectedTeam.id !== '00000000-0000-0000-0000-000000000000') {
                    $http.delete('/data/team/' + $scope.commonData.selectedTeam.id).
                    then(function (response) {
                        //$scope.commonData.teams = response.data;
                        $scope.commonData.selectedTeam = null;
                        refreshTeams();
                        $scope.commonData.isTeamEdit = false;
                        $scope.commonData.isTeamSelect = true;
                    });    
                }
                
                
            }

            $scope.teamEdit = function () {
                $scope.commonData.isTeamEdit = true;
                if ($scope.commonData.walkupFiles === null) {
                    refreshWalkupFiles();
                }
            }
 
            
            $scope.teamSelectCancel = function(){
                $scope.commonData.isSelectTeam = false;
            }

            $scope.practiceModePitcherSelected = function () {
                radarMonitor.sendServerCommand("practiceMode", { "cmd": "pitcher", "data": {"pitcher": $scope.commonData.practiceMode.selectedPitcher} });
            }
            $scope.practiceModeBatterSelected = function () {
                radarMonitor.sendServerCommand("practiceMode", { "cmd": "batter", "data": {"batter": $scope.commonData.practiceMode.selectedBatter} });
            }
            $scope.practiceModePitcherClear = function () {
                $scope.commonData.practiceMode.selectedPitcher = null;
                $scope.practiceModePitcherSelected();
            }
            $scope.practiceModeBatterClear = function () {
                $scope.commonData.practiceMode.selectedBatter = null;
                $scope.practiceModeBatterSelected();
            }

            $scope.teamSelected = function () {
                if ($scope.commonData.selectedTeam && $scope.commonData.selectedTeam.id === '00000000-0000-0000-0000-000000000000') {
                //if ($scope.commonData.selectedTeamId && $scope.commonData.selectedTeamId === '00000000-0000-0000-0000-000000000000') {

                    //this is a new Team
                    $scope.commonData.selectedTeam = JSON.parse(JSON.stringify($scope.commonData.selectedTeam));
                    $scope.commonData.selectedTeam.id = radarMonitor.uuid();
                    $scope.commonData.selectedTeam.name = "";
                    if ($scope.commonData.selectedTeam.roster === undefined) {
                        $scope.commonData.selectedTeam.roster = [];
                    }
                    for (var i = 0; i < 15; i++) {
                        $scope.commonData.selectedTeam.roster.push(angular.copy($scope.commonData.emptyPlayer))
                    }
                    $scope.commonData.isTeamEdit = true;
                } else {
                    //$scope.commonData.selectedTeam = $scope.commonData.selectedTeam;
                }
 
                $scope.commonData.isSelectTeam = false;
            }
 
            $scope.teamSelect = function () {
                if ($scope.commonData.walkupFiles === null) {
                    refreshWalkupFiles();
                }
                $scope.commonData.isSelectTeam = true;
 
            }

            // End Team Tab Functions
           var findPitcher = function(lineup){
               let pitcher = null;
               for (var i = 0; i < lineup.length; i++) {
                   if (lineup[i].fieldingPosition === "1" || lineup[i].fieldingPosition === 1) {
                       pitcher = lineup[i];
                       break;
                   } else {
                       if (lineup[i].fieldingPosition === "11" || lineup[i].fieldingPosition === 11) {
                           if (lineup[i].dh && (lineup[i].dh.fieldingPosition === "1" || lineup[i].dh.fieldingPosition === 1)) {
                               pitcher = lineup[i].dh;
                               //pitcher = lineup[i];
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

        //    $scope.getPlayerDefensePosition = function (lineup){
        //         if (lineup.fieldingPosition === "11" || lineup.fieldingPosition === 11) {
        //             return lineup.dhPlayer;
                    
        //         }else{

        //         }
        //         return "";
        //     }

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
                       if (message.data) {
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


           $rootScope.$on('practiceMode', function (event, message) {
            // use the data accordingly
                console.log('practiceMode detected');
                switch(message.cmd){
                    case "pitcher":
                        $scope.commonData.pitcher = message.data.pitcher;
                        break;
                    case "batter":
                        $scope.commonData.batter = message.data.batter;
                        break;
                }
            });

           $rootScope.$on('serverLogs', function (event, message) {
            // use the data accordingly
                console.log('serverLogs detected');
                addLogRow(message.data, $('.serverLogs'), true);
            });

           $rootScope.$on('serverCommand', function (event, message) {
               // use the data accordingly
               console.log('radarMonitor:serverCommand detected');
               $scope.$apply();
           });

            $rootScope.$on('radarMonitor:connect', function(event, message) {
                // use the data accordingly
                console.log('radarMonitor:connect detected');
                $scope.commonData.isConnected = true;
                $scope.$apply();
            });

            $rootScope.$on('radarMonitor:disconnect', function(event, data) {
                // use the data accordingly
                console.log('radarMonitor:reconnect detected');
                $scope.commonData.isConnected = false;
                $scope.$apply();
            });

            $rootScope.$on('radarMonitor:reconnect', function(event, data) {
                // use the data accordingly
                console.log('radarMonitor:reconnect detected');
                //$scope.commonData.isConnected = true;
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


            // $scope.showConfirmDeleteModal = function () {
            //     if (radarOffModalInstance === null) {
            //         radarOffModalInstance = $uibModal.open({
            //             animation: $scope.animationsEnabled,
            //             templateUrl: '/app/scoreboard/radarOffModal.html',
            //             controller: function ($scope) {
            //                 $scope.turnRadarOn = function () {
            //                     $scope.$close({ turnOn: true });
            //                 };
            //             },
            //             controllerAs: '$ctrl',

            //             resolve: {
            //                 item: function () {
            //                     return { turnOn: true };
            //                 }
            //             }
            //         });

            //         radarOffModalInstance.result.then(function (selectedItem) {
            //             if (selectedItem) {
            //                 $scope.radarCommand('TransmiterControl', 1);
            //             }
            //         }, function () {
            //             $log.info('Modal dismissed at: ' + new Date());
            //             $scope.radarCommand('TransmiterControl', 1);
            //         });
            //     } else {
            //         //radarOffModalInstance.show();
            //     }
            // }

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


           $rootScope.$on('videoStreams', function(event, message) {
                
                //console.debug("videoStreams", data);
                switch(message.cmd){
                    case "updateSettings":
                        updateVideoStreamSettings(message.data);
                        break;
                    case "allStreamStats":
                        //$.extend($scope.commonData.videoStreamStats.youtube, message.data);
                        $scope.commonData.videoStreamStats = message.data;
                        $scope.$apply();
                        break;    
                    case "youtubeStreamStats":
                        //$.extend($scope.commonData.videoStreamStats.youtube, message.data);
                        $scope.commonData.videoStreamStats.youtube = message.data;
                        $scope.$apply();
                        break;
                    case "gamechangerStreamStats":
                        $scope.commonData.videoStreamStats.gamechanger = message.data;
                        $scope.$apply();
                        break;
                    case "fileStreamStats":
                        $scope.commonData.videoStreamStats.file = message.data;
                        $scope.$apply();
                        break;
                }
                //$scope.$apply();
            });


            $rootScope.$on('radarMonitor:radarSpeedDataHistory', function(event, data) {
                console.debug('radarMonitor:radarSpeedDataHistory', data);
                $scope.commonData.radarSpeedDataHistory = data;
                $scope.$apply();
            });
            

            $rootScope.$on('radarMonitor:radarSpeed', function(event, data) {
                
                console.debug('radarMonitor:radarSpeed', data);
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
            $rootScope.$on('serverInfo', function(event, data) {
                //console.log('radarMonitor:serverInfo ' + data);
                
                $scope.commonData.serverInfo = data;
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

           $scope.resetRadarSettings = function () {
               radarMonitor.sendResetRadarSettings();
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
           $(function(){
            bindControls();
           });
          }
       ]);
})();