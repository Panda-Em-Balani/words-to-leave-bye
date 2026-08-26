/* =============================================================================
   Words to "Leave, Bye." - app shell

   Screen order, exactly as designed:
     install -> permission -> name -> home

   On iPhone, Web Push only exists once the app has been added to the Home
   Screen (iOS 16.4+). So Safari gets the install screen, and the Home Screen
   version gets everything else.
   ============================================================================= */

import { QUOTES, DEFAULT_BY } from '/quotes.js';
import { quoteForDate, dateKey, personalise, TIME_ZONE } from '/daily.js';

const STORE = {
  name: 'wtlb.name',
  onboarded: 'wtlb.onboarded',
  permissionAsked: 'wtlb.permissionAsked',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const state = {
  name: localStorage.getItem(STORE.name) || '',
  config: null,
  registration: null,
  subscription: null,
  pinned: null,
  showingDaily: true,
};

/* -----------------------------------------------------------------------------
   Environment
   ----------------------------------------------------------------------------- */

const ua = navigator.userAgent || '';

const env = {
  isIOS:
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  isStandalone:
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches,
  isInAppBrowser: /FBAN|FBAV|Instagram|LinkedInApp|Line\/|Twitter|Snapchat/i.test(ua),
  supportsPush: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
};

/** iOS refuses to expose Push outside the Home Screen app. */
env.pushAvailableHere = env.supportsPush && (!env.isIOS || env.isStandalone);

/* -----------------------------------------------------------------------------
   Small helpers
   ----------------------------------------------------------------------------- */

function show(screen) {
  $$('.screen').forEach((el) => {
    el.hidden = el.dataset.screen !== screen;
  });
  window.scrollTo(0, 0);
}

let toastTimer;
function toast(message, kind = 'info') {
  const el = $('#toast');
  el.textContent = message;
  el.classList.toggle('is-error', kind === 'error');
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 4200);
}

function openSheet(id) {
  $(id).hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeSheets() {
  $$('.sheet').forEach((el) => (el.hidden = true));
  document.body.style.overflow = '';
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

/* -----------------------------------------------------------------------------
   Quotes on screen
   ----------------------------------------------------------------------------- */

/** Renders text inside the highlighter, and replays the swipe animation. */
function paintQuote(text, by) {
  const target = $('#quote-text');
  const span = document.createElement('span');
  span.className = 'hl';
  span.textContent = text;
  target.replaceChildren(span);
  target.classList.toggle('is-long', text.length > 92);

  // Restart the animation on every repaint.
  span.classList.remove('hl-animate');
  void span.offsetWidth;
  span.classList.add('hl-animate');

  const caption = $('#quote-by');
  if (by) {
    caption.textContent = `\u2014 ${by}`;
    caption.hidden = false;
  } else {
    caption.hidden = true;
  }
}

function todaysQuote() {
  // A quote pinned for today, written by hand, beats the deck. The deck is
  // still what shows first and what shows offline.
  const pinned = state.pinned;
  if (pinned && pinned.date === dateKey()) {
    return { text: personalise(pinned.text, state.name), by: pinned.by };
  }
  return quoteForDate(QUOTES, { stream: 'widget', name: state.name });
}

/**
 * Asks the server whether today has a pinned quote. Never blocks the first
 * paint and never breaks anything when offline: the deck quote is already on
 * screen, and this only repaints if there is something different to show.
 */
async function refreshPinned() {
  try {
    const today = await api(
      `/api/today?stream=widget&name=${encodeURIComponent(state.name || '')}`
    );
    if (!today || today.date !== dateKey()) return;
    state.pinned = today.pinned ? { date: today.date, text: today.text, by: today.by } : null;
    // Leave a quote she pulled up with the button alone.
    if (state.showingDaily) renderHome();
  } catch {
    /* offline, or the API is not up. The deck quote stands. */
  }
}

function renderHome() {
  const quote = todaysQuote();
  state.showingDaily = true;
  paintQuote(quote.text, quote.by);

  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hour12: false })
      .format(new Date())
  );
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  $('#greeting').textContent = state.name ? `${part}, ${state.name}` : part;

  $('#date-line').textContent = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

/* -----------------------------------------------------------------------------
   Push
   ----------------------------------------------------------------------------- */

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    state.registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return state.registration;
  } catch (error) {
    console.warn('Service worker registration failed', error);
    return null;
  }
}

async function loadConfig() {
  try {
    state.config = await api('/api/config');
  } catch {
    state.config = null;
  }
  return state.config;
}

