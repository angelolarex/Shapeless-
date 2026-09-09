/* ===========================================================================
   SHAPELESS — micro-servizio di pagamento (Cloudflare Worker)
   ---------------------------------------------------------------------------
   Fa due sole cose, ed e' giusto che faccia solo queste:

     POST /crea-sessione   riceve il carrello dal sito, ricalcola i prezzi
                           con i SUOI dati e apre una sessione di pagamento
                           Stripe. Risponde con l'indirizzo dove mandare
                           il cliente.

     POST /webhook         Stripe avvisa qui quando un pagamento va a buon
                           fine. E' l'unico punto in cui un ordine diventa
                           "pagato": la pagina di ritorno non fa fede, perche'
                           il cliente puo' chiudere il browser prima.

   PERCHE' SERVE UN SERVIZIO E NON SI PUO' FARE TUTTO NEL SITO
   La chiave segreta di Stripe da' accesso completo al conto. Se stesse nel
   sito, chiunque potrebbe leggerla con "ispeziona pagina". Qui invece vive
   nelle variabili d'ambiente di Cloudflare e non esce mai.

   PERCHE' I PREZZI SI RICALCOLANO QUI
   Il carrello sta nel browser del cliente, e il browser si puo' manipolare.
   Se accettassimo il totale che arriva dal sito, qualcuno potrebbe comprare
   Blade a 1 €. Dal sito arrivano solo GLI IDENTIFICATIVI e le quantita';
   i prezzi li mette questo file.

   Serve Node 18+ solo per lo sviluppo locale. In produzione gira su
   Cloudflare Workers, gratis fino a 100.000 richieste al giorno.
   =========================================================================== */

/* ---------------------------------------------------------------- catalogo
   DEVE restare allineato a js/shop-config.js. Quando cambi un prezzo,
   cambialo in tutti e due i posti. */

const CATALOGO = {
  blade:   { nome: 'Blade',   prezzo: 16900, immagine: 'images/blade-transparent.png' },
  vulcano: { nome: 'Vulcano', prezzo: 18900, immagine: 'images/vulcano-transparent.png' },
  bombato: { nome: 'Bombato', prezzo: 14900, immagine: 'images/bombato-transparent.png' }
};
/* i prezzi sono in CENTESIMI: Stripe lavora sempre in centesimi */

const SPEDIZIONE = {
  /* sogliaGratis in centesimi; null = non e' mai gratis.
     DEVE restare allineato alle zone di js/shop-config.js. */
  IT: { costo:  990, sogliaGratis: 15000, nome: 'Italia',          giorniMin: 2, giorniMax:  3 },
  EU: { costo: 2490, sogliaGratis: 40000, nome: 'Unione Europea',  giorniMin: 4, giorniMax:  7 },
  XX: { costo: 4990, sogliaGratis: null,  nome: 'Resto del mondo', giorniMin: 7, giorniMax: 14 }
};

const PAESI_EU = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU',
                  'IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];

/* paesi in cui accettiamo di spedire */
const PAESI_SERVITI = PAESI_EU.concat(['CH','GB','NO','US','CA','AU','JP']);

/* da dove accettiamo richieste: senza questo elenco chiunque potrebbe usare
   il nostro conto Stripe dal proprio sito */
const ORIGINI_AMMESSE = [
  'https://shapeless.shop',
  'https://www.shapeless.shop',
  'http://localhost:8000',
  'http://127.0.0.1:8000'
];

/* ------------------------------------------------------------------ utili */

function zonaDi(paese) {
  if (paese === 'IT') return 'IT';
  if (PAESI_EU.includes(paese)) return 'EU';
  return 'XX';
}

