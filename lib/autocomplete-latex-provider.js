const path = require("path");
const { CompositeDisposable } = require("atom");

const { CitationCompletionsProvider } = require("./completions-citation");
const { GeneralCompletionsProvider } = require("./completions-general");
const { PackageCompletionsProvider } = require("./completions-package");

class AutocompleteLatexProvider {
  constructor(progressSignal) {
    this.subscriptions = new CompositeDisposable();
    this.progressSignal = progressSignal;

    this.selector = ".text.tex.latex";
    this.disableForSelector = atom.config.get(
      "autocomplete-latex.disableForScopeSelector"
    );
    this.inclusionPriority = 1;
    this.suggestionPriority = 2;
    this.excludeLowerPriority = !atom.config.get(
      "autocomplete-latex.enableBuiltinProvider"
    );
    this.filterSuggestions = false;

    this.packageCompletions = new PackageCompletionsProvider(progressSignal);
    this.subscriptions.add(this.packageCompletions);

    this.citationCompletions = new CitationCompletionsProvider(progressSignal);
    this.subscriptions.add(this.citationCompletions);

    this.generalCompletions = new GeneralCompletionsProvider(progressSignal);
    this.subscriptions.add(this.generalCompletions);
    this.generalCompletions.enable();

    this.subscriptions.add(
      atom.config.observe(
        "autocomplete-latex.minPrefixLength",
        this.setMinPrefixLength.bind(this)
      )
    );
  }

  setMinPrefixLength(length) {
    // No need for minimum prefix length on package completions
    // this.packageCompletions.setMinPrefixLength(Math.max(0, length - 1));
    this.citationCompletions.setMinPrefixLength(length);
    this.generalCompletions.setMinPrefixLength(length);
  }

  getSuggestions({ editor, bufferPosition, scopeDescriptor }) {
    const line = editor.getTextInRange([
      [bufferPosition.row, Math.max(0, bufferPosition.column - 100)],
      bufferPosition,
    ]);

    const packageSuggestions = this.packageCompletions.getSuggestions({
      editor,
      line,
      bufferPosition,
      scopeDescriptor,
    });
    if (packageSuggestions) {
      return packageSuggestions;
    }

    const citationSuggestions = this.citationCompletions.getSuggestions({
      editor,
      line,
    });
    if (citationSuggestions) {
      return citationSuggestions;
    }

    return this.generalCompletions.getSuggestions({
      scopeDescriptor,
      line,
    });
  }

  getPrefix(line) {
    return line;
  }

  dispose() {
    this.subscriptions.dispose();
  }
}

module.exports = {
  AutocompleteLatexProvider,
};
