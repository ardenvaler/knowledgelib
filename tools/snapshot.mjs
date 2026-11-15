// Opens every dashboard in content/dashboards/ with headless Chromium and writes
//   content/index.json – each dashboard's own section links, headings, source count and colours,
// which the library uses for search, the Contents list and the source counts.
// Run after adding or refreshing a dashboard:  node tools/snapshot.mjs [id ...]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(execSync('npm root -g').toString().trim() + '/playwright'); }

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'library/manifest.json'), 'utf8'));
const only = process.argv.slice(2);
const W = 1280, H = 800;

const indexPath = resolve(ROOT, 'content/index.json');
let index = {};
try { index = JSON.parse(readFileSync(indexPath, 'utf8')); } catch {}

const browser = await playwright.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });

for (const d of manifest.dashboards) {
  if (only.length && !only.includes(d.id)) continue;
  const file = resolve(ROOT, 'content/dashboards', d.id + '.html');
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle' }).catch(e => console.warn(d.id, e.message));
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(1200);

  const info = await page.evaluate(() => {
    const clean = s => (s || '').replace(/\s+/g, ' ').trim();
    const visible = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0); };
    const nav = [], seen = new Set();
    document.querySelectorAll('nav a[href^="#"], header a[href^="#"], [role=navigation] a[href^="#"]').forEach(a => {
      const href = a.getAttribute('href'), text = clean(a.textContent);
      if (!text || href.length < 2 || seen.has(href) || text.length > 40) return;
      seen.add(href); nav.push({ text, href });
    });
    const headings = [...document.querySelectorAll('h1, h2, h3')].filter(visible).map(h => {
      const holder = h.id ? h : h.closest('[id]');
      return { level: +h.tagName[1], text: clean(h.textContent), anchor: holder && holder.id ? '#' + holder.id : '' };
    }).filter(h => h.text && h.text.length < 140);
    const bgOf = el => getComputedStyle(el).backgroundColor;
    let bg = bgOf(document.body);
    if (/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) bg = bgOf(document.documentElement);
    return { title: document.title, description: clean((document.querySelector('meta[name=description]') || {}).content), nav, headings, bg, height: document.documentElement.scrollHeight };
  });

  // Sources cited = unique external links plus unique DOIs (a DOI and its doi.org link count once; fonts excluded).
  const html = readFileSync(file, 'utf8').replace(/\\u003c/g, '<').replace(/\\\//g, '/');
  const urls = new Set();
  for (const raw of html.match(/https?:\/\/[^\s"'<>`)\\]+/g) || []) {
    const u = raw.replace(/[.,;]+$/, '').split('#')[0];
    if (/fonts\.(googleapis|gstatic)\.com|w3\.org|schema\.org/.test(u)) continue;
    // any link that carries a DOI (doi.org or a publisher's /doi/ path) counts as that DOI
    const doi = /(?:doi\.org\/|\/doi\/(?:abs\/|full\/|pdf\/)?)(10\.\d{4,9}\/[^?#]+)/i.exec(u);
    urls.add(doi ? 'doi:' + decodeURIComponent(doi[1]).replace(/[.,;)]+$/, '').toLowerCase() : u);
  }
  for (const d of html.match(/\b10\.\d{4,9}\/[^\s"'<>`\\]+/g) || []) urls.add('doi:' + d.replace(/[.,;)]+$/, '').toLowerCase());

  index[d.id] = { ...info, sources: urls.size };
  console.log(`${d.id}: ${info.nav.length} sections, ${info.headings.length} headings, ${urls.size} sources, bg ${info.bg}`);
  await page.close();
}
await browser.close();
writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
