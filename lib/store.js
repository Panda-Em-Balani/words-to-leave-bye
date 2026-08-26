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

const memory = { subs: new Map(), meta: new Map() };

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
