(function() {
  'use strict';

  angular
    .module('TS')
    .service('LoginService', LoginService)
    .service('PostService', PostService)
    .service('NotifyService', NotifyService)
    .service('StorageService', StorageService);

  //------------------------------
  // LOGIN SERVICE
  //------------------------------
  LoginService.$inject = ['$http', '$q', 'HOST_URLS', '$rootScope'];

  function LoginService($http, $q, HOST_URLS, $rootScope) {

    var login = function(userName) {
      return $q(function(resolve, reject) {
        $http.get(HOST_URLS.loginURL + userName)
          .success(function(data, status, headers, config) {
            var auth = getUser(data, userName);
            if (auth.isExist) {
              resolve(auth);
            } else {
              reject(auth);
            }
          })
          .error(function(data, status, headers, config) {
            reject(data);
          });
      });
    };

    function loadCredentials() {

    }

    function useCredentials() {

    }

    var getSomeDataWithRegex = function(string, reg) {
      var response;
      var re = new RegExp('(var ' + reg + ' = )(\{.*\})', 'gi');

      var str = string;
      var m;

      if ((m = re.exec(str)) !== null) {
        if (m.index === re.lastIndex) {
          re.lastIndex++;
        }
      }

      if (m === null) {
        return null;
      }

      response = angular.fromJson(m[2].toString());
      return response;
    };

    function getUser(res, name) {
      var userData = getSomeDataWithRegex(res, "ts");
      var heartbeatData = getSomeDataWithRegex(res, "heartbeatSettings");

      for (var key in userData) {
        $rootScope.data[key] = userData[key];
      }
      for (var key2 in heartbeatData) {
        $rootScope.data[key2] = heartbeatData[key2];
      }

      var str = res;
      var patt = new RegExp("author-[0-9]+");
      var ress = patt.exec(str);
      var isExist = null;
      ress = ress[0].split("-")[1];

      var checkName = function(name) {
        var isEx = null;
        var patt = new RegExp("author-[a-z]+");
        var ress = patt.exec(str);
        ress = ress[0].split("-")[1];

        if (ress == name) {
          isEx = true;
        } else
          isEx = false;
        return isEx;
      };

      isExist = checkName(name);
      return {
        isExist: isExist,
        objectID: ress
      };
    }

    return {
      login: login
    };
  }

  //------------------------------
  // POST SERVICE
  //------------------------------
  PostService.$inject = ['$http', '$q', 'HOST_URLS'];

  function PostService($http, $q, HOST_URLS) {

    var getSuggest = function(keyword) {
      if (keyword.slice(0, 1) === '#') {
        keyword = keyword.slice(1);
        return $q(function(resolve, reject) {
          $.ajax({
              url: HOST_URLS.postURL,
              type: 'POST',
              data: {
                "action": "hash_suggest",
                hash: keyword
              }
            })
            .done(function(data, status, headers, config) {
              if (data === '0') {
                reject(data);
              } else {
                resolve(data);
              }

            })
            .fail(function(data, status, headers, config) {
              reject(data);
            });
        });
      } else {
        return $q(function(resolve, reject) {
          resolve(null);
        });
      }
    };

    return {
      getSuggest: getSuggest
    };
  }

  //------------------------------
  // Notify SERVICE
  //------------------------------
  NotifyService.$inject = ['$http', '$q', 'HOST_URLS', '$rootScope'];

  function NotifyService($http, $q, HOST_URLS, $rootScope) {
    var getNotify = function() {
      return $q(function(resolve, reject) {
        $.ajax({
            url: HOST_URLS.notifyURL,
            type: 'POST',
            data: {
              action: "bildirim_btn",
              object_id: parseInt($rootScope.data.objectID),
              toggle: "dropdown"
            }

          })
          .done(function(data, status, headers, config) {
            if (data === '0') {
              reject(data);
            } else {
              resolve(data);
            }

          })
          .fail(function(data, status, headers, config) {
            reject(data);
          });
      });
    };

    return {
      getNotify: getNotify
    };
  }

  //------------------------------
  // STORAGE SERVICE
  //------------------------------
  StorageService.$inject = ['$q'];

  function StorageService($q) {

    var St = chrome.storage.local;
    var Sto = chrome.storage;
    var self = this;

    var get = function(key) {
      if (!key) {
        return $q(function(resolve, reject) {

          St.get(function(response) {
            resolve(response);
          });
        });
      } else {
        return $q(function(resolve, reject) {
          St.get(key, function(response) {
            resolve(response[key]);
            if (!angular.isDefined(response[key])) {
              reject({
                status: 30,
                message: "No object"
              });
            }
          });
        });
      }
    };

    var set = function(object) {
      console.log("Storage SET", object);
      return $q(function(resolve, reject) {

        St.set(object, function(response) {
          resolve(object);
        });
      });
    };

    var del = function(key) {
      set({
        'key': null
      });
    };

    var clear = function() {
      return $q(function(resolve, reject) {
        St.clear(function() {
          resolve({
            status: 20
          });
        });
      });

    };

    return {
      st: Sto,
      get: get,
      set: set,
      del: del,
      clear: clear
    };
  }
})();
