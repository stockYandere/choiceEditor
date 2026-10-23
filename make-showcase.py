"""Builds assets/showcase-sample.js: 기능 둘러보기 · 비 오는 학교, a short game that touches every editor feature with the
built-in pictures (그림 모음) and built-in sounds/music (기본 소리). The story is only a vehicle for the features:

  story order · 🎲 random groups (two named groups) · branch scenes · ending / 사망 장면 / 일반 사망
  choices: 체력·멘탈·돈 changes, gain/lose, requires (have / not / count), hidden when locked, 보유 조건 결과 (branch),
           random reward, remember (기억), 보유 효과 off, cost display
  definitions: abilities (random 2 at start), items, state, memory, 보유 효과 (base + 조합), 획득 그림·강조·효과음
  대사 변주: condition / ! / compare / & / 방문마다 / 돌아가며 / 무작위 / @사건 / 방문 / {=값} / nesting
  pictures: both / top / bottom / full, fit contain, vertical position, 기본 그림, 일반 사망 그림, 메인 화면
  연출: camera, mood, weather, warp, overlays, transition, beats, per-picture areas, characters (enter/motion/flip), preset
  sound: game BGM, scene BGM play / keep / stop, scene sound, custom effect sounds, 연출 효과음

Run: python3 make-showcase.py
"""
import base64, io, json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent
ART = ROOT / 'assets' / 'art'
SOUNDS = json.loads((ROOT / 'assets' / 'sound-library.js').read_text().split('const SOUNDS=', 1)[1].split(';', 1)[0])
BY_ID = {s['id']: s for s in SOUNDS}


def bg(name):
    return 'data:image/webp;base64,' + base64.b64encode((ART / f'{name}.webp').read_bytes()).decode()


