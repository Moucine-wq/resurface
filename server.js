// Resurface v3.2 — interface v3, PWA, horaires locaux, localisation et marketing Premium.
// Node.js 22 native modules only.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const emailLib = require('./lib/email');
const stripeLib = require('./lib/stripe');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'resurface.db');
const VERSION = '3.2.0';
const FREE_LIMIT = Number(process.env.FREE_LIMIT || 10);
const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_DIGEST_TIME = '08:00';
const DEFAULT_CURRENCY = 'EUR';

const PRICE_CONFIG = {
  EUR: { amount: 9, env: 'STRIPE_PRICE_ID_EUR' },
  USD: { amount: 9, env: 'STRIPE_PRICE_ID_USD' },
  GBP: { amount: 8, env: 'STRIPE_PRICE_ID_GBP' },
  CAD: { amount: 12, env: 'STRIPE_PRICE_ID_CAD' },
  BRL: { amount: 29.90, env: 'STRIPE_PRICE_ID_BRL' },
  XOF: { amount: 5500, env: 'STRIPE_PRICE_ID_XOF' },
  MXN: { amount: 149, env: 'STRIPE_PRICE_ID_MXN' },
  CHF: { amount: 9, env: 'STRIPE_PRICE_ID_CHF' },
  AUD: { amount: 14, env: 'STRIPE_PRICE_ID_AUD' },
  JPY: { amount: 1400, env: 'STRIPE_PRICE_ID_JPY' },
  NGN: { amount: 9000, env: 'STRIPE_PRICE_ID_NGN' },
  GHS: { amount: 120, env: 'STRIPE_PRICE_ID_GHS' },
  ZAR: { amount: 169, env: 'STRIPE_PRICE_ID_ZAR' },
  INR: { amount: 749, env: 'STRIPE_PRICE_ID_INR' },
  CNY: { amount: 69, env: 'STRIPE_PRICE_ID_CNY' },
};
function getPriceId(currency) {
  const code = normalizeCurrency(currency);
  const envName = PRICE_CONFIG[code]?.env;
  return (envName && process.env[envName]) || (code === 'EUR' ? process.env.STRIPE_PRICE_ID : null) || null;
}
function paymentsConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && Object.keys(PRICE_CONFIG).some(code => getPriceId(code)));
}

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
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

  CREATE TABLE IF NOT EXISTS items (
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
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

function addColumn(sql) {
  try { db.exec(sql); } catch (error) {
    if (!String(error.message).includes('duplicate column name')) throw error;
  }
}
addColumn(`ALTER TABLE users ADD COLUMN locale TEXT NOT NULL DEFAULT 'fr'`);
addColumn(`ALTER TABLE users ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC'`);
addColumn(`ALTER TABLE users ADD COLUMN country TEXT`);
addColumn(`ALTER TABLE users ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR'`);
addColumn(`ALTER TABLE users ADD COLUMN digest_time TEXT NOT NULL DEFAULT '08:00'`);
addColumn(`ALTER TABLE users ADD COLUMN digest_enabled INTEGER NOT NULL DEFAULT 1`);
addColumn(`ALTER TABLE users ADD COLUMN last_seen_at TEXT`);
addColumn(`ALTER TABLE items ADD COLUMN recurrence_type TEXT NOT NULL DEFAULT 'once'`);
addColumn(`ALTER TABLE items ADD COLUMN recurrence_interval INTEGER NOT NULL DEFAULT 1`);
addColumn(`ALTER TABLE items ADD COLUMN resurface_at_utc TEXT`);
addColumn(`ALTER TABLE items ADD COLUMN updated_at TEXT`);

db.exec(`
  UPDATE items
  SET recurrence_type = CASE recurring_days
    WHEN 1 THEN 'daily'
    WHEN 7 THEN 'weekly'
    WHEN 14 THEN 'biweekly'
    WHEN 30 THEN 'monthly'
    WHEN 90 THEN 'quarterly'
    WHEN 365 THEN 'yearly'
    ELSE COALESCE(NULLIF(recurrence_type, ''), 'once')
  END
  WHERE recurrence_type IS NULL OR recurrence_type = '' OR (recurrence_type = 'once' AND recurring_days IS NOT NULL);

  UPDATE items
  SET recurrence_interval = CASE
    WHEN recurrence_type = 'custom_days' AND recurring_days IS NOT NULL THEN recurring_days
    ELSE COALESCE(recurrence_interval, 1)
  END
  WHERE recurrence_interval IS NULL OR recurrence_interval < 1;

  UPDATE items
  SET resurface_at_utc = resurface_at || 'T09:00:00.000Z'
  WHERE resurface_at_utc IS NULL OR resurface_at_utc = '';

  CREATE INDEX IF NOT EXISTS idx_items_user_status_due
    ON items(user_id, status, resurface_at_utc);
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry
    ON sessions(expires_at);
`);

const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'pt'];
const SUPPORTED_CURRENCIES = new Set(['EUR','USD','GBP','CAD','BRL','XOF','MXN','CHF','AUD','JPY','NGN','GHS','ZAR','INR','CNY']);
const COUNTRY_CURRENCY = {
  US:'USD', BR:'BRL', FR:'EUR', DE:'EUR', IT:'EUR', ES:'EUR', PT:'EUR',
  GB:'GBP', CA:'CAD', BJ:'XOF', SN:'XOF', CI:'XOF', TG:'XOF', ML:'XOF', BF:'XOF', NE:'XOF',
  MX:'MXN', CH:'CHF', AU:'AUD', JP:'JPY', NG:'NGN', GH:'GHS', ZA:'ZAR', IN:'INR', CN:'CNY',
};
const RECURRENCE_TYPES = new Set(['once','daily','weekdays','weekly','biweekly','monthly','bimonthly','quarterly','semiannual','yearly','custom_days']);

