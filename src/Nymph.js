/*
Nymph 1.6.0 nymph.io
(C) 2014-2017 Hunter Perrin
license Apache-2.0
*/
/* global Promise */
/* global NymphOptions */
'use strict';

let sortProperty = null;
let sortParent = null;
let sortCaseSensitive = null;

const arraySortProperty = function(a, b) {
  let aprop, bprop,
    property = sortProperty,
    parent = sortParent,
    notData = property === "guid" || property === "cdate" || property === "mdate";
  if (parent !== null && ((a.data[parent] instanceof Nymph.getEntityClass("Entity") && typeof (notData ? a.data[parent][property] : a.data[parent].data[property]) !== "undefined") || (b.data[parent] instanceof Nymph.getEntityClass("Entity") && typeof (notData ? b.data[parent][property] : b.data[parent].data[property]) !== "undefined"))) {
    if (!sortCaseSensitive && typeof (notData ? a.data[parent][property] : a.data[parent].data[property]) === "string" && typeof (notData ? b.data[parent][property] : b.data[parent].data[property]) === "string") {
      aprop = (notData ? a.data[parent][property] : a.data[parent].data[property]).toUpperCase();
      bprop = (notData ? b.data[parent][property] : b.data[parent].data[property]).toUpperCase();
      if (aprop !== bprop) {
        return aprop.localeCompare(bprop);
      }
    } else {
      if ((notData ? a.data[parent][property] : a.data[parent].data[property]) > (notData ? b.data[parent][property] : b.data[parent].data[property])) {
        return 1;
      }
      if ((notData ? a.data[parent][property] : a.data[parent].data[property]) < (notData ? b.data[parent][property] : b.data[parent].data[property])) {
        return -1;
      }
    }
  }
  // If they have the same parent, order them by their own property.
  if (!sortCaseSensitive && typeof (notData ? a[property] : a.data[property]) === "string" && typeof (notData ? b[property] : b.data[property]) === "string") {
    aprop = (notData ? a[property] : a.data[property]).toUpperCase();
    bprop = (notData ? b[property] : b.data[property]).toUpperCase();
    return aprop.localeCompare(bprop);
  } else {
    if ((notData ? a[property] : a.data[property]) > (notData ? b[property] : b.data[property])) {
      return 1;
    }
    if ((notData ? a[property] : a.data[property]) < (notData ? b[property] : b.data[property])) {
      return -1;
    }
  }
  return 0;
};

const map = function(arr, fn) {
  const results = [];
  for (let i = 0; i < arr.length; i++) {
    results.push(fn(arr[i], i));
  }
  return results;
};

const makeUrl = function(url, data, noSep) {
  if (!data) {
    return url;
  }
  for (let k in data) {
    if (data.hasOwnProperty(k)) {
      if (noSep) {
        url = url+(url.length ? '&' : '');
      } else {
        url = url+(url.indexOf('?') !== -1 ? '&' : '?');
      }
      url = url+encodeURIComponent(k)+'='+encodeURIComponent(data[k]);
    }
  }
  return url;
};

const onReadyStateChange = function(opt) {
  return function() {
    if (this.readyState === 4) {
      if (this.status >= 200 && this.status < 400) {
        if (opt.dataType === "json") {
          opt.success(JSON.parse(this.responseText));
        } else {
          opt.success(this.responseText);
        }
      } else {
        let errObj;
        try {
          errObj = JSON.parse(this.responseText);
        } catch (e) {
          if (!(e instanceof SyntaxError)) {
            throw e;
          }
        }
        if (typeof errObj !== "object") {
          errObj = {
            textStatus: this.responseText
          };
        }
        errObj.status = this.status;
        opt.error(errObj);
      }
    }
  };
};

const getAjax = function(opt) {
  let request = new XMLHttpRequest();
  request.open('GET', makeUrl(opt.url, opt.data), true);

  request.onreadystatechange = onReadyStateChange(opt);

  request.send();
  request = null;
};

const postputdelAjax = function(opt) {
  let request = new XMLHttpRequest();
  request.open(opt.type, opt.url, true);

  request.onreadystatechange = onReadyStateChange(opt);

  request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
  request.send(makeUrl('', opt.data, true));
  request = null;
};

class Nymph {

  // === Constructor ===

  constructor() {

    // === Instance Properties ===

    this.restURL = null;
  }

  // === Static Methods ===

  static setEntityClass(className, entityClass) {
    Nymph.entityClasses[className] = entityClass;
  }

  static getEntityClass(className) {
    if (Nymph.entityClasses.hasOwnProperty(className)) {
      return Nymph.entityClasses[className];
    }
    if (window !== undefined && window[className] !== undefined) {
      return window[className];
    }
    if (typeof define === 'function' && define.amd) {
      return require('Nymph'+className);
    }
    if (typeof require === "function") {
      return require(className);
    }
    return null;
  }

