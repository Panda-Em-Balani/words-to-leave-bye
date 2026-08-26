/* Small helpers shared by the API routes. Files prefixed with _ are not routes. */

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

/** Vercel parses JSON bodies for us; this covers every other runtime too. */
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

export function query(req) {
  if (req.query) return req.query;
  const url = new URL(req.url, 'http://localhost');
  return Object.fromEntries(url.searchParams);
}

const FORBIDDEN_IN_NAME = new Set(['<', '>', '&', '"', "'", '\\', '`']);

/**
 * Names end up in notifications and on screen, so drop control characters and
 * anything that could be mistaken for markup. Emoji and accents survive.
 */
export function cleanName(value) {
  let out = '';
  for (const ch of String(value || '')) {
    const code = ch.codePointAt(0);
    if (code < 32 || code === 127) continue;
    if (FORBIDDEN_IN_NAME.has(ch)) continue;
    out += ch;
  }
  return out.trim().slice(0, 40);
}

/** Guards the cron route. Accepts Vercel's own cron auth or a shared secret. */
export function authorizeCron(req) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.authorization || '';
  if (secret && header === `Bearer ${secret}`) return true;
  if (secret && query(req).key === secret) return true;
  // Vercel signs its own scheduled invocations; when no secret is configured we
  // trust the platform header, and anything goes while developing locally.
  if (!secret && req.headers['x-vercel-signature']) return true;
  if (!secret && process.env.VERCEL !== '1') return true;
  return false;
}
