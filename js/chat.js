/* ===========================================================================
   SHAPELESS — Chatta con Angelo
   ---------------------------------------------------------------------------
   Pallino piccolo in basso a destra. Aprendolo: "Chatta con Angelo".
   - Risposte immediate alle domande frequenti (scritte da noi, niente AI:
     non inventa tempi o prezzi). Prezzi e spedizione li legge da
     shop-config.js, cosi' restano sempre giusti.
   - Per tutto il resto "Scrivi ad Angelo" apre WhatsApp col messaggio gia'
     scritto (e il vaso che il cliente stava guardando).

   QUANDO COMPARE (per non dare fastidio)
   - Mai subito: dopo un po' che il cliente guarda la pagina (prima sulle
     schede prodotto e nel carrello, dove nascono le domande) oppure quando
     ha fatto scorrere quasi meta' pagina.
   - Una volta comparso, nelle pagine successive della stessa visita c'e' gia'.
   - Il fumetto "Hai una domanda?" esce da solo al massimo una volta ogni
     3 giorni; se il cliente lo chiude, non torna per 7 giorni.
   - Nella cassa (checkout.html) non viene caricato: chi paga non va distratto.
   - Su telefono si alza sopra la barra "Aggiungi al carrello".

   Cambiare numero WhatsApp o testi: tutto qui sotto, in IMPOSTAZIONI e RISPOSTE.
   =========================================================================== */

