import * as assert from 'node:assert/strict';
import {
  darwinWriteScript,
  powerShellLiteral,
  restoreClipboardFiles,
  setClipboardCommand,
  toUriList,
  writeProbe
} from '../../src/clipboard/write';
import type { Exec, ExecResult } from '../../src/exec';

describe('clipboard writer', () => {
  it('escapes single quotes for PowerShell', () => {
    assert.equal(powerShellLiteral("C:\\it's here\\a.png"), "'C:\\it''s here\\a.png'");
    assert.equal(
      setClipboardCommand(['C:\\a.png', 'C:\\b.png']),
      "Set-Clipboard -LiteralPath @('C:\\a.png','C:\\b.png')"
    );
  });

  it('percent-encodes each path segment for text/uri-list', () => {
    assert.equal(toUriList(['/home/me/my file.png']), 'file:///home/me/my%20file.png');
    // Separators must survive encoding.
    assert.equal(toUriList(['/a/b/c']), 'file:///a/b/c');
  });

  it('passes paths to osascript as arguments, never as interpolated script text', () => {
    const probe = writeProbe('darwin', ['/tmp/a b.png'])[0]!;
    assert.equal(probe.file, 'osascript');
    assert.equal(probe.args.at(-1), '/tmp/a b.png');
    assert.ok(darwinWriteScript().includes('function run(argv)'));
    assert.ok(!darwinWriteScript().includes('/tmp/a b.png'));
  });

  it('pipes the uri-list through stdin on Linux', () => {
    const probes = writeProbe('linux', ['/tmp/a.png']);
    assert.deepEqual(
      probes.map((probe) => probe.file),
      ['wl-copy', 'xclip']
    );
    assert.equal(probes[0]!.stdin, 'file:///tmp/a.png');
  });

  const exec = (result: Partial<ExecResult>): Exec =>
    async () => ({ stdout: '', stderr: '', code: 0, ...result }) as ExecResult;

  it('reports success once a writer works', async () => {
    assert.equal(await restoreClipboardFiles('darwin', ['/tmp/a'], exec({}), 100), true);
  });

  it('gives up quietly rather than failing a copy that already succeeded', async () => {
    assert.equal(
      await restoreClipboardFiles('linux', ['/tmp/a'], exec({ spawnError: 'ENOENT' }), 100),
      false
    );
    assert.equal(await restoreClipboardFiles('darwin', [], exec({}), 100), false);
  });
});
