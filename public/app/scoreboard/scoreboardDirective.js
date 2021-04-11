(function () {

   'use strict';

    angular.module('scoreboardapp')
        .directive('scoreboard', [function () {
            return {
                restrict: 'A',
                replace: true,
                scope: false,
                require: '?ngModel',
                controller: 'scoreboardController',
                templateUrl: "/app/scoreboard/scoreboard.tpl.html",
                link: function (scope, elm, atts, c) {
                    console.log('scoreboard link')
                    //dom manipulation goes in the link function

                }
            };
        }
        ])
        .directive('convertToNumber', function () {
            return {
                require: 'ngModel',
                link: function (scope, element, attrs, ngModel) {
                    ngModel.$parsers.push(function (val) {
                        return parseInt(val, 10);
                    });
                    ngModel.$formatters.push(function (val) {
                        return '' + val;
                    });
                }
            };
        })
        ;
})();
