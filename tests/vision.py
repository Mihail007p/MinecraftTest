#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Анализатор скриншотов игры: "зрение" агента.
Описывает изображение: размеры, палитру, регионы, изменения между кадрами."""
import sys, json
from collections import Counter
from PIL import Image

def describe(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    px = im.load()
    # сетка сэмплов 16x9
    cols, rows = 16, 9
    samples = {}
    for r in range(rows):
        for c in range(cols):
            x = int((c + 0.5) * w / cols)
            y = int((r + 0.5) * h / rows)
            samples[f'{c}x{r}'] = px[x, y]
    # палитра: квантуем до 4 бит на канал
    cnt = Counter()
    for r in range(rows):
        for c in range(cols):
            x = int((c + 0.5) * w / cols); y = int((r + 0.5) * h / rows)
            p = px[x, y]
            cnt[(p[0]//16*16, p[1]//16*16, p[2]//16*16)] += 1
    top = cnt.most_common(8)
    # статистика яркости/насыщенности
    total = 0; bright = 0; dark = 0
    for r in range(rows):
        for c in range(cols):
            x = int((c + 0.5) * w / cols); y = int((r + 0.5) * h / rows)
            p = px[x, y]
            lum = (p[0]*299 + p[1]*587 + p[2]*114) // 1000
            total += lum
            if lum > 180: bright += 1
            if lum < 60: dark += 1
    n = rows * cols
    # "небо" = верхние ряды
    sky = [samples[f'{c}x{r}'] for r in range(0, 3) for c in range(cols)]
    ground = [samples[f'{c}x{r}'] for r in range(5, rows) for c in range(cols)]
    avg = lambda lst: tuple(sum(p[i] for p in lst)//len(lst) for i in range(3))
    def names(rgb):
        r, g, b = rgb
        mx, mn = max(rgb), min(rgb)
        if mx - mn < 25:
            if mx > 200: return 'белый'
            if mx < 60: return 'чёрный/тёмный'
            return 'серый'
        if b > r and b > g: return 'синий/небо/вода'
        if g > r and g > b: return 'зелёный/трава'
        if r > 150 and g > 100 and b < 100: return 'коричневый/земля'
        if r > 180 and g > 180: return 'жёлтый/светлый'
        if r > g and g > b: return 'оранжевый/тёплый'
        return 'прочее'
    return {
        'size': [w, h],
        'avg_brightness': total // n,
        'bright_ratio': round(bright/n, 2),
        'dark_ratio': round(dark/n, 2),
        'top_palette': [{'rgb': k, 'color': names(k), 'count': v} for k, v in top],
        'sky_area': {'avg': avg(sky), 'color': names(avg(sky))},
        'ground_area': {'avg': avg(ground), 'color': names(avg(ground))},
        'center': {'rgb': px[w//2, h//2], 'color': names(px[w//2, h//2])},
    }

def diff(path1, path2):
    a = Image.open(path1).convert('RGB'); b = Image.open(path2).convert('RGB')
    if a.size != b.size:
        return {'diff_pixels_ratio': 1.0, 'note': 'разные размеры'}
    w, h = a.size
    pa, pb = a.load(), b.load()
    changed = 0; total = w * h
    step = max(1, min(w, h) // 60)
    for y in range(0, h, step):
        for x in range(0, w, step):
            ra, ga, ba = pa[x, y]; rb, gb, bb = pb[x, y]
            if abs(ra-rb) + abs(ga-gb) + abs(ba-bb) > 60:
                changed += 1
    total_s = (h//step) * (w//step)
    return {'diff_pixels_ratio': round(changed/total_s, 4)}

if __name__ == '__main__':
    args = sys.argv[1:]
    if len(args) == 1:
        print(json.dumps(describe(args[0]), ensure_ascii=False, indent=2))
    elif len(args) == 2:
        print(json.dumps(diff(args[0], args[1]), ensure_ascii=False, indent=2))
    else:
        print('usage: vision.py img.png [img2.png]')
