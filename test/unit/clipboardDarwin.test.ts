import * as assert from 'node:assert/strict';
import { READ_SCRIPT, parse } from '../../src/clipboard/darwin';

describe('macOS clipboard reader', () => {
  it('reads a JSON array of POSIX paths', () => {
    assert.deepEqual(parse('["/Users/me/a.png","/Users/me/My Folder"]\n'), [
      '/Users/me/a.png',
      '/Users/me/My Folder'
    ]);
  });

  it('treats an empty clipboard as no files', () => {
    assert.deepEqual(parse('[]\n'), []);
    assert.deepEqual(parse('   '), []);
  });

  it('keeps decomposed unicode intact', () => {
    // NSURL hands back NFD on macOS: "cafe" + combining acute.
    assert.deepEqual(parse('["/Users/me/cafe\u0301.txt"]'), ['/Users/me/cafe\u0301.txt']);
  });

  it('ignores non-JSON and non-array output rather than throwing', () => {
    assert.deepEqual(parse('execution error: something went wrong'), []);
    assert.deepEqual(parse('{"not":"an array"}'), []);
  });

  it('drops non-string and empty entries', () => {
    assert.deepEqual(parse('["/a", 42, null, "", "/b"]'), ['/a', '/b']);
  });

  it('falls back to NSFilenamesPboardType in the script', () => {
    assert.ok(READ_SCRIPT.includes('NSFilenamesPboardType'));
    assert.ok(READ_SCRIPT.includes('NSPasteboardURLReadingFileURLsOnlyKey'));
    assert.ok(READ_SCRIPT.trimEnd().endsWith('JSON.stringify(out);'));
  });
});
