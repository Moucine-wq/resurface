'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const webpush = require('web-push');

const port = 39000 + Math.floor(Math.random() * 1000);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'resurface-v3-3-'));
const vapid = webpush.generateVAPIDKeys();
const child = spawn(process.execPath, ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    PORT: String(port),
    DB_PATH: path.join(temp, 'test.db'),
    VAPID_PUBLIC_KEY: vapid.publicKey,
    VAPID_PRIVATE_KEY: vapid.privateKey,
    VAPID_SUBJECT: 'mailto:test@example.com',
    PUSH_MOCK: '1',
    PUSH_POLL_INTERVAL_MS: '1000',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
child.stderr.on('data', chunk => { stderr += chunk; });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`Server did not start. ${stderr}`);
}
async function api(pathname, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/api${pathname}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(data)}`);
  return data;
}
function utcDateAndTime(date = new Date()) {
  return { date: date.toISOString().slice(0, 10), time: date.toISOString().slice(11, 16) };
}

(async () => {
  try {
    await waitForServer();
    const health = await api('/health');
    if (health.version !== '3.3.0' || health.pushConfigured !== true) throw new Error('Wrong version or Push configuration');
    const config = await api('/config');
    if (config.paymentsEnabled !== false || !config.supportedCurrencies.includes('XOF')) throw new Error('Currency config missing');
    if (!config.push?.configured || config.push.publicKey !== vapid.publicKey) throw new Error('Public VAPID configuration missing');

    const email = `test-${Date.now()}@example.com`;
    const signup = await api('/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        email, password: 'password123', locale: 'fr', timezone: 'America/New_York', country: 'US', currency: 'USD',
      }),
    });
    const auth = { Authorization: `Bearer ${signup.token}`, 'Content-Type': 'application/json' };
    const me = await api('/me', { headers: auth });
    if (me.timezone !== 'America/New_York' || me.country !== 'US' || me.currency !== 'USD') throw new Error('Settings not saved');

    const patched = await api('/me', { method: 'PATCH', headers: auth, body: JSON.stringify({ digestTime: '07:30', digestEnabled: true, country: 'BJ', currency: 'XOF' }) });
    if (patched.currency !== 'XOF' || patched.country !== 'BJ') throw new Error('Currency update failed');

    const subscriptions = [
      {
        endpoint: 'https://push.example.test/subscription/device-1',
        expirationTime: null,
        keys: { p256dh: 'B'.repeat(87), auth: 'A'.repeat(22) },
      },
      {
        endpoint: 'https://push.example.test/subscription/device-2',
        expirationTime: null,
        keys: { p256dh: 'C'.repeat(87), auth: 'D'.repeat(22) },
      },
    ];
    for (const [index, subscription] of subscriptions.entries()) {
      await api('/push/subscribe', { method: 'POST', headers: auth, body: JSON.stringify({
        subscription,
        deviceInfo: { platform: `test-${index + 1}`, language: 'fr', standalone: true },
      }) });
    }
    const pushStatus = await api('/push/status', { headers: auth });
    if (!pushStatus.configured || pushStatus.subscriptionCount !== 2) throw new Error('Multiple Push subscriptions were not saved');
    const testPush = await api('/push/test', { method: 'POST', headers: auth, body: '{}' });
    if (testPush.sent !== 2) throw new Error('Test Push was not sent to every device');

    const expiredSubscription = {
      endpoint: 'https://push.example.test/subscription/expired',
      expirationTime: null,
      keys: { p256dh: 'E'.repeat(87), auth: 'F'.repeat(22) },
    };
    await api('/push/subscribe', { method: 'POST', headers: auth, body: JSON.stringify({ subscription: expiredSubscription, deviceInfo: { platform: 'expired-test' } }) });
    const cleanupTest = await api('/push/test', { method: 'POST', headers: auth, body: '{}' });
    if (cleanupTest.sent !== 2 || cleanupTest.removed !== 1) throw new Error('Expired Push subscription was not cleaned up');
    const afterCleanup = await api('/push/status', { headers: auth });
    if (afterCleanup.subscriptionCount !== 2) throw new Error('Expired Push subscription still exists');

    const future = await api('/items', { method: 'POST', headers: auth, body: JSON.stringify({
      text: 'Call the client', resurfaceDate: '2030-05-10', resurfaceTime: '14:30', timezone: 'America/New_York',
      category: 'followup', recurrenceType: 'weekdays', recurrenceInterval: 1,
    }) });
    let items = await api('/items', { headers: auth });
    if (items.upcoming.length !== 1) throw new Error('Item not classified as upcoming');
    if (items.upcoming[0].resurfaceTime !== '14:30') throw new Error('Timezone conversion failed');
    if (items.upcoming[0].category !== 'followup' || items.upcoming[0].recurrenceType !== 'weekdays') throw new Error('Detailed options not saved');

    await api(`/items/${future.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({
      action: 'update', text: 'Call the client again', resurfaceDate: '2030-05-11', resurfaceTime: '15:45', timezone: 'America/New_York',
      category: 'subscription', recurrenceType: 'custom_days', recurrenceInterval: 10,
    }) });
    let updated = await api('/items', { headers: auth });
    if (updated.upcoming[0].text !== 'Call the client again' || updated.upcoming[0].resurfaceTime !== '15:45') throw new Error('Update failed');
    if (updated.upcoming[0].category !== 'subscription' || updated.upcoming[0].recurrenceType !== 'custom_days' || updated.upcoming[0].recurrenceInterval !== 10) throw new Error('Custom recurrence update failed');

    await api(`/items/${future.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ action: 'done', timezone: 'America/New_York' }) });
    const afterDone = await api('/items', { headers: auth });
    if (afterDone.done.length !== 1 || afterDone.upcoming.length !== 1) throw new Error('Recurring next occurrence was not created');
    if (afterDone.upcoming[0].resurfaceDate !== '2030-05-21') throw new Error(`Wrong recurring date: ${afterDone.upcoming[0].resurfaceDate}`);

    const now = utcDateAndTime();
    const due = await api('/items', { method: 'POST', headers: auth, body: JSON.stringify({
      text: 'Push scheduler test', resurfaceDate: now.date, resurfaceTime: now.time, timezone: 'UTC', recurrenceType: 'once',
    }) });
    let dueItem = null;
    for (let i = 0; i < 8; i++) {
      await sleep(600);
      dueItem = await api(`/items/${due.id}`, { headers: auth });
      if (dueItem.notificationSentAt) break;
    }
    if (!dueItem?.notificationSentAt) throw new Error('Due item was not sent by the Push scheduler');

    const deliveryDb = new (require('node:sqlite').DatabaseSync)(path.join(temp, 'test.db'));
    let deliveries = deliveryDb.prepare(`SELECT status, attempts FROM push_deliveries WHERE item_id = ? ORDER BY id`).all(due.id);
    if (deliveries.length !== 2 || deliveries.some(row => row.status !== 'sent' || row.attempts !== 1)) {
      throw new Error(`Wrong per-device delivery state: ${JSON.stringify(deliveries)}`);
    }
    await sleep(2_000);
    deliveries = deliveryDb.prepare(`SELECT status, attempts FROM push_deliveries WHERE item_id = ? ORDER BY id`).all(due.id);
    if (deliveries.length !== 2 || deliveries.some(row => row.attempts !== 1)) throw new Error('Duplicate Push delivery attempt detected');
    deliveryDb.close();

    await api(`/items/${due.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ action: 'archive', timezone: 'UTC' }) });
    const archived = await api(`/items/${due.id}`, { headers: auth });
    if (archived.status !== 'archived') throw new Error('Archive action failed');

    console.log('Smoke tests passed');
  } finally {
    child.kill('SIGTERM');
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
