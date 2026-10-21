# Louche, non ?

Une application Android qui aide à repérer les SMS et e-mails frauduleux. Collez un message douteux : l'application explique en français simple ce qui cloche et quoi faire ensuite.

- **100 % sur le téléphone** : aucune requête réseau, aucun compte, aucune publicité, aucun traceur.
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
- Lien « Signaler une arnaque non détectée » qui ouvre le formulaire GitHub avec le message prérempli, et écran « À propos » (licence, code source, comment contribuer).

À venir :

- Recevoir un message via le menu « Partager » d'Android.
- Fiches pédagogiques sur les arnaques du moment.
- Mode « proche » : envoyer un verdict à un membre de sa famille en un geste.

Hors périmètre : toute vérification en ligne, le scan de QR codes.

## Fonctionnement de l'analyse

`analyze(texte)` dans `src/engine` renvoie un verdict, un score de 0 à 100, la liste des signaux trouvés et les liens extraits.

| Score | Verdict |
| --- | --- |
| 60 et plus | `scam` (Arnaque probable) |
| de 30 à 59 | `suspicious` (Message suspect) |
| moins de 30 | `clean` (Aucun signal suspect détecté) |

Chaque signal ajoute des points (voir `POINTS` dans `src/engine/analyze.ts`). Quand tous les liens mènent vers des domaines officiels connus, le score baisse un peu, sauf si un signal fort a été trouvé.

Toutes les connaissances sont dans [`rules/rules.json`](rules/rules.json) :

| Clé | Contenu |
| --- | --- |
| `brands` | Organismes imités par les escrocs : libellé affiché, noms cherchés dans le texte, morceaux cherchés dans les domaines, domaines officiels |
| `trustedDomains` | Autres domaines officiels, jamais signalés |
| `multiLevelSuffixes` | Suffixes comme `gouv.fr`, pour retrouver le domaine principal |
| `shorteners`, `suspiciousTlds`, `commonTlds` | Vérification des liens ; un domaine écrit sans `http` ni `www` n'est détecté que si sa terminaison figure dans ces listes |
| `scenarios` | Scénarios d'arnaque : au moins une ancre, plus assez de mots-clés (`minMatches`) |
| `pressure`, `sensitive`, `payment`, `giftCards`, `moneyRequest` | Expressions cherchées dans le texte |

Les expressions sont cherchées en mots entiers, sans tenir compte des majuscules ni des accents (`Crit'Air` correspond à `crit air`). Les morceaux de nom d'organisme de 6 lettres ou plus sont cherchés n'importe où dans un domaine ; les plus courts doivent en former une partie entière (`ameli-remboursement.fr` correspond à `ameli`, pas `amelie-boutique.fr`).

Le fichier de règles est validé au démarrage (`src/engine/rules.ts`) et par les tests.

## Structure du projet

```
App.tsx                    Écran principal
rules/rules.json           Règles de détection (données uniquement)
src/engine/                Moteur d'analyse, sans dépendance à React Native
src/i18n/fr.ts             Tous les textes affichés
src/config.ts              Adresses du dépôt et de la politique de confidentialité
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
