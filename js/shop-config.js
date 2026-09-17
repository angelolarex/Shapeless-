/* ===========================================================================
   SHAPELESS — Configurazione del negozio
   ---------------------------------------------------------------------------
   TUTTI i parametri commerciali stanno qui dentro. Se devi cambiare un prezzo,
   una spesa di spedizione, l'IVA o i tempi di consegna, cambi questo file e
   basta: non c'e' nessun altro punto del sito da toccare.

   Va caricato PRIMA di cart.js e checkout.js.
   =========================================================================== */

(function (window) {

  var CONFIG = {

    /* ------------------------------------------------------------------
       IVA
       ------------------------------------------------------------------
       In attesa della risposta del commercialista il sito e' impostato
       sull'opzione piu' sicura per il B2C italiano: prezzi IVA INCLUSA.

       regime:  'inclusa'    i prezzi mostrati contengono gia' l'IVA
                             (nel riepilogo la scorporiamo, per trasparenza)
                'esclusa'    l'IVA si somma al totale in cassa
                'forfettario' nessuna IVA, con la dicitura di legge

       Per cambiare regime basta cambiare questa riga.
       ------------------------------------------------------------------ */
    iva: {
      regime: 'inclusa',
      aliquota: 0.22,
      dicituraForfettario: 'Operazione non soggetta a IVA ai sensi ' +
        'dell\'art. 1, commi 54-89, Legge 190/2014 — regime forfettario.'
    },

    /* ------------------------------------------------------------------
       SPEDIZIONE
       ------------------------------------------------------------------
       Sopra la soglia la spedizione e' gratis. Con il Bombato a 95 € questo
       significa che in Italia e' sempre gratis: e' una leva di conversione
       forte e va detta chiaramente in ogni pagina.
       ------------------------------------------------------------------ */
    spedizione: {
      /* ⚠️ In Italia la spedizione e' SEMPRE gratis: costo 0 e soglia 0.
         Non e' solo una scelta commerciale, e' coerenza: ogni scheda prodotto
         dice gia' "spedizione gratuita in Italia" senza mettere condizioni.
         Con una soglia a 150 € un ordine da 149 avrebbe pagato 9,90 e il
         cliente avrebbe letto una promessa diversa da quella applicata alla
         cassa — il modo piu' rapido per farsi annullare un ordine.
         ⚠️ Lo stesso valore va tenuto in _pagamenti/worker.js: e' il worker a
         calcolare l'importo vero, questo file disegna soltanto. */
      sogliaGratis: 0,
      /* sogliaGratis per zona: null = non e' mai gratis.
         Fuori dall'Italia il corriere costa troppo per regalarlo. */
      zone: [
        { id: 'IT', nome: 'Italia',          paesi: ['IT'],
          costo:  0.00, sogliaGratis: 0,    giorni: '2-3'  },
        { id: 'EU', nome: 'Unione Europea',  paesi: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'],
          costo: 24.90, sogliaGratis: 400,  giorni: '4-7'  },
        { id: 'XX', nome: 'Resto del mondo', paesi: [],
          costo: 49.90, sogliaGratis: null, giorni: '7-14' }
      ]
    },

    /* Giorni lavorativi di produzione: ogni pezzo e' prodotto on demand.
       Va detto PRIMA del pagamento, mai dopo: e' la prima causa di reclami. */
    produzione: { giorniLavorativi: 12 },

    /* ------------------------------------------------------------------
       CATALOGO
       ------------------------------------------------------------------
       PREZZI VERI dal 17/09 (colonna "Prezzo suggerito al pubblico" del listino):
           Blade 215,00 — Vulcano 95,00 — Bombato 95,00
       (Il collaudo a 5 € con PayPal e Klarna e' andato a buon fine.)

       ⚠️ Nota per me: questo commento e' gia' dentro un blocco /* ... *\/ .
       Aprirne un altro qui dentro non serve, e CHIUDERLO manda in errore tutto
       il file: il browser smette di leggere shop-config.js, nessun prezzo viene
       applicato e la scheda prodotto resta col numero scritto a mano
       nell'HTML. E' successo, e sembrava un problema di cache.

       Il prezzo vive qui, non nell'HTML: cosi' non puo' succedere che il
       carrello e la scheda prodotto mostrino cifre diverse.
       ------------------------------------------------------------------ */
    prodotti: {
      blade: {
        id: 'blade',
        nome: 'Blade',
        prezzo: 215.00,      /* 28x28x37h cm — listino 17/09 */
        altezzaCm: 37,
        immagine: 'images/blade-transparent.png',
        pagina: 'prodotto-blade.html',
        configuratore: null,
        /* Disegno tecnico a tratto: e' quello che va nel carrello e in cassa.
           Uno solo per tutti i colori — a dire il colore ci pensano il pallino
           e il nome scritto accanto. Pesa 38 KB compresso invece di uno
           scaricamento per ogni tinta, ed e' sempre esatto.
           (I render a colori sono stati tolti: sulla scheda prodotto vince la
           fotografia. Si rigenerano in un comando, vedi RENDER-COLORI.md.) */
        disegno: 'images/blade-linea.svg'
      },
      vulcano: {
        id: 'vulcano',
        nome: 'Vulcano',
        prezzo: 95.00,       /* 22x22x26h cm — listino 17/09 */
        altezzaCm: 26,
        immagine: 'images/vulcano-transparent.png',
        pagina: 'prodotto-vulcano.html',
        configuratore: null,
        /* Stesso criterio di Blade: nel carrello e in cassa va il disegno a
           tratto, uno solo per tutte le tinte. E' ricavato dall'export
           tecnico di Rhino togliendo le quote e le frecce. */
        disegno: 'images/vulcano-linea.svg'
      },
      bombato: {
        id: 'bombato',
        nome: 'Bombato',
        prezzo: 95.00,       /* 25x25x19h cm — listino 17/09 */
        altezzaCm: 19,
        immagine: 'images/bombato-transparent.png',
        pagina: 'prodotto-bombato.html',
        configuratore: null,
        disegno: 'images/bombato-linea.svg'
      }
    },

    /* ------------------------------------------------------------------
       PALETTE — i 9 colori, identici su tutti i vasi
       ------------------------------------------------------------------ */
    colori: [
      { hex: '#a3444d', nome: 'Red Wine' },
      { hex: '#91535d', nome: 'Bordeaux' },
      { hex: '#bcbfb0', nome: 'Sage' },
      { hex: '#646666', nome: 'Antracite' },
      { hex: '#d8d0cd', nome: 'Off White' },
      { hex: '#e7cac0', nome: 'Rosè' },
      { hex: '#346371', nome: 'Emerald Green' },
      { hex: '#00924f', nome: 'Verde' },
      { hex: '#5b644f', nome: 'Forest Green' }
    ],

    /* ------------------------------------------------------------------
       PAGAMENTI
       ------------------------------------------------------------------
       endpoint: l'indirizzo del micro-servizio che crea la sessione di
                 pagamento Stripe. Finche' e' null il sito lavora in
                 MODALITA' DIMOSTRATIVA: raccoglie tutto l'ordine e mostra
                 la pagina di conferma, senza incassare nulla.

       Quando avrai il backend attivo (vedi CHECKOUT-E-PAGAMENTI.md),
       metti qui il suo indirizzo, per esempio:
           endpoint: 'https://api.shapeless.shop/crea-sessione'
       e il sito comincia a incassare davvero. Nient'altro da cambiare.
       ------------------------------------------------------------------ */
    pagamenti: {
      /* ⚠️ ACCESO. Questo e' l'indirizzo del micro-servizio su Cloudflare che
         crea la sessione di pagamento Stripe. Finche' era null il sito
         raccoglieva l'ordine senza incassare; da adesso incassa davvero.
         La chiave segreta di Stripe NON e' qui e non deve mai esserci: vive
         cifrata dentro Cloudflare. Qui c'e' solo un indirizzo pubblico.
         Oggi il servizio ha la chiave di PROVA (sk_test_): i pagamenti sono
         simulati e si collaudano con la carta finta 4242 4242 4242 4242. */
      endpoint: 'https://shapeless-pagamenti.shapeless-shop.workers.dev/crea-sessione',
      /* ⚠️ CHIAVE PUBBLICA di Stripe (pk_test_... oggi, pk_live_... al lancio).
         Serve a montare il modulo di pagamento dentro checkout.html.
         E' fatta apposta per stare nel sito: con lei non si puo' incassare,
         rimborsare o leggere niente. Quella SEGRETA (sk_...) invece non va
         MAI qui: vive solo dentro Cloudflare.
         Si trova in Stripe → Sviluppatori → Chiavi API → "Chiave pubblicabile".
         Al passaggio in live va cambiata INSIEME alla sk_live_ del worker:
         una chiave test con l'altra live non funziona. */
      chiavePubblica: 'pk_live_51O0HprKLPMmjJB0XBk68kmWknE6uCLnnlDgpWyhER4HujNscFrcSM2k72iRRfpt4H3Y8DHrfKlF2LO9A5IBBaLV100nSJU1Ywr',   /* LIVE dal 16/09/2026 — la pk_test_ era 51O0Hpr...Q9an */
      valuta: 'EUR',
      /* Metodi mostrati in cassa. Sono quelli che Stripe attiva da pannello:
         qui servono solo a disegnare i loghi e a spiegarli al cliente. */
      metodi: ['Carta', 'Apple Pay', 'Google Pay', 'PayPal', 'Klarna', 'Satispay']
    },

    /* ------------------------------------------------------------------
       AZIENDA
       ------------------------------------------------------------------ */
    azienda: {
      nome: 'Shapeless — Larecchiuta Angelo',
      piva: '01927390854',
      indirizzo: 'Viale della Regione 32B, 93100 Caltanissetta (IT)',
      email: 'info@shapeless.shop',
      telefono: '+39 327 446 5586'
    },

    /* ------------------------------------------------------------------
       RESO — obbligatorio dirlo, e conviene: rassicura e fa vendere
       ------------------------------------------------------------------ */
    reso: { giorni: 14 }
  };

  /* ------------------------------------------------------------- helper */

  CONFIG.zonaPerPaese = function (codicePaese) {
    var zone = CONFIG.spedizione.zone;
    for (var i = 0; i < zone.length; i++) {
      if (zone[i].paesi.indexOf(codicePaese) !== -1) return zone[i];
    }
    return zone[zone.length - 1];   // resto del mondo
  };

  /* L'immagine di un prodotto. Il secondo parametro e' il gancio pronto per
     quando ci saranno le foto vere colore per colore: basta aggiungere il
     campo "render" al prodotto e tutto il resto funziona da solo. */
  CONFIG.immagine = function (idProdotto, hex) {
    var p = CONFIG.prodotti[idProdotto];
    if (!p) return '';
    if (p.render && hex) {
      return p.render.replace('{hex}', hex.replace('#', '').toLowerCase());
    }
    return p.immagine;
  };

  /* Il disegno a tratto del prodotto, se ce l'ha. */
  CONFIG.disegno = function (idProdotto) {
    var p = CONFIG.prodotti[idProdotto];
    return (p && p.disegno) || null;
  };

  CONFIG.nomeColore = function (hex) {
    if (!hex) return '';
    hex = hex.toLowerCase();
    for (var i = 0; i < CONFIG.colori.length; i++) {
      if (CONFIG.colori[i].hex.toLowerCase() === hex) return CONFIG.colori[i].nome;
    }
    return '';
  };

  window.ShapelessConfig = CONFIG;

})(window);
