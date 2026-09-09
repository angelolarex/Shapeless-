/* ===========================================================================
   SHAPELESS — Carrello
   ---------------------------------------------------------------------------
   Motore condiviso da schede prodotto, configuratore 3D, carrello e cassa.
   Lo stato vive nel browser del cliente (localStorage): il carrello sopravvive
   alla chiusura della scheda e al riavvio del computer, senza che nessuno
   debba registrarsi.

   Tre chiavi salvate:
     shapeless_cart_v2     gli articoli
     shapeless_cliente_v1  i dati di chi ha gia' comprato (per riempire la
                           cassa al volo la volta dopo — niente account)
     shapeless_ordine_v1   l'ultimo ordine confermato, per la pagina di grazie

   I prezzi NON stanno qui: stanno in shop-config.js.
   =========================================================================== */

(function (window, document) {

  var CART_KEY    = 'shapeless_cart_v2';
  var CLIENTE_KEY = 'shapeless_cliente_v1';
  var ORDINE_KEY  = 'shapeless_ordine_v1';
  var CART_KEY_V1 = 'shapeless_cart_v1';   // versione precedente, da recuperare

  function cfg() { return window.ShapelessConfig; }

  /* --------------------------------------------------------- lettura/scrittura */

  function leggi(chiave, fallback) {
    try {
      var raw = localStorage.getItem(chiave);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function scrivi(chiave, valore) {
    try { localStorage.setItem(chiave, JSON.stringify(valore)); }
    catch (e) { /* navigazione privata o spazio esaurito: si prosegue lo stesso */ }
  }

  function getCart() {
    var cart = leggi(CART_KEY, null);
    if (cart) return cart;

    // Migrazione dalla versione 1: chi aveva gia' articoli nel carrello non li perde.
    var vecchio = leggi(CART_KEY_V1, null);
    if (vecchio && vecchio.length) {
      scrivi(CART_KEY, vecchio);
      return vecchio;
    }
    return [];
  }

  function saveCart(cart) {
    scrivi(CART_KEY, cart);
    updateBadges();
    document.dispatchEvent(new CustomEvent('carrello:cambiato', { detail: { cart: cart } }));
    return cart;
  }

  /* ------------------------------------------------------------- articoli */

  /* item atteso: { id, nome, prezzo, immagine, colore, coloreHex } */
  function addToCart(item, qty) {
    qty = parseInt(qty, 10) || 1;
    var cart = getCart();
    var hex  = (item.coloreHex || '').toLowerCase();

    // Stesso vaso ma colore diverso = riga diversa. Sono due oggetti distinti,
    // e vederli separati nel carrello evita l'errore di consegna piu' comune.
    var esistente = null;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === item.id && (cart[i].coloreHex || '').toLowerCase() === hex) {
        esistente = cart[i]; break;
      }
    }

    if (esistente) {
      esistente.qty += qty;
    } else {
      cart.push({
        id:        item.id,
        nome:      item.nome,
        prezzo:    parseFloat(item.prezzo),
        immagine:  item.immagine,
        colore:    item.colore || '',
        coloreHex: item.coloreHex || '',
        qty:       qty
      });
    }
    return saveCart(cart);
  }

  function updateQty(index, qty) {
    var cart = getCart();
    if (!cart[index]) return cart;
    qty = parseInt(qty, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > 20) qty = 20;
    cart[index].qty = qty;
    return saveCart(cart);
  }

  function removeItem(index) {
    var cart = getCart();
    cart.splice(index, 1);
    return saveCart(cart);
  }

  function clearCart() { return saveCart([]); }

  function cartCount() {
    return getCart().reduce(function (s, i) { return s + i.qty; }, 0);
  }

  function cartTotal() {
    return getCart().reduce(function (s, i) { return s + i.qty * i.prezzo; }, 0);
  }

  /* ---------------------------------------------------------------- conti */

  /* Restituisce tutte le cifre della cassa in un colpo solo, cosi' carrello e
     checkout non possono mai mostrare totali diversi. */
  function calcolaTotali(codicePaese) {
    var C = cfg();
    var subtotale = cartTotal();
    var vuoto = subtotale <= 0;

    var zona = codicePaese ? C.zonaPerPaese(codicePaese) : null;
    var soglia = zona && zona.sogliaGratis !== undefined
               ? zona.sogliaGratis : C.spedizione.sogliaGratis;
    var gratis = soglia !== null && subtotale >= soglia;
    var spedizione = (vuoto || !zona) ? null : (gratis ? 0 : zona.costo);

    var totale = subtotale + (spedizione || 0);

    // Scorporo dell'IVA, solo per mostrarla nel riepilogo
    var imponibile = null, iva = null;
    if (C.iva.regime === 'inclusa') {
      imponibile = totale / (1 + C.iva.aliquota);
      iva = totale - imponibile;
    } else if (C.iva.regime === 'esclusa') {
      imponibile = totale;
      iva = totale * C.iva.aliquota;
      totale = imponibile + iva;
    }

    return {
      subtotale:      subtotale,
      spedizione:     spedizione,
      spedizioneGratis: gratis,
      mancaAGratis:   soglia === null ? null : Math.max(0, soglia - subtotale),
      sogliaZona:     soglia,
      imponibile:     imponibile,
      iva:            iva,
      totale:         totale,
      zona:           zona,
      articoli:       cartCount()
    };
  }

  /* ------------------------------------------------------- cliente e ordine */

  function getCliente()      { return leggi(CLIENTE_KEY, null); }
  function saveCliente(c)    { scrivi(CLIENTE_KEY, c); return c; }
  function dimenticaCliente(){ try { localStorage.removeItem(CLIENTE_KEY); } catch (e) {} }

  function saveOrdine(o)     { scrivi(ORDINE_KEY, o); return o; }
  function getOrdine()       { return leggi(ORDINE_KEY, null); }

  /* Numero d'ordine leggibile: SHP-260909-4821 */
  function nuovoNumeroOrdine() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'SHP-' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) +
           '-' + String(Math.floor(1000 + Math.random() * 9000));
  }

  /* L'immagine da mostrare per una riga di carrello: il disegno tecnico se
     il prodotto ce l'ha, altrimenti il render del colore, altrimenti la foto.
     La risolvo QUI e non quando l'articolo viene aggiunto, cosi' anche i
     carrelli gia' aperti nel browser di qualcuno prendono l'immagine nuova
     senza che debbano svuotare niente. */
  function immagineDi(item) {
    return cfg().disegno(item.id) ||
           cfg().immagine(item.id, item.coloreHex) ||
           item.immagine;
  }

  /* ------------------------------------------------------------ formattazione */

  function formatPrice(n) {
    if (n === null || n === undefined) return '—';
    return '€ ' + Number(n).toFixed(2).replace('.', ',');
  }

  function dataConsegna() {
    var C = cfg();
    var giorni = C.produzione.giorniLavorativi;
    var d = new Date();
    var aggiunti = 0;
    while (aggiunti < giorni) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) aggiunti++;
    }
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  }

  /* --------------------------------------------------------------- pastiglia */

  function updateBadges() {
    var n = cartCount();
    document.querySelectorAll('.cart-badge').forEach(function (b) {
      b.textContent = n;
      b.style.display = n > 0 ? 'inline-flex' : 'none';
    });
    document.querySelectorAll('[data-cart-count]').forEach(function (b) {
      b.textContent = n;
    });
    document.querySelectorAll('[data-cart-hide-if-empty]').forEach(function (b) {
      b.style.display = n > 0 ? '' : 'none';
    });
  }

  /* ------------------------------------------------------------------ avviso
     Conferma visibile dopo "aggiungi al carrello". Senza, il cliente clicca,
     non succede niente di evidente, e clicca di nuovo: e' il difetto piu'
     frequente nei carrelli fatti in casa. */

  function avviso(testo, azione) {
    var vecchio = document.querySelector('.shp-toast');
    if (vecchio) vecchio.remove();

    var t = document.createElement('div');
    t.className = 'shp-toast';
    t.innerHTML = '<span class="shp-toast-check" aria-hidden="true"></span>' +
                  '<div class="shp-toast-txt">' + testo + '</div>' +
                  (azione ? '<a class="shp-toast-cta" href="' + azione.href + '">' +
                            azione.testo + '</a>' : '');
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('visibile'); });

    setTimeout(function () {
      t.classList.remove('visibile');
      setTimeout(function () { t.remove(); }, 350);
    }, 4800);
  }

  document.addEventListener('DOMContentLoaded', updateBadges);
  // Carrello aperto in due schede: la seconda si aggiorna da sola.
  window.addEventListener('storage', function (e) {
    if (e.key === CART_KEY) updateBadges();
  });

  window.ShapelessCart = {
    getCart: getCart,
    addToCart: addToCart,
    updateQty: updateQty,
    removeItem: removeItem,
    clearCart: clearCart,
    cartCount: cartCount,
    cartTotal: cartTotal,
    calcolaTotali: calcolaTotali,
    getCliente: getCliente,
    saveCliente: saveCliente,
    dimenticaCliente: dimenticaCliente,
    saveOrdine: saveOrdine,
    getOrdine: getOrdine,
    nuovoNumeroOrdine: nuovoNumeroOrdine,
    immagineDi: immagineDi,
    formatPrice: formatPrice,
    dataConsegna: dataConsegna,
    updateBadges: updateBadges,
    avviso: avviso
  };

})(window, document);
