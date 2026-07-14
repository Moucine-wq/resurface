# Resurface v4.1 bêta — PWA installable

Resurface est une application web progressive installable, pensée comme une vraie application de rappels différés. La bêta reste gratuite et Stripe n’est pas utilisé.

## Nouveautés v4.1

- sélecteur de devise réintroduit et entièrement fonctionnel ;
- devise enregistrée sur le compte et synchronisée entre appareils ;
- adaptation automatique de la devise au pays détecté ou sélectionné ;
- sélection manuelle toujours prioritaire ;
- 15 devises disponibles : EUR, USD, GBP, CAD, BRL, XOF, MXN, CHF, AUD, JPY, NGN, GHS, ZAR, INR et CNY ;
- aperçu localisé du futur prix mensuel, sans paiement actif pendant la bêta ;
- catégories beaucoup plus détaillées ;
- répétitions plus complètes, avec jours ouvrables, tous les deux mois, tous les six mois et intervalle personnalisé ;
- explications visibles pour chaque catégorie et chaque répétition.

## Fonctions conservées

- PWA installable avec service worker et icônes ;
- navigation mobile et bouton d’ajout flottant ;
- sélection de la date et de l’heure ;
- fuseau horaire IANA mémorisé ;
- adaptation automatique du fuseau à la connexion ;
- pays détecté approximativement depuis l’appareil et modifiable ;
- position GPS facultative affichée uniquement sur l’appareil ;
- digest quotidien à l’heure locale ;
- création, modification, report, réouverture et suppression ;
- français, anglais, espagnol et portugais.

## Catégories disponibles

- aucune catégorie ;
- travail ;
- personnel ;
- relance ;
- argent ;
- abonnement ;
- administratif ;
- santé ;
- famille ;
- maison ;
- idée ;
- apprentissage ;
- voyage ;
- achats ;
- événement ;
- autre.

## Répétitions disponibles

- une seule fois ;
- chaque jour ;
- chaque jour ouvrable ;
- chaque semaine ;
- toutes les deux semaines ;
- chaque mois ;
- tous les deux mois ;
- tous les trois mois ;
- tous les six mois ;
- chaque année ;
- intervalle personnalisé de 1 à 3650 jours.

La prochaine occurrence est créée lorsque l’utilisateur marque l’occurrence actuelle comme terminée.

## Déploiement Railway

1. Remplace les fichiers du dépôt GitHub par le contenu de cette archive.
2. Ne supprime pas le volume Railway existant.
3. Monte le volume sur `/app/data`.
4. Garde la commande `npm start`.
5. Configure le healthcheck sur `/api/health`.
6. Variables minimales :

```env
APP_URL=https://resurface-production-0363.up.railway.app
RESEND_API_KEY=re_...        # facultatif pendant les tests
FROM_EMAIL=Resurface <onboarding@resend.dev>
```

Aucune variable Stripe n’est nécessaire.

## Vérification locale

```bash
npm run check
npm test
npm start
```

Ouvre ensuite `http://localhost:3000`.

## Migrations

Les migrations SQLite sont automatiques et non destructives. Les utilisateurs, rappels, catégories et anciennes récurrences sont conservés. Les anciennes valeurs de répétition sont converties vers le nouveau système.

## Localisation et vie privée

Le fuseau horaire est détecté par le navigateur sans GPS. Le pays est estimé depuis la région de l’appareil et reste modifiable. La position exacte n’est jamais nécessaire. Le bouton GPS affiche les coordonnées uniquement dans le navigateur et ne les envoie pas au serveur.
