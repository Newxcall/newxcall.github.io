/* Newcall Seiten-Editor (Teil der Website).
   Holt die im Admin-Panel („Websites“) gespeicherten Änderungen für diese Seite und wendet sie an:
   Texte, Links, Bilder, Reihenfolge, ausgeblendete Teile und neue Blöcke.
   Elemente werden über ihre Lage im Seitenaufbau gefunden (Schlüssel wie "#songs/2" oder "b/3/0") und
   vorher mit einer Prüfsumme verglichen – passt sie nicht mehr (Seite wurde im Code geändert), wird die
   Änderung einfach übersprungen, statt etwas Falsches zu überschreiben.
   Mit ?ncedit in der Adresse wird nichts angewendet: Dann steuert das Admin-Panel die Seite (window.NCSite). */
(function () {
  'use strict';
  var API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'http://127.0.0.1:8787/'
    : 'https://snafgyzhegwkxmunmxje.supabase.co/functions/v1/kehrwerk-license';
  var SKIP = { SCRIPT: 1, STYLE: 1, LINK: 1, META: 1, NOSCRIPT: 1, TEMPLATE: 1, TITLE: 1, BASE: 1 };
  var INLINE = { B: 1, STRONG: 1, I: 1, EM: 1, SMALL: 1, SPAN: 1, A: 1, BR: 1, U: 1, MARK: 1, CODE: 1, S: 1 };
  var EDIT = /[?&]ncedit\b/.test(location.search);
  var BASE_CSS = '[data-nc-off]{display:none!important}'
    + '.nc-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;margin:8px 0;border-radius:999px;'
    + 'background:linear-gradient(120deg,#ff3d6e,#8a5cff);color:#fff!important;font-weight:600;text-decoration:none}'
    + '.nc-img{display:block;max-width:100%;height:auto;border-radius:16px;margin:12px 0}'
    + '.nc-hr{border:0;border-top:1px solid rgba(127,127,127,.3);margin:24px 0}';

  function pageId(path) {
    path = (path || location.pathname).replace(/index\.html$/, '').replace(/\.html$/, '');
    return path || '/';
  }
  function kids(el) {
    var out = [];
    for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
      if (SKIP[c.tagName] || c.hasAttribute('data-nc-added') || c.hasAttribute('data-nc-ui')) continue;
      out.push(c);
    }
    return out;
  }
  // Schlüssel für alle Elemente (einmal, bevor irgendetwas geändert wird). In data-dyn-Bereichen (vom Code gefüllt) wird nicht weitergesucht.
  function index() {
    var map = {};
    (function walk(el, key) {
      el.__nc = key; map[key] = el;
      if (el.namespaceURI === 'http://www.w3.org/2000/svg' || el.hasAttribute('data-dyn')) return;
      kids(el).forEach(function (c, i) {
        walk(c, c.id && /^[A-Za-z][\w-]{0,60}$/.test(c.id) && !map['#' + c.id] ? '#' + c.id : key + '/' + i);
      });
    })(document.body, 'b');
    return map;
  }
  function hs(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function shape(el) { return hs(el.tagName + '|' + kids(el).length); }
  function textHash(el) { return hs(el.tagName + '|' + norm(el.textContent).slice(0, 500)); }
  function attrHash(el) { return hs(el.tagName + '|' + (el.getAttribute('href') || '') + '|' + (el.getAttribute('src') || '')); }
  function safeUrl(u) { u = String(u == null ? '' : u).trim(); return /^\s*(javascript|data|vbscript):/i.test(u) ? '' : u; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Nur einfache Textauszeichnung zulassen (fett, kursiv, Links, Zeilenumbruch …), alles andere wird zu reinem Text.
  function clean(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = String(html == null ? '' : html);
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) return;
        if (c.nodeType !== 1) { node.removeChild(c); return; }
        if (!INLINE[c.tagName]) {
          if (!/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|svg|SVG|MATH)$/.test(c.tagName)) {
            walk(c);
            if (/^(DIV|P)$/.test(c.tagName) && c.previousSibling) node.insertBefore(document.createElement('br'), c);
            while (c.firstChild) node.insertBefore(c.firstChild, c);
          }
          node.removeChild(c);
          return;
        }
        Array.prototype.slice.call(c.attributes).forEach(function (a) {
          if (!((c.tagName === 'A' && (a.name === 'href' || a.name === 'target' || a.name === 'rel')) || a.name === 'class')) c.removeAttribute(a.name);
        });
        if (c.tagName === 'A') {
          var u = safeUrl(c.getAttribute('href'));
          if (u) c.setAttribute('href', u); else c.removeAttribute('href');
          if (c.getAttribute('target') && c.getAttribute('target') !== '_blank') c.removeAttribute('target');
        }
        walk(c);
      });
    })(tpl.content);
    return tpl.content;
  }

  function makeBlock(b) {
    var el, u;
    if (b.type === 'heading') { el = document.createElement('h2'); el.appendChild(clean(b.html != null ? b.html : esc(b.text))); }
    else if (b.type === 'text') { el = document.createElement('p'); el.appendChild(clean(b.html != null ? b.html : esc(b.text))); }
    else if (b.type === 'button') {
      el = document.createElement('a'); el.className = 'nc-btn'; el.textContent = b.text || 'Mehr erfahren';
      u = safeUrl(b.href); if (u) el.setAttribute('href', u);
      if (/^https?:/i.test(u) && u.indexOf(location.origin) !== 0) { el.target = '_blank'; el.rel = 'noopener'; }
    } else if (b.type === 'image') {
      el = document.createElement('img'); el.className = 'nc-img'; el.loading = 'lazy'; el.alt = b.alt || '';
      u = safeUrl(b.src); if (u) el.setAttribute('src', u);
    } else if (b.type === 'line') { el = document.createElement('hr'); el.className = 'nc-hr'; }
    else return null;
    el.setAttribute('data-nc-added', b.id);
    el.__nc = 'n:' + b.id;
    return el;
  }

  // Änderungen anwenden. Erst alles nachschlagen und prüfen, dann ändern (sonst stimmen Prüfsummen nicht mehr).
  function apply(p, map) {
    var res = { done: 0, skipped: 0 }, todo = [];
    if (!p || p.v !== 1 || !map) return res;
    (p.edits || []).forEach(function (e) {
      var el = map[e.k];
      if (!el) { res.skipped++; return; }
      var tOk = e.html != null && textHash(el) === e.th;
      var aOk = (e.href != null || e.src != null || e.alt != null) && attrHash(el) === e.ah;
      if ((e.html != null && !tOk) || ((e.href != null || e.src != null || e.alt != null) && !aOk)) res.skipped++;
      if (!tOk && !aOk) return;
      todo.push(function () {
        if (tOk) { el.innerHTML = ''; el.appendChild(clean(e.html)); }
        if (aOk) {
          if (e.href != null) { var u = safeUrl(e.href); if (u) el.setAttribute('href', u); else el.removeAttribute('href'); }
          if (e.src != null) { var s = safeUrl(e.src); if (s) { el.setAttribute('src', s); el.removeAttribute('srcset'); } }
          if (e.alt != null) el.setAttribute('alt', e.alt);
        }
        res.done++;
      });
    });
    var made = {};
    (p.added || []).forEach(function (b) { var el = makeBlock(b); if (el) { made[b.id] = el; map['n:' + b.id] = el; } });
    (p.order || []).forEach(function (o) {
      var par = map[o.k];
      if (!par || shape(par) !== o.h) { res.skipped++; return; }
      var els = [];
      for (var i = 0; i < (o.seq || []).length; i++) {
        var it = o.seq[i], el = it.n ? made[it.n] : map[it.k];
        if (!el) continue;
        if (!it.n && (el.parentNode !== par || shape(el) !== it.h)) continue;
        els.push(el);
      }
      todo.push(function () {
        var inside = els.filter(function (el) { return el.parentNode === par; });
        var first = inside.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; })[0];
        var mark = document.createComment('nc');
        par.insertBefore(mark, first || null);
        els.forEach(function (el) { par.insertBefore(el, mark); });
        par.removeChild(mark);
        res.done++;
      });
    });
    (p.hidden || []).forEach(function (h) {
      var el = map[h.k];
      if (!el || (h.h && shape(el) !== h.h)) { res.skipped++; return; }
      todo.push(function () { el.setAttribute('data-nc-off', ''); res.done++; });
    });
    todo.forEach(function (f) { try { f(); } catch (e) { res.skipped++; } });
    return res;
  }

  function addCss(css) { var st = document.createElement('style'); st.setAttribute('data-nc-ui', ''); st.textContent = css; (document.head || document.documentElement).appendChild(st); }
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  var NC = window.NCSite = {
    edit: EDIT, page: pageId(), map: null, ready: false,
    index: index, apply: apply, kids: kids, shape: shape, textHash: textHash, attrHash: attrHash,
    clean: clean, safeUrl: safeUrl, makeBlock: makeBlock, pageId: pageId
  };
  addCss(EDIT ? BASE_CSS.replace('[data-nc-off]{display:none!important}', '') : BASE_CSS);  // im Editor bleiben ausgeblendete Teile sichtbar (blass)

  if (EDIT) {
    ready(function () { NC.map = index(); NC.ready = true; document.dispatchEvent(new Event('ncsite-ready')); });
    return;
  }

  // ---------- normale Besucher: Änderungen laden und anwenden
  var ck = 'ncSite:' + NC.page, cached = null, root = document.documentElement, applied = 'null';
  try { cached = localStorage.getItem(ck); } catch (e) {}
  function reveal() { root.classList.remove('nc-wait'); }
  if (cached == null) {
    // Erster Besuch: ganz kurz warten, damit nichts sichtbar umspringt (höchstens 0,7 s)
    addCss('html.nc-wait body{opacity:0!important}');
    root.classList.add('nc-wait');
    setTimeout(reveal, 700);
  }
  var first = null;
  try { first = cached ? JSON.parse(cached) : null; } catch (e) { first = null; }
  ready(function () {
    NC.map = index(); NC.ready = true;
    if (first) { apply(first, NC.map); applied = JSON.stringify(first); }
  });
  fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'site_get', page: NC.page }) })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      var p = j && j.patch && j.patch.v === 1 ? j.patch : null;
      try { localStorage.setItem(ck, JSON.stringify(p)); } catch (e) {}
      ready(function () {
        var now = JSON.stringify(p);
        if (applied === 'null') { if (p) apply(p, NC.map); }
        else if (now !== applied) {
          // Im Zwischenspeicher lag eine ältere Fassung und ist schon angewendet → einmal neu laden (mit Sperre gegen Schleifen).
          var rk = 'ncSiteReload:' + NC.page, last = null;
          try { last = sessionStorage.getItem(rk); sessionStorage.setItem(rk, now.length + ':' + now.slice(-40)); } catch (e) { last = 'x'; }
          if (last !== now.length + ':' + now.slice(-40) && last !== 'x') { location.reload(); return; }
        }
        reveal();
      });
    })
    .catch(reveal);
})();
