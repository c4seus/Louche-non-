import { levenshtein } from './distance';
import { extractLinks, stripLinks } from './links';
import { defaultRules } from './rules';
import { containsPhrase, countPhrases, hasAmount, normalizeText } from './text';
import type { AnalysisResult, Brand, Finding, FindingCode, Link, Rules, Severity, Verdict } from './types';

export const SCAM_THRESHOLD = 60;
export const SUSPICIOUS_THRESHOLD = 30;
const MAX_SCENARIOS = 2;

const POINTS: Record<Exclude<FindingCode, 'scenario'>, number> = {
  brandImpersonation: 50,
  brandInSubdomain: 50,
  typosquat: 50,
  lookalikeTld: 50,
  nonAsciiDomain: 50,
  punycode: 50,
  ipAddress: 40,
  shortener: 20,
  suspiciousTld: 20,
  brandLinkMismatch: 35,
  pressure: 15,
  sensitiveRequest: 25,
  paymentRequest: 15,
  giftCard: 40,
  moneyRequest: 25,
  officialLinks: -15,
};

const BRAND_CODES: FindingCode[] = ['brandImpersonation', 'brandInSubdomain', 'typosquat', 'lookalikeTld'];

export function severityOf(points: number): Severity {
  if (points >= 40) {
    return 'high';
  }
  if (points >= 20) {
    return 'medium';
  }
  if (points > 0) {
    return 'low';
  }
  return 'info';
}

export function verdictOf(score: number): Verdict {
  if (score >= SCAM_THRESHOLD) {
    return 'scam';
  }
  if (score >= SUSPICIOUS_THRESHOLD) {
    return 'suspicious';
  }
  return 'clean';
}

