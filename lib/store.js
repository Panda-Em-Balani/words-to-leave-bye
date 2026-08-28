/* -----------------------------------------------------------------------------
   Where we remember who to send quotes to.

   Backed by Upstash Redis over plain HTTPS (works from any serverless runtime,
   no connection pooling to worry about). If no Redis credentials are present we
   fall back to an in-memory store so that `npm run dev` works locally -- that
   fallback forgets everything on restart and must never be used in production.
   ----------------------------------------------------------------------------- */

/* Vercel's Upstash integration does not always use the same variable names --
   it has shipped them bare, prefixed (STORAGE_*), and under the older Vercel KV
   names. So we look for the names we know first, then fall back to finding any
   REST url/token pair, which survives whatever prefix the integration picks. */
const URL_ENV = ['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL', 'REDIS_REST_URL'];
const TOKEN_ENV = ['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN', 'REDIS_REST_TOKEN'];

const SUBS_KEY = 'wtlb:subscribers';
const SENT_KEY = 'wtlb:last-sent';
const OPENING_KEY = 'wtlb:opening-sent';
const USED_KEY = 'wtlb:used';
const TEST_KEY = 'wtlb:test-count';
const PIN_KEY = (dateKey) => `wtlb:pin:${dateKey}`;

/* A pinned quote is only interesting on the day it is for. Ten days is long
   enough to pin something a week ahead and still have it tidy itself away. */
const PIN_TTL_SECONDS = 10 * 24 * 60 * 60;

const named = (names) => names.find((n) => process.env[n]);

function discover() {
  const keys = Object.keys(process.env);
  const urlKey =
    named(URL_ENV) ||
    keys.find((k) => /REST_API_URL$|REDIS_REST_URL$/.test(k) && /^https:\/\//.test(process.env[k] || ''));
  const tokenKey =
    named(TOKEN_ENV) || keys.find((k) => /REST_API_TOKEN$|REDIS_REST_TOKEN$/.test(k) && process.env[k]);
  if (!urlKey || !tokenKey) return null;
  return { url: process.env[urlKey], token: process.env[tokenKey], urlKey, tokenKey };
}

export const isPersistent = () => Boolean(discover());

/**
 * What the deployment can see, for troubleshooting a `storageReady: false`.
 * Reports variable NAMES only -- never a value, since these are credentials.
 */
export function storageDiagnostics() {
  const found = discover();
  const candidates = Object.keys(process.env)
    .filter((k) => /UPSTASH|REDIS|^KV_|_KV_/i.test(k))
    .sort();
  // Once storage works there is no reason to keep listing the deployment's
  // variable names on a public endpoint, so the detail only appears while
  // something is actually broken.
  if (found) {
    return { ready: true, usingUrlVar: found.urlKey, usingTokenVar: found.tokenKey };
  }

  return {
    ready: false,
    usingUrlVar: null,
    usingTokenVar: null,
    storageVarsVisible: candidates,
    hint: found
      ? null
      : candidates.length === 0
        ? 'No storage variables are visible at all. Connect Upstash, then REDEPLOY -- variables only reach a new deployment.'
        : 'Storage variables exist but no REST url/token pair was recognised. Send this list back and the matcher can be widened.',
  };
}

const memory = { subs: new Map(), meta: new Map(), used: new Set() };

async function redis(command) {
  const { url, token } = discover();
  const res = await fetch(url.replace(/\/+$/, ''), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    throw new Error(`Redis ${command[0]} failed: ${res.status} ${await res.text()}`);
  }
  const { result, error } = await res.json();
  if (error) throw new Error(`Redis ${command[0]} error: ${error}`);
  return result;
}

/** Stable, non-reversible id for a push endpoint, used as the record key. */
export function subscriberId(endpoint) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < endpoint.length; i++) {
    const ch = endpoint.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0'));
}

export async function saveSubscriber(record) {
  const id = subscriberId(record.subscription.endpoint);
  const value = JSON.stringify({ ...record, id, updatedAt: new Date().toISOString() });
  if (isPersistent()) await redis(['HSET', SUBS_KEY, id, value]);
  else memory.subs.set(id, value);
  return id;
}

export async function removeSubscriber(endpointOrId) {
  const id = endpointOrId.startsWith('http') ? subscriberId(endpointOrId) : endpointOrId;
  if (isPersistent()) await redis(['HDEL', SUBS_KEY, id]);
  else memory.subs.delete(id);
  return id;
}

