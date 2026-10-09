// StudyNest server: static files + auth API + real-time doubts (Socket.io)
const express = require('express'), http = require('http'), crypto = require('crypto');
const fs = require('fs'), path = require('path'), { Server } = require('socket.io');
const app = express(), server = http.createServer(app), io = new Server(server);
const DB = process.env.DATA_FILE || path.join(__dirname, 'data.json');   // set DATA_FILE to a persistent-disk path when hosting
let db = { users: [], sessions: {}, doubts: [] };
try { db = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch (e) {}
// atomic save: write a temp file, then rename, so data.json can never be half-written
const save = () => { try { fs.writeFileSync(DB + '.tmp', JSON.stringify(db)); fs.renameSync(DB + '.tmp', DB); } catch (e) { console.error('save failed', e.message); } };
const hash = (p, s = crypto.randomBytes(8).toString('hex')) => s + ':' + crypto.scryptSync(p, s, 32).toString('hex');
const verify = (p, h) => hash(p, h.split(':')[0]) === h;
const uid = () => crypto.randomBytes(6).toString('hex');
const pub = u => ({ id: u.id, name: u.name, email: u.email, role: u.role });
// remove the old built-in demo accounts (and their sessions/doubts) if an existing data.json still has them
const DEMO_EMAILS = ['student@studynest.com', 'teacher@studynest.com'];
const demoIds = db.users.filter(u => DEMO_EMAILS.includes(u.email)).map(u => u.id);
if (demoIds.length) {
  db.users = db.users.filter(u => !demoIds.includes(u.id));
  Object.keys(db.sessions).forEach(t => { if (demoIds.includes(db.sessions[t])) delete db.sessions[t]; });
  db.doubts = db.doubts.filter(d => !demoIds.includes(d.studentId));
  save();
}
const login = u => { const t = crypto.randomBytes(24).toString('hex'); db.sessions[t] = u.id; save(); return { token: t, user: pub(u) }; };
const userFor = t => db.users.find(u => u.id === db.sessions[t]);
const auth = (req, res, next) => {
  const u = userFor((req.headers.authorization || '').replace('Bearer ', ''));
  if (!u) return res.status(401).json({ error: 'Please log in again.' });
  req.user = u; next();
};
app.use(express.json());
app.get('/healthz', (req, res) => res.send('ok'));   // for hosting health checks
app.post('/api/signup', (req, res) => {
  const { name = '', email = '', password = '', role = 'student' } = req.body || {};
  const em = email.trim().toLowerCase();
  if (name.trim().length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!/^\S+@\S+\.\S+$/.test(em)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (db.users.some(u => u.email === em)) return res.status(409).json({ error: 'An account with this email already exists.' });
  const u = { id: uid(), name: name.trim(), email: em, role: role === 'teacher' ? 'teacher' : 'student', pass: hash(password) };
  db.users.push(u); res.json(login(u));
});
app.post('/api/login', (req, res) => {
  const { email = '', password = '' } = req.body || {};
  const u = db.users.find(x => x.email === email.trim().toLowerCase());
  if (!u || !verify(password, u.pass)) return res.status(401).json({ error: 'Incorrect email or password.' });
  res.json(login(u));
});
app.get('/api/me', auth, (req, res) => res.json(pub(req.user)));
app.get('/api/doubts', auth, (req, res) => {
  const list = req.user.role === 'teacher' ? db.doubts : db.doubts.filter(d => d.studentId === req.user.id);
  res.json(list.slice().sort((a, b) => b.createdAt - a.createdAt));
});
app.use(express.static(path.join(__dirname, 'public')));

io.use((socket, next) => {
  const u = userFor(socket.handshake.auth && socket.handshake.auth.token);
  if (!u) return next(new Error('auth'));
  socket.user = u; next();
});
io.on('connection', socket => {
  const u = socket.user;
  socket.join(u.role === 'teacher' ? 'teachers' : 'student:' + u.id);
  const push = d => { io.to('teachers').emit('doubt:updated', d); io.to('student:' + d.studentId).emit('doubt:updated', d); };

  socket.on('doubt:raise', (data, ack) => {
    if (u.role !== 'student') return ack && ack({ error: 'Only students can raise doubts.' });
    const message = String((data && data.message) || '').trim().slice(0, 1000);
    if (!message) return ack && ack({ error: 'Please type your question.' });
    const d = { id: uid(), studentId: u.id, studentName: u.name, subject: String(data.subject || 'General').slice(0, 60),
      message, status: 'pending', teacherName: null, createdAt: Date.now() };
    db.doubts.push(d); save();
    io.to('teachers').emit('doubt:new', d);                 // rings on every teacher device
    io.to('student:' + u.id).emit('doubt:updated', d);
    ack && ack({ ok: true, doubt: d });
  });
  socket.on('doubt:accept', (id, ack) => {                   // teacher: "I'm available now"
    const d = db.doubts.find(x => x.id === id);
    if (u.role !== 'teacher' || !d) return ack && ack({ error: 'Not found.' });
    if (d.status === 'pending') {
      d.status = 'accepted'; d.teacherName = u.name; d.acceptedAt = Date.now(); save();
      push(d);
      io.to('student:' + d.studentId).emit('doubt:accepted', d); // rings on every student device
    }
    ack && ack({ ok: true, doubt: d });
  });
  socket.on('doubt:resolve', (id, ack) => {
    const d = db.doubts.find(x => x.id === id);
    if (u.role !== 'teacher' || !d) return ack && ack({ error: 'Not found.' });
    d.status = 'resolved'; d.teacherName = d.teacherName || u.name; d.resolvedAt = Date.now(); save();
    push(d); ack && ack({ ok: true, doubt: d });
  });
  const lastPing = {};
  socket.on('doubt:nudge', (id, ack) => {                    // teacher: small "Ping" button
    const d = db.doubts.find(x => x.id === id);
    if (u.role !== 'teacher' || !d || d.status === 'resolved') return ack && ack({ error: 'Cannot ping this doubt.' });
    const now = Date.now();
    if (now - (lastPing[id] || 0) < 3000) return ack && ack({ ok: true });   // anti-spam
    lastPing[id] = now;
    io.to('student:' + d.studentId).emit('doubt:nudged', { id: d.id, subject: d.subject, teacherName: u.name });
    ack && ack({ ok: true });
  });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log('StudyNest running → http://localhost:' + PORT));
