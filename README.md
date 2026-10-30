# Louche, non ?

Une application Android qui aide à repérer les SMS et e-mails frauduleux. Collez un message douteux : l'application explique en français simple ce qui cloche et quoi faire ensuite.

- **Analyse 100 % sur le téléphone** : les messages ne sont jamais envoyés. Aucun compte, aucune publicité, aucun traceur.
- **Aucune permission SMS** : on colle le message soi-même (le partage depuis d'autres applications arrive bientôt).
- **Un avis, pas une garantie** : l'application ne dit jamais qu'un message est « sûr », seulement qu'aucun signal suspect n'a été trouvé.

Les règles visent les arnaques qui circulent en France : faux colis, CPF, Ameli, amendes ANTAI, Crit'Air, banques, faux conseillers, « maman, j'ai changé de numéro ».

## Fonctionnalités

Disponibles :

- Coller un message et l'analyser.
- Analyse des liens hors ligne : nom d'un organisme dans un domaine qui n'est pas le sien, domaine officiel utilisé comme sous-domaine, typosquatting, mauvaise terminaison, punycode et caractères d'autres alphabets, liens raccourcis, terminaisons suspectes, adresses IP brutes, piège `site-officiel@site-pirate`.
- Repérage des scénarios d'arnaque courants en France, des techniques de pression, des demandes d'informations confidentielles, des demandes de paiement et des coupons prépayés.
- Verdict en trois niveaux, avec une explication pour chaque signal et le rappel de vérifier via l'application ou le site officiel.
- Actions : signaler au 33700 (avec l'aide pour le second SMS), ouvrir cybermalveillance.gouv.fr, savoir comment bloquer l'expéditeur.
- Règles dans un fichier JSON séparé, que la communauté peut enrichir par pull request.
- Mises à jour quotidiennes de la détection : les règles et une liste de sites d'arnaque déjà signalés sont téléchargées depuis GitHub, signées et vérifiées avant usage. Rien n'est envoyé ; désactivable dans « À propos ».
- Lien « Signaler une arnaque non détectée » qui ouvre le formulaire GitHub avec le message prérempli, et écran « À propos » (licence, code source, comment contribuer).

À venir :

- Recevoir un message via le menu « Partager » d'Android.
- Fiches pédagogiques sur les arnaques du moment.
- Mode « proche » : envoyer un verdict à un membre de sa famille en un geste.

Hors périmètre : l'envoi des messages ou des liens à un serveur pour vérification, le scan de QR codes.

## Fonctionnement de l'analyse

La détection repose sur deux sources complémentaires, combinées sur le téléphone :

1. **Les règles du projet** ([`rules/rules.json`](rules/rules.json)) : marques imitées, domaines officiels, scénarios d'arnaque français, expressions de pression ou de demande d'argent. Elles reconnaissent une arnaque à sa forme, même si elle est toute nouvelle. Elles sont intégrées à l'application et mises à jour en ligne.
2. **Une liste externe de sites d'arnaque déjà signalés** (`domains.json`), construite chaque jour à partir de bases publiques de phishing. Elle repère des sites qu'aucune règle ne permettrait de deviner, mais seulement une fois qu'ils ont été signalés.

| Source | Origine | Licence | Mise à jour |
| --- | --- | --- | --- |
| Règles | Ce dépôt, contributions de la communauté | GPL-3.0-or-later | À chaque modification de `rules/rules.json` |
| [phishing-filter](https://gitlab.com/malware-filter/phishing-filter) | Agrégation de [OpenPhish](https://openphish.com/), [IPThreat](https://ipthreat.net/) et [PhishTank](https://phishtank.org/), sans les sites les plus visités du web | CC BY-SA 4.0 | Deux fois par jour |

Sans connexion, ou si les mises à jour sont désactivées, l'application utilise les règles intégrées et la dernière liste téléchargée.

`analyze(texte)` dans `src/engine` renvoie un verdict, un score de 0 à 100, la liste des signaux trouvés et les liens extraits.

| Score | Verdict |
| --- | --- |
| 60 et plus | `scam` (Arnaque probable) |
| de 30 à 59 | `suspicious` (Message suspect) |
| moins de 30 | `clean` (Aucun signal suspect détecté) |

Chaque signal ajoute des points (voir `POINTS` dans `src/engine/analyze.ts`). Un lien présent dans la liste externe vaut à lui seul le verdict « Arnaque probable ». Quand tous les liens mènent vers des domaines officiels connus, le score baisse un peu, sauf si un signal fort a été trouvé.

Toutes les connaissances sont dans [`rules/rules.json`](rules/rules.json) :

| Clé | Contenu |
| --- | --- |
| `brands` | Organismes imités par les escrocs : libellé affiché, noms cherchés dans le texte, morceaux cherchés dans les domaines, domaines officiels |
| `trustedDomains` | Autres domaines officiels, jamais signalés |
| `feedExclusions` | Domaines à ne jamais signaler à cause de la liste de sites frauduleux, pour corriger une fausse alerte (facultatif) |
| `multiLevelSuffixes` | Suffixes comme `gouv.fr`, pour retrouver le domaine principal |
| `shorteners`, `suspiciousTlds`, `commonTlds` | Vérification des liens ; un domaine écrit sans `http` ni `www` n'est détecté que si sa terminaison figure dans ces listes |
| `scenarios` | Scénarios d'arnaque : au moins une ancre, plus assez de mots-clés (`minMatches`) |
| `pressure`, `sensitive`, `payment`, `giftCards`, `moneyRequest` | Expressions cherchées dans le texte |

Les expressions sont cherchées en mots entiers, sans tenir compte des majuscules ni des accents (`Crit'Air` correspond à `crit air`). Les morceaux de nom d'organisme de 6 lettres ou plus sont cherchés n'importe où dans un domaine ; les plus courts doivent en former une partie entière (`ameli-remboursement.fr` correspond à `ameli`, pas `amelie-boutique.fr`).

Le fichier de règles est validé au démarrage (`src/engine/rules.ts`) et par les tests.

## Mises à jour de la détection (feed)

Une GitHub Action ([`.github/workflows/feed.yml`](.github/workflows/feed.yml)) tourne toutes les six heures et publie sur la branche `feed` :

| Fichier | Contenu |
| --- | --- |
| `rules.json` | Copie de `rules/rules.json` de la branche `main` |
| `domains.json` | Sites d'arnaque signalés au cours des 45 derniers jours, sans les domaines officiels des organismes connus |
| `*.sig` | Signatures Ed25519 de chaque fichier |

L'application télécharge ces fichiers au plus une fois par jour, vérifie leur signature avec la clé publique de `src/config.ts`, puis les garde pour fonctionner hors ligne. Des règles plus anciennes que celles intégrées à l'application ou un fichier mal signé sont ignorés. Un site de la liste suffit à donner le verdict « Arnaque probable », sauf s'il figure dans `feedExclusions` de `rules.json` : l'Action le retire alors de la liste, et l'application l'ignore aussi.

`domains.json` est dérivé de phishing-filter et distribué sous la même licence, CC BY-SA 4.0.

La construction se teste en local avec une liste quelconque, en enregistrant dans `cle-privee.pem` la clé privée affichée par `make feed-key` (fichier à ne jamais committer) :

```bash
make feed-key
FEED_SIGNING_KEY="$(cat cle-privee.pem)" FEED_SOURCE_URLS=https://exemple/liste.txt node scripts/build-feed.mjs feed-out
```

## Structure du projet

```
App.tsx                    Écran principal
rules/rules.json           Règles de détection (données uniquement)
src/engine/                Moteur d'analyse, sans dépendance à React Native
src/i18n/fr.ts             Tous les textes affichés
src/config.ts              Adresses du dépôt, de la politique de confidentialité et du feed, clé publique
src/feed/                  Téléchargement, vérification et cache des mises à jour
scripts/                   Construction et signature du feed (GitHub Action)
src/ui/                    Carte de résultat, écran « À propos », actions, couleurs
tests/                     Tests unitaires et corpus de messages
tests/corpus/samples.json  Messages réalistes avec le verdict attendu
```

## Démarrer

Prérequis : Node.js 22, ainsi que le JDK 21 et le SDK Android pour compiler en local.

```bash
git clone https://github.com/c4seus/Louche-non-.git louche-non
cd louche-non
npm install
make verify
make dev
```

`make` sans argument affiche toutes les commandes disponibles.

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md). Le plus simple : ouvrir une issue avec le formulaire « Arnaque non détectée » ou « Fausse alerte ». Si vous savez coder, ajoutez le message au corpus et ajustez les règles pour qu'il soit bien détecté.

## Licence

Copyright (C) 2026 c4seus

Ce programme est un logiciel libre : vous pouvez le redistribuer et le modifier selon les termes de la licence publique générale GNU (GPL), telle que publiée par la Free Software Foundation, version 3 ou (à votre choix) toute version ultérieure. Voir [LICENSE](LICENSE). Seul le texte anglais de la licence fait foi.