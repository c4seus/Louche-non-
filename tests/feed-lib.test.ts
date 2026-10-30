import nacl from 'tweetnacl';
import { base64ToBytes, utf8Bytes } from '../src/feed/encoding';

const lib = require('../scripts/feed-lib.js');

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 30, 12);

describe('parseList', () => {
  it('reads hosts, adblock and plain formats and skips comments', () => {
    const text = [
      '# Title: phishing filter',
      '! adblock comment',
      '0.0.0.0 laposte-suivi.info',
      '127.0.0.1 Ameli-Remboursement.FR. # trailing',
      '||antai-paiement.com^',
      'https://user@chronopots.fr:8443/suivi?id=1',
      '*.wildcard-scam.xyz',
      '185.23.44.10',
      'not a domain',
      '0.0.0.0 0.0.0.0',
      '',
    ].join('\n');
    expect([...lib.parseList(text)].sort()).toEqual([
      '185.23.44.10',
      'ameli-remboursement.fr',
      'antai-paiement.com',
      'chronopots.fr',
      'laposte-suivi.info',
      'wildcard-scam.xyz',
    ]);
  });
});

describe('buildFeed', () => {
  const exclusions = ['laposte.fr', 'google.com'];

  it('merges sources, excludes official domains and keeps first-seen dates', () => {
    const feed = lib.buildFeed({
      hostSets: [new Set(['a-scam.xyz', 'www.laposte.fr', 'laposte.fr']), new Set(['b-scam.top', 'a-scam.xyz'])],
      previous: { entries: [['b-scam.top', '2026-10-20']] },
      exclusions,
      now: NOW,
      maxEntries: 100,
      retentionDays: 45,
    });
    expect(feed.entries).toEqual([
      ['a-scam.xyz', '2026-10-30'],
      ['b-scam.top', '2026-10-20'],
    ]);
    expect(feed.count).toBe(2);
    expect(feed.schema).toBe(1);
  });

  it('drops entries older than the retention period and caps the size', () => {
    const feed = lib.buildFeed({
      hostSets: [new Set(['old.xyz', 'new1.xyz', 'new2.xyz'])],
      previous: { entries: [['old.xyz', new Date(NOW - 60 * DAY).toISOString().slice(0, 10)]] },
      exclusions,
      now: NOW,
      maxEntries: 1,
      retentionDays: 45,
    });
    expect(feed.entries).toEqual([['new1.xyz', '2026-10-30']]);
    expect(feed.count).toBe(1);
  });

  it('builds exclusions from the rules', () => {
    const rules = require('../rules/rules.json');
    const list = lib.exclusionsFromRules(rules, ['github.io']);
    expect(list).toContain('ameli.fr');
    expect(list).toContain('bit.ly');
    expect(list).toContain('github.io');
    expect(lib.isExcluded('sub.ameli.fr', list)).toBe(true);
    expect(lib.isExcluded('ameli-fr.xyz', list)).toBe(false);
  });
});

describe('signatures', () => {
  it('produces Ed25519 signatures that tweetnacl accepts', () => {
    const { privateKeyPem, publicKey } = lib.generateKeyPair();
    const text = lib.serialize({ hello: 'été' });
    const signature = lib.signText(text, privateKeyPem);
    const ok = nacl.sign.detached.verify(
      utf8Bytes(text),
      base64ToBytes(signature),
      base64ToBytes(publicKey),
    );
    expect(ok).toBe(true);
    expect(lib.publicKeyBase64(privateKeyPem)).toBe(publicKey);
  });
});
