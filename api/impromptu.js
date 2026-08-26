import { cors, json, query, readJson, cleanQuote, cleanName, authorizeAdmin } from './_shared.js';
import { listSubscribers, pinQuote, getPinned, clearPinned, isPersistent } from '../lib/store.js';
import { sendToAll, pushIsConfigured } from '../lib/push.js';
import { DEFAULT_BY } from '../public/quotes.js';
import { dateKey, personalise } from '../public/daily.js';

/**
 * The owner's console, behind ADMIN_KEY. Two things it can do with a quote
 * typed by hand:
 *
 *   send  -- push it to every device right now, off schedule
 *   pin   -- make it THE quote for a date, so the app, the widget and that
 *            morning's 8am push all use it instead of the shuffled deck
 *
 * Pinning is what makes an impromptu quote stick without a redeploy. Sending
 * is for when it cannot wait until morning.
 */
export default async function handler(req, res) {
  cors(res);
  // The console holds a secret, so browsers must never cache these replies.
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (!authorizeAdmin(req)) return json(res, 401, { error: 'Wrong key.' });

  if (req.method === 'GET') return status(res);
  if (req.method !== 'POST') return json(res, 405, { error: 'Use GET or POST' });

  const body = await readJson(req);
  const action = body.action || 'pin';
  const key = resolveDate(body.date);
  if (!key) return json(res, 400, { error: 'date must be today, tomorrow or YYYY-MM-DD.' });

  if (action === 'clear') {
    await clearPinned(key);
    return json(res, 200, { ok: true, action, date: key, pinned: null });
  }

  const text = cleanQuote(body.text);
  if (!text) return json(res, 400, { error: 'The quote is empty.' });
  const by = cleanName(body.by) || DEFAULT_BY;

  if (action === 'pin') {
    if (!isPersistent()) {
      return json(res, 503, {
        error: 'Storage is not connected, so a pinned quote would not survive. Connect Upstash first.',
      });
    }
    const pinned = await pinQuote(key, { text, by });
    return json(res, 200, { ok: true, action, date: key, pinned });
  }

  if (action === 'send') {
    if (!pushIsConfigured()) return json(res, 503, { error: 'Push is not configured yet.' });
    const subscribers = await listSubscribers();
    if (!subscribers.length) return json(res, 200, { ok: true, action, sent: 0, subscribers: 0 });

    const results = await sendToAll(subscribers, (record) => ({
      title: `Words to: "Leave, Bye."`,
      body: `From your Bestfriend\n${personalise(text, record.name)}`,
      by,
      // A unique tag per send, so two impromptu quotes do not replace each
      // other on the lock screen the way the daily one deliberately does.
      tag: `wtlb-impromptu-${Date.now()}`,
      url: '/',
    }));

    const sent = results.filter((r) => r.ok).length;
    return json(res, 200, {
      ok: true,
      action,
      subscribers: subscribers.length,
      sent,
      failed: results.length - sent,
      results,
    });
  }

  return json(res, 400, { error: 'action must be send, pin or clear.' });
}

async function status(res) {
  const today = dateKey();
  const tomorrow = dateKey(new Date(Date.now() + 86400000));
  const subscribers = isPersistent() ? await listSubscribers() : [];
  json(res, 200, {
    ok: true,
    today,
    tomorrow,
    storageReady: isPersistent(),
    pushReady: pushIsConfigured(),
    subscribers: subscribers.length,
    names: subscribers.map((r) => r.name).filter(Boolean),
    pinned: {
      [today]: isPersistent() ? await getPinned(today) : null,
      [tomorrow]: isPersistent() ? await getPinned(tomorrow) : null,
    },
  });
}

/** "today" | "tomorrow" | "YYYY-MM-DD" -> a Dubai date key, or null. */
function resolveDate(value) {
  const wanted = String(value || 'today').trim().toLowerCase();
  if (wanted === 'today') return dateKey();
  if (wanted === 'tomorrow') return dateKey(new Date(Date.now() + 86400000));
  return /^\d{4}-\d{2}-\d{2}$/.test(wanted) ? wanted : null;
}
