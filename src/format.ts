import * as os from 'node:os';
import * as path from 'node:path';

/** Expands the configured picker location. Empty means "wherever you were last". */
export function resolvePickerLocation(
  setting: string,
  homeDir: string = os.homedir()
): string | undefined {
  const trimmed = setting.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed === '~') {
    return homeDir;
  }
  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
    return path.join(homeDir, trimmed.slice(2));
  }
  return trimmed;
}

export function countLabel(count: number, noun = 'item'): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Trims a list for display, e.g. `a, b, c and 4 more`. */
export function summariseNames(names: string[], max = 3): string {
  if (names.length <= max) {
    return names.join(', ');
  }
  return `${names.slice(0, max).join(', ')} and ${names.length - max} more`;
}
