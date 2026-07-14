# Resurface v3.2 — interface v3 enrichie

Cette version conserve le design simple et propre de la version v3, puis ajoute les fonctions utiles développées ensuite sans transformer le tableau de bord en une nouvelle interface.

## Inclus

- page d’accueil marketing complète ;
- tableau de bord v3 : capture en haut, Aujourd’hui, À venir et Terminés ;
- PWA installable sur téléphone et ordinateur ;
- date et heure pour chaque élément ;
- détection automatique du fuseau horaire à chaque connexion ;
- pays et devise enregistrés dans les réglages ;
- localisation GPS facultative et uniquement affichée localement ;
- 15 devises sélectionnables avec prix localisé ;
- catégories détaillées ;
- répétitions détaillées et intervalle personnalisé ;
- plan gratuit limité à 10 éléments actifs ;
- marketing Premium et Stripe facultatif ;
- digest email Premium adapté à l’heure locale ;
- français, anglais, espagnol et portugais.

## Démarrage local

Node.js 22 est requis.

```bash
npm start
```

Puis ouvrir `http://localhost:3000`.

## Railway

- Start Command : `npm start`
- Healthcheck Path : `/api/health`
- Volume : `/app/data`
- Domaine : conserver le domaine Railway existant

L’application crée automatiquement le dossier de données. Le volume reste indispensable pour conserver les comptes et rappels entre les déploiements.

## Stripe facultatif

L’application fonctionne sans Stripe. Toutes les devises restent sélectionnables et leur prix marketing est visible. Le bouton de paiement devient actif uniquement lorsqu’un véritable Price ID Stripe est présent pour la devise choisie.

Variables principales :

```env
APP_URL=https://resurface-production-0363.up.railway.app
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_EUR=price_...
STRIPE_PRICE_ID_USD=price_...
```

Les autres variables sont documentées dans `.env.example`.

Webhook :

```text
https://resurface-production-0363.up.railway.app/api/stripe/webhook
```

Événements :

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Emails

```env
RESEND_API_KEY=re_...
FROM_EMAIL=Resurface <onboarding@resend.dev>
```

Le digest email est réservé aux comptes Premium. Chaque utilisateur choisit son heure locale et son fuseau horaire.

## Vérifications

```bash
npm run check
npm test
```
