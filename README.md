# Bidirectional Folgezettel Plugin for Obsidian

![Version](https://img.shields.io/static/v1?label=bidirectional-folgezettel&message=0.4&color=brightcolor)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
Automatic folgezettel backlink generation for Obsidian notes with bidirectional cross-linking. This plugin is a TypeScript translation of the `org-roam-folgezettel.el` Emacs package by Blaine Mooers.

## What is Folgezettel?

Folgezettel is a hierarchical note-addressing system derived from Niklas Luhmann's Zettelkasten methodology. This variant indexing system is computer filename friendly. Notes receive structured addresses like `1.2a3c5` that encode relationships:

| Address | Meaning |
|---------|---------|
| `1` | Root note |
| `1.2` | Second branch of note 1 |
| `1.2a` | First child of 1.2 |
| `1.2a3` | Third sub-branch of 1.2a |
| `1.2a3aa` | 27th subbranch of 1.2a3 |
| `1.2a3aa55`| 55th sub branch of 1.2a3aa |

Note how after the root note and the period, the numbers and letter alternate. 
The numbers can contain multiple digits and there can be multiple letters after `z` has been used.
No further periods or other symbols are allowed.

## Features

- **Automatic Parent Linking**: When creating a note with a folgezettel address, automatically links to the parent note
- **Bidirectional Links**: Forward links are added to parent notes, backlinks to child notes
- **Cross-Reference Links**: Automatically creates reciprocal links when you manually link notes
- **Child Suggestions**: Suggests the next available child address
- **Keyboard Shortcuts**: All commands are available via hotkeys

## Installation

### From Obsidian Community Plugins

1. Open **Settings** → **Community plugins**
2. Click **Browse** and search for "Bidirectional Folgezettel"
3. Click **Install**, then **Enable**

### Manual Installation

1. Download the latest release (`main.js`, `manifest.json`, `styles.css`)
2. Create folder: `<vault>/.obsidian/plugins/bidirectional-folgezettel/`
3. Copy the files into that folder
4. Reload Obsidian
5. Enable the plugin in **Settings** → **Community plugins**

### From Source

```bash
git clone https://github.com/MooersLab/bidirectional-folgezettel
cd bidirectional-folgezettel
make install
make build
make install-plugin VAULT_PATH=/path/to/your/vault
```

## Usage

### Commands

| Command | Description | Suggested keybinding |
|---------|-------------|----------------------|
| **Add backlink to parent note** | Creates bidirectional link with parent | Option-P |
| **Create next child note** | Creates a new child note with suggested address | Option-C |
| **Suggest next child address** | Shows the next available child address | Option-A |

### Keyboard Shortcuts

1. Go to **Settings** → **Hotkeys**
2. Search for "Folgezettel"
3. Assign your preferred shortcuts

### Automatic Linking

When enabled (default), the plugin automatically:

1. **On note creation**: If the note title contains a folgezettel address, creates links to/from the parent note
2. **On manual linking**: When you create a `[[link]]` to another note, a reciprocal link is added to the target note

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Auto-process new notes | Auto-link on note creation | On |
| Show notifications | Display link insertion notices | On |
| Auto bidirectional cross-links | Create reciprocal links | On |
| Parent link description | Text for parent links | "Parent" |
| Child link description | Text for child links | "Child" |
| Backlink heading | Section for parent links | "Related Notes" |
| Forward link heading | Section for child links | "Child Notes" |
| Cross-link heading | Section for cross-references | "Related Notes" |

## Templates vs Templater

You can specify a template file that will be utilized upon the creation of a child note. The specification is done through the community package called `Templater`. This is not to be confused with the core package called `template`. They use two different template languages.

The core package template has associated with it as a icon that appears in the left panel. When you click on this icon you can select from a template folder in your vault whichever template you wish to use upon the creation of the next note. This core package does not retain memory of the last selection or does it allow you to set a default template.

The problem of setting a default template is solved by the community package [Templater](https://silentvoid13.github.io/Templater/). It utilizes its own [template language](https://silentvoid13.github.io/Templater/) for creating templates. You'll have to turn off the core template package to use this package. See this blog post for the [installation steps](https://jeremiah-roise.github.io/posts/obsidiandefaultnotetemplate/). The tricky part is step 9. The typical configuration would look like the one below. Under the settings for this package, you can set the default template. 

<img width="754" height="252" alt="templaterSetup" src="https://github.com/user-attachments/assets/d6cb15c0-ca8a-415a-a79c-9582f19d918a" />

Before you use this package, you probably have to think about what kind of trouble you may be causing yourself downstream if you're going to export your notes to a different format for use in a different zettelkasten software. You might want to work out the workflow now. At a minimum, you should try running pandoc to convert to the file format required by the target software that you may migrate to. You might have to write your own script to strip out some of the code embedded in the note.


## Development

### Prerequisites

- Node.js 16+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/MooersLab/bidirectional-folgezettel
cd bidirectional-folgezettel

# Install dependencies
make install

# Run tests
make test

# Build
make build
```

### Available Make Targets

```
make install          - Install npm dependencies
make build            - Build production version
make dev              - Run development mode with watch
make test             - Run test suite
make test-watch       - Run tests in watch mode
make test-coverage    - Run tests with coverage report
make lint             - Check code style
make lint-fix         - Fix code style issues
make clean            - Remove build artifacts
make install-plugin   - Install to Obsidian vault
make pre-commit       - Run all checks before commit
```

### Project Structure

```
bidirectional-folgezettel/
├── src/
│   └── main.ts           # Plugin source code
├── tests/
│   ├── __mocks__/
│   │   └── obsidian.ts   # Obsidian API mocks
│   └── folgezettel.test.ts
├── main.js               # Compiled plugin
├── manifest.json         # Plugin metadata
├── styles.css            # Plugin styles
├── package.json          # NPM configuration
├── tsconfig.json         # TypeScript configuration
├── jest.config.js        # Test configuration
├── esbuild.config.mjs    # Build configuration
├── Makefile              # Build automation
└── README.md             # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/name`
3. Make changes and test: `make pre-commit`
4. Commit: `git commit -m 'Add feature'`
5. Push: `git push origin feature/name`
6. Open a Pull Request

## Update history

|Version      | Changes                                                                                                                                    | Date                 |
|:-----------:|:------------------------------------------------------------------------------------------------------------------------------------------:|:--------------------:|
| Version 0.1 |  Extensive edits of the README.md.                                                                                                         | 2026 January 15           |
| Version 0.2 |  Fixed bug in child note index.                                                                                                             | 2026 January 16           |
| Version 0.3 |  Fixed bug in child note index when parent is a root node.                                                                                   | 2026 January 20    |
| Version 0.4 |  Added notes to README.md on how to set a defualt template file using the community package Templater. 
## Funding
- NIH: R01 CA242845, R01 AI088011
- NIH: P30 CA225520 (PI: R. Mannel); P30GM145423 (PI: A. West)

