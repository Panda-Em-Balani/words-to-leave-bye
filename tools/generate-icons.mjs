/* =============================================================================
   Icon generator.

   Draws the app mark -- a white "L," sitting on a blue highlighter swipe --
   and writes it out as PNGs. Written with nothing but zlib so the project has
   no image-processing dependency.

     node tools/generate-icons.mjs
   ============================================================================= */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const INK = [0x22, 0x21, 0x21, 255];
const MARKER = [0x07, 0x3b, 0x62, 255];
const MARKER_LIT = [0x0a, 0x4d, 0x80, 255];
const PAPER = [0xff, 0xff, 0xff, 255];
const CLEAR = [0, 0, 0, 0];

const SS = 3; // supersampling factor, for clean edges without a rasteriser

/* --- PNG encoding ---------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function encodePng(pixels, size) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* --- Geometry -------------------------------------------------------------- */

/** Rounded rectangle centred on the origin, in an already-rotated space. */
function inRoundRect(x, y, w, h, r) {
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const dx = Math.max(Math.abs(x) - hw, 0);
  const dy = Math.max(Math.abs(y) - hh, 0);
  return dx * dx + dy * dy <= r * r && Math.abs(x) <= w / 2 && Math.abs(y) <= h / 2;
}

function inCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/**
 * A comma drawn the way a pen draws one: a round bowl that tapers away along a
 * curve. Modelled as a run of shrinking circles so the join is never a seam.
 * Memoised, because this runs once per subpixel sample.
 */
const strokeCache = new Map();
function commaStroke(cx, cy, r, baseline) {
  const key = cx + '|' + cy + '|' + r;
  const hit = strokeCache.get(key);
  if (hit) return hit;

  const p0 = [cx, cy];
  const p1 = [cx + r * 0.62, baseline + r * 0.25];
  const p2 = [cx - r * 1.05, baseline + r * 1.60];

  const points = [];
  const STEPS = 26;
  for (let i = 0; i <= STEPS; i++) {
    // Stops just short of the mathematical tip: the last few circles would
    // land under a pixel and alias into a dotted trail.
    const t = (i / STEPS) * 0.88;
    const mt = 1 - t;
    points.push([
      mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
      mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
      Math.max(r * Math.pow(mt, 1.15), r * 0.11),
    ]);
  }
  strokeCache.set(key, points);
  return points;
}

/**
 * The mark itself, evaluated one sample at a time.
 * `inset` shrinks the artwork for maskable icons, which get cropped by the OS.
 */
function sample(px, py, size, { inset = 1, transparent = false } = {}) {
  const cx = size / 2;
  const cy = size / 2;

  // Rotate into the highlighter's own frame: a real swipe is never level.
  const angle = (-7 * Math.PI) / 180;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const ox = px - cx;
  const oy = py - cy;
  const x = ox * cos - oy * sin;
  const y = ox * sin + oy * cos;

  const bandW = size * 0.78 * inset;
  const bandH = size * 0.40 * inset;

  let colour = transparent ? CLEAR : INK;

  if (inRoundRect(x, y, bandW, bandH, bandH * 0.30)) {
    // A soft left-to-right lift, the way ink pools unevenly.
    const t = (x + bandW / 2) / bandW;
    const lift = Math.sin(t * Math.PI) * 0.55;
    colour = [
      Math.round(MARKER[0] + (MARKER_LIT[0] - MARKER[0]) * lift),
      Math.round(MARKER[1] + (MARKER_LIT[1] - MARKER[1]) * lift),
      Math.round(MARKER[2] + (MARKER_LIT[2] - MARKER[2]) * lift),
      255,
    ];
  }

  // --- the glyph: L,
  const gh = bandH * 0.58;          // cap height
  const t = bandH * 0.150;          // stroke weight
  const footW = gh * 0.48;
  const commaR = t * 0.72;
  const gap = t * 0.95;

  // The L is as wide as its foot; the comma hangs off the end of it.
  const glyphW = footW + gap + commaR * 2;
  const left = -glyphW / 2;
  const top = -gh / 2;
  const baseline = top + gh;

  // stem of the L
  if (inRoundRect(x - (left + t / 2), y - (top + gh / 2), t, gh, t * 0.34)) colour = PAPER;
  // foot of the L
  if (inRoundRect(x - (left + footW / 2), y - (baseline - t / 2), footW, t, t * 0.34)) colour = PAPER;

  // The comma: a round bowl sitting on the baseline, with a tail that tapers
  // down and to the left, the way a written comma actually falls.
  const commaX = left + footW + gap + commaR;
  const commaY = baseline - commaR;
  for (const [sx, sy, sr] of commaStroke(commaX, commaY, commaR, baseline)) {
    if (inCircle(x, y, sx, sy, sr)) {
      colour = PAPER;
      break;
    }
  }

  return colour;
}

/* --- Rendering ------------------------------------------------------------- */

function render(size, options = {}) {
  const hi = size * SS;
  const out = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = ((x * SS + sx + 0.5) / hi) * size;
          const py = ((y * SS + sy + 0.5) / hi) * size;
          const c = sample(px, py, size, options);
          r += c[0] * c[3];
          g += c[1] * c[3];
          b += c[2] * c[3];
          a += c[3];
        }
      }
      const i = (y * size + x) * 4;
      if (a === 0) {
        out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
      } else {
        out[i] = Math.round(r / a);
        out[i + 1] = Math.round(g / a);
        out[i + 2] = Math.round(b / a);
        out[i + 3] = Math.round(a / (SS * SS));
      }
    }
  }
  return out;
}

/** The notification badge is a flat white silhouette on transparency. */
function renderBadge(size) {
  const pixels = render(size, { transparent: true, inset: 1.1 });
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] > 0) {
      pixels[i] = 255;
      pixels[i + 1] = 255;
      pixels[i + 2] = 255;
    }
  }
  return pixels;
}

const targets = [
  ['icon-180.png', () => render(180)],
  ['icon-192.png', () => render(192)],
  ['icon-512.png', () => render(512)],
  ['icon-maskable-512.png', () => render(512, { inset: 0.72 })],
  ['badge-96.png', () => renderBadge(96)],
];

mkdirSync(OUT, { recursive: true });
for (const [name, draw] of targets) {
  const size = Number(name.match(/(\d+)\.png$/)[1]);
  const png = encodePng(draw(), size);
  writeFileSync(join(OUT, name), png);
  console.log(`  ${name.padEnd(24)} ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`);
}
console.log('\nIcons written to public/icons/');
