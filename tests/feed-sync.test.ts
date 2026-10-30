import { defaultRules } from '../src/engine';
import { FILES, loadFeed, parseDomains, refreshFeed, shouldRefresh, verifySignature, type FeedStore } from '../src/feed/sync';
import { formatDate } from '../src/ui/formatDate';
import { formatCount } from '../src/i18n/fr';

const lib = require('../scripts/feed-lib.js');

const BASE = 'https://example.test/feed';
const NOW = Date.UTC(2026, 9, 30, 12);
const DAY = 24 * 60 * 60 * 1000;
const keys = lib.generateKeyPair();
const otherKeys = lib.generateKeyPair();

function memoryStore(initial: Record<string, string> = {}): FeedStore & { files: Record<string, string> } {
  const files = { ...initial };
  return {
    files,
    async read(name) {
      return name in files ? files[name] : null;
    },
    async write(name, text) {
      files[name] = text;
    },
  };
}

function remote(overrides: Record<string, string> = {}) {
  const rulesText = lib.serialize({ ...require('../rules/rules.json'), version: defaultRules.version + 1 });
  const domainsText = lib.serialize({
    schema: 1,
    generated: '2026-10-30T06:00:00.000Z',
    count: 2,
    entries: [
      ['colis-relais-24.com', '2026-10-30'],
      ['ameli-dossier.top', '2026-10-29'],
    ],
  });
  const files: Record<string, string> = {
    'rules.json': rulesText,
    'rules.json.sig': lib.signText(rulesText, keys.privateKeyPem),
    'domains.json': domainsText,
    'domains.json.sig': lib.signText(domainsText, keys.privateKeyPem),
    ...overrides,
  };
  const requested: string[] = [];
  const fetchText = async (url: string) => {
    requested.push(url);
    const name = url.replace(`${BASE}/`, '');
    if (!(name in files)) {
      throw new Error('HTTP 404');
    }
    return files[name];
  };
  return { files, fetchText, requested };
}

describe('verifySignature', () => {
  it('accepts a valid signature and rejects tampering or another key', () => {
    const text = 'bonjour';
    const signature = lib.signText(text, keys.privateKeyPem);
    expect(verifySignature(text, signature, keys.publicKey)).toBe(true);
    expect(verifySignature('bonjour!', signature, keys.publicKey)).toBe(false);
    expect(verifySignature(text, signature, otherKeys.publicKey)).toBe(false);
    expect(verifySignature(text, 'not-base64!', keys.publicKey)).toBe(false);
    expect(verifySignature(text, signature, '')).toBe(false);
  });
});

describe('parseDomains', () => {
  it('rejects unknown formats and skips invalid hosts', () => {
    expect(() => parseDomains('{"schema":2,"entries":[],"generated":"x"}')).toThrow();
    const parsed = parseDomains('{"schema":1,"generated":"g","entries":[["ok.xyz","d"],["Bad Host","d"],[1,"d"],["nodot","d"]]}');
    expect(parsed.hosts).toEqual(['ok.xyz']);
  });
});

