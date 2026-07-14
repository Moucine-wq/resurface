// Email delivery through Resend API, without an SDK.
const https = require('https');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Resurface <onboarding@resend.dev>';

function sendEmail({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    if (!RESEND_API_KEY) {
      console.warn('[email] RESEND_API_KEY missing; skipped:', subject, '->', to);
      return resolve({ skipped: true });
    }
    const payload = JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html });
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, response => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        if (response.statusCode >= 400) return reject(new Error(`Resend ${response.statusCode}: ${data}`));
        try { resolve(JSON.parse(data)); } catch { resolve({ ok: true }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const COPY = {
  fr: {
    subject: n => `${n} rappel${n > 1 ? 's' : ''} refait${n > 1 ? 's' : ''} surface aujourd’hui`,
    intro: 'Voici ce qui mérite votre attention aujourd’hui :',
    cta: 'Ouvrir Resurface',
  },
  en: {
    subject: n => `${n} reminder${n > 1 ? 's' : ''} resurfaced today`,
    intro: 'Here is what needs your attention today:',
    cta: 'Open Resurface',
  },
  es: {
    subject: n => `${n} recordatorio${n > 1 ? 's' : ''} reapareció hoy`,
    intro: 'Esto es lo que necesita tu atención hoy:',
    cta: 'Abrir Resurface',
  },
  pt: {
    subject: n => `${n} lembrete${n > 1 ? 's' : ''} voltou hoje`,
    intro: 'Isto é o que precisa da sua atenção hoje:',
    cta: 'Abrir Resurface',
  },
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function digestSubject(count, locale = 'fr') {
  return (COPY[locale] || COPY.fr).subject(count);
}
function digestEmailHtml(items, locale = 'fr') {
  const dict = COPY[locale] || COPY.fr;
  const rows = items.map(item => `
    <li style="margin:0 0 12px;padding:12px 14px;background:#f4faf7;border-radius:12px;list-style:none;">
      <strong style="color:#10231b;">${escapeHtml(item.text)}</strong>
      <div style="margin-top:5px;color:#62756d;font-size:12px;">
        ${item.displayTime ? escapeHtml(item.displayTime) : ''}${item.category ? ` · ${escapeHtml(item.category)}` : ''}
      </div>
    </li>`).join('');
  return `<!doctype html>
  <html><body style="margin:0;background:#eef5f1;font-family:Arial,sans-serif;color:#10231b;">
    <div style="max-width:600px;margin:0 auto;padding:28px 16px;">
      <div style="background:#ffffff;border-radius:20px;padding:28px;box-shadow:0 10px 30px rgba(16,35,27,.08);">
        <div style="font-size:22px;font-weight:800;color:#087a57;">Resurface</div>
        <p style="color:#62756d;line-height:1.6;">${dict.intro}</p>
        <ul style="padding:0;margin:18px 0;">${rows}</ul>
        <a href="${escapeHtml(process.env.APP_URL || '#')}" style="display:inline-block;background:#0b8c63;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700;">${dict.cta}</a>
      </div>
    </div>
  </body></html>`;
}

module.exports = { sendEmail, digestEmailHtml, digestSubject };
