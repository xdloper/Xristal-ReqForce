import { ExtensionState, Profile } from '../types/extension';

export const extApi: typeof chrome =
  (globalThis as unknown as { browser?: typeof chrome }).browser ||
  globalThis.chrome;

export const DEFAULT_PROFILES: Profile[] = [
  {
    id: 'default-dev',
    name: 'Default Workspace',
    color: '#3b82f6',
    telepresence: {
      enabled: false,
      interceptId: '',
      baggageHeader: '',
      customHeaderName: 'x-request-env',
      customHeaderValue: 'local-dev',
      targetDomainFilter: '*',
      propagateBaggage: true,
      envoyForceTrace: false,
    },
    headerRules: [
      {
        id: 'hdr-1',
        enabled: false,
        name: 'x-debug-mode',
        value: 'true',
        operation: 'set',
        target: 'request',
        urlFilter: '*://localhost/*',
        comment: 'Enable backend debug mode (scoped to localhost by default)',
      },
      {
        id: 'hdr-2',
        enabled: false,
        name: 'Authorization',
        value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        operation: 'set',
        target: 'request',
        urlFilter: '*://localhost/*',
        comment: 'Inject JWT Token',
      },
      {
        id: 'hdr-3',
        enabled: false,
        name: 'Cache-Control',
        value: 'no-cache, no-store, must-revalidate',
        operation: 'set',
        target: 'request',
        urlFilter: '*://localhost/*',
        comment: 'Bypass cache',
      },
    ],
    bodyRules: [
      {
        id: 'body-1',
        enabled: false,
        name: 'Feature Flags Override',
        urlPattern: '/api/v1/features',
        isRegex: false,
        method: 'ALL',
        mode: 'merge_response_json',
        statusCode: 200,
        delayMs: 0,
        contentType: 'application/json',
        bodyContent: JSON.stringify(
          {
            betaDashboard: true,
            newCheckoutFlow: true,
            manipulatedBy: 'ReqForce',
          },
          null,
          2
        ),
      },
      {
        id: 'body-2',
        enabled: false,
        name: 'Mock 503 Maintenance Response',
        urlPattern: '/api/v1/checkout',
        isRegex: false,
        method: 'POST',
        mode: 'replace_response',
        statusCode: 503,
        delayMs: 800,
        contentType: 'application/json',
        bodyContent: JSON.stringify(
          {
            error: 'SERVICE_UNAVAILABLE',
            message: 'Simulated maintenance response',
          },
          null,
          2
        ),
      },
    ],
    redirectCorsRules: [
      {
        id: 'cors-1',
        enabled: false,
        name: 'Allow CORS on All Domains',
        type: 'cors_bypass',
        sourceUrlFilter: '*://localhost/*',
      },
    ],
  },
  {
    id: 'staging-profile',
    name: 'Staging / QA',
    color: '#10b981',
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
];

export const INITIAL_STATE: ExtensionState = {
  globalEnabled: true,
  trafficMonitorEnabled: true,
  locale: 'system',
  theme: 'system',
  activeProfileId: 'default-dev',
  profiles: DEFAULT_PROFILES,
  logs: [],
};

export async function loadExtensionState(): Promise<ExtensionState> {
  try {
    if (!extApi?.storage?.local) return INITIAL_STATE;
    const data = await extApi.storage.local.get('devManipulatorState');
    if (data && data.devManipulatorState) {
      const loaded = {
        ...INITIAL_STATE,
        ...data.devManipulatorState,
        trafficMonitorEnabled:
          data.devManipulatorState.trafficMonitorEnabled ?? true,
        locale: data.devManipulatorState.locale ?? 'system',
        theme: data.devManipulatorState.theme ?? 'system',
      };

      // Safety migration: disable globally-scoped sample header that broke cookies/auth on real sites
      let mutated = false;
      const profiles = (loaded.profiles || []).map((p: Profile) => {
        const headerRules = (p.headerRules || []).map((r) => {
          if (
            r.enabled &&
            r.name.toLowerCase() === 'x-debug-mode' &&
            (!r.urlFilter || r.urlFilter === '*')
          ) {
            mutated = true;
            return { ...r, enabled: false, urlFilter: '*://localhost/*' };
          }
          return r;
        });
        const bodyRules = (p.bodyRules || []).map((r) => {
          if (r.enabled && r.id === 'body-1') {
            mutated = true;
            return { ...r, enabled: false };
          }
          return r;
        });
        return { ...p, headerRules, bodyRules };
      });

      const next = { ...loaded, profiles };
      if (mutated) {
        await extApi.storage.local.set({ devManipulatorState: next });
        extApi.runtime?.sendMessage({ type: 'SYNC_STATE', state: next }, () => {
          void extApi.runtime?.lastError;
        });
      }
      return next;
    }
    await extApi.storage.local.set({ devManipulatorState: INITIAL_STATE });
    return INITIAL_STATE;
  } catch {
    return INITIAL_STATE;
  }
}

export async function saveExtensionState(
  state: ExtensionState,
  options?: { replaceLogs?: boolean }
): Promise<void> {
  try {
    if (!extApi?.storage?.local) return;
    // Always persist immediately to chrome.storage.local so closing the popup never loses state
    const existing = await extApi.storage.local.get('devManipulatorState');
    const prevLogs = existing?.devManipulatorState?.logs;
    const keepExistingLogs =
      !options?.replaceLogs &&
      Array.isArray(prevLogs) &&
      prevLogs.length > 0 &&
      (!state.logs || state.logs.length < prevLogs.length);
    const mergedState: ExtensionState = {
      ...state,
      logs: keepExistingLogs ? prevLogs : state.logs || [],
    };
    await extApi.storage.local.set({ devManipulatorState: mergedState });

    if (extApi.runtime?.sendMessage) {
      extApi.runtime.sendMessage(
        {
          type: 'SYNC_STATE',
          state: mergedState,
          replaceLogs: Boolean(options?.replaceLogs),
        },
        () => {
          void extApi.runtime?.lastError;
        }
      );
    }
  } catch {
    // Ignore
  }
}
