# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0] - 2026-11-11

### Added
- **Live Request Replay (`▶ Replay`)**: Edit method, URL, headers, and payload of any captured request inside the Inspector and resend it on the spot to view live HTTP status, duration, and response body.
- **Click-to-Mutate (`⚡ Override`)**: One-click button on every outgoing `Body`, `Query`, and `Header` field in the Inspector (including nested JSON paths like `user.role`) to create a targeted override rule immediately.
- **Dynamic Variables & Macros**: Support for `{{uuid}}`, `{{timestamp}}`, `{{now}}`, `{{isoDate}}`, `{{randomInt}}`, and `{{randomHex}}` across request headers, query params, and JSON body overrides.
- **Request Blocker (`🚫 Block`)**: Block matching URLs at both the network (`declarativeNetRequest`) and page (`fetch` / `XHR` / `sendBeacon`) layers to simulate service outages or block trackers, with `BLOCKED` log entries in the Inspector.
- **GraphQL Operation Detection & Filtering**: Automatically extracts `operationName` from GraphQL requests (`GQL:OperationName` badge in Inspector) and allows Body rules to filter by a specific GraphQL operation.
- **Copy as Code**: Copy any captured request as **cURL**, **`fetch()`**, **`axios`**, or **Python (`requests`)** from the Inspector.

## [1.7.2] - 2026-11-11

### Fixed
- **Non-Blocking Fetch Inspection & Stream Safety**: `readResponsePreview` now runs asynchronously without delaying `window.fetch` resolution and skips open streams (`text/event-stream`) and oversized payloads (`>500 KB`) so streaming endpoints never hang.
- **Request Object Body Preservation**: Preserved request bodies when `window.fetch(new Request(url, { method: 'POST', body }))` is mutated by header-only rules.
- **Response Status & Null-Body Guards**: Guarded `new Response(...)` against `204` / `205` / `304` null-body status errors and out-of-range HTTP status codes.
- **XHR Listener Ordering**: Registered XHR response override listener in `constructor()` so mutated `responseText` / `response` / `status` are applied before page `onload` / `onreadystatechange` handlers fire.
- **Inspector Clear Persistence**: Fixed the Inspector `Clear` button so cleared logs are persisted to `storage.local` (`replaceLogs: true`).

## [1.7.1] - 2026-11-11

### Fixed
- Coerced non-string `XMLHttpRequest.setRequestHeader(name, value)` values (e.g. numeric `xhr.setRequestHeader('x-spiferack', 1)` on `npmjs.com`) and wrapped page-world token/field inspection in defensive string coercion so `injected.js` never throws `TypeError: *.startsWith is not a function`.

## [1.7.0] - 2026-11-11

### Added
- **Outgoing Values & Channel Inspector**:
  - Flattened `Key → Value (type)` table for outgoing `Body` (JSON, FormData, URLSearchParams), `Query`, `Header`, and `Cookie` channels with instant channel filtering.
  - Inline **JWT Decoder** inside Token & Auth Radar and `navigator.sendBeacon` capture alongside `fetch` and `XHR`.
  - Side-by-side **Original vs. Sent** diff when ReqForce mutates an outgoing request body.
  - Flattened response field viewer plus one-click **+ Mock Response**, **+ Override Request**, and **Copy cURL** actions directly from any captured request.

### Changed
- Rewrote `README.md` to be concise, clean, and focused on core capabilities.

## [1.5.0] - 2026-11-11

### Added
- **Deep Traffic & Token Inspector**:
  - **Source Page → Target Endpoint** flow per request with latency (`ms`) and HTTP status.
  - **Token & Auth Radar**: automatically detects where auth tokens, JWTs, Bearer headers, API keys, CSRF tokens, or session IDs travel (**Header**, **Request Body**, **Query String**, or **Cookie / credentials**).
  - Full **Request Headers**, **Response Headers**, **Query Params**, **Request Body**, and **Response Body** viewer with pretty JSON formatting, search, filter chips (`All`, `Has Token`, `Mutated`, `4xx/5xx`), and one-click `+ Rule` creation.

