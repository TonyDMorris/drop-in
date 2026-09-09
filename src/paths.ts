import * as nodePath from 'node:path';

/**
 * Path helpers that answer for a named platform rather than the host.
 *
 * In production `platform` is always `process.platform`, so this matches the
 * host anyway — but taking the platform as an argument and then normalising
 * with the host's separator rules would make the argument a half-truth, and
 * makes Windows behaviour impossible to test from anywhere else.
 */
function pathFor(platform: NodeJS.Platform): nodePath.PlatformPath {
  return platform === 'win32' ? nodePath.win32 : nodePath.posix;
}

/** Windows and macOS both compare paths case-insensitively in practice. */
function caseInsensitive(platform: NodeJS.Platform): boolean {
  return platform === 'win32' || platform === 'darwin';
}

export function normalizeForCompare(target: string, platform: NodeJS.Platform): string {
  const normalized = pathFor(platform).normalize(target);
  // Strip a trailing separator, but never reduce a root to the empty string.
  const trimmed = normalized.replace(/(?<=.)[\\/]+$/, '');
  return caseInsensitive(platform) ? trimmed.toLowerCase() : trimmed;
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
  const separator = pathFor(platform).sep;
  return a.startsWith(b.endsWith(separator) ? b : b + separator);
}
