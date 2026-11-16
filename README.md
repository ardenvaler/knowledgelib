# Arden's Knowledge Library

Seven food-for-thought dashboards behind one PIN:
**What's Going On in There, Revisited**, **The First 1,000 Days**, **Two Languages, One Child**,
**The Hugging Face Breach**, **Midterm Night 2026**, **AMOC Watch** and the **Prompt Library**.

Netlify project: `ardens-knowledge-library` (https://ardens-knowledge-library.netlify.app). The rules it follows are in [RULES.md](RULES.md).

## What you get

- **A landing page** with the shelf of seven. Each card has a short, plain intro to its dashboard. It also has a Time Machine
  you can drag across 122,000 years, Contents listing every section of every dashboard, and search across all of them.
- **Each dashboard on its own page**: `/brain/`, `/first1000/`, `/bilingual/`, `/hf/`, `/midterm/`, `/amoc/`, `/prompts/`.
  A dark **← Library** button sits in the bottom-right corner of every dashboard, and the browser's Back button works as usual.
  Both return you to the same spot on the landing page. Links to a section (`/amoc/#ice`) open right at it.
- **One PIN per tab**: enter it once and every page in that tab opens without asking again, until the tab is closed or you
  press **Lock the library**. A page opened directly (a bookmark, a shared link) asks for the PIN first, then opens that page.
- **Encryption**: every page is published as ciphertext plus a small PIN screen (AES-256-GCM, PBKDF2-SHA256 × 600,000, gzip first).
  The PIN is a front door, not a vault: six digits only slow down someone who downloads the pages.

## Layout

| Path | What it is |
| --- | --- |
| `library/manifest.json` | The dashboards: titles, intros, kinds, colours, sections and Time Machine stops |
| `library/shell.html`, `library.css`, `library.js` | The landing page and the Time Machine |
| `library/page.html` | The PIN screen every published page starts as |
| `library/back.js` | Added to every dashboard: the ← Library button, opening at a linked section, outside links in a new tab |
| `library/fixes/<id>.css` | Small style fixes added to the library's copy of a dashboard: links and buttons that jumped under the pointer now stay put |
| `library/fixes/<id>.patch.json` | Exact find → replace edits to the library's copy of a dashboard (e.g. Lise Eliot's timeline waits for a tap). The build stops if an edit no longer matches exactly once |
| `tools/snapshot.mjs` | Opens each dashboard in Chromium and records its sections, headings and source count |
| `tools/build.mjs` | Encrypts every page, checks each one decrypts, checks nothing readable leaked, and writes `dist/` |
| `tools/unpack.mjs` | Decrypts `dist/` back into `content/` with the PIN |
| `content/` | Readable dashboards and their index (**git-ignored**, never committed) |
| `dist/` | What Netlify serves: `index.html`, one `<id>/index.html` per dashboard, and `robots.txt` |

## Refreshing a dashboard

1. `LIBRARY_PIN=<pin> node tools/unpack.mjs` to recover `content/` (skip this if it's already there).
2. Save the new version of the artifact's page as `content/dashboards/<id>.html`. The ids are `brain`, `first1000`,
   `bilingual`, `hf`, `midterm`, `amoc` and `prompts`, and each one's claude.ai link is in the manifest.
3. `node tools/snapshot.mjs <id>` to refresh its sections and source count.
4. Update its intro, sections, Time Machine stops or `sources` (the dashboard's own count of its sources, where it states one) in `library/manifest.json` if they changed.
5. `LIBRARY_PIN=<pin> node tools/build.mjs`, test it locally, then commit `dist/`.

To add a dashboard, add an entry to the manifest (its `id` becomes its folder name), save its page in `content/dashboards/`,
and run steps 3 to 5. To change the PIN, unpack with the old one and build with the new one. The PIN never goes in the repo.

## Deploying

Only deploy when the owner asks: each deploy uses Netlify credits, and pushing to GitHub does not deploy.
The Netlify project is `ardens-knowledge-library`. Deploy only `netlify.toml` and `dist/` (including its folders), not the whole
working copy, so the readable `content/` folder is never uploaded.
