"""Put the Nikand pouch design on the plain blue bag in the Gemini pouring shot.

usage: python3 label.py <frames_in_dir> <frames_out_dir> <front.png>
Finds the blue bag in every frame, follows its rotation, warps the front
design onto it and keeps the bag's own folds and highlights. Skin (the hand)
and the white powder stay on top.
"""
import sys, os, glob
import cv2, numpy as np

src, dst, label_path = sys.argv[1:4]
os.makedirs(dst, exist_ok=True)
lab = cv2.imread(label_path, cv2.IMREAD_UNCHANGED)  # BGRA
LH, LW = lab.shape[:2]
up_prev = np.array([0.0, -1.0])


def bag_mask(im):
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    m = ((h > 92) & (h < 125) & (s > 85) & (v > 28)).astype(np.uint8) * 255
    m[int(0.78 * im.shape[0]):, :] = 0
    m[:, : int(0.38 * im.shape[1])] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not cnts:
        return None, None
    c = max(cnts, key=cv2.contourArea)
    if cv2.contourArea(c) < 4000:
        return None, None
    full = np.zeros_like(m)
    cv2.drawContours(full, [c], 0, 255, -1)
    # keep the hand and the powder in front of the label
    skin = ((h < 22) & (s > 40) & (s < 190) & (v > 80)).astype(np.uint8) * 255
    white = ((s < 45) & (v > 185)).astype(np.uint8) * 255
    full[(skin > 0) | (white > 0)] = 0
    return full, c


for path in sorted(glob.glob(os.path.join(src, '*.png'))):
    im = cv2.imread(path)
    m, c = bag_mask(im)
    if m is None:
        cv2.imwrite(os.path.join(dst, os.path.basename(path)), im)
        continue
    (cx, cy), (w, h), ang = cv2.minAreaRect(c)
    box = cv2.boxPoints(((cx, cy), (w, h), ang))
    e1, e2 = box[1] - box[0], box[2] - box[1]
    long_v, L, S = (e1, np.linalg.norm(e1), np.linalg.norm(e2)) if np.linalg.norm(e1) >= np.linalg.norm(e2) else (e2, np.linalg.norm(e2), np.linalg.norm(e1))
    up = long_v / np.linalg.norm(long_v)
    if np.dot(up, up_prev) < 0:
        up = -up
    up_prev = up
    right = np.array([-up[1], up[0]])
    k = 1.04
    ctr = np.array([cx, cy])
    hu, hr = up * L / 2 * k, right * S / 2 * k
    dst_pts = np.float32([ctr + hu - hr, ctr + hu + hr, ctr - hu + hr, ctr - hu - hr])
    src_pts = np.float32([[0, 0], [LW, 0], [LW, LH], [0, LH]])
    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    H_, W_ = im.shape[:2]
    warped = cv2.warpPerspective(lab, M, (W_, H_), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    rgb, a_lab = warped[..., :3].astype(np.float32), warped[..., 3].astype(np.float32) / 255
    # shading from the original bag: folds and highlights
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
    mean = gray[m > 0].mean() if (m > 0).any() else 128
    shade = np.clip(gray / mean, 0.45, 1.7) ** 0.75
    out = rgb * shade[..., None]
    spec = np.clip((gray - 200) / 55, 0, 1)[..., None]
    out = out * (1 - 0.5 * spec) + 255 * 0.5 * spec
    alpha = cv2.GaussianBlur(m.astype(np.float32) / 255, (5, 5), 0) * a_lab
    res = im.astype(np.float32) * (1 - alpha[..., None]) + np.clip(out, 0, 255) * alpha[..., None]
    cv2.imwrite(os.path.join(dst, os.path.basename(path)), res.astype(np.uint8))
