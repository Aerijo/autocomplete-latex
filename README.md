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

The builtin autocomplete is based on 'words'. This makes it very aggressive for something like LaTeX, where most content is regular text.

This package restricts when it will show completions to only when you type `\` or similar. It also provides a bunch of builtin completions, as well as basic citation and package completion.

## Features

- Comes with a set of common completions
  - Selectively enable / disable these by group.
  - You can override these in your with completion definitions.
- Specify the scope of each set of completions
- Supports user provided completions
- Completes [magic comments](https://tex.stackexchange.com/questions/78101/when-and-why-should-i-use-tex-ts-program-and-tex-encoding)
- Completes citations using markdown-like syntax (`@...`)
- Package name completion using `tlmgr` command line tool\*

\* Package completions are scraped from a list of all `.sty` files `tlmgr` can find. Many of these are not intended to be used directly with a `\usepackage{}` command, so always check the documentation if unsure.

## Installation

To install, run `apm install autocomplete-latex` or find it in Atom's builtin package manager.

## Usage

### Requirements

- The packages [`autocomplete-plus`](https://atom.io/packages/autocomplete-plus) and [`autocomplete-snippets`](https://atom.io/packages/autocomplete-snippets) be activated. These are builtin packages, so no additional downloads required.

- A grammar scoping package for LaTeX. These are the ones titled `language-something`. The most popular one is [`language-latex`](https://atom.io/packages/language-latex), but [my own](https://atom.io/packages/language-latex2e) or any other LaTeX one should also work.

- For package autocompletion, the command line tool `tlmgr` must be installed. It comes with TeX Live and MacTeX, but I believe it can be installed when using MiKTeX too.

- [optional][`busy-signal`](https://atom.io/packages/busy-signal) can be installed to have a visual cue for when this package is doing something. For example, it will show a busy state when gathering available LaTeX package names.

### Setup

You don't need to configure anything to get started; this package will work out of the box to provide completions for common patterns such as `\begin`, `\usepackage`, `\frac`, etc. For a more customised use, see [Adding completions](#adding-completions). E.g., many provided completions add extra cursor tab stops for possible options, which you may prefer to redefine to not include.

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

Use this to provide the path to your own completions. Ensure that you include the file extension as well. The completions should automatically refresh when you edit or change the file, but if they don't then try restarting Atom. If they still don't work, check dev tools (`Window: Toggle Dev Tools` in command palette) for errors. Include a screenshot of the errors if you need to raise an issue.

#### Enable builtin provider

Use this to allow the completions provided by `autocomplete-plus`. These are not controlled by this package, so settings here will not affect them. They are the words taken from open buffers that appear as you type.

#### Enable citation completions

This package supports markdown-like syntax for citations. When enabled, typing `@` followed by non-space characters will show completions scraped from the `.bib` file, if it can be located. The file path must be given somewhere in the current file for this to work, and the magic comment `% !TEX bib = ...` is supported. Only a single `.bib` file is supported, and the most reliable way to have it be found is using the magic comment. The implementation is just a inefficient hack, I have not tested this feature on large (1000+ citations) files. If you are working on a more substantial project, consider using a language server like Texlab.

#### Enable package completions

An attempt will be made to find all packages installed by TeX Live and present them when inside a `\usepackage{}` command. This will only work if the `tlmgr` command is installed.

- The right hand side text is the name of the package on CTAN if it does not match the name of the package file (it's packages all the way down -\_-).
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

The format for what `@...` should be replaced with. All backslashes must be doubled up, and at least one `${cite}` (literally) must be somewhere to represent where the citation text will go. Otherwise acts like a snippet.

#### :warning: Completion regex

If you don't know what [regex](https://www.marksanborn.net/howto/learning-regular-expressions-for-beginners-the-basics/) is, don't touch this setting. If you change it, make sure to put it back to the default. You've been warned.

If you know what you're doing, this setting determines which characters are considered a valid prefix to the completion. The `$` represents the current cursor position, and it can look back as far as the smaller of the beginning of the line or 100 characters. Backslashes do **not** need to be doubled up.

#### :warning: Citation completion regex

Same as above, but for citation completions.

### Adding completions

This package supports defining additional completions in `.json` and `.cson` file types. The top level properties must be names representing the set of completions they contain (currently serves no purpose, so may as well group under `user` or something. In future I may add a way to disable them by this name, like you can do for he builtins).

The value of each top level key is an object, which has selectors as keys. These control where the completion appears. For example,

- `*` means anywhere
- `.string.other.math, .markup.other.math` means only inside math environments (which scope depends on your grammar package, but the comma operator acts as 'or', so this scope should work for all LaTeX grammar packages).

The value under each selector is yet another object, this time with keys representing the kind of completion. This is used in the autocomplete popup to add an icon to the suggestion. From the `autocomplete-plus` docs,

> Predefined styles exist for variable, constant, property, value, method, function, class, type, keyword, tag, snippet, import, require

For example, the builtin completions differentiate between `\textbf` as a "method" (as the expansion is almost the same) and `\figure` as a "snippet" (as it expands to a whole environment boilerplate).

Finally, under each kind is an array of completions. These work like regular snippets. See [the autocomplete-plus suggestions](https://github.com/atom/autocomplete-plus/wiki/Provider-API#suggestions) docs for a full list of values. Make sure to define `displayText`; it is not optional for this package.

This looks like a lot to cover, so here is some boilerplate to get started.

```
{
  "user": {
    "*": {
      "snippet": [
        {
          "displayText": "\\hello",
          "snippet": "Hello world!"
        },
        {
          "displayText": "\\second",
          "snippet": "Second snippet"
        }
      ],
      "method": [
        {
          "displayText": "\\method",
          "snippet": "this looks like a method in the autocomplete popup"
        }
      ]
    },
    ".string.other.math, .markup.other.math": {
      "snippet": [
        {
          "displayText": "\\math",
          "snippet": "This only appears in math contexts"
        }
      ]
    }
  }
}
```
