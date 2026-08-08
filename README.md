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
npm test
```

The dependency-free Node test suite checks the document structure, dialog and
focus-management hooks, Content Security Policy, local asset references,
external-link safety, duplicate IDs, and inline event handlers. GitHub Actions
runs the same checks for pushes and pull requests.

For a release, also verify the page in a real browser at mobile and desktop
sizes. Test keyboard-only navigation, every simulated window, the About dialog,
external-service error states, and the browser console.

## Structure

- `index.html` — page content and security metadata
- `styles.css` — Windows 98 visual design and responsive styles
- `app.js` — window management, integrations, and Minesweeper
- `img/` — local images and icons
- `test/site.test.js` — dependency-free quality checks

## External services

The page connects to:

- OverFast API for the public Overwatch profile summary
- DecAPI for public Twitch status and game information
- Twitch and Spotify for embedded players
- GoatCounter for privacy-friendly traffic analytics

The Content Security Policy in `index.html` allow-lists these services. Update
the policy deliberately if an integration host changes.

## Deployment

The repository is intended for static hosting with the custom domain in
`CNAME`. Deployment should publish the repository contents without a build
step. Confirm `justzayn.com`, `www.justzayn.com`, and `localhost` remain valid
Twitch embed parents if the hosting domain changes.
