/* ===========================================================================
   SHAPELESS — Iscrizione newsletter + email di benvenuto          04/10/2026
   ---------------------------------------------------------------------------
   Cosa fa:
   - POST /iscrizione      (dal sito, js/main.js) salva l'iscritto nell'archivio
                           D1 del pannello (tabella "iscritti") e gli manda
                           l'email di benvenuto da info@shapeless.shop, con
                           nome (ricavato dall'email se si capisce), codice sconto e (se li ha guardati) i design.
   - GET  /disiscriviti    pagina con il pulsante "Annulla l'iscrizione".
   - POST /disiscriviti    annulla davvero (anche "one-click" dal client di posta).

   Servono: il collegamento D1 "DB" (c'e' gia') e il segreto RESEND_API_KEY
   (AGGIORNA-CHIAVE-EMAIL.bat). Senza chiave l'iscrizione si salva lo stesso,
   solo l'email non parte (l'iscritto resta con "email inviata = no").

   Privacy: si salva email, nome (se si ricava dall'email), lingua, design guardati e data.
   Dell'indirizzo IP resta solo un codice a senso unico, usato per frenare chi
   abusa del modulo; non e' leggibile.
   =========================================================================== */

const CODICE_BENVENUTO = 'FIRSTSH';
const SITO = 'https://shapeless.shop';
const MITTENTE = 'Shapeless <info@shapeless.shop>';
const AVVISO_A = 'angelolare@gmail.com';

/* design che si possono "ricordare" nell'email (id usato dal sito -> scheda) */
const DESIGN = {
  'bombato':       { nome: 'Bombato',       pagina: 'prodotto-bombato.html',       foto: 'images/email-design/bombato.png' },
  'vulcano':       { nome: 'Vulcano',       pagina: 'prodotto-vulcano.html',       foto: 'images/email-design/vulcano.png' },
  'blade':         { nome: 'Blade',         pagina: 'prodotto-blade.html',         foto: 'images/email-design/blade.png' },
  'spira':         { nome: 'Spira',         pagina: 'prodotto-spira.html',         foto: 'images/email-design/spira.png' },
  'vulcano-light': { nome: 'Vulcano Light', pagina: 'prodotto-vulcano-light.html', foto: 'images/email-design/vulcano-light.png' },
  'starlight':     { nome: 'Starlight',     pagina: 'prodotto-starlight.html',     foto: 'images/email-design/starlight.png' }
};
const MAX_DESIGN_NELLA_MAIL = 2;
/* se non ha guardato nessun design: questi tre, nell'ordine */
const VETRINA = ['bombato', 'vulcano', 'blade'];

const pulisci = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------------ archivio */

