<div align="center">

<img src="assets/icon-256.png" width="128" alt="">

# Drop In

**Get files into your VS Code project without dragging them across screens.**

[![Marketplace](https://img.shields.io/visual-studio-marketplace/v/tonydmorris.drop-in?color=1F2430&label=marketplace)](https://marketplace.visualstudio.com/items?itemName=tonydmorris.drop-in)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/tonydmorris.drop-in?color=1F2430)](https://marketplace.visualstudio.com/items?itemName=tonydmorris.drop-in)
[![CI](https://github.com/TonyDMorris/drop-in/actions/workflows/ci.yml/badge.svg)](https://github.com/TonyDMorris/drop-in/actions/workflows/ci.yml)

</div>

---

You download a file. You want it in your project as an asset or a bit of documentation.

Today that means either dragging it from Finder across monitors into exactly the right folder in
the Explorer tree — one hand holding the drag, the other swiping desktops — or typing
`mv ~/Downloads/dahguegdwqueg63gjdhavdj.jpg ./src/assets/` into a terminal.

Copying in Finder and pressing <kbd>⌘V</kbd> in the Explorer does not work: VS Code's Explorer
paste only knows about files copied *inside* VS Code
([microsoft/vscode#41854](https://github.com/microsoft/vscode/issues/41854), open since 2018).

Drop In fixes that.

## What it does

### 1. Add Files Here…

Right-click any folder in the Explorer — including the project root — and choose
**Add Files Here…**. Your system's file dialog opens at `~/Downloads`. Select as many files and
folders as you like, hit Open, and they are copied in.

### 2. Paste Copied Files Here

Select files in **Finder** (or File Explorer, or Nautilus), press <kbd>⌘C</kbd>, then either:

- right-click a folder in the Explorer and choose **Paste Copied Files Here**, or
- click a folder in the Explorer and just press <kbd>⌘V</kbd>.

When the system clipboard holds no files, <kbd>⌘V</kbd> does exactly what it always did, so
nothing you rely on changes.

## Good to know

- **It copies. It never moves.** Your original download stays in `~/Downloads` — nothing is
  deleted or modified.
- **Name clashes ask first.** Keep both (Finder-style `photo 2.jpg`), Replace, or Skip — with an
  "apply to all" for big batches. Configurable if you'd rather it never asked.
- **Folders come with their contents**, recursively.
- **Right-clicking a *file*** targets the folder that file is in, which is usually what you meant.
- **One failure doesn't sink the batch.** Nine of ten files still land, and the tenth is reported.
- **It refuses to copy a folder into itself** or into one of its own subfolders.

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| `dropIn.overrideExplorerPaste` | `true` | Let <kbd>⌘V</kbd> / <kbd>Ctrl+V</kbd> in the Explorer paste files from the OS clipboard. Turn off to leave the key binding entirely alone. |
| `dropIn.defaultPickerLocation` | `~/Downloads` | Where **Add Files Here…** opens. Set to `""` to reopen wherever you were last. |
| `dropIn.onConflict` | `prompt` | `prompt`, `keepBoth`, `overwrite`, or `skip`. |
| `dropIn.confirmBeforeCopy` | `false` | Show a confirmation listing what will be copied, and where. |

## Platform support

| | Add Files Here… | Paste Copied Files Here |
| --- | --- | --- |
| **macOS** | ✅ | ✅ via `NSPasteboard` |
| **Windows** | ✅ | ✅ via `Get-Clipboard -Format FileDropList` |
| **Linux** | ✅ | ✅ needs `wl-clipboard` (Wayland) or `xclip` (X11) |

Reading files off the system clipboard needs a platform-specific helper, because VS Code's
extension API exposes clipboard *text* only. Drop In shells out to `osascript`, `powershell.exe`,
or `wl-paste`/`xclip` — no native modules, nothing to compile, no extra permissions.

### Known limitations

- **Remote workspaces** (SSH, WSL, Dev Containers, Codespaces): the OS clipboard lives on your
  local machine while the project lives on the remote, so **Paste Copied Files Here** is not
  reliable there. **Add Files Here…** works, browsing the remote filesystem.
- **Linux** needs `wl-clipboard` or `xclip` installed; Drop In says so plainly if neither is there.
- <kbd>⌘V</kbd> briefly borrows the system clipboard to work out which Explorer folder has focus
  (VS Code exposes no API for the Explorer's selection) and puts it back afterwards. The
  context-menu command doesn't need to do this.

## Contributing

Bug reports and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Anthony Morris
