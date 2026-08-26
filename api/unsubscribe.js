import { cors, json, readJson } from './_shared.js';
import { removeSubscriber } from '../lib/store.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST' });

  const { endpoint } = await readJson(req);
  if (!endpoint) return json(res, 400, { error: 'endpoint is required' });

  await removeSubscriber(endpoint);
  json(res, 200, { ok: true });
}
