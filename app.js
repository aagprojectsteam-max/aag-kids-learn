'use strict';
/* AAG Kids Learn — a learning app for a young child (PWA, no build step).
   Content tables live in data.js. Everything the parents enter (names, photos,
   voice recordings, progress) stays on this device: settings in localStorage,
   photos and recordings in IndexedDB. */

const APP_VERSION = '1.2.0';
const $app = document.getElementById('app');

/* ---------- DOM helper ---------- */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k in el) { try { el[k] = v; } catch { el.setAttribute(k, v); } }
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : String(kid));
  }
  return el;
}

const svg = body => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const ICON = {
  home: svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>'),
  back: svg('<path d="M9 5l7 7-7 7"/>'),
  next: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  prev: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  speaker: svg('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/>'),
  lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  unlock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 7.6-1.7"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.6"/><path d="M12 2.6v2.8M12 18.6v2.8M2.6 12h2.8M18.6 12h2.8M5.4 5.4l1.9 1.9M16.7 16.7l1.9 1.9M5.4 18.6l1.9-1.9M16.7 7.3l1.9-1.9"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
};

const shuffle = a => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ---------- settings (localStorage) ---------- */
const mem = {};
const LS = {
  get(k) {
    try {
      const v = localStorage.getItem('kl:' + k);
      return v == null ? mem[k] : JSON.parse(v);
    } catch { return mem[k]; }
  },
  set(k, v) {
    mem[k] = v;
    try { localStorage.setItem('kl:' + k, JSON.stringify(v)); } catch { /* private mode */ }
  },
};

function defaults() {
  const cats = {};
  for (const c of CATS) cats[c.id] = { show: c.visible, level: c.kind === 'people' ? 5 : 1, random: false };
  return {
    v: 1, locked: false, lockTip: false, choices: 2, chime: true,
    autoSpeak: true, slow: true, niqqud: false, voiceURI: '',
    cats, people: DEFAULT_PEOPLE.map(p => ({ ...p })), progress: {},
  };
}

function loadSettings() {
  const d = defaults();
  const s = LS.get('settings');
  if (!s || typeof s !== 'object') return d;
  const out = { ...d, ...s, cats: {} };
  for (const id in d.cats) out.cats[id] = { ...d.cats[id], ...(s.cats && s.cats[id]) };
  if (!Array.isArray(out.people)) out.people = d.people;
  out.people = out.people.filter(p => p && p.id && ROLES[p.role]);
  if (!out.progress || typeof out.progress !== 'object') out.progress = {};
  if (![2, 3, 4].includes(out.choices)) out.choices = 2;
  return out;
}

let S = loadSettings();
const save = () => LS.set('settings', S);

/* ---------- media (IndexedDB) ---------- */
let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((res, rej) => {
      const r = indexedDB.open('aag-kids-learn', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbPromise;
}
async function idb(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction('kv', mode);
    const rq = fn(tx.objectStore('kv'));
    tx.oncomplete = () => res(rq && rq.result);
    tx.onerror = tx.onabort = () => rej(tx.error);
  });
}
const idbKeys = () => idb('readonly', s => s.getAllKeys());
const delMedia = k => idb('readwrite', s => s.delete(k));
// Stored as { type, buf } (not a Blob) — the most portable form across browsers.
async function putMedia(k, blob) {
  const rec = { type: blob.type, buf: await blob.arrayBuffer() };
  await idb('readwrite', s => s.put(rec, k));
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
async function getMedia(k) {
  const rec = await idb('readonly', s => s.get(k));
  return rec ? new Blob([rec.buf], { type: rec.type }) : null;
}

// photo: id -> object URL ; voice: id -> Blob (kept in memory so playback starts at once)
const media = { photo: {}, voice: new Map() };
async function loadMedia() {
  for (const url of Object.values(media.photo)) URL.revokeObjectURL(url);
  media.photo = {};
  media.voice = new Map();
  try {
    for (const k of await idbKeys()) {
      const blob = await getMedia(k);
      if (!blob) continue;
      if (k.startsWith('voice:')) media.voice.set(k.slice(6), blob);
      else if (k.startsWith('photo:')) media.photo[k.slice(6)] = URL.createObjectURL(blob);
    }
  } catch (e) { console.warn('media storage unavailable', e); }
}

/* ---------- speech ---------- */
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];
function refreshVoices() {
  voices = synth ? synth.getVoices().filter(v => /^(he|iw)/i.test(v.lang)) : [];
}
if (synth) {
  refreshVoices();
  synth.onvoiceschanged = () => {
    refreshVoices();
    const a = document.activeElement;
    if (route.name === 'settings' && !(a && /INPUT|SELECT/.test(a.tagName))) rerender();
  };
}
const currentVoice = () => voices.find(v => v.voiceURI === S.voiceURI) || voices[0] || null;

const player = new Audio();
let speakToken = 0;
let playerDone = null;
let playerURL = null;
let keepUtterance = null; // Chrome drops utterances that are garbage-collected mid-speech

function stopSpeech() {
  speakToken++;
  try { if (synth) synth.cancel(); } catch { /* ignore */ }
  try { player.pause(); } catch { /* ignore */ }
  if (playerDone) playerDone(false);
}

function ttsOne(text) {
  return new Promise(res => {
    if (!synth || !text) return res();
    const u = new SpeechSynthesisUtterance(text);
    const v = currentVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'he-IL';
    u.rate = S.slow ? 0.75 : 0.95;
    u.pitch = 1.1;
    let done = false;
    const fin = () => { if (!done) { done = true; clearTimeout(t); res(); } };
    const t = setTimeout(fin, 2500 + text.length * 300); // never hang when no voice exists
    u.onend = fin;
    u.onerror = fin;
    keepUtterance = u;
    try { synth.speak(u); } catch { fin(); }
  });
}

