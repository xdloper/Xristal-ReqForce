import { ExtensionState, InterceptLogEntry, Profile } from '../types/extension';

// Self-contained background script (zero external chunk imports so service_worker never fails to load)
const extApi: typeof chrome =
  (globalThis as unknown as { browser?: typeof chrome }).browser ||
  globalThis.chrome;

const FALLBACK_STATE: ExtensionState = {
  globalEnabled: true,
  trafficMonitorEnabled: true,
  locale: 'system',
  theme: 'system',
  activeProfileId: 'default-dev',
  profiles: [
    {
      id: 'default-dev',
      name: 'Default Workspace',
      color: '#3b82f6',
      telepresence: {
        enabled: false,
        interceptId: '',
        baggageHeader: '',
        customHeaderName: '',
        customHeaderValue: '',
        targetDomainFilter: '*',
        propagateBaggage: true,
        envoyForceTrace: false,
      },
      headerRules: [],
      bodyRules: [],
      redirectCorsRules: [],
    },
  ],
  logs: [],
};

const ALL_RESOURCE_TYPES: chrome.declarativeNetRequest.ResourceType[] = [
  'main_frame' as chrome.declarativeNetRequest.ResourceType,
  'sub_frame' as chrome.declarativeNetRequest.ResourceType,
  'stylesheet' as chrome.declarativeNetRequest.ResourceType,
  'script' as chrome.declarativeNetRequest.ResourceType,
  'image' as chrome.declarativeNetRequest.ResourceType,
  'font' as chrome.declarativeNetRequest.ResourceType,
  'object' as chrome.declarativeNetRequest.ResourceType,
  'xmlhttprequest' as chrome.declarativeNetRequest.ResourceType,
  'ping' as chrome.declarativeNetRequest.ResourceType,
  'media' as chrome.declarativeNetRequest.ResourceType,
  'websocket' as chrome.declarativeNetRequest.ResourceType,
  'other' as chrome.declarativeNetRequest.ResourceType,
];

