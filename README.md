# Bidirectional Folgezettel Plugin for Obisidian

![Version](https://img.shields.io/static/v1?label=bidirectional-folgezettel&message=0.1&color=brightcolor)
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
| `1.2a3aa55| 55th sub branch of 1.2a3aa |

Note how after the root note and the period, the numbers and letter alternate. 
The numbers can contain multiple digits and there can be multiple letters.
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

## Funding
- NIH: R01 CA242845, R01 AI088011
- NIH: P30 CA225520 (PI: R. Mannel); P30GM145423 (PI: A. West)

