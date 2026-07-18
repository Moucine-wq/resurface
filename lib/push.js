'use strict';

const webpush = require('web-push');

let configuredFingerprint = '';
let lastConfigurationError = null;

function getConfig() {
  const publicKey = String(process.env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || '').trim();
  const subject = String(process.env.VAPID_SUBJECT || '').trim();
  const hasRequiredValues = Boolean(publicKey && privateKey && /^(mailto:|https:\/\/)/i.test(subject));
  if (!hasRequiredValues) return { publicKey, privateKey, subject, configured: false, error: null };

  const fingerprint = `${subject}|${publicKey}|${privateKey}`;
  if (fingerprint !== configuredFingerprint) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      configuredFingerprint = fingerprint;
      lastConfigurationError = null;
    } catch (error) {
      lastConfigurationError = error;
      configuredFingerprint = '';
    }
  }
  return {
    publicKey,
    privateKey,
    subject,
    configured: !lastConfigurationError && configuredFingerprint === fingerprint,
    error: lastConfigurationError ? String(lastConfigurationError.message || 'Invalid VAPID configuration') : null,
  };
}

function configure() {
  return getConfig();
}

async function sendNotification(subscription, payload, options = {}) {
  const config = getConfig();
  if (!config.configured) {
    const error = new Error(config.error || 'Web Push is not configured.');
    error.code = 'PUSH_NOT_CONFIGURED';
    throw error;
  }

  // Used only by automated tests. It avoids sending a real network request.
  if (process.env.PUSH_MOCK === '1') {
    if (String(subscription?.endpoint || '').includes('/expired')) {
      const error = new Error('Mock subscription expired');
      error.statusCode = 410;
      throw error;
    }
    if (String(subscription?.endpoint || '').includes('/not-found')) {
      const error = new Error('Mock subscription not found');
      error.statusCode = 404;
      throw error;
    }
    if (String(subscription?.endpoint || '').includes('/temporary')) {
      const error = new Error('Mock temporary Push provider failure');
      error.statusCode = 503;
      throw error;
    }
    return { statusCode: 201, headers: {}, body: '' };
  }

  return webpush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: Number(options.ttl || 24 * 60 * 60),
    urgency: options.urgency || 'high',
    topic: options.topic,
    timeout: Number(options.timeout || 15_000),
  });
}

module.exports = {
  getConfig,
  configure,
  sendNotification,
};
