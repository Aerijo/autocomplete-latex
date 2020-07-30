const path = require("path");
const cp = require("child_process");
const csv_parse = require("csv-parse");
const fz = require("fuzzaldrin-plus");
const { CompositeDisposable, Emitter } = require("atom");
const { getOrCompute, spawnChild } = require("./util");

const FileCategories = Object.freeze({
  Uncategorized: 0,
  Doc: 1,
  Tex: 2,
  Bibtex: 3,
});

class Package {
  constructor(name) {
    this.name = name;
    this.filesByCategory = new Map();
    this.description = undefined;
    this.size = undefined;
  }

  addFiles(files) {
    for (const file of files) {
      if (file.startsWith("texmf")) {
        // try to categorize based on TDS
        const parts = file.split(path.sep);
        parts.shift();

        let category = undefined;
        switch (parts[0]) {
          case "tex":
            category = FileCategories.Tex;
            break;
          case "doc":
            category = FileCategories.Doc;
            break;
          case "bibtex":
            category = FileCategories.Bibtex;
            break;
          default:
            category = FileCategories.Uncategorized;
        }
        getOrCompute(this.filesByCategory, category, () => []).push(file);
      } else {
        this.filesByCategory.get(FileCategories.Uncategorized).push(file);
      }
    }
  }

  getLatexFileNames() {
    const files = this.filesByCategory.get(FileCategories.Tex) || [];
    return files.map((f) => path.basename(f, ".sty"));
  }

  addMetadata(data) {
    this.description = data.description;
    this.size = data.size;
  }
}

class PackageRegistry {
  constructor() {
    this.packages = new Map();
    this.latexPackageToPackage = new Map();
  }

  registerFiles(files) {
    const pkg = getOrCompute(
      this.packages,
      files.name,
      () => new Package(files.name)
    );
    pkg.addFiles(files.files);

    const filenames = pkg.getLatexFileNames();
    if (pkg.name.endsWith("-dev")) {
      for (const file of filenames) {
        if (!this.latexPackageToPackage.has(file)) {
          this.latexPackageToPackage.set(file, pkg);
        }
      }
    } else {
      for (const file of filenames) {
        this.latexPackageToPackage.set(file, pkg);
      }
    }
  }

  registerMetadata(data) {
    const pkg = getOrCompute(
      this.packages,
      data.name,
      () => new Package(data.name)
    );
    pkg.addMetadata(data);
  }

  /**
   * We get more package information than we do packages
   * with TeX .sty files, so we clean up the ones without
   * these files because they will never be offered.
   */
  cleanUnusedMetadata() {
    for (const [name, pkg] of this.packages) {
      if (!pkg.filesByCategory.has(FileCategories.Tex)) {
        this.packages.delete(name);
      }
    }
  }

  packagesForPrefix(prefix) {
    const names = [...this.latexPackageToPackage.keys()];
    const candidates = fz.filter(names, prefix, {
      maxResults: 200,
      maxInners: Math.max(1000, names.length * 0.2),
    });

    return candidates.map((candidate) => {
      const pkg = this.latexPackageToPackage.get(candidate);

      let description = pkg.description;
      const others = pkg.getLatexFileNames().filter((n) => n !== candidate);
      if (others.length > 0) {
        description = `${description}\nAlso in package:\n- ${others
          .sort()
          .join("\n- ")}`;
      }

      return {
        text: candidate,
        type: "import",
        replacementPrefix: prefix,
        rightLabel: candidate === pkg.name ? undefined : pkg.name,
        description,
        descriptionMoreURL: `texdoc://${candidate}`,
      };
    });
  }
}

