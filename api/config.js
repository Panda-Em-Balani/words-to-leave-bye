import { cors, json } from './_shared.js';
import { vapidPublicKey, pushIsConfigured } from '../lib/push.js';
import { isPersistent } from '../lib/store.js';
import { TIME_ZONE, SEND_HOUR } from '../public/daily.js';
import { QUOTE_COUNT } from '../public/quotes.js';

/** Everything the front end needs to know about this deployment. */
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return json(res, 204, {});
  json(res, 200, {
    vapidPublicKey: vapidPublicKey(),
    pushReady: pushIsConfigured(),
    storageReady: isPersistent(),
    timeZone: TIME_ZONE,
    sendHour: SEND_HOUR,
    quoteCount: QUOTE_COUNT,
  });
}
