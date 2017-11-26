const fs = require("fs");
const path = require("path");
const fz = require("fuzzaldrin-plus");
const COMPLETIONS = require("./resources/completions.json");

module.exports = {
  scopeSelector: ".text.tex.latex",
  disableForScopeSelector: atom.config.get("autocomplete-latex.disableForScopeSelector"), // not working right now
  inclusionPriority: 5,
  excludeLowerPriority: true,
  suggestionPriority: 101,
  filterSuggestions: false, // doesn't play well with custom prefix
  minPrefixLength: atom.config.get("autocomplete-latex.minPrefixLength"),

  prefixRegex: /[\\\!][a-zA-Z]+$/, // all prefixes start with a single `\` or `!` (!TEX) followed by letters ($ marks cursor position)

  loadProperties() {
    return true;
  },

  getSuggestions({editor, bufferPosition, scopeDescriptor}) { // autocalled by `autocomplete-plus`
    // generate prefix and return if not long enough
    this.prefix = this.getPrefix(editor, bufferPosition);
    if (this.prefix.length < this.minPrefixLength) { return; }

    // console.log(scopeDescriptor);
    var completions = []; // will be an array of completion objects

    for (var scope in COMPLETIONS) {
      // if (scope !== scopeDescriptor) { continue; } // pseudocode
      for (var compType in COMPLETIONS[scope]) {
        for (var descriptorText in COMPLETIONS[scope][compType]) {
          suggestion = COMPLETIONS[scope][compType][descriptorText];
          // deprecated by fuzzaldrin filter. Maybe check if first two character match?
          // if (!suggestion.prefix.startsWith(this.prefix)) { continue; }
          completions.push({
            type: compType,
            snippet: suggestion.snippet,
            displayText: suggestion.prefix,
            description: suggestion.description,
            replacementPrefix: this.prefix,
            leftLabel: suggestion.leftLabel,
            leftLabelHTML: suggestion.leftlabelHTML,
            rightLabel: suggestion.rightlabel,
            rightLabelHTML: suggestion.rightLabelHTML,
            className: suggestion.className,
            iconHTML: suggestion.iconHTML,
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