function finding(code: Exclude<FindingCode, 'scenario'>, extra: Partial<Finding> = {}): Finding {
  const points = POINTS[code];
  return { code, points, severity: severityOf(points), ...extra };
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function splitTokens(value: string): string[] {
  return value.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function compact(value: string): string {
  return value.replace(/[^\p{L}\p{N}]+/gu, '');
}

function hasBrandToken(value: string, token: string): boolean {
  if (value === '') {
    return false;
  }
  if (token.length >= 6) {
    return compact(value).includes(token);
  }
  return splitTokens(value).includes(token);
}

function domainLabel(domain: string, rules: Rules): string {
  const labels = domain.split('.');
  const lastTwo = labels.slice(-2).join('.');
  if (labels.length >= 3 && rules.multiLevelSuffixes.includes(lastTwo)) {
    return labels[labels.length - 3];
  }
  return labels.length >= 2 ? labels[labels.length - 2] : labels[0];
}

function maxTypoDistance(length: number): number {
  return length >= 8 ? 2 : 1;
}

function brandFindingFor(link: Link, brands: Brand[], rules: Rules): Finding | null {
  const base = { host: link.host, registrableDomain: link.registrableDomain };
  const linkLabel = compact(link.label);
  for (const brand of brands) {
    const domain = brand.domains.find((item) => compact(domainLabel(item, rules)) === linkLabel);
    if (domain !== undefined) {
      return finding('lookalikeTld', { ...base, brandId: brand.id, officialDomain: domain });
    }
  }
  for (const brand of brands) {
    if (brand.tokens.some((token) => hasBrandToken(link.label, token))) {
      return finding('brandImpersonation', { ...base, brandId: brand.id, officialDomain: brand.domains[0] });
    }
  }
  for (const brand of brands) {
    const inSubdomain =
      brand.tokens.some((token) => hasBrandToken(link.subdomain, token)) ||
      brand.domains.some((domain) => link.subdomain.includes(domain));
    if (inSubdomain) {
      return finding('brandInSubdomain', { ...base, brandId: brand.id, officialDomain: brand.domains[0] });
    }
  }
  for (const brand of brands) {
    for (const domain of brand.domains) {
      const officialLabel = compact(domainLabel(domain, rules));
      if (officialLabel.length >= 5) {
        const distance = levenshtein(officialLabel, linkLabel);
        if (distance > 0 && distance <= maxTypoDistance(officialLabel.length)) {
          return finding('typosquat', { ...base, brandId: brand.id, officialDomain: domain });
        }
      }
    }
  }
  return null;
}

function linkFindings(link: Link, rules: Rules, officialDomains: string[]): Finding[] {
  const base = { host: link.host, registrableDomain: link.registrableDomain };
  if (link.isIp) {
    return [finding('ipAddress', base)];
  }
  const results: Finding[] = [];
  if (rules.shorteners.some((domain) => hostMatches(link.host, domain))) {
    results.push(finding('shortener', base));
    return results;
  }
  if (officialDomains.some((domain) => hostMatches(link.host, domain))) {
    return results;
  }
  if (link.host.split('.').some((label) => label.startsWith('xn--'))) {
    results.push(finding('punycode', base));
  } else if (/[^\x00-\x7f]/.test(link.host)) {
    results.push(finding('nonAsciiDomain', base));
  }
  const brandFinding = brandFindingFor(link, rules.brands, rules);
  if (brandFinding !== null) {
    results.push(brandFinding);
  }
  if (rules.suspiciousTlds.includes(link.tld)) {
    results.push(finding('suspiciousTld', { ...base, tld: link.tld }));
  }
  return results;
}

function isOfficialFor(link: Link, brand: Brand): boolean {
  return brand.domains.some((domain) => hostMatches(link.host, domain));
}

export function analyze(input: string, rules: Rules = defaultRules): AnalysisResult {
  const links = extractLinks(input, rules);
  const text = normalizeText(stripLinks(input, links));
  const officialDomains = [...rules.brands.flatMap((brand) => brand.domains), ...rules.trustedDomains];
  const isOfficial = (link: Link) =>
    !link.isIp && officialDomains.some((domain) => hostMatches(link.host, domain));

  const findings: Finding[] = [];
  const seenHosts = new Set<string>();
  for (const link of links) {
    if (seenHosts.has(link.host)) {
      continue;
    }
    seenHosts.add(link.host);
    findings.push(...linkFindings(link, rules, officialDomains));
  }

  const flaggedBrands = new Set(
    findings.filter((item) => BRAND_CODES.includes(item.code)).map((item) => item.brandId),
  );
  for (const brand of rules.brands) {
    if (flaggedBrands.has(brand.id)) {
      continue;
    }
    if (!brand.names.some((name) => containsPhrase(text, name))) {
      continue;
    }
    const offending = links.find((link) => !isOfficial(link) && !isOfficialFor(link, brand));
    if (offending !== undefined) {
      findings.push(
        finding('brandLinkMismatch', {
          host: offending.host,
          registrableDomain: offending.registrableDomain,
          brandId: brand.id,
          officialDomain: brand.domains[0],
        }),
      );
    }
  }

  const scenarios = rules.scenarios
    .filter((scenario) => {
      const anchors = countPhrases(text, scenario.anchors);
      const keywords = countPhrases(text, scenario.keywords);
      return anchors >= 1 && anchors + keywords >= scenario.minMatches;
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_SCENARIOS);
  for (const scenario of scenarios) {
    findings.push({
      code: 'scenario',
      points: scenario.weight,
      severity: severityOf(scenario.weight),
      scenarioId: scenario.id,
    });
  }

  if (countPhrases(text, rules.pressure) > 0) {
    findings.push(finding('pressure'));
  }
  if (countPhrases(text, rules.sensitive) > 0) {
    findings.push(finding('sensitiveRequest'));
  }
  if (hasAmount(input) && countPhrases(text, rules.payment) > 0 && (scenarios.length > 0 || links.length > 0)) {
    findings.push(finding('paymentRequest'));
  }
  if (countPhrases(text, rules.giftCards) > 0) {
    findings.push(finding('giftCard'));
  }
  if (countPhrases(text, rules.moneyRequest) > 0) {
    findings.push(finding('moneyRequest'));
  }

  const hasStrongSignal = findings.some((item) => item.points >= 40);
  if (links.length > 0 && links.every(isOfficial) && !hasStrongSignal) {
    findings.push(finding('officialLinks'));
  }

  const total = findings.reduce((sum, item) => sum + item.points, 0);
  const score = Math.max(0, Math.min(100, total));
  findings.sort((a, b) => b.points - a.points);
  return { verdict: verdictOf(score), score, findings, links };
}
