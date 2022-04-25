var boneScript;

try {
    boneScript = require('bonescript');
    boneScript.getPlatform(function (x) {
        console.log('bonescript getPlatform');
        console.log('name = ' + x.name);
        console.log('bonescript = ' + x.bonescript);
        console.log('serialNumber = ' + x.serialNumber);
        console.log('dogtag = ' + x.dogtag);
        console.log('os = ', x.os);
    });
    var rxport = '/dev/ttyO1';
    var txport = '/dev/ttyO4';
    var options = { baudrate: 115200, parser: boneScript.serialParsers.readline('\n') };
    var teststring = "This is the string I'm sending out as a test";
    boneScript.serialOpen(rxport, options, onRxSerial);

    function onRxSerial(x) {
        console.log('rx.event = ' + x.event);
        if (x.err) throw ('***FAIL*** ' + JSON.stringify(x));
        if (x.event == 'open') {
            boneScript.serialOpen(txport, options, onTxSerial);
        }
        if (x.event == 'data') {
            console.log('rx (' + x.data.length +
                        ') = ' + x.data.toString('ascii'));
        }
    }

    function onTxSerial(x) {
        console.log('tx.event = ' + x.event);
        if (x.err) throw ('***FAIL*** ' + JSON.stringify(x));
        if (x.event == 'open') {
            writeRepeatedly();
        }
        if (x.event == 'data') {
            console.log('tx (' + x.data.length +
                        ') = ' + x.data.toString('ascii'));
        }
    }

    function printJSON(x) {
        console.log(JSON.stringify(x));
    }

    function writeRepeatedly() {
        boneScript.serialWrite(txport, teststring, onSerialWrite);
    }

    function onSerialWrite(x) {
        if (x.err) console.log('onSerialWrite err = ' + x.err);
        if (x.event == 'callback') setTimeout(writeRepeatedly, 1000);
    }
} catch (e) {
    console.log(e);
}