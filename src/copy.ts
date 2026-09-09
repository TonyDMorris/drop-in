import type { PlannedCopy } from './plan';

export interface CopyFileSystem {
  copy(source: string, destination: string, options: { overwrite: boolean }): Promise<void>;
}

export interface ProgressLike {
  report(step: { message?: string; increment?: number }): void;
}

export interface CancellationLike {
  isCancellationRequested: boolean;
}

export interface CopyFailure {
  item: PlannedCopy;
  message: string;
}

export interface CopyOutcome {
  copied: PlannedCopy[];
  failures: CopyFailure[];
  cancelled: boolean;
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Copies every planned item. One failure does not abort the rest — a batch of
 * ten downloads where one is locked should still land the other nine, with the
 * failure reported afterwards.
 */
export async function executePlan(
  items: PlannedCopy[],
  fs: CopyFileSystem,
  progress?: ProgressLike,
  token?: CancellationLike
): Promise<CopyOutcome> {
  const copied: PlannedCopy[] = [];
  const failures: CopyFailure[] = [];
  const increment = items.length > 0 ? 100 / items.length : 0;

  for (const item of items) {
    if (token?.isCancellationRequested) {
      return { copied, failures, cancelled: true };
    }
    progress?.report({ message: item.name, increment });
    try {
      await fs.copy(item.source, item.destination, { overwrite: item.overwrite });
      copied.push(item);
    } catch (error) {
      failures.push({ item, message: describe(error) });
    }
  }

  return { copied, failures, cancelled: false };
}