function intestazioniCORS(origine) {
  const ok = ORIGINI_AMMESSE.includes(origine);
  return {
    'Access-Control-Allow-Origin': ok ? origine : ORIGINI_AMMESSE[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function json(dati, stato, origine) {
  return new Response(JSON.stringify(dati), {
    status: stato || 200,
    headers: { 'Content-Type': 'application/json', ...intestazioniCORS(origine) }
  });
}

/* Stripe vuole i parametri in formato modulo, con le parentesi quadre.
   Questa funzione appiattisce un oggetto annidato in quel formato. */
function aFormData(oggetto, prefisso = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(oggetto)) {
    if (v === undefined || v === null) continue;
    const chiave = prefisso ? `${prefisso}[${k}]` : k;
    if (typeof v === 'object' && !Array.isArray(v)) aFormData(v, chiave, out);
    else if (Array.isArray(v)) v.forEach((el, i) => {
      if (typeof el === 'object') aFormData(el, `${chiave}[${i}]`, out);
      else out.append(`${chiave}[${i}]`, String(el));
    });
    else out.append(chiave, String(v));
  }
  return out;
}

async function chiamaStripe(percorso, corpo, chiave) {
  const r = await fetch(`https://api.stripe.com/v1/${percorso}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${chiave}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: aFormData(corpo).toString()
  });
  const dati = await r.json();
  if (!r.ok) throw new Error(dati.error?.message || `Stripe ha risposto ${r.status}`);
  return dati;
}

/* ============================================================ crea-sessione */

async function creaSessione(richiesta, env, origine) {
  const corpo = await richiesta.json();
  const articoli = Array.isArray(corpo.articoli) ? corpo.articoli : [];
  const cliente = corpo.cliente || {};

  if (!articoli.length) return json({ errore: 'Carrello vuoto.' }, 400, origine);
  if (articoli.length > 20) return json({ errore: 'Troppi articoli.' }, 400, origine);

  const paese = (cliente.paese || 'IT').toUpperCase();
  if (!PAESI_SERVITI.includes(paese)) {
    return json({ errore: 'Non spediamo ancora in questo paese. Scrivici e troviamo una soluzione.' },
                400, origine);
  }

  /* --- righe d'ordine, con i NOSTRI prezzi --- */
  let subtotale = 0;
  const righe = [];

  for (const a of articoli) {
    const p = CATALOGO[a.id];
    if (!p) return json({ errore: `Prodotto sconosciuto: ${a.id}` }, 400, origine);

    const qty = Math.max(1, Math.min(20, parseInt(a.qty, 10) || 1));
    subtotale += p.prezzo * qty;

    righe.push({
      quantity: qty,
      price_data: {
        currency: 'eur',
        unit_amount: p.prezzo,
        product_data: {
          name: p.nome + (a.colore ? ` — ${a.colore}` : ''),
          description: 'Vaso in PLA vegetale, stampato su ordinazione. ' +
                       'Inserto Hidden Nest in vetro incluso.'
        }
      }
    });
  }

  /* --- spedizione --- */
  const zona = SPEDIZIONE[zonaDi(paese)];
  const costoSped = (zona.sogliaGratis !== null && subtotale >= zona.sogliaGratis)
                    ? 0 : zona.costo;

  /* --- la sessione --- */
  const sessione = await chiamaStripe('checkout/sessions', {
    mode: 'payment',
    ui_mode: 'hosted',
    locale: 'it',

    line_items: righe,

    /* niente account: Stripe crea un cliente "ospite" al volo */
    customer_creation: 'always',
    customer_email: cliente.email || undefined,

    /* Stripe raccoglie e verifica lui l'indirizzo: e' piu' affidabile
       del nostro modulo, e riempie in automatico dai dati del telefono */
    shipping_address_collection: { allowed_countries: PAESI_SERVITI },
    phone_number_collection: { enabled: true },

    /* partita IVA per la fattura B2B (vedi CHECKOUT-E-PAGAMENTI.md) */
    tax_id_collection: { enabled: true },

    shipping_options: [{
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: costoSped, currency: 'eur' },
        display_name: costoSped === 0
          ? 'Spedizione gratuita — ' + zona.nome
          : 'Spedizione ' + zona.nome,
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 12 + zona.giorniMin },
          maximum: { unit: 'business_day', value: 12 + zona.giorniMax }
        }
      }
    }],

    /* tutto quello che ci serve per lavorare l'ordine, allegato alla sessione */
    metadata: {
      numeroOrdine:   corpo.numeroOrdine || '',
      tipoCliente:    cliente.tipoCliente || 'privato',
      ragioneSociale: cliente.ragioneSociale || '',
      piva:           cliente.piva || '',
      sdi:            cliente.sdi || '',
      telefono:       cliente.telefono || '',
      note:           (cliente.note || '').slice(0, 400),
      colori:         articoli.map(a => `${a.id}:${a.colore || '-'}×${a.qty}`).join(' | ')
    },

    /* la ricevuta parte da Stripe, senza che dobbiamo mandare email noi */
    invoice_creation: { enabled: true },

    /* 30 minuti: dopo, la sessione scade e il carrello resta al suo posto */
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,

    success_url: 'https://shapeless.shop/ordine-ricevuto.html?sessione={CHECKOUT_SESSION_ID}',
    cancel_url:  'https://shapeless.shop/checkout.html?annullato=1'
  }, env.STRIPE_SECRET_KEY);

  return json({ id: sessione.id, url: sessione.url }, 200, origine);
}

/* =================================================================== webhook

   Verifica che la chiamata venga davvero da Stripe (firma HMAC) e poi
   registra l'ordine. Senza la verifica, chiunque potrebbe far risultare
   pagati ordini mai pagati.                                                */

async function verificaFirma(corpoGrezzo, intestazione, segreto) {
  const parti = Object.fromEntries(
    intestazione.split(',').map(p => p.split('=').map(s => s.trim()))
  );
  const atteso = `${parti.t}.${corpoGrezzo}`;

  const chiave = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(segreto),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const firma = await crypto.subtle.sign('HMAC', chiave, new TextEncoder().encode(atteso));
  const esa = [...new Uint8Array(firma)].map(b => b.toString(16).padStart(2, '0')).join('');

  /* tolleranza di 5 minuti sull'orologio, contro i replay */
  if (Math.abs(Date.now() / 1000 - Number(parti.t)) > 300) return false;
  return esa === parti.v1;
}

async function webhook(richiesta, env) {
  const grezzo = await richiesta.text();
  const firma = richiesta.headers.get('stripe-signature');

  if (!firma || !(await verificaFirma(grezzo, firma, env.STRIPE_WEBHOOK_SECRET))) {
    return new Response('firma non valida', { status: 400 });
  }

  const evento = JSON.parse(grezzo);

  if (evento.type === 'checkout.session.completed') {
    const s = evento.data.object;

    const ordine = {
      numero:     s.metadata?.numeroOrdine || s.id,
      sessione:   s.id,
      data:       new Date().toISOString(),
      totale:     s.amount_total,
      valuta:     s.currency,
      email:      s.customer_details?.email,
      nome:       s.customer_details?.name,
      telefono:   s.customer_details?.phone || s.metadata?.telefono,
      spedizione: s.collected_information?.shipping_details || s.shipping_details,
      pivaRaccolta: s.customer_details?.tax_ids?.[0]?.value || s.metadata?.piva,
      sdi:        s.metadata?.sdi,
      colori:     s.metadata?.colori,
      note:       s.metadata?.note
    };

    /* Dove finisce l'ordine. Scegline UNO (vedi CHECKOUT-E-PAGAMENTI.md):
         a) KV di Cloudflare  — semplice, gratis, va benissimo all'inizio
         b) Google Sheet / Airtable — comodo per lavorarci a mano
         c) email a te stesso — il minimo indispensabile                   */

    if (env.ORDINI) {                                   // (a) KV
      await env.ORDINI.put(ordine.numero, JSON.stringify(ordine));
    }

    if (env.WEBHOOK_INTERNO) {                          // (b) foglio/Airtable/Zapier
      await fetch(env.WEBHOOK_INTERNO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ordine)
      });
    }
  }

  /* Rispondere 200 in fretta e' importante: se tardi, Stripe riprova. */
  return new Response('ok', { status: 200 });
}

/* ============================================================== instradamento */

export default {
  async fetch(richiesta, env) {
    const url = new URL(richiesta.url);
    const origine = richiesta.headers.get('Origin') || '';

    if (richiesta.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: intestazioniCORS(origine) });
    }

    try {
      if (url.pathname === '/crea-sessione' && richiesta.method === 'POST') {
        if (!ORIGINI_AMMESSE.includes(origine)) {
          return json({ errore: 'Origine non ammessa.' }, 403, origine);
        }
        return await creaSessione(richiesta, env, origine);
      }

      if (url.pathname === '/webhook' && richiesta.method === 'POST') {
        return await webhook(richiesta, env);
      }

      return new Response('Shapeless — servizio pagamenti attivo.', { status: 200 });

    } catch (e) {
      /* Il messaggio vero va nei log, non al cliente: potrebbe contenere
         dettagli del conto Stripe. */
      console.error(e);
      return json({ errore: 'Non siamo riusciti ad aprire il pagamento. Riprova.' }, 500, origine);
    }
  }
};
