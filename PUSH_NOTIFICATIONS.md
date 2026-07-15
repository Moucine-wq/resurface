# Web Push Notifications — architecture et exploitation

## 1. Architecture détectée

| Couche | Implémentation |
|---|---|
| Frontend | SPA HTML/CSS/JavaScript sans framework (`public/index.html`, `public/app.js`, `public/styles.css`) |
| PWA | `public/manifest.webmanifest`, `public/service-worker.js`, icônes sous `public/icons/` |
| Backend | Node.js 22, serveur `http` natif dans `server.js` |
| Données | SQLite natif (`node:sqlite`) avec volume Railway `/app/data` |
| Authentification | PBKDF2-SHA512 + sel par utilisateur, session Bearer aléatoire enregistrée dans `sessions` |
| Paiement/email | Stripe et Resend, tous deux facultatifs |
| Web Push | `web-push`, VAPID public/privé et PushSubscription par appareil |

## 2. Fichiers modifiés ou ajoutés

- `server.js` : migrations, endpoints Push, scheduler, retry et ouverture d’un élément précis.
- `lib/push.js` : configuration VAPID et envoi chiffré Web Push.
- `public/app.js` : permission volontaire, abonnement, états, test, raccourcis 1/2 minutes et deep link.
- `public/service-worker.js` : événements `push` et `notificationclick`.
- `public/manifest.webmanifest` : installation standalone, icônes et raccourci.
- `public/index.html` : interface de notification, instructions iPhone et modal de l’élément.
- `public/styles.css` : styles associés.
- `public/icons/*` : icônes standards, maskable, Apple et badge.
- `package.json` / `package-lock.json` : dépendance `web-push` et commande VAPID.
- `.env.example` : variables VAPID et scheduler.
- `tests/smoke.js` : tests de deux appareils, scheduler et idempotence.
- `tests/migration.js` : compatibilité avec une base v3.2 existante.
- `scripts/generate-vapid.js` : génération de la paire VAPID.

## 3. Schéma de données

### Colonnes ajoutées à `items`

```sql
timezone TEXT NOT NULL DEFAULT 'UTC'
archived_at TEXT
notification_sent_at TEXT
notification_last_error TEXT
```

`resurface_at_utc` reste la source de vérité pour l’échéance. `timezone` conserve le fuseau dans lequel l’utilisateur a programmé l’élément.

### Table `push_subscriptions`

Une ligne par appareil/navigateur :

```sql
id, user_id, endpoint, p256dh, auth, expiration_time,
device_info, created_at, updated_at, last_success_at,
last_failure_at, failure_count
```

L’endpoint est unique. Un utilisateur peut posséder plusieurs abonnements et donc plusieurs appareils.

### Table `push_deliveries`

Une ligne par couple élément/appareil :

```sql
id, item_id, subscription_id, user_id, status, attempts,
next_attempt_at, claimed_at, sent_at, last_error,
created_at, updated_at
```

La contrainte `UNIQUE(item_id, subscription_id)` empêche de créer deux livraisons logiques pour le même élément et le même appareil.

## 4. Endpoints

Tous les endpoints ci-dessous, sauf `/api/config` et `/api/health`, utilisent l’authentification existante.

- `GET /api/config` : expose uniquement la clé VAPID publique.
- `GET /api/push/status` : état serveur et appareils enregistrés.
- `POST /api/push/subscribe` : enregistre ou actualise l’appareil courant.
- `POST /api/push/unsubscribe` : retire l’appareil courant.
- `POST /api/push/test` : envoie un test à tous les appareils actifs du compte.
- `GET /api/items/:id` : charge l’élément ciblé par une notification.

La clé VAPID privée n’est jamais envoyée au navigateur.

## 5. Scheduler et idempotence

Le serveur vérifie les échéances toutes les 30 secondes par défaut :

1. sélection des éléments `pending` dont `resurface_at_utc <= maintenant` ;
2. création idempotente d’une livraison par abonnement ;
3. revendication des livraisons dues ;
4. envoi avec `urgency: high`, TTL de 24 heures et un `topic` stable ;
5. statut `sent`, `retry`, `failed` ou `expired` ;
6. remplissage de `notification_sent_at` lorsque les livraisons sont terminées.

Les erreurs temporaires sont retentées avec les délais suivants : 1 minute, 5 minutes, 15 minutes, 1 heure et 6 heures. Les réponses 404/410 suppriment l’abonnement expiré.

La base garantit une forte idempotence applicative. Comme tout système distribué, une panne exactement entre l’acceptation du message par le fournisseur Push et l’écriture de confirmation dans SQLite ne permet pas une garantie mathématique « exactly once ». Le `topic`, le `tag` de notification et la contrainte d’unicité réduisent aussi ce risque côté fournisseur et appareil.

## 6. Autorisation et iPhone

La permission n’est jamais demandée au chargement. L’invitation apparaît après la création du premier élément, et `Notification.requestPermission()` n’est appelée qu’après un clic volontaire.

États gérés :

- `granted` : appareil abonné ;
- `denied` : bouton désactivé et instructions pour les réglages ;
- `default` : invitation disponible ;
- `unsupported` : message explicite ;
- serveur non configuré : message VAPID manquant.

Pour iPhone/iPad :

1. ouvrir Resurface dans Safari ;
2. toucher **Partager** ;
3. choisir **Ajouter à l’écran d’accueil** ;
4. ouvrir Resurface depuis l’icône créée ;
5. se connecter, ouvrir Réglages et toucher **Activer les notifications**.

## 7. Procédure de test

### Test rapide

1. Se connecter.
2. Créer le premier élément.
3. Cliquer **Activer les notifications**.
4. Ouvrir **Réglages**.
5. Cliquer **Envoyer une notification test**.
6. Cliquer **Dans 1 minute** ou **Dans 2 minutes**, saisir un texte et programmer.

### Scénarios à valider sur chaque appareil

- application ouverte au premier plan ;
- application en arrière-plan ;
- navigateur/PWA complètement fermé ;
- clic sur la notification ;
- ouverture du bon élément ;
- actions Fait, Refaire surface, Demain, Semaine prochaine et Archiver ;
- deux appareils connectés au même compte ;
- désactivation des notifications sur un appareil sans affecter l’autre.

### Plateformes

- Chrome/Edge desktop avec PWA installée ;
- Chrome Android, application installée ;
- iPhone/iPad, application ajoutée à l’écran d’accueil et ouverte depuis son icône.

## 8. Logs utiles

Le serveur journalise uniquement des identifiants raccourcis, le résultat et le code HTTP Push. Il n’écrit pas dans les logs le texte du rappel, l’endpoint complet, les clés d’abonnement ou l’adresse email.
