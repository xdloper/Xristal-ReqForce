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
        enabled: true,
        name: 'x-debug-mode',
        value: 'true',
        operation: 'set',
        target: 'request',
        urlFilter: '*',
        comment: 'Enable backend debug mode',
      },
      {
        id: 'hdr-2',
        enabled: false,
        name: 'Authorization',
        value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        operation: 'set',
        target: 'request',
        urlFilter: '*',
        comment: 'Inject JWT Token',
      },
      {
        id: 'hdr-3',
        enabled: false,
        name: 'Cache-Control',
        value: 'no-cache, no-store, must-revalidate',
        operation: 'set',
        target: 'request',
        urlFilter: '*',
        comment: 'Bypass cache',
      },
    ],
    bodyRules: [
      {
        id: 'body-1',
        enabled: true,
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
            manipulatedBy: 'ReqForge',
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
        sourceUrlFilter: '*',
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
  activeProfileId: 'default-dev',
  profiles: DEFAULT_PROFILES,
  logs: [],
};

export async function loadExtensionState(): Promise<ExtensionState> {
  try {
    if (!extApi?.storage?.local) return INITIAL_STATE;
    const data = await extApi.storage.local.get('devManipulatorState');
    if (data && data.devManipulatorState) {
      return {
        ...INITIAL_STATE,
        ...data.devManipulatorState,
      };
    }
    await extApi.storage.local.set({ devManipulatorState: INITIAL_STATE });
    return INITIAL_STATE;
  } catch {
    return INITIAL_STATE;
  }
}

export async function saveExtensionState(state: ExtensionState): Promise<void> {
  try {
    if (!extApi?.storage?.local) return;
    await extApi.storage.local.set({ devManipulatorState: state });
    extApi.runtime?.sendMessage({ type: 'SYNC_STATE', state }, () => {
      void extApi.runtime?.lastError;
    });
  } catch {
    // Ignore
  }
}
