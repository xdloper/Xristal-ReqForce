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

  function cap(text: string | undefined): string | undefined {
    if (!text) return undefined;
    return text.length > MAX_BODY_CHARS
      ? `${text.slice(0, MAX_BODY_CHARS)}\n…[truncated ${text.length - MAX_BODY_CHARS} chars]`
      : text;
  }

  function tryDecodeJwt(val: string): Record<string, unknown> | undefined {
    const clean = val.trim().replace(/^bearer\s+/i, '').trim();
    const parts = clean.split('.');
    if (parts.length !== 3 || !parts[0].startsWith('eyJ')) return undefined;
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

  function maskSecret(val: string): string {
    const v = val.trim();
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
      if (!raw) return out;
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

    // 1. Headers
    for (const [k, v] of Object.entries(reqHeaders)) {
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
    for (const [k, v] of Object.entries(queryParams)) {
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
    if (reqBody) {
      try {
        const parsed = JSON.parse(reqBody);
        const walk = (obj: unknown, prefix = '') => {
          if (!obj || typeof obj !== 'object') return;
          for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
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
            sp.forEach((v, k) => {
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
    const cookieEntries = Object.entries(cookies);
    for (const [k, v] of cookieEntries) {
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

    return traces;
  }

  function extractOutgoingFields(
    queryParams: Record<string, string>,
    reqBody: string | undefined,
    reqHeaders: Record<string, string>,
    cookies: Record<string, string>
  ): OutgoingField[] {
    const fields: OutgoingField[] = [];

    // 1. Query Params
    for (const [k, v] of Object.entries(queryParams)) {
      fields.push({
        channel: 'query',
        key: k,
        value: v,
        valueType: 'string',
      });
    }

    // 2. Request Body (JSON, URLSearchParams, FormData, or Raw)
    if (reqBody && reqBody.trim()) {
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
            sp.forEach((v, k) => {
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
    for (const [k, v] of Object.entries(reqHeaders)) {
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
    for (const [k, v] of Object.entries(cookies)) {
      fields.push({
        channel: 'cookie',
        key: k,
        value: v,
        valueType: 'string',
      });
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
      const u = new URL(rawUrl, window.location.href);
      u.searchParams.forEach((v, k) => {
        queryParams[k] = v;
      });
      return {
        targetHost: u.host,
        pathname: u.pathname || '/',
        queryParams,
      };
    } catch {
      return { targetHost: '', pathname: rawUrl, queryParams };
    }
  }

  function headersToRecord(headers?: HeadersInit | Headers | null): Record<string, string> {
    const out: Record<string, string> = {};
    if (!headers) return out;
    try {
      const h = headers instanceof Headers ? headers : new Headers(headers);
      h.forEach((value, key) => {
        out[key] = value;
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
    const lower = target.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === lower) return v;
    }
    return undefined;
  }

  function emitLog(entry: {
    type: 'TRAFFIC' | 'HEADER' | 'BODY_REQ' | 'BODY_RES' | 'TELEPRESENCE' | 'REDIRECT';
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
    const { targetHost, pathname, queryParams } = parseUrlParts(entry.url);
    const reqHeaders = entry.requestHeaders || {};
    const resHeaders = entry.responseHeaders || {};
    const creds = entry.credentials || 'same-origin';
    const isSameOrigin =
      !targetHost || targetHost === window.location.host;
    const cookies =
      creds === 'include' || (creds === 'same-origin' && isSameOrigin)
        ? parseDocumentCookies()
        : {};
    const tokens = detectTokens(
      reqHeaders,
      queryParams,
      entry.requestBody,
      cookies,
      creds
    );
    const outgoingFields = extractOutgoingFields(
      queryParams,
      entry.requestBody,
      reqHeaders,
      cookies
    );
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
          transport: entry.transport || 'fetch',
          method: (entry.method || 'GET').toUpperCase(),
          pageUrl: window.location.href,
          pageOrigin: window.location.origin,
          targetHost,
          pathname,
          contentType,
          responseContentType,
          queryParams: Object.keys(queryParams).length ? queryParams : undefined,
          cookies: Object.keys(cookies).length ? cookies : undefined,
          outgoingFields: outgoingFields.length ? outgoingFields : undefined,
          requestBody: cap(entry.requestBody),
          originalRequestBody:
            entry.originalRequestBody &&
            entry.originalRequestBody !== entry.requestBody
              ? cap(entry.originalRequestBody)
              : undefined,
          responseBody: cap(entry.responseBody),
          tokens: tokens.length ? tokens : undefined,
        },
      },
      '*'
    );
  }

  function matchesUrl(url: string, pattern: string, isRegex?: boolean): boolean {
    const cleanPattern = (pattern || '').trim();
    if (!cleanPattern || cleanPattern === '*' || cleanPattern === '<all_urls>') {
      return true;
    }
    if (isRegex) {
      try {
        return new RegExp(cleanPattern, 'i').test(url);
      } catch {
        return false;
      }
    }
    if (cleanPattern.includes('*')) {
      const escaped = cleanPattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      try {
        return new RegExp(escaped, 'i').test(url);
      } catch {
        return url.includes(cleanPattern.replace(/\*/g, ''));
      }
    }
    return url.toLowerCase().includes(cleanPattern.toLowerCase());
  }

  function getMatchingBodyRules(url: string, method: string): BodyRule[] {
    const profile = getActiveProfile();
    if (!profile) return [];
    const upperMethod = (method || 'GET').toUpperCase();
    return profile.bodyRules.filter((rule) => {
      if (!rule.enabled || !rule.urlPattern.trim()) return false;
      if (rule.method !== 'ALL' && rule.method !== upperMethod) return false;
      return matchesUrl(url, rule.urlPattern, rule.isRegex);
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
      if (tp.interceptId.trim()) {
        result.push({
          name: 'x-telepresence-intercept-id',
          value: tp.interceptId.trim(),
          op: 'set',
          label: 'Telepresence Intercept ID',
        });
        if (tp.propagateBaggage) {
          const baggageVal = tp.baggageHeader.trim()
            ? tp.baggageHeader.trim()
            : `telepresence-intercept-id=${tp.interceptId.trim()}`;
          result.push({
            name: 'baggage',
            value: baggageVal,
            op: 'set',
            label: 'Telepresence Baggage',
          });
        }
      } else if (tp.baggageHeader.trim()) {
        result.push({
          name: 'baggage',
          value: tp.baggageHeader.trim(),
          op: 'set',
          label: 'Telepresence Baggage',
        });
      }
      if (tp.customHeaderName.trim() && tp.customHeaderValue.trim()) {
        result.push({
          name: tp.customHeaderName.trim(),
          value: tp.customHeaderValue.trim(),
          op: 'set',
          label: `Context (${tp.customHeaderName.trim()})`,
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

    for (const hRule of profile.headerRules as HeaderRule[]) {
      if (!hRule.enabled || hRule.target !== 'request' || !hRule.name.trim()) continue;
      if (blocked.has(hRule.name.trim().toLowerCase())) continue;
      if (matchesUrl(url, hRule.urlFilter)) {
        result.push({
          name: hRule.name.trim(),
          value: hRule.value,
          op: hRule.operation,
          label: hRule.name.trim(),
        });
      }
    }
    return result;
  }

  function transformBodyText(originalText: string, rule: BodyRule): string {
    if (rule.mode === 'replace_request' || rule.mode === 'replace_response') {
      return rule.bodyContent;
    }
    if (rule.mode === 'merge_request_json' || rule.mode === 'merge_response_json') {
      try {
        const baseObj = originalText ? JSON.parse(originalText) : {};
        const patchObj = JSON.parse(rule.bodyContent);
        if (
          typeof baseObj === 'object' &&
          baseObj !== null &&
          !Array.isArray(baseObj) &&
          typeof patchObj === 'object' &&
          patchObj !== null
        ) {
          return JSON.stringify({ ...baseObj, ...patchObj });
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
    if (!body) return undefined;
    if (typeof body === 'string') return body;
    if (body instanceof URLSearchParams) return body.toString();
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      const parts: string[] = [];
      body.forEach((v, k) => {
        if (typeof v === 'string') {
          parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
        } else {
          const f = v as File;
          parts.push(`${encodeURIComponent(k)}=[File:${f.name || 'blob'}(${f.size || 0}B)]`);
        }
      });
      return parts.join('&');
    }
    if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
      try {
        return new TextDecoder().decode(body as BufferSource);
      } catch {
        return `[Binary ${(body as ArrayBuffer).byteLength || 0}B]`;
      }
    }
    return undefined;
  }

  async function readResponsePreview(res: Response): Promise<string | undefined> {
    try {
      const ct = (res.headers.get('content-type') || '').toLowerCase();
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
    const method = (
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
        const resBody = await readResponsePreview(res);
        emitLog({
          type: 'TRAFFIC',
          transport: 'fetch',
          method,
          url: fullUrl,
          ruleName: 'passthrough',
          details: `HTTP ${res.status} (paused)`,
          status: res.status,
          durationMs: Math.round(performance.now() - t0),
          mutated: false,
          requestHeaders: initHeaders,
          responseHeaders: headersToRecord(res.headers),
          requestBody: rawReqBody,
          responseBody: resBody,
          credentials: cred,
        });
      }
      return res;
    }

    const matchingBodyRules = getMatchingBodyRules(fullUrl, method);
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
        const resBody = await readResponsePreview(res);
        emitLog({
          type: 'TRAFFIC',
          transport: 'fetch',
          method,
          url: fullUrl,
          ruleName: '—',
          details: `HTTP ${res.status}`,
          status: res.status,
          durationMs: Math.round(performance.now() - t0),
          mutated: false,
          requestHeaders: initHeaders,
          responseHeaders: headersToRecord(res.headers),
          requestBody: rawReqBody,
          responseBody: resBody,
          credentials: cred,
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
    }

    if (matchingHeaders.length > 0) {
      const headers = new Headers(
        init?.headers || (input instanceof Request ? input.headers : undefined)
      );
      for (const h of matchingHeaders) {
        if (h.op === 'remove') headers.delete(h.name);
        else if (h.op === 'append') headers.append(h.name, h.value);
        else headers.set(h.name, h.value);
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
      const status = fullReplaceRule.statusCode || 200;
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
        responseBody: fullReplaceRule.bodyContent,
        credentials: cred,
      });
      return new Response(fullReplaceRule.bodyContent, {
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
        let finalStatus = response.status;
        for (const rule of mergeResRules) {
          if (rule.delayMs && rule.delayMs > 0) await sleep(rule.delayMs);
          resText = transformBodyText(resText, rule);
          if (rule.statusCode) finalStatus = rule.statusCode;
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
        return new Response(resText, {
          status: finalStatus,
          statusText: response.statusText,
          headers: resHeaders,
        });
      } catch {
        return response;
      }
    }

    if (trafficMonitorOn() || matchingHeaders.length > 0 || reqRules.length > 0) {
      const resBody = await readResponsePreview(response);
      emitLog({
        type: reqRules.length > 0 ? 'BODY_REQ' : matchingHeaders.length > 0 ? 'HEADER' : 'TRAFFIC',
        transport: 'fetch',
        method,
        url: fullUrl,
        ruleName:
          [...reqRules.map((r) => r.name || r.urlPattern), ...matchingHeaders.map((h) => h.label)].join(', ') || '—',
        details: `HTTP ${response.status}`,
        status: response.status,
        durationMs: Math.round(performance.now() - t0),
        mutated: true,
        requestHeaders: finalReqHeaders,
        responseHeaders: headersToRecord(response.headers),
        requestBody: sentBodyText,
        originalRequestBody: rawReqBody,
        responseBody: resBody,
        credentials: cred,
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

    open(
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ): void {
      this._method = (method || 'GET').toUpperCase();
      this._reqHeaders = {};
      try {
        this._url = new URL(String(url), window.location.href).href;
      } catch {
        this._url = String(url);
      }
      super.open(method, url, async, username, password);
    }

    setRequestHeader(name: string, value: string): void {
      this._reqHeaders[name] = value;
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

      const matchingBodyRules = getMatchingBodyRules(this._url, this._method);
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

      const resRules = matchingBodyRules.filter(
        (r) => r.mode === 'replace_response' || r.mode === 'merge_response_json'
      );
      if (resRules.length > 0) {
        this.addEventListener('readystatechange', () => {
          if (this.readyState !== 4) return;
          try {
            let currentText = '';
            try {
              currentText = typeof super.responseText === 'string' ? super.responseText : '';
            } catch {
              currentText = '';
            }
            let modifiedText = currentText;
            let customStatus = super.status;
            for (const rule of resRules) {
              modifiedText = transformBodyText(modifiedText, rule);
              if (rule.statusCode) customStatus = rule.statusCode;
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
              ruleName: resRules.map((r) => r.name || r.urlPattern).join(', '),
              details: `XHR response modified (${customStatus})`,
              status: customStatus,
              durationMs: Math.round(performance.now() - this._t0),
              mutated: true,
              requestHeaders: this._reqHeaders,
              responseHeaders: this._parseResHeaders(),
              requestBody: sentText,
              originalRequestBody: rawBody,
              responseBody: modifiedText,
              credentials: credMode,
            });
          } catch {
            // ignore
          }
        });
      } else if (trafficMonitorOn() || matchingHeaders.length > 0 || reqRules.length > 0) {
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
      const ok = origBeacon(url, data);
      if (trafficMonitorOn()) {
        const fullUrl = resolveUrl(url);
        const rawBody = extractInitBodyString(data);
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
