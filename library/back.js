/* Arden's Knowledge Library: the way back from a dashboard page.
   Injected by tools/build.mjs into every dashboard. It adds a dark "← Library" button in the
   bottom-right corner, the spot that covers the fewest controls across all dashboards and
   screen sizes. It also opens outside links in a new tab, and opens the page right at the
   section in the address (e.g. /amoc/#ice).
   A dashboard's fixes file can move the button, e.g. kl-back { --kl-bottom: 70px } or, for the
   left corner, kl-back { --kl-right: auto; --kl-left: 14px }. */
(function () {
  'use strict';
  if (window.__klBack) return;
  window.__klBack = true;

  var CSS = ':host{all:initial}' +
    'a{position:fixed;z-index:2147483000;bottom:calc(var(--kl-bottom,14px) + env(safe-area-inset-bottom,0px));' +
    'right:calc(var(--kl-right,14px) + env(safe-area-inset-right,0px));left:calc(var(--kl-left) + env(safe-area-inset-left,0px));' +
    'display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 16px 0 11px;border-radius:999px;' +
    'background:#191a33;color:#fff;font:650 15px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.01em;text-decoration:none;white-space:nowrap;' +
    // a white ring keeps it visible on dark dashboards too
    'box-shadow:0 6px 18px rgba(10,12,30,.32),0 0 0 2px rgba(255,255,255,.9);' +
    'cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:background-color .15s}' +
    'a:hover{background:#3a3c78}' +
    'a:focus-visible{outline:3px solid #6d68ff;outline-offset:3px}' +
    'svg{width:18px;height:18px;flex:none}' +
    '@media print{a{display:none}}';

  function goHome(e) {
    if (e) e.preventDefault();
    try { sessionStorage.setItem('kl.back', '1'); } catch (err) { /* storage unavailable */ }
    location.href = '/';
  }

  var host = null;
  function mount() {
    if (!document.body || (host && host.isConnected)) return;
    if (!host) {
      host = document.createElement('kl-back');
      var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
      root.innerHTML = '<style>' + CSS + '</style>' +
        '<a href="/" aria-label="Back to Arden’s Knowledge Library">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>' +
        'Library</a>';
      root.querySelector('a').addEventListener('click', goHome);
    }
    document.body.appendChild(host);
  }
  // Put it in as early as possible, and put it back if it ever goes missing: some browsers skip
  // DOMContentLoaded on a page that was written in after the PIN, and a dashboard may redraw its body.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  addEventListener('load', mount);
  setTimeout(mount, 400);
  setTimeout(mount, 1500);
  if (window.MutationObserver) {
    new MutationObserver(function () { if (host && !host.isConnected) mount(); })
      .observe(document.documentElement, { childList: true, subtree: true });
  }

  // outside links open in a new tab, so the dashboard stays where it was
  addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || !/^https?:/i.test(a.href)) return;
    if (a.origin === location.origin) return;
    e.preventDefault();
    window.open(a.href, '_blank', 'noopener');
  });

  // A section in the address (e.g. /amoc/#ice): open right at it, without smooth-scrolling
  // through the whole page first, and keep it where it landed while web fonts and images
  // settle (they can push it a few lines up or down). Any scroll by the browser, the dashboard
  // or the reader is accepted as the new place. It stops as soon as the reader scrolls or
  // touches anything, or shortly after the page has loaded.
  // Dashboards that route by the address (#chapters opens a tab) have no such element and
  // handle it themselves; this then does nothing.
  var root = document.documentElement;
  var holding = location.hash.length > 1 && location.hash.charAt(1) !== '/';
  var pinTop = null, lastY = 0, raf = 0;
  if (holding) root.style.setProperty('scroll-behavior', 'auto', 'important');
  function target() {
    try { return document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (err) { return null; }
  }
  // the browser normally scrolls to the section itself; if nothing has scrolled at all, do it here
  function rescue() {
    var el = holding && target();
    if (el && scrollY === 0 && el.getBoundingClientRect().top > innerHeight * 0.35) el.scrollIntoView({ block: 'start' });
  }
  function hold() {
    if (!holding) return;
    var el = target();
    if (el) {
      var top = el.getBoundingClientRect().top;
      if (pinTop === null || scrollY !== lastY) pinTop = top;
      else if (Math.abs(top - pinTop) > 1) scrollBy(0, top - pinTop);
      lastY = scrollY;
    }
    raf = requestAnimationFrame(hold);
  }
  function release() {
    if (!holding) return;
    holding = false;
    cancelAnimationFrame(raf);
    root.style.removeProperty('scroll-behavior');
  }
  if (holding) {
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (t) { addEventListener(t, release, { passive: true, capture: true }); });
    document.addEventListener('DOMContentLoaded', function () { rescue(); hold(); setTimeout(release, 4000); });
    addEventListener('load', function () { rescue(); setTimeout(release, 2500); });
  }

})();
