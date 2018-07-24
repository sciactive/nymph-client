/* global WebSocket */
'use strict';

import {Nymph} from './Nymph';
import {Entity} from './Entity';

let authToken = null;

if (typeof WebSocket === 'undefined') {
  throw new Error('Nymph-PubSub requires WebSocket!');
}

export class PubSub {
  // === Static Methods ===

  static init (NymphOptions) {
    this.pubsubURL = NymphOptions.pubsubURL;
    if (NymphOptions.rateLimit) {
      this.rateLimit = NymphOptions.rateLimit;
    }

    if (typeof navigator === 'undefined' || navigator.onLine) {
      this.connect();
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.connect());
    }

    // Override the original Nymph methods to allow subscriptions.
    let getEntities = Nymph.getEntities;
    let getEntity = Nymph.getEntity;
    let getUID = Nymph.getUID;

    Nymph.getEntities = function (options, ...selectors) {
      const promise = getEntities.apply(Nymph, [options, ...selectors]);
      promise.query = JSON.stringify([options, ...selectors]);
      promise.subscribe = (resolve, reject, count) => {
        const callbacks = [resolve, reject, count];

        promise.then(resolve, reject);

        PubSub.subscribeQuery(promise.query, callbacks);
        return new PubSubSubscription(promise.query, callbacks, () => {
          PubSub.unsubscribeQuery(promise.query, callbacks);
        });
      };
      return promise;
    };

    Nymph.getEntity = function (options, ...selectors) {
      const promise = getEntity.apply(Nymph, [options, ...selectors]);
      options.limit = 1;
      promise.query = JSON.stringify([options, ...selectors]);
      promise.subscribe = (resolve, reject, count) => {
        const newResolve = (args) => {
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
        const callbacks = [newResolve, reject, count];

        promise.then(resolve, reject);

        PubSub.subscribeQuery(promise.query, callbacks);
        return new PubSubSubscription(promise.query, callbacks, () => {
          PubSub.unsubscribeQuery(promise.query, callbacks);
        });
      };
      return promise;
    };

    Nymph.getUID = function (name) {
      const promise = getUID.apply(Nymph, [name]);
      promise.subscribe = (resolve, reject, count) => {
        const callbacks = [resolve, reject, count];

        promise.then(resolve, reject);

        PubSub.subscribeUID(name, callbacks);
        return {
          unsubscribe: () => {
            PubSub.unsubscribeUID(name, callbacks);
          }
        };
      };
      return promise;
    };

    Entity.prototype.subscribe = function (resolve, reject, count) {
      if (!this.guid) {
        return false;
      }
      const query = [{'class': this.constructor.class, 'limit': 1}, {type: '&', guid: this.guid}];
      const jsonQuery = JSON.stringify(query);

      const newResolve = (args) => {
        let myArray;
        if (Array.isArray(args)) {
          myArray = args;
          if (myArray.length) {
            this.init(myArray[0]);
          }
        } else {
          myArray = [this];
          PubSub.updateArray(myArray, args);
        }

        if (!myArray.length) {
          this.guid = null;
        }

        if (resolve) {
          resolve(this);
        }
      };
      const callbacks = [newResolve, reject, count];

      PubSub.subscribeQuery(jsonQuery, callbacks);
      return {
        unsubscribe: () => {
          PubSub.unsubscribeQuery(jsonQuery, callbacks);
        }
      };
    };

    return this;
  }

