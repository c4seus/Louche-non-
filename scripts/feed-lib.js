const crypto = require('node:crypto');

const DOMAIN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;
const IPV4 = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const SINKHOLES = new Set(['0.0.0.0', '127.0.0.1', '::', '::1']);
const DAY_MS = 24 * 60 * 60 * 1000;

function extractHost(token) {
  let value = token.trim().toLowerCase();
  if (value === '') {
    return null;
  }
  value = value.replace(/^\|\|/, '').replace(/\^.*$/, '');
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  value = value.split(/[/?#]/)[0];
  const at = value.lastIndexOf('@');
  if (at >= 0) {
    value = value.slice(at + 1);
  }
  value = value.replace(/:\d+$/, '').replace(/\.$/, '').replace(/^\*\./, '');
  if (IPV4.test(value) || DOMAIN.test(value)) {
    return value;
  }
  return null;
}

function parseList(text) {
  const hosts = new Set();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, '').trim();
    if (line === '' || line.startsWith('#') || line.startsWith('!') || line.startsWith('[')) {
      continue;
    }
    const parts = line.split(/\s+/);
    const token = parts.length > 1 && SINKHOLES.has(parts[0]) ? parts[1] : parts[0];
    const host = extractHost(token);
    if (host !== null && !SINKHOLES.has(host)) {
      hosts.add(host);
    }
  }
  return hosts;
}

function isExcluded(host, exclusions) {
  for (const excluded of exclusions) {
    if (host === excluded || host.endsWith(`.${excluded}`)) {
      return true;
    }
  }
  return false;
}

function exclusionsFromRules(rules, extra = []) {
  return [
    ...rules.brands.flatMap((brand) => brand.domains),
    ...rules.trustedDomains,
    ...rules.shorteners,
    ...(Array.isArray(rules.feedExclusions) ? rules.feedExclusions : []),
    ...extra,
  ].map((domain) => domain.toLowerCase());
}

function previousFirstSeen(previous) {
  const map = new Map();
  if (previous && Array.isArray(previous.entries)) {
    for (const entry of previous.entries) {
      if (Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'string') {
        map.set(entry[0], entry[1]);
      }
    }
  }
  return map;
}

function buildFeed({ hostSets, previous, exclusions, now, maxEntries, retentionDays }) {
  const today = new Date(now).toISOString().slice(0, 10);
  const oldest = new Date(now - retentionDays * DAY_MS).toISOString().slice(0, 10);
  const known = previousFirstSeen(previous);
  const merged = new Set();
  for (const set of hostSets) {
    for (const host of set) {
      merged.add(host);
    }
  }
  const entries = [];
  for (const host of merged) {
    if (isExcluded(host, exclusions)) {
      continue;
    }
    const firstSeen = known.get(host) ?? today;
    if (firstSeen < oldest) {
      continue;
    }
    entries.push([host, firstSeen]);
  }
  entries.sort((a, b) => (a[1] === b[1] ? a[0].localeCompare(b[0]) : b[1].localeCompare(a[1])));
  return {
    schema: 1,
    generated: new Date(now).toISOString(),
    count: Math.min(entries.length, maxEntries),
    entries: entries.slice(0, maxEntries),
  };
}

function serialize(value) {
  return `${JSON.stringify(value)}\n`;
}

function signText(text, privateKeyPem) {
  const key = crypto.createPrivateKey(privateKeyPem);
  return crypto.sign(null, Buffer.from(text, 'utf8'), key).toString('base64');
}

function publicKeyBase64(privateKeyPem) {
  const jwk = crypto.createPublicKey(crypto.createPrivateKey(privateKeyPem)).export({ format: 'jwk' });
  return Buffer.from(jwk.x, 'base64url').toString('base64');
}

function generateKeyPair() {
  const { privateKey } = crypto.generateKeyPairSync('ed25519');
  const pem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
  return { privateKeyPem: pem, publicKey: publicKeyBase64(pem) };
}

module.exports = {
  extractHost,
  parseList,
  isExcluded,
  exclusionsFromRules,
  buildFeed,
  serialize,
  signText,
  publicKeyBase64,
  generateKeyPair,
};
