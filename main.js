// Nikand scroll-video: draws pre-rendered frames on a canvas as the user scrolls.
(() => {
  const FRAME_COUNT = 300;
  // Frames where the clothes wave on the line. The animation repeats exactly
  // over this range, so it keeps playing while the visitor stops scrolling.
  const LOOP_START = 233; // frame index (file 0234.webp), t = 233/299 in tools/render/scene.html
  const LOOP_END = 263;   // file 0264.webp looks the same as LOOP_START
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('seq');
  const ctx = canvas.getContext('2d');
  const loader = document.getElementById('loader');
  const loaderPct = document.getElementById('loaderPct');
  document.getElementById('year').textContent = new Date().getFullYear();

  // Portrait screens get the portrait render so nothing gets cropped.
  const portraitQuery = window.matchMedia('(max-aspect-ratio: 1/1)');
  let set = portraitQuery.matches ? 'mobile' : 'desktop';
  const src = (s, i) => `frames/${s}/${String(i + 1).padStart(4, '0')}.webp`;

  let images = [];
  let current = 0;

  function load(s) {
    let loaded = 0;
    images = Array.from({ length: FRAME_COUNT }, (_, i) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        loaderPct.textContent = Math.round((loaded / FRAME_COUNT) * 100) + '%';
        if (i === current) draw(current);
        if (loaded === FRAME_COUNT) loader.classList.add('done');
      };
      img.src = src(s, i);
      return img;
    });
    // Let people start scrolling once the first frame is there.
    images[0].addEventListener('load', () => setTimeout(() => loader.classList.add('done'), 600), { once: true });
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    draw(current);
  }

  // Draw like CSS object-fit: cover; fall back to the nearest loaded frame.
  function draw(i) {
    let img = images[i];
    if (!img || !img.complete || !img.naturalWidth) {
      for (let d = 1; d < FRAME_COUNT; d++) {
        const a = images[i - d], b = images[i + d];
        if (a && a.complete && a.naturalWidth) { img = a; break; }
        if (b && b.complete && b.naturalWidth) { img = b; break; }
      }
      if (!img || !img.naturalWidth) return;
    }
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  load(set);
  resize();
  window.addEventListener('resize', resize);
  portraitQuery.addEventListener('change', (e) => {
    set = e.matches ? 'mobile' : 'desktop';
    load(set);
  });

  gsap.registerPlugin(ScrollTrigger);
  const caps = [...document.querySelectorAll('.cap')];
  const state = { frame: 0 };
  let lastScroll = 0;

  ScrollTrigger.create({
    trigger: '.story',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.6,
    onUpdate(self) {
      const p = self.progress;
      lastScroll = performance.now();
      gsap.to(state, {
        frame: p * (FRAME_COUNT - 1),
        duration: 0.25,
        overwrite: true,
        ease: 'none',
        onUpdate() {
          const f = Math.round(state.frame);
          if (f !== current) { current = f; draw(f); }
        },
      });
      // Captions fade in and out over their own range of the scroll.
      caps.forEach((c) => {
        const from = +c.dataset.from, to = +c.dataset.to, edge = 0.04;
        let o = 0;
        if (p >= from && p <= to) o = Math.min(1, (p - from) / edge, (to - p) / edge);
        if (from === 0 && p < edge) o = 1;
        c.style.opacity = o;
        c.style.translate = `0 ${(1 - o) * 24}px`;
      });
    },
  });
  caps[0].style.opacity = 1;

  // Idle loop: keep the clothes waving when scrolling stops on the clothesline.
  let lastTick = 0;
  function idle(now) {
    requestAnimationFrame(idle);
    if (reduceMotion || now - lastScroll < 350 || now - lastTick < 50) return;
    if (current < LOOP_START || current > LOOP_END) return;
    lastTick = now;
    current = current >= LOOP_END - 1 ? LOOP_START : current + 1;
    state.frame = current;
    draw(current);
  }
  requestAnimationFrame(idle);

  // Simple reveal for the sections below the story.
  gsap.utils.toArray('.card, .feature, .contact h2, .contact p, .contact-actions').forEach((el) => {
    gsap.from(el, {
      opacity: 0, y: 30, duration: 0.8, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });
})();
