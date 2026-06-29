/**
 * SHAPELESS — Language Toggle (IT / EN)
 * Injects a language button into the nav and translates
 * all elements with data-i18n="key" attributes.
 */
(function () {

  /* ===================== TRANSLATIONS ===================== */
  const T = {
    en: {

      /* ----- NAV ----- */
      'nav.about':       'About',
      'nav.chi-siamo':   'Who we are',
      'nav.il-mais':     'The Corn',
      'nav.brand':       'Shapeless',
      'nav.collab':      'Collab',
      'nav.hospitality': 'Hospitality & Architecture',
      'nav.creativi':    'Creatives',
      'nav.rivenditori': 'Retailers',
      'nav.community':   'Community',
      'nav.faq':         'FAQ',
      'nav.blog':        'Blog',
      'nav.contatti':    'Contact',

      /* ----- FOOTER ----- */
      'footer.desc':    'Decorative design objects made with 3D printing and eco-sustainable materials.',
      'footer.explore': 'Explore',
      'footer.community': 'Community',
      'footer.contact': 'Contact',
      'footer.chiSiamo':'Who we are',
      'footer.ilMais':  'The Corn',
      'footer.brand':   'The Brand',
      'footer.collab':  'Collab',
      'footer.rivend':  'Retailers',
      'footer.faq':     'FAQ',
      'footer.blog':    'Blog',
      'footer.contatti':'Contact',
      'footer.privacy': 'Privacy Policy',
      'footer.cookie':  'Cookie Policy',
      'footer.terms':   'Terms & Conditions',

      /* ----- INDEX ----- */
      'index.label':  'Design in Motion',
      'index.h1':     'Forms that<br><em>transform</em><br>every space.',
      'index.sub':    'Organic and dynamic sculptures,<br>crafted with 3D printers and eco-sustainable materials.',
      'index.cta':    'Explore the design',
      'index.s2.label':  'The brand',
      'index.s2.h2':     'Design without compromise.',
      'index.s2.p':      'Shapeless was born from the conviction that beauty and sustainability are not opposites. Every object tells a story of organic forms, innovative materials and on-demand production.',
      'index.val1.label':'Philosophy',
      'index.val1.h3':   'Form follows nature.',
      'index.val1.p':    'Every Shapeless piece starts from observation: of organic forms, natural movements, geological structures. Design as a language that translates the world into objects.',
      'index.val2.label':'Material',
      'index.val2.h3':   'PLA from corn.',
      'index.val2.p':    'We use bio-derived PLA from corn starch — renewable, compostable, and with an extraordinary aesthetic finish. Sustainable by choice, not by necessity.',
      'index.prod.label':'Products',
      'index.prod.h2':   'The collection.',
      'index.prod.sub':  'Three pieces, three personalities. Each Shapeless object is designed to dialogue with the space around it.',
      'index.color1.label': 'Soft palette',
      'index.color1.h2':  'Ivory, sand, warm grey.',
      'index.color1.p':   'Neutral tones that integrate perfectly into contemporary interiors. Understated, never invisible.',
      'index.color1.cta': 'Discover the palette',
      'index.color2.label': 'Pop palette',
      'index.color2.h2':  'Forest green, burgundy, ochre.',
      'index.color2.p':   'Bolder colours for those who want the object to speak. For décor that takes a position.',
      'index.color2.cta': 'Explore the range',
      'index.press.label':'Press',
      'index.press.h2':  'Shapeless in the world.',
      'index.nl.label':  'Newsletter',
      'index.nl.h2':     'Stay in the Shapeless world',
      'index.nl.p':      'Updates on new designs, events and collaborations. No spam.',
      'index.nl.ph':     'Your email',
      'index.nl.btn':    'Subscribe',

      /* ----- CHI SIAMO ----- */
      'chi.label':   'About',
      'chi.h1':      'Hi designer,<br>nice to meet you.',
      'chi.s1.label':'The story',
      'chi.s1.h2':   'From Sicily, with form.',
      'chi.s1.p1':   'Angelo Larecchiuta was born in Caltanissetta, in the heart of Sicily. A land of layered history — Arab-Norman, Baroque, Mediterranean — where beauty is never by chance, but always the result of culture, time, and mastery.',
      'chi.s1.p2':   'Shapeless is born from this heritage: design that doesn\'t imitate, but interprets. Forms that carry the weight of a visual culture without claiming it explicitly.',
      'chi.s2.label':'The approach',
      'chi.s2.h2':   'Design as research.',
      'chi.s2.p1':   '3D printing is not just a production technique for Shapeless — it is the language that allows complex forms to exist that traditional manufacturing would never permit. Every object is designed parametrically, tested virtually, produced on demand.',
      'chi.s2.p2':   'No warehouse. No waste. Every piece exists because someone wanted it.',
      'chi.val1.label': 'Value 01',
      'chi.val1.h3':   'Authenticity.',
      'chi.val1.p':    'Every design decision has a reason. We don\'t follow trends: we build a visual language that belongs to us.',
      'chi.val2.label': 'Value 02',
      'chi.val2.h3':   'Sustainability.',
      'chi.val2.p':    'PLA from corn, on-demand production, zero stock. Sustainability is not marketing at Shapeless — it is the founding model.',
      'chi.val3.label': 'Value 03',
      'chi.val3.h3':   'Artisanal quality.',
      'chi.val3.p':    'Each piece is controlled individually. Printing, finishing, packaging — every step matters.',

      /* ----- IL MAIS ----- */
      'mais.label': 'The material',
      'mais.h1':    'PLA from corn.<br>The <em>future</em> material.',
      'mais.s1.label':'Why corn',
      'mais.s1.h2':  'A choice, not a compromise.',
      'mais.s1.p':   'PLA — polylactic acid — is derived from the fermentation of corn starch. It is a bioplastic: renewable at the source, compostable under the right conditions, and with a quality finish comparable to traditional plastics.',
      'mais.f1.label':'Renewable',
      'mais.f1.h3':  'From nature.',
      'mais.f1.p':   'Corn is an annually renewable resource. Unlike petroleum-based plastics, PLA does not consume finite resources.',
      'mais.f2.label':'Compostable',
      'mais.f2.h3':  'Returns to the earth.',
      'mais.f2.p':   'Under industrial composting conditions, PLA degrades completely. An end-of-life that doesn\'t mean waste.',
      'mais.f3.label':'Quality',
      'mais.f3.h3':  'Aesthetics included.',
      'mais.f3.p':   'PLA allows fine surface finishes, precise details and an excellent colour palette. Sustainable doesn\'t mean ugly.',
      'mais.cta':    'Learn more about the material',

      /* ----- SHAPELESS BRAND ----- */
      'brand.label': 'The brand',
      'brand.h1':    'Shapeless.<br>A <em>manifesto</em>.',
      'brand.p1.label': 'Origin',
      'brand.p1.h2':   'A name that means freedom.',
      'brand.p1.p':    '"Shapeless" — literally "without form" — is a provocation. An object that refuses a single definition. That can be a vase, a sculpture, a decorative element. That changes meaning depending on who looks at it.',
      'brand.p2.label': 'Pillar 01',
      'brand.p2.h3':   'Form as language.',
      'brand.p2.p':    'Every Shapeless object communicates without words. Torsion, flow, asymmetry — formal choices that carry meaning.',
      'brand.p3.label': 'Pillar 02',
      'brand.p3.h3':   'On-demand production.',
      'brand.p3.p':    'Nothing is produced without a request. Zero waste, zero stock. A model that respects both the environment and the customer.',
      'brand.p4.label': 'Pillar 03',
      'brand.p4.h3':   'Radical personalisation.',
      'brand.p4.p':    'Colour, finish, size. Every object can be configured. The customer becomes co-designer.',

      /* ----- COLLAB ----- */
      'collab.label': 'Collaborations',
      'collab.h1':    'Together<br>We Shape Design.',
      'collab.sub':   'Three ways to work with Shapeless. Three approaches for those who want distinctive design.',
      'collab.c1.label': 'Retailers',
      'collab.c1.h3':   'As a retailer',
      'collab.c1.p':    'Offer distinctive, sustainable design pieces shaped for contemporary spaces. Dedicated conditions, sales-ready packaging, on-demand production.',
      'collab.c1.cta':  'Explore more',
      'collab.c2.label': 'Projects',
      'collab.c2.h3':   'For projects',
      'collab.c2.p':    'Unique objects for interiors, styling and creative direction. We work with architecture studios, interior designers and set designers.',
      'collab.c2.cta':  'Explore more',
      'collab.c3.label': 'Partner',
      'collab.c3.h3':   'As a design partner',
      'collab.c3.p':    'Develop your design with us and bring it to life. From concept to collection. We work with creatives who want to co-create.',
      'collab.c3.cta':  'Explore more',
      'collab.apply.label': 'Apply',
      'collab.apply.h2':   'Work with us.',
      'collab.apply.p':    'Tell us about your project, your space, your idea. We\'ll get back to you within 48 hours.',
      'collab.form.name':  'Name *',
      'collab.form.email': 'Email *',
      'collab.form.type':  'Type of collaboration',
      'collab.form.msg':   'Tell us about the project *',
      'collab.form.btn':   'Send',

      /* ----- HOSPITALITY ----- */
      'hosp.label': 'B2B',
      'hosp.h1':    'Design for<br>spaces that <em>matter</em>.',
      'hosp.sub':   'Restaurants, hotels, architecture studios, retail spaces. Shapeless brings distinctive character to professional environments.',
      'hosp.s1.label': 'Why Shapeless',
      'hosp.s1.h2':   'Objects that tell stories.',
      'hosp.s1.p':    'A Shapeless piece in a professional space becomes a conversation point, a detail that speaks of attention, research and identity. It is not just décor — it is positioning.',
      'hosp.f1.label': 'On demand',
      'hosp.f1.h3':   'Tailored production.',
      'hosp.f1.p':    'Each order is produced only after confirmation. No waste, no dead stock.',
      'hosp.f2.label': 'Customisation',
      'hosp.f2.h3':   'Your colours.',
      'hosp.f2.p':    'Match the palette of your space. We can produce in any colour from our range.',
      'hosp.f3.label': 'Service',
      'hosp.f3.h3':   'Direct support.',
      'hosp.f3.p':    'We follow the project from consultation to delivery. Direct line, fast response.',
      'hosp.form.btn': 'Send request',

      /* ----- CREATIVI ----- */
      'cre.label': 'Creatives',
      'cre.h1':    'Create with<br>Shapeless.',
      'cre.sub':   'Photographers, stylists, set designers, art directors. We collaborate with creative professionals who want original objects for their projects.',
      'cre.form.btn': 'Propose a project',

      /* ----- RIVENDITORI ----- */
      'riv.label': 'Retailers',
      'riv.h1':    'Sell<br><em>design</em>.',
      'riv.sub':   'We are looking for physical and online retailers who share our vision of quality, sustainability and contemporary design.',
      'riv.s1.label': 'Why become a retailer',
      'riv.s1.h2':   'A product that stands out.',
      'riv.s1.p':    'Shapeless offers a differentiated range, produced on demand, with a story to tell. Ideal for curated concept stores, design galleries and online boutiques.',
      'riv.f1.label': 'Conditions',
      'riv.f1.h3':   'Retailer conditions.',
      'riv.f1.p':    'Dedicated pricing, minimum quantities per product, fast lead times.',
      'riv.f2.label': 'Support',
      'riv.f2.h3':   'Full support.',
      'riv.f2.p':    'High-quality product photos, descriptions, storytelling and brand kit included for all partners.',
      'riv.f3.label': 'Model',
      'riv.f3.h3':   'On demand.',
      'riv.f3.p':    'No obligation to hold stock. Each order is produced after confirmed purchase.',
      'riv.form.btn': 'Apply as a retailer',

      /* ----- COMMUNITY ----- */
      'comm.label': 'Community',
      'comm.h1':    'Explore the Shapeless world.',
      'comm.sub':   'Ideas, connections and values that shape authentic, innovative and sustainable design.',
      'comm.faq.label': 'Questions & Answers',
      'comm.faq.h2':   'FAQ',
      'comm.faq.p':    'Everything you want to know about materials, customisation, production times and collaborations. Immediate answers to the most common questions.',
      'comm.faq.cta':  'Go to FAQ →',
      'comm.blog.label': 'Articles & Stories',
      'comm.blog.h2':   'Blog',
      'comm.blog.p':    'Sustainable design, 3D printing, organic forms, fairs and events. We tell the Shapeless world from the inside — with curiosity and without filters.',
      'comm.blog.cta':  'Go to Blog →',
      'comm.nl.label': 'Newsletter',
      'comm.nl.h2':    'Stay in the Shapeless world',
      'comm.nl.p':     'Updates on new designs, events and collaborations. No spam.',
      'comm.nl.ph':    'Your email',
      'comm.nl.btn':   'Subscribe',

      /* ----- FAQ ----- */
      'faq.label': 'Community',
      'faq.h1':    'Frequently asked questions',

      /* ----- BLOG ----- */
      'blog.label': 'Community',
      'blog.h1':    'Blog',
      'blog.sub':   'Ideas, connections and values that shape authentic, innovative and sustainable design.',
      'blog.feat.label': 'Featured',
      'blog.read':   'Read the article →',

      /* ----- CONTATTI ----- */
      'cnt.label': 'Contact',
      'cnt.h1':    'Let\'s talk.',
      'cnt.info.label': 'Find us',
      'cnt.form.label': 'Write to us',
      'cnt.form.p':    'For information on products, collaborations or any other question — we reply within 24 hours.',
      'cnt.form.name': 'Name *',
      'cnt.form.email':'Email *',
      'cnt.form.obj':  'Subject',
      'cnt.form.msg':  'Message *',
      'cnt.form.ph':   'How can we help you?',
      'cnt.form.btn':  'Send message',
      'cnt.form.ok':   'Message sent! We\'ll reply within 24 hours.',
      'cnt.form.sel':  'Select...',
      'cnt.form.opt1': 'General information',
      'cnt.form.opt2': 'Collaboration',
      'cnt.form.opt3': 'Retailer',
      'cnt.form.opt4': 'Hospitality & Design',
      'cnt.form.opt5': 'Other',
      'cnt.social.label': 'Social',

      /* ----- DEMO 3D ----- */
      'demo.back':   '← Back to site',
      'demo.label':  'Configurator',
      'demo.sub':    'Decorative vase in PLA — 3D printing',
      'demo.color':  'Choose colour',
      'demo.finish': 'Finish',
      'demo.opaco':  'Matte',
      'demo.sat':    'Satin',
      'demo.luc':    'Glossy',
      'demo.specs':  'Specifications',
      'demo.mat':    'PLA — corn',
      'demo.prod':   '3D printing',
      'demo.time':   '6–14 hours',
      'demo.del':    '12 days',
      'demo.cta':    'Request this piece',
      'demo.cta.note': 'The online shop is coming soon.<br>In the meantime, write to us directly.',
      'demo.mat.label':  'Material',
      'demo.prod.label': 'Production',
      'demo.time.label': 'Print time',
      'demo.del.label':  'Delivery',
    }
  };

  /* ===================== ENGINE ===================== */

  const STORAGE_KEY = 'shapeless_lang';

  function getCurrentLang() {
    return localStorage.getItem(STORAGE_KEY) || 'it';
  }

  function setLang(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
  }

  function applyTranslations(lang) {
    if (lang === 'it') {
      // Reload to restore original Italian
      location.reload();
      return;
    }

    const dict = T[lang];
    if (!dict) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key] !== undefined) {
        if (/<[^>]+>/.test(dict[key])) {
          el.innerHTML = dict[key];
        } else {
          el.textContent = dict[key];
        }
      }
    });

    // Placeholders
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.dataset.i18nPh;
      if (dict[key] !== undefined) el.placeholder = dict[key];
    });

    // HTML lang attribute
    document.documentElement.lang = lang;
  }

  /* ===================== BUTTON INJECTION ===================== */

  function injectLangButton() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    const btn = document.createElement('button');
    btn.id = 'lang-toggle';
    btn.setAttribute('aria-label', 'Switch language');

    const lang = getCurrentLang();
    btn.textContent = lang === 'it' ? 'EN' : 'IT';

    btn.addEventListener('click', function () {
      const current = getCurrentLang();
      const next = current === 'it' ? 'en' : 'it';
      setLang(next);
      btn.textContent = next === 'it' ? 'EN' : 'IT';
      applyTranslations(next);
    });

    nav.appendChild(btn);
  }

  /* ===================== INIT ===================== */

  document.addEventListener('DOMContentLoaded', function () {
    injectLangButton();
    const lang = getCurrentLang();
    if (lang !== 'it') {
      applyTranslations(lang);
      // Update button text
      const btn = document.getElementById('lang-toggle');
      if (btn) btn.textContent = 'IT';
    }
  });

})();
