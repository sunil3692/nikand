# Nikand website

Scroll-animated product website for **Nikand 3 in 1 Laundry Detergent Powder** and **Nikand Detergent Cake**.

As you scroll, a 3D animation of the Nikand pouch plays like a video. It is a sequence of 150 pre-rendered frames drawn on a `<canvas>` with GSAP ScrollTrigger (the same technique as Apple product pages).

## Files

- `index.html`, `style.css`, `main.js`: the website (plain static site, no build step).
- `frames/desktop/` (1280x720) and `frames/mobile/` (720x1280): the animation frames. Portrait screens load the mobile set.
- `assets/wrapper-design.jpg`: the original pouch wrapper design (340 x 215 mm).
- `tools/render/`: the Three.js scene that builds the 3D pouch from the wrapper design and renders the frames.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Re-render the frames

`front.png`, `back.png` and `cake.png` in `tools/render/` are cut from the wrapper design. To change the pack, replace them, then:

```bash
cd tools/render
npm install three@0.169.0
node render.js ../../frames/desktop 1280 720 150
node render.js ../../frames/mobile 720 1280 150
```

Needs Node and Playwright with Chromium.

## Hosting

It is a static site, so any static host works (GitHub Pages, Hostinger, Netlify, Railway).
