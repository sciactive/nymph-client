/*
Nymph PubSub 1.5.0 nymph.io
(C) 2014-2015 Hunter Perrin
license LGPL
*/
/* global define */
/* global Nymph */
/* global NymphOptions */
/* global Entity */
/* global WebSocket */
// Uses AMD, CommonJS, or browser globals.
(function(root, factory){
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as a module.
    define('NymphPubSub', ['NymphEntity', 'Nymph', 'NymphOptions', 'WebSocket'], factory);
  } else if (typeof exports === 'object' && typeof module !== 'undefined') {
      // CommonJS
      module.exports = factory(require('Entity'), require('Nymph'), require('NymphOptions'), require('WebSocket'));
  } else {
    // Browser globals
    factory(root.Entity, root.Nymph, root.NymphOptions, root.WebSocket, root);
  }
}(typeof window !== "undefined" ? window : this, function(Entity, Nymph, NymphOptions, WebSocket, context){
  'use strict';
  if (typeof WebSocket === "undefined") {
    return null;
  }
  if (typeof context === "undefined") {
    context = {};
  }
  context.NymphPubSub = {
    // === Class Variables ===
    connection: null,
    pubsubURL: null,
    rateLimit: null,
    debouncers: {},
    subscriptions: {
      queries: {},
      uids: {}
    },

    // === Class Methods ===
    init: function(NymphOptions){
      this.pubsubURL = NymphOptions.pubsubURL;
      if (NymphOptions.rateLimit) {
        this.rateLimit = NymphOptions.rateLimit;
      }

      this.connect();

      return this;
    },

    connect: function(){
      var that = this;

      this.connection = new WebSocket(this.pubsubURL);
      this.connection.onopen = function(){
        if (typeof console !== "undefined") {
          console.log("Nymph-PubSub connection established!");
        }
      };

      this.connection.onmessage = function(e){
        if (!that.rateLimit || typeof that.debouncers[e.data] === "undefined") {
          var func = function(){
            var data = JSON.parse(e.data);
            if (typeof data.query !== "undefined" && typeof that.subscriptions.queries[data.query] !== "undefined") {
              if (typeof data.count !== "undefined") {
                for (var i1=0; typeof that.subscriptions.queries[data.query] !== "undefined" && i1 < that.subscriptions.queries[data.query].length; i1++) {
                  if (typeof that.subscriptions.queries[data.query][i1][2] !== "undefined") {
                    that.subscriptions.queries[data.query][i1][2](data.count);
                  }
                }
              } else {
                Nymph.getEntities.apply(Nymph, JSON.parse(data.query)).then(function(){
                  for (var i=0; typeof that.subscriptions.queries[data.query] !== "undefined" && i < that.subscriptions.queries[data.query].length; i++) {
                    that.subscriptions.queries[data.query][i][0].apply(this, arguments);
                  }
                }, function(){
                  for (var i=0; typeof that.subscriptions.queries[data.query] !== "undefined" && i < that.subscriptions.queries[data.query].length; i++) {
                    that.subscriptions.queries[data.query][i][1].apply(this, arguments);
                  }
                });
              }
            }
            if (typeof data.uid !== "undefined" && typeof that.subscriptions.uids[data.uid] !== "undefined") {
              if (typeof data.count !== "undefined") {
                for (var i2=0; typeof that.subscriptions.uids[data.uid] !== "undefined" && i2 < that.subscriptions.uids[data.uid].length; i2++) {
                  if (typeof that.subscriptions.uids[data.uid][i2][2] !== "undefined") {
                    that.subscriptions.uids[data.uid][i2][2](data.count);
                  }
                }
              } else {
                Nymph.getUID.call(Nymph, data.uid).then(function(){
                  for (var i=0; typeof that.subscriptions.uids[data.uid] !== "undefined" && i < that.subscriptions.uids[data.uid].length; i++) {
                    that.subscriptions.uids[data.uid][i][0].apply(this, arguments);
                  }
                }, function(){
                  for (var i=0; typeof that.subscriptions.uids[data.uid] !== "undefined" && i < that.subscriptions.uids[data.uid].length; i++) {
                    that.subscriptions.uids[data.uid][i][1].apply(this, arguments);
                  }
                });
              }
            }
            if (that.rateLimit) {
              delete that.debouncers[e.data];
            }
          };
        }
        /* jshint -W038 */
        if (!that.rateLimit) {
          func();
          return;
        }
        if (typeof that.debouncers[e.data] === "undefined") {
          that.debouncers[e.data] = that.debounce(func);
        }
        /* jshint +W038 */
        that.debouncers[e.data]();
      };
    },

    debounce: function(func, immediate){
      var timeout, that = this;
      return function(){
        var context = this, args = arguments;
        var later = function(){
          timeout = null;
          if (!immediate) {
            func.apply(context, args);
          }
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, that.rateLimit);
        if (callNow) {
          func.apply(context, args);
        }
      };
    },

    subscribeQuery: function(query, callbacks){
      var that = this;
      var func = function(){
        if (that.connection.readyState === 1) {
          if (typeof that.subscriptions.queries[query] === "undefined") {
            that.subscriptions.queries[query] = [];
          }
          that.connection.send(JSON.stringify({
            "action": "subscribe",
            "query": query,
            "count": typeof callbacks[2] !== "undefined"
          }));
          that.subscriptions.queries[query].push(callbacks);
          clearInterval(int);
        }
      };
      var int = setInterval(func, 100);
      func();
    },

    unsubscribeQuery: function(query, callbacks){
      var that = this;
      var func = function(){
        if (that.connection.readyState === 1) {
          if (typeof that.subscriptions.queries[query] === "undefined") {
            return;
          }
          var idx = that.subscriptions.queries[query].indexOf(callbacks);
          if (idx === -1) {
            return;
          }
          that.subscriptions.queries[query].splice(idx, 1);
          if (!that.subscriptions.queries[query].length) {
            delete that.subscriptions.queries[query];
          }
          that.connection.send(JSON.stringify({
            "action": "unsubscribe",
            "query": query
          }));
          clearInterval(int);
        }
      };
      var int = setInterval(func, 100);
      func();
    },

    subscribeUID: function(name, callbacks){
      var that = this;
      var func = function(){
        if (that.connection.readyState === 1) {
          if (typeof that.subscriptions.uids[name] === "undefined") {
            that.subscriptions.uids[name] = [];
          }
          that.connection.send(JSON.stringify({
            "action": "subscribe",
            "uid": name,
            "count": typeof callbacks[2] !== "undefined"
          }));
          that.subscriptions.uids[name].push(callbacks);
          clearInterval(int);
        }
      };
      var int = setInterval(func, 100);
      func();
    },

    unsubscribeUID: function(name, callbacks){
      var that = this;
      var func = function(){
        if (that.connection.readyState === 1) {
          if (typeof that.subscriptions.uids[name] === "undefined") {
            return;
          }
          var idx = that.subscriptions.uids[name].indexOf(callbacks);
          if (idx === -1) {
            return;
          }
          that.subscriptions.uids[name].splice(idx, 1);
          if (!that.subscriptions.uids[name].length) {
            delete that.subscriptions.uids[name];
          }
          that.connection.send(JSON.stringify({
            "action": "unsubscribe",
            "uid": name
          }));
          clearInterval(int);
        }
      };
      var int = setInterval(func, 100);
      func();
    }
  };

  // Override the original Nymph methods to allow subscriptions.
  var getEntities = Nymph.getEntities,
    getEntity = Nymph.getEntity,
    getUID = Nymph.getUID;
  Nymph.getEntities = function(){
    var args = Array.prototype.slice.call(arguments);
    var promise = getEntities.apply(Nymph, args);
    promise.query = JSON.stringify(args);
    promise.subscribe = function(resolve, reject, count){
      var callbacks = [resolve, reject, count];

      promise.then(resolve, reject);

      context.NymphPubSub.subscribeQuery(promise.query, callbacks);
      return {
        unsubscribe: function(){
          context.NymphPubSub.unsubscribeQuery(promise.query, callbacks);
        }
      };
    };
    return promise;
  };
  Nymph.getEntity = function(){
    var args = Array.prototype.slice.call(arguments);
    var promise = getEntity.apply(Nymph, args);
    args[0].limit = 1;
    promise.query = JSON.stringify(args);
    promise.subscribe = function(resolve, reject, count){
      var newResolve = function(args){
        if (!args.length) {
          if (resolve){
            resolve(null);
          }
        } else {
          if (resolve){
            resolve(args[0]);
          }
        }
      };
      var callbacks = [newResolve, reject, count];

      promise.then(resolve, reject);

      context.NymphPubSub.subscribeQuery(promise.query, callbacks);
      return {
        unsubscribe: function(){
          context.NymphPubSub.unsubscribeQuery(promise.query, callbacks);
        }
      };
    };
    return promise;
  };
  Nymph.getUID = function(name){
    var promise = getUID.apply(Nymph, [name]);
    promise.subscribe = function(resolve, reject, count){
      var callbacks = [resolve, reject, count];

      promise.then(resolve, reject);

      context.NymphPubSub.subscribeUID(name, callbacks);
      return {
        unsubscribe: function(){
          context.NymphPubSub.unsubscribeUID(name, callbacks);
        }
      };
    };
    return promise;
  };
  Entity.prototype.subscribe = function(resolve, reject, count){
    if (!this.guid) {
      return false;
    }
    var that = this,
      query = [{'class': this.class, 'limit': 1}, {type: '&', guid: this.guid}],
      jsonQuery = JSON.stringify(query);

    var newResolve = function(args){
      if (!args.length) {
        that.guid = null;
        if (resolve){
          resolve(that);
        }
      } else {
        that.init(args[0]);
        if (resolve){
          resolve(that);
        }
      }
    };
    var callbacks = [newResolve, reject, count];

    context.NymphPubSub.subscribeQuery(jsonQuery, callbacks);
    return {
      unsubscribe: function(){
        context.NymphPubSub.unsubscribeQuery(jsonQuery, callbacks);
      }
    };
  };

  return context.NymphPubSub.init(NymphOptions);
}));