function playVoice(id) {
  const blob = media.voice.get(id);
  if (!blob) return Promise.resolve(false);
  return new Promise(res => {
    if (playerURL) URL.revokeObjectURL(playerURL);
    playerURL = URL.createObjectURL(blob);
    const fin = ok => {
      if (playerDone !== fin) return;
      playerDone = null;
      clearTimeout(t);
      player.onended = player.onerror = null;
      res(ok);
    };
    const t = setTimeout(() => fin(true), 9000);
    playerDone = fin;
    player.onended = () => fin(true);
    player.onerror = () => fin(false);
    player.src = playerURL;
    player.play().catch(() => fin(false));
  });
}

/* parts: [{ text }] or [{ voice: id, text: fallback }] — said one after another. */
async function speak(parts) {
  stopSpeech();
  const token = speakToken;
  // Parts without a recording become plain text and are merged, so the
  // synthetic voice says one natural sentence.
  const flat = [];
  for (const p of parts) {
    if (p.voice && media.voice.has(p.voice)) flat.push({ voice: p.voice, text: p.text });
    else if (p.text) {
      const last = flat[flat.length - 1];
      if (last && !last.voice) last.text += ' ' + p.text;
      else flat.push({ text: p.text });
    }
  }
  for (const p of flat) {
    if (token !== speakToken) return;
    if (p.voice) {
      const ok = await playVoice(p.voice);
      if (!ok && token === speakToken) await ttsOne(p.text);
    } else await ttsOne(p.text);
  }
}

const hasVoice = it => media.voice.has(it.id);
const sayItem = it => [{ voice: it.id, text: it.spoken }];
const sayQuestion = it => (hasVoice(it)
  ? [{ text: 'אֵיפֹה' }, { voice: it.id, text: it.say }]
  : [{ text: it.questionSay }]);
const sayWrong = (chosen, target) => [
  { text: 'זֶה' }, { voice: chosen.id, text: chosen.say + '.' },
  { text: 'נְנַסֶּה שׁוּב.' }, ...sayQuestion(target),
];

let audioCtx = null;
function chime() {
  if (!S.chime) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const t = t0 + i * 0.09;
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t);
      o.stop(t + 0.5);
    });
  } catch { /* no audio */ }
}

// iOS only lets a page make sound after a touch: "open" the audio paths on the first one.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
let unlocked = false;
document.addEventListener('pointerdown', () => {
  if (unlocked) return;
  unlocked = true;
  try { player.src = SILENT_WAV; player.play().catch(() => {}); } catch { /* ignore */ }
  try {
    if (synth) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); }
  } catch { /* ignore */ }
}, true);

/* ---------- items ---------- */
const catById = id => CATS.find(c => c.id === id);
const session = { pick: {}, prev: {} }; // random selections, kept until the category is re-entered from home

function personItem(p) {
  const r = ROLES[p.role];
  const name = (p.name || '').trim();
  const sn = (p.sayName || '').trim() || name;
  let word = r.t, wordSay = r.s, say = r.s, sub = '';
  let question = `איפה ${r.the}?`, questionSay = `אֵיפֹה ${r.theS}?`;
  if (name) {
    switch (r.style) {
      case 'me':
        word = `אני ${name}`; wordSay = say = `אֲנִי ${sn}`;
        question = `איפה ${name}?`; questionSay = `אֵיפֹה ${sn}?`;
        break;
      case 'title':
        word = `${r.t} ${name}`; wordSay = say = `${r.s} ${sn}`;
        question = `איפה ${word}?`; questionSay = `אֵיפֹה ${say}?`;
        break;
      case 'the':
        word = `${r.t} ${name}`; wordSay = say = `${r.s} ${sn}`;
        question = `איפה ${r.the} ${name}?`; questionSay = `אֵיפֹה ${r.theS} ${sn}?`;
        break;
      case 'rel':
        word = name; wordSay = sn; sub = r.t; say = `${r.s} ${sn}`;
        question = `איפה ${name}?`; questionSay = `אֵיפֹה ${sn}?`;
        break;
      default: // 'name'
        word = name; wordSay = sn; sub = r.t; say = sn;
        question = `איפה ${name}?`; questionSay = `אֵיפֹה ${sn}?`;
    }
  }
  return {
    id: p.id, word, wordSay, sub, say, spoken: say, sound: '', question, questionSay,
    person: p, color: r.color, initial: (name || r.t)[0],
  };
}

function allItems(cat) {
  if (cat.kind !== 'people') return cat.items;
  return S.people.filter(p => ROLES[p.role].group === cat.id).map(personItem);
}

function activeItems(cat) {
  const all = allItems(cat);
  const cs = S.cats[cat.id];
  const size = LEVEL_SIZES[cs.level - 1] || 1000;
  if (size >= all.length) return all;
  if (!cs.random) return all.slice(0, size);
  let ids = session.pick[cat.id];
  if (!ids || ids.length !== size || ids.some(id => !all.find(i => i.id === id))) {
    const prev = session.prev[cat.id] || [];
    const fresh = shuffle(all.filter(i => !prev.includes(i.id)));
    const old = shuffle(all.filter(i => prev.includes(i.id)));
    ids = [...fresh, ...old].slice(0, size).map(i => i.id);
    session.pick[cat.id] = ids;
  }
  return all.filter(i => ids.includes(i.id));
}

const showWord = it => (S.niqqud ? (it.wordSay || it.say) : it.word);

// darker (k < 1) variant of a #rrggbb colour
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.round(Math.min(255, Math.max(0, v * k))).toString(16).padStart(2, '0');
  return '#' + c(n >> 16) + c((n >> 8) & 255) + c(n & 255);
}

let gradSeq = 0;
function shapeSvg(shape, color) {
  const id = 'sg' + (++gradSeq);
  const d = SHAPE_SVG[shape];
  return `<svg viewBox="-5 -5 110 110" aria-hidden="true"><defs>`
    + `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/>`
    + `<stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`
    + `<g stroke-linejoin="round"><g fill="${shade(color, 0.7)}" stroke="${shade(color, 0.7)}" stroke-width="7">${d}</g>`
    + `<g fill="${color}">${d}</g><g fill="url(#${id})">${d}</g></g></svg>`;
}

