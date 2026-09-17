/* ===========================================================================
   SHAPELESS — Cassa (versione "cassa nostra", 16 settembre 2026)
   ---------------------------------------------------------------------------
   I campi (nome, email, telefono, indirizzo, fattura) sono NOSTRI: li
   disegniamo nell'ordine giusto e sono sempre visibili. Stripe mette solo il
   riquadro dei metodi di pagamento (carta, Google Pay, Apple Pay, PayPal,
   Klarna): i dati della carta restano a Stripe, questa pagina non li vede.

   Come funziona:
     1. all'apertura chiede al servizio su Cloudflare una sessione di
        pagamento per il carrello e per il PAESE scelto (da cui dipende la
        spedizione: Italia gratis, UE, resto del mondo);
     2. monta il riquadro pagamento di Stripe;
     3. al clic su Paga controlla i campi, manda note e dati fattura al
        servizio (/dettagli-ordine) e conferma il pagamento passando a Stripe
        email, telefono e indirizzo.
   Se il cliente cambia paese e la zona di spedizione cambia, la sessione si
   rifa' da capo col costo giusto. Il server accetta solo indirizzi dei paesi
   di quella zona: nessuno paga la spedizione italiana per spedire all'estero.

   ⚠️ Script Stripe "dahlia": i nomi sono initCheckoutElementsSdk,
   createPaymentElement, loadActions, confirm. Deve combaciare con
   STRIPE_VERSIONE in _pagamenti/worker.js.
   =========================================================================== */

