# autocomplete-latex

## Table of contents

- [About](#about)
- [Installation](#installation)
- [Usage](#usage)
  - [Requirements](#requirements)
  - [Setup](#setup)
  - [In document](#in-document)
- [Configuration](#configuration)
  - [Settings](#settings)
  - [Adding completions](#adding-completions)

## About
This package is intended to be used with [Atom](https://atom.io).

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

## Installation
To install, run `apm install autocomplete-latex` or find it in Atom's builtin package manager.

## Usage
### Requirements

- The package [`autocomple-plus`](https://atom.io/packages/autocomplete-plus) be activated. This is a builtin package, so no additional download required.

- A grammar scoping package for LaTeX. These are the ones titled `language-something`. The most popular one is [`language-latex`](https://atom.io/packages/language-latex), but [my own](https://atom.io/packages/language-latex2e) will also work. I haven't tested with any others that scope LaTeX, but they should work if they follow established conventions.
  - Note: If you have syntax highlighting setup, you probably already have one installed.

### Setup
You don't need to configure anything to get started; this package will work out of the box to provide completions for common patterns such as `\begin`, `\usepackage`, `\frac`, etc.

### In document
As mentioned above, completions will automatically appear when typing. These suggestions are filtered and ranked according to the prefix, which is defined as a `\` followed by any number of letters (`\\[a-zA-Z]*` for you [regex](https://www.marksanborn.net/howto/learning-regular-expressions-for-beginners-the-basics/) fans) up until the cursor. If any non-letters are present (eg. number or space) it will no longer show the completions and will wait until a vaild prefix is reached again.

  - Note: it will also activate immediately after a `!`. This is to support [magic comment](https://tex.stackexchange.com/questions/78101/when-and-why-should-i-use-tex-ts-program-and-tex-encoding) completions as well.

The current scope also affects which completions appear, so you'll only see commands like `\frac` as an option when in math mode.

If something unexpected is occuring, check your [settings](#settings). Make sure all the [requirements](#requirements) are also met. If the issue persists, [open an issue](https://github.com/Aerijo/autocomplete-latex/issues) on the repo page and I'll try to help. It's still a young package, so I wouldn't expect it to be perfect (yet :wink:).

To define your own completions, see [Adding completions](#adding-completions)

## Configuration
### Settings
In the settings view, there are several options available to customise how this package works. If changing a setting does not appear to work, try restarting Atom.

#### Completion regex
If you don't know what [`regex`](https://www.marksanborn.net/howto/learning-regular-expressions-for-beginners-the-basics/) is, don't touch this setting. If you change it, make sure to put it back to the default. You've been warned.

If you know what you're doing, this setting determines which characters are considered a valid prefix to the completion. The `$` represents the current cursor position, and it can look back as far as the beginning of the line.

#### Disabled scopes
A list of scopes where you do not want to see completions from this package. To know which scopes to use, run the command `editor:log-cursor-scope` in the command palette. The notification that pops up will list the current scopes of the cursor. For example, doing this in a commented section might give the following scopes:
- `text.tex.latex`
- `comment.line.percentage.latex`

In order to disable completions in comments, you can set the value of this setting to `.comment` (note the starting `.`; it's important!). This will look for whether any of the scopes you're in start with `comment` (like in the example), and suppress completions if true.

You can be as precise as you like; a value of `.string.other.math.inline` will suppress when in inline math mode, whereas `.string.other.math.display` will suppress it in display math mode. You can also require multiple scopes to be true by `space` separating the scopes. Eg.
- `.suppress.for.this.scope .suppress.for.that.scope`

will suppress completions when both scopes are present. Similarly, `comma` separated groups will suppress completions if at least one matches. Eg.
- `.comment, .string.other.math.display .string.other.math.inline`

will disable completions if the current scope is part of a comment or in math mode. (Note: if you want to disable all math snippets, `.string.other.math` will disable for both inline AND display).

#### Enable default completions
This option allows you to disable the default completions. This may be preferable if you have a highly customised setup. Note that user completions will appear above the default completions if both share the same display text.

#### Minimum prefix length
Determines how long the prefix must be until suggestions will appear. Default value is equal to the one set for `autocomplete-plus`. Making it greater will reduce noise, but lessen effectiveness.

#### User completions path
Use this to provide the path to your own completions. Ensure it is an absolute path, and that you include the file extension as well (should be `.json`).


### Adding completions
**Not stable**: Look in docs for current format.
- Note: I'm still not satisfied with the current format. Expect it to continue to change to make organising related sections better.
  - Eg. I want to be able to make groups that can be enabled/disabled easily.

- Also, the file can be `.js` as well, so long as it's export is an object with the same properties of the `.json`.
