import * as assert from 'node:assert/strict';
import { READ_COMMAND, parse, probes } from '../../src/clipboard/win32';

describe('Windows clipboard reader', () => {
  it('splits CRLF output into paths', () => {
    assert.deepEqual(parse('C:\\Users\\me\\a.png\r\nC:\\Users\\me\\b.png\r\n'), [
      'C:\\Users\\me\\a.png',
      'C:\\Users\\me\\b.png'
    ]);
  });

  it('keeps spaces inside path segments', () => {
    assert.deepEqual(parse('C:\\Users\\me\\My Downloads\\a b.png\r\n'), [
      'C:\\Users\\me\\My Downloads\\a b.png'
    ]);
  });

  it('handles UNC paths', () => {
    assert.deepEqual(parse('\\\\server\\share\\file.txt\r\n'), ['\\\\server\\share\\file.txt']);
  });

  it('returns nothing for an empty clipboard', () => {
    assert.deepEqual(parse(''), []);
    assert.deepEqual(parse('\r\n\r\n'), []);
  });

  it('runs in a single-threaded apartment, which the clipboard requires', () => {
    const probe = probes()[0]!;
    assert.equal(probe.file, 'powershell.exe');
    assert.ok(probe.args.includes('-STA'));
    assert.ok(probe.args.includes(READ_COMMAND));
  });
});
