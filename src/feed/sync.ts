import nacl from 'tweetnacl';
import { createBlocklist } from '../engine/blocklist';
import { validateRules } from '../engine/rules';
import type { Blocklist, Rules } from '../engine/types';
import { base64ToBytes, utf8Bytes } from './encoding';

export const FILES = {
  rules: 'rules.json',
  domains: 'domains.json',
  settings: 'feed-settings.json',
} as const;

const MAX_DOWNLOAD_CHARS = 8_000_000;
const MAX_ENTRIES = 200_000;
const HOST = /^[a-z0-9.-]{1,253}$/;

export interface FeedStore {
  read(name: string): Promise<string | null>;
  write(name: string, text: string): Promise<void>;
}

export type FetchText = (url: string) => Promise<string>;

export interface FeedSettings {
  autoUpdate: boolean;
  lastCheck: number | null;
  lastSuccess: number | null;
}

export interface FeedData {
  rules: Rules;
  rulesSource: 'bundled' | 'remote';
  blocklist: Blocklist;
  blocklistCount: number;
  blocklistGenerated: string | null;
  settings: FeedSettings;
}

export type RefreshStatus = 'updated' | 'failed' | 'notConfigured';

export interface RefreshOutcome {
  data: FeedData;
  status: RefreshStatus;
  errors: string[];
}

export interface RefreshOptions {
  store: FeedStore;
  fetchText: FetchText;
  baseUrl: string;
  publicKey: string;
  bundledRules: Rules;
  now: number;
}

interface ParsedDomains {
  hosts: string[];
  generated: string;
}

export const defaultSettings: FeedSettings = { autoUpdate: true, lastCheck: null, lastSuccess: null };

export function verifySignature(text: string, signature: string, publicKey: string): boolean {
  try {
    const key = base64ToBytes(publicKey);
    const sig = base64ToBytes(signature.trim());
    if (key.length !== nacl.sign.publicKeyLength || sig.length !== nacl.sign.signatureLength) {
      return false;
    }
    return nacl.sign.detached.verify(utf8Bytes(text), sig, key);
  } catch {
    return false;
  }
}

export function parseDomains(text: string): ParsedDomains {
  const data = JSON.parse(text) as unknown;
  if (typeof data !== 'object' || data === null) {
    throw new Error('domains: not an object');
  }
  const record = data as Record<string, unknown>;
  if (record.schema !== 1 || !Array.isArray(record.entries) || typeof record.generated !== 'string') {
    throw new Error('domains: unsupported format');
  }
  if (record.entries.length > MAX_ENTRIES) {
    throw new Error('domains: too many entries');
  }
  const hosts: string[] = [];
  for (const entry of record.entries) {
    if (Array.isArray(entry) && typeof entry[0] === 'string' && HOST.test(entry[0]) && entry[0].includes('.')) {
      hosts.push(entry[0]);
    }
  }
  return { hosts, generated: record.generated };
}

function parseSettings(text: string | null): FeedSettings {
  if (text === null) {
    return { ...defaultSettings };
  }
  try {
    const value = JSON.parse(text) as Partial<FeedSettings>;
    return {
      autoUpdate: typeof value.autoUpdate === 'boolean' ? value.autoUpdate : defaultSettings.autoUpdate,
      lastCheck: typeof value.lastCheck === 'number' ? value.lastCheck : null,
      lastSuccess: typeof value.lastSuccess === 'number' ? value.lastSuccess : null,
    };
  } catch {
    return { ...defaultSettings };
  }
}

function pickRules(text: string | null, bundled: Rules): { rules: Rules; source: 'bundled' | 'remote' } {
  if (text !== null) {
    try {
      const remote = validateRules(JSON.parse(text));
      if (remote.version >= bundled.version) {
        return { rules: remote, source: 'remote' };
      }
    } catch {
      return { rules: bundled, source: 'bundled' };
    }
  }
  return { rules: bundled, source: 'bundled' };
}

function buildData(rulesText: string | null, domainsText: string | null, settings: FeedSettings, bundled: Rules): FeedData {
  const { rules, source } = pickRules(rulesText, bundled);
  let parsed: ParsedDomains | null = null;
  if (domainsText !== null) {
    try {
      parsed = parseDomains(domainsText);
    } catch {
      parsed = null;
    }
  }
  return {
    rules,
    rulesSource: source,
    blocklist: createBlocklist(parsed?.hosts ?? []),
    blocklistCount: parsed?.hosts.length ?? 0,
    blocklistGenerated: parsed?.generated ?? null,
    settings,
  };
}

async function safeRead(store: FeedStore, name: string): Promise<string | null> {
  try {
    return await store.read(name);
  } catch {
    return null;
  }
}

export async function loadFeed(store: FeedStore, bundledRules: Rules): Promise<FeedData> {
  const [rulesText, domainsText, settingsText] = await Promise.all([
    safeRead(store, FILES.rules),
    safeRead(store, FILES.domains),
    safeRead(store, FILES.settings),
  ]);
  return buildData(rulesText, domainsText, parseSettings(settingsText), bundledRules);
}

export async function saveSettings(store: FeedStore, settings: FeedSettings): Promise<void> {
  await store.write(FILES.settings, JSON.stringify(settings));
}

export function shouldRefresh(settings: FeedSettings, now: number, intervalMs: number): boolean {
  return settings.autoUpdate && (settings.lastCheck === null || now - settings.lastCheck >= intervalMs);
}

async function downloadVerified(options: RefreshOptions, name: string): Promise<string> {
  const base = options.baseUrl.replace(/\/+$/, '');
  const [text, signature] = await Promise.all([
    options.fetchText(`${base}/${name}`),
    options.fetchText(`${base}/${name}.sig`),
  ]);
  if (text.length > MAX_DOWNLOAD_CHARS) {
    throw new Error(`${name}: too large`);
  }
  if (!verifySignature(text, signature, options.publicKey)) {
    throw new Error(`${name}: invalid signature`);
  }
  return text;
}

export async function refreshFeed(options: RefreshOptions): Promise<RefreshOutcome> {
  const { store, bundledRules, now } = options;
  const settings = parseSettings(await safeRead(store, FILES.settings));
  if (options.publicKey.trim() === '') {
    return { data: await loadFeed(store, bundledRules), status: 'notConfigured', errors: [] };
  }
  const errors: string[] = [];
  let updated = false;

  try {
    const text = await downloadVerified(options, FILES.rules);
    const rules = validateRules(JSON.parse(text));
    if (rules.version >= bundledRules.version) {
      await store.write(FILES.rules, text);
    }
    updated = true;
  } catch (error) {
    errors.push(String((error as Error).message ?? error));
  }

  try {
    const text = await downloadVerified(options, FILES.domains);
    parseDomains(text);
    await store.write(FILES.domains, text);
    updated = true;
  } catch (error) {
    errors.push(String((error as Error).message ?? error));
  }

  const nextSettings: FeedSettings = {
    ...settings,
    lastCheck: now,
    lastSuccess: errors.length === 0 ? now : settings.lastSuccess,
  };
  await saveSettings(store, nextSettings);
  const data = await loadFeed(store, bundledRules);
  return { data, status: updated && errors.length === 0 ? 'updated' : 'failed', errors };
}
