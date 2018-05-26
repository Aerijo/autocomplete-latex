/*
  This file handles completions of installed packages. It searches using
  `tlmgr list --only-installed`, parses the result, caches it, and returns
  the valid package names.
*/

const fs = require("fs");
const path = require("path");
const fz = require("fuzzaldrin-plus");
const child_process = require("child_process"); // run terminal commands

module.exports = { getPackageCompletions };

var alreadyCalled = false; // for getPackageCompletions().
function getPackageCompletions(prefix, cache, emitter) {

  // Just a patch to ensure the get packages command is not run every letter before the first returns
  if (alreadyCalled || cache.hasCache("packages")) {
    if (cache.hasCache("packages")) {
      let completions = fz.filter(cache.getCache("packages"), prefix, {key:"displayText", allowErrors:false});
      for (let i = 0; i < completions.length; i++) {
        completions[i].replacementPrefix = prefix;
      }
      return completions;
    } else { return; }
  }

  alreadyCalled = true;
  if (emitter) { emitter.emit("get-package-names"); }
  let completions = [];

  let lsPackageCommand = `tlmgr search --file ".*\\.sty"`;
  let child = child_process.spawn(lsPackageCommand, {shell:true});
  let outputString = "";
  child.stdout.setEncoding("utf-8");

  child.stdout.on('error', (err) => {
    console.warn("autocomplete-latex has the following package name completion error:");
    console.error(err);
    cache.setCache("packages", {});
    if (emitter) { emitter.emit("finished-package-names"); }
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
    if (emitter) { emitter.emit("finished-package-names"); }
    return completions;
  });
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
