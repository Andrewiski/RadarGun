(function () {

    'use strict';

    angular.module('scoreboardapp')
        .filter('numpading', [ function () {
            return function (input, trailing, leading) {
                
                if (input === undefined)
                    input = "0.0"
                var myfloat = parseFloat(input);
                if (myfloat === "NAN")
                    myfloat = 0.0;
                var output = myfloat.toFixed(trailing);
                if (output.length < (leading + trailing + 1)) {
                    for (var i = output.length; i < (leading + trailing + 1); i++ ){
                        output = "0" + output;
                    }
                }
                return output;
            };
        }]);
})();