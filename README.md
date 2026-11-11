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

## Use Cases & Examples

### 1. Kubernetes & Microservice Context Routing

In shared Kubernetes clusters (using Telepresence, Envoy, Istio, or OpenTelemetry), routing specific browser requests to an isolated service instance without affecting other users requires propagating context headers across the call graph.

- **Headers injected:**
  ```http
  x-telepresence-intercept-id: 9842a1b2-c3d4:order-service
  baggage: telepresence-intercept-id=9842a1b2-c3d4:order-service
  x-envoy-force-trace: true
  ```
- **Result:** The ingress gateway and downstream services route only your browser session's traffic to the target pod or local workload while production/staging traffic continues normally.

### 2. Feature Flag & Permission Testing (`Body Override`)

Instead of modifying frontend code or changing database records to test UI states, patch specific JSON fields on the fly using **Response: Shallow Merge JSON**.

- **Target:** `GET /api/v1/user/session`
- **Override Payload:**
  ```json
  {
    "role": "SUPER_ADMIN",
    "features": {
      "newBillingFlow": true,
      "auditLogsEnabled": true
    }
  }
  ```
- **Result:** All existing fields from the real API response are preserved, and only `role` and `features` are overwritten before the frontend application reads the response.

### 3. Mocking Unbuilt Endpoints & Simulating Failures

Test how the frontend handles edge cases (`401 Unauthorized`, `429 Too Many Requests`, `500 Internal Server Error`) or high network latency before the backend endpoint is ready.

- **Target:** `POST /api/v1/payments/checkout`
- **Mode:** `Response: Replace Full Body (Mock)`
- **Status Code:** `503` | **Delay:** `2500 ms`
- **Payload:**
  ```json
  {
    "error": "UPSTREAM_TIMEOUT",
    "message": "Payment gateway did not respond within the expected window."
  }
  ```

### 4. Authentication, IP Spoofing & Cache Control (`Headers`)

Inject or strip HTTP headers globally or per domain for debugging auth flows, CDN behavior, or multi-tenant routing:

| Operation | Target | Header | Value | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| `SET` | `REQ` | `Authorization` | `Bearer eyJhbGci...` | Test API endpoints with a specific JWT token |
| `SET` | `REQ` | `x-tenant-id` | `acme-corp-staging` | Switch multi-tenant context across requests |
| `SET` | `REQ` | `x-forwarded-for` | `10.24.0.15` | Test geo/IP-based backend rules |
| `SET` | `REQ` | `Cache-Control` | `no-cache, no-store` | Bypass intermediate CDN and browser caching |
| `DEL` | `RES` | `Content-Security-Policy` | *(removed)* | Debug third-party script or frame integration locally |

### 5. Hybrid Local Development (`CORS / Redirect`)

Run a single microservice on `localhost` while the frontend application continues running on the staging domain:

- **Source Filter:** `^https://api\.staging\.example\.com/v2/users/(.*)`
- **Destination:** `http://localhost:8080/v2/users/\1`
- Combine with a **CORS Rule** (`Access-Control-Allow-Origin: *`) to prevent preflight blocks between the staging origin and `localhost`.

---

## Privacy & Permissions

- **`declarativeNetRequest` / `declarativeNetRequestWithHostAccess`**: Required to modify HTTP headers and redirect requests.
- **`storage`**: Stores your profiles and rules locally in `chrome.storage.local`.
- **`scripting` & `<all_urls>`**: Required to inject the `fetch`/`XHR` body override script at `document_start`.

No analytics, tracking scripts, or external servers are used.

---

## License

[MIT](./LICENSE)
