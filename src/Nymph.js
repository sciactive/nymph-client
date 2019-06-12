'use strict';

import { EntitySorter } from './EntitySorter';
import { HttpRequester } from './HttpRequester';
import { getDataReference } from './utils';

const requester = new HttpRequester();

export class Nymph {
  static setEntityClass(className, entityClass) {
    Nymph.entityClasses[className] = entityClass;
  }

  static getEntityClass(className) {
    if (Nymph.entityClasses.hasOwnProperty(className)) {
      return Nymph.entityClasses[className];
    }
    return null;
  }

  static init(NymphOptions) {
    this.restURL = NymphOptions.restURL;
  }

  static newUID(name) {
    return requester
      .POST({
        url: this.restURL,
        dataType: 'text',
        data: { action: 'uid', data: name },
      })
      .then(data => Number(data));
  }

  static setUID(name, value) {
    return requester.PUT({
      url: this.restURL,
      dataType: 'json',
      data: {
        action: 'uid',
        data: JSON.stringify({ name: name, value: value }),
      },
    });
  }

  static getUID(name) {
    return requester
      .GET({
        url: this.restURL,
        dataType: 'text',
        data: { action: 'uid', data: name },
      })
      .then(data => Number(data));
  }

  static deleteUID(name) {
    return requester.DELETE({
      type: 'DELETE',
      url: this.restURL,
      data: { action: 'uid', data: name },
    });
  }

  static saveEntity(entity, _plural) {
    let method;
    if (_plural) {
      entity.forEach(cur => {
        if (!method) {
          method = cur.guid == null ? 'POST' : 'PUT';
        } else if (
          (method === 'POST' && cur.guid != null) ||
          (method === 'PUT' && cur.guid == null)
        ) {
          throw new InvalidRequestError(
            'Due to REST restriction, you can only create new entities or ' +
              'update existing entities, not both at the same time.'
          );
        }
      });
      if (!method) {
        method = 'POST';
      }
    } else {
      method = entity.guid == null ? 'POST' : 'PUT';
    }
    return this._requestWithMethod(entity, method, entity, _plural);
  }

  static saveEntities(entities) {
    return this.saveEntity(entities, true);
  }

  static patchEntity(entity, _plural) {
    let patch;

    if (_plural) {
      entity.forEach(cur => {
        if (cur.guid == null) {
          throw new InvalidRequestError(
            'Due to REST restriction, you can only create new entities or ' +
              'update existing entities, not both at the same time.'
          );
        }
      });
      patch = entity.map(e => e.$getPatch());
    } else {
      patch = entity.$getPatch();
    }

    return this._requestWithMethod(entity, 'PATCH', patch, _plural);
  }

  static patchEntities(entities) {
    return this.patchEntity(entities, true);
  }

  static _requestWithMethod(entity, method, data, plural) {
    return requester[method]({
      url: this.restURL,
      dataType: 'json',
      data: {
        action: plural ? 'entities' : 'entity',
        data: JSON.stringify(data),
      },
    }).then(response => {
      if (plural && entity.length === response.length) {
        return entity.map((e, i) =>
          response[i] &&
          typeof response[i].guid !== 'undefined' &&
          response[i].guid > 0 &&
          (e.guid == null || e.guid === response[i].guid)
            ? e.$init(response[i])
            : e
        );
      } else if (typeof response.guid !== 'undefined' && response.guid > 0) {
        return entity.$init(response);
      } else {
        return Promise.reject({ textStatus: 'Server error' });
      }
    });
  }

  static getEntity(options, ...selectors) {
    return this.getEntityData(options, ...selectors).then(data => {
      if (data != null) {
        if (options.return && options.return === 'guid') {
          return data;
        } else {
          return this.initEntity(data);
        }
      }

      return null;
    });
  }

  static getEntityData(options, ...selectors) {
    return requester
      .GET({
        url: this.restURL,
        dataType: 'json',
        data: {
          action: 'entity',
          data: JSON.stringify([options, ...selectors]),
        },
      })
      .then(data => {
        if (typeof data.guid !== 'undefined' && data.guid > 0) {
          return data;
        }
        return null;
      });
  }

