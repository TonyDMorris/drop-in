import * as assert from 'node:assert/strict';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

const EXTENSION_ID = 'TonyMorris.drop-in';

interface InternalApi {
  _internal: {
    copyInto(
      sources: vscode.Uri[],
      targetUri: vscode.Uri
    ): Promise<{ plan: { rejected: { reason: string }[]; skipped: string[] }; outcome: { copied: { name: string }[]; failures: unknown[] } }>;
  };
}

async function activate(): Promise<InternalApi> {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(extension, `${EXTENSION_ID} is not installed in the test host`);
  return (await extension.activate()) as InternalApi;
}

async function tempDir(prefix: string): Promise<vscode.Uri> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
  return vscode.Uri.file(await fsp.realpath(dir));
}

async function writeFile(dir: vscode.Uri, name: string, content: string): Promise<vscode.Uri> {
  const uri = vscode.Uri.joinPath(dir, name);
  await fsp.writeFile(uri.fsPath, content, 'utf8');
  return uri;
}

async function read(uri: vscode.Uri): Promise<string> {
  return fsp.readFile(uri.fsPath, 'utf8');
}

async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await fsp.stat(uri.fsPath);
    return true;
  } catch {
    return false;
  }
}

suite('Drop In', () => {
  let api: InternalApi;
  let downloads: vscode.Uri;
  let target: vscode.Uri;
  const scratch: vscode.Uri[] = [];

  suiteSetup(async () => {
    api = await activate();
    // Conflicts must never open a QuickPick here, or the run would hang.
    await vscode.workspace
      .getConfiguration('dropIn')
      .update('onConflict', 'keepBoth', vscode.ConfigurationTarget.Global);
  });

  suiteTeardown(async () => {
    await vscode.workspace
      .getConfiguration('dropIn')
      .update('onConflict', undefined, vscode.ConfigurationTarget.Global);
    for (const dir of scratch) {
      await fsp.rm(dir.fsPath, { recursive: true, force: true });
    }
  });

  setup(async () => {
    downloads = await tempDir('drop-in-src-');
    target = await tempDir('drop-in-dst-');
    scratch.push(downloads, target);
  });

  test('activates at startup, so the Cmd+V context key is set before it is needed', async () => {
    // The keybinding's `when` clause requires dropIn.pasteOverride, which only
    // activate() sets. Without an eager activation event the binding could
    // never fire, and nothing would ever activate the extension to fix that.
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension?.isActive, 'extension should already be active');
    assert.deepEqual(extension.packageJSON.activationEvents, ['onStartupFinished']);
  });

  test('registers its commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    for (const id of ['dropIn.addFilesHere', 'dropIn.pasteHere', 'dropIn.pasteHereOrDefault']) {
      assert.ok(commands.includes(id), `${id} was not registered`);
    }
  });

  test('copies files into the target folder', async () => {
    const a = await writeFile(downloads, 'a.txt', 'alpha');
    const b = await writeFile(downloads, 'weird name (1).txt', 'beta');

    const { outcome } = await api._internal.copyInto([a, b], target);

    assert.equal(outcome.failures.length, 0);
    assert.equal(outcome.copied.length, 2);
    assert.equal(await read(vscode.Uri.joinPath(target, 'a.txt')), 'alpha');
    assert.equal(await read(vscode.Uri.joinPath(target, 'weird name (1).txt')), 'beta');
    // The source is left exactly where it was: Drop In copies, never moves.
    assert.ok(await exists(a));
  });

  test('copies a folder and everything in it', async () => {
    const nested = vscode.Uri.joinPath(downloads, 'bundle', 'inner');
    await fsp.mkdir(nested.fsPath, { recursive: true });
    await fsp.writeFile(vscode.Uri.joinPath(nested, 'deep.txt').fsPath, 'deep', 'utf8');

    await api._internal.copyInto([vscode.Uri.joinPath(downloads, 'bundle')], target);

    assert.equal(await read(vscode.Uri.joinPath(target, 'bundle', 'inner', 'deep.txt')), 'deep');
  });

  test('keeps both when a name already exists, leaving the original intact', async () => {
    await fsp.writeFile(vscode.Uri.joinPath(target, 'a.txt').fsPath, 'original', 'utf8');
    const incoming = await writeFile(downloads, 'a.txt', 'incoming');

    const { outcome } = await api._internal.copyInto([incoming], target);

    assert.deepEqual(outcome.copied.map((item) => item.name), ['a 2.txt']);
    assert.equal(await read(vscode.Uri.joinPath(target, 'a.txt')), 'original');
    assert.equal(await read(vscode.Uri.joinPath(target, 'a 2.txt')), 'incoming');
  });

  test('refuses to copy a folder into itself', async () => {
    const { plan, outcome } = await api._internal.copyInto([target], target);

    assert.equal(outcome.copied.length, 0);
    assert.equal(plan.rejected.length, 1);
    assert.match(plan.rejected[0]!.reason, /cannot be copied into itself/);
  });

  test('refuses an item that is already in the target folder', async () => {
    const inPlace = await writeFile(target, 'already.txt', 'here');

    const { plan } = await api._internal.copyInto([inPlace], target);

    assert.equal(plan.rejected.length, 1);
    assert.match(plan.rejected[0]!.reason, /already in this folder/);
  });

  test('copies what it can when one source is missing', async () => {
    const good = await writeFile(downloads, 'good.txt', 'good');
    const missing = vscode.Uri.joinPath(downloads, 'gone.txt');

    const { outcome } = await api._internal.copyInto([good, missing], target);

    assert.deepEqual(outcome.copied.map((item) => item.name), ['good.txt']);
    assert.equal(outcome.failures.length, 1);
  });
});
