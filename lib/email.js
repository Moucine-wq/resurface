// lib/email.js — envoi d'emails via l'API Resend (https://resend.com), sans SDK.
// Nécessite les variables d'env : RESEND_API_KEY, FROM_EMAIL (ex: "Resurface <rappels@tondomaine.com>")

const https = require('https');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Resurface <onboarding@resend.dev>';

function sendEmail({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    if (!RESEND_API_KEY) {
      console.warn('[email] RESEND_API_KEY manquant — email non envoyé (mode dev):', subject, '->', to);
      return resolve({ skipped: true });
    }
    const payload = JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html });
    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          console.error('[email] Échec envoi:', res.statusCode, data);
          return reject(new Error('Resend error ' + res.statusCode + ': ' + data));
        }
        resolve(JSON.parse(data));
      });
    });
    req.on('error', (err) => {
      console.error('[email] Erreur réseau:', err.message);
      reject(err);
    });
    req.write(payload);
    req.end();
  });
}

const EMAIL_I18N = {
  fr: {
    subject: (n) => `${n} rappel${n > 1 ? 's' : ''} à traiter aujourd'hui`,
    title: 'Resurface',
    intro: "Voici ce qui refait surface aujourd'hui :",
    cta: 'Ouvrir Resurface',
  },
  en: {
    subject: (n) => `${n} reminder${n > 1 ? 's' : ''} due today`,
    title: 'Resurface',
    intro: 'Here\'s what resurfaced today:',
    cta: 'Open Resurface',
  },
  es: {
    subject: (n) => `${n} recordatorio${n > 1 ? 's' : ''} para hoy`,
    title: 'Resurface',
    intro: 'Esto es lo que resurgió hoy:',
    cta: 'Abrir Resurface',
  },
  pt: {
    subject: (n) => `${n} lembrete${n > 1 ? 's' : ''} para hoje`,
    title: 'Resurface',
    intro: 'Aqui está o que ressurgiu hoje:',
    cta: 'Abrir Resurface',
  },
};

function digestSubject(count, locale = 'fr') {
  const dict = EMAIL_I18N[locale] || EMAIL_I18N.fr;
  return dict.subject(count);
}

function digestEmailHtml(items, locale = 'fr') {
  const dict = EMAIL_I18N[locale] || EMAIL_I18N.fr;
  const rows = items.map(i =>
    `<li style="margin-bottom:8px;">${escapeHtml(i.text)}${i.category ? ` <span style="color:#8A8A99;font-size:12px;">(${escapeHtml(i.category)})</span>` : ''}</li>`
  ).join('');
  return `
    <div style="font-family:sans-serif;background:#0A0A0F;color:#EDEDF2;padding:32px;">
      <h2 style="color:#4DFFC3;margin-bottom:4px;">${dict.title}</h2>
      <p style="color:#8A8A99;margin-bottom:20px;">${dict.intro}</p>
      <ul style="padding-left:20px;">${rows}</ul>
      <p style="margin-top:24px;">
        <a href="${process.env.APP_URL || '#'}" style="background:#4DFFC3;color:#0A0A0F;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">${dict.cta}</a>
      </p>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { sendEmail, digestEmailHtml, digestSubject };
