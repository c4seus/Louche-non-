# Contribuer

Merci de nous aider à protéger les gens contre les arnaques.

## Signaler une arnaque non détectée

1. Retirez toutes les données personnelles du message : noms, numéros de téléphone, numéros de suivi, montants qui vous concernent. Gardez les liens : c'est eux que le moteur analyse.
2. Ajoutez-le à `tests/corpus/samples.json` avec un `id` unique et le verdict attendu (`scam`, `suspicious` ou `clean`).
3. Lancez `npm test` et regardez pourquoi le test échoue : la sortie liste les signaux trouvés et leurs points.
4. Ajustez `rules/rules.json` : ajoutez un organisme, un domaine officiel, un mot-clé de scénario ou un raccourcisseur.
5. Relancez `npm test` : tous les messages doivent passer, y compris les messages légitimes.

Vous ne savez pas coder ? Ouvrez simplement une issue avec le formulaire « Arnaque non détectée » : quelqu'un s'occupera des règles.

Les messages légitimes sont aussi précieux que les arnaques : ils évitent les fausses alertes. Ajoutez de vraies notifications de La Poste, de banques ou d'administrations quand vous le pouvez.

## Conventions du fichier de règles

- Les domaines, les morceaux de nom et les terminaisons s'écrivent en minuscules.
- Les expressions peuvent contenir des accents et de la ponctuation : elles sont normalisées avant la recherche.
- Gardez des morceaux de nom précis. Les morceaux de moins de 6 lettres ne correspondent qu'à une partie entière d'un domaine.
- Un domaine officiel doit l'être vraiment : vérifiez-le depuis le site de l'organisme. Un domaine pirate ajouté par erreur neutraliserait la détection.
- Préférez ajouter des mots-clés à un scénario existant plutôt que d'en créer un nouveau.
- Incrémentez `version` et mettez à jour `updated` en haut du fichier (`make bump-rules`).

## Code

- TypeScript en mode strict. Les noms dans le code restent en anglais.
- Le moteur (`src/engine`) ne doit dépendre ni de React Native ni du réseau.
- Les textes affichés vont dans `src/i18n/fr.ts`.
- Avant d'ouvrir une pull request : `make verify` (ou `npm run typecheck` puis `npm test`).

En contribuant, vous acceptez que votre contribution soit publiée sous licence GPL-3.0-or-later.