function uid() { return crypto.randomUUID(); }
function nowIso() { return new Date().toISOString(); }
function normalizeLocale(value) {
  return SUPPORTED_LOCALES.includes(value) ? value : 'fr';
}
function normalizeCountry(value) {
  const country = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : null;
}
function currencyForCountry(country) {
  return COUNTRY_CURRENCY[normalizeCountry(country)] || DEFAULT_CURRENCY;
}
function normalizeCurrency(value, country = null) {
  const currency = String(value || '').trim().toUpperCase();
  return SUPPORTED_CURRENCIES.has(currency) ? currency : currencyForCountry(country);
}
function normalizeRecurrence(type, interval = 1) {
  const recurrenceType = RECURRENCE_TYPES.has(String(type || '')) ? String(type) : 'once';
  const recurrenceInterval = recurrenceType === 'custom_days'
    ? Math.min(3650, Math.max(1, Number(interval || 1)))
    : 1;
  return { recurrenceType, recurrenceInterval };
}
function normalizeTimezone(value) {
  const timezone = String(value || '').trim();
  if (!timezone) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
function normalizeTime(value, fallback = '09:00') {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || '')) ? String(value) : fallback;
}
function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}
function secureEqualHex(a, b) {
  try {
    const aa = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
  } catch { return false; }
}

function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const out = {};
  for (const part of parts) if (part.type !== 'literal') out[part.type] = Number(part.value);
  if (out.hour === 24) out.hour = 0;
  return out;
}
function dateKeyInZone(date, timeZone) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
function timeKeyInZone(date, timeZone) {
  const p = zonedParts(date, timeZone);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}
