# Nikand website

Scroll-animated product website for **Nikand 3 in 1 Laundry Detergent Powder** and **Nikand Detergent Cake**.

As you scroll, the story plays like a video: the 3D Nikand pouch spins, then real-looking footage (made with Google Gemini / Veo) shows dirty clothes flying into a washing machine, Nikand powder poured from the pouch, the wash, and clean clothes waving on a clothesline (they keep waving while you stay there), and it ends with the 3D pouch and cake. It is a sequence of 357 frames drawn on a `<canvas>` with GSAP ScrollTrigger (the same technique as Apple product pages).

## Files

- `index.html`, `style.css`, `main.js`: the website (plain static site, no build step).
- `frames/desktop/` (1280x720) and `frames/mobile/` (720x1280): the animation frames. Portrait screens load the mobile set.
- `assets/pouch-mockup.png`: the pouch front/back design used for the 3D model (`tools/render/front.png`, `back.png` are cut from it).
- `assets/wrapper-design.jpg`: the earlier flat wrapper dieline (340 x 215 mm).
- `tools/render/`: the Three.js scene that builds the 3D pouch from the wrapper design and renders the frames.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Rebuild the frames

`tools/real/build.py` cuts the Gemini clip into frames, puts the Nikand design on the plain blue bag (`tools/real/label.py`), removes the Gemini watermark, and joins it with the 3D intro and ending:

```bash
pip install opencv-python-headless
python3 tools/real/build.py gemini.mp4 <dir with the 300-frame 3D render: desktop/ mobile/> frames tools/render/front.png
```

## Re-render the 3D frames

`front.png` and `back.png` in `tools/render/` are cut from the pouch mockup (background made transparent); `cake.png` uses the logo from the wrapper. To change the pack, replace them, then:

```bash
cd tools/render
npm install three@0.169.0
node render.js ../../frames/desktop 1280 720 300
node render.js ../../frames/mobile 720 1280 300
```

Needs Node and Playwright with Chromium.

## Hosting

It is a static site, so any static host works (GitHub Pages, Hostinger, Netlify, Railway).
