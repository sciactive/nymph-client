import { Entity } from './Entity';

// Save referenced entities in an entity's data.
export function saveEntities(entity) {
  let savedEntities = {};

  for (let [key, value] of Object.entries(entity.$data)) {
    addEntitiesToObject(value, savedEntities);
  }

  return savedEntities;
}

const addEntitiesToObject = (item, entitiesObject) => {
  if (item instanceof Entity && !item.$isASleepingReference) {
    // Convert entities to references.
    entitiesObject[item.guid] = item;
  } else if (Array.isArray(item)) {
    // Recurse into lower arrays.
    item.forEach(item => addEntitiesToObject(item, entitiesObject));
  } else if (item instanceof Object) {
    for (let [key, value] of Object.entries(item)) {
      addEntitiesToObject(value, entitiesObject);
    }
  }
};

// Restore referenced entities into an entity's data.
// Returns true if there are any sleeping references still in the entity's data
// after the restore.
export function restoreEntities(entity, savedEntities) {
  let data = {
    containsSleepingReference: false,
  };

  for (let [key, value] of Object.entries(entity.$data)) {
    entity.$data[key] = retoreEntitiesFromObject(value, savedEntities, data);
  }

  return data.containsSleepingReference;
}

const retoreEntitiesFromObject = (item, entitiesObject, data) => {
  if (item instanceof Entity) {
    if (item.$isASleepingReference) {
      if (entitiesObject.hasOwnProperty(item.guid)) {
        return entitiesObject[item.guid];
      } else {
        // Couldn't find the entity in saved entities.
        data.containsSleepingReference = true;
        return item;
      }
    } else {
      // Leave entities alone.
      return item;
    }
  } else if (Array.isArray(item)) {
    // Recurse into lower arrays.
    return item.map(item =>
      retoreEntitiesFromObject(item, entitiesObject, data)
    );
  } else if (item instanceof Object) {
    for (let [key, value] of Object.entries(item)) {
      item[key] = retoreEntitiesFromObject(value, entitiesObject, data);
    }
    return item;
  }
  // Not an array, just return it.
  return item;
};