/** Asks for permission, subscribes, and tells the server. */
async function enablePush() {
  if (!env.pushAvailableHere) {
    throw new Error(
      env.isIOS
        ? 'Open me from the Home Screen icon first. Safari cannot send notifications.'
        : 'This browser does not support notifications.'
    );
  }

  const permission = await Notification.requestPermission();
  localStorage.setItem(STORE.permissionAsked, '1');
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked. Turn them back on in Settings, then come back.'
        : 'No answer given, so nothing changed.'
    );
  }

  const registration = state.registration || (await registerServiceWorker());
  if (!registration) throw new Error('Could not start the background worker.');
  await navigator.serviceWorker.ready;

  const config = state.config || (await loadConfig());
  if (!config || !config.vapidPublicKey) {
    throw new Error('The server is not set up for notifications yet.');
  }

  const existing = await registration.pushManager.getSubscription();
  state.subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
    }));

  await syncSubscription();
  return state.subscription;
}

/** Pushes the current subscription plus name up to the server. */
async function syncSubscription() {
  if (!state.subscription) return;
  await api('/api/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      subscription: state.subscription.toJSON(),
      name: state.name,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
}

/* -----------------------------------------------------------------------------
   Routing
   ----------------------------------------------------------------------------- */

function route() {
  const onboarded = localStorage.getItem(STORE.onboarded) === '1';

  // In Safari on iPhone there is nothing useful we can do yet: get her to
  // install it first.
  if (env.isIOS && !env.isStandalone) return show('install');

  if (onboarded && state.name) {
    renderHome();
    return show('home');
  }

  const asked = localStorage.getItem(STORE.permissionAsked) === '1';
  const settled = env.supportsPush && Notification.permission !== 'default';
  if (!asked && !settled) return show('permission');

  return show('name');
}

/* -----------------------------------------------------------------------------
   Wiring
   ----------------------------------------------------------------------------- */

let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
  // Android and desktop Chrome can install for real; iOS cannot.
  event.preventDefault();
  deferredInstallPrompt = event;
});

function wireInstallScreen() {
  if (env.isInAppBrowser) {
    $('#install-hint').textContent =
      'Open this in Safari first. This browser cannot put me on your Home Screen.';
    $('#install-hint').classList.add('is-warning');
  }

  $('#install-cta').addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      if (outcome === 'accepted') toast('Done. Open me from your Home Screen now.');
      return;
    }
    if (!env.isIOS) {
      $('#sheet-note').textContent =
        'On Android open the browser menu, then Install app or Add to Home screen.';
    }
    openSheet('#install-sheet');
  });
}

function wirePermissionScreen() {
  $('#allow-cta').addEventListener('click', async () => {
    const hint = $('#permission-hint');
    hint.className = 'hint';
    hint.textContent = 'Asking...';
    try {
      await enablePush();
      hint.textContent = 'Done. That was the hard part.';
      hint.classList.add('is-good');
      setTimeout(() => show('name'), 650);
    } catch (error) {
      hint.textContent = error.message;
      hint.classList.add('is-warning');
      // She can still use the app, so let her move on either way.
      setTimeout(() => show('name'), 2600);
    }
  });

  $('#skip-permission').addEventListener('click', () => {
    localStorage.setItem(STORE.permissionAsked, '1');
    show('name');
  });
}

function wireNameScreen() {
  const input = $('#name-input');
  const cta = $('#name-cta');

  input.value = state.name;
  cta.disabled = !input.value.trim();

  input.addEventListener('input', () => {
    cta.disabled = !input.value.trim();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && input.value.trim()) cta.click();
  });

  cta.addEventListener('click', async () => {
    const name = input.value.trim().slice(0, 40);
    if (!name) return;
    state.name = name;
    localStorage.setItem(STORE.name, name);
    localStorage.setItem(STORE.onboarded, '1');
    syncSubscription().catch(() => {});
    renderHome();
    show('home');
  });
}

function wireHomeScreen() {
  $('#another-cta').addEventListener('click', () => {
    const today = todaysQuote();
    let pick;
    do {
      pick = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    } while (QUOTES.length > 1 && personalise(pick.text, state.name) === today.text);
    state.showingDaily = false;
    paintQuote(personalise(pick.text, state.name), pick.by || DEFAULT_BY);
  });

  $('#settings-cta').addEventListener('click', async () => {
    $('#settings-name').value = state.name;
    await refreshSettingsStatus();
    openSheet('#settings-sheet');
  });
}

async function refreshSettingsStatus() {
  const note = $('#status-note');
  const granted = env.supportsPush && Notification.permission === 'granted';

  $('#enable-push').hidden = granted || !env.pushAvailableHere;
  $('#test-push').hidden = !granted;

  if (!env.pushAvailableHere && env.isIOS) {
    note.textContent = 'Open me from the Home Screen and this will work.';
    return;
  }
  if (!granted) {
    note.textContent =
      env.supportsPush && Notification.permission === 'denied'
        ? 'You blocked them. Go to iPhone Settings > Notifications > Daily Motto and turn them back on.'
        : 'Notifications are off.';
    return;
  }
  note.textContent = "You're on the list.";
}

