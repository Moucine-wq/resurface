# Resurface v3 — rapport final

## Stack détectée
Node.js 22 natif, serveur HTTP sans framework, SQLite via `node:sqlite`, Stripe REST, Resend REST, frontend HTML/CSS/JavaScript sans dépendance.

## Priorités corrigées
- P0/P1 : absence de landing page, proposition de valeur peu claire, prix sans périodicité, sélection de langue dupliquée selon l'écran, états vides faibles, parcours d'inscription trop abrupt.
- P1 : redirections Stripe fondées sur l'en-tête `Origin`, absence de headers de sécurité, email insuffisamment validé, mot de passe trop court.
- P2 : responsive, accessibilité clavier, SEO, feedback des actions, devise localisée et sélection manuelle.

## UX/UI
- Landing page complète avec hero, démonstration de digest, fonctionnement en 3 étapes, cas d'usage, tarifs et CTA.
- Interface connectée recentrée sur la capture rapide.
- Raccourcis de dates, états vides explicites, compteurs nommés, toasts de confirmation.
- Report, terminaison, réouverture, suppression avec confirmation.
- Design mobile et desktop, focus sur la lisibilité, zones tactiles et réduction des animations.
- Un seul sélecteur de langue par écran.

## Tarification multidevise
- EUR : 9 €/mois
- USD : 9 $/mois
- GBP : 8 £/mois
- CAD : 12 CA$/mois
- BRL : 29,90 R$/mois

Chaque devise exige un vrai Price Stripe mensuel. Les devises non configurées sont désactivées dans l'interface. Le serveur refuse un checkout non configuré plutôt que d'afficher un prix différent du paiement.

## Backend et sécurité
- Endpoint public `/api/config` pour les devises et disponibilités Stripe.
- Endpoint `/api/health` pour Railway.
- Headers CSP, anti-framing, nosniff, referrer policy et permissions policy.
- Redirections Stripe basées sur `APP_URL`, pas sur un Origin fourni par le client.
- Validation d'email renforcée et mot de passe minimum de 8 caractères.
- Autorisations par utilisateur conservées sur toutes les mutations d'éléments.

## Fichiers modifiés
- `public/index.html`
- `public/robots.txt`
- `public/sitemap.xml`
- `server.js`
- `.env.example`
- `README.md`
- `package.json`

## Variables Railway
Obligatoires : `APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `FROM_EMAIL`.
Prix : `STRIPE_PRICE_ID_EUR`, `STRIPE_PRICE_ID_USD`, `STRIPE_PRICE_ID_GBP`, `STRIPE_PRICE_ID_CAD`, `STRIPE_PRICE_ID_BRL`. `STRIPE_PRICE_ID` reste un fallback EUR.
Optionnelles : `DIGEST_HOUR_UTC`, `PORT`.

## Tests exécutés
- Vérification syntaxique de `server.js`, `lib/stripe.js`, `lib/email.js` et du JavaScript frontend.
- Démarrage local sur Node 22.
- `GET /api/health` et `GET /api/config`.
- Inscription, authentification, création d'un rappel et lecture de la liste.
- Refus propre d'un checkout BRL non configuré.
- Chargement de la landing page en HTTP 200.

## Limites restant à traiter
- Mot de passe oublié non implémenté.
- Digest toujours déclenché à une heure UTC globale, pas par fuseau utilisateur.
- Les contenus juridiques sont des bases informatives, à faire valider avant une commercialisation large.
- Les vrais paiements, webhooks et emails nécessitent les clés Railway/Stripe/Resend et un test manuel en environnement de test.
- L'adresse `support@resurface.app` doit être remplacée si ce domaine n'est pas possédé.

## Déploiement Railway
1. Créer les cinq prix mensuels dans le même produit Stripe.
2. Ajouter leurs Price IDs dans Railway.
3. Définir `APP_URL=https://resurface-production-0363.up.railway.app`.
4. Vérifier le volume monté sur `/app/data`.
5. Déployer le dossier à la racine du dépôt.
6. Tester `/api/health`.
7. Tester chaque devise en mode Stripe Test.
8. Confirmer les événements webhook `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
