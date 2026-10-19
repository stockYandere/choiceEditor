"""The two built-in characters (남학생 · 여학생): flat cel-shaded anime sprites drawn from paths, standing on a
transparent 640×1600 canvas, feet at the bottom. Expressions only change the face."""

LINE = '#3a2a2c'
SKIN, SKIN2, BLUSH = '#fde3d3', '#f3c4b0', '#f59a9a'


def stroke(w=5):
    return f'stroke="{LINE}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"'


def mirror(d, cx=320):
    """Mirror an absolute path (M/L/Q/C/Z with x y pairs) around x=cx."""
    out, tok = [], d.replace(',', ' ').split()
    i, num = 0, 0
    for t in tok:
        if t.isalpha():
            out.append(t)
            num = 0
        else:
            v = float(t)
            out.append(f'{(2 * cx - v) if num % 2 == 0 else v:g}')
            num += 1
    return ' '.join(out)


EXPRESSIONS = [('neutral', '기본'), ('smile', '웃음'), ('angry', '화남'), ('sad', '슬픔'), ('surprised', '놀람')]


def eye(x, y, girl, expr, iris, flip=False):
    """One eye centred at x,y. flip draws the right eye (outer corner on the right)."""
    s = -1 if flip else 1
    w, h = (31, 30) if girl else (29, 24)
    g = []
    if expr == 'smile':
        # closed happy arc
        g.append(f'<path d="M{x - w * s} {y + 4} Q {x} {y - h * .9} {x + w * s} {y + 4}" fill="none" {stroke(7)}/>')
        return ''.join(g)
    top = y - h * (1.1 if expr == 'surprised' else 1.0)
    bot = y + h * (.85 if expr != 'angry' else .6)
    outer, inner = x - w * s, x + w * s
    # white
    g.append(f'<path d="M{inner} {y - 4} Q {inner - 2 * s} {top} {x} {top} Q {outer + 4 * s} {top + 2} {outer} {y + 2} Q {outer + 6 * s} {bot} {x} {bot} Q {inner - 4 * s} {bot - 2} {inner} {y - 4} Z" fill="#ffffff"/>')
    clip = f'eye{"r" if flip else "l"}'
    g.append(f'<clipPath id="{clip}"><path d="M{inner} {y - 4} Q {inner - 2 * s} {top} {x} {top} Q {outer + 4 * s} {top + 2} {outer} {y + 2} Q {outer + 6 * s} {bot} {x} {bot} Q {inner - 4 * s} {bot - 2} {inner} {y - 4} Z"/></clipPath>')
    ir = 15 if expr == 'surprised' else (19 if girl else 17)
    iy = y + 2
    g.append(f'<g clip-path="url(#{clip})">')
    g.append(f'<ellipse cx="{x + 2 * s}" cy="{iy}" rx="{ir}" ry="{ir * 1.25}" fill="url(#iris)"/>')
    g.append(f'<ellipse cx="{x + 2 * s}" cy="{iy + 2}" rx="{ir * .45}" ry="{ir * .62}" fill="{iris[2]}"/>')
    g.append(f'<path d="M{outer} {top - 4} L {inner} {top - 4} L {inner} {top + 9} Q {x} {top + 2} {outer} {top + 9} Z" fill="{iris[2]}" opacity=".35"/>')
    g.append(f'<circle cx="{x - 6 * s + 2 * s}" cy="{iy - 10}" r="{6 if girl else 5}" fill="#ffffff"/>')
    g.append(f'<circle cx="{x + 9 * s}" cy="{iy + 10}" r="3" fill="#ffffff" opacity=".9"/>')
    g.append('</g>')
    # upper lash line with a flick at the outer corner
    lw = 8 if girl else 6
    g.append(f'<path d="M{inner + 2 * s} {y - 2} Q {inner - 4 * s} {top - 3} {x} {top - 3} Q {outer + 2 * s} {top - 2} {outer - 6 * s} {y - 2 + (0 if girl else 4)}" fill="none" stroke="{LINE}" stroke-width="{lw}" stroke-linecap="round"/>')
    if girl:
        g.append(f'<path d="M{outer + 2 * s} {top + 6} L {outer - 10 * s} {top - 2}" stroke="{LINE}" stroke-width="5" stroke-linecap="round"/>')
    g.append(f'<path d="M{outer + 8 * s} {bot - 1} Q {x} {bot + 4} {inner - 6 * s} {bot - 3}" fill="none" stroke="{LINE}" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>')
    if expr == 'sad':
        g.append(f'<path d="M{inner + 4 * s} {top - 2} Q {x} {top + 2} {outer - 4 * s} {top + 12} L {outer - 4 * s} {top - 12} L {inner + 4 * s} {top - 12} Z" fill="{SKIN}"/>')
        g.append(f'<path d="M{inner + 2 * s} {top - 1} Q {x} {top + 2} {outer - 6 * s} {top + 13}" fill="none" stroke="{LINE}" stroke-width="{lw}" stroke-linecap="round"/>')
    if expr == 'angry':
        g.append(f'<path d="M{inner + 4 * s} {top + 10} L {outer - 4 * s} {top - 6} L {outer - 4 * s} {top - 16} L {inner + 4 * s} {top - 16} Z" fill="{SKIN}"/>')
        g.append(f'<path d="M{inner + 4 * s} {top + 10} L {outer - 6 * s} {top - 2}" fill="none" stroke="{LINE}" stroke-width="{lw}" stroke-linecap="round"/>')
    return ''.join(g)


