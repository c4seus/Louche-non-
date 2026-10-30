# Louche, non ? — guide complet

1. [Installer et tester sur Kali Linux](#1-installer-et-tester-sur-kali-linux)
2. [Publier sur Google Play (app gratuite)](#2-publier-sur-google-play-app-gratuite)
3. [Publier une mise à jour](#3-publier-une-mise-à-jour)
4. [Gérer les contributions sur GitHub](#4-gérer-les-contributions-sur-github)
5. [Dépannage](#5-dépannage)

Stack : Expo SDK 58, React Native 0.88, TypeScript 6. Analyse 100 % locale ; seul un téléchargement quotidien depuis GitHub (feed), sans rien envoyer.
Tous les builds se font **en local** (pas d'EAS, pas de compte Expo nécessaire).

Projet : `~/Code/LoucheNon` — Dépôt : https://github.com/c4seus/Louche-non-

**Raccourcis** : le `Makefile` regroupe les commandes de ce guide. `make` seul affiche la liste. Les plus utiles :

| Commande | Équivaut à |
|---|---|
| `make dev` | `npx expo run:android` (1.6) |
| `make verify` | `npm run typecheck` + `npm test`, comme la CI GitHub (1.7) |
| `make apk` / `make aab` | vérifications, `prebuild --clean` et build signé, copié dans `dist/` (2.5) |
| `make bump-patch` | `version` +1 et `versionCode` +1 dans `app.json` (3.1) |
| `make bump-rules` | `version` +1 et `updated` à la date du jour dans `rules/rules.json` (3.3) |
| `make feed-key` | Génère la paire de clés du feed (2.4 bis) |
| `make tag` | `git tag v<version>`, refusé s'il reste des modifications non commitées (3.2) |

---

## 1. Installer et tester sur Kali Linux

> Le shell par défaut de Kali est **zsh** : les variables d'environnement vont dans `~/.zshrc`.
> Ne fais jamais `source ~/.bashrc` dans zsh. En cas de prompt cassé : `exec zsh`.

### 1.1 Prérequis

Tout est déjà en place si Mon Carnet Véhicule compile sur ta machine : passe directement à 1.2. Sinon :

```bash
sudo apt update
sudo apt install -y git unzip curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
exec zsh
nvm install 22
nvm alias default 22
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

Puis installe l'environnement Android décrit en 1.4.

### 1.2 Installer le projet

Le zip contient un dossier `louche-non/` avec l'historique Git. On copie son contenu dans `~/Code/LoucheNon` (remplace `~/Téléchargements` par `~/Downloads` si Kali est en anglais) :

```bash
mkdir -p ~/Code/LoucheNon
cd ~/Téléchargements
unzip louche-non.zip
cp -a louche-non/. ~/Code/LoucheNon/
rm -rf louche-non
cd ~/Code/LoucheNon
git log --oneline
npm install
npx expo install --check
```

`git log` doit afficher les commits du projet, et `expo install --check` indiquer que les dépendances sont à jour.

### 1.3 Expo Go ou development build ?

L'app n'utilise que des modules inclus dans Expo Go (`expo-clipboard`, `expo-system-ui`, `react-native-safe-area-context`). Expo Go fonctionne donc **si sa version correspond au SDK 58** :

```bash
npx expo start
```

Scanne le QR code avec Expo Go. Si Expo Go annonce un SDK incompatible, passe au development build (1.6) : comme l'environnement Android est déjà installé pour Mon Carnet Véhicule, c'est la solution la plus fiable.

### 1.4 Environnement Android (une seule fois)

C'est la même installation que pour Mon Carnet Véhicule. Vérifie simplement :

```bash
java -version
echo $ANDROID_HOME
adb version
```

- `java -version` doit afficher `21.0.x`. Sinon :
  ```bash
  echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64' >> ~/.zshrc
  echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.zshrc
  source ~/.zshrc
  ```
- `$ANDROID_HOME` doit valoir `/home/c4seus/Android/Sdk`. Sinon :
  ```bash
  cat >> ~/.zshrc << 'EOF'
  export ANDROID_HOME=$HOME/Android/Sdk
  export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
  EOF
  source ~/.zshrc
  sdkmanager "platform-tools"
  yes | sdkmanager --licenses
  ```

Installation complète des command-line tools : https://developer.android.com/studio#command-tools (section « Command line tools only »), à décompresser dans `~/Android/Sdk/cmdline-tools/latest`.

### 1.5 Connecter le téléphone

Débogage USB activé, câble en mode **Transfert de fichiers**, puis :

```bash
adb devices
```

Tu dois voir `XXXXXXXX    device`. Si la liste est vide, voir [Dépannage](#5-dépannage).

### 1.6 Premier build (development build)

```bash
cd ~/Code/LoucheNon
npx expo run:android
```

La première compilation prend 5 à 15 minutes. L'app « Louche, non ? » s'installe et se lance sur le téléphone. Les fois suivantes, `npx expo start` suffit : l'app se reconnecte à Metro avec le rechargement à chaud.

Le dossier `android/` est généré à partir de `app.json` et du plugin `plugins/withReleaseSigning.js` : il est jetable et ignoré par Git. Ne le modifie jamais à la main.

### 1.7 Tests automatiques

```bash
npm test
npm run typecheck
```

Tous les tests doivent passer. Le fichier `tests/corpus/samples.json` contient 27 messages (arnaques et messages légitimes) avec le verdict attendu : c'est le filet de sécurité de chaque modification des règles. Quand un test du corpus échoue, la sortie affiche le score et la liste des signaux détectés.

### 1.8 Check-list de test sur le téléphone

Copie chaque message dans une note, puis colle-le dans l'app :

| Message à coller | Verdict attendu |
|---|---|
| `Votre colis est en attente. Des frais de livraison de 1,99€ sont à régler sous 24h : https://laposte-suivi.info/fr` | ❌ Arnaque probable |
| `Ameli : votre nouvelle carte Vitale est disponible. Mettez à jour vos informations : https://ameli-remboursement.fr` | ❌ Arnaque probable |
| `Votre colis n'a pas pu être livré. Reprogrammez la livraison : https://bit.ly/3xYzAb` | ⚠️ Message suspect |
| `Coucou maman, j'ai cassé mon téléphone, c'est mon nouveau numéro. Écris-moi sur WhatsApp` | ⚠️ Message suspect |
| `Votre colis sera livré demain. Suivi : https://www.laposte.fr/outils/suivre-vos-envois` | 🔎 Aucun signal suspect |
| `Salut, on se retrouve à 19h au resto ?` | 🔎 Aucun signal suspect |

Vérifie aussi :
- **Coller** : remplit le champ et lance l'analyse ; avec un presse-papiers vide, un message s'affiche.
- **Analyser** sur un champ vide : message « Collez d'abord le texte d'un message ».
- **Effacer** : vide le champ et le résultat.
- **Signaler au 33700** : ouvre Messages avec le texte prérempli, puis la fenêtre d'explication du second SMS. **N'envoie pas** pendant les tests.
- **Aide sur cybermalveillance.gouv.fr** : ouvre le site dans le navigateur.
- **Bloquer le numéro** : affiche les explications.
- Les liens trouvés s'affichent sans être cliquables.
- Sous un verdict « suspect » ou « aucun signal », le lien **« C'est une arnaque ? Signalez-la »** affiche l'avertissement, puis ouvre le formulaire GitHub avec le message et le verdict préremplis (le dépôt doit être poussé, voir 2.4). **N'envoie pas** l'issue pendant les tests.
- **À propos** (en haut à droite) : version de l'app et des règles, liens vers le dépôt, la licence, le guide de contribution et la politique de confidentialité. Le bouton retour d'Android ramène à l'accueil, avec le message toujours présent.
- **Mode sombre** (réglages Android) : tout reste lisible.
- **Grande taille de police** (*Paramètres → Affichage → Taille de police* au maximum) : rien n'est coupé.

---

## 2. Publier sur Google Play (app gratuite)

### 2.1 Ce qui change pour une app gratuite

- **Pas de profil de paiement** à créer, et pas de revenus à déclarer.
- **Statut de « trader » (DSA)** : une app gratuite, sans publicité ni achat intégré, ne relève en principe pas d'une activité commerciale. Tu peux te déclarer **non-trader** pour cette app, et ton adresse n'est alors pas affichée. Si tu ajoutes un jour de la publicité ou des achats, ce statut change. Je ne suis pas juriste : en cas de doute, vérifie avec la CCI ou un comptable au moment où tu crées ta micro-entreprise pour Mon Carnet Véhicule.
- **Gratuite, c'est définitif** : Google n'autorise pas à rendre payante une app publiée gratuitement. Les dons (Liberapay, GitHub Sponsors) restent possibles en dehors de l'app, via le README.

### 2.2 Compte Play Console

Si tu crées ton compte début novembre pour Mon Carnet Véhicule, **le même compte** publie les deux apps : rien de plus à payer (25 $, une seule fois).

Pour un compte personnel récent, Google impose un **test fermé de 14 jours avec au moins 12 testeurs** avant l'accès à la production, et ce **pour chaque app** (à vérifier dans la Play Console au moment de la création). Les testeurs de Mon Carnet Véhicule peuvent aussi tester Louche, non ? : lance les deux tests fermés en même temps.

### 2.3 Personnaliser le projet

| Quoi | Où |
|---|---|
| E-mail de contact (remplace `TON-EMAIL`) | `docs/privacy.html`, `store/LISTING.md` |
| URL du dépôt, des issues et de la politique | `src/config.ts` |
| Identifiant de l'app (`fr.c4seus.louchenon`) | `app.json` → `android.package` — **définitif après la première publication** |
| Nom affiché | `app.json` → `name` (`Louche, non ?` avec une espace insécable avant le `?`) |
| Version visible | `app.json` → `version` : passe de `0.1.0` à `1.0.0` avant la première publication |
| Numéro de build Android | `app.json` → `android.versionCode` (entier, voir 3.1) |

L'e-mail de contact est **public** sur la fiche Play Store : utilise une adresse dédiée, par exemple `contact.louchenon@gmail.com`.

### 2.4 Pousser le code et héberger la politique de confidentialité

Le dépôt existe déjà sur GitHub :

```bash
cd ~/Code/LoucheNon
git remote add origin git@github.com:c4seus/Louche-non-.git
git push -u origin main
```

Si le dépôt GitHub n'est pas vide (README ou licence créés à l'initialisation), fais d'abord `git pull origin main --allow-unrelated-histories` et garde nos versions des fichiers en conflit.

Sur GitHub :
- *Settings → Pages → Source : Deploy from a branch → `main` / `/docs`*. La politique sera en ligne à l'adresse `https://c4seus.github.io/Louche-non-/privacy.html` (c'est elle qui est déjà notée dans `store/LISTING.md`). Ouvre-la pour vérifier.
- *About* (roue dentée à droite) : description « Collez un SMS douteux, l'app vous dit ce qui cloche. Détection hors ligne des arnaques françaises (colis, CPF, Ameli, ANTAI…). », et les topics `android`, `expo`, `react-native`, `typescript`, `phishing`, `smishing`, `scam-detection`, `cybersecurity`, `privacy`, `offline`, `france`, `gpl-3`.

> **Le tiret final de `Louche-non-`** : c'est probablement une coquille à la création. Si tu renommes le dépôt en `louche-non` (*Settings → General → Repository name*), GitHub redirige les anciens liens, mais pense à mettre à jour l'URL dans `docs/privacy.html`, `store/LISTING.md`, ce guide et `git remote set-url origin git@github.com:c4seus/louche-non.git`. Fais-le **avant** de saisir l'URL de confidentialité dans la Play Console.

### 2.4 bis Activer les mises à jour de la détection (feed)

L'app télécharge chaque jour, depuis la branche `feed` du dépôt, les règles à jour et une liste de sites d'arnaque signalés. Les fichiers sont signés : il faut une paire de clés, différente de la keystore Android. À faire **une seule fois, avant de construire l'AAB**.

1. **Générer les clés**
   ```bash
   make feed-key
   ```
   La commande affiche une clé privée (bloc `BEGIN PRIVATE KEY`) et une clé publique (une ligne en base64). Copie la clé privée dans ton gestionnaire de mots de passe : si tu la perds, il faudra publier une nouvelle version de l'app avec une nouvelle clé publique.

2. **Donner la clé privée à GitHub** : *Settings → Secrets and variables → Actions → New repository secret*, nom `FEED_SIGNING_KEY`, valeur : tout le bloc, lignes `BEGIN` et `END` comprises.

3. **Mettre la clé publique dans l'app** : dans `src/config.ts`, remplace `FEED_PUBLIC_KEY = ''` par `FEED_PUBLIC_KEY = 'la-ligne-base64'`. Tant que la valeur est vide, l'app fonctionne normalement mais ne télécharge rien.

4. **Lancer le premier feed** : committe et pousse (`git push`), puis sur GitHub *Actions → Feed → Run workflow*. Après une à deux minutes, la branche `feed` doit apparaître avec `rules.json`, `domains.json`, leurs `.sig` et un `README.md` qui indique le nombre de sites.

5. **Vérifier dans l'app** : *À propos → Mettre à jour maintenant*. L'écran doit afficher « Règles … (téléchargées) » et « Liste de sites frauduleux : N sites ».

Ensuite, l'Action tourne seule toutes les six heures, et à chaque modification de `rules/rules.json` sur `main`.

> Si l'Action échoue sur « … unavailable », la source de la liste est momentanément injoignable : l'ancienne version de la branche `feed` reste en place, rien n'est cassé. Si l'échec dure plusieurs jours, vérifie les adresses de `SOURCES` dans `scripts/build-feed.mjs` sur la page du projet phishing-filter.

### 2.5 Construire l'app signée en local

#### 2.5.1 Créer la clé d'upload (une seule fois)

Une clé par app : ne réutilise pas celle de Mon Carnet Véhicule.

```bash
mkdir -p ~/.android-keys
keytool -genkeypair -v -storetype PKCS12 \
  -keystore ~/.android-keys/louche-non-upload.keystore \
  -alias louche-non-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Choisis un mot de passe solide. La clé reste **hors du dépôt Git** (`*.keystore` est aussi dans `.gitignore`, par sécurité). C'est particulièrement important ici : le dépôt est **public**.

Avec **Play App Signing**, Google garde la clé de signature finale. Ta keystore n'est que la clé d'upload : sauvegarde-la avec son mot de passe hors de ta machine (gestionnaire de mots de passe et copie chiffrée).

#### 2.5.2 Déclarer les identifiants à Gradle

Ajoute dans `~/.gradle/gradle.properties` (global, hors du projet, à côté des lignes `CARNET_…` éventuelles) :

```properties
LOUCHE_UPLOAD_STORE_FILE=/home/c4seus/.android-keys/louche-non-upload.keystore
LOUCHE_UPLOAD_KEY_ALIAS=louche-non-upload
LOUCHE_UPLOAD_STORE_PASSWORD=ton_mot_de_passe
LOUCHE_UPLOAD_KEY_PASSWORD=ton_mot_de_passe
```

```bash
chmod 600 ~/.gradle/gradle.properties
```

#### 2.5.3 Vérifier la signature

Le plugin `plugins/withReleaseSigning.js` est déjà dans le projet et déclaré dans `app.json`. Il ajoute la configuration de signature à chaque génération du dossier `android/`.

```bash
npx expo prebuild --clean --platform android
grep -n "signingConfig" android/app/build.gradle
```

Tu dois voir un bloc `release { ... LOUCHE_UPLOAD_STORE_FILE ... }`, et dans le `buildType` release la ligne `signingConfig project.hasProperty('LOUCHE_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`. Sans clé déclarée, l'APK est donc signé avec la clé de debug du projet : pratique pour une bêta (voir 2.5.6), refusé par le Play Store.

#### 2.5.4 Tester la version release sur ton téléphone

```bash
cd android
./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
cd ..
```

Si une version de développement est déjà installée, Android peut refuser l'installation (signature différente) : désinstalle-la d'abord avec `adb uninstall fr.c4seus.louchenon`. L'app ne stocke aucune donnée, tu ne perds rien.

Refais la check-list 1.8 sur cette version.

Pour une bêta chez des amis, envoie-leur ce fichier :

```bash
cp android/app/build/outputs/apk/release/app-release.apk ~/louche-non-1.0.0.apk
```

#### 2.5.5 Build de production (`.aab`)

```bash
cd android
./gradlew bundleRelease
cd ..
ls -lh android/app/build/outputs/bundle/release/app-release.aab
```

C'est ce fichier que tu envoies sur la Play Console. `make aab` refuse de le construire sans clé de release (`make check-signing`).

#### 2.5.6 Bêta chez des amis, sans clé de release

```bash
make apk
```

L'APK `dist/louche-non-<version>.apk` contient tout le code : il fonctionne sans Metro ni câble. Sans clé de release, il est signé avec la clé de debug du projet.

- Envoie-le par Signal, Telegram, e-mail ou un lien de cloud. Côté téléphone : ouvrir le fichier, autoriser l'installation depuis cette application (*Paramètres → Installer des applications inconnues*), puis *Installer*. Play Protect peut afficher « Application non vérifiée » : *Plus de détails → Installer quand même*.
- **Nouvelle bêta** : `make bump-patch` puis `make apk`. Tes amis installent la nouvelle version par-dessus l'ancienne.
- **Passage au Play Store** : la version du store sera signée avec une autre clé, il faudra donc désinstaller la bêta. L'app ne stocke aucune donnée, rien n'est perdu.

### 2.6 Configurer l'app dans la Play Console

**Créer l'application**
- Nom : `Louche, non ? Anti-arnaques`
- Langue par défaut : **Français (France)**
- Type : **Application** — **Gratuite**
- Accepte les déclarations

**Contenu de l'application** : toutes les réponses sont dans `store/LISTING.md` (confidentialité, aucune annonce, aucune donnée collectée ni partagée, classification « Utilitaires »).

**Fiche Play Store principale**
- Titre, description courte, description complète : `store/LISTING.md`
- Catégorie : **Outils**, e-mail de contact : ton adresse dédiée
- **Visuels, encore à créer** :
  - icône 512 × 512 px (le projet utilise encore l'icône Expo par défaut, à remplacer aussi dans `assets/`) ;
  - image de présentation 1024 × 500 px ;
  - au moins 2 captures d'écran de téléphone (4 recommandées : un verdict « arnaque », un « suspect », un « aucun signal », l'écran d'accueil).

**Pays**
- *Production → Pays/Régions* → **France**. Les scénarios détectés sont propres à la France : élargir à la Belgique ou à la Suisse donnerait de mauvais résultats.

### 2.7 Envoyer le build

1. *Tests → Test interne → Créer une release* → importe `app-release.aab` → *Enregistrer → Publier*. Au premier envoi, accepte **Play App Signing**. Ajoute-toi comme testeur et installe-la depuis le lien.
2. Selon ton compte :
   - **Production disponible** : *Production → Créer une release → Ajouter depuis la bibliothèque* → choisis le build → notes de version → *Envoyer pour examen*.
   - **Production verrouillée** : *Tests → Tests fermés* → ajoute au moins 12 adresses Gmail → partage le lien d'inscription → attends 14 jours → *Tableau de bord → Demander l'accès à la production*.

La revue prend de quelques heures à quelques jours. Une app qui parle de fraude bancaire peut être examinée plus attentivement : la description et la politique de confidentialité expliquent clairement qu'aucune donnée n'est collectée, ce qui aide.

---

## 3. Publier une mise à jour

### 3.1 Numérotation

| Changement | `version` | `android.versionCode` |
|---|---|---|
| Mise à jour des règles ou correction | `1.0.0` → `1.0.1` | `1` → `2` |
| Nouvelle fonctionnalité | `1.0.1` → `1.1.0` | `2` → `3` |
| Refonte majeure | `1.1.0` → `2.0.0` | `3` → `4` |

Dans `app.json`, modifie **les deux** à chaque release. Google refuse un `.aab` dont le `versionCode` a déjà été utilisé.

### 3.2 Process

```bash
git checkout -b fix/description-courte
npx expo start
npm test
npm run typecheck
```

Teste sur ton téléphone avec la check-list 1.8, puis incrémente `version` et `android.versionCode` dans `app.json` :

```bash
git commit -am "Fix: description"
git checkout main && git merge fix/description-courte
git tag v1.0.1
git push && git push --tags

npx expo prebuild --clean --platform android
cd android && ./gradlew bundleRelease && cd ..
```

Dans la Play Console :
1. *Tests → Test interne → Créer une release* → importe `android/app/build/outputs/bundle/release/app-release.aab` → publie et installe-la pour un dernier contrôle.
2. *Production → Créer une release → Ajouter depuis la bibliothèque* → choisis le build.
3. Rédige les **notes de version** en français, par exemple « Détection des fausses arnaques au chèque énergie ».
4. *Envoyer pour examen*.

Sur GitHub, crée aussi une *Release* à partir du tag (*Releases → Draft a new release*) avec les mêmes notes : c'est là que les contributeurs voient que leur travail est en ligne. Tu peux y joindre l'APK pour ceux qui n'utilisent pas le Play Store.

### 3.3 Mettre à jour les règles

Grâce au feed (2.4 bis), une modification de `rules/rules.json` poussée sur `main` arrive sur les téléphones **sans nouvelle version Play Store**, dans les 24 heures.

1. Ajoute le nouveau message (anonymisé) dans `tests/corpus/samples.json` avec le verdict attendu.
2. `npm test` : le test échoue et montre les signaux trouvés.
3. Modifie `rules/rules.json` (organisme, domaine officiel, mot-clé de scénario, raccourcisseur…).
4. `make bump-rules` : la version augmente et la date est mise à jour. **Indispensable** : l'app ignore des règles dont la version n'est pas au moins égale à celle intégrée.
5. `npm test` : **tous** les messages doivent passer, y compris les légitimes, pour éviter les fausses alertes.
6. Commit et `git push` : l'Action « Feed » publie les nouvelles règles.

Les règles doivent rester compatibles avec le code de l'app déjà installée : ajouter des organismes, domaines, mots-clés ou scénarios ne pose aucun problème. Si tu changes la **structure** du fichier (nouveau champ obligatoire, champ renommé), les anciennes versions de l'app le refuseront et garderont leurs règles intégrées : publie alors aussi une nouvelle version sur le Play Store.

Les règles intégrées à l'app servent toujours de base hors ligne : pense à republier de temps en temps pour qu'elles ne soient pas trop anciennes.

L'app ne stocke que les fichiers du feed et ses réglages : il n'y a jamais de migration de données à prévoir.

### 3.4 Changer de SDK Expo

- Attends la version **stable** (pas de beta en production).
- `npx expo install expo@^XX.0.0 --fix`, puis `npx expo install --check`.
- Vérifie qu'aucun module ne reste sur un autre SDK : `npm ls expo-modules-core expo-modules-autolinking`. Si un paquet tire une version d'un autre SDK, force-la avec `overrides` dans `package.json`, comme pour Mon Carnet Véhicule.
- `rm -rf node_modules package-lock.json android && npm install`, puis `npm test`, `npx expo run:android` et la check-list 1.8.

Google exige régulièrement une version cible d'Android récente, et les nouvelles versions d'Expo s'en chargent.

### 3.5 Règles à respecter

- **Retour arrière** : Google n'autorise pas à republier un ancien `versionCode`. En cas de problème, corrige et publie une nouvelle version.
- **Keystore** : le même fichier et le même alias pour toutes les mises à jour. Garde la sauvegarde à jour.
- **Pas de réseau** : ne jamais ajouter de bibliothèque qui envoie des données (statistiques, rapports de plantage en ligne, publicité). C'est la promesse de l'app et la réponse donnée dans « Sécurité des données ». Pour les plantages, utilise **Android vitals** dans la Play Console, qui ne demande rien dans le code.

---

## 4. Gérer les contributions sur GitHub

### 4.1 Ce qui est déjà en place

| Fichier | Rôle |
|---|---|
| `README.md` | Présentation, fonctionnement des règles, structure du projet |
| `CONTRIBUTING.md` | Comment ajouter une arnaque et modifier les règles |
| `LICENSE` | GPL-3.0, texte officiel |
| `.github/ISSUE_TEMPLATE/` | Deux formulaires : « Arnaque non détectée » et « Fausse alerte » |
| `.github/pull_request_template.md` | Check-list pour chaque pull request |
| `.github/workflows/test.yml` | Lance `typecheck` et les tests à chaque push et pull request |

### 4.2 Réglages GitHub (une seule fois)

- *Settings → General → Features* : **Issues** activées. Tu peux activer **Discussions** pour les questions générales.
- *Issues → Labels* : crée `missed-scam` et `false-alarm` (les formulaires les appliquent automatiquement), plus `good first issue` pour attirer les premiers contributeurs.
- *Settings → Branches → Add branch ruleset* sur `main` : exige une pull request et le succès du workflow **Tests** avant de fusionner. Coche l'option qui te permet de contourner la règle, sinon tu ne pourras plus pousser directement.
- *Settings → Actions → General* : laisse « Require approval for first-time contributors » activé, pour que le code d'un inconnu ne s'exécute pas sans ton accord.

### 4.3 Traiter une issue « Arnaque non détectée »

1. **Vérifie l'anonymisation** : si le message contient un nom, un numéro de téléphone ou un numéro de suivi, édite l'issue pour les masquer.
2. Ne clique jamais sur les liens du message, même pour vérifier.
3. Ajoute le message au corpus et ajuste les règles (3.3), ou étiquette l'issue `good first issue` si c'est simple et que tu veux laisser la main.
4. Référence l'issue dans le commit (`Detect fake energy cheque scams (#12)`) pour qu'elle se ferme à la fusion.

### 4.3 bis Traiter une issue « Fausse alerte »

1. Regarde ce qui a déclenché l'alerte en collant le message dans l'app (anonymisé) : la liste des signaux s'affiche.
2. **Si c'est « figure dans une liste de sites d'arnaque déjà signalés »** : le domaine vient de la liste externe. C'est souvent un petit site légitime piraté pour héberger une page d'arnaque.
   - Vérifie qu'il n'héberge plus rien de suspect, sans ouvrir de lien du message : cherche le domaine sur un moteur de recherche ou un service d'analyse comme VirusTotal.
   - Ajoute-le à `feedExclusions` dans `rules/rules.json` (en minuscules, sans `www.`, qui est couvert automatiquement), puis `make bump-rules`, `npm test`, commit et push.
   - L'Action le retire de la liste et l'app l'ignore : la correction arrive sur les téléphones en moins de 24 heures.
3. **Si c'est une autre règle** (mot-clé, scénario, marque) : ajoute le message au corpus avec le verdict `clean` et ajuste la règle, comme en 3.3.
4. Réponds dans l'issue pour dire que c'est corrigé, et ferme-la avec le commit (`Fix false alarm for … (#12)`).

Relis la liste `feedExclusions` de temps en temps : un site exclu qui serait de nouveau piraté ne serait plus signalé par la liste (mais toujours par les autres règles).

### 4.4 Relire une pull request

- Le workflow **Tests** est vert.
- Les messages ajoutés au corpus sont anonymisés.
- Un nouveau mot-clé ne provoque pas de fausse alerte probable : un mot trop courant (« compte », « paiement ») comme ancre de scénario déclencherait des alertes sur des messages légitimes.
- Un domaine ajouté à `feedExclusions` n'héberge vraiment plus d'arnaque : c'est la porte d'entrée la plus simple pour neutraliser la liste.
- Un domaine ajouté comme officiel l'est vraiment : vérifie-le toi-même depuis le site de l'organisme. Un domaine pirate ajouté par erreur à la liste officielle neutraliserait la détection.
- Aucun code qui accède au réseau ou ajoute une permission.

En acceptant une contribution, l'auteur la place sous GPL-3.0 (rappelé dans `CONTRIBUTING.md`) : tu peux la fusionner sans formalité.

### 4.5 Sécurité du dépôt

- Ne publie jamais la keystore, `gradle.properties` ou un mot de passe.
- Avant chaque push : `git status` et, en cas de doute, `git diff --cached`.
- Si un secret a été poussé par erreur, considère-le comme compromis : change le mot de passe, et pour une clé d'upload, demande sa réinitialisation dans la Play Console. Supprimer le commit ne suffit pas.

---

## 5. Dépannage

| Problème | Solution |
|---|---|
| `adb devices` affiche une liste vide | Autre câble, mode **Transfert de fichiers**, popup « Autoriser le débogage USB » acceptée. Si `lsusb` voit le téléphone : `sudo apt install android-sdk-platform-tools-common`, `sudo usermod -aG plugdev $USER`, puis `adb kill-server && adb start-server` |
| `SDK location not found` | `$ANDROID_HOME` absent du shell (voir 1.4), ou crée `android/local.properties` avec `sdk.dir=/home/c4seus/Android/Sdk` (perdu au prochain `prebuild --clean`) |
| Gradle refuse la version de Java | `java -version` doit afficher 21 : voir `JAVA_HOME` en 1.4 |
| `ENOSPC: System limit for number of file watchers reached` | `fs.inotify.max_user_watches` (voir 1.1) |
| Expo Go : « Project is incompatible with this version of Expo Go » | Utilise le development build (1.6) |
| L'app affiche un écran rouge « Invalid rules » | `rules/rules.json` contient une erreur : `npm test` indique laquelle (domaine en majuscules, identifiant en double, liste vide…) |
| Le bouton « Signaler au 33700 » n'ouvre rien | Aucune app SMS par défaut sur le téléphone (tablette, par exemple) : c'est normal, un message d'erreur s'affiche |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` à l'installation | Signature différente de la version installée : `adb uninstall fr.c4seus.louchenon` puis réinstalle |
| Le workflow GitHub échoue sur `npm ci` | `package-lock.json` n'est pas à jour : lance `npm install` en local et committe le fichier |
| L'Action « Feed » échoue sur `FEED_SIGNING_KEY is not set` | Le secret n'existe pas ou porte un autre nom (2.4 bis, étape 2) |
| « Mise à jour impossible pour le moment » dans l'app | Pas de connexion, branche `feed` absente (lance l'Action), ou clé publique de `src/config.ts` différente de la clé privée du secret (« invalid signature ») |
| « Les mises à jour en ligne ne sont pas activées » | `FEED_PUBLIC_KEY` est vide dans `src/config.ts` |
| `grep signingConfig` ne montre pas `LOUCHE_UPLOAD_STORE_FILE` | Le plugin n'est pas déclaré dans `app.json` → `plugins`, ou le `prebuild` a été lancé sans `--clean` |
