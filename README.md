# ZayninRevolt — My Links

A static Windows 98-inspired personal links page for `justzayn.com`. It includes
desktop-style windows for social links, live Twitch and Overwatch status,
Spotify, favourite games, and Minesweeper.

## Run locally

No build step or package installation is required. Start any static file server
from the repository root, for example:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Quality checks

Run:

```sh
npm install
npx playwright install chromium
npm test
```

The Node suite checks document structure, window and focus-management hooks,
Content Security Policy, local module and asset references, external-link
safety, duplicate IDs, reduced-motion behavior, and Minesweeper keyboard
support. Playwright then exercises the important interactions in Chromium,
including focus restoration, taskbar state, CSP errors, keyboard play, and lazy
embeds. GitHub Actions runs both suites for pushes and pull requests.

For a release, also verify the page in a real browser at mobile and desktop
sizes. Test keyboard-only navigation, every simulated window, the About dialog,
external-service error states, and the browser console.

## Structure

- `index.html` — page content and security metadata
- `styles.css` — Windows 98 visual design and responsive styles
- `app.js` — lightweight application bootstrap, clock, CRT, and boot behavior
- `js/desktop.js` — windows, taskbar, Start menu, dragging, and focus management
- `js/overwatch.js` — Overwatch profile loading and safe rendering
- `js/minesweeper.js` — game state and pointer, touch, and keyboard controls
- `js/media.js` — Twitch, Spotify, and games launch behavior
- `img/` — local images and icons
- `test/site.test.js` — dependency-free quality checks
- `test/browser/site.spec.js` — browser-level interaction and CSP checks
- `playwright.config.js` — local Chromium test server and runner configuration

## External services

The page connects to:

- OverFast API for the public Overwatch profile summary
- DecAPI for public Twitch status and game information
- Twitch and Spotify for embedded players
- GoatCounter for privacy-friendly traffic analytics

The Content Security Policy in `index.html` allow-lists these services. Update
the policy deliberately if an integration host changes.

## Keyboard controls

Use Tab to reach desktop icons, window controls, and taskbar buttons. The Start
menu supports Up, Down, Home, End, and Escape. In Minesweeper, use the arrow
keys to move between cells, Enter or Space to reveal a cell, and F to flag or
unflag it.

## Deployment

The repository is intended for static hosting with the custom domain in
`CNAME`. Deployment should publish the repository contents without a build
step. Confirm `justzayn.com`, `www.justzayn.com`, and `localhost` remain valid
Twitch embed parents if the hosting domain changes.
