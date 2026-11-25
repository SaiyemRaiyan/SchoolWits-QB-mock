#!/usr/bin/env python3
"""
Learn what the pictures of characters are (dev tool, not shipped).

Newer .tex files cut characters no free font has out of the source PDF
(\\swglyph, \\swcut). Their measurements are in the file, what they show is
not. This crops every one out of the PDFs, groups the crops that look alike
and draws contact sheets for a person to label; only groups that were looked
at belong in src/extract/symbols.ts.

    python3 -I scripts/symbol-sheets.py <papers dir> <work dir>

Writes <work dir>/groups.json and <work dir>/sheet-NN.png.
"""
import collections
import concurrent.futures as futures
import glob
import json
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

DPI = 300
BOX = 28  # crops are compared as BOX x BOX thumbnails
CUT = re.compile(r'\\swcut\{([^}]*)\}\{([^}]*)\}\{(\d+)\}\{([^}]*)\}')
AT = re.compile(r'\\at\{([^}]*)\}\{([^}]*)\}\{(?:\{\\fontsize\{([\d.]+)bp\}\{[^}]*\}\\selectfont )?\\swglyph\{(\d+)\}\{([^}]*)\}')


def collect(root):
    out = []
    for tex in sorted(glob.glob(os.path.join(root, '**', '*_qp_*.tex'), recursive=True)):
        src = open(tex, encoding='utf8', errors='replace').read()
        body = src[src.rindex('\\begin{document}'):]
        pdf = tex[:-4] + '.pdf'
        if not os.path.exists(pdf):
            continue
        for m in CUT.finditer(body):
            out.append(dict(pdf=pdf, page=int(m[3]), trim=nums(m[4]), advance=float(m[1]), y=-float(m[2])))
        for m in AT.finditer(body):
            out.append(dict(pdf=pdf, page=int(m[4]), trim=nums(m[5]), advance=None, y=float(m[2])))
    return out


def nums(s):
    return [float(v) for v in re.findall(r'-?[\d.]+', s)]


def render(job):
    pdf, page, work = job
    stem = os.path.join(work, 'pages', os.path.basename(pdf)[:-4] + f'-{page}')
    if not os.path.exists(stem + '.png'):
        subprocess.run(['pdftoppm', '-r', str(DPI), '-gray', '-png', '-singlefile', '-f', str(page), '-l', str(page), pdf, stem], check=True)
    return stem + '.png'


def crop(page, g):
    l, b, r, t = g['trim']
    k = DPI / 72
    w, h = page.size
    return page.crop((round(l * k), round(t * k), max(round(w - r * k), round(l * k) + 1), max(round(h - b * k), round(t * k) + 1)))


def ink(im):
    a = 255 - np.asarray(im, dtype=np.float32)
    ys, xs = np.where(a > 90)
    if len(xs) == 0:
        return None
    box = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return box


def thumb(box):
    return np.asarray(Image.fromarray(box.astype(np.uint8)).resize((BOX, BOX), Image.BILINEAR), dtype=np.float32) / 255


def main():
    root, work = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(work, 'pages'), exist_ok=True)
    glyphs = collect(root)
    jobs = sorted({(g['pdf'], g['page'], work) for g in glyphs})
    with futures.ThreadPoolExecutor(6) as pool:
        pages = dict(zip([(j[0], j[1]) for j in jobs], pool.map(render, jobs)))
    by_page = collections.defaultdict(list)
    for g in glyphs:
        by_page[(g['pdf'], g['page'])].append(g)
    for key, items in by_page.items():
        im = Image.open(pages[key]).convert('L')
        for g in items:
            g['crop'] = crop(im, g)
            box = ink(g['crop'])
            g['ink'] = None if box is None else thumb(box)
            g['size'] = None if box is None else [round(v * 72 / DPI, 2) for v in (box.shape[1], box.shape[0])]

    groups = []
    for g in glyphs:
        if g['ink'] is None:
            continue
        best, score = None, 9
        for grp in groups:
            rw = g['size'][0] / grp['size'][0]
            rh = g['size'][1] / grp['size'][1]
            # A bar has no shape of its own, so its proportions decide.
            ratio = (g['size'][0] / g['size'][1]) / (grp['size'][0] / grp['size'][1])
            if not 0.75 < ratio < 1.33 or not 0.45 < rw < 2.2 or not 0.45 < rh < 2.2:
                continue
            d = float(np.abs(grp['mean'] - g['ink']).mean())
            if d < score:
                best, score = grp, d
        if best is not None and score < 0.11:
            n = len(best['items'])
            best['mean'] = (best['mean'] * n + g['ink']) / (n + 1)
            best['items'].append(g)
        else:
            groups.append(dict(mean=g['ink'].copy(), size=g['size'], items=[g]))
    groups.sort(key=lambda x: -len(x['items']))

    cell, cols, rows = 110, 10, 8
    for start in range(0, len(groups), cols * rows):
        sheet = Image.new('L', (cols * cell, rows * cell), 255)
        d = ImageDraw.Draw(sheet)
        for i, grp in enumerate(groups[start:start + cols * rows]):
            x, y = (i % cols) * cell, (i // cols) * cell
            d.rectangle((x, y, x + cell - 1, y + cell - 1), outline=180)
            picks = [grp['items'][0], grp['items'][len(grp['items']) // 2], grp['items'][-1]]
            px = x + 4
            for p in picks:
                im = p['crop']
                k = min(1.6, 76 / im.size[1], 34 / im.size[0])
                im = im.resize((max(1, int(im.size[0] * k)), max(1, int(im.size[1] * k))))
                sheet.paste(im, (px, y + 18))
                px += 36
            d.text((x + 3, y + 3), f'#{start + i} n{len(grp["items"])}', fill=0)
            s = grp['items'][0]
            d.text((x + 3, y + 96), f'{s["size"][0]:.1f}x{s["size"][1]:.1f} y{s["y"]:.1f}', fill=0)
        sheet.save(os.path.join(work, f'sheet-{start // (cols * rows):02d}.png'))
    json.dump(
        [[{k: g[k] for k in ('pdf', 'page', 'trim', 'advance', 'y', 'size')} for g in grp['items']] for grp in groups],
        open(os.path.join(work, 'groups.json'), 'w'),
    )
    print(len(glyphs), 'pictures,', len(groups), 'groups')


main()
