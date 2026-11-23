/* Newcall Motion – gemeinsame Interaktionen für alle Newcall-Seiten (newxcall.github.io).
   Angelehnt an moderne interaktive Websites: Inhalte erscheinen nacheinander („Drop-in“), Karten reagieren auf
   die Maus (Lichtschein + leichtes 3D-Kippen), Knöpfe ziehen zur Maus, sanftes Scrollen, aktive Navigation,
   Fortschrittsbalken, hochzählende Zahlen und ein „Nach oben“-Knopf.
   Grundsätze: nur Ergänzung (ohne Skript sieht alles aus wie vorher), keine Bewegung bei „Bewegung reduzieren“,
   keine Maus-Effekte auf Touch-Geräten, im Seiten-Editor (?ncedit) aus. Eigene Elemente tragen data-nc-ui. */
(function () {
  'use strict';
  if (window.__ncMotion || /[?&]ncedit\b/.test(location.search)) return;
  window.__ncMotion = true;
  // „Bewegung reduzieren“ (z. B. Windows: Animationseffekte aus): nur sanftes Einblenden, nichts fliegt oder kippt. ?ncmotion=full erzwingt alles (Test).
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && !/[?&]ncmotion=full/.test(location.search) && !(function () { try { return localStorage.getItem('ncMotion') === 'full'; } catch (e) { return false; } })();
  var FINE = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var CARDS = '.card, .tile, .track, .link, .box, .app, .price, .plan, .svc, .service, .fact, .opt, .stat, .pro, article, [data-nc-card]';
  var BTNS = '.btn, .btn-primary, .btn-go, .btn-big, .cta, .nav-cta, .p-btn, [data-nc-magnet]';

  var CSS = ''
    + '.nc-progress{position:fixed;left:0;top:0;height:2px;width:100%;z-index:2147483000;pointer-events:none;transform-origin:0 50%;transform:scaleX(0);'
    + 'background:var(--grad,linear-gradient(90deg,#ff3d6e,#8a5cff,#64d2ff));box-shadow:0 0 12px rgba(138,92,255,.6)}'
    + '.nc-drop{animation:nc-drop .8s cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--nc-d,0ms)}'
    + '@keyframes nc-drop{from{opacity:0;translate:0 18px}}'
    + '.nc-r{opacity:0;translate:0 26px;transition:opacity .8s cubic-bezier(.2,.7,.2,1),translate .8s cubic-bezier(.2,.7,.2,1)!important;transition-delay:var(--nc-d,0ms)!important}'
    + '.nc-r.nc-in{opacity:1;translate:none}'
    + '.nc-glow{position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .35s;'
    + 'background:radial-gradient(420px circle at var(--nc-x,50%) var(--nc-y,50%),rgba(255,255,255,.10),transparent 45%)}'
    + '.nc-lit>.nc-glow{opacity:1}'
    + '.nc-tilt{transition:rotate .5s cubic-bezier(.2,.7,.2,1),translate .5s cubic-bezier(.2,.7,.2,1)}'
    + '.nc-tilt.nc-moving{transition:rotate .08s linear,translate .3s cubic-bezier(.2,.7,.2,1)}'
    + '.nc-mag{transition:translate .35s cubic-bezier(.2,.7,.2,1),scale .15s}'
    + '.nc-mag.nc-moving{transition:translate .1s linear,scale .15s}'
    + '.nc-press:active{scale:.97}'
    + '.nc-current{color:var(--fg,#fff)!important;background-image:linear-gradient(currentColor,currentColor)!important;background-size:100% 2px!important;'
    + 'background-position:0 100%!important;background-repeat:no-repeat!important}'
    + '.nc-top{position:fixed;right:20px;bottom:var(--nc-b,20px);z-index:2147482000;width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.16);'
    + 'background:rgba(20,20,26,.72);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:#fff;cursor:pointer;display:grid;place-items:center;'
    + 'box-shadow:0 10px 30px rgba(0,0,0,.4);opacity:0;translate:0 12px;pointer-events:none;transition:opacity .3s,translate .3s,bottom .3s,background .2s}'
    + '.nc-top.nc-show{opacity:1;translate:none;pointer-events:auto}.nc-top:hover{background:rgba(40,40,50,.9)}'
    + '.nc-top svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}'
    + '.nc-hero-light{position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:0;transition:opacity .6s;'
    + 'background:radial-gradient(520px circle at var(--nc-x,50%) var(--nc-y,40%),rgba(255,255,255,.07),transparent 60%)}'
    + '.nc-hero-on>.nc-hero-light{opacity:1}'
    + (RM ? '' : 'html{scroll-behavior:smooth}')
    + '@keyframes nc-fade{from{opacity:0}}'
    + '.nc-rm .nc-drop{animation-name:nc-fade;animation-duration:.9s}.nc-rm .nc-r{translate:none;transition:opacity .9s ease!important}';

  function css() { var st = document.createElement('style'); st.setAttribute('data-nc-ui', ''); st.textContent = CSS; document.head.appendChild(st); }
  function ui(tag, cls) { var el = document.createElement(tag); el.className = cls; el.setAttribute('data-nc-ui', ''); el.setAttribute('aria-hidden', 'true'); return el; }
  function cs(el) { return getComputedStyle(el); }
  function visible(el) { if (el.hidden || el.closest('[hidden], dialog, [data-nc-ui]')) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function floating(el) {
    for (var p = el; p && p !== document.body; p = p.parentElement) { var pos = cs(p).position; if (pos === 'fixed' || pos === 'sticky') return true; }
    return false;
  }
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  // ---------- Fortschrittsbalken + „Nach oben“
  function scrollBits() {
    var bar = ui('div', 'nc-progress'); document.body.appendChild(bar);
    var top = ui('button', 'nc-top'); top.type = 'button'; top.removeAttribute('aria-hidden'); top.setAttribute('aria-label', 'Nach oben');
    top.tabIndex = -1;
    top.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); });
    document.body.appendChild(top);
    var ticking = false;
    function upd() {
      ticking = false;
      var h = document.documentElement.scrollHeight - innerHeight, y = scrollY;
      bar.style.transform = 'scaleX(' + (h > 40 ? Math.min(1, y / h) : 0) + ')';
      var show = y > innerHeight * 1.2 && h > innerHeight;
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

  // ---------- Inhalte erscheinen nacheinander
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
    var out = [], secs = document.querySelectorAll('main section, body > section, [data-nc-stagger]');
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
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target); e.target.classList.add('nc-in');
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    list.forEach(function (x) {
      var el = x[0], r = el.getBoundingClientRect();
      if (cs(el).animationName !== 'none') return;   // hat schon eine eigene Animation
      if (r.top < vh && r.bottom > 0) {
        // schon sichtbar: beim Laden nacheinander hereinfallen
        el.style.setProperty('--nc-d', Math.min(initial++, 10) * 70 + 'ms');
        el.classList.add('nc-drop');
        el.addEventListener('animationend', function f() { el.classList.remove('nc-drop'); el.style.removeProperty('--nc-d'); el.removeEventListener('animationend', f); });
      } else {
        el.style.setProperty('--nc-d', Math.min(x[1], 8) * 70 + 'ms');
        el.classList.add('nc-r');
        el.addEventListener('transitionend', function f(ev) {
          if (ev.target !== el || !el.classList.contains('nc-in')) return;
          el.classList.remove('nc-r', 'nc-in'); el.style.removeProperty('--nc-d'); el.removeEventListener('transitionend', f);
        });
        io.observe(el);
      }
    });
    // Sicherheitsnetz: nach 6 s alles zeigen, was noch versteckt ist (z. B. wenn ein Sprunglink weit nach unten führt)
    setTimeout(function () { [].forEach.call(document.querySelectorAll('.nc-r:not(.nc-in)'), function (el) { var r = el.getBoundingClientRect(); if (r.bottom < 0) el.classList.add('nc-in'); }); }, 6000);
    addEventListener('hashchange', function () { [].forEach.call(document.querySelectorAll('.nc-r'), function (el) { el.classList.add('nc-in'); }); });
  }

  // ---------- Karten: Lichtschein + 3D-Kippen, Knöpfe: Magnet
  function cards() {
    if (!FINE) return;
    var done = new Set();
    [].forEach.call(document.querySelectorAll(CARDS), function (el) {
      if (done.has(el) || !visible(el) || floating(el) || el.closest('dialog, [data-nc-ui]')) return;
      if (el.tagName === 'ARTICLE' && el.querySelector(CARDS) && el.getBoundingClientRect().width < 640) return;   // kleine Artikel mit Karten darin: nur die Karten reagieren
      var r = el.getBoundingClientRect();
      if (r.width < 110 || r.height < 54 || r.width > 1400) return;
      var st = cs(el), pos = st.position;
      if (pos === 'absolute' || pos === 'fixed' || pos === 'sticky') return;
      // nur echte Karten (mit Hintergrund, Rahmen oder Schatten) – keine reinen Textblöcke
      var bg = /rgba?\(([^)]+)\)/.exec(st.backgroundColor), alpha = bg ? (bg[1].split(',')[3] === undefined ? 1 : +bg[1].split(',')[3]) : 0;
      if (!(alpha > 0.01 || (parseFloat(st.borderTopWidth) > 0 && parseFloat(st.borderLeftWidth) > 0) || st.boxShadow !== 'none' || st.backgroundImage !== 'none')) return;
      done.add(el);
      if (pos === 'static') el.style.position = 'relative';
      var glow = ui('span', 'nc-glow'); el.appendChild(glow);
      var tilt = !RM && r.width <= 640 && r.height <= 520;
      if (tilt) el.classList.add('nc-tilt');
      var par = el.parentElement, rect = null, pend = null;
      function move() {
        pend = null; if (!rect) return;
        var x = (ev.clientX - rect.left) / rect.width, y = (ev.clientY - rect.top) / rect.height;
        el.style.setProperty('--nc-x', (x * 100).toFixed(1) + '%'); el.style.setProperty('--nc-y', (y * 100).toFixed(1) + '%');
        if (tilt) { var a = 5 * Math.min(1, 300 / Math.max(rect.width, rect.height) + .35); el.style.rotate = (y - .5) * -2 + ' ' + (x - .5) * 2 + ' 0 ' + (Math.hypot(x - .5, y - .5) * a).toFixed(2) + 'deg'; }
      }
      var ev = null;
      el.addEventListener('pointerenter', function (e) {
        rect = el.getBoundingClientRect(); el.classList.add('nc-lit');
        if (tilt && par && !par.style.perspective) { par.style.perspective = '1100px'; par.__ncPersp = (par.__ncPersp || 0) + 1; }
        if (tilt) el.classList.add('nc-moving');
        ev = e; move();
      });
      el.addEventListener('pointermove', function (e) { ev = e; if (!pend) pend = raf(move); });
      el.addEventListener('pointerleave', function () {
        rect = null; el.classList.remove('nc-lit', 'nc-moving'); el.style.rotate = '';
        if (tilt && par && par.__ncPersp) { setTimeout(function () { if (!par.querySelector('.nc-lit')) { par.style.perspective = ''; par.__ncPersp = 0; } }, 520); }
      });
    });
  }
  function magnets() {
    [].forEach.call(document.querySelectorAll(BTNS), function (b) {
      if (b.closest('[data-nc-ui]')) return;
      b.classList.add('nc-press');
      if (!FINE || RM || floating(b) || b.closest('nav, header')) return;
      var r0 = b.getBoundingClientRect();
      if (r0.width > 420 || r0.width < 40) return;
      b.classList.add('nc-mag');
      var pend = null, ev = null;
      function move() {
        pend = null; if (!ev) return;
        var r = b.getBoundingClientRect(), x = ev.clientX - (r.left + r.width / 2), y = ev.clientY - (r.top + r.height / 2);
        var cx = Math.max(-1, Math.min(1, x / (r.width / 2))), cy = Math.max(-1, Math.min(1, y / (r.height / 2)));
        b.style.translate = (cx * 6).toFixed(1) + 'px ' + (cy * 4).toFixed(1) + 'px';   // höchstens ein paar Pixel
      }
      b.addEventListener('pointerenter', function (e) { ev = e; b.classList.add('nc-moving'); move(); });
      b.addEventListener('pointermove', function (e) { ev = e; if (!pend) pend = raf(move); });
      b.addEventListener('pointerleave', function () { ev = null; b.classList.remove('nc-moving'); b.style.translate = ''; });
    });
  }

  // ---------- Licht im Kopfbereich folgt der Maus
  function heroLight() {
    if (!FINE || RM) return;
    var hero = document.querySelector('.hero, main > section:first-of-type, main > header');
    if (!hero || floating(hero) || !visible(hero)) return;
    var c = cs(hero);
    if (c.position === 'static') hero.style.position = 'relative';
    hero.style.isolation = 'isolate';
    var l = ui('div', 'nc-hero-light'); hero.insertBefore(l, hero.firstChild);
    var pend = null, ev = null;
    function move() { pend = null; var r = hero.getBoundingClientRect(); l.style.setProperty('--nc-x', ev.clientX - r.left + 'px'); l.style.setProperty('--nc-y', ev.clientY - r.top + 'px'); }
    hero.addEventListener('pointerenter', function () { hero.classList.add('nc-hero-on'); });
    hero.addEventListener('pointerleave', function () { hero.classList.remove('nc-hero-on'); });
    hero.addEventListener('pointermove', function (e) { ev = e; if (!pend) pend = raf(move); });
  }

  // ---------- Sanftes Scrollen mit Platz für feste Kopfzeilen + aktive Navigation
  function anchors() {
    var head = document.querySelector('header.nav, .nav, header');
    if (head && /fixed|sticky/.test(cs(head).position)) document.documentElement.style.scrollPaddingTop = Math.round(head.getBoundingClientRect().height + 12) + 'px';
    if (!('IntersectionObserver' in window)) return;
    var links = [].filter.call(document.querySelectorAll('nav a[href^="#"], header a[href^="#"]'), function (a) {
      var id = a.getAttribute('href').slice(1);
      return id && id !== 'top' && !a.matches(BTNS + ', .logo, .brand') && document.getElementById(id);
    });
    if (!links.length) return;
    var byId = {}; links.forEach(function (a) { var id = a.getAttribute('href').slice(1); (byId[id] = byId[id] || []).push(a); });
    var vis = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { vis[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
      var best = null, bv = 0;
      Object.keys(vis).forEach(function (id) { if (vis[id] > bv) { bv = vis[id]; best = id; } });
      links.forEach(function (a) { var on = a.getAttribute('href') === '#' + best; a.classList.toggle('nc-current', on); if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: [0, .01, .5, 1] });
    Object.keys(byId).forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  // ---------- Zahlen zählen hoch, wenn sie sichtbar werden
  function counters() {
    if (!('IntersectionObserver' in window)) return;
    var els = [].filter.call(document.querySelectorAll('.stat b, .stat strong, .fact b, .fact strong, .num, [data-nc-count]'), function (el) {
      return !el.children.length && /^\s*\d{1,5}\s*[+%]?\s*$/.test(el.textContent) && !el.closest('[data-dyn]');
    });
    if (!els.length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, m = /^(\s*)(\d+)(\s*[+%]?\s*)$/.exec(el.textContent), end = +m[2];
        if (RM || end < 2) return;
        var t0 = null, dur = Math.min(1600, 500 + end * 12);
        el.style.fontVariantNumeric = 'tabular-nums';
        (function step(t) {
          if (!t0) t0 = t;
          var p = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
          el.textContent = m[1] + v + m[3];
          if (p < 1) raf(step);
        })(performance.now());
      });
    }, { threshold: .6 });
    els.forEach(function (el) { io.observe(el); });
  }

  function init() {
    try { css(); } catch (e) { return; }
    [scrollBits, reveal, cards, magnets, heroLight, anchors, counters].forEach(function (f) { try { f(); } catch (e) { if (window.console) console.warn('nc-motion', f.name, e); } });
  }
  // Nach DOMContentLoaded starten (site-edit.js wendet dort zuerst gespeicherte Änderungen an)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); });
  else setTimeout(init, 0);
})();
