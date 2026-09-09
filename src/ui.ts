import * as path from 'node:path';
import * as vscode from 'vscode';
import type { CopyOutcome } from './copy';
import { countLabel } from './format';
import type { ConflictChoice, ConflictQuestion, CopyPlan } from './plan';

interface ConflictItem extends vscode.QuickPickItem {
  choice: ConflictChoice;
}

/**
 * Asks what to do about a name clash. A QuickPick rather than a modal because
 * six answers (three actions, each with an "apply to all") do not fit in a
 * message box, and it stays keyboard-only.
 */
export async function askConflict(question: ConflictQuestion): Promise<ConflictChoice> {
  const folder = path.basename(question.targetDir) || question.targetDir;
  const items: ConflictItem[] = [
    {
      label: '$(files) Keep Both',
      description: 'recommended',
      detail: 'Copy in alongside the existing item, with a number added to the name',
      choice: { action: 'keepBoth', applyToAll: false }
    },
    {
      label: '$(replace-all) Replace',
      detail: 'Overwrite the existing item',
      choice: { action: 'overwrite', applyToAll: false }
    },
    {
      label: '$(circle-slash) Skip',
      detail: 'Leave the existing item alone and move on',
      choice: { action: 'skip', applyToAll: false }
    }
  ];

  if (question.remaining > 1) {
    items.push(
      {
        label: `Apply to all ${question.remaining} remaining`,
        kind: vscode.QuickPickItemKind.Separator,
        choice: { action: 'cancel', applyToAll: false }
      },
      {
        label: '$(files) Keep Both — all',
        choice: { action: 'keepBoth', applyToAll: true }
      },
      {
        label: '$(replace-all) Replace — all',
        choice: { action: 'overwrite', applyToAll: true }
      },
      {
        label: '$(circle-slash) Skip — all',
        choice: { action: 'skip', applyToAll: true }
      }
    );
  }

  const picked = await vscode.window.showQuickPick(items, {
    title: `“${question.name}” already exists in ${folder}`,
    placeHolder: 'Choose what to do',
    ignoreFocusOut: true
  });

  return picked?.choice ?? { action: 'cancel', applyToAll: false };
}

export async function pickWorkspaceFolder(): Promise<vscode.Uri | undefined> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 1) {
    return folders[0]!.uri;
  }
  const picked = await vscode.window.showQuickPick(
    folders.map((folder) => ({ label: folder.name, description: folder.uri.fsPath, folder })),
    { title: 'Copy files into which folder?', placeHolder: 'Select a workspace folder' }
  );
  return picked?.folder.uri;
}

export async function confirmCopy(names: string[], targetUri: vscode.Uri): Promise<boolean> {
  const folder = path.basename(targetUri.fsPath) || targetUri.fsPath;
  const preview = names.slice(0, 8).join('\n');
  const more = names.length > 8 ? `\n…and ${names.length - 8} more` : '';
  const answer = await vscode.window.showInformationMessage(
    `Copy ${countLabel(names.length)} into “${folder}”?`,
    { modal: true, detail: preview + more },
    'Copy'
  );
  return answer === 'Copy';
}

/** Summarises what happened, keeping the good news first and the noise short. */
export async function reportOutcome(
  plan: CopyPlan,
  outcome: CopyOutcome,
  targetUri: vscode.Uri
): Promise<void> {
  const folder = path.basename(targetUri.fsPath) || targetUri.fsPath;
  const notes: string[] = [];
  if (plan.skipped.length > 0) {
    notes.push(`${plan.skipped.length} skipped`);
  }
  if (plan.rejected.length > 0) {
    notes.push(`${plan.rejected.length} not copied`);
  }
  if (outcome.cancelled) {
    notes.push('cancelled');
  }
  const suffix = notes.length > 0 ? ` (${notes.join(', ')})` : '';

  if (outcome.failures.length > 0) {
    const detail = outcome.failures
      .slice(0, 3)
      .map((failure) => `${failure.item.name}: ${failure.message}`)
      .join('; ');
    vscode.window.showErrorMessage(
      `Drop In copied ${countLabel(outcome.copied.length)}, but ${countLabel(
        outcome.failures.length
      )} failed — ${detail}`
    );
    return;
  }

  if (outcome.copied.length === 0) {
    const reason =
      plan.rejected[0]?.reason ??
      (plan.skipped.length > 0 ? 'everything was skipped' : 'there was nothing to copy');
    vscode.window.showWarningMessage(`Drop In copied nothing — ${reason}.`);
    return;
  }

  const first = outcome.copied[0]!;
  const answer = await vscode.window.showInformationMessage(
    `Copied ${countLabel(outcome.copied.length)} into “${folder}”${suffix}`,
    'Reveal'
  );
  if (answer === 'Reveal') {
    await vscode.commands.executeCommand(
      'revealInExplorer',
      vscode.Uri.joinPath(targetUri, first.name)
    );
  }
}