  static connect () {
    // Are we already connected?
    if (this.connection && (this.connection.readyState === WebSocket.OPEN || this.connection.readyState === WebSocket.CONNECTING)) {
      return;
    }

    let timedAttemptConnect = () => {
      // Attempt to connect, wait 5 seconds, then check and attempt again if unsuccessful.
      setTimeout(() => {
        if (this.connection.readyState !== WebSocket.OPEN) {
          this.connection.close();
          timedAttemptConnect();
        }
      }, 5000);

      this.connection = new WebSocket(this.pubsubURL);

      this.connection.onopen = () => {
        if (typeof console !== 'undefined') {
          console.log('Nymph-PubSub connection established!');
        }
        for (let i = 0; i < this.connectCallbacks.length; i++) {
          if (typeof this.connectCallbacks[i] !== 'undefined') {
            this.connectCallbacks[i]();
          }
        }

        if (authToken !== null) {
          this.connection.send(JSON.stringify({
            'action': 'authenticate',
            'token': authToken
          }));
        }

        for (let query in this.subscriptions.queries) {
          if (!this.subscriptions.queries.hasOwnProperty(query)) {
            continue;
          }
          let count = false;
          for (let callbacks = 0; callbacks < this.subscriptions.queries[query].length; callbacks++) {
            if (typeof this.subscriptions.queries[query][callbacks][2] !== 'undefined') {
              count = true;
              break;
            }
          }
          this._subscribeQuery(query, count);
        }

        for (let name in this.subscriptions.uids) {
          if (!this.subscriptions.uids.hasOwnProperty(name)) {
            continue;
          }
          let count = false;
          for (let callbacks = 0; callbacks < this.subscriptions.uids[name].length; callbacks++) {
            if (typeof this.subscriptions.uids[name][callbacks][2] !== 'undefined') {
              count = true;
              break;
            }
          }
          this._subscribeUID(name, count);
        }

        this.connection.onclose = (e) => {
          if (typeof console !== 'undefined') {
            console.log('Nymph-PubSub connection closed: ', e);
          }
          for (let i = 0; i < this.disconnectCallbacks.length; i++) {
            if (typeof this.disconnectCallbacks[i] !== 'undefined') {
              this.disconnectCallbacks[i]();
            }
          }
          if (!navigator || navigator.onLine) {
            this.connection.close();
            timedAttemptConnect();
          }
        };
      };

      this.connection.onmessage = (e) => {
        let func, data;
        if (!this.rateLimit || typeof this.debouncers[e.data] === 'undefined') {
          func = () => {
            data = JSON.parse(e.data);
            let val = null;
            let subs = [];
            if (data.hasOwnProperty('query') && typeof this.subscriptions.queries[data.query] !== 'undefined') {
              subs = [...this.subscriptions.queries[data.query]];
              if (!data.hasOwnProperty('count')) {
                val = data;
              }
            } else if (data.hasOwnProperty('uid') && typeof this.subscriptions.uids[data.uid] !== 'undefined') {
              subs = [...this.subscriptions.uids[data.uid]];
              if (!data.hasOwnProperty('count') && (data.event === 'newUID' || data.event === 'setUID')) {
                val = data.value;
              }
            }
            if (data.hasOwnProperty('count')) {
              for (let i = 0; i < subs.length; i++) {
                if (typeof subs[i][2] !== 'undefined') {
                  subs[i][2](data.count);
                }
              }
            } else {
              for (let i = 0; i < subs.length; i++) {
                if (typeof subs[i][0] !== 'undefined') {
                  subs[i][0](val);
                }
              }
            }
            if (this.rateLimit) {
              delete this.debouncers[e.data];
            }
          };
        }
        if (!this.rateLimit) {
          func();
          return;
        }
        if (typeof this.debouncers[e.data] === 'undefined') {
          this.debouncers[e.data] = this.debounce(func);
        }
        this.debouncers[e.data]();
      };
    };

    timedAttemptConnect();
  }

