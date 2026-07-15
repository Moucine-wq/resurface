# Rapport final — Resurface v3.3 Web Push

## Résultat

Le système Web Push a été intégré sur la base visuelle v3.2 sans retirer la landing page, le marketing Premium, les devises, les catégories, les récurrences, les fuseaux horaires, le digest email ou l’installation PWA.

## Fonctionnalités livrées

- Manifest complet avec `display: standalone`, icônes standard, maskable et Apple.
- Service Worker au scope `/`.
- Réception d’un Push lorsque l’interface est fermée.
- Clic sur la notification vers `/?resurface=<id>`.
- Ouverture automatique du détail de l’élément après authentification.
- Actions : Fait, Refaire surface, Demain, Semaine prochaine, Archiver.
- Permission uniquement après une action volontaire.
- Invitation après le premier Resurface.
- Instructions iPhone dédiées.
- Détection `granted`, `denied`, `default`, `unsupported` et serveur non configuré.
- Plusieurs appareils par utilisateur.
- Clés VAPID privées conservées côté serveur.
- Dates d’échéance comparées en UTC et fuseau original conservé.
- Scheduler serveur, verrou de traitement, reprise des claims anciens, retry et nettoyage 404/410.
- Idempotence par livraison et par appareil.
- Bouton de notification test.
- Raccourcis pour programmer dans 1 ou 2 minutes.
- Logs sans contenu privé.

## Migrations automatiques

Les bases v3.2 sont mises à niveau au démarrage. Les anciens utilisateurs et éléments sont conservés. Un test dédié crée une base au schéma v3.2, démarre v3.3, puis vérifie la présence des anciennes données et des nouvelles tables.

## Tests exécutés

```bash
npm run check
npm test
npm audit --omit=dev --audit-level=moderate
```

Résultats :

- syntaxe backend, frontend, Service Worker et librairies : réussie ;
- migration v3.2 → v3.3 : réussie ;
- inscription et réglages : réussis ;
- deux abonnements/appareils par compte : réussis ;
- notification test vers deux appareils simulés : réussie ;
- scheduler sur élément arrivé à échéance : réussi ;
- une livraison par appareil, sans seconde tentative après succès : réussie ;
- ouverture API de l’élément et archivage : réussis ;
- audit npm : aucune vulnérabilité connue signalée.

Les envois réels via Apple/Google/Mozilla doivent être validés après ajout des clés VAPID sur Railway, car les tests automatisés utilisent un transport Push simulé et ne peuvent pas accepter une permission système dans cet environnement.

## Déploiement Railway

1. Remplacer les fichiers du dépôt par cette version et committer `Deploy Resurface v3.3 Web Push`.
2. Conserver le volume `/app/data`.
3. Exécuter localement une seule fois `npm run generate:vapid`.
4. Ajouter dans Railway :

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:contact@votredomaine.com
PUSH_POLL_INTERVAL_MS=30000
PUSH_MAX_ATTEMPTS=5
```

5. Conserver `Start Command: npm start` et `Healthcheck Path: /api/health`.
6. Redéployer.
7. Vérifier que `/api/health` retourne `version: 3.3.0` et `pushConfigured: true`.
8. Tester d’abord **Envoyer une notification test**, puis un élément à +1 minute.

## Point d’exploitation important

Le scheduler s’exécute dans le processus Node principal, ce qui correspond à l’architecture actuelle : un seul service Railway et une base SQLite locale sur volume. Ne lancez pas plusieurs réplicas du même service contre le même fichier SQLite. Pour une montée en charge multi-instance, migrer le scheduler vers un worker dédié et la base vers PostgreSQL avec verrouillage transactionnel.
