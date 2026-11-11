import {
  BodyRule,
  ExtensionState,
  HeaderRule,
  OutgoingField,
  OutgoingValueType,
  Profile,
  TokenTrace,
} from '../types/extension';

(function () {
  if ((window as unknown as { __REQFORCE_INSTALLED__?: boolean }).__REQFORCE_INSTALLED__) {
    return;
  }
  (window as unknown as { __REQFORCE_INSTALLED__?: boolean }).__REQFORCE_INSTALLED__ = true;

  let currentState: ExtensionState | null = null;
  const MAX_BODY_CHARS = 6000;

  function getActiveProfile(): Profile | null {
    if (!currentState || !currentState.globalEnabled) return null;
    return (
      currentState.profiles.find((p) => p.id === currentState?.activeProfileId) ||
      currentState.profiles[0] ||
      null
    );
  }

  function trafficMonitorOn(): boolean {
    return currentState ? currentState.trafficMonitorEnabled !== false : true;
  }

  function cap(text: unknown): string | undefined {
    if (text == null) return undefined;
    const str = typeof text === 'string' ? text : String(text);
    if (!str) return undefined;
    return str.length > MAX_BODY_CHARS
      ? `${str.slice(0, MAX_BODY_CHARS)}\n…[truncated ${str.length - MAX_BODY_CHARS} chars]`
      : str;
  }

  function expandMacros(input: string): string {
    const raw = String(input ?? '');
    if (!raw.includes('{{')) return raw;

    let out = raw;
    const profile = getActiveProfile();
    const customVars = profile?.variables;
    if (Array.isArray(customVars)) {
      for (const v of customVars) {
        const k = String(v?.key ?? '').trim();
        if (!v?.enabled || !k) continue;
        const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        out = out.replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, 'g'), String(v.value ?? ''));
      }
    }

    return out
      .replace(/\{\{\s*uuid\s*\}\}/gi, () =>
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            })
      )
      .replace(/\{\{\s*(timestamp|now)\s*\}\}/gi, () => String(Date.now()))
      .replace(/\{\{\s*isoDate\s*\}\}/gi, () => new Date().toISOString())
      .replace(/\{\{\s*randomInt\s*\}\}/gi, () =>
        String(Math.floor(100000 + Math.random() * 900000))
      )
      .replace(/\{\{\s*randomHex\s*\}\}/gi, () =>
        Math.floor(Math.random() * 0xffffffff)
          .toString(16)
          .padStart(8, '0')
      );
  }

  function detectGraphql(
    url: string,
    queryParams: Record<string, string>,
    reqBody: string | undefined
  ): {
    graphqlOp?: string;
    graphqlType?: 'query' | 'mutation' | 'subscription';
  } {
    try {
      const parseQueryText = (qText: string) => {
        const m = qText.match(
          /\b(query|mutation|subscription)\s+([A-Za-z_][A-Za-z0-9_]*)/
        );
        if (m) {
          return {
            graphqlType: m[1] as 'query' | 'mutation' | 'subscription',
            graphqlOp: m[2],
          };
        }
        const anon = qText.trim().match(/^(query|mutation|subscription)\b/);
        if (anon) {
          return {
            graphqlType: anon[1] as 'query' | 'mutation' | 'subscription',
            graphqlOp: 'anonymous',
          };
        }
        return undefined;
      };

      if (typeof reqBody === 'string' && reqBody.trim().startsWith('{')) {
        const parsed = JSON.parse(reqBody);
        if (
          parsed &&
          typeof parsed === 'object' &&
          (typeof parsed.query === 'string' ||
            typeof parsed.operationName === 'string' ||
            /graphql|gql/i.test(url))
        ) {
          const fromQuery =
            typeof parsed.query === 'string'
              ? parseQueryText(parsed.query)
              : undefined;
          const opName =
            (typeof parsed.operationName === 'string' &&
              parsed.operationName.trim()) ||
            fromQuery?.graphqlOp;
          if (opName) {
            return {
              graphqlOp: opName,
              graphqlType: fromQuery?.graphqlType || 'query',
            };
          }
        }
      } else if (typeof reqBody === 'string' && reqBody.trim().startsWith('[')) {
        const parsed = JSON.parse(reqBody);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.query) {
          const ops = parsed
            .map((item) => item?.operationName || parseQueryText(String(item?.query || ''))?.graphqlOp)
            .filter(Boolean);
          if (ops.length > 0) {
            return {
              graphqlOp: ops.slice(0, 2).join('+'),
              graphqlType: 'query',
            };
          }
        }
      }

      if (queryParams.operationName) {
        return {
          graphqlOp: String(queryParams.operationName),
          graphqlType: 'query',
        };
      }
      if (queryParams.query && /graphql|gql/i.test(url)) {
        const fromQ = parseQueryText(String(queryParams.query));
        if (fromQ) return fromQ;
      }
    } catch {
      // ignore
    }
    return {};
  }

  function tryDecodeJwt(val: unknown): Record<string, unknown> | undefined {
    if (typeof val !== 'string') return undefined;
    const clean = val.trim().replace(/^bearer\s+/i, '').trim();
    const parts = clean.split('.');
    if (parts.length !== 3 || !parts[0]?.startsWith('eyJ')) return undefined;
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        '='
      );
      const jsonStr = decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonStr);
      return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  function maskSecret(val: unknown): string {
    const v = String(val ?? '').trim();
    if (v.length <= 16) return v;
    if (/^bearer\s+/i.test(v)) {
      const tok = v.replace(/^bearer\s+/i, '');
      return `Bearer ${tok.slice(0, 10)}…${tok.slice(-4)} (${tok.length}c)`;
    }
    if (v.split('.').length === 3 && v.startsWith('eyJ')) {
      return `JWT ${v.slice(0, 10)}…${v.slice(-4)} (${v.length}c)`;
    }
    return `${v.slice(0, 10)}…${v.slice(-4)} (${v.length}c)`;
  }

  const TOKEN_KEY_RE =
    /(authorization|auth|token|jwt|bearer|api[-_]?key|access[-_]?token|refresh[-_]?token|id[-_]?token|session|csrf|xsrf|secret|signature|client[-_]?secret)/i;

  function parseDocumentCookies(): Record<string, string> {
    const out: Record<string, string> = {};
    try {
      const raw = typeof document !== 'undefined' ? document.cookie : '';
      if (!raw || typeof raw !== 'string') return out;
      for (const part of raw.split(';')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const k = trimmed.slice(0, eqIdx).trim();
          const v = trimmed.slice(eqIdx + 1).trim();
          out[k] = v;
        }
      }
    } catch {
      // ignore
    }
    return out;
  }

  function detectTokens(
    reqHeaders: Record<string, string>,
    queryParams: Record<string, string>,
    reqBody: string | undefined,
    cookies: Record<string, string>,
    credentials: string
  ): TokenTrace[] {
    const traces: TokenTrace[] = [];
    try {
      // 1. Headers
      for (const [rawK, rawV] of Object.entries(reqHeaders || {})) {
        const k = String(rawK ?? '');
        const v = String(rawV ?? '');
        if (
          TOKEN_KEY_RE.test(k) ||
          /^bearer\s+/i.test(v) ||
          (v.startsWith('eyJ') && v.split('.').length === 3)
        ) {
          traces.push({
            channel: 'header',
            key: k,
            preview: maskSecret(v),
            rawValue: v,
            jwtDecoded: tryDecodeJwt(v),
          });
        }
      }

      // 2. Query string
      for (const [rawK, rawV] of Object.entries(queryParams || {})) {
        const k = String(rawK ?? '');
        const v = String(rawV ?? '');
        if (
          TOKEN_KEY_RE.test(k) ||
          (v.startsWith('eyJ') && v.split('.').length === 3)
        ) {
          traces.push({
            channel: 'query',
            key: k,
            preview: maskSecret(v),
            rawValue: v,
            jwtDecoded: tryDecodeJwt(v),
          });
        }
      }

      // 3. Request body (JSON or form-urlencoded)
      if (typeof reqBody === 'string' && reqBody) {
        try {
          const parsed = JSON.parse(reqBody);
          const walk = (obj: unknown, prefix = '') => {
            if (!obj || typeof obj !== 'object') return;
            for (const [rawK, v] of Object.entries(obj as Record<string, unknown>)) {
              const k = String(rawK ?? '');
              const path = prefix ? `${prefix}.${k}` : k;
              if (typeof v === 'string' && v.trim()) {
                if (
                  TOKEN_KEY_RE.test(k) ||
                  /^bearer\s+/i.test(v) ||
                  (v.startsWith('eyJ') && v.split('.').length === 3)
                ) {
                  traces.push({
                    channel: 'body',
                    key: path,
                    preview: maskSecret(v),
                    rawValue: v,
                    jwtDecoded: tryDecodeJwt(v),
                  });
                }
              } else if (typeof v === 'object' && v !== null) {
                walk(v, path);
              }
            }
          };
          walk(parsed);
        } catch {
          // URLSearchParams body
          if (reqBody.includes('=')) {
            try {
              const sp = new URLSearchParams(reqBody);
              sp.forEach((rawV, rawK) => {
                const k = String(rawK ?? '');
                const v = String(rawV ?? '');
                if (TOKEN_KEY_RE.test(k) || (v.startsWith('eyJ') && v.split('.').length === 3)) {
                  traces.push({
                    channel: 'body',
                    key: k,
                    preview: maskSecret(v),
                    rawValue: v,
                    jwtDecoded: tryDecodeJwt(v),
                  });
                }
              });
            } catch {
              // ignore
            }
          }
        }
      }

      // 4. Cookies
      const cookieEntries = Object.entries(cookies || {});
      for (const [rawK, rawV] of cookieEntries) {
        const k = String(rawK ?? '');
        const v = String(rawV ?? '');
        if (TOKEN_KEY_RE.test(k) || (v.startsWith('eyJ') && v.split('.').length === 3)) {
          traces.push({
            channel: 'cookie',
            key: k,
            preview: maskSecret(v),
            rawValue: v,
            jwtDecoded: tryDecodeJwt(v),
          });
        }
      }
      if (
        credentials === 'include' &&
        !traces.some((t) => t.channel === 'cookie')
      ) {
        traces.push({
          channel: 'cookie',
          key: 'credentials: include',
          preview: cookieEntries.length
            ? `${cookieEntries.length} cookie + HttpOnly`
            : 'HttpOnly / cross-origin cookies',
        });
      }
    } catch {
      // Never throw into host page
    }

    return traces;
  }

  function extractOutgoingFields(
    queryParams: Record<string, string>,
    reqBody: string | undefined,
    reqHeaders: Record<string, string>,
    cookies: Record<string, string>
  ): OutgoingField[] {
    const fields: OutgoingField[] = [];
    try {
      // 1. Query Params
      for (const [rawK, rawV] of Object.entries(queryParams || {})) {
        fields.push({
          channel: 'query',
          key: String(rawK ?? ''),
          value: String(rawV ?? ''),
          valueType: 'string',
        });
      }

      // 2. Request Body (JSON, URLSearchParams, FormData, or Raw)
      if (typeof reqBody === 'string' && reqBody.trim()) {
        let parsedJson = false;
        try {
          const parsed = JSON.parse(reqBody);
          parsedJson = true;
          const flatten = (val: unknown, path: string, depth: number) => {
            if (fields.length > 60) return;
            if (val === null) {
              fields.push({
                channel: 'body',
                key: path || '(root)',
                value: 'null',
                valueType: 'null',
              });
              return;
            }
            if (Array.isArray(val)) {
              if (val.length === 0 || depth >= 3) {
                fields.push({
                  channel: 'body',
                  key: path || '(array)',
                  value: JSON.stringify(val),
                  valueType: 'array',
                });
              } else {
                val.slice(0, 15).forEach((item, idx) => {
                  flatten(item, `${path}[${idx}]`, depth + 1);
                });
              }
              return;
            }
            if (typeof val === 'object') {
              const entries = Object.entries(val as Record<string, unknown>);
              if (entries.length === 0 || depth >= 3) {
                fields.push({
                  channel: 'body',
                  key: path || '(object)',
                  value: JSON.stringify(val),
                  valueType: 'object',
                });
              } else {
                for (const [k, v] of entries) {
                  flatten(v, path ? `${path}.${k}` : k, depth + 1);
                }
              }
              return;
            }
            const t = typeof val;
            const vType: OutgoingValueType =
              t === 'number'
                ? 'number'
                : t === 'boolean'
                ? 'boolean'
                : 'string';
            fields.push({
              channel: 'body',
              key: path || '(value)',
              value: String(val),
              valueType: vType,
            });
          };
          flatten(parsed, '', 0);
        } catch {
          parsedJson = false;
        }

        if (!parsedJson) {
          if (reqBody.includes('=') && !reqBody.trim().startsWith('<')) {
            try {
              const sp = new URLSearchParams(reqBody);
              let added = false;
              sp.forEach((rawV, rawK) => {
                const k = String(rawK ?? '');
                const v = String(rawV ?? '');
                added = true;
                fields.push({
                  channel: 'body',
                  key: k,
                  value: v,
                  valueType: v.startsWith('[File') ? 'file' : 'string',
                });
              });
              if (!added) {
                fields.push({
                  channel: 'body',
                  key: '(raw)',
                  value: reqBody.slice(0, 500),
                  valueType: 'string',
                });
              }
            } catch {
              fields.push({
                channel: 'body',
                key: '(raw)',
                value: reqBody.slice(0, 500),
                valueType: 'string',
              });
            }
          } else {
            fields.push({
              channel: 'body',
              key: '(raw)',
              value: reqBody.slice(0, 500),
              valueType: 'string',
            });
          }
        }
      }

      // 3. Custom / Auth / Important Request Headers
      const noisyHeaders = new Set([
        'accept',
        'accept-language',
        'accept-encoding',
        'user-agent',
        'sec-ch-ua',
        'sec-ch-ua-mobile',
        'sec-ch-ua-platform',
        'sec-fetch-dest',
        'sec-fetch-mode',
        'sec-fetch-site',
        'connection',
        'cache-control',
        'pragma',
      ]);
      for (const [rawK, rawV] of Object.entries(reqHeaders || {})) {
        const k = String(rawK ?? '');
        const v = String(rawV ?? '');
        if (!noisyHeaders.has(k.toLowerCase())) {
          fields.push({
            channel: 'header',
            key: k,
            value: v,
            valueType: 'string',
          });
        }
      }

      // 4. Cookies
      for (const [rawK, rawV] of Object.entries(cookies || {})) {
        fields.push({
          channel: 'cookie',
          key: String(rawK ?? ''),
          value: String(rawV ?? ''),
          valueType: 'string',
        });
      }
    } catch {
      // Never throw into host page
    }

    return fields;
  }

  function parseUrlParts(rawUrl: string): {
    targetHost: string;
    pathname: string;
    queryParams: Record<string, string>;
  } {
    const queryParams: Record<string, string> = {};
    try {
      const u = new URL(String(rawUrl ?? ''), window.location.href);
      u.searchParams.forEach((v, k) => {
        queryParams[String(k)] = String(v ?? '');
      });
      return {
        targetHost: u.host,
        pathname: u.pathname || '/',
        queryParams,
      };
    } catch {
      return { targetHost: '', pathname: String(rawUrl ?? ''), queryParams };
    }
  }

  function headersToRecord(headers?: HeadersInit | Headers | null): Record<string, string> {
    const out: Record<string, string> = {};
    if (!headers) return out;
    try {
      const h = headers instanceof Headers ? headers : new Headers(headers);
      h.forEach((value, key) => {
        out[String(key)] = String(value ?? '');
      });
    } catch {
      // ignore
    }
    return out;
  }

  function getHeaderCaseInsensitive(
    headers: Record<string, string> | undefined,
    target: string
  ): string | undefined {
    if (!headers) return undefined;
    const lower = String(target ?? '').toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (String(k ?? '').toLowerCase() === lower) return String(v ?? '');
    }
    return undefined;
  }

  function emitLog(entry: {
    type:
      | 'TRAFFIC'
      | 'HEADER'
      | 'BODY_REQ'
      | 'BODY_RES'
      | 'TELEPRESENCE'
      | 'REDIRECT'
      | 'BLOCKED';
    transport?: 'fetch' | 'xhr' | 'beacon';
    method: string;
    url: string;
    ruleName: string;
    details: string;
    status?: number;
    durationMs?: number;
    mutated?: boolean;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    requestBody?: string;
    originalRequestBody?: string;
    responseBody?: string;
    credentials?: string;
  }) {
    try {
      const safeUrl = String(entry.url ?? '');
      const { targetHost, pathname, queryParams } = parseUrlParts(safeUrl);
      const reqHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(entry.requestHeaders || {})) {
        reqHeaders[String(k)] = String(v ?? '');
      }
      const resHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(entry.responseHeaders || {})) {
        resHeaders[String(k)] = String(v ?? '');
      }
      const creds = String(entry.credentials || 'same-origin');
      const isSameOrigin =
        !targetHost || targetHost === window.location.host;
      const cookies =
        creds === 'include' || (creds === 'same-origin' && isSameOrigin)
          ? parseDocumentCookies()
          : {};
      const safeReqBody =
        typeof entry.requestBody === 'string'
          ? entry.requestBody
          : entry.requestBody != null
          ? String(entry.requestBody)
          : undefined;
      const tokens = detectTokens(
        reqHeaders,
        queryParams,
        safeReqBody,
        cookies,
        creds
      );
      const outgoingFields = extractOutgoingFields(
        queryParams,
        safeReqBody,
        reqHeaders,
        cookies
      );
      const gql = detectGraphql(safeUrl, queryParams, safeReqBody);
      const contentType = getHeaderCaseInsensitive(reqHeaders, 'content-type');
      const responseContentType = getHeaderCaseInsensitive(
        resHeaders,
        'content-type'
      );

      window.postMessage(
        {
          source: 'DEV_MANIPULATOR_INJECTED',
          type: 'LOG_INTERCEPT',
          entry: {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: Date.now(),
            ...entry,
            url: safeUrl,
            requestHeaders: reqHeaders,
            responseHeaders: resHeaders,
            transport: entry.transport || 'fetch',
            method: String(entry.method || 'GET').toUpperCase(),
            pageUrl: window.location.href,
            pageOrigin: window.location.origin,
            targetHost,
            pathname,
            contentType,
            responseContentType,
            graphqlOp: gql.graphqlOp,
            graphqlType: gql.graphqlType,
            queryParams: Object.keys(queryParams).length ? queryParams : undefined,
            cookies: Object.keys(cookies).length ? cookies : undefined,
            outgoingFields: outgoingFields.length ? outgoingFields : undefined,
            requestBody: cap(safeReqBody),
            originalRequestBody:
              entry.originalRequestBody &&
              entry.originalRequestBody !== safeReqBody
                ? cap(entry.originalRequestBody)
                : undefined,
            responseBody: cap(entry.responseBody),
            tokens: tokens.length ? tokens : undefined,
          },
        },
        '*'
      );
    } catch {
      // Never throw into host page
    }
  }

  function matchesUrl(url: string, pattern: string, isRegex?: boolean): boolean {
    const safeUrl = String(url ?? '');
    const cleanPattern = String(pattern ?? '').trim();
    if (!cleanPattern || cleanPattern === '*' || cleanPattern === '<all_urls>') {
      return true;
    }
    if (isRegex) {
      try {
        return new RegExp(cleanPattern, 'i').test(safeUrl);
      } catch {
        return false;
      }
    }
    if (cleanPattern.includes('*')) {
      const escaped = cleanPattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      try {
        return new RegExp(escaped, 'i').test(safeUrl);
      } catch {
        return safeUrl.includes(cleanPattern.replace(/\*/g, ''));
      }
    }
    return safeUrl.toLowerCase().includes(cleanPattern.toLowerCase());
  }

  function getMatchingBlockRule(url: string): { name: string; filter: string } | null {
    const profile = getActiveProfile();
    if (!profile || !Array.isArray(profile.redirectCorsRules)) return null;
    for (const r of profile.redirectCorsRules) {
      const filter = String(r?.sourceUrlFilter ?? '').trim();
      if (!r?.enabled || r.type !== 'block' || !filter || filter === '*') continue;
      if (matchesUrl(url, filter)) {
        return { name: r.name || filter, filter };
      }
    }
    return null;
  }

  function getMatchingBodyRules(
    url: string,
    method: string,
    reqBody?: string
  ): BodyRule[] {
    const profile = getActiveProfile();
    if (!profile || !Array.isArray(profile.bodyRules)) return [];
    const upperMethod = String(method || 'GET').toUpperCase();
    const { queryParams } = parseUrlParts(url);
    const gql = detectGraphql(url, queryParams, reqBody);
    return profile.bodyRules.filter((rule) => {
      if (!rule?.enabled || !String(rule.urlPattern ?? '').trim()) return false;
      if (rule.method !== 'ALL' && rule.method !== upperMethod) return false;
      if (!matchesUrl(url, rule.urlPattern, rule.isRegex)) return false;
      const wantedOp = String(rule.graphqlOperation ?? '').trim();
      if (wantedOp) {
        if (!gql.graphqlOp) return false;
        if (gql.graphqlOp.toLowerCase() !== wantedOp.toLowerCase()) return false;
      }
      return true;
    });
  }

  function getMatchingRequestHeaders(
    url: string
  ): Array<{ name: string; value: string; op: string; label: string }> {
    const profile = getActiveProfile();
    if (!profile) return [];
    const result: Array<{ name: string; value: string; op: string; label: string }> = [];
    const blocked = new Set(['cookie', 'authorization', 'proxy-authorization']);

    const tp = profile.telepresence;
    if (tp && tp.enabled && matchesUrl(url, tp.targetDomainFilter)) {
      const interceptId = expandMacros(String(tp.interceptId ?? '').trim());
      const baggageHeader = expandMacros(String(tp.baggageHeader ?? '').trim());
      const customHeaderName = String(tp.customHeaderName ?? '').trim();
      const customHeaderValue = expandMacros(String(tp.customHeaderValue ?? '').trim());
      if (interceptId) {
        result.push({
          name: 'x-telepresence-intercept-id',
          value: interceptId,
          op: 'set',
          label: 'Telepresence Intercept ID',
        });
        if (tp.propagateBaggage) {
          const baggageVal = baggageHeader
            ? baggageHeader
            : `telepresence-intercept-id=${interceptId}`;
          result.push({
            name: 'baggage',
            value: baggageVal,
            op: 'set',
            label: 'Telepresence Baggage',
          });
        }
      } else if (baggageHeader) {
        result.push({
          name: 'baggage',
          value: baggageHeader,
          op: 'set',
          label: 'Telepresence Baggage',
        });
      }
      if (customHeaderName && customHeaderValue) {
        result.push({
          name: customHeaderName,
          value: customHeaderValue,
          op: 'set',
          label: `Context (${customHeaderName})`,
        });
      }
      if (tp.envoyForceTrace) {
        result.push({
          name: 'x-envoy-force-trace',
          value: 'true',
          op: 'set',
          label: 'Envoy Force Trace',
        });
      }
    }

    for (const hRule of (profile.headerRules || []) as HeaderRule[]) {
      const ruleName = String(hRule?.name ?? '').trim();
      if (!hRule?.enabled || hRule.target !== 'request' || !ruleName) continue;
      if (blocked.has(ruleName.toLowerCase())) continue;
      if (matchesUrl(url, hRule.urlFilter)) {
        result.push({
          name: ruleName,
          value: expandMacros(String(hRule.value ?? '')),
          op: hRule.operation,
          label: ruleName,
        });
      }
    }
    return result;
  }

  function setDeepPath(
    target: Record<string, unknown>,
    path: string,
    val: unknown
  ) {
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
    if (parts.length === 0) return;
    let cur: Record<string, unknown> = target;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (typeof cur[key] !== 'object' || cur[key] === null) {
        cur[key] = {};
      }
      cur = cur[key] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = val;
  }

  function transformBodyText(originalText: string, rule: BodyRule): string {
    const expandedRuleContent = expandMacros(rule.bodyContent);
    if (rule.mode === 'replace_request' || rule.mode === 'replace_response') {
      return expandedRuleContent;
    }
    if (rule.mode === 'merge_request_json' || rule.mode === 'merge_response_json') {
      try {
        const baseObj = originalText ? JSON.parse(originalText) : {};
        const patchObj = JSON.parse(expandedRuleContent);
        if (
          typeof baseObj === 'object' &&
          baseObj !== null &&
          !Array.isArray(baseObj) &&
          typeof patchObj === 'object' &&
          patchObj !== null
        ) {
          const clone: Record<string, unknown> = {
            ...(baseObj as Record<string, unknown>),
          };
          for (const [k, v] of Object.entries(patchObj as Record<string, unknown>)) {
            if (k.includes('.') || k.includes('[')) {
              setDeepPath(clone, k, v);
            } else {
              clone[k] = v;
            }
          }
          return JSON.stringify(clone);
        }
      } catch {
        // ignore
      }
    }
    return originalText;
  }

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  function resolveUrl(input: RequestInfo | URL): string {
    let url = '';
    if (typeof input === 'string') url = input;
    else if (input instanceof URL) url = input.toString();
    else if (input instanceof Request) url = input.url;
    try {
      return new URL(url, window.location.href).href;
    } catch {
      return url;
    }
  }

  function extractInitBodyString(body?: BodyInit | Document | null): string | undefined {
    if (body == null) return undefined;
    try {
      if (typeof body === 'string') return body;
      if (body instanceof URLSearchParams) return body.toString();
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        const parts: string[] = [];
        body.forEach((v, k) => {
          if (typeof v === 'string') {
            parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
          } else {
            const f = v as File;
            parts.push(`${encodeURIComponent(k)}=[File:${f?.name || 'blob'}(${f?.size || 0}B)]`);
          }
        });
        return parts.join('&');
      }
      if (typeof Blob !== 'undefined' && body instanceof Blob) {
        return `[Blob ${body.type || 'application/octet-stream'} (${body.size || 0}B)]`;
      }
      if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
        try {
          return new TextDecoder().decode(body as BufferSource);
        } catch {
          return `[Binary ${(body as ArrayBuffer).byteLength || 0}B]`;
        }
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  async function readResponsePreview(res: Response): Promise<string | undefined> {
    try {
      const ct = String(res.headers?.get('content-type') || '').toLowerCase();
      if (ct.includes('event-stream')) {
        return '[stream: text/event-stream]';
      }
      const cl = Number(res.headers?.get('content-length') || '0');
      if (cl > 500_000) {
        return `[large response: ${cl} bytes]`;
      }
      if (
        ct.includes('json') ||
        ct.includes('text/') ||
        ct.includes('xml') ||
        ct.includes('javascript') ||
        ct.includes('urlencoded') ||
        ct === ''
      ) {
        return await res.clone().text();
      }
      return `[${ct || 'binary'}]`;
    } catch {
      return undefined;
    }
  }

  function safeResponseStatus(code: number | undefined, fallback = 200): number {
    const n = Number(code);
    if (Number.isInteger(n) && n >= 200 && n <= 599) return n;
    return fallback >= 200 && fallback <= 599 ? fallback : 200;
  }

  function isNullBodyStatus(status: number): boolean {
    return status === 204 || status === 205 || status === 304;
  }

  // ============================================================================
  // FETCH — pass through untouched unless a body/header mutation is required
  // ============================================================================
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const t0 = performance.now();
    const fullUrl = resolveUrl(input);
    const method = String(
      init?.method ||
        (input instanceof Request ? input.method : 'GET') ||
        'GET'
    ).toUpperCase();

    let rawReqBody = extractInitBodyString(init?.body);
    if (
      !rawReqBody &&
      input instanceof Request &&
      init?.body == null &&
      method !== 'GET' &&
      method !== 'HEAD'
    ) {
      try {
        rawReqBody = await input.clone().text();
      } catch {
        rawReqBody = undefined;
      }
    }

    const initHeaders = headersToRecord(
      init?.headers || (input instanceof Request ? input.headers : undefined)
    );
    const cred = String(
      init?.credentials ||
        (input instanceof Request ? input.credentials : 'same-origin')
    );

    const profile = getActiveProfile();
    if (!profile) {
      const res = await originalFetch(input, init);
      if (trafficMonitorOn()) {
        const elapsed = Math.round(performance.now() - t0);
        void readResponsePreview(res).then((resBody) => {
          emitLog({
            type: 'TRAFFIC',
            transport: 'fetch',
            method,
            url: fullUrl,
            ruleName: 'passthrough',
            details: `HTTP ${res.status} (paused)`,
            status: res.status,
            durationMs: elapsed,
            mutated: false,
            requestHeaders: initHeaders,
            responseHeaders: headersToRecord(res.headers),
            requestBody: rawReqBody,
            responseBody: resBody,
            credentials: cred,
          });
        });
      }
      return res;
    }

    const blockRule = getMatchingBlockRule(fullUrl);
    if (blockRule) {
      emitLog({
        type: 'BLOCKED',
        transport: 'fetch',
        method,
        url: fullUrl,
        ruleName: blockRule.name,
        details: 'Blocked by ReqForce',
        status: 0,
        durationMs: 0,
        mutated: true,
        requestHeaders: initHeaders,
        requestBody: rawReqBody,
        credentials: cred,
      });
      throw new TypeError(`Blocked by ReqForce (${blockRule.filter})`);
    }

    const matchingBodyRules = getMatchingBodyRules(fullUrl, method, rawReqBody);
    const reqRules = matchingBodyRules.filter(
      (r) => r.mode === 'replace_request' || r.mode === 'merge_request_json'
    );
    const resRules = matchingBodyRules.filter(
      (r) => r.mode === 'replace_response' || r.mode === 'merge_response_json'
    );
    const matchingHeaders = getMatchingRequestHeaders(fullUrl);
    const shouldMutate = matchingHeaders.length > 0 || matchingBodyRules.length > 0;

    if (!shouldMutate) {
      const res = await originalFetch(input, init);
      if (trafficMonitorOn()) {
        const elapsed = Math.round(performance.now() - t0);
        void readResponsePreview(res).then((resBody) => {
          emitLog({
            type: 'TRAFFIC',
            transport: 'fetch',
            method,
            url: fullUrl,
            ruleName: '—',
            details: `HTTP ${res.status}`,
            status: res.status,
            durationMs: elapsed,
            mutated: false,
            requestHeaders: initHeaders,
            responseHeaders: headersToRecord(res.headers),
            requestBody: rawReqBody,
            responseBody: resBody,
            credentials: cred,
          });
        });
      }
      return res;
    }

    const baseInit: RequestInit = { ...(init || {}) };
    if (input instanceof Request) {
      if (baseInit.credentials === undefined) baseInit.credentials = input.credentials;
      if (baseInit.mode === undefined) baseInit.mode = input.mode;
      if (baseInit.cache === undefined) baseInit.cache = input.cache;
      if (baseInit.redirect === undefined) baseInit.redirect = input.redirect;
      if (baseInit.referrer === undefined) baseInit.referrer = input.referrer;
      if (baseInit.integrity === undefined) baseInit.integrity = input.integrity;
      if (baseInit.keepalive === undefined) baseInit.keepalive = input.keepalive;
      if (baseInit.signal === undefined) baseInit.signal = input.signal;
      if (baseInit.method === undefined) baseInit.method = input.method;
      if (
        baseInit.body === undefined &&
        rawReqBody !== undefined &&
        method !== 'GET' &&
        method !== 'HEAD'
      ) {
        baseInit.body = rawReqBody;
      }
    }

    if (matchingHeaders.length > 0) {
      const headers = new Headers(
        init?.headers || (input instanceof Request ? input.headers : undefined)
      );
      for (const h of matchingHeaders) {
        try {
          if (h.op === 'remove') headers.delete(h.name);
          else if (h.op === 'append') headers.append(h.name, h.value);
          else headers.set(h.name, h.value);
        } catch {
          // Ignore invalid header name/value so fetch never crashes
        }
      }
      baseInit.headers = headers;
    }

    let sentBodyText = rawReqBody;
    if (reqRules.length > 0) {
      let bodyText = rawReqBody || '';
      for (const rule of reqRules) {
        if (rule.delayMs && rule.delayMs > 0) await sleep(rule.delayMs);
        bodyText = transformBodyText(bodyText, rule);
      }
      baseInit.body = bodyText;
      sentBodyText = bodyText;
    }

    const finalReqHeaders = headersToRecord(baseInit.headers || initHeaders);

    const fullReplaceRule = resRules.find((r) => r.mode === 'replace_response');
    if (fullReplaceRule) {
      if (fullReplaceRule.delayMs && fullReplaceRule.delayMs > 0) {
        await sleep(fullReplaceRule.delayMs);
      }
      const status = safeResponseStatus(fullReplaceRule.statusCode, 200);
      const mockedBody = expandMacros(fullReplaceRule.bodyContent);
      emitLog({
        type: 'BODY_RES',
        transport: 'fetch',
        method,
        url: fullUrl,
        ruleName: fullReplaceRule.name || fullReplaceRule.urlPattern,
        details: `Mocked response (${status})`,
        status,
        durationMs: Math.round(performance.now() - t0),
        mutated: true,
        requestHeaders: finalReqHeaders,
        requestBody: sentBodyText,
        originalRequestBody: rawReqBody,
        responseBody: mockedBody,
        credentials: cred,
      });
      return new Response(isNullBodyStatus(status) ? null : mockedBody, {
        status,
        headers: {
          'Content-Type': fullReplaceRule.contentType || 'application/json',
          'X-Manipulated-By': 'ReqForce',
        },
      });
    }

    const fetchTarget =
      typeof input === 'string' || input instanceof URL ? input : fullUrl;
    const response = await originalFetch(fetchTarget, baseInit);

    const mergeResRules = resRules.filter((r) => r.mode === 'merge_response_json');
    if (mergeResRules.length > 0) {
      try {
        let resText = await response.clone().text();
        let finalStatus = safeResponseStatus(response.status, 200);
        for (const rule of mergeResRules) {
          if (rule.delayMs && rule.delayMs > 0) await sleep(rule.delayMs);
          resText = transformBodyText(resText, rule);
          if (rule.statusCode) {
            finalStatus = safeResponseStatus(rule.statusCode, finalStatus);
          }
        }
        emitLog({
          type: 'BODY_RES',
          transport: 'fetch',
          method,
          url: fullUrl,
          ruleName: mergeResRules.map((r) => r.name || r.urlPattern).join(', '),
          details: `Merged response JSON (${finalStatus})`,
          status: finalStatus,
          durationMs: Math.round(performance.now() - t0),
          mutated: true,
          requestHeaders: finalReqHeaders,
          responseHeaders: headersToRecord(response.headers),
          requestBody: sentBodyText,
          originalRequestBody: rawReqBody,
          responseBody: resText,
          credentials: cred,
        });
        const resHeaders = new Headers(response.headers);
        resHeaders.set('X-Manipulated-By', 'ReqForce');
        return new Response(isNullBodyStatus(finalStatus) ? null : resText, {
          status: finalStatus,
          statusText: response.statusText,
          headers: resHeaders,
        });
      } catch {
        return response;
      }
    }

    if (trafficMonitorOn() || matchingHeaders.length > 0 || reqRules.length > 0) {
      const elapsed = Math.round(performance.now() - t0);
      void readResponsePreview(response).then((resBody) => {
        emitLog({
          type: reqRules.length > 0 ? 'BODY_REQ' : matchingHeaders.length > 0 ? 'HEADER' : 'TRAFFIC',
          transport: 'fetch',
          method,
          url: fullUrl,
          ruleName:
            [...reqRules.map((r) => r.name || r.urlPattern), ...matchingHeaders.map((h) => h.label)].join(', ') || '—',
          details: `HTTP ${response.status}`,
          status: response.status,
          durationMs: elapsed,
          mutated: true,
          requestHeaders: finalReqHeaders,
          responseHeaders: headersToRecord(response.headers),
          requestBody: sentBodyText,
          originalRequestBody: rawReqBody,
          responseBody: resBody,
          credentials: cred,
        });
      });
    }

    return response;
  };

  // ============================================================================
  // XHR — capture headers, body, response & token locations
  // ============================================================================
  const OriginalXHR = window.XMLHttpRequest;

  class ManipulatedXHR extends OriginalXHR {
    private _url = '';
    private _method = 'GET';
    private _reqHeaders: Record<string, string> = {};
    private _t0 = 0;
    private _resRules: BodyRule[] = [];
    private _rawBody: string | undefined = undefined;
    private _sentText: string | undefined = undefined;
    private _credMode = 'same-origin';

    constructor() {
      super();
      // Register as the very first listener so response overrides happen BEFORE page onload/onreadystatechange callbacks
      this.addEventListener('readystatechange', () => {
        if (this.readyState !== 4 || this._resRules.length === 0) return;
        try {
          let currentText = '';
          try {
            if (!this.responseType || this.responseType === 'text') {
              currentText = typeof super.responseText === 'string' ? super.responseText : '';
            } else if (this.responseType === 'json' && super.response != null) {
              currentText = JSON.stringify(super.response);
            }
          } catch {
            currentText = '';
          }
          let modifiedText = currentText;
          let customStatus = super.status || 200;
          for (const rule of this._resRules) {
            modifiedText = transformBodyText(modifiedText, rule);
            if (rule.statusCode) {
              customStatus = safeResponseStatus(rule.statusCode, customStatus);
            }
          }
          Object.defineProperty(this, 'responseText', {
            configurable: true,
            get: () => modifiedText,
          });
          Object.defineProperty(this, 'response', {
            configurable: true,
            get: () => {
              if (this.responseType === 'json') {
                try {
                  return JSON.parse(modifiedText);
                } catch {
                  return modifiedText;
                }
              }
              return modifiedText;
            },
          });
          Object.defineProperty(this, 'status', {
            configurable: true,
            get: () => customStatus,
          });
          emitLog({
            type: 'BODY_RES',
            transport: 'xhr',
            method: this._method,
            url: this._url,
            ruleName: this._resRules.map((r) => r.name || r.urlPattern).join(', '),
            details: `XHR response modified (${customStatus})`,
            status: customStatus,
            durationMs: Math.round(performance.now() - this._t0),
            mutated: true,
            requestHeaders: this._reqHeaders,
            responseHeaders: this._parseResHeaders(),
            requestBody: this._sentText,
            originalRequestBody: this._rawBody,
            responseBody: modifiedText,
            credentials: this._credMode,
          });
        } catch {
          // ignore
        }
      });
    }

    open(
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ): void {
      this._method = String(method || 'GET').toUpperCase();
      this._reqHeaders = {};
      this._resRules = [];
      try {
        this._url = new URL(String(url ?? ''), window.location.href).href;
      } catch {
        this._url = String(url ?? '');
      }
      if (arguments.length <= 2) {
        super.open(method, url);
      } else {
        super.open(method, url, async, username, password);
      }
    }

    setRequestHeader(name: string, value: string): void {
      try {
        this._reqHeaders[String(name ?? '')] = String(value ?? '');
      } catch {
        // ignore
      }
      super.setRequestHeader(name, value);
    }

    private _parseResHeaders(): Record<string, string> {
      const out: Record<string, string> = {};
      try {
        const raw = this.getAllResponseHeaders() || '';
        for (const line of raw.trim().split(/[\r\n]+/)) {
          const idx = line.indexOf(':');
          if (idx > 0) {
            out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
          }
        }
      } catch {
        // ignore
      }
      return out;
    }

    private _safeResText(): string | undefined {
      try {
        if (!this.responseType || this.responseType === 'text') {
          return this.responseText;
        }
        if (this.responseType === 'json' && this.response != null) {
          return JSON.stringify(this.response);
        }
      } catch {
        // ignore
      }
      return undefined;
    }

    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      this._t0 = performance.now();
      const rawBody = extractInitBodyString(body as BodyInit | Document | null);
      const credMode = this.withCredentials ? 'include' : 'same-origin';
      this._rawBody = rawBody;
      this._sentText = rawBody;
      this._credMode = credMode;
      const profile = getActiveProfile();

      if (!profile) {
        if (trafficMonitorOn()) {
          this.addEventListener('loadend', () => {
            emitLog({
              type: 'TRAFFIC',
              transport: 'xhr',
              method: this._method,
              url: this._url,
              ruleName: 'passthrough',
              details: `HTTP ${this.status} (paused)`,
              status: this.status,
              durationMs: Math.round(performance.now() - this._t0),
              mutated: false,
              requestHeaders: this._reqHeaders,
              responseHeaders: this._parseResHeaders(),
              requestBody: rawBody,
              responseBody: this._safeResText(),
              credentials: credMode,
            });
          });
        }
        return super.send(body);
      }

      const blockRule = getMatchingBlockRule(this._url);
      if (blockRule) {
        emitLog({
          type: 'BLOCKED',
          transport: 'xhr',
          method: this._method,
          url: this._url,
          ruleName: blockRule.name,
          details: 'Blocked by ReqForce',
          status: 0,
          durationMs: 0,
          mutated: true,
          requestHeaders: this._reqHeaders,
          requestBody: rawBody,
          credentials: credMode,
        });
        try {
          this.abort();
        } catch {
          // ignore
        }
        return;
      }

      const matchingBodyRules = getMatchingBodyRules(this._url, this._method, rawBody);
      const matchingHeaders = getMatchingRequestHeaders(this._url);
      const shouldMutate = matchingHeaders.length > 0 || matchingBodyRules.length > 0;

      if (!shouldMutate) {
        if (trafficMonitorOn()) {
          this.addEventListener('loadend', () => {
            emitLog({
              type: 'TRAFFIC',
              transport: 'xhr',
              method: this._method,
              url: this._url,
              ruleName: '—',
              details: `HTTP ${this.status}`,
              status: this.status,
              durationMs: Math.round(performance.now() - this._t0),
              mutated: false,
              requestHeaders: this._reqHeaders,
              responseHeaders: this._parseResHeaders(),
              requestBody: rawBody,
              responseBody: this._safeResText(),
              credentials: credMode,
            });
          });
        }
        return super.send(body);
      }

      for (const h of matchingHeaders) {
        if (h.op !== 'remove') {
          try {
            this.setRequestHeader(h.name, h.value);
          } catch {
            // restricted header
          }
        }
      }

      let outgoingBody = body;
      let sentText = rawBody;
      const reqRules = matchingBodyRules.filter(
        (r) => r.mode === 'replace_request' || r.mode === 'merge_request_json'
      );
      if (reqRules.length > 0 && (typeof body === 'string' || body == null)) {
        let textBody = typeof body === 'string' ? body : '';
        for (const rule of reqRules) {
          textBody = transformBodyText(textBody, rule);
        }
        outgoingBody = textBody;
        sentText = textBody;
      }
      this._sentText = sentText;

      const resRules = matchingBodyRules.filter(
        (r) => r.mode === 'replace_response' || r.mode === 'merge_response_json'
      );
      this._resRules = resRules;

      if (resRules.length === 0 && (trafficMonitorOn() || matchingHeaders.length > 0 || reqRules.length > 0)) {
        this.addEventListener('loadend', () => {
          emitLog({
            type: reqRules.length > 0 ? 'BODY_REQ' : matchingHeaders.length > 0 ? 'HEADER' : 'TRAFFIC',
            transport: 'xhr',
            method: this._method,
            url: this._url,
            ruleName:
              [...reqRules.map((r) => r.name || r.urlPattern), ...matchingHeaders.map((h) => h.label)].join(', ') || '—',
            details: `HTTP ${this.status}`,
            status: this.status,
            durationMs: Math.round(performance.now() - this._t0),
            mutated: true,
            requestHeaders: this._reqHeaders,
            responseHeaders: this._parseResHeaders(),
            requestBody: sentText,
            originalRequestBody: rawBody,
            responseBody: this._safeResText(),
            credentials: credMode,
          });
        });
      }

      return super.send(outgoingBody);
    }
  }

  window.XMLHttpRequest = ManipulatedXHR;

  // ============================================================================
  // BEACON — capture navigator.sendBeacon outgoing payloads
  // ============================================================================
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url: string | URL, data?: BodyInit | null): boolean {
      const fullUrl = resolveUrl(url);
      const rawBody = extractInitBodyString(data);
      const blockRule = getMatchingBlockRule(fullUrl);
      if (blockRule) {
        emitLog({
          type: 'BLOCKED',
          transport: 'beacon',
          method: 'POST',
          url: fullUrl,
          ruleName: blockRule.name,
          details: 'Blocked by ReqForce',
          status: 0,
          durationMs: 0,
          mutated: true,
          requestBody: rawBody,
          credentials: 'include',
        });
        return false;
      }
      const ok = origBeacon(url, data);
      if (trafficMonitorOn()) {
        emitLog({
          type: 'TRAFFIC',
          transport: 'beacon',
          method: 'POST',
          url: fullUrl,
          ruleName: 'beacon',
          details: ok ? 'Beacon queued' : 'Beacon rejected',
          status: ok ? 204 : 0,
          durationMs: 0,
          mutated: false,
          requestBody: rawBody,
          credentials: 'include',
        });
      }
      return ok;
    };
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (data && data.source === 'DEV_MANIPULATOR_CONTENT' && data.type === 'UPDATE_RULES') {
      currentState = data.state;
    }
  });

  window.postMessage(
    {
      source: 'DEV_MANIPULATOR_INJECTED',
      type: 'INJECTED_READY',
    },
    '*'
  );
})();
