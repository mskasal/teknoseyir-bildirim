(function() {
  'use strict';

  angular
    .module('TS')
    .controller('TSCtrl', TSCtrl)
    .controller('loginCtrl', loginCtrl)
    .controller('notifyCtrl', notifyCtrl)
    .controller('setupCtrl', setupCtrl);


  //------------------------------
  // TS CONTROLLER
  //------------------------------
  TSCtrl.$inject = ['$scope', '$rootScope', '$state', 'StorageService'];

  function TSCtrl($scope, $rootScope, $state, StorageService) {
    $scope.$on('login:success', function(event, data) {
      $rootScope.data.objectID = data.objectID;
      $rootScope.data.isExist = data.isExist;
      StorageService.set($rootScope.data);

      $state.go('setup', {
        userName: $rootScope.data.userName
      }, {});
    });

    $scope.$on('login:fail', function(event, data) {
      StorageService.clear();
      $state.go('login');
    });

    $scope.$on('setup:complete', function(event, data) {
      console.log("SETUP COMPLETED CTRL", data);
      $rootScope.data.isSetupComplete = true;
      StorageService.set($rootScope.data);
      $state.go('notify');
    });
  }

  //------------------------------
  // SETUP CONTROLLER
  //------------------------------
  setupCtrl.$inject = ['$stateParams', '$scope', '$rootScope', 'PostService', 'HOST_URLS', 'StorageService'];

  function setupCtrl($stateParams, $scope, $rootScope, PostService, HOST_URLS, StorageService) {
    $scope.keyword = "";
    $scope.userName = $stateParams.userName || $rootScope.data.userName;
    $scope.selectedHashes = $rootScope.data.selectedHashes || [];

    function getSuggestSuccess(response) {
      if (!response) {
        return;
      }
      $scope.tt = null;
      $scope.suggests = response.data;
    }

    function getSuggestFail(err) {
      console.log(err);
      $scope.tt = null;
    }

    $scope.complete = function() {
      $rootScope.$broadcast('setup:complete', {
        isSetupComplete: true
      });
    };

    $scope.selectHash = function(hash) {
      var i = $scope.selectedHashes.indexOf(hash);
      if (i != -1) {
        return;
      }
      $scope.selectedHashes.push(hash);
      // $rootScope.data.selectedHashes.push(hash);
      StorageService.set($rootScope.data);
      $scope.suggests = [];
      $scope.keyword = "";
      setTimeout(function () {
        $(".suggest-dropdown input").focus();
      }, 10);
    };

    $scope.deselectHash = function(hash) {
      _.pull($scope.selectedHashes, hash);
      _.pull($rootScope.data.selectedHashes, hash);
      StorageService.set($rootScope.data);
    };

    $scope.getSuggest = function(keyword) {
      if ($scope.tt) {
        return;
      }
      $scope.tt = setTimeout(function() {
        PostService.getSuggest($scope.keyword).then(getSuggestSuccess, getSuggestFail);
      }, 800);
    };
  }

  //------------------------------
  // NOTIFY CONTROLLER
  //------------------------------
  notifyCtrl.$inject = ['$scope', '$rootScope', 'NotifyService', '$sce', '$state'];

  function notifyCtrl($scope, $rootScope, NotifyService, $sce, $state) {
    $scope.loadingState = null;
    $scope.postContentObjects = [];

    console.log("ON NOTIFY");
    $rootScope.CommunicationPort.postMessage('post:get');

    $rootScope.$on('bg:posting', function(event, msg) {
      console.log("NOTIFY LISTENING", msg);
      msg = msg.slice(-4);
      msg.forEach(function(item, index) {
        item.user = $sce.trustAsHtml(item.user);
        if ((msg.length - 1) === index) {
          $scope.postContentObjects = msg;
          console.log($scope.postContentObjects);
        }
      });
    });

    function NotifySuccess(response) {

      $scope.loadingState = false;

      var $html = $('<div/>').append(response.data);
      $html.find('.bildirim_tumu a')
        .attr('target', '_blank');
      $html.find('a[data-toggle]').attr('target', '_blank');
      $html.find(".bildirim_sil").remove();

      $html.find("[data-toggle]").tooltip();

      $html.find(".bildirim_tumu a").addClass('btn btn-default btn-sm btn-block');
      $html.find("li.bildirim:last").css("border", "none");
      var html = $html.html();

      $scope.contentHTML = $sce.trustAsHtml(html);

      setTimeout(function() {
        $("[data-toggle]").tooltip();
      }, 600);
    }

    function NotifyFail(err) {
      $scope.loadingState = false;
      $scope.failed = true;
      $rootScope.$broadcast('login:fail', err);
    }

    $scope.gotToLogin = function() {
      $state.go('login', {
        reload: true
      });
    };

    $scope.getNotify = function() {
      $scope.loadingState = true;
      NotifyService.getNotify().then(NotifySuccess, NotifyFail);
    };

    $scope.getNotify();
  }

  //------------------------------
  // LOGIN CONTROLLER
  //------------------------------
  loginCtrl.$inject = ['$scope', 'LoginService', '$rootScope',
    'StorageService', '$state', '$timeout'
  ];

  function loginCtrl($scope, LoginService, $rootScope, StorageService, $state, $timeout) {
    $scope.isLoading = false;
    $scope.userName = '';
    $timeout(function() {
      $('.userName').focus();
    }, 300);
    var LoginSuccess = function(data) {
      $('.login').button('reset');
      console.log("SUCESSS", data);
      $scope.auth = data;
      $scope.isLoading = false;
      $rootScope.data.userName = $scope.userName;

      $rootScope.$broadcast('login:success', data);
    };

    var LoginFail = function(err) {
      $('.login').button('reset');
      console.log(err, "FAIL");
      $scope.auth = err;
      $scope.isLoading = false;
      $rootScope.$broadcast('login:fail', err);
    };

    $scope.login = function(userName) {
      $('.login').button('loading');
      $scope.isLoading = true;
      LoginService.login(userName).then(LoginSuccess, LoginFail);
    };
  }
})();
