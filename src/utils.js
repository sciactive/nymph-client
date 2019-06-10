'use strict';

import { Nymph, ClassNotAvailableError } from './Nymph';

export function uniqueStrings(array) {
  const obj = {};
  for (let i = 0; i < array.length; ++i) {
    if (typeof array[i] === 'string') {
      obj[array[i]] = true;
    } else if (typeof array[i].toString === 'function') {
      obj[array[i].toString()] = true;
    }
  }
  return Object.keys(obj);
}

export function getDataReference(item) {
  if (
    item instanceof Nymph.getEntityClass('Nymph\\Entity') &&
    typeof item.$toReference === 'function'
  ) {
    // Convert entities to references.
    return item.$toReference();
  } else if (Array.isArray(item)) {
    // Recurse into lower arrays.
    return item.map(getDataReference);
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
    return newObj;
  }
  // Not an entity or array, just return it.
  return item;
}

export function getSleepingReference(item) {
  if (Array.isArray(item)) {
    // Check if it's a reference.
    if (item[0] === 'nymph_entity_reference') {
      const EntityClass = Nymph.getEntityClass(item[2]);
      if (!EntityClass) {
        throw new ClassNotAvailableError(item[2] + ' class cannot be found.');
      }
      const entity = new EntityClass();
      entity.$referenceSleep(item);
      return entity;
    } else {
      // Recurse into lower arrays.
      return item.map(getSleepingReference);
    }
  } else if (
    item instanceof Object &&
    !(item instanceof Nymph.getEntityClass('Nymph\\Entity'))
  ) {
    for (let k in item) {
      if (item.hasOwnProperty(k)) {
        item[k] = getSleepingReference(item[k]);
      }
    }
  }
  // Not an array, just return it.
  return item;
}

export function sortObj(obj) {
  // adapted from
  // http://am.aurlien.net/post/1221493460/sorting-javascript-objects
  const tempArray = [];
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      tempArray.push(key);
    }
  }
  tempArray.sort();
  const tempObj = {};
  for (let i = 0; i < tempArray.length; i++) {
    tempObj[tempArray[i]] = obj[tempArray[i]];
  }
  return tempObj;
}
