/* ===========================================================================
   SHAPELESS — Percorso d'acquisto della scheda prodotto            13/11/2026
   ---------------------------------------------------------------------------
   Registra TRE segnali, una sola volta per visita ciascuno:
     price_visible  il prezzo e' davvero sullo schermo      (v = principale | barra)
     cta_visible    il pulsante "Aggiungi" e' davvero sullo schermo (v = principale | barra)
     cta_click      clic sul pulsante "Aggiungi"             (v = principale | barra)
   "Davvero sullo schermo" = almeno il 90% dell'elemento dentro l'area che l'utente
   vede (sotto la barra di navigazione fissa, sopra la barra mobile se e' alzata),
   scheda in primo piano, e la condizione resta vera per almeno mezzo secondo
   (scorrere veloce davanti al pulsante non conta).
   Non cambia nulla nella pagina: legge soltanto. I segnali passano da js/analytics.js
   (stessa coda, stesso consenso/Do-Not-Track/?noanalytics=1 delle altre statistiche).
   Non tocca il Pixel Meta. Caricato solo da prodotto-blade.html.
   =========================================================================== */
(function () {
  'use strict';

  var PERMANENZA = 500;      /* ms: quanto deve restare visibile */
  var SOGLIA = 0.9;          /* quota dell'elemento che deve stare nell'area visibile */

  var el = {
    prezzoPrincipale: document.getElementById('cfg-prezzo'),
    prezzoBarra:      document.getElementById('barra-prezzo'),
    ctaPrincipale:    document.getElementById('cfg-add'),
    ctaBarra:         document.getElementById('barra-add'),
    barra:            document.getElementById('barra-mobile')
  };
  if (!el.prezzoPrincipale || !el.ctaPrincipale) return;

  var fatti = {};

  /* una volta per visita (la visita = la scheda del browser: sessionStorage, come analytics.js) */
  function invia(k, v) {
    var chiave = 'shp_fn_' + k + '_' + v;
    if (fatti[chiave]) return;
    fatti[chiave] = 1;
    try {
      if (sessionStorage.getItem(chiave)) return;
      sessionStorage.setItem(chiave, '1');
    } catch (e) {}
    if (typeof window.shpEvento === 'function') window.shpEvento(k, v);
    else (window.shpEvQ = window.shpEvQ || []).push([k, v]);
  }

  /* ---- area che l'utente vede davvero ---- */
  function altezzaNav() {
    var n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'));
    return isNaN(n) ? 64 : n;
  }
  function barraAlzata() {
    if (!el.barra || !el.barra.classList.contains('visibile')) return false;
    var r = el.barra.getBoundingClientRect();
    return getComputedStyle(el.barra).display !== 'none' && r.height > 0 && r.top < window.innerHeight;
  }
  function visibile(e) {
    if (!e || document.visibilityState !== 'visible') return false;
    var r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    var cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    var alto = altezzaNav();
    var basso = window.innerHeight;
    if (barraAlzata()) basso = Math.min(basso, el.barra.getBoundingClientRect().top);
    var v = Math.min(r.bottom, basso) - Math.max(r.top, alto);
    var o = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
    return v >= r.height * SOGLIA && o >= r.width * SOGLIA;
  }
  /* il pulsante/prezzo della barra conta solo se la barra e' alzata (su computer e' nascosta) */
  function visibileBarra(e) { return barraAlzata() && visibile(e); }

  var bersagli = [
    { k: 'price_visible', v: 'principale', e: el.prezzoPrincipale, test: visibile },
    { k: 'price_visible', v: 'barra',      e: el.prezzoBarra,      test: visibileBarra },
    { k: 'cta_visible',   v: 'principale', e: el.ctaPrincipale,    test: visibile },
    { k: 'cta_visible',   v: 'barra',      e: el.ctaBarra,         test: visibileBarra }
  ];

  function controlla() {
    bersagli.forEach(function (b) {
      if (!b.e || fatti['shp_fn_' + b.k + '_' + b.v] || b.attesa) return;
      if (!b.test(b.e)) return;
      /* e' visibile ora: si invia solo se lo e' ancora tra mezzo secondo */
      b.attesa = setTimeout(function () {
        b.attesa = null;
        if (b.test(b.e)) invia(b.k, b.v);
      }, PERMANENZA);
    });
  }

  /* ---- quando controllare ---- */
  var pronto = false;
  function pianifica() {
    if (pronto) return;
    pronto = true;
    requestAnimationFrame(function () { pronto = false; controlla(); });
  }
  addEventListener('scroll', pianifica, { passive: true });
  addEventListener('resize', pianifica);
  document.addEventListener('visibilitychange', pianifica);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(pianifica, { threshold: [0, 0.5, 0.9, 1] });
    [el.prezzoPrincipale, el.prezzoBarra, el.ctaPrincipale, el.ctaBarra].forEach(function (e) { if (e) io.observe(e); });
  }
  /* la barra si alza/abbassa cambiando classe: un controllo anche in quel momento */
  if (el.barra && 'MutationObserver' in window) {
    new MutationObserver(function () { setTimeout(pianifica, 350); }).observe(el.barra, { attributes: true, attributeFilter: ['class'] });
  }
  setTimeout(pianifica, 800);   /* computer: il prezzo e' gia' in vista al caricamento */

  /* ---- clic sul pulsante (in cattura: parte prima del carrello, che non viene toccato) ---- */
  if (el.ctaPrincipale) el.ctaPrincipale.addEventListener('click', function () { invia('cta_click', 'principale'); }, true);
  if (el.ctaBarra) el.ctaBarra.addEventListener('click', function () { invia('cta_click', 'barra'); }, true);
})();