function expandMacros(
  input: string,
  customVars?: Array<{ enabled: boolean; key: string; value: string }>
): string {
  const raw = String(input ?? '');
  if (!raw.includes('{{')) return raw;

  let out = raw;
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

function sanitizeHeaderName(name: string): string {
  return String(name ?? '').trim().replace(/[^a-zA-Z0-9-_]/g, '');
}

function sanitizeHeaderValue(
  value: string,
  customVars?: Array<{ enabled: boolean; key: string; value: string }>
): string {
  return expandMacros(String(value ?? ''), customVars).replace(/[\r\n]/g, '');
}

function normalizeUrlFilter(filter: string): string {
  const trimmed = String(filter ?? '').trim();
  if (!trimmed || trimmed === '*' || trimmed === '<all_urls>') {
    return '*';
  }
  // Convert *://www.example.com/* or *://*.example.com/* into DNR domain anchor ||example.com/
  // so subdomains (api.example.com, ogads-pa.clients6.google.com, etc.) and root domain all match reliably
  const hostMatch = trimmed.match(/^(?:\*|https?):\/\/(?:\*\.)?(?:www\.)?([a-zA-Z0-9.-]+)\/\*$/i);
  if (hostMatch?.[1] && !hostMatch[1].includes('*')) {
    return `||${hostMatch[1]}/`;
  }
  return trimmed;
}

function buildDnrRules(state: ExtensionState): chrome.declarativeNetRequest.Rule[] {
  if (!state || !state.globalEnabled || !Array.isArray(state.profiles)) return [];

  const activeProfile: Profile | undefined =
    state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];

  if (!activeProfile) return [];

  const rules: chrome.declarativeNetRequest.Rule[] = [];
  let ruleIdCounter = 1;
  const customVars = activeProfile.variables || [];

  // 1. Context / Telepresence / Tracing Headers
  const tp = activeProfile.telepresence;
  if (tp && tp.enabled) {
    const tpHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = [];

    if (tp.interceptId?.trim()) {
      const interceptVal = sanitizeHeaderValue(tp.interceptId.trim(), customVars);
      tpHeaders.push({
        header: 'x-telepresence-intercept-id',
        operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
        value: interceptVal,
      });

      if (tp.propagateBaggage) {
        const baggageVal = tp.baggageHeader?.trim()
          ? sanitizeHeaderValue(tp.baggageHeader.trim(), customVars)
          : `telepresence-intercept-id=${interceptVal}`;
        tpHeaders.push({
          header: 'baggage',
          operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
          value: baggageVal,
        });
      }
    } else if (tp.baggageHeader?.trim()) {
      tpHeaders.push({
        header: 'baggage',
        operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
        value: sanitizeHeaderValue(tp.baggageHeader.trim(), customVars),
      });
    }

    const customName = sanitizeHeaderName(tp.customHeaderName);
    if (customName && tp.customHeaderValue?.trim()) {
      tpHeaders.push({
        header: customName,
        operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
        value: sanitizeHeaderValue(tp.customHeaderValue.trim(), customVars),
      });
    }

    if (tp.envoyForceTrace) {
      tpHeaders.push({
        header: 'x-envoy-force-trace',
        operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
        value: 'true',
      });
    }

    if (tpHeaders.length > 0) {
      const urlFilter = normalizeUrlFilter(tp.targetDomainFilter);
      rules.push({
        id: ruleIdCounter++,
        priority: 100,
        action: {
          type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
          requestHeaders: tpHeaders,
        },
        condition: {
          ...(urlFilter !== '*' ? { urlFilter } : {}),
          resourceTypes: ALL_RESOURCE_TYPES,
        },
      });
    }
  }

  // 2. Request & Response Header Rules
  for (const hRule of activeProfile.headerRules || []) {
    const safeName = sanitizeHeaderName(hRule.name);
    if (!hRule.enabled || !safeName) continue;

    // Chrome DNR does not allow 'append' on standard request headers; use 'set' safely if needed
    const op =
      hRule.target === 'request' && hRule.operation === 'append'
        ? 'set'
        : hRule.operation;

    const headerInfo: chrome.declarativeNetRequest.ModifyHeaderInfo = {
      header: safeName,
      operation: op as chrome.declarativeNetRequest.HeaderOperation,
    };

    if (op !== 'remove') {
      headerInfo.value = sanitizeHeaderValue(hRule.value, customVars);
    }

    const urlFilter = normalizeUrlFilter(hRule.urlFilter);

    rules.push({
      id: ruleIdCounter++,
      priority: 50,
      action: {
        type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
        ...(hRule.target === 'request'
          ? { requestHeaders: [headerInfo] }
          : { responseHeaders: [headerInfo] }),
      },
      condition: {
        ...(urlFilter !== '*' ? { urlFilter } : {}),
        resourceTypes: ALL_RESOURCE_TYPES,
      },
    });
  }

  // 3. Redirect & CORS Rules
  for (const rcRule of activeProfile.redirectCorsRules || []) {
    if (!rcRule.enabled) continue;
    const urlFilter = normalizeUrlFilter(rcRule.sourceUrlFilter);

    if (rcRule.type === 'cors_bypass') {
      rules.push({
        id: ruleIdCounter++,
        priority: 90,
        action: {
          type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
          responseHeaders: [
            {
              header: 'Access-Control-Allow-Origin',
              operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
              value: '*',
            },
            {
              header: 'Access-Control-Allow-Methods',
              operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
              value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
            },
            {
              header: 'Access-Control-Allow-Headers',
              operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
              value: '*',
            },
          ],
        },
        condition: {
          ...(urlFilter !== '*' ? { urlFilter } : {}),
          resourceTypes: ALL_RESOURCE_TYPES,
        },
      });
    } else if (rcRule.type === 'redirect' && rcRule.destinationUrl?.trim()) {
      const dest = expandMacros(rcRule.destinationUrl.trim(), customVars);
      const isRegexSubstitution = dest.includes('\\1') || urlFilter.startsWith('^');

      if (isRegexSubstitution) {
        rules.push({
          id: ruleIdCounter++,
          priority: 80,
          action: {
            type: 'redirect' as chrome.declarativeNetRequest.RuleActionType,
            redirect: {
              regexSubstitution: dest,
            },
          },
          condition: {
            regexFilter: urlFilter,
            resourceTypes: ALL_RESOURCE_TYPES,
          },
        });
      } else if (urlFilter.includes('*')) {
        // Convert simple wildcard (e.g. https://api.prod.com/v1/* -> http://localhost:8080/v1/*) into regexSubstitution
        const regexSource =
          '^' +
          urlFilter
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '(.*)');
        const regexDest = dest.includes('*') ? dest.replace(/\*/, '\\1') : dest;
        rules.push({
          id: ruleIdCounter++,
          priority: 80,
          action: {
            type: 'redirect' as chrome.declarativeNetRequest.RuleActionType,
            redirect: {
              regexSubstitution: regexDest,
            },
          },
          condition: {
            regexFilter: regexSource,
            resourceTypes: ALL_RESOURCE_TYPES,
          },
        });
      } else {
        rules.push({
          id: ruleIdCounter++,
          priority: 80,
          action: {
            type: 'redirect' as chrome.declarativeNetRequest.RuleActionType,
            redirect: {
              url: dest,
            },
          },
          condition: {
            ...(urlFilter !== '*' ? { urlFilter } : {}),
            resourceTypes: ALL_RESOURCE_TYPES,
          },
        });
      }
    } else if (rcRule.type === 'query_param' && rcRule.queryKey?.trim()) {
      rules.push({
        id: ruleIdCounter++,
        priority: 75,
        action: {
          type: 'redirect' as chrome.declarativeNetRequest.RuleActionType,
          redirect: {
            transform: {
              queryTransform: {
                addOrReplaceParams: [
                  {
                    key: rcRule.queryKey.trim(),
                    value: expandMacros(String(rcRule.queryValue ?? ''), customVars),
                  },
                ],
              },
            },
          },
        },
        condition: {
          ...(urlFilter !== '*' ? { urlFilter } : {}),
          resourceTypes: ALL_RESOURCE_TYPES,
        },
      });
    } else if (rcRule.type === 'block' && urlFilter !== '*') {
      rules.push({
        id: ruleIdCounter++,
        priority: 95,
        action: {
          type: 'block' as chrome.declarativeNetRequest.RuleActionType,
        },
        condition: {
          urlFilter,
          resourceTypes: ALL_RESOURCE_TYPES.filter((rt) => rt !== 'main_frame'),
        },
      });
    }
  }

  return rules;
}

