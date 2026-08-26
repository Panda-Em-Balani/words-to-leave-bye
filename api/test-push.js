import { cors, json, readJson, cleanName } from './_shared.js';
import { getSubscriber } from '../lib/store.js';
import { sendTo, pushIsConfigured } from '../lib/push.js';
import { QUOTES } from '../public/quotes.js';
import { quoteForDate, dateKey } from '../public/daily.js';

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
  // Pulls tomorrow's notification quote so a test never spoils today's real one.
  const tomorrow = new Date(Date.now() + 86400000);
  const quote = quoteForDate(QUOTES, { key: dateKey(tomorrow), stream: 'notification', name });

  const result = await sendTo(record, {
    title: 'Words to Leave, Bye.',
    body: quote.text,
    by: quote.by,
    tag: 'wtlb-test',
    url: '/?from=test',
  });

  json(res, result.ok ? 200 : 502, result);
}