def brows(girl, expr, color):
    out = []
    for flip in (False, True):
        x, s = (278, 1) if not flip else (362, -1)
        y = 150 if girl else 152
        inner, outer = x + 22 * s, x - 24 * s
        if expr == 'angry':
            d = f'M{outer} {y - 8} Q {x} {y - 6} {inner} {y + 8}'
        elif expr == 'sad':
            d = f'M{outer} {y + 6} Q {x} {y - 8} {inner} {y - 12}'
        elif expr == 'surprised':
            d = f'M{outer} {y - 8} Q {x} {y - 20} {inner} {y - 12}'
        else:
            d = f'M{outer} {y + 1} Q {x} {y - 9} {inner} {y - 3}'
        out.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{5 if girl else 7}" stroke-linecap="round"/>')
    return ''.join(out)


def mouth(expr, girl):
    y = 252
    if expr == 'smile':
        return (f'<path d="M298 {y - 4} Q 320 {y + 22} 342 {y - 4} Q 320 {y + 2} 298 {y - 4} Z" fill="#b5524f" {stroke(3)}/>'
                f'<path d="M306 {y + 6} Q 320 {y + 16} 334 {y + 6} Q 320 {y + 10} 306 {y + 6} Z" fill="#f08a86"/>')
    if expr == 'angry':
        return f'<path d="M302 {y + 4} Q 320 {y - 4} 338 {y + 4}" fill="none" {stroke(4)}/>'
    if expr == 'sad':
        return f'<path d="M306 {y + 4} Q 320 {y - 3} 334 {y + 4}" fill="none" {stroke(3.5)}/>'
    if expr == 'surprised':
        return f'<ellipse cx="320" cy="{y + 2}" rx="9" ry="12" fill="#b5524f" {stroke(3.5)}/>'
    return f'<path d="M308 {y} Q 320 {y + 6} 332 {y}" fill="none" {stroke(3.5)}/>'