// Bundled pictures (Fluent Emoji, img/<codepoints>.svg) look the same on every device;
// an emoji that has no bundled file falls back to the system emoji font.
const PIC_SET = new Set(typeof PICS === 'undefined' ? [] : PICS);
function emo(ch) {
  const cp = [...ch].map(c => c.codePointAt(0)).filter(n => n !== 0xFE0F).map(n => n.toString(16)).join('-');
  return PIC_SET.has(cp) ? h('img', { class: 'emo', src: `img/${cp}.svg`, alt: '', draggable: false }) : ch;
}

// the picture of a home tile / menu button
function iconNode(c) {
  if (c.kind === 'shape') {
    return h('span', { class: 'ico', html: '<svg viewBox="0 0 100 100" aria-hidden="true">'
      + '<circle cx="30" cy="30" r="24" fill="#FF2B2B"/><rect x="56" y="10" width="40" height="40" rx="5" fill="#0A7BFF"/>'
      + '<polygon points="50,56 78,96 22,96" fill="#FFC400" stroke="#FFC400" stroke-width="4" stroke-linejoin="round"/></svg>' });
  }
  const text = c.kind === 'letter' || c.kind === 'number';
  return h('span', { class: 'ico' + (text ? ' txt' : '') + (c.icon.length > 2 ? ' long' : '') }, emo(c.icon));
}

function picture(it, cat, mode, tone) {
  if (it.person) {
    const url = media.photo[it.id];
    return url
      ? h('div', { class: 'pic photo' }, h('img', { src: url, alt: '', draggable: false }))
      : h('div', { class: 'pic face', style: `background:${it.color}` }, h('span', null, it.initial));
  }
  switch (cat.kind) {
    case 'color':
      return h('div', { class: 'pic' },
        h('div', { class: 'swatch' + (it.color === '#FFFFFF' ? ' light' : ''), style: `background:${it.color}` }),
        mode === 'learn' && h('span', { class: 'badge' }, emo(it.emoji)));
    case 'shape':
      return h('div', { class: 'pic shape', html: shapeSvg(it.shape, tone || SHAPE_COLORS[it.shape] || cat.tint) });
    case 'letter':
    case 'number':
      return h('div', { class: 'pic glyph', style: `color:${cat.tint}` }, h('span', null, it.glyph));
    default:
      return h('div', { class: 'pic emoji' }, h('span', null, emo(it.emoji)));
  }
}

/* ---------- progress ---------- */
function note(id, ok) {
  const p = S.progress[id] || (S.progress[id] = { ok: 0, miss: 0 });
  if (ok) p.ok++; else p.miss++;
  save();
}
function status(id) {
  const p = S.progress[id];
  if (!p || p.ok + p.miss === 0) return 'new';
  return p.ok >= 3 && p.ok >= p.miss * 2 ? 'know' : 'prac';
}

/* ---------- small UI pieces ---------- */
function longPress(el, ms, onLong, onShort) {
  let timer = null;
  el.style.setProperty('--press', ms + 'ms');
  el.addEventListener('pointerdown', () => {
    el.classList.add('pressing');
    timer = setTimeout(() => { timer = null; el.classList.remove('pressing'); onLong(); }, ms);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) {
    el.addEventListener(ev, e => {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
      el.classList.remove('pressing');
      if (e.type === 'pointerup' && onShort) onShort();
    });
  }
}

let toastTimer = null;
function toast(text) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = h('div', { class: 'toast', role: 'status' }, text);
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2400);
}

function modal(text, buttons) {
  return new Promise(res => {
    const ov = h('div', { class: 'overlay' },
      h('div', { class: 'dialog', role: 'dialog' },
        h('p', null, text),
        h('div', { class: 'dialog-btns' }, buttons.map(([label, val, cls]) =>
          h('button', { class: 'btn ' + (cls || ''), onclick: () => { ov.remove(); res(val); } }, label)))));
    document.body.append(ov);
  });
}
const alertBox = t => modal(t, [['הבנתי', true, 'primary']]);
const askBox = (t, yes) => modal(t, [[yes, true, 'danger'], ['ביטול', false]]);

const speakerIcon = () => h('span', { class: 'spk', html: ICON.speaker });

/* ---------- router ---------- */
let route = { name: 'home' };
const stack = [];
const ui = { open: new Set() };
let recState = null;

function leave() {
  stopSpeech();
  if (recState) recState.stop();
}
function go(r) { leave(); stack.push(route); route = r; render(); }
function back() { leave(); route = stack.pop() || { name: 'home' }; render(); }
function goHome() { leave(); stack.length = 0; route = { name: 'home' }; render(); }

function render() {
  document.querySelectorAll('.celebrate').forEach(e => e.remove());
  $app.replaceChildren(SCREENS[route.name](route));
}
function rerender() {
  const sc = document.querySelector('.settings-body');
  const y = sc ? sc.scrollTop : 0;
  render();
  const n = document.querySelector('.settings-body');
  if (n) n.scrollTop = y;
}

function Header(title, tint) {
  return h('header', { class: 'bar', style: tint ? `--tint:${tint}` : '' },
    h('div', { class: 'bar-side' },
      h('button', { class: 'circle', onclick: goHome, 'aria-label': 'בית', html: ICON.home }),
      stack.length > 1 && h('button', { class: 'circle', onclick: back, 'aria-label': 'חזרה', html: ICON.back })),
    h('h1', null, title),
    h('div', { class: 'bar-side end' }));
}

/* ---------- home ---------- */
const LOCK_TIP = 'המסך ננעל: גלגל ההגדרות מוסתר.\nלפתיחה: לחיצה ארוכה (2 שניות) על המנעול.\n\n'
  + 'טיפ: כדי שהילד לא יצא מהאפליקציה אפשר להפעיל באייפד "גישה מודרכת" '
  + '(הגדרות ← נגישות ← גישה מודרכת), ואז שלוש לחיצות על הכפתור העליון.';