class PackageCompletionsProvider {
  constructor(progressSignal) {
    this.subscriptions = new CompositeDisposable();
    this.progressSignal = progressSignal;
    this.packages = undefined;
    this.texdocClickListener = this.texdocClickListener.bind(this);
    this.minPrefixLength = 0;
    this.enabled = false;

    this.subscriptions.add(
      atom.config.observe(
        "autocomplete-latex.enablePackageCompletions",
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

  setMinPrefixLength(length) {
    this.minPrefixLength = length;
  }

  texdocClickListener(event) {
    if (
      event.target.className === "suggestion-description-more-link" &&
      event.target.href.startsWith("texdoc://")
    ) {
      event.preventDefault();
      const pkgName = event.target.href.slice("texdoc://".length);
      const child = cp.spawn("texdoc", [pkgName], { windowsHide: true });
      const token = this.progressSignal.create(
        `Opening documentation for ${pkgName}`
      );

      child.on("exit", () => {
        token.finish();
      });
    }
  }

  async enable() {
    document.addEventListener("click", this.texdocClickListener);
    this.packages = new PackageRegistry();
    this.enabled = true;
    return this.gatherPackages();
  }

  disable() {
    document.removeEventListener("click", this.texdocClickListener);
    this.enabled = false;
  }

  dispose() {
    this.disable();
    this.subscriptions.dispose();
  }

  getSuggestions(options) {
    if (!this.enabled) {
      return false;
    }
    const prefix = this.getPackagePrefix(options);
    if (typeof prefix !== "string" || prefix.length < this.minPrefixLength) {
      return false;
    }
    return this.packages.packagesForPrefix(prefix);
  }

  getPackagePrefix({ line, editor, bufferPosition }) {
    let match = line.match(/\\usepackage\{([a-zA-Z\-\d]+)$/);
    if (match) {
      return match[1];
    } else {
      // check if the grammar package marks this as a package entry
      const scopes = editor
        .scopeDescriptorForBufferPosition(bufferPosition.translate([0, -1]))
        .getScopesArray();
      if (scopes.includes("support.class.latex", 1)) {
        match = line.match(/\{([a-zA-Z\-\d]*)$/);
        if (match) {
          return match[1];
        }
      }
    }

    return false;
  }

  async gatherPackages() {
    const token = this.progressSignal.create("Gathering package information");

    const packageFiles = new TlmgrPackageFiles();
    const packageMetaData = new TlmgrPackageMetadata();

    packageFiles.onDidReadPackage((data) => {
      this.packages.registerFiles(data);
    });

    packageMetaData.onMetadata((data) => {
      this.packages.registerMetadata(data);
    });

    await Promise.all([
      packageFiles.generatePackageFiles(),
      packageMetaData.generateMetadata(),
    ]);

    this.packages.cleanUnusedMetadata();

    token.finish();
  }
}

class TlmgrPackageFiles {
  constructor() {
    this.emitter = new Emitter();
    this.buffer = "";
    this.currentPackage = undefined;
    this.files = [];
  }

  /**
   * A package is just an object with a `name` and array `files` of `.sty` files
   */
  onDidReadPackage(cb) {
    this.emitter.on("package", cb);
  }

  generatePackageFiles() {
    return new Promise((resolve) => {
      const child = spawnChild('tlmgr search --file ".*\\.sty"');

      child.on("error", (err) => {
        atom.notifications.addError(
          "Failed to find TeX packages. Consider disabling package completion.",
          {
            description: err.message,
          }
        );
        resolve();
      });

      child.stdout.on("data", (chunk) => {
        this.appendChunk(chunk);
      });

      child.stdout.on("close", () => {
        this.finish();
        resolve();
      });

      child.stderr.on("data", (chunk) => {
        console.error(chunk);
      });
    });
  }

  emitPackage() {
    if (this.currentPackage !== undefined) {
      this.emitter.emit("package", {
        name: this.currentPackage,
        files: this.files,
      });
    }

    this.currentPackage = undefined;
    this.files = [];
  }

  appendChunk(chunk) {
    const lines = chunk.split("\n");
    lines[0] = this.buffer + lines[0];
    this.buffer = lines.pop();

    const PKG_NAME_REGEX = /^([^:]+):$/;
    const PKG_PATH_REGEX = /^\s*(.*)$/;

    for (const line of lines) {
      const name = PKG_NAME_REGEX.exec(line);
      if (name) {
        this.emitPackage();
        this.currentPackage = name[1];
        continue;
      }

      const file = PKG_PATH_REGEX.exec(line);
      if (file) {
        const pth = file[1].trim();
        if (pth.length > 0) {
          this.files.push(pth);
        }
        continue;
      }

      console.error(`Unrecognised output line '${line}'`);
    }
  }

  finish() {
    this.emitPackage();
  }
}

class TlmgrPackageMetadata {
  constructor() {
    this.emitter = new Emitter();
  }

  onMetadata(cb) {
    this.emitter.on("data", cb);
  }

  generateMetadata() {
    return new Promise((resolve) => {
      const parser = csv_parse({ delimiter: ",", escape: "\\" });
      const child = spawnChild(
        "tlmgr info --only-installed --data name,category,shortdesc,size"
      );

      child.on("close", (_code, _signal) => {
        parser.end();
      });

      child.stdout.on("data", (chunk) => {
        parser.write(chunk);
      });

      parser.on("readable", () => {
        let row;
        while ((row = parser.read())) {
          if (row[1] !== "Package") {
            continue;
          }

          this.emitter.emit("data", {
            name: row[0],
            description: row[2],
            size: parseInt(row[3], 10),
          });
        }
      });

      parser.on("error", (err) => {
        console.error(err);
      });

      parser.on("end", () => {
        resolve();
      });
    });
  }
}

module.exports = {
  PackageCompletionsProvider,
};
