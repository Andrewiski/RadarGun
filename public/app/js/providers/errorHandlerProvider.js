(function () {

   'use strict';
   angular.module('errorHandler', [])
       .provider('errorHandler', function () {
          //This is used to Prefetch the Error Template so we have something to display if 
          //Server is down.


          this.defaultErrorMessage = "An error has occurred.";
          // Call this from app.js config section to set the default Error Message
          this.setDefaultErrorMessage = function (text) {
             this.defaultErrorMessage = text;
          }

          this.$get = ['$rootScope', '$uibModal', '$http', function ($rootScope, $uibModal, $http) {


             var defaultErrorMessage = this.defaultErrorMessage;
             //this is used below to set the Controller of the Model
             var ErrorMessageModalInstanceCtrl = function ($scope, $uibModalInstance, $http, detailedErrorMessage, displayedErrorMessage, response) {
                //Set the properties on the scope so they can be accessed from the html mark up
                $scope.detailedErrorMessage = detailedErrorMessage;
                $scope.displayedErrorMessage = displayedErrorMessage;

                $scope.displayError = false;
                $scope.displayMessageContent = true;
                $scope.displayRetry = false;
                $scope.retry = function () {
                   console.log('Retry from Error Handler to ' + response.config.url);
                   $scope.displayMessageContent = false;
                   $scope.displayRetry = true;
                   $http(response.config).then(function (newresponse) {
                      $scope.$close(newresponse);
                   }, function (newresponse) {
                      console.log('Retry from Error Handler Failed so Redisplaying New Error ' + response.config.url);
                      $scope.detailedErrorMessage = getErrorMessage(newresponse);
                      $scope.displayedErrorMessage = getDetailedErrorMessage(newresponse);
                      $scope.displayRetry = false;
                      $scope.displayMessageContent = true;

                   });
                };

             };

             var getErrorMessage = function (response) {
                var ErrorMessage = defaultErrorMessage;
                if (typeof (response) == 'object') {
                   if (response.data != undefined) {
                      if (response.data.Message != undefined && response.data.Message != '') {
                         ErrorMessage = response.data.Message;
                      } else {
                         //This is most likly a 404 type error so response format is different
                         if (response.status != undefined) {
                            ErrorMessage = "Server Returned Status Code of " + response.status;
                         }
                         if (response.statusText != undefined) {
                            ErrorMessage = ErrorMessage + ' \n' + response.statusText;
                         }
                      }
                   }
                }
                return ErrorMessage;
             };

             var getDetailedErrorMessage = function (response) {
                var detailedErrorMessage = { Message: defaultErrorMessage, ExceptionMessage: '', ExceptionType: '', StackTrace: '' };
                if (typeof (response) == 'object') {
                   if (response.data != undefined && typeof (response.data) == 'object') {
                      if (response.data.ExceptionMessage != undefined && response.data.ExceptionMessage != '') {
                         detailedErrorMessage.ExceptionMessage = response.data.ExceptionMessage;
                      }
                      if (response.data.ExceptionType != undefined && response.data.ExceptionType != '') {
                         detailedErrorMessage.ExceptionType = response.data.ExceptionType;
                      }
                      if (response.data.StackTrace != undefined && response.data.StackTrace != '') {
                         detailedErrorMessage.StackTrace = response.data.StackTrace;
                      }
                   } else {
                      //This is most likly a 404 type error so response format is different
                      if (response.statusText != undefined) {
                         detailedErrorMessage.ExceptionMessage = response.statusText;
                      }
                      if (response.status != undefined) {
                         detailedErrorMessage.ExceptionType = response.status;
                         //this is what happens when the server can't be reached as its down
                         // or client internet is offline
                         if (response.status == 0 && response.statusText == '') {
                            detailedErrorMessage.ExceptionMessage = "Unable to Connect to Server.           Please check your internet connection.";
                            detailedErrorMessage.StackTrace = "Status 0 was returned from the server."
                         }
                      }
                      if (response.data != undefined) {
                         detailedErrorMessage.StackTrace = response.data;
                      }
                   }
                }
                return detailedErrorMessage;
             };

             return {

                RestangularErrorInterceptor: function (response, deferred) {

                   //we check the response to see if this is a WebApi Error or an http error to build the 
                   // error message for the user
                   var displayedErrorMessage = getErrorMessage(response);
                   var detailedErrorMessage = getDetailedErrorMessage(response);

                   var errorModalInstance = $uibModal.open({
                      controller: ErrorMessageModalInstanceCtrl,
                      templateUrl: '/App/html/partials/modals/error-handler.html',
                      backdrop: 'static',
                      fade: false,
                      animate: false,
                      dialogClass: 'modal',
                      backdropClass: 'modal-backdrop',
                      windowClass: "modal fade in",
                      //this is how we pass data to the Controller defined above
                      resolve: {
                         detailedErrorMessage: function () {
                            return detailedErrorMessage;
                         },
                         displayedErrorMessage: function () {
                            return displayedErrorMessage;
                         },
                         response: function () {
                            return response;
                         }
                      }


                   });
                   //The result is a returned promise that we can use to affect the orginal promise from restangular

                   errorModalInstance.result.then(function (response) {
                      //The User Clicked the Retry button which closed the dialog
                      console.log('Error Modal Retry Success at: ' + new Date());
                      //lets start the whole process over again and make the restangular call all over again
                      deferred.resolve(response.data);
                      errorModalInstance.close();
                   }, function (response) {
                      //The user Clicked the Cancel button so we need to call the reject on the promise
                      console.log('Error Modal dismissed at: ' + new Date());
                      deferred.reject(response.data);
                      errorModalInstance.dismiss(response.data);
                   });

                   //always return false here as it will casue Restangular to not call the reject or done on the 
                   // promise leaving us in control of that based on the user button clicks that are set above
                   return false;
                }

             }
          }];
       });

})();