/*
  This file handles completions of installed packages. It searches using
  `tlmgr list --only-installed`, parses the result, caches it, and returns
  the valid package names.
*/

const fs = require("fs");
const path = require("path");
const fz = require("fuzzaldrin-plus");
const child_process = require("child_process"); // run terminal commands

function packageCompletions(prefix, cache) {
  let completions = [];
  if (cache.hasCache("packages")) {
    completions = fz.filter(cache.getCache("packages"), prefix, {key:"displayText", allowErrors:false});
    for (let i = 0; i < completions.length; i++) {
      completions[i].replacementPrefix = prefix;
    }
    return completions;
  }

  /*
  // an alternative approach (UNIX only) with ls & grep:
  let tlVersion = atom.config.get("autocomplete-latex.texLiveVersion") || 2017
  let lsPackageCommand = "ls -R | grep '\\.sty$'"
  let latexPackageDirectory = `/usr/local/texlive/${tlVersion}/texmf-dist/tex/latex`
  */

  let lsPackageCommand = `tlmgr search --file ".*\\.sty"`
  let child = child_process.spawn(lsPackageCommand, {shell:true});
  let outputString = ""
  child.stdout.setEncoding("utf-8");

  child.stdout.on('error', (err) => {
    console.warn("autocomplete-latex has the following package name completion error:")
    console.error(error);
    cache.setCache("packages", {});
    return {};
  });

  child.stdout.on('data', (data) => {
    outputString += data; // The data is not seperated by line, so the entire thing must be constructed
  });

  child.stdout.on('close', (code, signal) => {
    completions = parseTlmgrOutput(outputString);
    cache.setCache("packages", completions);
    completions = fz.filter(completions, prefix, {key:"displayText", allowErrors:false});
    for (let i = 0; i < completions.length; i++) {
      completions[i].replacementPrefix = prefix;
    }
    return completions;
  });

  /*
  // Alternate version, where the results return all at once (so maxBuffer needs to be increased).
  child_process.exec(lsPackageCommand, {maxBuffer: 512000}, (error, stdout, stderr) => {
    if (error) { // if there's an error, assume tlmgr is not installed. MikTeX support can be added later.
      console.error(error);
      cache.setCache("packages", {});
      return {};
    }

    console.log("executed...");
    console.log(stdout);

    let completions = parseTlmgrOutput(stdout);
    cache.setCache("packages", completions);

    completions = fz.filter(completions, prefix, {key:"displayText", allowErrors:false});
    for (let i = 0; i < completions.length; i++) {
      completions[i].replacementPrefix = prefix;
    }
    return completions;
  });
  */
}

function parseTlmgrOutput(rawOutput) {
  let packages = rawOutput.split(/\n/);
  let completions = [];
  for (let i = 0; i < packages.length; i++) {
    let entry = packages[i].trim();
    if (entry.match(/.*:/)) { continue; }

    let suggestion = {};
    let data = path.basename(entry, ".sty");
    if (!data) { continue; }

    suggestion.displayText = data;
    suggestion.text = data;
    completions.push(suggestion);
  }
  return completions;
}

module.exports = { packageCompletions }
