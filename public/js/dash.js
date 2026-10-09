/* dashboard helpers: avatar initial + top search jump */
(function () {
  const u = snUser();
  if (u && $('avatar') && $('avatar').dataset.initial !== 'no') $('avatar').textContent = u.name.trim()[0].toUpperCase();
  const map = { home: 'index.html', live: 'live-classes.html', record: 'recorded-classes.html', video: 'recorded-classes.html', note: 'notes.html', test: 'test-series.html', quiz: 'test-series.html', contact: 'contact.html', doubt: u ? (u.role === 'teacher' ? 'teacher-dashboard.html#doubts' : 'student-dashboard.html#doubts') : 'login.html' };
  const s = $('dsearch'); if (!s) return;
  s.addEventListener('keydown', e => { if (e.key !== 'Enter') return; const q = s.value.trim().toLowerCase(); if (!q) return;
    const k = Object.keys(map).find(k => q.includes(k) || k.includes(q));
    if (k) location.href = map[k]; else snToast('No page found for "' + q + '". Try notes, live, recorded, tests or doubt.'); });
})();