function timeMinutesInZone(date, timeZone) {
  const p = zonedParts(date, timeZone);
  return p.hour * 60 + p.minute;
}
function timezoneOffsetMs(date, timeZone) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}
function localDateTimeToUtc(dateStr, timeStr, timeZone) {
  if (!isDate(dateStr)) throw new Error('Date invalide.');
  const time = normalizeTime(timeStr);
  const zone = normalizeTimezone(timeZone);
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  let offset = timezoneOffsetMs(naiveUtc, zone);
  let result = new Date(naiveUtc.getTime() - offset);
  const correctedOffset = timezoneOffsetMs(result, zone);
  if (correctedOffset !== offset) result = new Date(naiveUtc.getTime() - correctedOffset);
  return result.toISOString();
}
function addDaysToDate(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}
function addMonthsToDate(dateStr, months) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + Number(months || 0), 1, 12));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}
function nextRecurrenceDate(dateStr, type, interval = 1) {
  switch (type) {
    case 'daily': return addDaysToDate(dateStr, 1);
    case 'weekdays': {
      let next = addDaysToDate(dateStr, 1);
      while ([0, 6].includes(new Date(`${next}T12:00:00Z`).getUTCDay())) next = addDaysToDate(next, 1);
      return next;
    }
    case 'weekly': return addDaysToDate(dateStr, 7);
    case 'biweekly': return addDaysToDate(dateStr, 14);
    case 'monthly': return addMonthsToDate(dateStr, 1);
    case 'bimonthly': return addMonthsToDate(dateStr, 2);
    case 'quarterly': return addMonthsToDate(dateStr, 3);
    case 'semiannual': return addMonthsToDate(dateStr, 6);
    case 'yearly': return addMonthsToDate(dateStr, 12);
    case 'custom_days': return addDaysToDate(dateStr, Math.min(3650, Math.max(1, Number(interval || 1))));
    default: return null;
  }
}
function itemLocalSchedule(row, timeZone) {
  const due = new Date(row.resurfaceAtUtc || `${row.resurfaceAt}T09:00:00.000Z`);
  return { date: dateKeyInZone(due, timeZone), time: timeKeyInZone(due, timeZone) };
}

function securityHeaders(extra = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com",
    ...extra,
  };
}
function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, securityHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  }));
  res.end(body);
}
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Payload trop volumineux.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error('JSON invalide.')); }
    });
    req.on('error', reject);
  });
}
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 2_000_000) {
        reject(new Error('Payload trop volumineux.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function getSessionUser(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const row = db.prepare(`
    SELECT s.user_id AS id, s.expires_at AS expiresAt,
           u.email, u.locale, u.timezone, u.country, u.currency,
           u.is_premium AS isPremium, u.stripe_customer_id AS stripeCustomerId,
           u.digest_time AS digestTime, u.digest_enabled AS digestEnabled
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).get(token);
  if (!row || new Date(row.expiresAt) <= new Date()) return null;
  return { ...row, isPremium: !!row.isPremium, digestEnabled: !!row.digestEnabled, token };
}
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const created = nowIso();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(token, userId, created, expires);
  return token;
}
function userSettings(userId) {
  const u = db.prepare(`
    SELECT email, locale, timezone, country, currency, is_premium AS isPremium,
           stripe_customer_id AS stripeCustomerId,
           digest_time AS digestTime, digest_enabled AS digestEnabled
    FROM users WHERE id = ?
  `).get(userId);
  return { ...u, isPremium: !!u.isPremium, digestEnabled: !!u.digestEnabled, freeLimit: FREE_LIMIT };
}

function activeItemCount(userId) {
  return db.prepare("SELECT COUNT(*) AS count FROM items WHERE user_id = ? AND status != 'done'").get(userId).count;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};
