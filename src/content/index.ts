// Self-contained ISOLATED world bridge (no DOM <script> tag injection -> zero CSP / Unsafe URL errors)
const extApi: typeof chrome =
  (globalThis as unknown as { browser?: typeof chrome }).browser ||
  globalThis.chrome;

function isContextValid(): boolean {
  try {
    return Boolean(extApi?.runtime?.id);
  } catch {
    return false;
  }
}

function sendRulesToInjectedScript() {
  if (!isContextValid()) return;
  try {
    extApi.runtime.sendMessage({ type: 'GET_STATE_FOR_TAB' }, (response) => {
      if (extApi.runtime.lastError) {
        return;
      }
      if (response?.state) {
        window.postMessage(
          {
            source: 'DEV_MANIPULATOR_CONTENT',
            type: 'UPDATE_RULES',
            state: response.state,
          },
          '*'
        );
      }
    });
  } catch {
    // Ignore invalidated context when extension reloads
  }
}

// Push initial rules at document_start
sendRulesToInjectedScript();

// Relay live rule updates from background worker to MAIN world
if (isContextValid()) {
  extApi.runtime.onMessage.addListener((message) => {
    if (message?.type === 'STATE_UPDATED' && message.state) {
      window.postMessage(
        {
          source: 'DEV_MANIPULATOR_CONTENT',
          type: 'UPDATE_RULES',
          state: message.state,
        },
        '*'
      );
    }
  });
}

// Relay intercept logs and readiness handshake from MAIN world
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== 'DEV_MANIPULATOR_INJECTED') return;

  if (!isContextValid()) return;

  if (data.type === 'INJECTED_READY') {
    sendRulesToInjectedScript();
  } else if (data.type === 'LOG_INTERCEPT' && data.entry) {
    try {
      extApi.runtime.sendMessage(
        {
          type: 'ADD_INTERCEPT_LOG',
          entry: data.entry,
        },
        () => {
          void extApi.runtime.lastError;
        }
      );
    } catch {
      // Ignore
    }
  }
});
