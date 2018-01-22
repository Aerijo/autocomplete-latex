const fs = require("fs");       // inbuilt nodejs file system tool
const path = require("path");   // inbuilt nodejs file path tool
const _ = require("lodash");    // miscellaneous useful functions
const fz = require("fuzzaldrin-plus"); // for sorting of array entries based on some value
const { parseScopeString, scopesMatch, mergeCompletionObjects } = require("./scope-tools");
const { citationCompletions } = require("./bib-tools");
const { CacheManager } = require("./cache-manager");
const { CompletionRegistry } = require("./completions-manager")
var DEFAULT_COMPLETIONS = require("./resources/completions.json");
const DEFAULT_COMPLETIONS_TRIAL = require("./resources/completionsOrdered.json");
var USER_COMPLETIONS = {};
var COMPLETIONS = {};

const { packageCompletions } = require("./package-tools");

module.exports = { // deliberately chosen `null` for config properties problems to fail fast if not set by loadProperties()
  // See https://github.com/atom/autocomplete-plus/wiki/Provider-API
  scopeSelector: ".text.tex.latex",
  disableForScopeSelector: null,
  inclusionPriority: 1,
  excludeLowerPriority: true,
  suggestionPriority: 2,
  filterSuggestions: false, // doesn't play well with custom prefix. Manually done with `fuzzaldrin-plus`

  minPrefixLength: null,
  prefixRegex: null,
  citations: null,
  citationControlWord: "autocite",
  cache: null, // set up in this.loadProperties
  packageCache: null, // the package completions are cached, but not serialised.

  serialize() {
    return {
      cache: this.cache.serialize(),
      completionRegistry: this.completionRegistry.serialize()
    };
  },

  deserialize(state) {
      this.cache = new CacheManager();
      if (state && state.cache) {
        this.cache.deserialize(state.cache);
      }
      this.completionRegistry = new CompletionRegistry();
      if (state && state.completionRegistry) {
        this.completionRegistry.deserialize(state.completionRegistry);
      }
  },

  loadProperties() {
    if (!this.cache) { this.cache = new CacheManager(); }
    if (!this.completionRegistry) {
      this.completionRegistry = new CompletionRegistry();
      this.completionRegistry.addCompletionGroup(DEFAULT_COMPLETIONS_TRIAL);
    }

    this.packageCache = new CacheManager();

    DEFAULT_COMPLETIONS = this.completionRegistry.generateCompletions();

    // get config values
    this.prefixRegex =  new RegExp(atom.config.get("autocomplete-latex.commandCompletionRegex"));
    this.citationPrefixRegex =  new RegExp(atom.config.get("autocomplete-latex.citationCompletionRegex"));
    this.disableForScopeSelector = atom.config.get("autocomplete-latex.disableForScopeSelector");
    this.minPrefixLength = atom.config.get("autocomplete-latex.minPrefixLength");
    this.citations = atom.config.get("autocomplete-latex.enableCitationCompletions");
    this.excludeLowerPriority = !atom.config.get("autocomplete-latex.enableBuiltinProvider");
    this.packageCompletions = atom.config.get("autocomplete-latex.enablePackageCompletions");

    /*
    // label all default completions accordingly - NOT USED
    for (let scope in DEFAULT_COMPLETIONS) {
      for (let type in DEFAULT_COMPLETIONS[scope]) {
        for (let i = 0; i < DEFAULT_COMPLETIONS[scope][type].length; i++) {
          DEFAULT_COMPLETIONS[scope][type][i].isDefault = true;
        }
      }
    }
    */

    // try to find user completions
    let pathToUserCompletions = atom.config.get("autocomplete-latex.userCompletionsPath");
    if (pathToUserCompletions) {
      pathToUserCompletions = path.resolve(pathToUserCompletions);
    }
    if (fs.existsSync(pathToUserCompletions)) { // if it can find the file
      try {
        let metaData = JSON.parse(JSON.stringify(fs.statSync(pathToUserCompletions))); // to make the data serialisable
        if (!this.cache.hasCurrentCache(pathToUserCompletions, metaData)) {
          USER_COMPLETIONS = require(pathToUserCompletions);
          this.cache.empty(); // clears out old completions
          this.cache.setCache(pathToUserCompletions, USER_COMPLETIONS, metaData);
        } else {
          // NOTE: caching here is kind of pointless, given it'll be reading the cached data from a file anyway.
          // It will be better when the merged object is cached, so the spaghetti code can be bypassed.
          USER_COMPLETIONS = this.cache.getCache(pathToUserCompletions);
        }
      }
      catch (err) {
        atom.notifications.addWarning(`\`autocomplete-latex\`\nFailed to read user completions.\n- ${err}`, {dismissable: true});
        USER_COMPLETIONS = {};
      }
    }

    // merges user + default completions according to settings
    if (atom.config.get("autocomplete-latex.enableDefaultCompletions")) {
      COMPLETIONS = mergeCompletionObjects(USER_COMPLETIONS, DEFAULT_COMPLETIONS);
    } else {
      COMPLETIONS = USER_COMPLETIONS;
    }
  },

  getSuggestions({editor, bufferPosition, scopeDescriptor}) { // autocalled by `autocomplete-plus`
    // TODO: clean up this function.
    let line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);

    if (this.packageCompletions && this.isUsePackage(line)) {
      // changes made to the cache by this function persist.
      return packageCompletions(this.packagePrefix, this.packageCache);
    }


    // generate prefix and return if not long enough
    this.prefix = this.getPrefix(line);
    if (this.prefix.length < this.minPrefixLength && this.prefix[0] !== "$") { return; }

    if (this.prefix[0] === "@") {
      return citationCompletions(this.prefix, editor);
    }

    // Throwaway all parts after a general scope; allows user specific syntax
    // highlighting rules, without making the cache useless.
    scopeDescriptor.scopes = scopeDescriptor.scopes.map(scope => scope.split(".general")[0]);

    var completions = [];
    if (this.cache.hasCache(scopeDescriptor.scopes.join("|"))) { // join character is arbitrary; may need to change if | is used in future scope rules
      completions = this.cache.getCache(scopeDescriptor.scopes.join("|"));
    } else {
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

    // Fix the replacementPrefix for all that's left.
    // Needed, as the cached values have the wrong replacement prefix.
    for (let i = 0; i < completions.length; i++) {
      completions[i].replacementPrefix = this.prefix;
    }
    return completions;
  },

  isUsePackage(line) {
    let match = line.match(/\\usepackage\{([a-zA-Z\-\d]+)$/); // returns array with the entire match as first element
    if (match) {
      this.packagePrefix = match[1];
      return true;
    } else {
      return false;
    }
  },

  getPrefix(line) {
    let match = line.match(this.prefixRegex); // returns array with the entire match as first element
    if (match) {
      return match[0];
    } else if (this.citations && (match = line.match(this.citationPrefixRegex))) {
      return match[0];
    } else if (!!(match = line.match(/\${1,2}$/)) === true) {
      return match[0];
    } else {
      return "";
    }
  }
};
