import data from '../../rules/rules.json';
import type { Brand, Rules, Scenario } from './types';

export class RulesError extends Error {}

function fail(path: string, expected: string): never {
  throw new RulesError(`Invalid rules: ${path} must be ${expected}`);
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, 'an object');
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(path, 'a non-empty string');
  }
  return value;
}

function asNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(path, 'a number');
  }
  return value;
}

function asStringList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    fail(path, 'an array of strings');
  }
  return value.map((item, index) => asString(item, `${path}[${index}]`));
}

function asLowerList(value: unknown, path: string): string[] {
  const list = asStringList(value, path);
  list.forEach((item, index) => {
    if (item !== item.toLowerCase()) {
      fail(`${path}[${index}]`, 'lowercase');
    }
  });
  return list;
}

function asBrand(value: unknown, path: string): Brand {
  const record = asRecord(value, path);
  const domains = asLowerList(record.domains, `${path}.domains`);
  if (domains.length === 0) {
    fail(`${path}.domains`, 'a non-empty array');
  }
  return {
    id: asString(record.id, `${path}.id`),
    label: asString(record.label, `${path}.label`),
    names: asStringList(record.names, `${path}.names`),
    tokens: asLowerList(record.tokens, `${path}.tokens`),
    domains,
  };
}

function asScenario(value: unknown, path: string): Scenario {
  const record = asRecord(value, path);
  const anchors = asStringList(record.anchors, `${path}.anchors`);
  if (anchors.length === 0) {
    fail(`${path}.anchors`, 'a non-empty array');
  }
  return {
    id: asString(record.id, `${path}.id`),
    label: asString(record.label, `${path}.label`),
    weight: asNumber(record.weight, `${path}.weight`),
    anchors,
    keywords: asStringList(record.keywords, `${path}.keywords`),
    minMatches: asNumber(record.minMatches, `${path}.minMatches`),
  };
}

function assertUniqueIds(items: { id: string }[], path: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      fail(path, `free of duplicate ids (duplicate: ${item.id})`);
    }
    seen.add(item.id);
  }
}

export function validateRules(input: unknown): Rules {
  const record = asRecord(input, 'rules');
  if (!Array.isArray(record.brands)) {
    fail('brands', 'an array');
  }
  if (!Array.isArray(record.scenarios)) {
    fail('scenarios', 'an array');
  }
  const brands = record.brands.map((brand, index) => asBrand(brand, `brands[${index}]`));
  const scenarios = record.scenarios.map((scenario, index) =>
    asScenario(scenario, `scenarios[${index}]`),
  );
  assertUniqueIds(brands, 'brands');
  assertUniqueIds(scenarios, 'scenarios');
  return {
    version: asNumber(record.version, 'version'),
    updated: asString(record.updated, 'updated'),
    brands,
    trustedDomains: asLowerList(record.trustedDomains, 'trustedDomains'),
    multiLevelSuffixes: asLowerList(record.multiLevelSuffixes, 'multiLevelSuffixes'),
    shorteners: asLowerList(record.shorteners, 'shorteners'),
    suspiciousTlds: asLowerList(record.suspiciousTlds, 'suspiciousTlds'),
    commonTlds: asLowerList(record.commonTlds, 'commonTlds'),
    scenarios,
    pressure: asStringList(record.pressure, 'pressure'),
    sensitive: asStringList(record.sensitive, 'sensitive'),
    payment: asStringList(record.payment, 'payment'),
    giftCards: asStringList(record.giftCards, 'giftCards'),
    moneyRequest: asStringList(record.moneyRequest, 'moneyRequest'),
  };
}

export const defaultRules: Rules = validateRules(data);
