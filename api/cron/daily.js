import { cors, json, query, authorizeCron } from '../_shared.js';
import { listSubscribers, claimSendSlot, lastSent, getPinned, isPersistent } from '../../lib/store.js';
import { sendToAll, pushIsConfigured } from '../../lib/push.js';
import { QUOTES } from '../../public/quotes.js';
import { quoteForDate, dateKey, personalise } from '../../public/daily.js';

/**
 * The 8am job.
 *
 * Runs once per day and pushes the day's notification quote to every
 * registered device, personalised per subscriber.
 *
 * Safe to call more than once: the first call for a given Dubai date claims
 * that date, and later calls report "already sent" instead of double-sending.
 * Pass ?force=1 (with the secret) to override that during testing.
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (!authorizeCron(req)) return json(res, 401, { error: 'Not authorised.' });
  if (!pushIsConfigured()) return json(res, 503, { error: 'Push is not configured yet.' });

  const q = query(req);
  const key = /^\d{4}-\d{2}-\d{2}$/.test(q.date || '') ? q.date : dateKey();
  const force = q.force === '1' || q.force === 'true';

  const fresh = await claimSendSlot(key);
  if (!fresh && !force) {
    return json(res, 200, { ok: true, skipped: 'already-sent', date: key, lastSent: await lastSent() });
  }

  // A quote pinned for this morning replaces the deck's pick.
  const pinned = isPersistent() ? await getPinned(key) : null;

  const subscribers = await listSubscribers();
  const results = await sendToAll(subscribers, (record) =>
    buildPayload(key, record.name, pinned)
  );

  const sent = results.filter((r) => r.ok).length;
  json(res, 200, {
    ok: true,
    date: key,
    pinned: Boolean(pinned),
    subscribers: subscribers.length,
    sent,
    failed: results.length - sent,
    results,
  });
}

function buildPayload(key, name, pinned) {
  const quote = pinned
    ? { text: personalise(pinned.text, name), by: pinned.by }
    : quoteForDate(QUOTES, { key, stream: 'notification', name });
  return {
    title: 'From your Bestfriend',
    body: quote.text,
    by: quote.by,
    tag: `wtlb-${key}`,
    url: '/',
  };
}
