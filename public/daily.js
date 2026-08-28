/* -----------------------------------------------------------------------------
   Daily quote selection.

   Shared by the web app, the 8am push job and the home screen widget so that
   everyone agrees on what "today" means and which quote belongs to it.

   Two independent streams run side by side:
     "notification" -> the quote that gets pushed at 8am Dubai time
     "widget"       -> the quote shown in the app and on the home screen widget

   They are seeded differently, so the widget never spoils the notification and
   she gets two different quotes a day.

   Quotes are drawn as a shuffled deck: every quote is used exactly once before
   any of them repeats, so the gap between two showings of the same quote is
   exactly as long as the book.

   The deck is shuffled once per stream and then walked forever. It used to be
   reseeded every time it ran out, which looked tidier but broke the promise at
   the seam: a quote at the end of one deck could land at the start of the next
   and come round again the following morning.
   ----------------------------------------------------------------------------- */

import { DEFAULT_BY } from './quotes.js';

export const TIME_ZONE = 'Asia/Dubai';
export const SEND_HOUR = 8; // 08:00 Dubai time
export const DEFAULT_NAME = 'friend';

/** "YYYY-MM-DD" for the given instant, as seen in Dubai. */
export function dateKey(date = new Date(), timeZone = TIME_ZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Whole days between 1970-01-01 and a "YYYY-MM-DD" key. */
export function dayNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A deterministic shuffle of [0..n-1] for a given deck seed. */
function deck(n, seed) {
  const order = Array.from({ length: n }, (_, i) => i);
  const rand = mulberry32(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Step `counter` places into this stream's deck. One deck per stream, fixed
 * for good, so consecutive counters always give different quotes and the same
 * quote comes back only after a full lap of the book.
 */
export function rotate(total, counter, stream = 'notification') {
  if (total <= 0) return 0;
  const position = ((counter % total) + total) % total;
  return deck(total, hash32(stream))[position];
}

/** Which quote index belongs to this date on this stream. */
export function indexForDate(total, key, stream = 'notification') {
  return rotate(total, dayNumber(key), stream);
}

/**
 * A stable id for a quote, taken from its own text.
 *
 * The ledger of what has already been sent is keyed on these rather than on
 * array positions: positions move whenever the book is edited, and a quote
 * that shifted position would look unsent and go out twice.
 */
export function fingerprint(text) {
  return hash32(String(text)).toString(36);
}

/**
 * The next quote this stream owes, skipping any the ledger says have gone out.
 *
 * On an ordinary morning the deck's own pick is unused and comes straight
 * back. Walking forward only happens when something else already spent that
 * quote -- a hand-pinned day, or an edit to the book that moved the deck under
 * us. Returns null when every quote has been used, which is the caller's cue
 * to wipe the ledger and start the book again.
 */
export function nextUnused(quotes, { key = dateKey(), stream = 'notification', used } = {}) {
  const total = quotes.length;
  if (!total) return null;
  const start = dayNumber(key);
  for (let step = 0; step < total; step++) {
    const quote = quotes[rotate(total, start + step, stream)];
    if (!used || !used.has(fingerprint(quote.text))) return quote;
  }
  return null;
}

/** Swap {name} for her name. Handles missing/blank names gracefully. */
export function personalise(text, name) {
  const who = (name || '').trim() || DEFAULT_NAME;
  return String(text).replace(/\{name\}/gi, who);
}

/** The full quote for a date: text already personalised. */
export function quoteForDate(quotes, { key = dateKey(), stream = 'notification', name } = {}) {
  const index = indexForDate(quotes.length, key, stream);
  const quote = quotes[index] || { text: '' };
  return {
    date: key,
    stream,
    index,
    text: personalise(quote.text, name),
    by: quote.by || DEFAULT_BY,
  };
}

/** Milliseconds until the next 08:00 Dubai, used for the in-app countdown. */
export function msUntilNextSend(now = new Date(), timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const secondsNow = (get('hour') % 24) * 3600 + get('minute') * 60 + get('second');
  const target = SEND_HOUR * 3600;
  const delta = target > secondsNow ? target - secondsNow : 86400 - secondsNow + target;
  return delta * 1000;
}
