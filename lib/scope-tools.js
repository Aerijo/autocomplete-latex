// This file is more of a sandbox right now. Will eventually contain tools to parse scopes, to check matches etc.

const test1 = ".text.tex.latex";
const test2 = ".text.tex.latex .string.other.math";
const test3 = ".text.tex.latex, .text.tex.latex .string.other.math, .text.tex.latex, .text.tex.latex .string.other.math";
const completions = require("./resources/completions.json");

// takes string of separate scopes (comma separated), returns array of scope strings
multipleScopeStringToArray = function(scopeString) {
  scopeString.trim();
  scopeString = scopeString.split(/,\s*/);
  return scopeString; // if one of these has an exact or better match with scopeDescriptor, then it is a match
};

// takes string of scopes that must all match, returns array of scopes that must all match in same format as scopeDescriptor
// the resulting array must be an exact of more general match to the scopeDescriptor to be a success
spaceSeparatedSelectorsToArray = function(scopeString) {
  scopeString.trim();
  if (scopeString.search(",") !== -1) { throw "this `,` shouldn't be here!";}
  scopeString = scopeString.split(/\s+/);
  for (let i = 0; i < scopeString.length; i++) { // formatting to be like scopeDescriptor
    scopeString[i] = scopeString[i].replace(/^\./, "");
  }
  return scopeString; // an array where all of these array elements must match or be more general than the scopeDescriptor passed by autocomplete+
};

console.log(multipleScopeStringToArray(test3));
console.log(spaceSeparatedSelectorsToArray(test2));
console.log(spaceSeparatedSelectorsToArray(test1));

// takes a flat completionScope array and determines if it matches the scopeDescriptor
scopesMatch = function(completionScope, scopeDescriptor) {
  for (let i = 0; i < completionScope.length; i++) {
    let scope = completionScope[i];
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
};

console.log(scopesMatch(spaceSeparatedSelectorsToArray(test2), spaceSeparatedSelectorsToArray(test1)));

for (var scope in completions) {
  for (var type in completions[scope]) {
    for (var descriptorText in completions[scope][type]) {
      console.log(descriptorText);
    }
  }
}
