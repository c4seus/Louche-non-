import { Alert, Linking } from 'react-native';
import { MAX_PREFILL_LENGTH, MISSED_SCAM_FORM_URL } from '../config';
import type { Verdict } from '../engine/types';
import { ui } from '../i18n/fr';

const REPORT_NUMBER = '33700';
const CYBERMALVEILLANCE_URL = 'https://www.cybermalveillance.gouv.fr/';
const MAX_SMS_BODY = 1000;

export async function openUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert(ui.openError);
    return false;
  }
}

export async function reportTo33700(message: string): Promise<void> {
  const body = encodeURIComponent(message.slice(0, MAX_SMS_BODY));
  const opened = await openUrl(`sms:${REPORT_NUMBER}?body=${body}`);
  if (opened) {
    Alert.alert(ui.report33700Title, ui.report33700Done, [{ text: ui.ok }]);
  }
}

export async function openCybermalveillance(): Promise<void> {
  await openUrl(CYBERMALVEILLANCE_URL);
}

export function showBlockHelp(): void {
  Alert.alert(ui.blockNumberTitle, ui.blockNumberBody, [{ text: ui.ok }]);
}

const verdictLabels: Record<Verdict, string> = {
  scam: 'Arnaque probable',
  suspicious: 'Message suspect',
  clean: 'Aucun signal suspect détecté',
};

export function missedScamUrl(message: string, verdict: Verdict): string {
  const params = [
    ['title', 'Arnaque non détectée'],
    ['message', message.slice(0, MAX_PREFILL_LENGTH)],
    ['result', verdictLabels[verdict]],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return `${MISSED_SCAM_FORM_URL}&${params}`;
}

export function reportMissedScam(message: string, verdict: Verdict): void {
  Alert.alert(ui.missedScamTitle, ui.missedScamBody, [
    { text: ui.cancel, style: 'cancel' },
    { text: ui.missedScamContinue, onPress: () => openUrl(missedScamUrl(message, verdict)) },
  ]);
}
