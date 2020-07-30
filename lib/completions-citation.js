const fs = require("fs");
const path = require("path");
const fz = require("fuzzaldrin-plus");
const { CompositeDisposable } = require("atom");
const { getOrCompute } = require("./util");

function parseBibFile(file) {
  let citationFormat = atom.config
    .get("autocomplete-latex.citationFormat")
    .split("${cite}");

  // Start just after the first @ sign (ignores any earlier text)
  // & split by the @ sign into separate strings. Needs work, as contents could have @ in it
  let entriesArray = file.substring(file.search("@") + 1).split(/\s*@\s*/);

  let completions = [];
  for (let i = 0; i < entriesArray.length; i++) {
    let suggestion = {};
    let entry = entriesArray[i];

    let type = entry.match(/^\s*(.*?)\s*\{/);
    if (!type) {
      continue;
    }
    suggestion.type = type[1];

    let displayText = entry.match(/\{\s*(.*?)\s*,/);
    if (!displayText) {
      continue;
    }
    suggestion.displayText = displayText[1];
    suggestion.snippet = citationFormat.join(suggestion.displayText);

    completions.push(suggestion);
  }
  return completions;
}

class BibFileTracker {
  constructor(options) {
    this.subscriptions = new CompositeDisposable();
    this.editor = options.editor;
    this.locatorPattern = /^\s*%+ !T[eE]X (bib|root) =\s*(.*)|\\addbibresource(?:\[.*?\])?\{(.*?)\}/g;
    this.cachedItems = undefined;

    this.subscriptions.add(
      atom.workspace.observeActiveTextEditor(() => {
        this.cachedItems = undefined;
      })
    );
  }

  dispose() {
    this.subscriptions.dispose();
  }

  locateInternalBibFile(editor, tryAgain = true) {
    return new Promise((resolve) => {
      let bibPath = undefined;
      let rootPath = undefined;

      editor.scan(this.locatorPattern, ({ match, stop }) => {
        const magicKind = match[1];
        const matchedPath = typeof match[2] === "string" ? match[2] : match[3];

        let resourcePath;
        if (editor.getDirectoryPath() === undefined) {
          const relative = path.normalize(matchedPath.trim());
          if (path.isAbsolute(relative)) {
            resourcePath = relative;
          } else {
            return; // can't resolve a relative path against an editor not backed by a file
          }
        } else {
          resourcePath = path.resolve(
            editor.getDirectoryPath(),
            matchedPath.trim()
          );
        }

        if (magicKind === "root") {
          rootPath = resourcePath;
        } else {
          bibPath = resourcePath;
          stop();
        }
      });

      if (bibPath) {
        resolve(bibPath);
      } else if (tryAgain && typeof rootPath === "string") {
        resolve(this.locateExternalBibFile(rootPath));
      } else {
        resolve(undefined);
      }
    });
  }

  locateExternalBibFile(rootPath) {
    for (const editor of atom.workspace.getTextEditors()) {
      if (editor !== this.editor && editor.getPath() === rootPath) {
        return this.locateInternalBibFile(editor, false);
      }
    }

    return new Promise((resolve) => {
      fs.readFile(rootPath, (err, contents) => {
        if (err) {
          console.error(err);
          resolve(undefined);
          return;
        }

        let match;
        this.locatorPattern.lastIndex = 0;
        while ((match = this.locatorPattern.exec(contents))) {
          const magicKind = match[1];
          const matchedPath =
            typeof match[2] === "string" ? match[2] : match[3];

          const resourcePath = path.resolve(rootPath, matchedPath.trim());

          if (magicKind !== "root") {
            resolve(resourcePath);
            return;
          }
        }

        resolve(undefined);
      });
    });
  }

  async getCandidates() {
    if (this.cachedItems) {
      return this.cachedItems;
    }

    const bibFile = await this.locateInternalBibFile(this.editor);
    if (typeof bibFile !== "string") {
      return false;
    }

    return new Promise((resolve) => {
      fs.readFile(bibFile, { encoding: "utf-8" }, (err, contents) => {
        if (err) {
          resolve(false);
          return;
        }

        this.cachedItems = parseBibFile(contents);
        resolve(this.cachedItems);
      });
    });
  }

  async getSuggestions(prefix) {
    const candidates = await this.getCandidates();

    if (!candidates) {
      return false;
    }

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
}

class CitationCompletionsProvider {
  constructor() {
    this.subscriptions = new CompositeDisposable();
    this.bibFileTracker = new WeakMap();
    this.defaultPrefixRegex = /@\S*$/;
    this.prefixRegex = this.defaultPrefixRegex;
    this.enabled = false;
    this.minPrefixLength = 0;

    this.subscriptions.add(
      atom.config.observe(
        "autocomplete-latex.enableCitationCompletions",
        (enable) => {
          if (enable) {
            this.enable();
          } else {
            this.disable();
          }
        }
      )
    );
  }

  async enable() {
    this.enabled = true;

    this.subscriptions.add(
      atom.config.observe(
        "autocomplete-latex.citationCompletionRegex",
        this.updateCitationPrefixRegex.bind(this)
      )
    );
  }

  setMinPrefixLength(length) {
    this.minPrefixLength = length;
  }

  updateCitationPrefixRegex(newValue) {
    try {
      this.prefixRegex = new RegExp(newValue);
    } catch (e) {
      console.error(e);
      this.prefixRegex = this.defaultPrefixRegex;
    }
  }

  disable() {
    this.enabled = false;

    for (const editor of atom.workspace.getTextEditors()) {
      const tracker = this.bibFileTracker.get(editor);
      if (tracker) {
        tracker.dispose();
      }
    }
  }

  dispose() {
    this.subscriptions.dispose();

    for (const editor of atom.workspace.getTextEditors()) {
      const tracker = this.bibFileTracker.get(editor);
      if (tracker) {
        tracker.dispose();
      }
    }
  }

  getSuggestions(options) {
    if (!this.enabled) {
      return false;
    }

    const prefixMatch = this.prefixRegex.exec(options.line);
    if (!prefixMatch) {
      return false;
    }
    const prefix = prefixMatch[0];

    if (prefix.length < this.minPrefixLength) {
      return false;
    }

    const tracker = getOrCompute(
      this.bibFileTracker,
      options.editor,
      () => new BibFileTracker(options)
    );

    return tracker.getSuggestions(prefix);
  }
}

module.exports = {
  CitationCompletionsProvider,
};
