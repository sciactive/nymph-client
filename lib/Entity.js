(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "Nymph"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require("Nymph"));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.Nymph);
    global.NymphEntity = mod.exports;
  }
})(this, function (exports, _Nymph) {
  /*
  Nymph Entity 1.6.0 nymph.io
  (C) 2014-2017 Hunter Perrin
  license Apache-2.0
  */
  /* global Promise */
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.EntityIsSleepingReferenceError = exports.Entity = undefined;

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var sleepErr = "This entity is in a sleeping reference state. You must use .ready().then() to wake it.";

  var isArray = Array.isArray || function (arr) {
    return Object.prototype.toString.call(arr) === '[object Array]';
  };

  var indexOf = function indexOf(array, item) {
    for (var i = 0; i < array.length; i++) {
      if (array[i] === item) {
        return i;
      }
    }
    return -1;
  };

  var map = function map(arr, fn) {
    var results = [];
    for (var i = 0; i < arr.length; i++) {
      results.push(fn(arr[i], i));
    }
    return results;
  };

  var arrayUnique = function arrayUnique(array) {
    var a = array.concat();
    for (var i = 0; i < a.length; ++i) {
      for (var j = i + 1; j < a.length; ++j) {
        if (a[i] === a[j]) {
          a.splice(j--, 1);
        }
      }
    }
    return a;
  };

  var onlyStrings = function onlyStrings(array) {
    var newArray = [];
    for (var i = 0; i < array.length; i++) {
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

  var getDataReference = function getDataReference(item) {
    if (item instanceof Entity && typeof item.toReference === "function") {
      // Convert entities to references.
      return item.toReference();
    } else if (isArray(item)) {
      // Recurse into lower arrays.
      return map(item, getDataReference);
    } else if (item instanceof Object) {
      var newObj = void 0;
      if (Object.create) {
        newObj = Object.create(item);
      } else {
        var F = function F() {};
        F.prototype = item;
        newObj = new F();
      }
      for (var k in item) {
        if (item.hasOwnProperty(k)) {
          newObj[k] = getDataReference(item[k]);
        }
      }
    }
    // Not an entity or array, just return it.
    return item;
  };

  var getSleepingReference = function getSleepingReference(item) {
    if (isArray(item)) {
      // Check if it's a reference.
      if (item[0] === 'nymph_entity_reference') {
        var entityClass = _Nymph.Nymph.getEntityClass(item[2]);
        if (!entityClass) {
          throw new _Nymph.NymphClassNotAvailableError(item[2] + " class cannot be found.");
        }
        var entity = new entityClass();
        entity.referenceSleep(item);
        return entity;
      } else {
        // Recurse into lower arrays.
        return map(item, getSleepingReference);
      }
    } else if (item instanceof Object) {
      for (var k in item) {
        if (item.hasOwnProperty(k)) {
          item[k] = getSleepingReference(item[k]);
        }
      }
    }
    // Not an array, just return it.
    return item;
  };

  var sortObj = function sortObj(obj) {
    // adapted from http://am.aurlien.net/post/1221493460/sorting-javascript-objects
    var temp_array = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        temp_array.push(key);
      }
    }
    temp_array.sort();
    var temp_obj = {};
    for (var i = 0; i < temp_array.length; i++) {
      temp_obj[temp_array[i]] = obj[temp_array[i]];
    }
    return temp_obj;
  };

  var Entity = function () {

    // === Constructor ===

    // The name of the server class
    function Entity(id) {
      _classCallCheck(this, Entity);

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
        this.sleepingReference = ['nymph_entity_reference', this.guid, this.class];
        this.ready();
      }
    }

    // === Static Methods ===

    // === Instance Properties ===

    // === Static Properties ===

    _createClass(Entity, [{
      key: "init",
      value: function init(jsonEntity) {
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
        for (var k in this.data) {
          if (this.data.hasOwnProperty(k)) {
            this.data[k] = getSleepingReference(this.data[k]);
          }
        }

        return this;
      }
    }, {
      key: "addTag",
      value: function addTag() {
        for (var _len = arguments.length, tags = Array(_len), _key = 0; _key < _len; _key++) {
          tags[_key] = arguments[_key];
        }

        if (this.isASleepingReference) {
          throw new EntityIsSleepingReferenceError(sleepErr);
        }
        if (isArray(tags[0])) {
          tags = tags[0];
        }
        this.tags = onlyStrings(arrayUnique(this.tags.concat(tags)));
      }
    }, {
      key: "hasTag",
      value: function hasTag() {
        for (var _len2 = arguments.length, tags = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          tags[_key2] = arguments[_key2];
        }

        if (this.isASleepingReference) {
          throw new EntityIsSleepingReferenceError(sleepErr);
        }
        if (isArray(tags[0])) {
          tags = tags[0];
        }
        for (var i = 0; i < tags.length; i++) {
          if (indexOf(this.tags, tags[i]) === -1) {
            return false;
          }
        }
        return true;
      }
    }, {
      key: "removeTag",
      value: function removeTag() {
        for (var _len3 = arguments.length, tags = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
          tags[_key3] = arguments[_key3];
        }

        if (this.isASleepingReference) {
          throw new EntityIsSleepingReferenceError(sleepErr);
        }
        var newTags = [];
        if (isArray(tags[0])) {
          tags = tags[0];
        }
        for (var i = 0; i < this.tags.length; i++) {
          if (indexOf(tags, this.tags[i]) === -1) {
            newTags.push(this.tags[i]);
          }
        }
        this.tags = newTags;
      }
    }, {
      key: "get",
      value: function get(name) {
        if (this.isASleepingReference) {
          throw new EntityIsSleepingReferenceError(sleepErr);
        }
        if (isArray(name)) {
          var result = {};
          for (var i = 0; i < name.length; i++) {
            result[name[i]] = this.data[name[i]];
          }
          return result;
        } else {
          return this.data[name];
        }
      }
    }, {
      key: "set",
      value: function set(name) {
        var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

        if (this.isASleepingReference) {
          throw new EntityIsSleepingReferenceError(sleepErr);
        }
        if ((typeof name === "undefined" ? "undefined" : _typeof(name)) === "object") {
          for (var k in name) {
            if (name.hasOwnProperty(k)) {
              this.data[k] = name[k];
            }
          }
        } else {
          this.data[name] = value;
        }
      }
    }, {
      key: "save",
      value: function save() {
        if (this.isASleepingReference) {
          throw new EntityIsSleepingReferenceError(sleepErr);
        }
        return _Nymph.Nymph.saveEntity(this);
      }
    }, {
      key: "delete",
      value: function _delete() {
        if (this.isASleepingReference) {
          throw new EntityIsSleepingReferenceError(sleepErr);
        }
        return _Nymph.Nymph.deleteEntity(this);
      }
    }, {
      key: "is",
      value: function is(object) {
        if (this.isASleepingReference) {
          throw new EntityIsSleepingReferenceError(sleepErr);
        }
        if (!(object instanceof Entity)) {
          return false;
        }
        if (this.guid && this.guid > 0 || object.guid && object.guid > 0) {
          return this.guid === object.guid;
        } else if (typeof object.toJSON !== 'function') {
          return false;
        } else {
          var obData = sortObj(object.toJSON());
          obData.tags.sort();
          obData.data = sortObj(obData.data);
          var myData = sortObj(this.toJSON());
          myData.tags.sort();
          myData.data = sortObj(myData.data);
          return JSON.stringify(obData) === JSON.stringify(myData);
        }
      }
    }, {
      key: "equals",
      value: function equals(object) {
        if (this.isASleepingReference) {
          throw new EntityIsSleepingReferenceError(sleepErr);
        }
        if (!(object instanceof Entity)) {
          return false;
        }
        if (this.guid && this.guid > 0 || object.guid && object.guid > 0) {
          if (this.guid !== object.guid) {
            return false;
          }
        }
        if (object.class !== this.class) {
          return false;
        }
        //return eq(this, object, [], []);
        var obData = sortObj(object.toJSON());
        obData.tags.sort();
        obData.data = sortObj(obData.data);
        var myData = sortObj(this.toJSON());
        myData.tags.sort();
        myData.data = sortObj(myData.data);
        return JSON.stringify(obData) === JSON.stringify(myData);
      }
    }, {
      key: "inArray",
      value: function inArray(array, strict) {
        if (this.isASleepingReference) {
          throw new EntityIsSleepingReferenceError(sleepErr);
        }
        if (!isArray(array)) {
          return false;
        }
        for (var i = 0; i < array.length; i++) {
          if (strict ? this.equals(array[i]) : this.is(array[i])) {
            return true;
          }
        }
        return false;
      }
    }, {
      key: "arraySearch",
      value: function arraySearch(array, strict) {
        if (this.isASleepingReference) {
          throw new EntityIsSleepingReferenceError(sleepErr);
        }
        if (!isArray(array)) {
          return false;
        }
        for (var i = 0; i < array.length; i++) {
          if (strict ? this.equals(array[i]) : this.is(array[i])) {
            return i;
          }
        }
        return false;
      }
    }, {
      key: "refresh",
      value: function refresh() {
        var _this = this;

        if (this.isASleepingReference) {
          return this.ready();
        }
        if (this.guid === null) {
          return new Promise(function (resolve) {
            resolve(_this);
          });
        }
        return new Promise(function (resolve, reject) {
          _Nymph.Nymph.getEntityData({ "class": _this.class }, { "type": "&", "guid": _this.guid }).then(function (data) {
            resolve(_this.init(data));
          }, function (errObj) {
            reject(errObj);
          });
        });
      }
    }, {
      key: "serverCall",
      value: function serverCall(method, params, dontUpdateAfterCall) {
        var _this2 = this;

        if (this.isASleepingReference) {
          throw new EntityIsSleepingReferenceError(sleepErr);
        }
        // Turn the params into a real array, in case an arguments object was passed.
        var paramArray = Array.prototype.slice.call(params);
        return new Promise(function (resolve, reject) {
          _Nymph.Nymph.serverCall(_this2, method, paramArray).then(function (data) {
            if (!dontUpdateAfterCall) {
              _this2.init(data.entity);
            }
            resolve(data.return);
          }, function (errObj) {
            reject(errObj);
          });
        });
      }
    }, {
      key: "toJSON",
      value: function toJSON() {
        if (this.isASleepingReference) {
          throw new EntityIsSleepingReferenceError(sleepErr);
        }
        var obj = {};
        obj.guid = this.guid;
        obj.cdate = this.cdate;
        obj.mdate = this.mdate;
        obj.tags = this.tags.slice(0);
        obj.data = {};
        for (var k in this.data) {
          if (this.data.hasOwnProperty(k)) {
            obj.data[k] = getDataReference(this.data[k]);
          }
        }
        obj.class = this.class;
        return obj;
      }
    }, {
      key: "toReference",
      value: function toReference() {
        if (this.isASleepingReference) {
          return this.sleepingReference;
        }
        if (this.guid === null) {
          return this;
        }
        return ['nymph_entity_reference', this.guid, this.class];
      }
    }, {
      key: "referenceSleep",
      value: function referenceSleep(reference) {
        this.isASleepingReference = true;
        this.sleepingReference = reference;
      }
    }, {
      key: "ready",
      value: function ready(success, error) {
        var _this3 = this;

        this.readyPromise = new Promise(function (resolve, reject) {
          if (!_this3.isASleepingReference) {
            _this3.readyPromise = null;
            resolve(_this3);
            if (typeof success === "function") {
              success(_this3);
            }
          } else {
            if (_this3.readyPromise) {
              _this3.readyPromise.then(function () {
                resolve(_this3);
                if (typeof success === "function") {
                  success(_this3);
                }
              }, function (errObj) {
                reject(errObj);
                if (typeof error === "function") {
                  error(errObj);
                }
              });
            } else {
              _Nymph.Nymph.getEntityData({ "class": _this3.sleepingReference[2] }, { "type": "&", "guid": _this3.sleepingReference[1] }).then(function (data) {
                _this3.readyPromise = null;
                resolve(_this3.init(data));
                if (typeof success === "function") {
                  success(_this3);
                }
              }, function (errObj) {
                _this3.readyPromise = null;
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
    }, {
      key: "readyAll",
      value: function readyAll(success, error) {
        var _this4 = this;

        return new Promise(function (resolve, reject) {
          _this4.ready(function () {
            var promises = [];
            for (var k in _this4.data) {
              if (_this4.data.hasOwnProperty(k)) {
                if (_this4.data[k] instanceof Entity) {
                  promises.push(_this4.data[k].readyAll());
                } else if (isArray(_this4.data[k])) {
                  for (var i = 0; i < _this4.data[k].length; i++) {
                    if (_this4.data[k][i] instanceof Entity) {
                      promises.push(_this4.data[k][i].readyAll());
                    }
                  }
                }
              }
            }
            Promise.all(promises).then(function () {
              resolve(_this4);
              if (typeof success === "function") {
                success(_this4);
              }
            }, function (errObj) {
              reject(errObj);
              if (typeof error === "function") {
                error(errObj);
              }
            });
          }, function (errObj) {
            reject(errObj);
            if (typeof error === "function") {
              error(errObj);
            }
          });
        });
      }
    }], [{
      key: "serverCallStatic",
      value: function serverCallStatic(method, params) {
        var _this5 = this;

        // Turn the params into a real array, in case an arguments object was passed.
        var paramArray = Array.prototype.slice.call(params);
        return new Promise(function (resolve, reject) {
          _Nymph.Nymph.serverCallStatic(_this5.class, method, paramArray).then(function (data) {
            resolve(data.return);
          }, function (errObj) {
            reject(errObj);
          });
        });
      }
    }]);

    return Entity;
  }();

  Entity.etype = "entity";
  Entity.class = "Entity";


  _Nymph.Nymph.setEntityClass("Entity", Entity);

  var EntityIsSleepingReferenceError = function (_Error) {
    _inherits(EntityIsSleepingReferenceError, _Error);

    function EntityIsSleepingReferenceError(message) {
      _classCallCheck(this, EntityIsSleepingReferenceError);

      var _this6 = _possibleConstructorReturn(this, (EntityIsSleepingReferenceError.__proto__ || Object.getPrototypeOf(EntityIsSleepingReferenceError)).call(this, message));

      _this6.name = 'EntityIsSleepingReferenceError';
      _this6.message = message;
      _this6.stack = new Error().stack;
      return _this6;
    }

    return EntityIsSleepingReferenceError;
  }(Error);

  exports.Entity = Entity;
  exports.EntityIsSleepingReferenceError = EntityIsSleepingReferenceError;
  exports.default = Entity;
});