'use strict';

import { Nymph } from './Nymph';
import {
  uniqueStrings,
  getDataReference,
  getSleepingReference,
  sortObj,
} from './utils';

const sleepErr =
  'This entity is in a sleeping reference state. ' +
  'You must use .$ready() to wake it.';

export class Entity {
  constructor(id) {
    this.guid = null;
    this.cdate = null;
    this.mdate = null;
    this.tags = [];
    this.$originalTags = [];
    this.$dirty = {};
    this.$isASleepingReference = false;
    this.$sleepingReference = false;
    this.$readyPromise = null;
    this.$dataHandler = {
      has: (data, name) => {
        if (typeof name !== 'symbol' && this.$isASleepingReference) {
          console.error(`Tried to check data on a sleeping reference: ${name}`);
          return false;
        }
        return data.hasOwnProperty(name);
      },

      get: (data, name) => {
        if (typeof name !== 'symbol' && this.$isASleepingReference) {
          console.error(`Tried to get data on a sleeping reference: ${name}`);
          return undefined;
        }
        if (data.hasOwnProperty(name)) {
          return data[name];
        }
        return undefined;
      },

      set: (data, name, value) => {
        if (typeof name !== 'symbol' && this.$isASleepingReference) {
          console.error(`Tried to set data on a sleeping reference: ${name}`);
          return false;
        }
        if (typeof name !== 'symbol') {
          this.$dirty[name] = true;
        }
        data[name] = value;
        return true;
      },

      deleteProperty: (data, name) => {
        if (typeof name !== 'symbol' && this.$isASleepingReference) {
          console.error(
            `Tried to delete data on a sleeping reference: ${name}`
          );
          return false;
        }
        if (data.hasOwnProperty(name)) {
          this.$dirty[name] = true;
          return delete data[name];
        }
        return true;
      },
    };
    this.$data = new Proxy({}, this.$dataHandler);

    if (typeof id !== 'undefined' && !isNaN(parseInt(id, 10))) {
      this.guid = parseInt(id, 10);
      this.$isASleepingReference = true;
      this.$sleepingReference = [
        'nymph_entity_reference',
        this.guid,
        this.constructor.class,
      ];
      this.$ready();
    }

    return new Proxy(this, {
      has(entity, name) {
        if (
          typeof name !== 'string' ||
          name in entity ||
          name.substring(0, 1) === '$'
        ) {
          return name in entity;
        }
        return name in entity.$data;
      },

      get(entity, name) {
        if (
          typeof name !== 'string' ||
          name in entity ||
          name.substring(0, 1) === '$'
        ) {
          return entity[name];
        }
        if (name in entity.$data) {
          return entity.$data[name];
        }
        return undefined;
      },

      set(entity, name, value) {
        if (
          typeof name !== 'string' ||
          name in entity ||
          name.substring(0, 1) === '$'
        ) {
          entity[name] = value;
        } else {
          entity.$data[name] = value;
        }
        return true;
      },

      deleteProperty(entity, name) {
        if (name in entity) {
          return delete entity[name];
        } else if (name in entity.$data) {
          return delete entity.$data[name];
        }
        return true;
      },

      getPrototypeOf(entity) {
        return entity.constructor.prototype;
      },
    });
  }

  static serverCallStatic(method, params) {
    return Nymph.serverCallStatic(
      this.class,
      method,
      // Turn the params into a real array, in case an arguments object was
      // passed.
      Array.prototype.slice.call(params)
    ).then(data => data.return);
  }

  $init(entityData) {
    if (entityData == null) {
      return this;
    }

    this.$isASleepingReference = false;
    this.$sleepingReference = false;

    this.guid = entityData.guid;
    this.cdate = entityData.cdate;
    this.mdate = entityData.mdate;
    this.tags = entityData.tags;
    this.$originalTags = entityData.tags.slice(0);
    this.$dirty = {};
    this.$data = new Proxy(
      Object.entries(entityData.data)
        .map(([key, value]) => {
          this.$dirty[key] = false;
          return { key, value: getSleepingReference(value) };
        })
        .reduce(
          (obj, { key, value }) => Object.assign(obj, { [key]: value }),
          {}
        ),
      this.$dataHandler
    );

    return this;
  }

