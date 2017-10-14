/*
Nymph PubSub 1.6.1 nymph.io
(C) 2014-2017 Hunter Perrin
license Apache-2.0
*/
/* global WebSocket */
/* global NymphOptions */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PubSub = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Nymph = require("Nymph");

var _Nymph2 = _interopRequireDefault(_Nymph);

var _Entity = require("Entity");

var _Entity2 = _interopRequireDefault(_Entity);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

if (typeof WebSocket === "undefined") {
  throw new Error("Nymph-PubSub requires WebSocket!");
}

var PubSub = function () {

  // === Constructor ===

  function PubSub() {
    _classCallCheck(this, PubSub);

    // === Instance Properties ===

    this.connection = null;
    this.pubsubURL = null;
    this.rateLimit = null;
    this.debouncers = {};
    this.subscriptions = {
      queries: {},
      uids: {}
    };
  }

  // === Instance Methods ===

  _createClass(PubSub, [{
    key: "init",
    value: function init(NymphOptions) {
      this.pubsubURL = NymphOptions.pubsubURL;
      if (NymphOptions.rateLimit) {
        this.rateLimit = NymphOptions.rateLimit;
      }

      this.connect();

      return this;
    }
  }, {
    key: "connect",
    value: function connect() {
      var _this = this;

      this.connection = new WebSocket(this.pubsubURL);
      this.connection.onopen = function () {
        if (typeof console !== "undefined") {
          console.log("Nymph-PubSub connection established!");
        }
      };

      this.connection.onmessage = function (e) {
        var func = void 0,
            data = void 0;
        if (!_this.rateLimit || typeof _this.debouncers[e.data] === "undefined") {
          func = function func() {
            data = JSON.parse(e.data);
            if (typeof data.query !== "undefined" && typeof _this.subscriptions.queries[data.query] !== "undefined") {
              if (typeof data.count !== "undefined") {
                for (var i1 = 0; typeof _this.subscriptions.queries[data.query] !== "undefined" && i1 < _this.subscriptions.queries[data.query].length; i1++) {
                  if (typeof _this.subscriptions.queries[data.query][i1][2] !== "undefined") {
                    _this.subscriptions.queries[data.query][i1][2](data.count);
                  }
                }
              } else {
                _Nymph2.default.getEntities.apply(_Nymph2.default, JSON.parse(data.query)).then(function () {
                  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                    args[_key] = arguments[_key];
                  }

                  for (var i = 0; typeof _this.subscriptions.queries[data.query] !== "undefined" && i < _this.subscriptions.queries[data.query].length; i++) {
                    _this.subscriptions.queries[data.query][i][0].apply(null, args);
                  }
                }, function () {
                  for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                    args[_key2] = arguments[_key2];
                  }

                  for (var i = 0; typeof _this.subscriptions.queries[data.query] !== "undefined" && i < _this.subscriptions.queries[data.query].length; i++) {
                    _this.subscriptions.queries[data.query][i][1].apply(null, args);
                  }
                });
              }
            }
            if (typeof data.uid !== "undefined" && typeof _this.subscriptions.uids[data.uid] !== "undefined") {
              if (typeof data.count !== "undefined") {
                for (var i2 = 0; typeof _this.subscriptions.uids[data.uid] !== "undefined" && i2 < _this.subscriptions.uids[data.uid].length; i2++) {
                  if (typeof _this.subscriptions.uids[data.uid][i2][2] !== "undefined") {
                    _this.subscriptions.uids[data.uid][i2][2](data.count);
                  }
                }
              } else {
                _Nymph2.default.getUID.call(_Nymph2.default, data.uid).then(function () {
                  for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                    args[_key3] = arguments[_key3];
                  }

                  for (var i = 0; typeof _this.subscriptions.uids[data.uid] !== "undefined" && i < _this.subscriptions.uids[data.uid].length; i++) {
                    _this.subscriptions.uids[data.uid][i][0].apply(null, args);
                  }
                }, function () {
                  for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
                    args[_key4] = arguments[_key4];
                  }

                  for (var i = 0; typeof _this.subscriptions.uids[data.uid] !== "undefined" && i < _this.subscriptions.uids[data.uid].length; i++) {
                    _this.subscriptions.uids[data.uid][i][1].apply(null, args);
                  }
                });
              }
            }
            if (_this.rateLimit) {
              delete _this.debouncers[e.data];
            }
          };
        }
        /* jshint -W038 */
        if (!_this.rateLimit) {
          func();
          return;
        }
        if (typeof _this.debouncers[e.data] === "undefined") {
          _this.debouncers[e.data] = _this.debounce(func);
        }
        /* jshint +W038 */
        _this.debouncers[e.data]();
      };
    }
  }, {
    key: "debounce",
    value: function debounce(func, immediate) {
      var timeout = void 0,
          that = this;
      return function () {
        for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
          args[_key5] = arguments[_key5];
        }

        var context = this;
        var later = function later() {
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
    }
  }, {
    key: "subscribeQuery",
    value: function subscribeQuery(query, callbacks) {
      var _this2 = this;

      var func = function func() {
        if (_this2.connection.readyState === 1) {
          if (typeof _this2.subscriptions.queries[query] === "undefined") {
            _this2.subscriptions.queries[query] = [];
          }
          _this2.connection.send(JSON.stringify({
            "action": "subscribe",
            "query": query,
            "count": typeof callbacks[2] !== "undefined"
          }));
          _this2.subscriptions.queries[query].push(callbacks);
          clearInterval(interval);
        }
      };
      var interval = setInterval(func, 100);
      func();
    }
  }, {
    key: "unsubscribeQuery",
    value: function unsubscribeQuery(query, callbacks) {
      var _this3 = this;

      var func = function func() {
        if (_this3.connection.readyState === 1) {
          if (typeof _this3.subscriptions.queries[query] === "undefined") {
            return;
          }
          var idx = _this3.subscriptions.queries[query].indexOf(callbacks);
          if (idx === -1) {
            return;
          }
          _this3.subscriptions.queries[query].splice(idx, 1);
          if (!_this3.subscriptions.queries[query].length) {
            delete _this3.subscriptions.queries[query];
          }
          _this3.connection.send(JSON.stringify({
            "action": "unsubscribe",
            "query": query
          }));
          clearInterval(interval);
        }
      };
      var interval = setInterval(func, 100);
      func();
    }
  }, {
    key: "subscribeUID",
    value: function subscribeUID(name, callbacks) {
      var _this4 = this;

      var func = function func() {
        if (_this4.connection.readyState === 1) {
          if (typeof _this4.subscriptions.uids[name] === "undefined") {
            _this4.subscriptions.uids[name] = [];
          }
          _this4.connection.send(JSON.stringify({
            "action": "subscribe",
            "uid": name,
            "count": typeof callbacks[2] !== "undefined"
          }));
          _this4.subscriptions.uids[name].push(callbacks);
          clearInterval(interval);
        }
      };
      var interval = setInterval(func, 100);
      func();
    }
  }, {
    key: "unsubscribeUID",
    value: function unsubscribeUID(name, callbacks) {
      var _this5 = this;

      var func = function func() {
        if (_this5.connection.readyState === 1) {
          if (typeof _this5.subscriptions.uids[name] === "undefined") {
            return;
          }
          var idx = _this5.subscriptions.uids[name].indexOf(callbacks);
          if (idx === -1) {
            return;
          }
          _this5.subscriptions.uids[name].splice(idx, 1);
          if (!_this5.subscriptions.uids[name].length) {
            delete _this5.subscriptions.uids[name];
          }
          _this5.connection.send(JSON.stringify({
            "action": "unsubscribe",
            "uid": name
          }));
          clearInterval(interval);
        }
      };
      var interval = setInterval(func, 100);
      func();
    }
  }]);

  return PubSub;
}();

