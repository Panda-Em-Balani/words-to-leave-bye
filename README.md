# Words to "Leave, Bye."

A daily dose of funny, bullshit, deeply unhelpful quotes, pushed to her iPhone
at 8am Dubai time. Built as a leaving gift.

- **221 quotes** in `public/quotes.js`, written in the house style of
  *The Art of Ragebait* and signed, always, by Lao Tzu
- **8am notification** every day, Asia/Dubai, all year (the UAE has no DST)
- **Home Screen widget** showing a *different* quote from the morning's one
- Her flow: scan QR -> add to Home Screen -> allow notifications -> type her
  name -> done

---

## Read this first: what an iPhone will and will not allow

This is a **web app (PWA)**, not an App Store app. That is deliberate, and it is
what makes the flow you described possible — QR code, tap, add to Home Screen,
no App Store, no review, no invite, nothing for her to sign up for.

Two consequences, honestly stated:

| | Works | How |
|---|---|---|
| Home Screen icon | Yes | She adds it herself, two taps, guided in-app |
| 8am notification | Yes | Real Web Push, iOS 16.4+, once it is on her Home Screen |
| Home Screen **widget** | **Not from the web app** | Apple only allows widgets from native apps. Free workaround below, and the app does the fiddly parts for her |

**The one hard limitation:** iOS will not send notifications to a web app opened
in Safari. It has to be on the Home Screen first. The app detects this and walks
her through it before asking for anything else — that is why the install screen
comes first.

