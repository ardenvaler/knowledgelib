/* Arden's Knowledge Library: landing page, dashboard viewer and the Time Machine. */
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n).toLocaleString('en-US');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const COARSE = matchMedia('(pointer: coarse)');
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
  const M = DATA.manifest, IX = DATA.index || {}, PAGES = DATA.pages, PREV = DATA.previews;
  const DASH = M.dashboards;
  const BY = {};
  DASH.forEach((d, i) => {
    d.n = i + 1;
    d.num = String(i + 1).padStart(2, '0');
    d.sources = (IX[d.id] && IX[d.id].sources) || 0;
    d.facts = d.facts.map(([v, l]) => [v === '{sources}' ? fmt(d.sources) : v, l]);
    d.secs = d.sections.map(([t, a]) => ({ t, a }));
    BY[d.id] = d;
  });
  const TOTAL_SOURCES = DASH.filter(d => d.id !== 'prompts').reduce((s, d) => s + d.sources, 0);
  const TOTAL_SECTIONS = DASH.reduce((s, d) => s + d.secs.length, 0);
  const BRIEFS = DASH.filter(d => d.id !== 'prompts');
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const word = n => WORDS[n] || String(n);
  const Word = n => { const w = word(n); return w.charAt(0).toUpperCase() + w.slice(1); };
  // big cards so every row of the 6-column shelf is full: 2 big, rows of 3 small, and 2 big at the end when needed
  const bigCard = (i, n) => n % 3 === 0 ? false : n < 3 ? true : (i < 2 || (n % 3 === 1 && i >= n - 2));
  const ROOT = document.documentElement;

  /* ---------- icons ---------- */
  const ICON = {
    amoc: '<path d="M2 10c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/><path d="M2 16c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/>',
    hf: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="m7 9.5 3 2.5-3 2.5M13 15h4"/>',
    midterm: '<path d="M4 20.5h16M6 20.5V10h12v10.5"/><path d="m9.3 14.6 2 2 3.6-3.8"/><path d="M9 10V5h6v5"/>',
    brain: '<circle cx="12" cy="12" r="2.6"/><path d="M12 9.4V3.5M12 14.6v5.9M9.7 10.8 4.5 7.6M14.3 13.2l5.2 3.2M9.7 13.2l-5.2 3.2M14.3 10.8l5.2-3.2"/><circle cx="12" cy="3" r="1"/><circle cx="4" cy="7.3" r="1"/><circle cx="20" cy="16.7" r="1"/>',
    prompts: '<path d="M8 6 3 12l5 6M16 6l5 6-5 6M14 4l-4 16"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    open: '<path d="M7 17 17 7M9 7h8v8"/>',
    shelf: '<path d="M4 4v16M9 4v16M14 5l4 15M3 20h18"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    prev: '<path d="M15 5 8 12l7 7"/>',
    next: '<path d="m9 5 7 7-7 7"/>',
    play: '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/>',
    pause: '<rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>'
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

  /* ---------- hero ---------- */
  function renderHero() {
    const deco = [['amoc', '40%', '12%', '0s'], ['hf', '90%', '37%', '-2.2s'], ['midterm', '92%', '9%', '-4.1s'], ['brain', '62%', '6%', '-1.3s'], ['prompts', '76%', '25%', '-5.4s']]
      .map(([id, x, y, dl]) => `<svg class="d-${id}" viewBox="0 0 24 24" style="left:${x};top:${y};animation-delay:${dl}" aria-hidden="true">${ICON[id]}</svg>`).join('');
    $('#hero').innerHTML = `
      <div class="deco">${deco}</div>
      <div class="hero-tags">
        <span class="tag">${svg('shelf')}${DASH.length} dashboards</span>
        <span class="tag accent">${svg('spark')}Food for thought</span>
        <span class="tag ok"><i></i>Unlocked</span>
      </div>
      <h1 id="hero-title"><span class="h1-a">Arden’s</span>Knowledge Library</h1>
      <p class="hero-sub">${esc(M.tagline)}</p>
      <p class="hero-lead">A baby’s brain under construction, the AI agents that broke out of their sandbox, the night Congress flipped, the ocean current that keeps Europe mild, and a prompt library that takes your dashboards apart. Open any of them right here. The library is always one tap away.</p>
      <div class="hero-cta">
        <a class="btn primary" href="#shelf" data-scroll="#shelf">${svg('shelf')}Browse the shelf</a>
        <button class="btn" type="button" data-surprise>${svg('dice')}Surprise me</button>
        <button class="btn" type="button" data-focus-search>${svg('search')}Search everything <kbd>/</kbd></button>
      </div>
      <div class="tiles">
        <div class="tile" data-tip="${esc(DASH.map(d => d.title).join(' · '))}"><span>Dashboards</span><b data-count="${DASH.length}">${DASH.length}</b><small>one PIN</small></div>
        <div class="tile" data-tip="Distinct links to studies, data and reporting in the ${word(BRIEFS.length)} briefs"><span>Sources linked</span><b data-count="${TOTAL_SOURCES}">${fmt(TOTAL_SOURCES)}</b><small>across ${word(BRIEFS.length)} briefs</small></div>
        <div class="tile" data-tip="Every section in the Contents below opens its dashboard at that spot"><span>Sections</span><b data-count="${TOTAL_SECTIONS}">${TOTAL_SECTIONS}</b><small>one click deep</small></div>
        <div class="tile" data-tip="From Greenland’s oldest ice in AMOC Watch to the 2100 forecasts"><span>Years in view</span><b data-count="122000">122,000</b><small>and on to 2100</small></div>
      </div>`;
    const hero = $('#hero');
    if (!COARSE.matches) hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      hero.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
    if (motion()) $$('[data-count]', hero).forEach(el => countUp(el, +el.dataset.count));
  }
  function countUp(el, to) {
    const t0 = performance.now(), dur = 1100;
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(Math.round(to * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function renderGlance() {
    const briefs = BRIEFS;
    const newest = DASH.slice().sort((a, b) => (a.iso < b.iso ? 1 : -1))[0];
    $('#glance').innerHTML = `
      <h2>What’s on the shelf</h2>
      <p class="g-sub">${fmt(TOTAL_SOURCES)} sources linked across ${word(BRIEFS.length)} briefs, plus ${BY.prompts ? BY.prompts.facts[0][0] : ''} prompts.</p>
      <div class="stack" role="group" aria-label="Sources linked, by dashboard">
        ${briefs.map(d => `<button type="button" class="d-${d.id}" style="--n:${d.sources}" data-open="${d.id}" data-tip="<b>${esc(d.title)}</b><br>${d.sources} sources linked" aria-label="${esc(d.title)}: ${d.sources} sources linked"></button>`).join('')}
      </div>
      <div class="stack-cap"><span>sources linked</span><span>${fmt(TOTAL_SOURCES)}</span></div>
      <div class="g-rows">
        ${DASH.map(d => `<button type="button" class="g-row d-${d.id}" data-open="${d.id}" data-peek="${d.id}">
          <span class="gn">${d.num}</span>
          <span><span class="gt">${esc(d.title)}</span><span class="gk">${esc(d.kind)} · ${esc(d.topic)}</span></span>
          <span class="gv">${d.id === 'prompts' ? esc(d.facts[0][0]) + ' prompts' : d.sources + ' sources'}<small>${esc(d.date)}</small></span>
        </button>`).join('')}
      </div>
      <button type="button" class="g-more d-${newest.id}" data-open="${newest.id}" data-peek="${newest.id}">Newest on the shelf: ${esc(newest.title)} ${svg('arrow')}</button>`;
  }

  /* ---------- the shelf ---------- */
  function renderShelf() {
    $('#shelf-grid').innerHTML = DASH.map((d, i) => {
      const chips = d.chips.map(a => d.secs.find(s => s.a === a)).filter(Boolean);
      return `<article class="card d-${d.id}${bigCard(i, DASH.length) ? ' big' : ''}" data-id="${d.id}" style="--dbg:${d.bg};--dink:${d.ink}">
        <a class="stretch" href="#/${d.id}" data-open="${d.id}" aria-label="Open ${esc(d.title)}"></a>
        <div class="pv" aria-hidden="true">
          <div class="pv-bar"><i></i><i></i><i></i><span>${esc(d.title)}</span></div>
          <div class="pv-win"><img src="${PREV[d.id]}" alt="" width="960" height="1200" decoding="async"></div>
          <span class="pv-num">${d.num}</span>
          <span class="pv-open">Open ${svg('open')}</span>
        </div>
        <div class="ci">
          <div class="kick"><b>${esc(d.kind)}</b><span class="sep"></span><span>${esc(d.topic)}</span><span class="sep"></span><span>${esc(d.date)}</span></div>
          <h3 class="ct t-${d.id}">${d.titleHtml}</h3>
          <p class="cb">${esc(d.blurb)}</p>
          <div class="facts">${d.facts.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>
          <div class="chips"><span class="cl">Jump to</span>${chips.map(s => `<button type="button" class="chip" data-open="${d.id}" data-sec="${esc(s.a)}">${esc(s.t)}</button>`).join('')}</div>
        </div>
      </article>`;
    }).join('');

    const grid = $('#shelf-grid');
    // keep the preview's scroll distance in sync with its window size
    const ro = new ResizeObserver(es => es.forEach(e => e.target.closest('.card').style.setProperty('--winh', e.contentRect.height + 'px')));
    $$('.pv-win', grid).forEach(w => ro.observe(w));

    // warm a dashboard up as soon as someone points at it
    // (the card's lift and tilt make Chrome re-fire pointerover while it settles, so a card
    // that is already scheduled is left alone until the pointer actually leaves it)
    let warmT = 0, warmId = null;
    const intent = (e, delay) => {
      const c = e.target.closest && e.target.closest('.card');
      if (!c || c.dataset.id === warmId) return;
      clearTimeout(warmT);
      warmId = c.dataset.id;
      warmT = setTimeout(() => Viewer.prewarm(c.dataset.id), delay);
    };
    grid.addEventListener('pointerover', e => intent(e, 90));
    grid.addEventListener('pointerleave', () => { warmId = null; });
    grid.addEventListener('focusin', e => intent(e, 0));
    grid.addEventListener('touchstart', e => intent(e, 0), { passive: true });

    // gentle 3D tilt and glare
    if (!COARSE.matches && motion()) {
      grid.addEventListener('pointermove', e => {
        const c = e.target.closest('.card');
        if (!c) return;
        const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        c.style.setProperty('--ry', ((px - .5) * 9).toFixed(2) + 'deg');
        c.style.setProperty('--rx', ((.5 - py) * 7).toFixed(2) + 'deg');
        c.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        c.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      grid.addEventListener('pointerout', e => {
        const c = e.target.closest('.card');
        if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); }
      });
    }
    // on touch screens, the preview scrolls by itself when the card sits mid-screen
    if (COARSE.matches && motion() && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('panning', e.isIntersecting)), { rootMargin: '-35% 0px -35% 0px' });
      $$('.card', grid).forEach(c => io.observe(c));
    }
  }

  /* ---------- contents ---------- */
  function renderTOC() {
    $('#toc').innerHTML = DASH.map(d => `<div class="toc-col d-${d.id}">
      <button type="button" class="toc-h" data-open="${d.id}" data-peek="${d.id}"><span class="tn">${d.num}</span><span class="tt">${esc(d.title)}</span></button>
      <ol>${d.secs.map(s => `<li><button type="button" data-open="${d.id}" data-sec="${esc(s.a)}">${esc(s.t)}</button></li>`).join('')}</ol>
    </div>`).join('');
  }

  function renderFoot() {
    $('#foot').innerHTML = `<div class="foot-in">
      <div><b>Arden’s Knowledge Library</b><p>${Word(DASH.length)} dashboards behind one PIN. Each is a copy of its Claude artifact as of ${esc(new Date(DATA.built).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))}, and opens exactly as it was published.</p></div>
      <div class="keys"><span><kbd>1</kbd>–<kbd>5</kbd> open a dashboard</span><span><kbd>/</kbd> search all five</span><span><kbd>Esc</kbd> back to the library</span></div>
      <button type="button" class="btn" data-lock>Lock the library</button>
    </div>`;
  }

  /* ---------- tooltips ---------- */
  const tip = $('#tip');
  let tipEl = null;
  function showTip(el, x, y) {
    if (el.closest('[data-peek]')) return;
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

  /* ---------- previews for every other link to a dashboard ---------- */
  const Peek = (() => {
    const el = document.createElement('div');
    el.className = 'peek';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="pk-img"><img alt="" decoding="async"></div><div class="pk-in"><div class="pk-k"></div><div class="pk-t"></div><p class="pk-b"></p></div>';
    document.body.append(el);
    const img = $('img', el);
    let on = null;
    function show(target) {
      const d = BY[target.dataset.peek];
      if (!d) return;
      on = target;
      hideTip();
      el.className = 'peek on d-' + d.id;
      el.style.setProperty('--dbg', d.bg);
      if (img.dataset.id !== d.id) { img.dataset.id = d.id; img.src = PREV[d.id]; }
      $('.pk-k', el).textContent = `${d.num} · ${d.kind} · ${d.date}`;
      $('.pk-t', el).textContent = d.title;
      $('.pk-b', el).textContent = d.blurb;
      const r = target.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
      let left = r.right + 14, top = r.top + r.height / 2 - h / 2;
      if (left + w > innerWidth - 10) left = r.left - w - 14;
      if (left < 10) { left = Math.min(Math.max(10, r.left), innerWidth - w - 10); top = r.bottom + 10; if (top + h > innerHeight - 10) top = r.top - h - 10; }
      el.style.left = Math.round(left) + 'px';
      el.style.top = Math.round(Math.min(Math.max(10, top), innerHeight - h - 10)) + 'px';
    }
    function hide() { on = null; el.classList.remove('on'); }
    document.addEventListener('pointerover', e => {
      if (e.pointerType === 'touch') return;
      const t = e.target.closest && e.target.closest('[data-peek]');
      if (t && t !== on) show(t); else if (!t && on) hide();
    });
    document.addEventListener('scroll', hide, { passive: true });
    document.addEventListener('pointerdown', hide);
    return { hide };
  })();

  /* ---------- the viewer ---------- */
  const Viewer = (() => {
    const viewer = $('#viewer'), stage = $('#vstage'), curtain = $('#curtain'), cimg = $('#cimg'), dim = $('#dim');
    // the landing stays painted under an open dashboard (so coming back costs no repaint); inert keeps it out of reach
    const setInert = v => { $('#landing').inert = v; $('#nav').inert = v; };
    // decode the zoom image ahead of the click
    const primeImg = id => { if (cimg.dataset.id === id) return; cimg.dataset.id = id; cimg.src = PREV[id]; if (cimg.decode) cimg.decode().catch(() => {}); };
    const frames = new Map();
    const MAX = COARSE.matches ? 3 : 5;
    let openId = null, openFrom = null, pushed = false, busy = false, savedY = 0, idleCb = null;
    // when an animation ends, let the router catch up with any Back/Forward pressed meanwhile
    const idle = () => { busy = false; if (idleCb) setTimeout(idleCb, 0); };

    // Injected into every dashboard: in-page links replace history instead of stacking it,
    // outside links open in a new tab, and Esc with nothing focused goes back to the library.
    const BRIDGE = '<script>(function(){if(window.parent===window)return;var K=window.__kl={pushes:0},rep=false,trav=false;' +
      'try{var H=history,rs=H.replaceState.bind(H);H.pushState=function(s,t,u){return rs(s,t,u)}}catch(e){}' +
      'addEventListener("popstate",function(){trav=true;setTimeout(function(){trav=false},60)});' +
      'addEventListener("hashchange",function(){if(rep){rep=false;return}if(!trav)K.pushes++});' +
      // absolute URL on purpose: when the library calls go(), a relative "#x" would resolve against the library's own address
      // jumps the library asks for are instant and land clear of the top edge; the dashboard's own links keep its smooth scrolling
      'K.go=function(h,now){var t=document.getElementById(decodeURIComponent(h.slice(1))),de=document.documentElement,sb=de.style.scrollBehavior;if(now)de.style.scrollBehavior="auto";' +
      'if(location.hash===h){if(t)t.scrollIntoView()}else{rep=true;location.replace(location.href.split("#")[0]+h)}' +
      'if(now)requestAnimationFrame(function(){if(t){var y=t.getBoundingClientRect().top;if(y<8)scrollBy(0,y-24)}de.style.scrollBehavior=sb})};' +
      'addEventListener("click",function(e){if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;var a=e.target&&e.target.closest&&e.target.closest("a[href]");if(!a||a.hasAttribute("download"))return;var h=a.getAttribute("href")||"";' +
      'if(h.charAt(0)==="#"&&h.length>1&&(!a.target||a.target==="_self")){e.preventDefault();K.go(h);return}' +
      'if(/^https?:/i.test(a.href)&&a.target!=="_blank"){e.preventDefault();window.open(a.href,"_blank","noopener")}});' +
      'addEventListener("keydown",function(e){if(e.key==="Escape"&&!e.defaultPrevented&&(!document.activeElement||document.activeElement===document.body))parent.postMessage({kl:"esc"},"*")})})();<\/script>';

    function frameFor(id) {
      let f = frames.get(id);
      if (f) { f.last = Date.now(); return f; }
      const html = PAGES[id].replace(/<head[^>]*>/i, m => m + BRIDGE);
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      const wrap = document.createElement('div');
      wrap.className = 'vframe d-' + id;
      wrap.style.setProperty('--dbg', BY[id].bg);
      const iframe = document.createElement('iframe');
      iframe.title = BY[id].title;
      iframe.setAttribute('allow', 'clipboard-write; fullscreen');
      iframe.src = url;
      wrap.append(iframe);
      stage.append(wrap);
      f = { id, wrap, iframe, url, loaded: false, last: Date.now(), parkT: 0 };
      f.ready = new Promise(res => iframe.addEventListener('load', () => { f.loaded = true; res(); }, { once: true }));
      frames.set(id, f);
      trim();
      return f;
    }
    function trim() {
      if (frames.size <= MAX) return;
      const old = [...frames.values()].filter(f => f.id !== openId).sort((a, b) => a.last - b.last);
      while (frames.size > MAX && old.length) {
        const f = old.shift();
        f.wrap.remove();
        URL.revokeObjectURL(f.url);
        frames.delete(f.id);
      }
    }
    function park(f) { if (f && f.id !== openId) f.wrap.classList.add('parked'); }
    function prewarm(id) {
      if (!BY[id] || id === openId) return;
      const f = frameFor(id);
      primeImg(id);
      f.wrap.classList.remove('parked');
      clearTimeout(f.parkT);
      // if it isn't opened soon, stop it from rendering in the background
      f.ready.then(() => { f.parkT = setTimeout(() => park(f), 6000); });
    }

    function setBar(d) {
      viewer.className = (viewer.classList.contains('open') ? 'open ' : '') + 'd-' + d.id;
      viewer.style.setProperty('--vbg', d.bg);
      $('#vnum').textContent = d.num;
      $('#vname').textContent = d.title;
      $('#vkind').textContent = d.kind;
      $('#vsec-menu').innerHTML = d.secs.map((s, i) => `<button type="button" data-sec="${esc(s.a)}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(s.t)}</button>`).join('');
      $$('#vswitch button').forEach(b => b.setAttribute('aria-current', String(b.dataset.id === d.id)));
      document.title = d.title + ' · ' + M.title;
    }
    function show(f) {
      frames.forEach(o => { o.wrap.classList.toggle('active', o === f); if (o !== f) park(o); });
      clearTimeout(f.parkT);
      f.wrap.classList.remove('parked');
      f.last = Date.now();
    }
    function focusFrame(f) {
      try { f.iframe.focus({ preventScroll: true }); f.iframe.contentWindow.focus(); } catch (e) { /* not ready */ }
    }
    async function jump(f, sec) {
      if (!sec) return;
      await f.ready;
      await wait(40);
      try {
        const w = f.iframe.contentWindow, doc = w.document;
        if (sec.find) {
          const el = $$('h1, h2, h3', doc).find(x => x.textContent.replace(/\s+/g, ' ').trim() === sec.find);
          if (el) { w.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + w.scrollY - 84), behavior: 'instant' }); return; }
        }
        if (sec.anchor) (w.__kl ? w.__kl.go(sec.anchor, true) : w.location.replace(w.location.href.split('#')[0] + sec.anchor));
      } catch (e) { /* frame not reachable */ }
    }
    // the visible part of the dashboard's preview on its card, or whatever was clicked
    function sourceRect(el) {
      if (!el || !document.contains(el)) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > innerHeight) return null;
      return r;
    }
    function cardWin(id) { return $(`.card[data-id="${id}"] .pv-win`); }
    function imgOffset(id) {
      const img = $(`.card[data-id="${id}"] .pv-win img`);
      if (!img) return 0;
      const m = new DOMMatrixReadOnly(getComputedStyle(img).transform);
      return m.m42 || 0;
    }

    async function open(id, o = {}) {
      const d = BY[id];
      if (!d) return;
      if (busy) return;
      const sec = o.sec || null;
      if (openId === id) { if (sec) jump(frames.get(id), sec); return; }
      if (openId) return switchTo(id, o);
      busy = true;
      hideTip();
      Peek.hide();
      Search.close();
      const f = frameFor(id);
      openId = id;
      openFrom = o.from || null;
      if (!o.fromRoute) { history.pushState({ kl: id }, '', '#/' + id); pushed = true; } else pushed = !!o.pushed;
      savedY = scrollY;
      setBar(d);
      show(f);
      TMachine.hold(true);
      setInert(true);
      ROOT.classList.add('viewing');
      viewer.setAttribute('aria-hidden', 'false');

      const fromEl = o.from && o.from.closest && o.from.closest('.card') ? cardWin(id) : o.from;
      const r = !o.instant && motion() ? sourceRect(fromEl) : null;
      if (r) {
        const vw = innerWidth, vh = innerHeight, bar = $('.vbar').offsetHeight;
        const isCard = fromEl && fromEl.classList.contains('pv-win');
        const off = isCard ? imgOffset(id) : 0;
        const s0 = r.width / vw;
        curtain.style.setProperty('--cbg', d.bg);
        primeImg(id);
        curtain.style.visibility = 'visible';
        const opt = { duration: 300, easing: 'cubic-bezier(.2,.75,.15,1)', fill: 'both' };
        const a1 = curtain.animate([{ clipPath: `inset(${r.top}px ${vw - r.right}px ${vh - r.bottom}px ${r.left}px round 14px)` }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], opt);
        const a2 = cimg.animate([{ transform: `translate(${r.left}px, ${r.top + off}px) scale(${s0})` }, { transform: `translate(0px, ${bar}px) scale(1)` }], opt);
        dim.style.visibility = 'visible';
        const a3 = dim.animate([{ opacity: 0 }, { opacity: 1 }], opt);
        // reveal the live dashboard under the curtain a beat before the zoom lands
        await Promise.race([a1.finished, wait(250)]);
        viewer.classList.add('open');
        if (!f.loaded) {
          await a1.finished;
          const slow = setTimeout(() => curtain.classList.add('waiting'), 160);
          await Promise.race([f.ready, wait(4000)]);
          clearTimeout(slow);
          curtain.classList.remove('waiting');
        }
        await frame();
        await a1.finished;
        const a4 = curtain.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, easing: 'ease-out', fill: 'both' });
        await a4.finished;
        curtain.style.visibility = 'hidden';
        dim.style.visibility = 'hidden';
        [a1, a2, a3, a4].forEach(a => a.cancel());
      } else {
        viewer.classList.add('open');
        if (!o.instant && motion()) {
          await viewer.animate([{ opacity: 0, transform: 'scale(1.015)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' }).finished;
        }
      }
      ROOT.classList.add('settled');
      idle();
      focusFrame(f);
      if (sec) jump(f, sec);
    }

    async function switchTo(id, o = {}) {
      const prev = frames.get(openId), d = BY[id];
      if (!prev || busy) return;
      busy = true;
      const dir = d.n > BY[openId].n ? 1 : -1;
      const f = frameFor(id);
      openId = id;
      history.replaceState({ kl: id }, '', '#/' + id);
      setBar(d);
      f.wrap.classList.remove('parked');
      clearTimeout(f.parkT);
      f.wrap.classList.add('active');
      if (motion()) {
        if (!f.loaded) await Promise.race([f.ready, wait(1500)]);
        const opt = { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' };
        const a = f.wrap.animate([{ transform: `translateX(${dir * 100}%)` }, { transform: 'none' }], opt);
        prev.wrap.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * 28}%)`, opacity: .3 }], opt);
        await a.finished;
      }
      prev.wrap.classList.remove('active');
      park(prev);
      idle();
      focusFrame(f);
      if (o.sec) jump(f, o.sec);
    }

    async function close() {
      if (!openId || busy) return;
      busy = true;
      const id = openId, f = frames.get(id);
      openId = null;
      ROOT.classList.remove('settled');
      document.title = M.title;
      if (scrollY !== savedY) scrollTo(0, savedY);
      $('#vsec-menu').hidden = true;
      const target = (openFrom && openFrom.closest && openFrom.closest('.card')) || !openFrom || !document.contains(openFrom) ? cardWin(id) : openFrom;
      const r = motion() ? sourceRect(target) : null;
      if (r) {
        const vw = innerWidth, vh = innerHeight, s = r.width / vw;
        const opt = { duration: 280, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'both' };
        const a = viewer.animate([
          { transform: 'translate(0px, 0px) scale(1)', clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1, offset: 0 },
          { opacity: 1, offset: .5 },
          { transform: `translate(${r.left}px, ${r.top}px) scale(${s})`, clipPath: `inset(0px 0px ${Math.max(0, vh - r.height / s)}px 0px round ${14 / s}px)`, opacity: 0, offset: 1 }
        ], opt);
        dim.style.visibility = 'visible';
        const b = dim.animate([{ opacity: 1 }, { opacity: 0 }], opt);
        await a.finished;
        viewer.classList.remove('open');
        dim.style.visibility = 'hidden';
        a.cancel(); b.cancel();
      } else if (motion()) {
        const a = viewer.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.985)' }], { duration: 180, easing: 'ease-in', fill: 'both' });
        await a.finished;
        viewer.classList.remove('open');
        a.cancel();
      } else viewer.classList.remove('open');
      viewer.setAttribute('aria-hidden', 'true');
      setInert(false);
      ROOT.classList.remove('viewing');
      if (f) { f.wrap.classList.remove('active'); park(f); }
      TMachine.hold(false);
      idle();
      const back = $(`.card[data-id="${id}"] .stretch`);
      if (back && (!openFrom || openFrom.closest('.card'))) back.focus({ preventScroll: true });
      else if (openFrom && document.contains(openFrom)) openFrom.focus({ preventScroll: true });
    }

    // The back button: one press, always the landing page.
    function back() {
      if (!openId || busy) return;
      const f = frames.get(openId);
      let pushes = 0;
      try { pushes = f.iframe.contentWindow.__kl.pushes || 0; } catch (e) { pushes = 1; }
      const canPop = pushed && pushes === 0 && history.state && history.state.kl === openId;
      close();
      if (canPop) history.back();
      else history.replaceState({ kl: null }, '', location.pathname + location.search + '#/');
      pushed = false;
    }

    // the bar
    $('#vback').addEventListener('click', back);
    $('#vswitch').innerHTML = DASH.map(d => `<button type="button" class="d-${d.id}" data-id="${d.id}" data-peek="${d.id}" aria-label="${esc(d.title)}">${d.num}</button>`).join('');
    $('#vswitch').addEventListener('click', e => { const b = e.target.closest('button'); if (b) open(b.dataset.id); });
    $('#vswitch').addEventListener('pointerover', e => { const b = e.target.closest('button'); if (b) prewarm(b.dataset.id); });
    const secBtn = $('#vsec-btn'), secMenu = $('#vsec-menu');
    secBtn.addEventListener('click', () => {
      const show = secMenu.hidden;
      secMenu.hidden = !show;
      secBtn.setAttribute('aria-expanded', String(show));
      if (show) { const first = $('button', secMenu); if (first) first.focus(); }
    });
    secMenu.addEventListener('click', e => {
      const b = e.target.closest('button[data-sec]');
      if (!b || !openId) return;
      secMenu.hidden = true;
      secBtn.setAttribute('aria-expanded', 'false');
      const f = frames.get(openId);
      jump(f, { anchor: b.dataset.sec });
      focusFrame(f);
    });
    document.addEventListener('pointerdown', e => {
      if (!secMenu.hidden && !e.target.closest('.vsecs')) { secMenu.hidden = true; secBtn.setAttribute('aria-expanded', 'false'); }
    });
    addEventListener('message', e => {
      if (!e.data || e.data.kl !== 'esc' || !openId) return;
      const f = frames.get(openId);
      if (f && e.source === f.iframe.contentWindow) back();
    });
    addEventListener('resize', () => { if (openId) frames.forEach(f => { if (f.id !== openId) park(f); }); });

    return { open, close, back, prewarm, onIdle(fn) { idleCb = fn; }, get openId() { return openId; }, get busy() { return busy; }, menuOpen: () => !secMenu.hidden, closeMenu: () => { secMenu.hidden = true; secBtn.setAttribute('aria-expanded', 'false'); secBtn.focus(); } };
  })();

  /* ---------- search ---------- */
  const Search = (() => {
    const box = $('#search'), q = $('#q'), out = $('#results');
    q.placeholder = `Search all ${word(DASH.length)} dashboards`;
    q.setAttribute('aria-label', q.placeholder);
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
        : `<div class="res-empty">Nothing on the shelf matches “${esc(v.trim())}”. Try “ice”, “Senate”, “kill chain” or “myelin”.</div>`);
      out.hidden = false;
      q.setAttribute('aria-expanded', 'true');
      if (act >= 0) q.setAttribute('aria-activedescendant', 'res-' + act);
      if (res[0]) Viewer.prewarm(res[0].id);
    }
    function setAct(i) {
      act = i;
      $$('.res', out).forEach(el => el.setAttribute('aria-selected', String(+el.dataset.i === act)));
      const el = $(`#res-${act}`);
      if (el) { el.scrollIntoView({ block: 'nearest' }); q.setAttribute('aria-activedescendant', el.id); Viewer.prewarm(res[act].id); }
    }
    function choose(i) {
      const it = res[i];
      if (!it) return;
      const from = $(`#res-${i}`);
      const r = from && from.getBoundingClientRect();
      close();
      q.blur();
      q.value = '';
      Viewer.open(it.id, { from: r && r.width ? cardFor(it.id) : null, sec: it.k === 'dash' ? null : { anchor: it.a, find: it.find } });
    }
    // open from the dashboard's own card when it's on screen, so the zoom starts from its preview
    function cardFor(id) {
      const c = $(`.card[data-id="${id}"]`);
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight ? c : null;
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
    const YEAR = NOW.getUTCFullYear() + (NOW - Date.UTC(NOW.getUTCFullYear(), 0, 1)) / 31557600000;
    const PAST = .87, LMAX = Math.log10(1 + 52 * 122000), LF = Math.log10(1 + 52 * 73.1);
    let W = 0, H = 0, G = 0, PW = 0, LH = 40, TOP = 34, AX = 34;
    let head = 0, cur = -1, playing = false, userPaused = false, held = false, seen = false, timer = 0, raf = 0;

    host.innerHTML = `
      <div class="mod-head">
        <span class="mod-ic">${svg('clock')}</span>
        <p class="mod-path" id="tm-title">arden / <b>time-machine</b></p>
        <span class="badge paused" id="tm-badge"><i></i><span>Paused</span></span>
        <span class="badge">Interactive</span>
        <p class="mod-desc">Drag across 122,000 years, from Greenland’s oldest ice to the 2100 forecasts. Each dashboard lights up where its story lives, and every stop opens that dashboard at the right page.</p>
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
          <div class="tile"><span>Looking</span><b id="tm-ago">–</b><small id="tm-ago-s">from 14 Nov 2026</small></div>
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
      else return { big: 'Today', small: '14 Nov 2026' };
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
      $('#tm-ago-s').textContent = ago.small === 'ago' ? 'before 14 Nov 2026' : ago.small === 'from now' ? 'after 14 Nov 2026' : ago.small;
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
          <div class="tp-actions"><button type="button" class="tp-open" data-open="${st.id}" data-sec="${esc(st.anchor)}" data-peek="${st.id}">Open at “${esc(st.sec)}” ${svg('arrow')}</button></div>
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
      $('span', badge).textContent = playing ? 'Running' : 'Paused';
      playBtn.innerHTML = svg(playing ? 'pause' : 'play');
      playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }
    function step() {
      if (!playing || held) return;
      const next = cur + 1;
      if (next >= stops.length) {
        timer = setTimeout(() => { if (playing && !held) { goStop(0, 1200); timer = setTimeout(step, 2600); } }, 1400);
        return;
      }
      goStop(next, 950);
      timer = setTimeout(step, 2900);
    }
    function play() { if (!motion()) return; playing = true; userPaused = false; setBadge(); clearTimeout(timer); timer = setTimeout(step, 600); }
    function pause(byUser) { playing = false; if (byUser) userPaused = true; clearTimeout(timer); cancelAnimationFrame(raf); setBadge(); }

    playBtn.addEventListener('click', () => (playing ? pause(true) : play()));
    $('#tm-prev').addEventListener('click', () => { pause(true); goStop(cur - 1); });
    $('#tm-next').addEventListener('click', () => { pause(true); goStop(cur + 1); });
    $('#tm-stops').addEventListener('click', e => { const b = e.target.closest('.stop'); if (b) { pause(true); goStop(+b.dataset.i); } });
    plot.addEventListener('keydown', e => {
      const k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); pause(true); goStop(cur + 1); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); pause(true); goStop(cur - 1); }
      else if (k === 'Home') { e.preventDefault(); pause(true); goStop(0); }
      else if (k === 'End') { e.preventDefault(); pause(true); goStop(stops.length - 1); }
      else if (k === 'Enter') { e.preventDefault(); const st = stops[cur]; Viewer.open(st.id, { from: $('.tp-open', panel), sec: { anchor: st.anchor } }); }
    });
    // drag to scrub; a click on a marker jumps to it
    let drag = null;
    plot.addEventListener('pointerdown', e => {
      if (e.button) return;
      const mk = e.target.closest('.mk');
      pause(true);
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

    // start when it scrolls into view; pause when it leaves or a dashboard is open
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => {
        seen = e.isIntersecting;
        if (seen && !userPaused && !held && motion()) { if (!playing) play(); }
        else if (!seen && playing) pause(false);
      }), { threshold: .35 }).observe(plot);
    }
    let rT = 0;
    new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(draw, 60); }).observe(plot);

    return {
      init() { draw(); setBadge(); },
      redraw() { draw(); },
      hold(v) { held = v; if (v) { if (playing) { clearTimeout(timer); cancelAnimationFrame(raf); } } else if (playing && seen) { clearTimeout(timer); timer = setTimeout(step, 900); } }
    };
  })();

  /* ---------- routing, clicks and keys ---------- */
  function parseHash() {
    const m = /^#\/([\w-]+)?(?:\/([\w-]+))?/.exec(location.hash);
    return m ? { id: m[1] || null, sec: m[2] || null } : { id: null, sec: null };
  }
  let pendingRoute = false;
  function route() {
    if (Viewer.busy) { pendingRoute = true; return; }
    pendingRoute = false;
    const { id, sec } = parseHash();
    if (id && BY[id]) {
      if (Viewer.openId !== id) Viewer.open(id, { fromRoute: true, pushed: true, from: $(`.card[data-id="${id}"]`), sec: sec ? { anchor: '#' + sec } : null });
    } else if (Viewer.openId) Viewer.close();
  }
  Viewer.onIdle(() => { if (pendingRoute) route(); });
  addEventListener('popstate', route);
  addEventListener('hashchange', () => { if (/^#\//.test(location.hash) || !location.hash) route(); });

  document.addEventListener('click', e => {
    const o = e.target.closest('[data-open]');
    if (o) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      const sec = o.dataset.sec ? { anchor: o.dataset.sec } : null;
      const from = o.classList.contains('stretch') || o.classList.contains('chip') ? o.closest('.card') : o;
      Viewer.open(o.dataset.open, { from, sec });
      return;
    }
    if (e.target.closest('[data-surprise]')) {
      const pool = DASH.filter(d => d.id !== store.get('kl.last', null));
      const d = pool[Math.floor(Math.random() * pool.length)];
      store.set('kl.last', d.id);
      Viewer.open(d.id, { from: e.target.closest('[data-surprise]') });
      return;
    }
    if (e.target.closest('[data-focus-search]')) { Search.focus(); return; }
    if (e.target.closest('[data-lock]')) {
      try { Object.keys(sessionStorage).filter(k => k.indexOf('kl:') === 0).forEach(k => sessionStorage.removeItem(k)); } catch (err) { /* nothing stored */ }
      location.replace(location.pathname + location.search);
      return;
    }
    const sc = e.target.closest('[data-scroll]');
    if (sc) { e.preventDefault(); const t = $(sc.dataset.scroll); if (t) t.scrollIntoView({ behavior: motion() ? 'smooth' : 'auto' }); return; }
    if (e.target.closest('[data-home]')) { e.preventDefault(); if (Viewer.openId) Viewer.back(); else scrollTo({ top: 0, behavior: motion() ? 'smooth' : 'auto' }); }
  });
  // warm a dashboard up when its row, chip, stop or contents entry is pointed at
  document.addEventListener('pointerover', e => {
    const o = e.target.closest && e.target.closest('[data-open]');
    if (o && !o.closest('.card')) Viewer.prewarm(o.dataset.open);
  });

  addEventListener('keydown', e => {
    const tag = e.target.tagName, typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
    if (e.key === 'Escape') {
      if (Search.open) { Search.close(); return; }
      if (Viewer.menuOpen()) { Viewer.closeMenu(); return; }
      if (Viewer.openId) { e.preventDefault(); Viewer.back(); }
      return;
    }
    if (Viewer.openId || e.altKey) return;
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); Search.focus(); return; }
    if (typing || e.metaKey || e.ctrlKey) return;
    if (/^[1-9]$/.test(e.key) && DASH[+e.key - 1]) {
      const d = DASH[+e.key - 1];
      const card = $(`.card[data-id="${d.id}"]`), r = card.getBoundingClientRect();
      Viewer.open(d.id, { from: r.bottom > 0 && r.top < innerHeight ? card : null });
    }
  });

  /* ---------- go ---------- */
  renderHero();
  renderGlance();
  renderShelf();
  renderTOC();
  renderFoot();
  TMachine.init();
  applyMode(store.get('kl.mode', null));
  const start = parseHash();
  if (start.id && BY[start.id]) Viewer.open(start.id, { fromRoute: true, instant: true, sec: start.sec ? { anchor: '#' + start.sec } : null });
  else if (location.hash && !/^#\/?$/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
})();
