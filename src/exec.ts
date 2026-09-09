import { spawn } from 'node:child_process';

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number | null;
  /** Set when the process could not be started at all, e.g. `ENOENT` for a missing binary. */
  spawnError?: string;
  timedOut?: boolean;
}

export interface ExecOptions {
  timeoutMs: number;
  stdin?: string;
}

export type Exec = (file: string, args: string[], options: ExecOptions) => Promise<ExecResult>;

/**
 * Runs a command without a shell, so paths and scripts never need quoting and
 * nothing from the clipboard can be interpreted as shell syntax.
 */
export const execCommand: Exec = (file, args, { timeoutMs, stdin }) =>
  new Promise((resolve) => {
    let settled = false;
    const finish = (result: ExecResult) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(result);
      }
    };

    const child = spawn(file, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ stdout, stderr, code: null, timedOut: true });
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (error: NodeJS.ErrnoException) => {
      finish({ stdout, stderr, code: null, spawnError: error.code ?? error.message });
    });
    child.on('close', (code) => {
      finish({ stdout, stderr, code });
    });

    if (stdin !== undefined) {
      child.stdin.on('error', () => {
        // The child may exit before draining stdin; the close handler reports it.
      });
      child.stdin.end(stdin);
    } else {
      child.stdin.end();
    }
  });
