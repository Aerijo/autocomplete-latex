/*
  This file handles all reference related completions.
  I'm looking to let the work be done by a package that is dedicated to
  this sort of thing, but this basic implementation seems to work decently.
*/

const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const fz = require("fuzzaldrin-plus");

/*
  Turns the file given as a argument into a full completions array.
  Does not sort based on prefix, but needs prefix information to know
  what to replace when inserted.
*/
function parseBibFile(file, prefix) {
  let citationFormat = atom.config.get("autocomplete-latex.citationFormat").split("${cite}");

  // Start just after the first @ sign (ignores any earlier text)
  // & split by the @ sign into separate strings. Needs work, as contents could have @ in it
  let entriesArray = file.substring(file.search("@") + 1).split(/\s*@\s*/);

  let completions = [];
  for (let i = 0; i < entriesArray.length; i++) {
    let suggestion = {};
    let entry = entriesArray[i];

    let type = entry.match(/^\s*(.*?)\s*\{/);
    if (!type) { continue; }
    suggestion.type = type[1];

    let displayText = entry.match(/\{\s*(.*?)\s*,/);
    if (!displayText) { continue; }
    suggestion.displayText = displayText[1];
    suggestion.snippet = citationFormat[0] + suggestion.displayText + citationFormat[1];
    suggestion.replacementPrefix = prefix;

    completions.push(suggestion);
  }
  return completions;
}

/*
  Attempts to find the .bib file using a number of methods, with the following priority:
    1. Magic bib comment in current file
    2. Path given by `\addbibresource{...}`
    3. Find the root file given by magic comment
    4. Repeat steps 1 & 2 on this root file
    5. Give up and return false
*/
function findBibFile(editor) {
  let fileText = editor.getText();
  let magicBibPath = fileText.match(/% !T[eE]X bib =\s*(.*)/);
  if (magicBibPath) { // if bib path explicity set, go with that one
    return path.resolve(editor.getDirectoryPath(), magicBibPath[1]);
  }

  let bibPath = fileText.match(/\\addbibresource(?:\[.*?\])?\{(.*?)\}/);
  if (bibPath) {
    bibPath[1] = bibPath[1].trim();
    return path.resolve(editor.getDirectoryPath(), bibPath[1]);
  }

  let rootFile = fileText.match(/% !T[eE]X root =\s*(.*)/);
  if (!rootFile) { return false; }

  rootFile = path.resolve(editor.getDirectoryPath(), rootFile[1]);
  try {
    fileText = fs.readFileSync(rootFile, "utf-8");
  } catch (err) {
    // Fails silently.
    console.warn(`autocomplete-latex could not find root file:\n${err}`);
    return false;
  }

  let rootFilePath = path.dirname(rootFile);

  magicBibPath = fileText.match(/% !T[eE]X bib =\s*(.*)/);
  if (magicBibPath) { // if bib path explicity set, go with that one
    return path.resolve(rootFilePath, magicBibPath[1]);
  }

  bibPath = fileText.match(/\\addbibresource\{(.*?)\}/);
  if (bibPath) {
    return path.resolve(rootFilePath, bibPath[1]);
  }

  // Could also look for \input{} files, as they may contain labels/bib paths

  return false;
}

/*
  Builds the final completions list ready to be passed to autocomplete-plus
*/
function citationCompletions(prefix, editor) {
  let bibFilePath = findBibFile(editor);
  if (!bibFilePath) { return; }

  let completions;
  let data;
  try {
    data = fs.readFileSync(bibFilePath, "utf-8");
  } catch (err) {
    console.warn(`autocomplete-latex could not find bib file:\n${err}`);
    return false;
  }
  completions =  parseBibFile(data, prefix);
  completions = fz.filter(completions, prefix, {key:"displayText", allowErrors:true}); // allowErrors allows any chaarcters
  return completions;
}

module.exports = { citationCompletions };
