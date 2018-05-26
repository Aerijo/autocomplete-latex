const _ = require("lodash");
const { ScopeSelector } = require("first-mate");

module.exports = { scopesMatch, mergeCompletionObjects, stringToSelector };

function parseScopeString(scopeString) {
  if (scopeString[0] === ".") {
    let scopesArray = scopeString.split(" ");
    for (let i = 0; i < scopesArray.length; i++) {
      if (scopesArray[i][0] === ".") {
        scopesArray[i] = scopesArray[i].slice(1);
      }
    }
    scopeString = scopesArray.join(" ");
  }
  return scopeString;
}

function stringToSelector(scopeString) {
  parsedString = parseScopeString(scopeString);
  let scopeSelector = new ScopeSelector(parsedString);
  return scopeSelector;
}

/*
  This function tests if the completionScopes are all present in the descriptorScopes
*/
function scopesMatch(scopeString, scopeDescriptor) {
  let scopeSelector = stringToSelector(scopeString);
  return scopeSelector.matches(scopeDescriptor.scopes);
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
