export type HeaderOperation = 'set' | 'append' | 'remove';
export type HeaderTarget = 'request' | 'response';

export interface HeaderRule {
  id: string;
  enabled: boolean;
  name: string;
  value: string;
  operation: HeaderOperation;
  target: HeaderTarget;
  urlFilter: string;
  comment?: string;
  isTelepresence?: boolean;
}

export type BodyRuleMode =
  | 'replace_response'
  | 'merge_response_json'
  | 'replace_request'
  | 'merge_request_json';

export interface BodyRule {
  id: string;
  enabled: boolean;
  name: string;
  urlPattern: string;
  isRegex?: boolean;
  method: 'ALL' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  mode: BodyRuleMode;
  statusCode?: number;
  delayMs?: number;
  bodyContent: string;
  contentType?: string;
}

export interface RedirectCorsRule {
  id: string;
  enabled: boolean;
  name: string;
  type: 'redirect' | 'cors_bypass' | 'query_param';
  sourceUrlFilter: string;
  destinationUrl?: string;
  queryKey?: string;
  queryValue?: string;
}

export interface TelepresenceConfig {
  enabled: boolean;
  interceptId: string;
  baggageHeader: string;
  customHeaderName: string;
  customHeaderValue: string;
  targetDomainFilter: string;
  propagateBaggage: boolean;
  envoyForceTrace: boolean;
}

export interface Profile {
  id: string;
  name: string;
  color: string;
  telepresence: TelepresenceConfig;
  headerRules: HeaderRule[];
  bodyRules: BodyRule[];
  redirectCorsRules: RedirectCorsRule[];
}

export interface InterceptLogEntry {
  id: string;
  timestamp: number;
  type: 'TRAFFIC' | 'HEADER' | 'BODY_REQ' | 'BODY_RES' | 'TELEPRESENCE' | 'REDIRECT';
  method: string;
  url: string;
  ruleName: string;
  details: string;
  status?: number;
  mutated?: boolean;
  requestHeaders?: Record<string, string>;
  credentials?: string;
}

export type LocalePreference = 'system' | 'en' | 'tr';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface ExtensionState {
  globalEnabled: boolean;
  trafficMonitorEnabled: boolean;
  /** `system` follows browser/OS language (tr → Turkish, else English). Default: system. */
  locale: LocalePreference;
  /** `system` follows OS color scheme. Default: system. */
  theme: ThemePreference;
  activeProfileId: string;
  profiles: Profile[];
  logs: InterceptLogEntry[];
}
