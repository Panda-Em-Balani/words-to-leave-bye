import { timingSafeEqual } from 'node:crypto';

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

/**
 * Quote text is rendered with textContent everywhere and goes out as a plain
 * notification body, so punctuation is safe to keep. Only control characters
 * need removing, plus a ceiling so nothing absurd reaches a lock screen.
 */
export function cleanQuote(value) {
  let out = '';
  for (const ch of String(value || '')) {
    const code = ch.codePointAt(0);
    // Line breaks become spaces rather than vanishing mid-sentence; every
    // other control character is dropped.
    if (code < 32 || code === 127) {
      if (code === 9 || code === 10 || code === 13) out += ' ';
      continue;
    }
    out += ch;
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, 280);
}

function sameSecret(a, b) {
  const left = Buffer.from(String(a), 'utf8');
  const right = Buffer.from(String(b), 'utf8');
  // timingSafeEqual throws when the lengths differ, so compare them here and
  // let the constant-time check handle equal-length values.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Guards the owner-only routes. Fails closed: with no ADMIN_KEY set, a
 * deployed app refuses every request rather than leaving the console open to
 * anyone who guesses the URL. Local `npm run dev` stays unlocked.
 */
export function authorizeAdmin(req) {
  const secret = process.env.ADMIN_KEY;
  if (!secret) return process.env.VERCEL !== '1';

  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const supplied = bearer || req.headers['x-admin-key'] || '';
  return Boolean(supplied) && sameSecret(supplied, secret);
}
