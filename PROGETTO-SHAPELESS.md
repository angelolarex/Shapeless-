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

**Prodotti:** Vasi decorativi (es. Torsione, Blade, Vulcano) in PLA — stampa 3D. Anche lampade.

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

## Struttura del Sito

Il sito è in HTML/CSS/JS puro (no framework). File principali nella cartella del progetto.

**Pagine:**
- `index.html` — Homepage con hero wireframe Blade (Three.js, `vase3d.js`)
- `pagina-poligono.html` — Variante hero con Blade low-poly decostruito (Three.js, `vase_poly.js`)
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

**Struttura file:**
- `css/style.css` — Stile globale
- `js/main.js` — JavaScript
- `js/blade_geo.js` — Geometria wireframe Blade (39 catene polyline, usata in index.html)
- `js/poly_geo.js` — Mesh low-poly Blade decimata (1519 tri, usata in pagina-poligono.html)
- `js/vase3d.js` — Renderer Three.js per wireframe (index.html)
- `js/vase_poly.js` — Renderer Three.js per effetto Deconstructed Strips (pagina-poligono.html)
- `images/` — Immagini
- `models/` — Modelli 3D (incluso `Blade h37.obj` — sorgente)
- `videos/` — Video

---

## Design System

**Colori (dark theme):**
- `--bg: #0d0d0d` — sfondo principale
- `--bg2: #161616` — sfondo secondario
- `--bg3: #1f1f1f` — sfondo terziario
- `--text: #f0ede8` — testo principale
- `--text-muted: #888880` — testo secondario
- `--accent: #c8b89a` — accento (beige caldo)
- `--accent2: #e8ddd0` — accento secondario
- `--border: #2a2a2a` — bordi

**Font:**
- Body: `Inter` (300, 400, 500, 600)
- Serif/titoli: `Playfair Display` (italic, 400, 600)

**Componenti chiave:**
- Nav fissa con blur, dropdown su hover, hamburger mobile
- `.btn` — bottone outline | `.btn-accent` — bottone filled
- `.section` — padding 80px | `.section-sm` — padding 48px
- `.grid-2`, `.grid-3` — layout a colonne
- `.feature-grid` — 3 colonne per feature/pilastri
- `.card`, `.product-card`, `.press-card`
- `.placeholder` — segnaposto grigio per immagini non ancora inserite
- `.page-header` — header pagine interne
- `.color-block` — sezione full-width con immagine di sfondo
- Footer a 4 colonne con social, link, contatti

**Lingua:** Italiano (con alcune frasi in inglese nel copy, es. "Apply Now", "Together We Shape Design")

**Tono:** Premium, contemporaneo, minimalista, diretto.

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
- I form attivi: `contatti`, `collab`, `creativi`, `hospitality`, `rivenditori`, `newsletter`
- Tutti i form reindirizzano a `grazie.html` dopo il submit (gestito da JS, non da POST diretto)
- I form nei file HTML hanno ancora `data-netlify="true"` come attributo residuo — non causa problemi

---

## Stato del Progetto

- Struttura e design completati
- Ottimizzazione mobile completa (CSS responsive, touch targets 44px, font-size 16px su input)
- Hero 3D (wireframe Blade) funzionante su desktop e mobile ✓
- Camera mobile zoom-out a Z=10.5 (era 7.5) per mostrare il modello completo senza tagli ✓
- Form collegati a Web3Forms → email a `angelolare@gmail.com` ✓
- Pagina ringraziamento `grazie.html` creata ✓
- Deploy su GitHub Pages attivo ✓
- Molte immagini ancora placeholder (da sostituire con foto reali)
- Demo 3D presente (demo-3d.html)
- Presenze: Milano Home 2025, Design Week Milano, Fiera Vebo Napoli

---

## Coerenza del Template

**Regola fondamentale:** Qualsiasi modifica a colori (`--accent`, `--bg`, ecc.) o font in `css/style.css`
si applica automaticamente a tutte le pagine perché usano lo stesso foglio di stile.
Non servono modifiche pagina per pagina.

**Quando aggiungi una nuova pagina:**
1. Copia nav + nav-mobile + footer da una pagina esistente (es. `chi-siamo.html`)
2. Collega `css/style.css` e `js/main.js`
3. Se la pagina ha un form, aggiungi `data-form="nome-form"` al tag `<form>` — il JS gestisce tutto automaticamente via Web3Forms
4. Aggiungi la pagina in questo file MD

---

## Note per Continuare

- La cartella di lavoro del progetto è: `Desktop > 00 - SHAPELESS - Principale > 07-Sito > 02 - Restyling sito`
- Tutti i file HTML seguono la stessa struttura (nav + nav-mobile + contenuto + footer)
- Quando si aggiungono pagine, replicare nav e footer esistenti
- I placeholder `<div class="placeholder">` vanno sostituiti con `<img>` quando le immagini sono pronte
- Il nav diventa hamburger sotto 900px (già gestito in CSS)
