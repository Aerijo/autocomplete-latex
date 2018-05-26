const fs = require("fs");       // inbuilt nodejs file system tool
const path = require("path");   // inbuilt nodejs file path tool
const _ = require("lodash");    // miscellaneous useful functions
const fz = require("fuzzaldrin-plus"); // for sorting of array entries based on some value
const CSON = require("season"); // support CSON files as well

const { Emitter } = require("atom");
const { scopesMatch, mergeCompletionObjects } = require("./scope-tools");
const { citationCompletions } = require("./bib-tools");
const { CacheManager } = require("./cache-manager"); // for caching the completions after they've been merged and sorted
const { CompletionRegistry } = require("./completions-manager"); // for storing completions
const { getPackageCompletions } = require("./package-tools");

var defaultRawCompletions = {};
var userCompletions = {};
var activeCompletions = {};

module.exports = {
  /*
    autocomplete-plus properties
     - deliberately chosen `null` for config properties to fail fast if not set by loadProperties()
     - See https://github.com/atom/autocomplete-plus/wiki/Provider-API for more
  */
  scopeSelector: ".text.tex.latex",
  disableForScopeSelector: null,
  inclusionPriority: 1,
  excludeLowerPriority: true,
  suggestionPriority: 2,
  filterSuggestions: false, // doesn't play well with custom prefix. Filtering is done manually with `fuzzaldrin-plus`

  /*
    locally used properties: (not for autocomplete-plus)
  */
  minPrefixLength: null,
  prefixRegex: null,
  citations: null,
  cache: null,
  packageCache: null,
  emitter: new Emitter(),

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
    this.scopeStringtoCompletion    = new CacheManager(); // for general completions
    this.scopeSelectorstoCompletion = new CacheManager();
    this.packageCache               = new CacheManager(); // for package names
    this.completionRegistry         = new CompletionRegistry(); // holds the sets of completions, is used to generate

    // get config values
    this.prefixRegex             =  new RegExp(atom.config.get("autocomplete-latex.commandCompletionRegex"));
    this.citationPrefixRegex     =  new RegExp(atom.config.get("autocomplete-latex.citationCompletionRegex"));
    this.disableForScopeSelector = atom.config.get("autocomplete-latex.disableForScopeSelector");
    this.minPrefixLength         = atom.config.get("autocomplete-latex.minPrefixLength");
    this.citations               = atom.config.get("autocomplete-latex.enableCitationCompletions");
    this.excludeLowerPriority    = !atom.config.get("autocomplete-latex.enableBuiltinProvider");
    this.packageCompletions      = atom.config.get("autocomplete-latex.enablePackageCompletions");
    this.enabledPackagesList            = atom.config.get("autocomplete-latex.enabledDefaultCompletions");

    this.lastScopeString = "";
    this.lastCompletions = {};

    // try to find user completions
    let pathToUserCompletions = this.getUserCompletionsPath();
    if (fs.existsSync(pathToUserCompletions)) { // if it can find the file
      try {
        if (path.extname(pathToUserCompletions) === ".cson") {
          userRawCompletions = CSON.readFileSync(pathToUserCompletions);
        } else {
          userRawCompletions = require(pathToUserCompletions);
        }

        /*
          Here we check which version of the completion API the user is using
          - if a (potentially random) key starts with a `.` : use the old API
          - if not : use the new one
        */
        if (Object.getOwnPropertyNames(userRawCompletions)[0][0] === ".") {
          this.completionRegistry.addCompletion("userCompletions", userRawCompletions);
        } else {
          this.completionRegistry.addCompletionGroup(userRawCompletions, {}); // needs work / {} means no packages have been disabled/enabled
        }
      }
      catch (err) {
        atom.notifications.addWarning(`\`autocomplete-latex\`\nFailed to read user completions.\n- ${err}`, {dismissable: true});
      }
    }

    if (atom.config.get("autocomplete-latex.enableDefaultCompletions")) {
      defaultRawCompletions = require("./resources/completionsOrdered.json");
      this.completionRegistry.addCompletionGroup(defaultRawCompletions, this.enabledPackagesList);
    }

    /*
      activeCompletions is used in `getSuggestion` as a static list of completions,
      sorted by the nested properties: group -> scope -> type -> completion
    */
    activeCompletions = this.completionRegistry.generateCompletions();
  },

  getUserCompletionsPath() {
    let pathToUserCompletions = atom.config.get("autocomplete-latex.userCompletionsPath");
    if (!pathToUserCompletions) { return; }

    if (pathToUserCompletions[0] === '~') {
      pathToUserCompletions = path.join(process.env.HOME, pathToUserCompletions.slice(1));
    }

    return path.resolve(pathToUserCompletions);
  },

  getSuggestions({editor, bufferPosition, scopeDescriptor}) { // autocalled by `autocomplete-plus`
    return new Promise((resolve) => { // reject is not supported
      // First we get the line to the left of the cursor
      // But we only get up to the previous 100 characters
      let line = editor.getTextInRange([[bufferPosition.row, Math.max(0, bufferPosition.column - 100)], bufferPosition]);

      // Then we check if it's part of a package definition
      // If it is, we return the package names (or start the process to gather them)
      if (this.packageCompletions && this.isUsePackage(line, editor, bufferPosition)) {
        resolve(getPackageCompletions(this.packagePrefix, this.packageCache, this.emitter));
      }

      // If the previous checks didn't match, we make a list of completions based on prefix & scope
      let prefix = this.getPrefix(line);
      let prefixFirstChar = prefix[0]; // used to filter out types of completion

      // Stop here if the prefix is too short
      // Special exception for $ because I want to treat it like a normal completion, but a single $ would normally be too short.
      if (prefix.length < this.minPrefixLength && prefixFirstChar !== "$") { resolve([]); }

      // Check if it's a reference we want; this could potentially go above the min length cutoff
      if (prefixFirstChar === "@") {
        resolve(citationCompletions(prefix, editor));
      }

      // Gather completions. Caching and such is also handled inside this method
      let completions = this.getCompletionsForScopeDescriptor(scopeDescriptor);
      this.lastCompletions = completions;

      // _.filter returns a new array, so the original (and cached) completions are unmodified
      // Here we filter out completions that don't match the starting char
      completions = _.filter(completions, (obj) => {
        if (obj.displayText[0] === prefixFirstChar) { return true; }
      });

      // Short list the remaining candidates & remove duplicates
      completions = fz.filter(completions, prefix, {key:"displayText"});
      completions = _.uniqBy(completions, (e) => { return e.displayText; });

      // Fix the replacementPrefix for all that's left
      for (let i = 0; i < completions.length; i++) {
        completions[i].replacementPrefix = prefix;
      }
      resolve(completions);
    });
  },

  getCompletionsForScopeDescriptor(scopeDescriptor) {
    /*
    So we want to test the scopeDescriptor against a list of already recognised scopeSelectors
    If one matches, then the cached completions associated with that selector are used.
    */

    let scopeArray = scopeDescriptor.scopes;
    let scopeString = scopeDescriptor.getScopeChain();

    if (this.lastScopeString === scopeString) {
      return this.lastCompletions;
    } else {
      this.lastScopeString = scopeString;
    }

    if (this.scopeStringtoCompletion.hasCache(scopeString)) {
      return this.scopeStringtoCompletion.getCache(scopeString);
    }

    let activeSelectors = this.completionRegistry.activeScopeSelectors;
    let matchedSelectors = [];
    activeSelectors.forEach((value, selector) => {
      if (selector.matches(scopeArray)) {
        matchedSelectors.push(selector.toCssSelector());
      }
    });
    let cachedBuild = this.scopeSelectorstoCompletion.getArrayCache(matchedSelectors);
    if (cachedBuild) {
      this.scopeStringtoCompletion.setCache(scopeString, cachedBuild);
      return cachedBuild;
    } else {
      let completions = this.buildCompletions(scopeDescriptor);
      this.scopeStringtoCompletion.setCache(scopeString, completions);
      this.scopeSelectorstoCompletion.setCache(matchedSelectors, completions);
      return completions;
    }
  },

  buildCompletions(scopeDescriptor) {
    let completions = [];
    for (let scope in activeCompletions) {
      if (!scopesMatch(scope, scopeDescriptor)) { continue; }
      for (let compType in activeCompletions[scope]) {
        for (let i = 0; i < activeCompletions[scope][compType].length; i++) {
          suggestion = activeCompletions[scope][compType][i];
          completions.push({
            // mostly all scopes recognised by autocomplete-plus are here
            // replacementPrefix is left out because I can't think of a reason to need it.
            text: suggestion.text, // OR
            snippet: suggestion.snippet,
            displayText: suggestion.displayText || suggestion.prefix, // allows explicit setting of what UI shows. Defaults to prefix if not provided (prefix is deprecated)
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
    return completions;
  },

  isUsePackage(line, editor, point) {
    let match = line.match(/\\usepackage\{([a-zA-Z\-\d]+)$/); // returns array with the entire match as first element
    if (match) {
      this.packagePrefix = match[1];
      return true;
    } else {
      // check if the grammar package marks this as a package entry
      let scopes = editor.scopeDescriptorForBufferPosition(point.translate([0,-1])).getScopesArray();
      let includes = scopes.includes("support.class.latex", 1); // first index is always root scope, so skip it
      if (includes) {
        this.packagePrefix = line.match(/\{([a-zA-Z\-\d]+)?$/)[1];
      }
      return includes;
    }
  },

  getPrefix(line) {
    let match = line.match(this.prefixRegex); // returns array with the entire match as first element
    if (match) {
      return match[0];
    }

    match = line.match(this.citationPrefixRegex);
    if (match && this.citations) {
      return match[0];
    }

    match = line.match(/(?:^|[^\\])(\${1,2})$/);
    if (match) {
      return match[1];
    }

    return "";
  },

  regenerateCompletions(msg=false) {
    this.emitter.emit("begin-regenerate-completions");
    this.loadProperties();
    this.emitter.emit("end-regenerate-completions");
    if (msg) {atom.notifications.addSuccess("You may need to reload Atom for changes to take effect");}
  }
};
