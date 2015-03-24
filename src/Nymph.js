/*
Nymph 1.4.0-beta.4 nymph.io
(C) 2014 Hunter Perrin
license LGPL
*/
// Uses AMD or browser globals.
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as a module.
        define('Nymph', ['NymphOptions', 'Promise'], factory);
    } else {
        // Browser globals
        factory(NymphOptions, Promise);
    }
}(function(NymphOptions, Promise){
	var sortProperty = null,
		sortParent = null,
		sortCaseSensitive = null,
		arraySortProperty = function(a, b){
			var aprop, bprop,
				property = sortProperty,
				parent = sortParent,
				notData = property === "guid" || property === "cdate" || property === "mdate";
			if (parent !== null && ((a.data[parent] instanceof Entity && typeof (notData ? a.data[parent][property] : a.data[parent].data[property]) !== "undefined") || (b.data[parent] instanceof Entity && typeof (notData ? b.data[parent][property] : b.data[parent].data[property]) !== "undefined"))) {
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
		},
		map = function(arr, fn){
			var results = [];
			for (var i = 0; i < arr.length; i++) {
				results.push(fn(arr[i], i));
			}
			return results;
		},
		makeUrl = function(url, data, noSep) {
			if (!data) {
				return url;
			}
			for (var k in data) {
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
		},
		getAjax = function(opt){
			var request = new XMLHttpRequest();
			request.open('GET', makeUrl(opt.url, opt.data), true);

			request.onreadystatechange = function() {
				if (this.readyState === 4){
					if (this.status >= 200 && this.status < 400){
						if (opt.dataType === "json") {
							opt.success(JSON.parse(this.responseText));
						} else {
							opt.success(this.responseText);
						}
					} else {
						opt.error({status: this.status, textStatus: this.responseText});
					}
				}
			};

			request.send();
			request = null;
		},
		postputdelAjax = function(opt){
			var request = new XMLHttpRequest();
			request.open(opt.type, opt.url, true);

			request.onreadystatechange = function() {
				if (this.readyState === 4){
					if (this.status >= 200 && this.status < 400){
						if (opt.dataType === "json") {
							opt.success(JSON.parse(this.responseText));
						} else {
							opt.success(this.responseText);
						}
					} else {
						opt.error({status: this.status, textStatus: this.responseText});
					}
				}
			};

			request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
			request.send(makeUrl('', opt.data, true));
			request = null;
		};

	Nymph = {
		// The current version of Nymph.
		version: "1.4.0-beta.4",

		// === Class Variables ===
		restURL: null,

		// === Events ===
		init: function(NymphOptions){
			this.restURL = NymphOptions.restURL;
			return this;
		},

		// === Methods ===
		newUID: function(name){
			var that = this;
			return new Promise(function(resolve, reject){
				postputdelAjax({
					type: 'POST',
					url: that.restURL,
					dataType: 'text',
					data: {'action': 'uid', 'data': name},
					success: function(data) {
						resolve(Number(data));
					},
					error: function(errObj){
						reject(errObj);
					}
				});
			});
		},
		setUID: function(name, value){
			var that = this;
			return new Promise(function(resolve, reject){
				postputdelAjax({
					type: 'PUT',
					url: that.restURL,
					dataType: 'json',
					data: {'action': 'uid', 'data': JSON.stringify({"name":name,"value":value})},
					success: function(data) {
						resolve(data);
					},
					error: function(errObj){
						reject(errObj);
					}
				});
			});
		},
		getUID: function(name){
			var that = this;
			return new Promise(function(resolve, reject){
				getAjax({
					url: that.restURL,
					dataType: 'text',
					data: {'action': 'uid', 'data': name},
					success: function(data) {
						resolve(Number(data));
					},
					error: function(errObj){
						reject(errObj);
					}
				});
			});
		},
		deleteUID: function(name){
			var that = this;
			return new Promise(function(resolve, reject){
				postputdelAjax({
					type: 'DELETE',
					url: that.restURL,
					data: {'action': 'uid', 'data': name},
					success: function(data) {
						resolve(data);
					},
					error: function(errObj){
						reject(errObj);
					}
				});
			});
		},
		saveEntity: function(entity){
			var that = this;
			return new Promise(function(resolve, reject){
				postputdelAjax({
					type: entity.guid === null ? 'POST' : 'PUT',
					url: that.restURL,
					dataType: 'json',
					data: {'action': 'entity', 'data': JSON.stringify(entity)},
					success: function(data) {
						if (typeof data.guid !== "undefined" && data.guid > 0) {
							resolve(entity.init(data));
						} else {
							reject({textStatus: "Server error"});
						}
					},
					error: function(errObj){
						reject(errObj);
					}
				});
			});
		},
		getEntity: function(){
			var that = this, args = Array.prototype.slice.call(arguments);
			return new Promise(function(resolve, reject){
				that.getEntityData.apply(that, args).then(function(data){
					if (data !== null) {
						resolve(that.initEntity(data));
					} else {
						resolve(null);
					}
				}, function(errObj){
					reject(errObj);
				});
			});
		},
		getEntityData: function(){
			var that = this,
				args = Array.prototype.slice.call(arguments);
			return new Promise(function(resolve, reject){
				getAjax({
					url: that.restURL,
					dataType: 'json',
					data: {'action': 'entity', 'data': JSON.stringify(args)},
					success: function(data) {
						if (typeof data.guid !== "undefined" && data.guid > 0) {
							resolve(data);
						} else {
							resolve(null);
						}
					},
					error: function(errObj){
						reject(errObj);
					}
				});
			});
		},
		getEntities: function(){
			var that = this,
				args = Array.prototype.slice.call(arguments);
			return new Promise(function(resolve, reject){
				getAjax({
					url: that.restURL,
					dataType: 'json',
					data: {'action': 'entities', 'data': JSON.stringify(args)},
					success: function(data) {
						resolve(map(data, that.initEntity));
					},
					error: function(errObj){
						reject(errObj);
					}
				});
			});
		},
		initEntity: function(entityJSON){
			var entity;
			if (typeof entityJSON.class === "string" && typeof window[entityJSON.class] !== "undefined" && typeof window[entityJSON.class].prototype.init === "function") {
				entity = new window[entityJSON.class]();
			} else if (typeof require !== 'undefined' && require('Nymph'+entityJSON.class).prototype.init === "function") {
				entity = new require('Nymph'+entityJSON.class)();
			} else {
				throw new NymphClassNotAvailableError(entityJSON.class+" class cannot be found.");
			}
			return entity.init(entityJSON);
		},
		deleteEntity: function(entity, plural){
			var that = this, cur;
			if (plural) {
				for (var i=0; i<entity.length; i++) {
					cur = entity[i].toJSON();
					cur.etype = entity[i].etype;
					entity[i] = cur;
				}
			} else {
				cur = entity.toJSON();
				cur.etype = entity.etype;
				entity = cur;
			}
			return new Promise(function(resolve, reject){
				postputdelAjax({
					type: 'DELETE',
					url: that.restURL,
					dataType: 'json',
					data: {'action': plural ? 'entities' : 'entity', 'data': JSON.stringify(entity)},
					success: function(data) {
						resolve(data);
					},
					error: function(errObj){
						reject(errObj);
					}
				});
			});
		},
		deleteEntities: function(entities){
			return this.deleteEntity(entities, true);
		},

		updateArray: function(oldArr, newArrIn){
			var newArr = Array.prototype.slice.call(newArrIn);
			var idMap = {};
			for (var i = 0; i < newArr.length; i++) {
				if (newArr[i] instanceof Entity && newArr[i].guid) {
					idMap[newArr[i].guid] = i;
				}
			}
			var remove = [];
			for (var k in oldArr) {
				if (oldArr.hasOwnProperty(k) && /^0$|^[1-9]\d*$/.test(k) && k <= 4294967294) { // This handles sparse arrays.
					k = Number(k);
					if (typeof idMap[oldArr[k].guid] === "undefined") {
						// It was deleted.
						remove.push(k);
					} else if (newArr[idMap[oldArr[k].guid]].mdate > oldArr[k].mdate) {
						// It was modified.
						oldArr[k].init(newArr[idMap[oldArr[k].guid]].toJSON());
						delete idMap[oldArr[k].guid];
					} else if (newArr[idMap[oldArr[k].guid]].mdate === oldArr[k].mdate) {
						// Item wasn't modified.
						delete idMap[oldArr[k].guid];
					}
				}
			}
			// Now we must remove the deleted ones.
			remove.sort().reverse();
			for (var n = 0; n < remove.length; n++) {
				oldArr.splice(remove[n], 1);
			}
			// And add the new ones.
			for (var v in idMap) {
				if (idMap.hasOwnProperty(v)) {
					oldArr.splice(oldArr.length, 0, newArr[idMap[v]]);
				}
			}
		},

		serverCall: function(entity, method, params) {
			var that = this;
			return new Promise(function(resolve, reject){
				postputdelAjax({
					type: 'POST',
					url: that.restURL,
					dataType: 'json',
					data: {'action': 'method', 'data': JSON.stringify({'entity': entity, 'method': method, 'params': params})},
					success: function(data) {
						resolve(data);
					},
					error: function(errObj){
						reject(errObj);
					}
				});
			});
		},

		hsort: function(array, property, parentProperty, caseSensitive, reverse) {
			// First sort by the requested property.
			this.sort(array, property, caseSensitive, reverse);
			if (typeof parentProperty === "undefined" || parentProperty === null) {
				return array;
			}

			// Now sort by children.
			var new_array = [],
				// Look for entities ready to go in order.
				changed, pkey, ancestry, new_key;
			while (array.length) {
				changed = false;
				for (var key=0; key<array.length; key++) {
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
		},
		psort: function(array, property, parentProperty, caseSensitive, reverse) {
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
		},
		sort: function(array, property, caseSensitive, reverse) {
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
	};

	NymphClassNotAvailableError = function(message){
		this.name = 'NymphClassNotAvailableError';
		this.message = message;
		this.stack = (new Error()).stack;
	};
	NymphClassNotAvailableError.prototype = new Error();

	return Nymph.init(NymphOptions);
}));