def face(girl, expr, hair, iris):
    g = []
    g.append(f'<linearGradient id="iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{iris[2]}"/><stop offset=".55" stop-color="{iris[0]}"/><stop offset="1" stop-color="{iris[1]}"/></linearGradient>')
    g.append(eye(278, 196, girl, expr, iris))
    g.append(eye(362, 196, girl, expr, iris, flip=True))
    g.append(brows(girl, expr, hair[2]))
    g.append(f'<path d="M322 222 L 318 232" stroke="{SKIN2}" stroke-width="4" stroke-linecap="round"/>')
    g.append(mouth(expr, girl))
    if girl or expr in ('smile', 'sad'):
        a = .45 if girl else .3
        g.append(f'<ellipse cx="262" cy="232" rx="20" ry="9" fill="{BLUSH}" opacity="{a}"/><ellipse cx="378" cy="232" rx="20" ry="9" fill="{BLUSH}" opacity="{a}"/>')
    if expr == 'sad':
        g.append('<path d="M392 222 Q 386 238 392 246 Q 400 238 392 222 Z" fill="#bfe3ff" stroke="#7fa9cc" stroke-width="2"/>')
    if expr == 'surprised':
        g.append(f'<path d="M226 120 l -14 -12 M 220 140 l -18 -2 M 414 120 l 14 -12 M 420 140 l 18 -2" stroke="{LINE}" stroke-width="4" stroke-linecap="round" fill="none"/>')
    return ''.join(g)


def marks(expr, x=402):
    """Comic marks drawn over the hair."""
    if expr == 'angry':
        return (f'<g transform="translate({x} 92)" stroke="#d9434e" stroke-width="7" stroke-linecap="round" fill="none">'
                '<path d="M-4 -18 Q -2 -4 -18 -4 M 4 -18 Q 2 -4 18 -4 M -4 18 Q -2 4 -18 4 M 4 18 Q 2 4 18 4"/></g>')
    return ''


def head_shape():
    return 'M228 150 Q 226 214 252 246 Q 286 280 320 282 Q 354 280 388 246 Q 414 214 412 150 Q 412 60 320 56 Q 228 60 228 150 Z'


def ears():
    return (f'<path d="M232 186 Q 212 176 214 204 Q 218 230 240 232 Z" fill="{SKIN}" {stroke(4)}/>'
            f'<path d="M408 186 Q 428 176 426 204 Q 422 230 400 232 Z" fill="{SKIN}" {stroke(4)}/>')


