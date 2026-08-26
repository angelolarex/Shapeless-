/* ===========================
   SHAPELESS — Carrello (client-side, localStorage)
   Motore condiviso usato dalle pagine prodotto e da carrello.html.
   Nessun backend reale: è una base funzionante per la fase di layout,
   da collegare in futuro a un vero sistema di checkout/pagamento.
   =========================== */

(function (window) {
  var CART_KEY = 'shapeless_cart_v1';

  function getCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) { /* localStorage non disponibile: carrello non persistente */ }
    updateBadges();
  }

  // item atteso: { id, nome, prezzo (numero), immagine, colore }
  function addToCart(item, qty) {
    qty = parseInt(qty, 10) || 1;
    var cart = getCart();
    var existing = null;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === item.id && cart[i].colore === item.colore) { existing = cart[i]; break; }
    }
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id: item.id,
        nome: item.nome,
        prezzo: item.prezzo,
        immagine: item.immagine,
        colore: item.colore || '',
        qty: qty
      });
    }
    saveCart(cart);
    return cart;
  }

  function updateQty(index, qty) {
    var cart = getCart();
    if (!cart[index]) return cart;
    qty = parseInt(qty, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    cart[index].qty = qty;
    saveCart(cart);
    return cart;
  }

  function removeItem(index) {
    var cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    return cart;
  }

  function clearCart() {
    saveCart([]);
  }

  function cartCount() {
    return getCart().reduce(function (sum, i) { return sum + i.qty; }, 0);
  }

  function cartTotal() {
    return getCart().reduce(function (sum, i) { return sum + i.qty * i.prezzo; }, 0);
  }

  function formatPrice(n) {
    return '€ ' + n.toFixed(2).replace('.', ',');
  }

  function updateBadges() {
    var count = cartCount();
    document.querySelectorAll('.cart-badge').forEach(function (b) {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  document.addEventListener('DOMContentLoaded', updateBadges);

  window.ShapelessCart = {
    getCart: getCart,
    addToCart: addToCart,
    updateQty: updateQty,
    removeItem: removeItem,
    clearCart: clearCart,
    cartCount: cartCount,
    cartTotal: cartTotal,
    formatPrice: formatPrice,
    updateBadges: updateBadges
  };
})(window);