## [1.4.2] - 2026-11-11

### Added
- **Theme setting**: Auto (OS), Light, or Dark — CSS tokens drive the whole popup.
- **Settings** tab: Language & Theme → Version / About → Workspace & Data (export / import / reload).

### Changed
- Moved language controls out of the header into Settings; header keeps cURL + ACTIVE/PAUSED only.

## [1.4.1] - 2026-11-11

### Added
- **Language setting**: Auto (follows OS/browser; Turkish → TR, otherwise EN), or force **EN** / **TR**. Preference is persisted with extension state.

### Changed
- Unified previously mixed TR/EN UI strings under a single i18n catalog (default resolved language: English unless system is Turkish or user selects TR).

## [1.4.0] - 2026-11-11

### Fixed
- Stopped rewriting every `fetch` / `XHR` call when no rule matches — cookies, credentials, and Bearer sessions stay intact.
- Disabled dangerous default sample rules that were globally injecting `x-debug-mode` on `*`.
- Excluded YouTube / Google Video / reCAPTCHA frames from MAIN-world injection to eliminate leftover `Unsafe attempt to load URL` noise.
- Official **Xristal** infinity logo used in popup header + extension icons.

### Added
- **Live Traffic Inspector**: see method, URL, status, credentials mode, and visible request headers for outgoing fetch/XHR; mutated rows are highlighted so you can disable the offending rule.

## [1.3.2] - 2026-11-11

### Changed
- Added prominent **AKTİF / PASİF** master toggle switch and paused-state banner to the top header bar.
- Unified official ReqForce brand logo across the popup header, HTML favicon, extension manifest icons, and `README.md`.

## [1.3.1] - 2026-11-11

### Fixed
- Replaced DOM `<script src="chrome-extension://...">` injection with native Manifest V3 `"world": "MAIN"` content script execution, eliminating `Unsafe attempt to load URL` and CSP/Trusted Types errors on sites like YouTube Music.
- Guarded content script messaging against invalidated extension contexts during extension reloads.

## [1.3.0] - 2026-11-11

### Added
- **cURL Importer:** Extract request headers (`-H`) and payloads (`--data-raw`) directly from DevTools *Copy as cURL* commands.
- **Pin Active Domain:** One-click scoping of header rules to the active tab's hostname (`*://hostname/*`).
- **URL Query Parameter Rules:** Add or override query string parameters (`?key=value`) at the network layer via `declarativeNetRequest` `queryTransform`.
- **Rule Duplication & Bulk Toggle:** Clone existing header rules and enable/disable all rules in a workspace at once.
- **In-Place Browser Builds:** Preserve `dist/chrome`, `dist/edge`, and `dist/firefox` directory inodes across rebuilds for seamless browser extension reloads.
- Set publisher and author metadata uniformly to **Xristal**.

## [1.2.0] - 2026-11-11

### Changed
- Redesigned UI into **ReqForce**, a general-purpose HTTP Header, Body Mocking, CORS & Network Routing developer tool.
- Made `scripts/background.js` 100% self-contained with zero external ES module imports and silent runtime error handling.
- Moved Cluster/Telepresence context propagation into an optional collapsible section under the routing tab.

## [1.1.1] - 2026-11-11

### Changed
- Expanded `README.md` with real-world engineering scenarios and use cases.

## [1.1.0] - 2026-11-11

### Added
- Multi-resolution extension icons (`16x16`, `32x32`, `48x48`, `128x128`) across Chrome, Edge, and Firefox manifests.
- Automated Semantic Versioning release workflow (`release:patch`, `release:minor`, `release:major`).

## [1.0.0] - 2026-11-11

### Added
- Initial release with Manifest V3 `declarativeNetRequest` header rules, `fetch`/`XHR` body overrides, CORS bypass, URL redirects, and separated `dist/` browser builds.
