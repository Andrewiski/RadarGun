angular.module("ui.bootstrap.dateandtimepickers", ["ui.bootstrap.dateandtimepickers.tpls", "ui.bootstrap.datetimepickerpopup", "ui.bootstrap.timepickerpopup",]);
angular.module("ui.bootstrap.dateandtimepickers.tpls", ["template/datetimepicker/popup.html", "template/timepicker/popup.html"]);


//Begin Added by Andy for datetimepicker
angular.module('ui.bootstrap.datetimepickerpopup', ['ui.bootstrap.dateparser', 'ui.bootstrap.position', 'ui.bootstrap.datepicker', 'ui.bootstrap.timepicker', 'ui.bootstrap.datetimeparser', ])
.constant('datetimepickerPopupConfig', {
    datetimepickerPopup: 'yyyy-MM-dd hh:mm a',    
    currentText: 'Today',
    clearText: 'Clear',
    closeText: 'Done',
    closeOnDateSelection: true,
    appendToBody: false,
    showButtonBar: true
})

.directive('datetimepickerPopup', ['$compile', '$parse', '$document', '$position', 'dateFilter', 'datetimeParser', 'dateParser', 'datetimepickerPopupConfig',
function ($compile, $parse, $document, $position, dateFilter, datetimeParser, dateParser, datetimepickerPopupConfig) {
    return {
        restrict: 'EA',
        require: 'ngModel',
        scope: {
            isOpen: '=?',
            currentText: '@',
            clearText: '@',
            closeText: '@',
            dateDisabled: '&'
        },
        link: function (scope, element, attrs, ngModel) {
            var dateFormat = datetimepickerPopupConfig.datetimepickerPopup,
                closeOnDateSelection = angular.isDefined(attrs.closeOnDateSelection) ? scope.$parent.$eval(attrs.closeOnDateSelection) : datetimepickerPopupConfig.closeOnDateSelection,
                appendToBody = angular.isDefined(attrs.datetimepickerAppendToBody) ? scope.$parent.$eval(attrs.datetimepickerAppendToBody) : datetimepickerPopupConfig.appendToBody;

            scope.showButtonBar = angular.isDefined(attrs.showButtonBar) ? scope.$parent.$eval(attrs.showButtonBar) : datetimepickerPopupConfig.showButtonBar;

            scope.getText = function (key) {
                return scope[key + 'Text'] || datetimepickerPopupConfig[key + 'Text'];
            };

            attrs.$observe('datetimepickerPopup', function (value) {
                //console.log('datetimepickerPopup')
                dateFormat = value || datetimepickerPopupConfig.datetimepickerPopup;
                ngModel.$setViewValue(dateFilter(ngModel.$modelValue, dateFormat), 'timepickerPopup');
                ngModel.$render();

                
            });

           

            function cameltoDash(string) {
                return string.replace(/([A-Z])/g, function ($1) { return '-' + $1.toLowerCase(); });
            }

            var parseModelValueToInputValue = function (modelValue) {
                console.log('parseModelValueToInputValue');
                
                if (!modelValue) {
                    ngModel.$setValidity('datetime', true);
                    scope.dtdate = null;
                    scope.dttime = null;
                    //console.log('scope.dtdate & scope.dttime set parseModelValueToInputValue to null !modelValue');
                    return null;
                } else if (angular.isDate(modelValue) && !isNaN(modelValue)) {
                    scope.dtdate = datetimeParser.parse(dateFilter(modelValue,"MM/dd/yyyy"),"MM/dd/yyyy");
                    scope.dttime = datetimeParser.parse(dateFilter(modelValue, "HH:mm:ss"), "HH:mm:ss");
                    ngModel.$setValidity('datetime', true);
                    //console.log('scope.dtdate & scope.dttime set parseModelValueToInputValue to isDare ' + modelValue);
                    return dateFilter(modelValue, dateFormat);
                } else if (angular.isString(modelValue)) {
                    var date = dateFilter(date, dateFormat) || new Date(modelValue);
                    if (isNaN(date)) {
                        scope.dtdate = null;
                        scope.dttime = null;
                        ngModel.$setValidity('datetime', false);
                        //console.log('scope.dtdate & scope.dttime set parseModelValueToInputValue to null modelValue is not a date ');
                        return undefined;
                    } else {
                        scope.dtdate = datetimeParser.parse(dateFilter(modelValue, "MM/dd/yyyy"), "MM/dd/yyyy");
                        scope.dttime = datetimeParser.parse(dateFilter(modelValue, "HH:mm:ss"), "HH:mm:ss");
                        //console.log('scope.dtdate & scope.dttime set parseModelValueToInputValue to ' + modelValue);
                        ngModel.$setValidity('datetime', true);
                        return dateFilter(date, dateFormat);;
                    }
                } else {
                    scope.dtdate = null;
                    scope.dttime = null;
                    ngModel.$setValidity('datetime', false);
                    return undefined;
                }
            }

            var parseInputValuetoModelValue = function (viewValue) {
                console.log('parseInputValuetoModelValue');
                if (!viewValue) {
                    ngModel.$setValidity('datetime', true);
                    scope.dtdate = null;
                    scope.dttime = null;
                    //console.log('scope.dtdate & scope.dttime set parseInputValuetoModelValue to null !viewValue');
                    return null;
                } else if (angular.isDate(viewValue) && !isNaN(viewValue)) {
                    ngModel.$setValidity('datetime', true);
                    scope.dtdate = datetimeParser.parse(dateFilter(viewValue, "MM/dd/yyyy"), "MM/dd/yyyy");
                    scope.dttime = datetimeParser.parse(dateFilter(viewValue, "HH:mm:ss"), "HH:mm:ss");
                    //console.log('scope.dtdate & scope.dttime set parseInputValuetoModelValue ' + viewValue);
                    return viewValue;
                } else if (angular.isString(viewValue)) {
                    var date = datetimeParser.parse(viewValue, dateFormat) ;
                    if (isNaN(date)) {
                        ngModel.$setValidity('datetime', false);
                        scope.dtdate = null;
                        scope.dttime = null;
                        //console.log('scope.dtdate & scope.dttime set parseInputValuetoModelValue to null invalid date ' + viewValue + ' ' + dateFormat);
                        return undefined;
                    } else {
                        ngModel.$setValidity('datetime', true);
                        scope.dtdate = datetimeParser.parse(dateFilter(date, "MM/dd/yyyy"), "MM/dd/yyyy");
                        scope.dttime = datetimeParser.parse(dateFilter(date, "HH:mm:ss"), "HH:mm:ss");
                        //console.log('scope.dtdate & scope.dttime set parseInputValuetoModelValue ' + viewValue);
                        return date;
                    }
                } else {
                    ngModel.$setValidity('datetime', false);
                    scope.dtdate = null;
                    scope.dttime = null;
                    //console.log('scope.dtdate & scope.dttime set parseInputValuetoModelValue to null invalid ng-model type');
                    
                    return undefined;
                }
            }


            //parseDateTime(ngModel.$modelValue);
            ngModel.$formatters.unshift(parseModelValueToInputValue);
            ngModel.$parsers.push(parseInputValuetoModelValue);
            ngModel.$viewChangeListeners.push(function () {
                //console.log('$viewChangeListeners');
                var strdate = dateFilter(ngModel.$modelValue, "MM/dd/yyyy");
                var strtime = dateFilter(ngModel.$modelValue, "HH:mm:ss");
                if (strdate != dateFilter(scope.dtdate, "MM/dd/yyyy")) {
                    scope.dtdate = datetimeParser.parse(strdate, "MM/dd/yyyy");
                    console.log('scope.date set $viewChangeListeners');
                }
                if (strtime != dateFilter(scope.time, "HH:mm:ss")) {
                    scope.dttime = datetimeParser.parse(strtime, "HH:mm:ss");
                    console.log('scope.time set $viewChangeListeners');
                }
                
            });


            element.bind('input change keyup', function () {
                scope.$apply(function () {
                    console.log('element.bind(\'input change keyup\')');
                    var strdate = dateFilter(ngModel.$modelValue, "MM/dd/yyyy");
                    var strtime = dateFilter(ngModel.$modelValue, "HH:mm:ss");
                    if (strdate != dateFilter(scope.dtdate, "MM/dd/yyyy")) {
                        scope.dtdate = datetimeParser.parse(strdate, "MM/dd/yyyy");
                        console.log('scope.date set element.bind');
                    }
                    if (strtime != dateFilter(scope.dttime, "HH:mm:ss")) {
                        scope.dttime = datetimeParser.parse(strtime, "HH:mm:ss");
                        console.log('scope.time set element.bind');
                    }
                    
                });
            });

            // Inner date change by DatePicker
            scope.dateSelection = function (date, time) {
                //console.log('dateSelection');
                if (date == undefined) {
                    date = new Date();
                }
                if (time == undefined) {
                    time = new Date(0, 0, 0, 0, 0, 0, 0);
                }
                var newdate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), time.getSeconds())
                //ngModel.$modelValue = newdate;
                ngModel.$setViewValue(dateFilter(newdate, dateFormat), 'datepicker');
                ngModel.$render();
                     
            };
            // Inner Time change by TimePicker
            scope.timeSelection = function (date, time) {
                //console.log('timeSelection');
                if (date == undefined) {
                    date = new Date();
                }
                if (time == undefined) {
                    time = new Date(0,0,0,0,0,0,0);
                }
                var newdate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), time.getSeconds());
                //ngModel.$modelValue = newdate;
                ngModel.$setViewValue(dateFilter(newdate, dateFormat), 'timepicker');
                ngModel.$render();
                
            };


            var documentClickBind = function (event) {
                if (scope.isOpen && event.target !== element[0]) {
                    scope.$apply(function () {
                        scope.isOpen = false;
                    });
                }
            };

            var keydown = function (evt, noApply) {
                scope.keydown(evt);
            };
            element.bind('keydown', keydown);

            scope.keydown = function (evt) {
                if (evt.which === 27) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    scope.close();
                } else if (evt.which === 40 && !scope.isOpen) {
                    scope.isOpen = true;
                }
            };
            
            var hasfocus = function(evt){
                if (scope.isOpen == false && event.target === element[0]) {
                    scope.$apply(function () {
                        scope.isOpen = true;
                    });
                }
            }

            if (scope.isOpen == undefined) {
                scope.isOpen = false;
                element.bind('focus', hasfocus);
            }

            scope.$watch('isOpen', function (value) {
                if (value) {
                    scope.$broadcast('datetimepicker.focus');
                    scope.position = appendToBody ? $position.offset(element) : $position.position(element);
                    scope.position.top = scope.position.top + element.prop('offsetHeight');

                    $document.bind('click', documentClickBind);
                } else {
                    $document.unbind('click', documentClickBind);
                }
            });

            scope.select = function (date, time) {
                if (date === 'today') {
                    var today = new Date();
                    date = new Date(today.setHours(0, 0, 0, 0));
                    scope.dateSelection(date, time);
                } else if (date === 'clear') {
                    ngModel.$setViewValue('', 'clearbutton');
                    ngModel.$render();
                }
                
            };

            scope.close = function () {
                scope.isOpen = false;
                element[0].focus();
            };

            // popup element used to display calendar
            var popupEl = angular.element('<div datetimepicker-popup-wrap></div>');
           

            //// datepicker element
            //var datepickerEl = angular.element(popupEl.children()[0]);
            //if (attrs.datepickerOptions) {
            //    angular.forEach(scope.$parent.$eval(attrs.datepickerOptions), function (value, option) {
            //        datepickerEl.attr(cameltoDash(option), value);
            //    });
            //}

            //angular.forEach(['minDate', 'maxDate'], function (key) {
            //    if (attrs[key]) {
            //        scope.$parent.$watch($parse(attrs[key]), function (value) {
            //            scope[key] = value;
            //        });
            //        datepickerEl.attr(cameltoDash(key), key);
            //    }
            //});
            //if (attrs.dateDisabled) {
            //    datepickerEl.attr('date-disabled', 'dateDisabled({ date: dtdate, mode: mode })');
            //}

            //datepickerEl.attr({
            //    'ng-model': 'dtdate',
            //    'ng-change': 'innerDateSelection(dtdate,dttime)',
            //    'close-on-date-selection': 'false'
            //});
            ////'ng-change': 'dateSelection(dtdate,dttime)',
            //// timepicker element
            //var timepickerEl = angular.element(popupEl.children()[1]);
            //if (attrs.timepickerOptions) {
            //    angular.forEach(scope.$parent.$eval(attrs.timepickerOptions), function (value, option) {
            //        timepickerEl.attr(cameltoDash(option), value);
            //    });
            //}

            //timepickerEl.attr({
            //    'ng-model': 'dttime',
            //    'ng-change': 'innerTimeSelection(dtdate,dttime)'
            //});
            ////'ng-change': 'timeSelection(dtdate,dttime)'
            var $popup = $compile(popupEl)(scope);
            if (appendToBody) {
                $document.find('body').append($popup);
            } else {
                element.after($popup);
            }

            scope.$on('$destroy', function () {
                $popup.remove();
                element.unbind('keydown', keydown);
                $document.unbind('click', documentClickBind);
            });
        }
    };
}])

