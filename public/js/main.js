/* StudyNest core: session, nav, toast, sound, real-time socket + alerts */
const snBus = new EventTarget();
let snSock = null;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const snAgo = t => { const s = (Date.now() - t) / 1000; return s < 60 ? 'just now' : s < 3600 ? Math.floor(s/60) + ' min ago' : s < 86400 ? Math.floor(s/3600) + ' h ago' : new Date(t).toLocaleDateString(); };
const snFire = (n, d) => snBus.dispatchEvent(new CustomEvent(n, { detail: d }));

/* ---- session ---- */
const snUser = () => { try { return JSON.parse(localStorage.getItem('sn_user')); } catch (e) { return null; } };
const snToken = () => localStorage.getItem('sn_token');
const snSetSession = r => { localStorage.setItem('sn_token', r.token); localStorage.setItem('sn_user', JSON.stringify(r.user)); };
const snDash = u => u.role === 'teacher' ? 'teacher-dashboard.html' : 'student-dashboard.html';
function snLogout() { localStorage.removeItem('sn_token'); localStorage.removeItem('sn_user'); location.href = 'index.html'; }
async function snApi(path, opts = {}) {
  const r = await fetch(path, { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (snToken() || '') },
    body: opts.body ? JSON.stringify(opts.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong.');
  return j;
}
function snRequireAuth(role) {
  const u = snUser();
  if (!u || !snToken()) { location.replace('login.html'); return null; }
  if (role && u.role !== role) { location.replace(snDash(u)); return null; }
  snApi('/api/me').then(me => { if (me.name !== u.name) localStorage.setItem('sn_user', JSON.stringify(me)); }).catch(() => snLogout());
  return u;
}

/* ---- toast ---- */
function snToast(msg, ms = 3500) {
  let box = $('toastBox');
  if (!box) { box = document.createElement('div'); box.id = 'toastBox'; box.className = 'toast-box'; document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
}

/* ---- sound (Web Audio, no files needed) ---- */
let snAudio = null;
const snCtx = () => { if (!snAudio) { const C = window.AudioContext || window.webkitAudioContext; if (C) snAudio = new C(); } return snAudio; };
['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { const c = snCtx(); if (c && c.state === 'suspended') c.resume(); }));
function snTone(f, start, dur, type, vol) {
  const c = snCtx(); if (!c || c.state !== 'running') return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start;
  o.type = type; o.frequency.value = f; o.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .02);
  g.gain.setValueAtTime(vol, t + dur - .03); g.gain.linearRampToValueAtTime(0, t + dur);
  o.start(t); o.stop(t + dur);
}
/* soft bell: sine + gentle overtone, quick soft attack, long smooth fade */
function snChime(f, start, vol) {
  const c = snCtx(); if (!c || c.state !== 'running') return;
  [[f, vol], [f * 2, vol * .25]].forEach(([fr, v]) => {
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start;
    o.type = 'sine'; o.frequency.value = fr; o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + .04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.start(t); o.stop(t + 1.7);
  });
}
function snRing(kind) {
  if (kind === 'teacher') { for (let i = 0; i < 4; i++) { snTone(880, i, .18, 'sine', .6); snTone(660, i + .22, .18, 'sine', .6); snTone(880, i + .44, .18, 'sine', .6); } }
  else { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => snChime(f, i * .28, .32)); }   // student: calm rising C-E-G-C chime
  if (navigator.vibrate) navigator.vibrate(kind === 'teacher' ? [300,150,300,150,300] : [200]);
}
function snNotify(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') { try { new Notification(title, { body, tag: title + body }); } catch (e) {} }
  if (document.hidden) { const old = document.title; let n = 0; const iv = setInterval(() => { document.title = n++ % 2 ? old : '🔔 ' + title; if (!document.hidden || n > 30) { clearInterval(iv); document.title = old; } }, 800); }
}
async function snEnableAlerts() {
  const c = snCtx(); if (c) await c.resume();
  snTone(880, 0, .15, 'sine', .4); snTone(1100, .18, .15, 'sine', .4);
  if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
  snFire('alerts:changed');
}
const snAlertsOn = () => !!(snAudio && snAudio.state === 'running');
function snAlertBar() {
  const bar = document.createElement('div'); bar.className = 'alert-bar';
  bar.innerHTML = '<span class="conn"><i></i><b>Connecting…</b></span><button type="button" class="btn btn-outline btn-sm"></button>';
  const dot = bar.querySelector('.conn'), txt = dot.querySelector('b'), btn = bar.querySelector('button');
  const upd = () => { const ok = snSock && snSock.connected; dot.className = 'conn ' + (ok ? 'on' : 'off'); txt.textContent = ok ? 'Live connection active' : 'Reconnecting…';
    btn.textContent = snAlertsOn() ? '✅ Sound & alerts on' : '🔊 Enable sound & desktop alerts'; };
  btn.onclick = snEnableAlerts;
  ['sock:connect', 'sock:disconnect', 'alerts:changed'].forEach(e => snBus.addEventListener(e, upd));
  document.addEventListener('pointerdown', () => setTimeout(upd, 200));
  upd(); setInterval(upd, 3000); return bar;
}
function snEmit(ev, data, cb) {
  if (!snSock || !snSock.connected) { snToast('Not connected to the server yet — please wait a moment and try again.'); return; }
  snSock.emit(ev, data, r => { if (r && r.error) snToast(r.error); cb && cb(r); });
}

/* ---- real-time connection (every page, so alerts work anywhere) ---- */
function snConnect() {
  const u = snUser(); if (!u || !snToken()) return;
  const s = document.createElement('script'); s.src = '/socket.io/socket.io.js';
  s.onerror = () => snToast('Cannot reach the StudyNest server. Start it with "npm start".', 7000);
  s.onload = () => {
    snSock = io({ auth: { token: snToken() } });
    snSock.on('connect', () => snFire('sock:connect'));
    snSock.on('disconnect', () => snFire('sock:disconnect'));
    snSock.on('connect_error', e => { if (e.message === 'auth') snLogout(); });
    snSock.onAny((ev, d) => snFire(ev, d));
  };
  document.head.appendChild(s);
}
snBus.addEventListener('doubt:new', e => {
  const d = e.detail; snRing('teacher');
  snToast('🔔 New doubt from ' + d.studentName + ' · ' + d.subject, 7000);
  snNotify('New doubt · ' + d.subject, d.studentName + ': ' + d.message);
});
snBus.addEventListener('doubt:accepted', e => {
  const d = e.detail; snRing('student');
  snToast('🙋 ' + d.teacherName + ' is available now for your doubt!', 8000);
  snNotify('Teacher is available', d.teacherName + ' is ready to help with your ' + d.subject + ' doubt.');
});

/* ---- navbar ---- */
document.addEventListener('DOMContentLoaded', () => {
  if (location.protocol === 'file:') {
    const b = document.createElement('div'); b.className = 'file-banner';
    b.innerHTML = '⚠️ Opened as a file. Run <code>npm start</code> in the project folder, then open <b>http://localhost:3000</b>.';
    document.body.prepend(b);
  }
  const u = snUser(), area = $('authArea');
  if (area) area.innerHTML = u
    ? '<span class="user-chip">👤 ' + esc(u.name.split(' ')[0]) + ' · ' + u.role + '</span><a class="btn btn-outline btn-sm" href="' + snDash(u) + '">Dashboard</a><button class="btn btn-outline btn-sm" id="logoutBtn" type="button">Log out</button>'
    : '<a class="btn btn-outline btn-sm" href="login.html">Log in</a><a class="btn btn-amber btn-sm" href="signup.html">Sign up</a>';
  if ($('logoutBtn')) $('logoutBtn').onclick = snLogout;
  const links = document.querySelector('.nav-links');
  if (u && links) { const li = document.createElement('li'); li.innerHTML = '<a class="doubt-link" href="' + snDash(u) + '#doubts">🔔 ' + (u.role === 'teacher' ? 'Doubt Inbox' : 'Ask a Doubt') + '</a>'; links.appendChild(li); }
  document.querySelectorAll('[data-guest]').forEach(el => el.hidden = !!u);
  document.querySelectorAll('[data-dash]').forEach(el => { el.hidden = !u; if (u) el.href = snDash(u) + '#doubts'; });
  document.querySelectorAll('[data-doubt]').forEach(a => {   // sidebar "Raise a Doubt" button: goes to the right place for each role
    if (u) { a.href = snDash(u) + '#doubts'; a.querySelector('span').textContent = u.role === 'teacher' ? 'Doubt Inbox' : 'Raise a Doubt'; }
    else a.href = 'login.html';
  });
  const tg = document.querySelector('.nav-toggle');
  if (tg) tg.onclick = () => document.querySelector('.navbar').classList.toggle('open');
  snConnect();
});

/* Teacher's "😴 Busy" button -> plays the custom sound on the student's device */
snBus.addEventListener('doubt:nudged', e => {
  const d = e.detail;
  const a = new Audio('sounds/ping.mp3'); a.volume = 1;
  a.play().catch(() => snChime(880, 0, .35));   // soft chime if the browser blocks the file
  if (navigator.vibrate) navigator.vibrate([200]);
  snToast('😴 ' + d.teacherName + ' is busy right now — they will get to your ' + d.subject + ' doubt soon', 7000);
  snNotify('Teacher is busy right now', d.teacherName + ' will get to your ' + d.subject + ' doubt soon.');
});
