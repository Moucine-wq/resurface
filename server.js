// Resurface — backend production (Node.js natif + node:sqlite, zéro dépendance npm)
// Lancer: node server.js   (PORT via variable d'env, 3000 par défaut)
//
// Variables d'environnement nécessaires (voir .env.example) :
//   STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET
//   RESEND_API_KEY, FROM_EMAIL
//   APP_URL (ex: https://resurface.tondomaine.com)

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const stripeLib = require('./lib/stripe');
const emailLib = require('./lib/email');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'resurface.db');
const PUBLIC_DIR = path.join(__dirname, 'public');
const FREE_LIMIT = 10;
const DIGEST_HOUR_UTC = Number(process.env.DIGEST_HOUR_UTC || 8); // 08h UTC par défaut

// ---------- DB ----------
const db = new DatabaseSync(DB_PATH);

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
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    category TEXT,
    recurring_days INTEGER,
    resurface_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
`);

// Migration légère pour les bases déjà déployées avant l'ajout de la colonne locale
try { db.exec(`ALTER TABLE users ADD COLUMN locale TEXT NOT NULL DEFAULT 'fr'`); }
catch (e) { /* colonne déjà présente, ignorer */ }

const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'pt'];
function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : 'fr';
}

// ---------- Helpers ----------
function uid() { return crypto.randomUUID(); }
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 2e6) req.destroy();
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function getSessionUser(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const row = db.prepare(
    `SELECT s.user_id as userId, s.expires_at as expiresAt,
            u.email as email, u.is_premium as isPremium,
            u.stripe_customer_id as stripeCustomerId, u.locale as locale
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`
  ).get(token);
  if (!row) return null;
  if (new Date(row.expiresAt) < new Date()) return null;
  return { id: row.userId, email: row.email, isPremium: !!row.isPremium, stripeCustomerId: row.stripeCustomerId, locale: row.locale || 'fr', token };
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(token, userId, new Date().toISOString(), expires);
  return token;
}

function activeItemCount(userId) {
  const row = db.prepare(`SELECT COUNT(*) as c FROM items WHERE user_id = ? AND status != 'done'`).get(userId);
  return row.c;
}

// ---------- Static file serving ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  filePath = path.join(PUBLIC_DIR, filePath);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

// ---------- API routes ----------
async function handleApi(req, res, pathname) {
  try {
    // ----- Stripe webhook : nécessite le corps BRUT (avant tout JSON.parse) pour vérifier la signature -----
    if (pathname === '/api/stripe/webhook' && req.method === 'POST') {
      const rawBody = await getRawBody(req);
      let event;
      try {
        event = stripeLib.verifyWebhookSignature(rawBody, req.headers['stripe-signature']);
      } catch (err) {
        console.error('[webhook] signature invalide:', err.message);
        return sendJSON(res, 400, { error: 'Signature invalide.' });
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        if (userId) {
          db.prepare('UPDATE users SET is_premium = 1, stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?')
            .run(session.customer, session.subscription, userId);
          console.log('[webhook] Premium activé pour user', userId);
        }
      } else if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
        const sub = event.data.object;
        const isActive = sub.status === 'active' || sub.status === 'trialing';
        db.prepare('UPDATE users SET is_premium = ? WHERE stripe_subscription_id = ?')
          .run(isActive ? 1 : 0, sub.id);
        console.log('[webhook] Statut abonnement mis à jour:', sub.id, '->', isActive);
      }

      return sendJSON(res, 200, { received: true });
    }

    // ----- Signup -----
    if (pathname === '/api/signup' && req.method === 'POST') {
      const { email, password, locale } = await parseBody(req);
      if (!email || !password || password.length < 6) {
        return sendJSON(res, 400, { error: 'Email invalide ou mot de passe trop court (min 6 caractères).', code: 'INVALID_INPUT' });
      }
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
      if (existing) return sendJSON(res, 409, { error: 'Un compte existe déjà avec cet email.', code: 'EMAIL_EXISTS' });

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(password, salt);
      const id = uid();
      const finalLocale = normalizeLocale(locale);
      db.prepare('INSERT INTO users (id, email, password_hash, salt, locale, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, email.toLowerCase(), hash, salt, finalLocale, new Date().toISOString());

      const token = createSession(id);
      return sendJSON(res, 200, { token, email: email.toLowerCase(), isPremium: false, locale: finalLocale });
    }

    // ----- Login -----
    if (pathname === '/api/login' && req.method === 'POST') {
      const { email, password } = await parseBody(req);
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').toLowerCase());
      if (!user) return sendJSON(res, 401, { error: 'Identifiants invalides.', code: 'INVALID_CREDENTIALS' });
      const hash = hashPassword(password, user.salt);
      if (hash !== user.password_hash) return sendJSON(res, 401, { error: 'Identifiants invalides.', code: 'INVALID_CREDENTIALS' });

      const token = createSession(user.id);
      return sendJSON(res, 200, { token, email: user.email, isPremium: !!user.is_premium, locale: user.locale || 'fr' });
    }

    // ----- Toutes les routes suivantes nécessitent une session valide -----
    const user = getSessionUser(req);
    if (!user) return sendJSON(res, 401, { error: 'Non authentifié.' });

    // GET /api/me
    if (pathname === '/api/me' && req.method === 'GET') {
      return sendJSON(res, 200, { email: user.email, isPremium: user.isPremium, locale: user.locale });
    }

    // PATCH /api/me — changer la langue préférée (utilisée pour l'UI et les emails)
    if (pathname === '/api/me' && req.method === 'PATCH') {
      const { locale } = await parseBody(req);
      const finalLocale = normalizeLocale(locale);
      db.prepare('UPDATE users SET locale = ? WHERE id = ?').run(finalLocale, user.id);
      return sendJSON(res, 200, { locale: finalLocale });
    }

    // POST /api/stripe/create-checkout-session
    if (pathname === '/api/stripe/create-checkout-session' && req.method === 'POST') {
      const origin = req.headers.origin || process.env.APP_URL || `http://localhost:${PORT}`;
      try {
        const session = await stripeLib.createCheckoutSession({
          userId: user.id,
          customerEmail: user.email,
          successUrl: `${origin}/?checkout=success`,
          cancelUrl: `${origin}/?checkout=cancelled`,
        });
        return sendJSON(res, 200, { url: session.url });
      } catch (err) {
        console.error('[stripe] création session échouée:', err.message);
        return sendJSON(res, 500, { error: 'Impossible de créer la session de paiement: ' + err.message });
      }
    }

    // POST /api/stripe/create-portal-session (gérer/annuler l'abonnement)
    if (pathname === '/api/stripe/create-portal-session' && req.method === 'POST') {
      if (!user.stripeCustomerId) return sendJSON(res, 400, { error: 'Aucun abonnement actif.' });
      const origin = req.headers.origin || process.env.APP_URL || `http://localhost:${PORT}`;
      try {
        const session = await stripeLib.createBillingPortalSession({
          customerId: user.stripeCustomerId,
          returnUrl: `${origin}/`,
        });
        return sendJSON(res, 200, { url: session.url });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // GET /api/items
    if (pathname === '/api/items' && req.method === 'GET') {
      const rows = db.prepare(
        `SELECT id, text, category, recurring_days as recurringDays, resurface_at as resurfaceAt,
                status, created_at as createdAt, completed_at as completedAt
         FROM items WHERE user_id = ? ORDER BY resurface_at ASC`
      ).all(user.id);

      const today = todayISO();
      const result = { today: [], upcoming: [], done: [], isPremium: user.isPremium, freeLimit: FREE_LIMIT };
      for (const r of rows) {
        if (r.status === 'done') result.done.push(r);
        else if (r.resurfaceAt <= today) result.today.push(r);
        else result.upcoming.push(r);
      }
      return sendJSON(res, 200, result);
    }

    // POST /api/items
    if (pathname === '/api/items' && req.method === 'POST') {
      const { text, resurfaceAt, category, recurringDays } = await parseBody(req);
      if (!text || !text.trim()) return sendJSON(res, 400, { error: 'Le texte est requis.' });

      if (!user.isPremium && activeItemCount(user.id) >= FREE_LIMIT) {
        return sendJSON(res, 402, { error: 'Limite du plan gratuit atteinte (10 rappels actifs). Passe en Premium pour continuer.', code: 'LIMIT_REACHED' });
      }

      const date = resurfaceAt && /^\d{4}-\d{2}-\d{2}$/.test(resurfaceAt) ? resurfaceAt : todayISO();
      const finalCategory = user.isPremium ? (category || null) : null;
      const finalRecurring = user.isPremium && recurringDays ? Number(recurringDays) : null;

      const id = uid();
      db.prepare(
        `INSERT INTO items (id, user_id, text, category, recurring_days, resurface_at, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
      ).run(id, user.id, text.trim(), finalCategory, finalRecurring, date, new Date().toISOString());
      return sendJSON(res, 200, { id });
    }

    // PATCH /api/items/:id
    const patchMatch = pathname.match(/^\/api\/items\/([a-f0-9-]+)$/);
    if (patchMatch && req.method === 'PATCH') {
      const itemId = patchMatch[1];
      const item = db.prepare('SELECT * FROM items WHERE id = ? AND user_id = ?').get(itemId, user.id);
      if (!item) return sendJSON(res, 404, { error: 'Introuvable.' });

      const { action, days, resurfaceAt } = await parseBody(req);
      if (action === 'done') {
        db.prepare('UPDATE items SET status = ?, completed_at = ? WHERE id = ?')
          .run('done', new Date().toISOString(), itemId);

        // Rappel récurrent (Premium) : recrée automatiquement la prochaine occurrence
        if (item.recurring_days) {
          const d = new Date();
          d.setDate(d.getDate() + item.recurring_days);
          db.prepare(
            `INSERT INTO items (id, user_id, text, category, recurring_days, resurface_at, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
          ).run(uid(), user.id, item.text, item.category, item.recurring_days, d.toISOString().slice(0, 10), new Date().toISOString());
        }
      } else if (action === 'snooze') {
        let newDate;
        if (resurfaceAt && /^\d{4}-\d{2}-\d{2}$/.test(resurfaceAt)) newDate = resurfaceAt;
        else {
          const d = new Date();
          d.setDate(d.getDate() + (Number(days) || 7));
          newDate = d.toISOString().slice(0, 10);
        }
        db.prepare('UPDATE items SET status = ?, resurface_at = ? WHERE id = ?').run('pending', newDate, itemId);
      } else if (action === 'reopen') {
        db.prepare('UPDATE items SET status = ?, completed_at = NULL WHERE id = ?').run('pending', itemId);
      } else {
        return sendJSON(res, 400, { error: 'Action inconnue.' });
      }
      return sendJSON(res, 200, { ok: true });
    }

    // DELETE /api/items/:id
    const delMatch = pathname.match(/^\/api\/items\/([a-f0-9-]+)$/);
    if (delMatch && req.method === 'DELETE') {
      db.prepare('DELETE FROM items WHERE id = ? AND user_id = ?').run(delMatch[1], user.id);
      return sendJSON(res, 200, { ok: true });
    }

    return sendJSON(res, 404, { error: 'Route inconnue.' });
  } catch (err) {
    console.error(err);
    return sendJSON(res, 500, { error: 'Erreur serveur.' });
  }
}

