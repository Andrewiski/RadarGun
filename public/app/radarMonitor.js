(function () {
    'use strict';

    window.radarMonitor = (function () {
        var socket = io.connect();
        var listeners = {};

        function on(event, fn) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(fn);
        }

        function trigger(event, data) {
            (listeners[event] || []).forEach(function (fn) { fn(data); });
        }

        socket.on('connect', function () {
            console.log('radarMonitor connect');
            trigger('connect');
        });
        socket.on('disconnect', function () {
            console.log('radarMonitor disconnect');
            trigger('disconnect');
        });
        socket.on('reconnecting', function (msg) {
            console.log('radarMonitor reconnecting', msg);
            trigger('reconnecting', msg);
        });
        socket.on('reconnect', function (msg) {
            console.log('radarMonitor reconnect', msg);
            trigger('reconnect', msg);
        });
        socket.on('ping', function (msg) {
            trigger('ping', msg);
        });
        socket.on('pong', function (msg) {
            trigger('ping', msg);
        });
        socket.on('radarSpeed', function (msg) {
            console.log('radarMonitor radarSpeed', msg);
            trigger('radarSpeed', msg);
        });
        socket.on('radarTimeout', function (msg) {
            console.log('radarMonitor radarTimeout', msg);
            trigger('radarTimeout', msg);
        });
        socket.on('radarSpeedDataHistory', function (msg) {
            console.log('radarMonitor radarSpeedDataHistory', msg);
            trigger('radarSpeedDataHistory', msg);
        });
        socket.on('radarConfig', function (msg) {
            console.log('radarMonitor radarConfig', msg);
            trigger('radarConfig', msg);
        });
        socket.on('radarConfigProperty', function (msg) {
            console.log('radarMonitor radarConfigProperty', msg);
            trigger('radarConfigProperty', msg);
        });
        socket.on('radarCommand', function (msg) {
            console.log('radarMonitor radarCommand', msg);
            trigger('radarCommand', msg);
        });
        socket.on('softwareConfig', function (msg) {
            console.log('radarMonitor softwareConfig', msg);
            trigger('softwareConfig', msg);
        });
        socket.on('softwareConfigProperty', function (msg) {
            console.log('radarMonitor softwareConfigProperty', msg);
            trigger('softwareConfigProperty', msg);
        });
        socket.on('batteryVoltage', function (msg) {
            console.log('radarMonitor batteryVoltage', msg);
            trigger('batteryVoltage', msg);
        });
        socket.on('serverInfo', function (msg) {
            trigger('serverInfo', msg.data);
        });
        socket.on('gameChanged', function (msg) {
            trigger('gameChanged', msg);
        });
        socket.on('videoStreams', function (msg) {
            trigger('videoStreams', msg);
        });
        socket.on('practiceMode', function (msg) {
            trigger('practiceMode', msg);
        });
        socket.on('serverLogs', function (msg) {
            trigger('serverLogs', msg);
        });

        function sendRadarConfigCommand(cmd, data) {
            socket.emit('radarConfigCommand', { cmd: cmd, data: data });
        }

        function sendRadarEmulatorCommand(cmd, data) {
            socket.emit('radarEmulatorCommand', { cmd: cmd, data: data });
        }

        function sendResetRadarSettings() {
            socket.emit('resetRadarSettings', { cmd: 'resetRadarSettings' });
        }

        function sendServerCommand(cmd, data) {
            socket.emit(cmd, data);
            if (!socket.connected) {
                console.error('Socket.IO not connected to server');
            }
        }

        function uuid() {
            var chars = '0123456789abcdef'.split('');
            var u = [], r;
            u[8] = u[13] = u[18] = u[23] = '-';
            u[14] = '4';
            for (var i = 0; i < 36; i++) {
                if (!u[i]) {
                    r = 0 | Math.random() * 16;
                    u[i] = chars[(i === 19) ? (r & 0x3) | 0x8 : r & 0xf];
                }
            }
            return u.join('');
        }

        return {
            socket: socket,
            on: on,
            sendRadarConfigCommand: sendRadarConfigCommand,
            sendRadarEmulatorCommand: sendRadarEmulatorCommand,
            sendResetRadarSettings: sendResetRadarSettings,
            sendServerCommand: sendServerCommand,
            uuid: uuid
        };
    })();
})();
