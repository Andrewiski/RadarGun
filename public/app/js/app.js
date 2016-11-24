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
            'ngSanitize'
       ])
       .config(['$stateProvider', '$anchorScrollProvider', '$urlRouterProvider', 'errorHandlerProvider', function ($stateProvider, $anchorScrollProvider, $urlRouterProvider, errorHandlerProvider) {
          $anchorScrollProvider.disableAutoScrolling();


          //DatePicker Global Defaults
          //datepickerConfig.showWeeks = false;
          //datepickerPopupConfig.datepickerPopup = "MM/dd/yyyy";
          //datepickerPopupConfig.showButtonBar = false;
          //TimePicker Global Defaults
          //timepickerConfig.minuteStep = 15;
          //timepickerPopupConfig.timepickerPopup = "hh:mm a"
          //datetimepickerPopupConfig.datetimepickerPopup = "MM/dd/yyyy hh:mm a"

          //$locationProvider.html5Mode(true).hashPrefix('!');

          //$routeProvider
          //   .when('/contract-list', {
          //       templateUrl: '/app/html/views/contract-list.html',
          //       controller: 'contractListController'
          //   })
          //   .when('/contract/:ContractGuid', {
          //       templateUrl: '/app/html/views/contract.html',
          //       controller: 'contractController',
          //       reloadOnSearch: false
          //   })
          //   .otherwise({ redirectTo: "/contract-list" });


          $stateProvider
              .state('scoreboard', {
                 url: '/scoreboard',
                 templateUrl: 'app/html/views/scoreboard.html',
                 controller: 'scoreboardViewController'
              })
             

          $urlRouterProvider.otherwise("/scoreboard");

          errorHandlerProvider.setDefaultErrorMessage('An Error has occured on the server. Error Code NER100');

          //RestangularProvider.setBaseUrl('api');
          //RestangularProvider.setDefaultHttpFields({ cache: true });

       }])
   .run(['$templateCache', '$http', 'errorHandler',function ($templateCache, $http, errorHandler) {


      //Wire up Restangular to use our Error Handler Calls
       //Restangular.setErrorInterceptor(errorHandler.RestangularErrorInterceptor);

       //Wire up Restangular to handle the submit of Contract Data that are of Type Date as they must be sent in UTC with no Time Shift.
       //Restangular.addRequestInterceptor(function (element, operation, what, url) {
           
       //})

      //Prefetch the ErrorHtml and stick it in cache so if the server is down we have a template to use.
      $http.get('app/html/partials/modals/error-handler.html', { cache: $templateCache });





      //$rootScope.$on('$routeChangeSuccess', function (newRoute, oldRoute) {


      //});
      //$templateCache.put('/App/html/views/contract-list.html');
      //$templateCache.put('/App/html/views/contract.html');
      //$templateCache.put('/App/js/directives/contractList.tpl.html');
      //$templateCache.put('/App/js/directives/contract.tpl.html');
      //$templateCache.put('/App/js/directives/thumbNav.tpl.html');

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
            window.name = "NG_ENABLE_DEBUG_INFO!";
            angular.bootstrap(document, ['scoreboardapp']);
            console.log('Angular bootstrap Complete');
        } catch (ex) {
            console.log('Fatal Error in Angular bootstrap: ' + ex.message);
            console.log(ex);
        }
    });

})();

