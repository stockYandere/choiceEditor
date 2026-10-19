"""Draws the built-in pictures (기본 그림): school-life places at day / evening / night and two characters, all in one flat
anime-background style so a game never mixes two art styles. Everything is drawn here from shapes, so there is no
third-party art and no credit to give.

Run: python3 art-src/make-art.py --all   (draws art-src/out/*.svg, renders them with Chromium through render.cjs,
then writes assets/art/*.webp and the manifest assets/art-library.js). python3 art-src/make-art.py <id> only redraws SVGs.
"""
import json, math, os, random, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

HERE = Path(__file__).parent
OUT = HERE / 'out'
W, H = 1600, 1200

# ---------------------------------------------------------------- one-point perspective (metres, camera at the origin)
class Cam:
    def __init__(self, f=1000, cx=800, cy=600, h=1.25, x=0.0):
        self.f, self.cx, self.cy, self.h, self.x = f, cx, cy, h, x

    def p(self, X, Y, Z):
        Z = max(Z, 0.05)
        return (self.cx + self.f * (X - self.x) / Z, self.cy - self.f * (Y - self.h) / Z)


def fmt(v):
    return f'{v:.1f}'.rstrip('0').rstrip('.')


def pts(points):
    return ' '.join(fmt(x) + ',' + fmt(y) for x, y in points)


class Svg:
    def __init__(self, w=W, h=H):
        self.w, self.h, self.defs, self.body, self.n = w, h, [], [], 0
        self.late = []  # lights: drawn after the time-of-day tint so they stay bright

    def light(self, s):
        self.late.append(s)

    def uid(self, k='g'):
        self.n += 1
        return f'{k}{self.n}'

    def add(self, s):
        self.body.append(s)

    def lin(self, stops, x1=0, y1=0, x2=0, y2=1, units='objectBoundingBox'):
        i = self.uid('l')
        st = ''.join(f'<stop offset="{o}" stop-color="{c}"' + (f' stop-opacity="{a}"' if a != 1 else '') + '/>' for o, c, a in [(s + (1,))[:3] for s in stops])
        self.defs.append(f'<linearGradient id="{i}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" gradientUnits="{units}">{st}</linearGradient>')
        return f'url(#{i})'

    def rad(self, stops, cx=.5, cy=.5, r=.5, units='objectBoundingBox'):
        i = self.uid('r')
        st = ''.join(f'<stop offset="{o}" stop-color="{c}"' + (f' stop-opacity="{a}"' if a != 1 else '') + '/>' for o, c, a in [(s + (1,))[:3] for s in stops])
        self.defs.append(f'<radialGradient id="{i}" cx="{cx}" cy="{cy}" r="{r}" gradientUnits="{units}">{st}</radialGradient>')
        return f'url(#{i})'

    def blur(self, sd):
        i = self.uid('b')
        self.defs.append(f'<filter id="{i}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{sd}"/></filter>')
        return f'url(#{i})'

    def poly(self, p, fill, extra=''):
        self.add(f'<polygon points="{pts(p)}" fill="{fill}" {extra}/>')

    def rect(self, x, y, w, h, fill, extra=''):
        self.add(f'<rect x="{fmt(x)}" y="{fmt(y)}" width="{fmt(w)}" height="{fmt(h)}" fill="{fill}" {extra}/>')

    def path(self, d, fill='none', extra=''):
        self.add(f'<path d="{d}" fill="{fill}" {extra}/>')

    def circle(self, x, y, r, fill, extra=''):
        self.add(f'<circle cx="{fmt(x)}" cy="{fmt(y)}" r="{fmt(r)}" fill="{fill}" {extra}/>')

    def ellipse(self, x, y, rx, ry, fill, extra=''):
        self.add(f'<ellipse cx="{fmt(x)}" cy="{fmt(y)}" rx="{fmt(rx)}" ry="{fmt(ry)}" fill="{fill}" {extra}/>')

    def line(self, a, b, stroke, width, extra=''):
        self.add(f'<line x1="{fmt(a[0])}" y1="{fmt(a[1])}" x2="{fmt(b[0])}" y2="{fmt(b[1])}" stroke="{stroke}" stroke-width="{fmt(width)}" {extra}/>')

    def group(self, inner, extra=''):
        self.add(f'<g {extra}>{inner}</g>')

    def text(self):
        self.body += self.late
        self.late = []
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}">'
                f'<defs>{"".join(self.defs)}</defs>{"".join(self.body)}</svg>')


# ---------------------------------------------------------------- time of day
TIMES = {
    'day': dict(name='낮', sky=[(0, '#5aa7e8'), (.55, '#9fd0f5'), (1, '#e3f3fc')], cloud='#ffffff', cloudShade='#d5e6f5',
                tint=None, sun='#fffbe8', beam='#fff8dc', beamA=.32, lit=False, inner='#ffffff'),
    'evening': dict(name='노을', sky=[(0, '#5b5ea6'), (.4, '#e98a7a'), (.75, '#f9b46b'), (1, '#ffe0a3')], cloud='#ffc9a3', cloudShade='#c98394',
                    tint=('#ffb27a', .38), sun='#ffd28a', beam='#ffb066', beamA=.38, lit=False, inner='#ffe2c4'),
    'night': dict(name='밤', sky=[(0, '#0b1230'), (.6, '#1d2c5c'), (1, '#3a4d80')], cloud='#3b4b78', cloudShade='#26335a',
                  tint=('#1f2a66', .74), sun='#dfe8ff', beam='#a9c0ff', beamA=.16, lit=True, inner='#c8d4ff'),
}


def sky(s, t, x, y, w, h, seed=1, stars=True, clouds=True):
    s.rect(x, y, w, h, s.lin(t['sky']))
    rnd = random.Random(seed)
    if t is TIMES['night'] and stars:
        for _ in range(int(w * h / 9000)):
            s.circle(x + rnd.random() * w, y + rnd.random() * h * .75, rnd.choice([1.2, 1.6, 2.2]), '#ffffff', f'opacity="{rnd.uniform(.4, .95):.2f}"')
    if clouds:
        for _ in range(max(2, int(w / 500))):
            cloud(s, t, x + rnd.uniform(.05, .9) * w, y + rnd.uniform(.12, .5) * h, rnd.uniform(.6, 1.2) * min(w, 900) / 900, rnd)


def cloud(s, t, x, y, k, rnd):
    puffs = [(0, 0, 70), (70, -25, 85), (160, -5, 70), (230, 15, 50), (-60, 18, 48)]
    shade = ''.join(f'<circle cx="{fmt(x + dx * k)}" cy="{fmt(y + dy * k + 16 * k)}" r="{fmt(r * k)}"/>' for dx, dy, r in puffs)
    body = ''.join(f'<circle cx="{fmt(x + dx * k)}" cy="{fmt(y + dy * k)}" r="{fmt(r * k)}"/>' for dx, dy, r in puffs)
    s.add(f'<g fill="{t["cloudShade"]}" opacity=".9">{shade}</g><g fill="{t["cloud"]}" opacity=".95">{body}</g>')
    s.rect(x - 110 * k, y + 20 * k, 400 * k, 60 * k, t['sky'][-1][1], 'opacity="0"')


def tint(s, t):
    if t['tint']:
        c, a = t['tint']
        s.rect(0, 0, s.w, s.h, c, f'style="mix-blend-mode:multiply" opacity="{a}"')


