# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
