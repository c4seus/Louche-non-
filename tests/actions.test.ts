import { MAX_PREFILL_LENGTH, MISSED_SCAM_FORM_URL } from '../src/config';
import { missedScamUrl } from '../src/ui/actions';

describe('missedScamUrl', () => {
  it('opens the missed scam form with the message and verdict prefilled', () => {
    const url = missedScamUrl('Colis bloqué : https://exemple.xyz/a?b=1&c=2', 'clean');
    expect(url.startsWith(`${MISSED_SCAM_FORM_URL}&`)).toBe(true);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('template')).toBe('missed-scam.yml');
    expect(params.get('message')).toBe('Colis bloqué : https://exemple.xyz/a?b=1&c=2');
    expect(params.get('result')).toBe('Aucun signal suspect détecté');
    expect(params.get('title')).toBe('Arnaque non détectée');
  });

  it('truncates long messages', () => {
    const url = missedScamUrl('a'.repeat(MAX_PREFILL_LENGTH + 500), 'suspicious');
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('message')).toHaveLength(MAX_PREFILL_LENGTH);
    expect(params.get('result')).toBe('Message suspect');
  });
});