def boy(expr):
    hair = ('#4a3328', '#36241c', '#2e1f19')
    iris = ('#7a5236', '#a8784f', '#3d2618')
    blazer, blazer2 = '#2f3d5c', '#24304a'
    pants, pants2 = '#5b6170', '#4a4f5c'
    g = []
    # legs / trousers
    g.append(f'<path d="M220 760 Q 214 960 224 1100 L 234 1408 L 312 1408 L 316 1100 L 320 870 L 324 1100 L 328 1408 L 406 1408 L 416 1100 Q 426 960 420 760 Z" fill="{pants}" {stroke()}/>')
    g.append(f'<path d="M320 870 L 324 1100 L 328 1408 L 350 1408 L 344 1100 L 336 890 Z" fill="{pants2}"/>')
    g.append(f'<path d="M420 760 Q 426 960 416 1100 L 406 1408 L 388 1408 L 396 1100 Q 404 940 400 780 Z" fill="{pants2}"/>')
    g.append(f'<path d="M262 800 L 270 1060 M 378 800 L 370 1060" stroke="{pants2}" stroke-width="4" opacity=".6"/>')
    # shoes
    for x0 in (226, 326):
        g.append(f'<path d="M{x0} 1400 L {x0 + 88} 1400 Q {x0 + 106} 1440 {x0 + 98} 1476 L {x0 - 8} 1476 Q {x0 - 14} 1440 {x0} 1400 Z" fill="#4b3226" {stroke()}/>')
        g.append(f'<path d="M{x0 - 8} 1466 L {x0 + 98} 1466" stroke="#2c1d16" stroke-width="6"/>')
    # arms (behind torso edges)
    g.append(f'<path d="M206 352 Q 180 380 172 520 Q 164 640 174 742 L 222 746 Q 222 640 230 540 Z" fill="{blazer}" {stroke()}/>')
    g.append(f'<path d="M434 352 Q 460 380 468 520 Q 476 640 466 742 L 418 746 Q 418 640 410 540 Z" fill="{blazer}" {stroke()}/>')
    g.append(f'<path d="M434 352 Q 460 380 468 520 Q 476 640 466 742 L 448 744 Q 452 600 440 470 Z" fill="{blazer2}"/>')
    for x0, k in ((198, 1), (442, -1)):
        g.append(f'<path d="M{x0 - 24 * k} 738 Q {x0 - 30 * k} 790 {x0 - 12 * k} 816 Q {x0 + 6 * k} 830 {x0 + 20 * k} 812 Q {x0 + 30 * k} 790 {x0 + 24 * k} 742 Z" fill="{SKIN}" {stroke(4)}/>')
        g.append(f'<rect x="{min(x0 - 26 * k, x0 + 26 * k)}" y="728" width="52" height="16" fill="#ffffff" {stroke(4)}/>')
    # torso blazer
    g.append(f'<path d="M208 344 Q 262 316 300 314 L 340 314 Q 378 316 432 344 Q 444 520 428 780 L 212 780 Q 196 520 208 344 Z" fill="{blazer}" {stroke()}/>')
    g.append(f'<path d="M380 330 Q 420 340 432 344 Q 444 520 428 780 L 396 780 Q 412 560 400 400 Z" fill="{blazer2}"/>')
    # shirt, tie, lapels
    g.append(f'<path d="M282 316 L 320 470 L 358 316 Z" fill="#ffffff" {stroke(4)}/>')
    g.append(f'<path d="M310 352 L 330 352 L 336 450 L 320 476 L 304 450 Z" fill="#b8323a" {stroke(4)}/>')
    g.append('<path d="M308 372 L 334 392 M 306 404 L 336 426 M 305 436 L 333 456" stroke="#e3c46a" stroke-width="5"/>')
    g.append(f'<path d="M312 334 L 328 334 L 332 354 L 308 354 Z" fill="#9e2a31" {stroke(4)}/>')
    g.append(f'<path d="M282 316 L 254 336 L 300 540 L 320 480 Z" fill="{blazer2}" {stroke(4)}/>')
    g.append(f'<path d="M358 316 L 386 336 L 340 540 L 320 480 Z" fill="{blazer2}" {stroke(4)}/>')
    for y in (590, 680):
        g.append(f'<circle cx="320" cy="{y}" r="7" fill="#d9b55a" {stroke(3)}/>')
    g.append(f'<path d="M244 560 L 290 560" stroke="{LINE}" stroke-width="4"/>')
    g.append(f'<path d="M360 600 L 404 600" stroke="{LINE}" stroke-width="4"/>')
    g.append(f'<path d="M248 360 L 262 350 L 270 376 Z" fill="#c9a24a"/>')
    # neck
    g.append(f'<path d="M292 262 L 292 318 Q 320 334 348 318 L 348 262 Z" fill="{SKIN}" {stroke(4)}/>')
    g.append(f'<path d="M292 270 Q 320 300 348 270 L 348 292 Q 320 312 292 292 Z" fill="{SKIN2}"/>')
    # back hair
    g.append(f'<path d="M218 160 Q 208 70 280 40 Q 330 22 380 40 Q 440 66 424 176 Q 420 200 410 214 L 230 214 Q 220 196 218 160 Z" fill="{hair[0]}" {stroke()}/>')
    g.append(ears())
    g.append(f'<path d="{head_shape()}" fill="{SKIN}" {stroke()}/>')
    g.append(f'<path d="M232 150 Q 236 214 262 246 Q 240 220 238 160 Z" fill="{SKIN2}" opacity=".6"/>')
    g.append(face(False, expr, hair, iris))
    # front hair: spiky bangs
    g.append(f'<path d="M214 168 Q 206 80 262 50 Q 320 22 378 46 Q 434 72 428 168 L 414 150 L 404 118 L 392 158 L 372 110 L 356 150 L 334 104 L 316 150 L 296 100 L 276 150 L 262 108 L 246 158 L 236 120 Z" fill="{hair[0]}" {stroke()}/>')
    g.append(f'<path d="M262 64 Q 300 46 340 52 Q 300 60 276 84 Z" fill="#6a4a3a" opacity=".8"/>')
    g.append(f'<path d="M378 60 Q 420 84 424 150 L 414 130 Q 410 92 378 60 Z" fill="{hair[1]}"/>')
    g.append(marks(expr))
    return ''.join(g)