  // === Instance Methods ===

  init(NymphOptions) {
    this.restURL = NymphOptions.restURL;
    return this;
  }

  setEntityClass(className, entityClass) {
    Nymph.setEntityClass(className, entityClass);
  }

  getEntityClass(className) {
    return Nymph.getEntityClass(className);
  }

  newUID(name) {
    return new Promise((resolve, reject) => {
      postputdelAjax({
        type: 'POST',
        url: this.restURL,
        dataType: 'text',
        data: {'action': 'uid', 'data': name},
        success: (data) => {
          resolve(Number(data));
        },
        error: (errObj) => {
          reject(errObj);
        }
      });
    });
  }

  setUID(name, value) {
    return new Promise((resolve, reject) => {
      postputdelAjax({
        type: 'PUT',
        url: this.restURL,
        dataType: 'json',
        data: {'action': 'uid', 'data': JSON.stringify({"name": name, "value": value})},
        success: (data) => {
          resolve(data);
        },
        error: (errObj) => {
          reject(errObj);
        }
      });
    });
  }

  getUID(name) {
    return new Promise((resolve, reject) => {
      getAjax({
        url: this.restURL,
        dataType: 'text',
        data: {'action': 'uid', 'data': name},
        success: (data) => {
          resolve(Number(data));
        },
        error: (errObj) => {
          reject(errObj);
        }
      });
    });
  }

  deleteUID(name) {
    return new Promise((resolve, reject) => {
      postputdelAjax({
        type: 'DELETE',
        url: this.restURL,
        data: {'action': 'uid', 'data': name},
        success: (data) => {
          resolve(data);
        },
        error: (errObj) => {
          reject(errObj);
        }
      });
    });
  }

  saveEntity(entity) {
    return new Promise((resolve, reject) => {
      postputdelAjax({
        type: entity.guid === null ? 'POST' : 'PUT',
        url: this.restURL,
        dataType: 'json',
        data: {'action': 'entity', 'data': JSON.stringify(entity)},
        success: (data) => {
          if (typeof data.guid !== "undefined" && data.guid > 0) {
            resolve(entity.init(data));
          } else {
            reject({textStatus: "Server error"});
          }
        },
        error: (errObj) => {
          reject(errObj);
        }
      });
    });
  }

  getEntity(options, ...selectors) {
    return new Promise((resolve, reject) => {
      this.getEntityData.call(this, options, ...selectors).then((data) => {
        if (data !== null) {
          resolve(this.initEntity(data));
        } else {
          resolve(null);
        }
      }, (errObj) => {
        reject(errObj);
      });
    });
  }

  getEntityData(options, ...selectors) {
    return new Promise((resolve, reject) => {
      getAjax({
        url: this.restURL,
        dataType: 'json',
        data: {'action': 'entity', 'data': JSON.stringify([options, ...selectors])},
        success: (data) => {
          if (typeof data.guid !== "undefined" && data.guid > 0) {
            resolve(data);
          } else {
            resolve(null);
          }
        },
        error: (errObj) => {
          reject(errObj);
        }
      });
    });
  }

  getEntities(options, ...selectors) {
    return new Promise((resolve, reject) => {
      getAjax({
        url: this.restURL,
        dataType: 'json',
        data: {'action': 'entities', 'data': JSON.stringify([options, ...selectors])},
        success: (data) => {
          resolve(map(data, this.initEntity));
        },
        error: (errObj) => {
          reject(errObj);
        }
      });
    });
  }

  initEntity(entityJSON) {
    const entityClass = Nymph.getEntityClass(entityJSON.class);
    if (!entityClass) {
      throw new NymphClassNotAvailableError(entityJSON.class+" class cannot be found.");
    }
    const entity = new (entityClass)();
    return entity.init(entityJSON);
  }

  deleteEntity(entity, plural) {
    let cur;
    if (plural) {
      for (let i = 0; i < entity.length; i++) {
        cur = entity[i].toJSON();
        cur.etype = entity[i].constructor.etype;
        entity[i] = cur;
      }
    } else {
      cur = entity.toJSON();
      cur.etype = entity.constructor.etype;
      entity = cur;
    }
    return new Promise((resolve, reject) => {
      postputdelAjax({
        type: 'DELETE',
        url: this.restURL,
        dataType: 'json',
        data: {'action': plural ? 'entities' : 'entity', 'data': JSON.stringify(entity)},
        success: (data) => {
          resolve(data);
        },
        error: (errObj) => {
          reject(errObj);
        }
      });
    });
  }

  deleteEntities(entities) {
    return this.deleteEntity(entities, true);
  }

