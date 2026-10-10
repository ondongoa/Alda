/* ALDA — shared interactions (GSAP + ScrollTrigger + Lenis). Every block is guarded so both pages can use it. */
(function () {
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  $$('.js-year').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Brazzaville clock
  var clocks = $$('.js-clock');
  function tick() {
    var t = '';
    try { t = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Brazzaville' }); } catch (e) {}
    clocks.forEach(function (c) { c.textContent = t; });
  }
  tick(); setInterval(tick, 15000);

  // mobile menu
  var menu = $('.menu');
  function toggleMenu(open) {
    if (!menu) return;
    menu.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  $$('.js-menu-open').forEach(function (b) { b.addEventListener('click', function () { toggleMenu(true); }); });
  $$('.js-menu-close, .menu a').forEach(function (b) { b.addEventListener('click', function () { toggleMenu(false); }); });

  // text splitting
  $$('.js-split').forEach(function (el) {
    el.innerHTML = el.textContent.split('').map(function (c) { return '<span class="char">' + (c === ' ' ? '&nbsp;' : c) + '</span>'; }).join('');
  });
  $$('.js-words').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    var hl = {};
    // data-hl="phrase one|phrase two": those words are set in the accent colour
    (el.getAttribute('data-hl') || '').split('|').forEach(function (ph) {
      var pw = ph.trim().split(/\s+/);
      if (!pw[0]) return;
      for (var i = 0; i + pw.length <= words.length; i++) {
        var ok = pw.every(function (w, k) { return words[i + k].replace(/[.,:;!?]+$/, '') === w; });
        if (ok) for (var k = 0; k < pw.length; k++) hl[i + k] = true;
      }
    });
    el.innerHTML = words.map(function (w, i) { return '<span class="w' + (hl[i] ? ' hl' : '') + '">' + w + '</span>'; }).join(' ');
  });

  function done() {
    document.body.classList.remove('loading');
    var l = $('.loader'); if (l) l.remove();
  }

  // contact form: open the visitor's mail app with the message pre-filled
  var form = $('.js-mailform');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var body = 'Nom : ' + f.nom.value + '\nEmail : ' + f.email.value + '\nEntreprise : ' + f.entreprise.value + '\n\n' + f.message.value;
    window.location.href = 'mailto:contact@alda-cg.com?subject=' + encodeURIComponent('[Site ALDA] ' + f.sujet.value) + '&body=' + encodeURIComponent(body);
  });

  if (!hasGsap || reduced) {
    root.classList.add('reduced');
    done();
    if (window.AldaAfrica) window.AldaAfrica.setMorph(1);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // smooth scroll
  var lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        var t = id === '#top' ? 0 : $(id);
        if (t === null) return;
        e.preventDefault();
        lenis.scrollTo(t, { duration: 1.6 });
      });
    });
  }

  // intro: preloader on first visit of the session, short reveal otherwise
  var heroChars = $$('.hero__title .char, .page-hero__title .char');
  var heroReveals = $$('.hero .reveal, .page-hero .reveal');
  var seen = false;
  try { seen = sessionStorage.getItem('alda-intro') === '1'; sessionStorage.setItem('alda-intro', '1'); } catch (e) {}
  var intro = gsap.timeline();
  var loader = $('.loader');
  if (loader && !seen) {
    var counter = { v: 0 }, countEl = $('.js-count');
    intro
      .to(counter, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: function () { countEl.textContent = Math.round(counter.v); } })
      .to('.loader__bar', { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 0)
      .to(loader, { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '+=0.15')
      .add(done);
  } else {
    done();
  }
  if (heroChars.length) intro.to(heroChars, { y: 0, duration: 1.4, ease: 'expo.out', stagger: 0.06 }, loader && !seen ? '-=0.55' : 0.1);
  if (heroReveals.length) intro.to(heroReveals, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, '-=1.1');

  if ($('.hero__title')) {
    gsap.to('.hero__title', { yPercent: 18, letterSpacing: '-0.02em', ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  // nav hide on scroll down
  var nav = $('.nav');
  ScrollTrigger.create({ start: 'top -120', onUpdate: function (self) { nav.classList.toggle('is-hidden', self.direction === 1); } });

  // marquee
  var track = $('.js-marquee');
  if (track) {
    var half = track.scrollWidth / 2, x = 0, boost = 0;
    gsap.ticker.add(function () {
      x -= 0.6 + boost;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = 'translate3d(' + x + 'px,0,0)';
      boost *= 0.92;
    });
    if (lenis) lenis.on('scroll', function (e) { boost = Math.max(-8, Math.min(8, e.velocity * 0.4)); });
  }

  // words scrub
  $$('.js-words').forEach(function (el) {
    gsap.to(el.querySelectorAll('.w'), { opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } });
  });

  // headings slide up
  $$('.js-up').forEach(function (el) {
    gsap.from(el, { yPercent: 110, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  // generic reveals
  ScrollTrigger.batch($$('.reveal').filter(function (el) { return !el.closest('.hero, .page-hero'); }), {
    start: 'top 88%',
    onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 }); }
  });

  if ($('.domains')) {
    gsap.from('.domain', { yPercent: 40, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1,
      scrollTrigger: { trigger: '.domains', start: 'top 80%' } });
  }

  // full-bleed photos: clip open + parallax
  $$('.photo').forEach(function (p) {
    gsap.to(p, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: p, start: 'top bottom', end: 'top 20%', scrub: true } });
    gsap.fromTo(p.querySelector('img'), { yPercent: -8 }, { yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
    var big = p.querySelector('.photo__big');
    if (big) gsap.from(big, { xPercent: -12, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: p, start: 'top 70%', end: 'center center', scrub: true } });
  });

  // portraits: unveil
  $$('.portrait').forEach(function (p) {
    gsap.from(p, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut',
      scrollTrigger: { trigger: p, start: 'top 85%' } });
  });

  // africa: pinned morph sphere -> map
  var africa = $('.js-africa-section');
  if (africa) {
    var steps = $$('.africa__progress span');
    ScrollTrigger.create({
      trigger: africa, start: 'top top', end: '+=130%', pin: true, scrub: true,
      onUpdate: function (self) {
        var p = self.progress;
        if (window.AldaAfrica) window.AldaAfrica.setMorph(gsap.utils.clamp(0, 1, (p - 0.1) / 0.65));
        steps.forEach(function (s, i) { s.classList.toggle('on', p >= i / steps.length); });
      }
    });
    gsap.from('.africa__title .line > span', { yPercent: 110, stagger: 0.08, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: africa, start: 'top 60%' } });
    gsap.from('.africa__foot', { opacity: 0, y: 30, ease: 'none',
      scrollTrigger: { trigger: africa, start: 'top top', end: '+=120%', scrub: true } });
  }

  // horizontal product scroll (desktop)
  var htrack = $('.js-htrack');
  if (htrack) {
    var mm = gsap.matchMedia();
    mm.add('(min-width: 861px)', function () {
      var tween = gsap.to(htrack, {
        x: function () { return -(htrack.scrollWidth - window.innerWidth); }, ease: 'none',
        scrollTrigger: { trigger: '.js-hscroll', start: 'top top', pin: true, scrub: 1,
          end: function () { return '+=' + (htrack.scrollWidth - window.innerWidth); }, invalidateOnRefresh: true }
      });
      $$('.panel').forEach(function (p) {
        gsap.from(p.querySelectorAll('.panel__name, .panel__body, .panel__list li'), {
          y: 50, opacity: 0, stagger: 0.06, duration: 1, ease: 'expo.out',
          scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left 70%' } });
        var vis = p.querySelector('.shot, .panel__visual');
        if (vis) gsap.from(vis, { y: 80, rotate: 3, opacity: 0, duration: 1.4, ease: 'expo.out',
          scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left 60%' } });
      });
    });
    mm.add('(max-width: 860px)', function () {
      $$('.panel').forEach(function (p) {
        gsap.from(p.children, { y: 50, opacity: 0, stagger: 0.1, duration: 1, ease: 'expo.out',
          scrollTrigger: { trigger: p, start: 'top 80%' } });
      });
    });
  }

  // svg idle motion
  if ($('.js-orbit')) {
    gsap.to('.js-orbit', { rotation: 360, svgOrigin: '200 200', duration: 40, ease: 'none', repeat: -1 });
    gsap.to('.js-nodes', { rotation: 45, svgOrigin: '200 200', duration: 6, ease: 'sine.inOut', repeat: -1, yoyo: true });
  }

  if ($('.contact__big')) {
    gsap.from('.contact__big', { letterSpacing: '0.02em', ease: 'none',
      scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'top 30%', scrub: true } });
  }

  // cursor
  var cursor = $('.cursor'), label = $('.cursor__label');
  if (cursor && label) {
    var cx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
    var cy = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
    var lx = gsap.quickTo(label, 'x', { duration: 0.35, ease: 'power3' });
    var ly = gsap.quickTo(label, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener('mousemove', function (e) { cx(e.clientX); cy(e.clientY); lx(e.clientX); ly(e.clientY); });
    $$('[data-hover]').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        cursor.classList.add('is-hover');
        var t = el.getAttribute('data-hover');
        if (t) { label.textContent = t; label.style.opacity = 1; }
      });
      el.addEventListener('mouseleave', function () { cursor.classList.remove('is-hover'); label.style.opacity = 0; });
    });
  }

  // magnetic buttons
  $$('.btn').forEach(function (b) {
    b.addEventListener('mousemove', function (e) {
      var r = b.getBoundingClientRect();
      gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.6, ease: 'power3' });
    });
    b.addEventListener('mouseleave', function () { gsap.to(b, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1,0.4)' }); });
  });

  // floating preview on domain hover
  var preview = $('.js-preview');
  if (preview) {
    var px = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3' });
    var py = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3' });
    window.addEventListener('mousemove', function (e) { px(e.clientX + 40); py(e.clientY); });
    $$('.domain').forEach(function (d) {
      d.addEventListener('mouseenter', function () {
        var tpl = $('#preview-' + d.getAttribute('data-preview'));
        preview.innerHTML = tpl ? tpl.innerHTML : '';
        gsap.to(preview, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
      });
      d.addEventListener('mouseleave', function () { gsap.to(preview, { opacity: 0, scale: 0.6, duration: 0.4, ease: 'expo.out' }); });
    });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

})();