def girl(expr):
    hair = ('#3d2f45', '#2c2134', '#2a1f2e')
    iris = ('#4f6fb0', '#88a6dc', '#253764')
    blazer, blazer2 = '#2f3d5c', '#24304a'
    g = []
    # long back hair
    g.append(f'<path d="M214 170 Q 190 330 196 520 Q 202 600 186 660 Q 250 690 320 686 Q 390 690 454 660 Q 438 600 444 520 Q 450 330 426 170 Z" fill="{hair[1]}" {stroke()}/>')
    # legs with knee socks
    for x0, k in ((258, 1), (382, -1)):
        o = lambda v: x0 + v * k
        g.append(f'<path d="M{o(-6)} 840 Q {o(-10)} 960 {o(4)} 1080 Q {o(10)} 1240 {o(14)} 1400 L {o(46)} 1400 Q {o(52)} 1240 {o(56)} 1080 Q {o(66)} 960 {o(60)} 840 Z" fill="{SKIN}" {stroke()}/>')
        g.append(f'<path d="M{o(6)} 1050 Q {o(30)} 1058 {o(57)} 1050 Q {o(52)} 1240 {o(46)} 1400 L {o(14)} 1400 Q {o(10)} 1240 {o(6)} 1050 Z" fill="#2b3048" {stroke()}/>')
        g.append(f'<path d="M{o(8)} 1418 L {o(50)} 1398 Q {o(70) if k > 0 else o(70)} 1440 {o(64)} 1476 L {o(-10)} 1476 Q {o(-14)} 1436 {o(8)} 1418 Z" fill="#4b3226" {stroke()}/>')
        g.append(f'<path d="M{o(-10)} 1466 L {o(64)} 1466" stroke="#2c1d16" stroke-width="6"/>')
    # skirt: pleats
    g.append(f'<path d="M232 640 L 408 640 L 446 860 L 410 878 L 384 860 L 356 880 L 330 860 L 306 880 L 280 860 L 254 878 L 194 860 Z" fill="#3b4a6b" {stroke()}/>')
    for x, xb in ((270, 254), (300, 290), (340, 350), (370, 384)):
        g.append(f'<path d="M{x} 648 L {xb} 872" stroke="#2a3550" stroke-width="5"/>')
    g.append('<path d="M222 700 L 418 700 M 214 760 L 428 760 M 206 820 L 438 820" stroke="#8a5560" stroke-width="5" opacity=".55"/>')
    g.append('<path d="M262 646 L 240 860 M 378 646 L 400 860" stroke="#8a5560" stroke-width="4" opacity=".45"/>')
    # arms
    g.append(f'<path d="M224 360 Q 200 390 196 520 Q 192 610 200 690 L 244 694 Q 242 610 248 530 Z" fill="{blazer}" {stroke()}/>')
    g.append(f'<path d="M416 360 Q 440 390 444 520 Q 448 610 440 690 L 396 694 Q 398 610 392 530 Z" fill="{blazer}" {stroke()}/>')
    g.append(f'<path d="M416 360 Q 440 390 444 520 Q 448 610 440 690 L 424 692 Q 426 560 414 450 Z" fill="{blazer2}"/>')
    for x0, k in ((222, 1), (418, -1)):
        g.append(f'<path d="M{x0 - 20 * k} 688 Q {x0 - 26 * k} 736 {x0 - 10 * k} 760 Q {x0 + 6 * k} 772 {x0 + 18 * k} 756 Q {x0 + 26 * k} 736 {x0 + 20 * k} 690 Z" fill="{SKIN}" {stroke(4)}/>')
        g.append(f'<rect x="{min(x0 - 22 * k, x0 + 22 * k)}" y="678" width="44" height="14" fill="#ffffff" {stroke(4)}/>')
    # torso blazer (shorter, fitted)
    g.append(f'<path d="M226 350 Q 272 322 302 318 L 338 318 Q 368 322 414 350 Q 426 470 410 560 Q 420 620 412 680 L 228 680 Q 220 620 230 560 Q 214 470 226 350 Z" fill="{blazer}" {stroke()}/>')
    g.append(f'<path d="M376 332 Q 404 342 414 350 Q 426 470 410 560 Q 420 620 412 680 L 386 680 Q 400 540 392 400 Z" fill="{blazer2}"/>')
    g.append(f'<path d="M290 320 L 320 450 L 350 320 Z" fill="#ffffff" {stroke(4)}/>')
    g.append(f'<path d="M290 320 L 266 338 L 304 520 L 320 452 Z" fill="{blazer2}" {stroke(4)}/>')
    g.append(f'<path d="M350 320 L 374 338 L 336 520 L 320 452 Z" fill="{blazer2}" {stroke(4)}/>')
    # ribbon
    g.append(f'<path d="M320 352 L 282 334 L 286 376 Z" fill="#c8343f" {stroke(4)}/>')
    g.append(f'<path d="M320 352 L 358 334 L 354 376 Z" fill="#c8343f" {stroke(4)}/>')
    g.append(f'<path d="M314 352 L 300 404 L 316 396 Z M 326 352 L 340 404 L 324 396 Z" fill="#a82732" {stroke(3)}/>')
    g.append(f'<circle cx="320" cy="354" r="10" fill="#d9434e" {stroke(4)}/>')
    for y in (560, 630):
        g.append(f'<circle cx="320" cy="{y}" r="6" fill="#d9b55a" {stroke(3)}/>')
    g.append(f'<path d="M262 366 L 276 356 L 282 380 Z" fill="#c9a24a"/>')
    # neck
    g.append(f'<path d="M296 262 L 296 322 Q 320 336 344 322 L 344 262 Z" fill="{SKIN}" {stroke(4)}/>')
    g.append(f'<path d="M296 270 Q 320 300 344 270 L 344 292 Q 320 312 296 292 Z" fill="{SKIN2}"/>')
    # hair behind the head top
    g.append(f'<path d="M212 176 Q 204 66 280 40 Q 330 24 380 40 Q 446 66 428 176 Z" fill="{hair[0]}" {stroke()}/>')
    g.append(ears())
    g.append(f'<path d="{head_shape()}" fill="{SKIN}" {stroke()}/>')
    g.append(f'<path d="M232 150 Q 236 214 262 246 Q 240 220 238 160 Z" fill="{SKIN2}" opacity=".6"/>')
    g.append(face(True, expr, hair, iris))
    # side locks falling over the shoulders
    g.append(f'<path d="M222 150 Q 196 260 210 420 Q 222 470 206 520 Q 240 470 246 400 Q 252 300 244 200 Z" fill="{hair[0]}" {stroke()}/>')
    g.append(f'<path d="M418 150 Q 444 260 430 420 Q 418 470 434 520 Q 400 470 394 400 Q 388 300 396 200 Z" fill="{hair[0]}" {stroke()}/>')
    # bangs
    g.append(f'<path d="M218 176 Q 206 76 276 46 Q 322 28 370 44 Q 436 70 424 176 L 404 128 L 392 166 L 370 116 L 346 162 L 330 112 L 308 160 L 290 114 L 270 162 L 256 124 L 236 170 Z" fill="{hair[0]}" {stroke()}/>')
    g.append(f'<path d="M270 60 Q 310 44 352 50 Q 312 62 286 86 Z" fill="#6c5a7c" opacity=".85"/>')
    g.append(f'<path d="M388 56 Q 428 84 424 170 L 412 140 Q 410 96 388 56 Z" fill="{hair[1]}"/>')
    # hair clip
    g.append(f'<path d="M380 96 L 410 86 L 414 98 L 384 108 Z" fill="#f2c94c" {stroke(3)}/>')
    g.append(marks(expr, 244))
    return ''.join(g)


CHARACTERS = [('boy', '남학생', boy), ('girl', '여학생', girl)]


def sprite(fn, expr):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="1520" viewBox="0 0 640 1520">'
            f'<g transform="translate(0 20)">{fn(expr)}</g></svg>')
