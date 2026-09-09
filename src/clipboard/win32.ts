import type { ClipboardProbe } from './types';

/**
 * `Get-Clipboard -Format FileDropList` is Windows PowerShell only, and reading
 * the clipboard needs a single-threaded apartment, hence `-STA`.
 */
export const READ_COMMAND =
  'Get-Clipboard -Format FileDropList | ForEach-Object { $_.FullName }';

export function parse(stdout: string): string[] {
  return stdout
    .split('\n')
    .map((line) => line.replace(/\r$/, '').trim())
    .filter((line) => line.length > 0);
}

export function probes(): ClipboardProbe[] {
  return [
    {
      file: 'powershell.exe',
      args: ['-NoProfile', '-NonInteractive', '-STA', '-Command', READ_COMMAND],
      parse
    }
  ];
}
