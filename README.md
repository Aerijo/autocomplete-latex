[See this on atom.io](https://atom.io/packages/autocomplete-latex)
# autocomplete-latex

## Table of contents

- [About](#about)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Requirements](#requirements)
  - [Setup](#setup)
  - [In document](#in-document)
- [Configuration](#configuration)
  - [Settings](#settings)
  - [Commands](#commands)
  - [Adding completions](#adding-completions)

## About
This package is intended to be used with [Atom](https://atom.io).

- **Note**: This package is compatible with [`latex-autocomplete`](https://atom.io/packages/latex-autocomplete) and does not necessarily replace it's functionality. They perform different types of autocompleting. Both can be enabled simultaneously without conflict.

It provides a range of customisable "completions" that appear when typing a command. When one is selected, it will expand to a predefined snippet of text that can then be used like normal.

The benefits of this package include reduced [boilerplate](https://en.wikipedia.org/wiki/Boilerplate_code) code and fewer errors (especially for LaTeX beginners). For example, one of the default completions prefixes is `\figure`. Expanding this results in the following text insertion:
```latex
\begin{figure}[]
  \centering
  \includegraphics{}
  \caption{}
  \label{}
\end{figure}
```
with the cursor placing itself between the first optional brackets. Pressing `tab` then cycles through the bracket pairs, enabling quick and easy figure insertion.

This functionality may already be present as snippets from other packages. However, there are certain things this package can do that are difficult or impossible to do with snippets. Some are aesthetic, but others include better scope parsing and customisability.

Further functionality includes:

- Markdown-like citations (with `@...`)
- Magic comment completions
- Package name completions.
  - The package completions are taken from your TeX Live installation, and many are not designed to be used directly, or are deprecated and should not be used at all. Some are also engine specific, so just appearing in the list is no guarantee it will work or should be used. If you find this feature more annoying than useful, it can be disabled in settings.
- Math mode `$` as prefix for `\(\)`, and `$$` as prefix for `\[\]`


### Why use this package?
Presumably, you're here because you want to be able to autocomplete common commands you use. Yes, snippets can do this, but they can be difficult to remember, especially if used infrequently. [`autocomplete-snippets`](https://atom.io/packages/autocomplete-snippets) is a handy package that displays most snippets in a popup as you type, ~~but it has one major flaw when it comes to LaTeX documents: it doesn't support punctuation.~~ _I think it does now_

In any case, I found having a package dedicated to LaTeX completions to be quite handy. Please share ideas for improvements you'd like to see, and I'll do my best to implement it.

## Features
- Comes with a set of common completions
  - Selectively enable / disable these by group. I aim to add even more fine tuning in the future.
- Specify the scope of each set of completions
- Supports user provided completions
- Completes [magic comments](https://tex.stackexchange.com/questions/78101/when-and-why-should-i-use-tex-ts-program-and-tex-encoding)
- Completes citations using markdown-like syntax (`@...`)
- Package name completion using `tlmgr` command line tool*
- Completes file paths after magic comments (`root` and `bib` only) and inside of `\input{}` and `\include{}`**

\* Package completions are scraped from a list of all `.sty` files `tlmgr` can find. Many of these are not intended to be used directly with a `\usepackage{}` command, so always check the documentation if unsure.

\** Path completion has additional [requirements](#requirements).

## Installation
To install, run `apm install autocomplete-latex` or find it in Atom's builtin package manager.

## Usage
### Requirements

- The packages [`autocomplete-plus`](https://atom.io/packages/autocomplete-plus) and [`autocomplete-snippets`](https://atom.io/packages/autocomplete-snippets) be activated. These are builtin packages, so no additional downloads required.

- A grammar scoping package for LaTeX. These are the ones titled `language-something`. The most popular one is [`language-latex`](https://atom.io/packages/language-latex), but [my own](https://atom.io/packages/language-latex2e) will also work. If you have another one you'd like to use, make an issue and I'll add support for it.

- For package autocompletion, the command line tool `tlmgr` must be installed. It comes with TeX Live and MacTeX.

- For path autocompletion, [`autocomplete-paths`](https://atom.io/packages/autocomplete-paths) must be installed and the steps in [Setup](#setup) must be followed.

- [optional] [`busy-signal`](https://atom.io/packages/busy-signal) can be installed to have a visual cue for when this package is doing something. For example, it will show a busy state when gathering available LaTeX package names. This package will prompt you to install it, but that can be permanently dismissed without issue.

### Setup
You don't need to configure anything to get started; this package will work out of the box to provide completions for common patterns such as `\begin`, `\usepackage`, `\frac`, etc. For a more customised use, see [Adding completions](#adding-completions).

If you want file paths to be completed, you can use [`autocomplete-paths`](https://atom.io/packages/autocomplete-paths). Once installed, paste the following into your `config.cson` file (make sure it's in line with the other package names; if the `"autocomplete-paths"` key is already there, paste the part from `scopes` and down, including the last `]`):
```cson
"autocomplete-paths":
  scopes: [
    {
      extensions: [
        ".tex"
        ".bib"
        ".tikz"
      ]
      prefixes: [
        "\\\\input{"
        "\\\\include(?:only)?{([^\\}]*?\\,\\s*)*"
        "\\\\(?:addbibresource|add(?:global|section)bib)(?:\\[.*?\\])?{"
        "^%\\s*!T[eE]X\\s+(root|bib)\\s*=\\s*"
      ]
      relative: true
      scopes: [
        "text.tex.latex"
        "text.tex.latex.tikz"
      ]
    }
    {
      extensions: [
        ".jpeg"
        ".jpg"
        ".png"
      ]
      prefixes: [
        "\\\\includegraphics(\\[.*?\\])?{"
      ]
      relative: true
      scopes: [
        "text.tex.latex"
        "text.tex.latex.tikz"
      ]
    }
    {
      extensions: [
        ".*"
      ]
      prefixes: [
        "\\\\inputminted\\{.*\\}\\{"
      ]
      relative: true
      scopes: [
        "text.tex.latex"
        "text.tex.latex.tikz"
      ]
    }
  ]
```

If you have improvements, or a better way to do this, please let me know.

### In document
As mentioned above, completions will automatically appear when typing. These suggestions are filtered and ranked according to the prefix, which is defined as a `\` followed by any number of letters up until the cursor. If any non-letters are present (eg. number or space) it will no longer show the completions and will wait until a valid prefix is reached again.

  - **Note**: There are special cases where it will also activate, including after an `!` and an `@`. This is to support [magic comment](https://tex.stackexchange.com/questions/78101/when-and-why-should-i-use-tex-ts-program-and-tex-encoding) completions and markdown-like citations. It will also activate inside a `\usepackage{}` command, giving a (hopefully) exhaustive list of all package installed on your distribution.

The current scope also affects which completions appear, so you'll only see commands like `\frac` as an option when in math mode.

 - **Tip**: the completions will appear if the current prefix is an ordered subset of the potential completion. This means that while you _could_ type `\subsub` to get the `\subsubsection` completion, you could just type `\sbb` instead.

If something unexpected is occurring, check your [settings](#settings). Make sure all the [requirements](#requirements) are also met. If the issue persists, [open an issue](https://github.com/Aerijo/autocomplete-latex/issues) on the repository page and I'll try to help.

To define your own completions, see [Adding completions](#adding-completions). The provided defaults, especially for packages, are what I consider to be widely applicable for many users. They are not exhaustive, so you will need to check the documentation for more, and add extras to your personal completions list if desired.

## Configuration
### Settings
In the settings view, there are options available to customise how this package works. If changing a setting does not appear to work, try restarting Atom.

#### User completions path
Use this to provide the path to your own completions. Ensure that you include the file extension as well. More info about what this file can be is found in [Adding completions](#adding-completions) and `./docs/`.

- Support was recently added for using `~` as an alias for the system home folder. If it's not working for you, please let me know.

#### Enable default completions
This option allows you to disable all the default LaTeX completions. This may be preferable if you have a highly customised setup. Note that user completions will always override the default completions if both share the same display text.

#### Enable builtin provider
Use this to allow the completions provided by `autocomplete-plus`. These are not controlled by this package, so settings here will not affect them. They are the words taken from open buffers that appear as you type.

#### Enable citation completions
This package supports markdown-like syntax for citations. When enabled, typing `@` followed by non-space characters will show completions scraped from the `.bib` file, if it can be located. The file path must be given somewhere in the current file for this to work, and the magic comment `% !TEX bib = ...` is supported.

- If you have issues with this, please let me know. Be sure to include the precise file contents to reproduce the issue, along with the relative locations of all the files.

#### Enable package completions
An attempt will be made to find all packages installed by TeX Live and present them when inside a `\usepackage{}` command. This will only work if the `tlmgr` command is installed, so MikTeX is not supported (yet).

- The list also contains a lot of "junk", but I have no way of filtering out files that aren't meant to be used directly. If you know how, let me know.

#### Minimum prefix length
Determines how long the prefix must be until suggestions will appear. Default value is that of `autocomplete-plus`. Making it greater will reduce 'noise', but decrease effectiveness (because lessening typing is what this is all about; well, that and reducing typos).

#### Disabled scopes
A list of scopes where you do not want to see completions from this package. To know which scopes to use, run the command `editor:log-cursor-scope` in the command palette. The notification that pops up will list the current scopes at the cursor. For example, doing this in a commented section might give the following scopes:
- `text.tex.latex`
- `comment.line.percentage.latex`

In order to disable completions in comments, you can set the value of this setting to `.comment` (note the starting `.`; it's important!). This will look for whether any of the scopes you're in start with `comment` (like in the example), and suppress completions if true.

You can be as precise as you like; a value of `.string.other.math.inline` will suppress when in inline math mode, whereas `.string.other.math.display` will suppress it in display math mode. You can also require multiple scopes to be true by `space` separating the scopes. Eg.
- `.suppress.for.this.scope .suppress.for.that.scope`

will suppress completions when both scopes are present. Similarly, `comma` separated groups will suppress completions if at least one matches. Eg.
- `.comment, .string.other.math.display .string.other.math.inline`

will disable completions if the current scope is part of a comment _or_ in math mode. (Note: if you want to disable all math snippets, `.string.other.math` will disable for both inline _and_ display).

#### Citation format
The format for what `@...` should be replaced with. All backslashes must be doubled up, and a single `$` must be somewhere to represent where the citation text will go.

#### :warning: Completion regex
If you don't know what [regex](https://www.marksanborn.net/howto/learning-regular-expressions-for-beginners-the-basics/) is, don't touch this setting. If you change it, make sure to put it back to the default. You've been warned.

If you know what you're doing, this setting determines which characters are considered a valid prefix to the completion. The `$` represents the current cursor position, and it can look back as far as the beginning of the line. Backslashes do __not__ need to be doubled up.

#### :warning: Citation completion regex
Same as above, but for `@...` completions.

### Commands
#### Clear cache
Introduced in v0.6.0, this command manually empties the cached completions. Redundant now, but may be useful if trying to debug.

#### Regenerate completions
Stronger version of `Clear cache`. Also not normally needed, but may help if you find an issue with the completion list not updating properly.

### Adding completions
**Not stable**: Look in docs for current format.

- Supports `.json`, `.cson`, and `.js` file types. The JS file must export the completions object like shown

```js
const completions = {
  // Fill in completions
}
module.exports = completions
```
