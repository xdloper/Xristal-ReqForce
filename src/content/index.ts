// Self-contained content script (no shared imports so Rollup emits a pure classic script)
const extApi: typeof chrome =
  (globalThis as unknown as { browser?: typeof chrome }).browser ||
  globalThis.chrome;

function injectInterceptorScript() {
  try {
    const container = document.head || document.documentElement;
    if (!container) return;

    const script = document.createElement('script');
    script.src = extApi.runtime.getURL('injected.js');
    script.dataset.devManipulator = 'true';
    script.onload = () => {
      script.remove();
      sendRulesToInjectedScript();
    };
    container.prepend(script);
  } catch {
    // Ignore restricted pages
  }
}

function sendRulesToInjectedScript() {
  extApi.runtime
    .sendMessage({ type: 'GET_STATE_FOR_TAB' })
    .then((response) => {
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
    })
    .catch(() => {});
}

// Run injection immediately at document_start
injectInterceptorScript();

// Listen for state updates from background script
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

// Listen for intercept logs emitted by injected script in MAIN world
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== 'DEV_MANIPULATOR_INJECTED') return;

  if (data.type === 'LOG_INTERCEPT' && data.entry) {
    extApi.runtime
      .sendMessage({
        type: 'ADD_INTERCEPT_LOG',
        entry: data.entry,
      })
      .catch(() => {});
  }

  if (data.type === 'INJECTED_READY') {
    sendRulesToInjectedScript();
  }
});
