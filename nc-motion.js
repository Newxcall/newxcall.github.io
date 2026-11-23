/* Newcall Motion – kleine, zurückhaltende Interaktionen für alle Newcall-Seiten (newxcall.github.io).
   Bewusst schlicht: Inhalte blenden beim Scrollen kurz ein, Knöpfe geben beim Klicken leicht nach, Sprunglinks
   scrollen weich, der aktuelle Menüpunkt wird markiert, auf langen Seiten gibt es einen „Nach oben“-Knopf.
   Keine Leucht-, Kipp- oder Magnet-Effekte (wirken schnell überladen bzw. „generiert“).
   Grundsätze: nur Ergänzung (ohne Skript sieht alles aus wie vorher), bei „Bewegung reduzieren“ nur Einblenden,
   im Seiten-Editor (?ncedit) aus. Eigene Elemente tragen data-nc-ui. */
(function () {
  'use strict';
  if (window.__ncMotion || /[?&]ncedit\b/.test(location.search)) return;
  window.__ncMotion = true;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && !/[?&]ncmotion=full/.test(location.search) && !(function () { try { return localStorage.getItem('ncMotion') === 'full'; } catch (e) { return false; } })();
  var BTNS = '.btn, .btn-primary, .btn-go, .btn-big, .cta, .nav-cta, .p-btn';

  var CSS = ''
    + '.nc-drop{animation:nc-drop .5s ease-out both;animation-delay:var(--nc-d,0ms)}'
    + '@keyframes nc-drop{from{opacity:0;translate:0 8px}}'
    + '.nc-r{opacity:0;translate:0 10px;transition:opacity .5s ease-out,translate .5s ease-out!important;transition-delay:var(--nc-d,0ms)!important}'
    + '.nc-r.nc-in{opacity:1;translate:none}'
    + '.nc-press{transition:scale .12s}.nc-press:active{scale:.98}'
    + '.nc-current{color:var(--fg,#fff)!important}'
    + '.nc-top{position:fixed;right:20px;bottom:var(--nc-b,20px);z-index:2147482000;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.14);'
    + 'background:#16161b;color:#ddd;cursor:pointer;display:grid;place-items:center;opacity:0;pointer-events:none;transition:opacity .25s,bottom .25s,color .2s}'
    + '.nc-top.nc-show{opacity:1;pointer-events:auto}.nc-top:hover{color:#fff}'
    + '.nc-top svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}'
    + (RM ? '' : 'html{scroll-behavior:smooth}')
    + '@keyframes nc-fade{from{opacity:0}}'
    + '.nc-rm .nc-drop{animation-name:nc-fade}.nc-rm .nc-r{translate:none;transition:opacity .5s ease!important}';

  function css() { var st = document.createElement('style'); st.setAttribute('data-nc-ui', ''); st.textContent = CSS; document.head.appendChild(st); }
  function cs(el) { return getComputedStyle(el); }
  function visible(el) { if (el.hidden || el.closest('[hidden], dialog, [data-nc-ui]')) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function floating(el) {
    for (var p = el; p && p !== document.body; p = p.parentElement) { var pos = cs(p).position; if (pos === 'fixed' || pos === 'sticky') return true; }
    return false;
  }
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  // ---------- „Nach oben“ (nur auf langen Seiten, erst weiter unten)
  function toTop() {
    var top = document.createElement('button'); top.className = 'nc-top'; top.type = 'button';
    top.setAttribute('data-nc-ui', ''); top.setAttribute('aria-label', 'Nach oben'); top.tabIndex = -1;
    top.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); });
    document.body.appendChild(top);
    var ticking = false;
    function upd() {
      ticking = false;
      var h = document.documentElement.scrollHeight - innerHeight;
      var show = scrollY > innerHeight * 1.5 && h > innerHeight * 1.5;
      top.classList.toggle('nc-show', show); top.tabIndex = show ? 0 : -1;
      // Unten fixierte Leisten (z. B. Musik-Player) nicht verdecken
      var b = 20, pl = document.querySelector('.player:not([hidden])');
      if (pl && cs(pl).position === 'fixed') { var r = pl.getBoundingClientRect(); if (r.right > innerWidth - 80) b = innerHeight - r.top + 12; }
      top.style.setProperty('--nc-b', b + 'px');
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; raf(upd); } }, { passive: true });
    addEventListener('resize', upd);
    upd();
  }

  // ---------- Inhalte blenden beim Scrollen ein
  function blocksOf(container, out) {
    [].forEach.call(container.children, function (c) {
      if (/^(SCRIPT|STYLE|LINK|TEMPLATE|NOSCRIPT|DIALOG)$/.test(c.tagName) || c.hasAttribute('data-nc-ui')) return;
      var d = cs(c).display, n = c.children.length;
      var grid = (d === 'grid' || d === 'inline-grid' || (d === 'flex' && cs(c).flexWrap === 'wrap')) && n >= 2 && n <= 24;
      if (grid) { var i = 0; [].forEach.call(c.children, function (g) { if (!g.hasAttribute('data-nc-ui')) out.push([g, i++]); }); }
      else out.push([c, 0]);
    });
  }
  function reveal() {
    if (!('IntersectionObserver' in window)) return;
    if (RM) document.documentElement.classList.add('nc-rm');
    var out = [], secs = document.querySelectorAll('main section, body > section');
    if (secs.length) [].forEach.call(secs, function (s) { if (!s.querySelector('section')) blocksOf(s, out); });
    else { var m = document.querySelector('main') || document.body; blocksOf(m, out); }
    var vh = innerHeight, seen = new Set(), list = [];
    out.forEach(function (x) {
      var el = x[0];
      if (seen.has(el)) return; seen.add(el);
      if (!visible(el) || floating(el)) return;
      if (el.classList.contains('reveal') || el.querySelector('.reveal') || el.closest('.reveal')) return;   // Seite hat eigene Animation
      if (el.closest('header, nav, footer') || cs(el).position === 'absolute') return;
      if (el.getBoundingClientRect().height > vh * 1.6) return;
      list.push(x);
    });
    if (list.length > 160) list = list.slice(0, 160);
    var initial = 0;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); e.target.classList.add('nc-in'); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    list.forEach(function (x) {
      var el = x[0], r = el.getBoundingClientRect();
      if (cs(el).animationName !== 'none') return;
      if (r.top < vh && r.bottom > 0) {
        el.style.setProperty('--nc-d', Math.min(initial++, 5) * 40 + 'ms');
        el.classList.add('nc-drop');
        el.addEventListener('animationend', function f() { el.classList.remove('nc-drop'); el.style.removeProperty('--nc-d'); el.removeEventListener('animationend', f); });
      } else {
        el.style.setProperty('--nc-d', Math.min(x[1], 4) * 40 + 'ms');
        el.classList.add('nc-r');
        el.addEventListener('transitionend', function f(ev) {
          if (ev.target !== el || !el.classList.contains('nc-in')) return;
          el.classList.remove('nc-r', 'nc-in'); el.style.removeProperty('--nc-d'); el.removeEventListener('transitionend', f);
        });
        io.observe(el);
      }
    });
    // Sicherheitsnetz: was oberhalb liegt (z. B. nach einem Sprunglink), sofort zeigen
    setTimeout(function () { [].forEach.call(document.querySelectorAll('.nc-r:not(.nc-in)'), function (el) { if (el.getBoundingClientRect().bottom < 0) el.classList.add('nc-in'); }); }, 4000);
    addEventListener('hashchange', function () { [].forEach.call(document.querySelectorAll('.nc-r'), function (el) { el.classList.add('nc-in'); }); });
  }

  // ---------- Knöpfe geben beim Klicken leicht nach
  function press() {
    [].forEach.call(document.querySelectorAll(BTNS), function (b) { if (!b.closest('[data-nc-ui]')) b.classList.add('nc-press'); });
  }

  // ---------- Weiches Scrollen mit Platz für feste Kopfzeilen + aktueller Menüpunkt
  function anchors() {
    var head = document.querySelector('header.nav, .nav, header');
    if (head && /fixed|sticky/.test(cs(head).position)) document.documentElement.style.scrollPaddingTop = Math.round(head.getBoundingClientRect().height + 12) + 'px';
    if (!('IntersectionObserver' in window)) return;
    var links = [].filter.call(document.querySelectorAll('nav a[href^="#"], header a[href^="#"]'), function (a) {
      var id = a.getAttribute('href').slice(1);
      return id && id !== 'top' && !a.matches(BTNS + ', .logo, .brand') && document.getElementById(id);
    });
    if (!links.length) return;
    var ids = {}; links.forEach(function (a) { ids[a.getAttribute('href').slice(1)] = 1; });
    var vis = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { vis[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
      var best = null, bv = 0;
      Object.keys(vis).forEach(function (id) { if (vis[id] > bv) { bv = vis[id]; best = id; } });
      links.forEach(function (a) { var on = a.getAttribute('href') === '#' + best; a.classList.toggle('nc-current', on); if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: [0, .01, .5, 1] });
    Object.keys(ids).forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  function init() {
    try { css(); } catch (e) { return; }
    [toTop, reveal, press, anchors].forEach(function (f) { try { f(); } catch (e) { if (window.console) console.warn('nc-motion', f.name, e); } });
  }
  // Nach DOMContentLoaded starten (site-edit.js wendet dort zuerst gespeicherte Änderungen an)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); });
  else setTimeout(init, 0);
})();
