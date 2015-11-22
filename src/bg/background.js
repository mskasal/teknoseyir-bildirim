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
      if (window.backgroundHandler.newContentArray.length !== 0) {
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

BackgroundHandler = function() {

  this.url = "http://teknoseyir.com/wp-admin/admin-ajax.php";
  this.checkNotificationsInterval = null;
  this.count = 0;
  this.interval = 25000;
  this.params = {};
  this.isFirst = true;
  this.new_content = [null];
  this.lastCount = 0;
  this.newContentArray = [];
};

BackgroundHandler.prototype.start = function() {
  var self = this;
  if (this.params.isAuthor !== '1' && this.params.isSetupComplete) {
    return;
  }
  console.log('BG STARTED', this.params);
  if (this.checkNotificationsInterval) {
    this.stopCheckNotifications();
  }
  this.startCheckNotifications();
};

BackgroundHandler.prototype.setParams = function(params) {
  console.log("SETTING PARAMS", params);
  this.params = params.newData;
  // if (this.params.isAuthor === '1') {
  //   this.start();
  // }
};

BackgroundHandler.prototype.startCheckNotifications = function() {
  var self = this;

  this.checkNotificationsInterval = setInterval(function() {
    self.checkNotifications();
  }, self.interval);
};

BackgroundHandler.prototype.stopCheckNotifications = function() {
  var self = this;

  clearInterval(this.checkNotificationsInterval);
};

BackgroundHandler.prototype.resetFirstTime = function() {
  var self = this;
  self.isFirst = true;
  console.log('BG FIRSTTIME RESET', self);
  self.lastCount = 0;
  self.new_content = _.first(self.newContentArray);
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
  console.log('CHECKING NOTIFICATIONS', self);

  if (self.isFirst) {
    getNewContent();
  } else {
    getNotify(self.new_content);
  }

  function getNewContent() {
    $.ajax({
      url: "http://teknoseyir.com",
      type: "GET"
    }).done(function(res) {
      self.new_content = parseInt($(res).find('.stream').first().attr('id').split("post-")[1]);
      console.log(self.new_content, "first content");
      self.isFirst = false
      self.postContentObjects = [];
    });
  }

  function getNotify(con) {
    $.ajax({
        url: self.url,
        type: 'POST',
        dataType: 'json',
        data: {
          data: {
            "bildirim-count": "bildirim_count",
            "new-content": con
          },
          action: "heartbeat",
          screen_id: "front",
          object_id: self.params.objectID,
          has_focus: true,
          _nonce: self.params.nonce,
          interval: "60"

        },
      })
      .done(function(response) {
        console.log("BILDIRIM RESPONSE", response);
        if (response.bildirim) {
          chrome.storage.local.get(function(item) {
            if (item.count)
              self.count = item.count;
          });
          if (response.bildirim.count) {
            if (self.params.sound && (self.count < response.bildirim.count))
              self.notificationSound('play');

            chrome.browserAction.setBadgeText({
              text: response.bildirim.count.toString()
            });

            self.notificationSound('stop');
            chrome.storage.local.set({
              count: response.bildirim.count
            });
            self.count = response.bildirim.count;
          }
        } else {
          console.log({
            type: 'fail',
            message: 'bildirim alinamadi',
            code: 30
          });
        }
        if (response.new_content && response.new_content.length !== 0) {
          self.newContentArray = response.new_content;
          console.log("YAY NEW CONTENT", response.new_content);
          // self.new_content = _.first(response.new_content);
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
          if (hashcount !== 0 && (hashcount > self.lastCount)) {

            chrome.browserAction.setBadgeText({
              text: (self.count + hashcount).toString()
            });
            self.notificationSound('play');
            self.lastCount = hashcount;
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
          .attr({
            "data-toogle": "tooltip",
            "data-placement": "bottom",
            "title": $post.find('.stream-top .author .username').text()
          })
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
      if (_.indexOf(self.params.selectedHashes, el) !== -1) {
        console.log('YAAAYY! NEW HASH', el);

        if ((hashes.length - 1) === index) {
          hashcount++;
        }
      }
    });
  }
};

if (!window.backgroundHandler) {
  window.backgroundHandler = new BackgroundHandler();
}
