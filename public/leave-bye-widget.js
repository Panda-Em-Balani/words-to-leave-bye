/* =============================================================================
   WORDS TO "LEAVE, BYE."  --  HOME SCREEN WIDGET
   =============================================================================

   iOS does not let a web app put a widget on the Home Screen. Only native apps
   can do that. Scriptable is a free app that hosts widgets and can run this.

   THE EASY WAY
   ------------
   Open Leave, Bye. from your Home Screen, tap the menu, and choose
   "Add the widget". It copies this script for you with everything already
   filled in, and opens Scriptable. Then just paste.

   THE MANUAL WAY
   --------------
   1. Install "Scriptable" from the App Store. It is free.
   2. Open Scriptable, tap + in the top right.
   3. Paste this entire file in. Tap Done. Rename it "Leave, Bye".
   4. Set BASE_URL below to the app's address.
   5. Long-press the Home Screen, tap +, find Scriptable, add a MEDIUM widget.
   6. Long-press the new widget, tap "Edit Widget", then:
        Script     -> Leave, Bye
        Parameter  -> your name, spelled the way you typed it in the app

   The widget quote is deliberately NOT the same as the 8am notification quote,
   so you get two different ones a day.
   ============================================================================= */

// The app rewrites this line for you when it copies the script.
const BASE_URL = 'https://REPLACE-ME.vercel.app';

const INK = new Color('#222121');
const MARKER = new Color('#073b62');
const ASH = new Color('#605553');
const PAPER = new Color('#ffffff');

const CACHE_FILE = 'leave-bye-cache.json';

/* --- data ------------------------------------------------------------------ */

function name() {
  const fromWidget = (args.widgetParameter || '').trim();
  if (fromWidget) {
    Keychain.set('leave-bye-name', fromWidget);
    return fromWidget;
  }
  if (Keychain.contains('leave-bye-name')) return Keychain.get('leave-bye-name');
  return '';
}

function cachePath() {
  const fm = FileManager.local();
  return fm.joinPath(fm.cacheDirectory(), CACHE_FILE);
}

function readCache() {
  try {
    const fm = FileManager.local();
    const path = cachePath();
    if (!fm.fileExists(path)) return null;
    return JSON.parse(fm.readString(path));
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    FileManager.local().writeString(cachePath(), JSON.stringify(data));
  } catch {
    /* a failed cache write is not worth breaking the widget over */
  }
}

async function fetchQuote(who) {
  const url = `${BASE_URL}/api/today?stream=widget&name=${encodeURIComponent(who)}`;
  const request = new Request(url);
  request.timeoutInterval = 12;
  const data = await request.loadJSON();
  if (!data || !data.text) throw new Error('empty response');
  writeCache(data);
  return data;
}

/** Network first, yesterday's cache second, a joke about it third. */
async function getQuote(who) {
  try {
    return await fetchQuote(who);
  } catch {
    const cached = readCache();
    if (cached) return { ...cached, stale: true };
    return {
      text: 'No signal, no wisdom. Consider this your sign to look out of a window.',
      by: 'Lao Tzu, The Art of Ragebait',
      offline: true,
    };
  }
}

/** The panda, if it loads. The widget is fine without it. */
async function logo() {
  try {
    const request = new Request(`${BASE_URL}/icons/icon-192.png`);
    request.timeoutInterval = 6;
    return await request.loadImage();
  } catch {
    return null;
  }
}

/* --- drawing --------------------------------------------------------------- */

function sizeFor(text) {
  const family = config.widgetFamily || 'medium';
  if (family === 'small') return text.length > 90 ? 11 : text.length > 55 ? 13 : 15;
  if (family === 'large') return text.length > 150 ? 20 : text.length > 90 ? 23 : 27;
  return text.length > 130 ? 14 : text.length > 80 ? 16 : 19;
}

function build(quote, who, mark) {
  const family = config.widgetFamily || 'medium';
  const small = family === 'small';

  const widget = new ListWidget();
  widget.backgroundColor = INK;

  const gradient = new LinearGradient();
  gradient.colors = [new Color('#2a2626'), INK];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
  widget.setPadding(small ? 12 : 16, small ? 12 : 16, small ? 12 : 16, small ? 12 : 16);
  widget.url = BASE_URL;

  if (!small) {
    const header = widget.addStack();
    header.centerAlignContent();

    if (mark) {
      const image = header.addImage(mark);
      image.imageSize = new Size(18, 18);
      image.cornerRadius = 5;
      header.addSpacer(8);
    }

    const label = header.addText(who ? `Morning, ${who}` : 'Words to Leave, Bye.');
    label.font = Font.mediumSystemFont(11);
    label.textColor = new Color('#ffffff', 0.45);
    header.addSpacer();
    widget.addSpacer(10);
  }

  // The quote sits inside a marker swipe, the way it does in the app.
  const swipe = widget.addStack();
  swipe.backgroundColor = MARKER;
  swipe.cornerRadius = 10;
  swipe.setPadding(small ? 8 : 11, small ? 9 : 13, small ? 9 : 12, small ? 9 : 13);

  const body = swipe.addText(quote.text);
  body.font = Font.semiboldRoundedSystemFont(sizeFor(quote.text));
  body.textColor = PAPER;
  body.minimumScaleFactor = 0.6;
  body.leftAlignText();

  widget.addSpacer();

  const footer = widget.addStack();
  footer.centerAlignContent();
  const caption = footer.addText(
    quote.offline
      ? 'Offline'
      : quote.stale
        ? 'Yesterday, still true'
        : `— ${quote.by || 'Lao Tzu, The Art of Ragebait'}`
  );
  caption.font = Font.italicSystemFont(small ? 9 : 10);
  caption.textColor = ASH;
  caption.lineLimit = 1;
  footer.addSpacer();

  // Nudge iOS to come back for a new quote after the Dubai midnight rollover.
  widget.refreshAfterDate = new Date(Date.now() + 60 * 60 * 1000);
  return widget;
}

/* --- run ------------------------------------------------------------------- */

const who = name();
const quote = await getQuote(who);
const mark = await logo();
const widget = build(quote, who, mark);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else if (config.widgetFamily === 'small') {
  await widget.presentSmall();
} else if (config.widgetFamily === 'large') {
  await widget.presentLarge();
} else {
  await widget.presentMedium();
}

Script.complete();
