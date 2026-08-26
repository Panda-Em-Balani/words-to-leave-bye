/* -----------------------------------------------------------------------------
   Tells you whether this thing is actually ready to send.

     npm run check
   ----------------------------------------------------------------------------- */

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const envFile = join(ROOT, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const { QUOTES, DEFAULT_BY } = await import('../public/quotes.js');
const { quoteForDate, dateKey, indexForDate } = await import('../public/daily.js');

const results = [];
const check = (label, ok, detail) => results.push({ label, ok, detail });

/* --- the quote book -------------------------------------------------------- */

check('Quote book loads', QUOTES.length > 0, `${QUOTES.length} quotes`);

const malformed = QUOTES.filter((q) => !q || typeof q.text !== 'string' || !q.text.trim());
check('Every quote has text', malformed.length === 0, malformed.length ? `${malformed.length} broken` : 'all good');

const duplicates = QUOTES.length - new Set(QUOTES.map((q) => q.text)).size;
check('No duplicate quotes', duplicates === 0, duplicates ? `${duplicates} repeated` : 'all unique');

const tooLong = QUOTES.filter((q) => q.text.length > 190);
check(
  'Quotes fit a lock screen',
  tooLong.length === 0,
  tooLong.length ? `${tooLong.length} over 190 chars: "${tooLong[0].text.slice(0, 50)}..."` : 'longest is ' +
    Math.max(...QUOTES.map((q) => q.text.length)) + ' chars'
);

const personalised = QUOTES.filter((q) => q.text.includes('{name}')).length;
check('Some quotes use her name', personalised > 0, `${personalised} of ${QUOTES.length} contain {name}`);

const stray = QUOTES.filter((q) => /\{(?!name\})[a-z]+\}/i.test(q.text));
check(
  'No unknown placeholders',
  stray.length === 0,
  stray.length ? `check: "${stray[0].text}"` : 'only {name} is used'
);

/* --- rotation -------------------------------------------------------------- */

const start = Math.ceil(Date.now() / 86400000 / QUOTES.length) * QUOTES.length;
const seen = new Set();
for (let i = 0; i < QUOTES.length; i++) {
  seen.add(indexForDate(QUOTES.length, new Date((start + i) * 86400000).toISOString().slice(0, 10), 'notification'));
}
check('No repeats before the whole book is used', seen.size === QUOTES.length, `${seen.size}/${QUOTES.length} distinct`);

const today = dateKey();
const morning = quoteForDate(QUOTES, { key: today, stream: 'notification', name: 'Sara' });
const widget = quoteForDate(QUOTES, { key: today, stream: 'widget', name: 'Sara' });
check('Widget and notification differ today', morning.text !== widget.text, 'two separate streams');

/* --- deployment -------------------------------------------------------------*/

check('VAPID_PUBLIC_KEY set', Boolean(process.env.VAPID_PUBLIC_KEY), process.env.VAPID_PUBLIC_KEY ? 'present' : 'run: npm run keys');
check('VAPID_PRIVATE_KEY set', Boolean(process.env.VAPID_PRIVATE_KEY), process.env.VAPID_PRIVATE_KEY ? 'present' : 'run: npm run keys');
check('VAPID_SUBJECT set', Boolean(process.env.VAPID_SUBJECT), process.env.VAPID_SUBJECT || 'e.g. mailto:you@example.com');

const hasStore = Boolean(
  (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
);
check('Subscriber storage configured', hasStore, hasStore ? 'Redis reachable via REST' : 'add the Upstash integration in Vercel');
check('CRON_SECRET set', Boolean(process.env.CRON_SECRET), process.env.CRON_SECRET ? 'present' : 'any long random string');
check(
  'ADMIN_KEY set',
  Boolean(process.env.ADMIN_KEY),
  process.env.ADMIN_KEY ? 'present' : 'unlocks /console.html; without it the console is shut'
);

// The app substitutes this placeholder for the live address when it hands the
// script to Scriptable, so the placeholder needs to still be there.
const widgetFile = readFileSync(join(ROOT, 'public', 'leave-bye-widget.js'), 'utf8');
check(
  'Widget script is substitutable',
  widgetFile.includes('https://REPLACE-ME.vercel.app'),
  widgetFile.includes('https://REPLACE-ME.vercel.app')
    ? 'the app fills in the address when she copies it'
    : 'BASE_URL placeholder was edited; the in-app copy button cannot fill it in'
);

const signed = QUOTES.filter((q) => q.by).length;
check('Quotes carry a signature', true, `${QUOTES.length - signed} use the default signature`);

/* --- report ---------------------------------------------------------------- */

console.log('\n  Words to "Leave, Bye." -- readiness check\n');
let failures = 0;
for (const r of results) {
  if (!r.ok) failures++;
  console.log(`  ${r.ok ? 'OK  ' : 'TODO'}  ${r.label.padEnd(42)} ${r.detail || ''}`);
}
console.log(
  failures === 0
    ? '\n  Everything is ready. Deploy it and scan the QR code.\n'
    : `\n  ${failures} thing(s) still to do. The app will run without them, but the\n  8am notification will not send until they are set.\n`
);
