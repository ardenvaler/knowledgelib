# Arden's Knowledge Library: the rules

One door to seven food-for-thought dashboards.

## On the shelf

1. **What's Going On in There, Revisited**: Lise Eliot's book on how a baby's brain grows, checked against newer research
2. **The First 1,000 Days**: from pregnancy to a child's second birthday, day by day
3. **Two Languages, One Child**: raising a child in English and Bahasa Indonesia
4. **The Hugging Face Breach**: AI programs that broke out of a test and hacked another company
5. **Midterm Night 2026**: the 2026 US midterm results and what follows
6. **AMOC Watch**: the Atlantic ocean current that may be slowing down
7. **Prompt Library**: ready-made instructions for building dashboards like these

## Rules

1. **One really amazing landing page.** The landing page is the gateway to every dashboard.
2. **A short intro on every link.** Each link to a dashboard has a quick intro: a few simple sentences, with no jargon, about what the dashboard is. *(Changed on 15 Nov 2026 at the owner's request. This rule used to ask for a preview box showing what each dashboard looks like. The previews made the landing page glitchy and cluttered, so they were removed.)*
3. **A back button.** Every dashboard has a button that goes back to the landing page.
4. **Fast transitions.** Moving between the landing page and the dashboards, in either direction, is fast.
5. **As stunning as the Lise Eliot dashboard.** The landing page is as mechanically and visually stunning as *What's Going On in There, Revisited*.
6. **On Netlify, behind a PIN.** The library is published on Netlify as "Arden's Knowledge Library" and opens with an encryption PIN. The PIN is a front door, not a vault: the contents are not private.

## How the build keeps each rule

| Rule | What the build does | How to check |
| --- | --- | --- |
| 1. Gateway | The landing page has the shelf of seven, the Time Machine, Contents (every section of every dashboard) and search across all of them. | Every dashboard and every section can be reached from the landing page. |
| 2. Intros | Each card shows its number, kind, topic, date, title and the `intro` from `library/manifest.json`: two or three plain sentences. There are no screenshots and no hover previews. | Read the cards aloud: each says what the dashboard is, in everyday words. |
| 3. Back button | Every dashboard page gets a small round button with the library's logo in the bottom-right corner. It reads "Library" when you point at it. That corner covers no button or link on any dashboard, on desktop, laptop or phone, and the browser's Back button works too. Both bring you back to the same place on the landing page. | Open each dashboard, scroll anywhere, press the button: you land where you left the shelf. |
| 4. Fast | Each dashboard is its own page (`/amoc/`, `/hf/` and so on). After the PIN, the key is kept for that browser tab, so every page opens without asking again. The landing page is about 55 KB, and pointing at a link fetches that dashboard ahead of the click. | A dashboard opens in about a second. A link to a section (e.g. `/amoc/#ice`) opens right at it, with no scrolling animation. |
| 5. Stunning | Day and night themes, each dashboard's own display type on its card, a Time Machine you can drag across 122,000 years, keyboard shortcuts (1–7, `/`) and search. Nothing moves, tilts or zooms under the pointer or while scrolling. | Compare it with the Lise Eliot dashboard side by side, then scroll and hover everywhere: nothing should jump. |
| 6. PIN | `tools/build.mjs` encrypts the landing page and each dashboard as separate pages. It gzips each one and encrypts it with AES-256-GCM. The key comes from PBKDF2-SHA256 (600,000 rounds, a fresh salt on every build, a fresh IV for every page). Each page is decrypted again before anything is written. Only ciphertext is published. **Lock the library** forgets the key. | `dist/` contains no readable dashboard text, and the right PIN opens it on a phone. |

## House rules for future edits

- **Never deploy to Netlify unless the owner explicitly asks.** Every deploy uses Netlify credits. Build and test locally, then commit and push. The repository is not linked to Netlify, so pushing to GitHub does not deploy anything.
- **Calm beats clever.** Nothing on the landing page may move, tilt, grow or shrink when the pointer is on it or the page scrolls past it. A button that moves can slide out from under the pointer, which makes it flicker and lose clicks. Hover effects change colour, border or shadow only. The same goes inside the dashboards: fix it in the dashboard's source where we have it (as for The First 1,000 Days and Two Languages, One Child), otherwise `library/fixes/<id>.css` keeps it still in the library's copy. Dashboards open as their own pages, never inside a frame on the landing page.
- **Nothing plays by itself.** Timelines and players wait for a tap; the first tap starts from the beginning unless the reader has already picked a point. (The Time Machine, The First 1,000 Days' day player and the baby-brain timeline in Lise Eliot's dashboard all work this way; the last through `library/fixes/brain.patch.json`.)
- **Plain words.** Intros and descriptions use everyday language: no jargon, no AI-speak.
- The PIN lives only in the `LIBRARY_PIN` environment variable at build time. Never commit it, log it or write it to a file in the repo.
- Readable copies of the dashboards (`content/`) stay out of git, because this repository is public. `tools/unpack.mjs` recovers them from `dist/` with the PIN.
- When a dashboard changes on claude.ai, refresh its copy in `content/dashboards/`, run `tools/snapshot.mjs` for that dashboard, then rebuild.
- Every number on the landing page comes from the dashboards themselves. Don't round, guess or add facts that aren't in them.
