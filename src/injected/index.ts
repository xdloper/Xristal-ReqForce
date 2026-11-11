import { BodyRule, ExtensionState, HeaderRule, Profile } from '../types/extension';

(function () {
  if ((window as unknown as { __DEV_MANIPULATOR_INSTALLED__?: boolean }).__DEV_MANIPULATOR_INSTALLED__) {
    return;
  }
  (window as unknown as { __DEV_MANIPULATOR_INSTALLED__?: boolean }).__DEV_MANIPULATOR_INSTALLED__ = true;

  let currentState: ExtensionState | null = null;

  function getActiveProfile(): Profile | null {
    if (!currentState || !currentState.globalEnabled) return null;
    return (
      currentState.profiles.find((p) => p.id === currentState?.activeProfileId) ||
      currentState.profiles[0] ||
      null
    );
  }

  function emitLog(
    type: 'HEADER' | 'BODY_REQ' | 'BODY_RES' | 'TELEPRESENCE' | 'REDIRECT',
    method: string,
    url: string,
    ruleName: string,
    details: string
  ) {
    window.postMessage(
      {
        source: 'DEV_MANIPULATOR_INJECTED',
        type: 'LOG_INTERCEPT',
        entry: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
          type,
          method: method.toUpperCase(),
          url,
          ruleName,
          details,
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
    // Support wildcard * pattern or simple substring match
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

  function getMatchingRequestHeaders(url: string): Array<{ name: string; value: string; op: string; label: string }> {
    const profile = getActiveProfile();
    if (!profile) return [];

    const result: Array<{ name: string; value: string; op: string; label: string }> = [];

    // Telepresence headers
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
          label: `Telepresence (${tp.customHeaderName.trim()})`,
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

    // Custom request headers
    for (const hRule of profile.headerRules as HeaderRule[]) {
      if (!hRule.enabled || hRule.target !== 'request' || !hRule.name.trim()) continue;
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
        // Fallback if invalid JSON
      }
    }
    return originalText;
  }

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // ============================================================================
  // 1. FETCH INTERCEPTOR (Headers + Request Body + Response Body Manipulation)
  // ============================================================================
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const profile = getActiveProfile();
    if (!profile) {
      return originalFetch(input, init);
    }

    let url = '';
    let method = init?.method || 'GET';

    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
      method = init?.method || input.method || 'GET';
    }

    // Resolve relative URLs for accurate pattern matching
    let fullUrl = url;
    try {
      fullUrl = new URL(url, window.location.href).href;
    } catch {
      fullUrl = url;
    }

    const nextInit: RequestInit = { ...init };

    // Apply client-visible headers (complements network-level declarativeNetRequest headers)
    const matchingHeaders = getMatchingRequestHeaders(fullUrl);
    if (matchingHeaders.length > 0) {
      const headers = new Headers(
        init?.headers || (input instanceof Request ? input.headers : undefined)
      );
      for (const h of matchingHeaders) {
        if (h.op === 'remove') {
          headers.delete(h.name);
        } else if (h.op === 'append') {
          headers.append(h.name, h.value);
        } else {
          headers.set(h.name, h.value);
        }
      }
      nextInit.headers = headers;
    }

    const matchingBodyRules = getMatchingBodyRules(fullUrl, method);

    // Process Request Body Manipulation rules
    const reqRules = matchingBodyRules.filter(
      (r) => r.mode === 'replace_request' || r.mode === 'merge_request_json'
    );

    if (reqRules.length > 0) {
      let bodyText = '';
      if (typeof nextInit.body === 'string') {
        bodyText = nextInit.body;
      } else if (input instanceof Request && !nextInit.body) {
        try {
          bodyText = await input.clone().text();
        } catch {
          bodyText = '';
        }
      }

      for (const rule of reqRules) {
        if (rule.delayMs && rule.delayMs > 0) {
          await sleep(rule.delayMs);
        }
        bodyText = transformBodyText(bodyText, rule);
        emitLog(
          'BODY_REQ',
          method,
          fullUrl,
          rule.name || rule.urlPattern,
          `Request body modified (${rule.mode})`
        );
      }
      nextInit.body = bodyText;
    }

    // Process Response Body Manipulation rules
    const resRules = matchingBodyRules.filter(
      (r) => r.mode === 'replace_response' || r.mode === 'merge_response_json'
    );

    // If a rule completely replaces the response, we can short-circuit or replace after fetch
    const fullReplaceRule = resRules.find((r) => r.mode === 'replace_response');
    if (fullReplaceRule) {
      if (fullReplaceRule.delayMs && fullReplaceRule.delayMs > 0) {
        await sleep(fullReplaceRule.delayMs);
      }
      const status = fullReplaceRule.statusCode || 200;
      const contentType = fullReplaceRule.contentType || 'application/json';
      emitLog(
        'BODY_RES',
        method,
        fullUrl,
        fullReplaceRule.name || fullReplaceRule.urlPattern,
        `Mocked response (${status})`
      );
      return new Response(fullReplaceRule.bodyContent, {
        status,
        headers: {
          'Content-Type': contentType,
          'X-Manipulated-By': 'DevManipulator',
        },
      });
    }

    // Perform actual network fetch
    const response = await originalFetch(input, nextInit);

    // Apply JSON merge response rules if any
    const mergeResRules = resRules.filter((r) => r.mode === 'merge_response_json');
    if (mergeResRules.length > 0) {
      try {
        const cloned = response.clone();
        let resText = await cloned.text();
        let finalStatus = response.status;

        for (const rule of mergeResRules) {
          if (rule.delayMs && rule.delayMs > 0) {
            await sleep(rule.delayMs);
          }
          resText = transformBodyText(resText, rule);
          if (rule.statusCode) {
            finalStatus = rule.statusCode;
          }
          emitLog(
            'BODY_RES',
            method,
            fullUrl,
            rule.name || rule.urlPattern,
            `Merged JSON fields into response (${finalStatus})`
          );
        }

        const resHeaders = new Headers(response.headers);
        resHeaders.set('X-Manipulated-By', 'DevManipulator');

        return new Response(resText, {
          status: finalStatus,
          statusText: response.statusText,
          headers: resHeaders,
        });
      } catch {
        return response;
      }
    }

    return response;
  };

  // ============================================================================
  // 2. XMLHttpRequest INTERCEPTOR (Headers + Request/Response Body Manipulation)
  // ============================================================================
  const OriginalXHR = window.XMLHttpRequest;

  class ManipulatedXHR extends OriginalXHR {
    private _url: string = '';
    private _method: string = 'GET';

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
        return super.send(body);
      }

      // Apply matching headers
      const matchingHeaders = getMatchingRequestHeaders(this._url);
      for (const h of matchingHeaders) {
        if (h.op !== 'remove') {
          try {
            this.setRequestHeader(h.name, h.value);
          } catch {
            // Ignore restricted header names in XHR (handled by declarativeNetRequest anyway)
          }
        }
      }

      const matchingBodyRules = getMatchingBodyRules(this._url, this._method);

      // Modify outgoing request body if matched
      let outgoingBody = body;
      const reqRules = matchingBodyRules.filter(
        (r) => r.mode === 'replace_request' || r.mode === 'merge_request_json'
      );

      if (reqRules.length > 0 && (typeof body === 'string' || body === null || body === undefined)) {
        let textBody = typeof body === 'string' ? body : '';
        for (const rule of reqRules) {
          textBody = transformBodyText(textBody, rule);
          emitLog(
            'BODY_REQ',
            this._method,
            this._url,
            rule.name || rule.urlPattern,
            `XHR Request body modified (${rule.mode})`
          );
        }
        outgoingBody = textBody;
      }

      // Modify incoming response body if matched
      const resRules = matchingBodyRules.filter(
        (r) => r.mode === 'replace_response' || r.mode === 'merge_response_json'
      );

      if (resRules.length > 0) {
        this.addEventListener('readystatechange', () => {
          if (this.readyState === 4) {
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
                if (rule.statusCode) {
                  customStatus = rule.statusCode;
                }
                emitLog(
                  'BODY_RES',
                  this._method,
                  this._url,
                  rule.name || rule.urlPattern,
                  `XHR Response modified (${rule.mode})`
                );
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
              // Ignore if property override fails
            }
          }
        });
      }

      return super.send(outgoingBody);
    }
  }

  window.XMLHttpRequest = ManipulatedXHR;

  // Listen for rule updates from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (data && data.source === 'DEV_MANIPULATOR_CONTENT' && data.type === 'UPDATE_RULES') {
      currentState = data.state;
    }
  });

  // Notify content script that injected interceptor is ready
  window.postMessage(
    {
      source: 'DEV_MANIPULATOR_INJECTED',
      type: 'INJECTED_READY',
    },
    '*'
  );
})();
