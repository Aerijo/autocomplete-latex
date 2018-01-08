const fs = require("fs");       // inbuilt nodejs file system tool
const path = require("path");   // inbuilt nodejs file path tool
const _ = require("lodash");    // miscellaneous useful functions
const fz = require("fuzzaldrin-plus"); // for sorting of array entries based on some value
const { parseScopeString, scopesMatch, mergeCompletionObjects } = require("./scope-tools");
const { CacheManager } = require("./cache-manager");
const DEFAULT_COMPLETIONS = require("./resources/completions.json");
var USER_COMPLETIONS = {};
var COMPLETIONS = {};

module.exports = { // deliberately chosen `undefined` for config properties problems to fail fast if not set by loadProperties()
  // See https://github.com/atom/autocomplete-plus/wiki/Provider-API
  scopeSelector: ".text.tex.latex",
  disableForScopeSelector: undefined,
  inclusionPriority: 1,
  excludeLowerPriority: true,
  suggestionPriority: 2,
  filterSuggestions: false, // doesn't play well with custom prefix. Manually done with `fuzzaldrin-plus`

  minPrefixLength: undefined,
  prefixRegex: undefined,
  citations: undefined,
  citationControlWord: "autocite",
  cache: undefined, // set up in this.loadProperties

  serialize() {
    return {
      cache: this.cache.serialize()
    };
  },

  deserialize(state) {
      this.cache = new CacheManager();
      if (state && state.cache) {
        this.cache.deserialize(state.cache);
      }
  },

  loadProperties() {
    if (!this.cache) { this.cache = new CacheManager(); }

    // get config values
    this.prefixRegex =  new RegExp(atom.config.get("autocomplete-latex.commandCompletionRegex"));
    this.citationPrefixRegex =  new RegExp(atom.config.get("autocomplete-latex.citationCompletionRegex"));
    this.disableForScopeSelector = atom.config.get("autocomplete-latex.disableForScopeSelector");
    this.minPrefixLength = atom.config.get("autocomplete-latex.minPrefixLength");
    this.citations = atom.config.get("autocomplete-latex.enableCitationCompletions");
    this.excludeLowerPriority = !atom.config.get("autocomplete-latex.enableBuiltinProvider");
    let userCiteWord = atom.config.get("autocomplete-latex.citationControlWord");
    if (userCiteWord) { this.citationControlWord = userCiteWord; }

    // label all default completions accordingly
    for (let scope in DEFAULT_COMPLETIONS) {
      for (let type in DEFAULT_COMPLETIONS[scope]) {
        for (let i = 0; i < DEFAULT_COMPLETIONS[scope][type].length; i++) {
          DEFAULT_COMPLETIONS[scope][type][i].isDefault = true;
        }
      }
    }

    // try to find user completions
    let pathToUserCompletions = atom.config.get("autocomplete-latex.userCompletionsPath");
    if (pathToUserCompletions) {
      pathToUserCompletions = path.resolve(pathToUserCompletions);
    }
    if (fs.existsSync(pathToUserCompletions)) { // if it can find the file
      try {
        let metaData = fs.statSync(pathToUserCompletions);
        if (!this.cache.hasCurrentCache(pathToUserCompletions, metaData)) {
          USER_COMPLETIONS = require(pathToUserCompletions);
          this.cache.setCache(pathToUserCompletions, USER_COMPLETIONS, metaData);
        }
      }
      catch (err) {
        atom.notifications.addWarning(`\`autocomplete-latex\`\nFailed to read user completions.\n- ${err}`, {dismissable: true});
        USER_COMPLETIONS = {};
      }
    } else {
      console.log("cannot find user completions file");
    }

    // merges user + default completions according to settings
    if (atom.config.get("autocomplete-latex.enableDefaultCompletions")) {
      COMPLETIONS = mergeCompletionObjects(USER_COMPLETIONS, DEFAULT_COMPLETIONS);
    } else {
      COMPLETIONS = USER_COMPLETIONS;
    }
  },

  getSuggestions({editor, bufferPosition, scopeDescriptor}) { // autocalled by `autocomplete-plus`
    // generate prefix and return if not long enough
    this.prefix = this.getPrefix(editor, bufferPosition);
    if (this.prefix.length < this.minPrefixLength) { return; }

    if (this.prefix[0] === "@") {
      return this.citationCompletions(this.prefix, editor);
    }

    var completions = [];
    if (this.cache.hasCache(scopeDescriptor.scopes.join("|"))) {
      console.log("has this cached!");
      debugger;
      completions = this.cache.getCache(scopeDescriptor.scopes.join("|"));

    } else {
      console.log("not cached :(");
      for (let scope in COMPLETIONS) {
        if (!scopesMatch(parseScopeString(scope), scopeDescriptor.scopes)) { continue; }
        for (let compType in COMPLETIONS[scope]) {
          for (let i = 0; i < COMPLETIONS[scope][compType].length; i++) {
            suggestion = COMPLETIONS[scope][compType][i];
            if (suggestion.displayText[0] !== this.prefix[0]) { continue; } // separates based on `\` vs `!` or any other prefix char.
            completions.push({
              text: suggestion.text, // OR
              snippet: suggestion.snippet,
              displayText: suggestion.displayText || suggestion.prefix, // allows explicit setting of what UI shows. Defaults to prefix if not provided (prefix is deprecated)
              // replacementPrefix: suggestion.replacementPrefix || this.prefix, // is used to delete the existing characters. Useless with caching.
              type: suggestion.type || compType,
              leftLabel: suggestion.leftLabel,
              leftLabelHTML: suggestion.leftlabelHTML,
              rightLabel: suggestion.rightlabel,
              rightLabelHTML: suggestion.rightLabelHTML,
              className: suggestion.className,
              iconHTML: suggestion.iconHTML,
              description: suggestion.description,
              descriptionMoreURL: suggestion.descriptionMoreURL,
              characterMatchIndices: suggestion.characterMatchIndices,
              isDefault: suggestion.isDefault || false
            });
          }
        }
      }
      this.cache.setCache(scopeDescriptor.scopes.join("|"), completions);
    }

    // Short list the candidates
    completions = fz.filter(completions, this.prefix, {key:"displayText"});
    completions = _.uniqBy(completions, (e) => { return e.displayText; });

    // Fix the replacementPrefix for all that's left
    for (let i = 0; i < completions.length; i++) {
      completions[i].replacementPrefix = this.prefix;
    }
    return completions;
  },

  getPrefix(editor, bufferPosition) {
    let line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
    let match = line.match(this.prefixRegex); // returns array with the entire match as first element
    if (match) {
      return match[0];
    } else if (this.citations && (match = line.match(this.citationPrefixRegex))) {
      return match[0];
    } else {
      return "";
    }
  }
};
