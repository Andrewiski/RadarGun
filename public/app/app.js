(function () {
    'use strict';

    $(function () {
        try {
            App.init();
            console.log('App init complete');
        } catch (ex) {
            console.log('Fatal Error in App init: ' + ex.message);
            console.log(ex);
        }
    });
})();
