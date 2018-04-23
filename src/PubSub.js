/* global WebSocket */
'use strict';

import {Nymph} from './Nymph';
import {Entity} from './Entity';

if (typeof WebSocket === 'undefined') {
  throw new Error('Nymph-PubSub requires WebSocket!');
}

export default class PubSub {
  // === Static Methods ===

  static init (NymphOptions) {
    this.pubsubURL = NymphOptions.pubsubURL;
    if (NymphOptions.rateLimit) {
      this.rateLimit = NymphOptions.rateLimit;
    }

    this.connect();

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
        if (!args.length) {
          this.guid = null;
          if (resolve) {
            resolve(this);
          }
        } else {
          this.init(args[0]);
          if (resolve) {
            resolve(this);
          }
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
          if (e.code !== 1000) {
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
            if (typeof data.query !== 'undefined' && typeof this.subscriptions.queries[data.query] !== 'undefined') {
              if (typeof data.count !== 'undefined') {
                for (let i1 = 0; typeof this.subscriptions.queries[data.query] !== 'undefined' && i1 < this.subscriptions.queries[data.query].length; i1++) {
                  if (typeof this.subscriptions.queries[data.query][i1][2] !== 'undefined') {
                    this.subscriptions.queries[data.query][i1][2](data.count);
                  }
                }
              } else {
                Nymph.getEntities.apply(Nymph, JSON.parse(data.query)).then((...args) => {
                  for (let i = 0; typeof this.subscriptions.queries[data.query] !== 'undefined' && i < this.subscriptions.queries[data.query].length; i++) {
                    this.subscriptions.queries[data.query][i][0].apply(null, args);
                  }
                }, (...args) => {
                  for (let i = 0; typeof this.subscriptions.queries[data.query] !== 'undefined' && i < this.subscriptions.queries[data.query].length; i++) {
                    this.subscriptions.queries[data.query][i][1].apply(null, args);
                  }
                });
              }
            }
            if (typeof data.uid !== 'undefined' && typeof this.subscriptions.uids[data.uid] !== 'undefined') {
              if (typeof data.count !== 'undefined') {
                for (let i2 = 0; typeof this.subscriptions.uids[data.uid] !== 'undefined' && i2 < this.subscriptions.uids[data.uid].length; i2++) {
                  if (typeof this.subscriptions.uids[data.uid][i2][2] !== 'undefined') {
                    this.subscriptions.uids[data.uid][i2][2](data.count);
                  }
                }
              } else {
                Nymph.getUID(data.uid).then((...args) => {
                  for (let i = 0; typeof this.subscriptions.uids[data.uid] !== 'undefined' && i < this.subscriptions.uids[data.uid].length; i++) {
                    this.subscriptions.uids[data.uid][i][0].apply(null, args);
                  }
                }, (...args) => {
                  for (let i = 0; typeof this.subscriptions.uids[data.uid] !== 'undefined' && i < this.subscriptions.uids[data.uid].length; i++) {
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
        if (typeof this.debouncers[e.data] === 'undefined') {
          this.debouncers[e.data] = this.debounce(func);
        }
        /* jshint +W038 */
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

export class PubSubSubscription {
  // === Constructor ===

  constructor (query, callbacks, unsubscribe) {
    // === Instance Properties ===

    this.query = query;
    this.callbacks = callbacks;
    this.unsubscribe = unsubscribe;
  }
}

if (typeof window !== 'undefined' && typeof window.NymphOptions !== 'undefined') {
  PubSub.init(window.NymphOptions);
}