  static debounce (func, immediate) {
    let timeout;
    let that = this;
    return function (...args) {
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

  static subscribeQuery (query, callbacks) {
    let isNewSubscription = false;
    if (typeof this.subscriptions.queries[query] === 'undefined') {
      this.subscriptions.queries[query] = [];
      isNewSubscription = true;
    }
    let isCountSubscribed = isNewSubscription || this._isCountSubscribedQuery(query);
    this.subscriptions.queries[query].push(callbacks);
    if (this.connection.readyState === WebSocket.OPEN) {
      if (isNewSubscription) {
        this._subscribeQuery(query, typeof callbacks[2] !== 'undefined');
      } else if (!isCountSubscribed && callbacks[2] !== 'undefined') {
        this._unsubscribeQuery(query);
        this._subscribeQuery(query, true);
      }
    }
  }

  static subscribeUID (name, callbacks) {
    let isNewSubscription = false;
    if (typeof this.subscriptions.uids[name] === 'undefined') {
      this.subscriptions.uids[name] = [];
      isNewSubscription = true;
    }
    let isCountSubscribed = isNewSubscription || this._isCountSubscribedUID(name);
    this.subscriptions.uids[name].push(callbacks);
    if (this.connection.readyState === WebSocket.OPEN) {
      if (isNewSubscription) {
        this._subscribeUID(name, typeof callbacks[2] !== 'undefined');
      } else if (!isCountSubscribed && callbacks[2] !== 'undefined') {
        this._unsubscribeUID(name);
        this._subscribeUID(name, true);
      }
    }
  }

  static _subscribeQuery (query, count) {
    this.connection.send(JSON.stringify({
      'action': 'subscribe',
      'query': query,
      'count': count
    }));
  }

  static _subscribeUID (name, count) {
    this.connection.send(JSON.stringify({
      'action': 'subscribe',
      'uid': name,
      'count': count
    }));
  }

  static _isCountSubscribedQuery (query) {
    if (typeof this.subscriptions.queries[query] === 'undefined') {
      return false;
    }
    for (let callbacks = 0; callbacks < this.subscriptions.queries[query].length; callbacks++) {
      if (typeof this.subscriptions.queries[query][callbacks][2] !== 'undefined') {
        return true;
      }
    }
    return false;
  }

  static _isCountSubscribedUID (name) {
    if (typeof this.subscriptions.uids[name] === 'undefined') {
      return false;
    }
    for (let callbacks = 0; callbacks < this.subscriptions.uids[name].length; callbacks++) {
      if (typeof this.subscriptions.uids[name][callbacks][2] !== 'undefined') {
        return true;
      }
    }
    return false;
  }

  static unsubscribeQuery (query, callbacks) {
    if (typeof this.subscriptions.queries[query] === 'undefined') {
      return;
    }
    const idx = this.subscriptions.queries[query].indexOf(callbacks);
    if (idx === -1) {
      return;
    }
    this.subscriptions.queries[query].splice(idx, 1);
    if (!this.subscriptions.queries[query].length) {
      delete this.subscriptions.queries[query];
      if (this.connection.readyState === WebSocket.OPEN) {
        this._unsubscribeQuery(query);
      }
    }
  }

  static unsubscribeUID (name, callbacks) {
    if (typeof this.subscriptions.uids[name] === 'undefined') {
      return;
    }
    const idx = this.subscriptions.uids[name].indexOf(callbacks);
    if (idx === -1) {
      return;
    }
    this.subscriptions.uids[name].splice(idx, 1);
    if (!this.subscriptions.uids[name].length) {
      delete this.subscriptions.uids[name];
      if (this.connection.readyState === WebSocket.OPEN) {
        this._unsubscribeUID(name);
      }
    }
  }

  static _unsubscribeQuery (query) {
    this.connection.send(JSON.stringify({
      'action': 'unsubscribe',
      'query': query
    }));
  }

  static _unsubscribeUID (name) {
    this.connection.send(JSON.stringify({
      'action': 'unsubscribe',
      'uid': name
    }));
  }

  static updateArray (oldArr, update) {
    if (Array.isArray(update)) {
      const newArr = [...update];

      if (oldArr.length === 0) {
        // This will happen on the first update from a subscribe.
        oldArr.splice(0, 0, ...newArr);
        return;
      }

      const idMap = {};
      for (let i = 0; i < newArr.length; i++) {
        if (newArr[i] instanceof Nymph.getEntityClass('Nymph\\Entity') && newArr[i].guid) {
          idMap[newArr[i].guid] = i;
        }
      }
      const remove = [];
      for (let k in oldArr) {
        if (k <= 4294967294 && /^0$|^[1-9]\d*$/.test(k) && oldArr.hasOwnProperty(k)) { // This handles sparse arrays.
          k = Number(k);
          if (typeof idMap[oldArr[k].guid] === 'undefined') {
            // It was deleted.
            remove.push(k);
          } else if (newArr[idMap[oldArr[k].guid]].mdate !== oldArr[k].mdate) {
            // It was modified.
            oldArr[k].init(newArr[idMap[oldArr[k].guid]].toJSON());
            delete idMap[oldArr[k].guid];
          } else {
            // Item wasn't modified.
            delete idMap[oldArr[k].guid];
          }
        }
      }
      // Now we must remove the deleted ones.
      remove.sort(function (a, b) {
        // Sort backwards so we can remove in reverse order. (Preserves indices.)
        if (a > b) return -1;
        if (a < b) return 1;
        return 0;
      });
      for (let n = 0; n < remove.length; n++) {
        oldArr.splice(remove[n], 1);
      }
      // And add the new ones.
      for (let v in idMap) {
        if (idMap.hasOwnProperty(v)) {
          oldArr.splice(oldArr.length, 0, newArr[idMap[v]]);
        }
      }
    } else if (update != null && update.hasOwnProperty('query')) {
      const query = JSON.parse(update.query);

      if (update.hasOwnProperty('removed')) {
        for (let i = 0; i < oldArr.length; i++) {
          if (oldArr[i] != null && oldArr[i].guid === update.removed) {
            oldArr.splice(i, 1);
            return;
          }
        }
      }

      // Get the entity.
      let entity;
      if (update.hasOwnProperty('added')) {
        // A new entity.
        entity = Nymph.initEntity(update.data);
      }
      if (update.hasOwnProperty('updated')) {
        // Extract it from the array.
        for (let i = 0; i < oldArr.length; i++) {
          if (oldArr[i] != null && oldArr[i].guid === update.updated) {
            entity = oldArr.splice(i, 1)[0].init(update.data);
          }
        }
      }

      if (entity != null) {
        // Insert the entity in order.
        const sort = query[0].hasOwnProperty('sort') ? query[0].sort : 'cdate';
        const reverse = query[0].hasOwnProperty('reverse') ? query[0].reverse : false;
        let i;

        if (reverse) {
          for (i = oldArr.length; (oldArr[i] || {})[sort] < entity[sort] && i > 0; i--);
        } else {
          for (i = 0; (oldArr[i] || {})[sort] < entity[sort] && i < oldArr.length; i++);
        }

        oldArr.splice(i, 0, entity);
      }
    }
  }

  static on (event, callback) {
    if (!this.hasOwnProperty(event + 'Callbacks')) {
      return false;
    }
    this[event + 'Callbacks'].push(callback);
    return true;
  }

  static off (event, callback) {
    if (!this.hasOwnProperty(event + 'Callbacks')) {
      return false;
    }
    const i = this[event + 'Callbacks'].indexOf(callback);
    if (i > -1) {
      this[event + 'Callbacks'].splice(i, 1);
    }
    return true;
  }

  static setToken (token) {
    authToken = token;
    if (this.connection.readyState === WebSocket.OPEN) {
      this.connection.send(JSON.stringify({
        'action': 'authenticate',
        'token': authToken
      }));
    }
  }
}

// === Static Properties ===
PubSub.connection = null;
PubSub.pubsubURL = null;
PubSub.rateLimit = null;
PubSub.debouncers = {};
PubSub.subscriptions = {
  queries: {},
  uids: {}
};
PubSub.connectCallbacks = [];
PubSub.disconnectCallbacks = [];

export class PubSubSubscription {
  // === Constructor ===

  constructor (query, callbacks, unsubscribe) {
    // === Instance Properties ===

    this.query = query;
    this.callbacks = callbacks;
    this.unsubscribe = unsubscribe;
  }
}

if (typeof window !== 'undefined' && typeof window.NymphOptions !== 'undefined' && typeof window.NymphOptions.pubsubURL !== 'undefined') {
  PubSub.init(window.NymphOptions);
}

export default PubSub;
