<div align="left">
  <img src="public/icons/logo.svg" width="52" height="52" alt="ReqForce Logo" />
</div>

# ReqForce

[![CI](https://github.com/xdloper/Xristal-ReqForce/actions/workflows/ci.yml/badge.svg)](https://github.com/xdloper/Xristal-ReqForce/actions/workflows/ci.yml)
[![Release](https://github.com/xdloper/Xristal-ReqForce/actions/workflows/release.yml/badge.svg)](https://github.com/xdloper/Xristal-ReqForce/actions/workflows/release.yml)
[![Version](https://img.shields.io/github/v/release/xdloper/Xristal-ReqForce)](https://github.com/xdloper/Xristal-ReqForce/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**ReqForce** is a local-first Manifest V3 browser extension for inspecting, mutating, and mocking HTTP traffic across **Chrome**, **Edge**, **Brave**, and **Firefox**.

It combines wire-level `declarativeNetRequest` rules with a page-context `fetch` / `XMLHttpRequest` / `sendBeacon` interceptor so you can inspect outgoing values, modify headers and JSON bodies, bypass CORS, and route requests without external proxy servers.

---

## Core Capabilities

### 1. Outgoing Value & Traffic Inspector
- **Channel Breakdown:** See how every request leaves the page (`fetch`, `xhr`, or `beacon`), including HTTP method, status, duration, content type, and credentials mode.
- **Flattened Key → Value View:** Automatically parses and flattens outgoing JSON payloads, `URLSearchParams`, `FormData`, URL query strings, custom headers, and cookies into a filterable `Body` / `Query` / `Header` / `Cookie` table with data types (`string`, `number`, `boolean`, `array`, `object`).
- **Token & Auth Radar:** Detects Bearer tokens, JWTs, API keys, CSRF tokens, and session cookies across all channels and decodes JWT payloads inline.
- **Mutation Diff & One-Click Actions:** Compare original vs. mutated request bodies side-by-side, copy any captured request as cURL, or turn a live request into a **Mock Response** or **Request Override** rule in one click.

### 2. Request & Response Body Manipulation
- **Shallow JSON Merge:** Patch specific keys inside outgoing JSON requests or incoming JSON responses while keeping the rest of the payload intact.
- **Full Endpoint Mocking:** Return custom responses, HTTP status codes (`200`, `401`, `429`, `503`), and simulated network latency (`ms`) without hitting the backend.

### 3. HTTP Header Rules
- `Set`, `Append`, or `Remove` request and response headers (`Authorization`, `X-API-Key`, `Cache-Control`, `Content-Security-Policy`, `X-Forwarded-For`).
- Scope rules to the active tab hostname with **Pin Domain**, or import headers and payloads directly from **Copy as cURL**.

### 4. Routing, CORS & Context Propagation
- **CORS Bypass:** Inject `Access-Control-Allow-Origin`, `Allow-Methods`, and `Allow-Headers` on matching responses.
- **URL Redirects & Query Params:** Route production/staging URLs to `localhost` (supports regex capture groups) or append query parameters (`?debug=1`).
- **Distributed Tracing & Mesh Headers:** Optional propagation for W3C OpenTelemetry `baggage`, `x-envoy-force-trace`, and Kubernetes `x-telepresence-intercept-id`.

---

## Installation

Download the latest packaged archive from [GitHub Releases](https://github.com/xdloper/Xristal-ReqForce/releases) or load the unpacked build from `dist/`:

- **Chrome / Brave:** Open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `dist/chrome`.
- **Microsoft Edge:** Open `edge://extensions` → enable **Developer mode** → **Load unpacked** → select `dist/edge`.
- **Mozilla Firefox:** Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on...** → select `dist/firefox/manifest.json`.

---

## Development & Release

```bash
git clone https://github.com/xdloper/Xristal-ReqForce.git
cd Xristal-ReqForce
npm install

# Build dist/chrome, dist/edge, and dist/firefox
npm run build

# Watch mode
npm run dev
```

Release scripts bump the version across `package.json` and `public/manifest.json`, rebuild all browser targets in `dist/`, and push the release tag:

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

---

## Privacy & Security

- **100% Local:** No analytics, telemetry, or external network calls. All workspaces and rules are stored in `chrome.storage.local`.
- **Zero-Touch Pass-Through:** When no rule matches a request, native `fetch` and `XMLHttpRequest` calls execute unmodified so existing site sessions and cookies remain intact.

---

## License

Released under the [MIT License](./LICENSE) by **Xristal**.
