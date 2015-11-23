// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });


//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    chrome.pageAction.show(sender.tab.id);
    sendResponse();
  });

chrome.extension.onConnect.addListener(function(port) {
  console.log("Connected .....");

  port.onMessage.addListener(function(msg) {
    if (msg.newData) {
      window.backgroundHandler.setParams(msg);
    } else if (typeof msg === 'string' && msg === 'start') {
      window.backgroundHandler.start();
    } else if (typeof msg === 'string' && msg === 'resetFirstTime') {
      if (window.backgroundHandler.options.newContentArray.length !== 0) {
        window.backgroundHandler.resetFirstTime();
      }
    } else if (msg === 'post:get') {
      port.postMessage({
        type: 'posting',
        data: window.backgroundHandler.postContentObjects
      });
    }
  });
});

BackgroundHandler = function(options) {
  this.options = _.extend({
    url: "http://teknoseyir.com/wp-admin/admin-ajax.php",
    checkNotificationsInterval: null,
    count: 0,
    interval: 25000,
    params: {},
    isFirst: true,
    new_content: null,
    lastCount: 0,
    newContentArray: []
  }, options);
};

BackgroundHandler.prototype.start = function() {
  var self = this;

  if (self.options.params.isAuthor !== '1' && self.options.params.isSetupComplete) {
    return;
  }
  console.log('BG STARTED', self.options.params);
  if (self.options.checkNotificationsInterval) {
    self.stopCheckNotifications();
  }
  self.startCheckNotifications();
};

BackgroundHandler.prototype.setParams = function(params) {
  console.log("SETTING PARAMS", params);
  this.options.params = params.newData;

};

BackgroundHandler.prototype.startCheckNotifications = function() {
  var self = this;

  self.checkNotifications();
  this.options.checkNotificationsInterval = setInterval(function() {
    self.checkNotifications();
  }, self.options.interval);
};

BackgroundHandler.prototype.stopCheckNotifications = function() {
  var self = this;

  clearInterval(this.options.checkNotificationsInterval);
};

BackgroundHandler.prototype.resetFirstTime = function() {
  var self = this;
  self.options.isFirst = true;
  console.log('BG FIRSTTIME RESET', self.options);
  self.options.lastCount = 0;
  self.options.new_content = _.first(self.options.newContentArray);
  // self.postContentObjects = [];
  // self.start();
};

BackgroundHandler.prototype.notificationSound = function(command) {
  var audio = new Audio("alert/alert.mp3");

  if (command === 'play') {
    audio.play();
  } else if (command === 'stop') {
    audio.pause();
  }
};

BackgroundHandler.prototype.checkNotifications = function() {
  var self = this;
  console.log('CHECKING NOTIFICATIONS', self.options);

  if (self.options.isFirst) {
    getNewContent();
  } else {
    getNotify(self.options.new_content);
  }

  function getNewContent() {
    $.ajax({
      url: "http://teknoseyir.com",
      type: "GET"
    }).done(function(res) {
      self.options.new_content = parseInt($(res).find('.stream').first().attr('id').split("post-")[1]);
      console.log(self.options.new_content, "first content");
      self.options.isFirst = false;
      self.postContentObjects = [];
    });
  }

  function getNotify(con) {
    $.ajax({
        url: self.options.url,
        type: 'POST',
        dataType: 'json',
        data: {
          data: {
            "bildirim-count": "bildirim_count",
            "new-content": con
          },
          action: "heartbeat",
          screen_id: "front",
          object_id: self.options.params.objectID,
          has_focus: true,
          _nonce: self.options.params.nonce,
          interval: "60"

        },
      })
      .done(function(response) {
        console.log("BILDIRIM RESPONSE", response);
        if (response.bildirim) {
          chrome.storage.local.get(function(item) {
            if (item.count)
              self.options.count = item.count;
          });
          if (response.bildirim.count) {
            if (self.options.params.sound && (self.options.count < response.bildirim.count))
              self.notificationSound('play');

            chrome.browserAction.setBadgeText({
              text: response.bildirim.count.toString()
            });

            self.notificationSound('stop');
            chrome.storage.local.set({
              count: response.bildirim.count
            });
            self.options.count = response.bildirim.count;
          }
        } else {
          console.log({
            type: 'fail',
            message: 'bildirim alinamadi',
            code: 30
          });
        }
        if (response.new_content && response.new_content.length !== 0) {
          self.options.newContentArray = response.new_content;
          console.log("YAY NEW CONTENT", response.new_content);
          // self.options.new_content = _.first(response.new_content);
          self.getAndCheckPosts(response.new_content);
        }
      });
  }
};

BackgroundHandler.prototype.getAndCheckPosts = function(postsIds) {
  var self = this;
  var hashcount = 0;

  postsIds.forEach(function(el, index) {
    getPost(el).done(function() {
      setTimeout(function() {
        if ((postsIds.length - 1) === index) {
          if (hashcount !== 0 && (hashcount > self.options.lastCount)) {

            chrome.browserAction.setBadgeText({
              text: (self.options.count + hashcount).toString()
            });
            self.notificationSound('play');
            self.options.lastCount = hashcount;
          }
        }
      }, 1000);
    });

  });

  function getPost(id) {
    return $.ajax({
      url: 'http://teknoseyir.com/durum/' + id,
      type: 'GET'
    }).done(function(response) {
      var $post = $(response).find('article#post-' + id);
      var $hashes = $(response).find('article#post-' + id).find('.hash_tag');
      var hashes = [];
      var postObject = {
        id: $post.find('#comments').attr('data-object_id'),
        user: $post.find('.stream-top > a.pull-left > img').addClass('new-post-img')
          .wrap('<a/>')
          .parent()
          .attr({
            "data-toggle": "tooltip",
            "data-placement": "bottom",
            "data-original-title": $post.find('.stream-top .author .username').text(),
            "href" : "http://teknoseyir.com/durum/" + id,
            "target": "_blank"
          })
          .tooltip()
          .wrap('<div/>').parent().html()
      };

      self.postContentObjects.push(postObject);

      if ($hashes.length !== 0) {

        $hashes.map(function(index, el) {
          var hash = $(el).html().replace('#', '');
          hashes.push(hash);

          if (($hashes.length - 1) === index) {
            checkHashes(hashes, response);
          }
        });
      }
    });
  }

  function checkHashes(hashes, response) {
    hashes = _.uniq(hashes);
    console.log('CHECKING HASHES', hashes);

    hashes.forEach(function(el, index) {
      if (_.indexOf(self.options.params.selectedHashes, el) !== -1) {
        console.log('YAAAYY! NEW HASH', el);

        if ((hashes.length - 1) === index) {
          hashcount++;
        }
      }
    });
  }
};


chrome.storage.local.get(function(storage) {
  var options = {};
  console.log("STORAGE FETCHED", storage);
  options = {
    isFirst: (storage.isFirst !== undefined) ? storage.isFirst : true,
    lastCount: storage.lastCount || 0,
    new_content: storage.new_content,
    isSetupComplete: (storage.isSetupComplete !== undefined) ? storage.isSetupComplete : false,
    params: storage
  };

  console.log("OPTIONS", options);
  if (!window.backgroundHandler) {
    window.backgroundHandler = new BackgroundHandler(options);
  }

  if (options.isSetupComplete) {
    console.log("SETUP IS COMPLETED BG", options.isSetupComplete);
    window.backgroundHandler.start();
  }

});
