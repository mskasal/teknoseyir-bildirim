(function() {
  'use strict';

  angular
    .module('TS')

    .constant('HOST_URLS', {
      notifyURL: 'http://teknoseyir.com/wp-admin/admin-ajax.php',
      postURL: 'http://teknoseyir.com/wp-admin/admin-ajax.php',
      loginURL: 'http://teknoseyir.com/u/'
    });
})();
