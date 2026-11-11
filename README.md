<div align="left">
  <img src="public/icons/logo.svg" width="56" height="56" alt="ReqForce Logo" />
</div>

# ReqForce

[![CI](https://github.com/xdloper/Xristal-ReqForce/actions/workflows/ci.yml/badge.svg)](https://github.com/xdloper/Xristal-ReqForce/actions/workflows/ci.yml)
[![Release](https://github.com/xdloper/Xristal-ReqForce/actions/workflows/release.yml/badge.svg)](https://github.com/xdloper/Xristal-ReqForce/releases)
[![Version](https://img.shields.io/github/v/release/xdloper/Xristal-ReqForce)](https://github.com/xdloper/Xristal-ReqForce/releases)
[![GitHub Stars](https://img.shields.io/github/stars/xdloper/Xristal-ReqForce?style=social)](https://github.com/xdloper/Xristal-ReqForce/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**ReqForce** is a fast, local-first browser extension that shows you **what a website is sending behind the scenes** and lets you **modify, replay, mock, or block HTTP requests in real time** — without setting up an external proxy.

Works out of the box on **Chrome**, **Edge**, **Brave**, and **Firefox**.

---

## What ReqForce Shows You About Any Site

When you open the **Inspector** tab on any website, ReqForce gives you an instant X-ray of its network activity:

- **How Requests Travel:** See whether requests leave via `fetch`, `xhr`, or `beacon`, which page triggered them, the target endpoint, status code, response time (`ms`), and `credentials` mode.
- **Inside Outgoing Values (`Key → Value`):** View every parameter sent in the **Body** (JSON, `FormData`, `URLSearchParams`), **Query String**, **Headers**, and **Cookies** in one clean, typed table (`string`, `number`, `boolean`, `array`, `object`).
- **Click-to-Mutate (`⚡ Override`):** Click **Override** next to any outgoing `Body`, `Query`, or `Header` value (even nested JSON paths like `user.role`) to turn it into an active rule immediately.
- **Live Replay & Edit (Built-in Mini-Postman):** Edit the method, URL, headers, or JSON body of any captured request and hit **▶ Send Replay** to inspect the live response without leaving your browser.
- **GraphQL Operation Detection:** Automatically extracts `operationName` (e.g., `GQL:GetUserProfile`) from GraphQL requests so you can identify and mock specific GraphQL queries or mutations on `/graphql`.
- **Token & Auth Radar + Inline JWT Decoder:** Spots where a site carries authentication (`Bearer` headers, JWTs, API keys, CSRF tokens, or session cookies) and decodes JWT payloads on the spot.

---

## Key Features

| Feature | What It Does |
| :--- | :--- |
| **Outgoing & Response Inspector** | Flattens request/response fields by channel (`Body`, `Query`, `Header`, `Cookie`), decodes JWTs, and shows side-by-side **Original vs. Sent** diffs when rules mutate a payload. |
| **Live Request Replay** | Edit and resend any captured request directly from the Inspector (`▶ Replay`) and view the live HTTP status, latency, and response body. |
| **Click-to-Mutate (`⚡ Override`)** | Turn any captured outgoing key (`Body` JSON path, `Query` param, or `Header`) into a live mutation rule in one click. |
| **Dynamic Macros & Custom `{{Variables}}`** | Click **`{{x}} Variables`** in the top bar to define your own reusable workspace variables (e.g., `{{myToken}}`, `{{tenantId}}`) alongside built-in macros (`{{uuid}}`, `{{timestamp}}`, `{{isoDate}}`, `{{randomInt}}`, `{{randomHex}}`). |
| **GraphQL Smart Targeting** | Labels GraphQL requests with their `operationName` (`GQL:CreateOrder`) and lets Body rules target a single GraphQL operation instead of the whole `/graphql` endpoint. |
| **JSON Merge & Endpoint Mocking** | Patch specific keys inside a live JSON request/response (`Shallow Merge`) or replace the entire response with custom status codes (`200`, `401`, `429`, `503`) and artificial latency (`ms`). |
| **Request Blocker (`🚫 Block`)** | Block specific endpoints, analytics trackers, or microservices (`*sentry.io*`, `/api/v1/telemetry`) to test how the frontend handles network failures. |
| **Copy as Code** | Copy any captured request as **cURL**, **`fetch()`**, **`axios`**, or **Python (`requests`)** in one click, or import rules from **Copy as cURL**. |
| **CORS Bypass & Localhost Routing** | Fix cross-origin errors instantly or redirect production API calls to `http://localhost:<port>` using wildcard or regex rules. |
| **Pin Domain & Workspaces** | Lock rules to the active tab's domain (`*://example.com/*`), organize rules into workspaces (`Default`, `Staging`, `QA`), and switch between **Light / Dark** themes and **EN / TR** languages. |

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
- **Safe Pass-Through & Kill-Switch:** Unmatched requests execute natively without touching cookies or sessions, and you can pause all rules anytime from the top bar.

---

## Support the Project ⭐

If **ReqForce** makes debugging APIs, inspecting tokens, or testing frontend edge cases easier for you:

- Give the repository a **Star ⭐** on [GitHub](https://github.com/xdloper/Xristal-ReqForce) — it helps other developers discover the tool!
- Found a bug or have a feature idea? Open an issue in [GitHub Issues](https://github.com/xdloper/Xristal-ReqForce/issues).

---

## License

Released under the [MIT License](./LICENSE) by **Xristal**.
