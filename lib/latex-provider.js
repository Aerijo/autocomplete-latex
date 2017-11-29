const fs = require("fs");
const path = require("path");
const fz = require("fuzzaldrin-plus");
const { parseScopeString, scopesMatch } = require("./scope-tools");
const DEFAULT_COMPLETIONS = require("./resources/completions.json");
var USER_COMPLETIONS = {};
var COMPLETIONS = {};

module.exports = {
  scopeSelector: ".text.tex.latex",
  disableForScopeSelector: atom.config.get("autocomplete-latex.disableForScopeSelector"),
  inclusionPriority: 1,
  excludeLowerPriority: true,
  suggestionPriority: 2,
  filterSuggestions: false, // doesn't play well with custom prefix. Manually done with `fuzzaldrin-plus`
  minPrefixLength: 2, // actual value set in loadProperties()

  prefixRegex: /[\\\!][a-zA-Z]*$/, // all prefixes start with a single `\` or `!` (!TEX) followed by letters ($ marks cursor position)

  loadProperties() {
    let pathToUserCompletions = path.resolve(atom.config.get("autocomplete-latex.userCompletionsPath"));
    if (fs.existsSync(pathToUserCompletions)) { // if it can find the file
      try {
        USER_COMPLETIONS = require("/Users/benjamingray/latexCompletions.json");
      }
      catch (err) {
        atom.notifications.addError(`\`autocomplete-latex\`\nFailed to read user completions.\n- ${err}`, {dismissable: true});
        USER_COMPLETIONS = {};
      }
    }

    if (atom.config.get("autocomplete-latex.enableDefaultCompletions")) {
      COMPLETIONS = this.mergeCompletionObjects(USER_COMPLETIONS, DEFAULT_COMPLETIONS);
    } else {
      COMPLETIONS = USER_COMPLETIONS;
    }
    this.minPrefixLength = atom.config.get("autocomplete-latex.minPrefixLength");
  },

  mergeCompletionObjects(first, second) {
    // TODO: Refactor bad code and relocate to a utilities file (maybe `scope-helpers`?)
    let merged = JSON.parse(JSON.stringify(first)); // make an unlinked copy
    let clashes = [];
    for (let scopeKey in second) {
      if (scopeKey in first) {
        for (let typeKey in second[scopeKey]) {
          if (typeKey in first[scopeKey]) {
            for (let i = 0; i < second[scopeKey][typeKey].length; i++) {
              let secondDisplay = second[scopeKey][typeKey][i].displayText || second[scopeKey][typeKey][i].prefix;
              for (let j = 0; j < first[scopeKey][typeKey].length; j++) {
                let firstDisplay = first[scopeKey][typeKey][j].displayText || first[scopeKey][typeKey][j].prefix;
                if (firstDisplay === secondDisplay) {
                  clashes.push(`${scopeKey}::${typeKey}::${firstDisplay}`);
                  break;
                } else if (j === first[scopeKey][typeKey].length - 1) {
                  merged[scopeKey][typeKey].push(second[scopeKey][typeKey][i]);
                }
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

    var completions = [];

    for (let scope in COMPLETIONS) {
      if (!scopesMatch(parseScopeString(scope), scopeDescriptor.scopes)) { continue; }
      for (let compType in COMPLETIONS[scope]) {
        for (let i = 0; i < COMPLETIONS[scope][compType].length; i++) {
          suggestion = COMPLETIONS[scope][compType][i];
          completions.push({
            text: suggestion.text, // OR
            snippet: suggestion.snippet,
            displayText: suggestion.displayText || suggestion.prefix, // allows explicit setting of what UI shows. Defaults to prefix if not provided (prefix is deprecated)
            replacementPrefix: suggestion.replacementPrefix || this.prefix, // is used to delete the existing characters
            type: suggestion.type || compType,
            leftLabel: suggestion.leftLabel,
            leftLabelHTML: suggestion.leftlabelHTML,
            rightLabel: suggestion.rightlabel,
            rightLabelHTML: suggestion.rightLabelHTML,
            className: suggestion.className,
            iconHTML: suggestion.iconHTML,
            description: suggestion.description,
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
