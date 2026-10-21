import { defaultRules } from '../engine/rules';
import type { Finding, Rules, Verdict } from '../engine/types';

export interface VerdictText {
  icon: string;
  title: string;
  summary: string;
}

export const verdictTexts: Record<Verdict, VerdictText> = {
  scam: {
    icon: '❌',
    title: 'Arnaque probable',
    summary: 'Ne cliquez sur aucun lien, ne rappelez pas le numéro indiqué et ne répondez pas.',
  },
  suspicious: {
    icon: '⚠️',
    title: 'Message suspect',
    summary: 'Méfiez-vous : vérifiez par vous-même avant de faire quoi que ce soit.',
  },
  clean: {
    icon: '🔎',
    title: 'Aucun signal suspect détecté',
    summary:
      "Cela ne garantit pas que le message est sûr : certaines arnaques passent entre les mailles du filet.",
  },
};

export const ui = {
  appName: 'Louche, non ?',
  tagline: 'Collez un SMS ou un e-mail douteux, on vous dit ce qui cloche.',
  inputPlaceholder: 'Collez ici le texte du message…',
  paste: 'Coller',
  clear: 'Effacer',
  analyze: 'Analyser',
  emptyInput: "Collez d'abord le texte d'un message.",
  emptyClipboard: 'Le presse-papiers est vide.',
  findingsTitle: 'Ce qui a été repéré',
  noFindings: 'Rien de particulier.',
  linksTitle: 'Liens trouvés dans le message',
  linksHint: "Ne les ouvrez pas : ils sont affichés pour information.",
  adviceTitle: 'Le bon réflexe',
  advice:
    "Pour vérifier, ouvrez vous-même l'application ou le site officiel, jamais le lien du message. Pour votre banque, appelez le numéro inscrit au dos de votre carte.",
  actionsTitle: 'Que faire ?',
  report33700: 'Signaler au 33700',
  report33700Done:
    "Le SMS a été préparé. Après l'envoi, le 33700 vous demandera le numéro de l'expéditeur : envoyez-le dans un second SMS.",
  report33700Title: 'Signalement au 33700',
  cybermalveillance: 'Aide sur cybermalveillance.gouv.fr',
  blockNumber: 'Bloquer le numéro',
  blockNumberTitle: 'Bloquer le numéro',
  blockNumberBody:
    "Ouvrez votre application Messages, appuyez sur la conversation, puis sur le menu (⋮) et choisissez « Bloquer » ou « Bloquer et signaler comme spam ». L'application Louche, non ? ne peut pas le faire à votre place.",
  ok: 'Compris',
  openError: "Impossible d'ouvrir l'application.",
  privacy: 'Analyse faite sur votre téléphone. Rien n’est envoyé.',
  disclaimer: 'Ceci est un avis automatique, pas une garantie.',
  cancel: 'Annuler',
  missedScamLink: 'C’est une arnaque ? Signalez-la pour améliorer l’application',
  missedScamTitle: 'Signaler une arnaque non détectée',
  missedScamBody:
    'Le formulaire s’ouvre sur GitHub avec le message prérempli. Un compte GitHub gratuit est nécessaire.\n\nAttention : votre signalement sera public. Avant de l’envoyer, effacez votre nom, vos numéros (téléphone, suivi, dossier) et votre adresse. Gardez les liens.',
  missedScamContinue: 'Continuer',
  about: 'À propos',
  back: 'Retour',
  aboutTitle: 'À propos',
  aboutVersion: (version: string, rulesVersion: number, rulesUpdated: string) =>
    `Version ${version} · règles n° ${rulesVersion} du ${rulesUpdated}`,
  aboutHowTitle: 'Comment ça marche',
  aboutHowBody:
    'L’application compare le message à une liste de règles : faux sites qui imitent les organismes connus, liens raccourcis ou trompeurs, scénarios d’arnaque fréquents en France, demandes de code ou de paiement. Tout se passe sur votre téléphone : rien n’est envoyé, aucun compte, aucune publicité.',
  aboutContributeTitle: 'Contribuer',
  aboutContributeBody:
    'Les arnaques changent sans cesse. Vous avez reçu un message frauduleux que l’application n’a pas repéré, ou une fausse alerte ? Signalez-le sur GitHub : chaque signalement améliore les règles pour tout le monde. Les développeurs peuvent aussi proposer directement des corrections.',
  aboutReport: 'Signaler une arnaque ou une fausse alerte',
  aboutContributing: 'Guide pour les contributeurs',
  aboutCodeTitle: 'Code source et licence',
  aboutCodeBody:
    'Louche, non ? est un logiciel libre, publié sous licence GNU GPL version 3 ou ultérieure. Son code est public : chacun peut vérifier qu’il ne collecte aucune donnée.',
  aboutSource: 'Voir le code source',
  aboutLicense: 'Lire la licence',
  aboutPrivacy: 'Politique de confidentialité',
  aboutAuthor: 'Créé par c4seus.',
};

