// Builds Arden's Knowledge Library into dist/ as ciphertext.
//
//   LIBRARY_PIN=123456 node tools/build.mjs
//
// Every page is its own encrypted file:
//   dist/index.html        the library (landing page)
//   dist/<id>/index.html   each dashboard, with the "← Library" button (library/back.js) added,
//                          plus library/fixes/<id>.css when that file exists (small fixes to the
//                          library's copy of a dashboard, e.g. buttons that jump on hover; they
//                          come before the dashboard's own styles, so every rule needs !important)
//                          and library/fixes/<id>.patch.json when that exists (exact find → replace
//                          edits to the library's copy, e.g. a timeline that should wait for a tap)
// All pages share one key: PBKDF2-SHA256(PIN, one 16-byte random salt per build, 600,000 rounds).
// Each page gets its own random IV and is gzipped (level 9) before AES-256-GCM.
// Unlocking any page stores the derived key in sessionStorage for this tab, so moving between
// pages needs no PIN until the tab is closed.
// Before writing, every page is decrypted again in this process and compared with the original,
// and afterwards dist/ is searched for readable dashboard text. Node 20+, built-ins only.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv, createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ITER = 600000;
const FONTS = 'https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@50..150,700..900&family=Archivo:wdth,wght@62..125,800..900&family=Big+Shoulders+Display:wght@800;900&family=Bricolage+Grotesque:opsz,wght@12..96,700..800&family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,400..900,0..100,0..1;1,9..144,400..900,0..100,0..1&family=Fredoka:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Source+Sans+3:wght@400;500;600;700&family=Space+Grotesk:wght@700&family=DM+Serif+Display:ital@0;1&display=swap';
const BRIDGE_START = '<!--kl-back-->', BRIDGE_END = '<!--/kl-back-->';

const fail = m => { console.error(m); process.exit(1); };
const PIN = process.env.LIBRARY_PIN;
if (!PIN) fail('LIBRARY_PIN is not set. Nothing was built.');
if (!/^\d{4,12}$/.test(PIN)) fail('LIBRARY_PIN must be 4 to 12 digits. Nothing was built.');

const read = p => readFileSync(resolve(ROOT, p), 'utf8');
const manifest = JSON.parse(read('library/manifest.json'));
if (!existsSync(resolve(ROOT, 'content/index.json'))) fail('content/ is missing. Run tools/unpack.mjs (or refresh the dashboards and run tools/snapshot.mjs) first. Nothing was built.');
const index = JSON.parse(read('content/index.json'));
for (const d of manifest.dashboards) {
  if (!/^[a-z0-9-]+$/.test(d.id)) fail(`Dashboard id "${d.id}" can't be used as a folder name. Nothing was built.`);
  if (!index[d.id]) fail(`content/index.json has no entry for "${d.id}". Run tools/snapshot.mjs ${d.id}. Nothing was built.`);
  if (!existsSync(resolve(ROOT, `content/dashboards/${d.id}.html`))) fail(`content/dashboards/${d.id}.html is missing. Nothing was built.`);
}

const scriptSafe = s => s.replace(/<\/script/gi, '<\\/script');
const jsonSafe = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16));
const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// --- 1. the readable pages
const built = new Date().toISOString();
const landing = read('library/shell.html')
  .replace('/*{{CSS}}*/', () => read('library/library.css'))
  .replace('/*{{JS}}*/', () => scriptSafe(read('library/library.js')))
  .replace('{{DATA}}', () => jsonSafe({ built, manifest, index }))
  .replace('{{FONTS}}', () => FONTS);
if (/\{\{[A-Z]+\}\}/.test(landing.replace(/<script id="kl-data"[\s\S]*?<\/script>/, ''))) fail('A placeholder was left in the library page. Nothing was built.');

