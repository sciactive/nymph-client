/*
Nymph Entity 1.4.1 nymph.io
(C) 2014 Hunter Perrin
license LGPL
*/
/* global define */
/* global Promise */
/* global Nymph */
// Uses AMD or browser globals.
(function(factory){
	'use strict';
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as a module.
        define('NymphEntity', ['Nymph', 'Promise'], factory);
    } else {
        // Browser globals
        factory(Nymph, Promise, window);
    }
}(function(Nymph, Promise, context){
	'use strict';
	if (typeof context === "undefined") {
		context = {};
	}
	var sleepErr = "This entity is in a sleeping reference state. You must use .ready().then() to wake it.",
		isArray = (Array.isArray || function(arr){
			return Object.prototype.toString.call(arr) === '[object Array]';
		}),
		indexOf = function(array, item){
			for (var i = 0; i < array.length; i++) {
				if (array[i] === item) {
					return i;
				}
			}
			return -1;
		},
		map = function(arr, fn){
			var results = [];
			for (var i = 0; i < arr.length; i++) {
				results.push(fn(arr[i], i));
			}
			return results;
		},
		arrayUnique = function(array){
			var a = array.concat();
			for(var i=0; i<a.length; ++i) {
				for(var j=i+1; j<a.length; ++j) {
					if(a[i] === a[j]) {
						a.splice(j--, 1);
					}
				}
			}
			return a;
		},
		onlyStrings = function(array){
			var newArray = [];
			for (var i=0; i<array.length; i++) {
				if (typeof array[i] === "string") {
					newArray.push(array[i]);
				} else {
					if (typeof array[i].toString === "function") {
						newArray.push(array[i].toString());
					}
				}
			}
			return newArray;
		},
		getDataReference = function(item) {
			if (item instanceof context.Entity && typeof item.toReference === "function") {
				// Convert entities to references.
				return item.toReference();
			} else if (isArray(item)) {
				// Recurse into lower arrays.
				return map(item, getDataReference);
			} else if (item instanceof Object) {
				var newObj;
				if (Object.create) {
					newObj = Object.create(item);
				} else {
					var F = function () {};
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
		},
		getSleepingReference = function(item) {
			if (isArray(item)) {
				// Check if it's a reference.
				if (item[0] === 'nymph_entity_reference') {
					var entity;
					if (typeof item[2] === "string" && typeof context[item[2]] !== "undefined" && typeof context[item[2]].prototype.referenceSleep === "function") {
						entity = new context[item[2]]();
					} else if (typeof require !== 'undefined' && require('Nymph'+item[2]).prototype.init === "function") {
						entity = new (require('Nymph'+item[2]))();
					} else {
						throw new context.NymphClassNotAvailableError(item[2]+" class cannot be found.");
					}
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
		},
		sortObj = function(obj) { // adapted from http://am.aurlien.net/post/1221493460/sorting-javascript-objects
			var temp_array = [];
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					temp_array.push(key);
				}
			}
			temp_array.sort();
			var temp_obj = {};
			for (var i=0; i<temp_array.length; i++) {
			  temp_obj[temp_array[i]] = obj[temp_array[i]];
			}
			return temp_obj;
		};


	context.Entity = function(id){
		this.guid = null;
		this.cdate = null;
		this.mdate = null;
		this.tags = [];
		this.info = {};
		this.data = {};
		this.isASleepingReference = false;
		this.sleepingReference = false;
		if (typeof id !== "undefined" && !isNaN(Number(id))) {
			this.guid = Number(id);
			this.isASleepingReference = true;
			this.sleepingReference = ['nymph_entity_reference', this.guid, this.class];
			this.ready();
		}
	};

	var thisClass = {
		// The current version of Entity.
		version: "1.4.1",

		// === The Name of the Class ===
		class: 'Entity',

		// === Class Variables ===

		etype: "entity",
		readyPromise: null,

		// === Events ===

		init: function(jsonEntity){
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
		},

		// === Class Methods ===

		// Tag methods.
		addTag: function(){
			if (this.isASleepingReference) {
				throw new context.EntityIsSleepingReferenceError(sleepErr);
			}
			var tags;
			if (isArray(arguments[0])) {
				tags = arguments[0];
			} else if (arguments.length) {
				tags = Array.prototype.slice.call(arguments, 0);
			}
			this.tags = onlyStrings(arrayUnique(this.tags.concat(tags)));
		},
		hasTag: function(){
			if (this.isASleepingReference) {
				throw new context.EntityIsSleepingReferenceError(sleepErr);
			}
			var tagArray = arguments;
			if (isArray(arguments[0])) {
				tagArray = tagArray[0];
			}
			for (var i=0; i<tagArray.length; i++) {
				if (indexOf(this.tags, tagArray[i]) === -1) {
					return false;
				}
			}
			return true;
		},
		removeTag: function(){
			if (this.isASleepingReference) {
				throw new context.EntityIsSleepingReferenceError(sleepErr);
			}
			var tagArray = arguments, newTags = [];
			if (isArray(arguments[0])) {
				tagArray = tagArray[0];
			}
			for (var i=0; i<this.tags.length; i++) {
				if (indexOf(tagArray, this.tags[i]) === -1) {
					newTags.push(this.tags[i]);
				}
			}
			this.tags = newTags;
		},

		// Property getter and setter. You can also just access Entity.data directly.
		get: function(name){
			if (this.isASleepingReference) {
				throw new context.EntityIsSleepingReferenceError(sleepErr);
			}
			if (isArray(arguments[0])) {
				var result = {};
				for (var i=0; i<name.length; i++) {
					result[name[i]] = this.data[name[i]];
				}
				return result;
			} else {
				return this.data[name];
			}
		},
		set: function(name, value){
			if (this.isASleepingReference) {
				throw new context.EntityIsSleepingReferenceError(sleepErr);
			}
			if (typeof name === "object") {
				for (var k in name) {
					if (name.hasOwnProperty(k)) {
						this.data[k] = name[k];
					}
				}
			} else {
				this.data[name] = value;
			}
		},

		save: function(){
			if (this.isASleepingReference) {
				throw new context.EntityIsSleepingReferenceError(sleepErr);
			}
			return Nymph.saveEntity(this);
		},

		delete: function(){
			if (this.isASleepingReference) {
				throw new context.EntityIsSleepingReferenceError(sleepErr);
			}
			return Nymph.deleteEntity(this);
		},

		is: function(object){
			if (this.isASleepingReference) {
				throw new context.EntityIsSleepingReferenceError(sleepErr);
			}
			if (!(object instanceof context.Entity)) {
				return false;
			}
			if ((this.guid && this.guid > 0) || (object.guid && object.guid > 0)) {
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
		},
		equals: function(object){
			if (this.isASleepingReference) {
				throw new context.EntityIsSleepingReferenceError(sleepErr);
			}
			if (!(object instanceof context.Entity)) {
				return false;
			}
			if ((this.guid && this.guid > 0) || (object.guid && object.guid > 0)) {
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
		},
		inArray: function(array, strict){
			if (this.isASleepingReference) {
				throw new context.EntityIsSleepingReferenceError(sleepErr);
			}
			if (!isArray(array)) {
				return false;
			}
			for (var i=0; i<array.length; i++) {
				if (strict ? this.equals(array[i]) : this.is(array[i])) {
					return true;
				}
			}
			return false;
		},
		arraySearch: function(array, strict){
			if (this.isASleepingReference) {
				throw new context.EntityIsSleepingReferenceError(sleepErr);
			}
			if (!isArray(array)) {
				return false;
			}
			for (var i=0; i<array.length; i++) {
				if (strict ? this.equals(array[i]) : this.is(array[i])) {
					return i;
				}
			}
			return false;
		},

		refresh: function(){
			if (this.isASleepingReference) {
				return this.ready();
			}
			var that = this;
			if (this.guid === null) {
				return new Promise(function(resolve){
					resolve(that);
				});
			}
			return new Promise(function(resolve, reject){
				Nymph.getEntityData({"class":that.class},{"type":"&","guid":that.guid}).then(function(data){
					resolve(that.init(data));
				}, function(errObj){
					reject(errObj);
				});
			});
		},

		serverCall: function(method, params, dontUpdateAfterCall){
			if (this.isASleepingReference) {
				throw new context.EntityIsSleepingReferenceError(sleepErr);
			}
			var that = this;
			// Turn the params into a real array, in case an arguments object was passed.
			var paramArray = Array.prototype.splice.call(params);
			return new Promise(function(resolve, reject){
				Nymph.serverCall(that, method, paramArray).then(function(data){
					if (!dontUpdateAfterCall) {
						that.init(data.entity);
					}
					resolve(data.return);
				}, function(errObj){
					reject(errObj);
				});
			});
		},

		toJSON: function(){
			if (this.isASleepingReference) {
				throw new context.EntityIsSleepingReferenceError(sleepErr);
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
		},

		toReference: function(){
			if (this.isASleepingReference) {
				return this.sleepingReference;
			}
			if (this.guid === null) {
				return this;
			}
			return ['nymph_entity_reference', this.guid, this.class];
		},

		referenceSleep: function(reference){
			this.isASleepingReference = true;
			this.sleepingReference = reference;
		},

		ready: function(success, error){
			var that = this;
			this.readyPromise = new Promise(function(resolve, reject){
				if (!that.isASleepingReference) {
					that.readyPromise = null;
					resolve(that);
					if (typeof success === "function") {
						success(that);
					}
				} else {
					if (that.readyPromise) {
						that.readyPromise.then(function(){
							resolve(that);
							if (typeof success === "function") {
								success(that);
							}
						}, function(errObj){
							reject(errObj);
							if (typeof error === "function") {
								error(errObj);
							}
						});
					} else {
						Nymph.getEntityData({"class":that.sleepingReference[2]}, {"type":"&","guid":that.sleepingReference[1]}).then(function(data){
							that.readyPromise = null;
							resolve(that.init(data));
							if (typeof success === "function") {
								success(that);
							}
						}, function(errObj){
							that.readyPromise = null;
							reject(errObj);
							if (typeof error === "function") {
								error(errObj);
							}
						});
					}
				}
			});
			return this.readyPromise;
		},
		readyAll: function(success, error){
			var that = this;
			return new Promise(function(resolve, reject){
				that.ready(function(){
					var promises = [];
					for (var k in that.data) {
						if (that.data.hasOwnProperty(k)) {
							if (that.data[k] instanceof context.Entity) {
								promises.push(that.data[k].readyAll());
							} else if (isArray(that.data[k])) {
								for (var i=0; i<that.data[k].length; i++) {
									if (that.data[k][i] instanceof context.Entity) {
										promises.push(that.data[k][i].readyAll());
									}
								}
							}
						}
					}
					Promise.all(promises).then(function(){
						resolve(that);
						if (typeof success === "function") {
							success(that);
						}
					}, function(errObj){
						reject(errObj);
						if (typeof error === "function") {
							error(errObj);
						}
					});
				}, function(errObj){
					reject(errObj);
					if (typeof error === "function") {
						error(errObj);
					}
				});
			});
		}
	};
	for (var p in thisClass) {
		if (thisClass.hasOwnProperty(p)) {
			context.Entity.prototype[p] = thisClass[p];
		}
	}

	context.EntityIsSleepingReferenceError = function(message){
		this.name = 'EntityIsSleepingReferenceError';
		this.message = message;
		this.stack = (new Error()).stack;
	};
	context.EntityIsSleepingReferenceError.prototype = new Error();

	context.NymphClassNotAvailableError = function(message){
		this.name = 'NymphClassNotAvailableError';
		this.message = message;
		this.stack = (new Error()).stack;
	};
	context.NymphClassNotAvailableError.prototype = new Error();

	return context.Entity;
}));
