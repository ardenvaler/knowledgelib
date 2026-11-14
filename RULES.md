# Arden's Knowledge Library: the rules

One door to five food-for-thought dashboards.

## On the shelf

1. **AMOC Watch**: the slowing Atlantic overturning circulation
2. **The Hugging Face Breach**: AI agents that broke out of an evaluation sandbox
3. **Midterm Night 2026**: the night Congress flipped
4. **What's Going On in There, Revisited**: Lise Eliot's book on the infant brain, checked against later research
5. **Prompt Library**: the dashboards above (and others) taken apart into reusable prompts

## Rules

1. **One really amazing landing page.** The landing page is the gateway to all five dashboards.
2. **A preview box on every link.** Each link to a dashboard shows a quick preview of what the dashboard looks like, plus a quick description.
3. **A back button.** Every dashboard has a button that goes back to the landing page.
4. **Fast transitions.** Moving between the landing page and the dashboards, in either direction, is fast.
5. **As stunning as the Lise Eliot dashboard.** The landing page is as mechanically and visually stunning as *What's Going On in There, Revisited*.
6. **On Netlify, behind a PIN.** The library is published on Netlify as "Arden's Knowledge Library" and opens with an encryption PIN. The PIN is a front door, not a vault: the contents are not private.

## How the build keeps each rule

| Rule | What the build does | How to check |
| --- | --- | --- |
| 1. Gateway | The landing page has a hero, the shelf of five, the Time Machine, a table of contents for every section of every dashboard, and search across all five. | Every dashboard and every section is reachable from the landing page. |
| 2. Preview boxes | Each card shows a real screenshot of its dashboard, taken by `tools/snapshot.mjs`. The screenshot scrolls on hover, and a one- or two-sentence description and three key numbers sit under it. | Hover a card: the preview scrolls through the dashboard. |
| 3. Back button | A bar above every dashboard has **← Library**. Browser Back, the Android back gesture and Esc also return to the landing page. | Open each dashboard and press the button: you land where you left the shelf. |
| 4. Fast | Everything is decrypted once, at unlock, and kept in memory. Dashboards render from memory with no network round trip, a dashboard warms up as soon as you point at its card, and visited dashboards stay alive. The opening zoom takes 320 ms and the way back takes 300 ms. | Opening a dashboard never shows a blank page. Going back keeps your place in the dashboard for next time. |
| 5. Stunning | Day and night themes, gradient display type, a live timeline you can drag across 122,000 years, 3D-tilting cards, a shared-element zoom from card to dashboard, keyboard shortcuts (1–5, `/`, Esc) and reduced-motion fallbacks. | Compare it with the Lise Eliot dashboard side by side. |
| 6. PIN | `tools/build.mjs` gzips the whole library, encrypts it with AES-256-GCM using a key from PBKDF2-SHA256 (600,000 rounds, fresh salt and IV on every build), and checks that it decrypts before writing anything. Only ciphertext is published. | `dist/` contains no readable dashboard text, and the right PIN opens it on a phone. |

## House rules for future edits

- The PIN lives only in the `LIBRARY_PIN` environment variable at build time. Never commit it, log it or write it to a file in the repo.
- Readable copies of the dashboards (`content/`) stay out of git, because this repository is public. `tools/unpack.mjs` recovers them from `dist/` with the PIN.
- When a dashboard changes on claude.ai, refresh its copy in `content/dashboards/`, run `tools/snapshot.mjs` for that dashboard, then rebuild.
- Every number on the landing page comes from the dashboards themselves. Don't round, guess or add facts that aren't in them.
