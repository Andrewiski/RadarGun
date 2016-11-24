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
         templateUrl: "/app/js/modules/scoreboard/scoreboard.tpl.html",
         link: function (scope, elm, atts, c) {
            console.log('scoreboard link')
            //dom manipulation goes in the link function

         }
      };
   }
   ]);

})();
