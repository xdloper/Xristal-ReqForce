import { ExtensionState, InterceptLogEntry, Profile } from '../types/extension';
import { extApi, INITIAL_STATE } from '../utils/browser';

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

function normalizeUrlFilter(filter: string): string {
  const trimmed = (filter || '').trim();
  if (!trimmed || trimmed === '*' || trimmed === '<all_urls>') {
    return '*';
  }
  return trimmed;
}

function buildDnrRules(state: ExtensionState): chrome.declarativeNetRequest.Rule[] {
  if (!state.globalEnabled) return [];

  const activeProfile: Profile | undefined =
    state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];

  if (!activeProfile) return [];

  const rules: chrome.declarativeNetRequest.Rule[] = [];
  let ruleIdCounter = 1;

  // 1. Telepresence Quick Config Rules
  const tp = activeProfile.telepresence;
  if (tp && tp.enabled) {
    const tpHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = [];

    if (tp.interceptId.trim()) {
      tpHeaders.push({
        header: 'x-telepresence-intercept-id',
        operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
        value: tp.interceptId.trim(),
      });

      if (tp.propagateBaggage) {
        const baggageVal = tp.baggageHeader.trim()
          ? tp.baggageHeader.trim()
          : `telepresence-intercept-id=${tp.interceptId.trim()}`;
        tpHeaders.push({
          header: 'baggage',
          operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
          value: baggageVal,
        });
      }
    } else if (tp.baggageHeader.trim()) {
      tpHeaders.push({
        header: 'baggage',
        operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
        value: tp.baggageHeader.trim(),
      });
    }

    if (tp.customHeaderName.trim() && tp.customHeaderValue.trim()) {
      tpHeaders.push({
        header: tp.customHeaderName.trim(),
        operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
        value: tp.customHeaderValue.trim(),
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

  // 2. Custom Request & Response Header Rules
  for (const hRule of activeProfile.headerRules) {
    if (!hRule.enabled || !hRule.name.trim()) continue;

    const headerInfo: chrome.declarativeNetRequest.ModifyHeaderInfo = {
      header: hRule.name.trim(),
      operation: hRule.operation as chrome.declarativeNetRequest.HeaderOperation,
    };

    if (hRule.operation !== 'remove') {
      headerInfo.value = hRule.value;
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

  // 3. Redirect & CORS Bypass Rules
  for (const rcRule of activeProfile.redirectCorsRules) {
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
            {
              header: 'Access-Control-Allow-Credentials',
              operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
              value: 'true',
            },
          ],
        },
        condition: {
          ...(urlFilter !== '*' ? { urlFilter } : {}),
          resourceTypes: ALL_RESOURCE_TYPES,
        },
      });
    } else if (rcRule.type === 'redirect' && rcRule.destinationUrl?.trim()) {
      const dest = rcRule.destinationUrl.trim();
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
    }
  }

  return rules;
}

function countActiveRules(state: ExtensionState): number {
  if (!state.globalEnabled) return 0;
  const activeProfile =
    state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];
  if (!activeProfile) return 0;

  let count = 0;
  const tp = activeProfile.telepresence;
  if (
    tp?.enabled &&
    (tp.interceptId.trim() ||
      tp.baggageHeader.trim() ||
      (tp.customHeaderName.trim() && tp.customHeaderValue.trim()) ||
      tp.envoyForceTrace)
  ) {
    count += 1;
  }
  count += activeProfile.headerRules.filter((r) => r.enabled && r.name.trim()).length;
  count += activeProfile.bodyRules.filter((r) => r.enabled && r.urlPattern.trim()).length;
  count += activeProfile.redirectCorsRules.filter((r) => r.enabled).length;
  return count;
}

async function syncAllRules(state?: ExtensionState) {
  try {
    let currentState = state;
    if (!currentState) {
      const stored = await extApi.storage.local.get('devManipulatorState');
      currentState = stored?.devManipulatorState || INITIAL_STATE;
    }

    if (!currentState) return;

    // Update declarativeNetRequest dynamic rules
    if (extApi.declarativeNetRequest) {
      const existingRules = await extApi.declarativeNetRequest.getDynamicRules();
      const removeRuleIds = existingRules.map((r) => r.id);
      const addRules = buildDnrRules(currentState);

      await extApi.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules,
      });
    }

    // Update Action Badge
    const activeCount = countActiveRules(currentState);
    if (extApi.action) {
      if (!currentState.globalEnabled) {
        await extApi.action.setBadgeText({ text: 'OFF' });
        await extApi.action.setBadgeBackgroundColor({ color: '#64748b' });
      } else if (activeCount > 0) {
        await extApi.action.setBadgeText({ text: String(activeCount) });
        await extApi.action.setBadgeBackgroundColor({ color: '#4f46e5' });
      } else {
        await extApi.action.setBadgeText({ text: '' });
      }
    }

    // Broadcast updated state to all open tabs so content/injected scripts update immediately
    if (extApi.tabs) {
      const tabs = await extApi.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          extApi.tabs
            .sendMessage(tab.id, {
              type: 'STATE_UPDATED',
              state: currentState,
            })
            .catch(() => {
              // Ignore tabs where content script isn't running (e.g. chrome://)
            });
        }
      }
    }
  } catch (err) {
    console.error('[DevManipulator] Error syncing rules:', err);
  }
}

// Initialize on install or startup
extApi.runtime.onInstalled.addListener(async () => {
  const stored = await extApi.storage.local.get('devManipulatorState');
  if (!stored?.devManipulatorState) {
    await extApi.storage.local.set({ devManipulatorState: INITIAL_STATE });
  }
  await syncAllRules(stored?.devManipulatorState || INITIAL_STATE);
});

extApi.runtime.onStartup?.addListener(() => {
  syncAllRules();
});

// Listen for messages from Popup or Content Script
extApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SYNC_STATE') {
    syncAllRules(message.state).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === 'GET_STATE_FOR_TAB') {
    extApi.storage.local.get('devManipulatorState').then((data) => {
      sendResponse({ state: data?.devManipulatorState || INITIAL_STATE });
    });
    return true;
  }

  if (message?.type === 'ADD_INTERCEPT_LOG') {
    const newEntry: InterceptLogEntry = message.entry;
    extApi.storage.local.get('devManipulatorState').then(async (data) => {
      const st: ExtensionState = data?.devManipulatorState || INITIAL_STATE;
      const updatedLogs = [newEntry, ...(st.logs || [])].slice(0, 80);
      const nextState: ExtensionState = { ...st, logs: updatedLogs };
      await extApi.storage.local.set({ devManipulatorState: nextState });
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});
