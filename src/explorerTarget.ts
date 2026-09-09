/**
 * VS Code gives extensions no way to read the Explorer's selection, and a
 * keybinding — unlike a context-menu click — hands us no resource. The one
 * reliable workaround is the built-in `copyFilePath` command: it writes the
 * focused Explorer item's path to the clipboard.
 *
 * We put a sentinel on the clipboard first so we can tell "nothing was focused"
 * (the sentinel survives) apart from a real answer, and the caller restores the
 * clipboard afterwards.
 */
export function makeSentinel(now = Date.now(), random = Math.random()): string {
  return `drop-in-focus-probe:${now}:${random.toString(36).slice(2)}`;
}

/**
 * Reads the result of `copyFilePath`. Returns `undefined` when the sentinel is
 * still there, meaning nothing in the Explorer had focus.
 */
export function parseFocusedPaths(clipboardText: string, sentinel: string): string[] | undefined {
  if (clipboardText === sentinel) {
    return undefined;
  }
  const paths = clipboardText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return paths.length > 0 ? paths : undefined;
}