  // Tag methods.
  $addTag(...tags) {
    if (this.$isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    if (Array.isArray(tags[0])) {
      tags = tags[0];
    }
    this.tags = uniqueStrings(this.tags.concat(tags));
  }

  $hasTag(...tags) {
    if (this.$isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    if (Array.isArray(tags[0])) {
      tags = tags[0];
    }
    for (let i = 0; i < tags.length; i++) {
      if (this.tags.indexOf(tags[i]) === -1) {
        return false;
      }
    }
    return true;
  }

  $removeTag(...tags) {
    if (this.$isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    const newTags = [];
    if (Array.isArray(tags[0])) {
      tags = tags[0];
    }
    for (let i = 0; i < this.tags.length; i++) {
      if (tags.indexOf(this.tags[i]) === -1) {
        newTags.push(this.tags[i]);
      }
    }
    this.tags = newTags;
  }

  $save() {
    if (this.$isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    return Nymph.saveEntity(this);
  }

  $patch() {
    if (this.$isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    return Nymph.patchEntity(this);
  }

  $delete() {
    if (this.$isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    return Nymph.deleteEntity(this);
  }

  $is(object) {
    if (this.$isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    if (!(object instanceof Entity)) {
      return false;
    }
    if ((this.guid && this.guid > 0) || (object.guid && object.guid > 0)) {
      return this.guid === object.guid;
    } else if (typeof object.toJSON !== 'function') {
      return false;
    } else {
      const obData = sortObj(object.toJSON());
      obData.tags.sort();
      obData.data = sortObj(obData.data);
      const myData = sortObj(this.toJSON());
      myData.tags.sort();
      myData.data = sortObj(myData.data);
      return JSON.stringify(obData) === JSON.stringify(myData);
    }
  }

  $equals(object) {
    if (this.$isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    if (!(object instanceof Entity)) {
      return false;
    }
    if ((this.guid && this.guid > 0) || (object.guid && object.guid > 0)) {
      if (this.guid !== object.guid) {
        return false;
      }
    }
    if (object.constructor.class !== this.constructor.class) {
      return false;
    }
    // return eq(this, object, [], []);
    const obData = sortObj(object.toJSON());
    obData.tags.sort();
    obData.data = sortObj(obData.data);
    const myData = sortObj(this.toJSON());
    myData.tags.sort();
    myData.data = sortObj(myData.data);
    return JSON.stringify(obData) === JSON.stringify(myData);
  }

  $inArray(array, strict) {
    return this.$arraySearch(array, strict) !== false;
  }

  $arraySearch(array, strict) {
    if (this.$isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    if (!Array.isArray(array)) {
      return false;
    }
    for (let i = 0; i < array.length; i++) {
      if (strict ? this.$equals(array[i]) : this.$is(array[i])) {
        return i;
      }
    }
    return false;
  }

  $refresh() {
    if (this.$isASleepingReference) {
      return this.$ready();
    }
    if (this.guid == null) {
      return Promise.resolve(this);
    }
    return Nymph.getEntityData(
      {
        class: this.constructor.class,
      },
      {
        type: '&',
        guid: this.guid,
      }
    ).then(data => this.$init(data));
  }

  // Stateless means the server will not return the data in the entity after
  // calling the method.
  $serverCall(method, params, stateless) {
    if (this.$isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    // Turn the params into a real array, in case an arguments object was
    // passed.
    const paramArray = Array.prototype.slice.call(params);
    return Nymph.serverCall(this, method, paramArray, stateless).then(data => {
      if (!stateless) {
        this.$init(data.entity);
      }
      return data.return;
    });
  }

  toJSON() {
    if (this.$isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    const obj = {};
    obj.guid = this.guid;
    obj.cdate = this.cdate;
    obj.mdate = this.mdate;
    obj.tags = this.tags.slice(0);
    obj.data = {};
    for (let [key, value] of Object.entries(this.$data)) {
      obj.data[key] = getDataReference(value);
    }
    obj.class = this.constructor.class;
    return obj;
  }

  $getPatch() {
    if (this.$isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    const patch = {
      guid: this.guid,
      mdate: this.mdate,
      class: this.constructor.class,
      addTags: this.tags.filter(tag => this.$originalTags.indexOf(tag) === -1),
      removeTags: this.$originalTags.filter(
        tag => this.tags.indexOf(tag) === -1
      ),
      unset: [],
      set: {},
    };

    for (let [key, dirty] of Object.entries(this.$dirty)) {
      if (dirty) {
        if (key in this.$data) {
          patch.set[key] = getDataReference(this.$data[key]);
        } else {
          patch.unset.push(key);
        }
      }
    }

    return patch;
  }

  $toReference() {
    if (this.$isASleepingReference) {
      return this.$sleepingReference;
    }
    if (this.guid == null) {
      return this;
    }
    return ['nymph_entity_reference', this.guid, this.constructor.class];
  }

  $referenceSleep(reference) {
    this.$isASleepingReference = true;
    this.guid = parseInt(reference[1], 10);
    this.$sleepingReference = [...reference];
  }

  $ready() {
    if (!this.$isASleepingReference) {
      this.$readyPromise = null;
      return Promise.resolve(this);
    }
    if (!this.$readyPromise) {
      this.$readyPromise = Nymph.getEntityData(
        { class: this.$sleepingReference[2] },
        { type: '&', guid: this.$sleepingReference[1] }
      )
        .then(data => {
          if (data == null) {
            const errObj = { data, textStatus: 'No data returned.' };
            return Promise.reject(errObj);
          }
          return this.$init(data);
        })
        .finally(() => {
          this.$readyPromise = null;
        });
    }
    return this.$readyPromise;
  }

  $readyAll(level) {
    return new Promise((resolve, reject) => {
      // Run this once this entity is ready.
      const readyProps = () => {
        let newLevel;
        // If level is undefined, keep going forever, otherwise, stop once we've
        // gone deep enough.
        if (level !== undefined) {
          newLevel = level - 1;
        }
        if (newLevel !== undefined && newLevel < 0) {
          resolve(this);
          return;
        }
        const promises = [];
        // Go through data looking for entities to ready.
        for (let [key, value] of Object.entries(this.$data)) {
          if (value instanceof Entity && value.$isASleepingReference) {
            promises.push(value.$readyAll(newLevel));
          } else if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
              if (
                value[i] instanceof Entity &&
                value[i].$isASleepingReference
              ) {
                promises.push(value[i].$readyAll(newLevel));
              }
            }
          }
        }
        if (promises.length) {
          Promise.all(promises).then(
            () => resolve(this),
            errObj => reject(errObj)
          );
        } else {
          resolve(this);
        }
      };

      if (this.$isASleepingReference) {
        this.$ready().then(readyProps, errObj => reject(errObj));
      } else {
        readyProps();
      }
    });
  }
}

// The name of the server class (Shouldn't start with a \)
Entity.class = 'Nymph\\Entity';

export class EntityIsSleepingReferenceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EntityIsSleepingReferenceError';
  }
}

Nymph.setEntityClass(Entity.class, Entity);
export default Entity;
