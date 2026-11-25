/* Flowline demo — media & motion layer (progressive, respects reduced motion) */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection && navigator.connection.saveData;

  /* hero video: autoplay only when motion is OK; pause off-screen; user toggle */
  const vid = document.getElementById('heroVid'), tog = document.getElementById('vidToggle');
  let userPaused = reduce || saveData;
  const setTog = () => { if (!tog) return; const p = vid.paused; tog.classList.toggle('paused', p); tog.setAttribute('aria-label', p ? 'Play background video' : 'Pause background video'); };
  if (vid) {
    if (!userPaused) { vid.play().catch(() => {}); }
    vid.addEventListener('play', setTog); vid.addEventListener('pause', setTog); setTog();
    tog && tog.addEventListener('click', () => { if (vid.paused) { userPaused = false; vid.play().catch(() => {}); } else { userPaused = true; vid.pause(); } });
    new IntersectionObserver(([e]) => { if (userPaused) return; e.isIntersecting ? vid.play().catch(() => {}) : vid.pause(); }, { threshold: .05 }).observe(vid);
  }

  /* lazy background videos (CTA band) */
  document.querySelectorAll('video[data-lazyplay]').forEach(v => {
    if (reduce || saveData) return; // poster only
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (v.preload !== 'auto') { v.preload = 'auto'; v.load(); } v.play().catch(() => {}); }
      else v.pause();
    }, { rootMargin: '200px 0px', threshold: .01 }).observe(v);
  });

  /* count-ups */
  const counters = document.querySelectorAll('[data-count]');
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, to = +el.dataset.count; if (reduce) { el.textContent = to; return; }
    const t0 = performance.now(), d = 1400;
    const step = t => { const k = Math.min(1, (t - t0) / d), v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = v; if (k < 1) requestAnimationFrame(step); };
    el.textContent = 0; requestAnimationFrame(step);
  }), { threshold: .6 });
  counters.forEach(c => cio.observe(c));

  if (reduce) return;

  /* scroll-linked track line + parallax */
  const line = document.querySelector('.scroll-line'), lineSec = line && line.parentElement;
  const par = [...document.querySelectorAll('.g-art, [data-parallax]')];
  let ticking = false;
  function frame() {
    ticking = false;
    const vh = innerHeight;
    if (lineSec) {
      const r = lineSec.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh - r.top) / (r.height + vh * .4)));
      line.style.setProperty('--draw', (1 - p).toFixed(4));
    }
    for (const el of par) {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const k = ((r.top + r.height / 2) - vh / 2) / vh; // -1..1
      const amt = el.dataset.parallax ? parseFloat(el.dataset.parallax) : 40;
      el.style.transform = `translate3d(0,${(k * -amt).toFixed(1)}px,0)`;
    }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); frame();
})();