function brandLabel(rules: Rules, brandId?: string): string {
  return rules.brands.find((brand) => brand.id === brandId)?.label ?? 'un organisme connu';
}

function scenarioLabel(rules: Rules, scenarioId?: string): string {
  return rules.scenarios.find((scenario) => scenario.id === scenarioId)?.label ?? 'une arnaque connue';
}

export function describeFinding(item: Finding, rules: Rules = defaultRules): string {
  const host = item.host ?? '';
  const brand = brandLabel(rules, item.brandId);
  switch (item.code) {
    case 'brandImpersonation':
      return `L'adresse ${host} reprend le nom de ${brand}, mais ce n'est pas un de ses sites officiels.`;
    case 'brandInSubdomain':
      return `L'adresse ${host} affiche le nom de ${brand} au début pour faire illusion : le vrai site visité est ${item.registrableDomain}.`;
    case 'typosquat':
      return `L'adresse ${host} ressemble beaucoup à ${item.officialDomain}, le site de ${brand}, à une ou deux lettres près.`;
    case 'lookalikeTld':
      return `L'adresse ${host} reprend le nom de ${item.officialDomain}, mais avec une autre terminaison.`;
    case 'nonAsciiDomain':
      return `L'adresse ${host} contient des lettres d'un autre alphabet qui imitent des lettres normales.`;
    case 'punycode':
      return `L'adresse ${host} est codée pour cacher des caractères trompeurs.`;
    case 'ipAddress':
      return `Le lien mène vers une adresse en chiffres (${host}) au lieu d'un nom de site : aucun organisme sérieux ne fait ça.`;
    case 'shortener':
      return `Le lien est raccourci (${host}) : impossible de savoir où il mène vraiment.`;
    case 'suspiciousTld':
      return `La terminaison « .${item.tld} » est très utilisée par les arnaqueurs.`;
    case 'brandLinkMismatch':
      return `Le message parle de ${brand}, mais le lien mène vers ${host}, qui n'est pas son site officiel.`;
    case 'scenario':
      return `Le message ressemble à ${scenarioLabel(rules, item.scenarioId)}, un scénario d'arnaque très courant.`;
    case 'pressure':
      return 'Le message vous met la pression (délai, blocage, pénalité) pour vous faire agir sans réfléchir.';
    case 'sensitiveRequest':
      return 'Le message demande des informations confidentielles (code, coordonnées bancaires, identifiants).';
    case 'paymentRequest':
      return 'Le message vous demande de payer une somme, souvent faible pour ne pas éveiller les soupçons.';
    case 'giftCard':
      return 'Le message parle de coupons ou de cartes prépayées (Transcash, PCS, Neosurf…), le moyen de paiement préféré des escrocs.';
    case 'moneyRequest':
      return "Le message vous demande de l'argent.";
    case 'officialLinks':
      return 'Les liens mènent vers des sites officiels connus.';
  }
}
