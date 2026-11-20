/* Arden's Knowledge Library: the landing page and the Time Machine.
   Dashboards are separate pages (/<id>/); this page only links to them. */
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n).toLocaleString('en-US');
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = () => !RM.matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const norm = s => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2019\u2018]/g, "'");

  /* ---------- data ---------- */
  const dataEl = document.getElementById('kl-data');
  const DATA = JSON.parse(dataEl.textContent);
  dataEl.remove();
  const M = DATA.manifest, IX = DATA.index || {};
  const DASH = M.dashboards;
  const BY = {};
  DASH.forEach((d, i) => {
    d.n = i + 1;
    d.num = String(i + 1).padStart(2, '0');
    // a dashboard's own count of its sources when it states one (manifest), otherwise the links it cites
    d.sources = d.sources || (IX[d.id] && IX[d.id].sources) || 0;
    d.facts = d.facts.map(([v, l]) => [v === '{sources}' ? fmt(d.sources) : v, l]);
    d.secs = d.sections.map(([t, a]) => ({ t, a }));
    BY[d.id] = d;
  });
  const TOTAL_SOURCES = DASH.filter(d => d.id !== 'prompts').reduce((s, d) => s + d.sources, 0);
  const TOTAL_SECTIONS = DASH.reduce((s, d) => s + d.secs.length, 0);
  const BRIEFS = DASH.filter(d => d.id !== 'prompts');
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const word = n => WORDS[n] || String(n);
  // keys 1-9 open the first nine dashboards, 0 the tenth
  const KEYS = DASH.length > 9 ? '<kbd>1</kbd>–<kbd>9</kbd> and <kbd>0</kbd>' : `<kbd>1</kbd>–<kbd>${DASH.length}</kbd>`;
  const Word = n => { const w = word(n); return w.charAt(0).toUpperCase() + w.slice(1); };
  const ROOT = document.documentElement;
  // old links like #/amoc or #/amoc/ice now live at /amoc/ and /amoc/#ice
  const legacy = () => {
    const old = /^#\/([\w-]+)(?:\/([\w-]+))?/.exec(location.hash);
    if (!old || !BY[old[1]]) return false;
    location.replace(`/${old[1]}/${old[2] ? '#' + old[2] : ''}`);
    return true;
  };
  if (legacy()) return;
  addEventListener('hashchange', legacy);

  /* ---------- icons ---------- */
  const ICON = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    shelf: '<path d="M4 4v16M9 4v16M14 5l4 15M3 20h18"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    prev: '<path d="M15 5 8 12l7 7"/>',
    next: '<path d="m9 5 7 7-7 7"/>',
    play: '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/>',
    pause: '<rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/>'
  };
  const svg = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

  /* ---------- theme ---------- */
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  function applyMode(m) {
    const mode = m === 'light' || m === 'dark' ? m : (darkMQ.matches ? 'dark' : 'light');
    ROOT.dataset.mode = mode;
    $$('.mode-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(ROOT).getPropertyValue('--bg').trim() || '#f6f4ee';
  }
  applyMode(store.get('kl.mode', null));
  darkMQ.addEventListener('change', () => { if (!store.get('kl.mode', null)) applyMode(null); });
  $$('.mode-btn').forEach(b => b.addEventListener('click', () => { store.set('kl.mode', b.dataset.mode); applyMode(b.dataset.mode); TMachine.redraw(); }));

  /* ---------- going to a dashboard ---------- */
  // Every dashboard is its own page. The library remembers where you were,
  // so the "← Library" button on a dashboard brings you back to the same spot.
  const pageOf = (id, sec) => `/${id}/${sec || ''}`;
  const remember = () => { try { sessionStorage.setItem('kl.y', String(Math.round(scrollY))); } catch (e) { /* storage unavailable */ } };
  function go(id, sec) { if (!BY[id]) return; remember(); location.href = pageOf(id, sec); }
  addEventListener('pagehide', remember);
  // fetch a dashboard page while the pointer is on its link, where the browser supports it
  const fetched = new Set();
  function prefetch(id) {
    if (!BY[id] || fetched.has(id)) return;
    fetched.add(id);
    const l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = pageOf(id);
    document.head.append(l);
  }
  const intent = e => { const a = e.target.closest && e.target.closest('a[data-id]'); if (a) prefetch(a.dataset.id); };
  document.addEventListener('pointerover', intent, { passive: true });
  document.addEventListener('touchstart', intent, { passive: true });

  /* ---------- hero ---------- */
  function renderHero() {
    $('#hero').innerHTML = `
      <div class="hero-tags">
        <span class="tag">${svg('shelf')}${DASH.length} dashboards</span>
        <span class="tag accent">${svg('spark')}Food for thought</span>
        <span class="tag ok"><i></i>Unlocked</span>
      </div>
      <h1 id="hero-title"><span class="h1-a">Arden’s</span>Knowledge Library</h1>
      <p class="hero-sub">${esc(M.tagline)}</p>
      <p class="hero-lead">${esc(M.lead.replace('{n}', Word(DASH.length)))}</p>
      <div class="hero-cta">
        <a class="btn primary" href="#shelf" data-scroll="#shelf">${svg('shelf')}See all dashboards</a>
        <button class="btn" type="button" data-surprise>${svg('dice')}Surprise me</button>
        <button class="btn" type="button" data-focus-search>${svg('search')}Search <kbd>/</kbd></button>
      </div>
      <div class="tiles">
        <div class="tile"><span>Dashboards</span><b>${DASH.length}</b><small>one PIN</small></div>
        <div class="tile"><span>Sources</span><b>${fmt(TOTAL_SOURCES)}</b><small>across ${word(BRIEFS.length)} dashboards</small></div>
        <div class="tile"><span>Sections</span><b>${TOTAL_SECTIONS}</b><small>listed in Contents</small></div>
        <div class="tile"><span>Years in view</span><b>122,000</b><small>and on to 2100</small></div>
      </div>`;
  }

  function renderGlance() {
    const newest = DASH.slice().sort((a, b) => (a.iso < b.iso ? 1 : -1))[0];
    $('#glance').innerHTML = `
      <h2>What’s on the shelf</h2>
      <p class="g-sub">${fmt(TOTAL_SOURCES)} sources across ${word(BRIEFS.length)} dashboards, plus ${BY.prompts ? esc(BY.prompts.facts[0][0]) : ''} prompts.</p>
      <div class="stack" aria-label="Sources, by dashboard">
        ${BRIEFS.map(d => `<a class="d-${d.id}" href="${pageOf(d.id)}" data-id="${d.id}" style="--n:${d.sources}" data-tip="<b>${esc(d.title)}</b><br>${d.sources} sources" aria-label="${esc(d.title)}: ${d.sources} sources"></a>`).join('')}
      </div>
      <div class="stack-cap"><span>sources</span><span>${fmt(TOTAL_SOURCES)}</span></div>
      <div class="g-rows">
        ${DASH.map(d => `<a class="g-row d-${d.id}" href="${pageOf(d.id)}" data-id="${d.id}">
          <span class="gn">${d.num}</span>
          <span><span class="gt">${esc(d.title)}</span><span class="gk">${esc(d.kind)} · ${esc(d.topic)}</span></span>
          <span class="gv">${d.id === 'prompts' ? esc(d.facts[0][0]) + ' prompts' : d.sources + ' sources'}<small>${esc(d.date)}</small></span>
        </a>`).join('')}
      </div>
      <a class="g-more d-${newest.id}" href="${pageOf(newest.id)}" data-id="${newest.id}"><span>Newest: ${esc(newest.title)}</span>${svg('arrow')}</a>`;
  }

  /* ---------- the shelf ---------- */
  function renderShelf() {
    $('#shelf-sub').innerHTML = `Each one opens on its own page. Press ${KEYS} to jump straight to ${DASH.length > 10 ? 'one of the first ten' : 'one'}.`;
    $('#shelf-grid').innerHTML = DASH.map((d, i) => `<a class="card d-${d.id}${i === 0 && DASH.length % 2 ? ' wide' : ''}" href="${pageOf(d.id)}" data-id="${d.id}">
        <span class="c-top"><span class="c-num">${d.num}</span><span class="c-tags"><b>${esc(d.kind)}</b> · ${esc(d.topic)}</span><span class="c-date">Updated ${esc(d.date)}</span></span>
        <h3 class="ct t-${d.id}">${d.titleHtml}</h3>
        <p class="c-intro">${esc(d.intro)}</p>
        <span class="c-open">Open ${svg('arrow')}</span>
      </a>`).join('');
  }

  /* ---------- contents ---------- */
  function renderTOC() {
    $('#toc').style.setProperty('--toc-cols', DASH.length <= 5 ? DASH.length : Math.ceil(DASH.length / 2));
    $('#toc').innerHTML = DASH.map(d => `<div class="toc-col d-${d.id}">
      <a class="toc-h" href="${pageOf(d.id)}" data-id="${d.id}"><span class="tn">${d.num}</span><span class="tt">${esc(d.title)}</span></a>
      <ol>${d.secs.map(s => `<li><a href="${pageOf(d.id, s.a)}" data-id="${d.id}">${esc(s.t)}</a></li>`).join('')}</ol>
    </div>`).join('');
  }

  function renderFoot() {
    $('#foot').innerHTML = `<div class="foot-in">
      <div><b>Arden’s Knowledge Library</b><p>${Word(DASH.length)} dashboards behind one PIN. Each opens on its own page and is a copy of its Claude artifact as of ${esc(new Date(DATA.built).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))}.</p></div>
      <div class="keys"><span>${KEYS} open ${DASH.length > 10 ? 'the first ten' : 'a dashboard'}</span><span><kbd>/</kbd> search all ${word(DASH.length)}</span><span>The <b>← Library</b> button on a dashboard brings you back</span></div>
      <button type="button" class="btn" data-lock>Lock the library</button>
    </div>`;
  }

  /* ---------- tooltips ---------- */
  const tip = $('#tip');
  let tipEl = null;
  function showTip(el, x, y) {
    tipEl = el;
    tip.innerHTML = el.getAttribute('data-tip');
    tip.classList.add('on');
    placeTip(x, y);
  }
  function placeTip(x, y) {
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = x + 14, top = y + 16;
    if (left + w > innerWidth - 8) left = x - w - 14;
    if (top + h > innerHeight - 8) top = y - h - 14;
    tip.style.transform = 'none';
    tip.style.left = Math.max(8, left) + 'px';
    tip.style.top = Math.max(8, top) + 'px';
  }
  function hideTip() { tipEl = null; tip.classList.remove('on'); }
  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el && el !== tipEl) showTip(el, e.clientX, e.clientY);
    else if (!el && tipEl) hideTip();
  });
  document.addEventListener('pointermove', e => { if (tipEl) placeTip(e.clientX, e.clientY); });
  document.addEventListener('focusin', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left, r.bottom - 8); } else hideTip();
  });
  document.addEventListener('scroll', hideTip, { passive: true });

  /* ---------- search ---------- */
  const Search = (() => {
    const box = $('#search'), q = $('#q'), out = $('#results');
    const narrow = matchMedia('(max-width: 760px)');
    const hint = () => { q.placeholder = narrow.matches ? 'Search' : `Search all ${word(DASH.length)} dashboards`; };
    hint();
    narrow.addEventListener('change', hint);
    q.setAttribute('aria-label', `Search all ${word(DASH.length)} dashboards`);
    const idx = [];
    DASH.forEach(d => {
      idx.push({ k: 'dash', id: d.id, t: d.title, s: `${d.kind} · ${d.topic}`, hay: norm([d.title, d.short, d.kind, d.topic, d.blurb].join(' ')) });
      const seen = new Set();
      d.secs.forEach(s => { seen.add(norm(s.t)); idx.push({ k: 'sec', id: d.id, t: s.t, s: d.title, a: s.a, hay: norm(s.t + ' ' + d.short) }); });
      ((IX[d.id] && IX[d.id].headings) || []).forEach(h => {
        const n = norm(h.text);
        if (h.level === 1 || seen.has(n)) return;
        seen.add(n);
        idx.push({ k: 'head', id: d.id, t: h.text, s: d.title, a: h.anchor, find: h.text, hay: n });
      });
    });
    const KIND = { dash: 'Dashboard', sec: 'Section', head: 'Heading' };
    let res = [], act = -1;
    const mark = (t, terms) => {
      let s = esc(t);
      terms.forEach(w => { if (w.length < 2) return; const i = norm(t).indexOf(w); if (i >= 0) s = esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + w.length)) + '</mark>' + esc(t.slice(i + w.length)); });
      return s;
    };
    function find(v) {
      const n = norm(v.trim());
      if (!n) return [];
      const terms = n.split(/\s+/);
      const hits = [];
      for (const it of idx) {
        if (!terms.every(w => it.hay.includes(w))) continue;
        const tt = norm(it.t);
        let sc = { dash: 30, sec: 20, head: 10 }[it.k];
        if (tt.startsWith(n)) sc += 15; else if (tt.includes(n)) sc += 8;
        hits.push([sc, it]);
      }
      return hits.sort((a, b) => b[0] - a[0]).slice(0, 14).map(h => h[1]);
    }
    function draw() {
      const v = q.value;
      const terms = norm(v.trim()).split(/\s+/).filter(Boolean);
      res = v.trim() ? find(v) : idx.filter(it => it.k === 'dash');
      act = res.length ? 0 : -1;
      out.innerHTML = (v.trim() ? '' : '<div class="res-group">Jump to a dashboard</div>') + (res.length
        ? res.map((it, i) => `<div class="res d-${it.id}" role="option" id="res-${i}" data-i="${i}" aria-selected="${i === act}"><span class="dot"></span><span><span class="rt">${mark(it.t, terms)}</span><span class="rs">${esc(it.s)}</span></span><span class="rk">${KIND[it.k]}</span></div>`).join('')
        : `<div class="res-empty">Nothing on the shelf matches “${esc(v.trim())}”. Try “ice”, “Senate”, “myelin” or “Bahasa”.</div>`);
      out.hidden = false;
      q.setAttribute('aria-expanded', 'true');
      if (act >= 0) q.setAttribute('aria-activedescendant', 'res-' + act);
      if (res[0]) prefetch(res[0].id);
    }
    function setAct(i) {
      act = i;
      $$('.res', out).forEach(el => el.setAttribute('aria-selected', String(+el.dataset.i === act)));
      const el = $(`#res-${act}`);
      if (el) { el.scrollIntoView({ block: 'nearest' }); q.setAttribute('aria-activedescendant', el.id); prefetch(res[act].id); }
    }
    function choose(i) {
      const it = res[i];
      if (!it) return;
      close();
      go(it.id, it.k === 'dash' ? '' : (it.a || ''));
    }
    function close() { out.hidden = true; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); }
    q.addEventListener('input', draw);
    q.addEventListener('focus', draw);
    q.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (res.length) setAct((act + 1) % res.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (res.length) setAct((act - 1 + res.length) % res.length); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(act); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); q.blur(); }
    });
    out.addEventListener('pointerdown', e => e.preventDefault());
    out.addEventListener('click', e => { const el = e.target.closest('.res'); if (el) choose(+el.dataset.i); });
    out.addEventListener('pointermove', e => { const el = e.target.closest('.res'); if (el && +el.dataset.i !== act) setAct(+el.dataset.i); });
    document.addEventListener('pointerdown', e => { if (!box.contains(e.target)) close(); });
    return { focus() { scrollTo({ top: 0, behavior: motion() ? 'smooth' : 'auto' }); q.focus(); }, close, get open() { return !out.hidden; } };
  })();

  /* ---------- the Time Machine ---------- */
  const TMachine = (() => {
    const host = $('#time');
    const stops = M.timeline.slice().sort((a, b) => b.t - a.t);
    const NOW = new Date(M.today + 'T12:00:00Z');
    const TODAY = NOW.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const YEAR = NOW.getUTCFullYear() + (NOW - Date.UTC(NOW.getUTCFullYear(), 0, 1)) / 31557600000;
    const PAST = .87, LMAX = Math.log10(1 + 52 * 122000), LF = Math.log10(1 + 52 * 73.1);
    let W = 0, H = 0, G = 0, PW = 0, LH = 40, TOP = 34, AX = 34;
    let head = 0, cur = -1, playing = false, timer = 0, raf = 0;

    host.innerHTML = `
      <div class="mod-head">
        <span class="mod-ic">${svg('clock')}</span>
        <p class="mod-path" id="tm-title">arden / <b>time-machine</b></p>
        <span class="badge paused" id="tm-badge"><i></i><span>Paused</span></span>
        <span class="badge">Interactive</span>
        <p class="mod-desc">Drag across 122,000 years, from Greenland’s oldest ice to the 2100 forecasts, or press play. Each dashboard lights up where its story sits in time, and every stop links to the right part of that dashboard.</p>
      </div>
      <div class="tm">
        <div class="tm-grid">
          <div class="tm-plot" id="tm-plot" tabindex="0" role="slider" aria-label="Time Machine: drag through time" aria-valuemin="1" aria-valuemax="${stops.length}"></div>
          <div class="tm-panel" id="tm-panel" aria-live="polite"></div>
        </div>
        <div class="tm-ctl">
          <button type="button" class="play" id="tm-play" aria-label="Play">${svg('play')}</button>
          <button type="button" class="step-btn" id="tm-prev" aria-label="Previous stop">${svg('prev')}</button>
          <div class="stops" id="tm-stops">${stops.map((s, i) => `<button type="button" class="stop d-${s.id}" data-i="${i}" data-tip="<b>${esc(s.when)}</b><br>${esc(s.title)}" aria-label="${esc(s.when)}: ${esc(s.title)}"><i></i></button>`).join('')}</div>
          <button type="button" class="step-btn" id="tm-next" aria-label="Next stop">${svg('next')}</button>
        </div>
        <div class="tm-tiles">
          <div class="tile"><span>Looking</span><b id="tm-ago">–</b><small id="tm-ago-s">from ${TODAY}</small></div>
          <div class="tile"><span>Calendar</span><b id="tm-cal">–</b><small>approximate</small></div>
          <div class="tile"><span>In frame</span><b id="tm-in">–</b><div class="in-dots" id="tm-dots">${DASH.map(d => `<i class="d-${d.id}" data-tip="${esc(d.title)}"></i>`).join('')}</div></div>
          <div class="tile"><span>Stop</span><b id="tm-stop">–</b><small id="tm-stop-s"></small></div>
        </div>
      </div>`;
    const plot = $('#tm-plot'), panel = $('#tm-panel'), playBtn = $('#tm-play'), badge = $('#tm-badge');

    const xOf = t => t >= 0
      ? G + PW * PAST * (1 - Math.log10(1 + 52 * t) / LMAX)
      : G + PW * PAST + PW * (1 - PAST) * (Math.log10(1 + 52 * -t) / LF);
    const tOf = x => {
      const u = Math.min(1, Math.max(0, (x - G) / PW));
      if (u <= PAST) return (Math.pow(10, (1 - u / PAST) * LMAX) - 1) / 52;
      return -(Math.pow(10, (u - PAST) / (1 - PAST) * LF) - 1) / 52;
    };
    const laneY = id => TOP + DASH.findIndex(d => d.id === id) * LH + LH / 2;

    function agoText(t) {
      const a = Math.abs(t);
      let s;
      if (a >= 2) s = fmt(a >= 10000 ? Math.round(a / 100) * 100 : a >= 1000 ? Math.round(a / 10) * 10 : Math.round(a)) + ' years';
      else if (a >= 1) s = a.toFixed(1) + ' years';
      else if (a * 12 >= 1.5) s = Math.round(a * 12) + ' months';
      else if (a * 52 >= 1.5) s = Math.round(a * 52) + ' weeks';
      else if (a * 365 >= 1.5) s = Math.round(a * 365) + ' days';
      else return { big: 'Today', small: TODAY };
      return t >= 0 ? { big: s, small: 'ago' } : { big: s, small: 'from now' };
    }
    function calText(t) {
      const y = YEAR - t;
      const r = t >= 10000 ? 100 : t >= 1000 ? 10 : 1;
      if (y < 1) return fmt(Math.round((1 - y) / r) * r) + ' BCE';
      if (Math.abs(t) >= 1.5) return String(Math.round(Math.floor(y) / r) * r);
      const d = new Date(NOW.getTime() - t * 31557600000);
      return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    }

    function draw() {
      const r = plot.getBoundingClientRect();
      W = Math.max(280, r.width);
      const narrow = W < 560;
      G = narrow ? 34 : 152;
      LH = narrow ? 36 : 40;
      TOP = 34;
      H = TOP + DASH.length * LH + AX;
      PW = W - G - (narrow ? 14 : 22);
      plot.style.height = H + 'px';
      // [years ago, label, show on narrow screens]
      const ticks = [[100000, '100k yrs', 1], [10000, '10k', 0], [1000, '1,000', 0], [100, '100 yrs', 1], [10, '10 yrs', 0], [1, '1 yr', 1], [1 / 12, '1 mo', 0], [1 / 52, '1 wk', 0]];
      const futureX = xOf(0);
      let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <defs>
          <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" style="stroke:var(--line-2)" stroke-width="1.4"/></pattern>
          ${DASH.map(d => `<linearGradient id="g-${d.id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" style="stop-color:var(--c-${d.id})" stop-opacity=".16"/><stop offset="1" style="stop-color:var(--c-${d.id})" stop-opacity=".5"/></linearGradient>`).join('')}
        </defs>
        <rect class="future" x="${futureX}" y="${TOP - 18}" width="${G + PW - futureX + 8}" height="${DASH.length * LH + 18}" rx="8"/>
        <text class="future-t" x="${futureX + 6}" y="${TOP - 6}">${narrow ? 'NEXT' : 'FORECAST'}</text>`;
      ticks.forEach(([t, l, keep]) => { const x = xOf(t); s += `<line class="grid-l" x1="${x}" x2="${x}" y1="${TOP - 4}" y2="${H - AX + 4}"/>` + (narrow && !keep ? '' : `<text x="${x}" y="${H - 12}" text-anchor="middle">${l}</text>`); });
      s += `<line class="now-l" x1="${futureX}" x2="${futureX}" y1="${TOP - 18}" y2="${H - AX + 4}"/><text class="now-t" x="${narrow ? futureX - 3 : futureX}" y="${H - 12}" text-anchor="${narrow ? 'end' : 'middle'}">Now</text>`;
      s += `<text x="${xOf(-73.1) + (narrow ? 8 : 0)}" y="${H - 12}" text-anchor="end">2100</text>`;
      DASH.forEach(d => {
        const y = laneY(d.id), [a, b] = d.span, x1 = xOf(a), x2 = xOf(b);
        s += `<g class="lane d-${d.id}" data-id="${d.id}">
          <rect class="lane-row" x="0" y="${y - LH / 2}" width="${W}" height="${LH}"/>
          <line class="lane-base" x1="${G}" x2="${G + PW}" y1="${y}" y2="${y}"/>
          ${narrow ? `<circle cx="14" cy="${y}" r="6" style="fill:var(--c-${d.id})"/>` : `<circle cx="16" cy="${y}" r="5" style="fill:var(--c-${d.id})"/><text class="lane-l" x="28" y="${y - 2}">${esc(d.short)}</text><text class="lane-k" x="28" y="${y + 11}">${esc(d.kind)}</text>`}
          <rect x="${Math.min(x1, x2) - 7}" y="${y - 7}" width="${Math.abs(x2 - x1) + 14}" height="14" rx="7" fill="url(#g-${d.id})" style="stroke:var(--c-${d.id})" stroke-opacity=".55" stroke-width="1.2" data-tip="<b>${esc(d.title)}</b><br>${esc(spanText(d))}"/>
        </g>`;
      });
      stops.forEach((st, i) => {
        const y = laneY(st.id) + (st.row || 0) * 12;
        if (st.t2 != null) s += `<rect class="rng d-${st.id}" x="${xOf(st.t)}" y="${y - 3.5}" width="${Math.max(2, xOf(st.t2) - xOf(st.t))}" height="7" rx="3.5"/>`;
        s += `<circle class="mk-halo d-${st.id}" data-h="${i}" cx="${xOf(st.t)}" cy="${y}" r="9"/><circle class="mk d-${st.id}" data-i="${i}" cx="${xOf(st.t)}" cy="${y}" r="5.5" data-tip="<b>${esc(st.when)}</b><br>${esc(st.title)}"/>`;
      });
      s += `<g id="tm-head"><line class="ph-glow" x1="0" x2="0" y1="${TOP - 14}" y2="${H - AX + 2}"/><line class="ph-line" x1="0" x2="0" y1="${TOP - 14}" y2="${H - AX + 2}"/>
        <rect class="ph-pill" id="tm-pill" x="-40" y="${TOP - 32}" width="80" height="20" rx="10"/><text class="ph-txt" id="tm-pill-t" x="0" y="${TOP - 18}" text-anchor="middle"></text>
        <circle class="ph-knob" cx="0" cy="${H - AX + 2}" r="7"/></g></svg>`;
      plot.innerHTML = s;
      if (cur < 0) cur = 0;
      setHead(xOf(stops[cur].t), true);
      paintStop(cur, true, true);
    }
    function spanText(d) {
      const a = stops.filter(s => s.id === d.id);
      if (!a.length) return '';
      return a.length === 1 ? a[0].when : `${a[0].when} → ${a[a.length - 1].when}`;
    }

    function setHead(x, quiet) {
      head = Math.min(G + PW, Math.max(G, x));
      const g = $('#tm-head', plot);
      if (!g) return;
      g.setAttribute('transform', `translate(${head},0)`);
      const t = tOf(head), ago = agoText(t);
      const label = ago.big === 'Today' ? 'Today' : (t >= 0 ? '−' : '+') + ago.big.replace(' years', ' y').replace(' months', ' mo').replace(' weeks', ' wk').replace(' days', ' d');
      const pt = $('#tm-pill-t', plot), pill = $('#tm-pill', plot);
      pt.textContent = label;
      // keep the readout pill inside the plot at both ends
      const w = Math.max(54, label.length * 7.2 + 18);
      let px = -w / 2;
      if (head + px < 4) px = 4 - head;
      if (head + px + w > W - 4) px = W - 4 - w - head;
      pill.setAttribute('width', w);
      pill.setAttribute('x', px);
      pt.setAttribute('x', px + w / 2);
      $('#tm-ago').textContent = ago.big;
      $('#tm-ago-s').textContent = ago.small === 'ago' ? 'before ' + TODAY : ago.small === 'from now' ? 'after ' + TODAY : ago.small;
      $('#tm-cal').textContent = calText(t);
      const inFrame = DASH.filter(d => {
        const lo = xOf(d.span[0]) - 8, hi = xOf(d.span[1]) + 8;
        return head >= Math.min(lo, hi) && head <= Math.max(lo, hi);
      });
      $('#tm-in').textContent = `${inFrame.length} of ${DASH.length}`;
      $$('#tm-dots i').forEach((el, i) => el.classList.toggle('on', inFrame.includes(DASH[i])));
      $$('.lane', plot).forEach(el => el.classList.toggle('on', inFrame.some(d => d.id === el.dataset.id)));
      $$('.mk', plot).forEach(el => el.classList.toggle('past', +el.getAttribute('cx') < head - 2));
      plot.setAttribute('aria-valuetext', `${ago.big} ${ago.small}`);
      if (!quiet) {
        let best = 0, bd = Infinity;
        stops.forEach((st, i) => { const d = Math.abs(xOf(st.t) - head); if (d < bd) { bd = d; best = i; } });
        if (best !== cur) paintStop(best);
      }
    }

    function paintStop(i, quiet, force) {
      if (i === cur && !force && panel.firstElementChild) return;
      cur = i;
      const st = stops[i], d = BY[st.id];
      panel.className = 'tm-panel d-' + st.id;
      panel.innerHTML = `<div class="tp-top"><span class="tp-dash"><i></i>${esc(d.title)}</span><span>${String(i + 1).padStart(2, '0')} / ${stops.length}</span></div>
        <div class="tp-body">
          <p class="tp-when">${esc(st.when)}</p>
          <h3 class="tp-title">${esc(st.title)}</h3>
          <p class="tp-text">${esc(st.text)}</p>
          <div class="tp-actions"><a class="tp-open" href="${pageOf(st.id, st.anchor)}" data-id="${st.id}">Open at “${esc(st.sec)}” ${svg('arrow')}</a></div>
        </div>`;
      if (!quiet && motion()) $('.tp-body', panel).animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
      $$('.mk', plot).forEach(el => el.classList.toggle('on', +el.dataset.i === i));
      $$('.mk-halo', plot).forEach(el => el.classList.toggle('on', +el.dataset.h === i && motion()));
      $$('#tm-stops .stop').forEach((el, j) => { el.classList.toggle('on', j === i); el.classList.toggle('past', j < i); });
      $('#tm-stop').textContent = `${i + 1} of ${stops.length}`;
      $('#tm-stop-s').textContent = d.short;
      plot.setAttribute('aria-valuenow', String(i + 1));
    }

    function tweenTo(x, dur, done) {
      cancelAnimationFrame(raf);
      const x0 = head, t0 = performance.now();
      if (!motion() || dur <= 0) { setHead(x, true); if (done) done(); return; }
      const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const tick = now => {
        const p = Math.min(1, (now - t0) / dur);
        setHead(x0 + (x - x0) * ease(p), true);
        if (p < 1) raf = requestAnimationFrame(tick); else if (done) done();
      };
      raf = requestAnimationFrame(tick);
    }
    function goStop(i, dur = 650) {
      i = (i + stops.length) % stops.length;
      paintStop(i);
      tweenTo(xOf(stops[i].t), dur);
    }

    function setBadge() {
      badge.className = 'badge ' + (playing ? 'run' : 'paused');
      host.classList.toggle('playing', playing);
      $('span', badge).textContent = playing ? 'Running' : 'Paused';
      playBtn.innerHTML = svg(playing ? 'pause' : 'play');
      playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }
    function step() {
      if (!playing) return;
      const next = cur + 1;
      if (next >= stops.length) {
        timer = setTimeout(() => { if (playing) { goStop(0, 1200); timer = setTimeout(step, 2600); } }, 1400);
        return;
      }
      goStop(next, 950);
      timer = setTimeout(step, 2900);
    }
    // plays only when asked to, and stops when it scrolls out of view
    function play() { playing = true; setBadge(); clearTimeout(timer); timer = setTimeout(step, 400); }
    function pause() { playing = false; clearTimeout(timer); cancelAnimationFrame(raf); setBadge(); }

    playBtn.addEventListener('click', () => (playing ? pause() : play()));
    $('#tm-prev').addEventListener('click', () => { pause(); goStop(cur - 1); });
    $('#tm-next').addEventListener('click', () => { pause(); goStop(cur + 1); });
    $('#tm-stops').addEventListener('click', e => { const b = e.target.closest('.stop'); if (b) { pause(); goStop(+b.dataset.i); } });
    plot.addEventListener('keydown', e => {
      const k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); pause(); goStop(cur + 1); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); pause(); goStop(cur - 1); }
      else if (k === 'Home') { e.preventDefault(); pause(); goStop(0); }
      else if (k === 'End') { e.preventDefault(); pause(); goStop(stops.length - 1); }
      else if (k === 'Enter') { e.preventDefault(); const st = stops[cur]; go(st.id, st.anchor); }
    });
    // drag to scrub; a click on a marker jumps to it
    let drag = null;
    plot.addEventListener('pointerdown', e => {
      if (e.button) return;
      const mk = e.target.closest('.mk');
      pause();
      if (mk) { goStop(+mk.dataset.i); return; }
      const r = plot.getBoundingClientRect();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, live: e.pointerType !== 'touch', r };
      if (drag.live) { plot.setPointerCapture(e.pointerId); plot.classList.add('drag'); cancelAnimationFrame(raf); setHead(e.clientX - r.left); }
    });
    plot.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.live) {
        // on touch, only take over once the gesture is clearly sideways, so the page still scrolls
        if (Math.abs(e.clientX - drag.x) > 8 && Math.abs(e.clientX - drag.x) > Math.abs(e.clientY - drag.y)) {
          drag.live = true; plot.setPointerCapture(e.pointerId); plot.classList.add('drag');
        } else return;
      }
      setHead(e.clientX - drag.r.left);
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const wasLive = drag.live;
      drag = null;
      plot.classList.remove('drag');
      if (!wasLive) { const r = plot.getBoundingClientRect(); setHead(e.clientX - r.left); }
      const sx = xOf(stops[cur].t);
      if (Math.abs(sx - head) < 26) tweenTo(sx, 220);
    };
    plot.addEventListener('pointerup', end);
    plot.addEventListener('pointercancel', end);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting && playing) pause(); })).observe(plot);
    }
    let rT = 0;
    new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(draw, 60); }).observe(plot);

    return {
      init() { draw(); setBadge(); },
      redraw() { draw(); }
    };
  })();

  /* ---------- clicks and keys ---------- */
  document.addEventListener('click', e => {
    if (e.target.closest('a[data-id]')) { remember(); return; }
    if (e.target.closest('[data-surprise]')) {
      const pool = DASH.filter(d => d.id !== store.get('kl.last', null));
      const d = pool[Math.floor(Math.random() * pool.length)];
      store.set('kl.last', d.id);
      go(d.id);
      return;
    }
    if (e.target.closest('[data-focus-search]')) { Search.focus(); return; }
    if (e.target.closest('[data-lock]')) {
      try { Object.keys(sessionStorage).filter(k => k.indexOf('kl:') === 0).forEach(k => sessionStorage.removeItem(k)); } catch (err) { /* nothing stored */ }
      location.replace('/');
      return;
    }
    const sc = e.target.closest('[data-scroll]');
    if (sc) { e.preventDefault(); const t = $(sc.dataset.scroll); if (t) t.scrollIntoView({ behavior: motion() ? 'smooth' : 'auto' }); return; }
    if (e.target.closest('[data-home]')) { e.preventDefault(); scrollTo({ top: 0, behavior: motion() ? 'smooth' : 'auto' }); }
  });

  addEventListener('keydown', e => {
    const tag = e.target.tagName, typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
    if (e.key === 'Escape') { if (Search.open) Search.close(); return; }
    if (e.altKey) return;
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); Search.focus(); return; }
    if (typing || e.metaKey || e.ctrlKey) return;
    const n = e.key === '0' ? 10 : +e.key;
    if (/^[0-9]$/.test(e.key) && DASH[n - 1]) go(DASH[n - 1].id);
  });

  /* ---------- go ---------- */
  renderHero();
  renderGlance();
  renderShelf();
  renderTOC();
  renderFoot();
  TMachine.init();
  applyMode(store.get('kl.mode', null));
  try { history.scrollRestoration = 'manual'; } catch (e) { /* older browsers */ }
  // back from a dashboard: return to the same spot on this page
  let returning = false;
  try {
    returning = sessionStorage.getItem('kl.back') === '1' || (performance.getEntriesByType('navigation')[0] || {}).type === 'back_forward';
    sessionStorage.removeItem('kl.back');
  } catch (e) { returning = false; }
  if (returning) {
    let y = 0;
    try { y = +sessionStorage.getItem('kl.y') || 0; } catch (e) { y = 0; }
    if (y > 0) requestAnimationFrame(() => scrollTo(0, y));
  }
})();
