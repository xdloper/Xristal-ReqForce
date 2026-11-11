import {
  BodyRule,
  ExtensionState,
  HeaderRule,
  Profile,
  TokenTrace,
} from '../types/extension';

(function () {
  if ((window as unknown as { __REQFORGE_INSTALLED__?: boolean }).__REQFORGE_INSTALLED__) {
    return;
  }
  (window as unknown as { __REQFORGE_INSTALLED__?: boolean }).__REQFORGE_INSTALLED__ = true;

  let currentState: ExtensionState | null = null;
  const MAX_BODY_CHARS = 4000;

  function getActiveProfile(): Profile | null {
    if (!currentState || !currentState.globalEnabled) return null;
    return (
      currentState.profiles.find((p) => p.id === currentState?.activeProfileId) ||
      currentState.profiles[0] ||
      null
    );
  }

  function trafficMonitorOn(): boolean {
    return Boolean(currentState?.trafficMonitorEnabled);
  }

  function cap(text: string | undefined): string | undefined {
    if (!text) return undefined;
    return text.length > MAX_BODY_CHARS
      ? `${text.slice(0, MAX_BODY_CHARS)}\n…[truncated ${text.length - MAX_BODY_CHARS} chars]`
      : text;
  }

  function maskSecret(val: string): string {
    const v = val.trim();
    if (v.length <= 12) return v;
    if (/^bearer\s+/i.test(v)) {
      const tok = v.replace(/^bearer\s+/i, '');
      return `Bearer ${tok.slice(0, 10)}…${tok.slice(-4)} (${tok.length}c)`;
    }
    if (v.split('.').length === 3 && v.startsWith('eyJ')) {
      return `JWT ${v.slice(0, 10)}…${v.slice(-4)} (${v.length}c)`;
    }
    return `${v.slice(0, 8)}…${v.slice(-4)} (${v.length}c)`;
  }

  const TOKEN_KEY_RE =
    /(authorization|auth|token|jwt|bearer|api[-_]?key|access[-_]?token|refresh[-_]?token|id[-_]?token|session|csrf|xsrf|secret|signature)/i;

  function detectTokens(
    reqHeaders: Record<string, string>,
    queryParams: Record<string, string>,
    reqBody: string | undefined,
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
        traces.push({ channel: 'header', key: k, preview: maskSecret(v) });
      }
    }

    // 2. Query string
    for (const [k, v] of Object.entries(queryParams)) {
      if (
        TOKEN_KEY_RE.test(k) ||
        (v.startsWith('eyJ') && v.split('.').length === 3)
      ) {
        traces.push({ channel: 'query', key: k, preview: maskSecret(v) });
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
              if (TOKEN_KEY_RE.test(k)) {
                traces.push({ channel: 'body', key: k, preview: maskSecret(v) });
              }
            });
          } catch {
            // ignore
          }
        }
      }
    }

    // 4. Cookies (credentials mode + visible document.cookie keys)
    try {
      const rawCookie = typeof document !== 'undefined' ? document.cookie : '';
      const cookieNames = rawCookie
        ? rawCookie
            .split(';')
            .map((c) => c.trim().split('=')[0])
            .filter(Boolean)
        : [];
      const authCookies = cookieNames.filter((n) => TOKEN_KEY_RE.test(n));
      if (authCookies.length > 0) {
        traces.push({
          channel: 'cookie',
          key: authCookies.join(', '),
          preview: `credentials=${credentials}`,
        });
      } else if (credentials === 'include') {
        traces.push({
          channel: 'cookie',
          key: 'credentials: include',
          preview: cookieNames.length
            ? `${cookieNames.length} JS cookie(s) + HttpOnly`
            : 'HttpOnly / cross-origin cookies sent',
        });
      }
    } catch {
      // ignore
    }

    return traces;
  }

  function parseUrlParts(rawUrl: string): {
    targetHost: string;
    queryParams: Record<string, string>;
  } {
    const queryParams: Record<string, string> = {};
    try {
      const u = new URL(rawUrl, window.location.href);
      u.searchParams.forEach((v, k) => {
        queryParams[k] = v;
      });
      return { targetHost: u.host, queryParams };
    } catch {
      return { targetHost: '', queryParams };
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

  function emitLog(entry: {
    type: 'TRAFFIC' | 'HEADER' | 'BODY_REQ' | 'BODY_RES' | 'TELEPRESENCE' | 'REDIRECT';
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
    responseBody?: string;
    credentials?: string;
  }) {
    const { targetHost, queryParams } = parseUrlParts(entry.url);
    const reqHeaders = entry.requestHeaders || {};
    const creds = entry.credentials || 'same-origin';
    const tokens = detectTokens(reqHeaders, queryParams, entry.requestBody, creds);

    window.postMessage(
      {
        source: 'DEV_MANIPULATOR_INJECTED',
        type: 'LOG_INTERCEPT',
        entry: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
          ...entry,
          method: (entry.method || 'GET').toUpperCase(),
          pageUrl: window.location.href,
          pageOrigin: window.location.origin,
          targetHost,
          queryParams: Object.keys(queryParams).length ? queryParams : undefined,
          requestBody: cap(entry.requestBody),
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

  function extractInitBodyString(body?: BodyInit | null): string | undefined {
    if (!body) return undefined;
    if (typeof body === 'string') return body;
    if (body instanceof URLSearchParams) return body.toString();
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      const parts: string[] = [];
      body.forEach((v, k) => {
        parts.push(`${k}=${typeof v === 'string' ? v : '[File]'}`);
      });
      return parts.join('&');
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
    const method =
      init?.method ||
      (input instanceof Request ? input.method : 'GET') ||
      'GET';

    const rawReqBody = extractInitBodyString(init?.body);
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
      if (!bodyText && input instanceof Request && baseInit.body == null) {
        try {
          bodyText = await input.clone().text();
        } catch {
          bodyText = '';
        }
      }
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
        method,
        url: fullUrl,
        ruleName: fullReplaceRule.name || fullReplaceRule.urlPattern,
        details: `Mocked response (${status})`,
        status,
        durationMs: Math.round(performance.now() - t0),
        mutated: true,
        requestHeaders: finalReqHeaders,
        requestBody: sentBodyText,
        responseBody: fullReplaceRule.bodyContent,
        credentials: cred,
      });
      return new Response(fullReplaceRule.bodyContent, {
        status,
        headers: {
          'Content-Type': fullReplaceRule.contentType || 'application/json',
          'X-Manipulated-By': 'ReqForge',
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
          responseBody: resText,
          credentials: cred,
        });
        const resHeaders = new Headers(response.headers);
        resHeaders.set('X-Manipulated-By', 'ReqForge');
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
      const rawBody = typeof body === 'string' ? body : undefined;
      const credMode = this.withCredentials ? 'include' : 'same-origin';
      const profile = getActiveProfile();

      if (!profile) {
        if (trafficMonitorOn()) {
          this.addEventListener('loadend', () => {
            emitLog({
              type: 'TRAFFIC',
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
            responseBody: this._safeResText(),
            credentials: credMode,
          });
        });
      }

      return super.send(outgoingBody);
    }
  }

  window.XMLHttpRequest = ManipulatedXHR;

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
