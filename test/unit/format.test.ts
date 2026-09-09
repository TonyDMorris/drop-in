import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import { countLabel, resolvePickerLocation, summariseNames } from '../../src/format';
import { copyShortcut, fileManagerName, nothingOnClipboard } from '../../src/messages';

describe('resolvePickerLocation', () => {
  it('expands a leading tilde', () => {
    assert.equal(resolvePickerLocation('~/Downloads', '/Users/me'), path.join('/Users/me', 'Downloads'));
    assert.equal(resolvePickerLocation('~', '/Users/me'), '/Users/me');
  });

  it('passes absolute paths through', () => {
    assert.equal(resolvePickerLocation('/tmp/inbox', '/Users/me'), '/tmp/inbox');
  });

  it('returns undefined for empty, so the dialog reopens where it was', () => {
    assert.equal(resolvePickerLocation('', '/Users/me'), undefined);
    assert.equal(resolvePickerLocation('   ', '/Users/me'), undefined);
  });

  it('does not expand a tilde in the middle of a path', () => {
    assert.equal(resolvePickerLocation('/tmp/~backup', '/Users/me'), '/tmp/~backup');
  });
});

describe('wording', () => {
  it('pluralises counts', () => {
    assert.equal(countLabel(1), '1 item');
    assert.equal(countLabel(3), '3 items');
    assert.equal(countLabel(0, 'file'), '0 files');
  });

  it('trims long name lists', () => {
    assert.equal(summariseNames(['a', 'b']), 'a, b');
    assert.equal(summariseNames(['a', 'b', 'c', 'd', 'e']), 'a, b, c and 2 more');
  });

  it('names the right file manager and shortcut per platform', () => {
    assert.equal(fileManagerName('darwin'), 'Finder');
    assert.equal(fileManagerName('win32'), 'File Explorer');
    assert.equal(fileManagerName('linux'), 'your file manager');
    assert.equal(copyShortcut('darwin'), '⌘C');
    assert.equal(copyShortcut('linux'), 'Ctrl+C');
    assert.match(nothingOnClipboard('darwin'), /Finder, press ⌘C/);
  });
});
