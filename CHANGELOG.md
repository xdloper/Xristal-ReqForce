# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1] - 2026-11-11

### Changed
- Renamed repository to **Xristal-ReqForce** (`https://github.com/xdloper/Xristal-ReqForce`) across manifests, package metadata, and documentation.
- Added **PRs Welcome** badge and **Contributing** guide to `README.md`.

## [1.5.0] - 2026-11-11

### Added
- **Deep Traffic & Token Carrier Inspector**:
  - Tracks **Source Page → Target Endpoint** flow (`pageUrl` → `url`), HTTP status, and latency (`ms`).
  - Automatically detects and classifies where tokens/credentials travel: **HEADER** (`Authorization`, `X-API-Key`, `X-CSRF-Token`, etc.), **BODY** (JSON/form token fields & JWTs), **QUERY** (`?token=...`), or **COOKIE** (`credentials` mode + cookie names).
  - Split-pane inspector with filter pills (`All`, `Has Token/Auth`, `Header`, `Body`, `Query`, `Cookie`, `Mutated`), full-text search across URL/headers/body, raw request body & response preview, and 1-click **+ Rule** / **+ Mock Rule** creation.

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
- Unified official ReqForge brand logo across the popup header, HTML favicon, extension manifest icons, and `README.md`.

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
- Redesigned UI into **ReqForge**, a general-purpose HTTP Header, Body Mocking, CORS & Network Routing developer tool.
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
