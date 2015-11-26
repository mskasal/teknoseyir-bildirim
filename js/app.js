(function() {
  'use strict';

  angular
    .module('TS', ['ui.router'])

  .run(function(StorageService, $state, $rootScope, LoginService) {
    chrome.browserAction.setBadgeText({
      text: ""
    });
    $rootScope.CommunicationPort = chrome.extension.connect({
      name: "TS-COM"
    });

    $rootScope.CommunicationPort.onMessage.addListener(function(msg) {
      if (msg.type === 'posting') {
        $rootScope.$broadcast('bg:posting', msg.data);
      } else if (msg.type === 'nonce-reset') {
        console.log("SENDING RESET TO LOGIN SERVICE");
        LoginService.login(msg.data.username).then(function(data){
          $rootScope.$broadcast('login:success', data);
        });
      } else {
        $rootScope.$broadcast('bg:message', msg);
      }
      console.log('BG_MSG: ', msg);
    });

    $rootScope.CommunicationPort.postMessage('resetFirstTime');

    $rootScope.$on('setup:complete', function(even, data) {
      $rootScope.CommunicationPort.postMessage({
        type: 'success',
        code: 20,
        message: 'setup completed'
      });
      $rootScope.CommunicationPort.postMessage('start');
    });
    $rootScope.data = {};
    $rootScope.data.selectedHashes = [];
    $rootScope.data.sound = true;

    StorageService.get().then(function(storage) {
      for (var key in storage) {
        $rootScope.data[key] = storage[key];
      }
      if (storage.isExist && storage.isSetupComplete) {
        $state.go('notify');
      } else if (storage.isExist && !storage.isSetupComplete) {
        $state.go('setup');
      } else {
        $state.go('login');
      }
    });

    $rootScope.$watch(function() {
      return $rootScope.data;
    }, function(newData, oldData, rootScopeItself) {
      $rootScope.CommunicationPort.postMessage({
        newData: newData,
        oldData: oldData
      });
    }, true);
  });
})();
