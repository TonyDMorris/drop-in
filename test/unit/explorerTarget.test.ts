import * as assert from 'node:assert/strict';
import { makeSentinel, parseFocusedPaths } from '../../src/explorerTarget';

describe('explorer focus probe', () => {
  it('makes a sentinel no real path could collide with', () => {
    const sentinel = makeSentinel(1700000000000, 0.5);
    assert.match(sentinel, /^drop-in-focus-probe:1700000000000:/);
    assert.notEqual(makeSentinel(), makeSentinel(Date.now() + 1, Math.random()));
  });

  it('returns undefined when the sentinel survived, meaning nothing had focus', () => {
    const sentinel = makeSentinel();
    assert.equal(parseFocusedPaths(sentinel, sentinel), undefined);
  });

  it('reads the paths copyFilePath left behind', () => {
    assert.deepEqual(parseFocusedPaths('/p/assets', 'sentinel'), ['/p/assets']);
    assert.deepEqual(parseFocusedPaths('/p/a\n/p/b\n', 'sentinel'), ['/p/a', '/p/b']);
  });

  it('treats an empty clipboard as no focus', () => {
    assert.equal(parseFocusedPaths('', 'sentinel'), undefined);
    assert.equal(parseFocusedPaths('\n\n', 'sentinel'), undefined);
  });
});
