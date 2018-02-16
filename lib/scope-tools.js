const _ = require("lodash");
const { ScopeSelector } = require("first-mate");

/*
  The following function turns a string of the form
  ".text.tex.latex, .text.tex.latex .string.other.math, ..."

  Into a nested array of the form
  [["text.tex.latex"], ["text.tex.latex", "string.other.math"], [...], ...]

  Each outer element can then be checked directly against the scopes provided by scopeDescriptor.
*/
function parseScopeString(scopeString) {
  scopeString = scopeString.slice(1);
  scopeSelector = new ScopeSelector(scopeString);
  // console.log(scopeSelector);
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

/*
  This function tests if the completionScopes are all present in the descriptorScopes
*/
function scopesMatch(completionScopes, descriptorScopes) {
  // if all of the scopes in some index i are matched, return true
  for (let i = 0; i < completionScopes.length; i++) {
    let scopeList = completionScopes[i];
    if (matches(scopeList, descriptorScopes)) {
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

/*
  Merges two sets of completions into one object.
  The first object takes priority if there are any direct clashes.
  Indirect clashes (e.g. same displayText in different scopes) are not handled.
*/

function mergeCompletionObjects(first, second) {
  return _.mergeWith({}, first, second, function customizer(objValue, srcValue) {
   if (_.isArray(objValue)) {
     return objValue.concat(srcValue);
   }
 });
}

/* // Old solution: made redundant by lodash

function mergeCompletionObjects(first, second) { // first will take priority in any duplicates
  let merged = JSON.parse(JSON.stringify(first)); // make an unlinked copy
  let clashes = [];
  for (let scopeKey in second) {
    if (scopeKey in first) {
      for (let typeKey in second[scopeKey]) {
        if (typeKey in first[scopeKey]) {
          for (let i = 0; i < second[scopeKey][typeKey].length; i++) {
            let secondDisplay = second[scopeKey][typeKey][i].displayText || second[scopeKey][typeKey][i].prefix;
            for (let j = 0; j < first[scopeKey][typeKey].length; j++) {
              let firstDisplay = first[scopeKey][typeKey][j].displayText || first[scopeKey][typeKey][j].prefix;
              if (firstDisplay === secondDisplay) {
                break;
              } else if (j === first[scopeKey][typeKey].length - 1) {
                merged[scopeKey][typeKey].push(second[scopeKey][typeKey][i]);
              }
            }
          }
        } else {
          merged[scopeKey][typeKey] = second[scopeKey][typeKey];
        }
      }
    } else {
      merged[scopeKey] = second[scopeKey];
    }
  }
  return merged;
}

*/

module.exports = {parseScopeString, scopesMatch, mergeCompletionObjects};
