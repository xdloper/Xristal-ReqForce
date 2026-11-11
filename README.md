# HTTP Interceptor & Telepresence

[![CI](https://github.com/xdloper/dev-browser-manipulations/actions/workflows/ci.yml/badge.svg)](https://github.com/xdloper/dev-browser-manipulations/actions/workflows/ci.yml)
[![Release](https://github.com/xdloper/dev-browser-manipulations/actions/workflows/release.yml/badge.svg)](https://github.com/xdloper/dev-browser-manipulations/actions/workflows/release.yml)
[![GitHub release](https://img.shields.io/github/v/release/xdloper/dev-browser-manipulations)](https://github.com/xdloper/dev-browser-manipulations/releases)

A lightweight Manifest V3 browser extension for Chrome, Edge, Brave, and Firefox to manipulate HTTP headers, mutate `fetch` / `XMLHttpRequest` bodies, bypass CORS restrictions, and route traffic through Kubernetes Telepresence intercepts.

Built because many legacy header extensions were removed from browser stores or migrated behind paywalls and telemetry trackers. This project runs entirely locally with zero external network calls.

---

## Features

- **Request & Response Headers (`declarativeNetRequest`)**
  - `SET`, `ADD`, or `DEL` any HTTP request or response header at the network layer.
  - Scope rules by URL wildcard patterns (`*`, `*://*.example.com/*`).
- **Kubernetes Telepresence Integration**
  - Dedicated workflow for `x-telepresence-intercept-id` and W3C OpenTelemetry `baggage` propagation (`baggage: telepresence-intercept-id=...`).
  - Paste raw `telepresence status` / `telepresence intercept` terminal output to extract the intercept ID automatically.
  - Optional `x-envoy-force-trace: true` and custom developer context headers.
- **Request & Response Body Override (`fetch` & `XHR`)**
  - **Shallow Merge JSON**: Patch specific keys into incoming JSON responses or outgoing JSON requests (e.g., toggling feature flags) without breaking the rest of the payload.
  - **Full Body Replace (Mocking)**: Short-circuit or overwrite responses with custom JSON/text payloads, custom HTTP status codes (`200`, `400`, `401`, `500`), and simulated network latency (`ms`).
- **CORS Override & URL Redirects**
  - Inject permissive `Access-Control-Allow-*` response headers for local development.
  - Redirect production API endpoints (via wildcard or regex substitution) to `http://localhost:<port>`.
- **Profiles & Portable Config**
  - Switch between isolated profiles (e.g., `Local Dev`, `Staging`, `QA`) and export/import configurations as JSON.

---

## Build Output Structure (`dist/`)

Pre-built bundles for each browser are organized cleanly under `dist/`:

```text
dist/
├── chrome/
│   ├── index.html
│   ├── manifest.json
│   ├── scripts/
│   │   ├── background.js
│   │   ├── browser.js
│   │   ├── content.js
│   │   ├── injected.js
│   │   └── popup.js
│   └── styles/
│       └── popup.css
├── edge/
│   ├── index.html
│   ├── manifest.json
│   ├── scripts/
│   └── styles/
└── firefox/
    ├── index.html
    ├── manifest.json
    ├── scripts/
    └── styles/
```

---

## Architecture

| Layer | File | Responsibility |
| :--- | :--- | :--- |
| **Background Worker** | `src/background/index.ts` | Translates active profile rules into browser-native `declarativeNetRequest` dynamic rules for network-level header modification, CORS headers, and `307` redirects. |
| **Content Script** | `src/content/index.ts` | Injects the page-context interceptor at `document_start` and bridges state updates between `chrome.storage` and the page. |
| **Page Interceptor** | `src/injected/index.ts` | Wraps `window.fetch` and `window.XMLHttpRequest` in the `MAIN` world to mutate request/response bodies, status codes, and artificial delays. |
| **Popup UI** | `src/App.tsx` | React + TypeScript + Tailwind CSS interface modeled after browser DevTools. |

---

## Getting Started

### Prerequisites

- Node.js `>= 18`
- npm `>= 9`

### Build from Source

```bash
git clone https://github.com/xdloper/dev-browser-manipulations.git
cd dev-browser-manipulations
npm install
npm run build
```

For active development:

```bash
npm run dev
```

---

## Installation

You can either download the latest `.zip` archive from [GitHub Releases](https://github.com/xdloper/dev-browser-manipulations/releases) or load directly from `dist/`:

### Google Chrome / Brave

1. Open `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select `dist/chrome`.

### Microsoft Edge

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `dist/edge`.

### Mozilla Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `dist/firefox/manifest.json`.

---

## Usage Examples

### 1. Routing Traffic to a Local Telepresence Intercept

1. Start an intercept in your terminal:
   ```bash
   telepresence intercept my-service --port 8080:80
   ```
2. Copy the `x-telepresence-intercept-id` from the CLI output.
3. Open the extension → **Telepresence** tab → paste the output.
4. All matching browser requests will now carry `x-telepresence-intercept-id` and `baggage` headers.

### 2. Overriding a Single Key in an API Response

1. Open **Body Override** → click **+ New**.
2. Set Method to `GET`, URL Match to `/api/v1/user/permissions`, and Action Mode to `Response: Shallow Merge JSON`.
3. Provide the keys you want to override:
   ```json
   {
     "isAdmin": true,
     "betaFeaturesEnabled": true
   }
   ```
4. The original API response remains intact except for the merged keys.

### 3. Redirecting Production API Calls to Localhost

1. Open **CORS / Redirect** → click **+ URL Redirect**.
2. Source URL filter:
   ```text
   ^https://api\.example\.com/v1/(.*)
   ```
3. Destination URL:
   ```text
   http://localhost:8080/v1/\1
   ```

---

## Privacy & Permissions

- **`declarativeNetRequest` / `declarativeNetRequestWithHostAccess`**: Required to modify HTTP headers and redirect requests.
- **`storage`**: Stores your profiles and rules locally in `chrome.storage.local`.
- **`scripting` & `<all_urls>`**: Required to inject the `fetch`/`XHR` body override script at `document_start`.

No analytics, tracking scripts, or external servers are used.

---

## License

[MIT](./LICENSE)
