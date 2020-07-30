const { CompositeDisposable } = require("atom");

const { AutocompleteLatexProvider } = require("./autocomplete-latex-provider");
const { ProgressSignal } = require("./progress-signal");

class AutocompleteLatexPackage {
  constructor() {
    this.disposables = new CompositeDisposable();
    this.progressSignal = new ProgressSignal();
    this.provider = undefined;
  }

  activate() {
    this.provider = new AutocompleteLatexProvider(this.progressSignal);
    this.disposables.add(this.provider);
  }

  deactivate() {
    this.disposables.dispose();
  }

  getAutocompleteProvider() {
    return this.provider;
  }

  consumeBusySignal(registry) {
    this.progressSignal.addBusySignal(registry.create());
  }

  consumeAtomIdeBusySignal(api) {
    this.progressSignal.addAtomIdeBusySignal(api);
  }
}

module.exports = new AutocompleteLatexPackage();
