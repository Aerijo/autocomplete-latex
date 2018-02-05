const provider = require("./latex-provider"); // the requirements for this object are given here: https://github.com/atom/autocomplete-plus/wiki/Provider-API
const { CompositeDisposable } = require("atom");
var busyProvider;

const config = generateConfig();

module.exports = {
  config,

  activate (state) {
    if (state && state.providerData) {
      provider.deserialize(state.providerData);
    }
    provider.loadProperties();
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.commands.add('atom-text-editor', {
        'autocomplete-latex: Clear Cache': (event) => {
          if (busyProvider)  { busyProvider.add("Clearing completion cache"); }
          provider.cache.empty();
          if (busyProvider) { busyProvider.remove("Clearing completion cache"); }
        },
        'autocomplete-latex: Regenerate Completions': (event) => {
          provider.regenerateCompletions(); // emitter handled in the function
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

  consumeSignal(registry) { // called when busy-signal activates
    busyProvider = registry.create();
    this.disposables.add(
      busyProvider,
      provider.emitter.on("begin-regenerate-completions", () => {
        busyProvider.add("Regenerating autocomplete-latex completions");
      }),
      provider.emitter.on("end-regenerate-completions", () => {
        busyProvider.remove("Regenerating autocomplete-latex completions");
      }),
      provider.emitter.on("get-package-names", () => {
        busyProvider.add("Getting package names");
      }),
      provider.emitter.on("finished-package-names", () => {
        busyProvider.remove("Getting package names");
      })
    );
  }
};

function generateConfig() {
  let unorderedConfigObject = {
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
    enableBuiltinProvider: {
      description: "Turning this on will allow suggestions from the builtin (`autocomplete-plus`) provider to appear.",
      type: "boolean",
      default: false
    },
    enableCitationCompletions: {
      description: "Experimental: typing `@...` will bring up a list of references scraped from the .bib file.",
      type: "boolean",
      default: true
    },
    enablePackageCompletions: {
      description: "When enabled, package names will be completed inside of `\\usepackage{}`",
      type: "boolean",
      default: true
    },
    minPrefixLength: {
      title: "Minimum Prefix Length",
      description: "This value will suppress suggestions from appearing until the prefix is at least as long (includes the \\\\)",
      type: "integer",
      default: 2
    },
    disableForScopeSelector: {
      title: "Disabled Scopes",
      description: "Disable completions in these scopes. Comma separated. Restart atom for changes to take effect.",
      type: "string",
      default: ".text.tex.latex .comment"
    },
    citationFormat: {
      description: "What will be inserted around the citation when activated from a `@...`. See README.md for details.",
      type: "string",
      default: "\\\\autocite$1{${cite}}$2"
    },
    commandCompletionRegex: {
      description: " ⚠️ Advanced: use this to support custom prefix patterns",
      type: "string",
      default: "[\\\\\\!]\\w*$"
    },
    citationCompletionRegex: {
      description: " ⚠️ Advanced: use this to support custom prefix patterns for `@...`",
      type: "string",
      default: "@\\S*$"
    }
  };

  let configOrder = [
    "userCompletionsPath",
    "enableDefaultCompletions",
    "enableBuiltinProvider",
    "enableCitationCompletions",
    "enablePackageCompletions",
    "minPrefixLength",
    "disableForScopeSelector",
    "citationFormat",
    "commandCompletionRegex",
    "citationCompletionRegex"
  ];

  let orderedConfigObject = {};
  for (let i = 0; i < configOrder.length; i++) {
    let key = configOrder[i];
    let value = unorderedConfigObject[key];
    value.order = i + 1;
    orderedConfigObject[key] = value;
  }
  return orderedConfigObject;
}
