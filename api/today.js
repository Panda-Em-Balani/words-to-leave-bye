import { cors, json, query, cleanName } from './_shared.js';
import { QUOTES } from '../public/quotes.js';
import { quoteForDate, dateKey } from '../public/daily.js';

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
  const result = quoteForDate(QUOTES, { key, stream, name: cleanName(q.name) });

  // The quote only changes at midnight Dubai time, so a short cache is safe
  // and keeps the widget snappy.
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  json(res, 200, { ...result, total: QUOTES.length });
}
