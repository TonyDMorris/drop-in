import * as assert from 'node:assert/strict';
import { MISSING_LINUX_TOOLS, readClipboardFiles } from '../../src/clipboard';
import type { Exec, ExecResult } from '../../src/exec';

type Responder = (file: string, args: string[]) => Partial<ExecResult>;

function fakeExec(responder: Responder): Exec & { calls: string[] } {
  const calls: string[] = [];
  const exec: Exec = async (file, args) => {
    calls.push(file);
    return { stdout: '', stderr: '', code: 0, ...responder(file, args) };
  };
  return Object.assign(exec, { calls });
}

const ctx = (exec: Exec, env: NodeJS.ProcessEnv = {}) => ({ exec, env, timeoutMs: 1000 });

describe('readClipboardFiles', () => {
  it('returns the paths the platform reader found', async () => {
    const exec = fakeExec(() => ({ stdout: '["/tmp/a.png"]' }));
    assert.deepEqual(await readClipboardFiles('darwin', ctx(exec)), {
      kind: 'files',
      paths: ['/tmp/a.png']
    });
  });

  it('reports an empty clipboard when the reader runs but finds nothing', async () => {
    const exec = fakeExec(() => ({ stdout: '[]' }));
    assert.deepEqual(await readClipboardFiles('darwin', ctx(exec)), { kind: 'empty' });
  });

  it('de-duplicates repeated paths', async () => {
    const exec = fakeExec(() => ({ stdout: '["/tmp/a.png","/tmp/a.png","/tmp/b.png"]' }));
    const outcome = await readClipboardFiles('darwin', ctx(exec));
    assert.deepEqual(outcome, { kind: 'files', paths: ['/tmp/a.png', '/tmp/b.png'] });
  });

  it('falls through to the next probe when the first offers nothing', async () => {
    const exec = fakeExec((_file, args) =>
      args.includes('text/uri-list')
        ? { stdout: '', code: 1 }
        : { stdout: 'copy\nfile:///tmp/a.png' }
    );
    const outcome = await readClipboardFiles('linux', ctx(exec, { WAYLAND_DISPLAY: 'wayland-0' }));
    assert.deepEqual(outcome, { kind: 'files', paths: ['/tmp/a.png'] });
  });

  it('tells Linux users which package to install when no tool exists', async () => {
    const exec = fakeExec(() => ({ spawnError: 'ENOENT', code: null }));
    const outcome = await readClipboardFiles('linux', ctx(exec));
    assert.deepEqual(outcome, { kind: 'unsupported', reason: MISSING_LINUX_TOOLS });
  });

  it('reports an unsupported platform rather than pretending the clipboard is empty', async () => {
    const exec = fakeExec(() => ({}));
    const outcome = await readClipboardFiles('aix', ctx(exec));
    assert.equal(outcome.kind, 'unsupported');
    assert.equal(exec.calls.length, 0);
  });

  it('surfaces a hung reader as an error, not an empty clipboard', async () => {
    const exec = fakeExec(() => ({ timedOut: true, code: null }));
    const outcome = await readClipboardFiles('darwin', ctx(exec));
    assert.equal(outcome.kind, 'error');
    assert.match((outcome as { reason: string }).reason, /did not respond/);
  });

  it('surfaces a reader that exited non-zero as an error, not an empty clipboard', async () => {
    const exec = fakeExec(() => ({ code: 1, stderr: 'osascript: no can do\n' }));
    const outcome = await readClipboardFiles('darwin', ctx(exec));
    assert.equal(outcome.kind, 'error');
    assert.match((outcome as { reason: string }).reason, /no can do/);
  });

  it('treats a non-zero xclip as an empty clipboard, since that is how it reports "no such target"', async () => {
    const exec = fakeExec(() => ({ code: 1, stderr: 'Error: target text/uri-list not available\n' }));
    assert.deepEqual(await readClipboardFiles('linux', ctx(exec)), { kind: 'empty' });
  });
});
