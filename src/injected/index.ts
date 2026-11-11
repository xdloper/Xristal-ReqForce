import { BodyRule, ExtensionState, HeaderRule, Profile } from '../types/extension';

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

  function emitLog(entry: {
    type: 'TRAFFIC' | 'HEADER' | 'BODY_REQ' | 'BODY_RES' | 'TELEPRESENCE' | 'REDIRECT';
    method: string;
    url: string;
    ruleName: string;
    details: string;
    status?: number;
    mutated?: boolean;
    requestHeaders?: Record<string, string>;
    credentials?: string;
  }) {
    window.postMessage(
      {
        source: 'DEV_MANIPULATOR_INJECTED',
        type: 'LOG_INTERCEPT',
        entry: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
          ...entry,
          method: entry.method.toUpperCase(),
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

  // Page-level header injection is intentionally NOT used for auth-sensitive flows.
  // Network-level declarativeNetRequest already applies header rules.
  // We only mirror non-auth debug headers here when a body rule already forces mutation.
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
        // Never log sensitive token values fully
        if (key.toLowerCase() === 'authorization') {
          out[key] = value.startsWith('Bearer ')
            ? `Bearer ${value.slice(7, 15)}…`
            : '[redacted]';
        } else if (key.toLowerCase() === 'cookie') {
          out[key] = '[http-only / redacted]';
        } else {
          out[key] = value;
        }
      });
    } catch {
      // ignore
    }
    return out;
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
    const fullUrl = resolveUrl(input);
    let method =
      init?.method ||
      (input instanceof Request ? input.method : 'GET') ||
      'GET';

    const profile = getActiveProfile();
    if (!profile) {
      const res = await originalFetch(input, init);
      if (trafficMonitorOn()) {
        emitLog({
          type: 'TRAFFIC',
          method,
          url: fullUrl,
          ruleName: 'passthrough',
          details: `HTTP ${res.status} (extension paused)`,
          status: res.status,
          mutated: false,
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
        const cred =
          init?.credentials ||
          (input instanceof Request ? input.credentials : 'same-origin');
        emitLog({
          type: 'TRAFFIC',
          method,
          url: fullUrl,
          ruleName: '—',
          details: `HTTP ${res.status}`,
          status: res.status,
          mutated: false,
          requestHeaders: headersToObject(
            init?.headers || (input instanceof Request ? input.headers : undefined)
          ),
          credentials: String(cred),
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

    if (reqRules.length > 0) {
      let bodyText = '';
      if (typeof baseInit.body === 'string') {
        bodyText = baseInit.body;
      } else if (input instanceof Request && baseInit.body == null) {
        try {
          bodyText = await input.clone().text();
        } catch {
          bodyText = '';
        }
      }
      for (const rule of reqRules) {
        if (rule.delayMs && rule.delayMs > 0) await sleep(rule.delayMs);
        bodyText = transformBodyText(bodyText, rule);
        emitLog({
          type: 'BODY_REQ',
          method,
          url: fullUrl,
          ruleName: rule.name || rule.urlPattern,
          details: `Request body modified (${rule.mode})`,
          mutated: true,
        });
      }
      baseInit.body = bodyText;
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
        mutated: true,
      });
      return new Response(fullReplaceRule.bodyContent, {
        status,
        headers: {
          'Content-Type': fullReplaceRule.contentType || 'application/json',
          'X-Manipulated-By': 'ReqForge',
        },
      });
    }

    // Prefer URL+init over Request+init to avoid Request body stream conflicts
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
            mutated: true,
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
      emitLog({
        type: matchingHeaders.length > 0 ? 'HEADER' : 'TRAFFIC',
        method,
        url: fullUrl,
        ruleName: matchingHeaders.map((h) => h.label).join(', ') || '—',
        details: `HTTP ${response.status}${matchingHeaders.length ? ' + headers' : ''}`,
        status: response.status,
        mutated: matchingHeaders.length > 0,
        requestHeaders: headersToObject(baseInit.headers),
        credentials: String(baseInit.credentials || 'same-origin'),
      });
    }

    return response;
  };

  // ============================================================================
  // XHR — same pass-through policy
  // ============================================================================
  const OriginalXHR = window.XMLHttpRequest;

  class ManipulatedXHR extends OriginalXHR {
    private _url = '';
    private _method = 'GET';

    open(
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ): void {
      this._method = (method || 'GET').toUpperCase();
      try {
        this._url = new URL(String(url), window.location.href).href;
      } catch {
        this._url = String(url);
      }
      super.open(method, url, async, username, password);
    }

    send(body?: Document | XMLHttpRequestBodyInit | null): void {
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
              mutated: false,
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
              mutated: false,
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
            mutated: true,
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
                mutated: true,
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
            mutated: matchingHeaders.length > 0,
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
