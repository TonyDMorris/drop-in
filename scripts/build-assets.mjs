import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');
mkdirSync(assets, { recursive: true });

/** Rasterises an SVG at a fixed pixel width. */
function render(sourceName, outputName, width) {
  const svg = readFileSync(join(assets, sourceName), 'utf8');
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  const png = resvg.render().asPng();
  writeFileSync(join(assets, outputName), png);
  console.log(`${outputName}  ${width}px  ${(png.length / 1024).toFixed(1)} KB`);
}

// 128x128 is the Marketplace requirement; the 256 is for the README hero.
render('icon.svg', 'icon.png', 128);
render('icon.svg', 'icon-256.png', 256);
