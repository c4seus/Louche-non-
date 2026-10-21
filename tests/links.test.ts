import { defaultRules, extractLinks, registrableDomain } from '../src/engine';

const hosts = (text: string) => extractLinks(text, defaultRules).map((link) => link.host);

describe('registrableDomain', () => {
  it('keeps the last two labels', () => {
    expect(registrableDomain('www.laposte.fr', defaultRules.multiLevelSuffixes)).toBe('laposte.fr');
  });

  it('handles multi-level suffixes', () => {
    expect(registrableDomain('www.antai.gouv.fr', defaultRules.multiLevelSuffixes)).toBe('antai.gouv.fr');
  });

  it('returns IP addresses unchanged', () => {
    expect(registrableDomain('185.23.44.10', defaultRules.multiLevelSuffixes)).toBe('185.23.44.10');
  });
});

describe('extractLinks', () => {
  it('finds links with a scheme and strips trailing punctuation', () => {
    expect(hosts('Cliquez ici : https://exemple.com/a.')).toEqual(['exemple.com']);
  });

  it('finds bare domains with a known TLD', () => {
    expect(hosts('Rendez-vous sur ameli-remboursement.fr/dossier')).toEqual(['ameli-remboursement.fr']);
  });

  it('ignores sentences glued by a dot', () => {
    expect(hosts('A demain.Merci beaucoup')).toEqual([]);
  });

  it('ignores email addresses', () => {
    expect(hosts('Écrivez à contact@laposte.fr')).toEqual([]);
  });

  it('uses the real host after a userinfo part', () => {
    expect(hosts('http://netflix.com@account-check.xyz/pay')).toEqual(['account-check.xyz']);
  });

  it('finds bare IP links with a path', () => {
    expect(hosts('Allez sur 10.0.0.1/login')).toEqual(['10.0.0.1']);
  });

  it('does not treat version numbers as IP links', () => {
    expect(hosts('Version 1.2.3.4 disponible')).toEqual([]);
  });

  it('keeps non-ASCII hosts', () => {
    expect(hosts('https://аmeli.fr/x')).toEqual(['аmeli.fr']);
  });

  it('removes duplicates', () => {
    expect(hosts('bit.ly/abc et bit.ly/abc')).toEqual(['bit.ly']);
  });
});
