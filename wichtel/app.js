// Wichteln – gemeinsame Hilfen für alle Seiten.
// Die Seite enthält KEINE Schlüssel: Sie schickt nur Aktionen an die Server-Funktion.
// Der Token aus dem Link steht hinter dem # und wird nie an GitHub geschickt.

const API = location.hostname === "localhost" || location.hostname === "127.0.0.1"
  ? "/api"   // lokaler Test-Server (server/dev_server.mjs)
  : "https://snafgyzhegwkxmunmxje.supabase.co/functions/v1/wichtel";

const W = {
  /** Aktion an den Server schicken. Wirft einen Fehler mit deutscher Meldung. */
  async api(action, data = {}) {
    let r;
    try {
      r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...data }) });
    } catch {
      throw new Error("Keine Verbindung. Bist du online?");
    }
    let json = {};
    try { json = await r.json(); } catch { /* leer */ }
    if (!r.ok) {
      const e = new Error(json.error || "Da ist etwas schiefgelaufen. Bitte versuch es gleich nochmal.");
      e.status = r.status;
      throw e;
    }
    return json;
  },

  /** Token / Code aus dem Link (alles hinter #). */
  hash() {
    return decodeURIComponent(location.hash.slice(1)).trim();
  },

  $(sel, root = document) { return root.querySelector(sel); },

  /** Element bauen: W.el("p", {class: "fine"}, "Text", kind, ...) – Text wird nie als HTML gelesen. */
  el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return e;
  },

  /** Freitext anzeigen, Links (http/https) klickbar – sicher, ohne innerHTML. */
  richText(target, text, emptyText = "Noch keine Wünsche eingetragen.") {
    target.replaceChildren();
    target.classList.toggle("empty", !text);
    if (!text) { target.textContent = emptyText; return; }
    const re = /https?:\/\/[^\s<>"]+/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      let url = m[0].replace(/[.,;:!?)\]]+$/, "");
      target.append(text.slice(last, m.index));
      target.append(W.el("a", { href: url, target: "_blank", rel: "noopener noreferrer nofollow" }, url));
      last = m.index + url.length;
    }
    target.append(text.slice(last));
  },

  /** Meldung unter einem Formular. */
  say(box, text, kind = "err") {
    box.textContent = text || "";
    box.className = "msg " + (text ? kind : "");
  },

  /** Knopf während einer Aktion sperren. */
  async busy(btn, label, fn) {
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = label;
    try { return await fn(); } finally { btn.disabled = false; btn.textContent = old; }
  },

  async copy(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = W.el("textarea", {}, text);
      document.body.append(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    if (btn) {
      const old = btn.textContent;
      btn.textContent = "Kopiert ✓";
      setTimeout(() => (btn.textContent = old), 1800);
    }
  },

  canShare: () => typeof navigator.share === "function",
  async share(url, title, text) {
    try { await navigator.share({ url, title, text }); } catch { /* abgebrochen */ }
  },

  date(iso) {
    if (!iso) return "";
    return new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  },

  /** Budget/Datum als kleine Pillen. */
  facts(group, extra = []) {
    const box = W.el("div", { class: "facts" });
    if (group.budget) box.append(W.el("span", { class: "chip" }, "💶 " + group.budget));
    if (group.date) box.append(W.el("span", { class: "chip" }, "📅 " + W.date(group.date)));
    for (const x of extra) box.append(x);
    return box;
  },

  base() { return location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, ""); },
  link: {
    invite: (code) => W.base() + "gruppe.html#" + code,
    me: (token) => W.base() + "ich.html#" + token,
    admin: (token) => W.base() + "admin.html#" + token,
  },

  /** Eigene Sicherheitsabfrage (schöner als confirm()). Liefert true bei OK. */
  ask(title, text, okLabel = "OK", danger = false) {
    return new Promise((resolve) => {
      const d = W.el("dialog", {},
        W.el("h2", {}, title),
        W.el("p", {}, text),
        W.el("div", { class: "row" },
          W.el("button", { class: "btn ghost", value: "no", onclick: () => d.close("no") }, "Abbrechen"),
          W.el("button", { class: "btn " + (danger ? "danger" : "go"), value: "ok", onclick: () => d.close("ok") }, okLabel)));
      d.addEventListener("close", () => { resolve(d.returnValue === "ok"); d.remove(); });
      document.body.append(d);
      d.showModal();
    });
  },

  /** Fehlerseite, wenn der Link nicht stimmt. */
  fail(main, title, text) {
    main.replaceChildren(W.el("div", { class: "card center" },
      W.el("div", { style: "font-size:44px" }, "🔍"),
      W.el("h1", { style: "font-size:28px" }, title),
      W.el("p", {}, text),
      W.el("div", { class: "row" },
        W.el("a", { class: "btn", href: "link.html" }, "Link verloren?"),
        W.el("a", { class: "btn ghost", href: "./" }, "Zur Startseite"))));
  },

  /** Kurze Notiz von einer Seite zur nächsten (nur in diesem Tab). */
  flash(key, value) {
    try {
      if (value === undefined) { const v = sessionStorage.getItem("wichtel-" + key); sessionStorage.removeItem("wichtel-" + key); return v; }
      sessionStorage.setItem("wichtel-" + key, value);
    } catch { /* privat-Modus */ }
    return null;
  },
};
