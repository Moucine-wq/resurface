'use strict';

const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const webpush = require('web-push');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'resurface-migration-'));
const dbPath = path.join(temp, 'legacy.db');
const db = new DatabaseSync(dbPath);
const userId = crypto.randomUUID();
const itemId = crypto.randomUUID();
const token = crypto.randomBytes(32).toString('hex');
const now = new Date().toISOString();
const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

// Minimal schema representative of the pre-Web-Push v3.2 database.
db.exec(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    is_premium INTEGER NOT NULL DEFAULT 0,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    last_digest_date TEXT,
    locale TEXT NOT NULL DEFAULT 'fr',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    country TEXT,
    currency TEXT NOT NULL DEFAULT 'EUR',
    digest_time TEXT NOT NULL DEFAULT '08:00',
    digest_enabled INTEGER NOT NULL DEFAULT 1,
    last_seen_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    category TEXT,
    recurring_days INTEGER,
    recurrence_type TEXT NOT NULL DEFAULT 'once',
    recurrence_interval INTEGER NOT NULL DEFAULT 1,
    resurface_at TEXT NOT NULL,
    resurface_at_utc TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT,
    completed_at TEXT,
    archived_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);
db.prepare(`INSERT INTO users (id,email,password_hash,salt,timezone,created_at) VALUES (?,?,?,?,?,?)`)
  .run(userId, 'legacy@example.com', 'unused', 'unused', 'America/New_York', now);
db.prepare(`INSERT INTO items (id,user_id,text,resurface_at,resurface_at_utc,status,created_at,updated_at) VALUES (?,?,?,?,?,'pending',?,?)`)
  .run(itemId, userId, 'Legacy item survives migration', future, `${future}T13:00:00.000Z`, now, now);
db.prepare(`INSERT INTO sessions (token,user_id,created_at,expires_at) VALUES (?,?,?,?)`)
  .run(token, userId, now, new Date(Date.now() + 86_400_000).toISOString());
db.close();

const port = 40000 + Math.floor(Math.random() * 1000);
const vapid = webpush.generateVAPIDKeys();
const child = spawn(process.execPath, ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    PORT: String(port),
    DB_PATH: dbPath,
    VAPID_PUBLIC_KEY: vapid.publicKey,
    VAPID_PRIVATE_KEY: vapid.privateKey,
    VAPID_SUBJECT: 'mailto:test@example.com',
    PUSH_MOCK: '1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
child.stderr.on('data', chunk => { stderr += chunk; });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  try {
    for (let i = 0; i < 60; i++) {
      try {
        const health = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (health.ok) break;
      } catch {}
      if (i === 59) throw new Error(`Migrated server did not start. ${stderr}`);
      await sleep(100);
    }
    const response = await fetch(`http://127.0.0.1:${port}/api/items`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(payload));
    const all = [...payload.today, ...payload.upcoming, ...payload.done];
    const legacy = all.find(item => item.id === itemId);
    if (!legacy || legacy.text !== 'Legacy item survives migration') throw new Error('Legacy item was lost');
    if (legacy.scheduledTimezone !== 'America/New_York') throw new Error(`Timezone backfill failed: ${legacy.scheduledTimezone}`);

    const migrated = new DatabaseSync(dbPath);
    const columns = migrated.prepare(`PRAGMA table_info(items)`).all().map(row => row.name);
    for (const name of ['timezone', 'notification_sent_at', 'notification_last_error']) {
      if (!columns.includes(name)) throw new Error(`Missing migrated column ${name}`);
    }
    const pushTables = migrated.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('push_subscriptions','push_deliveries')`).all();
    if (pushTables.length !== 2) throw new Error('Push tables were not migrated');
    migrated.close();
    console.log('Migration test passed');
  } finally {
    child.kill('SIGTERM');
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
