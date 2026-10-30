import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const lib = require('./feed-lib.js');

const SOURCES = [
  {
    name: 'phishing-filter (curbengh)',
    license: 'CC BY-SA 4.0',
    homepage: 'https://gitlab.com/malware-filter/phishing-filter',
    urls: [
      'https://malware-filter.gitlab.io/malware-filter/phishing-filter-hosts.txt',
      'https://curbengh.github.io/phishing-filter/phishing-filter-hosts.txt',
      'https://phishing-filter.pages.dev/phishing-filter-hosts.txt',
    ],
  },
];

if (process.env.FEED_SOURCE_URLS) {
  SOURCES.splice(0, SOURCES.length, {
    name: 'custom',
    license: 'see source',
    homepage: process.env.FEED_SOURCE_URLS.split(',')[0],
    urls: process.env.FEED_SOURCE_URLS.split(','),
  });
}

const EXTRA_EXCLUSIONS = [
  'google.com',
  'google.fr',
  'gouv.fr',
  'service-public.fr',
  'github.com',
  'github.io',
  'microsoft.com',
  'apple.com',
  'whatsapp.com',
  'facebook.com',
  'instagram.com',
  'wikipedia.org',
];

const MAX_ENTRIES = 60000;
const RETENTION_DAYS = 45;
const MIN_ENTRIES = 50;

async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return response.text();
}

async function fetchSource(source) {
  const errors = [];
  for (const url of source.urls) {
    try {
      const text = await fetchText(url);
      const hosts = lib.parseList(text);
      if (hosts.size >= MIN_ENTRIES) {
        console.log(`${source.name}: ${hosts.size} hosts from ${url}`);
        return hosts;
      }
      errors.push(`${url}: only ${hosts.size} hosts`);
    } catch (error) {
      errors.push(String(error.message ?? error));
    }
  }
  throw new Error(`${source.name} unavailable:\n  ${errors.join('\n  ')}`);
}

async function readJson(file) {
  if (!existsSync(file)) {
    return null;
  }
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function dataReadme(feed, rules) {
  const sources = SOURCES.map((s) => `- [${s.name}](${s.homepage}), licence ${s.license}`).join('\n');
  return `# Louche, non ? — feed

Generated automatically by \`.github/workflows/feed.yml\` on the \`main\` branch. Do not edit by hand.

- \`rules.json\`: detection rules, version ${rules.version} (${rules.updated})
- \`domains.json\`: ${feed.count} known phishing hosts, generated ${feed.generated}
- \`*.sig\`: Ed25519 signatures, checked by the app before use

## Data sources

${sources}

\`domains.json\` is a derived database distributed under CC BY-SA 4.0.
`;
}

async function main() {
  const outDir = path.resolve(process.argv[2] ?? 'feed-out');
  const privateKey = process.env.FEED_SIGNING_KEY;
  if (!privateKey) {
    throw new Error('FEED_SIGNING_KEY is not set');
  }
  await mkdir(outDir, { recursive: true });

  const rulesText = await readFile(path.resolve('rules/rules.json'), 'utf8');
  const rules = JSON.parse(rulesText);
  const previous = await readJson(path.join(outDir, 'domains.json'));
  const hostSets = await Promise.all(SOURCES.map(fetchSource));

  const feed = lib.buildFeed({
    hostSets,
    previous,
    exclusions: lib.exclusionsFromRules(rules, EXTRA_EXCLUSIONS),
    now: Date.now(),
    maxEntries: MAX_ENTRIES,
    retentionDays: RETENTION_DAYS,
  });
  if (feed.count < MIN_ENTRIES) {
    throw new Error(`Feed too small (${feed.count} entries), keeping the previous one`);
  }

  const domainsText = lib.serialize(feed);
  await writeFile(path.join(outDir, 'domains.json'), domainsText);
  await writeFile(path.join(outDir, 'domains.json.sig'), lib.signText(domainsText, privateKey));
  await writeFile(path.join(outDir, 'rules.json'), rulesText);
  await writeFile(path.join(outDir, 'rules.json.sig'), lib.signText(rulesText, privateKey));
  await writeFile(path.join(outDir, 'README.md'), dataReadme(feed, rules));
  console.log(`Feed written to ${outDir}: ${feed.count} hosts, rules v${rules.version}`);
  console.log(`Public key: ${lib.publicKeyBase64(privateKey)}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
