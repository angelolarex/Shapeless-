/* ===========================================================================
   SHAPELESS — Statistiche interne (mini analytics su misura)   03/10/2026
   ---------------------------------------------------------------------------
   Cosa registra: pagina vista, da dove arriva il visitatore (Instagram,
   Facebook, Google, diretto...), click su link e bottoni, quanto scorre la
   pagina (25/50/75/100%), quanto tempo resta, aggiunte al carrello, invii
   dei moduli. I dati vanno al servizio su Cloudflare (/t) e si guardano nel
   Pannello, scheda "Analisi" (solo Angelo).

   Privacy: niente cookie, niente indirizzo IP, niente impronte del browser.
   Solo un codice casuale valido finche' la scheda resta aperta
   (sessionStorage). Il paese lo ricava Cloudflare. Rispetta "Do Not Track".

   Per NON contare le tue visite: apri una volta il sito con ?noanalytics=1
   (per riattivare: ?noanalytics=0), su ogni browser/dispositivo.
   =========================================================================== */
(function () {
  'use strict';

  var EP = 'https://shapeless-pagamenti.shapeless-shop.workers.dev/t';

  try {
    if (/[?&]noanalytics=1/.test(location.search)) localStorage.setItem('shp_no_an', '1');
    if (/[?&]noanalytics=0/.test(location.search)) localStorage.removeItem('shp_no_an');
    if (localStorage.getItem('shp_no_an') === '1') return;
  } catch (e) {}
  /* ?sonoio=1 su un dispositivo: le sue visite restano registrate ma nel pannello compaiono come "Sei tu" */
  var IO = 0;
  try {
    if (/[?&]sonoio=1/.test(location.search)) localStorage.setItem('shp_io', '1');
    if (/[?&]sonoio=0/.test(location.search)) localStorage.removeItem('shp_io');
    IO = localStorage.getItem('shp_io') === '1' ? 1 : 0;
  } catch (e) {}
  if (/^(localhost|127\.|\[::1\])/.test(location.hostname) || location.protocol === 'file:') return;
  if (navigator.doNotTrack === '1' || navigator.webdriver) return;
  if (/bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview/i.test(navigator.userAgent)) return;

  var UA = navigator.userAgent || '';

  /* ------------------------------------------------------------ sessione */
  function rnd() {
    var a = new Uint8Array(8);
    try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < 8; i++) a[i] = Math.random() * 256; }
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function ss(k, v) {
    try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {}
    return null;
  }

  var sid = ss('shp_sid');
  if (!sid) { sid = rnd(); ss('shp_sid', sid); }

  /* ------------------------------------------------------------ provenienza */
  var NOMI = {
    ig: 'Instagram', instagram: 'Instagram', fb: 'Facebook', facebook: 'Facebook', meta: 'Facebook',
    google: 'Google', bing: 'Bing', tiktok: 'TikTok', pinterest: 'Pinterest', whatsapp: 'WhatsApp',
    newsletter: 'Email', email: 'Email', mail: 'Email', youtube: 'YouTube', linkedin: 'LinkedIn',
    x: 'X (Twitter)', twitter: 'X (Twitter)', telegram: 'Telegram'
  };
  var HOST = [
    [/(^|\.)instagram\.com$/, 'Instagram'], [/(^|\.)(facebook|fb)\.com$|^fb\.me$|^l\.facebook|^lm\.facebook|^m\.facebook/, 'Facebook'],
    [/(^|\.)google\./, 'Google'], [/(^|\.)bing\.com$/, 'Bing'], [/duckduckgo|ecosia|yahoo|qwant|brave\.com/, 'Altri motori di ricerca'],
    [/(^|\.)tiktok\.com$/, 'TikTok'], [/pinterest\./, 'Pinterest'], [/^t\.co$|(^|\.)(twitter|x)\.com$/, 'X (Twitter)'],
    [/youtube\.|youtu\.be/, 'YouTube'], [/linkedin\.|lnkd\.in/, 'LinkedIn'], [/whatsapp\./, 'WhatsApp'],
    [/^mail\.google|outlook\.|^webmail|mail\.yahoo/, 'Email'], [/^(.+\.)?(telegram|t)\.me$/, 'Telegram']
  ];

  function provenienza() {
    var q = new URLSearchParams(location.search);
    var us = (q.get('utm_source') || '').toLowerCase().trim();
    var um = (q.get('utm_medium') || '').toLowerCase().trim();
    var uc = (q.get('utm_campaign') || '').trim();
    var app = /Instagram/i.test(UA) ? 'instagram' : /FBAN|FBAV|FB_IAB|FBIOS/i.test(UA) ? 'facebook' :
              /TikTok|musical_ly|BytedanceWebview/i.test(UA) ? 'tiktok' : /Pinterest/i.test(UA) ? 'pinterest' : '';
    var ref = '', host = '';
    try { if (document.referrer) { var u = new URL(document.referrer); host = u.hostname.replace(/^www\./, ''); if (host !== location.hostname.replace(/^www\./, '')) ref = host; } } catch (e) {}

    var src = '';
    if (us) src = NOMI[us] || (us.charAt(0).toUpperCase() + us.slice(1));
    else if (q.get('gclid') || q.get('gbraid') || q.get('wbraid')) { src = 'Google'; um = um || 'cpc'; }
    else if (q.get('ttclid')) { src = 'TikTok'; um = um || 'cpc'; }
    else if (q.get('msclkid')) { src = 'Bing'; um = um || 'cpc'; }
    else if (q.get('fbclid')) src = (app === 'instagram' || /instagram/.test(host)) ? 'Instagram' : 'Facebook';
    else if (app === 'instagram') src = 'Instagram';
    else if (app === 'facebook') src = 'Facebook';
    else if (app === 'tiktok') src = 'TikTok';
    else if (app === 'pinterest') src = 'Pinterest';
    else if (ref) {
      for (var i = 0; i < HOST.length; i++) if (HOST[i][0].test(ref)) { src = HOST[i][1]; break; }
      if (!src) src = ref;
    } else src = 'Diretto';
    return { src: src.slice(0, 40), med: um.slice(0, 30), camp: uc.slice(0, 60), ref: ref.slice(0, 60), app: app };
  }

  var P;
  try { P = JSON.parse(ss('shp_src') || 'null'); } catch (e) { P = null; }
  if (!P) { P = provenienza(); ss('shp_src', JSON.stringify(P)); }

  /* ------------------------------------------------------------ invio */
  var coda = [], timer = null;
  var DISP = innerWidth < 768 ? 'mobile' : innerWidth < 1100 ? 'tablet' : 'desktop';
  var LANG = (function () { try { return localStorage.getItem('shapeless_lang') || document.documentElement.lang || 'it'; } catch (e) { return 'it'; } })().slice(0, 2);
  var PAGINA = (location.pathname.replace(/index\.html$/, '') || '/').slice(0, 120);

  function ev(k, v, x, n) {
    coda.push({ k: k, p: PAGINA, v: v ? String(v).slice(0, 60) : '', x: x ? String(x).slice(0, 80) : '', n: n == null ? 0 : Math.round(n) });
    if (coda.length >= 10) manda(); else if (!timer) timer = setTimeout(manda, 12000);
  }

  function manda() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!coda.length) return;
    var corpo = JSON.stringify({ s: sid, i: IO, o: P, d: DISP, l: LANG, ev: coda.splice(0, 20) });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(EP, new Blob([corpo], { type: 'text/plain' }))) return;
    } catch (e) {}
    try { fetch(EP, { method: 'POST', body: corpo, headers: { 'Content-Type': 'text/plain' }, keepalive: true, mode: 'no-cors' }); } catch (e) {}
  }

  /* ------------------------------------------------------------ pagina vista */
  ev('pv');

  /* ------------------------------------------------------------ scroll */
  var toccati = {}, scrollPronto = false;
  function misuraScroll() {
    scrollPronto = false;
    var d = document.documentElement, h = Math.max(d.scrollHeight, document.body.scrollHeight);
    var vedo = (window.pageYOffset || d.scrollTop || 0) + innerHeight;
    var pc = h > 0 ? vedo / h * 100 : 100;
    [25, 50, 75, 100].forEach(function (m) {
      if (!toccati[m] && pc >= m - (m === 100 ? 3 : 0)) { toccati[m] = 1; ev('scroll', '', '', m); }
    });
  }
  addEventListener('scroll', function () {
    if (!scrollPronto) { scrollPronto = true; requestAnimationFrame(misuraScroll); }
  }, { passive: true });
  setTimeout(misuraScroll, 1500);   /* pagine corte: se tutto e' gia' visibile conta 100% */

  /* ------------------------------------------------------------ tempo attivo */
  var attivoDa = document.visibilityState === 'visible' ? Date.now() : 0, secondi = 0, tempoInviato = false;
  function chiudiTempo() {
    if (attivoDa) { secondi += (Date.now() - attivoDa) / 1000; attivoDa = 0; }
  }
  function inviaTempo() {
    chiudiTempo();
    if (!tempoInviato && secondi >= 1) { tempoInviato = true; ev('tempo', '', '', Math.min(secondi, 1800)); }
    manda();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { inviaTempo(); }
    else { attivoDa = Date.now(); tempoInviato = false; secondi = 0; }
  });
  addEventListener('pagehide', inviaTempo);

  /* battito: ogni 20 s, finche' la pagina e' in primo piano, dice "sono ancora qui" (serve al contatore LIVE) */
  var battiti = 0;
  var bt = setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    if (++battiti > 90) { clearInterval(bt); return; }
    var corpo = JSON.stringify({ s: sid, i: IO, o: P, d: DISP, l: LANG, ev: [] });
    try { if (navigator.sendBeacon) navigator.sendBeacon(EP, new Blob([corpo], { type: 'text/plain' })); } catch (e) {}
  }, 20000);

  /* ------------------------------------------------------------ click */
  function etichetta(el) {
    var t = el.getAttribute('data-an') || el.getAttribute('aria-label') || el.getAttribute('title') || '';
    if (!t) {
      t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!t) { var im = el.querySelector && el.querySelector('img[alt]'); if (im) t = 'img: ' + im.getAttribute('alt'); }
      if (!t && el.tagName === 'IMG') t = 'img: ' + (el.getAttribute('alt') || (el.currentSrc || el.src || '').split('/').pop().split('?')[0]);
    }
    return t.slice(0, 50);
  }
  function destinazione(a) {
    var h = a.getAttribute && a.getAttribute('href');
    if (!h || h.charAt(0) === '#') return '';
    if (/^tel:/.test(h)) return 'telefono';
    if (/^mailto:/.test(h)) return 'email';
    if (/wa\.me|whatsapp/.test(h)) return 'whatsapp';
    try {
      var u = new URL(h, location.href);
      return u.hostname === location.hostname ? u.pathname.replace(/index\.html$/, '') + (u.search ? '?…' : '') : u.hostname;
    } catch (e) { return ''; }
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('a,button,[role=button],summary,label,select,input[type=submit],[data-an]') : null;
    if (!el) {
      var t = e.target;
      if (t && (t.tagName === 'IMG' || t.tagName === 'VIDEO' || t.tagName === 'MODEL-VIEWER' || t.tagName === 'CANVAS')) {
        ev('click', t.tagName === 'IMG' ? etichetta(t) : t.tagName.toLowerCase(), 'media');
      }
      return;
    }
    var nome = etichetta(el);
    if (!nome) nome = el.id ? '#' + el.id : el.tagName.toLowerCase();
    ev('click', nome, el.tagName === 'A' ? destinazione(el) : (el.tagName === 'BUTTON' ? 'bottone' : ''));
  }, true);

  /* ------------------------------------------------------------ carrello e moduli */
  var qtaPrima = 0;
  function qta(c) { return (c || []).reduce(function (s, i) { return s + (+i.qty || 1); }, 0); }
  try { if (window.ShapelessCart) qtaPrima = qta(window.ShapelessCart.getCart()); } catch (e) {}
  document.addEventListener('carrello:cambiato', function (e) {
    var c = e && e.detail && e.detail.cart || [];
    var ora = qta(c);
    if (ora > qtaPrima) {
      var ultimo = c[c.length - 1] || {};
      ev('carrello', ultimo.nome || ultimo.id || '', ultimo.colore || '', ora - qtaPrima);
    }
    qtaPrima = ora;
  });
  /* consenso marketing (vedi meta-pixel.js): serve al Pannello per sapere quanti visitatori il Pixel Meta puo' vedere */
  function consenso(v, x) {
    if (v !== 'mostrato' && v !== 'si' && v !== 'no') return;
    if (ss('shp_cs_' + v + x)) return;          /* una volta per visita */
    ss('shp_cs_' + v + x, '1'); ev('consenso', v, x);
  }
  (window.shpAnQ || []).splice(0).forEach(function (a) { consenso(a[0], a[1]); });
  document.addEventListener('shp:consenso', function (e) { var d = (e && e.detail) || {}; consenso(d.v, d.x); });
  document.addEventListener('submit', function (e) {
    var f = e.target;
    ev('form', (f && (f.getAttribute('data-an') || f.id || f.getAttribute('name') || f.getAttribute('action') || 'modulo')) || 'modulo');
    manda();
  }, true);
})();
