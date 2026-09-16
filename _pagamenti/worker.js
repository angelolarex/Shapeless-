/* ===========================================================================
   SHAPELESS — micro-servizio di pagamento (Cloudflare Worker)
   ---------------------------------------------------------------------------
   Fa tre sole cose, ed e' giusto che faccia solo queste:

     POST /crea-sessione   riceve il carrello dal sito, ricalcola i prezzi
                           con i SUOI dati e apre una sessione di pagamento
                           Stripe INCORPORATA. Risponde con il clientSecret
                           che checkout.html usa per montare il modulo.

     GET  /stato-sessione  la pagina di ringraziamento chiede com'e' andata
                           (nome, email, indirizzo da mostrare).

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

/* ⚠️⚠️ PREZZI DI PROVA — 1,00 € ⚠️⚠️
   Allineati a js/shop-config.js per collaudare l'incasso vero spendendo un
   euro. I prezzi veri sono, e vanno rimessi QUI E ANCHE in shop-config.js
   prima di aprire al pubblico:
       blade 16900 — vulcano 18900 — bombato 14900
   ⚠️ Attenzione al perche' conta: e' QUESTO file a decidere quanto paga il
   cliente, non il sito. Il carrello sta nel browser e il browser si manipola,
   quindi dal sito arrivano solo gli identificativi e le quantita'. Se avessi
   messo 1 € solo in shop-config.js, il cliente avrebbe visto 1 € e pagato 169. */
const CATALOGO = {
  blade:   { nome: 'Blade',   prezzo:   100, immagine: 'images/blade-transparent.png' },   /* vero: 16900 */
  vulcano: { nome: 'Vulcano', prezzo:   100, immagine: 'images/vulcano-transparent.png' }, /* vero: 18900 */
  bombato: { nome: 'Bombato', prezzo:   100, immagine: 'images/bombato-transparent.png' }  /* vero: 14900 */
};
/* i prezzi sono in CENTESIMI: Stripe lavora sempre in centesimi */

const SPEDIZIONE = {
  /* sogliaGratis in centesimi; null = non e' mai gratis.
     DEVE restare allineato alle zone di js/shop-config.js. */
  IT: { costo:    0, sogliaGratis:     0, nome: 'Italia',          giorniMin: 2, giorniMax:  3 },   /* sempre gratis */
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

/* ⚠️ Versione dell'API Stripe FISSATA, non lasciata al default del conto.
   Il modulo incorporato nasce da due pezzi che devono parlare la stessa
   lingua: la sessione creata qui e lo script caricato in checkout.html
   (https://js.stripe.com/dahlia/stripe.js). Con la versione "dahlia" i nomi
   sono ui_mode 'embedded_page' e createEmbeddedCheckoutPage(); con le
   versioni precedenti erano 'embedded' e initEmbeddedCheckout(). Se un giorno
   si cambia versione, vanno cambiati INSIEME qui e in checkout.html. */
const STRIPE_VERSIONE = '2026-03-25.dahlia';

async function chiamaStripe(percorso, corpo, chiave) {
  const r = await fetch(`https://api.stripe.com/v1/${percorso}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${chiave}`,
      'Stripe-Version': STRIPE_VERSIONE,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: aFormData(corpo).toString()
  });
  const dati = await r.json();
  if (!r.ok) throw new Error(dati.error?.message || `Stripe ha risposto ${r.status}`);
  return dati;
}

