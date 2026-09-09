import * as assert from 'node:assert/strict';
import { parseUriList, probes } from '../../src/clipboard/linux';

describe('Linux clipboard reader', () => {
  it('parses a text/uri-list payload', () => {
    assert.deepEqual(parseUriList('file:///home/me/a.png\r\nfile:///home/me/b.png\r\n'), [
      '/home/me/a.png',
      '/home/me/b.png'
    ]);
  });

  it('percent-decodes spaces and unicode', () => {
    assert.deepEqual(parseUriList('file:///home/me/my%20file%20caf%C3%A9.txt'), [
      '/home/me/my file café.txt'
    ]);
  });

  it('skips comments and blank lines per RFC 2483', () => {
    assert.deepEqual(parseUriList('# a comment\n\nfile:///home/me/a.png\n'), ['/home/me/a.png']);
  });

  it('skips the copy/cut header of x-special/gnome-copied-files', () => {
    assert.deepEqual(parseUriList('copy\nfile:///home/me/a.png\nfile:///home/me/b.png'), [
      '/home/me/a.png',
      '/home/me/b.png'
    ]);
  });

  it('accepts an explicit localhost host but rejects remote hosts', () => {
    assert.deepEqual(parseUriList('file://localhost/home/me/a.png'), ['/home/me/a.png']);
    assert.deepEqual(parseUriList('file://otherbox/home/me/a.png'), []);
  });

  it('ignores non-file URIs such as a copied web link', () => {
    assert.deepEqual(parseUriList('https://example.com/a.png'), []);
  });

  it('survives a malformed percent escape', () => {
    assert.deepEqual(parseUriList('file:///home/me/100%.png'), ['/home/me/100%.png']);
  });

  it('prefers wl-paste on Wayland and xclip otherwise', () => {
    assert.equal(probes({ WAYLAND_DISPLAY: 'wayland-0' })[0]!.file, 'wl-paste');
    assert.equal(probes({})[0]!.file, 'xclip');
    // Either way both tools are attempted.
    assert.deepEqual(new Set(probes({}).map((probe) => probe.file)), new Set(['xclip', 'wl-paste']));
  });
});
