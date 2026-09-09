import * as assert from 'node:assert/strict';
import { executePlan, type CopyFileSystem } from '../../src/copy';
import type { PlannedCopy } from '../../src/plan';

const item = (name: string, overwrite = false): PlannedCopy => ({
  source: `/downloads/${name}`,
  destination: `/project/${name}`,
  name,
  overwrite
});

function recordingFs(failOn: string[] = []): CopyFileSystem & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async copy(source, destination, options) {
      calls.push(`${source} -> ${destination} (overwrite=${options.overwrite})`);
      if (failOn.some((name) => destination.endsWith(name))) {
        throw new Error('EACCES: permission denied');
      }
    }
  };
}

describe('executePlan', () => {
  it('copies every item and reports them', async () => {
    const fs = recordingFs();
    const outcome = await executePlan([item('a.png'), item('b.png')], fs);
    assert.equal(outcome.copied.length, 2);
    assert.deepEqual(outcome.failures, []);
    assert.equal(outcome.cancelled, false);
    assert.deepEqual(fs.calls, [
      '/downloads/a.png -> /project/a.png (overwrite=false)',
      '/downloads/b.png -> /project/b.png (overwrite=false)'
    ]);
  });

  it('passes the overwrite flag through', async () => {
    const fs = recordingFs();
    await executePlan([item('a.png', true)], fs);
    assert.match(fs.calls[0]!, /overwrite=true/);
  });

  it('keeps going after one failure so the rest of the batch still lands', async () => {
    const fs = recordingFs(['b.png']);
    const outcome = await executePlan([item('a.png'), item('b.png'), item('c.png')], fs);
    assert.deepEqual(
      outcome.copied.map((copied) => copied.name),
      ['a.png', 'c.png']
    );
    assert.equal(outcome.failures.length, 1);
    assert.equal(outcome.failures[0]!.item.name, 'b.png');
    assert.match(outcome.failures[0]!.message, /permission denied/);
  });

  it('stops at the next item when cancelled, keeping what already landed', async () => {
    const fs = recordingFs();
    const token = { isCancellationRequested: false };
    const outcome = await executePlan([item('a.png'), item('b.png')], fs, {
      report: () => {
        token.isCancellationRequested = true;
      }
    }, token);
    assert.equal(outcome.cancelled, true);
    assert.equal(outcome.copied.length, 1);
    assert.equal(fs.calls.length, 1);
  });

  it('reports progress that adds up to 100%', async () => {
    const increments: number[] = [];
    await executePlan([item('a.png'), item('b.png'), item('c.png')], recordingFs(), {
      report: (step) => increments.push(step.increment ?? 0)
    });
    assert.equal(increments.length, 3);
    assert.ok(Math.abs(increments.reduce((a, b) => a + b, 0) - 100) < 1e-9);
  });

  it('handles an empty plan without dividing by zero', async () => {
    const outcome = await executePlan([], recordingFs());
    assert.deepEqual(outcome, { copied: [], failures: [], cancelled: false });
  });

  it('stringifies a non-Error throw', async () => {
    const fs: CopyFileSystem = {
      async copy() {
        // eslint-disable-next-line no-throw-literal -- the point of the test
        throw 'something odd';
      }
    };
    const outcome = await executePlan([item('a.png')], fs);
    assert.equal(outcome.failures[0]!.message, 'something odd');
  });
});