/* ============================================================ crea-sessione

   CASSA INCORPORATA (dal 16 settembre 2026)
   Prima il cliente compilava un modulo nostro e poi Stripe gli richiedeva
   indirizzo e telefono: due volte le stesse cose. Adesso il modulo e' uno
   solo, quello di Stripe, montato DENTRO checkout.html. Il cliente non esce
   mai da shapeless.shop, e i dati della carta restano comunque solo a Stripe.

   Dal sito arrivano: gli articoli (id, colore, quantita'), la zona di
   spedizione scelta con i tre bottoni in cima alla cassa, e il numero
   d'ordine. Tutto il resto (email, nome, indirizzo, telefono, partita IVA)
   lo raccoglie Stripe.

   PERCHE' LA ZONA SI SCEGLIE SUL SITO
   Il modulo incorporato di Stripe non permette di cambiare il costo di
   spedizione dopo che il cliente ha scritto l'indirizzo. Allora si fa al
   contrario: la zona si sceglie prima (Italia e' gia' selezionata, quindi
   9 clienti su 10 non toccano niente) e l'indirizzo che Stripe accetta e'
   LIMITATO ai paesi di quella zona. Nessuno puo' pagare la spedizione
   italiana e farsi mandare il pacco in Svizzera: il modulo non glielo lascia
   scrivere.                                                                 */

const DOMINIO = 'https://shapeless.shop';

/* i 9 colori della palette: servono solo a scegliere l'immagine giusta
   (images/stripe/<prodotto>-<hex>.png). Un colore sconosciuto non rompe
   niente: si usa l'immagine senza pallino. */
const COLORI_HEX = ['a3444d','91535d','bcbfb0','646666','d8d0cd','e7cac0','346371','00924f','5b644f'];

function paesiDellaZona(zona) {
  if (zona === 'IT') return ['IT'];
  if (zona === 'EU') return PAESI_EU.filter(p => p !== 'IT');
  return PAESI_SERVITI.filter(p => !PAESI_EU.includes(p));
}

function immagineStripe(id, coloreHex) {
  const hex = String(coloreHex || '').replace('#', '').toLowerCase();
  const file = COLORI_HEX.includes(hex) ? `${id}-${hex}.png` : `${id}.png`;
  return `${DOMINIO}/images/stripe/${file}`;
}

