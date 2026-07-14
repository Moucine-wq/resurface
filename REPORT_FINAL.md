# Rapport final — Resurface v4.1 bêta

## Correction demandée

La devise a été réintroduite sans retirer les améliorations de la v4. La PWA, les heures, les fuseaux, la localisation, le digest et la navigation mobile sont conservés.

## Devise

- préférence `currency` ajoutée au compte utilisateur ;
- migration automatique de la base existante ;
- sélection manuelle persistante ;
- mode automatique lié au pays ;
- mise à jour à la connexion lorsque le mode automatique est actif ;
- aperçu du futur prix formaté avec `Intl.NumberFormat` ;
- aucun appel Stripe et aucun paiement pendant la bêta ;
- devises : EUR, USD, GBP, CAD, BRL, XOF, MXN, CHF, AUD, JPY, NGN, GHS, ZAR, INR et CNY.

## Catégories

Les catégories sont maintenant détaillées et accompagnées d’une explication : travail, personnel, relance, argent, abonnement, administratif, santé, famille, maison, idée, apprentissage, voyage, achats, événement, autre ou aucune catégorie.

## Répétition

Nouveau modèle de données :

- `recurrence_type` ;
- `recurrence_interval` ;
- compatibilité maintenue avec `recurring_days`.

Règles disponibles : une fois, quotidien, jours ouvrables, hebdomadaire, deux semaines, mensuel, deux mois, trimestre, six mois, annuel et nombre personnalisé de jours.

Les calculs mensuels utilisent les mois calendaires. Exemple : un rappel fixé au 31 janvier passe au dernier jour disponible du mois suivant.

## Migrations

- ajout non destructif de `users.currency` ;
- ajout non destructif de `items.recurrence_type` ;
- ajout non destructif de `items.recurrence_interval` ;
- conversion automatique des anciennes répétitions 1/7/14/30/90/365 jours.

## PWA et cache

- cache du service worker changé en `resurface-v4.1-beta-1` ;
- l’ancienne version est supprimée lors de l’activation du nouveau service worker ;
- manifest, icônes et installation conservés.

## Tests exécutés

- vérification syntaxique du serveur ;
- vérification syntaxique du frontend ;
- vérification syntaxique du service worker ;
- démarrage sur base temporaire ;
- inscription avec devise ;
- modification du pays et de la devise ;
- création avec catégorie détaillée ;
- répétition en jours ouvrables ;
- intervalle personnalisé ;
- création automatique de la prochaine occurrence ;
- test de migration depuis une base v4 existante.

Résultat : tous les tests passent.

## Version de santé attendue

```json
{
  "ok": true,
  "version": "4.1.0-beta",
  "betaMode": true
}
```