.directive('datetimepickerPopupWrap', function () {
    return {
        restrict: 'EA',
        replace: true,
        scope:false,
        templateUrl: 'template/datetimepicker/popup.html',
        
        link: function (scope, element, attrs, ctrl) {

            element.bind('click', function (event) {
                //console.log('Click datetimepickerPopupWrap ' + scope.dtdate + ' ' + scope.dttime);
                event.preventDefault();
                event.stopPropagation();
            });
        }
    };
});




//End Added by Andy for datetimepicker

//Begin Added by Andy for timepicker
angular.module('ui.bootstrap.timepickerpopup', ['ui.bootstrap.dateparser', 'ui.bootstrap.position', 'ui.bootstrap.timepicker'])

.constant('timepickerPopupConfig', {
    timepickerPopup: 'hh:mm a',
    valueAsDate: true,
    currentText: 'now',
    closeText: 'Done',
    clearText: 'Clear',
    appendToBody: false,
    showButtonBar: true
})

.directive('timepickerPopup', ['$compile', '$parse', '$document', '$position', 'dateFilter', 'dateParser', 'timepickerPopupConfig',
function ($compile, $parse, $document, $position, dateFilter, dateParser, timepickerPopupConfig) {
    return {
        restrict: 'EA',
        require: 'ngModel',
        scope: {
            isOpen: '=?',
            closeText: '@',
            currentText: '@',
            clearText: '@',
        },
        link: function (scope, element, attrs, ngModel) {
            var dateFormat = timepickerPopupConfig.timepickerPopup,
                appendToBody = angular.isDefined(attrs.timepickerAppendToBody) ? scope.$parent.$eval(attrs.timepickerAppendToBody) : timepickerPopupConfig.appendToBody;

            scope.valueAsDate = angular.isDefined(attrs.valueAsDate) ? scope.$parent.$eval(attrs.valueAsDate) : timepickerPopupConfig.valueAsDate;
            scope.showButtonBar = angular.isDefined(attrs.showButtonBar) ? scope.$parent.$eval(attrs.showButtonBar) : timepickerPopupConfig.showButtonBar;

            scope.getText = function (key) {
                return scope[key + 'Text'] || timepickerPopupConfig[key + 'Text'];
            };



            function cameltoDash(string) {
                return string.replace(/([A-Z])/g, function ($1) { return '-' + $1.toLowerCase(); });
            }




            var parseModelValueToInputValue = function (modelValue) {
                console.log('parseModelValueToInputValue');
                scope.time = modelValue;
                if (!modelValue) {
                    ngModel.$setValidity('time', true);
                    return null;
                } else if (angular.isDate(modelValue) && !isNaN(modelValue)) {
                    ngModel.$setValidity('time', true);
                    return dateFilter(modelValue, dateFormat);
                } else if (angular.isString(modelValue)) {
                    var date = dateParser.parse(modelValue, dateFormat) || new Date(modelValue);
                    if (isNaN(date)) {
                        // Lets try adding 1/1/1970 the front of the string
                        date = dateParser.parse('01/01/1970 ' + modelValue, 'MM/dd/yyyy ' + dateFormat) || new Date('01/01/1970 ' + modelValue);
                    }
                    if (isNaN(date)) {
                        ngModel.$setValidity('time', false);
                        return undefined;
                    } else {
                        ngModel.$setValidity('time', true);
                        return dateFilter(date, dateFormat);;
                    }
                } else {
                    ngModel.$setValidity('time', false);
                    return undefined;
                }
            }

            var parseInputValuetoModelValue = function (viewValue) {
                if (!viewValue) {
                    ngModel.$setValidity('time', true);
                    scope.time = null;
                    return null;
                } else if (angular.isDate(viewValue) && !isNaN(viewValue)) {
                    ngModel.$setValidity('time', true);
                    scope.time = viewValue;
                    return viewValue;
                } else if (angular.isString(viewValue)) {
                    var date = dateParser.parse(viewValue, dateFormat) || new Date(viewValue);
                    if (isNaN(date)) {
                        // Lets try adding 1/1/1970 the front of the string
                        date = dateParser.parse('01/01/1970 ' + viewValue, 'MM/dd/yyyy ' + dateFormat) || new Date('01/01/1970 ' + viewValue);
                    }
                    if (isNaN(date)) {
                        ngModel.$setValidity('time', false);
                        scope.time = undefined;
                        return undefined;
                    } else {
                        ngModel.$setValidity('time', true);
                        if (scope.valueAsDate) {
                            scope.time = date;
                            return date;
                        } else {
                            scope.time = datefilter(date, dateFormat);
                            return datefilter(date, dateFormat);
                        }

                    }
                } else {
                    ngModel.$setValidity('time', false);
                    return undefined;
                }
            }


            //parseDateTime(ngModel.$modelValue);
            ngModel.$formatters.unshift(parseModelValueToInputValue);
            ngModel.$parsers.push(parseInputValuetoModelValue);
            ngModel.$viewChangeListeners.push(function () {
                console.log('$viewChangeListeners');
                if (scope.time != ngModel.$modelValue) {
                    scope.time = ngModel.$modelValue;
                }
            });


            // Outter change  // For Some Reason this gets overwritten and never called so I moved the logic to parseInputValuetoModelValue Andy
            //ngModel.$render = function () {
            //    var datetime = ngModel.$viewValue ? dateFilter(ngModel.$viewValue, dateFormat) : '';
            //    element.val(datetime);
            //    scope.datetime = parseInputValuetoDateTime(ngModel.$modelValue);
            //};


            // Inner change by TimePicker
            scope.timeSelection = function (time) {
                //ngModel.$modelValue = scope.time;
                ngModel.$setViewValue(dateFilter(time, dateFormat), 'timepicker');
                ngModel.$render();
                console.log('timeSelection');
            };

            scope.select = function (time) {
                if (time === 'today') {
                    var today = new Date();
                    time = today.setHours(today.getHours(),today.getMinutes(),today.getSeconds());
                    scope.timeSelection(time);
                } else if (time === 'clear') {
                    scope.time = new Date(0, 0, 0, 0, 0, 0, 0);
                    ngModel.$setViewValue('', 'clearbutton');
                    ngModel.$render();
                }

            };

            element.bind('input change keyup', function () {
                scope.$apply(function () {
                    scope.time = ngModel.$modelValue;
                    console.log('element.bind(\'input change keyup\')');
                });
            });



            var documentClickBind = function (event) {
                if (scope.isOpen && event.target !== element[0]) {
                    scope.$apply(function () {
                        scope.isOpen = false;
                    });
                }
            };

            var keydown = function (evt, noApply) {
                scope.keydown(evt);
            };
            element.bind('keydown', keydown);

            scope.keydown = function (evt) {
                if (evt.which === 27) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    scope.close();
                } else if (evt.which === 40 && !scope.isOpen) {
                    scope.isOpen = true;
                }
            };

            var hasfocus = function (evt) {
                if (scope.isOpen == false && event.target === element[0]) {
                    scope.$apply(function () {
                        scope.isOpen = true;
                    });
                }
            }

            if (scope.isOpen == undefined) {
                scope.isOpen = false;
                element.bind('focus', hasfocus);
            }

            scope.$watch('isOpen', function (value) {
                if (value) {
                    scope.$broadcast('timepicker.focus');
                    scope.position = appendToBody ? $position.offset(element) : $position.position(element);
                    scope.position.top = scope.position.top + element.prop('offsetHeight');

                    $document.bind('click', documentClickBind);
                } else {
                    $document.unbind('click', documentClickBind);
                }
            });

            scope.close = function (evt) {
                console.log('close()');
                scope.isOpen = false;
                //element[0].focus();
                evt.preventDefault();
                evt.stopPropagation();
            };

            attrs.$observe('timepickerPopup', function (value) {
                //console.log('timepickerPopup ' + value);
                dateFormat = value || timepickerPopupConfig.timepickerPopup;
                //For some reason this doesn't update the input value 
                ngModel.$setViewValue(dateFilter(ngModel.$modelValue, dateFormat), 'timepickerPopup');
                ngModel.$render();
            });
            scope.time = ngModel.$modelValue;
            //scope.datetime = parseInputValuetoDateTime(ngModel.$modelValue);
            // popup element used to display time picker
            var popupEl = angular.element('<div timepicker-popup-wrap><timepicker></timepicker></div>');
            popupEl.attr({
                'ng-model': 'time',
                'ng-change': 'timeSelection(time)'
            });

            // datetimepicker element
            var timepickerEl = angular.element(popupEl.children()[0]);
            if (attrs.timepickerOptions) {
                angular.forEach(scope.$parent.$eval(attrs.timepickerOptions), function (value, option) {
                    timepickerEl.attr(cameltoDash(option), value);
                });
            }
            var $popup = $compile(popupEl)(scope);
            if (appendToBody) {
                $document.find('body').append($popup);
            } else {
                element.after($popup);
            }

            scope.$on('$destroy', function () {
                $popup.remove();
                element.unbind('keydown', keydown);
                $document.unbind('click', documentClickBind);
            });
        }
    };
}])

