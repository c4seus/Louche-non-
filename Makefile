SHELL := /bin/bash
.DEFAULT_GOAL := help

APP_NAME := louche-non
PACKAGE := fr.c4seus.louchenon
DIST := dist
VERSION = $(shell node -p "require('./app.json').expo.version")
VERSION_CODE = $(shell node -p "require('./app.json').expo.android.versionCode")
RULES_VERSION = $(shell node -p "require('./rules/rules.json').version")
RULES_UPDATED = $(shell node -p "require('./rules/rules.json').updated")
APK_SRC := android/app/build/outputs/apk/release/app-release.apk
AAB_SRC := android/app/build/outputs/bundle/release/app-release.aab

.PHONY: help install check fix doctor typecheck test test-watch corpus verify start start-clear \
	usb dev devices logs prebuild apk aab install-apk uninstall version bump-patch bump-minor \
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
	@echo "  make apk           APK de release dans $(DIST)/ (bêta testeurs, GitHub Releases)"
	@echo "  make aab           AAB de release dans $(DIST)/ (Play Store)"
	@echo "  make install-apk   Installe l'APK de release sur le téléphone"
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

apk: verify prebuild
	cd android && ./gradlew assembleRelease
	mkdir -p $(DIST)
	cp $(APK_SRC) $(DIST)/$(APP_NAME)-$(VERSION).apk
	@echo "APK prêt : $(DIST)/$(APP_NAME)-$(VERSION).apk"

aab: verify prebuild
	cd android && ./gradlew bundleRelease
	mkdir -p $(DIST)
	cp $(AAB_SRC) $(DIST)/$(APP_NAME)-$(VERSION)-$(VERSION_CODE).aab
	@echo "AAB prêt : $(DIST)/$(APP_NAME)-$(VERSION)-$(VERSION_CODE).aab"

install-apk:
	adb install -r $(DIST)/$(APP_NAME)-$(VERSION).apk

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
