/* =============================================================================
   Words to "Leave, Bye." - app shell

   Screen order, exactly as designed:
     install -> permission -> name -> home

   On iPhone, Web Push only exists once the app has been added to the Home
   Screen (iOS 16.4+). So Safari gets the install screen, and the Home Screen
   version gets everything else.
   ============================================================================= */

import { QUOTES } from '/quotes.js';
import { quoteForDate, dateKey, personalise, msUntilNextSend, TIME_ZONE, SEND_HOUR } from '/daily.js';

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
    caption.textContent = `- ${by}`;
    caption.hidden = false;
  } else {
    caption.hidden = true;
  }
}

function todaysQuote() {
  return quoteForDate(QUOTES, { stream: 'widget', name: state.name });
}

function renderHome() {
  const quote = todaysQuote();
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

  $('#home-footnote').textContent =
    `${QUOTES.length} quotes in the book. A different one arrives at ${SEND_HOUR}am Dubai time. ` +
    `This one changes at midnight, and is never the same as the morning's.`;

  updateCountdown();
}

function updateCountdown() {
  const ms = msUntilNextSend();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const when = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} minutes`;
  const granted = env.supportsPush && Notification.permission === 'granted';
  $('#next-hint').textContent = granted
    ? `Next notification in ${when}.`
    : `Notifications are off, so nothing will arrive in ${when}.`;
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

async function disablePush() {
  const registration = state.registration || (await navigator.serviceWorker.getRegistration());
  const subscription = registration && (await registration.pushManager.getSubscription());
  if (!subscription) return;
  await api('/api/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => {});
  await subscription.unsubscribe();
  state.subscription = null;
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
  $('#install-hint').textContent = 'One tap. Your browser will do the rest.';
});

function wireInstallScreen() {
  if (env.isInAppBrowser) {
    $('#install-hint').textContent =
      'Open this link in Safari first. This in-app browser cannot install apps.';
    $('#install-hint').classList.add('is-warning');
  }

  $('#install-cta').addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      if (outcome === 'accepted') toast('Installed. Open me from your Home Screen.');
      return;
    }
    if (!env.isIOS) {
      $('#sheet-note').textContent =
        'On Android use the browser menu, then "Install app" or "Add to Home screen".';
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
      hint.textContent = 'Done. That is the hard part over.';
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
    toast(`Noted. You are ${name} now, forever.`);
  });
}

function wireHomeScreen() {
  $('#another-cta').addEventListener('click', () => {
    const today = todaysQuote();
    let pick;
    do {
      pick = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    } while (QUOTES.length > 1 && personalise(pick.text, state.name) === today.text);
    paintQuote(personalise(pick.text, state.name), pick.by);
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
  $('#disable-push').hidden = !granted;
  $('#test-push').hidden = !granted;

  if (!env.pushAvailableHere && env.isIOS) {
    note.textContent = 'Notifications need the Home Screen version of this app.';
    return;
  }
  if (!granted) {
    note.textContent =
      env.supportsPush && Notification.permission === 'denied'
        ? 'Notifications are blocked in iPhone Settings. Settings > Notifications > Leave, Bye.'
        : 'Notifications are off.';
    return;
  }
  note.textContent = `You are on the list. Next one lands at ${SEND_HOUR}am Dubai time.`;
}

function wireSettingsSheet() {
  $('#save-name').addEventListener('click', async () => {
    const name = $('#settings-name').value.trim().slice(0, 40);
    if (!name) return toast('It needs to be something.', 'error');
    state.name = name;
    localStorage.setItem(STORE.name, name);
    renderHome();
    try {
      await syncSubscription();
    } catch {
      /* the local name still works; the server catches up next time */
    }
    toast(`Fine. ${name} it is.`);
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
      updateCountdown();
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
      hint.textContent = 'Sent. Check your lock screen.';
      hint.classList.add('is-good');
    } catch (error) {
      hint.textContent = error.message;
      hint.classList.add('is-warning');
    }
  });

  $('#disable-push').addEventListener('click', async () => {
    try {
      await disablePush();
      toast('Fine. No more 8am. I will be here anyway.');
      await refreshSettingsStatus();
      updateCountdown();
    } catch (error) {
      toast(error.message, 'error');
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
  wireSheets();

  route();

  registerServiceWorker();
  loadConfig();

  // Keep the countdown honest without hammering anything.
  setInterval(() => {
    if (!$('[data-screen="home"]').hidden) updateCountdown();
  }, 30000);

  // Coming back to the app on a new day should show the new quote.
  let shownFor = dateKey();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (dateKey() !== shownFor) {
      shownFor = dateKey();
      renderHome();
    }
    updateCountdown();
  });
}

boot();
