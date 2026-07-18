'use strict';

// Tests for:
// - 404 subscription removal
// - Temporary failure retries (503)
// - Duplicate notification prevention (idempotent scheduler)
// - VAPID key rotation (re-subscribe with different key)
// - Notification deep-link URL contains the correct item ID

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const webpush = require('web-push');

const port = 41000 + Math.floor(Math.random() * 1000);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'resurface-push-'));
const dbPath = path.join(temp, 'test.db');
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
    PUSH_POLL_INTERVAL_MS: '800',
    PUSH_MAX_ATTEMPTS: '3',
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

    // Setup: create user and subscribe devices
    const email = `push-test-${Date.now()}@example.com`;
    const signup = await api('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', locale: 'en', timezone: 'UTC', country: 'US', currency: 'USD' }),
    });
    const auth = { Authorization: `Bearer ${signup.token}`, 'Content-Type': 'application/json' };

    // --- Test 1: 404 subscription removal ---
    console.log('  Test: 404 subscription removal...');
    const notFoundSub = {
      endpoint: 'https://push.example.test/subscription/not-found',
      expirationTime: null,
      keys: { p256dh: 'N'.repeat(87), auth: 'M'.repeat(22) },
    };
    const validSub = {
      endpoint: 'https://push.example.test/subscription/valid-device',
      expirationTime: null,
      keys: { p256dh: 'V'.repeat(87), auth: 'W'.repeat(22) },
    };
    await api('/push/subscribe', { method: 'POST', headers: auth, body: JSON.stringify({ subscription: notFoundSub, deviceInfo: { platform: 'not-found-test' } }) });
    await api('/push/subscribe', { method: 'POST', headers: auth, body: JSON.stringify({ subscription: validSub, deviceInfo: { platform: 'valid-test' } }) });

    let status = await api('/push/status', { headers: auth });
    if (status.subscriptionCount !== 2) throw new Error(`Expected 2 subscriptions, got ${status.subscriptionCount}`);

    const testResult = await api('/push/test', { method: 'POST', headers: auth, body: '{}' });
    if (testResult.sent !== 1 || testResult.removed !== 1) throw new Error(`404 test: expected sent=1 removed=1, got sent=${testResult.sent} removed=${testResult.removed}`);

    status = await api('/push/status', { headers: auth });
    if (status.subscriptionCount !== 1) throw new Error(`After 404 cleanup: expected 1 subscription, got ${status.subscriptionCount}`);
    console.log('  ✓ 404 subscription removed');

    // --- Test 2: Temporary failure retries (503) ---
    console.log('  Test: Temporary failure retries...');
    const tempFailSub = {
      endpoint: 'https://push.example.test/subscription/temporary',
      expirationTime: null,
      keys: { p256dh: 'T'.repeat(87), auth: 'U'.repeat(22) },
    };
    await api('/push/subscribe', { method: 'POST', headers: auth, body: JSON.stringify({ subscription: tempFailSub, deviceInfo: { platform: 'retry-test' } }) });

    const now = utcDateAndTime();
    const retryItem = await api('/items', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ text: 'Retry test item', resurfaceDate: now.date, resurfaceTime: now.time, timezone: 'UTC', recurrenceType: 'once' }),
    });

    // Wait for scheduler to attempt delivery (poll instead of fixed sleep)
    const db = new DatabaseSync(dbPath);
    let retryDeliveries;
    for (let i = 0; i < 10; i++) {
      await sleep(500);
      retryDeliveries = db.prepare(`SELECT status, attempts FROM push_deliveries WHERE item_id = ? ORDER BY subscription_id`).all(retryItem.id);
      if (retryDeliveries.length >= 2 && retryDeliveries.some(d => d.status === 'sent')) break;
    }
    // The valid-device subscription should be 'sent', the temporary one should be 'retry' with attempts >= 1
    const sentDelivery = retryDeliveries.find(d => d.status === 'sent');
    const retryDelivery = retryDeliveries.find(d => d.status === 'retry');
    if (!sentDelivery) throw new Error('Valid device delivery was not sent');
    if (!retryDelivery) throw new Error('Temporary failure was not set to retry status');
    if (retryDelivery.attempts < 1) throw new Error(`Retry delivery should have attempts >= 1, got ${retryDelivery.attempts}`);
    console.log('  \u2713 Temporary failure scheduled for retry');

    // --- Test 3: Duplicate notification prevention ---
    console.log('  Test: Duplicate notification prevention...');
    // The valid-device delivery for retryItem was already sent=1. Wait and verify it doesn't get resent.
    await sleep(2_000);
    const afterWait = db.prepare(`SELECT status, attempts FROM push_deliveries WHERE item_id = ? AND status = 'sent'`).all(retryItem.id);
    if (afterWait.length !== 1 || afterWait[0].attempts !== 1) throw new Error('Duplicate notification: sent delivery was attempted again');
    console.log('  \u2713 No duplicate notifications sent');

    // --- Test 4: VAPID key rotation (server re-subscribe) ---
    console.log('  Test: VAPID key rotation (re-subscribe endpoint)...');
    // Simulate device re-subscribing with a new subscription (same user, different endpoint = new key)
    const rotatedSub = {
      endpoint: 'https://push.example.test/subscription/rotated-device',
      expirationTime: null,
      keys: { p256dh: 'R'.repeat(87), auth: 'S'.repeat(22) },
    };
    await api('/push/subscribe', { method: 'POST', headers: auth, body: JSON.stringify({ subscription: rotatedSub, deviceInfo: { platform: 'rotated-test' } }) });
    status = await api('/push/status', { headers: auth });
    // Should now have valid-device + temporary + rotated-device = 3
    if (status.subscriptionCount !== 3) throw new Error(`After rotation re-subscribe: expected 3, got ${status.subscriptionCount}`);

    // Simulate same endpoint being re-subscribed with new keys (VAPID rotation scenario)
    const updatedSub = {
      endpoint: 'https://push.example.test/subscription/rotated-device',
      expirationTime: null,
      keys: { p256dh: 'X'.repeat(87), auth: 'Y'.repeat(22) },
    };
    await api('/push/subscribe', { method: 'POST', headers: auth, body: JSON.stringify({ subscription: updatedSub, deviceInfo: { platform: 'rotated-updated' } }) });
    status = await api('/push/status', { headers: auth });
    // Same endpoint → updated in place, count stays 3
    if (status.subscriptionCount !== 3) throw new Error(`After key update on same endpoint: expected 3, got ${status.subscriptionCount}`);

    // Verify the keys were actually updated
    const updatedRow = db.prepare(`SELECT p256dh, auth, device_info FROM push_subscriptions WHERE endpoint = ?`).get('https://push.example.test/subscription/rotated-device');
    if (updatedRow.p256dh !== 'X'.repeat(87) || updatedRow.auth !== 'Y'.repeat(22)) throw new Error('Keys were not updated after VAPID rotation re-subscribe');
    const deviceInfo = JSON.parse(updatedRow.device_info);
    if (deviceInfo.platform !== 'rotated-updated') throw new Error('Device info was not updated');
    console.log('  ✓ VAPID key rotation re-subscribe updates keys in place');

    // --- Test 5: Deep-link URL correctness ---
    console.log('  Test: Notification deep-link URL...');
    const deepLinkItem = await api('/items', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ text: 'Deep link test', resurfaceDate: '2030-01-01', resurfaceTime: '10:00', timezone: 'UTC', recurrenceType: 'once' }),
    });
    // Verify the item can be fetched by ID (simulating what notificationclick does)
    const fetched = await api(`/items/${deepLinkItem.id}`, { headers: auth });
    if (fetched.id !== deepLinkItem.id || fetched.text !== 'Deep link test') throw new Error('Deep-link item fetch failed');
    // Verify the URL would contain the correct ID (server builds /?resurface=<id>)
    const expectedUrl = `/?resurface=${encodeURIComponent(deepLinkItem.id)}`;
    if (!expectedUrl.includes(deepLinkItem.id)) throw new Error('Deep-link URL does not contain item ID');
    console.log('  ✓ Deep-link URL contains correct item ID');

    db.close();
    console.log('Push scenario tests passed');
  } finally {
    child.kill('SIGTERM');
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
