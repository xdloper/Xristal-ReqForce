# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.0] - 2026-11-12

### Added
- **Redesigned Visual Body & Routing Editors**:
  - Replaced the Body rule strategy dropdown with **4 visual action mode cards** (`Patch Response JSON`, `Mock Full Response`, `Patch Outgoing JSON`, `Replace Outgoing Body`) with dynamic editor labels and context-aware `Status` / `Delay` inputs.
  - Added explanatory guide cards and explicit field labels (`Source URL Pattern`, `Destination URL`, `Query Key / Value`) to the **Routing** tab, plus simple wildcard (`*`) redirect support (`https://api.prod.com/*` → `http://localhost:8080/*`).
- **Top-Bar Settings Button**: Moved the ⚙️ **Settings** button into the top header bar next to `Variables` and `Import cURL`.

### Fixed
- **Zero-Race Storage Architecture (`devManipulatorState` + `devManipulatorLogs`)**: Separated live traffic logs into `devManipulatorLogs` so background log appends never overwrite user workspaces, variables, or rules in `devManipulatorState`.
- **Auto-Commit Workspace Input & Export**: Uncommitted workspace names are automatically saved on blur or when `Export JSON` is clicked.
- **Smart `Pin Domain` Resolution**: `Pin Domain` dynamically resolves the active HTTP/HTTPS tab (or falls back to the last open HTTP tab / recent log), handles `localhost` and subdomains properly, and works across `Headers`, `Body`, and `Routing`.
- **Light Theme High-Contrast Palette**: Mapped all accent utility classes (`emerald`, `amber`, `blue`, `purple`, `rose`, `cyan`) to high-contrast dark shades when `html[data-theme='light']` is active.

## [1.8.7] - 2026-11-12

### Added
- **Full State & UI Persistence (`chrome.storage.local` + Export/Import)**:
  - Every workspace's `variables`, `headerRules`, `bodyRules` (including `graphqlOperation`), `redirectCorsRules` (including `block` rules), `telepresence` context, `locale`, `theme`, `trafficMonitorEnabled`, and `lastActiveTab` are persisted immediately in `chrome.storage.local`.
  - **Clean Export JSON**: `Export JSON` now exports all workspaces, rules, custom `variables`, and settings cleanly without dumping ephemeral live traffic logs (`logs`) into your configuration file, and `Import JSON` restores and normalizes all fields seamlessly.

## [1.8.6] - 2026-11-12

### Added
- **Live `{{` Variable Autocomplete**: Typing `{{` inside any Header value, JSON Body payload, Query Param value, or Redirect URL opens an instant autocomplete dropdown showing your custom workspace variables first (with their live preview values) alongside built-in macros (`{{uuid}}`, `{{timestamp}}`, `{{isoDate}}`, `{{randomInt}}`, `{{randomHex}}`). Supports keyboard navigation (`↑` / `↓`, `Enter`, `Tab`, `Esc`) and mouse click.

## [1.8.5] - 2026-11-12

### Fixed
- **Subdomain & Root Domain Matching for `Pin Domain` (`*://www.domain.com/*`)**: Pinning a domain like `www.google.com` or `github.com` now matches both the root domain (`google.com`) and all API subdomains (`*.google.com`, `api.github.com`) across both `declarativeNetRequest` (`||domain/`) and `scripts/injected.js`.
- **Reliable Background Rule Sync**: Added a `chrome.storage.onChanged` listener in `background.js` so toggling **ACTIVE / PAUSED** or editing header rules always updates dynamic DNR rules and open tabs even if the popup closes immediately.

## [1.8.4] - 2026-11-12

### Fixed
- **State Persistence on Popup Close**: `saveExtensionState` now writes directly to `chrome.storage.local` before notifying the background service worker, ensuring that toggling **ACTIVE / PAUSED** or editing rules is never lost when the popup closes immediately.
- **Clean `Variables` Button**: Removed the `{{x}}` prefix and matched the `Variables` / `Değişkenler` button styling with the top bar.

## [1.8.3] - 2026-11-11

### Added
- Saved live product screenshots under `docs/screenshots/` (`inspector.png`, `headers.png`, `routing.png`) and embedded them into `README.md`.

### Fixed
- Prevented Inspector detail sub-tabs (`Outgoing Values`, `Response`, `Headers & Code`, `▶ Replay`, `+ Mock Response`, `🚫 Block`) from wrapping onto a second line on narrow labels.

## [1.8.2] - 2026-11-11

### Fixed
- Resolved blocked `fetch` requests with a synthetic `499 Blocked by ReqForce` `Response` instead of throwing an unhandled `TypeError` in `scripts/injected.js`, and logged failed/aborted `fetch` calls cleanly in the Inspector.

## [1.8.1] - 2026-11-11

### Added
- **`{{x}} Variables` Manager**: Added a dedicated **`{{x}} Variables / Değişkenler`** button and modal in the top bar where users can define custom `{{variableName}} → value` pairs per workspace and copy built-in dynamic macros (`{{uuid}}`, `{{timestamp}}`, `{{isoDate}}`, `{{randomInt}}`, `{{randomHex}}`). Custom variables are automatically expanded across Header values, Query params, URL Redirects, and JSON Bodies.

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
