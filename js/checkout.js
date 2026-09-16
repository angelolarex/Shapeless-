/* ===========================================================================
   SHAPELESS — Cassa incorporata
   ---------------------------------------------------------------------------
   Dal 16 settembre 2026 la cassa e' UN SOLO modulo: quello di Stripe, montato
   dentro questa pagina. Prima il cliente scriveva email, nome e indirizzo nel
   nostro modulo e poi Stripe glieli richiedeva: due volte le stesse cose, e
   un salto su un altro sito. Adesso resta su shapeless.shop dall'inizio alla
   fine, e i dati della carta vanno comunque solo a Stripe (il modulo e' un
   riquadro protetto servito da js.stripe.com: nemmeno questa pagina li vede).

   Cosa fa questo file:
     1. chiede al cliente UNA cosa, la zona di spedizione (Italia e' gia'
        scelta), perche' da quella dipendono costo e paesi ammessi;
     2. manda carrello e zona al nostro servizio su Cloudflare, che ricalcola
        i prezzi e crea la sessione Stripe;
     3. monta il modulo Stripe con il clientSecret ricevuto.
   Se il cliente cambia zona, il modulo si smonta e si rimonta col costo nuovo.

   ⚠️ Lo script di Stripe caricato in checkout.html e' la versione "dahlia"
   (js.stripe.com/dahlia/stripe.js). Deve combaciare con STRIPE_VERSIONE in
   _pagamenti/worker.js: e' per questo che qui si chiama
   createEmbeddedCheckoutPage() e non il vecchio initEmbeddedCheckout().
   =========================================================================== */

