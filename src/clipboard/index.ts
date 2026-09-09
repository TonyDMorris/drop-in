import * as darwin from './darwin';
import * as linux from './linux';
import * as win32 from './win32';
import type { ClipboardOutcome, ClipboardProbe, ReaderContext } from './types';

export type { ClipboardOutcome, ClipboardProbe, ReaderContext } from './types';

export const MISSING_LINUX_TOOLS =
  'Drop In needs `wl-clipboard` (Wayland) or `xclip` (X11) to read files off the clipboard. Install one of them and try again.';

export function probesFor(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): ClipboardProbe[] {
  switch (platform) {
    case 'darwin':
      return darwin.probes();
    case 'win32':
      return win32.probes();
    case 'linux':
      return linux.probes(env);
    default:
      return [];
  }
}

function dedupe(paths: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const path of paths) {
    const trimmed = path.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * Asks the OS what files are currently on the clipboard.
 *
 * Probes are tried in order and the first one that yields paths wins, so a
 * desktop that only publishes the GNOME flavour still works. Missing tools are
 * reported as `unsupported` (actionable) rather than `error` (a bug).
 */
export async function readClipboardFiles(
  platform: NodeJS.Platform,
  { exec, env, timeoutMs }: ReaderContext
): Promise<ClipboardOutcome> {
  const probes = probesFor(platform, env);
  if (probes.length === 0) {
    return { kind: 'unsupported', reason: `Drop In cannot read the clipboard on ${platform}.` };
  }

  let sawCleanRun = false;
  let sawFailedRun = false;
  let lastFailure: string | undefined;

  for (const probe of probes) {
    const result = await exec(probe.file, probe.args, { timeoutMs });

    if (result.spawnError === 'ENOENT') {
      continue;
    }
    if (result.timedOut) {
      lastFailure = `\`${probe.file}\` did not respond within ${timeoutMs}ms.`;
      continue;
    }
    if (result.spawnError) {
      lastFailure = `\`${probe.file}\` could not be started (${result.spawnError}).`;
      continue;
    }

    if (result.code !== 0) {
      sawFailedRun = true;
      const detail = result.stderr.trim().split('\n')[0];
      lastFailure = detail
        ? `\`${probe.file}\` failed: ${detail}`
        : `\`${probe.file}\` exited with code ${result.code}.`;
      continue;
    }

    sawCleanRun = true;

    const paths = dedupe(probe.parse(result.stdout));
    if (paths.length > 0) {
      return { kind: 'files', paths };
    }
  }

  if (sawCleanRun) {
    return { kind: 'empty' };
  }
  if (sawFailedRun) {
    // xclip and wl-paste exit non-zero when the requested target simply is not
    // offered, which is exactly what an empty clipboard looks like on Linux.
    // Everywhere else a failing reader is a real fault worth surfacing.
    return platform === 'linux'
      ? { kind: 'empty' }
      : { kind: 'error', reason: lastFailure ?? 'Drop In could not read the clipboard.' };
  }
  if (platform === 'linux') {
    return { kind: 'unsupported', reason: MISSING_LINUX_TOOLS };
  }
  return {
    kind: 'error',
    reason: lastFailure ?? 'Drop In could not read the clipboard.'
  };
}
