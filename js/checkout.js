/* ===========================================================================
   SHAPELESS — Cassa
   ---------------------------------------------------------------------------
   Una pagina sola, quattro blocchi, nessun account. Il cliente vede subito
   quanto lavoro lo aspetta, e finisce in meno di due minuti.

   Finche' ShapelessConfig.pagamenti.endpoint e' null il modulo lavora in
   MODALITA' DIMOSTRATIVA: raccoglie l'ordine completo, lo salva e porta alla
   pagina di conferma senza incassare. Appena metti l'indirizzo del backend,
   lo stesso identico modulo apre la pagina di pagamento Stripe.
   =========================================================================== */

(function (window, document) {

  var C = window.ShapelessConfig;
  var Cart = window.ShapelessCart;

  /* Paesi serviti. L'Italia in cima perche' e' il 90% degli ordini: ogni
     scorrimento in meno e' un abbandono in meno. */
  var PAESI = [
    ['IT', 'Italia'],
    ['--', '──────────'],
    ['AT','Austria'], ['BE','Belgio'], ['BG','Bulgaria'], ['CY','Cipro'],
    ['HR','Croazia'], ['DK','Danimarca'], ['EE','Estonia'], ['FI','Finlandia'],
    ['FR','Francia'], ['DE','Germania'], ['GR','Grecia'], ['IE','Irlanda'],
    ['LV','Lettonia'], ['LT','Lituania'], ['LU','Lussemburgo'], ['MT','Malta'],
    ['NL','Paesi Bassi'], ['PL','Polonia'], ['PT','Portogallo'], ['CZ','Repubblica Ceca'],
    ['RO','Romania'], ['SK','Slovacchia'], ['SI','Slovenia'], ['ES','Spagna'],
    ['SE','Svezia'], ['HU','Ungheria'],
    ['--', '──────────'],
    ['CH','Svizzera'], ['GB','Regno Unito'], ['NO','Norvegia'],
    ['US','Stati Uniti'], ['CA','Canada'], ['AU','Australia'], ['JP','Giappone']
  ];

  var $  = function (id) { return document.getElementById(id); };
  var qs = function (s, r) { return (r || document).querySelector(s); };

  /* ====================================================== avvio */

  document.addEventListener('DOMContentLoaded', function () {
    var carrello = Cart.getCart();

    if (!carrello.length) {
      $('cassa-vuota').hidden = false;
      return;
    }
    $('cassa-corpo').hidden = false;

    riempiPaesi();
    riempiLoghi();
    mostraGaranzie();
    riconosciCliente();
    collegaEventi();
    aggiornaRiepilogo();
  });

  /* ====================================================== popolamento */

  function riempiPaesi() {
    var sel = $('paese');
    PAESI.forEach(function (p) {
      var o = document.createElement('option');
      if (p[0] === '--') { o.disabled = true; o.textContent = p[1]; }
      else { o.value = p[0]; o.textContent = p[1]; }
      sel.appendChild(o);
    });
    sel.value = 'IT';
  }

  /* ------------------------------------------------------ loghi e portafogli

     I file dei marchi stanno in images/pagamenti/<nome>.svg. Finche' non ci
     sono, al loro posto compare una sigla pulita: la pagina resta finita e i
     loghi veri si aggiungono senza toccare il codice.                       */

  var ETICHETTE = {
    visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', paypal: 'PayPal',
    klarna: 'Klarna', applepay: 'Apple Pay', googlepay: 'Google Pay',
    satispay: 'Satispay'
  };

  function sigla(nome) {
    var t = document.createElement('span');
    t.className = 'logo-testo';
    t.textContent = ETICHETTE[nome] || nome;
    return t;
  }

  /* metto subito la sigla (cosi' l'ordine e' giusto e non si vede mai
     un'immagine rotta) e la sostituisco col logo solo se il file esiste */
  function logo(box, nome) {
    var segno = sigla(nome);
    box.appendChild(segno);
    var img = new Image();
    img.alt = ETICHETTE[nome] || nome;
    img.onload = function () { segno.replaceWith(img); };
    img.src = 'images/pagamenti/' + nome + '.svg';
  }

  /* Il portafoglio del telefono: si mostra solo dove funziona davvero.
     Su Stripe compare comunque, ma sceglierlo qui evita un passaggio. */
  function portafoglio() {
    try {
      if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
        return { nome: 'Apple Pay', file: 'applepay' };
      }
    } catch (e) { /* Safari lo vieta in certi contesti: si prosegue */ }
    var ua = navigator.userAgent;
    if (/Chrome|Chromium|Edg\//.test(ua) && !/OPR\//.test(ua)) {
      return { nome: 'Google Pay', file: 'googlepay' };
    }
    return null;
  }

  function riempiLoghi() {
    document.querySelectorAll('[data-loghi]').forEach(function (box) {
      box.dataset.loghi.split(',').forEach(function (n) { logo(box, n.trim()); });
    });

    var w = portafoglio();
    if (w) {
      $('metodo-wallet').hidden = false;
      $('nome-wallet').textContent = w.nome;
      logo($('loghi-wallet'), w.file);
    }

  }

  function mostraGaranzie() {
    $('garanzia-reso').textContent = 'Reso entro ' + C.reso.giorni + ' giorni';
  }

  /* ====================================================== cliente di ritorno */

  function riconosciCliente() {
    var c = Cart.getCliente();
    if (!c || !c.email) return;

    $('cassa-ritorno').hidden = false;
    $('ritorno-nome').textContent = 'Bentornato' + (c.nome ? ', ' + c.nome : '') + '.';
    $('ritorno-dettaglio').textContent =
      ' Abbiamo i tuoi dati: ' + c.email +
      (c.citta ? ' — ' + (c.indirizzo || '') + ', ' + c.citta : '') + '.';

    $('usa-dati-salvati').addEventListener('click', function () {
      riempiCon(c);
      $('cassa-ritorno').hidden = true;
      Cart.avviso('Dati inseriti. Controlla che sia tutto giusto e paga.');
      var e = $('accettoTermini');
      if (e) e.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    $('scarta-dati-salvati').addEventListener('click', function () {
      Cart.dimenticaCliente();
      $('cassa-ritorno').hidden = true;
    });
  }

  function riempiCon(c) {
    ['email','telefono','nome','cognome','indirizzo','indirizzo2','cap','citta',
     'provincia','ragioneSociale','piva','sdi'].forEach(function (k) {
      var el = $(k);
      if (el && c[k]) el.value = c[k];
    });
    if (c.paese) $('paese').value = c.paese;
    if (c.piva) { $('vuoleFattura').checked = true; mostraFattura(); }
    aggiornaRiepilogo();
  }

  /* ====================================================== eventi */

  function collegaEventi() {

    /* la fattura, per chi la vuole */
    $('vuoleFattura').addEventListener('change', mostraFattura);

    /* metodo di pagamento */
    document.querySelectorAll('input[name="metodo"]').forEach(function (r) {
      r.addEventListener('change', function () {
        document.querySelectorAll('#metodi .metodo').forEach(function (l) {
          l.classList.toggle('attiva', qs('input', l).checked);
        });
      });
    });

    /* il paese cambia spedizione, provincia e IVA */
    $('paese').addEventListener('change', function () {
      var it = this.value === 'IT';
      $('gruppo-provincia').style.display = it ? '' : 'none';
      $('provincia').required = it;
      aggiornaRiepilogo();
    });

    /* validazione morbida: si controlla quando si esce dal campo, mai mentre
       si scrive — segnalare un errore su un campo mezzo compilato irrita */
    document.querySelectorAll('#modulo-cassa input, #modulo-cassa select')
      .forEach(function (el) {
        el.addEventListener('blur', function () { validaCampo(el); });
        el.addEventListener('input', function () { pulisciErrore(el); });
      });

    /* riepilogo a scomparsa su telefono */
    $('riepilogo-barra').addEventListener('click', function () {
      $('cassa-riepilogo').classList.toggle('aperto');
    });

    $('modulo-cassa').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validaTutto()) return;
      inviaOrdine();
    });
  }

  function mostraFattura() {
    $('campi-fattura').hidden = !$('vuoleFattura').checked;
  }

  function metodoScelto() {
    var r = qs('input[name="metodo"]:checked');
    return r ? r.value : 'card';
  }

  /* ====================================================== riepilogo */

  function aggiornaRiepilogo() {
    var carrello = Cart.getCart();
    var paese = $('paese') ? $('paese').value : 'IT';
    var t = Cart.calcolaTotali(paese);

    /* articoli */
    var box = $('riepilogo-articoli');
    box.innerHTML = '';
    carrello.forEach(function (it) {
      var r = document.createElement('div');
      r.className = 'riep-articolo';
      r.innerHTML =
        '<div class="riep-img"><img src="' + Cart.immagineDi(it) + '" alt="' + it.nome + '">' +
          '<span class="riep-qty">' + it.qty + '</span></div>' +
        '<div class="riep-testo">' +
          '<p class="riep-nome">' + it.nome + '</p>' +
          (it.colore
            ? '<p class="riep-colore"><span class="riep-pallino" style="background:' +
              (it.coloreHex || '#000') + '"></span>' + it.colore + '</p>'
            : '') +
        '</div>' +
        '<div class="riep-prezzo">' + Cart.formatPrice(it.prezzo * it.qty) + '</div>';
      box.appendChild(r);
    });

    /* conti */
    $('riep-subtotale').textContent = Cart.formatPrice(t.subtotale);

    if (t.spedizione === 0) {
      $('riep-spedizione').innerHTML = '<span class="gratis">Gratuita</span>';
    } else {
      $('riep-spedizione').textContent = Cart.formatPrice(t.spedizione);
    }

    if (C.iva.regime === 'forfettario') {
      $('riga-iva').hidden = true;
      $('conto-nota-fiscale').hidden = false;
      $('conto-nota-fiscale').textContent = C.iva.dicituraForfettario;
    } else {
      $('riga-iva').hidden = false;
      $('riep-iva-etichetta').textContent =
        (C.iva.regime === 'inclusa' ? 'di cui IVA ' : 'IVA ') +
        Math.round(C.iva.aliquota * 100) + '%';
      $('riep-iva').textContent = Cart.formatPrice(t.iva);
      $('conto-nota-fiscale').hidden = true;
    }

    $('riep-totale').textContent = Cart.formatPrice(t.totale);
    var rata = $('rata');
    if (rata) rata.textContent = (t.totale / 3).toFixed(2).replace('.', ',');
    $('barra-totale').textContent = Cart.formatPrice(t.totale);
    $('btn-paga-cifra').textContent = '— ' + Cart.formatPrice(t.totale);

    /* consegna */
    $('riep-consegna').textContent = 'entro il ' + Cart.dataConsegna();
    $('riep-consegna-nota').textContent =
      'Ogni pezzo è stampato su ordinazione: ' + C.produzione.giorniLavorativi +
      ' giorni lavorativi di produzione, poi ' +
      (t.zona ? t.zona.giorni : '2-3') + ' giorni di corriere' +
      (t.zona ? ' per ' + t.zona.nome.toLowerCase() : '') + '.';
  }

  document.addEventListener('carrello:cambiato', aggiornaRiepilogo);

  /* ====================================================== validazione */

  var MSG = {
    email:        'Serve un indirizzo email valido: ci mandiamo la conferma.',
    telefono:     'Serve un numero: il corriere ti avvisa prima di consegnare.',
    nome:         'Scrivi il tuo nome.',
    cognome:      'Scrivi il tuo cognome.',
    indirizzo:    'Scrivi via e numero civico.',
    cap:          'CAP non valido.',
    citta:        'Scrivi la città.',
    provincia:    'Due lettere, per esempio CL.',
    paese:        'Scegli il paese.',
    ragioneSociale:'Scrivi la ragione sociale dell\'azienda.',
    piva:         'La partita IVA italiana ha 11 cifre.',
    sdi:          'Scrivi il codice SDI (7 caratteri), una PEC, oppure 0000000.',
    accettoTermini:'Per proseguire devi accettare i termini di vendita.'
  };

  function valore(id) { var e = $(id); return e ? e.value.trim() : ''; }

  function campoValido(id) {
    var v = valore(id);
    var italia = $('paese').value === 'IT';

    switch (id) {
      case 'email':     return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      case 'telefono':  return v.replace(/[^\d]/g, '').length >= 8;
      case 'cap':       return italia ? /^\d{5}$/.test(v) : v.length >= 3;
      case 'provincia': return italia ? /^[A-Za-z]{2}$/.test(v) : true;
      case 'piva':      return /^(IT)?\d{11}$/i.test(v.replace(/\s/g, ''));
      case 'sdi':       return /^[A-Za-z0-9]{6,7}$/.test(v) ||
                               /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      case 'accettoTermini': return $('accettoTermini').checked;
      default:          return v.length > 0;
    }
  }

  /* Quali campi sono obbligatori dipende da privato/azienda e dal paese */
  function campiRichiesti() {
    var lista = ['email','telefono','nome','cognome','paese','indirizzo','cap','citta'];
    if ($('paese').value === 'IT') lista.push('provincia');

    if ($('vuoleFattura').checked) {
      lista.push('ragioneSociale', 'piva');
      if ($('paese').value === 'IT') lista.push('sdi');
    }
    lista.push('accettoTermini');
    return lista;
  }

  function segnalaErrore(id) {
    var el = $(id);
    if (el) el.classList.add('in-errore');
    var p = qs('.campo-errore[data-per="' + id + '"]');
    if (p) { p.textContent = MSG[id] || 'Campo obbligatorio.'; p.classList.add('visibile'); }
  }

  function pulisciErrore(el) {
    el.classList.remove('in-errore');
    var p = qs('.campo-errore[data-per="' + el.id + '"]');
    if (p) p.classList.remove('visibile');
    // appena resta un solo campo rosso, il messaggio generale non serve piu'
    if (!document.querySelector('.campo-errore.visibile')) esito('', null);
  }

  function validaCampo(el) {
    if (campiRichiesti().indexOf(el.id) === -1) return true;
    if (campoValido(el.id)) { pulisciErrore(el); return true; }
    if (el.type !== 'checkbox' && !el.value.trim()) return true;  // vuoto: aspetta l'invio
    segnalaErrore(el.id);
    return false;
  }

  function validaTutto() {
    var primoErrore = null;
    campiRichiesti().forEach(function (id) {
      if (campoValido(id)) { var e = $(id); if (e) pulisciErrore(e); }
      else { segnalaErrore(id); if (!primoErrore) primoErrore = id; }
    });

    if (primoErrore) {
      var el = $(primoErrore);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (el.focus) el.focus({ preventScroll: true });
      esito('Manca ancora qualcosa: guarda i campi segnati in rosso.', 'errore');
      return false;
    }
    esito('', null);
    return true;
  }

  /* ====================================================== invio */

  function raccogliDati() {
    var fattura = $('vuoleFattura').checked;
    var d = {
      email:      valore('email'),
      telefono:   valore('telefono'),
      newsletter: $('newsletter').checked,
      nome:       valore('nome'),
      cognome:    valore('cognome'),
      paese:      $('paese').value,
      indirizzo:  valore('indirizzo'),
      indirizzo2: valore('indirizzo2'),
      cap:        valore('cap'),
      citta:      valore('citta'),
      provincia:  valore('provincia').toUpperCase(),
      note:       valore('note'),
      metodo:     metodoScelto(),
      tipoCliente: fattura ? 'azienda' : 'privato'
    };

    if (fattura) {
      d.ragioneSociale = valore('ragioneSociale');
      d.piva           = valore('piva').toUpperCase().replace(/\s/g, '');
      d.sdi            = valore('sdi').toUpperCase();
    }
    return d;
  }

  function inviaOrdine() {
    var btn = $('btn-paga');
    var cliente = raccogliDati();
    var carrello = Cart.getCart();
    var totali = Cart.calcolaTotali(cliente.paese);

    if ($('salvaDati') && $('salvaDati').checked) Cart.saveCliente(cliente);
    else Cart.dimenticaCliente();

    var ordine = {
      numero:    Cart.nuovoNumeroOrdine(),
      data:      new Date().toISOString(),
      articoli:  carrello,
      cliente:   cliente,
      totali:    totali,
      consegna:  Cart.dataConsegna(),
      metodo:    cliente.metodo
    };

    /* ---- MODALITA' DIMOSTRATIVA: nessun backend collegato ---- */
    if (!C.pagamenti.endpoint) {
      ordine.stato = 'dimostrativo';
      Cart.saveOrdine(ordine);
      Cart.clearCart();
      window.location.href = 'ordine-ricevuto.html';
      return;
    }

    /* ---- PAGAMENTO VERO: la sessione la crea il backend ---- */
    btn.disabled = true;
    $('btn-paga-testo').textContent = 'Apro il pagamento…';
    esito('', null);

    fetch(C.pagamenti.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articoli: carrello.map(function (i) {
          return { id: i.id, colore: i.colore, coloreHex: i.coloreHex, qty: i.qty };
        }),
        cliente: cliente,
        metodo: cliente.metodo,
        numeroOrdine: ordine.numero
      })
    })
    .then(function (r) {
      if (!r.ok) throw new Error('risposta ' + r.status);
      return r.json();
    })
    .then(function (dati) {
      if (!dati.url) throw new Error('manca l\'indirizzo di pagamento');
      ordine.stato = 'in-pagamento';
      ordine.sessione = dati.id || null;
      Cart.saveOrdine(ordine);
      window.location.href = dati.url;
    })
    .catch(function (err) {
      btn.disabled = false;
      $('btn-paga-testo').textContent = 'Paga in modo sicuro';
      esito('Non siamo riusciti ad aprire il pagamento (' + err.message + '). ' +
            'Riprova tra un istante, oppure scrivici a info@shapeless.shop e ' +
            'completiamo l\'ordine insieme.', 'errore');
    });
  }

  function esito(testo, tipo) {
    var p = $('cassa-esito');
    if (!testo) { p.hidden = true; return; }
    p.hidden = false;
    p.textContent = testo;
    p.className = 'cassa-esito ' + (tipo === 'errore' ? 'esito-errore' : 'esito-nota');
  }

})(window, document);
