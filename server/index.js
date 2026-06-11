import 'dotenv/config';
import express from 'express';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedMeds } from './seedMeds.js';
import { extractMedsFromDocument } from './extract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'flopsy.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meds (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    dose TEXT NOT NULL DEFAULT '',
    timing TEXT NOT NULL DEFAULT '',
    instructions TEXT NOT NULL DEFAULT '',
    short_term INTEGER NOT NULL DEFAULT 0,
    end_date TEXT,
    color TEXT NOT NULL DEFAULT 'coral',
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS dose_log (
    user_id TEXT NOT NULL REFERENCES users(id),
    day TEXT NOT NULL,
    med_id TEXT NOT NULL,
    given INTEGER NOT NULL DEFAULT 0,
    given_at TEXT,
    note TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (user_id, day, med_id)
  );
`);

// JWT secret persists across restarts so sessions survive a server reboot.
const secretFile = path.join(dataDir, 'jwt-secret');
const JWT_SECRET =
  process.env.JWT_SECRET ??
  (fs.existsSync(secretFile)
    ? fs.readFileSync(secretFile, 'utf8')
    : (() => {
        const s = crypto.randomBytes(32).toString('hex');
        fs.writeFileSync(secretFile, s, { mode: 0o600 });
        return s;
      })());

const app = express();
app.use(express.json({ limit: '30mb' })); // base64 PDFs/photos can be large
app.use(cookieParser());

function setAuthCookie(res, userId) {
  const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 });
}

function requireAuth(req, res, next) {
  try {
    const payload = jwt.verify(req.cookies.token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Not signed in' });
  }
}

function rowToMed(row) {
  return {
    id: row.id,
    name: row.name,
    dose: row.dose,
    timing: row.timing,
    instructions: row.instructions,
    shortTerm: Boolean(row.short_term),
    endDate: row.end_date,
    color: row.color,
    active: Boolean(row.active),
    sortOrder: row.sort_order,
  };
}

const insertMed = db.prepare(`
  INSERT INTO meds (id, user_id, name, dose, timing, instructions, short_term, end_date, color, active, sort_order)
  VALUES (@id, @userId, @name, @dose, @timing, @instructions, @shortTerm, @endDate, @color, @active, @sortOrder)
`);

function createMed(userId, med) {
  const maxRow = db.prepare('SELECT MAX(sort_order) AS max FROM meds WHERE user_id = ?').get(userId);
  const record = {
    id: crypto.randomUUID(),
    userId,
    name: med.name ?? '',
    dose: med.dose ?? '',
    timing: med.timing ?? '',
    instructions: med.instructions ?? '',
    shortTerm: med.shortTerm ? 1 : 0,
    endDate: med.endDate ?? null,
    color: med.color ?? 'coral',
    active: 1,
    sortOrder: (maxRow?.max ?? 0) + 1,
  };
  insertMed.run(record);
  return rowToMed(db.prepare('SELECT * FROM meds WHERE id = ?').get(record.id));
}

// ---- Auth ----

app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !/.+@.+\..+/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

  const userId = crypto.randomUUID();
  db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    userId,
    email.toLowerCase(),
    bcrypt.hashSync(password, 10),
    new Date().toISOString(),
  );
  // New accounts start with Flopsy's current discharge meds, in dose order.
  const seedAll = db.transaction(() => {
    for (const med of seedMeds) createMed(userId, med);
  });
  seedAll();

  setAuthCookie(res, userId);
  res.json({ email: email.toLowerCase() });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get((email ?? '').toLowerCase());
  if (!user || !bcrypt.compareSync(password ?? '', user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  setAuthCookie(res, user.id);
  res.json({ email: user.email });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.status(204).end();
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  res.json({ email: user.email });
});

// ---- State ----

app.get('/api/state', requireAuth, (req, res) => {
  const meds = db
    .prepare('SELECT * FROM meds WHERE user_id = ? ORDER BY sort_order')
    .all(req.userId)
    .map(rowToMed);
  const doseLog = {};
  for (const row of db.prepare('SELECT * FROM dose_log WHERE user_id = ?').all(req.userId)) {
    doseLog[row.day] ??= {};
    doseLog[row.day][row.med_id] = {
      given: Boolean(row.given),
      givenAt: row.given_at,
      note: row.note,
    };
  }
  res.json({ meds, doseLog });
});

// ---- Meds CRUD ----

app.post('/api/meds', requireAuth, (req, res) => {
  if (!req.body?.name?.trim()) return res.status(400).json({ error: 'Name is required.' });
  res.json(createMed(req.userId, req.body));
});

const MED_FIELDS = {
  name: 'name',
  dose: 'dose',
  timing: 'timing',
  instructions: 'instructions',
  shortTerm: 'short_term',
  endDate: 'end_date',
  color: 'color',
  active: 'active',
};

app.put('/api/meds/:id', requireAuth, (req, res) => {
  const med = db.prepare('SELECT * FROM meds WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!med) return res.status(404).json({ error: 'Medication not found.' });

  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(MED_FIELDS)) {
    if (key in req.body) {
      sets.push(`${column} = ?`);
      const v = req.body[key];
      values.push(typeof v === 'boolean' ? (v ? 1 : 0) : v);
    }
  }
  if (sets.length) {
    db.prepare(`UPDATE meds SET ${sets.join(', ')} WHERE id = ?`).run(...values, req.params.id);
  }
  res.json(rowToMed(db.prepare('SELECT * FROM meds WHERE id = ?').get(req.params.id)));
});

app.delete('/api/meds/:id', requireAuth, (req, res) => {
  const med = db.prepare('SELECT id FROM meds WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!med) return res.status(404).json({ error: 'Medication not found.' });
  db.prepare('DELETE FROM dose_log WHERE med_id = ? AND user_id = ?').run(req.params.id, req.userId);
  db.prepare('DELETE FROM meds WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// Swap sort order with the neighbor above/below, then return the full ordered list.
app.post('/api/meds/:id/move', requireAuth, (req, res) => {
  const { direction } = req.body ?? {};
  const med = db.prepare('SELECT * FROM meds WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!med) return res.status(404).json({ error: 'Medication not found.' });

  const neighbor = db
    .prepare(
      direction === 'up'
        ? 'SELECT * FROM meds WHERE user_id = ? AND sort_order < ? ORDER BY sort_order DESC LIMIT 1'
        : 'SELECT * FROM meds WHERE user_id = ? AND sort_order > ? ORDER BY sort_order ASC LIMIT 1',
    )
    .get(req.userId, med.sort_order);

  if (neighbor) {
    const swap = db.transaction(() => {
      db.prepare('UPDATE meds SET sort_order = ? WHERE id = ?').run(neighbor.sort_order, med.id);
      db.prepare('UPDATE meds SET sort_order = ? WHERE id = ?').run(med.sort_order, neighbor.id);
    });
    swap();
  }

  const meds = db
    .prepare('SELECT * FROM meds WHERE user_id = ? ORDER BY sort_order')
    .all(req.userId)
    .map(rowToMed);
  res.json(meds);
});

// ---- Dose log ----

app.put('/api/doselog', requireAuth, (req, res) => {
  const { day, medId, given, givenAt, note } = req.body ?? {};
  if (!day || !medId) return res.status(400).json({ error: 'day and medId are required.' });
  db.prepare(`
    INSERT INTO dose_log (user_id, day, med_id, given, given_at, note)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (user_id, day, med_id) DO UPDATE SET given = excluded.given, given_at = excluded.given_at, note = excluded.note
  `).run(req.userId, day, medId, given ? 1 : 0, givenAt ?? null, note ?? '');
  res.status(204).end();
});

// ---- Document extraction (Anthropic call stays server-side with the key) ----

app.post('/api/extract', requireAuth, async (req, res) => {
  try {
    const meds = await extractMedsFromDocument(req.body ?? {});
    res.json(meds);
  } catch (err) {
    res.status(502).json({ error: err.message ?? 'Extraction failed.' });
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Flopsy Meds API listening on http://localhost:${PORT}`);
});
