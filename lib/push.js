/* -----------------------------------------------------------------------------
   Web Push delivery.

   iOS only accepts Web Push for apps that have been added to the Home Screen
   (iOS 16.4+). Everything here is standard VAPID, so the same code also serves
   Android and desktop.
   ----------------------------------------------------------------------------- */

import webpush from 'web-push';
import { removeSubscriber } from './store.js';

let configured = false;

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || '';
}

export function pushIsConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure() {
  if (configured) return;
  if (!pushIsConfigured()) {
    throw new Error(
      'VAPID keys are missing. Run `npm run keys` and set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.'
    );
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
}

/**
 * Sends one notification. Subscriptions that the push service has retired
 * (404/410) are cleaned up automatically so the list never rots.
 */
export async function sendTo(record, payload) {
  configure();
  try {
    await webpush.sendNotification(record.subscription, JSON.stringify(payload), {
      TTL: 12 * 60 * 60,
      urgency: 'normal',
    });
    return { id: record.id, ok: true };
  } catch (error) {
    const status = error.statusCode || 0;
    if (status === 404 || status === 410) {
      await removeSubscriber(record.subscription.endpoint);
      return { id: record.id, ok: false, gone: true, status };
    }
    return { id: record.id, ok: false, status, error: error.message };
  }
}

export async function sendToAll(records, buildPayload) {
  const results = [];
  for (const record of records) {
    results.push(await sendTo(record, buildPayload(record)));
  }
  return results;
}