(function (window, document) {

  var C = window.ShapelessConfig;
  var Cart = window.ShapelessCart;
  var $ = function (id) { return document.getElementById(id); };

  var PAESI = [
    ['IT', 'Italia'],
    ['AT','Austria'], ['BE','Belgio'], ['BG','Bulgaria'], ['CY','Cipro'],
    ['HR','Croazia'], ['DK','Danimarca'], ['EE','Estonia'], ['FI','Finlandia'],
    ['FR','Francia'], ['DE','Germania'], ['GR','Grecia'], ['IE','Irlanda'],
    ['LV','Lettonia'], ['LT','Lituania'], ['LU','Lussemburgo'], ['MT','Malta'],
    ['NL','Paesi Bassi'], ['PL','Polonia'], ['PT','Portogallo'], ['CZ','Repubblica Ceca'],
    ['RO','Romania'], ['SK','Slovacchia'], ['SI','Slovenia'], ['ES','Spagna'],
    ['SE','Svezia'], ['HU','Ungheria'],
    ['CH','Svizzera'], ['GB','Regno Unito'], ['NO','Norvegia'],
    ['US','Stati Uniti'], ['CA','Canada'], ['AU','Australia'], ['JP','Giappone']
  ];

  var stripe = null;
  var azioni = null;          // actions della sessione corrente
  var elementoPagamento = null;
  var zonaSessione = null;
  var idSessione = null;
  var turno = 0;              // ignora sessioni arrivate tardi
  var numeroOrdine = null;
  var inPagamento = false;

  /* ====================================================== avvio */

  document.addEventListener('DOMContentLoaded', function () {
    if (!Cart.getCart().length) { $('cassa-vuota').hidden = false; return; }
    $('cassa-corpo').hidden = false;

    $('garanzia-reso').textContent = 'Reso entro ' + C.reso.giorni + ' giorni';
    riempiPaesi();
    riempiDaCliente();
    disegnaArticoli();
    aggiornaPaese(false);
    collegaEventi();

    var chiave = C.pagamenti.chiavePubblica;
    if (!chiave || typeof window.Stripe !== 'function') {
      errore('Il pagamento non si è caricato. Ricarica la pagina oppure scrivici a info@shapeless.shop.');
      $('modulo-attesa').hidden = true;
      return;
    }
    stripe = window.Stripe(chiave, { locale: 'it' });
    numeroOrdine = Cart.nuovoNumeroOrdine();
    nuovaSessione();
  });

  function riempiPaesi() {
    var sel = $('paese');
    PAESI.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p[0]; o.textContent = p[1];
      sel.appendChild(o);
    });
    sel.value = 'IT';
  }

  /* chi ha gia' comprato da questo dispositivo trova i campi pieni */
  function riempiDaCliente() {
    var c = Cart.getCliente();
    if (!c) return;
    ['nome','cognome','email','telefono','indirizzo','indirizzo2','cap','citta','provincia']
      .forEach(function (k) { if (c[k] && $(k)) $(k).value = c[k]; });
    if (c.paese && PAESI.some(function (p) { return p[0] === c.paese; })) $('paese').value = c.paese;
    if (c.ragioneSociale) {
      $('vuoleFattura').checked = true; $('campi-fattura').hidden = false;
      $('ragioneSociale').value = c.ragioneSociale || '';
      $('piva').value = c.piva || ''; $('sdi').value = c.sdi || '';
    }
  }

  function collegaEventi() {
    $('paese').addEventListener('change', function () { aggiornaPaese(true); });
    $('vuoleFattura').addEventListener('change', function () {
      $('campi-fattura').hidden = !this.checked;
    });
    $('riepilogo-barra').addEventListener('click', function () {
      $('cassa-riepilogo').classList.toggle('aperto');
    });
    document.querySelectorAll('#modulo-cassa input').forEach(function (el) {
      el.addEventListener('input', function () { pulisci(el.id); });
    });
    $('modulo-cassa').addEventListener('submit', function (e) {
      e.preventDefault();
      paga();
    });
  }

  /* ====================================================== paese e spedizione */

  function zonaDi(paese) { return C.zonaPerPaese(paese).id; }

  function aggiornaPaese(daCambio) {
    var paese = $('paese').value;
    var it = paese === 'IT';
    $('etichetta-provincia').innerHTML = it ? 'Provincia <span class="obbl">*</span>'
      : 'Regione <span class="facolt">facoltativo</span>';
    $('provincia').maxLength = it ? 2 : 30;
    $('provincia').placeholder = it ? 'CL' : '';

    aggiornaRiepilogoLocale();
    if (daCambio && stripe && zonaDi(paese) !== zonaSessione) nuovaSessione();
  }

  /* ====================================================== riepilogo */

  function disegnaArticoli() {
    var box = $('riepilogo-articoli');
    box.innerHTML = '';
    Cart.getCart().forEach(function (it) {
      var r = document.createElement('div');
      r.className = 'riep-articolo';
      r.innerHTML =
        '<div class="riep-img"><img src="' + Cart.immagineDi(it) + '" alt=""></div>' +
        '<div class="riep-testo"><p class="riep-nome"></p>' +
          (it.colore ? '<p class="riep-colore"><span class="riep-pallino"></span><span></span></p>' : '') +
        '</div>' +
        '<div class="riep-prezzo">' + Cart.formatPrice(it.prezzo * it.qty) + '</div>';
      r.querySelector('.riep-nome').textContent = it.nome + (it.qty > 1 ? ' × ' + it.qty : '');
      if (it.colore) {
        r.querySelector('.riep-pallino').style.background = it.coloreHex || '#000';
        r.querySelector('.riep-colore span:last-child').textContent = it.colore;
      }
      box.appendChild(r);
    });
  }

  /* cifre calcolate qui, mostrate subito; appena la sessione Stripe e'
     pronta vengono sostituite da quelle vere del server */
  function aggiornaRiepilogoLocale() {
    var paese = $('paese').value;
    var t = Cart.calcolaTotali(paese);
    $('riep-subtotale').textContent = Cart.formatPrice(t.subtotale);
    $('riep-spedizione').innerHTML = t.spedizione === 0
      ? '<span class="gratis">Gratuita</span>' : Cart.formatPrice(t.spedizione);
    $('riep-totale').textContent = Cart.formatPrice(t.totale);
    $('barra-totale').textContent = Cart.formatPrice(t.totale);
    $('riep-consegna').textContent = 'entro il ' + Cart.dataConsegna();
    $('riep-consegna-nota').textContent =
      'Prodotto on demand: ' + C.produzione.giorniLavorativi +
      ' giorni lavorativi di produzione, poi ' + (t.zona ? t.zona.giorni : '2-3') +
      ' giorni di corriere.';
  }

  function aggiornaDaSessione(s) {
    if (!s || !s.total) return;
    var sped = s.total.shippingRate;
    $('riep-subtotale').textContent = s.total.subtotal.amount;
    $('riep-spedizione').innerHTML = (sped && sped.minorUnitsAmount > 0)
      ? sped.amount : '<span class="gratis">Gratuita</span>';
    $('riep-totale').textContent = s.total.total.amount;
    $('barra-totale').textContent = s.total.total.amount;
    $('btn-paga-cifra').textContent = s.total.total.amount;
  }

  /* ====================================================== sessione Stripe */

  function nuovaSessione() {
    var mio = ++turno;
    var paese = $('paese').value;
    zonaSessione = zonaDi(paese);
    azioni = null; idSessione = null;
    $('btn-paga').disabled = true;
    $('modulo-attesa').hidden = false;
    errore('');

    if (elementoPagamento) {
      try { elementoPagamento.destroy(); } catch (e) {}
      elementoPagamento = null;
    }
    $('pagamento-stripe').innerHTML = '';

    var carrello = Cart.getCart();
    var segreto = fetch(C.pagamenti.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paese: paese,
        numeroOrdine: numeroOrdine,
        articoli: carrello.map(function (i) {
          return { id: i.id, colore: i.colore, coloreHex: i.coloreHex, qty: i.qty };
        })
      })
    })
    .then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || !d.clientSecret) { console.error('crea-sessione:', d.dettaglio); throw new Error(d.errore || ('risposta ' + r.status)); }
        if (mio === turno) idSessione = d.id;
        return d.clientSecret;
      });
    });

    var sdk = stripe.initCheckoutElementsSdk({
      clientSecret: segreto,
      elementsOptions: {
        fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap' }],
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#6b1f45',
            colorText: '#0a0a0a',
            colorTextSecondary: '#4a4848',
            colorDanger: '#a3242b',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSizeBase: '15px',
            borderRadius: '0px'
          }
        }
      }
    });

    sdk.on('change', function (s) { if (mio === turno) aggiornaDaSessione(s); });

    var el = sdk.createPaymentElement({
      layout: { type: 'accordion', defaultCollapsed: false },
      paymentMethodOrder: ['card', 'apple_pay', 'google_pay', 'paypal', 'klarna', 'scalapay'],
      /* nome, email, telefono e indirizzo li abbiamo gia' nei nostri campi:
         il riquadro Stripe non deve richiederli (li passiamo in confirm) */
      fields: { billingDetails: { name: 'never', email: 'never', phone: 'never', address: 'never' } },
      /* niente "salva i dati con Link": richiedeva di nuovo email e telefono */
      /* Apple Pay e Google Pay accesi (17/09: Angelo ha riacceso Google Pay).
         Ognuno compare solo sui dispositivi che lo supportano. Link spento. */
      wallets: { link: 'never', applePay: 'auto', googlePay: 'auto' }
    });
    elementoPagamento = el;
    el.mount('#pagamento-stripe');
    el.on('ready', function () { if (mio === turno) $('modulo-attesa').hidden = true; });

    sdk.loadActions().then(function (res) {
      if (mio !== turno) return;
      if (res.type !== 'success') throw new Error((res.error && res.error.message) || 'sessione non pronta');
      azioni = res.actions;
      var s = azioni.getSession();
      aggiornaDaSessione(s);
      /* una sola opzione di spedizione: la selezioniamo noi */
      if (s && !s.shipping && s.shippingOptions && s.shippingOptions.length &&
          typeof azioni.updateShippingOption === 'function') {
        return azioni.updateShippingOption(s.shippingOptions[0].id);
      }
    })
    .then(function () { if (mio === turno) $('btn-paga').disabled = false; })
    .catch(function (err) {
      if (mio !== turno) return;
      console.error('cassa:', err);
      $('modulo-attesa').hidden = true;
      errore('Non siamo riusciti ad aprire il pagamento (' + (err && err.message || 'errore') +
             '). Riprova tra un istante oppure scrivici a info@shapeless.shop.', true);
    });
  }

  /* ====================================================== controlli */

  var MSG = {
    nome: 'Scrivi il nome.', cognome: 'Scrivi il cognome.',
    email: 'Controlla l\'email.', telefono: 'Controlla il numero di telefono.',
    indirizzo: 'Scrivi via e numero civico.', cap: 'Controlla il CAP.',
    citta: 'Scrivi la città.', provincia: 'Sigla della provincia, per esempio CL.',
    ragioneSociale: 'Scrivi la ragione sociale.', piva: 'Controlla la partita IVA.',
    sdi: 'Scrivi il codice SDI (7 caratteri) o la PEC.'
  };

  function v(id) { return ($(id).value || '').trim(); }

  function valido(id) {
    var it = $('paese').value === 'IT';
    var x = v(id);
    switch (id) {
      case 'email':     return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x);
      case 'telefono':  return x.replace(/\D/g, '').length >= 8;
      case 'indirizzo': return x.length >= 4 && (!it || /\d/.test(x));
      case 'cap':       return it ? /^\d{5}$/.test(x) : x.length >= 3;
      case 'provincia': return it ? /^[A-Za-z]{2}$/.test(x) : true;
      case 'piva':      return /^(IT)?\d{11}$/i.test(x.replace(/\s/g, '')) || (!it && x.length >= 5);
      case 'sdi':       return !it || /^[A-Za-z0-9]{6,7}$/.test(x) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x);
      default:          return x.length > 0;
    }
  }

  function segna(id) {
    $(id).classList.add('in-errore');
    var p = document.querySelector('.campo-errore[data-per="' + id + '"]');
    if (p) { p.textContent = MSG[id]; p.classList.add('visibile'); }
  }
  function pulisci(id) {
    var el = $(id); if (!el) return;
    el.classList.remove('in-errore');
    var p = document.querySelector('.campo-errore[data-per="' + id + '"]');
    if (p) p.classList.remove('visibile');
  }

  function controllaTutto() {
    var campi = ['nome','cognome','email','telefono','indirizzo','cap','citta','provincia'];
    if ($('vuoleFattura').checked) campi.push('ragioneSociale','piva','sdi');
    var primo = null;
    campi.forEach(function (id) {
      if (valido(id)) pulisci(id);
      else { segna(id); if (!primo) primo = id; }
    });
    if (primo) {
      $(primo).scrollIntoView({ behavior: 'smooth', block: 'center' });
      $(primo).focus({ preventScroll: true });
      return false;
    }
    return true;
  }

  /* Stripe vuole il telefono col prefisso internazionale */
  function telefonoInternazionale() {
    var t = v('telefono').replace(/[^\d+]/g, '');
    if (t.indexOf('00') === 0) t = '+' + t.slice(2);
    if (t.charAt(0) !== '+') {
      var prefissi = { IT: '39', FR: '33', DE: '49', ES: '34', CH: '41', GB: '44', AT: '43',
                       BE: '32', NL: '31', PT: '351', US: '1', CA: '1' };
      var pre = prefissi[$('paese').value];
      if (pre) t = '+' + pre + ($('paese').value === 'IT' ? t : t.replace(/^0/, ''));
    }
    return t;
  }

  /* ====================================================== paga */

  function paga() {
    if (inPagamento) return;
    errore('');
    if (!controllaTutto()) return;
    if (!azioni || !idSessione) { errore('Il pagamento si sta ancora caricando: attendi un istante.'); return; }

    var paese = $('paese').value;
    var nomeCompleto = v('nome') + ' ' + v('cognome');
    var indirizzo = {
      line1: v('indirizzo'),
      line2: v('indirizzo2') || undefined,
      postal_code: v('cap'),
      city: v('citta'),
      state: v('provincia').toUpperCase() || undefined,
      country: paese
    };
    var fattura = $('vuoleFattura').checked;

    /* i dati restano su questo dispositivo, per la prossima volta */
    Cart.saveCliente({
      nome: v('nome'), cognome: v('cognome'), email: v('email'), telefono: v('telefono'),
      indirizzo: v('indirizzo'), indirizzo2: v('indirizzo2'), cap: v('cap'), citta: v('citta'),
      provincia: v('provincia').toUpperCase(), paese: paese,
      ragioneSociale: fattura ? v('ragioneSociale') : '', piva: fattura ? v('piva') : '',
      sdi: fattura ? v('sdi') : ''
    });
    Cart.saveOrdine({
      numero: numeroOrdine, data: new Date().toISOString(), articoli: Cart.getCart(),
      totali: Cart.calcolaTotali(paese), consegna: Cart.dataConsegna(),
      sessione: idSessione, stato: 'in-pagamento'
    });

    occupato(true);

    var base = C.pagamenti.endpoint.replace(/\/crea-sessione$/, '');
    fetch(base + '/dettagli-ordine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: idSessione, note: v('note'), fattura: fattura,
        ragioneSociale: v('ragioneSociale'), piva: v('piva'), sdi: v('sdi')
      })
    })
    .catch(function (e) { console.warn('dettagli-ordine non salvati:', e); })
    .then(function () {
      return azioni.confirm({
        email: v('email'),
        phoneNumber: telefonoInternazionale(),
        shippingAddress: { name: nomeCompleto, address: indirizzo },
        billingAddress: { name: nomeCompleto, address: indirizzo }
      });
    })
    .then(function (res) {
      /* se va bene Stripe porta alla pagina di grazie: qui si arriva solo
         quando c'e' un problema da mostrare */
      if (res && res.type === 'error') {
        occupato(false);
        errore((res.error && res.error.message) || 'Pagamento non riuscito. Controlla i dati e riprova.');
      }
    })
    .catch(function (err) {
      console.error('conferma:', err);
      occupato(false);
      errore('Pagamento non riuscito (' + (err && err.message || 'errore') + '). Riprova.', true);
    });
  }

  function occupato(si) {
    inPagamento = si;
    $('btn-paga').disabled = si;
    $('btn-paga-testo').innerHTML = si ? '<span class="attesa"></span>' : 'Paga';
    $('btn-paga-cifra').style.display = si ? 'none' : '';
  }

  function errore(testo, conRiprova) {
    var p = $('cassa-esito');
    if (!testo) { p.hidden = true; return; }
    p.hidden = false;
    p.textContent = testo;
    if (conRiprova) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'link-sobrio'; b.style.marginLeft = '8px';
      b.textContent = 'Riprova';
      b.addEventListener('click', nuovaSessione);
      p.appendChild(b);
    }
  }

})(window, document);