  static getEntities(options, ...selectors) {
    return requester
      .GET({
        url: this.restURL,
        dataType: 'json',
        data: {
          action: 'entities',
          data: JSON.stringify([options, ...selectors]),
        },
      })
      .then(data => {
        if (options.return && options.return === 'guid') {
          return data;
        }
        return data.map(e => this.initEntity(e));
      });
  }

  static initEntity(entityJSON) {
    const EntityClass = Nymph.getEntityClass(entityJSON.class);
    if (!EntityClass) {
      throw new ClassNotAvailableError(
        entityJSON.class + ' class cannot be found.'
      );
    }
    const entity = new EntityClass();
    return entity.$init(entityJSON);
  }

  static initEntitiesFromData(item) {
    if (Array.isArray(item)) {
      // Recurse into lower arrays.
      return item.map(this.initEntitiesFromData.bind(this));
    } else if (
      item instanceof Object &&
      !(item instanceof this.getEntityClass('Nymph\\Entity'))
    ) {
      if (
        item.hasOwnProperty('class') &&
        item.hasOwnProperty('guid') &&
        item.hasOwnProperty('cdate') &&
        item.hasOwnProperty('mdate') &&
        item.hasOwnProperty('tags') &&
        item.hasOwnProperty('data') &&
        Nymph.getEntityClass(item.class)
      ) {
        return this.initEntity(item);
      } else {
        for (let [key, value] of Object.entries(item)) {
          item[key] = this.initEntitiesFromData(value);
        }
      }
    }
    // Not an entity or array, just return it.
    return item;
  }

  static deleteEntity(entity, _plural) {
    return requester.DELETE({
      url: this.restURL,
      dataType: 'json',
      data: {
        action: _plural ? 'entities' : 'entity',
        data: JSON.stringify(entity),
      },
    });
  }

  static deleteEntities(entities) {
    return this.deleteEntity(entities, true);
  }

  static serverCall(entity, method, params, stateless = false) {
    return requester
      .POST({
        url: this.restURL,
        dataType: 'json',
        data: {
          action: 'method',
          data: JSON.stringify({
            entity,
            stateless,
            method,
            params: getDataReference(params),
          }),
        },
      })
      .then(data => ({
        ...data,
        return: this.initEntitiesFromData(data.return),
      }));
  }

  static serverCallStatic(className, method, params) {
    return requester
      .POST({
        url: this.restURL,
        dataType: 'json',
        data: {
          action: 'method',
          data: JSON.stringify({
            class: className,
            static: true,
            method: method,
            params: getDataReference(params),
          }),
        },
      })
      .then(data => this.initEntitiesFromData(data));
  }

  static hsort(array, property, parentProperty, caseSensitive, reverse) {
    const sorter = new EntitySorter(array);
    return sorter.hsort(property, parentProperty, caseSensitive, reverse);
  }

  static psort(array, property, parentProperty, caseSensitive, reverse) {
    const sorter = new EntitySorter(array);
    return sorter.psort(property, parentProperty, caseSensitive, reverse);
  }

  static sort(array, property, caseSensitive, reverse) {
    const sorter = new EntitySorter(array);
    return sorter.sort(property, caseSensitive, reverse);
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

  static setXsrfToken(token) {
    requester.setXsrfToken(token);
  }
}

Nymph.entityClasses = {};
Nymph.responseCallbacks = [];

export class ClassNotAvailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClassNotAvailableError';
  }
}

export class InvalidRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidRequestError';
  }
}

// Initialization

requester.on('response', data => {
  for (let i = 0; i < Nymph.responseCallbacks.length; i++) {
    if (typeof Nymph.responseCallbacks[i] !== 'undefined') {
      Nymph.responseCallbacks[i](Nymph);
    }
  }
});

if (typeof NymphOptions !== 'undefined') {
  Nymph.init(NymphOptions);
}

export default Nymph;
