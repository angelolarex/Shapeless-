# Shapeless — Contesto Progetto Sito Web

## Il Brand

**Shapeless** è un brand italiano di oggetti decorativi (vasi, lampade) realizzati con stampa 3D e materiali ecosostenibili.

**Fondatore:** Angelo Larecchiuta — architetto siciliano, ha scoperto la modellazione parametrica durante un Erasmus in Germania nel 2016 e ha avviato il brand durante il Covid.

**Filosofia:** "Sei tu che diventi il designer del tuo acquisto." — prodotti non seriali, ogni pezzo prodotto su richiesta (on demand), niente stock, zero sprechi.

**Pillars del brand:**
- **Unicità** — ogni pezzo personalizzabile, prodotto su richiesta
- **Forma organica** — design parametrico, sculture ispirate alla natura e all'architettura
- **Sostenibilità** — materiale PLA (acido polilattico da mais/canna da zucchero), basso impatto

**Materiale:** PLA — biopolimero vegetale, leggero, resistente, impermeabile. Sconsigliato in esposizione solare prolungata. Riciclabile.

**Prodotti:** Vasi decorativi (es. Bombato, Blade, Vulcano) in PLA — stampa 3D. Anche lampade.

**Target:** Privati che cercano design unico, rivenditori, architetti/interior designer, creativi/designer.

---

## Dati Aziendali

- **Sito:** shapeless.shop
- **Email:** info@shapeless.shop
- **Tel:** +39 327 446 5586 / +39 0934 591960
- **Indirizzo:** Viale della Regione 32B, 93100 Caltanissetta (IT)
- **P.IVA:** 01927390854
- **Instagram:** @shapeless.di — https://www.instagram.com/shapeless.di/
- **Facebook:** https://www.facebook.com/Shapeless.di
- **Titolare:** Larecchiuta Angelo

---

## ⚠️ Home temporanea "Restyling in corso" (24/07)

**Stato attuale: `index.html` NON è la homepage vera.** È stata sostituita temporaneamente con una pagina "Restyling del sito in corso" bilingue (IT/EN), su richiesta dell'utente, in attesa che il restyling sia pronto.

- **La vera homepage è salvata in `index-home-completa.html`** (copia esatta del vecchio `index.html`, con hero 3D Blade). Per ripristinarla: rinominare/copiare `index-home-completa.html` sopra `index.html`.
- La pagina temporanea (`index.html` attuale) contiene:
  - Badge + headline bilingue ("Stiamo cambiando forma." / "We're changing shape.") con testo EN gestito dal sistema i18n esistente (`js/lang.js`, nuove chiavi `soon.*` aggiunte in fondo al dizionario `T.en`)
  - Sfondo animato con forme organiche sfocate in CSS (nessuna dipendenza esterna) + grana leggera, in tonalità neutre (niente bordeaux/accent, tolto su richiesta)
  - Box messaggio diretto: email + textarea, invio con bottone o premendo Invio (Shift+Invio per andare a capo). Usa lo stesso meccanismo Web3Forms degli altri form del sito (`data-form="restyling"`, gestito da `js/main.js`), quindi le email arrivano dove arrivano già tutte le altre: **`angelolare@gmail.com`** (vedi nota sotto "Form → Email" — impostare `info@shapeless.shop` come recipient in Web3Forms le blocca silenziosamente lato Google Workspace).
  - `<meta name="robots" content="noindex, follow">` per non far indicizzare da Google questa pagina temporanea al posto della vera home.
  - **Musica di sottofondo:** provata e poi rimossa (23-24/07). Era un motivo generato via Web Audio API (nessun file audio esterno reperibile: il sandbox di lavoro non ha accesso a domini come incompetech/Wikimedia/raw.githubusercontent per scaricare un mp3) — prima una melodia ritmica, poi un pad ambient lento, ma il risultato non convinceva ("suonava come una suoneria"). Rimossa su richiesta. Se in futuro si vuole della musica, la strada più affidabile è che l'utente carichi un vero file mp3 (es. in una cartella `audio/`) da collegare con un normale tag `<audio>`.
  - **Tasto lingua (EN):** su questa pagina il tasto veniva iniettato da `js/lang.js` proprio a ridosso del bordo destro dello schermo (comportamento del markup nav condiviso). Corretto con CSS scoped alla pagina (`.nav.nav-soon #lang-toggle`, posizione assoluta con margine dai bordi, responsive su tablet/mobile). Lo stile del pulsante (pillola bordeaux piena) resta invece una modifica *globale* in `css/style.css`, valida su tutte le pagine.
