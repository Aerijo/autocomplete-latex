const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const { ScopeSelector } = require("first-mate");

/*
  This class centralises the caching of files & completions.
  A typical instance will have:
    1. A map between keys and cached values + meta data
      1.1 The map will take the form {key: {value, metaData}}
    2. Tools to detect if the cache needs to be updated
*/
class CacheManager {
  constructor() {
    this.map = new Map();
  }

  serialize() {
    // if (this.map.size > 20) {
    //   for (let i; i < this.map.size - 20; i++) {
    //
    //   }
    // }
    return JSON.stringify([...this.map]);
  }

  deserialize(state) {
    this.map = new Map(JSON.parse(state));
  }

  /*
    Checks if the current cache is up to date.
    Uses the metaData object to find things like the
    last time the file was changed.

    metaData should be the object returned by fs.statSync,
    and have all of it's corresponding properties.
  */
  hasCurrentCache(key, metaData) {
    if (!this.map.has(key)) { return false; }

    let currentMetaData = this.map.get(key).metaData;
    if (metaData.mtime !== currentMetaData.mtime) { return false; }

    return true; // getting here means passing all other checks
  }

  /* Does not check if the cache is current */
  hasCache(key) {
    return this.map.has(key);
  }

  getArrayCache(key) {
    for (let keyVal of this.map.entries()) {
      if (_.isEqual(key, keyVal[0])) {
        return keyVal[1].value;
      }
    }
    return false;
  }

  getCache(key) {
    return this.map.get(key).value;
  }

  clearEntry(key) {
    this.map.set(key, undefined);
  }

  setCache(key, value, metaData) {
    this.map.set(key, {value, metaData});
  }

  empty() {
    this.map = new Map();
  }
}

module.exports = { CacheManager };
