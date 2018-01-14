/*
  This file handles completions of installed packages. It searches using
  `tlmgr list --only-installed`, parses the result, caches it, and returns
  the valid package names.
*/

const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const fz = require("fuzzaldrin-plus");
const child_process = require("child_process"); // run terminal commands

function packageCompletions(prefix, cache) {
  if (cache.hasCache("packages")) {
    let completions =  fz.filter(cache.getCache("packages"), prefix, {key:"displayText", allowErrors:false});
    for (let i = 0; i < completions.length; i++) {
      completions[i].replacementPrefix = prefix;
    }
    return completions;
  }

  let lsPackageCommand = "tlmgr list --only-installed"

  child_process.exec(lsPackageCommand, (error, stdout, stderr) => {
    if (error) { // if there's an error, assume tlmgr is not installed. MikTeX support can be added later.
      cache.setCache("packages", {});
      return {};
    }

    let completions = parseTlmgrOutput(stdout);
    cache.setCache("packages", completions);

    completions = fz.filter(completions, prefix, {key:"displayText", allowErrors:false});
    for (let i = 0; i < completions.length; i++) {
      completions[i].replacementPrefix = prefix;
    }
    return completions;
  });
}

function parseTlmgrOutput(rawOutput) {
  let packages = rawOutput.split(/\n/);
  let completions = [];
  for (let i = 0; i < packages.length; i++) {
    let suggestion = {};
    let entry = packages[i];
    let data = entry.match(/(\S+):(.*)$/);
    if (!data) { continue; }

    if (data[1].match(".x86_64-darwin")) { continue; } // these are (seemingly) not valid packages

    let displayText = data[1].trim();
    suggestion.displayText = displayText;
    suggestion.text = displayText;
    suggestion.description = data[2].trim();

    completions.push(suggestion);
  }

  // The following packages are not listed in the tlmgr output.
  // This should be it, according to https://tex.stackexchange.com/a/341813/114743

  completions.push({
    displayText: "fontenc",
    text: "fontenc",
    description: "Change output font encoding"
  },
  {
    displayText: "lmodern",
    text: "lmodern",
    description: "Latin modern fonts in outline formats"
  },
  {
    displayText: "graphicx",
    text: "graphicx",
    description: "Improved version of the graphics package"
  },
  {
    displayText: "lscape",
    text: "lscape",
    description: "Part of the graphics package"
  },
  {
    displayText: "verbatim",
    text: "verbatim",
    description: "Improved verbatim command and environments"
  });

  return completions;
}

module.exports = { packageCompletions }
