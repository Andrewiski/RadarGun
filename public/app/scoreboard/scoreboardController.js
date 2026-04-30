(function () {
    'use strict';

    window.App = (function ($) {

        // ── State ─────────────────────────────────────────────────────────────
        var commonData = {
            serverInfo: { version: '0.0.0' },
            activeTabName: 'radarHistory',
            emptyPlayer: { firstName: '', lastName: '', jerseyNumber: '' },
            emptyLineup: { player: null, fieldingPosition: '99' },
            teams: [],
            games: [],
            pitchers: null,
            batters: null,
            walkupFiles: null,
            fullSongFiles: null,
            playlists: null,
            editingPlaylist: null,
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
            selectedTeam: null,
            selectedHomeTeam: null,
            selectedGuestTeam: null,
            game: null,
            radarSpeedDataHistory: [],
            showRadarConfig: true,
            editRadarConfig: false,
            serverLogsSubscribe: { timer: null, appLogLevels: null },
            practiceMode: { selectedTeam: null, selectedPitcher: null, selectedBatter: null },
            radarSpeedData: {
                id: 0, time: new Date(),
                inMinSpeed: 0, inMaxSpeed: 0, outMinSpeed: 0, outMaxSpeed: 0,
                inSpeeds: [], outSpeeds: []
            },
            radarConfig: {},
            radarEmulator: { data: { in: 57.4, out: 67.8 } },
            batteryVoltage: { batteryVoltage: -0.01 },
            isradarCommandPending: false,
            showConfig: false,
            gpsPosition: null,
            isRadarEmulator: false,
            isConnected: true,
            lastSpeedDataTimestamp: null,
            softwareConfig: { radarSpeedHistoryCount: 100 },
            fieldingPositions: [
                { name: 'Bench',    value: '99', longName: 'Bench' },
                { name: '1 (P)',    value: '1',  longName: 'Pitcher' },
                { name: '2 (C)',    value: '2',  longName: 'Catcher' },
                { name: '3 (1st)', value: '3',  longName: '1st Base' },
                { name: '4 (2nd)', value: '4',  longName: '2nd Base' },
                { name: '5 (3rd)', value: '5',  longName: '3rd Base' },
                { name: '6 (SS)',  value: '6',  longName: 'Short Stop' },
                { name: '7 (LF)',  value: '7',  longName: 'Left Field' },
                { name: '8 (CF)',  value: '8',  longName: 'Center Field' },
                { name: '9 (RF)',  value: '9',  longName: 'Right Field' },
                { name: '11 (DH)', value: '11', longName: 'Designated Hitter' },
                { name: '12 (EH)', value: '12', longName: 'Extra Hitter' }
            ],
            videoStreams: {
                teamName: 'Vicksburg Bulldogs Varsity',
                opponentTeamName: 'Andy Test Team',
                youtubeRtspUrl: 'rtsp://10.100.34.112:554/s0',
                youtubeRtmpUrl: 'rtmp://a.rtmp.youtube.com/live2/-d657-4j03-9ema-9m1r',
                gamechangerRtspUrl: 'rtsp://10.100.34.112:554/s2',
                gamechangerRtmpUrl: 'rtmps://601c62c19c9e.global-contribute.live-video.net:443/app/',
                fileRtspUrl: 'rtsp://10.100.34.112:554/s0'
            },
            videoStreamStats: { youtube: {}, gamechanger: {}, file: {} }
        };

        // ── Helpers ───────────────────────────────────────────────────────────
        function escHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        function deepCopy(obj) {
            return JSON.parse(JSON.stringify(obj));
        }

        function numPadding(input, trailing, leading) {
            if (input === undefined) input = '0.0';
            var f = parseFloat(input);
            if (isNaN(f)) f = 0.0;
            var out = f.toFixed(trailing);
            while (out.length < (leading + trailing + 1)) { out = '0' + out; }
            return out;
        }

        function getPlayerPositionLongName(position) {
            for (var i = 0; i < commonData.fieldingPositions.length; i++) {
                if (commonData.fieldingPositions[i].value === position) {
                    return commonData.fieldingPositions[i].longName;
                }
            }
            return '';
        }

        function findPitcher(lineup) {
            if (!lineup) return null;
            for (var i = 0; i < lineup.length; i++) {
                if (lineup[i].fieldingPosition === '1' || lineup[i].fieldingPosition === 1) {
                    return lineup[i];
                }
                if (lineup[i].fieldingPosition === '11' || lineup[i].fieldingPosition === 11) {
                    if (lineup[i].dh && (lineup[i].dh.fieldingPosition === '1' || lineup[i].dh.fieldingPosition === 1)) {
                        return lineup[i].dh;
                    }
                }
            }
            return null;
        }

        function isPlayerUsed(lineup, player, skipIndex) {
            for (var i = 0; i < lineup.length; i++) {
                if (i === skipIndex) continue;
                var lp = lineup[i].player;
                if (lp && player &&
                    lp.jerseyNumber === player.jerseyNumber &&
                    lp.firstName === player.firstName &&
                    lp.lastName === player.lastName) {
                    return true;
                }
            }
            return false;
        }

        function isPositionUsed(lineup, posValue, skipIndex) {
            if (posValue === '99' || posValue === '12') return false;
            for (var i = 0; i < lineup.length; i++) {
                if (i === skipIndex) continue;
                if (lineup[i].fieldingPosition === posValue) return true;
            }
            return false;
        }

        function buildPlayerLabel(player) {
            if (!player) return '(none)';
            return '#' + escHtml(player.jerseyNumber) + ' ' + escHtml(player.firstName) + ' ' + escHtml(player.lastName);
        }

        function buildLineupLabel(lineupEntry) {
            if (!lineupEntry || !lineupEntry.player) return '(none)';
            return buildPlayerLabel(lineupEntry.player) + ' - ' + getPlayerPositionLongName(lineupEntry.fieldingPosition);
        }

        // ── HTTP data ─────────────────────────────────────────────────────────
        function refreshTeams() {
            return $.ajax({ url: '/data/teams', type: 'GET' }).then(function (data) {
                commonData.teams = data;
                renderTeamsSelect();
                renderHomeTeamSelect();
                renderGuestTeamSelect();
                renderPracticeModeTab();
            });
        }

        function refreshGames() {
            return $.ajax({ url: '/data/games', type: 'GET' }).then(function (data) {
                commonData.games = data;
                renderGameSelect();
            });
        }

        function getCurrentGame() {
            return $.ajax({ url: '/data/game', type: 'GET' }).then(function (data) {
                commonData.game = data;
                renderGameDisplay();
            });
        }

        function refreshWalkupFiles() {
            return $.ajax({ url: '/data/audioFiles/walkup', type: 'GET' }).then(function (data) {
                commonData.walkupFiles = data;
                renderWalkupSongsTab();
            });
        }

        function refreshFullSongFiles() {
            return $.ajax({ url: '/data/audioFiles/fullSongs', type: 'GET' }).then(function (data) {
                commonData.fullSongFiles = data;
                renderFullSongsTab();
                renderPlaylistsTab();
            });
        }

        function refreshVideoFiles() {
            return $.ajax({ url: '/data/videoFiles', type: 'GET' }).then(function (data) {
                commonData.videoFiles = data;
                renderVideoFilesTab();
            });
        }

        function updateVideoStreamSettings(data) {
            try {
                if (data.teamName !== undefined)           commonData.videoStreams.teamName = data.teamName;
                if (data.opponentTeamName !== undefined)   commonData.videoStreams.opponentTeamName = data.opponentTeamName;
                if (data.youtubeRtmpUrl !== undefined)     commonData.videoStreams.youtubeRtmpUrl = data.youtubeRtmpUrl;
                if (data.youtubeRtspUrl !== undefined)     commonData.videoStreams.youtubeRtspUrl = data.youtubeRtspUrl;
                if (data.gamechangerRtmpUrl !== undefined) commonData.videoStreams.gamechangerRtmpUrl = data.gamechangerRtmpUrl;
                if (data.gamechangerRtspUrl !== undefined) commonData.videoStreams.gamechangerRtspUrl = data.gamechangerRtspUrl;
                if (data.fileRtspUrl !== undefined)        commonData.videoStreams.fileRtspUrl = data.fileRtspUrl;
                renderVideoStreamsTab();
            } catch (ex) {
                console.log('error', 'updateVideoStreamSettings', ex.message);
            }
        }

        function refreshVideoStreamSettings() {
            return $.ajax({ url: '/data/settings/videostreams', type: 'GET' }).then(function (data) {
                updateVideoStreamSettings(data);
            });
        }

        function getAppLogLevels() {
            return $.ajax({ url: '/data/appLogLevels', type: 'GET' }).then(function (data) {
                commonData.serverLogsSubscribe.appLogLevels = data;
                updateAppLogNames(data);
                return data;
            });
        }

        function getServerLogs() {
            return $.ajax({ url: '/data/serverLogs', type: 'GET' });
        }

        // ── Server subscribe ──────────────────────────────────────────────────
        var serverSubscribe = { timerID: null, type: null };

        function resubscribeServerEvents() {
            if (serverSubscribe.timerID && serverSubscribe.type) {
                if (radarMonitor.socket.connected) {
                    radarMonitor.sendServerCommand('serverSubscribe', { type: serverSubscribe.type, cmd: 'resubscribe' });
                }
                serverSubscribe.timerID = window.setTimeout(resubscribeServerEvents, 60000);
            }
        }

        function subscribeServerEvents(type, data) {
            if (serverSubscribe.timerID) unsubscribeServerEvents(serverSubscribe.type);
            radarMonitor.sendServerCommand('serverSubscribe', { type: type, cmd: 'subscribe', data: data });
            serverSubscribe.type = type;
            serverSubscribe.timerID = window.setTimeout(resubscribeServerEvents, 60000);
        }

        function unsubscribeServerEvents(type) {
            if (serverSubscribe.timerID) {
                window.clearTimeout(serverSubscribe.timerID);
                serverSubscribe.timerID = null;
            }
            radarMonitor.sendServerCommand('serverSubscribe', { type: type, cmd: 'unsubscribe' });
        }

        // ── Server log DOM helpers (largely preserved from original) ──────────
        var $logRowTemplate = null;

        function isObject(a) { return (!!a) && (a.constructor === Object); }

        function addLogRow(log, $logContainer, doFade) {
            try {
                if (!$logRowTemplate) {
                    $logRowTemplate = $('.templates').find('.logTemplate').find('.logRow');
                }
                var $logRow = $logRowTemplate.clone();
                $logRow.find('.logTs').text(moment(log.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS'));
                $logRow.find('.logAppName').text(log.appName);
                $logRow.find('.logAppSubname').text(log.appSubname);
                $logRow.find('.logLevel').text(log.logLevel);

                var logLevelClass = '';
                switch (log.logLevel) {
                    case 'error': case 'panic': case 'fatal': logLevelClass = 'danger'; break;
                    case 'warning': logLevelClass = 'warning'; break;
                    case 'info':    logLevelClass = 'success'; break;
                    case 'debug':   logLevelClass = 'info'; break;
                }
                if (logLevelClass) $logRow.addClass(logLevelClass);
                $logRow.attr('title', log.logLevel);

                var logMessage = '';
                if (log.args) {
                    $.each(log.args, function (index, item) {
                        try {
                            if (logMessage.length > 0) logMessage += ', ';
                            if (isObject(item))           logMessage += JSON.stringify(item);
                            else if (item === undefined)  logMessage += 'undefined';
                            else if (item === null)       logMessage += 'null';
                            else                          logMessage += item.toString();
                        } catch (ex) { console.log('error', 'addLogRow args', ex); }
                    });
                }
                $logRow.find('.logMsg').html(logMessage);

                if (doFade) {
                    $logRow.hide();
                    $logContainer.prepend($logRow);
                    $logRow.fadeIn('slow');
                } else {
                    $logContainer.prepend($logRow);
                }
                if ($logContainer.children().length > 100) {
                    if (doFade) { $logContainer.children().last().fadeOut('slow', function () { $(this).remove(); }); }
                    else        { $logContainer.children().last().remove(); }
                }
            } catch (ex) { console.log('error', 'addLogRow', ex); }
        }

        function updateServerLogs(logs) {
            try {
                if (logs && logs.length > 0) {
                    var $c = $('.serverLogs').empty();
                    $.each(logs, function (i, log) { addLogRow(log, $c, false); });
                }
            } catch (ex) { console.error('error', 'updateServerLogs', ex); }
        }

        function updateAppLogNames(appLogLevels) {
            try {
                var $sel = $('select.appLogName').empty();
                $.each(appLogLevels, function (name) {
                    $sel.append($('<option>', { value: name, text: name }));
                });
                $sel.trigger('change');
            } catch (ex) { console.log('error', 'updateAppLogNames', ex); }
        }

        // ── Render helpers ────────────────────────────────────────────────────
        function buildTeamOptions(teams, selectedId) {
            var html = '<option value="">Select team...</option>';
            if (teams) {
                html += '<option value="00000000-0000-0000-0000-000000000000">+ New Team</option>';
                $.each(teams, function (i, t) {
                    var sel = (t.id === selectedId) ? ' selected' : '';
                    html += '<option value="' + escHtml(t.id) + '"' + sel + '>' + escHtml(t.name) + '</option>';
                });
            }
            return html;
        }

        function buildGameOptions(games, selectedId) {
            var html = '<option value="">Select game...</option>';
            html += '<option value="00000000-0000-0000-0000-000000000000">+ New Game</option>';
            if (games) {
                $.each(games, function (i, g) {
                    var sel = (selectedId && g.id === selectedId) ? ' selected' : '';
                    var label = (g.startDate ? moment(g.startDate).format('M/D/YY') + ' ' : '') + escHtml(g.name || '');
                    html += '<option value="' + escHtml(g.id) + '"' + sel + '>' + label + '</option>';
                });
            }
            return html;
        }

        function buildPlayerOptions(roster, selectedPlayer, excludeFromLineup, excludeIndex) {
            var html = '<option value="">Select player...</option>';
            if (roster) {
                $.each(roster, function (i, player) {
                    if (excludeFromLineup && isPlayerUsed(excludeFromLineup, player, excludeIndex)) return;
                    var sel = '';
                    if (selectedPlayer &&
                        selectedPlayer.jerseyNumber === player.jerseyNumber &&
                        selectedPlayer.firstName === player.firstName &&
                        selectedPlayer.lastName === player.lastName) { sel = ' selected'; }
                    html += '<option value="' + i + '"' + sel + '>' +
                        escHtml('#' + player.jerseyNumber + ' ' + player.firstName + ' ' + player.lastName) + '</option>';
                });
            }
            return html;
        }

        function buildFieldingOptions(selectedValue, lineup, skipIndex) {
            var html = '';
            $.each(commonData.fieldingPositions, function (i, pos) {
                if (isPositionUsed(lineup || [], pos.value, skipIndex !== undefined ? skipIndex : -1)) return;
                var sel = (pos.value === selectedValue) ? ' selected' : '';
                html += '<option value="' + pos.value + '"' + sel + '>' + escHtml(pos.name) + '</option>';
            });
            return html;
        }

        function buildWalkupFileOptions(files, selectedFileName) {
            var html = '<option value="">None</option>';
            if (files) {
                $.each(files, function (i, f) {
                    var sel = (selectedFileName && f.fileName === selectedFileName) ? ' selected' : '';
                    html += '<option value="' + escHtml(f.fileName) + '"' + sel + '>' + escHtml(f.fileName) + '</option>';
                });
            }
            return html;
        }

        // ── Render functions ──────────────────────────────────────────────────
        function renderSpeedDisplay() {
            var d = commonData.radarSpeedData;
            $('#speedInMax').text(numPadding(d.inMaxSpeed, 1, 2));
            $('#speedInMin').text(numPadding(d.inMinSpeed, 1, 2));
            $('#speedOutMax').text(numPadding(d.outMaxSpeed, 1, 2));
            $('#speedOutMin').text(numPadding(d.outMinSpeed, 1, 2));

            var $tbody = $('#speedBoxHistoryTableBody').empty();
            $.each(commonData.radarSpeedDataHistory, function (i, item) {
                if (i >= 10) return false;
                $tbody.append('<tr><td>' + moment(item.time).format('hh:mm:ss') + '</td>' +
                    '<td>' + escHtml(item.inMaxSpeed) + '</td>' +
                    '<td>' + escHtml(item.outMaxSpeed) + '</td></tr>');
            });
        }

        function renderStatusBar() {
            if (commonData.isConnected) {
                $('#connectionStatus').html('<i class="fa fa-wifi"></i>');
            } else {
                $('#connectionStatus').html('<i class="fa fa-ban"></i>');
            }
            var bv = commonData.batteryVoltage;
            $('#batteryVoltageDisplay').text(bv && bv.batteryVoltage !== undefined ? parseFloat(bv.batteryVoltage).toFixed(2) + 'V' : '');
            var gps = commonData.gpsPosition;
            $('#gpsPositionDisplay').text(gps ? (gps.lat + ' / ' + gps.lon) : '');
            $('#lastSpeedDisplay').text(commonData.lastSpeedDataTimestamp || '');
            $('#serverVersionDisplay').text(commonData.serverInfo ? commonData.serverInfo.version : '');
        }

        function renderVisibility() {
            // Login/Logout
            $('#loginBtn').toggle(!commonData.isGameAdmin);
            $('#logoutBtn').toggle(!!commonData.isGameAdmin);

            // Admin section
            $('#adminSection').toggle(!!commonData.isGameAdmin);

            // Non-admin game display (only when not admin and a game exists)
            $('#gameDisplaySection').toggle(!commonData.isGameAdmin && !!commonData.game);

            // Radar emulator
            $('#radarEmulatorSection').toggle(!!commonData.isRadarEmulator);

            // Game select dropdown
            $('#gameSelectSection').toggle(!!commonData.isGameSelect);

            // Game score
            $('#gameScoreSection').toggle(!!commonData.isGameScore);

            // Game edit button
            $('#gameEditBtn').toggle(!!commonData.selectedGame && !commonData.isGameEdit);

            // Admin-only tabs
            $('.admin-tab').toggle(!!commonData.isGameAdmin);

            // Game-required tabs
            $('.game-tab').toggle(!!commonData.isGameSelected);
        }

        function renderGameDisplay() {
            var g = commonData.game;
            if (!g) return;
            $('#displayInning').text(g.inning || '');
            $('#displayInningTopIcon').toggle(g.inningPosition === 'top');
            $('#displayInningBottomIcon').toggle(g.inningPosition === 'bottom');
            $('#displayHomeScore').text(g.score ? (g.score.home || 0) : 0);
            $('#displayGuestScore').text(g.score ? (g.score.guest || 0) : 0);
            $('#displayOuts').text(g.outs || 0);
            $('#displayBalls').text(g.balls || 0);
            $('#displayStrikes').text(g.strikes || 0);
            if (g.pitcher && g.pitcher.player) {
                $('#displayPitcher').text('#' + g.pitcher.player.jerseyNumber + ' ' +
                    g.pitcher.player.firstName + ' ' + g.pitcher.player.lastName +
                    ' - ' + getPlayerPositionLongName(g.pitcher.fieldingPosition));
            }
            if (g.batter && g.batter.player) {
                $('#displayBatter').text('#' + g.batter.player.jerseyNumber + ' ' +
                    g.batter.player.firstName + ' ' + g.batter.player.lastName +
                    ' - ' + getPlayerPositionLongName(g.batter.fieldingPosition));
            }
        }

        function renderGameScore() {
            var sg = commonData.selectedGame;
            if (!sg || !commonData.isGameScore) return;
            $('#scoreInning').val(sg.inning);
            $('#scoreInningPosition').val(sg.inningPosition);
            $('#scoreHome').val(sg.score ? sg.score.home : 0);
            $('#scoreGuest').val(sg.score ? sg.score.guest : 0);
            $('#scoreOuts').val(sg.outs);
            $('#scoreBalls').val(sg.balls);
            $('#scoreStrikes').val(sg.strikes);
        }

        function renderGameSelect() {
            var selectedId = commonData.selectedGame ? commonData.selectedGame.id : null;
            $('#gameSelectDropdown').html(buildGameOptions(commonData.games, selectedId));
        }

        function renderPitcherBatterSelects() {
            var sg = commonData.selectedGame;
            if (!sg) return;

            // Pitcher select
            var $ps = $('#pitcherSelectDropdown').empty().append('<option value="">Select pitcher...</option>');
            if (commonData.pitchers) {
                $.each(commonData.pitchers, function (i, item) {
                    var label = buildLineupLabel(item);
                    var sel = (sg.pitcher === item) ? ' selected' : '';
                    $ps.append('<option value="' + i + '"' + sel + '>' + escHtml(label) + '</option>');
                });
            }

            // Batter select
            var $bs = $('#batterSelectDropdown').empty().append('<option value="">Select batter...</option>');
            if (commonData.batters) {
                $.each(commonData.batters, function (i, item) {
                    var label = buildLineupLabel(item);
                    var sel = (sg.batter === item) ? ' selected' : '';
                    $bs.append('<option value="' + i + '"' + sel + '>' + escHtml(label) + '</option>');
                });
            }

            // Batter walkup info
            var batter = sg.batter;
            var hasWalkup = batter && batter.player && batter.player.walkupFile;
            $('#batterWalkupPlayBtn').toggle(!!hasWalkup);
            $('#batterWalkupStopBtn').toggle(!!hasWalkup);
            $('#batterWalkupFileName').text(hasWalkup ? batter.player.walkupFile.fileName : '').toggle(!!hasWalkup);
        }

        function renderRadarHistoryTable() {
            var $tbody = $('#radarHistoryTableBody').empty();
            $.each(commonData.radarSpeedDataHistory, function (i, item) {
                var pitcherName = item.pitcher ? ('#' + escHtml(item.pitcher.jerseyNumber) + ' ' + escHtml(item.pitcher.firstName) + ' ' + escHtml(item.pitcher.lastName)) : '';
                var batterName  = item.batter  ? ('#' + escHtml(item.batter.jerseyNumber)  + ' ' + escHtml(item.batter.firstName)  + ' ' + escHtml(item.batter.lastName))  : '';
                $tbody.append('<tr>' +
                    '<td>' + moment(item.time).format('M/D/YY hh:mm:ss') + '</td>' +
                    '<td>' + pitcherName + '</td>' +
                    '<td>' + escHtml(item.inMaxSpeed) + '</td>' +
                    '<td>' + escHtml(item.inMinSpeed) + '</td>' +
                    '<td>' + batterName + '</td>' +
                    '<td>' + escHtml(item.outMaxSpeed) + '</td>' +
                    '<td>' + escHtml(item.outMinSpeed) + '</td>' +
                    '</tr>');
            });
        }

        function renderLineupTableRows($tbody, lineup, roster, team) {
            $tbody.empty();
            if (!lineup) return;
            $.each(lineup, function (index, entry) {
                var isDH = (entry.fieldingPosition === '11');
                var $row = $('<tr>').attr('data-index', index);

                // Order
                var orderHtml = '<td><div class="form-control-sm"><span class="form-control">' + (index + 1) + '</span></div>';
                if (isDH && entry.dh) {
                    orderHtml += '<div class="form-control-sm"><label class="form-control">DH/' + escHtml(getPlayerPositionLongName(entry.dh.fieldingPosition)) + '</label></div>';
                }
                orderHtml += '</td>';
                $row.append(orderHtml);

                // Player select
                var playerOpts = buildPlayerOptions(roster, entry.player, lineup, index);
                var playerHtml = '<td><div class="form-control-sm"><select class="form-control lineup-player-select">' + playerOpts + '</select></div>';
                if (isDH && entry.dh) {
                    var dhOpts = buildPlayerOptions(roster, entry.dh ? entry.dh.player : null, lineup, index);
                    playerHtml += '<div class="form-control-sm"><select class="form-control lineup-dh-player-select">' + dhOpts + '</select></div>';
                }
                playerHtml += '</td>';
                $row.append(playerHtml);

                // Fielding position
                var fieldingOpts = buildFieldingOptions(entry.fieldingPosition, lineup, index);
                var fieldingHtml = '<td><div class="form-control-sm"><select class="form-control lineup-fielding-select">' + fieldingOpts + '</select></div>';
                if (isDH && entry.dh) {
                    var dhFieldingOpts = buildFieldingOptions(entry.dh.fieldingPosition, lineup, index);
                    fieldingHtml += '<div class="form-control-sm"><select class="form-control lineup-dh-fielding-select">' + dhFieldingOpts + '</select></div>';
                }
                fieldingHtml += '</td>';
                $row.append(fieldingHtml);

                // Actions
                $row.append('<td><div class="btn-group">' +
                    '<button type="button" class="btn lineup-clear-player" title="Clear Player"><i class="fa fa-ban"></i></button>' +
                    '<button type="button" class="btn btn-primary lineup-sub" title="Sub Player"><i class="fa fa-exchange"></i></button>' +
                    '<button type="button" class="btn btn-danger lineup-delete" title="Delete" data-confirm="Are you SURE you want to Delete and not Sub?"><i class="fa fa-minus-circle"></i></button>' +
                    '</div></td>');

                $tbody.append($row);
            });
        }

        function renderLineupTab() {
            if (!commonData.selectedGame) return;
            var sg = commonData.selectedGame;
            $('#homeTeamLineupLabel').text(sg.home && sg.home.team ? sg.home.team.name : 'Home Team');
            $('#guestTeamLineupLabel').text(sg.guest && sg.guest.team ? sg.guest.team.name : 'Guest Team');
            var homeRoster  = sg.home  && sg.home.team  ? sg.home.team.roster  : [];
            var guestRoster = sg.guest && sg.guest.team ? sg.guest.team.roster : [];
            renderLineupTableRows($('#homeLineupTableBody'),  sg.home  && sg.home.lineup  ? sg.home.lineup  : [], homeRoster,  'home');
            renderLineupTableRows($('#guestLineupTableBody'), sg.guest && sg.guest.lineup ? sg.guest.lineup : [], guestRoster, 'guest');
        }

        function renderRosterTableView($tbody, roster) {
            $tbody.empty();
            if (!roster) return;
            $.each(roster, function (i, player) {
                $tbody.append('<tr><td>' + escHtml(player.jerseyNumber) + '</td>' +
                    '<td>' + escHtml(player.firstName) + '</td>' +
                    '<td>' + escHtml(player.lastName) + '</td></tr>');
            });
        }

        function renderRosterTableEdit($tbody, roster, team) {
            $tbody.empty();
            if (!roster) return;
            $.each(roster, function (i, player) {
                var walkupSel = buildWalkupFileOptions(commonData.walkupFiles,
                    player.walkupFile ? player.walkupFile.fileName : null);
                var hasWalkup = player.walkupFile ? 'style=""' : 'style="display:none"';
                $tbody.append('<tr data-index="' + i + '">' +
                    '<td><input class="form-control player-jersey" value="' + escHtml(player.jerseyNumber) + '" placeholder="Jersey #" /></td>' +
                    '<td><input class="form-control player-firstname" value="' + escHtml(player.firstName) + '" placeholder="First Name" /></td>' +
                    '<td><input class="form-control player-lastname" value="' + escHtml(player.lastName) + '" placeholder="Last Name" /></td>' +
                    '<td>' +
                    '<button type="button" class="btn walkup-play-btn" ' + hasWalkup + ' title="Play Walkup"><i class="fa fa-play"></i></button>' +
                    '<button type="button" class="btn walkup-stop-btn" ' + hasWalkup + ' title="Stop"><i class="fa fa-stop"></i></button>' +
                    '<select class="form-control player-walkup-select">' + walkupSel + '</select>' +
                    '</td>' +
                    '<td><button type="button" class="btn btn-danger player-delete"><i class="fa fa-minus-circle"></i></button></td>' +
                    '</tr>');
            });
        }

        function renderRosterTab() {
            if (!commonData.selectedGame) return;
            var sg = commonData.selectedGame;

            // Home team
            $('#homeTeamRosterLabel').text(sg.home && sg.home.team ? sg.home.team.name : 'Home Team');
            var showHomeSelect = commonData.isSelectHomeTeam;
            var showHomeEdit   = commonData.isHomeTeamEdit && !commonData.isSelectHomeTeam;
            var showHomeView   = !commonData.isHomeTeamEdit && !commonData.isSelectHomeTeam;
            $('#homeTeamSelectSection').toggle(showHomeSelect);
            $('#homeRosterViewSection').toggle(showHomeView);
            $('#homeRosterEditSection').toggle(showHomeEdit);

            if (showHomeSelect) {
                $('#homeTeamSelectDropdown').html(buildTeamOptions(commonData.teams,
                    commonData.selectedHomeTeam ? commonData.selectedHomeTeam.id : null));
            }
            if (showHomeView) {
                renderRosterTableView($('#homeRosterViewTableBody'), sg.home && sg.home.team ? sg.home.team.roster : []);
            }
            if (showHomeEdit && sg.home && sg.home.team) {
                $('#homeTeamNameInput').val(sg.home.team.name || '');
                $('#homeTeamShortNameInput').val(sg.home.team.shortName || '');
                renderRosterTableEdit($('#homeRosterEditTableBody'), sg.home.team.roster, 'home');
            }

            // Guest team
            $('#guestTeamRosterLabel').text(sg.guest && sg.guest.team ? sg.guest.team.name : 'Guest Team');
            var showGuestSelect = commonData.isSelectGuestTeam;
            var showGuestEdit   = commonData.isGuestTeamEdit && !commonData.isSelectGuestTeam;
            var showGuestView   = !commonData.isGuestTeamEdit && !commonData.isSelectGuestTeam;
            $('#guestTeamSelectSection').toggle(showGuestSelect);
            $('#guestRosterViewSection').toggle(showGuestView);
            $('#guestRosterEditSection').toggle(showGuestEdit);

            if (showGuestSelect) {
                $('#guestTeamSelectDropdown').html(buildTeamOptions(commonData.teams,
                    commonData.selectedGuestTeam ? commonData.selectedGuestTeam.id : null));
            }
            if (showGuestView) {
                renderRosterTableView($('#guestRosterViewTableBody'), sg.guest && sg.guest.team ? sg.guest.team.roster : []);
            }
            if (showGuestEdit && sg.guest && sg.guest.team) {
                $('#guestTeamNameInput').val(sg.guest.team.name || '');
                $('#guestTeamShortNameInput').val(sg.guest.team.shortName || '');
                renderRosterTableEdit($('#guestRosterEditTableBody'), sg.guest.team.roster, 'guest');
            }

            // Roster tab admin button visibility
            $('#homeTeamEditBtn').toggle(!!commonData.isGameAdmin && !(commonData.isHomeTeamEdit || commonData.isSelectHomeTeam));
            $('#homeTeamSelectBtn').toggle(!!commonData.isGameAdmin && !commonData.isSelectHomeTeam && !commonData.isHomeTeamEdit);
            $('#homeTeamSaveBtn').toggle(!!commonData.isGameAdmin && !!commonData.isHomeTeamEdit && !commonData.isSelectHomeTeam);
            $('#homeTeamCancelBtn').toggle(!!commonData.isGameAdmin && !!commonData.isHomeTeamEdit && !commonData.isSelectHomeTeam);

            $('#guestTeamEditBtn').toggle(!!commonData.isGameAdmin && !(commonData.isGuestTeamEdit || commonData.isSelectGuestTeam));
            $('#guestTeamSelectBtn').toggle(!!commonData.isGameAdmin && !commonData.isSelectGuestTeam && !commonData.isGuestTeamEdit);
            $('#guestTeamSaveBtn').toggle(!!commonData.isGameAdmin && !!commonData.isGuestTeamEdit && !commonData.isSelectGuestTeam);
            $('#guestTeamCancelBtn').toggle(!!commonData.isGameAdmin && !!commonData.isGuestTeamEdit && !commonData.isSelectGuestTeam);
        }

        function renderTeamsSelect() {
            var selId = commonData.selectedTeam ? commonData.selectedTeam.id : null;
            $('#teamSelectDropdown').html(buildTeamOptions(commonData.teams, selId));
        }

        function renderHomeTeamSelect() {
            var selId = commonData.selectedHomeTeam ? commonData.selectedHomeTeam.id : null;
            $('#homeTeamSelectDropdown').html(buildTeamOptions(commonData.teams, selId));
        }

        function renderGuestTeamSelect() {
            var selId = commonData.selectedGuestTeam ? commonData.selectedGuestTeam.id : null;
            $('#guestTeamSelectDropdown').html(buildTeamOptions(commonData.teams, selId));
        }

        function renderTeamsTab() {
            var showSelect = commonData.isSelectTeam;
            var showEdit   = commonData.isTeamEdit && !commonData.isSelectTeam;
            var showView   = !commonData.isTeamEdit && !commonData.isSelectTeam;
            $('#teamSelectSection').toggle(showSelect);
            $('#teamViewSection').toggle(showView);
            $('#teamEditSection').toggle(showEdit);

            if (showSelect) {
                renderTeamsSelect();
            }
            if (showView && commonData.selectedTeam) {
                $('#teamViewLabel').text(commonData.selectedTeam.name || 'Team Name');
                renderRosterTableView($('#teamRosterViewTableBody'), commonData.selectedTeam.roster);
                // add walkup/play columns for the teams view
                renderTeamsViewRoster($('#teamRosterViewTableBody'), commonData.selectedTeam.roster);
            }
            if (showEdit && commonData.selectedTeam) {
                $('#teamNameInput').val(commonData.selectedTeam.name || '');
                $('#teamShortNameInput').val(commonData.selectedTeam.shortName || '');
                renderRosterTableEdit($('#teamRosterEditTableBody'), commonData.selectedTeam.roster, 'team');
            }

            // Button visibility
            $('#teamEditBtn').toggle(!!commonData.isGameAdmin && !(commonData.isTeamEdit || commonData.isSelectTeam));
            $('#teamSelectBtn').toggle(!!commonData.isGameAdmin && !commonData.isSelectTeam && !commonData.isTeamEdit);
            $('#teamSaveBtn').toggle(!!commonData.isGameAdmin && !!commonData.isTeamEdit && !commonData.isSelectTeam);
            $('#teamCancelBtn').toggle(!!commonData.isGameAdmin && !!commonData.isTeamEdit && !commonData.isSelectTeam);
            $('#teamDeleteBtn').toggle(!!commonData.isGameAdmin && !!commonData.isTeamEdit && !commonData.isSelectTeam);
            $('#teamSelectCancelBtn').toggle(!!commonData.isGameAdmin && !!commonData.isSelectTeam);
            $('#teamRefreshBtn').toggle(!!commonData.isGameAdmin && !!commonData.isSelectTeam);
        }

        function renderTeamsViewRoster($tbody, roster) {
            $tbody.empty();
            if (!roster) return;
            $.each(roster, function (i, player) {
                var hasWalkup = player.walkupFile;
                var walkupFileDisplay = hasWalkup ? escHtml(player.walkupFile.fileName) : '';
                var playBtn  = hasWalkup ? '<button type="button" class="btn teams-walkup-play" data-file=\'' + escHtml(JSON.stringify(player.walkupFile)) + '\' title="Play Walkup"><i class="fa fa-play"></i></button>' : '';
                var stopBtn  = hasWalkup ? '<button type="button" class="btn teams-walkup-stop" title="Stop"><i class="fa fa-stop"></i></button>' : '';
                var prevBtn  = hasWalkup ? '<button type="button" class="btn teams-walkup-preview" data-filename="' + escHtml(player.walkupFile.fileName) + '" title="Preview"><i class="fa fa-play"></i></button>' : '';
                $tbody.append('<tr>' +
                    '<td>' + escHtml(player.jerseyNumber) + '</td>' +
                    '<td>' + escHtml(player.firstName) + '</td>' +
                    '<td>' + escHtml(player.lastName) + '</td>' +
                    '<td>' + walkupFileDisplay + '</td>' +
                    '<td>' + playBtn + stopBtn + '</td>' +
                    '<td>' + prevBtn + '<div class="previewControl"></div></td>' +
                    '</tr>');
            });
        }

        function renderWalkupSongsTab() {
            var $tbody = $('#walkupSongsTableBody').empty();
            if (!commonData.walkupFiles) return;
            $.each(commonData.walkupFiles, function (i, f) {
                $tbody.append('<tr>' +
                    '<td>' + escHtml(f.fileName) + '</td>' +
                    '<td>' + escHtml(f.length) + '</td>' +
                    '<td>' +
                    '<button class="btn walkup-play-song" data-file=\'' + escHtml(JSON.stringify(f)) + '\' title="Play"><i class="fa fa-play"></i></button>' +
                    '<button class="btn walkup-stop-song" title="Stop"><i class="fa fa-stop"></i></button>' +
                    '</td>' +
                    '<td><button class="btn walkup-preview-song" data-filename="' + escHtml(f.fileName) + '" title="Preview"><i class="fa fa-play"></i></button><div class="previewControl"></div></td>' +
                    '</tr>');
            });
        }

        function renderFullSongsTab() {
            var $tbody = $('#fullSongsTableBody').empty();
            if (!commonData.fullSongFiles) return;
            $.each(commonData.fullSongFiles, function (i, f) {
                $tbody.append('<tr>' +
                    '<td>' + escHtml(f.fileName) + '</td>' +
                    '<td>' + escHtml(f.length) + '</td>' +
                    '<td>' +
                    '<button class="btn fullsong-play" data-file=\'' + escHtml(JSON.stringify(f)) + '\' title="Play"><i class="fa fa-play"></i></button>' +
                    '<button class="btn fullsong-stop" title="Stop"><i class="fa fa-stop"></i></button>' +
                    '</td>' +
                    '<td><button class="btn fullsong-preview" data-filename="' + escHtml(f.fileName) + '" title="Preview"><i class="fa fa-play"></i></button><div class="previewControl"></div></td>' +
                    '</tr>');
            });
        }

        function refreshPlaylists() {
            $.getJSON('/data/playlists', function (data) {
                commonData.playlists = data || [];
                renderPlaylistsTab();
            }).fail(function () {
                commonData.playlists = [];
                renderPlaylistsTab();
            });
        }

        function renderPlaylistsTab() {
            var $tbody = $('#savedPlaylistsTableBody').empty();
            if (!commonData.playlists || !commonData.playlists.length) {
                $tbody.append('<tr><td colspan="3" class="text-muted" style="padding:12px">No playlists saved. Click "New Playlist" to create one.</td></tr>');
                return;
            }
            $.each(commonData.playlists, function (i, pl) {
                $tbody.append('<tr>' +
                    '<td>' + escHtml(pl.name) + '</td>' +
                    '<td>' + ((pl.songs && pl.songs.length) || 0) + '</td>' +
                    '<td>' +
                        '<button class="btn btn-xs btn-success playlist-play-btn" data-id="' + escHtml(pl.id) + '" title="Play"><i class="fa fa-play"></i></button> ' +
                        '<button class="btn btn-xs btn-info playlist-edit-btn" data-id="' + escHtml(pl.id) + '" title="Edit"><i class="fa fa-edit"></i></button> ' +
                        '<button class="btn btn-xs btn-danger playlist-delete-btn" data-id="' + escHtml(pl.id) + '" title="Delete"><i class="fa fa-trash"></i></button>' +
                    '</td>' +
                    '</tr>');
            });
        }

        function renderPlaylistSongSelect() {
            var $tbody = $('#playlistSongSelectBody').empty();
            if (!commonData.fullSongFiles) return;
            var songs = (commonData.editingPlaylist && commonData.editingPlaylist.songs) || [];
            $.each(commonData.fullSongFiles, function (i, f) {
                var checked = songs.indexOf(f.fileName) !== -1 ? ' checked' : '';
                $tbody.append('<tr>' +
                    '<td><input type="checkbox" value="' + escHtml(f.fileName) + '" name="playlistSongSelect"' + checked + '></td>' +
                    '<td>' + escHtml(f.fileName) + '</td>' +
                    '<td><button class="btn btn-xs playlist-song-preview" data-filename="' + escHtml(f.fileName) + '" title="Preview"><i class="fa fa-play"></i></button><div class="previewControl"></div></td>' +
                    '</tr>');
            });
        }

        function openNewPlaylist() {
            commonData.editingPlaylist = { id: null, name: '', songs: [] };
            $('#playlistEditTitle').text('New Playlist');
            $('#playlistNameInput').val('');
            $('#playlistEditPanel').show();
            var ready = commonData.fullSongFiles ? $.when() : refreshFullSongFiles();
            ready.then(function () { renderPlaylistSongSelect(); });
        }

        function openEditPlaylist(id) {
            var pl = (commonData.playlists || []).filter(function (p) { return p.id === id; })[0];
            if (!pl) return;
            commonData.editingPlaylist = { id: pl.id, name: pl.name, songs: (pl.songs || []).slice() };
            $('#playlistEditTitle').text('Edit: ' + pl.name);
            $('#playlistNameInput').val(pl.name);
            $('#playlistEditPanel').show();
            var ready = commonData.fullSongFiles ? $.when() : refreshFullSongFiles();
            ready.then(function () { renderPlaylistSongSelect(); });
        }

        function saveCurrentPlaylist() {
            if (!commonData.editingPlaylist) return;
            var name = $('#playlistNameInput').val().trim();
            if (!name) { alert('Please enter a playlist name.'); return; }
            var songs = [];
            $('input[name=playlistSongSelect]:checked').each(function () { songs.push($(this).val()); });
            var pl = { id: commonData.editingPlaylist.id || Date.now().toString(), name: name, songs: songs };
            radarMonitor.sendServerCommand('audio', { cmd: 'savePlaylist', data: pl });
            if (!commonData.playlists) commonData.playlists = [];
            var idx = -1;
            for (var i = 0; i < commonData.playlists.length; i++) {
                if (commonData.playlists[i].id === pl.id) { idx = i; break; }
            }
            if (idx !== -1) { commonData.playlists[idx] = pl; } else { commonData.playlists.push(pl); }
            commonData.editingPlaylist = null;
            $('#playlistEditPanel').hide();
            renderPlaylistsTab();
        }

        function deletePlaylist(id) {
            if (!confirm('Delete this playlist?')) return;
            radarMonitor.sendServerCommand('audio', { cmd: 'deletePlaylist', data: { id: id } });
            commonData.playlists = (commonData.playlists || []).filter(function (p) { return p.id !== id; });
            renderPlaylistsTab();
        }

        function playNamedPlaylist(id) {
            var pl = (commonData.playlists || []).filter(function (p) { return p.id === id; })[0];
            if (!pl) return;
            var shouldLoop = $('#playlistFullSongLoop').prop('checked');
            radarMonitor.sendServerCommand('audio', { cmd: 'playNamedPlaylist', data: { playlist: pl, loop: shouldLoop } });
        }

        function renderPracticeModeTab() {
            var pm = commonData.practiceMode;
            // Team select
            $('#practiceTeamSelectDropdown').html(buildTeamOptions(commonData.teams, pm.selectedTeam ? pm.selectedTeam.id : null));

            var hasTeam = !!pm.selectedTeam;
            $('#practicePitcherSection').toggle(hasTeam);
            $('#practiceBatterSection').toggle(hasTeam);

            if (hasTeam && pm.selectedTeam.roster) {
                $('#practicePitcherSelectDropdown').html(buildPlayerOptions(pm.selectedTeam.roster, pm.selectedPitcher));
                $('#practiceBatterSelectDropdown').html(buildPlayerOptions(pm.selectedTeam.roster, pm.selectedBatter));
            }
        }

        function renderStreamStats(prefix, stats) {
            var $section = $('#' + prefix + 'StreamStats');
            if (!stats || !$section.length) return;
            $section.toggle(!!stats);

            function setStreamBlock(suffix, data) {
                var $block = $section.find('.' + suffix + 'Block');
                if (!$block.length) return;
                $block.toggle(!!data);
                if (!data) return;
                $block.find('.statStatus').text(data.status || '');
                $block.find('.statStatus').parent().toggleClass('text-success', data.status === 'connected');
                if (data.info) {
                    $block.find('.statTime').text(data.info.time || '');
                    $block.find('.statFrame').text(data.info.frame || '');
                    $block.find('.statSize').text(data.info.size || '');
                    $block.find('.statFps').text(data.info.fps || '');
                    $block.find('.statBitrate').text(data.info.bitrate || '');
                    $block.find('.statSpeed').text(data.info.speed || '');
                    $block.find('.infoBlock').toggle(true);
                } else {
                    $block.find('.infoBlock').toggle(false);
                }
                $block.find('.warningBlock').toggle(!!data.warning).find('.statWarning').text(data.warning || '');
                $block.find('.errorBlock').toggle(!!data.error).find('.statError').text(data.error || '');
                $block.find('.commandErrorBlock').toggle(!!data.commandError).find('.statCommandError').text(data.commandError || '');
                $block.find('.restartingBlock').toggle(!!data.restarting).find('.statRestarting').text(data.restarting || '');
            }

            if (prefix === 'youtube') {
                setStreamBlock('youtube', stats);
            } else if (prefix === 'gamechanger') {
                setStreamBlock('gamechanger', stats);
            } else if (prefix === 'file') {
                setStreamBlock('fileIncoming', stats.incoming);
                setStreamBlock('fileFile', stats.file);
            }
        }

        function renderVideoStreamsTab() {
            var vs = commonData.videoStreams;
            $('#videoTeamNameInput').val(vs.teamName || '');
            $('#videoOpponentNameInput').val(vs.opponentTeamName || '');
            $('#youtubeRtspInput').val(vs.youtubeRtspUrl || '');
            $('#youtubeRtmpInput').val(vs.youtubeRtmpUrl || '');
            $('#gamechangerRtspInput').val(vs.gamechangerRtspUrl || '');
            $('#gamechangerRtmpInput').val(vs.gamechangerRtmpUrl || '');
            $('#fileRtspInput').val(vs.fileRtspUrl || '');

            var vss = commonData.videoStreamStats;
            renderStreamStats('youtube',      vss.youtube);
            renderStreamStats('gamechanger',  vss.gamechanger);
            renderStreamStats('file',         vss.file);
        }

        function renderVideoFilesTab() {
            var $tbody = $('#videoFilesTableBody').empty();
            if (!commonData.videoFiles) return;
            $.each(commonData.videoFiles, function (i, f) {
                $tbody.append('<tr>' +
                    '<td>' + escHtml(f.fileName) + '</td>' +
                    '<td>' + escHtml(f.length) + '</td>' +
                    '<td>' +
                    '<button class="btn videofile-play" data-file=\'' + escHtml(JSON.stringify(f)) + '\' title="Play"><i class="fa fa-play"></i></button>' +
                    '<button class="btn videofile-stop" title="Stop"><i class="fa fa-stop"></i></button>' +
                    '<button class="btn videofile-download" title="Download"><i class="fa fa-download"></i></button>' +
                    '</td></tr>');
            });
        }

        function renderRadarConfigTab() {
            var rc = commonData.radarConfig;
            if (!rc || !rc.TransmiterControl) return;

            var txOn = rc.TransmiterControl.value === 1;
            $('#radarTransmitOffSection').toggle(!txOn);
            $('#radarTransmitOnSection').toggle(txOn);
            $('#radarCommandSpinner').toggle(!!commonData.isradarCommandPending);

            var showEdit = !!commonData.editRadarConfig;
            $('#radarConfigViewSection').toggle(!showEdit);
            $('#radarConfigEditSection').toggle(showEdit);

            function safeVal(key) { return rc[key] ? rc[key].value : ''; }

            if (!showEdit) {
                $('#rcProductID').text(safeVal('ProductID'));
                $('#rcLowSpeedThreshold').text(safeVal('LowSpeedThreshold'));
                $('#rcHighSpeedThreshold').text(safeVal('HighSpeedThreshold'));
                $('#rcCosignAngle1').text(safeVal('CosignAngle1'));
                $('#rcCosignAngle2').text(safeVal('CosignAngle2'));
                $('#rcRange').text(safeVal('Range'));
                $('#rcMessagePeriod').text(safeVal('MessagePeriod'));
                $('#rcAutoClearDelay').text(safeVal('AutoClearDelay'));
                $('#rcHitSpeedEnable').text(safeVal('HitSpeedEnable'));
                $('#rcTargetDirection').text(safeVal('TargetDirection'));
            } else {
                $('#rcEditLowSpeedThreshold').val(safeVal('LowSpeedThreshold'));
                $('#rcEditHighSpeedThreshold').val(safeVal('HighSpeedThreshold'));
                $('#rcEditCosignAngle1').val(safeVal('CosignAngle1'));
                $('#rcEditCosignAngle2').val(safeVal('CosignAngle2'));
                $('#rcEditRange').val(safeVal('Range'));
                $('#rcEditMessagePeriod').val(safeVal('MessagePeriod'));
                $('#rcEditAutoClearDelay').val(safeVal('AutoClearDelay'));
                $('#rcEditHitSpeedEnable').val(safeVal('HitSpeedEnable'));
                $('#rcEditTargetDirection').val(safeVal('TargetDirection'));
            }

            var bv = commonData.batteryVoltage;
            if (bv) {
                $('#batteryVoltageRadar').text(bv.batteryVoltage || '');
                $('#batteryTimeRadar').text(bv.time ? moment(bv.time).format('M/D/YY hh:mm:ss') : '');
            }
        }

        function render() {
            renderSpeedDisplay();
            renderStatusBar();
            renderVisibility();
            renderGameDisplay();
            renderGameScore();
            renderPitcherBatterSelects();
        }

        // ── Game log ──────────────────────────────────────────────────────────
        function addToGameLog(data) {
            if (!commonData.selectedGame) return;
            if (commonData.selectedGame.log === undefined) commonData.selectedGame.log = [];
            commonData.selectedGame.log.push({ timestamp: moment(), data: data });
        }

        // ── Tab click handler ─────────────────────────────────────────────────
        var lastTab = 'radarHistory';

        function tabClick(tabName) {
            if (tabName === lastTab) return;
            if (lastTab === 'videoStreams') unsubscribeServerEvents('videoStreams');
            if (lastTab === 'serverLogs')   unsubscribeServerEvents('serverLogs');

            switch (tabName) {
                case 'walkupSongs':
                    if (!commonData.walkupFiles) refreshWalkupFiles();
                    break;
                case 'fullSongs':
                    if (!commonData.fullSongFiles) refreshFullSongFiles();
                    break;
                case 'playlists':
                    if (!commonData.fullSongFiles) refreshFullSongFiles();
                    if (!commonData.playlists) refreshPlaylists();
                    break;
                case 'videoFiles':
                    refreshVideoFiles();
                    break;
                case 'videoStreams':
                    refreshVideoStreamSettings();
                    subscribeServerEvents('videoStreams');
                    renderVideoStreamsTab();
                    break;
                case 'serverLogs':
                    if (!commonData.serverLogsSubscribe.appLogLevels) {
                        getAppLogLevels();
                    }
                    getServerLogs().then(function (data) {
                        updateServerLogs(data);
                        subscribeServerEvents('serverLogs', { appLogLevels: commonData.serverLogsSubscribe.appLogLevels });
                    });
                    break;
                case 'lineup':
                    renderLineupTab();
                    break;
                case 'roster':
                    renderRosterTab();
                    break;
                case 'teams':
                    renderTeamsTab();
                    break;
                case 'radarConfig':
                    renderRadarConfigTab();
                    break;
                case 'practiceMode':
                    renderPracticeModeTab();
                    break;
                case 'gameChangerWidget':
                    break;
            }
            lastTab = tabName;
            commonData.activeTabName = tabName;
        }

        // ── Game scoring actions ──────────────────────────────────────────────
        function updatePitchersBatters() {
            var sg = commonData.selectedGame;
            if (!sg) return;
            if (sg.inningPosition === 'top') {
                commonData.batters  = sg.guest ? sg.guest.lineup : null;
                commonData.pitchers = sg.home  ? sg.home.lineup  : null;
                sg.pitcher = findPitcher(sg.home  ? sg.home.lineup  : []);
                sg.batter  = sg.guest && sg.guest.lineup ? sg.guest.lineup[sg.guest.batterIndex || 0] : null;
            } else {
                commonData.batters  = sg.home  ? sg.home.lineup  : null;
                commonData.pitchers = sg.guest ? sg.guest.lineup : null;
                sg.pitcher = findPitcher(sg.guest ? sg.guest.lineup : []);
                sg.batter  = sg.home && sg.home.lineup ? sg.home.lineup[sg.home.batterIndex || 0] : null;
            }
        }

        function nextBatter() {
            var sg = commonData.selectedGame;
            var data = {};
            if (sg.inningPosition === 'top') {
                if (sg.guest.batterIndex === undefined) sg.guest.batterIndex = 0;
                sg.guest.batterIndex++;
                if (sg.guest.batterIndex >= sg.guest.lineup.length) sg.guest.batterIndex = 0;
                sg.batter = sg.guest.lineup[sg.guest.batterIndex];
                data.guest = { batterIndex: sg.guest.batterIndex };
                data.batter = sg.batter;
            } else {
                if (sg.home.batterIndex === undefined) sg.home.batterIndex = 0;
                sg.home.batterIndex++;
                if (sg.home.batterIndex >= sg.home.lineup.length) sg.home.batterIndex = 0;
                sg.batter = sg.home.lineup[sg.home.batterIndex];
                data.home = { batterIndex: sg.home.batterIndex };
                data.batter = sg.batter;
            }
            sg.strikes = 0;
            sg.balls = 0;
            data.strikes = 0;
            data.balls = 0;
            addToGameLog(data);
            radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
            renderGameScore();
            renderPitcherBatterSelects();
        }

        function inning() {
            var sg = commonData.selectedGame;
            var data = {};
            if (sg.inningPosition === 'top') {
                sg.inningPosition = 'bottom';
                updatePitchersBatters();
                data.inningPosition = sg.inningPosition;
                data.pitcher = sg.pitcher;
                data.batter  = sg.batter;
            } else {
                sg.inning++;
                sg.inningPosition = 'top';
                updatePitchersBatters();
                data.inning = sg.inning;
                data.inningPosition = sg.inningPosition;
                data.pitcher = sg.pitcher;
                data.batter  = sg.batter;
            }
            if (sg.strikes) { sg.strikes = 0; data.strikes = 0; }
            if (sg.balls)   { sg.balls   = 0; data.balls   = 0; }
            if (sg.outs)    { sg.outs    = 0; data.outs    = 0; }
            addToGameLog(data);
            radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
            renderGameScore();
            renderPitcherBatterSelects();
        }

        function batterOut() {
            var sg = commonData.selectedGame;
            if (sg.outs >= 2) {
                var data = {};
                nextBatter();
                inning();
            } else {
                var data = {};
                sg.outs++;
                data.outs = sg.outs;
                nextBatter();
                addToGameLog(data);
                radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
                renderGameScore();
            }
        }

        // ── Video stream ──────────────────────────────────────────────────────
        function videoStreamStart()             { radarMonitor.sendServerCommand('videoStream', { cmd: 'start',             data: commonData.videoStreams }); }
        function videoStreamStop()              { radarMonitor.sendServerCommand('videoStream', { cmd: 'stop' }); }
        function videoStreamYoutubeStart()      { radarMonitor.sendServerCommand('videoStream', { cmd: 'youtubeStart',      data: commonData.videoStreams }); }
        function videoStreamYoutubeStop()       { radarMonitor.sendServerCommand('videoStream', { cmd: 'youtubeStop' }); }
        function videoStreamGameChangerStart()  { radarMonitor.sendServerCommand('videoStream', { cmd: 'gamechangerStart',  data: commonData.videoStreams }); }
        function videoStreamGameChangerStop()   { radarMonitor.sendServerCommand('videoStream', { cmd: 'gamechangerStop' }); }
        function videoStreamFileStart()         { radarMonitor.sendServerCommand('videoStream', { cmd: 'fileStart',         data: commonData.videoStreams }); }
        function videoStreamFileStop()          { radarMonitor.sendServerCommand('videoStream', { cmd: 'fileStop' }); }

        // ── Audio ─────────────────────────────────────────────────────────────
        function audioFilePlayWalkup(audioFile)     { radarMonitor.sendServerCommand('audio', { cmd: 'audioFilePlayWalkup',    data: { audioFile: audioFile } }); }
        function audioFilePlayFullSong(audioFile)   { radarMonitor.sendServerCommand('audio', { cmd: 'audioFilePlayFullSong',  data: { audioFile: audioFile } }); }
        function audioFileStop()                    { radarMonitor.sendServerCommand('audio', { cmd: 'audioFileStop' }); }

        function audioFilePreview($btn, fileName, subfolder) {
            var filePath = '/data/audioFiles/' + subfolder + '/' + fileName;
            var $ap = $('#audioPreviewControls');
            $btn.closest('td').find('.previewControl').append($ap);
            $ap.attr('src', filePath);
            $ap[0].play();
        }


        // ── Radar ─────────────────────────────────────────────────────────────
        var radarOffModalOpen = false;

        function showRadarOffModal() {
            if (!radarOffModalOpen) {
                radarOffModalOpen = true;
                $('#radarOffModal').modal('show');
            }
        }

        function radarCommand(cmd, data) {
            commonData.isradarCommandPending = true;
            renderRadarConfigTab();
            radarMonitor.sendRadarConfigCommand(cmd, data);
        }

        function updateRadarConfig() {
            commonData.isradarCommandPending = true;
            for (var key in commonData.radarConfig) {
                var prop = commonData.radarConfig[key];
                if (prop.isDirty === true) {
                    prop.isDirty = false;
                    radarCommand(key, prop.value);
                }
            }
            commonData.isradarCommandPending = false;
        }

        // ── Practice mode ─────────────────────────────────────────────────────
        function practiceModePitcherSelected() {
            radarMonitor.sendServerCommand('practiceMode', { cmd: 'pitcher', data: { pitcher: commonData.practiceMode.selectedPitcher } });
        }
        function practiceModeBatterSelected() {
            radarMonitor.sendServerCommand('practiceMode', { cmd: 'batter', data: { batter: commonData.practiceMode.selectedBatter } });
        }

        // ── Event binding ─────────────────────────────────────────────────────
        function collectRosterFromTable($tbody) {
            var roster = [];
            $tbody.find('tr').each(function () {
                var $row = $(this);
                var player = {
                    jerseyNumber: $row.find('.player-jersey').val(),
                    firstName:    $row.find('.player-firstname').val(),
                    lastName:     $row.find('.player-lastname').val()
                };
                var walkupFileName = $row.find('.player-walkup-select').val();
                if (walkupFileName && commonData.walkupFiles) {
                    player.walkupFile = commonData.walkupFiles.find(function (f) { return f.fileName === walkupFileName; }) || null;
                }
                roster.push(player);
            });
            return roster;
        }

        function bindEvents() {
            // Login / Logout
            $(document).on('click', '#loginBtn',  function () { commonData.isGameAdmin = true;  render(); });
            $(document).on('click', '#logoutBtn', function () { commonData.isGameAdmin = false; render(); });

            // Tab change
            $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                var tabName = $(e.target).attr('href').replace('#tab-', '');
                tabClick(tabName);
            });

            // Game actions
            $(document).on('click', '#gameScoreBtn',  function () { gameScore(); });
            $(document).on('click', '#gameSelectBtn', function () { commonData.isGameSelect = true; renderVisibility(); renderGameSelect(); });
            $(document).on('click', '#gameSaveBtn',   function () { gameSave(); });
            $(document).on('click', '#gameEditBtn',   function () { commonData.isGameEdit = true; renderVisibility(); });

            $(document).on('change', '#gameSelectDropdown', function () {
                var id = $(this).val();
                if (!id) return;
                if (id === '00000000-0000-0000-0000-000000000000') {
                    commonData.selectedGame = { id: id };
                } else {
                    commonData.selectedGame = (commonData.games || []).find(function (g) { return g.id === id; }) || null;
                }
                gameSelected();
            });

            // Inning/score controls
            $(document).on('change', '#scoreInning', function () {
                if (!commonData.selectedGame) return;
                commonData.selectedGame.inning = parseInt($(this).val());
                var data = { inning: commonData.selectedGame.inning };
                addToGameLog(data);
                radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
            });
            $(document).on('change', '#scoreInningPosition', function () {
                if (!commonData.selectedGame) return;
                commonData.selectedGame.inningPosition = $(this).val();
                updatePitchersBatters();
                var data = { inningPosition: commonData.selectedGame.inningPosition, pitcher: commonData.selectedGame.pitcher, batter: commonData.selectedGame.batter };
                addToGameLog(data);
                radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
                renderPitcherBatterSelects();
            });
            $(document).on('change', '#scoreHome', function () {
                if (!commonData.selectedGame) return;
                if (!commonData.selectedGame.score) commonData.selectedGame.score = {};
                commonData.selectedGame.score.home = parseInt($(this).val());
                var data = { score: { home: commonData.selectedGame.score.home } };
                addToGameLog(data);
                radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
            });
            $(document).on('change', '#scoreGuest', function () {
                if (!commonData.selectedGame) return;
                if (!commonData.selectedGame.score) commonData.selectedGame.score = {};
                commonData.selectedGame.score.guest = parseInt($(this).val());
                var data = { score: { guest: commonData.selectedGame.score.guest } };
                addToGameLog(data);
                radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
            });
            $(document).on('change', '#scoreOuts', function () {
                if (!commonData.selectedGame) return;
                commonData.selectedGame.outs = parseInt($(this).val());
                var data = { outs: commonData.selectedGame.outs };
                addToGameLog(data);
                radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
            });
            $(document).on('change', '#scoreBalls', function () {
                if (!commonData.selectedGame) return;
                commonData.selectedGame.balls = parseInt($(this).val());
                var data = { balls: commonData.selectedGame.balls };
                addToGameLog(data);
                radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
            });
            $(document).on('change', '#scoreStrikes', function () {
                if (!commonData.selectedGame) return;
                commonData.selectedGame.strikes = parseInt($(this).val());
                var data = { strikes: commonData.selectedGame.strikes };
                addToGameLog(data);
                radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
            });

            // Pitch buttons
            $(document).on('click', '#btnBall',     function () { ball(); });
            $(document).on('click', '#btnStrike',   function () { strike(); });
            $(document).on('click', '#btnFoul',     function () { foul(); });
            $(document).on('click', '#btnWildPitch',function () { ball(); });
            $(document).on('click', '#btnGroundBall',function () { nextBatter(); });
            $(document).on('click', '#btnFlyBall',  function () { nextBatter(); });
            $(document).on('click', '#btnLineDrive',function () { nextBatter(); });
            $(document).on('click', '#btnHBP',      function () { nextBatter(); });
            $(document).on('click', '#btnBaulk',    function () { nextBatter(); });
            $(document).on('click', '#btnError',    function () { nextBatter(); });
            $(document).on('click', '#btnNextBatter',function () { nextBatter(); });
            $(document).on('click', '#btnGroundOut',function () { batterOut(); });
            $(document).on('click', '#btnFlyOut',   function () { batterOut(); });
            $(document).on('click', '#btnLineOut',  function () { batterOut(); });
            $(document).on('click', '#btnFieldersChoice', function () { batterSafeFieldersChoice(); });
            $(document).on('click', '#btnDoublePlay',    function () { batterOutDoublePlay(); });
            $(document).on('click', '#btnTriplePlay',    function () { batterOutTriplePlay(); });
            $(document).on('click', '#btnBatterOut',     function () { batterOut(); });
            $(document).on('click', '#btnInning',        function () { inning(); });
            $(document).on('click', '#btnRunnerOut',     function () { runnerOut(); });
            $(document).on('click', '#btnStolenBase2',   function () { nextBatter(); });
            $(document).on('click', '#btnStolenBase3',   function () { nextBatter(); });
            $(document).on('click', '#btnStolenBase4',   function () { nextBatter(); });

            // Pitcher/Batter selects
            $(document).on('click', '#pitcherClearBtn', function () {
                if (commonData.selectedGame) { commonData.selectedGame.pitcher = null; pitcherChange(); }
            });
            $(document).on('change', '#pitcherSelectDropdown', function () {
                var idx = parseInt($(this).val());
                if (!isNaN(idx) && commonData.pitchers) {
                    commonData.selectedGame.pitcher = commonData.pitchers[idx];
                    pitcherChange();
                }
            });
            $(document).on('click', '#batterClearBtn', function () {
                if (commonData.selectedGame) { commonData.selectedGame.batter = null; batterChange(); }
            });
            $(document).on('change', '#batterSelectDropdown', function () {
                var idx = parseInt($(this).val());
                if (!isNaN(idx) && commonData.batters) {
                    commonData.selectedGame.batter = commonData.batters[idx];
                    batterChange();
                }
            });
            $(document).on('click', '#batterWalkupPlayBtn', function () {
                if (commonData.selectedGame && commonData.selectedGame.batter && commonData.selectedGame.batter.player) {
                    audioFilePlayWalkup(commonData.selectedGame.batter.player.walkupFile);
                }
            });
            $(document).on('click', '#batterWalkupStopBtn', function () { audioFileStop(); });

            // Radar emulator
            $(document).on('click', '#radarEmulatorGoBtn', function () {
                commonData.radarEmulator.data.in  = parseFloat($('#radarEmulatorInSpeed').val());
                commonData.radarEmulator.data.out = parseFloat($('#radarEmulatorOutSpeed').val());
                radarMonitor.sendRadarEmulatorCommand('radarEmulatorSpeed', commonData.radarEmulator.data);
            });

            // Lineup events (delegated)
            $(document).on('change', '#homeLineupTableBody .lineup-player-select', function () {
                var idx     = parseInt($(this).closest('tr').attr('data-index'));
                var pIdx    = parseInt($(this).val());
                var lineup  = commonData.selectedGame.home.lineup;
                var roster  = commonData.selectedGame.home.team.roster;
                lineup[idx].player = (!isNaN(pIdx) && roster) ? roster[pIdx] : null;
            });
            $(document).on('change', '#homeLineupTableBody .lineup-fielding-select', function () {
                var idx    = parseInt($(this).closest('tr').attr('data-index'));
                var lineup = commonData.selectedGame.home.lineup;
                lineup[idx].fieldingPosition = $(this).val();
                renderLineupTab();
            });
            $(document).on('click', '#homeLineupTableBody .lineup-clear-player', function () {
                var idx = parseInt($(this).closest('tr').attr('data-index'));
                commonData.selectedGame.home.lineup[idx].player = null;
                renderLineupTab();
            });
            $(document).on('click', '#homeLineupTableBody .lineup-delete', function () {
                var $btn = $(this);
                var msg  = $btn.attr('data-confirm') || 'Are you sure?';
                if (confirm(msg)) {
                    var idx = parseInt($btn.closest('tr').attr('data-index'));
                    commonData.selectedGame.home.lineup.splice(idx, 1);
                    renderLineupTab();
                }
            });
            $(document).on('click', '#homeLineupAddBtn', function () {
                if (!commonData.selectedGame.home.lineup) commonData.selectedGame.home.lineup = [];
                commonData.selectedGame.home.lineup.push(deepCopy(commonData.emptyLineup));
                renderLineupTab();
            });

            $(document).on('change', '#guestLineupTableBody .lineup-player-select', function () {
                var idx    = parseInt($(this).closest('tr').attr('data-index'));
                var pIdx   = parseInt($(this).val());
                var lineup = commonData.selectedGame.guest.lineup;
                var roster = commonData.selectedGame.guest.team.roster;
                lineup[idx].player = (!isNaN(pIdx) && roster) ? roster[pIdx] : null;
            });
            $(document).on('change', '#guestLineupTableBody .lineup-fielding-select', function () {
                var idx    = parseInt($(this).closest('tr').attr('data-index'));
                var lineup = commonData.selectedGame.guest.lineup;
                lineup[idx].fieldingPosition = $(this).val();
                renderLineupTab();
            });
            $(document).on('click', '#guestLineupTableBody .lineup-clear-player', function () {
                var idx = parseInt($(this).closest('tr').attr('data-index'));
                commonData.selectedGame.guest.lineup[idx].player = null;
                renderLineupTab();
            });
            $(document).on('click', '#guestLineupTableBody .lineup-delete', function () {
                var $btn = $(this);
                var msg  = $btn.attr('data-confirm') || 'Are you sure?';
                if (confirm(msg)) {
                    var idx = parseInt($btn.closest('tr').attr('data-index'));
                    commonData.selectedGame.guest.lineup.splice(idx, 1);
                    renderLineupTab();
                }
            });
            $(document).on('click', '#guestLineupAddBtn', function () {
                if (!commonData.selectedGame.guest.lineup) commonData.selectedGame.guest.lineup = [];
                commonData.selectedGame.guest.lineup.push(deepCopy(commonData.emptyLineup));
                renderLineupTab();
            });

            // Roster tab buttons
            $(document).on('click', '#homeTeamEditBtn',   function () { commonData.isHomeTeamEdit = true; if (!commonData.walkupFiles) refreshWalkupFiles(); renderRosterTab(); });
            $(document).on('click', '#homeTeamSelectBtn', function () { commonData.isSelectHomeTeam = true; renderRosterTab(); });
            $(document).on('click', '#homeTeamSaveBtn',   function () { homeTeamSave(); });
            $(document).on('click', '#homeTeamCancelBtn', function () { commonData.isHomeTeamEdit = false; renderRosterTab(); });
            $(document).on('change', '#homeTeamSelectDropdown', function () {
                var id = $(this).val();
                commonData.selectedHomeTeam = (commonData.teams || []).find(function (t) { return t.id === id; }) || null;
                if (id === '00000000-0000-0000-0000-000000000000') commonData.selectedHomeTeam = { id: id };
                homeTeamSelected();
            });
            $(document).on('click', '#homeRosterEditTableBody .player-delete', function () {
                var idx = parseInt($(this).closest('tr').attr('data-index'));
                commonData.selectedGame.home.team.roster.splice(idx, 1);
                renderRosterTab();
            });
            $(document).on('click', '#homeRosterAddBtn', function () {
                commonData.selectedGame.home.team.roster.push(deepCopy(commonData.emptyPlayer));
                renderRosterTab();
            });

            $(document).on('click', '#guestTeamEditBtn',   function () { commonData.isGuestTeamEdit = true; if (!commonData.walkupFiles) refreshWalkupFiles(); renderRosterTab(); });
            $(document).on('click', '#guestTeamSelectBtn', function () { commonData.isSelectGuestTeam = true; renderRosterTab(); });
            $(document).on('click', '#guestTeamSaveBtn',   function () { guestTeamSave(); });
            $(document).on('click', '#guestTeamCancelBtn', function () { commonData.isGuestTeamEdit = false; renderRosterTab(); });
            $(document).on('change', '#guestTeamSelectDropdown', function () {
                var id = $(this).val();
                commonData.selectedGuestTeam = (commonData.teams || []).find(function (t) { return t.id === id; }) || null;
                if (id === '00000000-0000-0000-0000-000000000000') commonData.selectedGuestTeam = { id: id };
                guestTeamSelected();
            });
            $(document).on('click', '#guestRosterEditTableBody .player-delete', function () {
                var idx = parseInt($(this).closest('tr').attr('data-index'));
                commonData.selectedGame.guest.team.roster.splice(idx, 1);
                renderRosterTab();
            });
            $(document).on('click', '#guestRosterAddBtn', function () {
                commonData.selectedGame.guest.team.roster.push(deepCopy(commonData.emptyPlayer));
                renderRosterTab();
            });

            // Roster edit walkup play
            $(document).on('click', '.walkup-play-btn', function () {
                var $row = $(this).closest('tr');
                var idx = parseInt($row.attr('data-index'));
                var fileName = $row.find('.player-walkup-select').val();
                if (fileName) audioFilePlayWalkup({ fileName: fileName });
            });
            $(document).on('click', '.walkup-stop-btn', function () { audioFileStop(); });

            // Teams tab
            $(document).on('change', '#teamSelectDropdown', function () {
                var id = $(this).val();
                if (!id) return;
                if (id === '00000000-0000-0000-0000-000000000000') {
                    commonData.selectedTeam = { id: id, roster: [] };
                } else {
                    commonData.selectedTeam = (commonData.teams || []).find(function (t) { return t.id === id; }) || null;
                }
                teamSelected();
            });
            $(document).on('click', '#teamEditBtn',         function () { commonData.isTeamEdit = true; if (!commonData.walkupFiles) refreshWalkupFiles(); renderTeamsTab(); });
            $(document).on('click', '#teamSelectBtn',       function () { commonData.isSelectTeam = true; renderTeamsTab(); });
            $(document).on('click', '#teamSaveBtn',         function () { teamSave(); });
            $(document).on('click', '#teamCancelBtn',       function () { commonData.isTeamEdit = false; renderTeamsTab(); });
            $(document).on('click', '#teamDeleteBtn',       function () { if (confirm('Delete this team?')) teamDelete(); });
            $(document).on('click', '#teamSelectCancelBtn', function () { commonData.isSelectTeam = false; renderTeamsTab(); });
            $(document).on('click', '#teamRefreshBtn',      function () { refreshTeams(); });
            $(document).on('click', '#teamRosterAddBtn',    function () { if (commonData.selectedTeam) { commonData.selectedTeam.roster.push(deepCopy(commonData.emptyPlayer)); renderTeamsTab(); } });
            $(document).on('click', '#teamRosterEditTableBody .player-delete', function () {
                var idx = parseInt($(this).closest('tr').attr('data-index'));
                commonData.selectedTeam.roster.splice(idx, 1);
                renderTeamsTab();
            });
            // Teams view — walkup play/stop/preview
            $(document).on('click', '.teams-walkup-play', function () {
                var file = $(this).attr('data-file');
                if (file) audioFilePlayWalkup(JSON.parse(file));
            });
            $(document).on('click', '.teams-walkup-stop',    function () { audioFileStop(); });
            $(document).on('click', '.teams-walkup-preview', function () {
                audioFilePreview($(this), $(this).attr('data-filename'), 'walkup');
            });

            // Walkup Songs tab
            $(document).on('click', '#refreshWalkupBtn', function () { refreshWalkupFiles(); });
            $(document).on('click', '.walkup-play-song', function () {
                var file = $(this).attr('data-file');
                if (file) audioFilePlayWalkup(JSON.parse(file));
            });
            $(document).on('click', '.walkup-stop-song', function () { audioFileStop(); });
            $(document).on('click', '.walkup-preview-song', function () {
                audioFilePreview($(this), $(this).attr('data-filename'), 'walkup');
            });

            // Full Songs tab
            $(document).on('click', '#refreshFullSongsBtn', function () { refreshFullSongFiles(); });
            $(document).on('click', '.fullsong-play', function () {
                var file = $(this).attr('data-file');
                if (file) audioFilePlayFullSong(JSON.parse(file));
            });
            $(document).on('click', '.fullsong-stop',    function () { audioFileStop(); });
            $(document).on('click', '.fullsong-preview', function () {
                audioFilePreview($(this), $(this).attr('data-filename'), 'fullSongs');
            });

            // Playlists tab
            $(document).on('click', '#refreshPlaylistsBtn',    function () { refreshPlaylists(); refreshFullSongFiles(); });
            $(document).on('click', '#playlistStopBtn',        function () { audioFileStop(); });
            $(document).on('click', '#newPlaylistBtn',         function () { openNewPlaylist(); });
            $(document).on('click', '#savePlaylistBtn',        function () { saveCurrentPlaylist(); });
            $(document).on('click', '#cancelPlaylistBtn',      function () { commonData.editingPlaylist = null; $('#playlistEditPanel').hide(); });
            $(document).on('click', '.playlist-play-btn',      function () { playNamedPlaylist($(this).attr('data-id')); });
            $(document).on('click', '.playlist-edit-btn',      function () { openEditPlaylist($(this).attr('data-id')); });
            $(document).on('click', '.playlist-delete-btn',    function () { deletePlaylist($(this).attr('data-id')); });
            $(document).on('click', '.playlist-song-preview',  function () {
                audioFilePreview($(this), $(this).attr('data-filename'), 'fullSongs');
            });

            // Video Streams tab
            $(document).on('click', '#videoStreamStartBtn',          function () {
                commonData.videoStreams.teamName         = $('#videoTeamNameInput').val();
                commonData.videoStreams.opponentTeamName = $('#videoOpponentNameInput').val();
                videoStreamStart();
            });
            $(document).on('click', '#videoStreamStopBtn',           function () { videoStreamStop(); });
            $(document).on('click', '#youtubeStreamStartBtn',        function () {
                commonData.videoStreams.youtubeRtmpUrl = $('#youtubeRtmpInput').val();
                videoStreamYoutubeStart();
            });
            $(document).on('click', '#youtubeStreamStopBtn',         function () { videoStreamYoutubeStop(); });
            $(document).on('click', '#gamechangerStreamStartBtn',    function () {
                commonData.videoStreams.gamechangerRtmpUrl = $('#gamechangerRtmpInput').val();
                videoStreamGameChangerStart();
            });
            $(document).on('click', '#gamechangerStreamStopBtn',     function () { videoStreamGameChangerStop(); });
            $(document).on('click', '#fileStreamStartBtn',           function () { videoStreamFileStart(); });
            $(document).on('click', '#fileStreamStopBtn',            function () { videoStreamFileStop(); });

            // Video Files tab
            $(document).on('click', '#refreshVideoFilesBtn', function () { refreshVideoFiles(); });
            $(document).on('click', '.videofile-play', function () {
                var file = $(this).attr('data-file');
                if (file) radarMonitor.sendServerCommand('videoFile', { cmd: 'play', data: JSON.parse(file) });
            });
            $(document).on('click', '.videofile-stop', function () {
                radarMonitor.sendServerCommand('videoFile', { cmd: 'stop' });
            });

            // Practice Mode tab
            $(document).on('change', '#practiceTeamSelectDropdown', function () {
                var id = $(this).val();
                commonData.practiceMode.selectedTeam = (commonData.teams || []).find(function (t) { return t.id === id; }) || null;
                renderPracticeModeTab();
            });
            $(document).on('change', '#practicePitcherSelectDropdown', function () {
                var idx = parseInt($(this).val());
                var roster = commonData.practiceMode.selectedTeam ? commonData.practiceMode.selectedTeam.roster : [];
                commonData.practiceMode.selectedPitcher = (!isNaN(idx) && roster[idx]) ? roster[idx] : null;
                practiceModePitcherSelected();
            });
            $(document).on('change', '#practiceBatterSelectDropdown', function () {
                var idx = parseInt($(this).val());
                var roster = commonData.practiceMode.selectedTeam ? commonData.practiceMode.selectedTeam.roster : [];
                commonData.practiceMode.selectedBatter = (!isNaN(idx) && roster[idx]) ? roster[idx] : null;
                practiceModeBatterSelected();
            });
            $(document).on('click', '#practicePitcherClearBtn', function () {
                commonData.practiceMode.selectedPitcher = null;
                practiceModePitcherSelected();
                renderPracticeModeTab();
            });
            $(document).on('click', '#practiceBatterClearBtn', function () {
                commonData.practiceMode.selectedBatter = null;
                practiceModeBatterSelected();
                renderPracticeModeTab();
            });

            // Radar Config tab
            $(document).on('click', '#radarTurnOnBtn',  function () { radarCommand('TransmiterControl', 1); });
            $(document).on('click', '#radarTurnOffBtn', function () { radarCommand('TransmiterControl', 0); });
            $(document).on('click', '#radarConfigEditBtn', function () { commonData.editRadarConfig = true;  renderRadarConfigTab(); });
            $(document).on('click', '#radarConfigSaveBtn', function () {
                if (commonData.radarConfig.LowSpeedThreshold)  { commonData.radarConfig.LowSpeedThreshold.value  = parseFloat($('#rcEditLowSpeedThreshold').val());  commonData.radarConfig.LowSpeedThreshold.isDirty  = true; }
                if (commonData.radarConfig.HighSpeedThreshold) { commonData.radarConfig.HighSpeedThreshold.value = parseFloat($('#rcEditHighSpeedThreshold').val()); commonData.radarConfig.HighSpeedThreshold.isDirty = true; }
                if (commonData.radarConfig.CosignAngle1)       { commonData.radarConfig.CosignAngle1.value       = parseFloat($('#rcEditCosignAngle1').val());       commonData.radarConfig.CosignAngle1.isDirty       = true; }
                if (commonData.radarConfig.CosignAngle2)       { commonData.radarConfig.CosignAngle2.value       = parseFloat($('#rcEditCosignAngle2').val());       commonData.radarConfig.CosignAngle2.isDirty       = true; }
                if (commonData.radarConfig.Range)              { commonData.radarConfig.Range.value              = parseFloat($('#rcEditRange').val());              commonData.radarConfig.Range.isDirty              = true; }
                if (commonData.radarConfig.MessagePeriod)      { commonData.radarConfig.MessagePeriod.value      = parseFloat($('#rcEditMessagePeriod').val());      commonData.radarConfig.MessagePeriod.isDirty      = true; }
                if (commonData.radarConfig.AutoClearDelay)     { commonData.radarConfig.AutoClearDelay.value     = parseFloat($('#rcEditAutoClearDelay').val());     commonData.radarConfig.AutoClearDelay.isDirty     = true; }
                if (commonData.radarConfig.HitSpeedEnable)     { commonData.radarConfig.HitSpeedEnable.value     = parseFloat($('#rcEditHitSpeedEnable').val());     commonData.radarConfig.HitSpeedEnable.isDirty     = true; }
                if (commonData.radarConfig.TargetDirection)    { commonData.radarConfig.TargetDirection.value    = parseFloat($('#rcEditTargetDirection').val());    commonData.radarConfig.TargetDirection.isDirty    = true; }
                updateRadarConfig();
                commonData.editRadarConfig = false;
                renderRadarConfigTab();
            });
            $(document).on('click', '#radarResetBtn', function () { radarMonitor.sendResetRadarSettings(); });

            // Radar off modal
            $('#radarOffModal').on('hidden.bs.modal', function () {
                radarOffModalOpen = false;
                radarCommand('TransmiterControl', 1);
            });
            $(document).on('click', '#radarOffTurnOnBtn', function () {
                $('#radarOffModal').modal('hide');
                radarCommand('TransmiterControl', 1);
            });

            // Server Logs select controls
            $(document).on('change', 'select.appLogName', function () {
                var $appLogSubname = $(this).parent().find('select.appLogSubname').empty();
                var levels = commonData.serverLogsSubscribe.appLogLevels;
                if (levels && levels[$(this).val()]) {
                    $.each(levels[$(this).val()], function (subname) {
                        $appLogSubname.append($('<option>', { value: subname, text: subname }));
                    });
                }
                $appLogSubname.trigger('change');
            });
            $(document).on('change', 'select.appLogSubname', function () {
                var $parent = $(this).parent();
                var appLogName = $parent.find('select.appLogName').val();
                var levels = commonData.serverLogsSubscribe.appLogLevels;
                if (levels && levels[appLogName] && levels[appLogName][$(this).val()] !== undefined) {
                    $parent.find('select.appLogLevelName').val(levels[appLogName][$(this).val()]);
                }
            });
            $(document).on('change', 'select.appLogLevelName', function () {
                var $parent = $(this).parent();
                var appLogName = $parent.find('select.appLogName').val();
                var appLogSubname = $parent.find('select.appLogSubname').val();
                var logLevelName = $(this).val();
                var levels = commonData.serverLogsSubscribe.appLogLevels;
                if (levels && levels[appLogName] && levels[appLogName][appLogSubname] !== logLevelName) {
                    levels[appLogName][appLogSubname] = logLevelName;
                    radarMonitor.sendServerCommand('serverLogs', { cmd: 'setAppLogLevels', data: { appLogLevels: levels } });
                }
            });
        }

        // ── Game management ───────────────────────────────────────────────────
        function gameScore() {
            var sg = commonData.selectedGame;
            if (!sg) return;
            if (sg.id === '00000000-0000-0000-0000-000000000000') sg.id = null;
            $.ajax({ url: '/data/scoreGame', type: 'PUT', contentType: 'application/json', data: JSON.stringify(sg) })
                .then(function () {
                    commonData.isGameEdit     = false;
                    commonData.isGameSelected = true;
                    commonData.isGameScore    = true;
                    commonData.isGameAdmin    = true;
                    updatePitchersBatters();
                    window.location.hash = '#scoreGame';
                    render();
                    renderGameScore();
                    renderPitcherBatterSelects();
                });
        }

        function gameSave() {
            var sg = commonData.selectedGame;
            if (!sg) return;
            if (sg.id === '00000000-0000-0000-0000-000000000000') sg.id = null;
            $.ajax({ url: '/data/game', type: 'PUT', contentType: 'application/json', data: JSON.stringify(sg) })
                .then(function () {
                    commonData.isGameEdit     = false;
                    commonData.isGameSelected = true;
                    renderVisibility();
                });
        }

        function gameSelected() {
            var sg = commonData.selectedGame;
            if (!sg) return;
            if (sg.id === '00000000-0000-0000-0000-000000000000') {
                commonData.selectedGame             = deepCopy(sg);
                commonData.selectedGame.id          = radarMonitor.uuid();
                commonData.selectedGame.name        = '';
                commonData.selectedGame.startDate   = moment().toISOString();
                commonData.isGameEdit               = true;
                commonData.isSelectHomeTeam         = true;
                commonData.isSelectGuestTeam        = true;
                commonData.isGameSelected           = true;
                commonData.isGameSelect             = false;
                render();
            } else {
                $.ajax({ url: '/data/game/' + sg.id, type: 'GET' }).then(function (data) {
                    commonData.selectedGame          = data;
                    commonData.isGameEdit            = false;
                    commonData.isSelectHomeTeam      = false;
                    commonData.isSelectGuestTeam     = false;
                    commonData.isGameSelected        = true;
                    commonData.isGameSelect          = false;
                    render();
                });
            }
        }

        function homeTeamSelected() {
            var ht = commonData.selectedHomeTeam;
            if (!ht) return;
            if (ht.id === '00000000-0000-0000-0000-000000000000') {
                commonData.selectedGame.home.team        = deepCopy(ht);
                commonData.selectedGame.home.team.id     = radarMonitor.uuid();
                commonData.selectedGame.home.team.name   = '';
                if (!commonData.selectedGame.home.team.roster) commonData.selectedGame.home.team.roster = [];
                for (var i = 0; i < 10; i++) commonData.selectedGame.home.team.roster.push(deepCopy(commonData.emptyPlayer));
                if (!commonData.selectedGame.home.lineup) commonData.selectedGame.home.lineup = [];
                for (var i = 0; i < 10; i++) commonData.selectedGame.home.lineup.push(deepCopy(commonData.emptyLineup));
                commonData.isHomeTeamEdit = true;
            } else {
                commonData.selectedGame.home.team = ht;
            }
            commonData.isSelectHomeTeam = false;
            renderRosterTab();
        }

        function guestTeamSelected() {
            var gt = commonData.selectedGuestTeam;
            if (!gt) return;
            if (gt.id === '00000000-0000-0000-0000-000000000000') {
                commonData.selectedGame.guest.team        = deepCopy(gt);
                commonData.selectedGame.guest.team.id     = radarMonitor.uuid();
                commonData.selectedGame.guest.team.name   = '';
                if (!commonData.selectedGame.guest.team.roster) commonData.selectedGame.guest.team.roster = [];
                for (var i = 0; i < 10; i++) commonData.selectedGame.guest.team.roster.push(deepCopy(commonData.emptyPlayer));
                if (!commonData.selectedGame.guest.lineup) commonData.selectedGame.guest.lineup = [];
                for (var i = 0; i < 10; i++) commonData.selectedGame.guest.lineup.push(deepCopy(commonData.emptyLineup));
                commonData.isGuestTeamEdit = true;
            } else {
                commonData.selectedGame.guest.team = gt;
            }
            commonData.isSelectGuestTeam = false;
            renderRosterTab();
        }

        function homeTeamSave() {
            var team = commonData.selectedGame.home.team;
            team.name      = $('#homeTeamNameInput').val();
            team.shortName = $('#homeTeamShortNameInput').val();
            team.roster    = collectRosterFromTable($('#homeRosterEditTableBody'));
            if (team.id === '00000000-0000-0000-0000-000000000000') team.id = null;
            $.ajax({ url: '/data/team', type: 'PUT', contentType: 'application/json', data: JSON.stringify(team) })
                .then(function () { commonData.isHomeTeamEdit = false; renderRosterTab(); });
        }

        function guestTeamSave() {
            var team = commonData.selectedGame.guest.team;
            team.name      = $('#guestTeamNameInput').val();
            team.shortName = $('#guestTeamShortNameInput').val();
            team.roster    = collectRosterFromTable($('#guestRosterEditTableBody'));
            if (team.id === '00000000-0000-0000-0000-000000000000') team.id = null;
            $.ajax({ url: '/data/team', type: 'PUT', contentType: 'application/json', data: JSON.stringify(team) })
                .then(function () { commonData.isGuestTeamEdit = false; renderRosterTab(); });
        }

        function teamSelected() {
            var st = commonData.selectedTeam;
            if (!st) return;
            if (st.id === '00000000-0000-0000-0000-000000000000') {
                commonData.selectedTeam     = deepCopy(st);
                commonData.selectedTeam.id  = radarMonitor.uuid();
                commonData.selectedTeam.name = '';
                if (!commonData.selectedTeam.roster) commonData.selectedTeam.roster = [];
                for (var i = 0; i < 15; i++) commonData.selectedTeam.roster.push(deepCopy(commonData.emptyPlayer));
                commonData.isTeamEdit = true;
            }
            commonData.isSelectTeam = false;
            renderTeamsTab();
        }

        function teamSave() {
            var team = commonData.selectedTeam;
            team.name      = $('#teamNameInput').val();
            team.shortName = $('#teamShortNameInput').val();
            team.roster    = collectRosterFromTable($('#teamRosterEditTableBody'));
            if (team.id === '00000000-0000-0000-0000-000000000000') team.id = null;
            $.ajax({ url: '/data/team', type: 'PUT', contentType: 'application/json', data: JSON.stringify(team) })
                .then(function () { commonData.isTeamEdit = false; renderTeamsTab(); });
        }

        function teamDelete() {
            var team = commonData.selectedTeam;
            if (!team || team.id === '00000000-0000-0000-0000-000000000000') return;
            $.ajax({ url: '/data/team/' + team.id, type: 'DELETE' }).then(function () {
                commonData.selectedTeam = null;
                refreshTeams().then(function () {
                    commonData.isTeamEdit   = false;
                    commonData.isSelectTeam = true;
                    renderTeamsTab();
                });
            });
        }

        // ── Additional game scoring helpers ───────────────────────────────────
        function ball() {
            var sg = commonData.selectedGame;
            if (sg.balls >= 3) { nextBatter(); return; }
            sg.balls++;
            var data = { balls: sg.balls };
            addToGameLog(data);
            radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
            renderGameScore();
        }

        function strike() {
            var sg = commonData.selectedGame;
            if (sg.strikes >= 2) { batterOut(); return; }
            sg.strikes++;
            var data = { strikes: sg.strikes };
            addToGameLog(data);
            radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
            renderGameScore();
        }

        function foul() {
            var sg = commonData.selectedGame;
            if (!sg.fouls) sg.fouls = 0;
            sg.fouls++;
            var data = { fouls: sg.fouls };
            if (sg.strikes < 2) { sg.strikes++; data.strikes = sg.strikes; }
            addToGameLog(data);
            radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
            renderGameScore();
        }

        function runnerOut() {
            var sg = commonData.selectedGame;
            if (sg.outs >= 2) { inning(); return; }
            sg.outs++;
            var data = { outs: sg.outs };
            addToGameLog(data);
            radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
            renderGameScore();
        }

        function batterSafeFieldersChoice() {
            var sg = commonData.selectedGame;
            if (sg.outs >= 2) { nextBatter(); inning(); return; }
            sg.outs++;
            var data = { outs: sg.outs };
            nextBatter();
            addToGameLog(data);
            radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
        }

        function batterOutDoublePlay() {
            var sg = commonData.selectedGame;
            if (sg.outs >= 1) { nextBatter(); inning(); return; }
            sg.outs = 2;
            var data = { outs: sg.outs };
            nextBatter();
            addToGameLog(data);
            radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
        }

        function batterOutTriplePlay() {
            var sg = commonData.selectedGame;
            sg.outs = 3;
            var data = { outs: sg.outs };
            nextBatter();
            addToGameLog(data);
            radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
        }

        function pitcherChange() {
            var sg = commonData.selectedGame;
            var data = { pitcher: sg.pitcher };
            addToGameLog(data);
            radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
            renderPitcherBatterSelects();
        }

        function batterChange() {
            var sg = commonData.selectedGame;
            var data = { batter: sg.batter };
            if (sg.inningPosition === 'top') {
                var idx = sg.guest.lineup.indexOf(sg.batter);
                sg.guest.batterIndex = idx;
                data.guest = { batterIndex: idx };
            } else {
                var idx = sg.home.lineup.indexOf(sg.batter);
                sg.home.batterIndex = idx;
                data.home = { batterIndex: idx };
            }
            addToGameLog(data);
            radarMonitor.sendServerCommand('gameChange', { cmd: 'gameChange', data: data });
            renderPitcherBatterSelects();
        }

        // ── Socket listeners ──────────────────────────────────────────────────
        function setupSocketListeners() {
            radarMonitor.on('connect', function () {
                commonData.isConnected = true;
                renderStatusBar();
            });
            radarMonitor.on('disconnect', function () {
                commonData.isConnected = false;
                renderStatusBar();
            });
            radarMonitor.on('reconnecting', function () {
                commonData.isConnected = false;
                renderStatusBar();
            });
            radarMonitor.on('reconnect', function () {
                commonData.isConnected = true;
                renderStatusBar();
            });
            radarMonitor.on('radarTimeout', function (data) {
                commonData.lastSpeedDataTimestamp = data.lastSpeedDataTimestamp;
                renderStatusBar();
            });
            radarMonitor.on('serverInfo', function (data) {
                commonData.serverInfo = data;
                renderStatusBar();
            });
            radarMonitor.on('batteryVoltage', function (data) {
                commonData.batteryVoltage = data;
                renderStatusBar();
                renderRadarConfigTab();
            });
            radarMonitor.on('radarSpeed', function (data) {
                commonData.radarSpeedData = data;
                var copy = deepCopy(data);
                if (commonData.isGameScore && commonData.selectedGame) {
                    if (!commonData.selectedGame.radarSpeedData) commonData.selectedGame.radarSpeedData = [];
                    commonData.selectedGame.radarSpeedData.push(copy);
                }
                commonData.radarSpeedDataHistory.unshift(copy);
                var maxHistory = (commonData.softwareConfig && commonData.softwareConfig.radarSpeedHistoryCount) || 100;
                if (commonData.radarSpeedDataHistory.length > maxHistory) commonData.radarSpeedDataHistory.pop();
                renderSpeedDisplay();
                if (commonData.activeTabName === 'radarHistory') renderRadarHistoryTable();
            });
            radarMonitor.on('radarSpeedDataHistory', function (data) {
                commonData.radarSpeedDataHistory = data;
                renderSpeedDisplay();
                renderRadarHistoryTable();
            });
            radarMonitor.on('radarConfig', function (data) {
                commonData.radarConfig = data;
                if (data.TransmiterControl && data.TransmiterControl.value === 0) showRadarOffModal();
                if (data.ProductID && data.ProductID.value === 'Radar Emulator') {
                    commonData.isRadarEmulator = true;
                    renderVisibility();
                }
                renderRadarConfigTab();
            });
            radarMonitor.on('radarConfigProperty', function (data) {
                if (commonData.radarConfig[data.Property]) {
                    commonData.radarConfig[data.Property].value = data.data;
                }
                if (data.Property === 'TransmiterControl') {
                    if (data.data === 0) {
                        showRadarOffModal();
                    } else {
                        $('#radarOffModal').modal('hide');
                        radarOffModalOpen = false;
                    }
                }
                renderRadarConfigTab();
            });
            radarMonitor.on('radarCommand', function () {
                commonData.isradarCommandPending = false;
                renderRadarConfigTab();
            });
            radarMonitor.on('softwareConfig', function (data) {
                commonData.softwareConfig = data;
            });
            radarMonitor.on('softwareConfigProperty', function (data) {
                if (commonData.softwareConfig && commonData.softwareConfig[data.Property]) {
                    commonData.softwareConfig[data.Property].value = data.data;
                }
            });
            radarMonitor.on('gameChanged', function (message) {
                console.log('gameChanged', message);
                if (!commonData.game) commonData.game = {};
                switch (message.cmd) {
                    case 'gameChanged':
                        if (message.data) {
                            var d = message.data, g = commonData.game;
                            if (d.inning !== undefined)         g.inning         = d.inning;
                            if (d.inningPosition !== undefined) g.inningPosition = d.inningPosition;
                            if (d.outs !== undefined)           g.outs           = d.outs;
                            if (d.strikes !== undefined)        g.strikes        = d.strikes;
                            if (d.balls !== undefined)          g.balls          = d.balls;
                            if (d.pitcher !== undefined)        g.pitcher        = d.pitcher;
                            if (d.batter !== undefined)         g.batter         = d.batter;
                            if (d.score) {
                                if (!g.score) g.score = {};
                                if (d.score.home  !== undefined) g.score.home  = d.score.home;
                                if (d.score.guest !== undefined) g.score.guest = d.score.guest;
                            }
                            if (d.guest) {
                                if (!g.guest) g.guest = {};
                                if (d.guest.team        !== undefined) g.guest.team        = d.guest.team;
                                if (d.guest.lineup      !== undefined) g.guest.lineup      = d.guest.lineup;
                                if (d.guest.batterIndex !== undefined) g.guest.batterIndex = d.guest.batterIndex;
                            }
                            if (d.home) {
                                if (!g.home) g.home = {};
                                if (d.home.team        !== undefined) g.home.team        = d.home.team;
                                if (d.home.lineup      !== undefined) g.home.lineup      = d.home.lineup;
                                if (d.home.batterIndex !== undefined) g.home.batterIndex = d.home.batterIndex;
                            }
                        }
                        break;
                    case 'scoreGame':
                        if (!commonData.isGameScore) {
                            commonData.game = message.data.game;
                            updatePitchersBatters();
                        }
                        break;
                }
                renderGameDisplay();
                renderGameScore();
            });
            radarMonitor.on('practiceMode', function (message) {
                switch (message.cmd) {
                    case 'pitcher': commonData.practiceMode.selectedPitcher = message.data.pitcher; break;
                    case 'batter':  commonData.practiceMode.selectedBatter  = message.data.batter;  break;
                }
                renderPracticeModeTab();
            });
            radarMonitor.on('serverLogs', function (message) {
                addLogRow(message.data, $('.serverLogs'), true);
            });
            radarMonitor.on('videoStreams', function (message) {
                switch (message.cmd) {
                    case 'updateSettings':    updateVideoStreamSettings(message.data); break;
                    case 'allStreamStats':    commonData.videoStreamStats = message.data; renderVideoStreamsTab(); break;
                    case 'youtubeStreamStats':     commonData.videoStreamStats.youtube     = message.data; renderVideoStreamsTab(); break;
                    case 'gamechangerStreamStats': commonData.videoStreamStats.gamechanger = message.data; renderVideoStreamsTab(); break;
                    case 'fileStreamStats':        commonData.videoStreamStats.file        = message.data; renderVideoStreamsTab(); break;
                }
            });
        }

        // ── Init ──────────────────────────────────────────────────────────────
        function initData() {
            refreshTeams();
            refreshGames();
            getCurrentGame().then(function () {
                if (window.location.hash === '#scoreGame' && commonData.game) {
                    commonData.selectedGame   = commonData.game;
                    commonData.isGameSelected = true;
                    commonData.isGameScore    = true;
                    commonData.isGameAdmin    = true;
                    updatePitchersBatters();
                    render();
                    renderGameScore();
                    renderPitcherBatterSelects();
                }
            });
        }

        function init() {
            bindEvents();
            setupSocketListeners();
            render();
            initData();
        }

        return { init: init, commonData: commonData };

    })(jQuery);

})();