async function creaSessione(richiesta, env, origine) {
  const corpo = await richiesta.json();
  const articoli = Array.isArray(corpo.articoli) ? corpo.articoli : [];

  if (!articoli.length) return json({ errore: 'Carrello vuoto.' }, 400, origine);
  if (articoli.length > 20) return json({ errore: 'Troppi articoli.' }, 400, origine);

  /* zona: 'IT' | 'EU' | 'XX'. Si accetta anche il vecchio "cliente.paese"
     per non rompere una pagina rimasta in cache nel browser di qualcuno. */
  let zonaId = String(corpo.zona || '').toUpperCase();
  const paeseScelto = String(corpo.paese || corpo.cliente?.paese || '').toUpperCase();
  if (paeseScelto) {
    if (!PAESI_SERVITI.includes(paeseScelto)) {
      return json({ errore: 'Non spediamo ancora in questo paese. Scrivici e troviamo una soluzione.' },
                  400, origine);
    }
    zonaId = zonaDi(paeseScelto);
  }
  if (!SPEDIZIONE[zonaId]) zonaId = 'IT';

  /* --- righe d'ordine, con i NOSTRI prezzi --- */
  let subtotale = 0;
  const righe = [];

  for (const a of articoli) {
    const p = CATALOGO[a.id];
    if (!p) return json({ errore: `Prodotto sconosciuto: ${a.id}` }, 400, origine);

    const qty = Math.max(1, Math.min(20, parseInt(a.qty, 10) || 1));
    subtotale += p.prezzo * qty;

    const colore = String(a.colore || '').slice(0, 40);

    righe.push({
      quantity: qty,
      price_data: {
        currency: 'eur',
        unit_amount: p.prezzo,
        product_data: {
          name: p.nome + (colore ? ` — ${colore}` : ''),
          description: 'Vaso in PLA vegetale, prodotto on demand. ' +
                       'Inserto Hidden Nest in vetro incluso.',
          /* il disegno a tratto con il pallino del colore scelto */
          images: [immagineStripe(a.id, a.coloreHex)]
        }
      }
    });
  }

  /* --- spedizione --- */
  const zona = SPEDIZIONE[zonaId];
  const costoSped = (zona.sogliaGratis !== null && subtotale >= zona.sogliaGratis)
                    ? 0 : zona.costo;

  /* --- la sessione --- */
  /* ⚠️ NIENTE payment_method_types imposti da qui.
     Se anche UNO dei metodi elencati non e' attivo sul conto Stripe, Stripe
     rifiuta l'INTERA richiesta. E' successo al primo collaudo. Omettendolo,
     Stripe usa i metodi accesi nel pannello (Impostazioni → Metodi di
     pagamento) e quelli non disponibili spariscono da soli.
     ⚠️ Apple Pay, Google Pay, PayPal e Klarna nel modulo INCORPORATO
     compaiono solo se il dominio shapeless.shop e' registrato in Stripe:
     Impostazioni → Metodi di pagamento → Domini dei metodi di pagamento. */
  const sessione = await chiamaStripe('checkout/sessions', {
    mode: 'payment',
    /* CASSA NOSTRA (dal 16/09 pomeriggio): i campi di contatto e indirizzo li
       disegniamo noi in checkout.html, nell'ordine che vogliamo e sempre
       visibili; Stripe mette solo il riquadro dei metodi di pagamento.
       ⚠️ In questa modalita' Stripe NON accetta custom_fields, custom_text e
       tax_id_collection: note, SDI e dati fattura arrivano con /dettagli-ordine
       e finiscono nei metadata. */
    ui_mode: 'elements',
    locale: 'it',

    line_items: righe,

    /* Metodi che Stripe accende da solo ma che in Italia non usa nessuno
       (Olanda, Belgio, Austria): allungano l'elenco e confondono.
       Si ESCLUDONO invece di elencare quelli ammessi, perche' un elenco di
       ammessi con un metodo spento sul conto fa fallire la sessione (vedi sotto).
       Se un giorno servono, basta toglierli da qui. */
    excluded_payment_method_types: ['ideal', 'bancontact', 'eps'],

    /* niente account: Stripe crea un cliente al volo */
    customer_creation: 'always',

    /* Stripe raccoglie l'indirizzo, solo nei paesi della zona scelta */
    shipping_address_collection: { allowed_countries: paesiDellaZona(zonaId) },
    phone_number_collection: { enabled: true },

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

    metadata: {
      numeroOrdine: String(corpo.numeroOrdine || '').slice(0, 40),
      zona:         zonaId,
      colori:       articoli.map(a => `${a.id}:${a.colore || '-'}×${a.qty}`).join(' | ').slice(0, 480)
    },

    /* la ricevuta parte da Stripe, senza che dobbiamo mandare email noi */
    invoice_creation: { enabled: true },

    /* un'ora: il modulo resta aperto anche a chi si distrae */
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,

    /* dopo il pagamento Stripe porta qui, sostituendo {CHECKOUT_SESSION_ID} */
    /* da localhost (prove sul PC) si torna a localhost, altrimenti al sito */
    return_url: (origine.startsWith('http://') ? origine : DOMINIO) +
                '/ordine-ricevuto.html?sessione={CHECKOUT_SESSION_ID}'
  }, env.STRIPE_SECRET_KEY);

  return json({ clientSecret: sessione.client_secret, id: sessione.id }, 200, origine);
}

/* ============================================================ dettagli-ordine

   POST /dettagli-ordine
   Poco prima del pagamento la cassa manda qui le cose che Stripe, in questa
   modalita', non raccoglie: note per il corriere e dati per la fattura.
   Finiscono nei metadata della sessione, e da li' nel pagamento su Stripe
   e nel webhook. Si accettano solo questi campi, tagliati a lunghezza fissa. */

