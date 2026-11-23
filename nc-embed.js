/* Newcall Embed – lässt eine App-Seite (WinClean, Pebble, iDock) aufgeklappt in der Übersicht erscheinen.
   Nur aktiv, wenn die Seite mit ?embed in einem Rahmen auf derselben Website geöffnet wird:
   blendet Menü, Kopf und Fußzeile aus, meldet ihre Höhe an die Übersicht, Sprunglinks (#preis …) scrollen die
   Übersicht, andere Links öffnen im ganzen Fenster. Ohne ?embed passiert gar nichts. */
(function () {
  'use strict';
  if (!/[?&]embed\b/.test(location.search) || window.top === window) return;
  try { if (window.parent.location.origin !== location.origin) return; } catch (e) { return; }
  var root = document.documentElement;
  root.classList.add('nc-embed');
  var st = document.createElement('style');
  st.setAttribute('data-nc-ui', '');
  st.textContent = 'html.nc-embed, html.nc-embed body { overflow: hidden !important; }'
    + '.nc-embed .nav, .nc-embed footer, .nc-embed .nc-top, .nc-embed body::before,'
    + '.nc-embed .hero .eyebrow, .nc-embed .hero h1, .nc-embed .hero .lead, .nc-embed .hero .ctas, .nc-embed .hero .meta { display: none !important; }'
    + '.nc-embed .hero { padding-top: 0 !important; }'
    + '.nc-embed .hero .screen-wrap, .nc-embed .hero .phone, .nc-embed .hero .desk { margin-top: 8px !important; }';
  document.head.appendChild(st);

  var last = 0;
  function send() {
    var h = Math.ceil(root.getBoundingClientRect().height);
    if (Math.abs(h - last) < 2) return;
    last = h;
    window.parent.postMessage({ ncEmbed: location.pathname, h: h }, location.origin);
  }
  addEventListener('load', send);
  addEventListener('resize', send);
  if ('ResizeObserver' in window) new ResizeObserver(send).observe(root);
  setInterval(send, 1500);   // Sicherheitsnetz (z. B. Schriften, Bilder)

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented) return;
    var href = a.getAttribute('href');
    if (href.charAt(0) === '#') {
      var el = href.length > 1 && document.getElementById(href.slice(1));
      e.preventDefault();
      if (el) window.parent.postMessage({ ncEmbed: location.pathname, y: Math.round(el.getBoundingClientRect().top) }, location.origin);
      return;
    }
    if (!a.target && !a.hasAttribute('download')) a.target = '_top';
  }, true);
})();