(function (window, document) {

  var C = window.ShapelessConfig;
  var Cart = window.ShapelessCart;

  var $ = function (id) { return document.getElementById(id); };

  var stripe = null;
  var moduloStripe = null;     // l'istanza montata, per poterla smontare
  var zonaCorrente = 'IT';
  var numeroOrdine = null;
  var montaggioInCorso = 0;    // contatore: ignora risposte arrivate tardi

  var ESTERO_EXTRA = 'Svizzera, Regno Unito, Norvegia, USA, Canada, Australia, Giappone';

  /* ====================================================== avvio */

  document.addEventListener('DOMContentLoaded', function () {
    if (!Cart.getCart().length) {
      $('cassa-vuota').hidden = false;
      return;
    }
    $('cassa-corpo').hidden = false;

    $('garanzia-reso').textContent = 'Reso entro ' + C.reso.giorni + ' giorni';
    disegnaZone();
    aggiornaConsegna();

    var chiave = C.pagamenti.chiavePubblica;
    if (!chiave || !/^pk_(test|live)_/.test(chiave)) {
      errore('La cassa non è ancora configurata (manca la chiave pubblica di Stripe). ' +
             'Scrivici a info@shapeless.shop e completiamo l\'ordine insieme.');
      return;
    }
    if (typeof window.Stripe !== 'function') {
      errore('Il modulo di pagamento non si è caricato. Può capitare con alcuni blocchi ' +
             'pubblicità: disattivalo per questa pagina e ricarica, oppure scrivici a ' +
             'info@shapeless.shop.');
      return;
    }

    stripe = window.Stripe(chiave, { locale: 'it' });
    numeroOrdine = Cart.nuovoNumeroOrdine();
    monta();
  });

  /* ====================================================== zone di spedizione */

  function disegnaZone() {
    var box = $('zone');
    var subtotale = Cart.cartTotal();
    box.innerHTML = '';

    C.spedizione.zone.forEach(function (z) {
      var gratis = z.sogliaGratis !== null && z.sogliaGratis !== undefined &&
                   subtotale >= z.sogliaGratis;
      var prezzo = (gratis || z.costo === 0) ? 'Gratuita' : Cart.formatPrice(z.costo);
      var dettaglio = z.id === 'XX' ? ESTERO_EXTRA
                    : z.id === 'EU' ? (gratis ? 'Tutti i paesi UE'
                                              : 'Gratis sopra ' + Cart.formatPrice(z.sogliaGratis))
                    : 'Corriere tracciato, ' + z.giorni + ' giorni';

      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'zona' + (z.id === zonaCorrente ? ' attiva' : '');
      b.setAttribute('aria-pressed', z.id === zonaCorrente ? 'true' : 'false');
      b.dataset.zona = z.id;
      b.innerHTML =
        '<span class="zona-nome">' + z.nome + '</span>' +
        '<span class="zona-prezzo' + (prezzo === 'Gratuita' ? ' gratis' : '') + '">' + prezzo + '</span>' +
        '<span class="zona-dettaglio">' + dettaglio + '</span>';

      b.addEventListener('click', function () {
        if (zonaCorrente === z.id) return;
        zonaCorrente = z.id;
        box.querySelectorAll('.zona').forEach(function (el) {
          var on = el.dataset.zona === zonaCorrente;
          el.classList.toggle('attiva', on);
          el.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        aggiornaConsegna();
        if (stripe) monta();
      });

      box.appendChild(b);
    });
  }

  function aggiornaConsegna() {
    var z = null;
    C.spedizione.zone.forEach(function (x) { if (x.id === zonaCorrente) z = x; });
    $('consegna-nota').textContent =
      'Prodotto on demand: ' + C.produzione.giorniLavorativi +
      ' giorni lavorativi di produzione, poi ' + (z ? z.giorni : '2-3') +
      ' giorni di corriere. Consegna stimata entro il ' + Cart.dataConsegna() + '.';
  }

  /* ====================================================== modulo Stripe */

  function monta() {
    var turno = ++montaggioInCorso;
    errore('');
    caricamento(true);

    /* Stripe permette un solo modulo alla volta: prima si smonta il vecchio */
    if (moduloStripe) {
      try { moduloStripe.destroy(); } catch (e) { /* gia' smontato */ }
      moduloStripe = null;
    }

    var carrello = Cart.getCart();

    var fetchClientSecret = function () {
      return fetch(C.pagamenti.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zona: zonaCorrente,
          numeroOrdine: numeroOrdine,
          articoli: carrello.map(function (i) {
            return { id: i.id, colore: i.colore, coloreHex: i.coloreHex, qty: i.qty };
          })
        })
      })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok || !d.clientSecret) {
            throw new Error(d.dettaglio || d.errore || ('risposta ' + r.status));
          }
          return d;
        });
      })
      .then(function (d) {
        /* l'ordine resta nel browser: la pagina di grazie lo usa per
           mostrare cosa e' stato comprato, anche coi disegni e i colori */
        Cart.saveOrdine({
          numero:   numeroOrdine,
          data:     new Date().toISOString(),
          articoli: carrello,
          totali:   Cart.calcolaTotali(zonaCorrente === 'IT' ? 'IT' : zonaCorrente === 'EU' ? 'FR' : 'US'),
          consegna: Cart.dataConsegna(),
          zona:     zonaCorrente,
          sessione: d.id || null,
          stato:    'in-pagamento'
        });
        return d.clientSecret;
      });
    };

    stripe.createEmbeddedCheckoutPage({ fetchClientSecret: fetchClientSecret })
      .then(function (modulo) {
        if (turno !== montaggioInCorso) {       // nel frattempo ha cambiato zona
          try { modulo.destroy(); } catch (e) {}
          return;
        }
        moduloStripe = modulo;
        modulo.mount('#modulo-stripe');
        caricamento(false);
      })
      .catch(function (err) {
        if (turno !== montaggioInCorso) return;
        caricamento(false);
        console.error('cassa:', err);
        errore('Non siamo riusciti ad aprire il pagamento (' + (err && err.message || 'errore') + '). ' +
               'Riprova tra un istante, oppure scrivici a info@shapeless.shop e ' +
               'completiamo l\'ordine insieme.', true);
      });
  }

  /* ====================================================== stati della pagina */

  function caricamento(si) {
    $('modulo-attesa').hidden = !si;
  }

  function errore(testo, conRiprova) {
    var p = $('cassa-esito');
    if (!testo) { p.hidden = true; return; }
    p.hidden = false;
    p.textContent = testo;
    if (conRiprova) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'link-sobrio';
      b.style.marginLeft = '8px';
      b.textContent = 'Riprova';
      b.addEventListener('click', monta);
      p.appendChild(b);
    }
  }

})(window, document);
