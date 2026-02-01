'use strict';

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DB_PATH = path.join(DATA_DIR, 'drift.db');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL CHECK(length(username) BETWEEN 3 AND 32),
  password TEXT NOT NULL,
  avatar TEXT,
  music_provider TEXT DEFAULT 'spotify',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  created_by INTEGER NOT NULL,
  used_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (used_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  label TEXT CHECK(length(label) <= 64),
  color TEXT CHECK(length(color) <= 32),
  minutes INTEGER NOT NULL CHECK(minutes > 0 AND minutes <= 1440),
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS friends (
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id != friend_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS active_timers (
  user_id INTEGER PRIMARY KEY,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  label TEXT,
  is_paused INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code);
`);

try {
  db.exec(`ALTER TABLE users ADD COLUMN music_provider TEXT DEFAULT 'spotify'`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE active_timers ADD COLUMN is_paused INTEGER DEFAULT 0`);
} catch (e) {}

const adminCheck = db.prepare('SELECT 1 FROM users WHERE username = ?').get('admin');
if (!adminCheck) {
  const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
  const hash = bcrypt.hashSync(adminPassword, 12);
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hash);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`\n⚠️  Admin account created\n    Username: admin\n    Password: ${adminPassword}\n`);
  }
}

app.disable('x-powered-by');
app.set('trust proxy', 1);

const limiter = new Map();
const rateLimitWindow = 60000;
const maxRequests = 5000;

const rateLimit = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const userLimit = limiter.get(ip) || { count: 0, resetTime: now + rateLimitWindow };

  if (now > userLimit.resetTime) {
    limiter.set(ip, { count: 1, resetTime: now + rateLimitWindow });
    return next();
  }

  if (userLimit.count >= maxRequests) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  userLimit.count++;
  next();
};

app.use(rateLimit);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

const sessionSecret = process.env.SESSION_SECRET || (() => {
  const secret = crypto.randomBytes(64).toString('hex');
  console.log(`\n⚠️  Generated session secret. Add to .env:\n    SESSION_SECRET=${secret}\n`);
  return secret;
})();

app.use(session({
  name: 'drift.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
}));

app.use(express.static(PUBLIC_DIR, {
  maxAge: '1h',
  etag: true,
  lastModified: true
}));

app.use('/uploads', express.static(UPLOADS_DIR, {
  fallthrough: false,
  maxAge: '7d',
  etag: true
}));

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
    const allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

    if (!allowedExts.includes(ext)) {
      return cb(new Error('Invalid file type'));
    }
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Invalid MIME type'));
    }
    cb(null, true);
  }
});

