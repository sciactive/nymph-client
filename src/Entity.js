/*
Nymph Entity 1.6.0 nymph.io
(C) 2014-2017 Hunter Perrin
license Apache-2.0
*/
/* global Promise */
'use strict';

import {Nymph, NymphClassNotAvailableError} from "Nymph";

const sleepErr = "This entity is in a sleeping reference state. You must use .ready().then() to wake it.";

const isArray = (Array.isArray || function(arr) {
  return Object.prototype.toString.call(arr) === '[object Array]';
});

const indexOf = function(array, item) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      return i;
    }
  }
  return -1;
};

const map = function(arr, fn) {
  const results = [];
  for (let i = 0; i < arr.length; i++) {
    results.push(fn(arr[i], i));
  }
  return results;
};

const arrayUnique = function(array) {
  let a = array.concat();
  for (let i = 0; i < a.length; ++i) {
    for (let j = i+1; j < a.length; ++j) {
      if (a[i] === a[j]) {
        a.splice(j--, 1);
      }
    }
  }
  return a;
};

const onlyStrings = function(array) {
  const newArray = [];
  for (let i = 0; i < array.length; i++) {
    if (typeof array[i] === "string") {
      newArray.push(array[i]);
    } else {
      if (typeof array[i].toString === "function") {
        newArray.push(array[i].toString());
      }
    }
  }
  return newArray;
};

const getDataReference = function(item) {
  if (item instanceof Entity && typeof item.toReference === "function") {
    // Convert entities to references.
    return item.toReference();
  } else if (isArray(item)) {
    // Recurse into lower arrays.
    return map(item, getDataReference);
  } else if (item instanceof Object) {
    let newObj;
    if (Object.create) {
      newObj = Object.create(item);
    } else {
      const F = function() {};
      F.prototype = item;
      newObj = new F();
    }
    for (let k in item) {
      if (item.hasOwnProperty(k)) {
        newObj[k] = getDataReference(item[k]);
      }
    }
  }
  // Not an entity or array, just return it.
  return item;
};

const getSleepingReference = function(item) {
  if (isArray(item)) {
    // Check if it's a reference.
    if (item[0] === 'nymph_entity_reference') {
      const entityClass = Nymph.getEntityClass(item[2]);
      if (!entityClass) {
        throw new NymphClassNotAvailableError(item[2]+" class cannot be found.");
      }
      const entity = new (entityClass)();
      entity.referenceSleep(item);
      return entity;
    } else {
      // Recurse into lower arrays.
      return map(item, getSleepingReference);
    }
  } else if (item instanceof Object) {
    for (let k in item) {
      if (item.hasOwnProperty(k)) {
        item[k] = getSleepingReference(item[k]);
      }
    }
  }
  // Not an array, just return it.
  return item;
};

const sortObj = function(obj) { // adapted from http://am.aurlien.net/post/1221493460/sorting-javascript-objects
  const temp_array = [];
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      temp_array.push(key);
    }
  }
  temp_array.sort();
  const temp_obj = {};
  for (let i = 0; i < temp_array.length; i++) {
    temp_obj[temp_array[i]] = obj[temp_array[i]];
  }
  return temp_obj;
};

class Entity {

  // === Constructor ===

  constructor(id) {

    // === Instance Properties ===

    this.guid = null;
    this.cdate = null;
    this.mdate = null;
    this.tags = [];
    this.info = {};
    this.data = {};
    this.isASleepingReference = false;
    this.sleepingReference = false;
    this.readyPromise = null;

    if (typeof id !== "undefined" && !isNaN(Number(id))) {
      this.guid = Number(id);
      this.isASleepingReference = true;
      this.sleepingReference = ['nymph_entity_reference', this.guid, this.constructor.class];
      this.ready();
    }
  }

  // === Static Methods ===

  static serverCallStatic(method, params) {
    // Turn the params into a real array, in case an arguments object was passed.
    const paramArray = Array.prototype.slice.call(params);
    return new Promise((resolve, reject) => {
      Nymph.serverCallStatic(this.class, method, paramArray).then((data) => {
        resolve(data.return);
      }, (errObj) => {
        reject(errObj);
      });
    });
  }

  // === Instance Methods ===

  init(jsonEntity) {
    if (typeof jsonEntity === "undefined" || jsonEntity === null) {
      return this;
    }

    this.isASleepingReference = false;
    this.sleepingReference = false;

    this.guid = jsonEntity.guid;
    this.cdate = jsonEntity.cdate;
    this.mdate = jsonEntity.mdate;
    this.tags = jsonEntity.tags;
    this.info = jsonEntity.info;
    this.data = jsonEntity.data;
    for (let k in this.data) {
      if (this.data.hasOwnProperty(k)) {
        this.data[k] = getSleepingReference(this.data[k]);
      }
    }

    return this;
  }

