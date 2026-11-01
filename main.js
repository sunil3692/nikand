// Nikand scroll-video: draws pre-rendered frames on a canvas as the user scrolls.
(() => {
  const FRAME_COUNT = 150;
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

  ScrollTrigger.create({
    trigger: '.story',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.6,
    onUpdate(self) {
      const p = self.progress;
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

  // ---------- Before / after: whiteness wave ----------
  (() => {
    const section = document.getElementById('stain');
    const cv = document.getElementById('stainCanvas');
    const g = cv.getContext('2d');
    const dirty = new Image(), clean = new Image();
    dirty.src = 'assets/shirt-dirty.jpg';
    clean.src = 'assets/shirt-clean.jpg';
    let p = 0;

    // fixed pseudo-random bubbles so the same scroll position always looks the same
    const bubbles = Array.from({ length: 70 }, (_, i) => ({
      x: (Math.sin(i * 12.9898) * 43758.5453) % 1, r: 4 + ((i * 37) % 17), off: (i * 0.137) % 1,
    })).map((b) => ({ ...b, x: Math.abs(b.x) }));

    let bg = '#c8ccd2';
    function cover(img) {
      // portrait screens: don't zoom in too far, fill the rest with the photo's background colour
      const s = Math.min(Math.max(cv.width / img.naturalWidth, cv.height / img.naturalHeight), (cv.width / img.naturalWidth) * 2.2);
      g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      g.drawImage(img, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
    }
    // wave edge height at x for progress k (k = 0: below the screen, k = 1: above it)
    const edgeY = (x, k) => {
      const H = cv.height, W = cv.width;
      const base = H * (1.12 - k * 1.3);
      return base + Math.sin(x / W * 7 + k * 9) * H * 0.035 + Math.sin(x / W * 17 - k * 14) * H * 0.012;
    };

    function render() {
      if (!dirty.naturalWidth || !clean.naturalWidth) return;
      const W = cv.width, H = cv.height, d = Math.min(window.devicePixelRatio || 1, 2);
      const k = Math.min(1, Math.max(0, (p - 0.12) / 0.7));
      cover(dirty);
      if (k > 0) {
        // clean shirt below the wave
        g.save();
        g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) g.lineTo(x, edgeY(x, k));
        g.lineTo(W, H); g.closePath(); g.clip();
        cover(clean);
        g.restore();
        if (k < 1) {
          // glowing foam band along the edge
          g.save();
          g.lineWidth = 26 * d; g.strokeStyle = 'rgba(255,255,255,.55)'; g.shadowColor = 'rgba(120,220,255,.9)'; g.shadowBlur = 40 * d;
          g.beginPath(); for (let x = 0; x <= W; x += 8) { const y = edgeY(x, k); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
          g.lineWidth = 6 * d; g.strokeStyle = 'rgba(255,255,255,.95)'; g.shadowBlur = 12 * d;
          g.stroke();
          g.restore();
          // bubbles riding the wave
          for (const b of bubbles) {
            const x = b.x * W, y = edgeY(x, k) + (((b.off + k * 3) % 1) - 0.25) * 90 * d;
            const r = b.r * d;
            const grad = g.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
            grad.addColorStop(0, 'rgba(255,255,255,.95)'); grad.addColorStop(.6, 'rgba(200,240,255,.35)'); grad.addColorStop(1, 'rgba(255,255,255,.8)');
            g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
          }
        }
      }
      section.classList.toggle('done', k >= 1);
    }
    function size() {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(cv.clientWidth * d); cv.height = Math.round(cv.clientHeight * d);
      render();
    }
    let loaded = 0;
    dirty.onload = clean.onload = () => {
      if (++loaded < 2) return;
      // sample the photo's background from its corner
      const c = document.createElement('canvas'); c.width = c.height = 1;
      const cx = c.getContext('2d'); cx.drawImage(dirty, 2, 2, 4, 4, 0, 0, 1, 1);
      const [r, gr, b] = cx.getImageData(0, 0, 1, 1).data; bg = `rgb(${r},${gr},${b})`;
      section.classList.add('ready'); size(); ScrollTrigger.refresh();
    };
    window.addEventListener('resize', size);
    ScrollTrigger.create({
      trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.4,
      onUpdate(self) { p = self.progress; render(); },
    });
  })();

  // Simple reveal for the sections below the story.
  gsap.utils.toArray('.card, .feature, .contact h2, .contact p, .contact-actions').forEach((el) => {
    gsap.from(el, {
      opacity: 0, y: 30, duration: 0.8, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });
})();
