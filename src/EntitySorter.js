'use strict';

import { Nymph } from './Nymph';

export class EntitySorter {
  constructor(array) {
    this.array = array;
    this.sortProperty = null;
    this.sortParent = null;
    this.sortCaseSensitive = null;
  }

  _arraySortProperty(a, b) {
    let aprop;
    let bprop;
    let property = this.sortProperty;
    let parent = this.sortParent;
    let notData =
      property === 'guid' || property === 'cdate' || property === 'mdate';
    if (
      parent != null &&
      ((a.data[parent] instanceof Nymph.getEntityClass('Nymph\\Entity') &&
        typeof (notData
          ? a.data[parent][property]
          : a.data[parent].data[property]) !== 'undefined') ||
        (b.data[parent] instanceof Nymph.getEntityClass('Nymph\\Entity') &&
          typeof (notData
            ? b.data[parent][property]
            : b.data[parent].data[property]) !== 'undefined'))
    ) {
      if (
        !this.sortCaseSensitive &&
        typeof (notData
          ? a.data[parent][property]
          : a.data[parent].data[property]) === 'string' &&
        typeof (notData
          ? b.data[parent][property]
          : b.data[parent].data[property]) === 'string'
      ) {
        aprop = (notData
          ? a.data[parent][property]
          : a.data[parent].data[property]
        ).toUpperCase();
        bprop = (notData
          ? b.data[parent][property]
          : b.data[parent].data[property]
        ).toUpperCase();
        if (aprop !== bprop) {
          return aprop.localeCompare(bprop);
        }
      } else {
        if (
          (notData ? a.data[parent][property] : a.data[parent].data[property]) >
          (notData ? b.data[parent][property] : b.data[parent].data[property])
        ) {
          return 1;
        }
        if (
          (notData ? a.data[parent][property] : a.data[parent].data[property]) <
          (notData ? b.data[parent][property] : b.data[parent].data[property])
        ) {
          return -1;
        }
      }
    }
    // If they have the same parent, order them by their own property.
    if (
      !this.sortCaseSensitive &&
      typeof (notData ? a[property] : a.data[property]) === 'string' &&
      typeof (notData ? b[property] : b.data[property]) === 'string'
    ) {
      aprop = (notData ? a[property] : a.data[property]).toUpperCase();
      bprop = (notData ? b[property] : b.data[property]).toUpperCase();
      return aprop.localeCompare(bprop);
    } else {
      if (
        (notData ? a[property] : a.data[property]) >
        (notData ? b[property] : b.data[property])
      ) {
        return 1;
      }
      if (
        (notData ? a[property] : a.data[property]) <
        (notData ? b[property] : b.data[property])
      ) {
        return -1;
      }
    }
    return 0;
  }

  hsort(property, parentProperty, caseSensitive, reverse) {
    // First sort by the requested property.
    this.sort(this.array, property, caseSensitive, reverse);
    if (typeof parentProperty === 'undefined' || parentProperty === null) {
      return this.array;
    }

    // Now sort by children.
    let newArray = [];
    // Look for entities ready to go in order.
    let changed, pkey, ancestry, newKey;
    while (this.array.length) {
      changed = false;
      for (let key = 0; key < this.array.length; key++) {
        // Must break after adding one, so any following children don't go in
        // the wrong order.
        if (
          typeof this.array[key].data[parentProperty] === 'undefined' ||
          this.array[key].data[parentProperty] === null ||
          typeof this.array[key].data[parentProperty].inArray !== 'function' ||
          !this.array[key].data[parentProperty].inArray(
            newArray.concat(this.array)
          )
        ) {
          // If they have no parent (or their parent isn't in the array), they
          // go on the end.
          newArray.push(this.array[key]);
          this.array.splice(key, 1);
          changed = true;
          break;
        } else {
          // Else find the parent.
          pkey = this.array[key].data[parentProperty].arraySearch(newArray);
          if (pkey !== false) {
            // And insert after the parent.
            // This makes entities go to the end of the child list.
            ancestry = [this.array[key].data[parentProperty].guid];
            newKey = Number(pkey);
            while (
              typeof newArray[newKey + 1] !== 'undefined' &&
              typeof newArray[newKey + 1].data[parentProperty] !==
                'undefined' &&
              newArray[newKey + 1].data[parentProperty] !== null &&
              ancestry.indexOf(
                newArray[newKey + 1].data[parentProperty].guid
              ) !== -1
            ) {
              ancestry.push(newArray[newKey + 1].guid);
              newKey += 1;
            }
            // Where to place the entity.
            newKey += 1;
            if (typeof newArray[newKey] !== 'undefined') {
              // If it already exists, we have to splice it in.
              newArray.splice(newKey, 0, this.array[key]);
            } else {
              // Else just add it.
              newArray.push(this.array[key]);
            }
            this.array.splice(key, 1);
            changed = true;
            break;
          }
        }
      }
      if (!changed) {
        // If there are any unexpected errors and the array isn't changed, just
        // stick the rest on the end.
        if (this.array.length) {
          newArray = newArray.concat(this.array);
          this.array = [];
        }
      }
    }
    // Now push the new array out.
    this.array = newArray;
    return this.array;
  }

  psort(property, parentProperty, caseSensitive, reverse) {
    // Sort by the requested property.
    if (typeof property !== 'undefined') {
      this.sortProperty = property;
      this.sortParent = parentProperty;
      this.sortCaseSensitive = !!caseSensitive;
      this.array.sort(this._arraySortProperty.bind(this));
    }
    if (reverse) {
      this.array.reverse();
    }
    return this.array;
  }

  sort(property, caseSensitive, reverse) {
    // Sort by the requested property.
    if (typeof property !== 'undefined') {
      this.sortProperty = property;
      this.sortParent = null;
      this.sortCaseSensitive = !!caseSensitive;
      this.array.sort(this._arraySortProperty.bind(this));
    }
    if (reverse) {
      this.array.reverse();
    }
    return this.array;
  }
}

export default EntitySorter;