.directive('timepickerPopupWrap', function () {
    return {
        restrict: 'EA',
        replace: true,
        transclude: true,
        templateUrl: 'template/timepicker/popup.html',
        link: function (scope, element, attrs) {
            element.bind('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
            });
        }
    };
});






angular.module("template/datetimepicker/popup.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/datetimepicker/popup.html",
      "<ul class=\"dropdown-menu\" ng-style=\"{display: (isOpen && 'block') || 'none', top: position.top+'px', left: position.left+'px'}\" ng-keydown=\"keydown($event)\">\n" +
      //" <li>date:{{dtdate}}</li>\n" +
      //" <li>time:{{dttime}}</li>\n" +
      " <li><div datepicker ng-model=\"dtdate\" ng-change=\"dateSelection(dtdate,dttime)\"></div></li>\n" +
      " <li><timepicker ng-model=\"dttime\" ng-change=\"timeSelection(dtdate,dttime)\"></timepicker></li>\n" +
      "	<li ng-if=\"showButtonBar\" style=\"padding:10px 9px 2px\">\n" +
      "		<span class=\"btn-group\">\n" +
      "			<button type=\"button\" class=\"btn btn-sm btn-info\" ng-click=\"select('today',dttime)\">{{ getText('current') }}</button>\n" +
      "			<button type=\"button\" class=\"btn btn-sm btn-danger\" ng-click=\"select('clear',dttime)\">{{ getText('clear') }}</button>\n" +
      "		</span>\n" +
      "		<button type=\"button\" class=\"btn btn-sm btn-success pull-right\" ng-click=\"close($event)\">{{ getText('close') }}</button>\n" +
      "	</li>\n" +
     
      "</ul>\n" +
      "");
}]);