def person(name, bust=True):
    """Same as 그림 모음: 상반신 keeps head to waist (600/1216 of the figure)."""
    im = Image.open(ART / f'{name}.webp')
    if bust:
        im = im.crop((0, 0, im.width, round(im.height * 600 / 1216)))
    out = io.BytesIO()
    im.save(out, 'WEBP', quality=92, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(out.getvalue()).decode()


def lib_sound(sid, volume=60, **extra):
    """A built-in effect or ambience, kept as a reference (sounds/<id>.ogg) like the 기본 소리 picker does."""
    x = BY_ID[sid]
    return {'name': x['name'] + ' (기본 소리)', 'volume': volume, 'lib': sid, 'src': f'sounds/{sid}.ogg', **extra}


def music(sid, volume=55):
    """Built-in music is stored in the game with its credit (the picker downloads it the same way)."""
    x = BY_ID[sid]
    data = (ROOT / 'sound-library' / f'{sid}.ogg').read_bytes()
    c = x['credit']
    return {'name': x['name'] + ' (기본 소리)', 'volume': volume, 'lib': sid, 'loop': True,
            'src': 'data:audio/ogg;base64,' + base64.b64encode(data).decode(),
            'credit': {k: c[k] for k in ('title', 'author', 'license', 'url')}}


def choice(cid, text, **o):
    base = {'id': cid, 'text': text, 'hp': 0, 'mental': 0, 'money': 0, 'gain': '', 'lose': '', 'requires': '',
            'requiresCount': 1, 'gainCount': 1, 'loseCount': 1, 'next': 'sequence'}
    base.update(o)
    return base


def scene(sid, title, kind, speaker, text, choices, **o):
    base = {'id': sid, 'title': title, 'speaker': speaker, 'text': text, 'kind': kind, 'once': True, 'mode': 'both',
            'top': {}, 'bottom': {}, 'choices': choices}
    base.update(o)
    return base


def layer(image, **o):
    out = {'image': image, 'x': 50, 'y': 100, 'scale': 98, 'enter': 'fade', 'motion': 'none', 'flip': False}
    out.update(o)
    return out


GIRL_SMILE = person('girl-smile')
BOY_ANGRY = person('boy-angry')
BOY_FULL = person('boy-surprised', bust=False)
# Whole figures for full-screen scenes: the head sits above the dialogue box.
GIRL_FULL, GIRL_SMILE_FULL, BOY_FULL_CALM = person('girl-neutral', bust=False), person('girl-smile', bust=False), person('boy-neutral', bust=False)

definitions = [
    {'id': 'eye', 'name': '관찰력', 'type': 'ability', 'initial': 0},
    {'id': 'nerve', 'name': '용기', 'type': 'ability', 'initial': 0,
     'effects': [{'kind': 'mentalLoss', 'amount': 1}]},
    {'id': 'talk', 'name': '말솜씨', 'type': 'ability', 'initial': 0},
    {'id': 'umbrella', 'name': '우산', 'type': 'item', 'initial': 1},
    {'id': 'bandage', 'name': '붕대', 'type': 'item', 'initial': 0,
     'effects': [{'kind': 'hpLoss', 'amount': 1}, {'kind': 'hpGain', 'amount': 1, 'with': 'lunch'}]},
    {'id': 'lunch', 'name': '도시락', 'type': 'item', 'initial': 0},
    {'id': 'coffee', 'name': '캔커피', 'type': 'item', 'initial': 0},
    {'id': 'key', 'name': '옥상 열쇠', 'type': 'item', 'initial': 0, 'image': bg('rooftop-evening'), 'imageX': 50,
     'imageY': 40, 'highlight': True, 'sound': lib_sound('sparkle', 80)},
    {'id': 'wet', 'name': '흠뻑 젖음', 'type': 'state', 'initial': 0},
    {'id': 'greeted', 'name': '서연에게 인사했다', 'type': 'memory', 'initial': 0},
    {'id': 'lent', 'name': '우산을 빌려줬다', 'type': 'memory', 'initial': 0},
]

H = '\n'
events = [
    # ── 스토리 1 · 아침
    scene('gate', '1 · 교문 앞 아침', 'story', '서연',
          '{~봄바람이 분다|벚꽃잎이 흩날린다}. "안녕! 저녁엔 비 온대. {우산? 우산 챙겼지?|우산 없어?}"',
          [choice('g-hi', '반갑게 인사한다', mental=1, remember='greeted', next='random:gday'),
           choice('g-show', '{용기? 우산을 번쩍 들어 보인다|우산을 슬쩍 보여 준다}', requires='umbrella', next='random:gday'),
           choice('g-pass', '못 본 척 지나간다', mental=-1, next='random:gday')],
          top={'image': bg('school-gate-day'), 'y': 40}, bottom={'image': bg('street-day'), 'y': 60},
          stage={'all': {'transition': 'fade'},
                 'top': {'camera': 'zoomIn', 'cameraSpeed': 'slow', 'weather': 'petals', 'weatherAmount': 2},
                 'bottom': {'mood': 'day', 'overlays': ['lightRays']},
                 'layers': {'top': layer(GIRL_SMILE, x=62, enter='rise', motion='breathe')}}),

    # ── 🎲 낮 수업 묶음
    scene('shop', '매점', 'encounter', '매점 아주머니',
          '{처음 온|또 온|단골이 된} 매점. "{&오늘은 도시락!|오늘은 김밥!}" 지갑엔 {=돈}원.{방문>=2?  아주머니가 웃는다.}',
          [choice('s-buy', '도시락을 산다 (돈 1)', money=-1, gain='lunch'),
           choice('s-coffee', '{돈>=2? 캔커피도 하나 산다|캔커피는 다음에}', money=-1, gain='coffee', requires='@money', requiresCount=2),
           choice('s-more', '다른 곳도 들러 본다 (🎲 낮 수업 다시)', next='random:gday'),
           choice('s-leave', '그냥 나간다')],
          once=False, randomGroup='gday', mode='top',
          top={'image': bg('street-day'), 'y': 55},
          stage={'all': {'camera': 'panRight', 'transition': 'slide'}}),
    scene('hall', '복도의 민준', 'encounter', '민준',
          '"또 안 열려!" 민준이 사물함을 걷어찬다.{관찰력?  틈에 쪽지가 끼어 있다.}',
          [choice('h-help', '{말솜씨? 달래며 같이 연다|같이 연다}', mental=1,
                  branch={'when': 'talk', 'count': 1, 'hp': 0, 'mental': 2, 'money': 1, 'gain': '', 'lose': '', 'next': 'sequence'}),
           choice('h-search', '빈 사물함을 뒤진다 (랜덤 보상)', reward={'pool': ['bandage', 'lunch', 'coffee'], 'count': 1}),
           choice('h-ignore', '모른 척한다', mental=-1)],
          randomGroup='gday',
          top={'image': bg('hallway-day')}, bottom={'image': bg('classroom-day'), 'fit': 'contain'},
          stage={'all': {'transition': 'wipeLeft'},
                 'top': {'camera': 'drift'},
                 'layers': {'top': layer(BOY_ANGRY, x=40, enter='slideLeft', motion='tremble'),
                            'bottom': layer(BOY_FULL, x=70, scale=60, enter='pop', motion='bob', flip=True)}}),
    scene('roof', '옥상의 바람', 'encounter', '나',
          '옥상 바람이 세다. {~구름이 빠르게 흘러간다|운동장이 작게 보인다}.',
          [choice('r-rest', '난간에 기대 쉰다', hp=1),
           choice('r-wind', '바람을 정면으로 맞는다 (보유 효과 적용 안 함)', mental=-1, ignoreEffects=True)],
          randomGroup='gday', mode='full',
          top={'image': bg('rooftop-day'), 'y': 30},
          stage={'all': {'camera': 'sway', 'weather': 'leaves', 'warp': 'heat', 'overlays': ['haze'], 'transition': 'zoom'}}),

    # ── 스토리 2 · 노을
    scene('class', '2 · 노을 진 교실', 'story', '서연',
          '{서연에게 인사했다? "아침에 인사해 줘서 고마웠어."|"아침엔 왜 모른 척했어?"}'
          + '{@복도의 민준?  "민준이 또 사물함이랑 싸웠다며?"}{멘탈<=1?  (머리가 무겁다.)}',
          [choice('c-joke', '{말솜씨? 농담으로 분위기를 띄운다|어색하게 웃는다}',
                  branch={'when': 'talk', 'count': 1, 'hp': 0, 'mental': 1, 'money': 0, 'gain': 'key', 'lose': '', 'next': 'sequence'}),
           choice('c-key', '옥상 열쇠를 부탁한다', requires='greeted', hideLocked=True, gain='key'),
           choice('c-lend', '{!흠뻑 젖음? 우산을 빌려준다|젖은 우산이라도 건넨다}', requires='umbrella', lose='umbrella', remember='lent', gain='wet'),
           choice('c-stay', '교실에 혼자 남는다', next='chase')],
          mode='full', top={'image': bg('classroom-evening'), 'y': 45},
          audio={'dialogue': lib_sound('door-open', 70, kind='effect')},
          stage={'all': {'camera': 'breathe', 'mood': 'dusk', 'moodStrength': 70, 'overlays': ['lightRays', 'vignette'],
                         'transition': 'dissolve', 'beats': [{'when': 'gain', 'fx': 'pulse'}, {'when': 'loss', 'fx': 'redFlash'}]},
                 'layers': {'top': layer(GIRL_FULL, x=30, scale=100, enter='slideRight', motion='sway')}}),
    scene('chase', '정전된 복도', 'branch', '나',
          '탁. 불이 꺼졌다. 발소리가 다가온다.{관찰력?  청소함 문이 열려 있다.}',
          [choice('ch-run', '뛴다', hp=-1),
           choice('ch-hide', '청소함에 숨는다', requires='eye'),
           choice('ch-coffee', '캔커피를 굴려 소리로 시선을 돌린다', requires='coffee', lose='coffee'),
           choice('ch-fight', '{용기 & !흠뻑 젖음? 소리 나는 쪽으로 간다|덜덜 떨며 다가간다}', hp=-3, mental=-1)],
          top={'image': bg('hallway-night')}, bottom={'image': bg('classroom-night'), 'y': 70},
          audio={'dialogue': lib_sound('footsteps', 75, kind='effect')},
          stage={'all': {'transition': 'glitch', 'beats': [{'when': 'start', 'fx': 'blackout'}, {'when': 'loss', 'fx': 'bigShake'}]},
                 'top': {'mood': 'horror', 'overlays': ['grain', 'scanlines'], 'camera': 'zoomIn', 'cameraSpeed': 'fast'},
                 'bottom': {'mood': 'cold', 'warp': 'wobble'}}),

    # ── 스토리 3 · 비 오는 밤
    scene('night', '3 · 비 오는 교문', 'story', '나',
          '비가 쏟아진다. {우산? 우산을 편다.|{우산을 빌려줬다? 우산은 서연에게 줬다.|비를 맞는다.}} 체력 {=체력} · 멘탈 {=멘탈}.',
          [choice('n-roof', '옥상으로 올라간다', requires='key', next='roofNight'),
           choice('n-home', '집으로 간다', next='random:gnight')],
          top={'image': bg('school-gate-night')}, bottom={'image': bg('street-night'), 'y': 45},
          audio={'bgmMode': 'play', 'bgm': music('bgm-investigations')},
          stage={'all': {'weather': 'rain', 'weatherAmount': 3, 'mood': 'night', 'transition': 'blackFade',
                         'beats': [{'when': 'start', 'fx': 'lightning'}]},
                 'top': {'camera': 'drift', 'overlays': ['letterbox']}}),
    scene('roofNight', '폭풍 속 옥상', 'branch', '나',
          '비바람이 몰아친다. 난간 너머로 도시 불빛이 번진다.',
          [choice('rn-edge', '난간 끝까지 가 본다', next='deathRoof'),
           choice('rn-back', '내려간다', next='random:gnight')],
          mode='top', top={'image': bg('rooftop-night'), 'y': 35},
          stage={'all': {'weather': 'storm', 'weatherAmount': 3, 'mood': 'danger', 'camera': 'tilt', 'transition': 'flashCut',
                         'beats': [{'when': 'start', 'fx': 'lightning'}, {'when': 'choice', 'fx': 'shake'}]}}),

    # ── 🎲 밤길 묶음
    scene('park', '밤 공원', 'encounter', '나',
          '공원 벤치에 반딧불이가 모여 있다.',
          [choice('p-rest', '벤치에 앉는다', hp=1, mental=1),
           choice('p-eat', '도시락을 먹는다', lose='lunch', hp=2)],
          randomGroup='gnight', bottom={'image': bg('park-night')},
          stage={'all': {'weather': 'fireflies', 'mood': 'dream', 'warp': 'dream', 'overlays': ['glow'], 'transition': 'iris'}}),
    scene('street', '밤거리', 'encounter', '나',
          '{~안개 낀 골목|가로등이 깜빡이는 골목}에서 그림자 하나가 따라온다.',
          [choice('st-run', '달린다', hp=-1),
           choice('st-look', '{관찰력? 그림자를 똑바로 본다|뒤돌아본다}', mental=-1,
                  branch={'when': 'eye', 'count': 1, 'hp': 0, 'mental': 1, 'money': 0, 'gain': '', 'lose': '', 'next': 'sequence'})],
          randomGroup='gnight', mode='bottom', bottom={'image': bg('street-night')},
          audio={'bgmMode': 'keep'},
          stage={'all': {'weather': 'fog', 'overlays': ['letterbox', 'frame'], 'camera': 'panLeft', 'transition': 'blinds'}}),

    # ── 스토리 4 · 집
    scene('home', '4 · 집 앞', 'story', '나',
          '집 앞이다.{흠뻑 젖음?  옷이 흠뻑 젖었다.} {우산을 빌려줬다? 문자가 온다. "우산 고마워!"|조용한 밤이다.}',
          [choice('hm-call', '서연에게 답장한다', requires='lent', next='endTogether'),
           choice('hm-in', '들어가서 쉰다', next='endAlone')],
          top={'image': bg('house-front-night')}, bottom={'image': bg('boy-room-night')},
          audio={'bgmMode': 'stop', 'dialogue': lib_sound('knock', 70, kind='effect')},
          stage={'all': {'transition': 'whiteFade'}, 'top': {'weather': 'rain', 'weatherAmount': 1},
                 'bottom': {'mood': 'memory', 'moodStrength': 60}}),

    # ── 끝
    scene('endTogether', '엔딩 · 내일도 같이', 'branch', '서연',
          '"내일은 같이 학교 가자!"' + H + '비가 그치고, 창밖에 별이 떴다.',
          [choice('et-end', '처음부터', next='end')],
          ending='end', endLabel='내일도 같이', mode='full', top={'image': bg('girl-room-night')},
          stage={'all': {'weather': 'stars', 'mood': 'vivid', 'overlays': ['glow'], 'transition': 'whiteFade',
                         'beats': [{'when': 'start', 'fx': 'whiteFlash'}]},
                 'layers': {'top': layer(GIRL_SMILE_FULL, scale=100, enter='drop', motion='float')}}),
    scene('endAlone', '엔딩 · 혼자 보낸 밤', 'branch', '나',
          '이불 속에서 빗소리를 듣는다. {&내일은 인사해야지.|다음엔 우산을 챙겨 줘야지.}',
          [choice('ea-end', '처음부터', next='end')],
          ending='end', endLabel='혼자 보낸 밤', mode='full', top={'image': bg('boy-room-night'), 'y': 60},
          stage={'all': {'mood': 'mono', 'overlays': ['grain'], 'transition': 'fade'},
                 'layers': {'top': layer(BOY_FULL_CALM, x=50, scale=100, enter='fade', motion='breathe')}}),
    scene('deathRoof', '사망 · 미끄러진 난간', 'branch', '나',
          '젖은 바닥에 발이 미끄러졌다.' + H + '마지막으로 본 것은 번개였다.',
          [choice('dr-end', '처음부터', next='end')],
          ending='death', endLabel='옥상에서 미끄러짐', mode='full', top={'image': bg('rooftop-night'), 'y': 20},
          audio={'dialogue': lib_sound('fall', 80, kind='effect')},
          stage={'all': {'mood': 'horror', 'weather': 'storm', 'transition': 'blackFade',
                         'beats': [{'when': 'start', 'fx': 'lightning'}, {'when': 'start', 'fx': 'bigShake'}]}}),
]

project = {
    'format': 'event-vn', 'version': 1, 'title': '기능 둘러보기 · 비 오는 학교',
    'theme': 'cream', 'panelTransparency': 10, 'manualSaves': True,
    'hp': 4, 'maxHp': 5, 'mental': 3, 'money': 2, 'randomStart': 2,
    'randomGroups': [{'id': 'gday', 'name': '낮 수업'}, {'id': 'gnight', 'name': '밤길'}],
    'definitions': definitions, 'events': events,
    'defaultArt': {'top': {'image': bg('park-day'), 'text': '기본 그림'}, 'bottom': {'text': ''}},
    'finish': {'deathText': '힘이 다해 쓰러졌다… (체력·멘탈이 0이 되면 나오는 일반 사망 연출)', 'death': {'image': bg('street-night')}},
    'stagePresets': [{'name': '밤의 학교', 'stage': {'mood': 'horror', 'weather': 'fog', 'overlays': ['vignette', 'grain'], 'camera': 'drift'}}],
    'audio': {'bgm': music('bgm-fluffing-a-duck', 50), 'stageSound': True, 'stageVolume': 70,
              'effects': {'money': lib_sound('coins', 70), 'important': lib_sound('bell', 70)}},
    'landing': {'intro': '에디터 기능을 한 판에 모두 보는 예제. 사건마다 그림·연출·소리 탭을 열어 보세요.', 'author': '사건 게임 에디터',
                'credits': '그림: 에디터 기본 그림 (그림 모음)\n소리: 에디터 기본 소리',
                'image': bg('school-gate-evening')},
}

out = ROOT / 'assets' / 'showcase-sample.js'
out.write_text("'use strict';\n// 기능 둘러보기 · 비 오는 학교 (generated by make-showcase.py; edit that file, not this one).\n"
               "(function(root){root.SHOWCASE_SAMPLE=" + json.dumps(project, ensure_ascii=False, separators=(',', ':')) + ";})(globalThis);\n")
print(out, round(out.stat().st_size / 1048576, 2), 'MB')
