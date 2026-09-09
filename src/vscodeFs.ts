import * as vscode from 'vscode';
import type { CopyFileSystem } from './copy';

/**
 * Bridges the pure planning layer to VS Code's file system API.
 *
 * Sources keep the `Uri` they arrived with (the open dialog can hand back
 * non-`file` URIs in remote workspaces), and destinations are built with
 * `Uri.joinPath` so the target's scheme is preserved too.
 */
export function createFileSystem(
  targetUri: vscode.Uri,
  sourceUris: ReadonlyMap<string, vscode.Uri>
): CopyFileSystem {
  return {
    async copy(source, destination, options) {
      const from = sourceUris.get(source) ?? vscode.Uri.file(source);
      const to = destinationUri(targetUri, destination);
      await vscode.workspace.fs.copy(from, to, { overwrite: options.overwrite });
    }
  };
}

function destinationUri(targetUri: vscode.Uri, destination: string): vscode.Uri {
  const name = destination.slice(targetUri.fsPath.length).replace(/^[\\/]+/, '');
  return vscode.Uri.joinPath(targetUri, name || destination);
}

/** Does `name` already exist directly inside `targetUri`? */
export function createExistsCheck(targetUri: vscode.Uri) {
  return async (name: string): Promise<boolean> => {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.joinPath(targetUri, name));
      return true;
    } catch {
      return false;
    }
  };
}

export async function isDirectory(uri: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return (stat.type & vscode.FileType.Directory) !== 0;
  } catch {
    return false;
  }
}
