"""Build the scroll frames: 3D pouch intro + Gemini clip (with the Nikand label) + 3D pouch/cake ending.

usage: python3 build.py <gemini.mp4> <old_3d_frames_dir (has desktop/ mobile/ with 300 frames)> <out_frames_dir> <front.png>
Writes out/desktop (1280x720) and out/mobile (720x1280) as 0001.webp ...
"""
import sys, os, glob, subprocess, shutil, tempfile
import cv2, numpy as np

video, old3d, out, front = sys.argv[1:5]
HERE = os.path.dirname(os.path.abspath(__file__))
tmp = tempfile.mkdtemp()

# (name, start s, end s, fps, mobile crop centre x)
SEGMENTS = [
    ('clothes', 0.0, 10.0, 10, 560),
    ('pour', 10.4, 14.8, 12, 860),   # short pour, before the powder spills past the door
    ('wash', 20.15, 23.7, 10, 640),
    ('line', 30.2, 40.0, 8, 640),
]
INTRO_3D = range(1, 61)      # pouch intro + spin (old frames 0001-0060)
OUTRO_3D = range(287, 301)   # pouch + cake ending (after the 3D clothesline has left)
FADE = 8
STAR = (1160, 600, 30)       # Gemini watermark position in the 1280x720 clip


def extract(name, a, b, fps):
    d = os.path.join(tmp, name); os.makedirs(d)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(a), '-t', str(b - a), '-i', video, '-vf', f'fps={fps}', os.path.join(d, '%04d.png')], check=True)
    return d


star_mask = np.zeros((720, 1280), np.uint8)
cv2.circle(star_mask, STAR[:2], STAR[2], 255, -1)


def mobile_frame(im, cx):
    """Portrait frame: blurred cover background + the shot (cropped around cx) in the upper middle."""
    bg = cv2.resize(im[:, 280:1000], (720, 1280))
    bg = (cv2.GaussianBlur(bg, (0, 0), 25) * 0.55).astype(np.uint8)
    w = 560
    x0 = int(np.clip(cx - w / 2, 0, 1280 - w))
    fg = cv2.resize(im[:, x0:x0 + w], (720, int(720 * 720 / w)))
    y0 = 150
    bg[y0:y0 + fg.shape[0]] = fg
    return bg


real_d, real_m = [], []
for name, a, b, fps, cx in SEGMENTS:
    d = extract(name, a, b, fps)
    if name == 'pour':
        d2 = d + '_l'
        subprocess.run([sys.executable, os.path.join(HERE, 'label.py'), d, d2, front], check=True)
        d = d2
    for p in sorted(glob.glob(os.path.join(d, '*.png'))):
        im = cv2.imread(p)
        im = cv2.inpaint(im, star_mask, 6, cv2.INPAINT_TELEA)
        real_d.append(im)
        real_m.append(mobile_frame(im, cx))
    print(name, len(real_d))

load = lambda s, i: cv2.imread(os.path.join(old3d, s, f'{i:04d}.webp'))
seq = {'desktop': [], 'mobile': []}
for s, real in (('desktop', real_d), ('mobile', real_m)):
    intro = [load(s, i) for i in INTRO_3D]
    outro = [load(s, i) for i in OUTRO_3D]
    fade_in = [cv2.addWeighted(intro[-1], 1 - (k + 1) / (FADE + 1), real[0], (k + 1) / (FADE + 1), 0) for k in range(FADE)]
    fade_out = [cv2.addWeighted(real[-1], 1 - (k + 1) / (FADE + 1), outro[0], (k + 1) / (FADE + 1), 0) for k in range(FADE)]
    seq[s] = intro + fade_in + real + fade_out + outro

if os.path.exists(out):
    shutil.rmtree(out)
for s, frames in seq.items():
    os.makedirs(os.path.join(out, s))
    for i, f in enumerate(frames):
        cv2.imwrite(os.path.join(out, s, f'{i + 1:04d}.webp'), f, [cv2.IMWRITE_WEBP_QUALITY, 74])
n = len(seq['desktop'])
starts, acc = {}, len(INTRO_3D) + FADE
for name, a, b, fps, cx in SEGMENTS:
    cnt = len(glob.glob(os.path.join(tmp, name + ('_l' if name == 'pour' else ''), '*.png')))
    starts[name] = (acc, acc + cnt - 1); acc += cnt
print('total frames', n)
print('segments (0-based frame index):', starts, 'outro starts', acc + FADE)
shutil.rmtree(tmp)
