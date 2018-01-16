/*

The main class `CompletionRegistry` manages all completions. Completions can be
passed in as an object when the class is initialised, and can be added later
with dedicated methods. These completions should also be objects, of the form

{
  identifier: {data},
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

let { mergeCompletionObjects } = require("./scope-tools");

class CompletionRegistry {
  constructor(completionsProviders = {}) {
    if (typeof completionsProviders !== "object") { throw "CompletionRegistry can only take an object!"; }
    this.completionsProviders = completionsProviders;
    this.enabledProviders = new Set(); // all others are disabled by default
  }

  deserialize(data) {
    this.completionsProviders = data.completionsProviders;
    this.enabledProviders = new Set(data.enabledProviders);
  }

  serialize() {
    return {
      completionsProviders: this.completionsProviders,
      enabledProviders: this.enabledProviders
    }
  }

  addCompletion(identifier, data, enable = true) {
    if (this.completionsProviders[identifier] !== undefined) {
      console.log(`The ${identifier} identifier is already present! The old value will be overridden.`);
      this.enabledProviders.delete(identifier);
    }
    this.completionsProviders[identifier] = data;
    if (enable) { this.enabledProviders.add(identifier); }
  }

  addCompletionGroup(completionsObject, enable = true) {
    for (let i in completionsObject) {
      this.addCompletion(i, completionsObject[i], enable);
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

    return completions;
  }

  empty() {
    this.completionsProviders = {};
    this.enabledProviders = new Set();
  }
}

module.exports = { CompletionRegistry };
