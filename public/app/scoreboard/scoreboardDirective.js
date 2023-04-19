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
        .directive("mwConfirmClick", [
            function () {
                return {
                    priority: -1,
                    restrict: 'A',
                    scope: { confirmFunction: "&mwConfirmClick" },
                    link: function (scope, element, attrs) {
                        element.bind('click', function (e) {
                            // message defaults to "Are you sure?"
                            var message = attrs.mwConfirmClickMessage ? attrs.mwConfirmClickMessage : "Are you sure?";
                            // confirm() requires jQuery
                            if (confirm(message)) {
                                scope.confirmFunction();
                            }
                        });
                    }
                }
            }
        ])
        ;
})();