;

var pubSub = new PubSub();
if (typeof window !== 'undefined' && typeof window.NymphOptions !== 'undefined') {
  pubSub.init(window.NymphOptions);
}

// Override the original Nymph methods to allow subscriptions.
var getEntities = _Nymph2.default.getEntities;
var getEntity = _Nymph2.default.getEntity;
var getUID = _Nymph2.default.getUID;

_Nymph2.default.getEntities = function (options) {
  for (var _len6 = arguments.length, selectors = Array(_len6 > 1 ? _len6 - 1 : 0), _key6 = 1; _key6 < _len6; _key6++) {
    selectors[_key6 - 1] = arguments[_key6];
  }

  var promise = getEntities.apply(_Nymph2.default, [options].concat(selectors));
  promise.query = JSON.stringify([options].concat(selectors));
  promise.subscribe = function (resolve, reject, count) {
    var callbacks = [resolve, reject, count];

    promise.then(resolve, reject);

    pubSub.subscribeQuery(promise.query, callbacks);
    return {
      unsubscribe: function unsubscribe() {
        pubSub.unsubscribeQuery(promise.query, callbacks);
      }
    };
  };
  return promise;
};

_Nymph2.default.getEntity = function (options) {
  for (var _len7 = arguments.length, selectors = Array(_len7 > 1 ? _len7 - 1 : 0), _key7 = 1; _key7 < _len7; _key7++) {
    selectors[_key7 - 1] = arguments[_key7];
  }

  var promise = getEntity.apply(_Nymph2.default, [options].concat(selectors));
  options.limit = 1;
  promise.query = JSON.stringify([options].concat(selectors));
  promise.subscribe = function (resolve, reject, count) {
    var newResolve = function newResolve(args) {
      if (!args.length) {
        if (resolve) {
          resolve(null);
        }
      } else {
        if (resolve) {
          resolve(args[0]);
        }
      }
    };
    var callbacks = [newResolve, reject, count];

    promise.then(resolve, reject);

    pubSub.subscribeQuery(promise.query, callbacks);
    return {
      unsubscribe: function unsubscribe() {
        pubSub.unsubscribeQuery(promise.query, callbacks);
      }
    };
  };
  return promise;
};

_Nymph2.default.getUID = function (name) {
  var promise = getUID.apply(_Nymph2.default, [name]);
  promise.subscribe = function (resolve, reject, count) {
    var callbacks = [resolve, reject, count];

    promise.then(resolve, reject);

    pubSub.subscribeUID(name, callbacks);
    return {
      unsubscribe: function unsubscribe() {
        pubSub.unsubscribeUID(name, callbacks);
      }
    };
  };
  return promise;
};

_Entity2.default.prototype.subscribe = function (resolve, reject, count) {
  var _this6 = this;

  if (!this.guid) {
    return false;
  }
  var query = [{ 'class': this.constructor.class, 'limit': 1 }, { type: '&', guid: this.guid }];
  var jsonQuery = JSON.stringify(query);

  var newResolve = function newResolve(args) {
    if (!args.length) {
      _this6.guid = null;
      if (resolve) {
        resolve(_this6);
      }
    } else {
      _this6.init(args[0]);
      if (resolve) {
        resolve(_this6);
      }
    }
  };
  var callbacks = [newResolve, reject, count];

  pubSub.subscribeQuery(jsonQuery, callbacks);
  return {
    unsubscribe: function unsubscribe() {
      pubSub.unsubscribeQuery(jsonQuery, callbacks);
    }
  };
};

exports.PubSub = pubSub;
exports.default = pubSub;