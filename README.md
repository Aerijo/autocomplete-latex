# autocomplete-latex

## Table of contents

- [About](#about)
- [Installation](#installation)
- [Usage](#usage)
  - [Requirements](#requirements)
  - [Setup](#setup)
- [Configuration](#configuration)
  - [Adding completions](#adding-completions)

## About
This package is intended to be used with [Atom](https://atom.io).

It provides a range of customisable "completions" that appear when typing a command. When one is selected, it will expand to a predefined snippet of text that can then be used like normal.

The benefits of this package include reduced [boilerplate](https://en.wikipedia.org/wiki/Boilerplate_code) typing and fewer errors (especially for LaTeX beginners). For example, one of the default completions prefixes is `\figure`. Expanding this results in the following text insertion:
```latex
\begin{figure}[]
  \centering
  \includegraphics{}
  \caption{}
  \label{}
\end{figure}
```
with the cursor placing itself between the first optional brackets. Pressing `tab` then cycles through the bracket pairs, enabling quick and easy figure insertion.

This functionality may already be present as snippets from other packages. However, there are certain things this package can do that are difficult / impossible to do with snippets. Some are aesthetic, but others include better scope parsing and customisability.

## Installation
To install, run `apm install autocomplete-latex` or find it in Atom's builtin package manager.

## Usage
### Requirements

- The package [`autocomple-plus`](https://atom.io/packages/autocomplete-plus) be activated. This is a builtin package, so no additional download required.

- A grammar scoping package for LaTeX. These are the ones titled `language-something`. The most popular one is [`language-latex`](https://atom.io/packages/language-latex), but [my own](https://atom.io/packages/language-latex2e) will also work. I haven't tested with any others that scope latex, but they should work if they follow established conventions.
  - Note: If you have syntax highlighting setup, you probably already have one installed.

### Setup
You don't need to configure anything to get started; this package will work out of the box to provide completions for common patterns such as `\begin`, `\usepackage`, `\frac{}{}`, etc.

To include your own completions, see [Adding completions](#adding-completions)

## Configuration
### Adding completions
Look in docs for format, feature availible.
