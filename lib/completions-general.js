const path = require("path");
const fz = require("fuzzaldrin-plus");
const { CompositeDisposable, File } = require("atom");
const ScopedPropertyStore = require("scoped-property-store");
const CSON = require("season");
const { getOrCompute } = require("./util");

class CompletionsGroup {
  constructor() {
    this.completionsByKind = new Map();
  }

  clear() {
    this.completionsByKind.clear();
  }

  loadAll(data) {
    for (const [kind, completionsByScope] of Object.entries(data)) {
      this.setCompletionsForKind(kind, completionsByScope);
    }
  }

  setCompletionsForKind(kind, completionsByScope) {
    const group = getOrCompute(this.completionsByKind, kind, () => new Map());
    for (const [scope, byCategory] of Object.entries(completionsByScope)) {
      const scoped = getOrCompute(group, scope, () => []);

      if (Array.isArray(byCategory)) {
        for (const completion of byCategory) {
          completion.type = "snippet";
          scoped.push(completion);
        }
      } else {
        for (const [category, completions] of Object.entries(byCategory)) {
          for (const completion of completions) {
            completion.type = category; // todo: map to actual ones
            scoped.push(completion);
          }
        }
      }
    }
  }

  getCompletionsByScope(disabledKinds = new Set()) {
    const result = new Map();

    for (const [kind, completionsByScope] of this.completionsByKind) {
      if (disabledKinds.has(kind)) {
        continue;
      }

      for (const [scope, completions] of completionsByScope) {
        const store = getOrCompute(result, scope, () => {
          return {};
        });
        for (const completion of completions) {
          store[completion.displayText] = completion;
        }
      }
    }

    return result;
  }
}

class GeneralCompletionsProvider {
  constructor() {
    this.subscriptions = new CompositeDisposable();
    this.userCompletions = new CompletionsGroup();
    this.userCompletionsSubscriptions = new CompositeDisposable();
    this.builtinCompletions = new CompletionsGroup();
    this.completionsStore = new ScopedPropertyStore();
    this.storeIsValid = false;
    this.defaultPrefixRegex = /[\\!]\w*$|\$+$/;
    this.prefixRegex = this.defaultPrefixRegex;
    this.disabledCompletionKinds = new Set();
    this.minPrefixLength = 0;
  }

  async enable() {
    this.loadBuiltinCompletions();

    this.subscriptions.add({
      dispose: () => this.userCompletionsSubscriptions.dispose(),
    });

    this.subscriptions.add(
      atom.config.observe(
        "autocomplete-latex.userCompletionsPath",
        this.observeUserCompletions.bind(this)
      ),
      atom.config.observe(
        "autocomplete-latex.commandCompletionRegex",
        this.updateCommandPrefixRegex.bind(this)
      ),
      atom.config.observe(
        "autocomplete-latex.enabledDefaultCompletions",
        this.updateEnabledDefaultCompletions.bind(this)
      )
    );
  }

  setMinPrefixLength(length) {
    this.minPrefixLength = length;
  }

  updateCommandPrefixRegex(newValue) {
    try {
      this.prefixRegex = new RegExp(newValue);
    } catch (e) {
      console.error(e);
      this.prefixRegex = this.defaultPrefixRegex;
    }
  }

  updateEnabledDefaultCompletions(newValue) {
    if (typeof newValue !== "object") {
      return;
    }

    this.disabledCompletionKinds.clear();
    for (const [kind, enabled] of Object.entries(newValue)) {
      if (!enabled) {
        this.disabledCompletionKinds.add(kind);
      }
    }
    this.generateCompletionsStore();
  }

  loadBuiltinCompletions() {
    return new Promise((resolve) => {
      CSON.readFile(
        path.join(__dirname, "resources", "builtinCompletions.json"),
        (err, data) => {
          if (err) {
            console.error(err);
            resolve();
            return;
          }

          this.builtinCompletions.loadAll(data);
          this.storeIsValid = false;
          resolve();
        }
      );
    });
  }

  disable() {
    this.subscriptions.dispose();
  }

  dispose() {
    this.subscriptions.dispose();
  }

  generateCompletionsStore() {
    this.completionsStore = new ScopedPropertyStore();

    const store = (container, priority, disabled = new Set()) => {
      for (const [selector, completions] of container.getCompletionsByScope(
        disabled
      )) {
        const group = {};
        group[selector] = { completions };
        this.completionsStore.addProperties(selector, group, { priority });
      }
    };

    store(this.builtinCompletions, 0, this.disabledCompletionKinds);
    store(this.userCompletions, 1);

    this.storeIsValid = true;
  }

  getCandidatesForScope(scope) {
    if (!this.storeIsValid) {
      this.generateCompletionsStore();
    }

    const searchItem = scope
      .getScopesArray()
      .map((s) => `.${s}`)
      .join(" ");

    return this.completionsStore.getPropertyValue(searchItem, "completions");
  }

  getSuggestions(options) {
    const prefixMatch = this.prefixRegex.exec(options.line);
    if (!prefixMatch) {
      return false;
    }
    const prefix = prefixMatch[0];

    if (prefix.length < this.minPrefixLength) {
      return;
    }

    let candidates = this.getCandidatesForScope(options.scopeDescriptor);

    if (!candidates) {
      return false;
    }

    candidates = [...Object.values(candidates)].filter(
      (c) => c.displayText[0] === prefix[0]
    );

    const filtered = fz.filter(candidates, prefix, {
      key: "displayText",
      allowErrors: true,
      maxResults: 200,
      maxInners: Math.max(1000, candidates.length * 0.2),
    });

    for (const candidate of filtered) {
      candidate.replacementPrefix = prefix;
    }

    return filtered;
  }

  async regenerateUserCompletions() {
    let completionsPath = this.getUserCompletionsPath();
    if (typeof completionsPath !== "string") {
      return;
    }

    if (completionsPath[0] === "~") {
      completionsPath = path.join(process.env.HOME, completionsPath.slice(1));
    }

    completionsPath = path.normalize(completionsPath);

    return new Promise((resolve) => {
      CSON.readFile(completionsPath, (err, contents) => {
        this.userCompletions.clear();
        this.storeIsValid = false;

        if (err) {
          console.error(err);
          return;
        }

        this.userCompletions.loadAll(contents);
        resolve();
      });
    });
  }

  observeUserCompletions() {
    this.userCompletionsSubscriptions.dispose();

    const completionsPath = this.getUserCompletionsPath();
    if (!completionsPath) {
      return;
    }

    this.regenerateUserCompletions();

    this.userCompletionsSubscriptions = new CompositeDisposable();
    const file = new File(completionsPath);
    try {
      this.userCompletionsSubscriptions.add(
        file.onDidChange(this.regenerateUserCompletions.bind(this))
      );
      this.userCompletionsSubscriptions.add(
        file.onDidDelete(this.regenerateUserCompletions.bind(this))
      );
      this.userCompletionsSubscriptions.add(
        file.onDidRename(this.regenerateUserCompletions.bind(this))
      );
    } catch (e) {
      console.error(e);
    }
  }

  getUserCompletionsPath() {
    let pathToUserCompletions = atom.config.get(
      "autocomplete-latex.userCompletionsPath"
    );
    if (!pathToUserCompletions) {
      return undefined;
    }

    if (pathToUserCompletions[0] === "~") {
      pathToUserCompletions = path.join(
        process.env.HOME,
        pathToUserCompletions.slice(1)
      );
    }

    return path.resolve(pathToUserCompletions);
  }
}

module.exports = {
  GeneralCompletionsProvider,
};
