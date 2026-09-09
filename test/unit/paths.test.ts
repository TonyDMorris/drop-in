import * as assert from 'node:assert/strict';
import { isSameOrInside, isSamePath, normalizeForCompare } from '../../src/paths';

describe('path comparison', () => {
  it('ignores trailing separators', () => {
    assert.equal(normalizeForCompare('/a/b/', 'linux'), '/a/b');
    assert.ok(isSamePath('/a/b', '/a/b/', 'linux'));
  });

  it('is case-insensitive on macOS and Windows, case-sensitive on Linux', () => {
    assert.ok(isSamePath('/Users/Me/A', '/users/me/a', 'darwin'));
    assert.ok(isSamePath('C:\\Users\\Me', 'c:\\users\\me', 'win32'));
    assert.ok(!isSamePath('/home/me/A', '/home/me/a', 'linux'));
  });

  it('detects a folder nested inside another', () => {
    assert.ok(isSameOrInside('/a/b/c', '/a/b', 'linux'));
    assert.ok(isSameOrInside('/a/b', '/a/b', 'linux'));
    assert.ok(!isSameOrInside('/a/b', '/a/b/c', 'linux'));
  });

  it('does not mistake a sibling with a shared prefix for a child', () => {
    assert.ok(!isSameOrInside('/a/bcd', '/a/b', 'linux'));
    assert.ok(!isSameOrInside('C:\\assets-old', 'C:\\assets', 'win32'));
  });

  it('understands Windows separators', () => {
    assert.ok(isSameOrInside('C:\\a\\b\\c', 'C:\\a\\b', 'win32'));
  });
});

describe('platform independence', () => {
  // These must give the same answer wherever the suite runs, or the Windows
  // rules are only ever exercised on a Windows machine.
  it('applies Windows rules from any host', () => {
    assert.equal(normalizeForCompare('C:\\Users\\Me\\', 'win32'), 'c:\\users\\me');
    assert.ok(isSameOrInside('C:\\a\\b\\c', 'C:\\a\\b', 'win32'));
    assert.ok(!isSameOrInside('C:\\a\\bcd', 'C:\\a\\b', 'win32'));
  });

  it('applies POSIX rules from any host', () => {
    assert.equal(normalizeForCompare('/a/b/', 'linux'), '/a/b');
    assert.ok(isSameOrInside('/a/b/c', '/a/b', 'linux'));
    assert.ok(!isSameOrInside('/a/bcd', '/a/b', 'linux'));
  });

  it('does not collapse a filesystem root', () => {
    assert.equal(normalizeForCompare('/', 'linux'), '/');
    assert.ok(isSameOrInside('/a', '/', 'linux'));
  });
});