function serveStatic(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const resolved = path.resolve(PUBLIC_DIR, `.${requestPath}`);
  const root = path.resolve(PUBLIC_DIR) + path.sep;
  if (resolved !== path.resolve(PUBLIC_DIR, 'index.html') && !resolved.startsWith(root)) {
    res.writeHead(403, securityHeaders());
    return res.end('Forbidden');
  }
  fs.readFile(resolved, (error, content) => {
    if (error) {
      res.writeHead(404, securityHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
      return res.end('Not found');
    }
    const ext = path.extname(resolved);
    const isMutable = ext === '.html' || ext === '.js' || ext === '.css' || ext === '.webmanifest';
    res.writeHead(200, securityHeaders({
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': isMutable ? 'no-cache' : 'public, max-age=604800, immutable',
    }));
    res.end(content);
  });
}

const authAttempts = new Map();
function authRateLimited(req) {
  const key = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const windowStart = now - 10 * 60 * 1000;
  const recent = (authAttempts.get(key) || []).filter(t => t > windowStart);
  recent.push(now);
  authAttempts.set(key, recent);
  return recent.length > 30;
}

async function handleApi(req, res, pathname) {
  try {
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJSON(res, 200, { ok: true, version: VERSION, paymentsConfigured: paymentsConfigured() });
    }
    if (pathname === '/api/config' && req.method === 'GET') {
      const currencies = {};
      for (const [code, config] of Object.entries(PRICE_CONFIG)) {
        currencies[code] = { amount: config.amount, checkoutEnabled: Boolean(getPriceId(code)) };
      }
      return sendJSON(res, 200, {
        version: VERSION,
        freeLimit: FREE_LIMIT,
        paymentsEnabled: paymentsConfigured(),
        currencies,
        supportedCurrencies: [...SUPPORTED_CURRENCIES],
        locationPolicy: 'Timezone and country are detected from the device. Exact GPS is optional and never stored.',
      });
    }

    if (pathname === '/api/stripe/webhook' && req.method === 'POST') {
      const rawBody = await getRawBody(req);
      let event;
      try {
        event = stripeLib.verifyWebhookSignature(rawBody, req.headers['stripe-signature']);
      } catch (error) {
        console.error('[stripe webhook]', error.message);
        return sendJSON(res, 400, { error: 'Signature Stripe invalide.' });
      }
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        if (userId) db.prepare('UPDATE users SET is_premium = 1, stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?')
          .run(session.customer, session.subscription, userId);
      } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        const active = subscription.status === 'active' || subscription.status === 'trialing';
        db.prepare('UPDATE users SET is_premium = ? WHERE stripe_subscription_id = ?').run(active ? 1 : 0, subscription.id);
      }
      return sendJSON(res, 200, { received: true });
    }

    if (pathname === '/api/signup' && req.method === 'POST') {
      if (authRateLimited(req)) return sendJSON(res, 429, { error: 'Trop de tentatives. Réessayez dans quelques minutes.' });
      const { email, password, locale, timezone, country, currency } = await parseBody(req);
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || String(password || '').length < 8) {
        return sendJSON(res, 400, { error: 'Email invalide ou mot de passe trop court (8 caractères minimum).', code: 'INVALID_INPUT' });
      }
      if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(cleanEmail)) {
        return sendJSON(res, 409, { error: 'Un compte existe déjà avec cet email.', code: 'EMAIL_EXISTS' });
      }
      const salt = crypto.randomBytes(16).toString('hex');
      const id = uid();
      const created = nowIso();
      db.prepare(`
        INSERT INTO users
          (id, email, password_hash, salt, locale, timezone, country, currency, digest_time, digest_enabled, last_seen_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        id, cleanEmail, hashPassword(String(password), salt), salt,
        normalizeLocale(locale), normalizeTimezone(timezone), normalizeCountry(country),
        normalizeCurrency(currency, country), DEFAULT_DIGEST_TIME, created, created,
      );
      const token = createSession(id);
      return sendJSON(res, 201, { token, ...userSettings(id) });
    }

    if (pathname === '/api/login' && req.method === 'POST') {
      if (authRateLimited(req)) return sendJSON(res, 429, { error: 'Trop de tentatives. Réessayez dans quelques minutes.' });
      const { email, password, timezone, country, currency } = await parseBody(req);
      const cleanEmail = String(email || '').trim().toLowerCase();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
      const hash = user ? hashPassword(String(password || ''), user.salt) : '';
      if (!user || !secureEqualHex(hash, user.password_hash)) {
        return sendJSON(res, 401, { error: 'Identifiants invalides.', code: 'INVALID_CREDENTIALS' });
      }
      const zone = normalizeTimezone(timezone || user.timezone);
      const cleanCountry = normalizeCountry(country) || user.country;
      const cleanCurrency = normalizeCurrency(currency || user.currency, cleanCountry);
      db.prepare('UPDATE users SET timezone = ?, country = ?, currency = ?, last_seen_at = ? WHERE id = ?')
        .run(zone, cleanCountry, cleanCurrency, nowIso(), user.id);
      const token = createSession(user.id);
      return sendJSON(res, 200, { token, ...userSettings(user.id) });
    }

    const user = getSessionUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Votre session a expiré. Reconnectez-vous.', code: 'UNAUTHENTICATED' });

    if (pathname === '/api/logout' && req.method === 'POST') {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(user.token);
      return sendJSON(res, 200, { ok: true });
    }

    if (pathname === '/api/me' && req.method === 'GET') {
      return sendJSON(res, 200, userSettings(user.id));
    }

    if (pathname === '/api/me' && req.method === 'PATCH') {
      const body = await parseBody(req);
      const next = {
        locale: body.locale === undefined ? user.locale : normalizeLocale(body.locale),
        timezone: body.timezone === undefined ? user.timezone : normalizeTimezone(body.timezone),
        country: body.country === undefined ? user.country : normalizeCountry(body.country),
        currency: body.currency === undefined ? normalizeCurrency(user.currency, user.country) : normalizeCurrency(body.currency, body.country === undefined ? user.country : body.country),
        digestTime: body.digestTime === undefined ? user.digestTime : normalizeTime(body.digestTime, DEFAULT_DIGEST_TIME),
        digestEnabled: body.digestEnabled === undefined ? user.digestEnabled : !!body.digestEnabled,
      };
      db.prepare(`
        UPDATE users
        SET locale = ?, timezone = ?, country = ?, currency = ?, digest_time = ?, digest_enabled = ?, last_seen_at = ?
        WHERE id = ?
      `).run(next.locale, next.timezone, next.country, next.currency, next.digestTime, next.digestEnabled ? 1 : 0, nowIso(), user.id);
      return sendJSON(res, 200, userSettings(user.id));
    }

    if (pathname === '/api/stripe/create-checkout-session' && req.method === 'POST') {
      const { currency } = await parseBody(req);
      const code = normalizeCurrency(currency || user.currency, user.country);
      const priceId = getPriceId(code);
      if (!process.env.STRIPE_SECRET_KEY || !priceId) {
        return sendJSON(res, 503, { error: 'Le paiement dans cette devise n’est pas encore configuré.', code: 'PAYMENT_NOT_CONFIGURED' });
      }
      const appUrl = process.env.APP_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
      try {
        const session = await stripeLib.createCheckoutSession({
          userId: user.id,
          customerEmail: user.email,
          priceId,
          successUrl: `${appUrl}/?checkout=success`,
          cancelUrl: `${appUrl}/?checkout=cancelled`,
        });
        return sendJSON(res, 200, { url: session.url });
      } catch (error) {
        console.error('[stripe checkout]', error.message);
        return sendJSON(res, 500, { error: 'Impossible de démarrer le paiement.' });
      }
    }

    if (pathname === '/api/stripe/create-portal-session' && req.method === 'POST') {
      if (!user.stripeCustomerId) return sendJSON(res, 400, { error: 'Aucun abonnement actif.' });
      const appUrl = process.env.APP_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
      try {
        const session = await stripeLib.createBillingPortalSession({ customerId: user.stripeCustomerId, returnUrl: `${appUrl}/` });
        return sendJSON(res, 200, { url: session.url });
      } catch (error) {
        return sendJSON(res, 500, { error: 'Impossible d’ouvrir le portail de facturation.' });
      }
    }

    if (pathname === '/api/items' && req.method === 'GET') {
      const settings = userSettings(user.id);
      const zone = normalizeTimezone(settings.timezone);
      const rows = db.prepare(`
        SELECT id, text, category, recurring_days AS recurringDays,
               recurrence_type AS recurrenceType, recurrence_interval AS recurrenceInterval,
               resurface_at AS resurfaceAt,
               resurface_at_utc AS resurfaceAtUtc,
               status, created_at AS createdAt, updated_at AS updatedAt,
               completed_at AS completedAt
        FROM items WHERE user_id = ?
      `).all(user.id);
      const todayKey = dateKeyInZone(new Date(), zone);
      const result = { today: [], upcoming: [], done: [], settings, isPremium: user.isPremium, freeLimit: FREE_LIMIT };
      for (const row of rows) {
        const schedule = itemLocalSchedule(row, zone);
        const item = { ...row, resurfaceDate: schedule.date, resurfaceTime: schedule.time, timezone: zone };
        if (row.status === 'done') result.done.push(item);
        else if (schedule.date <= todayKey) result.today.push(item);
        else result.upcoming.push(item);
      }
      result.today.sort((a, b) => String(a.resurfaceAtUtc).localeCompare(String(b.resurfaceAtUtc)));
      result.upcoming.sort((a, b) => String(a.resurfaceAtUtc).localeCompare(String(b.resurfaceAtUtc)));
      result.done.sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));
      return sendJSON(res, 200, result);
    }

    if (pathname === '/api/items' && req.method === 'POST') {
      if (!user.isPremium && activeItemCount(user.id) >= FREE_LIMIT) {
        return sendJSON(res, 402, { error: `Limite du plan gratuit atteinte (${FREE_LIMIT} éléments actifs).`, code: 'LIMIT_REACHED' });
      }
      const body = await parseBody(req);
      const text = String(body.text || '').trim();
      if (!text) return sendJSON(res, 400, { error: 'Écrivez ce qui doit refaire surface.' });
      if (text.length > 500) return sendJSON(res, 400, { error: 'Le texte ne peut pas dépasser 500 caractères.' });
      const zone = normalizeTimezone(body.timezone || user.timezone);
      const localToday = dateKeyInZone(new Date(), zone);
      const date = isDate(body.resurfaceDate || body.resurfaceAt) ? String(body.resurfaceDate || body.resurfaceAt) : localToday;
      const time = normalizeTime(body.resurfaceTime, '09:00');
      const dueUtc = localDateTimeToUtc(date, time, zone);
      const category = String(body.category || '').trim().slice(0, 40) || null;
      const legacyDays = Number(body.recurringDays || 0);
      const legacyType = ({1:'daily',7:'weekly',14:'biweekly',30:'monthly',90:'quarterly',365:'yearly'})[legacyDays];
      const { recurrenceType, recurrenceInterval } = normalizeRecurrence(body.recurrenceType || legacyType || 'once', body.recurrenceInterval || legacyDays || 1);
      const recurringDays = recurrenceType === 'custom_days' ? recurrenceInterval : ({daily:1,weekly:7,biweekly:14,monthly:30,quarterly:90,yearly:365}[recurrenceType] || null);
      const created = nowIso();
      const id = uid();
      db.prepare(`
        INSERT INTO items
          (id, user_id, text, category, recurring_days, recurrence_type, recurrence_interval, resurface_at, resurface_at_utc, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).run(id, user.id, text, category, recurringDays, recurrenceType, recurrenceInterval, date, dueUtc, created, created);
      return sendJSON(res, 201, { id, resurfaceAtUtc: dueUtc, resurfaceDate: date, resurfaceTime: time, timezone: zone });
    }

    const itemMatch = pathname.match(/^\/api\/items\/([a-f0-9-]+)$/);
    if (itemMatch && req.method === 'PATCH') {
      const itemId = itemMatch[1];
      const item = db.prepare(`
        SELECT id, user_id, text, category, recurring_days, recurrence_type, recurrence_interval,
               resurface_at, resurface_at_utc, status, created_at, completed_at
        FROM items WHERE id = ? AND user_id = ?
      `).get(itemId, user.id);
      if (!item) return sendJSON(res, 404, { error: 'Cet élément n’existe plus.' });
      const body = await parseBody(req);
      const action = body.action;
      const zone = normalizeTimezone(body.timezone || user.timezone);
      const updated = nowIso();

      if (action === 'done') {
        db.prepare('UPDATE items SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?')
          .run('done', updated, updated, itemId);
        const recurrenceType = item.recurrence_type || ({1:'daily',7:'weekly',14:'biweekly',30:'monthly',90:'quarterly',365:'yearly'})[item.recurring_days] || 'once';
        const recurrenceInterval = item.recurrence_interval || item.recurring_days || 1;
        const schedule = itemLocalSchedule({ resurfaceAtUtc: item.resurface_at_utc, resurfaceAt: item.resurface_at }, zone);
        const nextDate = nextRecurrenceDate(schedule.date, recurrenceType, recurrenceInterval);
        if (nextDate) {
          const nextUtc = localDateTimeToUtc(nextDate, schedule.time, zone);
          const legacyDays = recurrenceType === 'custom_days' ? recurrenceInterval : ({daily:1,weekly:7,biweekly:14,monthly:30,quarterly:90,yearly:365}[recurrenceType] || null);
          db.prepare(`
            INSERT INTO items
              (id, user_id, text, category, recurring_days, recurrence_type, recurrence_interval, resurface_at, resurface_at_utc, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
          `).run(uid(), user.id, item.text, item.category, legacyDays, recurrenceType, recurrenceInterval, nextDate, nextUtc, updated, updated);
        }
      } else if (action === 'reopen') {
        db.prepare('UPDATE items SET status = ?, completed_at = NULL, updated_at = ? WHERE id = ?')
          .run('pending', updated, itemId);
      } else if (action === 'snooze') {
        const current = itemLocalSchedule({ resurfaceAtUtc: item.resurface_at_utc, resurfaceAt: item.resurface_at }, zone);
        const days = Math.min(365, Math.max(1, Number(body.days || 7)));
        const date = isDate(body.resurfaceDate) ? String(body.resurfaceDate) : addDaysToDate(dateKeyInZone(new Date(), zone), days);
        const time = normalizeTime(body.resurfaceTime, current.time || '09:00');
        const dueUtc = localDateTimeToUtc(date, time, zone);
        db.prepare(`
          UPDATE items SET status = 'pending', resurface_at = ?, resurface_at_utc = ?, completed_at = NULL, updated_at = ?
          WHERE id = ?
        `).run(date, dueUtc, updated, itemId);
      } else if (action === 'update') {
        const text = body.text === undefined ? item.text : String(body.text || '').trim();
        if (!text) return sendJSON(res, 400, { error: 'Le texte ne peut pas être vide.' });
        const current = itemLocalSchedule({ resurfaceAtUtc: item.resurface_at_utc, resurfaceAt: item.resurface_at }, zone);
        const date = isDate(body.resurfaceDate) ? String(body.resurfaceDate) : current.date;
        const time = normalizeTime(body.resurfaceTime, current.time);
        const dueUtc = localDateTimeToUtc(date, time, zone);
        const category = body.category === undefined ? item.category : (String(body.category || '').trim().slice(0, 40) || null);
        const legacyDays = body.recurringDays === undefined ? item.recurring_days : Number(body.recurringDays || 0);
        const currentType = item.recurrence_type || ({1:'daily',7:'weekly',14:'biweekly',30:'monthly',90:'quarterly',365:'yearly'})[item.recurring_days] || 'once';
        const { recurrenceType, recurrenceInterval } = normalizeRecurrence(
          body.recurrenceType === undefined ? currentType : body.recurrenceType,
          body.recurrenceInterval === undefined ? (item.recurrence_interval || legacyDays || 1) : body.recurrenceInterval,
        );
        const recurringDays = recurrenceType === 'custom_days' ? recurrenceInterval : ({daily:1,weekly:7,biweekly:14,monthly:30,quarterly:90,yearly:365}[recurrenceType] || null);
        db.prepare(`
          UPDATE items
          SET text = ?, category = ?, recurring_days = ?, recurrence_type = ?, recurrence_interval = ?, resurface_at = ?, resurface_at_utc = ?, updated_at = ?
          WHERE id = ?
        `).run(text, category, recurringDays, recurrenceType, recurrenceInterval, date, dueUtc, updated, itemId);
      } else {
        return sendJSON(res, 400, { error: 'Action inconnue.' });
      }
      return sendJSON(res, 200, { ok: true });
    }

    if (itemMatch && req.method === 'DELETE') {
      db.prepare('DELETE FROM items WHERE id = ? AND user_id = ?').run(itemMatch[1], user.id);
      return sendJSON(res, 200, { ok: true });
    }

    return sendJSON(res, 404, { error: 'Route inconnue.' });
  } catch (error) {
    console.error('[api]', error);
    return sendJSON(res, 500, { error: 'Une erreur serveur est survenue.' });
  }
}

