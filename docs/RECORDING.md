# Recording the demo GIFs

The README currently leans on the icon and prose. Two short GIFs would sell the extension far
better on the Marketplace listing. If you record them, drop them at `assets/demo-picker.gif` and
`assets/demo-paste.gif` and add them under each feature heading in `README.md` — nothing else
needs to change.

## Setup, for both

- A small project in VS Code, Explorer open, `assets/` folder visible.
- A few real-looking downloads in `~/Downloads` (a PNG, a PDF, a folder).
- Window at roughly 1280×800, default Dark Modern theme, font size bumped to 15 so it reads at
  Marketplace width (the listing renders images around 900px wide).
- Record the VS Code window only, not the whole screen. Trim to under 8 seconds; the Marketplace
  does not autoplay long clips well.

## 1. `demo-picker.gif` — Add Files Here…

1. Right-click `assets/` in the Explorer.
2. Hover **Add Files Here…** for a beat so the menu item is legible, then click.
3. In the dialog (already at `~/Downloads`), select two or three files.
4. Click **Open**. Stop recording once the files appear in the tree.

## 2. `demo-paste.gif` — Paste Copied Files Here

Show the <kbd>⌘V</kbd> path, since that is the part people will not believe works:

1. Start in Finder, in `~/Downloads`. Select two files, press <kbd>⌘C</kbd> (show the menu, or add
   a keystroke overlay).
2. Switch to VS Code.
3. Click `assets/` once in the Explorer, press <kbd>⌘V</kbd>.
4. Stop once the files land.

A side-by-side of Finder and VS Code works better than a desktop switch here — the whole point is
that you no longer need to drag between them.

## Tools

macOS: [Kap](https://getkap.co) exports GIF directly and can capture a single window. Keep the
frame rate at 15–20fps and the width at 900px to stay under a couple of megabytes; the Marketplace
is slow to load anything larger.