// every letter of the title in its own lively colour (marks stay with their letter)
const TITLE_COLORS = ['#FF2B2B', '#FF8A00', '#1FB24A', '#0A7BFF', '#A63DE8', '#FF3D7F', '#00B3A6'];
function rainbow(text) {
  let k = 0;
  return text.split(' ').flatMap((word, w) => [w ? ' ' : null, h('span', { class: 'tw' },
    (word.match(/\P{M}\p{M}*/gu) || []).map(ch => h('span', { style: `color:${TITLE_COLORS[k++ % TITLE_COLORS.length]}` }, ch)))]);
}

function Home() {
  // a people topic with nobody in it yet stays off the child's screen
  const cats = CATS.filter(c => S.cats[c.id].show && (c.kind !== 'people' || allItems(c).length));
  const lockBtn = h('button', {
    class: 'circle' + (S.locked ? ' locked' : ''),
    'aria-label': S.locked ? 'נעול. לחיצה ארוכה לפתיחה' : 'נעילה',
    html: ICON[S.locked ? 'lock' : 'unlock'],
  });
  if (S.locked) {
    longPress(lockBtn, 2000, () => { S.locked = false; save(); render(); },
      () => toast('לפתיחת הנעילה: לחיצה ארוכה על המנעול'));
  } else {
    lockBtn.addEventListener('click', () => {
      const first = !S.lockTip;
      S.locked = true; S.lockTip = true; save(); render();
      if (first) alertBox(LOCK_TIP);
    });
  }
  let gear = h('span', { class: 'circle ghost' });
  if (!S.locked) {
    gear = h('button', { class: 'circle quiet', 'aria-label': 'הגדרות הורים. לחיצה ארוכה', html: ICON.gear });
    longPress(gear, 1500, () => go({ name: 'settings' }), () => toast('להורים: לחיצה ארוכה לפתיחת ההגדרות'));
  }
  const n = cats.length;
  const colsL = n <= 3 ? Math.max(n, 1) : n <= 6 ? 3 : n <= 8 ? 4 : 5;
  const colsP = n <= 1 ? 1 : n <= 8 ? 2 : 3;
  return h('main', { class: 'screen home' },
    h('header', { class: 'home-top' }, lockBtn, h('h1', null, rainbow(S.niqqud ? 'בּוֹאוּ נִלְמַד!' : 'בואו נלמד!')), gear),
    n === 0
      ? h('div', { class: 'empty' }, 'כל הנושאים מוסתרים.\nהורים: אפשר להציג נושאים בהגדרות.')
      : h('div', { class: 'grid', style: `--cols-l:${colsL};--cols-p:${colsP}` }, cats.map(c =>
        h('button', { class: 'tile', style: `--tint:${c.tint}`, onclick: () => openCat(c) },
          h('span', { class: 'tile-icon' }, iconNode(c)),
          h('span', { class: 'tile-title' }, S.niqqud ? c.say : c.title)))));
}

function openCat(c) {
  session.prev[c.id] = session.pick[c.id];
  delete session.pick[c.id];
  go({ name: 'menu', cat: c.id });
  speak([{ text: c.say }]);
}

/* ---------- category menu ---------- */
function Menu(r) {
  const cat = catById(r.cat);
  const items = activeItems(cat);
  const title = S.niqqud ? cat.say : cat.title;
  if (!items.length) {
    return h('main', { class: 'screen menu', style: `--tint:${cat.tint}` }, Header(title, cat.tint),
      h('div', { class: 'empty' }, 'עדיין אין כאן אף אחד.\nהורים: מוסיפים אנשים ותמונות בהגדרות (לחיצה ארוכה על גלגל השיניים במסך הראשי).'));
  }
  return h('main', { class: 'screen menu', style: `--tint:${cat.tint}` }, Header(title, cat.tint),
    h('div', { class: 'menu-body' },
      h('button', { class: 'big', onclick: () => openLearn(cat) },
        h('span', { class: 'big-icon' }, h('span', { class: 'ico' }, emo('👀'))), h('span', null, S.niqqud ? 'לִלְמֹד' : 'ללמוד')),
      h('button', { class: 'big play', disabled: items.length < 2, onclick: () => openGame(cat) },
        h('span', { class: 'big-icon' }, h('span', { class: 'ico' }, emo('🎯'))), h('span', null, S.niqqud ? 'לְשַׂחֵק' : 'לשחק'))));
}

/* ---------- learn ---------- */
function openLearn(cat) {
  const r = { name: 'learn', cat: cat.id, items: activeItems(cat), i: 0 };
  go(r);
  if (S.autoSpeak) speak(sayItem(r.items[0]));
}

function learnMove(r, d) {
  const n = r.items.length;
  if (n < 2 || route !== r) return;
  r.i = (r.i + d + n) % n;
  stopSpeech();
  render();
  if (S.autoSpeak) speak(sayItem(r.items[r.i]));
}