- **Meta title/description** di `index.html` attuale: "Shapeless | Restyling del sito in corso" — anche questi andranno ripristinati insieme al file.
- **Da ricordare:** quando il restyling è pronto, ripristinare `index-home-completa.html` come `index.html` e volendo eliminare la pagina temporanea (o tenerla da parte per un futuro riutilizzo).

---

## Struttura del Sito

Il sito è in HTML/CSS/JS puro (no framework). File principali nella cartella del progetto.

**Pagine:**
- `index.html` — **Attualmente la pagina temporanea "Restyling in corso"** (vedi sezione sopra). La vera homepage con hero wireframe Blade è salvata in `index-home-completa.html`
- `pagina-poligono.html` — Variante hero con Blade low-poly decostruito (Three.js, `vase_poly.js`)
- `pagina-torsione.html` — Variante hero pixel-art/grain con effetto torsione (Three.js, `vase_tors.js`)
- `chi-siamo.html` — Storia di Angelo, filosofia
- `il-mais.html` — Sostenibilità, il materiale PLA
- `shapeless-brand.html` — Manifesto del brand, i 3 pilastri
- `collab.html` — Hub collaborazioni (rivenditori, progetti, design partner)
- `hospitality.html` — Collaborazioni con studi architettura / interior design
- `creativi.html` — Collaborazioni con designer/creativi
- `rivenditori.html` — Pagina rivenditori
- `community.html` — Community
- `faq.html` — Domande frequenti
- `blog.html` — Blog
- `contatti.html` — Contatti
- `demo-3d.html` — Demo configuratore 3D
- `grazie.html` — Pagina di ringraziamento post-form (redirect da tutti i form)
- `articolo-materiali-stampa-3d-fdm.html` — Articolo blog: materiali stampa 3D FDM (non in nav, linkata da blog.html)
- `articolo-architettura-nel-design.html` — Articolo blog: architettura e design (non in nav, linkata da blog.html)
- `articolo-ia-strumenti-render.html` — Articolo blog: IA e render (non in nav, linkata da blog.html)
- `articolo-pla-design-futuro.html` — Articolo blog: PLA e design sostenibile (non in nav, linkata da blog.html)

