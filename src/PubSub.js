/*
Nymph PubSub 1.6.0 nymph.io
(C) 2014-2017 Hunter Perrin
license Apache-2.0
*/
/* global WebSocket */
/* global NymphOptions */
'use strict';

import Nymph from "Nymph";
import Entity from "Entity";

if (typeof WebSocket === "undefined") {
  throw new Error("Nymph-PubSub requires WebSocket!");
}

class PubSub {

  // === Constructor ===

  constructor() {

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

  init(NymphOptions) {
    this.pubsubURL = NymphOptions.pubsubURL;
    if (NymphOptions.rateLimit) {
      this.rateLimit = NymphOptions.rateLimit;
    }

    this.connect();

    return this;
  }

  connect() {
    this.connection = new WebSocket(this.pubsubURL);
    this.connection.onopen = () => {
      if (typeof console !== "undefined") {
        console.log("Nymph-PubSub connection established!");
      }
    };

    this.connection.onmessage = (e) => {
      let func, data;
      if (!this.rateLimit || typeof this.debouncers[e.data] === "undefined") {
        func = () => {
          data = JSON.parse(e.data);
          if (typeof data.query !== "undefined" && typeof this.subscriptions.queries[data.query] !== "undefined") {
            if (typeof data.count !== "undefined") {
              for (let i1 = 0; typeof this.subscriptions.queries[data.query] !== "undefined" && i1 < this.subscriptions.queries[data.query].length; i1++) {
                if (typeof this.subscriptions.queries[data.query][i1][2] !== "undefined") {
                  this.subscriptions.queries[data.query][i1][2](data.count);
                }
              }
            } else {
              Nymph.getEntities.apply(Nymph, JSON.parse(data.query)).then((...args) => {
                for (let i = 0; typeof this.subscriptions.queries[data.query] !== "undefined" && i < this.subscriptions.queries[data.query].length; i++) {
                  this.subscriptions.queries[data.query][i][0].apply(null, args);
                }
              }, (...args) => {
                for (let i = 0; typeof this.subscriptions.queries[data.query] !== "undefined" && i < this.subscriptions.queries[data.query].length; i++) {
                  this.subscriptions.queries[data.query][i][1].apply(null, args);
                }
              });
            }
          }
          if (typeof data.uid !== "undefined" && typeof this.subscriptions.uids[data.uid] !== "undefined") {
            if (typeof data.count !== "undefined") {
              for (let i2 = 0; typeof this.subscriptions.uids[data.uid] !== "undefined" && i2 < this.subscriptions.uids[data.uid].length; i2++) {
                if (typeof this.subscriptions.uids[data.uid][i2][2] !== "undefined") {
                  this.subscriptions.uids[data.uid][i2][2](data.count);
                }
              }
            } else {
              Nymph.getUID.call(Nymph, data.uid).then((...args) => {
                for (let i = 0; typeof this.subscriptions.uids[data.uid] !== "undefined" && i < this.subscriptions.uids[data.uid].length; i++) {
                  this.subscriptions.uids[data.uid][i][0].apply(null, args);
                }
              }, (...args) => {
                for (let i = 0; typeof this.subscriptions.uids[data.uid] !== "undefined" && i < this.subscriptions.uids[data.uid].length; i++) {
                  this.subscriptions.uids[data.uid][i][1].apply(null, args);
                }
              });
            }
          }
          if (this.rateLimit) {
            delete this.debouncers[e.data];
          }
        };
      }
      /* jshint -W038 */
      if (!this.rateLimit) {
        func();
        return;
      }
      if (typeof this.debouncers[e.data] === "undefined") {
        this.debouncers[e.data] = this.debounce(func);
      }
      /* jshint +W038 */
      this.debouncers[e.data]();
    };
  }

  debounce(func, immediate) {
    let timeout, that = this;
    return function(...args) {
      const context = this;
      const later = () => {
        timeout = null;
        if (!immediate) {
          func.apply(context, args);
        }
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, that.rateLimit);
      if (callNow) {
        func.apply(context, args);
      }
    };
  }

  subscribeQuery(query, callbacks) {
    const func = () => {
      if (this.connection.readyState === 1) {
        if (typeof this.subscriptions.queries[query] === "undefined") {
          this.subscriptions.queries[query] = [];
        }
        this.connection.send(JSON.stringify({
          "action": "subscribe",
          "query": query,
          "count": typeof callbacks[2] !== "undefined"
        }));
        this.subscriptions.queries[query].push(callbacks);
        clearInterval(interval);
      }
    };
    const interval = setInterval(func, 100);
    func();
  }

  unsubscribeQuery(query, callbacks) {
    const func = () => {
      if (this.connection.readyState === 1) {
        if (typeof this.subscriptions.queries[query] === "undefined") {
          return;
        }
        const idx = this.subscriptions.queries[query].indexOf(callbacks);
        if (idx === -1) {
          return;
        }
        this.subscriptions.queries[query].splice(idx, 1);
        if (!this.subscriptions.queries[query].length) {
          delete this.subscriptions.queries[query];
        }
        this.connection.send(JSON.stringify({
          "action": "unsubscribe",
          "query": query
        }));
        clearInterval(interval);
      }
    };
    const interval = setInterval(func, 100);
    func();
  }

  subscribeUID(name, callbacks) {
    const func = () => {
      if (this.connection.readyState === 1) {
        if (typeof this.subscriptions.uids[name] === "undefined") {
          this.subscriptions.uids[name] = [];
        }
        this.connection.send(JSON.stringify({
          "action": "subscribe",
          "uid": name,
          "count": typeof callbacks[2] !== "undefined"
        }));
        this.subscriptions.uids[name].push(callbacks);
        clearInterval(interval);
      }
    };
    const interval = setInterval(func, 100);
    func();
  }

  unsubscribeUID(name, callbacks) {
    const func = () => {
      if (this.connection.readyState === 1) {
        if (typeof this.subscriptions.uids[name] === "undefined") {
          return;
        }
        const idx = this.subscriptions.uids[name].indexOf(callbacks);
        if (idx === -1) {
          return;
        }
        this.subscriptions.uids[name].splice(idx, 1);
        if (!this.subscriptions.uids[name].length) {
          delete this.subscriptions.uids[name];
        }
        this.connection.send(JSON.stringify({
          "action": "unsubscribe",
          "uid": name
        }));
        clearInterval(interval);
      }
    };
    const interval = setInterval(func, 100);
    func();
  }
};

let pubSub = new PubSub();
if (typeof window !== 'undefined' && typeof window.NymphOptions !== 'undefined') {
  pubSub.init(window.NymphOptions);
}

// Override the original Nymph methods to allow subscriptions.
let getEntities = Nymph.getEntities;
let getEntity = Nymph.getEntity;
let getUID = Nymph.getUID;

Nymph.getEntities = function(options, ...selectors) {
  const promise = getEntities.apply(Nymph, [options, ...selectors]);
  promise.query = JSON.stringify([options, ...selectors]);
  promise.subscribe = (resolve, reject, count) => {
    const callbacks = [resolve, reject, count];

    promise.then(resolve, reject);

    pubSub.subscribeQuery(promise.query, callbacks);
    return {
      unsubscribe: () => {
        pubSub.unsubscribeQuery(promise.query, callbacks);
      }
    };
  };
  return promise;
};

Nymph.getEntity = function(options, ...selectors) {
  const promise = getEntity.apply(Nymph, [options, ...selectors]);
  options.limit = 1;
  promise.query = JSON.stringify([options, ...selectors]);
  promise.subscribe = (resolve, reject, count) => {
    const newResolve = (args) => {
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
    const callbacks = [newResolve, reject, count];

    promise.then(resolve, reject);

    pubSub.subscribeQuery(promise.query, callbacks);
    return {
      unsubscribe: () => {
        pubSub.unsubscribeQuery(promise.query, callbacks);
      }
    };
  };
  return promise;
};

Nymph.getUID = function(name) {
  const promise = getUID.apply(Nymph, [name]);
  promise.subscribe = (resolve, reject, count) => {
    const callbacks = [resolve, reject, count];

    promise.then(resolve, reject);

    pubSub.subscribeUID(name, callbacks);
    return {
      unsubscribe: () => {
        pubSub.unsubscribeUID(name, callbacks);
      }
    };
  };
  return promise;
};

Entity.prototype.subscribe = function(resolve, reject, count) {
  if (!this.guid) {
    return false;
  }
  const query = [{'class': this.constructor.class, 'limit': 1}, {type: '&', guid: this.guid}];
  const jsonQuery = JSON.stringify(query);

  const newResolve = (args) => {
    if (!args.length) {
      this.guid = null;
      if (resolve){
        resolve(this);
      }
    } else {
      this.init(args[0]);
      if (resolve){
        resolve(this);
      }
    }
  };
  const callbacks = [newResolve, reject, count];

  pubSub.subscribeQuery(jsonQuery, callbacks);
  return {
    unsubscribe: () => {
      pubSub.unsubscribeQuery(jsonQuery, callbacks);
    }
  };
};

export {pubSub as PubSub};
export default pubSub;
