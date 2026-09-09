# Recording the demo GIFs

`assets/demo-picker.gif` and `assets/demo-paste.gif` are cut from a single screen recording at
1692×944 @ 60fps. The raw capture is gitignored — 26 MB would outweigh the whole source tree in
every clone — so this is how to redo them from scratch.

## Capture

One continuous take covering both flows, in this order:

1. Right-click `assets/` in the Explorer → **Add Files Here…** → select a few files in the
   dialog → **Copy Here**.
2. Switch to Finder, select a few files, right-click → **Copy**.
3. Back in VS Code, right-click a folder → **Paste Copied Files Here**.
4. Open one of the pasted files, so it is obvious they really landed.

macOS <kbd>⌘⇧5</kbd> is enough. Keep the VS Code font size at 15 or so — the Marketplace renders
README images around 900px wide, and default 12pt is unreadable once scaled down.

Note that whatever is in your Downloads folder, your Finder sidebar, and your desktop will be
legible in the published GIF.

## Convert

Always two passes. A single-pass GIF quantises to a generic palette and looks muddy on flat UI
colours:

```bash
SRC="assets/Screen Recording ….mov"
F="fps=12,scale=900:-1:flags=lanczos"

ffmpeg -y -ss 0 -t 7.6 -i "$SRC" \
  -vf "$F,palettegen=max_colors=128:stats_mode=diff" pal.png
ffmpeg -y -ss 0 -t 7.6 -i "$SRC" -i pal.png \
  -lavfi "$F[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
  assets/demo-picker.gif
```

`stats_mode=diff` weights the palette toward what actually changes between frames, which is the
right trade for a mostly-static screen recording.

## Keeping the size down

GIF has no interframe compression worth the name, so cost scales with *change*, not duration:

- **Trim window transitions.** Dropping a 2s app switch off the front of the paste clip took it
  from 3.8 MB to 1.1 MB. Nothing else came close to that.
- A photographic desktop wallpaper is expensive. A plain background would roughly halve it again.
- Below about 96 palette colours you lose more quality than bytes; fps and width plateau quickly
  too. Trim first, tune second.

Aim under ~2 MB total. The GIFs are listed in `.vscodeignore` — the rendered README pulls them
from GitHub raw, so they never travel inside the VSIX.
