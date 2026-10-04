/* ===========================
   SHAPELESS — Main JS
   =========================== */

document.addEventListener('DOMContentLoaded', function () {

  /* --- Mobile nav toggle --- */
  const toggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.nav-mobile');

  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      toggle.classList.toggle('open');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });

    // Chiudi il menu quando si clicca su un link (non sui bottoni accordion)
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });

    // Accordion: About / Collab / Community si aprono/chiudono al tocco
    mobileNav.querySelectorAll('.mob-section-title').forEach(btn => {
      btn.addEventListener('click', () => {
        const sub = btn.nextElementSibling;
        const isOpen = btn.classList.contains('open');
        // chiudi gli altri gruppi aperti (un accordion alla volta)
        mobileNav.querySelectorAll('.mob-section-title.open').forEach(other => {
          if (other !== btn) {
            other.classList.remove('open');
            if (other.nextElementSibling) other.nextElementSibling.classList.remove('open');
          }
        });
        btn.classList.toggle('open', !isOpen);
        if (sub) sub.classList.toggle('open', !isOpen);
      });
    });
  }

  /* --- Active nav link --- */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath) {
      link.style.color = 'var(--text)';
    }
  });

  /* --- FAQ accordion --- */
  document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', function () {
      const item = this.parentElement;
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-answer').style.maxHeight = '0';
      });

      // Open clicked if it was closed
      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  /* ─────────────────────────────────────────────────────────
     FORM SUBMIT — Web3Forms (AJAX)
     Invia a info@shapeless.shop via Web3Forms API.
     Funziona su qualsiasi hosting statico (GitHub Pages, Netlify, ecc.)
     ───────────────────────────────────────────────────────── */
  var W3F_KEY = '3a7d3d19-a98c-4862-9524-8542e870b2ba';

  /* ─────────────────────────────────────────────────────────
     DESIGN GUARDATI — serve solo all'email di benvenuto della newsletter.
     Sulle schede prodotto si segna sul dispositivo (localStorage) quali design
     hai aperto. Nulla parte finché non ti iscrivi alla newsletter: in quel caso
     l'elenco viaggia con l'iscrizione e l'email ti ricorda quei design.
     Non si segna nulla con "Do Not Track" o con ?noanalytics=1.
     ───────────────────────────────────────────────────────── */
  var WORKER_NL = 'https://shapeless-pagamenti.shapeless-shop.workers.dev';
  function leggiVisti() {
    try { var a = JSON.parse(localStorage.getItem('shp_visti') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  (function segnaVisto() {
    var m = location.pathname.match(/prodotto-([a-z0-9-]+)\.html$/);
    if (!m) return;
    try {
      if (navigator.doNotTrack === '1' || localStorage.getItem('shp_no_an') === '1') return;
      var a = leggiVisti().filter(function (x) { return x !== m[1]; });
      a.push(m[1]);
      localStorage.setItem('shp_visti', JSON.stringify(a.slice(-8)));
    } catch (e) {}
  })();

  /* Dopo l'iscrizione alla newsletter il codice di benvenuto compare subito, con tasto Copia.
     Si salva anche sul dispositivo: in cassa si applica da solo. */
  var CODICE_BENVENUTO = 'FIRSTSH';
  function mostraCodiceBenvenuto(form) {
    var en = false; try { en = localStorage.getItem('shapeless_lang') === 'en'; } catch (e) {}
    try { localStorage.setItem('shp_codice10', CODICE_BENVENUTO); } catch (e) {}
    var box = document.createElement('div');
    box.className = 'nl-codice';
    box.innerHTML =
      '<p class="nl-codice-t">' + (en ? 'Welcome — here is your code' : 'Benvenuto — ecco il tuo codice') + '</p>' +
      '<div class="nl-codice-riga"><code>' + CODICE_BENVENUTO + '</code>' +
      '<button type="button">' + (en ? 'Copy' : 'Copia') + '</button></div>' +
      '<p class="nl-codice-n">' + (en ? '10% off your first order. It will be applied automatically at checkout on this device.'
                                      : '10% sul tuo primo ordine. In cassa lo trovi già applicato su questo dispositivo.') + '</p>';
    form.parentNode.replaceChild(box, form);
    var b = box.querySelector('button');
    b.addEventListener('click', function () {
      var ok = function () { b.textContent = en ? 'Copied' : 'Copiato'; };
      try { navigator.clipboard.writeText(CODICE_BENVENUTO).then(ok, ok); } catch (e) { ok(); }
    });
  }

  /* Iscrizione newsletter: la registra il nostro servizio (salva l'iscritto e manda l'email di benvenuto).
     Se il servizio non risponde si ripiega su Web3Forms, cosi' l'iscrizione non va persa. */
  function iscriviNewsletter(form) {
    var en = false; try { en = localStorage.getItem('shapeless_lang') === 'en'; } catch (e) {}
    var campoNome = form.querySelector('[name="nome"]');
    var corpo = {
      email: (form.querySelector('[name="email"]') || {}).value || '',
      nome: campoNome ? campoNome.value : '',
      lingua: en ? 'en' : 'it',
      visti: leggiVisti(),
      sid: (function () { try { return sessionStorage.getItem('shp_sid') || ''; } catch (e) { return ''; } })()
    };
    return fetch(WORKER_NL + '/iscrizione', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo)
    }).then(function (res) { return res.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error('iscrizione');
      return j;
    });
  }

  function submitWeb3Form(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn._orig = btn._orig || btn.textContent; btn.disabled = true; btn.textContent = 'Invio in corso…'; }

      if (form.classList.contains('newsletter-form')) {
        iscriviNewsletter(form).then(function () {
          mostraCodiceBenvenuto(form);
        }).catch(function () {
          inviaWeb3(form, btn);   /* ripiego */
        });
        return;
      }
      inviaWeb3(form, btn);
    });
  }

  function inviaWeb3(form, btn) {
    {
      var data = new FormData(form);
      data.append('access_key', W3F_KEY);
      data.append('subject', 'Nuovo messaggio — ' + (form.getAttribute('name') || 'Shapeless') + ' | Shapeless');
      data.append('from_name', 'Shapeless Website');

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: data
      })
      .then(function(res) { return res.json(); })
      .then(function(json) {
        if (json.success) {
          if (form.classList.contains('newsletter-form')) { mostraCodiceBenvenuto(form); return; }
          window.location.href = 'grazie.html';
        } else {
          if (btn) { btn.disabled = false; btn.textContent = btn._orig || 'Invia'; }
          alert('Errore nell\'invio. Riprova o scrivi a info@shapeless.shop');
        }
      })
      .catch(function() {
        /* rete assente o servizio che non risponde: il messaggio NON e' partito, quindi niente "Grazie" */
        if (btn) { btn.disabled = false; btn.textContent = btn._orig || 'Invia'; }
        alert('Non siamo riusciti a inviare il messaggio. Controlla la connessione e riprova, oppure scrivi a info@shapeless.shop');
      });
    }
  }

  document.querySelectorAll('form[data-form]').forEach(submitWeb3Form);
  document.querySelectorAll('form.newsletter-form').forEach(submitWeb3Form);

  /* --- Scroll reveal con stagger --- */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    // Raggruppa elementi per sezione per lo stagger
    const groups = new Map();
    revealEls.forEach(el => {
      const section = el.closest('section') || el.parentElement;
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section).push(el);
    });

    // Assegna delay automatico agli elementi dello stesso gruppo
    groups.forEach(els => {
      els.forEach((el, i) => {
        if (!el.classList.contains('reveal-delay-1') &&
            !el.classList.contains('reveal-delay-2') &&
            !el.classList.contains('reveal-delay-3') &&
            !el.classList.contains('reveal-delay-4')) {
          const delay = Math.min(i * 0.12, 0.48);
          el.style.transitionDelay = delay + 's';
        }
      });
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => observer.observe(el));
  }

  /* --- Parallax hero video su scroll --- */
  const heroVideo = document.querySelector('.hero-video');
  if (heroVideo) {
    let ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = window.scrollY;
          // Solo se non siamo oltre la hero
          if (scrolled < window.innerHeight) {
            heroVideo.style.transform = `translateY(${scrolled * 0.25}px)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* --- Nav: mantieni sfondo originale al scroll --- */
  /* nessuna modifica di colore allo scroll: il CSS gestisce il background */

});
