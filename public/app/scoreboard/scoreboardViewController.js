(function () {
    
    'use strict';
    
    angular.module('scoreboardapp')
       .controller('scoreboardViewController', [
        '$scope', function ($scope) {
            
            $scope.editContract = function () {
                
                $scope.hideSidebar1 = false;

                $scope.toggleSidebar1 = function (){

                    $scope.hideSidebar1 = !$scope.hideSidebar1;
                }
            };
            
            

        }
    ]);

})();