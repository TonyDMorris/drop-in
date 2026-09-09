/**
 * Splits a file name into the part a numeric suffix should be appended to and
 * its extension. Dotfiles (`.gitignore`) are all stem, matching how Finder and
 * File Explorer treat them.
 */
export function splitName(name: string): { stem: string; ext: string } {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) {
    return { stem: name, ext: '' };
  }
  return { stem: name.slice(0, dot), ext: name.slice(dot) };
}

/**
 * Finder-style de-duplication: `photo.jpg` -> `photo 2.jpg` -> `photo 3.jpg`.
 * A name that already ends in a number continues from there rather than
 * growing a second suffix. `taken` may be sync or async.
 */
export async function uniqueName(
  name: string,
  taken: (candidate: string) => boolean | Promise<boolean>
): Promise<string> {
  if (!(await taken(name))) {
    return name;
  }

  const { stem, ext } = splitName(name);
  const numbered = /^(.*\S)[ ](\d+)$/.exec(stem);
  const base = numbered?.[1] ?? stem;
  let counter = numbered?.[2] ? Number.parseInt(numbered[2], 10) + 1 : 2;

  // Bounded so a pathological `taken` can never spin forever.
  for (let attempt = 0; attempt < 10_000; attempt++) {
    const candidate = `${base} ${counter}${ext}`;
    if (!(await taken(candidate))) {
      return candidate;
    }
    counter++;
  }
  return `${base} ${Date.now()}${ext}`;
}
