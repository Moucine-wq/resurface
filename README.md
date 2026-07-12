# Resurface — version production (Stripe + emails)

SaaS complet : comptes utilisateurs, abonnement Premium via Stripe, email quotidien
de rappel via Resend. Zéro dépendance npm (Node.js natif : `http`, `https`, `node:sqlite`).

## 1. Configuration Stripe (10 min)

1. **Crée le produit** : Dashboard Stripe → Product catalog → "+ Add product"
   - Nom : "Resurface Premium"
   - Prix : 9€, récurrent, mensuel
   - Copie l'ID du prix généré (`price_...`) → colle-le dans `STRIPE_PRICE_ID`

2. **Récupère ta clé secrète** : Developers → API keys → Secret key (`sk_live_...` en prod, `sk_test_...` pour tester)
   → colle-la dans `STRIPE_SECRET_KEY`

3. **Crée le webhook** : Developers → Webhooks → "+ Add endpoint"
   - URL : `https://ton-domaine.com/api/stripe/webhook`
   - Événements à écouter : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Une fois créé, copie le "Signing secret" (`whsec_...`) → colle-le dans `STRIPE_WEBHOOK_SECRET`

   ⚠️ Le webhook ne peut être testé qu'une fois l'app déployée avec une URL publique (Stripe doit
   pouvoir l'atteindre). En local, utilise `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   avec la [Stripe CLI](https://stripe.com/docs/stripe-cli) si tu veux tester avant de déployer.

## 2. Configuration Resend (5 min) — pour les emails de rappel

1. Crée un compte sur [resend.com](https://resend.com) (gratuit, 100 emails/jour)
2. Dashboard → API Keys → "Create API Key" → colle-la dans `RESEND_API_KEY`
3. Pour démarrer vite sans configurer de domaine : `FROM_EMAIL=Resurface <onboarding@resend.dev>`
   (fonctionne immédiatement mais moins pro). Pour utiliser ton propre domaine : Domains → Add domain,
   ajoute les enregistrements DNS demandés, puis `FROM_EMAIL=Resurface <rappels@tondomaine.com>`

## 3. Déploiement (Railway recommandé)

1. Pousse ce dossier sur GitHub
2. Railway → New Project → Deploy from GitHub
3. Dans l'onglet "Variables" du projet Railway, colle toutes les variables de `.env.example`
   avec tes vraies valeurs
4. Ajoute un **Volume** monté sur `/app/data` (sinon la base SQLite est perdue à chaque redéploiement)
5. Railway détecte automatiquement `node server.js` comme commande de démarrage
6. Une fois déployé, mets à jour `APP_URL` avec l'URL Railway obtenue, et mets à jour
   l'URL du webhook Stripe (étape 1.3) avec cette même URL

## 4. Vérifier que tout fonctionne

1. Crée un compte sur ton app déployée
2. Ajoute 10 rappels → le 11e doit déclencher le paywall
3. Clique "Passer en Premium" → tu dois être redirigé vers une vraie page Stripe Checkout
4. Paye avec une carte de test Stripe si tu es en mode test (`4242 4242 4242 4242`, n'importe quelle date future, n'importe quel CVC)
5. Tu dois être redirigé vers l'app avec le badge "★ Premium" actif en quelques secondes
6. Vérifie dans Stripe Dashboard → Webhooks que l'événement `checkout.session.completed` est bien marqué "Succeeded"
7. Le lendemain (ou en ajustant `DIGEST_HOUR_UTC` pour tester plus vite), un email doit arriver
   avec la liste des rappels du jour, si des rappels sont dus

## Ce qui est géré automatiquement

- **Renouvellement/annulation d'abonnement** : le webhook `customer.subscription.updated`/`.deleted`
  met à jour le statut Premium automatiquement, sans action manuelle de ta part.
- **Portail de facturation** : les utilisateurs Premium ont un bouton "Gérer mon abonnement" qui les
  envoie sur le portail Stripe officiel (annulation, changement de carte, factures — Stripe gère tout).
- **Sécurité** : mots de passe hashés (PBKDF2 100k itérations), signatures webhook vérifiées avec
  protection anti-rejeu (5 min), le statut Premium n'est modifiable que côté serveur via webhook
  vérifié — impossible à falsifier depuis le navigateur.

## Langues

L'interface et les emails de rappel sont disponibles en français, anglais, espagnol et
portugais. La langue est détectée automatiquement (navigateur), modifiable à tout moment
via le sélecteur en haut à droite, et sauvegardée sur le compte — donc synchronisée sur
tous les appareils une fois connecté.

## Limites connues / prochaines étapes

- Pas de récupération de mot de passe (à ajouter si des utilisateurs le demandent)
- Le digest est un seul email/jour à heure fixe (`DIGEST_HOUR_UTC`) — pas encore personnalisable par utilisateur
- Pas de période d'essai gratuite configurée sur Stripe (facile à ajouter dans les paramètres du prix Stripe si tu veux tester la conversion)
- Pas encore de page de destination marketing (landing page) — l'app actuelle commence directement à l'écran de connexion

## Stack

Node.js natif uniquement : `http`/`https` pour le serveur et les appels Stripe/Resend,
`node:sqlite` pour la base de données, `crypto` pour le hashing et les signatures.
Aucun `npm install` requis, donc zéro dépendance à auditer ou à maintenir.
