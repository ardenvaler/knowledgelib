// Builds Arden's Knowledge Library into dist/ as ciphertext.
//
//   LIBRARY_PIN=123456 node tools/build.mjs
//
// 1. Bundles library/ (landing page, viewer, styles) with content/ (the dashboards,
//    their previews and section index) into one HTML document.
// 2. gzip level 9, then AES-256-GCM. Key = PBKDF2-SHA256(PIN, 16-byte random salt, 600,000 rounds).
//    Fresh salt and IV on every build.
// 3. Self-test: decrypts and gunzips in the same process and compares with the original.
// 4. Writes only dist/index.html (the lock page plus the ciphertext) and dist/robots.txt,
//    then checks that no readable dashboard text made it into dist/.
// Node 20+, built-ins only.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv, createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ITER = 600000;
const FONTS = 'https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@50..150,700..900&family=Archivo:wdth,wght@62..125,800..900&family=Big+Shoulders+Display:wght@800;900&family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,400..900,0..100,0..1;1,9..144,400..900,0..100,0..1&family=Fredoka:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Source+Sans+3:wght@400;500;600;700&display=swap';

const fail = m => { console.error(m); process.exit(1); };
const PIN = process.env.LIBRARY_PIN;
if (!PIN) fail('LIBRARY_PIN is not set. Nothing was built.');
if (!/^\d{4,12}$/.test(PIN)) fail('LIBRARY_PIN must be 4 to 12 digits. Nothing was built.');

const read = p => readFileSync(resolve(ROOT, p), 'utf8');
const manifest = JSON.parse(read('library/manifest.json'));
if (!existsSync(resolve(ROOT, 'content/index.json'))) fail('content/ is missing. Run tools/unpack.mjs (or refresh the dashboards and run tools/snapshot.mjs) first. Nothing was built.');
const index = JSON.parse(read('content/index.json'));

const pages = {}, previews = {};
for (const d of manifest.dashboards) {
  pages[d.id] = read(`content/dashboards/${d.id}.html`);
  previews[d.id] = 'data:image/webp;base64,' + readFileSync(resolve(ROOT, `content/previews/${d.id}.webp`)).toString('base64');
  if (!index[d.id]) fail(`content/index.json has no entry for "${d.id}". Run tools/snapshot.mjs ${d.id}. Nothing was built.`);
}

// --- 1. bundle
const data = { built: new Date().toISOString(), manifest, index, previews, pages };
const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16));
const inlineScript = s => s.replace(/<\/script/gi, '<\\/script');
const html = read('library/shell.html')
  .replace('/*{{CSS}}*/', () => read('library/library.css'))
  .replace('/*{{JS}}*/', () => inlineScript(read('library/library.js')))
  .replace('{{DATA}}', () => json)
  .replace('{{FONTS}}', () => FONTS);
if (/\{\{[A-Z]+\}\}/.test(html.replace(json, ''))) fail('A placeholder was left in the library page. Nothing was built.');

// --- 2. gzip + encrypt
const plain = Buffer.from(html, 'utf8');
const gz = gzipSync(plain, { level: 9 });
const salt = randomBytes(16), iv = randomBytes(12);
const key = pbkdf2Sync(PIN, salt, ITER, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([cipher.update(gz), cipher.final(), cipher.getAuthTag()]);

// --- 3. self-test
try {
  const dec = createDecipheriv('aes-256-gcm', pbkdf2Sync(PIN, salt, ITER, 32, 'sha256'), iv);
  dec.setAuthTag(ct.subarray(ct.length - 16));
  const back = gunzipSync(Buffer.concat([dec.update(ct.subarray(0, ct.length - 16)), dec.final()]));
  if (!back.equals(plain)) throw new Error('mismatch');
} catch (e) { fail('Encryption self-test failed. Nothing was published.'); }

// --- 4. write the lock page
const id = createHash('sha256').update(ct).digest('base64').slice(0, 16);
const payload = JSON.stringify({ v: 1, it: ITER, s: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64'), id });
const lock = read('library/lock.html')
  .replace('{{FONTS}}', () => FONTS)
  .replace(/\{\{LEN\}\}/g, () => String(PIN.length))
  .replace('{{CELLS}}', () => '<i></i>'.repeat(PIN.length))
  .replace('{{COUNT}}', () => { const w = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'][manifest.dashboards.length]; return w || String(manifest.dashboards.length); })
  .replace('{{PAYLOAD}}', () => payload);

const dist = resolve(ROOT, 'dist');
if (existsSync(dist)) for (const f of readdirSync(dist)) rmSync(resolve(dist, f), { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
writeFileSync(resolve(dist, 'index.html'), lock);
writeFileSync(resolve(dist, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

// --- 5. nothing readable may leak into dist/
const out = readFileSync(resolve(dist, 'index.html'), 'utf8');
const probes = [];
for (const d of manifest.dashboards) {
  probes.push(d.blurb.slice(0, 40));
  (index[d.id].headings || []).slice(0, 4).forEach(h => h.text.length > 12 && probes.push(h.text));
}
probes.push('kl-data', 'time-machine', 'Viewer.open');
const leaks = probes.filter(p => out.includes(p));
if (leaks.length) {
  rmSync(resolve(dist, 'index.html'));
  fail('Readable text found in dist/index.html (' + leaks.slice(0, 3).join(' | ') + '). Nothing was published.');
}

const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`Built dist/index.html: ${kb(lock.length)} (library ${kb(plain.length)} → gzip ${kb(gz.length)} → AES-256-GCM, PBKDF2 ×${ITER.toLocaleString('en-US')}, ${PIN.length}-digit PIN)`);
console.log(`Self-test passed. No readable dashboard text in dist/. Payload id ${id}.`);
