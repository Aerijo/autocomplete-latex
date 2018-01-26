const provider = require("./latex-provider"); // the requirements for this object are given here: https://github.com/atom/autocomplete-plus/wiki/Provider-API
const { CompositeDisposable } = require("atom");
var busyProvider;

module.exports = {
  config: {
    userCompletionsPath: {
      order: 1,
      description: "Use this if you want to add your own custom completions that are not present in the default set. See docs for syntax.",
      type: "string",
      default: ""
    },
    enableDefaultCompletions: {
      order: 2,
      description: "Disable this if you want to define all the suggestions manually; this will prevent clashes with completions you define yourself. See README.md for more info.",
      type: "boolean",
      default: true
    },
    enableBuiltinProvider: {
      order: 3,
      description: "Turning this on will allow suggestions from the builtin (`autocomplete-plus`) provider to appear.",
      type: "boolean",
      default: false
    },
    enableCitationCompletions: {
      order: 4,
      description: "Experimental: typing `@...` will bring up a list of references scraped from the .bib file.",
      type: "boolean",
      default: true
    },
    enablePackageCompletions: {
      order: 5,
      description: "When enabled, package names will be completed inside of `\\usepackage{}`",
      type: "boolean",
      default: true
    },
    minPrefixLength: {
      order: 6,
      title: "Minimum Prefix Length",
      description: "This value will suppress suggestions from appearing until the prefix is at least as long (includes the \\\\)",
      type: "integer",
      default: 2
    },
    disableForScopeSelector: {
      order: 7,
      title: "Disabled Scopes",
      description: "Disable completions in these scopes. Comma separated. Restart atom for changes to take effect.",
      type: "string",
      default: ".text.tex.latex .comment"
    },
    citationFormat: {
      order: 8,
      description: "What will be inserted around the citation when activated from a `@...`. See README.md for details.",
      type: "string",
      default: "\\\\autocite$1{${cite}}$2"
    },
    commandCompletionRegex: {
      order: 9,
      description: " ⚠️ Advanced: use this to support custom prefix patterns",
      type: "string",
      default: "[\\\\\\!]\\w*$"
    },
    citationCompletionRegex: {
      order: 10,
      description: " ⚠️ Advanced: use this to support custom prefix patterns for `@...`",
      type: "string",
      default: "@\\S*$"
    }
  },

  activate (state) {
    if (state && state.providerData) {
      provider.deserialize(state.providerData);
    }
    provider.loadProperties();
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.commands.add('atom-text-editor', {
        'autocomplete-latex: Clear Cache': (event) => {
          if (busyProvider)  { busyProvider.add("Regenerating completions"); }
          provider.cache.empty();
          if (busyProvider) { busyProvider.clear(); }
        },
        'autocomplete-latex: Regenerate Completions': (event) => {
          if (busyProvider)  { busyProvider.add("Regenerating completions"); }
          provider.completionRegistry.empty();
          provider.completionRegistry.addCompletionGroup(require("./resources/completionsOrdered.json"));
          provider.loadProperties();
          provider.cache.empty();
          if (busyProvider) { busyProvider.clear(); }
        },
      }),
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
        provider.citations = value.newValue;
      }),
      atom.config.onDidChange("autocomplete-latex.enableBuiltinProvider", (value) => {
        provider.excludeLowerPriority = !value.newValue; // Don't exclude if setting is true
      }),
      atom.config.onDidChange("autocomplete-latex.enablePackageCompletions", (value) => {
        provider.packageCompletions = value.newValue;
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

  deactivate() {
    this.disposables.dispose();
  },

  serialize() {
    return {
      providerData: provider.serialize(),
    };
  },

  getProvider() { // called after activate() by `autocomplete-plus`
    this.config.minPrefixLength.default = atom.config.get("autocomplete-plus.minimumWordLength"); // we know it's activated here
    return provider;
  },

  consumeSignal(registry) {
    busyProvider = registry.create();
    this.disposables.add(busyProvider);
  }
};
