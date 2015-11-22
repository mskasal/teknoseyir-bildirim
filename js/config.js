(function() {
  'use strict';

  angular
    .module('TS')

  .config(function($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise("/login");

    $stateProvider

    //------------------------------
    // LOGIN ROUTE
    //------------------------------
      .state('login', {
      url: '/login',
      templateUrl: '../../js/views/login.html',
      controller: 'loginCtrl'
    })

    //------------------------------
    // SETUP ROUTE
    //------------------------------
    .state('setup', {
      url: '/setup',
      templateUrl: '../../js/views/setup.html',
      controller: 'setupCtrl',
      params: {
        userName: null
      }
    })

    //------------------------------
    // NOTIFY ROUTE
    //------------------------------
    .state('notify', {
      url: '/notify',
      templateUrl: '../../js/views/notify.html',
      controller: 'notifyCtrl'
    });

  });
})();
