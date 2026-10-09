/* Doubt feature UI. Real-time delivery + ringing live in main.js */
const SN_STATUS = { pending: ['⏳ Waiting for a teacher', 'pending'], accepted: ['🙋 Teacher is available', 'accepted'], resolved: ['✅ Resolved', 'resolved'] };
function snStats(l) { const set = (id, v) => { const e = $(id); if (e) e.textContent = v; }; set('statTotal', l.length); set('statPending', l.filter(d => d.status === 'pending').length); set('statResolved', l.filter(d => d.status === 'resolved').length); }
function snUpsert(list, d) { const i = list.findIndex(x => x.id === d.id); if (i >= 0) list[i] = d; else list.unshift(d); }

function initStudentDoubtForm(user) {
  let doubts = []; const list = $('myDoubtsList'), form = $('doubtForm');
  form.before(snAlertBar());
  const render = () => { snStats(doubts); list.innerHTML = doubts.length ? doubts.map(d => {
    const s = SN_STATUS[d.status];
    return '<div class="doubt-item ' + s[1] + '"><div class="doubt-top"><span class="tag">' + esc(d.subject) + '</span><span class="status ' + s[1] + '">' + s[0] + '</span></div><p>' + esc(d.message) + '</p><small>' + snAgo(d.createdAt) +
      (d.teacherName ? ' · ' + (d.status === 'accepted' ? '<b>' + esc(d.teacherName) + ' is ready to help you now</b>' : 'answered by ' + esc(d.teacherName)) : '') + '</small></div>';
  }).join('') : '<p class="muted">No doubts yet — raise your first one above.</p>'; };
  const load = () => snApi('/api/doubts').then(r => { doubts = r; render(); }).catch(() => {});
  load(); snBus.addEventListener('sock:connect', load);
  snBus.addEventListener('doubt:updated', e => { snUpsert(doubts, e.detail); render(); });
  setInterval(render, 30000);
  form.onsubmit = e => { e.preventDefault(); const m = $('message');
    if (!m.value.trim()) return;
    snEmit('doubt:raise', { subject: $('subject').value, message: m.value }, r => { if (r && r.ok) { m.value = ''; snToast('Doubt sent — your teacher has been notified instantly.'); } }); };
}

function initTeacherDoubtPanel() {
  let doubts = []; const panel = $('doubtsPanel'), bell = $('bellCount');
  $('enableNotifBtn').replaceWith(snAlertBar());
  const order = { pending: 0, accepted: 1, resolved: 2 };
  const render = () => {
    const p = doubts.filter(d => d.status === 'pending').length; snStats(doubts);
    bell.textContent = p; bell.style.display = p ? 'flex' : 'none';
    const sorted = doubts.slice().sort((a, b) => order[a.status] - order[b.status] || b.createdAt - a.createdAt);
    panel.innerHTML = sorted.length ? sorted.map(d => {
      const s = SN_STATUS[d.status];
      const btns = d.status === 'pending' ? '<button class="btn btn-amber btn-sm" data-a="accept" data-id="' + d.id + '">🙋 I\'m available now</button><button class="btn btn-outline btn-sm btn-ping" data-a="nudge" data-id="' + d.id + '" title="Tell the student you are busy right now">😴 Busy</button>'
        : d.status === 'accepted' ? '<button class="btn btn-outline btn-sm" data-a="resolve" data-id="' + d.id + '">✔ Mark resolved</button><button class="btn btn-outline btn-sm btn-ping" data-a="nudge" data-id="' + d.id + '" title="Tell the student you are busy right now">😴 Busy</button>' : '';
      return '<div class="doubt-item ' + s[1] + '"><div class="doubt-top"><span><b>' + esc(d.studentName) + '</b> <span class="tag">' + esc(d.subject) + '</span></span><span class="status ' + s[1] + '">' + s[0] + '</span></div><p>' + esc(d.message) + '</p><small>' + snAgo(d.createdAt) + (d.teacherName ? ' · ' + esc(d.teacherName) : '') + '</small><div class="doubt-actions">' + btns + '</div></div>';
    }).join('') : '<p class="muted">No doubts yet. They will appear here the moment a student raises one.</p>';
  };
  const load = () => snApi('/api/doubts').then(r => { doubts = r; render(); }).catch(() => {});
  load(); snBus.addEventListener('sock:connect', load);
  ['doubt:new', 'doubt:updated'].forEach(n => snBus.addEventListener(n, e => { snUpsert(doubts, e.detail); render(); }));
  panel.onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return;
    snEmit('doubt:' + b.dataset.a, b.dataset.id, r => { if (r && r.ok && b.dataset.a === 'accept') snToast('Student notified — they have been told you are available.'); if (r && r.ok && b.dataset.a === 'nudge') snToast('Student told you are busy right now.'); }); };
  document.querySelector('.bell-btn').onclick = () => panel.scrollIntoView({ behavior: 'smooth' });
  setInterval(render, 30000);
}
