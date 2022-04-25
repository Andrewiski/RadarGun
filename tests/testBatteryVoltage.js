var BeagleBone = require('beaglebone-io');
var board = new BeagleBone();

board.on('ready', function () {
    this.pinMode('A1', this.MODES.ANALOG);
    this.analogRead('A1', function (value) {
        console.log(value);
    });
});