If you want a true native widget, see [Going native](#going-native-optional) at
the bottom. It costs $99/year and needs a Mac.

---

## What you need to set up

Three free accounts, about 30 minutes, no credit card.

| What | Why | Cost |
|---|---|---|
| [Vercel](https://vercel.com) | Hosts the app and runs the 8am job | Free |
| [Upstash Redis](https://upstash.com) | Remembers her device and her name | Free |
| GitHub | You already have it — this repo | Free |

---

## Setup, step by step

### 1. Deploy it

Push this repo to GitHub, then at [vercel.com/new](https://vercel.com/new)
import it. No build settings to change — it is static files plus serverless
functions. Vercel gives you a URL like
`https://words-to-leave-bye.vercel.app`.

### 2. Add the database

In your Vercel project: **Storage -> Create Database -> Upstash Redis**.
Accept the defaults. Vercel injects the credentials as environment variables
automatically — there is nothing to copy.

This stores one row: her push subscription and her name.

### 3. Generate the notification keys

Locally:

```bash
npm install
npm run keys
```

That prints a `VAPID_PUBLIC_KEY` and a `VAPID_PRIVATE_KEY`. These identify your
app to Apple's push servers.

> Generate these **once**. If you ever replace them, every device has to
> re-subscribe, which means asking her to open the app again.

### 4. Set the environment variables

Vercel project -> **Settings -> Environment Variables**. Add four:

| Name | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | from step 3 |
| `VAPID_PRIVATE_KEY` | from step 3 |
| `VAPID_SUBJECT` | `mailto:your@email.com` |
| `CRON_SECRET` | any long random string you invent |

Then **redeploy** so they take effect. Environment variables do not apply to an
existing deployment.

### 5. Check it

```bash
npm run check
```

Every line should read `OK`. You can also open
`https://your-app.vercel.app/api/config` — it should show `"pushReady": true`
and `"storageReady": true`.

### 6. Test it on your own phone first

Do this before she ever sees it. Open the URL on your iPhone in **Safari**, add
it to your Home Screen, open it from there, allow notifications, type a name,
then tap the **·** menu -> **Send me one right now**. If a notification lands on
your lock screen, everything works.

You can also trigger the real daily job by hand:

```bash
curl "https://your-app.vercel.app/api/cron/daily?key=YOUR_CRON_SECRET&force=1"
```

### 7. Make the QR code

Point any QR generator at your URL. Nothing else needed — the iPhone Camera app
opens QR links in Safari, which is exactly where the install flow needs to
start.

> If you send the link through Instagram or LinkedIn instead, their in-app
> browsers cannot install apps. The app detects this and tells her to open it in
> Safari, but WhatsApp or plain SMS is a smoother path.

---

## About the 8am timing

`vercel.json` schedules the job at `0 4 * * *` UTC, which is 08:00 in Dubai.

**On Vercel's free plan, daily crons fire at some point within the hour you ask
for.** So "8am" can in practice mean 08:00 or 08:47. If that is good enough,
you are done — skip the rest of this section.

If you want it to land at 8am sharp, pick one:

- **A free external scheduler** (most precise). At
  [cron-job.org](https://cron-job.org), create a job that hits
  `https://your-app.vercel.app/api/cron/daily?key=YOUR_CRON_SECRET` daily at
  04:00 UTC. Then delete the `crons` block from `vercel.json`.
- **GitHub Actions.** `.github/workflows/daily-quote.yml` is already written.
  Add `APP_URL` and `CRON_SECRET` as repository secrets and it runs itself.
  Usually within a few minutes of the hour, but also best effort.
- **Vercel Pro** ($20/month) gives minute-accurate crons.

Whichever you use, the job is safe to trigger more than once: the first send of
each day claims that day, and any repeat call returns `"skipped":
"already-sent"` instead of sending twice.

---

## Adding your own quotes

Open **`public/quotes.js`** and add lines:

```js
{ text: "Effort is a choice, {name}. Choose the other one." },
```

**The house style is The Art of Ragebait**: shape it like ancient wisdom, then
collapse it into something petty, lazy, greedy or blandly literal. Deliver it
with total confidence. The funniest ones sound like real advice right up until
the last four words.

- `{name}` is replaced with whatever she typed on the welcome screen
- Leave `by` out and it is signed *Lao Tzu, The Art of Ragebait* — that is the
  joke, and it is the default for every quote
- Add `by: "Sun Tzu, The Art of Ragebait"` only when you want a different signature
- Order does not matter — the app shuffles
- Commit, push, and Vercel redeploys itself

Run `npm run check` afterwards. It will tell you if a quote is too long for a
lock screen, duplicated, or has a typo in a placeholder.

The 221 quotes in there now are a starting point. **Replace the ones that do not
sound like you.** The app is only as funny as the quotes, and the ones that will
land hardest are the ones only the two of you understand.

---

## The Home Screen widget

Apple does not allow web apps to provide widgets, so this borrows **Scriptable**,
a free App Store app that can host them. **Yes, she has to install it** — there
is no way around that on iOS.

What the app does automate: in the app, the **·** menu → **Add the Home Screen
widget** copies the whole widget script to her clipboard *with your deployment's
address already filled in*, then opens Scriptable on a blank script. She pastes,
names it, and adds the widget.

You do not need to edit anything. The address is substituted at copy time from
wherever the app is being served.

Scriptable's URL scheme can only open a *blank* new script — it accepts no
source — so "paste" is the one step that cannot be removed. Five taps, once.

The widget shows a **different quote from the morning notification**, which is
what you asked for — two separate streams, each shuffled so all 221 are used
before any repeats.

---

## How the daily quote is chosen

Both streams deal from a shuffled deck rather than picking at random, so she
sees all 221 before she sees any of them twice — 221 days per stream. The deck
is derived from the date, so the app, the notification and the widget all agree
on the answer without needing to talk to each other. That is also why the widget
still shows the right quote with no signal.

---

## Running it locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Put your keys in `.env.local` (already gitignored) in `KEY=value` form.

Push cannot be tested locally — iOS requires HTTPS and the Home Screen. Deploy
to Vercel and test there. Everything else works fine on localhost.

---

## If something goes wrong

| Symptom | Cause |
|---|---|
| No permission prompt on her iPhone | She opened it in Safari, not from the Home Screen icon |
| "Allow" did nothing | She is on iOS 16.3 or older. Web Push needs 16.4+ |
| Nothing at 8am | Check `/api/config` shows `pushReady` and `storageReady` true; check the Vercel cron log |
| It arrived at 08:40 | Free-plan cron. See [About the 8am timing](#about-the-8am-timing) |
| Notifications stopped | If she deletes the Home Screen icon, the subscription dies. She has to add it and allow again |
| Wrong name in quotes | · menu -> change it -> Save |
| Widget stuck on an old quote | iOS decides when to refresh widgets. It catches up, usually within the hour |
| Nothing happens on "open Scriptable" | Scriptable is not installed. Step 1 of that sheet links to it |

---

## Going native (optional)

If the widget through Scriptable feels like too much to ask of her, a real
WidgetKit widget needs: a Mac with Xcode, an Apple Developer account ($99/year),
and a distribution route. TestFlight builds expire after 90 days, so a gift that
should last would mean re-uploading four times a year, or shipping it to the App
Store properly.

The PWA has no expiry, no renewal, and no store review. For this gift, it is
the better trade.

---

## Layout

```
public/
  quotes.js              <- the 221 quotes. This is the file you edit.
  daily.js               which quote belongs to which day
  app.js                 screens, onboarding, push, widget handoff
  sw.js                  service worker: receives the push, works offline
  leave-bye-widget.js    the Scriptable widget, served so the app can copy it
  icons/panda.svg        the logo. Replace it and run `npm run icons`.
api/                     serverless endpoints
  cron/daily.js          the 8am job
lib/                     storage and push delivery
tools/                   key generation, icons, local server, readiness check
```