function wireSettingsSheet() {
  $('#save-name').addEventListener('click', async () => {
    const name = $('#settings-name').value.trim().slice(0, 40);
    if (!name) return toast('It has to be something.', 'error');
    state.name = name;
    localStorage.setItem(STORE.name, name);
    renderHome();
    try {
      await syncSubscription();
    } catch {
      /* the local name still works; the server catches up next time */
    }
    toast('Saved.');
    closeSheets();
  });

  $('#enable-push').addEventListener('click', async () => {
    const hint = $('#settings-hint');
    hint.className = 'hint';
    hint.textContent = 'Asking...';
    try {
      await enablePush();
      hint.textContent = 'Notifications are on.';
      hint.classList.add('is-good');
      await refreshSettingsStatus();
    } catch (error) {
      hint.textContent = error.message;
      hint.classList.add('is-warning');
    }
  });

  $('#test-push').addEventListener('click', async () => {
    const hint = $('#settings-hint');
    hint.className = 'hint';
    hint.textContent = 'Sending...';
    try {
      const registration = state.registration || (await navigator.serviceWorker.getRegistration());
      const subscription = registration && (await registration.pushManager.getSubscription());
      if (!subscription) throw new Error('Not subscribed on this device yet.');
      await api('/api/test-push', {
        method: 'POST',
        body: JSON.stringify({ endpoint: subscription.endpoint, name: state.name }),
      });
      hint.textContent = 'Sent. Go look at your lock screen.';
      hint.classList.add('is-good');
    } catch (error) {
      hint.textContent = error.message;
      hint.classList.add('is-warning');
    }
  });
}

/* -----------------------------------------------------------------------------
   The widget

   iOS will not let a web app supply a Home Screen widget, and Scriptable's URL
   scheme can only open a blank new script -- it cannot be handed source. So the
   best available is: put the script on her clipboard with this deployment's
   address already substituted in, open Scriptable, and let her paste.
   ----------------------------------------------------------------------------- */

const SCRIPTABLE_PLACEHOLDER = 'https://REPLACE-ME.vercel.app';
let widgetScript = null;

/** Fetched up front, so the copy itself stays inside the tap that asked for it.
    Safari only allows clipboard writes from a user gesture. */
async function loadWidgetScript() {
  if (widgetScript) return widgetScript;
  const res = await fetch('/leave-bye-widget.js');
  if (!res.ok) throw new Error('Could not load the widget script.');
  const source = await res.text();
  widgetScript = source.replaceAll(SCRIPTABLE_PLACEHOLDER, window.location.origin);
  return widgetScript;
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Older iOS in a web app context: fall back to a hidden selection.
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(field);
  field.select();
  field.setSelectionRange(0, text.length);
  const ok = document.execCommand('copy');
  field.remove();
  if (!ok) throw new Error('Copying is blocked here. Open the app from your Home Screen icon.');
}

function wireWidgetSheet() {
  $('#widget-cta').addEventListener('click', async () => {
    $('#widget-param-name').textContent = state.name || 'your name';
    $('#widget-hint').className = 'hint';
    $('#widget-hint').textContent = '';
    openSheet('#widget-sheet');
    // Warm the cache so the copy button is instant and stays inside its gesture.
    loadWidgetScript().catch(() => {});
  });

  $('#copy-widget').addEventListener('click', async () => {
    const hint = $('#widget-hint');
    hint.className = 'hint';
    try {
      const script = await loadWidgetScript();
      await copyToClipboard(script);
      hint.textContent = 'Copied. Opening Scriptable now. Press and hold, then paste.';
      hint.classList.add('is-good');
      // Opens Scriptable on a fresh empty script. If it is not installed
      // nothing happens, which is why step 1 exists.
      setTimeout(() => {
        window.location.href = 'scriptable:///add';
      }, 700);
    } catch (error) {
      hint.textContent = error.message;
      hint.classList.add('is-warning');
    }
  });
}

function wireSheets() {
  $$('[data-close-sheet]').forEach((el) => el.addEventListener('click', closeSheets));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSheets();
  });
}

/* -----------------------------------------------------------------------------
   Boot
   ----------------------------------------------------------------------------- */

async function boot() {
  wireInstallScreen();
  wirePermissionScreen();
  wireNameScreen();
  wireHomeScreen();
  wireSettingsSheet();
  wireWidgetSheet();
  wireSheets();

  route();

  registerServiceWorker();
  loadConfig();
  refreshPinned();

  // Coming back to the app on a new day should show the new quote.
  let shownFor = dateKey();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (dateKey() !== shownFor) {
      shownFor = dateKey();
      state.pinned = null;
      renderHome();
    }
    refreshPinned();
  });
}

boot();
