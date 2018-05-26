<!--
Standard format:

## <version number>
#### Added
- ...

#### Changed
- ...

#### Fixed
- ...

#### Removed
- ...

-->


# Changelog
<!-- ## Unreleased -->

## 0.9.0
#### Added
- Selectively enable default completions by group
- CSON support for user completions
- Example user completions (old format)
- Support `~` as alias for home in completions path
- Check if scope has changed; if not, just return the last set of completions
- `gather` environment added to defaults


#### Changed
- The entry point file name from `autocomplete-latex.js` to `main.js`
- Default arguments of completions have been removed
- Overhauled internal code. Commented extensively to help beginners understand what is happening (and myself too)
- No longer asks to reload Atom when regenerating completions
- Scope keys are now fully handled by [`first-mate`](https://github.com/atom/first-mate). Internal caching and scope handling methods changed and updated appropriately.

#### Fixed
- Better bibliography path finding

#### Removed
- Serialisation of data. Was too wasteful and unnecessary


## 0.8.3
#### Fixed
- Missing dependencies

## 0.8.2
#### Changed
- Updated some default completions
- Order settings

## 0.8.1
#### Added
- Integration with [`busy-signal`](https://atom.io/packages/busy-signal). Activities such as package name grabbing and completion regeneration set the status to busy while still being completed.
- More math completions

#### Fixed
- Bug where package name finding would start a process for every letter typed until the first returned. Now it doesn't.

## 0.8.0
#### Added
- List of common packages (not used)
- Problems with package name completion to README.md
- Note that this package is causing an error when obtaining package names fails
- New completions manager to allow completion grouping
- Defaults in new group format
- Guide on setting up file name completion to README.md
- Command to clear completion registry
- List of features to README.md
- Special case for `$` as start of prefix; this is to support `$ -> \(\)` completion
- Math mode completions that turn `$` and `$$` into `\(\)` and `\[\]` respectively

#### Changed
- Packages are now found using `tlmgr search --file ".*\\.sty"`
- Prefix regex more lenient (now `[\\\!]\w*$`)
- Merging completion objects now done by lodash

#### Fixed
- Bug in construction of package names that was cutting some in half

## 0.7.1
#### Fixed
- Windows bug when parsing output of `tlmgr` for package names

## 0.7.0
#### Added
- Package name completion
#### Fixed
- Default `@...` completion


## 0.6.0
#### Added
- Changelog
- Caching of completions for a given scope
- Configure builtin provider use
- Basic TikZ commands
- The `\tracing...` macros

#### Changed
- Refactored code
- Default completions are more consistent with each other
- Settings reordered

#### Removed
- Old test code from scope-tools file

## 0.5.1 and prior
No changes documented here. See the [releases](https://github.com/Aerijo/autocomplete-latex/releases) page to access version comparisons.
