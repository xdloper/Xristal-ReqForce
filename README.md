<div align="left">
  <img src="public/icons/logo.svg" width="56" height="56" alt="ReqForge Logo" />
</div>

# ReqForge

[![CI](https://github.com/xdloper/dev-browser-manipulations/actions/workflows/ci.yml/badge.svg)](https://github.com/xdloper/dev-browser-manipulations/actions/workflows/ci.yml)
[![Release](https://github.com/xdloper/dev-browser-manipulations/actions/workflows/release.yml/badge.svg)](https://github.com/xdloper/dev-browser-manipulations/actions/workflows/release.yml)
[![Version](https://img.shields.io/github/v/release/xdloper/dev-browser-manipulations)](https://github.com/xdloper/dev-browser-manipulations/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**ReqForge** is an open-source, zero-telemetry Manifest V3 browser extension by **Xristal** for intercepting and mutating HTTP headers, overriding `fetch` / `XMLHttpRequest` payloads, mocking REST endpoints, injecting URL query parameters, bypassing CORS, and propagating distributed tracing / Kubernetes context headers across **Chrome, Edge, Brave, and Firefox**.

---

## Features

| Feature | Layer | Details |
| :--- | :--- | :--- |
| **HTTP Header Manipulation** | Network (`declarativeNetRequest`) + Page | `Set`, `Append`, or `Remove` any request or response header (`Authorization`, `X-API-Key`, `Cache-Control`, `Content-Security-Policy`, `X-Forwarded-For`). |
| **JSON Shallow Merge** | Page (`MAIN` world `fetch` / `XHR`) | Patch individual keys inside incoming JSON responses or outgoing JSON requests while keeping the rest of the server payload intact. |
| **Endpoint Mocking & Chaos** | Page (`MAIN` world `fetch` / `XHR`) | Short-circuit endpoints with custom payloads, custom HTTP status codes (`200`, `401`, `429`, `503`), and simulated latency (`ms`). |
| **cURL Importer** | Popup Workspace | Paste raw **Copy as cURL** output from browser DevTools to extract `-H` headers and `--data-raw` payloads into active rules. |
| **CORS Bypass & `307` Redirects** | Network (`declarativeNetRequest`) | Inject `Access-Control-Allow-*` response headers and route production/staging URLs to `http://localhost:<port>` via wildcard or regex capture groups. |
| **Query String Mutation** | Network (`queryTransform`) | Automatically append or overwrite URL query parameters (e.g., `?debug=1`, `?version=canary`) across matching requests. |
| **Mesh & Cluster Context** | Network + Page | Optional propagation for W3C OpenTelemetry `baggage`, `x-envoy-force-trace`, multi-tenant headers, and `x-telepresence-intercept-id`. |
| **Workspaces & Domain Pinning** | `storage.local` | Isolated profiles (`Local`, `Staging`, `QA`), one-click **Pin Domain** to the active tab hostname, JSON export/import. |
| **Live Traffic Inspector** | Page → Popup | Monitor outgoing `fetch` / `XHR` (method, URL, status, credentials mode, visible headers). Mutated rows are highlighted so you can disable the offending rule. Toggle **Monitor all fetch/XHR** on/off. |
| **Safe Pass-Through** | Page interceptor | When no rule matches, original `fetch` / `XHR` is left untouched — cookies, credentials, and Bearer sessions stay intact. Cookie / Authorization are never injected from the page world. |
| **ACTIVE / PAUSED Master Toggle** | Popup + All layers | One switch pauses every header, redirect, body, and context rule instantly; paused banner with **Enable Now**. |
| **Language (EN / TR / Auto)** | Settings | Follows OS/browser language by default (`tr*` → Turkish, otherwise English). Force **EN** or **TR** anytime; preference is persisted. |
| **Theme (Light / Dark / Auto)** | Settings | Follows OS color scheme by default. Force **Light** or **Dark**; tokens drive the whole popup surface. |
| **Settings Hub** | Popup | Language & Theme first, then Version / About, then Workspace & Data (export, import, reload tab). |
| **Header Templates & Bulk Actions** | Popup Workspace | Quick templates (Bearer, API Key, No Cache, Spoof IP, Tenant ID, Strip CSP), duplicate rules, Enable All / Disable All. |
| **Wildcard Safety Warning** | Popup UI | Warns when auth-sensitive headers (`Authorization`, `Cookie`, `x-debug-mode`) run on URL filter `*` — prefer Pin Domain. |
| **MAIN-World Injection** | Content scripts | Native MV3 `"world": "MAIN"` interceptor (no `chrome-extension://` script tags). YouTube / Google Video / reCAPTCHA frames excluded to avoid CSP / Unsafe URL noise. |
| **Zero Telemetry** | Entire extension | 100% local — no analytics, remote scripts, or external servers. Rules stay in `storage.local`. |
| **Multi-Browser MV3 Builds** | `dist/` | Ready-to-load bundles for **Chrome**, **Edge/Brave**, and **Firefox** from every SemVer release. |

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Popup Workspace (React + TypeScript + Tailwind)                         │
│  • Workspaces, cURL Parser, Rule Editor, Domain Pinning, Traffic Log    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ chrome.storage.local + SYNC_STATE
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────────────────────┐   ┌─────────────────────────────────┐
│ Service Worker (background.js)    │   │ Content Bridge (content.js)     │
│  • declarativeNetRequest engine   │   │  • Injects scripts/injected.js  │
│  • Wire-level Req/Res Headers     │   │    at document_start            │
│  • CORS Override & 307 Redirects  │   │  • Relays live state & logs     │
│  • URL Query Param Transforms     │   └───────────────┬─────────────────┘
└───────────────────────────────────┘                   ▼
                                        ┌─────────────────────────────────┐
                                        │ Page Interceptor (injected.js)  │
                                        │  • Wraps window.fetch & XHR     │
                                        │  • Shallow JSON Merge & Mocks   │
                                        │  • Status Code & Delay Override │
                                        └─────────────────────────────────┘
```

---

## Engineering Use Cases

### 1. Feature Flag & Role Overriding (Response Shallow Merge)

Test UI states gated behind backend permissions or feature flags without changing frontend source code or database rows:

- **Target:** `GET /api/v1/session`
- **Strategy:** `Response: Shallow Merge JSON Keys`
- **Payload:**
  ```json
  {
    "role": "SUPER_ADMIN",
    "features": {
      "newCheckoutFlow": true,
      "betaAnalytics": true
    }
  }
  ```
- **Outcome:** Real API fields (`userId`, `email`, `org`) remain untouched; only `role` and `features` are patched before the application consumes the response.

### 2. Chaos Testing & Unbuilt API Mocking

Verify how frontend components handle `429 Too Many Requests`, `503 Service Unavailable`, or slow networks:

- **Target:** `POST /api/v1/payments/charge`
- **Strategy:** `Response: Full Body Replace (Mock Endpoint)`
- **HTTP Status:** `503` · **Delay:** `2000 ms`
- **Payload:**
  ```json
  {
    "error": "GATEWAY_TIMEOUT",
    "retryAfterSeconds": 30
  }
  ```

### 3. Hybrid Localhost Routing + CORS Unblock

Keep using a hosted staging frontend while routing a single API service to your local machine:

- **Redirect Source:** `^https://api\.staging\.example\.com/v2/orders/(.*)`
- **Redirect Destination:** `http://localhost:8080/v2/orders/\1`
- **Companion Rule:** Enable `+ CORS Bypass` on `*` to prevent cross-origin preflight failures between the staging origin and `localhost`.

### 4. Instant cURL Replay & Mutation

1. Copy any request from Chrome/Firefox DevTools via **Copy → Copy as cURL**.
2. Open **ReqForge** → **Import cURL** → paste the command.
3. All `-H` request headers and `--data-raw` request bodies are parsed into editable, toggleable rules scoped to that host.

### 5. Distributed Tracing & Kubernetes Service Mesh Routing

When working against shared Kubernetes clusters (Envoy, Istio, OpenTelemetry, or Telepresence), enable **Cluster & Mesh Context Propagation** under **CORS, Query & Routing** to attach routing metadata (`baggage`, `x-envoy-force-trace`, `x-telepresence-intercept-id`) only to your browser's traffic.

---

## Pre-Built Output Structure (`dist/`)

Every release builds clean, standalone, hash-free browser bundles under `dist/`:

```text
dist/
├── chrome/
│   ├── icons/
│   ├── index.html
│   ├── manifest.json
│   ├── scripts/
│   │   ├── background.js
│   │   ├── content.js
│   │   ├── injected.js
│   │   └── popup.js
│   └── styles/
│       └── popup.css
├── edge/
│   └── (Chromium-optimized bundle)
└── firefox/
    └── (Gecko MV3 bundle)
```

---

## Installation

Download a packaged `.zip` from [GitHub Releases](https://github.com/xdloper/dev-browser-manipulations/releases) or load directly from `dist/`:

- **Chrome / Brave:** Open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `dist/chrome`.
- **Microsoft Edge:** Open `edge://extensions` → enable **Developer mode** → **Load unpacked** → select `dist/edge`.
- **Mozilla Firefox:** Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on...** → select `dist/firefox/manifest.json`.

---

## Development & Semantic Versioning

```bash
git clone https://github.com/xdloper/dev-browser-manipulations.git
cd dev-browser-manipulations
npm install

# Build dist/chrome, dist/edge, and dist/firefox
npm run build

# Watch mode during development
npm run dev
```

Releases follow [Semantic Versioning](https://semver.org/) and automatically synchronize `package.json`, `public/manifest.json`, `dist/*`, git commits, and git tags:

```bash
npm run release:patch   # 1.3.0 -> 1.3.1
npm run release:minor   # 1.3.0 -> 1.4.0
npm run release:major   # 1.3.0 -> 2.0.0
```

---

## Privacy & Permissions

- **100% Local Execution:** No analytics, telemetry, remote scripts, or external servers. All rules and workspaces stay in `storage.local`.
- **`declarativeNetRequest` / `declarativeNetRequestWithHostAccess`:** Applies network-level header rules, query transforms, and URL redirects.
- **`scripting` & `<all_urls>`:** Injects the local page-level `fetch`/`XHR` interceptor at `document_start` on matching HTTP/HTTPS pages.

---

## Author & License

Created and maintained by **Xristal**.
Released under the [MIT License](./LICENSE).