describe('refreshFeed', () => {
  it('downloads, verifies and caches rules and domains', async () => {
    const store = memoryStore();
    const { fetchText, requested } = remote();
    const outcome = await refreshFeed({
      store,
      fetchText,
      baseUrl: `${BASE}/`,
      publicKey: keys.publicKey,
      bundledRules: defaultRules,
      now: NOW,
    });
    expect(outcome.status).toBe('updated');
    expect(outcome.errors).toEqual([]);
    expect(requested).toContain(`${BASE}/domains.json.sig`);
    expect(outcome.data.rulesSource).toBe('remote');
    expect(outcome.data.rules.version).toBe(defaultRules.version + 1);
    expect(outcome.data.blocklistCount).toBe(2);
    expect(outcome.data.blocklist.has('www.colis-relais-24.com')).toBe(true);
    expect(outcome.data.settings.lastCheck).toBe(NOW);
    expect(outcome.data.settings.lastSuccess).toBe(NOW);

    const reloaded = await loadFeed(store, defaultRules);
    expect(reloaded.blocklistCount).toBe(2);
    expect(reloaded.rulesSource).toBe('remote');
  });

  it('refuses files signed with another key and keeps the previous data', async () => {
    const store = memoryStore();
    const { files } = remote();
    const forged = remote({ 'domains.json.sig': lib.signText(files['domains.json'], otherKeys.privateKeyPem) });
    const outcome = await refreshFeed({
      store,
      fetchText: forged.fetchText,
      baseUrl: BASE,
      publicKey: keys.publicKey,
      bundledRules: defaultRules,
      now: NOW,
    });
    expect(outcome.status).toBe('failed');
    expect(outcome.errors.join()).toContain('invalid signature');
    expect(store.files[FILES.domains]).toBeUndefined();
    expect(outcome.data.blocklistCount).toBe(0);
    expect(outcome.data.rulesSource).toBe('remote');
    expect(outcome.data.settings.lastSuccess).toBeNull();
  });

  it('keeps the bundled rules when the remote ones are older or invalid', async () => {
    const older = lib.serialize({ ...require('../rules/rules.json'), version: 0 });
    const invalid = lib.serialize({ version: 99 });
    for (const text of [older, invalid]) {
      const store = memoryStore();
      const { fetchText } = remote({ 'rules.json': text, 'rules.json.sig': lib.signText(text, keys.privateKeyPem) });
      const outcome = await refreshFeed({
        store,
        fetchText,
        baseUrl: BASE,
        publicKey: keys.publicKey,
        bundledRules: defaultRules,
        now: NOW,
      });
      expect(outcome.data.rulesSource).toBe('bundled');
      expect(outcome.data.rules).toBe(defaultRules);
      expect(outcome.data.blocklistCount).toBe(2);
    }
  });

  it('does nothing without a public key', async () => {
    const store = memoryStore();
    const { fetchText, requested } = remote();
    const outcome = await refreshFeed({
      store,
      fetchText,
      baseUrl: BASE,
      publicKey: '',
      bundledRules: defaultRules,
      now: NOW,
    });
    expect(outcome.status).toBe('notConfigured');
    expect(requested).toEqual([]);
  });

  it('survives network errors', async () => {
    const store = memoryStore();
    const outcome = await refreshFeed({
      store,
      fetchText: async () => {
        throw new Error('offline');
      },
      baseUrl: BASE,
      publicKey: keys.publicKey,
      bundledRules: defaultRules,
      now: NOW,
    });
    expect(outcome.status).toBe('failed');
    expect(outcome.data.rules).toBe(defaultRules);
    expect(outcome.data.settings.lastCheck).toBe(NOW);
  });
});

describe('loadFeed', () => {
  it('falls back to defaults with corrupted cache files', async () => {
    const store = memoryStore({ [FILES.rules]: '{', [FILES.domains]: 'oops', [FILES.settings]: '[' });
    const data = await loadFeed(store, defaultRules);
    expect(data.rules).toBe(defaultRules);
    expect(data.blocklistCount).toBe(0);
    expect(data.settings.autoUpdate).toBe(true);
  });
});

describe('shouldRefresh', () => {
  it('refreshes once a day when automatic updates are on', () => {
    const base = { autoUpdate: true, lastCheck: null, lastSuccess: null };
    expect(shouldRefresh(base, NOW, DAY)).toBe(true);
    expect(shouldRefresh({ ...base, lastCheck: NOW - DAY / 2 }, NOW, DAY)).toBe(false);
    expect(shouldRefresh({ ...base, lastCheck: NOW - DAY }, NOW, DAY)).toBe(true);
    expect(shouldRefresh({ ...base, autoUpdate: false }, NOW, DAY)).toBe(false);
  });
});

describe('formatting', () => {
  it('formats dates and counts in French', () => {
    expect(formatDate('2026-10-30T06:00:00.000Z')).toBe('30/10/2026');
    expect(formatDate('2026-10-21')).toBe('21/10/2026');
    expect(formatCount(12345)).toBe('12 345');
    expect(formatCount(999)).toBe('999');
  });
});
