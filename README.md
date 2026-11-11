<div align="left">
  <img src="public/icons/logo.svg" width="56" height="56" alt="ReqForce Logo" />
</div>

# ReqForce

[![CI](https://github.com/xdloper/Xristal-ReqForce/actions/workflows/ci.yml/badge.svg)](https://github.com/xdloper/Xristal-ReqForce/actions/workflows/ci.yml)
[![Release](https://github.com/xdloper/Xristal-ReqForce/actions/workflows/release.yml/badge.svg)](https://github.com/xdloper/Xristal-ReqForce/releases)
[![Version](https://img.shields.io/github/v/release/xdloper/Xristal-ReqForce)](https://github.com/xdloper/Xristal-ReqForce/releases)
[![GitHub Stars](https://img.shields.io/github/stars/xdloper/Xristal-ReqForce?style=social)](https://github.com/xdloper/Xristal-ReqForce/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**ReqForce** is a fast, local-first browser extension that shows you **what a website is sending behind the scenes** and lets you **modify headers, request/response bodies, status codes, and routing in real time** — without setting up an external proxy.

Works out of the box on **Chrome**, **Edge**, **Brave**, and **Firefox**.

---

## What ReqForce Shows You About Any Site

When you open the **Inspector** tab on any website, ReqForce gives you an instant X-ray of its network activity:

- **How Requests Travel:** See whether requests leave via `fetch`, `xhr`, or `beacon`, which page triggered them, the target endpoint, status code, response time (`ms`), and `credentials` mode.
- **Inside Outgoing Values (`Key → Value`):** Instead of digging through raw network logs, view every parameter sent in the **Body** (JSON, `FormData`, `URLSearchParams`), **Query String**, **Headers**, and **Cookies** in one clean, typed table (`string`, `number`, `boolean`, `array`, `object`).
- **Token & Auth Radar + Inline JWT Decoder:** Automatically spots where a site carries authentication (`Bearer` headers, JWTs, API keys, CSRF tokens, or session cookies) and decodes JWT payloads on the spot.
- **One-Click Actionable Traffic:** Turn any captured request into a **Mock Response**, **Request Body Override**, **Header Rule**, or **cURL command** with a single click.

---

## Key Features

| Feature | What It Does |
| :--- | :--- |
| **Outgoing & Response Inspector** | Flattens request/response fields by channel (`Body`, `Query`, `Header`, `Cookie`), decodes JWTs, and shows side-by-side **Original vs. Sent** diffs when rules mutate a payload. |
| **JSON Merge & Endpoint Mocking** | Patch a single key inside a live JSON request/response (`Shallow Merge`) or replace the entire response with custom status codes (`200`, `401`, `429`, `503`) and artificial latency (`ms`). |
| **HTTP Header Manipulation** | `Set`, `Append`, or `Remove` request and response headers. Includes quick templates (`Bearer`, `API Key`, `No Cache`, `Spoof IP`, `Tenant ID`, `Strip CSP`). |
| **Pin Domain & Safe Pass-Through** | Lock rules to the active tab's domain (`*://example.com/*`) in one click. Unmatched requests pass through untouched so existing logins and cookies never break. |
| **CORS Bypass & Localhost Routing** | Fix cross-origin errors instantly or redirect production API calls to `http://localhost:<port>` using wildcard or regex rules. |
| **cURL Import & Workspaces** | Paste any **Copy as cURL** command from DevTools to generate rules automatically. Organize rules into separate workspaces (`Default`, `Staging`, `QA`) with JSON export/import. |
| **Mesh & Tracing Context** | Optional propagation for W3C OpenTelemetry `baggage`, `x-envoy-force-trace`, and Kubernetes `x-telepresence-intercept-id`. |
| **Themes & Localization** | Supports **Light / Dark / System** themes and **English / Turkish** UI out of the box. |

---

## Quick Installation

Grab the latest `.zip` from **[GitHub Releases](https://github.com/xdloper/Xristal-ReqForce/releases)** or load directly from the `dist/` folder:

1. **Chrome / Brave:** Go to `chrome://extensions` → enable **Developer mode** → click **Load unpacked** → select `dist/chrome`.
2. **Microsoft Edge:** Go to `edge://extensions` → enable **Developer mode** → click **Load unpacked** → select `dist/edge`.
3. **Mozilla Firefox:** Go to `about:debugging#/runtime/this-firefox` → click **Load Temporary Add-on...** → select `dist/firefox/manifest.json`.

---

## Development

```bash
git clone https://github.com/xdloper/Xristal-ReqForce.git
cd Xristal-ReqForce
npm install

# Build all browser packages (dist/chrome, dist/edge, dist/firefox)
npm run build

# Watch mode
npm run dev
```

---

## Privacy First

- **100% Local:** Zero telemetry, zero analytics, and no external servers. All rules, workspaces, and captured logs stay inside your browser's local storage.
- **Master Kill-Switch:** Pause or resume all interceptions anytime from the top bar with a single click.

---

## Support the Project ⭐

If **ReqForce** makes debugging APIs, inspecting tokens, or testing frontend edge cases easier for you:

- Give the repository a **Star ⭐** on [GitHub](https://github.com/xdloper/Xristal-ReqForce) — it helps other developers discover the tool!
- Found a bug or have a feature idea? Open an issue in [GitHub Issues](https://github.com/xdloper/Xristal-ReqForce/issues).

---

## License

Released under the [MIT License](./LICENSE) by **Xristal**.
