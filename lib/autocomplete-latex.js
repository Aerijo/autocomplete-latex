const provider = require("./latex-provider"); // the requirements for this object are given here: https://github.com/atom/autocomplete-plus/wiki/Provider-API
const { CompositeDisposable } = require("atom");

module.exports = {
  config: {
    userCompletionsPath: {
      description: "Use this if you want to add your own custom completions that are not present in the default set. See docs for syntax.",
      type: "string",
      default: ""
    },
    enableDefaultCompletions: {
      description: "Disable this if you want to define all the suggestions manually; this will prevent clashes with completions you define yourself. See README.md for more info.",
      type: "boolean",
      default: true
    },
    enableCitationCompletions: {
      description: "Experimental: typing `@...` will bring up a list of references scraped from the .bib file.",
      type: "boolean",
      default: true
    },
    citationControlWord: {
      description: "The control word to use when inserting the citation. Defaults to `autocite` when blank.",
      type: "string",
      default: ""
    },
    disableForScopeSelector: {
      title: "Disabled Scopes",
      description: "Disable completions in these scopes. Comma separated. Restart atom for changes to take effect.",
      type: "string",
      default: ".text.tex.latex .comment"
    },
    minPrefixLength: {
      title: "Minimum Prefix Length",
      description: "This value will suppress suggestions from appearing until the prefix is at least as long (includes the \\\\)",
      type: "integer",
      default: 2
    },
    commandCompletionRegex: {
      description: " ⚠️ Advanced: use this to support custom prefix patterns",
      type: "string",
      default: "[\\\\\\!][a-zA-Z@]*$"
    },
    citationCompletionRegex: {
      description: " ⚠️ Advanced: use this to support custom prefix patterns for `@citations`",
      type: "string",
      default: "@\\S*$"
    },
  },

  activate (serialized) {
    provider.loadProperties();
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.config.onDidChange("autocomplete-latex.minPrefixLength", (value) => {
        provider.minPrefixLength = value.newValue;
      }),
      atom.config.onDidChange("autocomplete-latex.disableForScopeSelector", (value) => {
        provider.disableForScopeSelector = value.newValue;
      }),
      atom.config.onDidChange("autocomplete-latex.enableDefaultCompletions", (value) => {
        provider.loadProperties(); // though the name doesn't suggest it, this will reload the completion list
      }),
      atom.config.onDidChange("autocomplete-latex.enableCitationCompletions", (value) => {
        provider.citations = value.newValue; // though the name doesn't suggest it, this will reload the completion list
      }),
      atom.config.onDidChange("autocomplete-latex.citationControlWord", (value) => {
        provider.citationControlWord = value.newValue || "autocite";
      }),
      atom.config.onDidChange("autocomplete-latex.completionRegex", (value) => {
        if (value.newValue.length > 0) {
          provider.prefixRegex = new RegExp(value.newValue);
        }
      })
    );
  },

  getProvider() { // called after activate by `autocomplete-plus`
    this.config.minPrefixLength.default = atom.config.get("autocomplete-plus.minimumWordLength"); // we know it's activated here
    return provider;
  }
};
