# Playwright's Firefox: service-worker-controlled cross-origin iframe never loads (works in stock Firefox)

Minimal reproduction for a Playwright bug report.

A cross-origin-isolated page (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`)
boots [`@webcontainer/api`](https://www.npmjs.com/package/@webcontainer/api), starts a 5-line HTTP server inside the
container and embeds the `server-ready` preview URL in an iframe. The preview origin (`*.webcontainer-api.io`) is a
different origin that registers a service worker and controls the iframe. The app in the iframe calls
`parent.postMessage("hello-from-iframe", "*")`.

- Chromium and Playwright's WebKit: the message arrives within a few seconds.
- Playwright's Firefox (every build tried, 134 to 159): the message never arrives (30 s timeout).
- Stock Firefox 146.0 and 160.0 driven by geckodriver, same page: the message arrives.

## Files

- `server.mjs`: static server that sends the COOP/COEP headers.
- `public/`: host page. Boots the container, mounts the server, waits for `server-ready`, adds the iframe, waits up to 30 s for the message.
- `run.mjs`: Playwright runner (`playwright-core`).
- `real-firefox.mjs`: the same page driven by stock Firefox through geckodriver (no Playwright), for comparison.

Needs network access (the library loads its runtime from `*.webcontainer-api.io`). No secrets, no other services.

## Run

```
npm install                                  # pins @webcontainer/api 1.6.4 and playwright-core 1.58.2
npx playwright-core install chromium firefox webkit
node run.mjs chromium 3500                   # {"iframeMessage":true, ...}
node run.mjs webkit 3500                     # {"iframeMessage":true, ...}
node run.mjs firefox 3500                    # {"iframeMessage":false, ...}   <- the bug

# stock Firefox for comparison (download Firefox and geckodriver yourself):
GECKODRIVER=/path/to/geckodriver FIREFOX=/path/to/Firefox.app/Contents/MacOS/firefox node real-firefox.mjs 3580
```

Output is one JSON line. `iframeMessage: true` means the app in the iframe posted within 30 s.
Add a third argument `npm` (`node run.mjs webkit 3500 npm`) to also run `npm install` inside the container.

To test another Playwright version, install it (`npm install playwright-core@<version> && npx playwright-core install firefox`) and run again.

## Results

Environment: macOS 15 (Darwin 24.6), arm64, Node 22.14.0, npm 10.9.2, headless, 2026-11-16, `@webcontainer/api` 1.6.4.

| playwright-core | Playwright Firefox (rev) | iframe app message | Playwright WebKit (rev) | iframe app message |
|---|---|---|---|---|
| 1.50.1 | 134.0 (r1471) | NO (the host never reaches `server-ready`, it stalls after boot) | 18.2 (r2123) | yes |
| 1.54.2 | 140.0.2 (r1489) | NO (`server-ready` fires, then 30 s timeout) | 26.0 (r2191) | yes |
| 1.58.2 | 146.0.1 (r1509) | NO | 26.0 (r2248) | yes |
| 1.65.1 (latest) | 159.0 (r1572) | NO | 27.2 (r2388) | yes |

Other baselines: Playwright's Chromium 145.0.7632.6 (playwright-core 1.58.2) passes. Stock Firefox 146.0 and 160.0 through
geckodriver 0.37.1 pass.

## What was ruled out

- Playwright's Firefox preferences (all of `playwright.cfg`, including `fission.webContentIsolationStrategy=0` and
  `network.cookie.cookieBehavior=4`) applied to stock Firefox do **not** reproduce the failure.
- Firefox's default Total Cookie Protection, `network.cookie.cookieBehavior` 0 and 4 and `privacy.partition.serviceWorkers=false` on stock Firefox: no failure.
- COEP: the container's resources are served with `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Resource-Policy: cross-origin`, and nothing is blocked by it.
- In Playwright's Firefox the service worker registers and controls the iframe; the iframe then stays on the runtime's
  "no server" shell and never reaches the app. The link between the service worker and the runtime iframe never completes.

Not tried: headed mode, the BiDi protocol.
