// Recovers the readable library (content/) from the encrypted build in dist/.
// Use it before refreshing a dashboard or changing the PIN:
//
//   LIBRARY_PIN=<current PIN> node tools/unpack.mjs
//
// Writes content/dashboards/*.html, content/previews/*.webp and content/index.json.
// content/ is git-ignored: this repository is public, so readable copies never get committed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { pbkdf2Sync, createDecipheriv } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fail = m => { console.error(m); process.exit(1); };
const PIN = process.env.LIBRARY_PIN;
if (!PIN) fail('LIBRARY_PIN is not set. Nothing was unpacked.');

const lock = readFileSync(resolve(ROOT, 'dist/index.html'), 'utf8');
const m = /<script id="payload" type="application\/json">([\s\S]*?)<\/script>/.exec(lock);
if (!m) fail('dist/index.html has no payload.');
const P = JSON.parse(m[1]);
const ct = Buffer.from(P.ct, 'base64');
let html;
try {
  const dec = createDecipheriv('aes-256-gcm', pbkdf2Sync(PIN, Buffer.from(P.s, 'base64'), P.it, 32, 'sha256'), Buffer.from(P.iv, 'base64'));
  dec.setAuthTag(ct.subarray(ct.length - 16));
  html = gunzipSync(Buffer.concat([dec.update(ct.subarray(0, ct.length - 16)), dec.final()])).toString('utf8');
} catch (e) { fail('Wrong PIN, or dist/index.html is damaged. Nothing was unpacked.'); }

const d = /<script id="kl-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
if (!d) fail('The decrypted library has no data block.');
const data = JSON.parse(d[1]);
mkdirSync(resolve(ROOT, 'content/dashboards'), { recursive: true });
mkdirSync(resolve(ROOT, 'content/previews'), { recursive: true });
for (const [id, page] of Object.entries(data.pages)) writeFileSync(resolve(ROOT, `content/dashboards/${id}.html`), page);
for (const [id, uri] of Object.entries(data.previews)) writeFileSync(resolve(ROOT, `content/previews/${id}.webp`), Buffer.from(uri.split(',')[1], 'base64'));
writeFileSync(resolve(ROOT, 'content/index.json'), JSON.stringify(data.index, null, 2) + '\n');
console.log(`Unpacked ${Object.keys(data.pages).length} dashboards (built ${data.built}) into content/.`);
