const provider = require("./latex-provider"); // the requirements for this object are given here: https://github.com/atom/autocomplete-plus/wiki/Provider-API
const {CompositeDisposable} = require("atom");

module.exports = {
  config: {
    disableForScopeSelector: {
      title: "Disabled scopes",
      description: "Disable completions in these scopes. Comma separated. Restart atom for changes to take effect.",
      type: "string",
      default: ".text.tex.latex .comment"
    },
    minPrefixLength: {
      title: "Minimum length before suggestions appear",
      description: "This value will suppress suggestions from appearing until the prefix is at least as long (includes the \\\\)",
      type: "integer",
      default: atom.config.get("autocomplete-plus.minimumWordLength")
    }
  },

  activate (serialized) {
    console.log("activating autocomplete-latex...");
    provider.loadProperties(); // doesn't do anything right now
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.config.onDidChange("autocomplete-latex.minPrefixLength", (value) => {
        provider.minPrefixLength = value.newValue;
      }),
      atom.config.onDidChange("autocomplete-latex.disableForScopeSelector", (value) => {
        provider.disableForScopeSelector = value.newValue;
      })
    );
  },

  getProvider() { // called at start by `autocomplete-plus`
    console.log("getting provider...");
    return provider;
  }
};
