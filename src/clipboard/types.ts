import type { Exec } from '../exec';

/** A single way of asking the OS what files are on the clipboard. */
export interface ClipboardProbe {
  file: string;
  args: string[];
  parse(stdout: string): string[];
}

export type ClipboardOutcome =
  /** The clipboard holds at least one file or folder path. */
  | { kind: 'files'; paths: string[] }
  /** The clipboard was readable but holds no files (text, an image, nothing at all). */
  | { kind: 'empty' }
  /** We have no way to read file paths off the clipboard on this platform/setup. */
  | { kind: 'unsupported'; reason: string }
  /** A reader existed but failed. */
  | { kind: 'error'; reason: string };

export interface ReaderContext {
  exec: Exec;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
}
