/* -----------------------------------------------------------------------------
   Generates the VAPID key pair that identifies this app to Apple's, Google's
   and Mozilla's push servers.

     node tools/generate-vapid-keys.mjs

   Generate these ONCE. If you replace them later, every device has to
   re-subscribe, which means she has to open the app again.
   ----------------------------------------------------------------------------- */

import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`
Paste these into your Vercel project settings, under
Settings -> Environment Variables. Keep the private key private.

  VAPID_PUBLIC_KEY   ${publicKey}
  VAPID_PRIVATE_KEY  ${privateKey}
  VAPID_SUBJECT      mailto:you@example.com

For local testing, put the same three lines in a file called .env.local
(already gitignored), in KEY=value form.
`);
