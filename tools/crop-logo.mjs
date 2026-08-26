/* =============================================================================
   Logo preparation.

     npm run logo -- <source-image>

   Takes the supplied Lazy Panda artwork and produces public/icons/lazy-panda.png:
   the panda on its own, with the wordmark dropped and the surrounding white
   turned transparent.

   Two things happen here, both automatic:

     1. The wordmark is separated from the animal by a band of blank rows, so
        the first block of ink from the top is the panda and everything after
        the gap is type. Only the first block is kept.

     2. The white around the animal is cleared by filling inwards from the
        border. Filling from the edge rather than keying every white pixel is
        what keeps the panda's own white -- its face, its body, the muzzle --
        intact, since those are fenced in by the outline.

   Rasterising needs headless Chromium via Playwright, which is not a
   dependency of this project. Install it only when changing the logo:

     npm install --no-save playwright && npx playwright install chromium
   ============================================================================= */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'icons', 'lazy-panda.png');

const source = process.argv[2];
if (!source) {
  console.error('\n  Usage: npm run logo -- <path-to-the-artwork>\n');
  process.exit(1);
}
const sourcePath = resolve(source);
if (!existsSync(sourcePath)) {
  console.error(`\n  No such file: ${sourcePath}\n`);
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright'));
} catch {
  console.error(
    '\n  Playwright is needed to read and rewrite the image, and is not installed:\n\n' +
      '    npm install --no-save playwright && npx playwright install chromium\n'
  );
  process.exit(1);
}

/* The page cannot read file:// itself, so the bytes travel in as a data URL. */
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' };
const extension = sourcePath.split('.').pop().toLowerCase();
if (!MIME[extension]) {
  console.error(`\n  Unsupported image type: .${extension}\n`);
  process.exit(1);
}
const sourceDataUrl = `data:${MIME[extension]};base64,${readFileSync(sourcePath).toString('base64')}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();

const result = await page.evaluate(async (url) => {
  const img = new Image();
  img.src = url;
  await img.decode();

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const src = ctx.getImageData(0, 0, w, h);
  const px = src.data;

  // JPEG softens every edge, so "blank" is a threshold rather than pure white.
  const BLANK = 238;
  const isBlank = (i) => px[i] >= BLANK && px[i + 1] >= BLANK && px[i + 2] >= BLANK;

  // --- 1. keep the first block of ink, drop the wordmark below it ----------
  const inkPerRow = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    let n = 0;
    for (let x = 0; x < w; x++) if (!isBlank((y * w + x) * 4)) n++;
    inkPerRow[y] = n;
  }

  const firstInk = inkPerRow.findIndex((n) => n > 0);
  if (firstInk < 0) throw new Error('the image is blank');

  // A run of empty rows this long means the artwork has ended and the type
  // is about to start.
  const GAP = Math.max(8, Math.round(h * 0.012));
  let lastInk = firstInk;
  let run = 0;
  for (let y = firstInk; y < h; y++) {
    if (inkPerRow[y] > 0) {
      run = 0;
      lastInk = y;
    } else if (++run >= GAP) {
      break;
    }
  }

  let minX = w;
  let maxX = -1;
  for (let y = firstInk; y <= lastInk; y++) {
    for (let x = 0; x < w; x++) {
      if (!isBlank((y * w + x) * 4)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }

  const pad = Math.round(Math.max(maxX - minX, lastInk - firstInk) * 0.02);
  const x0 = Math.max(0, minX - pad);
  const y0 = Math.max(0, firstInk - pad);
  const cw = Math.min(w - x0, maxX - minX + 1 + pad * 2);
  const ch = Math.min(h - y0, lastInk - firstInk + 1 + pad * 2);

  // --- 2. clear the white around the animal, not the white inside it -------
  const out = ctx.getImageData(x0, y0, cw, ch);
  const o = out.data;
  const seen = new Uint8Array(cw * ch);
  const stack = [];

  for (let x = 0; x < cw; x++) {
    stack.push(x, x + (ch - 1) * cw);
  }
  for (let y = 0; y < ch; y++) {
    stack.push(y * cw, cw - 1 + y * cw);
  }

  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    if (!(o[i] >= BLANK && o[i + 1] >= BLANK && o[i + 2] >= BLANK)) continue;
    o[i + 3] = 0;
    const x = p % cw;
    const y = (p / cw) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < cw - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - cw);
    if (y < ch - 1) stack.push(p + cw);
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = cw;
  outCanvas.height = ch;
  outCanvas.getContext('2d').putImageData(out, 0, 0);

  return {
    dataUrl: outCanvas.toDataURL('image/png'),
    source: { w, h },
    crop: { x: x0, y: y0, w: cw, h: ch },
  };
}, sourceDataUrl);

await browser.close();

writeFileSync(OUT, Buffer.from(result.dataUrl.split(',')[1], 'base64'));

console.log(`\n  source   ${result.source.w}x${result.source.h}`);
console.log(`  cropped  ${result.crop.w}x${result.crop.h}  (wordmark dropped)`);
console.log(`  written  public/icons/lazy-panda.png\n`);
console.log('  Now run: npm run icons\n');
