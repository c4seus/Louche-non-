SHELL := /bin/bash
.DEFAULT_GOAL := help

APP_NAME := louche-non
PACKAGE := fr.c4seus.louchenon
DIST := dist
VERSION = $(shell node -p "require('./app.json').expo.version")
VERSION_CODE = $(shell node -p "require('./app.json').expo.android.versionCode")
RULES_VERSION = $(shell node -p "require('./rules/rules.json').version")
RULES_UPDATED = $(shell node -p "require('./rules/rules.json').updated")
GRADLE_PROPS := $(HOME)/.gradle/gradle.properties
APK_SRC := android/app/build/outputs/apk/release/app-release.apk
AAB_SRC := android/app/build/outputs/bundle/release/app-release.aab
APK = $(DIST)/$(APP_NAME)-$(VERSION).apk
NOTES = $(DIST)/RELEASE-$(VERSION).md
APKSIGNER = $(shell ls -d $(ANDROID_HOME)/build-tools/*/ 2>/dev/null | tail -1)apksigner
PRERELEASE ?= 1

.PHONY: help install check fix doctor typecheck test test-watch corpus verify start start-clear \
	usb dev devices logs prebuild check-signing apk aab release publish install-apk uninstall version bump-patch bump-minor \
	bump-major bump-rules tag gradle-stop clean reset

help:
	@echo "Louche, non ? — v$(VERSION) (versionCode $(VERSION_CODE)), règles v$(RULES_VERSION) du $(RULES_UPDATED)"
	@echo ""
	@echo "Développement"
	@echo "  make install       Installe les dépendances npm"
	@echo "  make start         Lance Metro (Expo Go ou development build)"
	@echo "  make start-clear   Lance Metro en vidant le cache"
	@echo "  make usb           Redirige le port 8081 en USB (adb reverse)"
	@echo "  make dev           Compile et installe le development build"
	@echo "  make devices       Liste les téléphones connectés"
	@echo "  make logs          Affiche les logs JavaScript du téléphone"
	@echo ""
	@echo "Qualité"
	@echo "  make test          Lance tous les tests"
	@echo "  make test-watch    Relance les tests à chaque modification"
	@echo "  make corpus        Teste seulement le corpus de messages"
	@echo "  make typecheck     Vérifie le TypeScript"
	@echo "  make verify        typecheck + tests (comme la CI GitHub)"
	@echo "  make check         Vérifie les versions des paquets Expo"
	@echo "  make fix           Aligne les paquets sur le SDK Expo"
	@echo "  make doctor        Diagnostic complet Expo"
	@echo ""
	@echo "Build"
	@echo "  make prebuild      Régénère le dossier android/"
	@echo "  make check-signing Vérifie la clé de signature de release (avant aab)"
	@echo "  make apk           APK autonome dans $(DIST)/ (bêta testeurs ; clé de debug si aucune clé de release)"
	@echo "  make aab           AAB de release dans $(DIST)/ (Play Store)"
	@echo "  make install-apk   Installe l'APK de release sur le téléphone"
	@echo ""
	@echo "Release GitHub"
	@echo "  make release       APK signé avec ta clé + notes avec empreintes dans $(DIST)/"
	@echo "  make publish       Tag, push et release GitHub avec l'APK (GitHub CLI)"
	@echo "                     PRERELEASE=0 pour une version finale"
	@echo "  make uninstall     Désinstalle l'app du téléphone"
	@echo ""
	@echo "Versions"
	@echo "  make version       Affiche la version de l'app et des règles"
	@echo "  make bump-patch    1.0.0 -> 1.0.1 et versionCode +1"
	@echo "  make bump-minor    1.0.1 -> 1.1.0 et versionCode +1"
	@echo "  make bump-major    1.1.0 -> 2.0.0 et versionCode +1"
	@echo "  make bump-rules    Version des règles +1 et date du jour"
	@echo "  make tag           Crée le tag Git v$(VERSION)"
	@echo ""
	@echo "Nettoyage"
	@echo "  make gradle-stop   Arrête les démons Gradle"
	@echo "  make clean         Supprime android/, .expo/ et $(DIST)/"
	@echo "  make reset         clean + réinstallation complète des dépendances"

install:
	npm install

check:
	npx expo install --check

fix:
	npx expo install --fix

doctor:
	npx expo-doctor

typecheck:
	npx tsc --noEmit

test:
	npx jest

test-watch:
	npx jest --watch

corpus:
	npx jest tests/corpus.test.ts

verify: typecheck test

start:
	npx expo start

start-clear:
	npx expo start -c

usb:
	adb reverse tcp:8081 tcp:8081
	@echo "Dans l'app, connecte-toi à http://localhost:8081"

dev:
	npx expo run:android

devices:
	adb devices -l

logs:
	adb logcat '*:S' ReactNative:V ReactNativeJS:V

prebuild:
	npx expo prebuild --clean --platform android

check-signing:
	@grep -q '^LOUCHE_UPLOAD_STORE_FILE=' $(GRADLE_PROPS) 2>/dev/null || { \
		echo "Clé de signature non configurée : LOUCHE_UPLOAD_STORE_FILE absent de $(GRADLE_PROPS)."; \
		echo "Crée la keystore et déclare-la (GUIDE.md, sections 2.5.1 et 2.5.2)."; \
		exit 1; }
	@for key in LOUCHE_UPLOAD_KEY_ALIAS LOUCHE_UPLOAD_STORE_PASSWORD LOUCHE_UPLOAD_KEY_PASSWORD; do \
		grep -q "^$$key=" $(GRADLE_PROPS) || { echo "$$key absent de $(GRADLE_PROPS)."; exit 1; }; \
	done
	@store=$$(grep '^LOUCHE_UPLOAD_STORE_FILE=' $(GRADLE_PROPS) | cut -d= -f2-); \
		test -f "$$store" || { echo "Keystore introuvable : $$store"; exit 1; }
	@echo "Signature OK"

apk: verify prebuild
	cd android && ./gradlew assembleRelease
	mkdir -p $(DIST)
	cp $(APK_SRC) $(APK)
	@echo "APK prêt : $(APK)"
	@grep -q '^LOUCHE_UPLOAD_STORE_FILE=' $(GRADLE_PROPS) 2>/dev/null || \
		echo "Signé avec la clé de debug : parfait pour une bêta, mais il faudra le désinstaller avant la version du Play Store."

aab: check-signing verify prebuild
	cd android && ./gradlew bundleRelease
	mkdir -p $(DIST)
	cp $(AAB_SRC) $(DIST)/$(APP_NAME)-$(VERSION)-$(VERSION_CODE).aab
	@echo "AAB prêt : $(DIST)/$(APP_NAME)-$(VERSION)-$(VERSION_CODE).aab"

release: check-signing apk
	@test -x "$(APKSIGNER)" || { echo "apksigner introuvable dans $(ANDROID_HOME)/build-tools."; exit 1; }
	@certs=$$("$(APKSIGNER)" verify --print-certs $(APK)) || exit 1; \
	dn=$$(printf '%s\n' "$$certs" | sed -n 's/.*certificate DN: //p' | head -1); \
	cert=$$(printf '%s\n' "$$certs" | sed -n 's/.*certificate SHA-256 digest: //p' | head -1); \
	case "$$dn" in *"Android Debug"*) echo "APK signé avec la clé de debug : release refusée."; exit 1;; esac; \
	sum=$$(sha256sum $(APK) | cut -d' ' -f1); \
	{ \
		echo "Nouveautés :"; \
		echo ""; \
		echo "- …"; \
		echo ""; \
		echo "**Installation** : télécharge le fichier \`.apk\` sur ton téléphone Android, ouvre-le et autorise l'installation."; \
		echo ""; \
		echo "**Vérification**"; \
		echo "- SHA-256 du fichier : \`$$sum\`"; \
		echo "- Empreinte SHA-256 du certificat de signature : \`$$cert\`"; \
	} > $(NOTES); \
	echo ""; \
	echo "Signé par : $$dn"; \
	echo "SHA-256 du fichier : $$sum"; \
	echo "Certificat : $$cert"; \
	echo ""; \
	echo "Notes prêtes : $(NOTES). Complète les nouveautés, puis lance make publish."

publish:
	@command -v gh >/dev/null || { echo "GitHub CLI absent : sudo apt install gh, puis gh auth login."; exit 1; }
	@test -f $(APK) && test -f $(NOTES) || { echo "Lance d'abord make release."; exit 1; }
	@! grep -qx -- '- …' $(NOTES) || { echo "Complète les nouveautés dans $(NOTES) avant de publier."; exit 1; }
	@git rev-parse -q --verify refs/tags/v$(VERSION) >/dev/null || $(MAKE) --no-print-directory tag
	git push origin v$(VERSION)
	gh release create v$(VERSION) $(APK) --title "Louche, non ? $(VERSION)$(if $(filter 1,$(PRERELEASE)), (bêta),)" --notes-file $(NOTES) $(if $(filter 1,$(PRERELEASE)),--prerelease,)

install-apk:
	adb install -r $(APK)

uninstall:
	adb uninstall $(PACKAGE)

version:
	@echo "version $(VERSION), versionCode $(VERSION_CODE)"
	@echo "règles v$(RULES_VERSION) du $(RULES_UPDATED)"

define BUMP
node -e "const fs=require('fs');const f='app.json';const j=JSON.parse(fs.readFileSync(f,'utf8'));const p=j.expo.version.split('.').map(Number);const i={major:0,minor:1,patch:2}['$(1)'];p[i]++;for(let k=i+1;k<3;k++)p[k]=0;j.expo.version=p.join('.');j.expo.android.versionCode=(j.expo.android.versionCode||0)+1;fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n');console.log('version '+j.expo.version+', versionCode '+j.expo.android.versionCode)"
endef

bump-patch:
	@$(call BUMP,patch)

bump-minor:
	@$(call BUMP,minor)

bump-major:
	@$(call BUMP,major)

bump-rules:
	@node -e "const fs=require('fs');const f='rules/rules.json';const s=fs.readFileSync(f,'utf8');const j=JSON.parse(s);const v=j.version+1;const d=new Date().toISOString().slice(0,10);const out=s.replace(/\"version\": *\d+/,'\"version\": '+v).replace(/\"updated\": *\"[^\"]*\"/,'\"updated\": \"'+d+'\"');fs.writeFileSync(f,out);console.log('règles v'+v+' du '+d)"

tag:
	@git diff --quiet && git diff --cached --quiet || (echo "Des modifications ne sont pas commitées." && exit 1)
	git tag v$(VERSION)
	@echo "Tag v$(VERSION) créé. Pour le publier : git push --tags"

gradle-stop:
	-cd android && ./gradlew --stop

clean: gradle-stop
	rm -rf android .expo $(DIST)

reset: clean
	rm -rf node_modules
	npm install
	npx expo install --check
