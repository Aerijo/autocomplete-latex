const fs = require("fs");
const path = require("path");
const fz = require("fuzzaldrin-plus");
const { parseScopeString, scopesMatch } = require("./scope-tools");
const DEFAULT_COMPLETIONS = require("./resources/completions.json");
var USER_COMPLETIONS = {};
var COMPLETIONS = {};

module.exports = { // deliberately chosen `undefined` for config properties problems to fail fast
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

  loadProperties() {
    // get config values
    this.prefixRegex =  new RegExp(atom.config.get("autocomplete-latex.commandCompletionRegex"));
    this.citationPrefixRegex =  new RegExp(atom.config.get("autocomplete-latex.citationCompletionRegex"));
    this.disableForScopeSelector = atom.config.get("autocomplete-latex.disableForScopeSelector");
    this.minPrefixLength = atom.config.get("autocomplete-latex.minPrefixLength");
    this.citations = atom.config.get("autocomplete-latex.enableCitationCompletions");
    let userCiteWord = atom.config.get("autocomplete-latex.citationControlWord");
    if (userCiteWord) { this.citationControlWord = userCiteWord; }

    // label all default completiosn accordingly
    for (let scope in DEFAULT_COMPLETIONS) {
      for (let type in DEFAULT_COMPLETIONS[scope]) {
        for (let i = 0; i < DEFAULT_COMPLETIONS[scope][type].length; i++) {
          DEFAULT_COMPLETIONS[scope][type][i].isDefault = true;
        }
      }
    }

    // try to find user completions
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

    // merges user + default completions according to settings
    if (atom.config.get("autocomplete-latex.enableDefaultCompletions")) {
      COMPLETIONS = this.mergeCompletionObjects(USER_COMPLETIONS, DEFAULT_COMPLETIONS);
    } else {
      COMPLETIONS = USER_COMPLETIONS;
    }
  },

  mergeCompletionObjects(first, second) { // first will take priority in any duplicates
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
    return merged;
  },

  getSuggestions({editor, bufferPosition, scopeDescriptor}) { // autocalled by `autocomplete-plus`
    // generate prefix and return if not long enough
    this.prefix = this.getPrefix(editor, bufferPosition);
    if (this.prefix.length < this.minPrefixLength) { return; }

    if (this.prefix[0] === "@") {
      return this.citationCompletions(this.prefix, editor);
    }

    var completions = [];

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
            characterMatchIndices: suggestion.characterMatchIndices,
            isDefault: suggestion.isDefault || false
          });
        }
      }
    }

    completions = fz.filter(completions, this.prefix, {key:"displayText"});

    // want to remove the duplicate completions because they are annoying.
    // Unfortunately, the brute force approach is too slow.

    return completions;
  },

  citationCompletions(prefix, editor) {
    let bibFilePath = this.findBibFile(editor);
    if (!bibFilePath) { return; }

    let completions;
    let data;
    try {
      data = fs.readFileSync(bibFilePath, "utf-8")
    } catch (err) {
      console.warn(`autocomplete-latex could not find bib file:\n${err}`);
      return false;
    }
    completions =  this.parseBibFile(data, prefix);
    completions = fz.filter(completions, prefix, {key:"displayText", allowErrors:true}); // allowErrors allows any chaarcters
    return completions;
  },

  findBibFile(editor) {
    let fileContents = editor.getText();
    let magicBibPath = fileContents.match(/% !T[eE]X bib =\s*(.*)/);
    if (magicBibPath) { // if bib path explicity set, go with that one
      return path.resolve(editor.getDirectoryPath(), magicBibPath[1]);
    }

    let bibPath = fileContents.match(/\\addbibresource\{(.*?)\}/);
    if (bibPath) {
      bibPath[1] = bibPath[1].trim();
      return path.resolve(editor.getDirectoryPath(), bibPath[1]);
    }

    let rootFile = fileContents.match(/% !T[eE]X root =\s*(.*)/);
    if (!rootFile) { return false; }

    rootFile = path.resolve(editor.getDirectoryPath(), rootFile[1]);
    try {
      fileContents = fs.readFileSync(rootFile, "utf-8");
    } catch (err) {
      // Fails silently.
      console.warn(`autocomplete-latex could not find root file:\n${err}`);
      return false;
    }

    let rootFilePath = path.dirname(rootFile);

    magicBibPath = fileContents.match(/% !T[eE]X bib =\s*(.*)/);
    if (magicBibPath) { // if bib path explicity set, go with that one
      return path.resolve(rootFilePath, magicBibPath[1]);
    }

    bibPath = fileContents.match(/\\addbibresource\\{(.*?)\\}/);
    if (bibPath) {
      return path.resolve(rootFilePath, bibPath[1]);
    }
    return false;
  },

  parseBibFile(file, prefix) {
    file = file.substring(file.search("@") + 1); // Start just after the first @ sign (ignores any earlier text)
    let entriesArray = file.split(/\s*@\s*/); // Split by the @ sign into separate strings
    let completions = [];
    for (let i = 0; i < entriesArray.length; i++) {
      let suggestion = {};
      let entry = entriesArray[i];

      let type = entry.match(/^\s*(.*?)\s*\{/);
      if (!type) { continue; }
      suggestion.type = type[1];

      let displayText = entry.match(/\{\s*(.*?)\s*,/);
      if (!displayText) { continue; }
      suggestion.displayText = displayText[1];
      suggestion.snippet = `\\\\${this.citationControlWord}\\{${suggestion.displayText}\\}$1`;
      suggestion.replacementPrefix = prefix;

      completions.push(suggestion);
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
