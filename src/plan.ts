import * as path from 'node:path';
import { uniqueName } from './naming';
import { isSameOrInside, isSamePath } from './paths';

export type ConflictPolicy = 'prompt' | 'keepBoth' | 'overwrite' | 'skip';
export type ConflictAction = 'keepBoth' | 'overwrite' | 'skip' | 'cancel';

export interface ConflictChoice {
  action: ConflictAction;
  /** Apply this same answer to every remaining clash without asking again. */
  applyToAll: boolean;
}

export interface ConflictQuestion {
  name: string;
  targetDir: string;
  /** How many sources, including this one, are still unresolved. */
  remaining: number;
}

export interface PlannedCopy {
  source: string;
  destination: string;
  name: string;
  overwrite: boolean;
}

export interface RejectedSource {
  source: string;
  reason: string;
}

export interface CopyPlan {
  items: PlannedCopy[];
  rejected: RejectedSource[];
  skipped: string[];
  cancelled: boolean;
}

export interface PlanDeps {
  /** Does `name` already exist directly inside the target folder? */
  exists(name: string): boolean | Promise<boolean>;
  ask(question: ConflictQuestion): Promise<ConflictChoice>;
  policy: ConflictPolicy;
  platform: NodeJS.Platform;
}

/**
 * Rejects sources that could not be copied safely or meaningfully, before any
 * conflict prompt is shown — so we never ask the user about a copy we were
 * going to refuse anyway.
 */
export function validateSources(
  sources: string[],
  targetDir: string,
  platform: NodeJS.Platform
): { accepted: string[]; rejected: RejectedSource[] } {
  const accepted: string[] = [];
  const rejected: RejectedSource[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    if (seen.has(source)) {
      continue;
    }
    seen.add(source);

    if (isSamePath(source, targetDir, platform)) {
      rejected.push({ source, reason: 'a folder cannot be copied into itself' });
    } else if (isSameOrInside(targetDir, source, platform)) {
      rejected.push({ source, reason: 'the target folder is inside this folder' });
    } else if (isSamePath(path.dirname(source), targetDir, platform)) {
      rejected.push({ source, reason: 'it is already in this folder' });
    } else {
      accepted.push(source);
    }
  }

  return { accepted, rejected };
}

/**
 * Turns a list of source paths into concrete destinations, resolving name
 * clashes along the way. Pure apart from the injected `exists`/`ask` callbacks,
 * so the whole decision tree is unit-testable.
 */
export async function buildPlan(
  sources: string[],
  targetDir: string,
  deps: PlanDeps
): Promise<CopyPlan> {
  const { accepted, rejected } = validateSources(sources, targetDir, deps.platform);

  const items: PlannedCopy[] = [];
  const skipped: string[] = [];
  const claimed = new Set<string>();
  let standingAnswer: ConflictAction | undefined;

  const isTaken = async (name: string): Promise<boolean> =>
    claimed.has(name.toLowerCase()) || (await deps.exists(name));

  for (let index = 0; index < accepted.length; index++) {
    const source = accepted[index]!;
    const name = path.basename(source);

    if (!(await isTaken(name))) {
      claimed.add(name.toLowerCase());
      items.push({ source, destination: path.join(targetDir, name), name, overwrite: false });
      continue;
    }

    let action: ConflictAction;
    if (standingAnswer) {
      action = standingAnswer;
    } else if (deps.policy === 'prompt') {
      const choice = await deps.ask({
        name,
        targetDir,
        remaining: accepted.length - index
      });
      action = choice.action;
      if (choice.applyToAll) {
        standingAnswer = choice.action;
      }
    } else {
      action = deps.policy;
    }

    if (action === 'cancel') {
      return { items: [], rejected, skipped: [], cancelled: true };
    }
    if (action === 'skip') {
      skipped.push(source);
      continue;
    }
    if (action === 'overwrite') {
      claimed.add(name.toLowerCase());
      items.push({ source, destination: path.join(targetDir, name), name, overwrite: true });
      continue;
    }

    const freeName = await uniqueName(name, isTaken);
    claimed.add(freeName.toLowerCase());
    items.push({
      source,
      destination: path.join(targetDir, freeName),
      name: freeName,
      overwrite: false
    });
  }

  return { items, rejected, skipped, cancelled: false };
}
