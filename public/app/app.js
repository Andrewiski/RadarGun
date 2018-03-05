(function () {

   'use strict';

    angular.module('scoreboardapp',
       [
           'ngRoute',
           'ngAnimate',
           'errorHandler',
           'ui.router',
           
           //'ui.utils',
           'ui.bootstrap',
           'ui.bootstrap.modal',
           //'toggle-switch',
           'ngSanitize',
           'ui.select'
       ])
       .config(['$stateProvider', '$anchorScrollProvider', '$urlRouterProvider', '$locationProvider', 'errorHandlerProvider', function ($stateProvider, $anchorScrollProvider, $urlRouterProvider, $locationProvider, errorHandlerProvider) {
          $anchorScrollProvider.disableAutoScrolling();



          $stateProvider
              .state('scoreboard', {
                 url: '/',
                 template: '<div data-scoreboard></div>',
                 controller: 'scoreboardViewController'
              })
              
             

          $urlRouterProvider.otherwise("/");
          $locationProvider.html5Mode(true);
          errorHandlerProvider.setDefaultErrorMessage('An Error has occured on the server. Error Code NER100');


       }])
   .run(['$templateCache', '$http', 'errorHandler',function ($templateCache, $http, errorHandler) {

      $http.get('app/error-handler.html', { cache: $templateCache });

   }]);

    /*############################################################
   Here we are fetching startup data for the app
     THEN we are bootstrapping angular
 
   If you want to add a call, just write a function that 
   returns a promise and add it to the when call below
 ############################################################*/
    $(document).ready(function () {
        try {
            //Now manually bootstrap angular
            //window.name = "NG_ENABLE_DEBUG_INFO!";
            angular.bootstrap(document, ['scoreboardapp']);
            console.log('Angular bootstrap Complete');
        } catch (ex) {
            console.log('Fatal Error in Angular bootstrap: ' + ex.message);
            console.log(ex);
        }
    });

})();

