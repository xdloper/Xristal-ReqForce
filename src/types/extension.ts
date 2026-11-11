export type HeaderOperation = 'set' | 'append' | 'remove';
export type HeaderTarget = 'request' | 'response';

export interface HeaderRule {
  id: string;
  enabled: boolean;
  name: string;
  value: string;
  operation: HeaderOperation;
  target: HeaderTarget;
  urlFilter: string; // e.g., "*" or "*://*.example.com/*" or "api.mysite.com"
  comment?: string;
  isTelepresence?: boolean;
}

export type BodyRuleMode =
  | 'replace_response'    // Mock / replace entire response body
  | 'merge_response_json' // Merge JSON fields into real response body
  | 'replace_request'     // Replace entire outgoing request body
  | 'merge_request_json'; // Merge JSON fields into outgoing request body

export interface BodyRule {
  id: string;
  enabled: boolean;
  name: string;
  urlPattern: string; // Substring or Regex string
  isRegex?: boolean;
  method: 'ALL' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  mode: BodyRuleMode;
  statusCode?: number; // For response mocking (e.g. 200, 400, 500)
  delayMs?: number;    // Simulate network latency
  bodyContent: string; // JSON or plain text
  contentType?: string;
}

export interface RedirectCorsRule {
  id: string;
  enabled: boolean;
  name: string;
  type: 'redirect' | 'cors_bypass';
  sourceUrlFilter: string; // e.g. ||api.prod.com/v1/* or *://api.prod.com/*
  destinationUrl?: string; // For redirect: e.g. http://localhost:8080/v1/\1
}

export interface TelepresenceConfig {
  enabled: boolean;
  interceptId: string;        // x-telepresence-intercept-id
  baggageHeader: string;      // baggage: telepresence-intercept-id=...
  customHeaderName: string;   // e.g. x-dev-session or x-intercept-user
  customHeaderValue: string;
  targetDomainFilter: string; // e.g. * or *.mycompany.com
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
  type: 'HEADER' | 'BODY_REQ' | 'BODY_RES' | 'TELEPRESENCE' | 'REDIRECT';
  method: string;
  url: string;
  ruleName: string;
  details: string;
}

export interface ExtensionState {
  globalEnabled: boolean;
  activeProfileId: string;
  profiles: Profile[];
  logs: InterceptLogEntry[];
}
