/* =============================================================================
   Words to "Leave, Bye." - owner console

   A private page for writing a quote that is not in the book. Two things it
   can do:

     send   push it to her right now, whatever the time
     pin    make it THE quote for a date, so the app, the widget and that
            morning's 8am push all use it instead of the shuffled deck

   The key is held in this browser only, and is sent as a bearer token. If the
   deployment has no ADMIN_KEY set, the API refuses everything rather than
   leaving this open to anyone who finds the URL.
   ============================================================================= */

const $ = (sel) => document.querySelector(sel);
const KEY_STORE = 'wtlb.adminKey';

const state = { key: '', status: null };

/* -----------------------------------------------------------------------------
   Talking to the API
   ----------------------------------------------------------------------------- */

async function api(options = {}) {
  const res = await fetch('/api/impromptu', {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${state.key}`,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

const post = (payload) => api({ method: 'POST', body: JSON.stringify(payload) });

/* -----------------------------------------------------------------------------
   Screen
   ----------------------------------------------------------------------------- */

function say(target, text, kind) {
  const el = $(target);
  el.textContent = text;
  el.className = `msg${kind ? ` ${kind}` : ''}`;
}

/** The example name in the preview; her real name lives on her phone. */
function sampleName() {
  const names = (state.status && state.status.names) || [];
  return names[0] || 'her name';
}

function renderPreview() {
  const raw = $('#text').value;
  const shown = raw.replace(/\{name\}/gi, sampleName());
  $('#preview-text').textContent = shown.trim() || 'Nothing yet.';

  const by = $('#by').value.trim() || 'Probably some random person';
  $('#preview-by').textContent = shown.trim() ? `— ${by}` : '';

  const n = raw.trim().length;
  const count = $('#count');
  count.textContent = `${n} characters${n > 120 ? ' - long for a lock screen' : ''}`;
  count.classList.toggle('over', n > 120);
}

function renderStatus(status) {
  state.status = status;

  const bits = [
    `<strong>${status.subscribers}</strong> device${status.subscribers === 1 ? '' : 's'} subscribed`,
    `Today in Dubai is <strong>${status.today}</strong>`,
  ];
  if (!status.pushReady) bits.push('Push is <strong>not configured</strong>, so nothing can be sent.');
  if (!status.storageReady) bits.push('Storage is <strong>not connected</strong>, so nothing can be pinned.');
  $('#status').innerHTML = bits.join('<br>');

  const pins = $('#pins');
  pins.replaceChildren();

  for (const [label, date] of [['Today', status.today], ['Tomorrow', status.tomorrow]]) {
    const pin = status.pinned && status.pinned[date];
    const button = $(label === 'Today' ? '#clear-today' : '#clear-tomorrow');
    button.hidden = !pin;
    if (!pin) continue;

    const wrap = document.createElement('div');
    wrap.className = 'pin';
    const quote = document.createElement('p');
    // textContent, so a quote can contain anything without becoming markup.
    quote.textContent = pin.text;
    const meta = document.createElement('span');
    meta.textContent = `${label} (${date}) - ${pin.by}`;
    wrap.append(quote, meta);
    pins.append(wrap);
  }

  renderPreview();
}

async function refresh() {
  try {
    renderStatus(await api());
  } catch (error) {
    say('#msg', error.message, 'bad');
  }
}

/* -----------------------------------------------------------------------------
   Unlocking
   ----------------------------------------------------------------------------- */

async function unlock(key, { quiet = false } = {}) {
  state.key = key;
  try {
    const status = await api();
    localStorage.setItem(KEY_STORE, key);
    $('#lock-card').hidden = true;
    $('#work').hidden = false;
    renderStatus(status);
  } catch (error) {
    state.key = '';
    localStorage.removeItem(KEY_STORE);
    $('#lock-card').hidden = false;
    $('#work').hidden = true;
    if (!quiet) say('#lock-msg', error.message, 'bad');
  }
}

/* -----------------------------------------------------------------------------
   Actions
   ----------------------------------------------------------------------------- */

/** Runs one action with the buttons locked, so nothing double-fires. */
async function run(button, work) {
  const buttons = [...document.querySelectorAll('#work button')];
  buttons.forEach((b) => (b.disabled = true));
  const label = button.textContent;
  button.textContent = 'Working...';
  try {
    say('#msg', '');
    await work();
  } catch (error) {
    say('#msg', error.message, 'bad');
  } finally {
    button.textContent = label;
    buttons.forEach((b) => (b.disabled = false));
  }
}

function quoteFields() {
  const text = $('#text').value.trim();
  if (!text) throw new Error('Write something first.');
  return { text, by: $('#by').value.trim() };
}

function wire() {
  $('#text').addEventListener('input', renderPreview);
  $('#by').addEventListener('input', renderPreview);

  $('#unlock').addEventListener('click', () => {
    const key = $('#key').value.trim();
    if (!key) return say('#lock-msg', 'Paste the key first.', 'bad');
    say('#lock-msg', 'Checking...');
    unlock(key);
  });

  $('#key').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#unlock').click();
  });

  $('#send-now').addEventListener('click', (e) =>
    run(e.currentTarget, async () => {
      const result = await post({ ...quoteFields(), action: 'send' });
      if (!result.subscribers) {
        return say('#msg', 'Nobody is subscribed yet, so it went nowhere.', 'bad');
      }
      say(
        '#msg',
        `Sent to ${result.sent} of ${result.subscribers}.` +
          (result.failed ? ` ${result.failed} failed.` : ''),
        result.failed ? 'bad' : 'good'
      );
    })
  );

  const pin = (date, label) => async () => {
    const result = await post({ ...quoteFields(), action: 'pin', date });
    say('#msg', `Pinned for ${label} (${result.date}).`, 'good');
    await refresh();
  };

  $('#pin-today').addEventListener('click', (e) => run(e.currentTarget, pin('today', 'today')));
  $('#pin-tomorrow').addEventListener('click', (e) =>
    run(e.currentTarget, pin('tomorrow', 'tomorrow'))
  );

  const clear = (date, label) => async () => {
    await post({ action: 'clear', date });
    say('#msg', `${label} is back to the deck.`, 'good');
    await refresh();
  };

  $('#clear-today').addEventListener('click', (e) => run(e.currentTarget, clear('today', 'Today')));
  $('#clear-tomorrow').addEventListener('click', (e) =>
    run(e.currentTarget, clear('tomorrow', 'Tomorrow'))
  );

  $('#refresh').addEventListener('click', (e) => run(e.currentTarget, refresh));
}

wire();
renderPreview();

// A key from last time gets tried silently, so a stale one just shows the
// lock screen again rather than an error nobody asked for.
const saved = localStorage.getItem(KEY_STORE);
if (saved) unlock(saved, { quiet: true });
