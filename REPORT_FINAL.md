# Rapport final — Resurface v3.2

## Direction retenue

La version v4.1 n’a pas été utilisée comme base visuelle. L’interface a été ramenée au design v3 demandé : en-tête compact, grand bloc de capture, deux colonnes Aujourd’hui/À venir et section Terminés. Les fonctions utiles des versions suivantes ont été intégrées à cette structure.

## Changements UX/UI

- restauration complète de l’apparence v3 ;
- suppression de toutes les mentions « bêta » ;
- restauration de la page d’accueil marketing ;
- restauration du plan gratuit et du marketing Premium ;
- restauration du modal Premium ;
- devises toujours sélectionnables, même lorsqu’un Price ID Stripe manque ;
- message explicite indiquant si le paiement est prêt dans la devise ;
- bouton PWA Installer discret ;
- ajout de l’heure dans la zone de capture ;
- ajout d’un bouton Réglages sans navigation latérale ;
- catégories et répétitions détaillées avec une explication courte ;
- modification et report à une date et heure précises.

## Changements backend

- stockage UTC des échéances avec affichage dans le fuseau du client ;
- fuseau, pays, devise, heure du digest et préférence email par utilisateur ;
- migrations automatiques et compatibles avec les anciennes bases ;
- limite du plan gratuit : 10 éléments actifs ;
- Stripe facultatif et multidevise ;
- digest Premium à l’heure locale ;
- catégories et répétitions disponibles dans le modèle de données ;
- récurrences : quotidienne, jours ouvrables, hebdomadaire, toutes les deux semaines, mensuelle, bimestrielle, trimestrielle, semestrielle, annuelle et personnalisée.

## Sécurité et fiabilité

- création automatique du dossier SQLite ;
- requêtes SQL paramétrées ;
- vérification d’appartenance des éléments ;
- validation des dates, heures, fuseaux, pays, devises et intervalles ;
- PBKDF2 100 000 itérations ;
- comparaison de hash en temps constant ;
- limitation légère des tentatives d’authentification ;
- headers de sécurité ;
- nettoyage des sessions expirées ;
- coordonnées GPS non envoyées au serveur.

## Tests exécutés

- vérification syntaxique de tous les fichiers JavaScript ;
- démarrage avec une base SQLite temporaire ;
- endpoint de santé ;
- configuration des 15 devises ;
- inscription et connexion ;
- sauvegarde pays/devise/fuseau ;
- création date + heure ;
- catégorie détaillée ;
- répétition détaillée ;
- modification d’un élément ;
- création de l’occurrence suivante ;
- classement Aujourd’hui/À venir/Terminés.

Résultat : `npm run check` et `npm test` réussissent.

## Déploiement Railway

1. Envoyer tous les fichiers à la racine du dépôt GitHub.
2. Conserver le service Railway actuel.
3. Conserver le volume `/app/data`.
4. Start Command : `npm start`.
5. Healthcheck : `/api/health`.
6. Attendre `SUCCESS`, puis recharger avec `Ctrl + Shift + R`.
7. Pour une PWA déjà installée, fermer/réouvrir l’application ou la réinstaller afin de renouveler le cache.

Réponse attendue :

```json
{"ok":true,"version":"3.2.0","paymentsConfigured":false}
```

`paymentsConfigured` devient `true` dès qu’une clé Stripe et au moins un Price ID réel sont configurés.