export async function listSubscribers() {
  let values;
  if (isPersistent()) {
    const flat = (await redis(['HGETALL', SUBS_KEY])) || [];
    // Upstash returns [field, value, field, value, ...]
    values = Array.isArray(flat) ? flat.filter((_, i) => i % 2 === 1) : Object.values(flat);
  } else {
    values = [...memory.subs.values()];
  }
  return values
    .map((v) => {
      try {
        return JSON.parse(v);
      } catch {
        return null;
      }
    })
    .filter((r) => r && r.subscription && r.subscription.endpoint);
}

export async function getSubscriber(endpoint) {
  const id = subscriberId(endpoint);
  const all = await listSubscribers();
  return all.find((r) => r.id === id) || null;
}

/** Marks a date as delivered. Returns false if it had already been marked. */
export async function claimSendSlot(key) {
  if (isPersistent()) {
    const previous = await redis(['GETSET', SENT_KEY, key]);
    return previous !== key;
  }
  const previous = memory.meta.get(SENT_KEY);
  memory.meta.set(SENT_KEY, key);
  return previous !== key;
}

export async function lastSent() {
  if (isPersistent()) return (await redis(['GET', SENT_KEY])) || null;
  return memory.meta.get(SENT_KEY) || null;
}

/* -----------------------------------------------------------------------------
   Pinned quotes

   A quote written by hand for one particular day. When a date has one it wins
   over the shuffled deck everywhere: the app, the widget and the 8am push.
   Text is stored exactly as written, {name} included, so it is still
   personalised per subscriber when it goes out.
   ----------------------------------------------------------------------------- */

export async function pinQuote(key, quote) {
  const value = JSON.stringify({ ...quote, date: key, pinnedAt: new Date().toISOString() });
  if (isPersistent()) await redis(['SET', PIN_KEY(key), value, 'EX', PIN_TTL_SECONDS]);
  else memory.meta.set(PIN_KEY(key), value);
  return JSON.parse(value);
}

export async function getPinned(key) {
  const value = isPersistent()
    ? await redis(['GET', PIN_KEY(key)])
    : memory.meta.get(PIN_KEY(key));
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function clearPinned(key) {
  if (isPersistent()) await redis(['DEL', PIN_KEY(key)]);
  else memory.meta.delete(PIN_KEY(key));
}

/* -----------------------------------------------------------------------------
   The ledger of quotes already sent.

   The deck alone cannot keep its promise. It is a pure function of the date,
   so anything that puts a quote on her phone outside the schedule -- a pinned
   day, a test push, an edit to the book that reshuffles the order -- can spend
   a quote the schedule still owes her, and she gets it twice.

   So the morning push records what it actually sent, keyed on the quote's own
   text, and skips anything in here. Only the 8am stream needs this: it runs on
   the server, where there is somewhere to remember. The app and widget stay
   pure functions because they have to work with no signal.
   ----------------------------------------------------------------------------- */

/** Fingerprints of every quote already pushed this lap of the book. */
export async function usedQuotes() {
  if (isPersistent()) return new Set((await redis(['SMEMBERS', USED_KEY])) || []);
  return new Set(memory.used);
}

export async function markQuoteUsed(fingerprint) {
  if (isPersistent()) await redis(['SADD', USED_KEY, fingerprint]);
  else memory.used.add(fingerprint);
}

/** Wipes the ledger, which starts the book over. */
export async function resetUsedQuotes() {
  if (isPersistent()) await redis(['DEL', USED_KEY]);
  else memory.used.clear();
}

/**
 * A counter that goes up by one on every test push.
 *
 * It steps the test button one place through its deck, so two taps are always
 * two different quotes. Stepping by the clock instead looked simpler and was
 * wrong: two taps land in the same second and show the same thing, which is
 * exactly the moment someone is checking whether the button works.
 */
export async function nextTestTicket() {
  if (isPersistent()) return Number(await redis(['INCR', TEST_KEY])) || 0;
  const n = (Number(memory.meta.get(TEST_KEY)) || 0) + 1;
  memory.meta.set(TEST_KEY, n);
  return n;
}

/**
 * True exactly once, ever: the first time the opening line is actually about
 * to go out. Kept separate from the last-sent date so a pinned first morning,
 * or a first run with nobody subscribed yet, does not quietly burn it.
 */
export async function claimOpening() {
  if (isPersistent()) {
    const previous = await redis(['GETSET', OPENING_KEY, '1']);
    return previous !== '1';
  }
  const previous = memory.meta.get(OPENING_KEY);
  memory.meta.set(OPENING_KEY, '1');
  return previous !== '1';
}