angular.module("template/timepicker/popup.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/timepicker/popup.html",
      "<ul class=\"dropdown-menu\" ng-style=\"{display: (isOpen && 'block') || 'none', top: position.top+'px', left: position.left+'px'}\" ng-keydown=\"keydown($event)\">\n" +
      "	<li ng-transclude></li>\n" +
      "	<li ng-if=\"showButtonBar\" style=\"padding:10px 9px 2px\">\n" +
       "		<span class=\"btn-group\">\n" +
       "			<button type=\"button\" class=\"btn btn-sm btn-info\" ng-click=\"select('today')\">{{ getText('current') }}</button>\n" +
      "			<button type=\"button\" class=\"btn btn-sm btn-danger\" ng-click=\"select('clear')\">{{ getText('clear') }}</button>\n" +
      "		</span>\n" +
      "		<button type=\"button\" class=\"btn btn-sm btn-success pull-right\" ng-click=\"close($event)\">{{ getText('close') }}</button>\n" +
      "	</li>\n" +
      
      "</ul>\n" +
      "");
}]);



angular.module('ui.bootstrap.datetimeparser', [])

.service('datetimeParser', ['$locale', 'orderByFilter', function ($locale, orderByFilter) {

    this.parsers = {};

    var formatCodeToRegex = {
        'yyyy': {
            regex: '\\d{4}',
            apply: function (value) { this.year = +value; }
        },
        'yy': {
            regex: '\\d{2}',
            apply: function (value) { this.year = +value + 2000; }
        },
        'y': {
            regex: '\\d{1,4}',
            apply: function (value) { this.year = +value; }
        },
        'MMMM': {
            regex: $locale.DATETIME_FORMATS.MONTH.join('|'),
            apply: function (value) { this.month = $locale.DATETIME_FORMATS.MONTH.indexOf(value); }
        },
        'MMM': {
            regex: $locale.DATETIME_FORMATS.SHORTMONTH.join('|'),
            apply: function (value) { this.month = $locale.DATETIME_FORMATS.SHORTMONTH.indexOf(value); }
        },
        'MM': {
            regex: '0[1-9]|1[0-2]',
            apply: function (value) { this.month = value - 1; }
        },
        'M': {
            regex: '[1-9]|1[0-2]',
            apply: function (value) { this.month = value - 1; }
        },
        'dd': {
            regex: '[0-2][0-9]{1}|3[0-1]{1}',
            apply: function (value) { this.date = +value; }
        },
        'd': {
            regex: '[1-2]?[0-9]{1}|3[0-1]{1}',
            apply: function (value) { this.date = +value; }
        },
        'hh': {
            regex: '1[0-2]{1}|0[1-9]{1}',
            apply: function (value) { this.hour = +value; }
        },
        'h': {
            regex: '1[0-2]{1}|[0-9]{1}',
            apply: function (value) { this.hour = +value; }
        },
        'HH': {
            regex: '2[0-3]{1}|[0-1][0-9]{1}',
            apply: function (value) { this.hour = +value; }
        },
        'H': {
            regex: '2[0-3]{1}|1[0-9]{1}|[0-9]{1}',
            apply: function (value) { this.hour = +value; }
        },
        'mm': {
            regex: '[0-6][0-9]{1}',
            apply: function (value) { this.minute = +value; }
        },
        'm': {
            regex: '[0-6][0-9]{1}|[0-9]{1}',
            apply: function (value) { this.minute = +value; }
        },
        'ss': {
            regex: '[0-6][0-9]{1}',
            apply: function (value) { this.second = +value; }
        },
        's': {
            regex: '[0-6][0-9]{1}|[0-9]{1}',
            apply: function (value) { this.second = +value; }
        },
        'a': {
            regex: 'AM|PM',
            apply: function (value) { this.ampm = value; }
        },
        'EEEE': {
            regex: $locale.DATETIME_FORMATS.DAY.join('|')
        },
        'EEE': {
            regex: $locale.DATETIME_FORMATS.SHORTDAY.join('|')
        }
    };

    this.createParser = function (format) {
        var map = [], regex = format.split('');

        angular.forEach(formatCodeToRegex, function (data, code) {
            var index = format.indexOf(code);

            if (index > -1) {
                format = format.split('');

                regex[index] = '(' + data.regex + ')';
                format[index] = '$'; // Custom symbol to define consumed part of format
                for (var i = index + 1, n = index + code.length; i < n; i++) {
                    regex[i] = '';
                    format[i] = '$';
                }
                format = format.join('');

                map.push({ index: index, apply: data.apply });
            }
        });

        return {
            regex: new RegExp('^' + regex.join('') + '$'),
            map: orderByFilter(map, 'index')
        };
    };

    this.parse = function (input, format) {
        if (!angular.isString(input)) {
            return input;
        }
        format = format.replace(/\//g, '\\/');
        format = $locale.DATETIME_FORMATS[format] || format;

        if (!this.parsers[format]) {
            this.parsers[format] = this.createParser(format);
        }

        var parser = this.parsers[format],
            regex = parser.regex,
            map = parser.map,
            results = input.match(regex);

        if (results && results.length) {
            var fields = { year: 1900, month: 0, date: 1, hour: 0, minute: 0, second: 0, ampm:'' }, dt;

            for (var i = 1, n = results.length; i < n; i++) {
                var mapper = map[i - 1];
                if (mapper.apply) {
                    mapper.apply.call(fields, results[i]);
                }
            }

            if (isValid(fields.year, fields.month, fields.date, fields.hour, fields.minute, fields.second, fields.ampm)) {
                if (fields.ampm.toLowerCase() == 'pm' && fields.hours < 12) {
                    fields.hours = fields.hours + 12;
                }
                dt = new Date(fields.year, fields.month, fields.date, fields.hour, fields.minute, fields.second);
            }

            return dt;
        }
    };

    // Check if date is valid for specific month (and year for February).
    // Month: 0 = Jan, 1 = Feb, etc
    function isValid(year, month, date, hour, minute, second, ampm) {
        if (month === 1 && date > 28) {
            return date === 29 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0);
        }

        if (month === 3 || month === 5 || month === 8 || month === 10) {
            return date < 31;
        }

        
        return true;
    }
}]);

//End Added by Andy for timepickerpopup