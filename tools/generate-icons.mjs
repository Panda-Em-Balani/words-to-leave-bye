/* =============================================================================
   Icon generator.

   Rasterises public/icons/lazy-panda.png into the PNGs the Home Screen, the
   manifest and the notification badge need.

     npm run icons

   The generated PNGs are committed, so you only need to run this if you change
   the logo. It rasterises with headless Chromium via Playwright, which is not a
   dependency of this project -- install it only if you need it:

     npm install --no-save playwright && npx playwright install chromium

   To swap in a completely different logo, run `npm run logo -- <artwork>` to
   produce public/icons/lazy-panda.png, then run this again. Everything else
   picks it up automatically.
   ============================================================================= */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ICONS = join(ROOT, 'public', 'icons');

const GROUND = '#f7f4f2'; // warm off-white, the same family as the app's greys

/* The logo is a bitmap with a transparent surround, so it travels into the
   page as a data URL rather than as inline markup. */
const LOGO =
  `<img src="data:image/png;base64,${readFileSync(join(ICONS, 'lazy-panda.png')).toString('base64')}"` +
  ` style="width:100%;display:block">`;

/* The notification badge has to be a flat white silhouette on transparency, so
   it gets the paw on its own -- a whole panda turns to mush at 96px. */
const PAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g fill="#ffffff">
    <ellipse cx="50" cy="66" rx="22" ry="18"/>
    <circle cx="24" cy="36" r="10"/>
    <circle cx="42" cy="24" r="10.5"/>
    <circle cx="62" cy="24" r="10.5"/>
    <circle cx="79" cy="38" r="10"/>
  </g>
</svg>`;

async function loadPlaywright() {
  const override = process.env.PLAYWRIGHT_MODULE;
  try {
    return await import(override || 'playwright');
  } catch {
    console.error(
      '\n  Playwright is needed to rasterise the logo, and is not installed.\n' +
        '  It is not a dependency of this project because the icons are already\n' +
        '  committed -- you only need it if you are changing the logo:\n\n' +
        '    npm install --no-save playwright && npx playwright install chromium\n'
    );
    process.exit(1);
  }
}

/** One icon: the logo centred on a ground, at `scale` of the canvas. */
function markup(art, size, { ground, scale }) {
  return `<body style="margin:0;width:${size}px;height:${size}px;background:${ground || 'transparent'};display:grid;place-items:center">
    <div style="width:${Math.round(size * scale)}px;display:flex">${art}</div>
  </body>`;
}

const targets = [
  // Apple applies its own rounded mask, so these go edge to edge.
  ['icon-180.png', LOGO, { ground: GROUND, scale: 0.84 }],
  ['icon-192.png', LOGO, { ground: GROUND, scale: 0.84 }],
  ['icon-512.png', LOGO, { ground: GROUND, scale: 0.84 }],
  // Maskable icons get cropped by the OS, so the art sits inside the safe zone.
  ['icon-maskable-512.png', LOGO, { ground: GROUND, scale: 0.62 }],
  ['badge-96.png', PAW, { ground: null, scale: 0.82 }],
];

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

mkdirSync(ICONS, { recursive: true });
for (const [name, art, options] of targets) {
  const size = Number(name.match(/(\d+)\.png$/)[1]);
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(markup(art, size, options));
  const png = await page.screenshot({ omitBackground: !options.ground });
  await page.close();
  writeFileSync(join(ICONS, name), png);
  console.log(`  ${name.padEnd(24)} ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`);
}

await browser.close();
console.log('\nIcons written to public/icons/');
