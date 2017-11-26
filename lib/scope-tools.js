// This file is more of a sandbox right now. Will eventually contain tools to parse scopes, to check matches etc.

const test1 = ".text.tex.latex";
const test2 = ".text.tex.latex .string.other.math";
const test3 = ".text.tex.latex, .text.tex.latex .string.other.math, .text.tex.latex, .text.tex.latex .string.other.math";
const completions = require("./resources/completions.json");

const descriptor1 = ["text.tex.latex"];
const descriptor2 = ["text.tex.latex", "string.other.math.latex"];
const descriptor3 = ["text.tex.latex", "support.function.general.latex"];

/*
The following function turns a string of the form
".text.tex.latex, .text.tex.latex .string.other.math, ..."

Into a nested array of the form
[["text.tex.latex"], ["text.tex.latex", "string.other.math"], [...], ...]

Each outer element can then be checked directly against the scopes provided by scopeDescriptor.
*/
function parseScopeString(scopeString) {
  let completionScopes = [];
  scopeString.trim();
  let scopeArray = scopeString.split(/,\s*/); // turn into array of grouped selectors

  for (let i = 0; i < scopeArray.length; i++) {
    let selectorsArray = [];
    let selectorsString = scopeArray[i];
    selectorsArray = selectorsString.split(/\s+/);

    for (let j = 0; j < selectorsArray.length; j++) {
      selectorsArray[j].trim();
      selectorsArray[j] = selectorsArray[j].replace(/^\./, "");
    }
    completionScopes.push(selectorsArray);
  }
  return completionScopes;
}

const parsed1 = parseScopeString(test1);
const parsed2 = parseScopeString(test2);
const parsed3 = parseScopeString(test3);

console.log(parsed1);
console.log("\n");
console.log(parsed2);
console.log("\n");
console.log(parsed3);
console.log("\n");

/*
This function tests if the completionScopes are all present in the descriptorScopes
*/
function scopesMatch(completionScopes, descriptorScopes) {
  // if all of the scopes in some index i are matched, return true
  for (let i = 0; i < completionScopes.length; i++) {
    let scopeList = completionScopes[i];
    if (matches(scopeList, descriptorScopes)) {
      // a match was found for a list of scopes, so can stop here
      console.log("match between: ");
      console.log(scopeList);
      console.log(descriptorScopes);
      return true;
    } // else move on to the next array of scopes
  }
  // reaches here if matches() returned false for each array of scopes
  return false;
}

function matches(scopeList, scopeDescriptor) {
  for (let i = 0; i < scopeList.length; i++) {
    let scope = scopeList[i];
    for (let j = 0; j < scopeDescriptor.length; j++) {
      let descriptorScope = scopeDescriptor[j];
      if (descriptorScope.startsWith(scope)) {
        break;
      } else if (j === scopeDescriptor.length - 1) {
        return false;
      }
    }
  }
  return true;
}

console.log(scopesMatch(parsed1, descriptor1));
console.log(scopesMatch(parsed1, descriptor2));
console.log(scopesMatch(parsed2, descriptor1));
console.log(scopesMatch(parsed2, descriptor2));

module.exports = {parseScopeString, scopesMatch};