function countActiveRules(state: ExtensionState): number {
  if (!state || !state.globalEnabled || !Array.isArray(state.profiles)) return 0;
  const activeProfile =
    state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];
  if (!activeProfile) return 0;

  let count = 0;
  const tp = activeProfile.telepresence;
  if (
    tp?.enabled &&
    (tp.interceptId?.trim() ||
      tp.baggageHeader?.trim() ||
      (tp.customHeaderName?.trim() && tp.customHeaderValue?.trim()) ||
      tp.envoyForceTrace)
  ) {
    count += 1;
  }
  count += (activeProfile.headerRules || []).filter(
    (r) => r.enabled && sanitizeHeaderName(r.name)
  ).length;
  count += (activeProfile.bodyRules || []).filter(
    (r) => r.enabled && r.urlPattern?.trim()
  ).length;
  count += (activeProfile.redirectCorsRules || []).filter((r) => r.enabled).length;
  return count;
}

async function syncAllRules(state?: ExtensionState) {
  try {
    let currentState = state;
    if (!currentState) {
      const stored = await extApi.storage.local.get('devManipulatorState');
      currentState = stored?.devManipulatorState || FALLBACK_STATE;
    }

    if (!currentState) return;

    if (extApi.declarativeNetRequest) {
      const existingRules = await extApi.declarativeNetRequest.getDynamicRules();
      const removeRuleIds = existingRules.map((r) => r.id);
      const addRules = buildDnrRules(currentState);

      try {
        await extApi.declarativeNetRequest.updateDynamicRules({
          removeRuleIds,
          addRules,
        });
      } catch {
        // Fallback: clear old rules and apply valid rules one by one so a single invalid regex never breaks everything
        await extApi.declarativeNetRequest.updateDynamicRules({
          removeRuleIds,
          addRules: [],
        });
        for (const rule of addRules) {
          try {
            await extApi.declarativeNetRequest.updateDynamicRules({
              removeRuleIds: [],
              addRules: [rule],
            });
          } catch {
            // Skip malformed user rule silently
          }
        }
      }
    }

    const activeCount = countActiveRules(currentState);
    if (extApi.action) {
      if (!currentState.globalEnabled) {
        await extApi.action.setBadgeText({ text: 'OFF' });
        await extApi.action.setBadgeBackgroundColor({ color: '#52525b' });
      } else if (activeCount > 0) {
        await extApi.action.setBadgeText({ text: String(activeCount) });
        await extApi.action.setBadgeBackgroundColor({ color: '#2563eb' });
      } else {
        await extApi.action.setBadgeText({ text: '' });
      }
    }

    // Only message HTTP/HTTPS tabs where content script is actually running
    if (extApi.tabs) {
      const tabs = await extApi.tabs.query({ url: ['http://*/*', 'https://*/*'] });
      for (const tab of tabs) {
        if (tab.id) {
          try {
            extApi.tabs.sendMessage(
              tab.id,
              {
                type: 'STATE_UPDATED',
                state: currentState,
              },
              () => {
                // Consume chrome.runtime.lastError so Chrome never logs an unchecked runtime error
                void extApi.runtime.lastError;
              }
            );
          } catch {
            // Ignore
          }
        }
      }
    }
  } catch {
    // Prevent unhandled service worker rejections
  }
}

