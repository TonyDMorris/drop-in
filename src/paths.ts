import * as path from 'node:path';

/** Windows and macOS both compare paths case-insensitively in practice. */
function caseInsensitive(platform: NodeJS.Platform): boolean {
  return platform === 'win32' || platform === 'darwin';
}

export function normalizeForCompare(target: string, platform: NodeJS.Platform): string {
  const normalized = path.normalize(target).replace(/[\\/]+$/, '');
  return caseInsensitive(platform) ? normalized.toLowerCase() : normalized;
}

export function isSamePath(a: string, b: string, platform: NodeJS.Platform): boolean {
  return normalizeForCompare(a, platform) === normalizeForCompare(b, platform);
}

/** True when `candidate` is `ancestor` itself or lives anywhere beneath it. */
export function isSameOrInside(
  candidate: string,
  ancestor: string,
  platform: NodeJS.Platform
): boolean {
  const a = normalizeForCompare(candidate, platform);
  const b = normalizeForCompare(ancestor, platform);
  if (a === b) {
    return true;
  }
  const separator = platform === 'win32' ? '\\' : '/';
  return a.startsWith(b.endsWith(separator) ? b : b + separator);
}