function Learn(r) {
  const cat = catById(r.cat);
  const items = r.items;
  const it = items[r.i];
  let startX = null;
  let swiped = false;
  const card = h('button', {
    class: 'card',
    onclick: () => { if (swiped) { swiped = false; return; } speak(sayItem(it)); },
    onpointerdown: e => { startX = e.clientX; swiped = false; },
    onpointerup: e => {
      if (startX == null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 60) { swiped = true; learnMove(r, dx < 0 ? 1 : -1); }
    },
    onpointercancel: () => { startX = null; },
  },
  picture(it, cat, 'learn'),
  it.number && h('div', { class: 'count' }, Array.from({ length: it.number }, () => h('i', { style: `background:${cat.tint}` }))),
  h('div', { class: 'word' }, showWord(it)),
  it.sub && h('div', { class: 'sub' }, it.sub),
  speakerIcon());
  const many = items.length > 1;
  return h('main', { class: 'screen learn', style: `--tint:${cat.tint}` },
    Header(S.niqqud ? cat.say : cat.title, cat.tint),
    h('div', { class: 'learn-body' },
      many ? h('button', { class: 'arrow', 'aria-label': 'הקודם', onclick: () => learnMove(r, -1), html: ICON.prev }) : h('span'),
      card,
      many ? h('button', { class: 'arrow', 'aria-label': 'הבא', onclick: () => learnMove(r, 1), html: ICON.next }) : h('span')),
    it.example && h('button', { class: 'example', onclick: () => speak([{ text: it.exampleSay }]) },
      h('span', { class: 'ex-emoji' }, emo(it.emoji)), h('span', null, S.niqqud ? it.exampleSay : it.example), speakerIcon()),
    many && (items.length <= 16
      ? h('div', { class: 'dots' }, items.map((_, i) => h('i', { class: i === r.i ? 'on' : '' })))
      : h('div', { class: 'dots text' }, `${r.i + 1} / ${items.length}`)));
}

/* ---------- game: "where is ...?" ---------- */
function newRound(g) {
  const items = g.items;
  let target;
  do { target = items[Math.floor(Math.random() * items.length)]; }
  while (items.length > 1 && target.id === g.lastId);
  const n = Math.min(S.choices, items.length);
  const opts = [target];
  const words = new Set([target.word]);
  for (const o of shuffle(items.filter(i => i.id !== target.id))) {
    if (opts.length >= n) break;
    if (words.has(o.word)) continue; // never two options with the same word
    words.add(o.word);
    opts.push(o);
  }
  g.target = target;
  g.options = shuffle(opts);
  g.wrong = new Set();
  g.hint = false;
  g.firstTry = true;
  g.lastId = target.id;
  let tone;
  do { tone = GAME_TONES[Math.floor(Math.random() * GAME_TONES.length)]; } while (tone === g.tone);
  g.tone = tone;
}

function openGame(cat) {
  const g = { name: 'game', cat: cat.id, items: activeItems(cat), stars: 0, lastId: null, busy: false };
  newRound(g);
  go(g);
  speak(sayQuestion(g.target));
}

function choose(g, o) {
  if (g.busy || route !== g) return;
  if (o.id === g.target.id) {
    g.busy = true;
    g.stars++;
    g.hint = false;
    if (g.firstTry) note(g.target.id, true);
    render();
    document.body.append(h('div', { class: 'celebrate' },
      h('div', { class: 'celebrate-star' }, emo('🌟')),
      h('div', { class: 'celebrate-text' }, S.niqqud ? 'כָּל הַכָּבוֹד!' : 'כל הכבוד!')));
    chime();
    speak([{ text: 'כָּל הַכָּבוֹד!' }]);
    setTimeout(() => {
      if (route !== g) return;
      g.busy = false;
      newRound(g);
      render();
      speak(sayQuestion(g.target));
    }, 1800);
  } else {
    g.wrong.add(o.id);
    g.hint = true;
    if (g.firstTry) { g.firstTry = false; note(g.target.id, false); }
    render();
    speak(sayWrong(o, g.target));
  }
}

function Game(g) {
  const cat = catById(g.cat);
  const t = g.target;
  return h('main', { class: 'screen game', style: `--tint:${cat.tint}` },
    Header(S.niqqud ? cat.say : cat.title, cat.tint),
    h('button', { class: 'question', onclick: () => speak(sayQuestion(t)) },
      h('span', null, S.niqqud ? t.questionSay : t.question), speakerIcon()),
    h('div', { class: 'stars', 'aria-label': `כוכבים: ${g.stars}` },
      g.stars <= 10 ? Array.from({ length: g.stars }, () => emo('⭐')) : [emo('⭐'), ` ${g.stars}`]),
    h('div', { class: `opts n${g.options.length}`, style: `--n:${g.options.length}` }, g.options.map(o =>
      h('button', {
        class: 'opt' + (g.wrong.has(o.id) ? ' wrong' : '') + (g.hint && o.id === t.id ? ' hint' : ''),
        disabled: g.wrong.has(o.id),
        'aria-label': o.word,
        onclick: () => choose(g, o),
      }, picture(o, cat, 'opt', g.tone)))));
}

/* ---------- photos and recordings ---------- */
function resizeImage(file, max) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * k));
      c.height = Math.max(1, Math.round(img.naturalHeight * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    img.src = url;
  });
}

async function setPhoto(id, file) {
  if (!file) return;
  try {
    const blob = await resizeImage(file, 900);
    await putMedia('photo:' + id, blob);
    if (media.photo[id]) URL.revokeObjectURL(media.photo[id]);
    media.photo[id] = URL.createObjectURL(blob);
    rerender();
  } catch (e) {
    console.warn(e);
    alertBox('לא הצלחתי לשמור את התמונה. אפשר לנסות תמונה אחרת.');
  }
}

async function toggleRecord(id, btn) {
  if (recState) { recState.stop(); return; }
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    alertBox('אי אפשר להקליט כאן: הדפדפן לא תומך בהקלטה, או שהאפליקציה לא נפתחה בחיבור מאובטח (HTTPS).');
    return;
  }
  stopSpeech();
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch {
    alertBox('אין גישה למיקרופון. צריך לאשר לאפליקציה להשתמש במיקרופון.');
    return;
  }
  const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
  const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks = [];
  mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const timer = setTimeout(() => { if (recState) recState.stop(); }, 6000);
  recState = { stop() { try { mr.stop(); } catch { /* already stopped */ } } };
  mr.onstop = async () => {
    clearTimeout(timer);
    recState = null;
    stream.getTracks().forEach(t => t.stop());
    const blob = new Blob(chunks, { type: (mr.mimeType || type || 'audio/webm').split(';')[0] });
    if (blob.size > 800) {
      try { await putMedia('voice:' + id, blob); media.voice.set(id, blob); } catch (e) {
        console.warn(e);
        alertBox('לא הצלחתי לשמור את ההקלטה.');
      }
    }
    if (route.name === 'settings') rerender();
  };
  mr.start();
  btn.textContent = '⏹ עצירה (עד 6 שניות)';
  btn.classList.add('recording');
}

