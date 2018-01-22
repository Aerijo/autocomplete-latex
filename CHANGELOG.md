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
