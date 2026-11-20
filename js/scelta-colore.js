/* ===========================================================================
   SHAPELESS — il colore va scelto, non e' mai preselezionato (15/11/2026)
   ---------------------------------------------------------------------------
   Prima: la pagina partiva con un colore gia' acceso (es. Red Wine) e chi
   premeva "Aggiungi al carrello" senza guardare i pallini comprava quello,
   anche se la foto mostrava un'altra sfumatura (es. Bordeaux).
   Ora: all'apertura nessun colore e' scelto; "Aggiungi al carrello" resta
   fermo finche' il cliente non tocca un pallino. Toccare una foto o il 3D
   NON sceglie nessun colore. Chi arriva da un link con ?colore=... (realta'
   aumentata, link condiviso) ha gia' scelto: in quel caso non si tocca nulla.
   Va inserito in fondo alle pagine prodotto, dopo gli altri script.
   =========================================================================== */
(function () {
  'use strict';

  var sw = document.getElementById('colors');
  if (!sw) return;

  function scelto() { return !!sw.querySelector('.color-swatch.active'); }

  var nome  = document.getElementById('colorname');
  var testo = document.getElementById('cfg-add-testo');
  var barra = document.getElementById('barra-colore');
  var pall  = document.getElementById('cfg-add-pallino');
  var bpall = document.getElementById('barra-pallino');   /* pallino anche nella barra fissa (solo dove c'e') */
  var TXT_NOME = 'Scegli un colore';
  var TXT_BTN  = 'Scegli un colore';

  function applicaNonScelto() {
    if (scelto()) return;
    if (nome  && nome.textContent  !== TXT_NOME) nome.textContent  = TXT_NOME;
    if (testo && testo.textContent !== TXT_BTN)  testo.textContent = TXT_BTN;
    if (barra && barra.textContent !== TXT_BTN)  barra.textContent = TXT_BTN;
    if (pall) pall.style.background = 'transparent';
    if (bpall) bpall.style.background = 'transparent';
  }

  /* stato di partenza: se non arriva da un link con il colore, nessuno acceso */
  if (!/[?&]colore=[0-9a-fA-F]{6}/.test(location.search)) {
    sw.querySelectorAll('.color-swatch.active').forEach(function (b) { b.classList.remove('active'); });
  }
  applicaNonScelto();

  /* altri script riscrivono i testi (cambio misura, ecc.): finche' non c'e'
     un colore scelto li rimettiamo a posto */
  if (window.MutationObserver) {
    var mo = new MutationObserver(applicaNonScelto);
    [nome, testo, barra].forEach(function (el) {
      if (el) mo.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  /* la barra dell'indirizzo non deve "scegliere" il colore al posto del cliente */
  if (window.history && history.replaceState) {
    var orig = history.replaceState;
    history.replaceState = function (stato, titolo, url) {
      if (!scelto() && typeof url === 'string') {
        url = url.replace(/([?&])colore=[0-9a-fA-F]{6}&?/, '$1').replace(/[?&]$/, '');
      }
      return orig.call(history, stato, titolo, url);
    };
  }

  /* "Aggiungi al carrello" senza colore: non parte, e si indica dove scegliere */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#cfg-add, #barra-add');
    if (!b || scelto()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (nome) { nome.textContent = 'Scegli prima un colore'; nome.style.color = 'var(--accent)'; }
    try { sw.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) { sw.scrollIntoView(); }
    sw.style.transition = 'box-shadow .25s';
    sw.style.boxShadow = '0 0 0 3px var(--accent)';
    sw.style.borderRadius = '999px';
    setTimeout(function () { sw.style.boxShadow = 'none'; }, 1400);
  }, true);

  sw.addEventListener('click', function (e) {
    if (e.target.closest('.color-swatch') && nome) nome.style.color = '';
  });
})();