**Struttura file:**
- `css/style.css` — Stile globale
- `js/main.js` — JavaScript
- `js/blade_geo.js` — Geometria wireframe Blade (39 catene polyline, usata in index.html)
- `js/poly_geo.js` — Mesh low-poly Blade decimata (1519 tri, usata in pagina-poligono.html)
- `js/vase3d.js` — Renderer Three.js per wireframe (index.html)
- `js/vase_poly.js` — Renderer Three.js per effetto Deconstructed Strips (pagina-poligono.html)
- `js/vase_tors.js` — Renderer Three.js per effetto pixel-art/grain (pagina-torsione.html), doppio render target (scena → texture bassa risoluzione → quad con shader)
- `js/tors_geo.js` — Geometria usata da vase_tors.js
- Tutti e tre i loop di rendering (`vase3d.js`, `vase_poly.js`, `vase_tors.js`) usano un `IntersectionObserver` sull'elemento `#hero3d`: il rendering si ferma quando la hero esce dal viewport e riparte quando rientra (fix scroll lento, 15/07)
- `images/` — Immagini
  - `bombato-transparent.png`, `blade-transparent.png`, `vulcano-transparent.png` — foto vasi con sfondo rimosso (trasparente) e ombra morbida sintetica aggiunta, usate in "I più amati" (index.html). Vulcano ha un ritaglio meno pulito (foto originale bianco su bianco, poco contrasto) — da sostituire con foto migliore se possibile.
  - `Shapeless 1-46_edited.jpg` — foto usata nella sezione "Palette soft" di index.html
  - `IMG_1291.jpg` — foto usata nella sezione "Palette Aura" (ex "Palette pop") di index.html. Ridimensionata il 15/07 da 6737×4491px/17MB a 1999×1333px/~190KB (era la causa principale dello scroll lento)
  - `IMG_5106.jpg` — foto di scorta della stessa sezione (non più referenziata in index.html dopo il passaggio a IMG_1291, ma ridimensionata comunque il 15/07 da 5067×3378px/8.6MB a 2000×1333px/~264KB nel caso serva altrove)
  - `Partner/partner-eh.png` — logo rivenditore "eh!" aggiunto il 15/07 in `rivenditori.html` (ritagliato dai margini bianchi dell'originale `Partner/EH .jpg`)
- `models/` — Modelli 3D (incluso `Blade h37.obj` — sorgente)
- `videos/` — Video

---

## Design System

**Tema:** Light (sfondo neutro-freddo, non caldo/crema)

**Colori:**
- `--bg: #f5f5f3` — sfondo principale (neutro, meno crema)
- `--bg2: #ececea` — sfondo secondario
- `--bg3: #e4e4e2` — sfondo terziario
- `--text: #0a0a0a` — testo principale
- `--text-muted: #4a4848` — testo secondario
- `--accent: #6b1f45` — bordeaux (accento principale)
- `--accent2: #8a3060` — bordeaux chiaro
- `--border: rgba(0,0,0,0.09)` — bordi

**Font — sistema Inter puro (zero serif):**
- Unico font: `Inter` (pesi 200, 300, 400, 500, 600, 700, 800)
- **NON si usa più Playfair Display**
- `--font-body` e `--font-serif` puntano entrambi a Inter

**Regola tipografica chiave — contrasto bold/ultralight:**
- `h1`: Inter 700 (bold) — la parola/frase secondaria in `<em>` diventa Inter 200 (ultralight, non italic)
- `h2`: Inter 200 (ultralight) di default — la parola chiave dentro `<strong>` diventa Inter 700 (bold)
- Questo crea un ritmo visivo premium in tutti i titoli, applicato sistematicamente in ogni pagina
- Esempio h1: `Forme che<br><em>trasformano</em><br>ogni spazio.`
- Esempio h2: `<strong>Design</strong> e armonia naturale`
- `.label`: 9px, letter-spacing 0.38em, uppercase, colore accent
- `body`: font-weight 300, font-size 15px

**Componenti chiave:**
- Nav fissa (sfondo quasi opaco, senza blur — rimosso il 15/07 per performance scroll), dropdown su hover con blur (invariato, non persistente durante lo scroll), hamburger mobile
- Nav padding allineato al contenuto hero: `clamp(110px, 11vw, 180px)`
- Hero content padding-left: `clamp(110px, 11vw, 180px)` — logo nav e testo hero allineati
- `.btn` — bottone outline | `.btn-accent` — bottone filled
- `.section` — padding 80px | `.section-sm` — padding 48px
- `.grid-2`, `.grid-3` — layout a colonne
- `.feature-grid` — 3 colonne per feature/pilastri
- `.card`, `.product-card`, `.press-card`
- `.press-card-img` — default quasi-quadrato (padding-bottom 82%), hover si allunga (130%) con effetto zoom
- `.press-pub-name` — Inter 700, uppercase, 13px, letter-spacing 0.10em
- `.product-card-title` — Inter 600, uppercase, 11px
- `.placeholder` — segnaposto grigio per immagini non ancora inserite
- `.page-header` — header pagine interne
- `.color-block` — sezione full-width con immagine di sfondo (in index.html "Palette soft"/"Palette Aura" — ex "Palette pop", rinominata il 15/07 — ora usa un layout `grid-2` contenuto in `.container`, non più `.color-block` full-bleed, per lasciare margini e leggibilità al testo)
- `.card-img--flat` — variante senza riquadro/sfondo per immagini con sfondo trasparente (usata per i vasi in "I più amati": vengono appoggiati direttamente sullo sfondo pagina, allineati alla base con `object-position: bottom`)
- Footer a 4 colonne con social, link, contatti

**Menu mobile (nav-mobile):** accordion, non più lista piatta sempre-aperta.
- Struttura: `.mob-group` contiene un `<button class="mob-section-title">` (con `.mob-chevron` che ruota) + `<div class="mob-sub">` che si apre/chiude al tocco (JS in `main.js`, un gruppo aperto alla volta)
- Usata per About / Collab / Community. "Collab" ora è solo un accordion (il link diretto alla pagina è il primo item dentro, "Panoramica Collab") — prima era ambiguo (link + titolo insieme)
- Rivenditori, Contatti, Demo 3D restano link diretti di primo livello (`<a>` senza accordion)
- Quando copi il blocco `nav-mobile` per una nuova pagina, copia la versione accordion aggiornata da una pagina esistente (es. `chi-siamo.html`), non una versione vecchia

**Lingua:** Italiano (con alcune frasi in inglese nel copy, es. "Together We Shape Design")

**Tono:** Premium, contemporaneo, minimalista, diretto. Ispirazione: Molteni, Nagami, Poltrona Frau.

---

## Deploy & Hosting

**Piattaforma attiva: GitHub Pages**
- Repository: `github.com/angelolarex/Shapeless-`
- URL pubblico: `https://angelolarex.github.io/Shapeless-/`
- Branch: `main`
- Per aggiornare il sito: carica i file su GitHub (Add file > Upload files) nella cartella corretta, poi aspetta 1-2 minuti che il deploy finisca (pallino verde su Actions)
- ⚠️ La cartella `models/` (167MB, contiene `Blade h37.obj` da 120MB) è esclusa da GitHub per il limite 25MB — l'animazione 3D funziona perché usa `js/blade_geo.js` che contiene la geometria precompilata

**Form → Email:**
- I form usano **Web3Forms** (AJAX via `js/main.js`) — funziona su qualsiasi hosting statico
- Account Web3Forms: `angelolare@gmail.com` (NON usare info@shapeless.shop come account login)
- Access key attiva: `3a7d3d19-a98c-4862-9524-8542e870b2ba`
- Linked email verificata: `info@shapeless.shop`
- Recipient configurato nelle Settings del form "Angelo": `angelolare@gmail.com` (le email arrivano qui, in spam la prima volta — segnarle come "non spam")
- ⚠️ Se si imposta `info@shapeless.shop` come recipient, Google Workspace blocca le email di Web3Forms silenziosamente
- I form attivi: `contatti`, `collab`, `creativi`, `hospitality`, `rivenditori`, `newsletter`, `restyling` (box messaggio diretto sulla home temporanea)
- Tutti i form reindirizzano a `grazie.html` dopo il submit (gestito da JS, non da POST diretto)
- I form nei file HTML hanno ancora `data-netlify="true"` come attributo residuo — non causa problemi

---

## Stato del Progetto

- Struttura e design completati
- Ottimizzazione mobile completa (CSS responsive, touch targets 44px, font-size 16px su input)
- Hero 3D (wireframe Blade) funzionante su desktop e mobile ✓
- Camera mobile zoom-out a Z=10.5 (era 7.5) per mostrare il modello completo senza tagli ✓
- Camera desktop spostata a X=-2.7 (era -1.8) per allineare meglio il vaso a destra rispetto al testo hero ✓
- Form collegati a Web3Forms → email a `angelolare@gmail.com` ✓
- Pagina ringraziamento `grazie.html` creata ✓
- Deploy su GitHub Pages attivo ✓
- Demo 3D presente (demo-3d.html)
- Presenze: Milano Home 2025, Design Week Milano, Fiera Vebo Napoli

**Blog:** 4 articoli reali (adattati dal vecchio blog Wix) pubblicati come pagine dedicate, linkate da `blog.html`:
materiali stampa 3D FDM, architettura nel design, IA & render, PLA e design del futuro. Non sono in nav, solo raggiungibili dai link della pagina blog. Immagini articolo ancora placeholder (il dominio Wix con le foto originali non era raggiungibile per il download).

**"I più amati" (index.html):** Bombato, Blade, Vulcano con foto reali, sfondo rimosso (trasparente, appoggiati sullo sfondo pagina) e ombra morbida sintetica. Vulcano ha un ritaglio meno pulito per via della foto originale a basso contrasto (bianco su bianco) — se si carica una foto migliore, andrebbe rifatto il ritaglio.

**Menu mobile:** rifatto come accordion (vedi sezione Design System) per risolvere confusione sulla vecchia versione a lista piatta sempre-espansa.

**Bug CSS risolto:** `css/style.css` aveva due parentesi graffe di chiusura mancanti (pre-esistenti, non recenti) che causavano l'annidamento scorretto di alcune media query responsive (tablet/mobile) — sistemate. Se in futuro le regole responsive sembrano non applicarsi correttamente, controllare per primo il bilanciamento delle `{ }` nel file.

**Fix scroll lento (15/07):** segnalato dall'utente come "scroll pesante" su index.html. Cause individuate e risolte:
1. `images/IMG_1291.jpg` (17MB, 6737×4491px) appena caricata nella sezione "Palette Aura" — ridimensionata a ~190KB
2. `images/IMG_5106.jpg` (8.6MB) della stessa sezione — ridimensionata a ~264KB per coerenza, anche se non più in uso diretto
3. I loop di rendering Three.js (`vase3d.js`, `vase_poly.js`, `vase_tors.js`) giravano su `requestAnimationFrame` senza mai fermarsi, anche a scroll lontano dalla hero — ora si mettono in pausa via `IntersectionObserver` quando `#hero3d` esce dal viewport
4. La nav fissa aveva `backdrop-filter: blur(12px)` sempre attivo, ricalcolato ad ogni frame di scroll — rimosso, sostituito con sfondo quasi opaco senza blur

Risultato confermato dall'utente: scroll molto più scorrevole. Se dovesse tornare pesante, il prossimo sospetto è il video hero (`videos/hero.mp4`, 4.4MB) con parallax via JS allo scroll.

**Rivenditori (15/07):** aggiunto logo partner "eh!" (`images/Partner/partner-eh.png`) in `rivenditori.html`, stessa gestione CSS (altezza 75px) degli altri loghi.

- Molte immagini ancora placeholder nelle pagine interne (chi-siamo, il-mais, collab, ecc. — da sostituire con foto reali)

---

## Coerenza del Template

**Regola fondamentale:** Qualsiasi modifica a colori (`--accent`, `--bg`, ecc.) o font in `css/style.css`
si applica automaticamente a tutte le pagine perché usano lo stesso foglio di stile.
Non servono modifiche pagina per pagina.

**Quando aggiungi una nuova pagina:**
1. Copia nav + nav-mobile (versione accordion aggiornata) + footer da una pagina esistente (es. `chi-siamo.html`)
2. Collega `css/style.css` e `js/main.js`
3. Se la pagina ha un form, aggiungi `data-form="nome-form"` al tag `<form>` — il JS gestisce tutto automaticamente via Web3Forms
4. Aggiungi la pagina in questo file MD

---

## Note per Continuare

- La cartella di lavoro del progetto è: `Desktop > 00 - SHAPELESS - Principale > 07-Sito > 02 - Restyling sito`
- Tutti i file HTML seguono la stessa struttura (nav + nav-mobile accordion + contenuto + footer)
- Quando si aggiungono pagine, replicare nav e footer esistenti
- I placeholder `<div class="placeholder">` vanno sostituiti con `<img>` quando le immagini sono pronte
- Il nav diventa hamburger sotto 900px (già gestito in CSS)

**Test in locale — occhio ai link che "non funzionano":** aprendo i file HTML direttamente col doppio click (`file://`), alcuni browser/software di sicurezza bloccano la navigazione da una pagina locale a un'altra (i link sembrano non fare nulla, ma il codice è corretto). Per testare in locale in modo affidabile, usare un mini server:
```
cd "percorso della cartella del sito"
py -m http.server 8000
```
poi aprire `http://localhost:8000/nomepagina.html` nel browser. Una volta caricato su GitHub Pages (https://) questo problema non si presenta.
