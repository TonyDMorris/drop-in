import * as path from 'node:path';

/** The Explorer item that was right-clicked, if any. */
export interface ClickedResource {
  path: string;
  isDirectory: boolean;
}

export type TargetDecision =
  | { kind: 'resolved'; path: string }
  | { kind: 'pick'; options: string[] }
  | { kind: 'none'; reason: string };

export const NO_WORKSPACE =
  'Open a folder in VS Code first — Drop In needs somewhere to copy files to.';

/**
 * Works out which folder files should land in.
 *
 * Right-clicking a file targets its containing folder, which is what people
 * mean when they click next to where they want the file. With no clicked
 * resource (empty Explorer space, or the Command Palette) we fall back to the
 * workspace, asking which root only when there is genuinely a choice.
 */
export function resolveTarget(
  clicked: ClickedResource | undefined,
  workspaceFolders: string[]
): TargetDecision {
  if (clicked) {
    return {
      kind: 'resolved',
      path: clicked.isDirectory ? clicked.path : path.dirname(clicked.path)
    };
  }
  const first = workspaceFolders[0];
  if (!first) {
    return { kind: 'none', reason: NO_WORKSPACE };
  }
  if (workspaceFolders.length === 1) {
    return { kind: 'resolved', path: first };
  }
  return { kind: 'pick', options: workspaceFolders };
}
