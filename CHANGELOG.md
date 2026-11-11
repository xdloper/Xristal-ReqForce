# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-11-11

### Changed
- Redesigned UI into **ReqForge**, a general-purpose HTTP Header, Body Mocking, CORS & Network Routing developer tool.
- Made `scripts/background.js` 100% self-contained with zero external ES module imports and silent runtime error handling to eliminate Chrome extension service worker warnings.
- Moved Cluster/Telepresence context propagation into an optional collapsible section under the **CORS, Redirect & Context** tab.

## [1.1.0] - 2026-11-11

### Added
- Multi-resolution extension icons (`16x16`, `32x32`, `48x48`, `128x128`) across Chrome, Edge, and Firefox manifests.
- Automated Semantic Versioning release workflow (`npm run release:patch`, `npm run release:minor`, `npm run release:major`) syncing `package.json`, `manifest.json`, and `dist/` builds.

## [1.0.0] - 2026-11-11

### Added
- Network-level HTTP Request & Response header manipulation via Manifest V3 `declarativeNetRequest`.
- Dedicated Kubernetes Telepresence intercept module (`x-telepresence-intercept-id` and W3C `baggage` propagation) with CLI output parser.
- Page-context `window.fetch` and `XMLHttpRequest` interceptor for Request/Response JSON shallow merging, full body mocking, status code overrides, and latency simulation.
- CORS bypass and regex/wildcard URL redirection rules.
- Multi-profile management, live traffic mutation log, and JSON import/export.
- Separated browser build outputs under `dist/chrome`, `dist/edge`, and `dist/firefox`.
