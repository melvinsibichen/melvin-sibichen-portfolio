(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Theme toggle ---------- */
  const currentTheme = () =>
    root.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  $('#themeToggle').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
  });

  /* ---------- Colour theme picker ---------- */
  const paletteToggle = $('#paletteToggle');
  const palette = $('#palette');
  const swatches = $$('[data-accent-option]');
  const setPalette = (open) => {
    palette.classList.toggle('is-open', open);
    paletteToggle.setAttribute('aria-expanded', String(open));
  };
  const markAccent = (name) => swatches.forEach((s) => s.setAttribute('aria-pressed', String(s.dataset.accentOption === name)));
  markAccent(root.getAttribute('data-accent') || 'coral');

  let switchTimer = 0;
  swatches.forEach((swatch) => swatch.addEventListener('click', () => {
    const name = swatch.dataset.accentOption;
    root.classList.add('theme-switching');
    clearTimeout(switchTimer);
    switchTimer = setTimeout(() => root.classList.remove('theme-switching'), 500);
    if (name === 'coral') root.removeAttribute('data-accent');
    else root.setAttribute('data-accent', name);
    markAccent(name);
    try { localStorage.setItem('accent', name); } catch (e) { /* storage unavailable */ }
  }));
  paletteToggle.addEventListener('click', (e) => { e.stopPropagation(); setPalette(!palette.classList.contains('is-open')); });
  document.addEventListener('click', (e) => { if (!palette.contains(e.target)) setPalette(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setPalette(false); });

  /* ---------- Mobile menu ---------- */
  const burger = $('#navBurger');
  const navLinks = $('#navLinks');
  const setMenu = (open) => {
    navLinks.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  burger.addEventListener('click', () => setMenu(!navLinks.classList.contains('is-open')));
  navLinks.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Hero name: split into letters ---------- */
  let charIndex = 0;
  $$('[data-split]').forEach((line) => {
    const text = line.textContent;
    line.textContent = '';
    line.setAttribute('aria-hidden', 'true');
    for (const ch of text) {
      const span = document.createElement('span');
      span.className = 'char';
      span.style.setProperty('--i', charIndex++);
      span.textContent = ch;
      line.appendChild(span);
    }
  });

  /* ---------- Typed role ---------- */
  const typed = $('#typed');
  const phrases = [
    'enterprise Angular applications',
    'React web & mobile experiences',
    'reusable component systems',
    'D3.js data visualisations',
    'Spring Boot REST APIs',
  ];
  if (typed && !reduceMotion) {
    let p = 0, i = phrases[0].length, deleting = true;
    const tick = () => {
      const phrase = phrases[p];
      i += deleting ? -1 : 1;
      typed.textContent = phrase.slice(0, i);
      let delay = deleting ? 28 : 55;
      if (!deleting && i === phrase.length) { deleting = true; delay = 2000; }
      else if (deleting && i === 0) { deleting = false; p = (p + 1) % phrases.length; delay = 350; }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 3200);
  }

  /* ---------- Scroll: progress bar, sticky nav, timeline fill ---------- */
  const nav = $('#nav');
  const timeline = $('#timeline');
  const timelineFill = $('#timelineFill');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    root.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);
    nav.classList.toggle('is-stuck', y > 24);

    if (timeline) {
      const rect = timeline.getBoundingClientRect();
      const fill = (window.innerHeight * 0.6 - rect.top) / rect.height;
      timelineFill.style.setProperty('--fill', Math.min(1, Math.max(0, fill)).toFixed(4));
    }
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Reveal on scroll (staggered within a group) ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.filter((e) => e.isIntersecting).forEach((entry, idx) => {
        entry.target.style.setProperty('--d', `${idx * 90}ms`);
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
        // Clear the stagger delay afterwards so hover transitions stay snappy.
        setTimeout(() => entry.target.style.removeProperty('--d'), 1200 + idx * 90);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach((el) => revealObserver.observe(el));

    /* ---------- Active nav link ---------- */
    const links = $$('.nav__links a');
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => sectionObserver.observe(s));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Stat counters ---------- */
  const counters = $$('[data-count]');
  if (!reduceMotion && counters.length) {
    const format = (n) => n.toLocaleString('en-US');
    counters.forEach((el) => { el.textContent = '0'; });
    const run = () => counters.forEach((el) => {
      const target = Number(el.dataset.count);
      const start = performance.now();
      const duration = 1400;
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = format(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    setTimeout(run, 1300);
  }

  /* ---------- Cursor glow + card tilt (desktop only) ---------- */
  if (finePointer && !reduceMotion) {
    const glow = $('.cursor-glow');
    window.addEventListener('pointermove', (e) => {
      glow.classList.add('is-on');
      glow.style.setProperty('--gx', `${e.clientX}px`);
      glow.style.setProperty('--gy', `${e.clientY}px`);
    }, { passive: true });

    // Hero code card and chips lean with the pointer.
    const heroVisual = $('#heroVisual');
    const heroEl = $('#home');
    if (heroVisual && heroEl) {
      heroEl.addEventListener('pointermove', (e) => {
        heroVisual.style.setProperty('--px', (e.clientX / window.innerWidth - 0.5).toFixed(3));
        heroVisual.style.setProperty('--py', (e.clientY / window.innerHeight - 0.5).toFixed(3));
      }, { passive: true });
      heroEl.addEventListener('pointerleave', () => {
        heroVisual.style.setProperty('--px', 0);
        heroVisual.style.setProperty('--py', 0);
      });
    }

    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
        card.style.setProperty('--ry', `${(px - 0.5) * 6}deg`);
        card.style.setProperty('--rx', `${(0.5 - py) * 6}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Hero canvas: rippling dot field that reacts to the pointer ---------- */
  const canvas = $('#heroCanvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const GAP = 30;
    let w = 0, h = 0, dpr = 1, running = false, raf = 0;
    const mouse = { x: -9999, y: -9999 };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) draw(0);
    };

    const draw = (time) => {
      const t = time * 0.001;
      const styles = getComputedStyle(root);
      const dot = styles.getPropertyValue('--dot').trim();
      const accent = styles.getPropertyValue('--accent').trim();
      const cx = w * 0.78, cy = h * 0.3;
      ctx.clearRect(0, 0, w, h);

      for (let x = GAP / 2; x < w; x += GAP) {
        for (let y = GAP / 2; y < h; y += GAP) {
          // Sonar-style ripple radiating from the upper right.
          const dist = Math.hypot(x - cx, y - cy);
          const wave = Math.sin(dist * 0.022 - t * 1.6);
          const md = Math.hypot(x - mouse.x, y - mouse.y);
          const near = Math.max(0, 1 - md / 170);
          const size = 1 + (wave + 1) * 0.55 + near * 2.4;
          const lift = wave * 3 - near * 6;

          if (near > 0.05) {
            ctx.fillStyle = accent;
            ctx.globalAlpha = 0.35 + near * 0.65;
          } else {
            ctx.fillStyle = `rgb(${dot})`;
            ctx.globalAlpha = 0.07 + (wave + 1) * 0.07;
          }
          ctx.beginPath();
          ctx.arc(x, y + lift, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (running) raf = requestAnimationFrame(draw);
    };

    const start = () => { if (!running && !reduceMotion) { running = true; raf = requestAnimationFrame(draw); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    window.addEventListener('resize', resize);
    resize();

    const hero = $('#home');
    hero.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });

    // Only animate while the hero is on screen and the tab is visible.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(canvas);
    } else {
      start();
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    // Redraw the static frame when the theme changes under reduced motion.
    new MutationObserver(() => { if (!running) draw(0); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ---------- Résumé download: bypass caches so visitors always get the latest file ---------- */
  $$('[data-resume]').forEach((link) => {
    const base = link.getAttribute('href');
    link.addEventListener('click', () => { link.setAttribute('href', `${base}?v=${Date.now()}`); });
  });

  /* ---------- Footer year ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
