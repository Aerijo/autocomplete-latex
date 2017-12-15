# autocomplete-latex docs

## Startup
At startup, it will read in completions from the provided `completions.json` file in `autocomplete-latex/resources`. It will use this to setup a list of observed scopes, and use caches to improve scope checking responsiveness.

The `loadProperties` function handles this, and `completions.json` is of the form
```
{
  "scope": { // eg. "text.tex.latex"
    "type": [ // eg. "snippet"
        // required
        "displayText": "what the user types to see this snippet",
        "snippet": "what the snippet will expand into"

        // optional
        "description": "(optional) describes what the snippet is for"
        "descriptionMoreURL": "(optional) URL for more info"
        "leftLabel": "appears to the left",
        "leftlabelHTML": "more complicated form",
        "rightLabel": "appears to right",
        "rightLabelHTML": "more complicated form",
        "className": "? see API for more info",
        "iconHTML": "ditto",
        "characterMatchIndices": [ditto]

        // additional optional
        "replacementPrefix": "/regex/ not really required to know / use. Just in here to fully support provider options."
      }
    ]
  }
}
```
Most of these entries are defined in the [provider API](https://github.com/atom/autocomplete-plus/wiki/Provider-API#suggestions). Some are slightly different, so they may get new names in time (I will try to ensure backwards compatibility when custom completions are supported).

Eventually, it can be made to look for completion sources from custom files, allowing greater customisation.

## Providing completions
When obtaining relevant suggestions, the provider will do the following:
- Check the current scope against the array of observed scopes
- Add the type and completion of each suggestion in a matching scope to the array that will be returned when finished

### Variables provided by `autocomplete-plus`
- `editor`: instance of TextEditor class
- `bufferPosition`: object with row and col of cursor
- `scopeDescriptor`: object with `scope` property that holds an array of current scopes
- `prefix`: string of prefix characters as determined by `autocomplete-plus`: not used, as `\` can only be found using a custom prefix.
- `activated-manually`: not used, as irrelevant.


## todo:
- Optimise (but only after everything works)
- Separate completions by package
  - Give user option to automatically detect packages, or to manually select.
- (primitively) detect new user commands defined with `[egx]def` or `let`
