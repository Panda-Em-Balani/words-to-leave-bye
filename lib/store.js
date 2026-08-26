/* -----------------------------------------------------------------------------
   Where we remember who to send quotes to.

   Backed by Upstash Redis over plain HTTPS (works from any serverless runtime,
   no connection pooling to worry about). If no Redis credentials are present we
   fall back to an in-memory store so that `npm run dev` works locally -- that
   fallback forgets everything on restart and must never be used in production.
   ----------------------------------------------------------------------------- */

const URL_ENV = ['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL', 'REDIS_REST_URL'];
const TOKEN_ENV = ['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN', 'REDIS_REST_TOKEN'];

const pick = (names) => names.map((n) => process.env[n]).find(Boolean);

const SUBS_KEY = 'wtlb:subscribers';
const SENT_KEY = 'wtlb:last-sent';

export const isPersistent = () => Boolean(pick(URL_ENV) && pick(TOKEN_ENV));

const memory = { subs: new Map(), meta: new Map() };

async function redis(command) {
  const url = pick(URL_ENV);
  const token = pick(TOKEN_ENV);
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
