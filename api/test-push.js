import { cors, json, readJson, cleanName } from './_shared.js';
import { getSubscriber, usedQuotes, nextTestTicket } from '../lib/store.js';
import { sendTo, pushIsConfigured } from '../lib/push.js';
import { QUOTES, DEFAULT_BY } from '../public/quotes.js';
import { rotate, personalise, fingerprint } from '../public/daily.js';

/**
 * Fires one notification straight away, so the setup can be proved without
 * waiting for 8am. Wired to the "Send me one right now" button in the app.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST' });
  if (!pushIsConfigured()) return json(res, 503, { error: 'Push is not configured yet.' });

  const body = await readJson(req);
  if (!body.endpoint) return json(res, 400, { error: 'endpoint is required' });

  const record = await getSubscriber(body.endpoint);
  if (!record) return json(res, 404, { error: 'That device is not subscribed.' });

  const name = cleanName(body.name) || record.name;

  /* A test must not spend a morning.

     This used to send tomorrow's quote, on the reasoning that it would not
     spoil today's. It spoiled tomorrow's instead -- every test guaranteed a
     repeat the following morning, which is exactly the bug this replaced.

     So a test draws from the quotes she has already been sent: whatever it
     picks, she has seen it before and the schedule keeps everything it still
     owes her. Before the first real push there is nothing used yet, so it
     falls back to the whole book -- the only case where a test can show
     something the schedule has not reached, and only until the first morning.

     A counter, not the clock, walks the pool: two taps are always two
     different quotes, however fast they come. */
  const used = await usedQuotes();
  const seen = QUOTES.filter((q) => used.has(fingerprint(q.text)));
  const pool = seen.length ? seen : QUOTES;
  const quote = pool[rotate(pool.length, await nextTestTicket(), 'test')];

  const result = await sendTo(record, {
    title: 'From your Bestfriend',
    body: personalise(quote.text, name),
    by: quote.by || DEFAULT_BY,
    tag: 'wtlb-test',
    url: '/?from=test',
  });

  json(res, result.ok ? 200 : 502, result);
}
