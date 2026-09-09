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
       Sopra la soglia la spedizione e' gratis. Con Blade a 169 € questo
       significa che in Italia e' sempre gratis: e' una leva di conversione
       forte e va detta chiaramente in ogni pagina.
       ------------------------------------------------------------------ */
    spedizione: {
      /* la soglia italiana, quella citata nelle pagine */
      sogliaGratis: 150,
      /* sogliaGratis per zona: null = non e' mai gratis.
         Fuori dall'Italia il corriere costa troppo per regalarlo. */
      zone: [
        { id: 'IT', nome: 'Italia',          paesi: ['IT'],
          costo:  9.90, sogliaGratis: 150,  giorni: '2-3'  },
        { id: 'EU', nome: 'Unione Europea',  paesi: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'],
          costo: 24.90, sogliaGratis: 400,  giorni: '4-7'  },
        { id: 'XX', nome: 'Resto del mondo', paesi: [],
          costo: 49.90, sogliaGratis: null, giorni: '7-14' }
      ]
    },

    /* Giorni lavorativi di produzione: ogni pezzo e' stampato su ordinazione.
       Va detto PRIMA del pagamento, mai dopo: e' la prima causa di reclami. */
    produzione: { giorniLavorativi: 12 },

    /* ------------------------------------------------------------------
       CATALOGO
       ------------------------------------------------------------------
       Il prezzo vive qui, non nell'HTML: cosi' non puo' succedere che il
       carrello e la scheda prodotto mostrino cifre diverse.
       ------------------------------------------------------------------ */
    prodotti: {
      blade: {
        id: 'blade',
        nome: 'Blade',
        prezzo: 169.00,
        altezzaCm: 37,
        immagine: 'images/blade-transparent.png',
        pagina: 'prodotto-blade.html',
        configuratore: 'esplora-blade.html',
        /* Un'immagine per colore, generata dal modello 3D con la stessa luce
           della foto (vedi RENDER-COLORI.md). Se manca il file per un colore
           si torna automaticamente all'immagine qui sopra. */
        render: 'images/render/blade-{hex}.webp',
        /* Disegno tecnico a tratto: e' quello che va nel carrello e in cassa.
           Uno solo per tutti i colori — a dire il colore ci pensano il pallino
           e il nome scritto accanto. Pesa 38 KB compresso invece di uno
           scaricamento per ogni tinta, ed e' sempre esatto. */
        disegno: 'images/blade-linea.svg'
      },
      vulcano: {
        id: 'vulcano',
        nome: 'Vulcano',
        prezzo: 189.00,
        altezzaCm: 32,
        immagine: 'images/vulcano-transparent.png',
        pagina: 'prodotto-vulcano.html',
        configuratore: null
      },
      bombato: {
        id: 'bombato',
        nome: 'Bombato',
        prezzo: 149.00,
        altezzaCm: 28,
        immagine: 'images/bombato-transparent.png',
        pagina: 'prodotto-bombato.html',
        configuratore: null
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
      { hex: '#e2cbc5', nome: 'Rosè' },
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
      endpoint: null,
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

  /* L'immagine giusta per un prodotto nel colore scelto. E' quello che rende
     coerente il carrello: il vaso mostrato e' del colore che c'e' scritto. */
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