const back = '<script>' + scriptSafe(read('library/back.js')) + '</script>';
// Each patch must match exactly once. One whose replacement is already there is skipped, so the copy
// that tools/unpack.mjs recovers (already patched) builds again; after a refresh they apply afresh.
function patchFor(id, src) {
  const f = `library/fixes/${id}.patch.json`;
  if (!existsSync(resolve(ROOT, f))) return src;
  JSON.parse(read(f)).forEach((p, i) => {
    if (src.includes(p.replace)) return;
    const n = src.split(p.find).length - 1;
    if (n !== 1) fail(`${f}, edit ${i + 1} (${p.why}) matches ${n} places in content/dashboards/${id}.html instead of 1. Check it against the refreshed dashboard. Nothing was built.`);
    src = src.replace(p.find, () => p.replace);
  });
  return src;
}
const fixesFor = id => existsSync(resolve(ROOT, `library/fixes/${id}.css`)) ? '<style id="kl-fixes">' + read(`library/fixes/${id}.css`).replace(/<\//g, '<\\/') + '</style>' : '';
const pages = [{ path: 'index.html', html: landing, title: manifest.title, eyebrow: `${WORDS[manifest.dashboards.length] || manifest.dashboards.length} dashboards · one door`, sub: 'Enter the PIN to open the library.', bg: 'var(--bg)' }];
for (const d of manifest.dashboards) {
  const src = patchFor(d.id, read(`content/dashboards/${d.id}.html`));
  if (!/<head(\s[^>]*)?>/i.test(src)) fail(`content/dashboards/${d.id}.html has no <head>. Nothing was built.`);
  pages.push({
    path: `${d.id}/index.html`,
    // the markers let unpack.mjs take it all out again
    html: src.replace(/<head(\s[^>]*)?>/i, m => m + BRIDGE_START + back + fixesFor(d.id) + BRIDGE_END),
    title: `${d.title} · ${manifest.title}`,
    eyebrow: manifest.title,
    sub: `Enter the PIN to open “${d.title}”.`,
    bg: d.bg || '#ffffff',
  });
}

// --- 2. one key per build, one IV per page; encrypt and self-test
const salt = randomBytes(16);
const key = pbkdf2Sync(PIN, salt, ITER, 32, 'sha256');
const kid = createHash('sha256').update(salt).digest('base64url').slice(0, 16);
const shell = read('library/page.html');
let total = 0;
for (const pg of pages) {
  const plain = Buffer.from(pg.html, 'utf8');
  const gz = gzipSync(plain, { level: 9 });
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(gz), c.final(), c.getAuthTag()]);
  try {
    const dec = createDecipheriv('aes-256-gcm', pbkdf2Sync(PIN, salt, ITER, 32, 'sha256'), iv);
    dec.setAuthTag(ct.subarray(ct.length - 16));
    if (!gunzipSync(Buffer.concat([dec.update(ct.subarray(0, ct.length - 16)), dec.final()])).equals(plain)) throw new Error('mismatch');
  } catch (e) { fail(`Encryption self-test failed for ${pg.path}. Nothing was published.`); }
  const payload = JSON.stringify({ v: 2, it: ITER, s: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64'), kid });
  pg.out = shell
    .replace('{{PAGE_TITLE}}', () => esc(pg.title))
    .replace('{{EYEBROW}}', () => esc(pg.eyebrow))
    .replace('{{SUB}}', () => esc(pg.sub))
    .replace('{{BG}}', () => pg.bg)
    .replace('{{KID}}', () => kid)
    .replace('{{FONTS}}', () => FONTS)
    .replace(/\{\{LEN\}\}/g, () => String(PIN.length))
    .replace('{{CELLS}}', () => '<i></i>'.repeat(PIN.length))
    .replace('{{PAYLOAD}}', () => payload);
  if (/\{\{[A-Z_]+\}\}/.test(pg.out.replace(payload, ''))) fail(`A placeholder was left in the shell for ${pg.path}. Nothing was built.`);
  pg.sizes = [plain.length, gz.length, pg.out.length];
  total += pg.out.length;
}

// --- 3. write
const dist = resolve(ROOT, 'dist');
if (existsSync(dist)) for (const f of readdirSync(dist)) rmSync(resolve(dist, f), { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const pg of pages) {
  mkdirSync(dirname(resolve(dist, pg.path)), { recursive: true });
  writeFileSync(resolve(dist, pg.path), pg.out);
}
writeFileSync(resolve(dist, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

// --- 4. nothing readable may leak into dist/
// (The PIN pages name their dashboard, and titles are public in library/manifest.json anyway,
// so text that is already in the manifest is not probed. Everything else must stay encrypted.)
const PUBLIC = JSON.stringify(manifest);
const probes = ['kl-data', 'kl-back', 'time-machine', '__klBack'];
for (const d of manifest.dashboards) {
  probes.push(d.intro.slice(0, 40));
  (index[d.id].headings || []).filter(h => h.text.length > 12 && !PUBLIC.includes(h.text)).slice(0, 6).forEach(h => probes.push(h.text));
}
for (const pg of pages) {
  const leaks = probes.filter(p => pg.out.includes(p));
  if (leaks.length) {
    rmSync(dist, { recursive: true, force: true });
    fail(`Readable text found in dist/${pg.path} (${leaks.slice(0, 3).join(' | ')}). Nothing was published.`);
  }
}

const kb = n => (n / 1024).toFixed(0) + ' KB';
for (const pg of pages) console.log(`  dist/${pg.path.padEnd(22)} ${kb(pg.sizes[2]).padStart(7)}  (page ${kb(pg.sizes[0])} → gzip ${kb(pg.sizes[1])})`);
console.log(`Built ${pages.length} encrypted pages, ${kb(total)} in all. AES-256-GCM, PBKDF2 ×${ITER.toLocaleString('en-US')}, ${PIN.length}-digit PIN, key id ${kid}.`);
console.log(`Self-test passed for every page. ${probes.length} readable-text probes found nothing in dist/.`);
