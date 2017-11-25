# autocomplete-latex docs

## Startup
At startup, it will read in completions from the provided `completions.json` file in `autocomplete-latex/resources`. It will use this to setup a list of observed scopes, and use caches to improve scope checking responsiveness.

The `loadProperties` function handles this, and `completions.json` is of the form
```
{
  "scope": {
    "displayText": {
      "prefix": "what the user types to see this snippet",
      "snippet": "what the snippet will expand into"
      "description": "(optional) describes what the snippet is for"
      "descriptionMoreURL": "(optional) URL for more info"
    }
  }
}
```

Eventually, it can be made to look for completion sources from custom files, allowing greater customisation.

## Providing completions
When obtaining relevant suggestions, the provider will do the following:
- Check the current scope against the array of observed scopes
- Add the type and completion of each suggestion in a matching scope to the array that will be returned when finished

### Provided variables
- `editor`: instance of TextEditor class
- `bufferPosition`: object with row and col of cursor
- `scopeDescriptor`: object with `scope` property that holds an array of current scopes


## todo:
- Make the magic comment prefixes like `!root` (as opposed to `!TEX root`) to make it easier to get the right one.
