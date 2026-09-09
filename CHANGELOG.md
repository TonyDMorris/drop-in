# Changelog

All notable changes to Drop In are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-09-09

First release.

### Added

- **Add Files Here…** in the Explorer context menu: opens the system file dialog at
  `~/Downloads` and copies whatever you select into the folder you clicked.
- **Paste Copied Files Here** in the Explorer context menu: copies files you copied in Finder,
  File Explorer, or a Linux file manager.
- <kbd>⌘V</kbd> / <kbd>Ctrl+V</kbd> in the Explorer pastes files from the system clipboard, and
  falls through to VS Code's built-in paste when the clipboard holds no files.
- Conflict handling with Keep Both / Replace / Skip, each with an "apply to all", plus the
  `dropIn.onConflict` setting to skip the prompt entirely.
- Guards against copying a folder into itself, into one of its own subfolders, or onto itself.
- Settings: `dropIn.overrideExplorerPaste`, `dropIn.defaultPickerLocation`, `dropIn.onConflict`,
  `dropIn.confirmBeforeCopy`.

[0.1.0]: https://github.com/TonyDMorris/drop-in/releases/tag/v0.1.0
