import {
  AuthCarrierInfo,
  BodyRule,
  ExtensionState,
  HeaderRule,
  Profile,
} from '../types/extension';

(function () {
  if ((window as unknown as { __REQFORGE_INSTALLED__?: boolean }).__REQFORGE_INSTALLED__) {
    return;
  }
  (window as unknown as { __REQFORGE_INSTALLED__?: boolean }).__REQFORGE_INSTALLED__ = true;

  let currentState: ExtensionState | null = null;

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

  const AUTH_HEADER_PATTERN =
    /^(authorization|x-api-key|api-key|x-auth-token|x-access-token|x-csrf-token|x-xsrf-token|x-session-id|x-token|token|apikey)$/i;
  const AUTH_KEY_PATTERN =
    /(token|access_token|accesstoken|refresh_token|refreshtoken|id_token|idtoken|jwt|bearer|api_key|apikey|secret|session|sessionid|auth|csrf)/i;

  function maskValue(raw: string): string {
    const val = String(raw || '').trim();
    if (!val) return '';
    if (val.length <= 12) return val;
    return `${val.slice(0, 10)}…${val.slice(-4)} (${val.length}c)`;
  }

  function extractQueryParams(url: string): Record<string, string> {
    const out: Record<string, string> = {};
    try {
      const u = new URL(url, window.location.href);
      u.searchParams.forEach((v, k) => {
        out[k] = v;
      });
    } catch {
      // ignore
    }
    return out;
  }

  function detectAuthCarriers(params: {
    requestHeaders?: Record<string, string>;
    queryParams?: Record<string, string>;
    requestBody?: string;
    credentials?: string;
    targetUrl?: string;
  }): AuthCarrierInfo[] {
    const carriers: AuthCarrierInfo[] = [];
    const headers = params.requestHeaders || {};

    for (const [k, v] of Object.entries(headers)) {
      const lower = k.toLowerCase();
      if (lower === 'authorization') {
        const parts = v.trim().split(/\s+/);
        const scheme = parts.length > 1 ? parts[0] : 'Raw';
        const rest = parts.length > 1 ? parts.slice(1).join(' ') : v;
        carriers.push({
          location: 'header',
          key: k,
          scheme,
          preview: `${scheme} ${maskValue(rest)}`,
        });
      } else if (AUTH_HEADER_PATTERN.test(k) || AUTH_KEY_PATTERN.test(k)) {
        carriers.push({
          location: 'header',
          key: k,
          scheme: 'Header',
          preview: maskValue(v),
        });
      }
    }

    const q = params.queryParams || {};
    for (const [k, v] of Object.entries(q)) {
      if (AUTH_KEY_PATTERN.test(k)) {
        carriers.push({
          location: 'query',
          key: `?${k}`,
          scheme: 'Query',
          preview: maskValue(v),
        });
      }
    }

    if (params.requestBody) {
      try {
        const parsed = JSON.parse(params.requestBody);
        const scanObj = (obj: unknown, prefix = '') => {
          if (!obj || typeof obj !== 'object') return;
          for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
            const path = prefix ? `${prefix}.${k}` : k;
            if (typeof v === 'string' && v.trim() && AUTH_KEY_PATTERN.test(k)) {
              const isJwt = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(v.trim());
              carriers.push({
                location: 'body',
                key: path,
                scheme: isJwt ? 'JWT in Body' : 'JSON Body',
                preview: maskValue(v),
              });
            } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
              scanObj(v, path);
            }
          }
        };
        scanObj(parsed);
      } catch {
        // Check URL-encoded form body
        if (params.requestBody.includes('=')) {
          try {
            const sp = new URLSearchParams(params.requestBody);
            sp.forEach((v, k) => {
              if (AUTH_KEY_PATTERN.test(k) && v) {
                carriers.push({
                  location: 'body',
                  key: k,
                  scheme: 'Form Body',
                  preview: maskValue(v),
                });
              }
            });
          } catch {
            // ignore
          }
        }
      }
    }

    const cred = params.credentials || 'same-origin';
    let sameOrigin = false;
    try {
      if (params.targetUrl) {
        sameOrigin =
          new URL(params.targetUrl, window.location.href).origin ===
          window.location.origin;
      }
    } catch {
      // ignore
    }

    const sendsCookies =
      cred === 'include' || (cred === 'same-origin' && sameOrigin);
    if (sendsCookies && typeof document !== 'undefined' && document.cookie) {
      const cookieNames = document.cookie
        .split(';')
        .map((c) => c.trim().split('=')[0])
        .filter(Boolean);
      if (cookieNames.length > 0) {
        carriers.push({
          location: 'cookie',
          key: 'Cookie',
          scheme: `credentials:${cred}`,
          preview: `${cookieNames.slice(0, 4).join(', ')}${
            cookieNames.length > 4 ? ` +${cookieNames.length - 4}` : ''
          }`,
        });
      }
    } else if (cred === 'include') {
      carriers.push({
        location: 'cookie',
        key: 'Cookie (HttpOnly)',
        scheme: 'credentials:include',
        preview: 'Browser sends cross-site/HttpOnly cookies',
      });
    }

    return carriers;
  }

  function truncateText(text: string | undefined, max = 1200): string | undefined {
    if (!text) return undefined;
    const trimmed = text.trim();
    if (!trimmed) return undefined;
    return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
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
    responsePreview?: string;
    credentials?: string;
  }) {
    const queryParams = extractQueryParams(entry.url);
    const authCarriers = detectAuthCarriers({
      requestHeaders: entry.requestHeaders,
      queryParams,
      requestBody: entry.requestBody,
      credentials: entry.credentials,
      targetUrl: entry.url,
    });

    window.postMessage(
      {
        source: 'DEV_MANIPULATOR_INJECTED',
        type: 'LOG_INTERCEPT',
        entry: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
          pageUrl: window.location.href,
          ...entry,
          method: entry.method.toUpperCase(),
          queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
          requestBody: truncateText(entry.requestBody),
          responsePreview: truncateText(entry.responsePreview),
          authCarriers: authCarriers.length > 0 ? authCarriers : undefined,
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

  function headersToObject(headers?: HeadersInit | Headers): Record<string, string> {
    const out: Record<string, string> = {};
    try {
      const h = new Headers(headers || undefined);
      h.forEach((value, key) => {
        out[key] = value;
      });
    } catch {
      // ignore
    }
    return out;
  }

  function extractRequestBodyString(
    input: RequestInfo | URL,
    init?: RequestInit
  ): string | undefined {
    try {
      const b = init?.body;
      if (typeof b === 'string') return b;
      if (b instanceof URLSearchParams) return b.toString();
      if (b instanceof FormData) {
        const obj: Record<string, string> = {};
        b.forEach((v, k) => {
          obj[k] = typeof v === 'string' ? v : `[File:${v.name}]`;
        });
        return JSON.stringify(obj);
      }
    } catch {
      // ignore
    }
    void input;
    return undefined;
  }

  async function peekResponseText(res: Response): Promise<string | undefined> {
    try {
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (
        ct.includes('json') ||
        ct.includes('text') ||
        ct.includes('xml') ||
        ct.includes('javascript')
      ) {
        const clone = res.clone();
        return await clone.text();
      }
    } catch {
      // ignore
    }
    return undefined;
  }

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

  // ============================================================================
  // FETCH — pass through untouched unless a body/header mutation is required
  // ============================================================================
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const startedAt = Date.now();
    const fullUrl = resolveUrl(input);
    const method =
      init?.method ||
      (input instanceof Request ? input.method : 'GET') ||
      'GET';

    const rawReqHeaders = headersToObject(
      init?.headers || (input instanceof Request ? input.headers : undefined)
    );
    const rawReqBody = extractRequestBodyString(input, init);
    const cred = String(
      init?.credentials ||
        (input instanceof Request ? input.credentials : 'same-origin')
    );

    const profile = getActiveProfile();
    if (!profile) {
      const res = await originalFetch(input, init);
      if (trafficMonitorOn()) {
        const resPreview = await peekResponseText(res);
        emitLog({
          type: 'TRAFFIC',
          method,
          url: fullUrl,
          ruleName: 'passthrough',
          details: `HTTP ${res.status} (paused)`,
          status: res.status,
          durationMs: Date.now() - startedAt,
          mutated: false,
          requestHeaders: rawReqHeaders,
          responseHeaders: headersToObject(res.headers),
          requestBody: rawReqBody,
          responsePreview: resPreview,
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

    // CRITICAL: if nothing matches, call original fetch with original args (keeps cookies/credentials intact)
    if (!shouldMutate) {
      const res = await originalFetch(input, init);
      if (trafficMonitorOn()) {
        const resPreview = await peekResponseText(res);
        emitLog({
          type: 'TRAFFIC',
          method,
          url: fullUrl,
          ruleName: '—',
          details: `HTTP ${res.status}`,
          status: res.status,
          durationMs: Date.now() - startedAt,
          mutated: false,
          requestHeaders: rawReqHeaders,
          responseHeaders: headersToObject(res.headers),
          requestBody: rawReqBody,
          responsePreview: resPreview,
          credentials: cred,
        });
      }
      return res;
    }

    // Build a safe override init while preserving credentials/mode/cache/etc.
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

    let outgoingBodyText = rawReqBody || '';
    if (reqRules.length > 0) {
      if (!outgoingBodyText && input instanceof Request && baseInit.body == null) {
        try {
          outgoingBodyText = await input.clone().text();
        } catch {
          outgoingBodyText = '';
        }
      }
      for (const rule of reqRules) {
        if (rule.delayMs && rule.delayMs > 0) await sleep(rule.delayMs);
        outgoingBodyText = transformBodyText(outgoingBodyText, rule);
        emitLog({
          type: 'BODY_REQ',
          method,
          url: fullUrl,
          ruleName: rule.name || rule.urlPattern,
          details: `Request body modified (${rule.mode})`,
          durationMs: Date.now() - startedAt,
          mutated: true,
          requestHeaders: headersToObject(baseInit.headers),
          requestBody: outgoingBodyText,
          credentials: cred,
        });
      }
      baseInit.body = outgoingBodyText;
    }

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
        durationMs: Date.now() - startedAt,
        mutated: true,
        requestHeaders: headersToObject(baseInit.headers),
        requestBody: outgoingBodyText || rawReqBody,
        responsePreview: fullReplaceRule.bodyContent,
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
      typeof input === 'string' || input instanceof URL
        ? input
        : fullUrl;
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
          emitLog({
            type: 'BODY_RES',
            method,
            url: fullUrl,
            ruleName: rule.name || rule.urlPattern,
            details: `Merged response JSON (${finalStatus})`,
            status: finalStatus,
            durationMs: Date.now() - startedAt,
            mutated: true,
            requestHeaders: headersToObject(baseInit.headers),
            responseHeaders: headersToObject(response.headers),
            requestBody: outgoingBodyText || rawReqBody,
            responsePreview: resText,
            credentials: cred,
          });
        }
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

    if (trafficMonitorOn() || matchingHeaders.length > 0) {
      const resPreview = await peekResponseText(response);
      emitLog({
        type: matchingHeaders.length > 0 ? 'HEADER' : 'TRAFFIC',
        method,
        url: fullUrl,
        ruleName: matchingHeaders.map((h) => h.label).join(', ') || '—',
        details: `HTTP ${response.status}${matchingHeaders.length ? ' + headers' : ''}`,
        status: response.status,
        durationMs: Date.now() - startedAt,
        mutated: matchingHeaders.length > 0,
        requestHeaders: headersToObject(baseInit.headers),
        responseHeaders: headersToObject(response.headers),
        requestBody: outgoingBodyText || rawReqBody,
        responsePreview: resPreview,
        credentials: cred,
      });
    }

    return response;
  };

  // ============================================================================
  // XHR — capture headers, body, response preview, duration & auth carriers
  // ============================================================================
  const OriginalXHR = window.XMLHttpRequest;

  class ManipulatedXHR extends OriginalXHR {
    private _url = '';
    private _method = 'GET';
    private _reqHeaders: Record<string, string> = {};
    private _startedAt = 0;

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

    private _collectResponseHeaders(): Record<string, string> {
      const out: Record<string, string> = {};
      try {
        const raw = this.getAllResponseHeaders() || '';
        raw
          .trim()
          .split(/[\r\n]+/)
          .forEach((line) => {
            const idx = line.indexOf(':');
            if (idx > 0) {
              out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
            }
          });
      } catch {
        // ignore
      }
      return out;
    }

    private _safeResponseText(): string | undefined {
      try {
        if (!this.responseType || this.responseType === 'text') {
          return this.responseText;
        }
        if (this.responseType === 'json' && this.response) {
          return JSON.stringify(this.response);
        }
      } catch {
        // ignore
      }
      return undefined;
    }

    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      this._startedAt = Date.now();
      const rawBodyStr = typeof body === 'string' ? body : undefined;
      const cred = this.withCredentials ? 'include' : 'same-origin';

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
              durationMs: Date.now() - this._startedAt,
              mutated: false,
              requestHeaders: { ...this._reqHeaders },
              responseHeaders: this._collectResponseHeaders(),
              requestBody: rawBodyStr,
              responsePreview: this._safeResponseText(),
              credentials: cred,
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
              durationMs: Date.now() - this._startedAt,
              mutated: false,
              requestHeaders: { ...this._reqHeaders },
              responseHeaders: this._collectResponseHeaders(),
              requestBody: rawBodyStr,
              responsePreview: this._safeResponseText(),
              credentials: cred,
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
            // restricted header names ignored
          }
        }
      }

      let outgoingBody = body;
      const reqRules = matchingBodyRules.filter(
        (r) => r.mode === 'replace_request' || r.mode === 'merge_request_json'
      );
      if (reqRules.length > 0 && (typeof body === 'string' || body == null)) {
        let textBody = typeof body === 'string' ? body : '';
        for (const rule of reqRules) {
          textBody = transformBodyText(textBody, rule);
          emitLog({
            type: 'BODY_REQ',
            method: this._method,
            url: this._url,
            ruleName: rule.name || rule.urlPattern,
            details: `XHR request body modified (${rule.mode})`,
            durationMs: Date.now() - this._startedAt,
            mutated: true,
            requestHeaders: { ...this._reqHeaders },
            requestBody: textBody,
            credentials: cred,
          });
        }
        outgoingBody = textBody;
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
              emitLog({
                type: 'BODY_RES',
                method: this._method,
                url: this._url,
                ruleName: rule.name || rule.urlPattern,
                details: `XHR response modified (${rule.mode})`,
                status: customStatus,
                durationMs: Date.now() - this._startedAt,
                mutated: true,
                requestHeaders: { ...this._reqHeaders },
                responseHeaders: this._collectResponseHeaders(),
                requestBody: typeof outgoingBody === 'string' ? outgoingBody : rawBodyStr,
                responsePreview: modifiedText,
                credentials: cred,
              });
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
          } catch {
            // ignore
          }
        });
      } else if (trafficMonitorOn() || matchingHeaders.length > 0) {
        this.addEventListener('loadend', () => {
          emitLog({
            type: matchingHeaders.length > 0 ? 'HEADER' : 'TRAFFIC',
            method: this._method,
            url: this._url,
            ruleName: matchingHeaders.map((h) => h.label).join(', ') || '—',
            details: `HTTP ${this.status}`,
            status: this.status,
            durationMs: Date.now() - this._startedAt,
            mutated: matchingHeaders.length > 0,
            requestHeaders: { ...this._reqHeaders },
            responseHeaders: this._collectResponseHeaders(),
            requestBody: typeof outgoingBody === 'string' ? outgoingBody : rawBodyStr,
            responsePreview: this._safeResponseText(),
            credentials: cred,
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