  // Tag methods.
  addTag(...tags) {
    if (this.isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    if (isArray(tags[0])) {
      tags = tags[0];
    }
    this.tags = onlyStrings(arrayUnique(this.tags.concat(tags)));
  }

  hasTag(...tags) {
    if (this.isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    if (isArray(tags[0])) {
      tags = tags[0];
    }
    for (let i = 0; i < tags.length; i++) {
      if (indexOf(this.tags, tags[i]) === -1) {
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
    if (isArray(tags[0])) {
      tags = tags[0];
    }
    for (let i = 0; i < this.tags.length; i++) {
      if (indexOf(tags, this.tags[i]) === -1) {
        newTags.push(this.tags[i]);
      }
    }
    this.tags = newTags;
  }

  // Property getter and setter. You can also just access Entity.data directly.
  get(name) {
    if (this.isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    if (isArray(name)) {
      const result = {};
      for (let i = 0; i < name.length; i++) {
        result[name[i]] = this.data[name[i]];
      }
      return result;
    } else {
      return this.data[name];
    }
  }

  set(name, value = null) {
    if (this.isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    if (typeof name === "object") {
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
    //return eq(this, object, [], []);
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
    if (!isArray(array)) {
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
    if (!isArray(array)) {
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
    if (this.guid === null) {
      return new Promise((resolve) => {
        resolve(this);
      });
    }
    return new Promise((resolve, reject) => {
      Nymph.getEntityData({"class": this.constructor.class} , {"type": "&", "guid": this.guid}).then((data) => {
        resolve(this.init(data));
      }, (errObj) => {
        reject(errObj);
      });
    });
  }

  serverCall(method, params, dontUpdateAfterCall) {
    if (this.isASleepingReference) {
      throw new EntityIsSleepingReferenceError(sleepErr);
    }
    // Turn the params into a real array, in case an arguments object was passed.
    const paramArray = Array.prototype.slice.call(params);
    return new Promise((resolve, reject) => {
      Nymph.serverCall(this, method, paramArray).then((data) => {
        if (!dontUpdateAfterCall) {
          this.init(data.entity);
        }
        resolve(data.return);
      }, (errObj) => {
        reject(errObj);
      });
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
    if (this.guid === null) {
      return this;
    }
    return ['nymph_entity_reference', this.guid, this.constructor.class];
  }

  referenceSleep(reference) {
    this.isASleepingReference = true;
    this.sleepingReference = reference;
  }

  ready(success, error) {
    this.readyPromise = new Promise((resolve, reject) => {
      if (!this.isASleepingReference) {
        this.readyPromise = null;
        resolve(this);
        if (typeof success === "function") {
          success(this);
        }
      } else {
        if (this.readyPromise) {
          this.readyPromise.then(() =>{
            resolve(this);
            if (typeof success === "function") {
              success(this);
            }
          }, (errObj) => {
            reject(errObj);
            if (typeof error === "function") {
              error(errObj);
            }
          });
        } else {
          Nymph.getEntityData({"class": this.sleepingReference[2]}, {"type": "&", "guid": this.sleepingReference[1]}).then((data) => {
            this.readyPromise = null;
            resolve(this.init(data));
            if (typeof success === "function") {
              success(this);
            }
          }, (errObj) => {
            this.readyPromise = null;
            reject(errObj);
            if (typeof error === "function") {
              error(errObj);
            }
          });
        }
      }
    });
    return this.readyPromise;
  }

  readyAll(success, error) {
    return new Promise((resolve, reject) => {
      this.ready(() => {
        const promises = [];
        for (let k in this.data) {
          if (this.data.hasOwnProperty(k)) {
            if (this.data[k] instanceof Entity) {
              promises.push(this.data[k].readyAll());
            } else if (isArray(this.data[k])) {
              for (let i = 0; i < this.data[k].length; i++) {
                if (this.data[k][i] instanceof Entity) {
                  promises.push(this.data[k][i].readyAll());
                }
              }
            }
          }
        }
        Promise.all(promises).then(() => {
          resolve(this);
          if (typeof success === "function") {
            success(this);
          }
        }, (errObj) => {
          reject(errObj);
          if (typeof error === "function") {
            error(errObj);
          }
        });
      }, (errObj) => {
        reject(errObj);
        if (typeof error === "function") {
          error(errObj);
        }
      });
    });
  }
}

// === Static Properties ===

Entity.etype = "entity";
// The name of the server class
Entity.class = "Entity";

Nymph.setEntityClass(Entity.class, Entity);

class EntityIsSleepingReferenceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EntityIsSleepingReferenceError';
    this.message = message;
    this.stack = (new Error()).stack;
  }
}

export {Entity, EntityIsSleepingReferenceError};
export default Entity;
