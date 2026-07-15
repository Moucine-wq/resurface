# Resurface v3.3 — PWA avec Web Push

Cette version conserve l’interface v3 de Resurface et ajoute des notifications Web Push professionnelles. Un élément programmé à une date et une heure peut désormais déclencher une notification système même lorsque l’interface web est fermée, à condition que l’utilisateur ait volontairement activé les notifications sur l’appareil concerné.

## Stack

- **Frontend** : HTML, CSS et JavaScript natifs dans `public/`.
- **PWA** : Web App Manifest, Service Worker et icônes installables.
- **Backend** : serveur HTTP Node.js 22 dans `server.js`.
- **Base de données** : SQLite via `node:sqlite`, fichier persistant dans `data/resurface.db`.
- **Authentification** : email/mot de passe, PBKDF2-SHA512, sessions Bearer stockées dans SQLite.
- **Push** : protocole Web Push avec VAPID via le paquet `web-push`.
- **Services facultatifs** : Stripe pour Premium et Resend pour le digest email.

## Installation locale

```bash
npm install
npm run generate:vapid
```

Copier `.env.example` vers `.env` uniquement pour référence, puis exporter les valeurs dans le terminal ou utiliser les variables de l’hébergeur. Le serveur ne charge pas automatiquement un fichier `.env`.

Exemple Linux/macOS :

```bash
export VAPID_PUBLIC_KEY='...'
export VAPID_PRIVATE_KEY='...'
export VAPID_SUBJECT='mailto:contact@votredomaine.com'
npm start
```

Ouvrir ensuite `http://localhost:3000`. Les Service Workers et Push nécessitent un contexte sécurisé ; `localhost` est accepté pour le développement et Railway fournit HTTPS en production.

## Variables Web Push

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:contact@votredomaine.com
PUSH_POLL_INTERVAL_MS=30000
PUSH_MAX_ATTEMPTS=5
```

La paire VAPID doit être générée une seule fois et conservée entre les déploiements. Changer la paire peut obliger les utilisateurs à se réabonner.

## Déploiement Railway

- Start Command : `npm start`
- Healthcheck Path : `/api/health`
- Volume persistant : `/app/data`
- Variables : ajouter les trois variables VAPID dans l’onglet **Variables**

Commande de vérification :

```bash
npm run check
npm test
```

Après déploiement :

```text
https://resurface-production-0363.up.railway.app/api/health
```

La réponse doit inclure :

```json
{"ok":true,"version":"3.3.0","pushConfigured":true}
```

## Parcours utilisateur Push

1. L’utilisateur crée son premier Resurface.
2. L’application affiche une invitation, sans ouvrir automatiquement la demande système.
3. Il clique sur **Activer les notifications**.
4. L’abonnement de cet appareil est enregistré dans son compte.
5. À l’échéance, le serveur envoie une notification à chaque appareil actif.
6. Le clic ouvre directement l’élément et ses actions : Fait, Refaire surface, Demain, Semaine prochaine et Archiver.

Sur iPhone/iPad, l’utilisateur doit d’abord ajouter Resurface à l’écran d’accueil, ouvrir l’application depuis cette icône, puis activer les notifications dans Réglages.

## Documentation détaillée

Voir [`PUSH_NOTIFICATIONS.md`](./PUSH_NOTIFICATIONS.md) et [`REPORT_FINAL.md`](./REPORT_FINAL.md).