function Recorder(id, fallbackText) {
  const has = media.voice.has(id);
  const recBtn = h('button', { class: 'btn small' }, has ? '🎙 הקלטה מחדש' : '🎙 הקלטת קול');
  recBtn.addEventListener('click', () => toggleRecord(id, recBtn));
  return h('div', { class: 'rec' },
    h('button', { class: 'btn small', onclick: () => speak([{ voice: id, text: fallbackText }]) },
      has ? '▶ ההקלטה' : '▶ קול המכשיר'),
    recBtn,
    has && h('button', {
      class: 'btn small danger',
      onclick: async () => { await delMedia('voice:' + id); media.voice.delete(id); rerender(); },
    }, 'מחיקת ההקלטה'));
}

/* ---------- parent settings ---------- */
function Section(title, footer, ...kids) {
  return h('section', { class: 'sec' }, h('h2', null, title), h('div', { class: 'box' }, kids),
    footer && h('p', { class: 'foot' }, footer));
}
function Toggle(label, value, onchange, disabled) {
  return h('label', { class: 'row' + (disabled ? ' off' : '') }, h('span', null, label),
    h('input', { type: 'checkbox', class: 'switch', checked: !!value, disabled: !!disabled, onchange: e => onchange(e.target.checked) }));
}
function Seg(options, value, onpick) {
  return h('div', { class: 'seg' }, options.map(([v, label]) =>
    h('button', { type: 'button', class: v === value ? 'on' : '', onclick: () => onpick(v) }, label)));
}
function Details(key, summary, ...kids) {
  return h('details', {
    open: ui.open.has(key),
    ontoggle: e => { if (e.target.open) ui.open.add(key); else ui.open.delete(key); },
  }, h('summary', null, summary), h('div', { class: 'details-body' }, kids));
}
const set = (obj, key) => v => { obj[key] = v; save(); rerender(); };

function SecLock() {
  return Section('נעילה',
    'כשהנעילה פעילה גלגל ההגדרות מוסתר, ופותחים בלחיצה ארוכה (2 שניות) על המנעול במסך הראשי. '
    + 'כדי שהילד לא יצא מהאפליקציה בכלל: באייפד — הגדרות ← נגישות ← גישה מודרכת, ואז שלוש לחיצות על הכפתור העליון.',
    Toggle('נעילת ההגדרות', S.locked, v => { S.locked = v; S.lockTip = true; save(); rerender(); }));
}

const LEVELS = [[1, '2'], [2, '4'], [3, '6'], [4, '10'], [5, 'הכול']];

function CatSettings(cat) {
  const cs = S.cats[cat.id];
  const all = allItems(cat);
  const size = LEVEL_SIZES[cs.level - 1];
  const partial = size < all.length;
  const shown = partial && !cs.random ? all.slice(0, size) : all;
  const info = !all.length ? 'אין פריטים עדיין.'
    : partial && cs.random ? `בכל כניסה נבחרים ${size} פריטים באקראי מתוך ${all.length}.`
      : `מוצגים ${shown.length} מתוך ${all.length}: ${shown.map(i => i.word).join(', ')}`;
  return Details('cat-' + cat.id,
    [h('span', { class: 'chip-icon', style: `background:${cat.tint}` }, emo(cat.icon)), h('span', null, cat.title),
      h('span', { class: 'sum-note' }, cs.show ? 'מוצג' : 'מוסתר')],
    Toggle('להציג במסך הראשי', cs.show, set(cs, 'show')),
    h('div', { class: 'row' }, h('span', null, 'כמה פריטים'), Seg(LEVELS, cs.level, set(cs, 'level'))),
    Toggle('אקראי: פריטים אחרים בכל פעם', cs.random && partial, set(cs, 'random'), !partial),
    h('p', { class: 'note' }, info),
    cat.kind !== 'people' && Details('rec-' + cat.id, 'הקלטת קול משלכם לפריטים', all.map(it =>
      h('div', { class: 'recrow' }, picture(it, cat, 'mini'), h('span', { class: 'name' }, it.word),
        Recorder(it.id, it.spoken)))));
}

function SecTopics() {
  return Section('נושאים ורמות',
    'מתחילים במעט פריטים ומוסיפים בהדרגה. הקלטת קול של הורה מחליפה את קול המכשיר באותו פריט.',
    CATS.map(CatSettings));
}

function SecGame() {
  return Section('משחק', 'אין צליל של טעות: בחירה לא נכונה מתעמעמת, והתשובה הנכונה מודגשת.',
    h('div', { class: 'row' }, h('span', null, 'מספר אפשרויות'),
      Seg([[2, '2'], [3, '3'], [4, '4']], S.choices, set(S, 'choices'))),
    Toggle('צליל הצלחה', S.chime, set(S, 'chime')));
}

const NIQQUD = [
  ['קמץ', 'ָ'], ['פתח', 'ַ'], ['צירה', 'ֵ'], ['סגול', 'ֶ'], ['חיריק', 'ִ'],
  ['חולם', 'ֹ'], ['קובוץ', 'ֻ'], ['שווא', 'ְ'], ['דגש / שורוק', 'ּ'],
  ['שין ימנית', 'ׁ'], ['שין שמאלית', 'ׂ'],
];

