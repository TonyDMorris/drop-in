import * as assert from 'node:assert/strict';
import { NO_WORKSPACE, resolveTarget } from '../../src/target';

describe('resolveTarget', () => {
  it('uses a clicked folder directly', () => {
    assert.deepEqual(resolveTarget({ path: '/p/assets', isDirectory: true }, ['/p']), {
      kind: 'resolved',
      path: '/p/assets'
    });
  });

  it('uses the containing folder when a file was clicked', () => {
    assert.deepEqual(resolveTarget({ path: '/p/src/index.ts', isDirectory: false }, ['/p']), {
      kind: 'resolved',
      path: '/p/src'
    });
  });

  it('falls back to the only workspace folder when nothing was clicked', () => {
    assert.deepEqual(resolveTarget(undefined, ['/p']), { kind: 'resolved', path: '/p' });
  });

  it('asks which root in a multi-root workspace', () => {
    assert.deepEqual(resolveTarget(undefined, ['/one', '/two']), {
      kind: 'pick',
      options: ['/one', '/two']
    });
  });

  it('explains itself when no folder is open', () => {
    assert.deepEqual(resolveTarget(undefined, []), { kind: 'none', reason: NO_WORKSPACE });
  });
});