const auth = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const adminAuth = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.session.userId);
  if (!user || user.username !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const loginAttempts = new Map();
const maxLoginAttempts = 5;
const lockoutDuration = 15 * 60 * 1000;

app.post('/api/register', (req, res) => {
  const { username, password, inviteCode } = req.body;

  if (!username || !password || !inviteCode) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  if (typeof username !== 'string' || typeof password !== 'string' || typeof inviteCode !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }

  if (username.length < 3 || username.length > 32) {
    return res.status(400).json({ error: 'Username must be 3-32 characters' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, - and _' });
  }

  const invite = db.prepare(
    'SELECT * FROM invites WHERE code = ? AND used_by IS NULL'
  ).get(inviteCode);

  if (!invite) {
    return res.status(400).json({ error: 'Invalid or used invite code' });
  }

  const hash = bcrypt.hashSync(password, 12);

  try {
    const result = db.prepare(
      'INSERT INTO users (username, password) VALUES (?, ?)'
    ).run(username, hash);

    db.prepare(
      'UPDATE invites SET used_by = ? WHERE code = ?'
    ).run(result.lastInsertRowid, inviteCode);

    res.json({ success: true });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  const attempts = loginAttempts.get(ip);
  if (attempts && attempts.count >= maxLoginAttempts && Date.now() < attempts.lockUntil) {
    const minutesLeft = Math.ceil((attempts.lockUntil - Date.now()) / 60000);
    return res.status(429).json({ error: `Too many attempts. Try again in ${minutesLeft} minutes.` });
  }

  const user = db.prepare(
    'SELECT * FROM users WHERE username = ?'
  ).get(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    const current = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
    current.count++;
    if (current.count >= maxLoginAttempts) {
      current.lockUntil = Date.now() + lockoutDuration;
    }
    loginAttempts.set(ip, current);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  loginAttempts.delete(ip);
  req.session.userId = user.id;
  res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/me', auth, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, avatar, music_provider FROM users WHERE id = ?'
  ).get(req.session.userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

app.post('/api/upload-avatar', auth, upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const user = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.session.userId);
  if (user.avatar) {
    const oldPath = path.join(UPLOADS_DIR, user.avatar);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(req.file.filename, req.session.userId);

  res.json({ avatar: req.file.filename });
});

app.post('/api/update-music-provider', auth, (req, res) => {
  const { provider } = req.body;

  const validProviders = ['spotify', 'apple', 'youtube', 'soundcloud', 'none'];
  if (!validProviders.includes(provider)) {
    return res.status(400).json({ error: 'Invalid music provider' });
  }

  db.prepare('UPDATE users SET music_provider = ? WHERE id = ?').run(provider, req.session.userId);
  res.json({ success: true });
});

app.post('/api/generate-invite', auth, (req, res) => {
  const code = `DRIFT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  try {
    db.prepare(
      'INSERT INTO invites (code, created_by) VALUES (?, ?)'
    ).run(code, req.session.userId);

    res.json({ code });
  } catch (err) {
    console.error('Generate invite error:', err);
    res.status(500).json({ error: 'Failed to generate invite' });
  }
});

app.get('/api/my-invites', auth, (req, res) => {
  const invites = db.prepare(
    'SELECT code, created_at, used_by FROM invites WHERE created_by = ? ORDER BY created_at DESC'
  ).all(req.session.userId);

  res.json(invites);
});

app.post('/api/sessions', auth, (req, res) => {
  const { label, color, minutes, date, time } = req.body;

  if (!label || !color || !minutes || !date || !time) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  if (minutes < 1 || minutes > 1440) {
    return res.status(400).json({ error: 'Invalid minutes' });
  }

  try {
    db.prepare(
      'INSERT INTO sessions (user_id, label, color, minutes, date, time) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.session.userId, label, color, minutes, date, time);

    res.json({ success: true });
  } catch (err) {
    console.error('Session save error:', err);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

app.get('/api/sessions', auth, (req, res) => {
  const sessions = db.prepare(
    'SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC, time DESC'
  ).all(req.session.userId);

  res.json(sessions);
});

app.post('/api/timer-start', auth, (req, res) => {
  const { label } = req.body;

  try {
    db.prepare(
      'INSERT OR REPLACE INTO active_timers (user_id, label, started_at, is_paused) VALUES (?, ?, CURRENT_TIMESTAMP, 0)'
    ).run(req.session.userId, label || 'focus');

    res.json({ success: true });
  } catch (err) {
    console.error('Timer start error:', err);
    res.status(500).json({ error: 'Failed to start timer' });
  }
});

app.post('/api/timer-pause', auth, (req, res) => {
  try {
    db.prepare('UPDATE active_timers SET is_paused = 1 WHERE user_id = ?').run(req.session.userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Timer pause error:', err);
    res.status(500).json({ error: 'Failed to pause timer' });
  }
});

app.post('/api/timer-resume', auth, (req, res) => {
  try {
    db.prepare('UPDATE active_timers SET is_paused = 0 WHERE user_id = ?').run(req.session.userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Timer resume error:', err);
    res.status(500).json({ error: 'Failed to resume timer' });
  }
});

app.post('/api/timer-stop', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM active_timers WHERE user_id = ?').run(req.session.userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Timer stop error:', err);
    res.status(500).json({ error: 'Failed to stop timer' });
  }
});

app.post('/api/add-friend', auth, (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Missing invite code' });
  }

  const invite = db.prepare(
    'SELECT created_by FROM invites WHERE code = ?'
  ).get(code);

  if (!invite) {
    return res.status(400).json({ error: 'Invalid invite code' });
  }

  const friendId = invite.created_by;

  if (friendId === req.session.userId) {
    return res.status(400).json({ error: 'Cannot add yourself' });
  }

  const existing = db.prepare(
    'SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?'
  ).get(req.session.userId, friendId);

  if (existing) {
    return res.status(400).json({ error: 'Already friends' });
  }

  try {
    db.prepare(
      'INSERT INTO friends (user_id, friend_id) VALUES (?, ?), (?, ?)'
    ).run(req.session.userId, friendId, friendId, req.session.userId);

    res.json({ success: true });
  } catch (err) {
    console.error('Add friend error:', err);
    res.status(500).json({ error: 'Failed to add friend' });
  }
});

app.get('/api/friends', auth, (req, res) => {
  const friends = db.prepare(`
    SELECT u.id, u.username, u.avatar, u.music_provider,
           CASE WHEN at.user_id IS NOT NULL AND at.is_paused = 0 THEN 1 ELSE 0 END as is_active,
           at.label as active_label
    FROM friends f
    JOIN users u ON u.id = f.friend_id
    LEFT JOIN active_timers at ON at.user_id = u.id
    WHERE f.user_id = ?
    ORDER BY is_active DESC, u.username ASC
  `).all(req.session.userId);

  res.json(friends);
});

app.get('/api/friend-stats/:friendId', auth, (req, res) => {
  const friendId = parseInt(req.params.friendId);

  const isFriend = db.prepare(
    'SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?'
  ).get(req.session.userId, friendId);

  if (!isFriend) {
    return res.status(403).json({ error: 'Not friends' });
  }

  const today = new Date().toISOString().split('T')[0];
  const todayMinutes = db.prepare(
    'SELECT SUM(minutes) as total FROM sessions WHERE user_id = ? AND date = ?'
  ).get(friendId, today);

  let streak = 0;
  let currentDate = new Date();
  while (streak < 365) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const session = db.prepare(
      'SELECT 1 FROM sessions WHERE user_id = ? AND date = ? LIMIT 1'
    ).get(friendId, dateStr);
    if (!session) break;
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  res.json({
    todayMinutes: todayMinutes?.total || 0,
    streak
  });
});

app.get('/api/leaderboard/:period', auth, (req, res) => {
  const { period } = req.params;
  const allowedPeriods = ['daily', 'weekly', 'monthly', 'alltime'];

  if (!allowedPeriods.includes(period)) {
    return res.status(400).json({ error: 'Invalid period' });
  }

  let dateFilter = '';
  if (period === 'daily') dateFilter = "date('now')";
  else if (period === 'weekly') dateFilter = "date('now', '-7 days')";
  else if (period === 'monthly') dateFilter = "date('now', '-30 days')";

  const friends = db.prepare(
    'SELECT friend_id FROM friends WHERE user_id = ?'
  ).all(req.session.userId);

  const userIds = [req.session.userId, ...friends.map(f => f.friend_id)];

  const leaderboard = userIds.map(uid => {
    const user = db.prepare(
      'SELECT username, avatar FROM users WHERE id = ?'
    ).get(uid);

    if (!user) return null;

    const query = dateFilter ?
      `SELECT SUM(minutes) as total FROM sessions WHERE user_id = ? AND date >= ${dateFilter}` :
      'SELECT SUM(minutes) as total FROM sessions WHERE user_id = ?';

    const total = db.prepare(query).get(uid);

    let streak = 0;
    let currentDate = new Date();
    while (streak < 365) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const session = db.prepare(
        'SELECT 1 FROM sessions WHERE user_id = ? AND date = ? LIMIT 1'
      ).get(uid, dateStr);
      if (!session) break;
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return {
      id: uid,
      username: user.username,
      avatar: user.avatar,
      minutes: total?.total || 0,
      streak,
      isYou: uid === req.session.userId
    };
  }).filter(Boolean).sort((a, b) => b.minutes - a.minutes);

  res.json(leaderboard);
});

app.get('/api/admin/users', adminAuth, (req, res) => {
  const users = db.prepare(`
    SELECT
      u.id,
      u.username,
      u.avatar,
      u.created_at,
      COUNT(DISTINCT s.id) as sessions,
      COALESCE(SUM(s.minutes), 0) as totalMinutes
    FROM users u
    LEFT JOIN sessions s ON s.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();

  const usersWithStreak = users.map(user => {
    let streak = 0;
    let currentDate = new Date();
    while (streak < 365) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const session = db.prepare(
        'SELECT 1 FROM sessions WHERE user_id = ? AND date = ? LIMIT 1'
      ).get(user.id, dateStr);
      if (!session) break;
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }
    return { ...user, streak };
  });

  res.json(usersWithStreak);
});

app.get('/api/admin/sessions', adminAuth, (req, res) => {
  const sessions = db.prepare(`
    SELECT
      s.id,
      s.label,
      s.color,
      s.minutes,
      s.date,
      s.time,
      u.username
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    ORDER BY s.date DESC, s.time DESC
    LIMIT 1000
  `).all();

  res.json(sessions);
});

app.get('/api/admin/invites', adminAuth, (req, res) => {
  const invites = db.prepare(`
    SELECT
      i.code,
      i.created_at,
      creator.username as created_by,
      user.username as used_by
    FROM invites i
    JOIN users creator ON creator.id = i.created_by
    LEFT JOIN users user ON user.id = i.used_by
    ORDER BY i.created_at DESC
  `).all();

  res.json(invites);
});

app.post('/api/admin/create-user', adminAuth, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }

  if (username.length < 3 || username.length > 32) {
    return res.status(400).json({ error: 'Username must be 3-32 characters' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, - and _' });
  }

  const hash = bcrypt.hashSync(password, 12);

  try {
    db.prepare(
      'INSERT INTO users (username, password) VALUES (?, ?)'
    ).run(username, hash);

    res.json({ success: true });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.delete('/api/admin/users/:id', adminAuth, (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.username === 'admin') {
    return res.status(400).json({ error: 'Cannot delete admin user' });
  }

  try {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM friends WHERE user_id = ? OR friend_id = ?').run(userId, userId);
    db.prepare('UPDATE invites SET used_by = NULL WHERE used_by = ?').run(userId);
    db.prepare('DELETE FROM active_timers WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`\n✓ Drift running on http://localhost:${PORT}\n`);
});

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('\n⏳ Shutting down gracefully...');
  server.close(() => {
    db.close();
    console.log('✓ Server closed\n');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('⚠️  Forced shutdown');
    process.exit(1);
  }, 10000);
}