// ---------- Job quotidien : email de rappel aux utilisateurs Premium ----------
async function runDailyDigestJob() {
  const today = todayISO();
  const premiumUsers = db.prepare(
    `SELECT id, email, locale, last_digest_date FROM users WHERE is_premium = 1 AND (last_digest_date IS NULL OR last_digest_date != ?)`
  ).all(today);

  for (const u of premiumUsers) {
    const items = db.prepare(
      `SELECT text, category FROM items WHERE user_id = ? AND status != 'done' AND resurface_at <= ?`
    ).all(u.id, today);

    if (items.length === 0) continue;

    const locale = u.locale || 'fr';
    try {
      await emailLib.sendEmail({
        to: u.email,
        subject: emailLib.digestSubject(items.length, locale),
        html: emailLib.digestEmailHtml(items, locale),
      });
      db.prepare('UPDATE users SET last_digest_date = ? WHERE id = ?').run(today, u.id);
      console.log('[digest] envoyé à', u.email, '(' + items.length + ' items, locale=' + locale + ')');
    } catch (err) {
      console.error('[digest] échec envoi à', u.email, ':', err.message);
    }
  }
}

// Vérifie toutes les 15 min si c'est l'heure du digest (par défaut 08h UTC)
setInterval(() => {
  const hour = new Date().getUTCHours();
  if (hour === DIGEST_HOUR_UTC) {
    runDailyDigestJob().catch(err => console.error('[digest] erreur job:', err));
  }
}, 15 * 60 * 1000);

// ---------- Server ----------
const server = http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];
  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`Resurface (prod) tourne sur http://localhost:${PORT}`);
  console.log(`Stripe configuré: ${!!process.env.STRIPE_SECRET_KEY} | Resend configuré: ${!!process.env.RESEND_API_KEY}`);
});

module.exports = { runDailyDigestJob }; // exporté pour les tests