async function dettagliOrdine(richiesta, env, origine) {
  const c = await richiesta.json();
  const id = String(c.id || '');
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) {
    return json({ errore: 'Sessione non valida.' }, 400, origine);
  }
  const t = (v, n) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Stripe-Version': STRIPE_VERSIONE,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: aFormData({
      metadata: {
        note:           t(c.note, 400),
        fattura:        c.fattura ? 'si' : 'no',
        ragioneSociale: c.fattura ? t(c.ragioneSociale, 120) : '',
        piva:           c.fattura ? t(c.piva, 20).toUpperCase() : '',
        sdi:            c.fattura ? t(c.sdi, 80) : ''
      }
    }).toString()
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error?.message || `Stripe ha risposto ${r.status}`);
  }
  return json({ ok: true }, 200, origine);
}

/* ============================================================ stato-sessione

   GET /stato-sessione?id=cs_...
   La pagina di ringraziamento chiede qui com'e' andata, per mostrare nome,
   email e indirizzo. Risponde solo il minimo, e solo per un identificativo
   di sessione: e' una stringa lunga e casuale che conosce solo chi ha pagato.
   Non fa fede per la produzione — quello resta il webhook.                  */

async function statoSessione(url, env, origine) {
  const id = url.searchParams.get('id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) {
    return json({ errore: 'Sessione non valida.' }, 400, origine);
  }

  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, {
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Stripe-Version': STRIPE_VERSIONE
    }
  });
  const s = await r.json();
  if (!r.ok) return json({ errore: 'Sessione non trovata.' }, 404, origine);

  const sped = s.collected_information?.shipping_details || s.shipping_details || null;

  return json({
    stato:      s.status,                       // 'complete' | 'open' | 'expired'
    pagato:     s.payment_status === 'paid',
    numero:     s.metadata?.numeroOrdine || '',
    nome:       sped?.name || s.customer_details?.name || '',
    email:      s.customer_details?.email || '',
    indirizzo:  sped?.address || null,
    totale:     s.amount_total,
    spedizione: s.total_details?.amount_shipping ?? null
  }, 200, origine);
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

/* il valore di un campo libero del modulo Stripe (SDI, note) */
function campo(s, chiave) {
  const c = (s.custom_fields || []).find(f => f.key === chiave);
  return c?.text?.value || '';
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
      ragioneSociale: s.metadata?.ragioneSociale || s.customer_details?.business_name || '',
      pivaRaccolta: s.metadata?.piva || s.customer_details?.tax_ids?.[0]?.value || '',
      sdi:        s.metadata?.sdi || campo(s, 'sdi'),
      colori:     s.metadata?.colori,
      note:       s.metadata?.note || campo(s, 'notecorriere')
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

      if (url.pathname === '/dettagli-ordine' && richiesta.method === 'POST') {
        if (!ORIGINI_AMMESSE.includes(origine)) {
          return json({ errore: 'Origine non ammessa.' }, 403, origine);
        }
        return await dettagliOrdine(richiesta, env, origine);
      }

      if (url.pathname === '/stato-sessione' && richiesta.method === 'GET') {
        return await statoSessione(url, env, origine);
      }

      if (url.pathname === '/webhook' && richiesta.method === 'POST') {
        return await webhook(richiesta, env);
      }

      return new Response('Shapeless — servizio pagamenti attivo.', { status: 200 });

    } catch (e) {
      /* Il messaggio per il cliente resta generico. Il motivo vero va nei log
         (visibili con "npx wrangler tail") e, in piu', in un campo separato
         della risposta: senza quello il primo collaudo e' stato mezz'ora di
         tentativi al buio davanti a un "500" muto. Non e' un dato sensibile —
         sono messaggi tipo "the payment method type X is invalid" — mentre la
         chiave e i dati del conto non passano mai di qui. */
      console.error('crea-sessione:', e && e.message, e);
      return json({
        errore: 'Non siamo riusciti ad aprire il pagamento. Riprova.',
        dettaglio: (e && e.message) ? String(e.message).slice(0, 300) : 'errore sconosciuto'
      }, 500, origine);
    }
  }
};
