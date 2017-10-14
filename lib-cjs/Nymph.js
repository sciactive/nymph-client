/*
Nymph 1.6.1 nymph.io
(C) 2014-2017 Hunter Perrin
license Apache-2.0
*/
/* global Promise */
/* global NymphOptions */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _extendableBuiltin3(cls) {
  function ExtendableBuiltin() {
    var instance = Reflect.construct(cls, Array.from(arguments));
    Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
    return instance;
  }

  ExtendableBuiltin.prototype = Object.create(cls.prototype, {
    constructor: {
      value: cls,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });

  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(ExtendableBuiltin, cls);
  } else {
    ExtendableBuiltin.__proto__ = cls;
  }

  return ExtendableBuiltin;
}

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _extendableBuiltin(cls) {
  function ExtendableBuiltin() {
    var instance = Reflect.construct(cls, Array.from(arguments));
    Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
    return instance;
  }

  ExtendableBuiltin.prototype = Object.create(cls.prototype, {
    constructor: {
      value: cls,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });

  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(ExtendableBuiltin, cls);
  } else {
    ExtendableBuiltin.__proto__ = cls;
  }

  return ExtendableBuiltin;
}

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var sortProperty = null;
var sortParent = null;
var sortCaseSensitive = null;

var arraySortProperty = function arraySortProperty(a, b) {
  var aprop = void 0,
      bprop = void 0,
      property = sortProperty,
      parent = sortParent,
      notData = property === "guid" || property === "cdate" || property === "mdate";
  if (parent !== null && (a.data[parent] instanceof Nymph.getEntityClass("Entity") && typeof (notData ? a.data[parent][property] : a.data[parent].data[property]) !== "undefined" || b.data[parent] instanceof Nymph.getEntityClass("Entity") && typeof (notData ? b.data[parent][property] : b.data[parent].data[property]) !== "undefined")) {
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

var map = function map(arr, fn) {
  var results = [];
  for (var i = 0; i < arr.length; i++) {
    results.push(fn(arr[i], i));
  }
  return results;
};

var makeUrl = function makeUrl(url, data, noSep) {
  if (!data) {
    return url;
  }
  for (var k in data) {
    if (data.hasOwnProperty(k)) {
      if (noSep) {
        url = url + (url.length ? '&' : '');
      } else {
        url = url + (url.indexOf('?') !== -1 ? '&' : '?');
      }
      url = url + encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
    }
  }
  return url;
};

var onReadyStateChange = function onReadyStateChange(opt) {
  return function () {
    if (this.readyState === 4) {
      if (this.status >= 200 && this.status < 400) {
        if (opt.dataType === "json") {
          opt.success(JSON.parse(this.responseText));
        } else {
          opt.success(this.responseText);
        }
      } else {
        var errObj = void 0;
        try {
          errObj = JSON.parse(this.responseText);
        } catch (e) {
          if (!(e instanceof SyntaxError)) {
            throw e;
          }
        }
        if ((typeof errObj === "undefined" ? "undefined" : _typeof(errObj)) !== "object") {
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

var getAjax = function getAjax(opt) {
  var request = new XMLHttpRequest();
  request.open('GET', makeUrl(opt.url, opt.data), true);

  request.onreadystatechange = onReadyStateChange(opt);

  request.send();
  request = null;
};

var postputdelAjax = function postputdelAjax(opt) {
  var request = new XMLHttpRequest();
  request.open(opt.type, opt.url, true);

  request.onreadystatechange = onReadyStateChange(opt);

  request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
  request.send(makeUrl('', opt.data, true));
  request = null;
};

var Nymph = function () {

  // === Constructor ===

  function Nymph() {
    _classCallCheck(this, Nymph);

    // === Instance Properties ===

    this.restURL = null;
  }

  // === Static Methods ===

  _createClass(Nymph, [{
    key: "init",


    // === Instance Methods ===

    value: function init(NymphOptions) {
      this.restURL = NymphOptions.restURL;
      return this;
    }
  }, {
    key: "setEntityClass",
    value: function setEntityClass(className, entityClass) {
      Nymph.setEntityClass(className, entityClass);
    }
  }, {
    key: "getEntityClass",
    value: function getEntityClass(className) {
      return Nymph.getEntityClass(className);
    }
  }, {
    key: "newUID",
    value: function newUID(name) {
      var _this = this;

      return new Promise(function (resolve, reject) {
        postputdelAjax({
          type: 'POST',
          url: _this.restURL,
          dataType: 'text',
          data: { 'action': 'uid', 'data': name },
          success: function success(data) {
            resolve(Number(data));
          },
          error: function error(errObj) {
            reject(errObj);
          }
        });
      });
    }
  }, {
    key: "setUID",
    value: function setUID(name, value) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        postputdelAjax({
          type: 'PUT',
          url: _this2.restURL,
          dataType: 'json',
          data: { 'action': 'uid', 'data': JSON.stringify({ "name": name, "value": value }) },
          success: function success(data) {
            resolve(data);
          },
          error: function error(errObj) {
            reject(errObj);
          }
        });
      });
    }
  }, {
    key: "getUID",
    value: function getUID(name) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        getAjax({
          url: _this3.restURL,
          dataType: 'text',
          data: { 'action': 'uid', 'data': name },
          success: function success(data) {
            resolve(Number(data));
          },
          error: function error(errObj) {
            reject(errObj);
          }
        });
      });
    }
  }, {
    key: "deleteUID",
    value: function deleteUID(name) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        postputdelAjax({
          type: 'DELETE',
          url: _this4.restURL,
          data: { 'action': 'uid', 'data': name },
          success: function success(data) {
            resolve(data);
          },
          error: function error(errObj) {
            reject(errObj);
          }
        });
      });
    }
  }, {
    key: "saveEntity",
    value: function saveEntity(entity, plural) {
      var _this5 = this;

      var method = void 0;
      if (plural) {
        entity.forEach(function (cur) {
          if (!method) {
            method = cur.guid === null ? 'POST' : 'PUT';
          } else if (method === 'POST' && cur.guid !== null || method === 'PUT' && cur.guid === null) {
            throw new NymphInvalidRequestError("Due to REST restriction, you can only create new entities or update existing entities, not both at the same time.");
          }
        });
        if (!method) {
          method = 'POST';
        }
      } else {
        method = entity.guid === null ? 'POST' : 'PUT';
      }
      return new Promise(function (resolve, reject) {
        postputdelAjax({
          type: method,
          url: _this5.restURL,
          dataType: 'json',
          data: { 'action': plural ? 'entities' : 'entity', 'data': JSON.stringify(entity) },
          success: function success(data) {
            if (plural && entity.length === data.length) {
              for (var i = 0; i < data.length; i++) {
                if (typeof data[i].guid !== "undefined" && data[i].guid > 0 && (entity[i].guid === null || entity[i].guid === data[i].guid)) {
                  entity[i].init(data[i]);
                }
              }
              resolve(entity);
            } else if (typeof data.guid !== "undefined" && data.guid > 0) {
              resolve(entity.init(data));
            } else {
              reject({ textStatus: "Server error" });
            }
          },
          error: function error(errObj) {
            reject(errObj);
          }
        });
      });
    }
  }, {
    key: "saveEntities",
    value: function saveEntities(entities) {
      return this.saveEntity(entities, true);
    }
  }, {
    key: "getEntity",
    value: function getEntity(options) {
      var _this6 = this;

      for (var _len = arguments.length, selectors = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        selectors[_key - 1] = arguments[_key];
      }

      return new Promise(function (resolve, reject) {
        var _getEntityData;

        (_getEntityData = _this6.getEntityData).call.apply(_getEntityData, [_this6, options].concat(selectors)).then(function (data) {
          if (data !== null) {
            resolve(_this6.initEntity(data));
          } else {
            resolve(null);
          }
        }, function (errObj) {
          reject(errObj);
        });
      });
    }
  }, {
    key: "getEntityData",
    value: function getEntityData(options) {
      var _this7 = this;

      for (var _len2 = arguments.length, selectors = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        selectors[_key2 - 1] = arguments[_key2];
      }

      return new Promise(function (resolve, reject) {
        getAjax({
          url: _this7.restURL,
          dataType: 'json',
          data: { 'action': 'entity', 'data': JSON.stringify([options].concat(selectors)) },
          success: function success(data) {
            if (typeof data.guid !== "undefined" && data.guid > 0) {
              resolve(data);
            } else {
              resolve(null);
            }
          },
          error: function error(errObj) {
            reject(errObj);
          }
        });
      });
    }
  }, {
    key: "getEntities",
    value: function getEntities(options) {
      var _this8 = this;

      for (var _len3 = arguments.length, selectors = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        selectors[_key3 - 1] = arguments[_key3];
      }

      return new Promise(function (resolve, reject) {
        getAjax({
          url: _this8.restURL,
          dataType: 'json',
          data: { 'action': 'entities', 'data': JSON.stringify([options].concat(selectors)) },
          success: function success(data) {
            resolve(map(data, _this8.initEntity));
          },
          error: function error(errObj) {
            reject(errObj);
          }
        });
      });
    }
  }, {
    key: "initEntity",
    value: function initEntity(entityJSON) {
      var entityClass = Nymph.getEntityClass(entityJSON.class);
      if (!entityClass) {
        throw new NymphClassNotAvailableError(entityJSON.class + " class cannot be found.");
      }
      var entity = new entityClass();
      return entity.init(entityJSON);
    }
  }, {
    key: "deleteEntity",
    value: function deleteEntity(entity, plural) {
      var _this9 = this;

      var cur = void 0;
      if (plural) {
        for (var i = 0; i < entity.length; i++) {
          cur = entity[i].toJSON();
          cur.etype = entity[i].constructor.etype;
          entity[i] = cur;
        }
      } else {
        cur = entity.toJSON();
        cur.etype = entity.constructor.etype;
        entity = cur;
      }
      return new Promise(function (resolve, reject) {
        postputdelAjax({
          type: 'DELETE',
          url: _this9.restURL,
          dataType: 'json',
          data: { 'action': plural ? 'entities' : 'entity', 'data': JSON.stringify(entity) },
          success: function success(data) {
            resolve(data);
          },
          error: function error(errObj) {
            reject(errObj);
          }
        });
      });
    }
  }, {
    key: "deleteEntities",
    value: function deleteEntities(entities) {
      return this.deleteEntity(entities, true);
    }
  }, {
    key: "updateArray",
    value: function updateArray(oldArr, newArrIn) {
      var newArr = Array.prototype.slice.call(newArrIn);
      var idMap = {};
      for (var i = 0; i < newArr.length; i++) {
        if (newArr[i] instanceof Nymph.getEntityClass("Entity") && newArr[i].guid) {
          idMap[newArr[i].guid] = i;
        }
      }
      var remove = [];
      for (var k in oldArr) {
        if (k <= 4294967294 && /^0$|^[1-9]\d*$/.test(k) && oldArr.hasOwnProperty(k)) {
          // This handles sparse arrays.
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
      remove.sort(function (a, b) {
        // Sort backwards so we can remove in reverse order. (Preserves indices.)
        if (a > b) return -1;
        if (a < b) return 1;
        return 0;
      });
      for (var n = 0; n < remove.length; n++) {
        oldArr.splice(remove[n], 1);
      }
      // And add the new ones.
      for (var v in idMap) {
        if (idMap.hasOwnProperty(v)) {
          oldArr.splice(oldArr.length, 0, newArr[idMap[v]]);
        }
      }
    }
  }, {
    key: "serverCall",
    value: function serverCall(entity, method, params) {
      var _this10 = this;

      return new Promise(function (resolve, reject) {
        postputdelAjax({
          type: 'POST',
          url: _this10.restURL,
          dataType: 'json',
          data: { 'action': 'method', 'data': JSON.stringify({ 'entity': entity, 'method': method, 'params': params }) },
          success: function success(data) {
            resolve(data);
          },
          error: function error(errObj) {
            reject(errObj);
          }
        });
      });
    }
  }, {
    key: "serverCallStatic",
    value: function serverCallStatic(className, method, params) {
      var _this11 = this;

      return new Promise(function (resolve, reject) {
        postputdelAjax({
          type: 'POST',
          url: _this11.restURL,
          dataType: 'json',
          data: { 'action': 'method', 'data': JSON.stringify({ 'class': className, 'static': true, 'method': method, 'params': params }) },
          success: function success(data) {
            resolve(data);
          },
          error: function error(errObj) {
            reject(errObj);
          }
        });
      });
    }
  }, {
    key: "hsort",
    value: function hsort(array, property, parentProperty, caseSensitive, reverse) {
      // First sort by the requested property.
      this.sort(array, property, caseSensitive, reverse);
      if (typeof parentProperty === "undefined" || parentProperty === null) {
        return array;
      }

      // Now sort by children.
      var new_array = [];
      // Look for entities ready to go in order.
      var changed = void 0,
          pkey = void 0,
          ancestry = void 0,
          new_key = void 0;
      while (array.length) {
        changed = false;
        for (var key = 0; key < array.length; key++) {
          // Must break after adding one, so any following children don't go in the wrong order.
          if (typeof array[key].data[parentProperty] === "undefined" || array[key].data[parentProperty] === null || typeof array[key].data[parentProperty].inArray !== "function" || !array[key].data[parentProperty].inArray(new_array.concat(array))) {
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
              while (typeof new_array[new_key + 1] !== "undefined" && typeof new_array[new_key + 1].data[parentProperty] !== "undefined" && new_array[new_key + 1].data[parentProperty] !== null && ancestry.indexOf(new_array[new_key + 1].data[parentProperty].guid) !== -1) {
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
  }, {
    key: "psort",
    value: function psort(array, property, parentProperty, caseSensitive, reverse) {
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
  }, {
    key: "sort",
    value: function sort(array, property, caseSensitive, reverse) {
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
  }], [{
    key: "setEntityClass",
    value: function setEntityClass(className, entityClass) {
      Nymph.entityClasses[className] = entityClass;
    }
  }, {
    key: "getEntityClass",
    value: function getEntityClass(className) {
      if (Nymph.entityClasses.hasOwnProperty(className)) {
        return Nymph.entityClasses[className];
      }
      if (window !== undefined && window[className] !== undefined) {
        return window[className];
      }
      if (typeof define === 'function' && define.amd) {
        return require('Nymph' + className);
      }
      if (typeof require === "function") {
        return require(className);
      }
      return null;
    }
  }]);

  return Nymph;
}();

// === Static Properties ===

// The current version of Nymph.


Nymph.version = "1.6.1";
Nymph.entityClasses = {};

// === Error Classes ===

var NymphClassNotAvailableError = function (_extendableBuiltin2) {
  _inherits(NymphClassNotAvailableError, _extendableBuiltin2);

  function NymphClassNotAvailableError(message) {
    _classCallCheck(this, NymphClassNotAvailableError);

    var _this12 = _possibleConstructorReturn(this, (NymphClassNotAvailableError.__proto__ || Object.getPrototypeOf(NymphClassNotAvailableError)).call(this, message));

    _this12.name = 'NymphClassNotAvailableError';
    return _this12;
  }

  return NymphClassNotAvailableError;
}(_extendableBuiltin(Error));

var NymphInvalidRequestError = function (_extendableBuiltin4) {
  _inherits(NymphInvalidRequestError, _extendableBuiltin4);

  function NymphInvalidRequestError(message) {
    _classCallCheck(this, NymphInvalidRequestError);

    var _this13 = _possibleConstructorReturn(this, (NymphInvalidRequestError.__proto__ || Object.getPrototypeOf(NymphInvalidRequestError)).call(this, message));

    _this13.name = 'NymphInvalidRequestError';
    return _this13;
  }

  return NymphInvalidRequestError;
}(_extendableBuiltin3(Error));

var nymph = new Nymph();
if (typeof window !== 'undefined' && typeof window.NymphOptions !== 'undefined') {
  nymph.init(window.NymphOptions);
}

exports.Nymph = nymph;
exports.NymphClassNotAvailableError = NymphClassNotAvailableError;
exports.NymphInvalidRequestError = NymphInvalidRequestError;
exports.default = nymph;