  updateArray(oldArr, newArrIn) {
    const newArr = Array.prototype.slice.call(newArrIn);
    const idMap = {};
    for (let i = 0; i < newArr.length; i++) {
      if (newArr[i] instanceof Nymph.getEntityClass("Entity") && newArr[i].guid) {
        idMap[newArr[i].guid] = i;
      }
    }
    const remove = [];
    for (let k in oldArr) {
      if (k <= 4294967294 && /^0$|^[1-9]\d*$/.test(k) && oldArr.hasOwnProperty(k)) { // This handles sparse arrays.
        k = Number(k);
        if (typeof idMap[oldArr[k].guid] === "undefined") {
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
    remove.sort(function(a, b){
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
  }

  serverCall(entity, method, params) {
    return new Promise((resolve, reject) => {
      postputdelAjax({
        type: 'POST',
        url: this.restURL,
        dataType: 'json',
        data: {'action': 'method', 'data': JSON.stringify({'entity': entity, 'method': method, 'params': params})},
        success: (data) => {
          resolve(data);
        },
        error: (errObj) => {
          reject(errObj);
        }
      });
    });
  }

  serverCallStatic(className, method, params) {
    return new Promise((resolve, reject) => {
      postputdelAjax({
        type: 'POST',
        url: this.restURL,
        dataType: 'json',
        data: {'action': 'method', 'data': JSON.stringify({'class': className, 'static': true, 'method': method, 'params': params})},
        success: (data) => {
          resolve(data);
        },
        error: (errObj) => {
          reject(errObj);
        }
      });
    });
  }

  hsort(array, property, parentProperty, caseSensitive, reverse) {
    // First sort by the requested property.
    this.sort(array, property, caseSensitive, reverse);
    if (typeof parentProperty === "undefined" || parentProperty === null) {
      return array;
    }

    // Now sort by children.
    let new_array = [];
    // Look for entities ready to go in order.
    let changed, pkey, ancestry, new_key;
    while (array.length) {
      changed = false;
      for (let key = 0; key < array.length; key++) {
        // Must break after adding one, so any following children don't go in the wrong order.
        if (
            typeof array[key].data[parentProperty] === "undefined" ||
            array[key].data[parentProperty] === null ||
            typeof array[key].data[parentProperty].inArray !== "function" ||
            !array[key].data[parentProperty].inArray(new_array.concat(array))
          ) {
          // If they have no parent (or their parent isn't in the array), they go on the end.
          new_array.push(array[key]);
          array.splice(key, 1);
          changed = true;
          break;
        } else {
          // Else find the parent.
          pkey = array[key].data[parentProperty].arraySearch(new_array);
          if (pkey !== false) {
            // And insert after the parent.
            // This makes entities go to the end of the child list.
            ancestry = [array[key].data[parentProperty].guid];
            new_key = Number(pkey);
            while (
                typeof new_array[new_key + 1] !== "undefined" &&
                typeof new_array[new_key + 1].data[parentProperty] !== "undefined" &&
                new_array[new_key + 1].data[parentProperty] !== null &&
                ancestry.indexOf(new_array[new_key + 1].data[parentProperty].guid) !== -1
              ) {
              ancestry.push(new_array[new_key + 1].guid);
              new_key += 1;
            }
            // Where to place the entity.
            new_key += 1;
            if (typeof new_array[new_key] !== "undefined") {
              // If it already exists, we have to splice it in.
              new_array.splice(new_key, 0, array[key]);
            } else {
              // Else just add it.
              new_array.push(array[key]);
            }
            array.splice(key, 1);
            changed = true;
            break;
          }
        }
      }
      if (!changed) {
        // If there are any unexpected errors and the array isn't changed, just stick the rest on the end.
        if (array.length) {
          new_array = new_array.concat(array);
          array = [];
        }
      }
    }
    // Now push the new array out.
    array = new_array;
    return array;
  }

  psort(array, property, parentProperty, caseSensitive, reverse) {
    // Sort by the requested property.
    if (typeof property !== "undefined") {
      sortProperty = property;
      sortParent = parentProperty;
      sortCaseSensitive = !!caseSensitive;
      array.sort(arraySortProperty);
    }
    if (reverse) {
      array.reverse();
    }
    return array;
  }

  sort(array, property, caseSensitive, reverse) {
    // Sort by the requested property.
    if (typeof property !== "undefined") {
      sortProperty = property;
      sortParent = null;
      sortCaseSensitive = !!caseSensitive;
      array.sort(arraySortProperty);
    }
    if (reverse) {
      array.reverse();
    }
    return array;
  }
}

// === Static Properties ===

// The current version of Nymph.
Nymph.version = "1.6.0";
Nymph.entityClasses = {};

class NymphClassNotAvailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NymphClassNotAvailableError';
    this.message = message;
    this.stack = (new Error()).stack;
  }
}

let nymph = new Nymph();
if (window !== undefined && window.NymphOptions !== undefined) {
  nymph.init(window.NymphOptions);
}

export {nymph as Nymph, NymphClassNotAvailableError};
export default nymph;
