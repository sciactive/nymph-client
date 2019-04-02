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
  'You must use .ready().then() to wake it.';

export class Entity {
  constructor(id) {
    this.guid = null;
    this.cdate = null;
    this.mdate = null;
    this.tags = [];
    this.data = {};
    this.isASleepingReference = false;
    this.sleepingReference = false;
    this.readyPromise = null;

    if (typeof id !== 'undefined' && !isNaN(parseInt(id, 10))) {
      this.guid = parseInt(id, 10);
      this.isASleepingReference = true;
      this.sleepingReference = [
        'nymph_entity_reference',
        this.guid,
        this.constructor.class,
      ];
      this.ready();
    }
  }

  static serverCallStatic(method, params) {
    // Turn the params into a real array, in case an arguments object was
    // passed.
    const paramArray = Array.prototype.slice.call(params);
    return Nymph.serverCallStatic(this.class, method, paramArray).then(
      data => data.return
    );
  }

  init(entityData) {
    if (entityData == null) {
      return this;
    }

    this.isASleepingReference = false;
    this.sleepingReference = false;

    this.guid = entityData.guid;
    this.cdate = entityData.cdate;
    this.mdate = entityData.mdate;
    this.tags = entityData.tags;
    this.data = entityData.data;
    if (!(entityData instanceof Entity)) {
      for (let k in this.data) {
        if (this.data.hasOwnProperty(k)) {
          this.data[k] = getSleepingReference(this.data[k]);
        }
      }
    }

    return this;
  }

  // Tag methods.
  addTag(...tags) {
    if (this.isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    if (Array.isArray(tags[0])) {
      tags = tags[0];
    }
    this.tags = uniqueStrings(this.tags.concat(tags));
  }

  hasTag(...tags) {
    if (this.isASleepingReference) {
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

  removeTag(...tags) {
    if (this.isASleepingReference) {
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

  // Property getter and setter. You can also just access Entity.data directly.
  get(name = null) {
    if (this.isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    if (Array.isArray(name)) {
      const result = {};
      for (let i = 0; i < name.length; i++) {
        result[name[i]] = this.data[name[i]];
      }
      return result;
    } else if (name == null) {
      return this.data;
    } else {
      return this.data[name];
    }
  }

  set(name, value = null) {
    if (this.isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    if (typeof name === 'object') {
      for (let k in name) {
        if (name.hasOwnProperty(k)) {
          this.data[k] = name[k];
        }
      }
    } else {
      this.data[name] = value;
    }
  }

  save() {
    if (this.isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    return Nymph.saveEntity(this);
  }

  delete() {
    if (this.isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    return Nymph.deleteEntity(this);
  }

  is(object) {
    if (this.isASleepingReference) {
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

  equals(object) {
    if (this.isASleepingReference) {
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

  inArray(array, strict) {
    if (this.isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    if (!Array.isArray(array)) {
      return false;
    }
    for (let i = 0; i < array.length; i++) {
      if (strict ? this.equals(array[i]) : this.is(array[i])) {
        return true;
      }
    }
    return false;
  }

  arraySearch(array, strict) {
    if (this.isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    if (!Array.isArray(array)) {
      return false;
    }
    for (let i = 0; i < array.length; i++) {
      if (strict ? this.equals(array[i]) : this.is(array[i])) {
        return i;
      }
    }
    return false;
  }

  refresh() {
    if (this.isASleepingReference) {
      return this.ready();
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
    ).then(data => this.init(data));
  }

  serverCall(method, params, dontUpdateAfterCall) {
    if (this.isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    // Turn the params into a real array, in case an arguments object was
    // passed.
    const paramArray = Array.prototype.slice.call(params);
    return Nymph.serverCall(this, method, paramArray).then(data => {
      if (!dontUpdateAfterCall) {
        this.init(data.entity);
      }
      return data.return;
    });
  }

  toJSON() {
    if (this.isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    const obj = {};
    obj.guid = this.guid;
    obj.cdate = this.cdate;
    obj.mdate = this.mdate;
    obj.tags = this.tags.slice(0);
    obj.data = {};
    for (let k in this.data) {
      if (this.data.hasOwnProperty(k)) {
        obj.data[k] = getDataReference(this.data[k]);
      }
    }
    obj.class = this.constructor.class;
    return obj;
  }

  toReference() {
    if (this.isASleepingReference) {
      return this.sleepingReference;
    }
    if (this.guid == null) {
      return this;
    }
    return ['nymph_entity_reference', this.guid, this.constructor.class];
  }

  referenceSleep(reference) {
    this.isASleepingReference = true;
    this.guid = parseInt(reference[1], 10);
    this.sleepingReference = [...reference];
  }

  ready() {
    if (!this.isASleepingReference) {
      this.readyPromise = null;
      return Promise.resolve(this);
    }
    if (!this.readyPromise) {
      this.readyPromise = Nymph.getEntityData(
        { class: this.sleepingReference[2] },
        { type: '&', guid: this.sleepingReference[1] }
      )
        .then(data => {
          if (data == null) {
            const errObj = { data, textStatus: 'No data returned.' };
            return Promise.reject(errObj);
          }
          return this.init(data);
        })
        .finally(() => {
          this.readyPromise = null;
        });
    }
    return this.readyPromise;
  }

  readyAll(level) {
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
        for (let k in this.data) {
          if (!this.data.hasOwnProperty(k)) {
            continue;
          }
          if (
            this.data[k] instanceof Entity &&
            this.data[k].isASleepingReference
          ) {
            promises.push(this.data[k].readyAll(newLevel));
          } else if (Array.isArray(this.data[k])) {
            for (let i = 0; i < this.data[k].length; i++) {
              if (
                this.data[k][i] instanceof Entity &&
                this.data[k][i].isASleepingReference
              ) {
                promises.push(this.data[k][i].readyAll(newLevel));
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

      if (this.isASleepingReference) {
        this.ready().then(readyProps, errObj => reject(errObj));
      } else {
        readyProps();
      }
    });
  }
}

// The name of the server class (Shouldn't start with a \)
Entity.class = 'Nymph\\Entity';

Nymph.setEntityClass(Entity.class, Entity);

export class EntityIsSleepingReferenceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EntityIsSleepingReferenceError';
  }
}

export default Entity;
