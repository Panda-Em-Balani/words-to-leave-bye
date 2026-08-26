import { cors, json, readJson, cleanName } from './_shared.js';
import { saveSubscriber, isPersistent } from '../lib/store.js';

/** Registers a device for the 8am push, together with what to call her. */
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST' });

  const body = await readJson(req);
  const subscription = body.subscription;

  if (!subscription || typeof subscription.endpoint !== 'string' || !subscription.keys) {
    return json(res, 400, { error: 'A valid push subscription is required.' });
  }

  const id = await saveSubscriber({
    subscription,
    name: cleanName(body.name),
    timeZone: String(body.timeZone || '').slice(0, 64),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
    createdAt: new Date().toISOString(),
  });

  json(res, 200, { ok: true, id, persistent: isPersistent() });
}
