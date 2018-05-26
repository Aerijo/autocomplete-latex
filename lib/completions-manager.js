/*

The main class `CompletionRegistry` manages all completions. Completions can be
passed in as an object when the class is initialised, and can be added later
with dedicated methods. These completions should also be objects, of the form

{
  identifier: data,
  ...
}

where identifier is something like the package name (e.g., siunitx), or the common function of
the grouped completions (e.g., text formatting like bold, italic, emph).

data should be an object with the same structure as a regular provider, so
{
  "scopes": {
    "type": [
      {
        "displayText": "...",
        "snippet": "..."
      }
    ]
  }
}

The goal of this class is to gather all the sets of completions in one place and be able to
construct the corresponding provider according to which sets are activated.

*/

const { ScopeSelector } = require("first-mate");
const { mergeCompletionObjects, stringToSelector } = require("./scope-tools");

class CompletionRegistry {
  constructor(completionsProviders = {}) {
    if (typeof completionsProviders !== "object") { throw "CompletionRegistry can only take an object!"; }
    this.completionsProviders = completionsProviders;
    this.enabledProviders = new Set(); // all others are disabled by default
    this.activeCompletions = {};
  }

  deserialize(data) {
    this.completionsProviders = data.completionsProviders;
    this.enabledProviders = new Set(data.enabledProviders);
  }

  serialize() {
    return {
      completionsProviders: this.completionsProviders,
      enabledProviders: this.enabledProviders
    };
  }

  // An identifier is a name for a group of completions
  // E.g., `siunitx` or `amsmath`
  // `data` is then the object with scope selectors and such
  addCompletion(identifier, data, enable = true) {
    if (this.completionsProviders[identifier] !== undefined) {
      console.warn(`The ${identifier} identifier is already present! The old value has been overridden.`);
    }
    this.completionsProviders[identifier] = data;
    if (enable) { this.enabledProviders.add(identifier); }
  }

  addCompletionGroup(completionsObject, enabledGroups) {
    for (let i in completionsObject) {
      if(enabledGroups[i] === false) {
        continue;
      }
      this.addCompletion(i, completionsObject[i], true);
    }
  }

  removeCompletion(identifier) {
    this.completionsProviders[identifier] = undefined;
    this.enabledProviders.delete(identifier);
  }

  enableCompletion(identifier) {
    this.enabledProviders.add(identifier);
  }

  disableCompletion(identifier) {
    this.enabledProviders.delete(identifier);
  }

  generateCompletions() {
    let completions = {}; // this will be the final product

    this.enabledProviders.forEach((identifier) => {
      completions = mergeCompletionObjects(completions, this.completionsProviders[identifier]);
    });

    this.activeCompletions = completions;
    this.activeScopeSelectors = this.generateScopeSelectors();

    return completions;
  }

  generateScopeSelectors() {
    let stringToSelectorMap = new Map();
    for (let key in this.activeCompletions) {
      stringToSelectorMap.set(stringToSelector(key), this.activeCompletions[key]);
    }
    return stringToSelectorMap;
  }

  empty() {
    this.completionsProviders = {};
    this.enabledProviders = new Set();
  }
}

module.exports = { CompletionRegistry };
