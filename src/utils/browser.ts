import { ExtensionState, Profile } from '../types/extension';

// Cross-browser API wrapper (works seamlessly in Chrome, Edge, Brave, Opera, and Firefox)
export const extApi: typeof chrome =
  (globalThis as unknown as { browser?: typeof chrome }).browser ||
  globalThis.chrome;

export const DEFAULT_PROFILES: Profile[] = [
  {
    id: 'default-telepresence',
    name: 'Telepresence & Local Dev',
    color: '#6366f1',
    telepresence: {
      enabled: true,
      interceptId: '',
      baggageHeader: '',
      customHeaderName: 'x-dev-user',
      customHeaderValue: 'local-developer',
      targetDomainFilter: '*',
      propagateBaggage: true,
      envoyForceTrace: false,
    },
    headerRules: [
      {
        id: 'tp-sample-1',
        enabled: false,
        name: 'x-telepresence-intercept-id',
        value: 'my-laptop-intercept-01',
        operation: 'set',
        target: 'request',
        urlFilter: '*',
        comment: 'Kubernetes Telepresence Intercept ID',
        isTelepresence: true,
      },
      {
        id: 'hdr-sample-2',
        enabled: false,
        name: 'x-debug-mode',
        value: 'true',
        operation: 'set',
        target: 'request',
        urlFilter: '*',
        comment: 'Backend debug flag',
      },
      {
        id: 'hdr-sample-3',
        enabled: false,
        name: 'Cache-Control',
        value: 'no-cache, no-store, must-revalidate',
        operation: 'set',
        target: 'request',
        urlFilter: '*',
        comment: 'Disable cache during debugging',
      },
    ],
    bodyRules: [
      {
        id: 'body-sample-1',
        enabled: false,
        name: 'Override Feature Flags JSON',
        urlPattern: '/api/v1/features',
        isRegex: false,
        method: 'GET',
        mode: 'merge_response_json',
        statusCode: 200,
        delayMs: 0,
        contentType: 'application/json',
        bodyContent: JSON.stringify(
          {
            betaDashboard: true,
            telepresenceDebugBanner: true,
            maxUploadSizeMb: 500,
          },
          null,
          2
        ),
      },
      {
        id: 'body-sample-2',
        enabled: false,
        name: 'Inject Dev Flag into POST Request Body',
        urlPattern: '/api/v1/checkout',
        isRegex: false,
        method: 'POST',
        mode: 'merge_request_json',
        delayMs: 0,
        bodyContent: JSON.stringify(
          {
            dryRun: true,
            debugEnvironment: 'telepresence-local',
          },
          null,
          2
        ),
      },
    ],
    redirectCorsRules: [
      {
        id: 'cors-sample-1',
        enabled: false,
        name: 'Allow CORS on All API Responses',
        type: 'cors_bypass',
        sourceUrlFilter: '*',
      },
    ],
  },
  {
    id: 'staging-env',
    name: 'Staging / QA Test',
    color: '#10b981',
    telepresence: {
      enabled: false,
      interceptId: '',
      baggageHeader: '',
      customHeaderName: 'x-staging-env',
      customHeaderValue: 'qa-cluster',
      targetDomainFilter: '*',
      propagateBaggage: false,
      envoyForceTrace: false,
    },
    headerRules: [],
    bodyRules: [],
    redirectCorsRules: [],
  },
];

export const INITIAL_STATE: ExtensionState = {
  globalEnabled: true,
  activeProfileId: 'default-telepresence',
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
  } catch (err) {
    console.error('Failed to load state:', err);
    return INITIAL_STATE;
  }
}

export async function saveExtensionState(state: ExtensionState): Promise<void> {
  try {
    if (!extApi?.storage?.local) return;
    await extApi.storage.local.set({ devManipulatorState: state });
    // Notify background script to resync declarativeNetRequest rules & content scripts
    extApi.runtime?.sendMessage({ type: 'SYNC_STATE', state }).catch(() => {});
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}