extApi.runtime.onInstalled.addListener(async () => {
  const stored = await extApi.storage.local.get('devManipulatorState');
  if (!stored?.devManipulatorState) {
    await extApi.storage.local.set({ devManipulatorState: FALLBACK_STATE });
  }
  await syncAllRules(stored?.devManipulatorState || FALLBACK_STATE);
});

extApi.runtime.onStartup?.addListener(() => {
  syncAllRules();
});

let logQueue: Promise<void> = Promise.resolve();

extApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SYNC_STATE') {
    const incoming: ExtensionState = message.state;
    if (incoming) {
      void syncAllRules(incoming).then(() => sendResponse({ ok: true }));
    } else {
      void syncAllRules().then(() => sendResponse({ ok: true }));
    }
    return true;
  }

  if (message?.type === 'CLEAR_INTERCEPT_LOGS') {
    logQueue = logQueue
      .then(async () => {
        await extApi.storage.local.set({ devManipulatorLogs: [] });
      })
      .catch(() => {});
    logQueue.then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === 'GET_STATE_FOR_TAB') {
    extApi.storage.local.get('devManipulatorState').then((data) => {
      sendResponse({ state: data?.devManipulatorState || FALLBACK_STATE });
    });
    return true;
  }

  if (message?.type === 'ADD_INTERCEPT_LOG') {
    const newEntry: InterceptLogEntry = message.entry;
    logQueue = logQueue
      .then(async () => {
        const data = await extApi.storage.local.get('devManipulatorLogs');
        const currentLogs: InterceptLogEntry[] = Array.isArray(
          data?.devManipulatorLogs
        )
          ? data.devManipulatorLogs
          : [];
        const updatedLogs = [newEntry, ...currentLogs].slice(0, 120);
        await extApi.storage.local.set({ devManipulatorLogs: updatedLogs });
      })
      .catch(() => {});
    logQueue.then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

extApi.storage?.onChanged?.addListener((changes, area) => {
  if (area === 'local' && changes.devManipulatorState?.newValue) {
    const next = changes.devManipulatorState.newValue as ExtensionState;
    void syncAllRules(next);
  }
});
