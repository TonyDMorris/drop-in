import * as vscode from 'vscode';
import { readClipboardFiles } from './clipboard';
import { restoreClipboardFiles } from './clipboard/write';
import { executePlan, type CopyOutcome } from './copy';
import { execCommand } from './exec';
import { makeSentinel, parseFocusedPaths } from './explorerTarget';
import { nothingOnClipboard } from './messages';
import { buildPlan, type ConflictPolicy, type CopyPlan } from './plan';
import { resolveTarget } from './target';
import { countLabel, resolvePickerLocation } from './format';
import { askConflict, confirmCopy, pickWorkspaceFolder, reportOutcome } from './ui';
import { createExistsCheck, createFileSystem, isDirectory } from './vscodeFs';

const CLIPBOARD_TIMEOUT_MS = 4000;
const PASTE_OVERRIDE_CONTEXT = 'dropIn.pasteOverride';

function config(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('dropIn');
}

async function syncPasteOverrideContext(): Promise<void> {
  await vscode.commands.executeCommand(
    'setContext',
    PASTE_OVERRIDE_CONTEXT,
    config().get<boolean>('overrideExplorerPaste', true)
  );
}

/**
 * Plans and performs the copy, then reports what happened. Every entry point
 * funnels through here so the picker and the clipboard behave identically.
 */
export interface CopyResult {
  plan: CopyPlan;
  outcome: CopyOutcome;
}

const NOTHING_DONE: CopyOutcome = { copied: [], failures: [], cancelled: false };

