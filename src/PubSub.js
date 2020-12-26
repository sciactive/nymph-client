'use strict';

import { Nymph } from './Nymph';
import { Entity } from './Entity';

let authToken = null;

export class PubSub {
  static init(NymphOptions) {
    this.pubsubURL = NymphOptions.pubsubURL;
    this.WebSocket =
      'WebSocket' in NymphOptions ? NymphOptions.WebSocket : WebSocket;

    if (!this.WebSocket) {
      throw new Error('Nymph-PubSub requires WebSocket!');
    }

    if (typeof addEventListener !== 'undefined') {
      addEventListener('online', () => this.connect());
    }
    if (typeof navigator === 'undefined' || navigator.onLine) {
      this.connect();
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
        const newResolve = args => {
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
          },
        };
      };
      return promise;
    };

    Entity.prototype.$subscribe = function (resolve, reject, count) {
      if (!this.guid) {
        return false;
      }
      const query = [
        { class: this.constructor.class, limit: 1 },
        { type: '&', guid: this.guid },
      ];
      const jsonQuery = JSON.stringify(query);

      const newResolve = args => {
        let myArray;
        if (Array.isArray(args)) {
          myArray = args;
          if (myArray.length) {
            this.$init(myArray[0]);
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
      return new PubSubSubscription(jsonQuery, callbacks, () => {
        PubSub.unsubscribeQuery(jsonQuery, callbacks);
      });
    };

    return this;
  }

  static connect() {
    // Are we already connected?
    if (
      this.connection &&
      (this.connection.readyState === this.WebSocket.OPEN ||
        this.connection.readyState === this.WebSocket.CONNECTING)
    ) {
      return;
    }

    this._waitForConnection();
    this._attemptConnect();
  }

  static close() {
    if (!this.connection) {
      return;
    }

    this.connection.close(4200, 'Closure requested by application.');
  }

  static _waitForConnection(attempts = 0) {
    // Wait 5 seconds, then check and attempt connection again if
    // unsuccessful. Keep repeating until successful.
    setTimeout(() => {
      if (this.connection.readyState !== this.WebSocket.OPEN) {
        if (
          this.connection.readyState !== this.WebSocket.CONNECTING ||
          attempts >= 5
        ) {
          this.connection.close();
          this._waitForConnection();
          this._attemptConnect();
        } else {
          this._waitForConnection(attempts + 1);
        }
      }
    }, 5000);
  }

  static _attemptConnect() {
    // Attempt to connect.
    this.connection = new this.WebSocket(this.pubsubURL);
    this.connection.onopen = this._onopen.bind(this);
    this.connection.onmessage = this._onmessage.bind(this);
  }

  static _onopen() {
    if (typeof console !== 'undefined') {
      console.log('Nymph-PubSub connection established!');
    }
    for (let i = 0; i < this.connectCallbacks.length; i++) {
      this.connectCallbacks[i] && this.connectCallbacks[i]();
    }

    if (authToken != null) {
      this._send({
        action: 'authenticate',
        token: authToken,
      });
    }

    for (let query in this.subscriptions.queries) {
      if (!this.subscriptions.queries.hasOwnProperty(query)) {
        continue;
      }
      let count = false;
      for (
        let callbacks = 0;
        callbacks < this.subscriptions.queries[query].length;
        callbacks++
      ) {
        if (this.subscriptions.queries[query][callbacks][2]) {
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
      for (
        let callbacks = 0;
        callbacks < this.subscriptions.uids[name].length;
        callbacks++
      ) {
        if (this.subscriptions.uids[name][callbacks][2]) {
          count = true;
          break;
        }
      }
      this._subscribeUID(name, count);
    }

    this.connection.onclose = this._onclose.bind(this);
  }

  static _onmessage(e) {
    let data = JSON.parse(e.data);
    let val = null;
    let subs = [];
    let count = data.hasOwnProperty('count');
    if (
      data.hasOwnProperty('query') &&
      this.subscriptions.queries.hasOwnProperty(data.query)
    ) {
      subs = [...this.subscriptions.queries[data.query]];
      if (!count) {
        val = data;
      }
    } else if (
      data.hasOwnProperty('uid') &&
      this.subscriptions.uids.hasOwnProperty(data.uid)
    ) {
      subs = [...this.subscriptions.uids[data.uid]];
      if (!count && (data.event === 'newUID' || data.event === 'setUID')) {
        val = data.value;
      }
    }
    for (let i = 0; i < subs.length; i++) {
      subs[i][count ? 2 : 0] &&
        subs[i][count ? 2 : 0](count ? data.count : val);
    }
  }

  static _onclose(e) {
    if (typeof console !== 'undefined') {
      console.log(`Nymph-PubSub connection closed: ${e.code} ${e.reason}`);
    }
    for (let i = 0; i < this.disconnectCallbacks.length; i++) {
      this.disconnectCallbacks[i] && this.disconnectCallbacks[i]();
    }
    if (
      e.code !== 4200 &&
      (typeof navigator === 'undefined' || navigator.onLine)
    ) {
      this.connection.close();
      this._waitForConnection();
      this._attemptConnect();
    }
  }

  static _send(data) {
    this.connection.send(JSON.stringify(data));
  }

  static isConnectionOpen() {
    return (
      this.connection && this.connection.readyState === this.WebSocket.OPEN
    );
  }

  static subscribeQuery(query, callbacks) {
    let isNewSubscription = false;
    if (!this.subscriptions.queries.hasOwnProperty(query)) {
      this.subscriptions.queries[query] = [];
      isNewSubscription = true;
    }
    let isCountSubscribed = isNewSubscription
      ? false
      : this._isCountSubscribedQuery(query);
    this.subscriptions.queries[query].push(callbacks);
    if (this.isConnectionOpen()) {
      if (isNewSubscription) {
        this._subscribeQuery(query, !!callbacks[2]);
      } else if (!isCountSubscribed && callbacks[2]) {
        this._unsubscribeQuery(query);
        this._subscribeQuery(query, true);
      }
    }
  }

  static subscribeUID(name, callbacks) {
    let isNewSubscription = false;
    if (!this.subscriptions.uids.hasOwnProperty(name)) {
      this.subscriptions.uids[name] = [];
      isNewSubscription = true;
    }
    let isCountSubscribed = isNewSubscription
      ? false
      : this._isCountSubscribedUID(name);
    this.subscriptions.uids[name].push(callbacks);
    if (this.isConnectionOpen()) {
      if (isNewSubscription) {
        this._subscribeUID(name, !!callbacks[2]);
      } else if (!isCountSubscribed && callbacks[2]) {
        this._unsubscribeUID(name);
        this._subscribeUID(name, true);
      }
    }
  }

  static _subscribeQuery(query, count) {
    this._send({
      action: 'subscribe',
      query: query,
      count: count,
    });
  }

  static _subscribeUID(name, count) {
    this._send({
      action: 'subscribe',
      uid: name,
      count: count,
    });
  }

  static _isCountSubscribedQuery(query) {
    if (!this.subscriptions.queries.hasOwnProperty(query)) {
      return false;
    }
    for (
      let callbacks = 0;
      callbacks < this.subscriptions.queries[query].length;
      callbacks++
    ) {
      if (this.subscriptions.queries[query][callbacks][2]) {
        return true;
      }
    }
    return false;
  }

  static _isCountSubscribedUID(name) {
    if (!this.subscriptions.uids.hasOwnProperty(name)) {
      return false;
    }
    for (
      let callbacks = 0;
      callbacks < this.subscriptions.uids[name].length;
      callbacks++
    ) {
      if (this.subscriptions.uids[name][callbacks][2]) {
        return true;
      }
    }
    return false;
  }

  static unsubscribeQuery(query, callbacks) {
    if (!this.subscriptions.queries.hasOwnProperty(query)) {
      return;
    }
    const idx = this.subscriptions.queries[query].indexOf(callbacks);
    if (idx === -1) {
      return;
    }
    this.subscriptions.queries[query].splice(idx, 1);
    if (!this.subscriptions.queries[query].length) {
      delete this.subscriptions.queries[query];
      if (this.isConnectionOpen()) {
        this._unsubscribeQuery(query);
      }
    }
  }

  static unsubscribeUID(name, callbacks) {
    if (!this.subscriptions.uids.hasOwnProperty(name)) {
      return;
    }
    const idx = this.subscriptions.uids[name].indexOf(callbacks);
    if (idx === -1) {
      return;
    }
    this.subscriptions.uids[name].splice(idx, 1);
    if (!this.subscriptions.uids[name].length) {
      delete this.subscriptions.uids[name];
      if (this.isConnectionOpen()) {
        this._unsubscribeUID(name);
      }
    }
  }

  static _unsubscribeQuery(query) {
    this._send({
      action: 'unsubscribe',
      query: query,
    });
  }

  static _unsubscribeUID(name) {
    this._send({
      action: 'unsubscribe',
      uid: name,
    });
  }

  static updateArray(oldArr, update) {
    if (Array.isArray(update)) {
      const newArr = [...update];

      if (oldArr.length === 0) {
        // This will happen on the first update from a subscribe.
        oldArr.splice(0, 0, ...newArr);
        return;
      }

      const idMap = {};
      for (let i = 0; i < newArr.length; i++) {
        if (
          newArr[i] instanceof Nymph.getEntityClass('Nymph\\Entity') &&
          newArr[i].guid
        ) {
          idMap[newArr[i].guid] = i;
        }
      }
      const remove = [];
      for (let k in oldArr) {
        if (
          // This handles sparse arrays.
          k <= 4294967294 &&
          /^0$|^[1-9]\d*$/.test(k) &&
          oldArr.hasOwnProperty(k)
        ) {
          k = Number(k);
          if (!idMap.hasOwnProperty(oldArr[k].guid)) {
            // It was deleted.
            remove.push(k);
          } else if (newArr[idMap[oldArr[k].guid]].mdate !== oldArr[k].mdate) {
            // It was modified.
            oldArr[k].$init(newArr[idMap[oldArr[k].guid]].toJSON());
            delete idMap[oldArr[k].guid];
          } else {
            // Item wasn't modified.
            delete idMap[oldArr[k].guid];
          }
        }
      }
      // Now we must remove the deleted ones.
      remove.sort(function (a, b) {
        // Sort backwards so we can remove in reverse order. (Preserves
        // indices.)
        if (a > b) return -1;
        if (a < b) return 1;
        return 0;
      });
      for (let n = 0; n < remove.length; n++) {
        oldArr.splice(remove[n], 1);
      }
      // And add the new ones.
      for (let [key, value] of Object.entries(idMap)) {
        oldArr.splice(oldArr.length, 0, newArr[value]);
      }
    } else if (update != null && update.hasOwnProperty('query')) {
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
            entity = oldArr.splice(i, 1)[0].$init(update.data);
          }
        }
      }

      const query = JSON.parse(update.query);
      if (entity != null) {
        // Insert the entity in order.
        const sort = query[0].hasOwnProperty('sort') ? query[0].sort : 'cdate';
        const reverse = query[0].hasOwnProperty('reverse')
          ? query[0].reverse
          : false;
        let i;

        if (reverse) {
          for (
            i = 0;
            (oldArr[i] || {})[sort] >= entity[sort] && i < oldArr.length;
            i++
          );
        } else {
          for (
            i = 0;
            (oldArr[i] || {})[sort] < entity[sort] && i < oldArr.length;
            i++
          );
        }

        oldArr.splice(i, 0, entity);
      }
    }
  }

  static on(event, callback) {
    if (!this.hasOwnProperty(event + 'Callbacks')) {
      return false;
    }
    this[event + 'Callbacks'].push(callback);
    return true;
  }

  static off(event, callback) {
    if (!this.hasOwnProperty(event + 'Callbacks')) {
      return false;
    }
    const i = this[event + 'Callbacks'].indexOf(callback);
    if (i > -1) {
      this[event + 'Callbacks'].splice(i, 1);
    }
    return true;
  }

  static setToken(token) {
    authToken = token;
    if (this.isConnectionOpen()) {
      this._send({
        action: 'authenticate',
        token: authToken,
      });
    }
  }
}

PubSub.connection = null;
PubSub.pubsubURL = null;
PubSub.WebSocket = null;
PubSub.subscriptions = {
  queries: {},
  uids: {},
};
PubSub.connectCallbacks = [];
PubSub.disconnectCallbacks = [];

export class PubSubSubscription {
  constructor(query, callbacks, unsubscribe) {
    this.query = query;
    this.callbacks = callbacks;
    this.unsubscribe = unsubscribe;
  }
}

if (typeof NymphOptions !== 'undefined' && NymphOptions.pubsubURL) {
  PubSub.init(NymphOptions);
}

export default PubSub;
