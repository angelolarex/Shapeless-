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

    // Chiudi il menu quando si clicca su un link
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
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
  var W3F_KEY = 'b4007891-4fab-4094-b49b-941fdcbcf022';

  function submitWeb3Form(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Invio in corso…'; }

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
          window.location.href = 'grazie.html';
        } else {
          if (btn) { btn.disabled = false; btn.textContent = btn._orig || 'Invia'; }
          alert('Errore nell\'invio. Riprova o scrivi a info@shapeless.shop');
        }
      })
      .catch(function() {
        window.location.href = 'grazie.html';
      });
    });
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
