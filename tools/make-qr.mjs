/* =============================================================================
   Makes the QR code she scans, and a printable card to put it on.

     npm run qr -- https://your-app.vercel.app

   Writes two files into qr/:
     leave-bye-qr.png     the bare code, for sticking into anything
     leave-bye-card.png   a card with the panda and the code, ready to print
                          or send as an image

   The bare code needs nothing but Node. The card is laid out in HTML and
   rasterised with headless Chromium, so it needs Playwright -- same optional
   dependency the icon generator uses:

     npm install --no-save playwright && npx playwright install chromium
   ============================================================================= */

import QRCode from 'qrcode';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'qr');

const INK = '#222121';
const MARKER = '#073b62';

const url = process.argv[2];

if (!url || !/^https?:\/\//.test(url)) {
  console.error(`
  Give it the address the app is deployed at.

    npm run qr -- https://your-app.vercel.app
`);
  process.exit(1);
}

// Highest error correction, so the code still scans with the panda sitting on
// top of it and after being printed, folded, or photographed off a screen.
const QR_OPTIONS = { errorCorrectionLevel: 'H', margin: 2, color: { dark: INK, light: '#ffffff' } };

mkdirSync(OUT, { recursive: true });

/* --- the bare code --------------------------------------------------------- */

await QRCode.toFile(join(OUT, 'leave-bye-qr.png'), url, { ...QR_OPTIONS, width: 1200 });
console.log('  qr/leave-bye-qr.png       1200x1200');

/* --- the card -------------------------------------------------------------- */

const qrSvg = await QRCode.toString(url, { ...QR_OPTIONS, type: 'svg' });
const panda = readFileSync(join(ROOT, 'public', 'icons', 'panda.svg'), 'utf8')
  .replace('<svg xmlns="http://www.w3.org/2000/svg" ', '<svg ');

const card = `<!doctype html><meta charset="utf-8"><body style="margin:0">
<div style="
  width:1080px;height:1500px;box-sizing:border-box;padding:96px 80px 80px;
  background:radial-gradient(120% 70% at 50% 0%, rgba(7,59,98,.55) 0%, transparent 62%), ${INK};
  display:flex;flex-direction:column;align-items:center;text-align:center;
  font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#fff">

  <div style="width:132px;height:132px;padding:17px;background:#f7f4f2;border-radius:38px;
              box-shadow:0 18px 50px rgba(0,0,0,.45);box-sizing:border-box">
    ${panda}
  </div>

  <p style="margin:44px 0 0;font-size:26px;letter-spacing:.26em;text-transform:uppercase;
            color:rgba(255,255,255,.4)">Words to</p>

  <h1 style="margin:14px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:96px;
             font-weight:700;letter-spacing:-.02em;line-height:1">
    <span style="background:linear-gradient(101deg, ${MARKER} 0%, #0a4d80 55%, ${MARKER} 100%);
                 padding:.06em .22em .12em;
                 border-radius:.45em .85em .5em .7em / .7em .4em .8em .45em;
                 -webkit-box-decoration-break:clone">Leave, Bye.</span>
  </h1>

  <div style="margin-top:64px;position:relative;background:#fff;padding:34px;border-radius:34px;
              box-shadow:0 26px 70px rgba(0,0,0,.5)">
    <div style="width:520px;height:520px;display:flex">${qrSvg}</div>
    <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
                width:104px;height:104px;padding:13px;background:#fff;border-radius:26px;
                box-sizing:border-box">${panda}</div>
  </div>

  <p style="margin:56px 0 0;font-size:34px;line-height:1.45;color:#fff;max-width:760px">
    Point your camera at this.
  </p>
  <p style="margin:14px 0 0;font-size:25px;line-height:1.5;color:rgba(255,255,255,.5);max-width:700px">
    It will ask to go on your Home Screen. Say yes. Then open it from there,
    not from Safari.
  </p>

  <p style="margin:auto 0 0;font-size:22px;color:rgba(255,255,255,.32)">
    A quote every morning at 8am. Nothing else, ever.
  </p>
</div></body>`;

let chromium;
try {
  ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright'));
} catch {
  console.log(
    '\n  Card skipped: Playwright is not installed, so there is no way to\n' +
      '  rasterise it. The bare code above is ready to use. For the card:\n\n' +
      '    npm install --no-save playwright && npx playwright install chromium\n'
  );
  process.exit(0);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1500 }, deviceScaleFactor: 2 });
await page.setContent(card);
writeFileSync(join(OUT, 'leave-bye-card.png'), await page.screenshot());
await browser.close();

console.log('  qr/leave-bye-card.png     2160x3000 (printable)');
console.log(`\nBoth point at ${url}\n`);
