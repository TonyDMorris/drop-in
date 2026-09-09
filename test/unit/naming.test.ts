import * as assert from 'node:assert/strict';
import { splitName, uniqueName } from '../../src/naming';

const takenIn = (existing: string[]) => (candidate: string) => existing.includes(candidate);

describe('splitName', () => {
  it('splits on the last dot', () => {
    assert.deepEqual(splitName('photo.jpg'), { stem: 'photo', ext: '.jpg' });
    assert.deepEqual(splitName('archive.tar.gz'), { stem: 'archive.tar', ext: '.gz' });
  });

  it('treats dotfiles as all stem', () => {
    assert.deepEqual(splitName('.gitignore'), { stem: '.gitignore', ext: '' });
    assert.deepEqual(splitName('.env.local'), { stem: '.env', ext: '.local' });
  });

  it('handles names with no extension and trailing dots', () => {
    assert.deepEqual(splitName('README'), { stem: 'README', ext: '' });
    assert.deepEqual(splitName('weird.'), { stem: 'weird.', ext: '' });
  });
});

describe('uniqueName', () => {
  it('leaves a free name alone', async () => {
    assert.equal(await uniqueName('photo.jpg', takenIn([])), 'photo.jpg');
  });

  it('adds a Finder-style number before the extension', async () => {
    assert.equal(await uniqueName('photo.jpg', takenIn(['photo.jpg'])), 'photo 2.jpg');
    assert.equal(
      await uniqueName('photo.jpg', takenIn(['photo.jpg', 'photo 2.jpg'])),
      'photo 3.jpg'
    );
  });

  it('continues an existing number rather than stacking suffixes', async () => {
    assert.equal(await uniqueName('photo 2.jpg', takenIn(['photo 2.jpg'])), 'photo 3.jpg');
    assert.notEqual(await uniqueName('photo 2.jpg', takenIn(['photo 2.jpg'])), 'photo 2 2.jpg');
  });

  it('numbers extensionless names and folders', async () => {
    assert.equal(await uniqueName('assets', takenIn(['assets'])), 'assets 2');
    assert.equal(await uniqueName('.gitignore', takenIn(['.gitignore'])), '.gitignore 2');
  });

  it('keeps a leading number in the stem intact', async () => {
    assert.equal(await uniqueName('2024.pdf', takenIn(['2024.pdf'])), '2024 2.pdf');
  });

  it('accepts an async predicate', async () => {
    const taken = async (candidate: string) => candidate === 'a.txt';
    assert.equal(await uniqueName('a.txt', taken), 'a 2.txt');
  });

  it('terminates even when everything is taken', async () => {
    const name = await uniqueName('a.txt', () => true);
    assert.match(name, /^a \d+\.txt$/);
  });
});
