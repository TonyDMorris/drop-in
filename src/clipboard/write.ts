import type { Exec } from '../exec';
import type { ClipboardProbe } from './types';

/** Escapes a string for embedding in a PowerShell single-quoted literal. */
export function powerShellLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function setClipboardCommand(value: string[]): string {
  return `Set-Clipboard -LiteralPath @(${value.map(powerShellLiteral).join(',')})`;
}

/** Encodes POSIX paths as a `text/uri-list` payload. */
export function toUriList(paths: string[]): string {
  return paths
    .map((entry) => `file://${entry.split('/').map(encodeURIComponent).join('/')}`)
    .join('\n');
}

/** JXA that puts file URLs back on the pasteboard, exactly as Finder writes them. */
export function darwinWriteScript(): string {
  return [
    "ObjC.import('AppKit');",
    'function run(argv) {',
    '  var pb = $.NSPasteboard.generalPasteboard;',
    '  pb.clearContents;',
    '  var urls = $.NSMutableArray.alloc.init;',
    '  for (var i = 0; i < argv.length; i++) {',
    '    urls.addObject($.NSURL.fileURLWithPath($(argv[i])));',
    '  }',
    '  pb.writeObjects(urls);',
    "  return 'ok';",
    '}'
  ].join('\n');
}

export function writeProbe(
  platform: NodeJS.Platform,
  paths: string[]
): (Omit<ClipboardProbe, 'parse'> & { stdin?: string })[] {
  switch (platform) {
    case 'darwin':
      return [{ file: 'osascript', args: ['-l', 'JavaScript', '-e', darwinWriteScript(), ...paths] }];
    case 'win32':
      return [
        {
          file: 'powershell.exe',
          args: ['-NoProfile', '-NonInteractive', '-STA', '-Command', setClipboardCommand(paths)]
        }
      ];
    case 'linux':
      return [
        { file: 'wl-copy', args: ['--type', 'text/uri-list'], stdin: toUriList(paths) },
        {
          file: 'xclip',
          args: ['-selection', 'clipboard', '-t', 'text/uri-list', '-i'],
          stdin: toUriList(paths)
        }
      ];
    default:
      return [];
  }
}

/**
 * Best-effort restore of a file selection onto the OS clipboard.
 *
 * Used after we briefly borrow the clipboard to discover which Explorer folder
 * has focus, so pressing Cmd+V twice in a row still works. Failures are
 * swallowed: losing the clipboard is a nuisance, not a reason to fail a copy
 * that already succeeded.
 */
export async function restoreClipboardFiles(
  platform: NodeJS.Platform,
  paths: string[],
  exec: Exec,
  timeoutMs: number
): Promise<boolean> {
  if (paths.length === 0) {
    return false;
  }
  for (const probe of writeProbe(platform, paths)) {
    const result = await exec(probe.file, probe.args, { timeoutMs, stdin: probe.stdin });
    if (!result.spawnError && !result.timedOut && result.code === 0) {
      return true;
    }
  }
  return false;
}
