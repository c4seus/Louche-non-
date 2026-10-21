export type Verdict = 'scam' | 'suspicious' | 'clean';

export type Severity = 'high' | 'medium' | 'low' | 'info';

export type FindingCode =
  | 'brandImpersonation'
  | 'brandInSubdomain'
  | 'typosquat'
  | 'lookalikeTld'
  | 'nonAsciiDomain'
  | 'punycode'
  | 'ipAddress'
  | 'shortener'
  | 'suspiciousTld'
  | 'brandLinkMismatch'
  | 'scenario'
  | 'pressure'
  | 'sensitiveRequest'
  | 'paymentRequest'
  | 'giftCard'
  | 'moneyRequest'
  | 'officialLinks';

export interface Finding {
  code: FindingCode;
  points: number;
  severity: Severity;
  host?: string;
  registrableDomain?: string;
  tld?: string;
  brandId?: string;
  officialDomain?: string;
  scenarioId?: string;
}

export interface Link {
  raw: string;
  host: string;
  registrableDomain: string;
  label: string;
  subdomain: string;
  tld: string;
  isIp: boolean;
}

export interface AnalysisResult {
  verdict: Verdict;
  score: number;
  findings: Finding[];
  links: Link[];
}

export interface Brand {
  id: string;
  label: string;
  names: string[];
  tokens: string[];
  domains: string[];
}

export interface Scenario {
  id: string;
  label: string;
  weight: number;
  anchors: string[];
  keywords: string[];
  minMatches: number;
}

export interface Rules {
  version: number;
  updated: string;
  brands: Brand[];
  trustedDomains: string[];
  multiLevelSuffixes: string[];
  shorteners: string[];
  suspiciousTlds: string[];
  commonTlds: string[];
  scenarios: Scenario[];
  pressure: string[];
  sensitive: string[];
  payment: string[];
  giftCards: string[];
  moneyRequest: string[];
}
