/* Arden's Knowledge Library: the way back from a dashboard page.
   Injected by tools/build.mjs into every dashboard. It adds one small round button with the
   library's logo in the bottom-right corner (the one spot that covers no control on any
   dashboard, at any size: checked on desktop, laptop and phone), opens outside links in a new
   tab, and opens the page right at the section in the address (e.g. /amoc/#ice).
   A dashboard's fixes file can move the button: kl-back { --kl-right: …; --kl-bottom: … } */
(function () {
  'use strict';
  if (window.__klBack) return;
  window.__klBack = true;

  var CSS = ':host{all:initial}' +
    'a{position:fixed;right:calc(var(--kl-right,14px) + env(safe-area-inset-right,0px));bottom:calc(var(--kl-bottom,14px) + env(safe-area-inset-bottom,0px));' +
    'z-index:2147483000;display:grid;place-items:center;width:46px;height:46px;border-radius:50%;' +
    'background:#fff;color:#191a33;text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;' +
    'box-shadow:0 6px 18px rgba(10,12,30,.28),0 0 0 1px rgba(25,26,51,.14);transition:background-color .15s,box-shadow .15s}' +
    'a:hover{background:#f1effa;box-shadow:0 8px 22px rgba(10,12,30,.34),0 0 0 1px rgba(25,26,51,.24)}' +
    'a:focus-visible{outline:3px solid #6d68ff;outline-offset:3px}' +
    'svg{width:28px;height:28px;display:block}' +
    // the label sits beside the button and never catches the pointer, so the button itself never changes size
    'span{position:absolute;right:calc(100% + 9px);top:50%;margin-top:-14px;height:28px;padding:0 11px;border-radius:8px;display:flex;align-items:center;' +
    'background:#191a33;color:#fff;font:600 13.5px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;white-space:nowrap;' +
    'box-shadow:0 4px 12px rgba(10,12,30,.25);opacity:0;pointer-events:none;transition:opacity .15s}' +
    'a:hover span,a:focus-visible span{opacity:1}' +
    '@media (hover:none){span{display:none}}' +
    '@media print{a{display:none}}';
  var LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="8" width="4.6" height="19" rx="1.4" fill="#D97524"/><rect x="8.6" y="5" width="4.6" height="22" rx="1.4" fill="#E0AC00"/><rect x="14.2" y="9" width="4.6" height="18" rx="1.4" fill="#2A57C4"/><rect x="19.8" y="6" width="4.6" height="21" rx="1.4" fill="#5B5CE6"/><rect x="25.4" y="10" width="4.6" height="17" rx="1.4" fill="#0B7A5E" transform="rotate(12 27.7 27)"/><rect x="1.5" y="27.4" width="29" height="2.2" rx="1.1" fill="currentColor" opacity=".55"/></svg>';

  function goHome(e) {
    if (e) e.preventDefault();
    try { sessionStorage.setItem('kl.back', '1'); } catch (err) { /* storage unavailable */ }
    location.href = '/';
  }

  function mount() {
    if (!document.body || document.querySelector('kl-back')) return;
    var host = document.createElement('kl-back');
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    root.innerHTML = '<style>' + CSS + '</style>' +
      '<a href="/" aria-label="Back to Arden’s Knowledge Library">' + LOGO + '<span>Library</span></a>';
    root.querySelector('a').addEventListener('click', goHome);
    document.body.appendChild(host);
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