let pronto = false;
export async function preparaIscritti(db) { return prepara(db); }
async function prepara(db) {
  if (pronto) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS iscritti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      nome TEXT DEFAULT '',
      lingua TEXT DEFAULT 'it',
      visti TEXT DEFAULT '',
      creato INTEGER NOT NULL,
      token TEXT NOT NULL,
      disiscritto INTEGER DEFAULT 0,
      email_inviata INTEGER DEFAULT 0,
      email_errore TEXT DEFAULT '',
      ip TEXT DEFAULT '',
      sid TEXT DEFAULT ''
    )`).run();
  try { await db.prepare("ALTER TABLE iscritti ADD COLUMN sid TEXT DEFAULT ''").run(); } catch (e) { /* colonna gia' presente */ }
  await db.prepare('CREATE INDEX IF NOT EXISTS isc_ip ON iscritti (ip, creato)').run();
  pronto = true;
}

function casuale() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

async function codiceIp(richiesta) {
  const ip = richiesta.headers.get('CF-Connecting-IP') || '';
  if (!ip) return '';
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('shp-newsletter|' + ip));
  return Array.from(new Uint8Array(d).slice(0, 8), b => b.toString(16).padStart(2, '0')).join('');
}

/* "marco" -> "Marco", "anna maria" -> "Anna Maria"; solo lettere, spazi, apostrofo, trattino */
function nomePulito(v) {
  const n = pulisci(v, 40).replace(/[^\p{L}\s'’-]/gu, '').replace(/\s+/g, ' ').trim();
  if (!n) return '';
  return n.split(' ').map(p => p.charAt(0).toLocaleUpperCase('it') + p.slice(1).toLocaleLowerCase('it')).join(' ');
}

/* Il nome non si chiede nel form (le persone sono pigre): lo si ricava dall'indirizzo email.
   Si cerca un nome di battesimo nella parte prima della @ ("marco.rossi", "annabianchi85",
   "angelolare" -> Angelo). Se non si trova niente di sensato il saluto resta generico ("Ciao,").
   Meglio un nome sbagliato ogni tanto che nessuno: scelta di Angelo. */
const NOMI = new Set(`
andrea angelo antonio alessandro alessio alberto aldo alfredo amedeo antonino armando arturo attilio augusto beniamino benedetto bruno carlo
carmelo cesare christian claudio corrado cristian cristiano damiano daniele danilo dario davide diego dino domenico donato edoardo elia emanuele
emilio enrico enzo ettore eugenio fabio fabrizio federico felice ferdinando filippo flavio francesco franco gabriele gaetano gennaro giacomo
gianluca gianni giancarlo gianmarco gino giorgio giovanni giulio giuseppe gregorio guido gustavo ignazio ivan jacopo leonardo leone lorenzo luca
luciano lucio luigi manuel manuele marcello marco mario martino massimiliano massimo matteo mattia maurizio mauro michele mirko nicola nicolo
nunzio oliviero omar orlando oscar osvaldo paolo pasquale patrizio piero pierluigi pietro raffaele raimondo renato renzo riccardo roberto rocco
rodolfo romano romeo ruggero salvatore samuele sandro santo saverio sebastiano sergio silvio simone stefano tiziano tommaso ugo umberto
valentino valerio vincenzo vito vittorio walter yuri
adele adriana agata agnese alba alessandra alice alida amalia anastasia angela angelica anna annalisa annamaria antonella antonia arianna
aurora barbara beatrice benedetta bianca camilla carla carmela carmen carolina caterina cecilia chiara cinzia claudia clara clelia concetta
cristina daniela debora deborah diana donatella doriana eleonora elena eliana elisa elisabetta elvira emanuela emma erica ester eva fabiana
federica fiorella flavia francesca gabriella gaia giada gianna ginevra gioia giorgia giovanna giulia giuliana giusy giusi grazia greta ida
ilaria imma irene iris isabella jessica laura lavinia letizia lia licia lidia lina linda lisa lorena loredana lorella lucia luciana lucrezia
ludovica luisa maddalena manuela mara marcella margherita maria mariagrazia marina marisa marta martina matilde maura melissa michela milena
miriam monica morena nadia natalia nicoletta noemi nora olga ornella paola patrizia paula pamela rachele raffaella rebecca renata rita roberta
romina rosa rosalia rosanna rosaria rossella sabrina samantha sandra sara serena silvana silvia simona sofia sonia stefania stella susanna
tania teresa tiziana valentina valeria vanessa vera veronica viola virginia vittoria wanda zaira
alex john james michael david daniel paul peter thomas mark steven kevin brian jason jack tom ben sam max leo oliver george harry william
robert richard charles joseph lucas emily olivia sophie sophia charlotte amelia hannah julia sarah kate katie jane mary jennifer lauren megan
natalie stephanie victoria juan carlos jose pedro pablo miguel luis ana jean pierre michel francois louis marie claire hans klaus stefan
jurgen andreas florian lukas anja katrin sabine petra ivana igor dmitri natasha ali ahmed mohamed youssef fatima layla nour
`.split(/\s+/).filter(Boolean));
const NOMI_PER_LUNGHEZZA = Array.from(NOMI).sort((a, b) => b.length - a.length);
const NON_NOMI = new Set(['info', 'mail', 'email', 'posta', 'admin', 'ufficio', 'office', 'contatti', 'contact', 'hello', 'ciao', 'test',
  'shop', 'store', 'vendite', 'ordini', 'amministrazione', 'segreteria', 'studio', 'design', 'arredi', 'casa', 'noreply', 'no', 'user',
  'support', 'sales', 'team', 'service', 'servizio', 'assistenza', 'azienda', 'lavoro', 'privato', 'personale']);

export function nomeDaEmail(email) {
  const locale = String(email || '').split('@')[0].toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  const pezzi = locale.split(/[._\-+]/).map(p => p.replace(/[0-9]/g, '')).filter(p => p.length > 1);
  const bella = n => n.charAt(0).toLocaleUpperCase('it') + n.slice(1);

  /* 1) uno dei pezzi e' proprio un nome ("marco.rossi", "rossi.marco") */
  for (const p of pezzi.slice(0, 3)) if (NOMI.has(p)) return bella(p);
  /* 2) il nome sta attaccato al resto ("angelolare", "mariorossi", "giuliabianchi"): il piu' lungo che combacia all'inizio */
  const p0 = pezzi[0] || '';
  for (const n of NOMI_PER_LUNGHEZZA) {
    if (n.length >= 4 && p0.length > n.length && p0.startsWith(n)) return bella(n);
  }
  /* 3) con un separatore ("xxx.yyy") il primo pezzo e' quasi sempre il nome, anche se non lo conosco */
  if (pezzi.length >= 2 && /^[a-z]{3,14}$/.test(p0) && /[aeiou]/.test(p0) && !/[^aeiou]{5}/.test(p0) && !NON_NOMI.has(p0)) return bella(p0);
  return '';
}

/* ------------------------------------------------------------------ email */

function testi(lingua, nome, design, link) {
  const en = lingua === 'en';
  const saluto = nome
    ? (en ? `Dear ${nome},` : `Gent.ma/o ${nome},`)
    : (en ? 'Hello,' : 'Ciao,');
  return {
    oggetto: en ? 'Welcome to the Shapeless world' : 'Ti diamo il benvenuto nel mondo Shapeless',
    saluto,
    intro: en ? 'welcome to the Shapeless world. Thank you for subscribing.'
              : 'ti diamo il benvenuto nel mondo Shapeless. Grazie per esserti iscritto.',
    codiceTitolo: en ? 'A reminder of your code for your first purchase' : 'Ti ricordiamo il tuo codice sconto per il primo acquisto',
    codiceNota: en ? '10% off your first order. At checkout, click “Have a discount code?” and enter it.'
                   : '10% sul tuo primo ordine. In cassa clicca su “Hai un codice sconto?” e inseriscilo.',
    designTitolo: design.length > 1
      ? (en ? 'The designs you looked at' : 'I design che hai guardato')
      : (en ? 'The design you looked at' : 'Il design che hai guardato'),
    designBtn: en ? 'See it again' : 'Rivedilo',
    ricordoTitolo: en ? 'A reminder of our designs' : 'Ti ricordiamo i nostri design',
    ricordoBtn: en ? 'Discover' : 'Scopri',
    tuttiBtn: en ? 'See all designs' : 'Vedi tutti i design',
    chiusura: en ? 'New shapes and new colours will reach you first.'
                 : 'Nuove forme e nuovi colori li riceverai prima di tutti.',
    firma: en ? 'The Shapeless team' : 'Shapeless',
    perche: en ? 'You receive this email because you subscribed to the newsletter on shapeless.shop.'
               : 'Ricevi questa email perché ti sei iscritto alla newsletter su shapeless.shop.',
    annulla: en ? 'Unsubscribe' : 'Annulla l’iscrizione',
    rispondi: en ? 'You can reply to this email: it arrives to us.' : 'Puoi rispondere a questa email: arriva a noi.',
    vai: link
  };
}

function componiEmail(iscritto, designIds, urlDisiscrizione) {
  const lingua = iscritto.lingua === 'en' ? 'en' : 'it';
  const design = designIds.map(id => DESIGN[id]).filter(Boolean).slice(0, MAX_DESIGN_NELLA_MAIL);
  const T = testi(lingua, iscritto.nome, design, urlDisiscrizione);
  const utm = '?utm_source=newsletter&utm_medium=email&utm_campaign=benvenuto';

  /* Design visti: solo quelli. Se non ne ha guardato nessuno: "Ti ricordiamo i nostri design" con tre in vetrina. */
  const visti = design.length > 0;
  const mostra = visti ? design : VETRINA.map(id => DESIGN[id]);
  const btn = visti ? T.designBtn : T.ricordoBtn;
  const titoloBlocco = visti ? T.designTitolo : T.ricordoTitolo;
  const bloccoDesign = `
    <tr><td style="padding:8px 32px 8px;">
      <p style="margin:0 0 14px;font:600 11px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6b1f45;">${esc(titoloBlocco)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      ${mostra.map(d => `
        <td align="center" valign="top" width="${Math.floor(100 / mostra.length)}%" style="padding:0 6px 8px;">
          <a href="${SITO}/${d.pagina}${utm}" style="text-decoration:none;color:#0a0a0a;">
            <img src="${SITO}/${d.foto}" height="${visti ? 200 : 160}" alt="${esc(d.nome)}" style="display:block;height:${visti ? 200 : 160}px;width:auto;max-width:100%;border:0;margin:0 auto 8px;">
            <span style="font:600 15px/1.3 Arial,Helvetica,sans-serif;color:#0a0a0a;">${esc(d.nome)}</span>
          </a><br>
          <a href="${SITO}/${d.pagina}${utm}" style="display:inline-block;margin-top:6px;font:600 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6b1f45;text-decoration:underline;">${esc(btn)}</a>
        </td>`).join('')}
      </tr></table>
      ${visti ? '' : `<p style="margin:10px 0 0;text-align:center;"><a href="${SITO}/tutti-i-design.html${utm}" style="font:600 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6b1f45;text-decoration:underline;">${esc(T.tuttiBtn)}</a></p>`}
    </td></tr>`;

  const html = `<!doctype html>
<html lang="${lingua}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(T.oggetto)}</title></head>
<body style="margin:0;padding:0;background:#f5f5f3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f3;"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;">
    <tr><td align="center" style="padding:32px 32px 4px;"><a href="${SITO}/${utm}" style="text-decoration:none;"><img src="${SITO}/images/logo-shapeless-email.png" width="220" alt="Shapeless" style="display:block;width:220px;max-width:70%;height:auto;border:0;margin:0 auto;"></a></td></tr>
    <tr><td style="padding:24px 32px 8px;font:16px/1.65 Georgia,'Times New Roman',serif;color:#0a0a0a;">
      <p style="margin:0 0 14px;"><strong>${esc(T.saluto)}</strong></p>
      <p style="margin:0;">${esc(T.intro)}</p>
    </td></tr>
    <tr><td style="padding:16px 32px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#6b1f45;"><tr><td align="center" style="padding:26px 20px;">
        <p style="margin:0 0 12px;font:600 11px/1.5 Arial,Helvetica,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#f3e7ec;">${esc(T.codiceTitolo)}</p>
        <p style="margin:0 0 12px;font:600 28px/1.1 'Courier New',Courier,monospace;letter-spacing:.2em;color:#ffffff;">${CODICE_BENVENUTO}</p>
        <p style="margin:0;font:13px/1.55 Arial,Helvetica,sans-serif;color:#f3e7ec;">${esc(T.codiceNota)}</p>
      </td></tr></table>
    </td></tr>
    ${bloccoDesign}
    <tr><td style="padding:12px 32px 4px;font:16px/1.65 Georgia,'Times New Roman',serif;color:#0a0a0a;">
      <p style="margin:0 0 6px;">${esc(T.chiusura)}</p>
      <p style="margin:18px 0 0;font:600 13px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;">${esc(T.firma)}</p>
    </td></tr>
    <tr><td align="center" style="padding:28px 32px 32px;font:12px/1.6 Arial,Helvetica,sans-serif;color:#7a7370;">
      ${esc(T.perche)}<br>${esc(T.rispondi)}<br>
      <a href="${esc(T.vai)}" style="color:#7a7370;text-decoration:underline;">${esc(T.annulla)}</a><br>
      Shapeless di Larecchiuta Angelo · Caltanissetta · <a href="${SITO}" style="color:#7a7370;">shapeless.shop</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const testo = [
    T.saluto, '', T.intro, '',
    T.codiceTitolo + ': ' + CODICE_BENVENUTO, T.codiceNota, '',
    titoloBlocco + ':', ...mostra.map(d => `- ${d.nome}: ${SITO}/${d.pagina}${utm}`), ...(visti ? [] : [`${T.tuttiBtn}: ${SITO}/tutti-i-design.html${utm}`]), '',
    T.chiusura, T.firma, '',
    '--', T.perche, T.annulla + ': ' + T.vai
  ].join('\n');

  return { oggetto: T.oggetto, html, testo };
}