async function runDailyDigestJob(referenceDate = new Date()) {
  const users = db.prepare(`
    SELECT id, email, locale, timezone, country,
           digest_time AS digestTime, digest_enabled AS digestEnabled,
           last_digest_date AS lastDigestDate
    FROM users WHERE digest_enabled = 1 AND is_premium = 1
  `).all();

  for (const user of users) {
    const zone = normalizeTimezone(user.timezone);
    const localDate = dateKeyInZone(referenceDate, zone);
    const targetMinutes = Number(user.digestTime.slice(0, 2)) * 60 + Number(user.digestTime.slice(3, 5));
    if (user.lastDigestDate === localDate || timeMinutesInZone(referenceDate, zone) < targetMinutes) continue;

    const rows = db.prepare(`
      SELECT text, category, resurface_at AS resurfaceAt, resurface_at_utc AS resurfaceAtUtc
      FROM items WHERE user_id = ? AND status != 'done'
    `).all(user.id);
    const due = rows.filter(row => itemLocalSchedule(row, zone).date <= localDate).map(row => ({
      text: row.text,
      category: row.category,
      displayTime: itemLocalSchedule(row, zone).time,
    }));

    try {
      if (due.length) {
        await emailLib.sendEmail({
          to: user.email,
          subject: emailLib.digestSubject(due.length, user.locale || 'fr'),
          html: emailLib.digestEmailHtml(due, user.locale || 'fr'),
        });
        console.log(`[digest] ${due.length} item(s) -> ${user.email} (${zone})`);
      }
      db.prepare('UPDATE users SET last_digest_date = ? WHERE id = ?').run(localDate, user.id);
    } catch (error) {
      console.error(`[digest] failed for ${user.email}:`, error.message);
    }
  }
}

setInterval(() => {
  runDailyDigestJob().catch(error => console.error('[digest job]', error));
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso());
}, 5 * 60 * 1000);

const server = http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];
  if (pathname.startsWith('/api/')) handleApi(req, res, pathname);
  else serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Resurface v${VERSION} running on http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
  console.log(`Email configured: ${Boolean(process.env.RESEND_API_KEY)} | Stripe configured: ${paymentsConfigured()}`);
});

module.exports = {
  runDailyDigestJob,
  localDateTimeToUtc,
  dateKeyInZone,
  normalizeTimezone,
};
