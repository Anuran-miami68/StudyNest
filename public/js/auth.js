function snMsg(id, text) { const m = $(id); m.textContent = text; m.className = 'form-msg show err'; }
(function () {
  const u = snUser(); if (u && snToken()) { location.replace(snDash(u)); return; }
  const down = 'Server not running — start it with "npm start".';
  const lf = $('loginForm'), sf = $('signupForm');
  if (lf) { const r = localStorage.getItem('sn_remember'); if (r) $('email').value = r;
    lf.addEventListener('submit', () => { $('remember').checked ? localStorage.setItem('sn_remember', $('email').value.trim()) : localStorage.removeItem('sn_remember'); }); }
  if (lf) lf.onsubmit = async e => { e.preventDefault();
    try { snSetSession(await snApi('/api/login', { method: 'POST', body: { email: $('email').value, password: $('password').value } })); location.href = snDash(snUser()); }
    catch (err) { snMsg('loginMsg', err.message === 'Failed to fetch' ? down : err.message); } };
  if (sf) sf.onsubmit = async e => { e.preventDefault();
    if ($('password').value !== $('confirm').value) return snMsg('signupMsg', 'Passwords do not match.');
    try { snSetSession(await snApi('/api/signup', { method: 'POST', body: { name: $('name').value, email: $('email').value, password: $('password').value, role: sf.role.value } })); location.href = snDash(snUser()); }
    catch (err) { snMsg('signupMsg', err.message === 'Failed to fetch' ? down : err.message); } };
})();
