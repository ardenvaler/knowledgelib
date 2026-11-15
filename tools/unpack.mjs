// Recovers the readable library (content/) from the encrypted build in dist/.
// Use it before refreshing a dashboard or changing the PIN:
//
//   LIBRARY_PIN=<current PIN> node tools/unpack.mjs
//
// Writes content/dashboards/<id>.html (without the injected Library button and fixes) and
// content/index.json. content/ is git-ignored: this repository is public, so readable
// copies never get committed.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { pbkdf2Sync, createDecipheriv } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fail = m => { console.error(m); process.exit(1); };
const PIN = process.env.LIBRARY_PIN;
if (!PIN) fail('LIBRARY_PIN is not set. Nothing was unpacked.');

let key = null, salt = null;
function open(path) {
  const page = readFileSync(resolve(ROOT, path), 'utf8');
  const m = /<script id="payload" type="application\/json">([\s\S]*?)<\/script>/.exec(page);
  if (!m) fail(`${path} has no payload.`);
  const P = JSON.parse(m[1]);
  if (!key || salt !== P.s) { salt = P.s; key = pbkdf2Sync(PIN, Buffer.from(P.s, 'base64'), P.it, 32, 'sha256'); }
  const ct = Buffer.from(P.ct, 'base64');
  try {
    const dec = createDecipheriv('aes-256-gcm', key, Buffer.from(P.iv, 'base64'));
    dec.setAuthTag(ct.subarray(ct.length - 16));
    return gunzipSync(Buffer.concat([dec.update(ct.subarray(0, ct.length - 16)), dec.final()])).toString('utf8');
  } catch (e) { fail(`Wrong PIN, or ${path} is damaged. Nothing was unpacked.`); }
}

const landing = open('dist/index.html');
const d = /<script id="kl-data" type="application\/json">([\s\S]*?)<\/script>/.exec(landing);
if (!d) fail('The decrypted library has no data block.');
const data = JSON.parse(d[1]);
mkdirSync(resolve(ROOT, 'content/dashboards'), { recursive: true });
let n = 0;
for (const db of data.manifest.dashboards) {
  const path = `dist/${db.id}/index.html`;
  if (!existsSync(resolve(ROOT, path))) { console.warn(`(skipped ${db.id}: ${path} not found)`); continue; }
  const html = open(path).replace(/<!--kl-back-->[\s\S]*?<!--\/kl-back-->/g, '');
  writeFileSync(resolve(ROOT, `content/dashboards/${db.id}.html`), html);
  n++;
}
writeFileSync(resolve(ROOT, 'content/index.json'), JSON.stringify(data.index, null, 2) + '\n');
console.log(`Unpacked ${n} dashboards (built ${data.built}) into content/.`);