async function mandaConResend(env, corpo) {
  if (!env.RESEND_API_KEY) return { ok: false, errore: 'chiave Resend non caricata' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      return { ok: false, errore: String(d.message || `Resend ha risposto ${r.status}`).slice(0, 200) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, errore: String(e && e.message || e).slice(0, 200) };
  }
}

/* ------------------------------------------------------------------ POST /iscrizione */

export async function iscrizioneNewsletter(richiesta, env, origineAmmessa, rispondi) {
  /* rispondi(dati, stato): costruisce la risposta con le intestazioni CORS del worker */
  if (!origineAmmessa) return rispondi({ ok: false, errore: 'Origine non ammessa.' }, 403);
  const db = env.DB || env.shapeless_pannello || null;
  if (!db) return rispondi({ ok: false, errore: 'Archivio non disponibile.' }, 503);

  let c;
  try {
    const testo = await richiesta.text();
    if (testo.length > 3000) return rispondi({ ok: false, errore: 'Richiesta troppo grande.' }, 413);
    c = JSON.parse(testo);
  } catch (e) { return rispondi({ ok: false, errore: 'Richiesta non valida.' }, 400); }

  const email = pulisci(c.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return rispondi({ ok: false, errore: 'Email non valida.' }, 400);
  /* il nome non si chiede nel form: se arriva lo si usa, altrimenti si prova a ricavarlo dall'email */
  const nome = nomePulito(c.nome) || nomeDaEmail(email);
  const lingua = c.lingua === 'en' ? 'en' : 'it';
  /* codice casuale della visita (lo stesso delle statistiche): serve al Pannello per sapere quanto era interessato chi si iscrive */
  const sid = pulisci(c.sid, 24).replace(/[^a-f0-9]/gi, '');
  /* i design arrivano dal dispositivo dell'iscritto: si tengono solo quelli veri, gli ultimi due, senza doppioni */
  const visti = [];
  (Array.isArray(c.visti) ? c.visti : []).slice(-12).forEach(id => {
    const k = pulisci(id, 30);
    if (DESIGN[k]) { const i = visti.indexOf(k); if (i >= 0) visti.splice(i, 1); visti.push(k); }
  });
  const mostrati = visti.slice(-MAX_DESIGN_NELLA_MAIL).reverse();   /* dal piu' recente */

  try {
    await prepara(db);
    const ora = Date.now();
    const ip = await codiceIp(richiesta);

    /* freno: al massimo 6 iscrizioni all'ora dallo stesso indirizzo */
    if (ip) {
      const r = await db.prepare('SELECT COUNT(*) n FROM iscritti WHERE ip = ?1 AND creato > ?2').bind(ip, ora - 3600000).first();
      if (r && r.n >= 6) return rispondi({ ok: true, codice: CODICE_BENVENUTO, email: false }, 200);
    }

    const esiste = await db.prepare('SELECT id, token, disiscritto, email_inviata, creato FROM iscritti WHERE email = ?1').bind(email).first();
    let token, daInviare = true;
    if (esiste) {
      token = esiste.token;
      /* gia' iscritto e gia' scritto: non si rimanda l'email (si aggiorna solo il nome se prima mancava) */
      if (esiste.email_inviata && !esiste.disiscritto) daInviare = false;
      await db.prepare(`UPDATE iscritti SET disiscritto = 0,
          nome = CASE WHEN ?2 != '' THEN ?2 ELSE nome END, lingua = ?3,
          visti = CASE WHEN ?4 != '' THEN ?4 ELSE visti END,
          sid = CASE WHEN ?5 != '' THEN ?5 ELSE sid END WHERE id = ?1`)
        .bind(esiste.id, nome, lingua, visti.join(','), sid).run();
    } else {
      token = casuale();
      await db.prepare(`INSERT INTO iscritti (email, nome, lingua, visti, creato, token, ip, sid) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)`)
        .bind(email, nome, lingua, visti.join(','), ora, token, ip, sid).run();
    }

    let inviata = false;
    if (daInviare) {
      const base = new URL(richiesta.url).origin;
      const urlDis = `${base}/disiscriviti?t=${token}`;
      const m = componiEmail({ nome, lingua }, mostrati, urlDis);
      const esito = await mandaConResend(env, {
        from: env.EMAIL_NEWSLETTER || MITTENTE,
        to: [email], reply_to: 'info@shapeless.shop',
        subject: m.oggetto, html: m.html, text: m.testo,
        headers: { 'List-Unsubscribe': `<${urlDis}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
      });
      inviata = esito.ok;
      await db.prepare('UPDATE iscritti SET email_inviata = ?2, email_errore = ?3 WHERE email = ?1')
        .bind(email, esito.ok ? 1 : 0, esito.ok ? '' : esito.errore).run();

      /* avviso ad Angelo (se non parte non cambia nulla) */
      await mandaConResend(env, {
        from: env.EMAIL_NEWSLETTER || MITTENTE, to: [env.EMAIL_AVVISI || AVVISO_A],
        subject: 'Nuova iscrizione newsletter — ' + (nome || email),
        text: `Nuova iscrizione dal sito.\n\nNome: ${nome || '(non scritto)'}\nEmail: ${email}\nLingua: ${lingua}\nDesign guardati: ${mostrati.map(i => DESIGN[i].nome).join(', ') || 'nessuno'}\nEmail di benvenuto: ${esito.ok ? 'inviata' : 'NON inviata (' + esito.errore + ')'}`
      });
    }
    return rispondi({ ok: true, codice: CODICE_BENVENUTO, email: inviata }, 200);
  } catch (e) {
    console.error('iscrizione:', e && e.message);
    return rispondi({ ok: false, errore: 'Non siamo riusciti a registrare l’iscrizione.' }, 500);
  }
}

/* ------------------------------------------------------------------ /disiscriviti */

function paginaSemplice(titolo, corpoHtml) {
  return new Response(`<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(titolo)} — Shapeless</title></head>
<body style="margin:0;background:#f5f5f3;font:16px/1.65 Georgia,serif;color:#0a0a0a;">
<div style="max-width:480px;margin:12vh auto;padding:0 24px;text-align:center;">
<p style="font:600 18px Arial,sans-serif;letter-spacing:.38em;margin:0 0 32px;">SHAPELESS</p>${corpoHtml}</div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export async function disiscrizione(richiesta, env, url) {
  const db = env.DB || env.shapeless_pannello || null;
  const token = pulisci(url.searchParams.get('t'), 40).replace(/[^a-f0-9]/gi, '');
  if (!db || token.length < 16) return paginaSemplice('Link non valido', '<h1 style="font-weight:400">Link non valido</h1><p>Scrivici a <a href="mailto:info@shapeless.shop">info@shapeless.shop</a> e ti cancelliamo noi.</p>');
  await prepara(db);
  const riga = await db.prepare('SELECT id, disiscritto FROM iscritti WHERE token = ?1').bind(token).first();
  if (!riga) return paginaSemplice('Link non valido', '<h1 style="font-weight:400">Link non valido</h1><p>Scrivici a <a href="mailto:info@shapeless.shop">info@shapeless.shop</a> e ti cancelliamo noi.</p>');

  if (richiesta.method === 'POST') {
    await db.prepare('UPDATE iscritti SET disiscritto = 1 WHERE id = ?1').bind(riga.id).run();
    return paginaSemplice('Iscrizione annullata', '<h1 style="font-weight:400">Iscrizione annullata</h1><p>Non ti scriveremo più. Grazie per essere passato da Shapeless.</p><p><a href="' + SITO + '" style="color:#6b1f45;">Torna al sito</a></p>');
  }
  if (riga.disiscritto) return paginaSemplice('Iscrizione annullata', '<h1 style="font-weight:400">Iscrizione già annullata</h1><p><a href="' + SITO + '" style="color:#6b1f45;">Torna al sito</a></p>');
  return paginaSemplice('Annulla l’iscrizione',
    `<h1 style="font-weight:400">Vuoi annullare l’iscrizione?</h1><p>Non riceverai più le nostre email.</p>
     <form method="POST" action="/disiscriviti?t=${token}"><button type="submit" style="background:#6b1f45;color:#fff;border:0;padding:14px 26px;font:600 12px Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;cursor:pointer;">Annulla l’iscrizione</button></form>`);
}
