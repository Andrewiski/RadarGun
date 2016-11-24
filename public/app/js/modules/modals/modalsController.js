(function () {

   'use strict';

    angular.module('scoreboardapp')
       .controller('modalsController', [
           '$scope', '$uibModal', function ($scope, $uibModal) {

              $scope.editContract = function () {

                  $scope.modalInstance = $uibModal.open({
                    templateUrl: '/App/html/partials/modals/edit-contract.html',
                    backdrop: 'static',
                    fade: false,
                    animate: false,
                    dialogClass: 'modal',
                    backdropClass: 'modal-backdrop',
                    windowClass: "modal fade in"
                 });
              };

              $scope.createContract = function () {

                  $scope.modalInstance = $uibModal.open({
                    templateUrl: '/App/html/partials/modals/create-contract.html',
                    backdrop: 'static',
                    fade: true,
                    animate: true,
                    dialogClass: 'modal',
                    backdropClass: 'modal-backdrop',
                    windowClass: "modal fade in"
                 });
              };

              $scope.uploadTemplate = function () {

                  $scope.modalInstance = $uibModal.open({
                    templateUrl: '/App/html/partials/modals/upload-template.html',
                    backdrop: 'static',
                    fade: true,
                    animate: true,
                    dialogClass: 'modal',
                    backdropClass: 'modal-backdrop',
                    backdropFade: false,
                    dialogFade: false,
                    windowClass: "modal fade in"
                 });
              };


              $scope.editTemplate = function () {

                  $scope.modalInstance = $uibModal.open({
                    templateUrl: '/App/html/partials/modals/edit-template.html',
                    backdrop: 'static',
                    fade: true,
                    animate: true,
                    dialogClass: 'modal',
                    backdropClass: 'modal-backdrop',
                    backdropFade: false,
                    dialogFade: false,
                    windowClass: "modal fade in"
                 });
              };

           }
       ]);

})();