def glow(s, x, y, r, color, a=.8):
    s.light(f'<circle cx="{fmt(x)}" cy="{fmt(y)}" r="{fmt(r)}" fill="{s.rad([(0, color, a), (.45, color, a * .35), (1, color, 0)])}" style="mix-blend-mode:screen"/>')


def lit(s, shape):
    """A lit window or lamp: drawn now and again over the night tint."""
    s.add(shape)
    s.light(shape.replace('/>', ' opacity=".85"/>', 1))


def vignette(s, a=.22):
    s.rect(0, 0, s.w, s.h, s.rad([(0, '#000', 0), (.7, '#000', 0), (1, '#1a1020', a)], r=.75))


def shade(c, k):
    """Darken (k<0) or lighten (k>0) a #rrggbb colour."""
    r, g, b = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
    f = (lambda v: v + (255 - v) * k) if k > 0 else (lambda v: v * (1 + k))
    return '#%02x%02x%02x' % tuple(max(0, min(255, round(f(v)))) for v in (r, g, b))


# ---------------------------------------------------------------- 3D helpers on top of Cam
def quad(s, cam, corners, fill, extra=''):
    s.poly([cam.p(*c) for c in corners], fill, extra)


def box(s, cam, x0, x1, y0, y1, z0, z1, top, front, side, bottom=None):
    """A solid box seen by cam: the faces turned toward the camera."""
    faces = []
    if y1 < cam.h:
        faces.append(([(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], top))
    if y0 > cam.h and bottom:
        faces.append(([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], bottom))
    if x0 > cam.x:
        faces.append(([(x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)], side))
    if x1 < cam.x:
        faces.append(([(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], side))
    faces.append(([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], front))
    for c, f in faces:
        quad(s, cam, c, f)


def floor_planks(s, cam, x0, x1, z0, z1, base, line, step=.18):
    quad(s, cam, [(x0, 0, z0), (x1, 0, z0), (x1, 0, z1), (x0, 0, z1)], base)
    x = x0
    while x <= x1:
        s.line(cam.p(x, 0, z0), cam.p(x, 0, z1), line, 2, 'opacity=".55"')
        x += step * 4
    z, i = z0, 0
    while z < z1:
        z += .9
        s.line(cam.p(x0, 0, z), cam.p(x1, 0, z), line, 1.2, 'opacity=".25"')


# ---------------------------------------------------------------- places
def classroom(t):
    s, cam = Svg(), Cam(f=760, cy=560, h=1.35, x=.4)
    L, R, D, Hh = -4.2, 4.2, 9.5, 3.2
    wall, wall2, ceil = '#f1e7d2', '#e4d6bb', '#f7f3ea'
    # ceiling, walls, floor
    quad(s, cam, [(L, Hh, .4), (R, Hh, .4), (R, Hh, D), (L, Hh, D)], ceil)
    quad(s, cam, [(L, 0, .4), (L, Hh, .4), (L, Hh, D), (L, 0, D)], wall2)
    quad(s, cam, [(R, 0, .4), (R, Hh, .4), (R, Hh, D), (R, 0, D)], wall2)
    quad(s, cam, [(L, 0, D), (R, 0, D), (R, Hh, D), (L, Hh, D)], wall)
    floor_planks(s, cam, L, R, .4, D, '#c99b66', '#9c7146')
    # lower wall panels and skirting
    for X in (L, R):
        quad(s, cam, [(X, 0, .4), (X, .9, .4), (X, .9, D), (X, 0, D)], '#d8c3a0')
        quad(s, cam, [(X, .86, .4), (X, .92, .4), (X, .92, D), (X, .86, D)], '#b99a70')
    quad(s, cam, [(L, 0, D), (R, 0, D), (R, .12, D), (L, .12, D)], '#b99a70')
    # ceiling lights
    for z in (3, 5.5, 8):
        for x in (-1.6, 1.6):
            quad(s, cam, [(x - .7, Hh - .01, z - .15), (x + .7, Hh - .01, z - .15), (x + .7, Hh - .01, z + .15), (x - .7, Hh - .01, z + .15)],
                 '#fffdf2' if not t['lit'] else '#7d86a6')
    # windows on the left wall with sky behind
    for z0 in (2.2, 4.6, 7.0):
        z1 = z0 + 1.9
        win = [(L, .95, z0), (L, 2.75, z0), (L, 2.75, z1), (L, .95, z1)]
        clip = s.uid('c')
        s.defs.append(f'<clipPath id="{clip}"><polygon points="{pts([cam.p(*c) for c in win])}"/></clipPath>')
        a, b = cam.p(L, 2.75, z0), cam.p(L, .95, z1)
        s.add(f'<g clip-path="url(#{clip})">')
        sky(s, t, min(a[0], b[0]) - 10, a[1] - 20, abs(b[0] - a[0]) + 20, b[1] - a[1] + 60, seed=int(z0 * 10), clouds=True)
        # distant trees and town through the window
        for k in range(6):
            zz = z0 + k * .35
            p = cam.p(L, 1.25, zz)
            s.circle(p[0], p[1], 60 * 900 / cam.f / zz * 2.6, shade('#6fae6a', -.1 * (k % 2)) if t is TIMES['day'] else shade('#6fae6a', -.45))
        s.add('</g>')
        frame = '#e9eef0'
        for zz in (z0, (z0 + z1) / 2, z1):
            s.line(cam.p(L, .95, zz), cam.p(L, 2.75, zz), frame, 2600 / zz / 4 if zz < 3 else 14 * 4 / zz)
        s.line(cam.p(L, .95, z0), cam.p(L, .95, z1), frame, 60 / z0)
        s.line(cam.p(L, 2.75, z0), cam.p(L, 2.75, z1), frame, 40 / z0)
        # curtains
        quad(s, cam, [(L + .02, .85, z0 - .45), (L + .02, 2.9, z0 - .45), (L + .02, 2.9, z0 + .05), (L + .02, .85, z0 + .05)], '#f0dc9c')
        quad(s, cam, [(L + .02, .85, z0 - .45), (L + .02, 2.9, z0 - .45), (L + .02, 2.9, z0 - .3), (L + .02, .85, z0 - .3)], '#ddc37c')
    # sunlight on the floor
    if not t['lit'] or True:
        for z0 in (2.2, 4.6, 7.0):
            beam = [cam.p(L, 0, z0 + .5), cam.p(L + 3.2, 0, z0 + 1.1), cam.p(L + 3.2, 0, z0 + 2.6), cam.p(L, 0, z0 + 1.9)]
            s.poly(beam, t['beam'], f'opacity="{t["beamA"]}" style="mix-blend-mode:screen"')
    # right wall: door, bulletin board, lockers
    quad(s, cam, [(R, 0, 6.8), (R, 2.1, 6.8), (R, 2.1, 7.9), (R, 0, 7.9)], '#b7875a')
    quad(s, cam, [(R, 1.2, 7.0), (R, 1.9, 7.0), (R, 1.9, 7.7), (R, 1.2, 7.7)], '#cfe3ee')
    quad(s, cam, [(R, 1.1, 3.2), (R, 2.2, 3.2), (R, 2.2, 5.6), (R, 1.1, 5.6)], '#b88a5c')
    quad(s, cam, [(R, 1.15, 3.28), (R, 2.15, 3.28), (R, 2.15, 5.52), (R, 1.15, 5.52)], '#d9b98a')
    for i, (y, z, c) in enumerate([(1.85, 3.6, '#ffffff'), (1.75, 4.3, '#ffe9a8'), (1.5, 4.9, '#bfe0ff'), (1.35, 3.9, '#ffd0d6')]):
        quad(s, cam, [(R - .01, y - .35, z), (R - .01, y, z), (R - .01, y, z + .45), (R - .01, y - .35, z + .45)], c)
    # front wall: blackboard, clock, teacher desk
    quad(s, cam, [(-2.6, .85, D), (2.6, .85, D), (2.6, 2.25, D), (-2.6, 2.25, D)], '#8b6a47')
    quad(s, cam, [(-2.5, .92, D), (2.5, .92, D), (2.5, 2.18, D), (-2.5, 2.18, D)], '#2e5a4c')
    quad(s, cam, [(-2.5, .86, D - .04), (2.5, .86, D - .04), (2.5, .92, D - .08), (-2.5, .92, D - .08)], '#a98a66')
    for a, b in [((-1.9, 1.95), (-.6, 1.95)), ((-1.9, 1.75), (-1.0, 1.75)), ((.6, 1.6), (1.9, 1.6))]:
        s.line(cam.p(a[0], a[1], D), cam.p(b[0], b[1], D), '#e8f0ea', 3, 'opacity=".55" stroke-linecap="round"')
    c = cam.p(3.2, 2.6, D)
    s.circle(*c, 30, '#ffffff', 'stroke="#7a6a58" stroke-width="5"')
    s.line(c, (c[0], c[1] - 18), '#333', 3)
    s.line(c, (c[0] + 13, c[1] + 4), '#333', 3)
    box(s, cam, -1.0, 1.0, .0, .78, D - 1.6, D - .9, '#c9945d', '#a87645', '#8f6239')
    quad(s, cam, [(-3.6, 0, D - 1.5), (3.6, 0, D - 1.5), (3.6, .18, D - 1.5), (-3.6, .18, D - 1.5)], '#d7b285')
    # desks and chairs, far to near
    for z in (7.4, 6.2, 5.0, 3.8):
        for x in (-3.0, -1.5, 0.0, 1.5, 3.0):
            xx = x + (.15 if z % 2 > 1 else -.1)
            for lx in (xx - .26, xx + .26):
                box(s, cam, lx - .025, lx + .025, 0, .72, z + .05, z + .1, '#9aa3ad', '#8a929c', '#6f7781')
            box(s, cam, xx - .3, xx + .3, .62, .72, z, z + .48, '#e2b47a', '#b98a55', '#a77a48')
            box(s, cam, xx - .27, xx + .27, .3, .62, z + .02, z + .08, '#8d959f', '#7a828c', '#646c76')
            # chair behind (toward camera)
            box(s, cam, xx - .2, xx + .2, .42, .46, z - .55, z - .2, '#d6a873', '#b08251', '#9c7148')
            box(s, cam, xx - .2, xx + .2, .46, .9, z - .58, z - .55, '#d6a873', '#c39563', '#9c7148')
            for lx in (xx - .18, xx + .18):
                box(s, cam, lx - .02, lx + .02, 0, .42, z - .57, z - .54, '#9aa3ad', '#7d858f', '#6f7781')
    if t['lit']:
        for z0 in (2.2, 4.6, 7.0):
            p = cam.p(L, 1.9, z0 + 1)
            glow(s, p[0], p[1], 260, '#7f9cff', .35)
    tint(s, t)
    vignette(s)
    return s



def clip_to(s, polys):
    """Start a group clipped to the union of screen polygons; close it with s.add('</g>')."""
    i = s.uid('c')
    s.defs.append(f'<clipPath id="{i}">' + ''.join(f'<polygon points="{pts(p)}"/>' for p in polys) + '</clipPath>')
    s.add(f'<g clip-path="url(#{i})">')


def tree(s, x, y, k, leaf=('#5f9e58', '#4a8546', '#78b56c'), trunk='#7a5a3e', rnd=None, puffs=9):
    rnd = rnd or random.Random(int(x * 7 + y))
    s.poly([(x - 14 * k, y), (x - 9 * k, y - 150 * k), (x + 9 * k, y - 150 * k), (x + 14 * k, y)], trunk)
    blobs = [(rnd.uniform(-95, 95) * k, rnd.uniform(-300, -150) * k, rnd.uniform(55, 85) * k) for _ in range(puffs)]
    for dx, dy, r in blobs:
        s.circle(x + dx, y + dy + 10 * k, r, leaf[1])
    for dx, dy, r in blobs:
        s.circle(x + dx - 8 * k, y + dy, r * .86, leaf[0])
    for dx, dy, r in blobs[:max(2, puffs // 3)]:
        s.circle(x + dx - 20 * k, y + dy - 18 * k, r * .45, leaf[2], 'opacity=".9"')


CHERRY = ('#f6bfd0', '#e79ab4', '#ffdfe8')


def room_tint(s, t):
    """Rooms at night have their lights on: a softer blue than outdoors."""
    if t is TIMES['night']:
        s.rect(0, 0, s.w, s.h, '#3d4588', 'style="mix-blend-mode:multiply" opacity=".55"')
    else:
        tint(s, t)


def hallway(t):
    s, cam = Svg(), Cam(f=780, cy=560, h=1.5, x=.25)
    L, R, D, Hh = -1.7, 1.7, 30, 3.0
    quad(s, cam, [(L, Hh, .3), (R, Hh, .3), (R, Hh, D), (L, Hh, D)], '#f4f0e6')
    quad(s, cam, [(R, 0, .3), (R, Hh, .3), (R, Hh, D), (R, 0, D)], '#ede3cf')
    quad(s, cam, [(L, 0, .3), (L, Hh, .3), (L, Hh, D), (L, 0, D)], '#e6dcc6')
    quad(s, cam, [(L, 0, D), (R, 0, D), (R, Hh, D), (L, Hh, D)], '#efe6d3')
    # end window
    end = [cam.p(-.8, 1.0, D), cam.p(.8, 1.0, D), cam.p(.8, 2.4, D), cam.p(-.8, 2.4, D)]
    clip_to(s, [end])
    sky(s, t, end[0][0] - 5, end[3][1] - 5, end[1][0] - end[0][0] + 10, end[0][1] - end[3][1] + 10, seed=3, clouds=False)
    s.add('</g>')
    # left windows
    wins = []
    z = 1.2
    while z < D - 1:
        wins.append([cam.p(L, 1.0, z), cam.p(L, 2.5, z), cam.p(L, 2.5, z + 1.6), cam.p(L, 1.0, z + 1.6)])
        z += 2.0
    clip_to(s, wins)
    sky(s, t, -10, 0, 700, 1000, seed=9)
    for k in range(18):
        zz = 1.5 + k * 1.4
        p = cam.p(L - 6, .4, zz + 6)
        s.circle(p[0], p[1], 2400 / (zz + 6), '#6aa865' if t is TIMES['day'] else '#3d5a52')
    s.add('</g>')
    z = 1.2
    while z < D - 1:
        for zz in (z, z + .8, z + 1.6):
            s.line(cam.p(L, 1.0, zz), cam.p(L, 2.5, zz), '#f6f7f4', max(1.5, 50 / zz))
        z += 2.0
    for X, c in ((L, '#cdb994'), (R, '#d6c29c')):
        quad(s, cam, [(X, 0, .3), (X, .95, .3), (X, .95, D), (X, 0, D)], c)
        quad(s, cam, [(X, .92, .3), (X, 1.0, .3), (X, 1.0, D), (X, .92, D)], '#ad9068')
    # floor: glossy with window reflections
    quad(s, cam, [(L, 0, .3), (R, 0, .3), (R, 0, D), (L, 0, D)], '#a9b8ab')
    z = 1.2
    while z < D - 1:
        s.poly([cam.p(L, 0, z), cam.p(L + 1.4, 0, z + .6), cam.p(L + 1.4, 0, z + 2.0), cam.p(L, 0, z + 1.6)], t['beam'], f'opacity="{t["beamA"] + .1:.2f}" style="mix-blend-mode:screen"')
        z += 2.0
    s.poly([cam.p(-.15, 0, .3), cam.p(.15, 0, .3), cam.p(.15, 0, D), cam.p(-.15, 0, D)], '#ffffff', 'opacity=".18"')
    # right wall: classroom doors and signs
    for z0 in (2.0, 6.0, 10.0, 14.0, 18.0, 22.0, 26.0):
        quad(s, cam, [(R, 0, z0), (R, 2.05, z0), (R, 2.05, z0 + 1.0), (R, 0, z0 + 1.0)], '#c08f5e')
        quad(s, cam, [(R, 1.25, z0 + .2), (R, 1.85, z0 + .2), (R, 1.85, z0 + .8), (R, 1.25, z0 + .8)], '#d3e6ef' if not t['lit'] else '#2b3858')
        quad(s, cam, [(R, 2.25, z0 + .45), (R, 2.55, z0 + .45), (R - .5, 2.55, z0 + .45), (R - .5, 2.25, z0 + .45)], '#fbfaf5')
        quad(s, cam, [(R, 2.25, z0 + .45), (R, 2.55, z0 + .45), (R, 2.55, z0 + .5), (R, 2.25, z0 + .5)], '#cfc8b8')
        quad(s, cam, [(R, 1.25, z0 + 1.6), (R, 2.0, z0 + 1.6), (R, 2.0, z0 + 3.2), (R, 1.25, z0 + 3.2)], '#f7f2e6')
    # ceiling lights
    for z0 in range(2, 29, 3):
        quad(s, cam, [(-.12, Hh - .01, z0), (.12, Hh - .01, z0), (.12, Hh - .01, z0 + 1.4), (-.12, Hh - .01, z0 + 1.4)], '#fffef6' if not t['lit'] else '#717a9a')
    if t['lit']:
        for z0 in (3, 9, 17):
            p = cam.p(L, 1.8, z0)
            glow(s, p[0], p[1], 2600 / z0, '#8aa6ff', .3)
    tint(s, t)
    vignette(s)
    return s


def school_gate(t):
    s = Svg()
    sky(s, t, 0, 0, W, 700, seed=21)
    night = t['lit']
    # school building behind the yard
    s.rect(120, 360, 1360, 300, '#f3efe6')
    s.rect(120, 360, 1360, 22, '#d9d2c3')
    for row in range(3):
        for col in range(16):
            x = 150 + col * 82
            if 690 < x < 900:
                continue
            on = night and (row * 7 + col * 3) % 5 == 0
            seen = 560 < x < 1024  # trees and gate pillars stand in front of the rest
            shape = f'<rect x="{x}" y="{400 + row * 85}" width="56" height="52" fill="{"#fff1b8" if on else "#9dc6e4"}" rx="2"/>'
            lit(s, shape) if on and seen else s.add(shape)
            s.rect(x, 400 + row * 85 + 26, 56, 3, '#e8edf0')
        s.rect(120, 462 + row * 85, 1360, 8, '#e1dacb')
    s.rect(705, 250, 190, 410, '#f7f4ee')
    s.poly([(695, 250), (800, 205), (905, 250)], '#c7c0b2')
    s.circle(800, 320, 46, '#ffffff', 'stroke="#6f6658" stroke-width="7"')
    s.line((800, 320), (800, 290), '#3a3530', 5, 'stroke-linecap="round"')
    s.line((800, 320), (822, 330), '#3a3530', 5, 'stroke-linecap="round"')
    s.rect(745, 560, 110, 100, '#b8c9d6')
    # yard and trees
    s.rect(0, 640, W, 280, '#e3cea2')
    rnd = random.Random(4)
    for x in (60, 230, 1370, 1540):
        tree(s, x, 760, 1.15, CHERRY, '#7d5843', rnd, 11)
    for x in (380, 1220):
        tree(s, x, 740, .8, CHERRY, '#7d5843', rnd, 9)
    # fence
    for x0, x1 in ((0, 560), (1040, W)):
        s.rect(x0, 690, x1 - x0, 90, '#5d8c6a', 'opacity=".35"')
        for x in range(x0, x1, 16):
            s.line((x, 690), (x, 780), '#4f7a5c', 2, 'opacity=".6"')
        s.rect(x0, 686, x1 - x0, 8, '#5f7f68')
    # pillars
    for x in (400, 1080):
        s.rect(x, 430, 140, 480, '#c99f7f')
        for y in range(440, 910, 34):
            s.line((x, y), (x + 140, y), '#b0876a', 3)
        s.rect(x + 140, 430, 20, 480, '#a97f64')
        s.rect(x - 10, 414, 170, 26, '#8f7766')
    s.rect(424, 540, 92, 230, '#f6f1e2')
    for y in range(570, 760, 42):
        s.rect(446, y, 48, 10, '#544b40', 'opacity=".75"')
    # sliding gate pulled open to the right
    s.rect(1240, 760, 340, 12, '#7d8792')
    s.rect(1240, 890, 340, 12, '#7d8792')
    for x in range(1250, 1580, 26):
        s.rect(x, 760, 7, 140, '#8e98a3')
    # path through the gate, sidewalk, road
    s.poly([(560, 780), (1040, 780), (1160, 910), (440, 910)], '#d8c39a')
    s.rect(0, 905, W, 110, '#cfd3d6')
    for x in range(0, W, 120):
        s.line((x, 905), (x - 40, 1015), '#b9bec2', 3)
    s.rect(0, 905, W, 10, '#e2e5e7')
    s.rect(0, 1010, W, 190, '#6b7078')
    for x in range(40, W, 260):
        s.rect(x, 1100, 150, 12, '#f2f2ee')
    if night:
        glow(s, 470, 420, 140, '#ffe6a8', .8)
        glow(s, 1150, 420, 140, '#ffe6a8', .8)
    tint(s, t)
    vignette(s)
    return s


def rooftop(t):
    s, cam = Svg(), Cam(f=800, cy=640, h=1.55, x=0)
    sky(s, t, 0, 0, W, 760, seed=31)
    rnd = random.Random(8)
    # skyline below the horizon
    x = 0
    while x < W:
        w, h = rnd.randint(50, 130), rnd.randint(30, 170)
        s.rect(x, 640 - h, w, h + 20, '#9bb0c6' if not t['lit'] else '#2a3658', 'opacity=".9"')
        if t['lit']:
            for _ in range(w * h // 900):
                lx = x + rnd.randint(4, w - 8)
                (lit if 500 < lx < 1080 else lambda s, v: s.add(v))(s, f'<rect x="{lx}" y="{640 - h + rnd.randint(6, max(7, h - 6))}" width="4" height="5" fill="#ffe9a6"/>')
        x += w + rnd.randint(0, 20)
    # floor
    quad(s, cam, [(-30, 0, .3), (30, 0, .3), (30, 0, 9), (-30, 0, 9)], '#bdbab3')
    for i in range(-20, 21):
        s.line(cam.p(i * 1.2, 0, .3), cam.p(i * 1.2, 0, 9), '#a8a59e', 1.5)
    for z in (1, 2, 3, 4.2, 5.6, 7.2):
        s.line(cam.p(-30, 0, z), cam.p(30, 0, z), '#a8a59e', 1.5)
    # parapet and fence
    quad(s, cam, [(-30, 0, 9), (30, 0, 9), (30, .45, 9), (-30, .45, 9)], '#d5d2ca')
    a, b = cam.p(-30, .45, 9), cam.p(30, 2.6, 9)
    pid = s.uid('p')
    s.defs.append(f'<pattern id="{pid}" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="18" height="18" fill="none" stroke="#5f7d76" stroke-width="2"/></pattern>')
    s.rect(0, b[1], W, a[1] - b[1], f'url(#{pid})', 'opacity=".85"')
    for X in range(-12, 13, 2):
        s.line(cam.p(X, .45, 9), cam.p(X, 2.6, 9), '#4f6a64', 6)
    s.line((0, b[1]), (W, b[1]), '#4f6a64', 7)
    # stairwell house on the left
    box(s, cam, -6.5, -3.2, 0, 2.7, 2.2, 6.5, '#d9d6cf', '#e6e2da', '#cbc7bf')
    quad(s, cam, [(-3.2, 0, 3.2), (-3.2, 2.1, 3.2), (-3.2, 2.1, 4.2), (-3.2, 0, 4.2)], '#7e8a96')
    quad(s, cam, [(-3.2, 1.0, 3.32), (-3.2, 1.08, 3.32), (-3.2, 1.08, 3.5), (-3.2, 1.0, 3.5)], '#c9cdd1')
    # water tank on the right
    box(s, cam, 3.2, 5.2, 0, 1.0, 5.0, 7.0, '#8d939a', '#9aa1a8', '#7f868d')
    box(s, cam, 3.0, 5.4, 1.0, 2.9, 5.0, 7.2, '#cfd6dc', '#dfe5ea', '#bcc4cb')
    if t['lit']:
        p = cam.p(-3.3, 2.3, 3.7)
        glow(s, p[0], p[1], 160, '#ffe6a8', .7)
    tint(s, t)
    vignette(s)
    return s


def street(t):
    s, cam = Svg(), Cam(f=820, cy=600, h=1.6, x=-.4)
    D = 70
    sky(s, t, 0, 0, W, 700, seed=41)
    rnd = random.Random(12)
    p = cam.p(0, 0, D)
    # distant hills and apartments
    s.path(f'M0 {p[1] - 40} Q 400 {p[1] - 160} 800 {p[1] - 70} T 1600 {p[1] - 90} V {p[1] + 5} H 0 Z', '#9cc2a8' if not t['lit'] else '#2a3d4a')
    for i in range(5):
        x = 520 + i * 120
        s.rect(x, p[1] - 140 + (i % 2) * 30, 80, 150, '#d8dee6' if not t['lit'] else '#38425f')
    # road and sidewalks
    quad(s, cam, [(-3, 0, .5), (3, 0, .5), (3, 0, D), (-3, 0, D)], '#73777e')
    for X0, X1 in ((-5.5, -3), (3, 5.5)):
        box(s, cam, X0, X1, 0, .15, .5, D, '#c9c6bf', '#a9a69f', '#b5b2ab')
    z = 1.5
    while z < D:
        quad(s, cam, [(-.06, .001, z), (.06, .001, z), (.06, .001, z + 1.5), (-.06, .001, z + 1.5)], '#f4f1e6')
        z += 3.5
    for X in (-2.9, 2.9):
        quad(s, cam, [(X - .05, .001, .5), (X + .05, .001, .5), (X + .05, .001, D), (X - .05, .001, D)], '#f4f1e6')
    # buildings on both sides, far to near
    palettes = ['#efe2cc', '#e6d5c0', '#dcd9d3', '#f1e9dd', '#d9c8b2', '#e9dccb']
    awn = ['#d9605a', '#4f86c6', '#5fae7d', '#e4a23f', '#9a6fc0']
    for side in (-1, 1):
        X = 5.5 * side
        z = 3
        segs = []
        while z < D - 5:
            ln = rnd.uniform(5, 9)
            segs.append((z, z + ln, rnd.uniform(5, 11), rnd.choice(palettes), rnd.choice(awn), rnd.random() < .6))
            z += ln + .2
        for z0, z1, h, col, aw, shop in reversed(segs):
            quad(s, cam, [(X, 0, z0), (X, h, z0), (X, h, z1), (X, 0, z1)], col)
            quad(s, cam, [(X, 0, z0), (X, h, z0), (X + .6 * side, h, z0), (X + .6 * side, 0, z0)], shade(col, -.18))
            for fy in range(3, int(h), 3):
                for k in range(int((z1 - z0) // 2.2)):
                    zz = z0 + .8 + k * 2.2
                    on = t['lit'] and rnd.random() < .45
                    shape = f'<polygon points="{pts([cam.p(X, fy, zz), cam.p(X, fy + 1.3, zz), cam.p(X, fy + 1.3, zz + 1.2), cam.p(X, fy, zz + 1.2)])}" fill="{"#ffe7a3" if on else "#a9c4d8"}"/>'
                    lit(s, shape) if on and zz > 12 else s.add(shape)
            if shop:
                shape = f'<polygon points="{pts([cam.p(X, 0, z0 + .3), cam.p(X, 2.4, z0 + .3), cam.p(X, 2.4, z1 - .3), cam.p(X, 0, z1 - .3)])}" fill="{"#ffefc7" if t["lit"] else "#bcd3df"}"/>'
                lit(s, shape) if t['lit'] and z0 > 12 else s.add(shape)
                quad(s, cam, [(X, 2.5, z0 + .2), (X, 3.0, z0 + .2), (X - .9 * side, 2.6, z0 + .2), (X - .9 * side, 2.5, z0 + .2)], shade(aw, -.2))
                quad(s, cam, [(X, 3.0, z0 + .2), (X, 3.0, z1 - .2), (X - .9 * side, 2.6, z1 - .2), (X - .9 * side, 2.6, z0 + .2)], aw)
            else:
                quad(s, cam, [(X, 0, z0 + 1), (X, 2.1, z0 + 1), (X, 2.1, z0 + 2), (X, 0, z0 + 2)], '#8a6b4f')
    # utility poles and wires
    tops = {-1: [], 1: []}
    for side in (-1, 1):
        for z in (4, 14, 24, 34, 44, 54):
            X = 3.3 * side
            box(s, cam, X - .13, X + .13, 0, 8.2, z, z + .26, '#9a9d9f', '#b9bcbe', '#9a9d9f')
            box(s, cam, X - 1.0, X + 1.0, 7.6, 7.75, z, z + .12, '#7d8083', '#8d9093', '#7d8083')
            tops[side].append(cam.p(X, 7.7, z))
    for side in (-1, 1):
        for a, b in zip(tops[side], tops[side][1:]):
            mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 18)
            s.path(f'M{fmt(a[0])} {fmt(a[1])} Q {fmt(mid[0])} {fmt(mid[1] + 20)} {fmt(b[0])} {fmt(b[1])}', 'none', 'stroke="#3c3f44" stroke-width="2" opacity=".7"')
    if t['lit']:
        for side in (-1, 1):
            for z in (4, 14, 24, 34):
                p = cam.p(3.0 * side, 6.8, z)
                glow(s, p[0], p[1], 900 / z, '#ffe2a0', .9)
                pf = cam.p(2.0 * side, 0, z + 1)
                s.ellipse(pf[0], pf[1], 1800 / z, 300 / z, '#ffe2a0', 'opacity=".25" style="mix-blend-mode:screen"')
    tint(s, t)
    vignette(s)
    return s


def house_front(t):
    s = Svg()
    sky(s, t, 0, 0, W, 760, seed=51)
    rnd = random.Random(5)
    for x in range(-40, W + 80, 110):
        s.circle(x, 700 + rnd.randint(-20, 20), rnd.randint(70, 110), '#7fb276' if not t['lit'] else '#2b4440')
    on = t['lit']
    win = '#fff0b5' if on else '#a7cbe3'
    s.rect(0, 740, W, 260, '#8cc277')
    # house body
    s.rect(330, 380, 940, 560, '#f3e7d2')
    for y in range(400, 940, 26):
        s.line((330, y), (1270, y), '#e3d3b8', 2)
    s.rect(1270, 380, 40, 560, '#dccbae')
    s.rect(330, 650, 980, 18, '#d6c3a3')
    # roof
    s.poly([(280, 400), (800, 170), (1360, 400)], '#556079')
    s.poly([(280, 400), (1360, 400), (1360, 420), (280, 420)], '#3f4860')
    for k in range(1, 7):
        y = 170 + k * 34
        dx = (y - 170) / 230 * 520
        s.line((800 - dx, y), (800 + dx + dx * .07, y), '#4b5570', 3)
    s.circle(800, 300, 38, win, 'stroke="#fbf6ee" stroke-width="10"')
    # upper windows
    for x in (420, 1000):
        s.rect(x - 10, 450, 200, 170, '#fbf6ee')
        s.rect(x, 460, 180, 150, win)
        s.line((x + 90, 460), (x + 90, 610), '#fbf6ee', 8)
        s.rect(x - 16, 612, 212, 14, '#c9b391')
        s.rect(x - 4, 455, 40, 160, '#c9e0d6' if not on else '#e8c98a', 'opacity=".9"')
        s.rect(x + 144, 455, 40, 160, '#c9e0d6' if not on else '#e8c98a', 'opacity=".9"')
    # ground floor: big window and door
    s.rect(390, 720, 300, 180, '#fbf6ee')
    s.rect(402, 732, 276, 156, win)
    for x in (494, 586):
        s.line((x, 732), (x, 888), '#fbf6ee', 7)
    s.rect(380, 896, 320, 16, '#c9b391')
    s.poly([(860, 700), (1200, 700), (1230, 735), (830, 735)], '#556079')
    s.rect(930, 735, 200, 205, '#fbf6ee')
    s.rect(948, 750, 164, 190, '#8a5a3c')
    s.rect(960, 765, 64, 160, '#9b6a49')
    s.rect(1036, 765, 64, 160, '#9b6a49')
    s.circle(1030, 850, 6, '#e8c46a')
    # fence wall and gate
    for x0, x1 in ((0, 660), (940, W)):
        s.rect(x0, 860, x1 - x0, 120, '#d9d4cb')
        s.rect(x0, 850, x1 - x0, 16, '#c5bfb4')
        for x in range(x0, x1, 80):
            s.line((x, 866), (x, 980), '#c8c2b7', 2)
    for x in (600, 940):
        s.rect(x, 800, 70, 180, '#cfc8bc')
        s.rect(x - 6, 790, 82, 16, '#b9b2a6')
    s.rect(610, 830, 50, 34, '#c94f43', 'rx="4"')
    s.rect(616, 852, 38, 4, '#8f3229')
    for x in range(672, 940, 20):
        s.rect(x, 880, 6, 100, '#68707a')
    s.rect(670, 880, 270, 8, '#68707a')
    s.rect(670, 930, 270, 6, '#68707a')
    # hedges and a tree
    for x in range(-20, 620, 70):
        s.circle(x, 852, 46, '#5f9e58')
        s.circle(x - 10, 842, 34, '#78b56c')
    for x in range(980, W + 40, 70):
        s.circle(x, 852, 46, '#5f9e58')
        s.circle(x - 10, 842, 34, '#78b56c')
    tree(s, 170, 860, 1.25, rnd=rnd)
    # pavement and road
    s.rect(0, 980, W, 80, '#cfd3d6')
    s.rect(0, 980, W, 8, '#e2e5e7')
    s.rect(0, 1060, W, 140, '#6b7078')
    if on:
        for x, y, w, hh in ((420, 460, 180, 150), (1000, 460, 180, 150), (402, 732, 276, 72)):
            s.light(f'<rect x="{x}" y="{y}" width="{w}" height="{hh}" fill="#ffe9a8" opacity=".55"/>')
        s.light('<circle cx="800" cy="300" r="30" fill="#ffe9a8" opacity=".6"/>')
        glow(s, 635, 790, 150, '#ffe6a8', .85)
        glow(s, 540, 810, 300, '#ffd98a', .35)
        glow(s, 1100, 540, 260, '#ffd98a', .3)
    tint(s, t)
    vignette(s)
    return s


def bedroom(t, girl):
    s, cam = Svg(), Cam(f=700, cy=580, h=1.3, x=.1)
    L, R, D, Hh = -2.7, 2.7, 4.6, 2.5
    wall = '#f6e3df' if girl else '#dfe5ec'
    wall2 = shade(wall, -.06)
    quad(s, cam, [(L, Hh, .3), (R, Hh, .3), (R, Hh, D), (L, Hh, D)], '#faf6f2' if girl else '#f1f3f5')
    quad(s, cam, [(L, 0, .3), (L, Hh, .3), (L, Hh, D), (L, 0, D)], wall2)
    quad(s, cam, [(R, 0, .3), (R, Hh, .3), (R, Hh, D), (R, 0, D)], wall2)
    quad(s, cam, [(L, 0, D), (R, 0, D), (R, Hh, D), (L, Hh, D)], wall)
    floor_planks(s, cam, L, R, .3, D, '#d6b083' if girl else '#b88c62', '#a77d55' if girl else '#8c6440', .15)
    if girl:
        for X in (L, R):
            quad(s, cam, [(X, 1.0, .3), (X, 1.0, D), (X, 1.05, D), (X, 1.05, .3)], '#e9cfc9')
    # window in the back wall
    wx0, wx1 = (-.4, 1.4) if girl else (-1.3, .5)
    win = [cam.p(wx0, 1.0, D), cam.p(wx1, 1.0, D), cam.p(wx1, 2.15, D), cam.p(wx0, 2.15, D)]
    clip_to(s, [win])
    sky(s, t, win[0][0], win[3][1], win[1][0] - win[0][0], win[0][1] - win[3][1], seed=61)
    rnd = random.Random(2)
    for k in range(5):
        x = win[0][0] + k * (win[1][0] - win[0][0]) / 4
        s.rect(x - 20, win[0][1] - rnd.randint(40, 90), 50, 120, '#c4d3e2' if not t['lit'] else '#2c3858')
    s.add('</g>')
    fr = '#ffffff'
    for X in (wx0, (wx0 + wx1) / 2, wx1):
        s.line(cam.p(X, 1.0, D), cam.p(X, 2.15, D), fr, 9)
    s.line(cam.p(wx0, 1.0, D), cam.p(wx1, 1.0, D), fr, 12)
    s.line(cam.p(wx0, 2.15, D), cam.p(wx1, 2.15, D), fr, 9)
    cur = ('#f4b6c2', '#e295a8') if girl else ('#5b6f98', '#46597f')
    for X0, X1 in ((wx0 - .45, wx0 + .1), (wx1 - .1, wx1 + .45)):
        quad(s, cam, [(X0, .8, D - .02), (X1, .8, D - .02), (X1, 2.3, D - .02), (X0, 2.3, D - .02)], cur[0])
        for k in range(1, 4):
            X = X0 + (X1 - X0) * k / 4
            s.line(cam.p(X, .82, D - .03), cam.p(X, 2.28, D - .03), cur[1], 4, 'opacity=".7"')
    if girl:
        quad(s, cam, [(wx0 - .5, 2.3, D - .02), (wx1 + .5, 2.3, D - .02), (wx1 + .5, 2.12, D - .02), (wx0 - .5, 2.12, D - .02)], '#fbe8ee')
    # rug
    if girl:
        c = cam.p(.1, 0, 2.6)
        s.ellipse(c[0], c[1], 330, 70, '#f7c9d4')
        s.ellipse(c[0], c[1], 270, 52, '#fbe0e6')
    else:
        quad(s, cam, [(-1.0, .001, 1.6), (1.3, .001, 1.6), (1.3, .001, 3.4), (-1.0, .001, 3.4)], '#6f7f99')
        quad(s, cam, [(-.85, .002, 1.75), (1.15, .002, 1.75), (1.15, .002, 3.25), (-.85, .002, 3.25)], '#8696b0')
    bx = (L, L + 1.1) if not girl else (R - 1.1, R)
    # bed along a side wall
    blanket = ('#f5b9c8', '#e59aae', '#f9d3dc') if girl else ('#4f73a8', '#3f5f8f', '#6c8cbc')
    box(s, cam, bx[0], bx[1], 0, .45, 1.9, D, '#8e6c4e', '#a07c5c', '#7f5f43')
    box(s, cam, bx[0], bx[1], .45, .62, 1.95, D - .05, blanket[2], blanket[0], blanket[1])
    box(s, cam, bx[0] + .02, bx[1] - .02, .45, .64, 1.95, D - 1.3, blanket[0], blanket[0], blanket[1])
    box(s, cam, bx[0] + .15, bx[1] - .15, .62, .78, D - .65, D - .15, '#ffffff', '#f2f2f2', '#e2e2e2')
    hb = bx[0] if girl else bx[1]
    box(s, cam, bx[0], bx[1], 0, 1.05, D - .1, D, '#8e6c4e', '#a07c5c', '#7f5f43')
    if girl:
        for i, (dx, col) in enumerate(((.25, '#c9a27e'), (.6, '#ffffff'), (.85, '#f2c1d1'))):
            p = cam.p(bx[0] + dx, .9, D - .8)
            s.circle(p[0], p[1], 34 - i * 4, col)
            s.circle(p[0] - 22, p[1] - 28, 12, col)
            s.circle(p[0] + 22, p[1] - 28, 12, col)
            s.circle(p[0] - 9, p[1] - 4, 3.5, '#4a3a32')
            s.circle(p[0] + 9, p[1] - 4, 3.5, '#4a3a32')
    # furniture on the other side
    if girl:
        # dresser with round mirror and a plant
        box(s, cam, L, L + .5, 0, .8, 2.4, 3.6, '#f7eee6', '#fffaf4', '#eadfd3')
        for y in (.25, .52):
            quad(s, cam, [(L + .5, y, 2.5), (L + .5, y + .2, 2.5), (L + .5, y + .2, 3.5), (L + .5, y, 3.5)], '#f1e3d6')
        m = cam.p(L + .02, 1.4, 3.0)
        s.ellipse(m[0], m[1], 50, 150, '#d9c3a6')
        s.ellipse(m[0], m[1], 40, 132, '#d8ecf4' if not t['lit'] else '#55607e')
        p = cam.p(L + .25, .8, 3.8)
        s.rect(p[0] - 22, p[1] - 40, 44, 44, '#d9907a')
        for k in range(6):
            s.ellipse(p[0] + (k - 2.5) * 12, p[1] - 70 - (k % 2) * 16, 14, 36, '#6aa865', f'transform="rotate({(k - 2.5) * 14} {fmt(p[0])} {fmt(p[1] - 40)})"')
        # string lights
        a, b = cam.p(L, 2.3, 1.2), cam.p(L, 2.3, D)
        c2 = cam.p(R, 2.3, D)
        s.path(f'M{fmt(a[0])} {fmt(a[1])} Q {fmt((a[0] + b[0]) / 2)} {fmt(b[1] + 50)} {fmt(b[0])} {fmt(b[1])} Q {fmt((b[0] + c2[0]) / 2)} {fmt(b[1] + 40)} {fmt(c2[0])} {fmt(c2[1])}', 'none', 'stroke="#8a7a6a" stroke-width="2"')
        for k in range(12):
            u = k / 11
            x = (1 - u) ** 2 * b[0] + 2 * u * (1 - u) * (b[0] + c2[0]) / 2 + u * u * c2[0]
            y = (1 - u) ** 2 * b[1] + 2 * u * (1 - u) * (b[1] + 40) + u * u * c2[1]
            s.circle(x, y + 8, 6, '#ffe6a0' if t['lit'] else '#fff7dc')
            if t['lit']:
                glow(s, x, y + 8, 40, '#ffdd88', .7)
        # poster frame
        quad(s, cam, [(-1.6, 1.2, D), (-.9, 1.2, D), (-.9, 2.0, D), (-1.6, 2.0, D)], '#ffffff')
        quad(s, cam, [(-1.55, 1.25, D), (-.95, 1.25, D), (-.95, 1.95, D), (-1.55, 1.95, D)], '#ffd6df')
        p = cam.p(-1.25, 1.6, D)
        s.circle(p[0], p[1], 22, '#f49ab0')
    else:
        # desk with monitor, chair, bookshelf, poster
        box(s, cam, R - .7, R, .7, .76, 2.0, 3.9, '#c69c6d', '#a87f52', '#93703f')
        for z in (2.05, 3.8):
            box(s, cam, R - .66, R - .6, 0, .7, z, z + .05, '#7b7f86', '#6c7077', '#5d6168')
        box(s, cam, R - .45, R - .4, .76, 1.25, 2.5, 3.3, '#2c3038', '#3a3f48', '#22262c')
        quad(s, cam, [(R - .45, .82, 2.55), (R - .45, 1.2, 2.55), (R - .45, 1.2, 3.25), (R - .45, .82, 3.25)], '#9ad0ff' if t['lit'] else '#38506b')
        box(s, cam, R - 1.1, R - .7, .45, .52, 2.6, 3.1, '#3b4250', '#2f3541', '#262b35')
        box(s, cam, R - 1.12, R - 1.06, .52, 1.05, 2.6, 3.1, '#3b4250', '#2f3541', '#262b35')
        box(s, cam, R - .9, R, 0, 2.0, D - .4, D, '#9a7553', '#b08a65', '#83634a')
        for k, y in enumerate((.45, .9, 1.35)):
            quad(s, cam, [(R - .88, y, D - .4), (R - .02, y, D - .4), (R - .02, y + .03, D - .4), (R - .88, y + .03, D - .4)], '#83634a')
            for j in range(7):
                X = R - .85 + j * .11
                quad(s, cam, [(X, y + .03, D - .38), (X + .09, y + .03, D - .38), (X + .09, y + .38 - (j % 3) * .04, D - .38), (X, y + .38 - (j % 3) * .04, D - .38)], ['#c0504d', '#4f81bd', '#9bbb59', '#f2c14e', '#8064a2'][(j + k) % 5])
        quad(s, cam, [(L + .01, 1.25, 2.9), (L + .01, 2.05, 2.9), (L + .01, 2.05, 3.6), (L + .01, 1.25, 3.6)], '#2d3e5e')
        quad(s, cam, [(L + .01, 1.35, 2.98), (L + .01, 1.95, 2.98), (L + .01, 1.95, 3.52), (L + .01, 1.35, 3.52)], '#e46b4f')
        p = cam.p(L + .01, 1.65, 3.25)
        s.circle(p[0], p[1], 26, '#f7d36b')
    if t['lit']:
        if girl:
            p = cam.p(R - .55, 1.0, D - .3)
        else:
            p = cam.p(R - .4, 1.0, 3.0)
        glow(s, p[0], p[1], 420, '#ffd892', .55)
    room_tint(s, t)
    vignette(s)
    return s


def boy_room(t):
    return bedroom(t, False)


def girl_room(t):
    return bedroom(t, True)


def park(t):
    s, cam = Svg(), Cam(f=820, cy=620, h=1.6, x=.3)
    sky(s, t, 0, 0, W, 720, seed=71)
    rnd = random.Random(17)
    for x in range(-60, W + 100, 90):
        s.circle(x, 610 + rnd.randint(-25, 10), rnd.randint(60, 95), '#6ea86a' if not t['lit'] else '#22383a')
    s.rect(0, 610, W, 590, '#8cc277')
    for _ in range(140):
        x, y = rnd.uniform(0, W), rnd.uniform(640, 1200)
        s.ellipse(x, y, 10 + (y - 620) / 30, 3 + (y - 620) / 120, '#7ab266', 'opacity=".7"')
    # path to the vanishing point, slightly curved
    a, b = cam.p(-1.6, 0, .6), cam.p(1.6, 0, .6)
    f1, f2 = cam.p(-.9, 0, 40), cam.p(.9, 0, 40)
    s.path(f'M{fmt(a[0])} 1200 C {fmt(a[0] + 160)} 900 {fmt(f1[0] - 120)} 700 {fmt(f1[0])} {fmt(f1[1])} L {fmt(f2[0])} {fmt(f2[1])} C {fmt(f2[0] + 60)} 700 {fmt(b[0] + 260)} 900 {fmt(b[0] + 300)} 1200 Z', '#e7d4aa')
    # trees on both sides
    for z in (30, 22, 15, 10, 6):
        for X in (-6, 6.5):
            p = cam.p(X + rnd.uniform(-1, 1), 0, z)
            tree(s, p[0], p[1], 6.5 / z * 1.5, rnd=rnd, puffs=10)
    # lamp and bench
    lamp = cam.p(-2.6, 0, 4.5)
    top = cam.p(-2.6, 3.4, 4.5)
    s.rect(lamp[0] - 6, top[1], 12, lamp[1] - top[1], '#3d4650')
    s.rect(lamp[0] - 26, top[1] - 34, 52, 40, '#3d4650', 'rx="6"')
    s.rect(lamp[0] - 18, top[1] - 26, 36, 26, '#fff3c4' if t['lit'] else '#e8eef0')
    box(s, cam, 2.0, 3.8, .42, .48, 3.6, 4.1, '#b6804e', '#a06f42', '#8f6038')
    box(s, cam, 2.0, 3.8, .55, .95, 4.1, 4.16, '#b6804e', '#a06f42', '#8f6038')
    for X in (2.15, 3.65):
        box(s, cam, X - .04, X + .04, 0, .42, 3.65, 4.1, '#3d4650', '#3d4650', '#2f363e')
    if t['lit']:
        glow(s, lamp[0], top[1] - 14, 260, '#ffe6a8', .9)
        s.ellipse(lamp[0] + 40, lamp[1], 260, 60, '#ffe6a8', 'opacity=".22" style="mix-blend-mode:screen"')
    tint(s, t)
    vignette(s)
    return s


PLACES = [
    ('classroom', '교실', classroom),
    ('hallway', '학교 복도', hallway),
    ('school-gate', '교문 앞', school_gate),
    ('rooftop', '학교 옥상', rooftop),
    ('street', '거리', street),
    ('house-front', '집 앞', house_front),
    ('boy-room', '남자 방', boy_room),
    ('girl-room', '여자 방', girl_room),
    ('park', '공원', park),
]


def main():
    OUT.mkdir(exist_ok=True)
    only = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else ''
    for pid, name, fn in PLACES:
        if only and only not in pid:
            continue
        for tid, t in TIMES.items():
            svg = fn(t)
            svg.body.insert(0, f'<rect width="{W}" height="{H}" fill="#e6dac4"/>')  # no see-through seams between shapes
            (OUT / f'{pid}-{tid}.svg').write_text(svg.text())
    from characters import CHARACTERS, EXPRESSIONS, sprite
    for cid, name, fn in CHARACTERS:
        for eid, ename in EXPRESSIONS:
            if only and only not in cid:
                continue
            (OUT / f'{cid}-{eid}.svg').write_text(sprite(fn, eid))
    print('svg written')
    if '--all' in sys.argv:
        pack()


ROOT = HERE.parent
ART = ROOT / 'assets' / 'art'


def pack():
    from PIL import Image
    from characters import CHARACTERS, EXPRESSIONS
    env = dict(os.environ, NODE_PATH=subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True).stdout.strip())
    subprocess.run(['node', str(HERE / 'render.cjs'), str(OUT)], check=True, env=env)
    ART.mkdir(exist_ok=True)
    for old in ART.glob('*.webp'):
        old.unlink()
    places, people, total = [], [], 0

    def save(src, name, size, quality, mode='RGB', crop=None):
        nonlocal total
        im = Image.open(src).convert(mode)
        im = (im.crop(crop) if crop else im).resize(size, Image.LANCZOS)
        dest = ART / f'{name}.webp'
        im.save(dest, 'WEBP', quality=quality, method=6)
        total += dest.stat().st_size

    for pid, name, _ in PLACES:
        for tid in TIMES:
            save(OUT / f'{pid}-{tid}.png', f'{pid}-{tid}', (1200, 900), 84)
        places.append({'id': pid, 'name': name})
    for cid, name, _ in CHARACTERS:
        for eid, _ in EXPRESSIONS:
            # the figure only fills the middle of its 640×1520 canvas
            save(OUT / f'{cid}-{eid}.png', f'{cid}-{eid}', (288, 1216), 90, 'RGBA', (140, 0, 500, 1520))
        people.append({'id': cid, 'name': name})
    data = {'places': places, 'times': [{'id': k, 'name': v['name']} for k, v in TIMES.items()],
            'people': people, 'expressions': [{'id': k, 'name': v} for k, v in EXPRESSIONS]}
    (ROOT / 'assets' / 'art-library.js').write_text(
        "'use strict';\n// Built-in pictures (generated by art-src/make-art.py; do not edit by hand): art/<place>-<time>.webp backgrounds and\n"
        "// art/<person>-<expression>.webp characters, all drawn for this editor in one style, so no credit is needed.\n"
        f"(function(root){{root.ArtLibrary={json.dumps(data, ensure_ascii=False)};}})(globalThis);\n")
    print(f'{len(list(ART.glob("*.webp")))} pictures, {total / 1048576:.2f} MB')


if __name__ == '__main__':
    main()
