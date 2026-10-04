/* ===========================================================================
   SHAPELESS — Pixel Meta con consenso   03/10/2026
   ---------------------------------------------------------------------------
   Il Pixel di Facebook/Instagram NON parte da solo: si carica solo se il
   visitatore preme "Accetta" nel banner. Se rifiuta (o ignora), non viene
   caricato nulla di Meta. La scelta resta nel browser (localStorage).

   >>> PER ATTIVARLO: incolla qui sotto l'ID del Pixel (Meta -> Gestione
   >>> eventi -> Origini dati -> il tuo Pixel -> numero di 15-16 cifre).
   Finche' e' vuoto non succede niente e il banner non compare.

   Eventi: PageView (ogni pagina), ViewContent (scheda prodotto),
   AddToCart (aggiunta al carrello), InitiateCheckout (apertura cassa),
   Purchase (pagina "ordine ricevuto", solo a pagamento completato).
   Per riaprire la scelta: window.shapelessConsenso.riapri()
   =========================================================================== */
(function () {
  'use strict';

  var PIXEL_ID = '2207826886231719';              /* <-- ID del Pixel Meta */
  var CHIAVE = 'shp_consenso_marketing';

  if (!PIXEL_ID) { window.shapelessPixel = { purchase: function () {} }; return; }

  function leggi() { try { return localStorage.getItem(CHIAVE); } catch (e) { return null; } }
  function scrivi(v) { try { localStorage.setItem(CHIAVE, v); } catch (e) {} }
  /* lingua del banner = lingua scelta dal visitatore con il pulsante IT/EN (letta quando il banner compare) */
  function inglese() { try { return localStorage.getItem('shapeless_lang') === 'en'; } catch (e) { return (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0; } }
  var P = location.pathname.split('/').pop() || 'index.html';
  var attivo = false;

  /* le scelte di consenso si segnalano anche alle statistiche interne (analytics.js), cosi' il Pannello
     sa quanti visitatori il Pixel puo' vedere. Coda + evento: analytics.js parte dopo di noi. */
  function segnala(v, x) {
    (window.shpAnQ = window.shpAnQ || []).push([v, x || '']);
    try { document.dispatchEvent(new CustomEvent('shp:consenso', { detail: { v: v, x: x || '' } })); } catch (e) {}
  }

  function carica() {
    if (attivo) return; attivo = true;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');
    eventiPagina();
    /* visitatore molto interessato (punteggio calcolato in analytics.js): serve a creare pubblici su misura in Meta */
    document.addEventListener('shp:interesse', function (e) {
      var d = (e && e.detail) || {};
      try { fbq('trackCustom', 'InteresseAlto', { punteggio: d.punteggio || 0, content_name: d.prodotto || '' }); } catch (x) {}
    });
    if (window.shpInteresse) { try { fbq('trackCustom', 'InteresseAlto', window.shpInteresse); } catch (x) {} }
  }

  function cfg() { return window.ShapelessConfig || {}; }
  function cart() { try { return window.ShapelessCart.getCart(); } catch (e) { return []; } }
  function qta(c) { return c.reduce(function (s, i) { return s + i.qty; }, 0); }
  function valore(c) { return c.reduce(function (s, i) { return s + i.qty * i.prezzo; }, 0); }
  function contenuti(c) { return c.map(function (i) { return { id: i.id, quantity: i.qty, item_price: i.prezzo }; }); }

  function eventiPagina() {
    /* scheda prodotto */
    var prodotti = cfg().prodotti || {};
    Object.keys(prodotti).forEach(function (k) {
      var p = prodotti[k];
      if (p.pagina && p.pagina === P) {
        fbq('track', 'ViewContent', { content_ids: [p.id], content_name: p.nome, content_type: 'product', value: p.prezzo, currency: 'EUR' });
      }
    });
    /* cassa */
    if (P === 'checkout.html') {
      var c = cart();
      if (c.length) fbq('track', 'InitiateCheckout', { contents: contenuti(c), content_type: 'product', num_items: qta(c), value: valore(c), currency: 'EUR' });
    }
    /* aggiunta al carrello */
    var prima = qta(cart());
    document.addEventListener('carrello:cambiato', function (e) {
      var c = (e && e.detail && e.detail.cart) || [];
      var ora = qta(c);
      if (ora > prima && c.length) {
        var u = c[c.length - 1];
        fbq('track', 'AddToCart', { content_ids: [u.id], content_name: u.nome, content_type: 'product', value: u.prezzo, currency: 'EUR' });
      }
      prima = ora;
    });
    /* acquisti arrivati prima del consenso/caricamento */
    (window.shapelessPixelQ || []).forEach(function (o) { acquisto(o); });
    window.shapelessPixelQ = [];
  }

  function acquisto(o) {
    if (!attivo || !window.fbq || !o) return;
    var chiave = 'shp_pixel_acq_' + (o.id || '');
    try { if (o.id && sessionStorage.getItem(chiave)) return; sessionStorage.setItem(chiave, '1'); } catch (e) {}
    var d = { value: o.value, currency: 'EUR', content_type: 'product' };
    if (o.items && o.items.length) { d.contents = contenuti(o.items); d.num_items = qta(o.items); }
    fbq('track', 'Purchase', d, { eventID: o.id });   /* eventID = id sessione Stripe, serve a non contare due volte */
  }
  /* la pagina "ordine ricevuto" chiama window.shapelessPixel.purchase({id, value, items}) */
  window.shapelessPixel = {
    purchase: function (o) { if (attivo) acquisto(o); else (window.shapelessPixelQ = window.shapelessPixelQ || []).push(o); }
  };

  /* ---------------------------------------------------------------- banner */
  function banner() {
    if (document.getElementById('shp-consenso')) return;
    segnala('mostrato');
    var EN = inglese();
    var b = document.createElement('div');
    b.id = 'shp-consenso'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', EN ? 'Cookie preferences' : 'Preferenze cookie');
    b.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;max-width:560px;margin:0 auto;z-index:2000;background:#fff;color:#0a0a0a;' +
      'border:1px solid rgba(0,0,0,.12);border-radius:14px;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.18);font:14px/1.5 Inter,system-ui,sans-serif';
    var TEL = window.innerWidth <= 640;
    if (TEL) {
      b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2000;background:#fff;color:#0a0a0a;border-top:1px solid rgba(0,0,0,.12);' +
        'border-radius:12px 12px 0 0;padding:10px 14px calc(10px + env(safe-area-inset-bottom));box-shadow:0 -6px 24px rgba(0,0,0,.14);font:12px/1.4 Inter,system-ui,sans-serif';
    }
    var t = EN
      ? 'We\'d like to use Meta\'s marketing cookies (Pixel) to measure our Instagram and Facebook ads. They are off unless you accept.'
      : 'Vorremmo usare i cookie di marketing di Meta (Pixel) per misurare le nostre inserzioni su Instagram e Facebook. Restano spenti se non accetti.';
    var btn = 'flex:1;min-width:' + (TEL ? '100px' : '120px') + ';padding:' + (TEL ? '8px 12px' : '11px 16px') + ';border-radius:999px;font:600 ' + (TEL ? '13' : '14') + 'px Inter,system-ui,sans-serif;cursor:pointer;border:1px solid #6b1f45;';
    b.innerHTML = '<p style="margin:0 0 ' + (TEL ? '8' : '12') + 'px">' + t + ' <a href="privacy.html" style="color:#6b1f45;text-decoration:underline">' + (EN ? 'Privacy' : 'Privacy') + '</a></p>' +
      '<div style="display:flex;gap:' + (TEL ? '8' : '10') + 'px;flex-wrap:wrap">' +
      '<button type="button" data-s="no" style="' + btn + 'background:#fff;color:#6b1f45">' + (EN ? 'Reject' : 'Rifiuta') + '</button>' +
      '<button type="button" data-s="si" style="' + btn + 'background:#6b1f45;color:#fff">' + (EN ? 'Accept' : 'Accetta') + '</button></div>';
    b.addEventListener('click', function (e) {
      var s = e.target && e.target.getAttribute && e.target.getAttribute('data-s');
      if (!s) return;
      scrivi(s); b.remove(); segnala(s, 'banner');
      if (s === 'si') carica();
      else { try { if (window.fbq) { fbq('consent', 'revoke'); } } catch (x) {} }
    });
    document.body.appendChild(b);
  }

  window.shapelessConsenso = { riapri: function () { var x = document.getElementById('shp-consenso'); if (x) x.remove(); banner(); } };

  var c = leggi();
  if (c === 'si' || c === 'no') segnala(c, 'salvato');
  if (c === 'si') carica();
  else if (c !== 'no') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', banner); else banner();
  }
})();
