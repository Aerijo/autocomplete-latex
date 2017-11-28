const fs = require("fs");
const path = require("path");
const fz = require("fuzzaldrin-plus");
const { parseScopeString, scopesMatch } = require("./scope-tools");
const DEFAULT_COMPLETIONS = require("./resources/completions.json");
var USER_COMPLETIONS = {};
var COMPLETIONS = {};

module.exports = {
  scopeSelector: ".text.tex.latex",
  disableForScopeSelector: atom.config.get("autocomplete-latex.disableForScopeSelector"), // not working right now
  inclusionPriority: 1,
  excludeLowerPriority: true,
  suggestionPriority: 2,
  filterSuggestions: false, // doesn't play well with custom prefix
  minPrefixLength: 100, // actual value set in loadProperties
  // enableDefaultCompletions: atom.config.get("autocomplete-latex.enableDefaultCompletions"),

  prefixRegex: /[\\\!][a-zA-Z]*$/, // all prefixes start with a single `\` or `!` (!TEX) followed by letters ($ marks cursor position)

  loadProperties() {
    let pathToUserCompletions = path.resolve(atom.config.get("autocomplete-latex.userCompletionsPath"));

    if (fs.existsSync(pathToUserCompletions)) { // if it can find the file
      try {
        USER_COMPLETIONS = require(pathToUserCompletions);
      }
      catch (err) {
        atom.notifications.addError(`\`autocomplete-latex\`\nFailed to read user completions.\n- ${err}`, {dismissable: true});
        USER_COMPLETIONS = {};
      }
    }

    if (atom.config.get("autocomplete-latex.enableDefaultCompletions")) {
      COMPLETIONS = this.mergeObjects(USER_COMPLETIONS, DEFAULT_COMPLETIONS);
    } else {
      COMPLETIONS = USER_COMPLETIONS;
    }
    this.minPrefixLength = atom.config.get("autocomplete-latex.minPrefixLength");
  },

  mergeObjects(first, second) {
    // moving to array based instead of "descriptorKey" (which wasn;t the descriptorKey anyway)
    // TODO: Refactor bad code and relocate to a utilities file (maybe `scope-helpers`?)
    let merged = first;
    let clashes = [];
    for (var scopeKey in second) {
      if (scopeKey in first) {
        for (var typeKey in second[scopeKey]) {
          if (typeKey in first[scopeKey]) {
            for (var descriptorKey in second[scopeKey][typeKey]) {
              if (descriptorKey in first[scopeKey][typeKey]) {
                clashes.push(`${scopeKey}.${typeKey}.${descriptorKey}`);
                continue;
              } else {
                merged[scopeKey][typeKey][descriptorKey] = second[scopeKey][typeKey][descriptorKey];
              }
            }
          } else {
            merged[scopeKey][typeKey] = second[scopeKey][typeKey];
          }
        }
      } else {
        merged[scopeKey] = second[scopeKey];
      }
    }
    if (clashes.length > 0) {
      let prettyPrint = clashes.join("\n");
      atom.notifications.addWarning("\`autocomplete-latex\` The following default completions have been ignored due to conflicts:", {dismissable: true, detail: prettyPrint});
    }
    return merged;
  },

  getSuggestions({editor, bufferPosition, scopeDescriptor}) { // autocalled by `autocomplete-plus`
    // generate prefix and return if not long enough
    this.prefix = this.getPrefix(editor, bufferPosition);
    if (this.prefix.length < this.minPrefixLength) { return; }

    var completions = []; // will be an array of completion objects
    
    for (var scope in COMPLETIONS) {
      if (!scopesMatch(parseScopeString(scope), scopeDescriptor.scopes)) { continue; }
      for (var compType in COMPLETIONS[scope]) {
        for (var descriptorText in COMPLETIONS[scope][compType]) {
          suggestion = COMPLETIONS[scope][compType][descriptorText];
          completions.push({
            text: suggestion.text, // OR
            snippet: suggestion.snippet,
            displayText: suggestion.displayText || suggestion.prefix, // allows explicit setting of what UI shows. Defaults to prefix if not provided.
            replacementPrefix: this.prefix, // is used to delete the existing characters
            type: compType,
            leftLabel: suggestion.leftLabel,
            leftLabelHTML: suggestion.leftlabelHTML,
            rightLabel: suggestion.rightlabel,
            rightLabelHTML: suggestion.rightLabelHTML,
            className: suggestion.className,
            iconHTML: suggestion.iconHTML,
            description: suggestion.description, // short summary displayed at bottom
            descriptionMoreURL: suggestion.descriptionMoreURL,
            characterMatchIndices: suggestion.characterMatchIndices
          });
        }
      }
    }

    completions = fz.filter(completions, this.prefix, {key:"displayText"});
    return completions;
  },

  getPrefix(editor, bufferPosition) {
    let line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
    let match = line.match(this.prefixRegex); // returns array with the entire match as first element
    if (match) {
      return match[0];
    } else {
      return "";
    }
  },

  // reference for available types & their appearance
  inbuiltTypes() {
    return [
      {text:"builtin", type:"builtin"},
      {text:"class", type:"class"},
      {text:"constant", type:"constant"},
      {text:"function", type:"function"},
      {text:"import", type:"import"},
      {text:"keyword", type:"keyword"},
      {text:"method", type:"method"},
      {text:"module", type:"module"},
      {text:"mixin", type:"mixin"},
      {text:"package", type:"package"},
      {text:"property", type:"property"},
      {text:"require", type:"require"},
      {text:"snippet", type:"snippet"},
      {text:"tag", type:"tag"},
      {text:"type", type:"type"},
      {text:"value", type:"value"},
      {text:"variable", type:"variable"}
    ];
  }
};
