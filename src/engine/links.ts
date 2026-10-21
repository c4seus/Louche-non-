import type { Link, Rules } from './types';

const SCHEME_URL = /\bhttps?:\/\/[^\s<>"'«»]+/giu;
const WWW_URL = /(?<![\p{L}\p{N}.@/-])www\.[^\s<>"'«»]+/giu;
const BARE_URL =
  /(?<![\p{L}\p{N}.@/-])(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+\p{L}{2,24}(?:[/?#][^\s<>"'«»]*)?(?![\p{L}\p{N}@])/giu;
const BARE_IP = /(?<![\d.])\d{1,3}(?:\.\d{1,3}){3}(?::\d{1,5})?\/[^\s<>"'«»]*/gu;
const EMAIL = /[^\s<>"'«»@]+@[^\s<>"'«»@]+\.[\p{L}]{2,24}/giu;
const TRAILING = /[.,;:!?)\]}>…]+$/u;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function cleanRaw(raw: string): string {
  return raw.replace(TRAILING, '');
}

function extractHost(raw: string): string {
  let rest = raw.replace(/^https?:\/\//i, '');
  rest = rest.split(/[/?#]/)[0];
  const at = rest.lastIndexOf('@');
  if (at >= 0) {
    rest = rest.slice(at + 1);
  }
  rest = rest.replace(/:\d+$/, '');
  return rest.replace(/\.$/, '').toLowerCase();
}

export function registrableDomain(host: string, multiLevelSuffixes: string[]): string {
  if (IPV4.test(host)) {
    return host;
  }
  const labels = host.split('.').filter(Boolean);
  if (labels.length <= 2) {
    return labels.join('.');
  }
  const lastTwo = labels.slice(-2).join('.');
  if (multiLevelSuffixes.includes(lastTwo)) {
    return labels.slice(-3).join('.');
  }
  return lastTwo;
}

export function toLink(raw: string, rules: Rules): Link | null {
  const host = extractHost(raw);
  if (host === '' || !host.includes('.')) {
    return null;
  }
  const isIp = IPV4.test(host);
  const registrable = registrableDomain(host, rules.multiLevelSuffixes);
  const registrableLabels = registrable.split('.');
  const hostLabels = host.split('.');
  return {
    raw,
    host,
    registrableDomain: registrable,
    label: isIp ? host : registrableLabels[0],
    subdomain: isIp ? '' : hostLabels.slice(0, hostLabels.length - registrableLabels.length).join('.'),
    tld: isIp ? '' : hostLabels[hostLabels.length - 1],
    isIp,
  };
}

function maskMatches(text: string, pattern: RegExp, found: string[]): string {
  return text.replace(pattern, (match) => {
    found.push(match);
    return ' '.repeat(match.length);
  });
}

export function removeEmails(text: string): string {
  return text.replace(EMAIL, ' ');
}

export function extractLinks(input: string, rules: Rules): Link[] {
  const knownTlds = new Set([...rules.commonTlds, ...rules.suspiciousTlds]);
  const schemeMatches: string[] = [];
  const wwwMatches: string[] = [];
  const ipMatches: string[] = [];
  const bareMatches: string[] = [];
  let working = maskMatches(input, SCHEME_URL, schemeMatches);
  working = removeEmails(working);
  working = maskMatches(working, WWW_URL, wwwMatches);
  working = maskMatches(working, BARE_IP, ipMatches);
  maskMatches(working, BARE_URL, bareMatches);

  const links: Link[] = [];
  const seen = new Set<string>();
  const add = (raw: string, requireKnownTld: boolean) => {
    const cleaned = cleanRaw(raw);
    const link = toLink(cleaned, rules);
    if (link === null) {
      return;
    }
    if (requireKnownTld && !link.isIp && !knownTlds.has(link.tld)) {
      return;
    }
    const key = link.raw.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    links.push(link);
  };

  schemeMatches.forEach((raw) => add(raw, false));
  wwwMatches.forEach((raw) => add(raw, false));
  ipMatches.forEach((raw) => add(raw, false));
  bareMatches.forEach((raw) => add(raw, true));
  return links;
}

export function stripLinks(input: string, links: Link[]): string {
  let output = input;
  for (const link of links) {
    output = output.split(link.raw).join(' ');
  }
  return removeEmails(output);
}
