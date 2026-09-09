import type { ClipboardProbe } from './types';

/**
 * Parses an RFC 2483 `text/uri-list` payload. Also copes with GNOME's
 * `x-special/gnome-copied-files`, whose first line is `copy` or `cut` — any
 * line that is not a `file://` URI is simply ignored.
 */
export function parseUriList(stdout: string): string[] {
  const paths: string[] = [];
  for (const raw of stdout.split('\n')) {
    const line = raw.replace(/\r$/, '').trim();
    if (!line || line.startsWith('#') || !line.toLowerCase().startsWith('file://')) {
      continue;
    }
    const withoutScheme = line.slice('file://'.length);
    // `file:///path` leaves an empty host; `file://localhost/path` names one.
    const slash = withoutScheme.indexOf('/');
    if (slash < 0) {
      continue;
    }
    const host = withoutScheme.slice(0, slash);
    if (host && host.toLowerCase() !== 'localhost') {
      continue;
    }
    let decoded: string;
    try {
      decoded = decodeURIComponent(withoutScheme.slice(slash));
    } catch {
      decoded = withoutScheme.slice(slash);
    }
    if (decoded) {
      paths.push(decoded);
    }
  }
  return paths;
}

export const parse = parseUriList;

export function probes(env: NodeJS.ProcessEnv): ClipboardProbe[] {
  const wayland: ClipboardProbe[] = [
    { file: 'wl-paste', args: ['--no-newline', '--type', 'text/uri-list'], parse: parseUriList },
    {
      file: 'wl-paste',
      args: ['--no-newline', '--type', 'x-special/gnome-copied-files'],
      parse: parseUriList
    }
  ];
  const x11: ClipboardProbe[] = [
    {
      file: 'xclip',
      args: ['-selection', 'clipboard', '-t', 'text/uri-list', '-o'],
      parse: parseUriList
    },
    {
      file: 'xclip',
      args: ['-selection', 'clipboard', '-t', 'x-special/gnome-copied-files', '-o'],
      parse: parseUriList
    }
  ];
  return env['WAYLAND_DISPLAY'] ? [...wayland, ...x11] : [...x11, ...wayland];
}
