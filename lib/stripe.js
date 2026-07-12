// lib/stripe.js — intégration Stripe sans SDK (appels REST bruts en HTTPS natif).
// Nécessite les variables d'env : STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET

const https = require('https');
const querystring = require('querystring');
const crypto = require('crypto');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

function stripeRequest(path, params) {
  return new Promise((resolve, reject) => {
    if (!STRIPE_SECRET_KEY) {
      return reject(new Error('STRIPE_SECRET_KEY manquant dans les variables d\'environnement.'));
    }
    const body = querystring.stringify(params);
    const options = {
      hostname: 'api.stripe.com',
      path,
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.error?.message || 'Erreur Stripe (' + res.statusCode + ')'));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Réponse Stripe illisible: ' + data));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Crée une Stripe Checkout Session en mode abonnement.
 * Retourne { id, url } — rediriger l'utilisateur vers `url`.
 */
async function createCheckoutSession({ userId, customerEmail, successUrl, cancelUrl, priceId }) {
  const resolvedPriceId = priceId || STRIPE_PRICE_ID;
  if (!resolvedPriceId) throw new Error('STRIPE_PRICE_ID manquant.');

  const session = await stripeRequest('/v1/checkout/sessions', {
    'mode': 'subscription',
    'line_items[0][price]': resolvedPriceId,
    'line_items[0][quantity]': '1',
    'success_url': successUrl,
    'cancel_url': cancelUrl,
    'customer_email': customerEmail,
    'metadata[user_id]': userId,
    'subscription_data[metadata][user_id]': userId,
    'allow_promotion_codes': 'true',
  });
  return { id: session.id, url: session.url };
}

/**
 * Crée une session du portail client Stripe (pour gérer/annuler son abonnement).
 */
async function createBillingPortalSession({ customerId, returnUrl }) {
  const session = await stripeRequest('/v1/billing_portal/sessions', {
    'customer': customerId,
    'return_url': returnUrl,
  });
  return { url: session.url };
}

/**
 * Vérifie la signature d'un webhook Stripe (implémentation manuelle du protocole Stripe-Signature).
 * `rawBody` doit être la chaîne brute reçue (PAS du JSON déjà parsé).
 */
function verifyWebhookSignature(rawBody, signatureHeader, secret = STRIPE_WEBHOOK_SECRET) {
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET manquant.');
  if (!signatureHeader) throw new Error('En-tête Stripe-Signature manquant.');

  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) throw new Error('Format de signature Stripe invalide.');

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new Error('Signature Stripe invalide.');
  }

  // Tolérance de 5 minutes pour éviter les attaques par rejeu
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error('Signature Stripe expirée (>5min).');

  return JSON.parse(rawBody);
}

module.exports = { createCheckoutSession, createBillingPortalSession, verifyWebhookSignature };