export async function copyInto(
  sources: vscode.Uri[],
  targetUri: vscode.Uri
): Promise<CopyResult> {
  const sourceUris = new Map(sources.map((uri) => [uri.fsPath, uri]));
  const plan = await buildPlan([...sourceUris.keys()], targetUri.fsPath, {
    exists: createExistsCheck(targetUri),
    ask: askConflict,
    policy: config().get<ConflictPolicy>('onConflict', 'prompt'),
    platform: process.platform
  });

  if (plan.cancelled) {
    return { plan, outcome: { ...NOTHING_DONE, cancelled: true } };
  }
  if (plan.items.length === 0) {
    void reportOutcome(plan, NOTHING_DONE, targetUri);
    return { plan, outcome: NOTHING_DONE };
  }
  if (config().get<boolean>('confirmBeforeCopy', false)) {
    const names = plan.items.map((item) => item.name);
    if (!(await confirmCopy(names, targetUri))) {
      return { plan: { ...plan, cancelled: true }, outcome: { ...NOTHING_DONE, cancelled: true } };
    }
  }

  const fs = createFileSystem(targetUri, sourceUris);
  const outcome = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Copying ${countLabel(plan.items.length)}…`,
      cancellable: true
    },
    (progress, token) => executePlan(plan.items, fs, progress, token)
  );

  // Deliberately not awaited: the toast waits for the user to dismiss it, and
  // the copy is already done.
  void reportOutcome(plan, outcome, targetUri);
  return { plan, outcome };
}

/** The folder a right-clicked Explorer item points at: itself, or its parent. */
async function folderFor(resource: vscode.Uri): Promise<vscode.Uri> {
  return (await isDirectory(resource)) ? resource : vscode.Uri.joinPath(resource, '..');
}

async function resolveTargetUri(
  resource?: vscode.Uri,
  selection?: vscode.Uri[]
): Promise<vscode.Uri | undefined> {
  const clicked = resource ?? selection?.[0];
  if (clicked) {
    return folderFor(clicked);
  }

  const folders = vscode.workspace.workspaceFolders ?? [];
  const decision = resolveTarget(
    undefined,
    folders.map((folder) => folder.uri.fsPath)
  );
  if (decision.kind === 'none') {
    vscode.window.showWarningMessage(decision.reason);
    return undefined;
  }
  if (decision.kind === 'resolved') {
    return folders[0]!.uri;
  }
  return pickWorkspaceFolder();
}

/**
 * Discovers the focused Explorer folder when we were invoked by a keybinding.
 * Borrows the clipboard to do it — see `explorerTarget.ts`.
 */
async function focusedExplorerFolder(): Promise<vscode.Uri | undefined> {
  const sentinel = makeSentinel();
  await vscode.env.clipboard.writeText(sentinel);
  await vscode.commands.executeCommand('copyFilePath');
  const paths = parseFocusedPaths(await vscode.env.clipboard.readText(), sentinel);
  const first = paths?.[0];
  return first ? folderFor(vscode.Uri.file(first)) : undefined;
}

async function readClipboard() {
  return readClipboardFiles(process.platform, {
    exec: execCommand,
    env: process.env,
    timeoutMs: CLIPBOARD_TIMEOUT_MS
  });
}

async function addFilesHere(resource?: vscode.Uri, selection?: vscode.Uri[]): Promise<void> {
  const target = await resolveTargetUri(resource, selection);
  if (!target) {
    return;
  }

  const location = resolvePickerLocation(config().get<string>('defaultPickerLocation', ''));
  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: true,
    canSelectMany: true,
    openLabel: 'Copy Here',
    title: `Copy into ${vscode.workspace.asRelativePath(target, true)}`,
    defaultUri: location ? vscode.Uri.file(location) : undefined
  });

  if (picked && picked.length > 0) {
    await copyInto(picked, target);
  }
}

async function pasteHere(resource?: vscode.Uri, selection?: vscode.Uri[]): Promise<void> {
  const outcome = await readClipboard();

  switch (outcome.kind) {
    case 'empty':
      vscode.window.showInformationMessage(nothingOnClipboard(process.platform));
      return;
    case 'unsupported':
    case 'error':
      vscode.window.showWarningMessage(outcome.reason);
      return;
    case 'files':
      break;
  }

  const target = await resolveTargetUri(resource, selection);
  if (target) {
    await copyInto(
      outcome.paths.map((entry) => vscode.Uri.file(entry)),
      target
    );
  }
}

/**
 * The Cmd+V / Ctrl+V handler. Files on the OS clipboard win; anything else
 * falls straight through to VS Code's own Explorer paste, so the built-in
 * behaviour is never lost.
 */
async function pasteHereOrDefault(resource?: vscode.Uri, selection?: vscode.Uri[]): Promise<void> {
  const outcome = await readClipboard();
  if (outcome.kind !== 'files') {
    await vscode.commands.executeCommand('filesExplorer.paste');
    return;
  }

  const clicked = resource ?? selection?.[0];
  let target = clicked ? await folderFor(clicked) : undefined;
  if (!target) {
    target = await focusedExplorerFolder();
    // Borrowing the clipboard to find the focused folder clobbered the file
    // list; put it back so a second paste still works.
    await restoreClipboardFiles(
      process.platform,
      outcome.paths,
      execCommand,
      CLIPBOARD_TIMEOUT_MS
    );
  }
  target ??= await resolveTargetUri();
  if (!target) {
    return;
  }

  await copyInto(
    outcome.paths.map((entry) => vscode.Uri.file(entry)),
    target
  );
}

export function activate(context: vscode.ExtensionContext) {
  void syncPasteOverrideContext();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('dropIn.overrideExplorerPaste')) {
        void syncPasteOverrideContext();
      }
    }),
    vscode.commands.registerCommand('dropIn.addFilesHere', addFilesHere),
    vscode.commands.registerCommand('dropIn.pasteHere', pasteHere),
    vscode.commands.registerCommand('dropIn.pasteHereOrDefault', pasteHereOrDefault)
  );

  // Exposed for integration tests; not a supported public API.
  return { _internal: { copyInto, readClipboard } };
}

export function deactivate() {
  // Nothing to tear down: all disposables are owned by the extension context.
}
