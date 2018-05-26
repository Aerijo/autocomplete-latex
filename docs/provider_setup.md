# autocomplete-latex docs

## User completions format
A couple of different formats are supported. This is the most recent one. The outer keys are "groups" for the completions, and will eventually be able to  be individually enabled and disabled.
```json
{
  "imports": {
    ".text.tex.latex": {
      "import": [
        {
          "displayText": "\\include",
          "snippet": "\\\\include{$1}$2"
        },
        {
          "displayText": "\\input",
          "snippet": "\\\\input{$1}$2"
        }
      ],
      "package": [
        {
          "displayText": "\\usepackage",
          "snippet": "\\\\usepackage$2{$1}$3",
          "description": "Load a package",
          "descriptionMoreURL": "https://www.sharelatex.com/learn/Creating_a_document_in_LaTeX#!#The_preamble_of_a_document"
        },
        {
          "displayText": "\\documentclass",
          "snippet": "\\\\documentclass$2{$1}$3",
          "description": "Set document class",
          "descriptionMoreURL": "https://en.wikibooks.org/wiki/LaTeX/Document_Structure#Document_classes"
        }
      ]
    }
  },
  "generalEnvironments": {
    ".text.tex.latex": {
      "snippet": [
        {
          "displayText": "\\begin",
          "snippet": "\\\\begin{$1}$2\n\t$3\n\\\\end{$1}",
          "description": "Begin new environment",
          "descriptionMoreURL": "https://www.sharelatex.com/learn/Environments"
        },
        {
          "displayText": "\\document",
          "snippet": "\\\\begin{document}\n$1\n\\\\end{document}"
        },
        {
          "displayText": "\\figure",
          "snippet": "\\\\begin{figure}[$1]\n\t\\\\centering\n\t\\\\includegraphics{$2}\n\t\\\\caption{$3}\n\t\\\\label{$4}\n\\\\end{figure}"
        },
        {
          "displayText": "\\table",
          "snippet": "\\\\begin{table}[$1]\n\t\\\\centering\n\t\\\\begin{tabular}{$2}\n\t\t$3\n\t\\\\end{tabular}\n\t\\\\caption{$4}\n\t\\\\label{$5}\n\\\\end{table}"
        }
      ]
    }
  },
}
```

CSON is also supported, and can make it look cleaner.
