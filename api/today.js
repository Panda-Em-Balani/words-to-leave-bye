import { cors, json, query, cleanName } from './_shared.js';
import { getPinned, isPersistent } from '../lib/store.js';
import { QUOTES } from '../public/quotes.js';
import { quoteForDate, dateKey, personalise } from '../public/daily.js';

/**
 * Today's quote. Used by the Home Screen widget and by the app itself.
 *   /api/today?stream=widget&name=Sara
 */
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return json(res, 204, {});

  const q = query(req);
  const stream = q.stream === 'notification' ? 'notification' : 'widget';
  const key = /^\d{4}-\d{2}-\d{2}$/.test(q.date || '') ? q.date : dateKey();
  const name = cleanName(q.name);

  // A quote pinned for this date replaces the deck on both streams: if it
  // was written by hand for today, today is what it is for.
  const pinned = isPersistent() ? await getPinned(key) : null;
  const result = pinned
    ? { date: key, stream, index: -1, text: personalise(pinned.text, name), by: pinned.by, pinned: true }
    : quoteForDate(QUOTES, { key, stream, name });

  // The quote only changes at midnight Dubai time, so a short cache is safe
  // and keeps the widget snappy. A pinned quote can be written at any hour,
  // though, so that one is not held on to.
  res.setHeader('Cache-Control', pinned ? 'no-store' : 'public, max-age=300, s-maxage=300');
  json(res, 200, { ...result, total: QUOTES.length });
}
