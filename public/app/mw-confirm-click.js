"use strict";
(function () {
    angular.module("scoreboardapp")
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
    ]);
})();