function PersonRow(p) {
  const r = ROLES[p.role];
  const it = personItem(p);
  const hasPhoto = !!media.photo[p.id];
  const face = picture(it, null, 'mini');
  const file = h('input', { type: 'file', accept: 'image/*', class: 'hidden', onchange: e => setPhoto(p.id, e.target.files[0]) });
  const sayInput = h('input', {
    type: 'text', class: 'text', placeholder: 'השם עם ניקוד (לא חובה)', value: p.sayName || '',
    autocomplete: 'off', oninput: e => { p.sayName = e.target.value; save(); },
  });
  const insert = ch => {
    const s = sayInput.selectionStart == null ? sayInput.value.length : sayInput.selectionStart;
    const e = sayInput.selectionEnd == null ? s : sayInput.selectionEnd;
    sayInput.value = sayInput.value.slice(0, s) + ch + sayInput.value.slice(e);
    sayInput.focus();
    sayInput.setSelectionRange(s + ch.length, s + ch.length);
    p.sayName = sayInput.value; save();
  };
  const keepFocus = e => e.preventDefault();
  return h('div', { class: 'person' },
    h('div', { class: 'person-top' }, face,
      h('div', { class: 'person-main' }, h('div', { class: 'role' }, r.t),
        h('input', {
          type: 'text', class: 'text', placeholder: 'שם (לא חובה)', value: p.name || '', autocomplete: 'off',
          oninput: e => {
            p.name = e.target.value; save();
            const span = face.querySelector('span');
            if (span) span.textContent = (p.name.trim() || r.t)[0];
          },
        }))),
    h('div', { class: 'person-actions' },
      h('button', { class: 'btn small', onclick: () => file.click() }, hasPhoto ? '🖼 החלפת תמונה' : '🖼 הוספת תמונה'), file,
      hasPhoto && h('button', {
        class: 'btn small danger',
        onclick: async () => {
          await delMedia('photo:' + p.id);
          URL.revokeObjectURL(media.photo[p.id]);
          delete media.photo[p.id];
          rerender();
        },
      }, 'מחיקת התמונה'),
      h('button', {
        class: 'btn small danger',
        onclick: async () => {
          if (!await askBox(`להסיר את "${it.word}" מהרשימה? התמונה וההקלטה יימחקו.`, 'הסרה')) return;
          S.people = S.people.filter(x => x.id !== p.id);
          delete S.progress[p.id];
          save();
          try { await delMedia('photo:' + p.id); await delMedia('voice:' + p.id); } catch { /* ignore */ }
          if (media.photo[p.id]) { URL.revokeObjectURL(media.photo[p.id]); delete media.photo[p.id]; }
          media.voice.delete(p.id);
          rerender();
        },
      }, 'הסרה מהרשימה')),
    Recorder(p.id, personItem(p).spoken),
    Details('say-' + p.id, 'הגייה וניקוד',
      h('p', { class: 'note' }, 'אם קול המכשיר הוגה את השם לא נכון, כותבים כאן את השם עם ניקוד. זה משפיע רק על ההגייה. אפשר גם פשוט להקליט את השם.'),
      h('div', { class: 'pad' }, sayInput),
      h('div', { class: 'niqqud' },
        NIQQUD.map(([name, ch]) => h('button', { class: 'btn small', onpointerdown: keepFocus, onclick: () => insert(ch) },
          h('span', { class: 'nq' }, 'א' + ch), ' ' + name)),
        h('button', {
          class: 'btn small danger', onpointerdown: keepFocus,
          onclick: () => { sayInput.value = sayInput.value.replace(/[֑-ׇ]/g, ''); p.sayName = sayInput.value; save(); },
        }, 'מחיקת ניקוד'),
        h('button', { class: 'btn small', onclick: () => speak([{ text: personItem(p).say }]) }, '▶ בדיקת הגייה'))));
}

function SecPeople(group) {
  const list = S.people.filter(p => ROLES[p.role].group === group);
  const add = h('select', {
    class: 'select',
    onchange: e => {
      const role = e.target.value;
      if (!ROLES[role]) return;
      S.people.push({ id: `${group}-${Date.now().toString(36)}`, group, role, name: '', sayName: '' });
      save();
      rerender();
    },
  }, h('option', { value: '' }, group === 'family' ? '＋ הוספת בן משפחה…' : '＋ הוספת חבר, חברה או איש צוות…'),
  Object.entries(ROLES).filter(([, r]) => r.group === group).map(([id, r]) => h('option', { value: id }, r.t)));
  return Section(group === 'family' ? 'בני המשפחה' : 'חברים, גן וצוות',
    'התמונות וההקלטות נשמרות רק במכשיר הזה. תמונה טובה: פנים גדולות וברורות, רקע פשוט.',
    list.map(PersonRow), h('div', { class: 'row' }, add));
}

function SecSpeech() {
  const v = currentVoice();
  const sel = h('select', { class: 'select', onchange: e => { S.voiceURI = e.target.value; save(); rerender(); } },
    voices.map(x => h('option', { value: x.voiceURI }, `${x.name} (${x.lang})`)));
  if (v) sel.value = v.voiceURI;
  return Section('דיבור וכתיבה',
    voices.length
      ? 'באייפד מומלץ להוריד קול איכותי: הגדרות ← נגישות ← תוכן מוקרא ← קולות ← עברית ← "כרמית (משופר)".'
      : 'לא נמצא במכשיר הזה קול בעברית. אפשר להקליט קול משלכם לכל פריט (בסעיף "נושאים ורמות" וליד כל אדם), ואז האפליקציה מדברת בקול שלכם.',
    Toggle('להשמיע את המילה כשעוברים לכרטיס', S.autoSpeak, set(S, 'autoSpeak')),
    Toggle('דיבור איטי', S.slow, set(S, 'slow')),
    Toggle('להציג ניקוד בכתב', S.niqqud, set(S, 'niqqud')),
    voices.length > 0 && h('div', { class: 'row' }, h('span', null, 'קול'), sel),
    h('div', { class: 'row' }, h('span', null, 'בדיקת הקול'),
      h('button', { class: 'btn small', onclick: () => speak([{ text: 'שָׁלוֹם! בּוֹאוּ נִלְמַד בְּיַחַד.' }]) }, '▶ השמעה')));
}