(function (window, document) {
  'use strict';

  /* ------------------------------------------------------------ IMPOSTAZIONI */
  var WHATSAPP = '393274465586';            // solo cifre, con prefisso 39
  var EMAIL = 'info@shapeless.shop';
  var FOTO = 'images/chat-angelo.jpg';

  var ATTESA_PRODOTTO = 15;                 // secondi prima che compaia
  var ATTESA_CARRELLO = 10;
  var ATTESA_ALTRE = 25;
  var SCORRIMENTO = 0.45;                   // oppure dopo meta' pagina circa
  var FUMETTO_OGNI_GIORNI = 3;
  var FUMETTO_CHIUSO_GIORNI = 7;

  if (window.__shpChat) return;
  window.__shpChat = true;
  if (/checkout\.html$/.test(location.pathname)) return;

  /* ------------------------------------------------------------- utilita' */
  function leggi(k, archivio) {
    try { return (archivio || localStorage).getItem(k); } catch (e) { return null; }
  }
  function scrivi(k, v, archivio) {
    try { (archivio || localStorage).setItem(k, v); } catch (e) {}
  }
  function giorniDa(k) {
    var t = parseInt(leggi(k), 10);
    return t ? (Date.now() - t) / 86400000 : Infinity;
  }
  function normalizza(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function C() { return window.ShapelessConfig || null; }
  function euro(n) {
    if (window.ShapelessCart && window.ShapelessCart.formatPrice) return window.ShapelessCart.formatPrice(n);
    return '€ ' + Number(n).toFixed(2).replace('.', ',');
  }

  /* il vaso che il cliente sta guardando, se e' su una scheda prodotto */
  function prodottoCorrente() {
    var m = location.pathname.match(/prodotto-([a-z0-9]+)\.html$/);
    var c = C();
    if (!m || !c || !c.prodotti || !c.prodotti[m[1]]) return null;
    return c.prodotti[m[1]];
  }

  function linkWhatsApp(testoCliente) {
    var p = prodottoCorrente();
    var msg = 'Ciao Angelo, ti scrivo dal sito Shapeless';
    if (p) msg += ' (sto guardando ' + p.nome + ')';
    else if (/carrello\.html$/.test(location.pathname)) msg += ' (ho dei vasi nel carrello)';
    msg += testoCliente ? ':\n' + testoCliente : '.';
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(msg);
  }

  /* ------------------------------------------------------------- RISPOSTE */
  var MISURE = {
    blade: '28x28x37h cm', vulcano: '22x22x26h cm', bombato: '25x25x19h cm'
  };

  function testoSpedizione() {
    var c = C();
    var righe = [];
    if (c && c.spedizione && c.spedizione.zone) {
      c.spedizione.zone.forEach(function (z) {
        var costo = z.costo === 0 ? '<b>gratuita</b>'
          : euro(z.costo) + (z.sogliaGratis ? ' (gratuita sopra ' + euro(z.sogliaGratis) + ')' : '');
        righe.push(z.nome + ': ' + costo + ', ' + z.giorni + ' giorni lavorativi di viaggio');
      });
    }
    return (righe.length ? righe.join('<br>') : 'In Italia la spedizione è <b>gratuita</b>.') +
      '<br><br>Il costo esatto lo vedi in cassa prima di pagare. Fuori dall\'Unione Europea eventuali dazi sono a carico di chi riceve.';
  }

  function testoConsegna() {
    var c = C();
    var giorni = (c && c.produzione && c.produzione.giorniLavorativi) || 7;
    var data = '';
    try { data = window.ShapelessCart.dataConsegna(); } catch (e) {}
    return 'Ogni vaso lo produciamo <b>on demand</b>, dopo il tuo ordine e nel colore che scegli: servono <b>' +
      giorni + ' giorni lavorativi</b>, poi parte con corriere tracciato.' +
      (data ? '<br><br>Se ordini oggi, in Italia lo ricevi <b>entro il ' + esc(data) + '</b>.' : '') +
      '<br><br>Ti serve per una data precisa, magari un regalo? Scrivimi e vediamo insieme.';
  }

  function testoModelli() {
    var c = C();
    var righe = [];
    ['blade', 'vulcano', 'bombato'].forEach(function (id) {
      var p = c && c.prodotti && c.prodotti[id];
      if (!p) return;
      righe.push('<a href="' + p.pagina + '">' + esc(p.nome) + '</a> — ' + MISURE[id] + ' — <b style="white-space:nowrap">' + euro(p.prezzo) + '</b>');
    });
    return righe.join('<br>') +
      '<br><br>Prezzi IVA inclusa. In ogni vaso c\'è anche l\'<b>Hidden Nest</b>, il vetro su misura per l\'acqua.';
  }

  var ARGOMENTI = [
    { id: 'consegna', etichetta: 'Quando arriva?', risposta: testoConsegna, wa: true,
      parole: ['quando arriva', 'arriva', 'tempi', 'tempo', 'quanto ci vuole', 'giorni', 'consegna', 'consegnate', 'natale', 'regalo', 'entro', 'urgente', 'fretta', 'produzione', 'pronto'] },
    { id: 'spedizione', etichetta: 'Spedizione', risposta: testoSpedizione,
      parole: ['spedizione', 'spedite', 'spedisci', 'spedire', 'estero', 'europa', 'germania', 'francia', 'svizzera', 'spagna', 'inghilterra', 'america', 'mondo', 'corriere', 'gratis', 'gratuita', 'dazi', 'costo spedizione'] },
    { id: 'rate', etichetta: 'Pagare a rate', risposta: function () {
        return 'Sì. In cassa puoi pagare con <b>carta, Apple Pay, Google Pay, PayPal</b> (anche in 3 rate), <b>Klarna</b> o <b>Scalapay</b>.' +
          '<br><br>Il pagamento passa da Stripe: i dati della carta non arrivano mai a noi.';
      },
      parole: ['rate', 'rata', 'klarna', 'scalapay', 'paypal', 'pagare', 'pagamento', 'pagamenti', 'carta', 'apple pay', 'google pay', 'bonifico', 'contrassegno', 'sicuro'] },
    { id: 'modelli', etichetta: 'Misure e prezzi', risposta: testoModelli,
      parole: ['misure', 'misura', 'dimensioni', 'dimensione', 'alto', 'alta', 'altezza', 'grande', 'piccolo', 'cm', 'larghezza', 'diametro', 'prezzo', 'prezzi', 'costa', 'costano', 'quanto viene', 'sconto'] },
    { id: 'colori', etichetta: 'Colori', wa: true, risposta: function () {
        return 'Ogni vaso è disponibile in tanti colori: sulla sua pagina li provi uno per uno, anche sul <b>modello 3D</b> che puoi girare con il dito.' +
          '<br><br>Non sai quale scegliere? Mandami una foto del tuo spazio su WhatsApp e ti consiglio io.';
      },
      parole: ['colore', 'colori', 'tinta', 'rosso', 'verde', 'nero', 'bianco', 'grigio', 'viola', 'giallo', 'rosa', 'blu', 'antracite', 'abbinare', 'abbinamento', 'consiglio', 'consigli'] },
    { id: 'acqua', etichetta: 'Fiori e acqua', risposta: function () {
        return 'Sì: in ogni vaso c\'è l\'<b>Hidden Nest</b>, un vetro su misura (incluso) che contiene l\'acqua per i fiori freschi e protegge il vaso.' +
          '<br><br>Il PLA è impermeabile e non danneggia le piante. Meglio tenerlo in casa, lontano dal sole diretto e prolungato.';
      },
      parole: ['acqua', 'fiori', 'fiore', 'piante', 'pianta', 'terra', 'vetro', 'hidden nest', 'nest', 'impermeabile', 'esterno', 'fuori', 'giardino', 'balcone', 'terrazzo'] },
    { id: 'cura', etichetta: 'Materiale e cura', risposta: function () {
        return 'È <b>PLA</b>, un materiale di origine vegetale ricavato da mais o canna da zucchero: leggero, resistente, impermeabile e riciclabile.' +
          '<br><br>Per pulirlo basta un panno asciutto e morbido, o un pennello per la polvere tra le nervature. Evita sole diretto prolungato e fonti di calore: col tempo possono scolorirlo.';
      },
      parole: ['materiale', 'pla', 'plastica', 'mais', 'resistente', 'fragile', 'rompe', 'stampa 3d', 'stampato', 'ecologico', 'sostenibile', 'pulire', 'pulizia', 'sole', 'manutenzione', 'polvere', 'calore', 'scolora'] },
    { id: 'resi', etichetta: 'Resi', risposta: function () {
        return 'Hai <b>14 giorni</b> dalla consegna per ripensarci, senza dover spiegare il motivo: scrivi a <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> con il numero d\'ordine. Ti rimborsiamo quanto hai pagato; la rispedizione è a carico tuo.' +
          '<br><br>Se il pacco arriva danneggiato, accettalo con riserva e scrivici entro 8 giorni con qualche foto.' +
          '<br><br>Tutti i dettagli nei <a href="termini-di-vendita.html">Termini di vendita</a>.';
      },
      parole: ['reso', 'resi', 'restituire', 'restituzione', 'rimborso', 'rimborsare', 'recesso', 'annullare', 'annullo', 'rotto', 'danneggiato', 'difetto', 'garanzia', 'non mi piace'] },
    { id: 'ordine', etichetta: 'Ho già ordinato', wa: true, risposta: function () {
        return 'Scrivimi su WhatsApp con il <b>numero d\'ordine</b> (inizia con SHP-): lo trovi nell\'email di conferma. Ti rispondo io, di persona.';
      },
      parole: ['ho ordinato', 'mio ordine', 'ordine', 'stato ordine', 'tracking', 'tracciamento', 'traccia', 'numero ordine', 'dove si trova', 'fattura', 'modificare ordine', 'cambiare indirizzo'] },
    { id: 'progetti', etichetta: 'Negozi e progetti', wa: true, risposta: function () {
        return 'Lavoriamo con <b>negozi, architetti, hotel e ristoranti</b>, anche con colori, quantità o versioni su misura.' +
          '<br><br>Guarda <a href="rivenditori.html">Rivenditori</a> e <a href="hospitality.html">Hospitality &amp; Architettura</a>, oppure scrivimi direttamente cosa hai in mente.';
      },
      parole: ['rivenditore', 'rivenditori', 'negozio', 'ingrosso', 'b2b', 'architetto', 'architettura', 'hotel', 'ristorante', 'progetto', 'collaborazione', 'collaborare', 'quantita', 'personalizzato', 'personalizzare', 'personalizzazione', 'su misura', 'logo', 'aziendale', 'regali aziendali'] }
  ];

  var PICCOLE = [
    { parole: ['grazie', 'gentilissimo', 'perfetto', 'ok grazie'], risposta: 'Figurati! Se ti serve altro sono qui.' },
    { parole: ['ciao', 'buongiorno', 'buonasera', 'salve', 'hey'], risposta: 'Ciao! Scegli una domanda qui sotto oppure scrivimi pure.' }
  ];

  function trovaArgomento(testo) {
    var t = ' ' + normalizza(testo) + ' ';
    var migliore = null, punti = 0;
    ARGOMENTI.forEach(function (a) {
      var p = 0;
      a.parole.forEach(function (w) {
        var n = normalizza(w);
        if (t.indexOf(' ' + n + ' ') >= 0) p += n.indexOf(' ') > 0 ? 3 : 2;
        else if (n.length >= 5 && t.indexOf(' ' + n) >= 0) p += 1;   // radice: "spedizioni", "colorato"
      });
      if (p > punti) { punti = p; migliore = a; }
    });
    if (!migliore && /\b(blade|vulcano|bombato)\b/.test(t)) {
      migliore = ARGOMENTI.filter(function (a) { return a.id === 'modelli'; })[0];
    }
    return migliore;
  }

  /* ------------------------------------------------------------------ STILE */
  var CSS = '' +
    '.shp-chat-btn{position:fixed;right:20px;bottom:22px;z-index:4500;width:54px;height:54px;border-radius:50%;border:0;padding:0;cursor:pointer;' +
      'background:#6b1f45;color:#fff;box-shadow:0 8px 26px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;' +
      'opacity:0;transform:translateY(14px) scale(.85);pointer-events:none;transition:opacity .35s ease,transform .35s ease,bottom .28s ease,background .2s}' +
    '.shp-chat-btn.si{opacity:1;transform:none;pointer-events:auto}' +
    '.shp-chat-btn:hover{background:#8a3060}' +
    '.shp-chat-btn:focus-visible{outline:2px solid #6b1f45;outline-offset:3px}' +
    '.shp-chat-btn svg{width:24px;height:24px}' +
    '.shp-chat-btn .shp-chat-punto{position:absolute;top:3px;right:3px;width:11px;height:11px;border-radius:50%;background:#2fb86b;border:2px solid #f5f5f3}' +
    '.shp-chat-fumetto{position:fixed;right:20px;bottom:88px;z-index:4500;max-width:250px;background:#fff;color:#0a0a0a;border-radius:14px 14px 4px 14px;' +
      'box-shadow:0 10px 30px rgba(0,0,0,.14);padding:12px 34px 12px 14px;font:400 13.5px/1.45 Inter,system-ui,sans-serif;cursor:pointer;' +
      'opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .3s ease,transform .3s ease,bottom .28s ease}' +
    '.shp-chat-fumetto.si{opacity:1;transform:none;pointer-events:auto}' +
    '.shp-chat-fumetto b{font-weight:600}' +
    '.shp-chat-fumetto button{position:absolute;top:6px;right:6px;width:24px;height:24px;border:0;background:none;color:#4a4848;font-size:17px;line-height:1;cursor:pointer;border-radius:50%}' +
    '.shp-chat-fumetto button:hover{background:#ececea}' +
    '.shp-chat-pannello{position:fixed;right:20px;bottom:22px;z-index:5000;width:370px;height:min(600px,calc(100vh - 44px));background:#f5f5f3;border-radius:16px;' +
      'box-shadow:0 18px 60px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,sans-serif;color:#0a0a0a;' +
      'opacity:0;transform:translateY(16px);pointer-events:none;visibility:hidden;transition:opacity .25s ease,transform .25s ease,visibility 0s linear .25s}' +
    '.shp-chat-pannello.si{opacity:1;transform:none;pointer-events:auto;visibility:visible;transition:opacity .25s ease,transform .25s ease}' +
    '.shp-chat-testa{display:flex;align-items:center;gap:12px;padding:14px 14px 14px 16px;background:#6b1f45;color:#fff}' +
    '.shp-chat-foto{position:relative;flex:none}' +
    '.shp-chat-foto img{width:42px;height:42px;border-radius:50%;object-fit:cover;display:block;border:2px solid rgba(255,255,255,.35)}' +
    '.shp-chat-foto i{position:absolute;right:0;bottom:1px;width:10px;height:10px;border-radius:50%;background:#2fb86b;border:2px solid #6b1f45}' +
    '.shp-chat-titolo{flex:1;min-width:0}' +
    '.shp-chat-titolo strong{display:block;font-size:15px;font-weight:600;letter-spacing:.01em}' +
    '.shp-chat-titolo span{display:block;font-size:12px;opacity:.82;margin-top:1px}' +
    '.shp-chat-chiudi{flex:none;width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:20px;line-height:1;cursor:pointer}' +
    '.shp-chat-chiudi:hover{background:rgba(255,255,255,.24)}' +
    '.shp-chat-corpo{flex:1;overflow-y:auto;padding:16px 14px 8px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}' +
    '.shp-msg{max-width:86%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.5;word-wrap:break-word;animation:shpEntra .25s ease}' +
    '.shp-msg a{color:#6b1f45;text-decoration:underline}' +
    '.shp-msg b{font-weight:600}' +
    '.shp-msg.angelo{align-self:flex-start;background:#fff;border-bottom-left-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.05)}' +
    '.shp-msg.cliente{align-self:flex-end;background:#6b1f45;color:#fff;border-bottom-right-radius:4px}' +
    '.shp-msg.scrive{color:#4a4848;letter-spacing:.2em}' +
    '.shp-wa{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;background:#1f8f55;color:#fff !important;text-decoration:none !important;' +
      'font-size:13.5px;font-weight:600;padding:10px 14px;border-radius:22px;animation:shpEntra .25s ease}' +
    '.shp-wa:hover{background:#18784a}' +
    '.shp-wa svg{width:18px;height:18px;flex:none}' +
    '.shp-chips{display:flex;flex-wrap:wrap;gap:7px;padding:2px 0 4px;animation:shpEntra .25s ease}' +
    '.shp-chips button{border:1px solid rgba(107,31,69,.35);background:transparent;color:#6b1f45;border-radius:18px;padding:7px 12px;font:500 13px/1.2 Inter,system-ui,sans-serif;cursor:pointer}' +
    '.shp-chips button:hover{background:#6b1f45;color:#fff;border-color:#6b1f45}' +
    '.shp-chat-piede{padding:10px 12px 12px;background:#f5f5f3;border-top:1px solid rgba(0,0,0,.08)}' +
    '.shp-chat-riga{display:flex;gap:8px;align-items:flex-end}' +
    '.shp-chat-riga textarea{flex:1;resize:none;border:1px solid rgba(0,0,0,.14);border-radius:20px;padding:10px 14px;font:400 15px/1.35 Inter,system-ui,sans-serif;' +
      'background:#fff;color:#0a0a0a;max-height:96px;outline:none}' +
    '.shp-chat-riga textarea:focus{border-color:#6b1f45}' +
    '.shp-chat-invia{flex:none;width:42px;height:42px;border:0;border-radius:50%;background:#6b1f45;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
    '.shp-chat-invia:hover{background:#8a3060}' +
    '.shp-chat-invia svg{width:18px;height:18px}' +
    '.shp-chat-scrivi{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:9px;font-size:12.5px;color:#1f8f55 !important;font-weight:600;text-decoration:none !important}' +
    '.shp-chat-scrivi svg{width:15px;height:15px}' +
    '@keyframes shpEntra{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}' +
    '@media (max-width:900px){' +
      '.shp-chat-btn{right:14px;bottom:16px;width:50px;height:50px}' +
      '.shp-chat-fumetto{right:14px;bottom:76px}' +
      'body.shp-barra-su .shp-chat-btn{bottom:88px}' +
      'body.shp-barra-su .shp-chat-fumetto{bottom:148px}' +
      '.shp-chat-pannello{right:8px;left:8px;bottom:8px;width:auto;height:min(78vh,620px);height:min(78dvh,620px)}' +
    '}' +
    '@media (prefers-reduced-motion:reduce){.shp-chat-btn,.shp-chat-fumetto,.shp-chat-pannello,.shp-msg,.shp-chips,.shp-wa{transition:none;animation:none}}';

  var ICONA_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.6-.8L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg>';
  var ICONA_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.9-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';
  var ICONA_INVIA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

  /* ----------------------------------------------------------------- COSTRUZIONE */
  var btn, fumetto, pannello, corpo, campo, aperto = false, iniziata = false, visibile = false;

  function costruisci() {
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shp-chat-btn';
    btn.setAttribute('aria-label', 'Chatta con Angelo');
    btn.innerHTML = ICONA_CHAT + '<span class="shp-chat-punto" aria-hidden="true"></span>';
    btn.addEventListener('click', apri);

    fumetto = document.createElement('div');
    fumetto.className = 'shp-chat-fumetto';
    fumetto.setAttribute('role', 'status');
    var p = prodottoCorrente();
    fumetto.innerHTML = '<b>Ciao, sono Angelo.</b><br>' +
      (p ? 'Hai una domanda su ' + esc(p.nome) + '? Chiedi pure.' : 'Hai una domanda? Chiedi pure.') +
      '<button type="button" aria-label="Chiudi">&times;</button>';
    fumetto.addEventListener('click', function (e) {
      if (e.target.tagName === 'BUTTON') {
        e.stopPropagation();
        scrivi('shp_chat_fumetto_chiuso', String(Date.now()));
        nascondiFumetto();
        return;
      }
      apri();
    });

    pannello = document.createElement('div');
    pannello.className = 'shp-chat-pannello';
    pannello.setAttribute('role', 'dialog');
    pannello.setAttribute('aria-label', 'Chatta con Angelo');
    pannello.innerHTML =
      '<div class="shp-chat-testa">' +
        '<div class="shp-chat-foto"><img src="' + FOTO + '" alt="" width="42" height="42"><i></i></div>' +
        '<div class="shp-chat-titolo"><strong>Chatta con Angelo</strong><span>Fondatore di Shapeless</span></div>' +
        '<button type="button" class="shp-chat-chiudi" aria-label="Chiudi la chat">&times;</button>' +
      '</div>' +
      '<div class="shp-chat-corpo" aria-live="polite"></div>' +
      '<form class="shp-chat-piede">' +
        '<div class="shp-chat-riga">' +
          '<textarea rows="1" placeholder="Scrivi una domanda…" aria-label="Scrivi una domanda" maxlength="600"></textarea>' +
          '<button type="submit" class="shp-chat-invia" aria-label="Invia">' + ICONA_INVIA + '</button>' +
        '</div>' +
        '<a class="shp-chat-scrivi" target="_blank" rel="noopener">' + ICONA_WA + 'Scrivi ad Angelo su WhatsApp</a>' +
      '</form>';

    corpo = pannello.querySelector('.shp-chat-corpo');
    campo = pannello.querySelector('textarea');
    pannello.querySelector('.shp-chat-chiudi').addEventListener('click', chiudi);
    var scriviWa = pannello.querySelector('.shp-chat-scrivi');
    scriviWa.href = linkWhatsApp('');
    scriviWa.addEventListener('click', function () {
      this.href = linkWhatsApp(campo.value.trim());
      scrivi('shp_chat_usata', String(Date.now()));
    });
    pannello.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      invia();
    });
    campo.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); invia(); }
    });
    campo.addEventListener('input', function () {
      scriviWa.href = linkWhatsApp(campo.value.trim());
      campo.style.height = 'auto';
      campo.style.height = Math.min(campo.scrollHeight, 96) + 'px';
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && aperto) chiudi();
    });

    document.body.appendChild(fumetto);
    document.body.appendChild(btn);
    document.body.appendChild(pannello);

    seguiBarraMobile();
  }

  /* su telefono, nelle schede prodotto, la barra "Aggiungi" sta in basso */
  function seguiBarraMobile() {
    var barra = document.getElementById('barra-mobile');
    if (!barra) return;
    var aggiorna = function () {
      document.body.classList.toggle('shp-barra-su', barra.classList.contains('visibile'));
    };
    aggiorna();
    if (window.MutationObserver) {
      new MutationObserver(aggiorna).observe(barra, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ----------------------------------------------------------------- CONVERSAZIONE */
  function messaggio(html, chi) {
    var d = document.createElement('div');
    d.className = 'shp-msg ' + chi;
    d.innerHTML = html;
    corpo.appendChild(d);
    scendi();
    return d;
  }

  function bottoneWhatsApp(testo, etichetta) {
    var a = document.createElement('a');
    a.className = 'shp-wa';
    a.target = '_blank';
    a.rel = 'noopener';
    a.href = linkWhatsApp(testo);
    a.innerHTML = ICONA_WA + esc(etichetta || 'Scrivi ad Angelo su WhatsApp');
    a.addEventListener('click', function () { scrivi('shp_chat_usata', String(Date.now())); });
    corpo.appendChild(a);
    scendi();
  }

  function domande(escludi) {
    var vecchie = corpo.querySelector('.shp-chips');
    if (vecchie) vecchie.remove();
    var box = document.createElement('div');
    box.className = 'shp-chips';
    ARGOMENTI.forEach(function (a) {
      if (a.id === escludi) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = a.etichetta;
      b.addEventListener('click', function () {
        box.remove();
        messaggio(esc(a.etichetta), 'cliente');
        rispondi(a, '');
      });
      box.appendChild(b);
    });
    corpo.appendChild(box);
    scendi();
  }

  function scendi() {
    corpo.scrollTop = corpo.scrollHeight;
  }

  /* piccola pausa "sta scrivendo": una risposta istantanea sembra finta */
  function conPausa(fn) {
    var puntini = messaggio('•••', 'angelo scrive');
    setTimeout(function () { puntini.remove(); fn(); }, 550);
  }

  function rispondi(argomento, testoCliente) {
    conPausa(function () {
      messaggio(argomento.risposta(), 'angelo');
      if (argomento.wa) bottoneWhatsApp(testoCliente);
      else if (testoCliente) bottoneWhatsApp(testoCliente, 'Non era questo? Chiedilo ad Angelo');
      domande(argomento.id);
    });
  }

  function invia() {
    var t = campo.value.trim();
    if (!t) return;
    campo.value = '';
    campo.style.height = 'auto';
    var vecchie = corpo.querySelector('.shp-chips');
    if (vecchie) vecchie.remove();
    messaggio(esc(t).replace(/\n/g, '<br>'), 'cliente');

    var norm = normalizza(t);
    var arg = trovaArgomento(t);
    if (!arg && norm.split(' ').length <= 3) {
      for (var i = 0; i < PICCOLE.length; i++) {
        var hit = PICCOLE[i].parole.some(function (w) { return (' ' + norm + ' ').indexOf(' ' + w + ' ') >= 0; });
        if (hit) {
          var r = PICCOLE[i].risposta;
          conPausa(function () { messaggio(r, 'angelo'); domande(); });
          return;
        }
      }
    }
    if (arg) { rispondi(arg, t); return; }

    conPausa(function () {
      messaggio('Questa è una domanda per me. Te la giro su WhatsApp già scritta: premi qui sotto e ti rispondo io, di persona.', 'angelo');
      bottoneWhatsApp(t, 'Manda ad Angelo su WhatsApp');
      messaggio('Preferisci l\'email? Scrivi a <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>.', 'angelo');
      domande();
    });
  }

  function inizia() {
    if (iniziata) return;
    iniziata = true;
    var p = prodottoCorrente();
    messaggio('Ciao, sono <b>Angelo</b>, il fondatore di Shapeless.' +
      (p ? ' Vedo che stai guardando <b>' + esc(p.nome) + '</b>.' : '') +
      '<br>Qui trovi subito le risposte più richieste. Per tutto il resto scrivimi: ti rispondo io.', 'angelo');
    domande();
  }

  /* ----------------------------------------------------------------- APRI / CHIUDI */
  function apri() {
    if (!btn) return;
    aperto = true;
    nascondiFumetto();
    scrivi('shp_chat_aperta', String(Date.now()));
    inizia();
    pannello.classList.add('si');
    btn.classList.remove('si');
    if (window.matchMedia && window.matchMedia('(min-width: 901px)').matches) {
      setTimeout(function () { campo.focus(); }, 260);
    }
  }

  function chiudi() {
    aperto = false;
    pannello.classList.remove('si');
    if (visibile) btn.classList.add('si');
    btn.focus({ preventScroll: true });
  }

  function nascondiFumetto() {
    if (fumetto) fumetto.classList.remove('si');
  }

  function mostra(conFumetto) {
    if (visibile) return;
    visibile = true;
    if (!btn) costruisci();
    scrivi('shp_chat_vista', '1', sessionStorage);
    requestAnimationFrame(function () {
      if (!aperto) btn.classList.add('si');
    });
    if (conFumetto && giorniDa('shp_chat_fumetto') >= FUMETTO_OGNI_GIORNI &&
        giorniDa('shp_chat_fumetto_chiuso') >= FUMETTO_CHIUSO_GIORNI &&
        giorniDa('shp_chat_aperta') >= FUMETTO_OGNI_GIORNI) {
      setTimeout(function () {
        if (aperto) return;
        scrivi('shp_chat_fumetto', String(Date.now()));
        fumetto.classList.add('si');
        setTimeout(nascondiFumetto, 9000);
      }, 1200);
    }
  }

  /* ----------------------------------------------------------------- AVVIO */
  function avvia() {
    /* gia' comparsa in questa visita: nelle pagine dopo c'e' subito, senza fumetto */
    if (leggi('shp_chat_vista', sessionStorage) === '1') {
      setTimeout(function () { mostra(false); }, 1200);
      return;
    }
    var attesa = prodottoCorrente() ? ATTESA_PRODOTTO
      : /carrello\.html$/.test(location.pathname) ? ATTESA_CARRELLO : ATTESA_ALTRE;
    var inizio = Date.now();
    var timer = setTimeout(function () { mostra(true); }, attesa * 1000);

    function suScorrimento() {
      if (Date.now() - inizio < 4000) return;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 200 && window.scrollY / h >= SCORRIMENTO) {
        window.removeEventListener('scroll', suScorrimento);
        clearTimeout(timer);
        mostra(true);
      }
    }
    window.addEventListener('scroll', suScorrimento, { passive: true });
  }

  /* per provarla subito: aggiungi ?chat=1 all'indirizzo */
  if (/[?&]chat=1\b/.test(location.search)) {
    ATTESA_PRODOTTO = ATTESA_CARRELLO = ATTESA_ALTRE = 1;
    try { localStorage.removeItem('shp_chat_fumetto'); localStorage.removeItem('shp_chat_fumetto_chiuso'); localStorage.removeItem('shp_chat_aperta'); sessionStorage.removeItem('shp_chat_vista'); } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();

})(window, document);
