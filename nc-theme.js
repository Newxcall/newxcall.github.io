/* Newcall Hell/Dunkel – gilt auf allen Seiten (Apps, Musik).
   Muss früh im <head> geladen werden (ohne defer), damit die Seite gleich in der richtigen Farbe erscheint.
   Ohne eigene Wahl gilt die Einstellung des Geräts. Die Wahl wird gemerkt (localStorage "ncTheme").
   Die Seite selbst liefert ihre hellen Farben über html[data-theme="light"] … (Grundfarben stehen unten). */
(function () {
  'use strict';
  var KEY = 'ncTheme', root = document.documentElement;
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
  function stored() { try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : null; } catch (e) { return null; } }
  function current() { return stored() || (mq && mq.matches ? 'light' : 'dark'); }
  function apply(t) {
    root.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'light' ? '#f5f5f3' : '#0b0b0c');
    var b = document.querySelectorAll('.nc-theme');
    for (var i = 0; i < b.length; i++) {
      b[i].setAttribute('aria-label', t === 'light' ? 'Dunkles Design einschalten' : 'Helles Design einschalten');
      b[i].title = t === 'light' ? 'Dunkel' : 'Hell';
    }
  }
  apply(current());

  // Grundfarben für hell: gleiche Namen wie in den Seiten (--bg, --surface, --fg … und auf der Musikseite --bg2, --card, --text)
  var css = 'html[data-theme="light"]{color-scheme:light;--bg:#f5f5f3;--bg2:#ffffff;--surface:#ffffff;--surface-2:#ececea;--tile:#efefec;--card:#ffffff;'
    + '--line:rgba(0,0,0,.1);--line-2:rgba(0,0,0,.16);--fg:#161617;--text:#161617;--muted:#5d5d5a;--dim:#85857f}'
    + '.nc-theme{flex:none;display:inline-grid;place-items:center;width:36px;height:36px;padding:0;margin:0 4px;border-radius:10px;border:1px solid var(--line);'
    + 'background:transparent;color:var(--muted,#9a9a97);cursor:pointer;transition:color .2s,border-color .2s}'
    + '.nc-theme:hover{color:var(--fg,var(--text,#ededeb));border-color:var(--line-2,rgba(127,127,127,.35))}'
    + '.nc-theme svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}'
    + '.nc-theme .sun{display:none}html[data-theme="light"] .nc-theme .sun{display:block}html[data-theme="light"] .nc-theme .moon{display:none}'
    + '.nc-theme.float{position:fixed;top:14px;right:14px;z-index:60;background:var(--surface,var(--card,#141416))}'
    + '.nc-embed .nc-theme{display:none!important}'
    + '@media (max-width:480px){.nc-theme{width:32px;height:32px;margin:0;border-radius:9px}.nc-theme svg{width:16px;height:16px}'
    + '.nav .wrap:has(> .nc-theme){gap:10px}}'
    // Sehr schmal: der kleine „Gratis laden“-Knopf oben weicht (der große steht gleich darunter)
    + '@media (max-width:360px){.nav .wrap:has(> .nc-theme) > .btn-small{display:none}.nav .wrap > .nc-theme{margin-left:auto!important}}';
  var st = document.createElement('style');
  st.setAttribute('data-nc-ui', '');
  st.textContent = css;
  (document.head || root).appendChild(st);

  function set(t) {
    try { localStorage.setItem(KEY, t); } catch (e) {}
    apply(t);
  }
  window.NCTheme = { get: current, set: set };

  function button() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'nc-theme';
    b.setAttribute('data-nc-ui', '');
    b.innerHTML = '<svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>'
      + '<svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>';
    b.addEventListener('click', function () { set(current() === 'light' ? 'dark' : 'light'); });
    return b;
  }
  function place() {
    if (document.querySelector('.nc-theme') || /[?&]ncedit\b/.test(location.search)) return;
    // Zusätzliche Plätze, die eine Seite selbst vorsieht (z. B. die Startauswahl der Übersicht)
    var slots = document.querySelectorAll('[data-nc-theme-slot]');
    for (var i = 0; i < slots.length; i++) slots[i].appendChild(button());
    var b = button();
    var nav = document.querySelector('header.nav, nav.nav, .nav');
    var box = nav && (nav.querySelector(':scope > .wrap') || nav);
    var before = box && box.querySelector('.nav-cta, :scope > .btn, :scope > .back, :scope > .nav-toggle');
    if (before) {
      before.parentNode.insertBefore(b, before);
      // Steht der Nachbar rechts außen (margin-left: auto), rückt der Knopf mit nach rechts
      var gap = before.getBoundingClientRect().left - b.getBoundingClientRect().right;
      if (gap > 40 && b.parentNode === before.parentNode) { b.style.marginLeft = 'auto'; before.style.marginLeft = '4px'; }
    }
    else if (box) box.appendChild(b);
    else { b.classList.add('float'); document.body.appendChild(b); }
    apply(current());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place); else place();

  // Andere Tabs und eingebettete Seiten (aufgeklappte Apps) ziehen mit
  addEventListener('storage', function (e) { if (e.key === KEY) apply(current()); });
  if (mq) { var f = function () { if (!stored()) apply(current()); }; mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f); }
})();
