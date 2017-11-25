const provider = require("./latex-provider"); // the requirements for this object are given here: https://github.com/atom/autocomplete-plus/wiki/Provider-API

module.exports = {
  config: {
    disableForScopeSelector: {
      title: "Disabled scopes",
      description: "Disable completions in these scopes. Comma separated. Restart atom for changes to take effect.",
      type: "string",
      default: ".text.tex.latex .comment"
    }
  },

  activate (serialized) {
    console.log("activating autocomplete-latex...");
    provider.loadProperties(); // doesn't do anything right now
  },

  getProvider() { // called at start by `autocomplete-plus`
    console.log("getting provider...");
    return provider;
  }
};
