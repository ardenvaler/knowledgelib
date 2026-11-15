# Arden's Knowledge Library

Five food-for-thought dashboards behind one PIN:
**What's Going On in There, Revisited**, **The Hugging Face Breach**, **Midterm Night 2026**,
**AMOC Watch** and the **Prompt Library**.

Netlify project: `ardens-knowledge-library` (https://ardens-knowledge-library.netlify.app). The rules it follows are in [RULES.md](RULES.md).

## What you get

- **A landing page** with the shelf of five, each with a live-looking preview that scrolls on hover. It also has a
  Time Machine you can drag across 122,000 years, a table of contents for every dashboard, and search across all five.
- **A viewer**: each dashboard opens in place with a zoom from its card, under a slim bar with
  **← Library**, its sections and a 01–05 switcher. Browser Back, the Android back gesture and Esc return you to the shelf.
- **Speed**: everything is decrypted once, at unlock, and lives in memory. A dashboard warms up when you point at it,
  and visited dashboards stay alive, frozen in the background, so going back and forth is instant.
- **A PIN gate**: the published site is ciphertext plus a small lock page (AES-256-GCM, PBKDF2-SHA256 × 600,000,
  gzip first). The PIN is a front door, not a vault: six digits only slow down someone who downloads the page.

## Layout

| Path | What it is |
| --- | --- |
| `library/manifest.json` | The five dashboards: titles, descriptions, key numbers, sections, timeline stops |
| `library/shell.html`, `library.css`, `library.js` | The landing page, viewer and Time Machine |
| `library/lock.html` | The PIN screen |
| `tools/snapshot.mjs` | Renders each dashboard in Chromium: preview images and section index |
| `tools/build.mjs` | Bundles, gzips, encrypts, self-tests and writes `dist/` |
| `tools/unpack.mjs` | Decrypts `dist/` back into `content/` with the PIN |
| `content/` | Readable dashboards, previews and index (**git-ignored**, never committed) |
| `dist/` | What Netlify serves: `index.html` (lock page + ciphertext) and `robots.txt` |

## Refreshing a dashboard

1. `LIBRARY_PIN=<pin> node tools/unpack.mjs` to recover `content/` (skip this if it's already there).
2. Save the new version of the artifact's page as `content/dashboards/<id>.html`. The ids are `amoc`, `hf`, `midterm`, `brain` and `prompts`, and each one's claude.ai link is in the manifest.
3. `node tools/snapshot.mjs <id>` to refresh its preview and sections.
4. Update its description, numbers or timeline stops in `library/manifest.json` if they changed.
5. `LIBRARY_PIN=<pin> node tools/build.mjs`, then commit `dist/` and deploy.

To change the PIN, unpack with the old one and build with the new one. The PIN never goes in the repo.

## Deploying

Only deploy when the owner asks: each deploy uses Netlify credits, and pushing to GitHub does not deploy.
The Netlify project is `ardens-knowledge-library`. Deploy only `netlify.toml` and `dist/`, not the whole working
copy, so the readable `content/` folder is never uploaded.