function SecProgress() {
  const rows = CATS.filter(c => S.cats[c.id].show).map(cat => {
    const all = allItems(cat);
    if (!all.length) return null;
    const count = { know: 0, prac: 0, new: 0 };
    all.forEach(i => count[status(i.id)]++);
    return Details('prog-' + cat.id,
      [h('span', null, cat.title), h('span', { class: 'sum-note' }, `יודע ${count.know} · מתרגל ${count.prac} · חדש ${count.new}`)],
      h('div', { class: 'chips' }, all.map(i => {
        const p = S.progress[i.id] || { ok: 0, miss: 0 };
        return h('span', { class: 'chip ' + status(i.id) }, `${i.word}  ✓${p.ok} ✗${p.miss}`);
      })));
  });
  return Section('התקדמות',
    'נספר רק הניסיון הראשון בכל שאלה במשחק. ✓ = הצליח מיד, ✗ = נזקק לעזרה. "יודע" = לפחות 3 הצלחות, ופי שניים מהטעויות.',
    rows,
    h('div', { class: 'row' }, h('span', null, 'איפוס ההתקדמות'),
      h('button', {
        class: 'btn small danger',
        onclick: async () => {
          if (!await askBox('לאפס את כל נתוני ההתקדמות?', 'איפוס')) return;
          S.progress = {}; save(); rerender();
        },
      }, 'איפוס')));
}

const blobToB64 = blob => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(String(fr.result).split(',')[1] || '');
  fr.onerror = () => rej(fr.error);
  fr.readAsDataURL(blob);
});
function b64ToBlob(data, type) {
  const bin = atob(data);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type });
}

async function exportBackup() {
  const out = { app: 'aag-kids-learn', version: 1, date: new Date().toISOString(), settings: S, media: {} };
  for (const k of await idbKeys()) {
    const b = await getMedia(k);
    if (b) out.media[k] = { type: b.type, data: await blobToB64(b) };
  }
  const name = `kids-learn-backup-${out.date.slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name, class: 'hidden' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function importBackup(file) {
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch { data = null; }
  if (!data || data.app !== 'aag-kids-learn' || !data.settings) {
    alertBox('זה לא קובץ גיבוי של האפליקציה.');
    return;
  }
  if (!await askBox('הגיבוי יחליף את כל מה שיש עכשיו במכשיר הזה: שמות, תמונות, הקלטות והתקדמות. להמשיך?', 'שחזור')) return;
  try {
    for (const k of await idbKeys()) await delMedia(k);
    for (const [k, m] of Object.entries(data.media || {})) {
      if (/^(photo|voice):/.test(k) && m && m.data) await putMedia(k, b64ToBlob(m.data, m.type || ''));
    }
    LS.set('settings', data.settings);
    S = loadSettings();
    save();
    await loadMedia();
    rerender();
    toast('הגיבוי שוחזר');
  } catch (e) {
    console.warn(e);
    alertBox('השחזור נכשל. הנתונים במכשיר עלולים להיות חלקיים — אפשר לנסות שוב.');
  }
}

function SecBackup() {
  const file = h('input', { type: 'file', accept: '.json,application/json', class: 'hidden', onchange: e => importBackup(e.target.files[0]) });
  return Section('גיבוי והעברה',
    'קובץ הגיבוי כולל את השמות, התמונות, ההקלטות וההתקדמות. כך מעבירים הכול למכשיר אחר, או שומרים לפני מחיקת נתוני הדפדפן.',
    h('div', { class: 'row' }, h('span', null, 'שמירת גיבוי לקובץ'),
      h('button', { class: 'btn small', onclick: () => exportBackup().catch(() => alertBox('הגיבוי נכשל.')) }, 'שמירה')),
    h('div', { class: 'row' }, h('span', null, 'שחזור מקובץ גיבוי'),
      h('button', { class: 'btn small', onclick: () => file.click() }, 'בחירת קובץ'), file));
}

function SecInstall() {
  const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  return Section('התקנה במסך הבית', null,
    h('p', { class: 'note' }, standalone
      ? '✅ האפליקציה מותקנת ופועלת כאפליקציה עצמאית.'
      : 'באייפד: פותחים את הכתובת ב-Safari ← כפתור השיתוף ← "הוסף למסך הבית". בכרום (אנדרואיד או מחשב): תפריט ← "התקנת האפליקציה". אחרי ההתקנה האפליקציה נפתחת במסך מלא ועובדת גם בלי אינטרנט.'));
}

function SecAbout() {
  return Section('אודות', null,
    h('p', { class: 'note' }, 'תוכנה זו נעשתה על ידי משפחת גל-און (גגולאשווילי).'),
    h('p', { class: 'note' }, `גרסה ${APP_VERSION}. האפליקציה היא כלי למידה ומשחק, ואינה תחליף לטיפול מקצועי.`));
}

function Settings() {
  return h('main', { class: 'screen settings' },
    h('header', { class: 'bar' },
      h('div', { class: 'bar-side' }, h('button', { class: 'circle', onclick: goHome, 'aria-label': 'סגירה', html: ICON.close })),
      h('h1', null, 'הגדרות הורים'), h('div', { class: 'bar-side end' })),
    h('div', { class: 'settings-body' },
      SecLock(), SecTopics(), SecGame(), SecPeople('family'), SecPeople('friends'),
      SecSpeech(), SecProgress(), SecBackup(), SecInstall(), SecAbout()));
}

const SCREENS = { home: Home, menu: Menu, learn: Learn, game: Game, settings: Settings };

/* ---------- global events ---------- */
document.addEventListener('contextmenu', e => {
  if (!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) e.preventDefault();
});
document.addEventListener('gesturestart', e => e.preventDefault()); // Safari pinch zoom
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (route.name === 'learn') {
    if (e.key === 'ArrowRight') learnMove(route, 1);
    else if (e.key === 'ArrowLeft') learnMove(route, -1);
  }
  if (e.key === 'Escape' && route.name !== 'home' && !document.querySelector('.overlay')) back();
});

/* ---------- start ---------- */
(async function init() {
  render();
  await loadMedia();
  render();
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
