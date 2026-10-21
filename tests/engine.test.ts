import { analyze, defaultRules, normalizeText, validateRules, verdictOf, RulesError } from '../src/engine';
import { levenshtein } from '../src/engine/distance';
import { describeFinding } from '../src/i18n/fr';
import rawRules from '../rules/rules.json';

const codes = (text: string) => analyze(text).findings.map((item) => item.code);

describe('normalizeText', () => {
  it('removes accents, case and punctuation', () => {
    expect(normalizeText("Crit'Air : ÉCHÉANCE dépassée !")).toBe('crit air echeance depassee');
  });
});

describe('levenshtein', () => {
  it('computes edit distances', () => {
    expect(levenshtein('chronopost', 'chronopots')).toBe(2);
    expect(levenshtein('ameli', 'ameli')).toBe(0);
    expect(levenshtein('', 'abc')).toBe(3);
  });
});

describe('verdictOf', () => {
  it('maps scores to verdicts', () => {
    expect(verdictOf(0)).toBe('clean');
    expect(verdictOf(29)).toBe('clean');
    expect(verdictOf(30)).toBe('suspicious');
    expect(verdictOf(60)).toBe('scam');
  });
});

describe('link checks', () => {
  it('flags a brand name inside an unofficial domain', () => {
    expect(codes('https://ameli-remboursement.fr')).toContain('brandImpersonation');
  });

  it('does not flag a longer word that only starts like a short brand token', () => {
    expect(codes('https://amelie-boutique.fr')).not.toContain('brandImpersonation');
  });

  it('flags a brand domain used as a subdomain', () => {
    expect(codes('https://ameli.fr.remboursement-dossier.com')).toContain('brandInSubdomain');
  });

  it('flags typosquatting', () => {
    expect(codes('https://chronopots.fr')).toContain('typosquat');
  });

  it('flags the official name with another TLD', () => {
    expect(codes('https://ameli.com')).toContain('lookalikeTld');
  });

  it('flags punycode and non-ASCII hosts', () => {
    expect(codes('https://xn--paypl-7ve.com')).toContain('punycode');
    expect(codes('https://аmeli.fr')).toContain('nonAsciiDomain');
  });

  it('flags shorteners, IP addresses and suspicious TLDs', () => {
    expect(codes('https://bit.ly/abc')).toContain('shortener');
    expect(codes('http://185.23.44.10/login')).toContain('ipAddress');
    expect(codes('https://exemple.xyz')).toContain('suspiciousTld');
  });

  it('accepts official subdomains', () => {
    expect(analyze('https://particuliers.societegenerale.fr').verdict).toBe('clean');
  });
});

describe('text checks', () => {
  it('flags a brand mentioned with a link to another domain', () => {
    expect(codes('Crédit Agricole : connectez-vous sur https://securite-client.net')).toContain(
      'brandLinkMismatch',
    );
  });

  it('does not double count a brand already flagged on the link', () => {
    const found = codes('Ameli : https://ameli-remboursement.fr');
    expect(found).toContain('brandImpersonation');
    expect(found).not.toContain('brandLinkMismatch');
  });

  it('counts at most two scenarios', () => {
    const result = analyze(
      'Colis en attente, frais à régler. Amende impayée, majoration. Vos droits CPF expirent. Carte Vitale à renouveler, mettez à jour.',
    );
    expect(result.findings.filter((item) => item.code === 'scenario')).toHaveLength(2);
  });

  it('only requests payment when an amount and a payment word are present', () => {
    expect(codes('Colis en attente : frais de 2,99 € à régler')).toContain('paymentRequest');
    expect(codes('Colis en attente : frais à régler')).not.toContain('paymentRequest');
  });

  it('lowers the score when every link is official', () => {
    expect(codes('Votre colis est en attente, suivi sur https://www.laposte.fr')).toContain('officialLinks');
  });

  it('keeps the score between 0 and 100', () => {
    const result = analyze(
      'Ameli PayPal Netflix : compte suspendu, urgent, coordonnées bancaires, Transcash 50 € à régler https://xn--paypl-7ve.xyz https://bit.ly/a http://1.2.3.4/x',
    );
    expect(result.score).toBe(100);
    expect(analyze('').score).toBe(0);
  });

  it('sorts findings by points', () => {
    const points = analyze('Ameli : urgent https://ameli-remboursement.xyz').findings.map((item) => item.points);
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });
});

describe('rules', () => {
  it('loads the bundled rules', () => {
    expect(defaultRules.brands.length).toBeGreaterThan(0);
    expect(validateRules(rawRules)).toEqual(defaultRules);
  });

  it('rejects invalid rules', () => {
    expect(() => validateRules({})).toThrow(RulesError);
    expect(() => validateRules({ ...rawRules, shorteners: ['Bit.ly'] })).toThrow(RulesError);
    expect(() =>
      validateRules({ ...rawRules, brands: [...rawRules.brands, rawRules.brands[0]] }),
    ).toThrow(RulesError);
  });

  it('uses lowercase official domains that do not overlap with shorteners', () => {
    const official = defaultRules.brands.flatMap((brand) => brand.domains);
    expect(official.filter((domain) => defaultRules.shorteners.includes(domain))).toEqual([]);
  });
});

describe('describeFinding', () => {
  it('has a French message for every finding of the corpus', () => {
    const result = analyze('Ameli : urgent, mettez à jour vos informations https://ameli-remboursement.xyz');
    for (const item of result.findings) {
      expect(describeFinding(item).length).toBeGreaterThan(10);
    }
  });
});
