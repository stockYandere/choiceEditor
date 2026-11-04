"""Builds assets/mystery-sample.js: 「일곱 번째 괴담」, a long example whose point is its shape. Each chapter is one
classic branching structure, laid out by hand on the 구조도 with a 메모 naming it, so 개요 and 상세 read like a textbook:

  프롤로그   직선                       교문 → 교실 → 복도
  1장       가지 → 합류                 세 개의 문, 갈래마다 세 장면, 「1장 끝」에서 다시 만남
  2장       🎲 랜덤 묶음 (반복 굴림)     낮의 소문 다섯, 「한 곳 더」로 다시 굴리기
  3장       거점 반복 (loop & grow)      동아리방에서 조사하고 돌아오기, 단서가 쌓일수록 대사가 바뀜
  4장       관문 (gauntlet)             세 번의 시험, 틀리면 저마다 다른 사망 장면
  막간      🎲 두 번째 묶음              밤의 소문 셋
  5장       두 갈래 추적 + 교차          서연 쪽 · 민준 쪽, 서로의 길로 건너가는 연결
  최종장    분류 모자 (sorting hat)      쌓인 기억·단서에 따라 숨은 선택지가 열리는 엔딩 넷 + 배드 엔딩

Pictures are the built-in 그림 모음, music the built-in 기본 소리. The JS keeps each picture once (shared constants).
Run: python3 make-mystery.py
"""
import base64, io, json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent
ART = ROOT / 'assets' / 'art'
SOUNDS = json.loads((ROOT / 'assets' / 'sound-library.js').read_text().split('const SOUNDS=', 1)[1].split(';', 1)[0])
BY_ID = {s['id']: s for s in SOUNDS}
POOL = {}  # name -> data URL, written once into the JS


def ref(name, data):
    POOL.setdefault(name, data)
    return '@@' + name + '@@'


def bg(name):
    return ref(name, 'data:image/webp;base64,' + base64.b64encode((ART / f'{name}.webp').read_bytes()).decode())


def bust(name):
    im = Image.open(ART / f'{name}.webp')
    im = im.crop((0, 0, im.width, round(im.height * 600 / 1216)))
    out = io.BytesIO()
    im.save(out, 'WEBP', quality=92, method=6)
    return ref('bust-' + name, 'data:image/webp;base64,' + base64.b64encode(out.getvalue()).decode())


def lib_sound(sid, volume=60, **extra):
    return {'name': BY_ID[sid]['name'] + ' (기본 소리)', 'volume': volume, 'lib': sid, 'src': f'sounds/{sid}.ogg', **extra}


def music(sid, volume=50):
    x, c = BY_ID[sid], BY_ID[sid]['credit']
    data = 'data:audio/ogg;base64,' + base64.b64encode((ROOT / 'sound-library' / f'{sid}.ogg').read_bytes()).decode()
    return {'name': x['name'] + ' (기본 소리)', 'volume': volume, 'lib': sid, 'loop': True, 'src': ref('music-' + sid, data),
            'credit': {k: c[k] for k in ('title', 'author', 'license', 'url')}}


LAYER, COL = 236, 215
EVENTS, NOTES = [], []


def at(col, row):
    return {'x': round(col * COL), 'y': round(row * LAYER)}


def choice(cid, text, next='sequence', **o):
    c = {'id': cid, 'text': text, 'hp': 0, 'mental': 0, 'money': 0, 'gain': '', 'lose': '', 'requires': '',
         'requiresCount': 1, 'gainCount': 1, 'loseCount': 1, 'next': next}
    c.update(o)
    return c


def scene(sid, title, kind, col, row, speaker, text, choices, **o):
    e = {'id': sid, 'title': title, 'speaker': speaker, 'text': text, 'kind': kind, 'once': True, 'mode': 'both',
         'top': {}, 'bottom': {}, 'choices': choices, 'map': at(col, row)}
    e.update(o)
    EVENTS.append(e)
    return e


def note(nid, row, text):
    NOTES.append({'id': nid, 'x': -3 * COL - 40, 'y': round(row * LAYER) - 30, 'text': text})


def pics(top, bottom=None, mode='both'):
    out = {'mode': mode, 'top': {'image': bg(top)}}
    out['bottom'] = {'image': bg(bottom)} if bottom else {}
    return out


def layer(img, **o):
    l = {'image': img, 'x': 50, 'y': 100, 'scale': 98, 'enter': 'fade', 'motion': 'none', 'flip': False}
    l.update(o)
    return l


def stage(all=None, top=None, bottom=None, girl=None, boy=None, **o):
    s = {'all': all or {}}
    if top:
        s['top'] = top
    if bottom:
        s['bottom'] = bottom
    layers = {}
    if girl:
        layers['top'] = layer(girl, **o.get('gl', {}))
    if boy:
        layers['bottom' if girl else 'top'] = layer(boy, **({'scale': 60} if girl else {}), **o.get('bl', {}))
    if layers:
        s['layers'] = layers
    return {'stage': s}


GS, GN, GU, GD = bust('girl-smile'), bust('girl-neutral'), bust('girl-surprised'), bust('girl-sad')
BN, BA, BU, BS = bust('boy-neutral'), bust('boy-angry'), bust('boy-surprised'), bust('boy-smile')
N = '\n'

definitions = [
    {'id': 'eye', 'name': '관찰력', 'type': 'ability', 'initial': 0},
    {'id': 'nerve', 'name': '용기', 'type': 'ability', 'initial': 0, 'effects': [{'kind': 'mentalLoss', 'amount': 1}]},
    {'id': 'talk', 'name': '말솜씨', 'type': 'ability', 'initial': 0},
    {'id': 'light', 'name': '손전등', 'type': 'item', 'initial': 1},
    {'id': 'keys', 'name': '열쇠 꾸러미', 'type': 'item', 'initial': 0},
    {'id': 'photo', 'name': '낡은 사진', 'type': 'item', 'initial': 0, 'image': bg('classroom-evening'), 'highlight': True,
     'sound': lib_sound('page', 80)},
    {'id': 'clue', 'name': '괴담 조각', 'type': 'item', 'initial': 0, 'sound': lib_sound('sparkle', 70)},
    {'id': 'scared', 'name': '겁먹음', 'type': 'state', 'initial': 0},
    {'id': 'lib', 'name': '도서실을 조사했다', 'type': 'memory', 'initial': 0},
    {'id': 'mus', 'name': '음악실을 조사했다', 'type': 'memory', 'initial': 0},
    {'id': 'roof', 'name': '옥상을 조사했다', 'type': 'memory', 'initial': 0},
    {'id': 'trustS', 'name': '서연을 믿었다', 'type': 'memory', 'initial': 0},
    {'id': 'trustM', 'name': '민준을 믿었다', 'type': 'memory', 'initial': 0},
    {'id': 'heard7', 'name': '일곱 번째를 들었다', 'type': 'memory', 'initial': 0},
    {'id': 'matched', 'name': '사진을 맞춰 봤다', 'type': 'memory', 'initial': 0},
]

# ───────────── 프롤로그 · 직선 ─────────────
note('n0', 0, '이 예제 읽는 법: 위 「개요」로 장별 흐름, 노란 메모가 각 장의 구조 이름')
note('n1', 0.55, '프롤로그 · 직선: 선택은 있어도 길은 하나')
scene('p1', '프롤로그 · 교문 앞', 'story', 0, 0, '서연',
      '졸업까지 남은 날은 일주일.' + N + '"우리 학교에 괴담이 일곱 개 있대. 일곱 개를 다 들으면 일곱 번째가 찾아온다나?"' + N
      + '서연이 {~눈을 반짝이며|목소리를 낮추며} 말했다.',
      [choice('p1a', '재밌겠다, 같이 하자', mental=1), choice('p1b', '그런 건 다 거짓말이야')],
      **pics('school-gate-day', 'street-day'), **stage({'transition': 'fade'}, top={'weather': 'petals'}, girl=GS))
scene('p2', '프롤로그 · 아침 교실', 'story', 0, 1, '민준',
      '"괴담 동아리? 졸업 앞두고 그런 걸 왜 해." 민준이 팔짱을 꼈다.' + N
      + '{용기? 나는 민준의 어깨를 툭 쳤다. "무섭냐?"|나는 괜히 창밖만 봤다.}',
      [choice('p2a', '{말솜씨? 민준을 꼬드긴다|같이 하자고 조른다}', mental=1), choice('p2b', '혼자 수첩에 적어 둔다')],
      **pics('classroom-day'), **stage({'transition': 'dissolve'}, boy=BA))
scene('p3', '프롤로그 · 방과 후 복도', 'story', 0, 2, '서연',
      '서연이 낡은 공책을 펼쳤다. 첫 장에 일곱 줄이 적혀 있다.' + N
      + '"사라지는 책, 혼자 우는 피아노, 옥상의 목소리… 마지막 줄은 지워져 있어."' + N + '복도 끝 창문으로 노을이 들어온다.',
      [choice('p3a', '첫 번째 문부터 열어 보자')],
      **pics('hallway-evening'), **stage({'mood': 'dusk', 'overlays': ['lightRays'], 'transition': 'wipeLeft'}, girl=GN))

# ───────────── 1장 · 가지 → 합류 ─────────────
note('n2', 3, '1장 · 가지 → 합류: 세 갈래가 「1장 끝」에서 다시 만나요')
scene('c1', '1장 · 세 개의 문', 'story', 0, 3, '서연',
      '"도서실, 음악실, 옥상. 오늘은 하나만 조사할 수 있어." 시계가 네 시를 가리킨다.' + N + '어느 문을 열까?',
      [choice('c1a', '도서실 문', 'l1'), choice('c1b', '음악실 문', 'm1'), choice('c1c', '옥상 문', 'r1')],
      **pics('hallway-day'), **stage({'camera': 'zoomIn', 'cameraSpeed': 'slow', 'transition': 'fade'}))
# 도서실
scene('l1', '도서실 · 사라지는 책', 'branch', -1, 4, '나',
      '책장 맨 아래 칸이 비어 있다. 대출 카드에는 같은 이름이 일곱 번 적혀 있다.' + N
      + '{관찰력? 카드의 날짜가 전부 졸업식 전날이다.|이름은 번져서 읽을 수 없다.}',
      [choice('l1a', '대출 카드를 챙긴다', 'l2', gain='clue'), choice('l1b', '책장 뒤를 더듬는다', 'l2', hp=-1)],
      **pics('classroom-day', 'hallway-day'), **stage({'mood': 'faded'}))
scene('l2', '도서실 · 책 속의 사진', 'branch', -1, 5, '나',
      '책 사이에서 사진 한 장이 미끄러져 나왔다. 교복을 입은 일곱 명. 한 사람의 얼굴만 오려져 있다.',
      [choice('l2a', '사진을 가져간다', 'l3', gain='photo'), choice('l2b', '제자리에 꽂아 둔다', 'l3', mental=-1)],
      **pics('classroom-evening'), **stage({'camera': 'zoomIn', 'overlays': ['vignette'], 'beats': [{'when': 'gain', 'fx': 'whiteFlash'}]}))
scene('l3', '도서실 · 문 닫는 소리', 'branch', -1, 6, '나',
      '탁. 아무도 없는데 도서실 문이 닫혔다. {낡은 사진? 주머니 속 사진이 차갑다.|등 뒤가 서늘하다.}',
      [choice('l3a', '동아리방으로 돌아간다', 'c1e', remember='lib')],
      **pics('hallway-evening'), audio={'dialogue': lib_sound('door-close', 75, kind='effect')}, **stage({'beats': [{'when': 'start', 'fx': 'shake'}]}))
# 음악실
scene('m1', '음악실 · 혼자 우는 피아노', 'branch', 0, 4, '나',
      '음악실 앞에 서자 안에서 피아노 소리가 들린다. 문틈으로 보니 의자는 비어 있다.',
      [choice('m1a', '{용기? 문을 벌컥 연다|살며시 문을 연다}', 'm2'), choice('m1b', '노래를 따라 흥얼거린다', 'm2', mental=-1)],
      **pics('classroom-evening', 'hallway-evening'), **stage({'mood': 'dream', 'warp': 'wobble'}))
scene('m2', '음악실 · 악보의 이름', 'branch', 0, 5, '나',
      '보면대에 놓인 악보 맨 위에 이름이 적혀 있다. "일곱 번째에게."' + N + '건반 하나가 저절로 내려간다.',
      [choice('m2a', '악보를 베껴 적는다', 'm3', gain='clue'), choice('m2b', '건반을 눌러 본다', 'm3', hp=-1)],
      **pics('classroom-evening'), **stage({'overlays': ['glow'], 'beats': [{'when': 'start', 'fx': 'pulse'}]}))
scene('m3', '음악실 · 멈춘 메트로놈', 'branch', 0, 6, '나',
      '메트로놈이 일곱 번 흔들리고 멈췄다. {음악실을 조사했다?|이 박자를 어디서 들은 것 같다.}',
      [choice('m3a', '동아리방으로 돌아간다', 'c1e', remember='mus')],
      **pics('classroom-night'), audio={'dialogue': lib_sound('clock', 70, kind='effect')}, **stage({'mood': 'cold'}))
# 옥상
scene('r1', '옥상 · 바람 속 목소리', 'branch', 1, 4, '나',
      '옥상 문은 잠겨 있지 않았다. 바람이 이름을 부르는 것 같다. {~나를|서연을|누군가를}.',
      [choice('r1a', '목소리를 따라간다', 'r2'), choice('r1b', '귀를 막는다', 'r2', mental=-1)],
      **pics('rooftop-day'), **stage({'weather': 'leaves', 'camera': 'sway'}))
scene('r2', '옥상 · 난간의 낙서', 'branch', 1, 5, '나',
      '난간에 칼로 새긴 글씨. "졸업식에 못 간 사람이 있다." 그 아래 열쇠 꾸러미가 걸려 있다.',
      [choice('r2a', '열쇠를 챙긴다', 'r3', gain='keys'), choice('r2b', '낙서를 사진으로 찍는다', 'r3', gain='clue')],
      **pics('rooftop-evening'), **stage({'mood': 'dusk', 'overlays': ['haze']}))
scene('r3', '옥상 · 노을', 'branch', 1, 6, '나',
      '노을이 운동장을 붉게 물들인다. 내려가는 계단이 평소보다 길게 느껴진다.',
      [choice('r3a', '동아리방으로 돌아간다', 'c1e', remember='roof')],
      **pics('rooftop-evening', 'school-gate-evening'), **stage({'transition': 'blinds'}))
scene('c1e', '1장 끝 · 동아리방', 'story', 0, 7, '서연',
      '{도서실을 조사했다? "사진? 얼굴이 오려진 사진이라고?"|}{음악실을 조사했다? "일곱 번째에게… 악보에 그렇게 적혀 있었어?"|}{옥상을 조사했다? "졸업식에 못 간 사람이라니."|}' + N
      + '서연이 공책에 첫 번째 괴담을 지웠다. 괴담 조각 {=괴담 조각}개.',
      [choice('c1ea', '내일은 소문을 모아 보자')],
      **pics('classroom-evening'), **stage({'transition': 'fade'}, girl=GN))

# ───────────── 2장 · 🎲 랜덤 묶음 ─────────────
note('n3', 8, '2장 · 🎲 묶음 반복: 「한 곳 더」로 다시 굴려요. 다섯 중 최대 넷')
scene('c2', '2장 · 소문 사냥', 'story', 0, 8, '서연',
      '"점심시간마다 한 군데씩 소문을 듣자. 어디서 무슨 얘길 들을지는 운이야."',
      [choice('c2a', '소문을 들으러 간다', 'random:gday')],
      **pics('street-day'), **stage({'camera': 'panRight', 'transition': 'slide'}, girl=GS))
DAY = [('d1', '매점 아주머니', 'street-day', '"졸업식 전날마다 빵이 하나씩 남아. 아무도 안 사 가는 빵이."', True),
       ('d2', '체육관 그림자', 'park-day', '체육관 창문에 키 큰 그림자가 비친다. 안에는 아무도 없다.', True),
       ('d3', '화장실 거울', 'hallway-day', '3층 화장실 거울은 일곱 번째 칸이 늘 김이 서려 있다고 한다.', True),
       ('d4', '급식실 숫자', 'classroom-day', '급식 판 개수가 늘 하나 남는다. 영양사 선생님은 웃으며 말했다. "원래 그래."', False),
       ('d5', '운동장 발자국', 'school-gate-day', '비가 오지 않았는데 운동장에 젖은 발자국이 교문까지 이어져 있다.', False)]
for k, (sid, title, img, text, more) in enumerate(DAY):
    ch = [choice(sid + 'a', '수첩에 적는다', 'sequence', gain='clue')]
    if more:
        ch = [choice(sid + 'a', '수첩에 적고 한 곳 더 간다', 'random:gday', gain='clue'), choice(sid + 'b', '오늘은 여기까지', 'sequence', gain='clue')]
    else:
        ch.append(choice(sid + 'b', '못 들은 척한다', 'sequence', mental=-1))
    scene(sid, '낮의 소문 · ' + title, 'encounter', (k - 2) * 1.0, 9.35, '나', text + N + '{처음 듣는 소문이다.|또 하나의 소문이다.|소문이 점점 겹친다.}',
          ch, randomGroup='gday', **pics(img), **stage({'transition': 'wipeUp'}))

# ───────────── 3장 · 거점 반복 ─────────────
note('n4', 10.6, '3장 · 거점 반복: 조사하고 동아리방으로 돌아와요(→ 꼬리표)')
scene('c3', '3장 · 밤의 동아리방', 'story', 0, 10.6, '서연',
      '{처음 모인 밤의 동아리방이다.|다시 동아리방이다.|동아리방의 형광등이 깜빡인다.|이제 이 방이 익숙하다.}' + N
      + '괴담 조각 {=괴담 조각}개.{괴담 조각>=4?  "거의 다 모았어." 서연의 목소리가 떨린다.|}',
      [choice('c3a', '괴담 목록을 다시 본다', 'h1'), choice('c3b', '서연과 이야기한다', 'h2'), choice('c3c', '민준과 이야기한다', 'h3'),
       choice('c3d', '사진을 맞춰 본다', 'h4', requires='photo', requiresMore=[{'id': 'matched', 'count': 1, 'not': True}], hideLocked=True), choice('c3e', '창밖을 본다', 'h5'),
       choice('c3f', '자정의 학교로 간다', 'sequence')],
      **pics('classroom-night'), **stage({'mood': 'night', 'moodStrength': 60}, girl=GN), once=False)
scene('h1', '거점 · 괴담 목록', 'branch', -2, 11.85, '나',
      '지워진 줄은 {&여섯|일곱|여섯} 개. {관찰력? 지워진 일곱 번째 줄에 연필 자국이 남아 있다.|마지막 줄은 여전히 하얗다.}',
      [choice('h1a', '돌아간다', 'c3', remember='heard7')], once=False, **pics('classroom-night'))
scene('h2', '거점 · 서연의 이야기', 'branch', -1, 11.85, '서연',
      '"사실 이 공책, 우리 언니 거야. 언니는 졸업식에 못 왔어."' + N + '서연이 처음으로 웃지 않았다.',
      [choice('h2a', '"내가 끝까지 같이 할게"', 'c3', remember='trustS', mental=1)], **pics('girl-room-night'), **stage({'mood': 'memory'}, girl=GD))
scene('h3', '거점 · 민준의 이야기', 'branch', 0, 11.85, '민준',
      '"괴담 따위 안 믿어. 근데… 너희 둘만 보내긴 싫다."' + N + '민준이 손전등 배터리를 갈아 끼웠다.',
      [choice('h3a', '"믿고 맡길게"', 'c3', remember='trustM', mental=1)], **pics('boy-room-night'), **stage({}, boy=BS))
scene('h4', '거점 · 사진 맞추기', 'branch', 1, 11.85, '나',
      '오려진 얼굴 자리에 대출 카드를 대 보니, 이름 획이 딱 맞는다.' + N + '"이 사람이… 일곱 번째?"',
      [choice('h4a', '단서로 적어 둔다', 'c3', gain='clue', remember='matched')], **pics('classroom-night'), **stage({'beats': [{'when': 'gain', 'fx': 'whiteFlash'}]}))
scene('h5', '거점 · 창밖', 'branch', 2, 11.85, '나',
      '운동장 한가운데 누군가 서 있다. {~눈을 깜빡이자 사라졌다|이쪽을 보고 손을 흔든다|교문 쪽으로 걸어간다}.',
      [choice('h5a', '돌아간다', 'c3', mental=-1, gain='scared')], once=False, **pics('school-gate-night'), **stage({'weather': 'fog'}))

# ───────────── 4장 · 관문 ─────────────
note('n5', 13, '4장 · 관문: 시험마다 틀리면 사망 장면(오른쪽)')
scene('c4', '4장 · 자정의 교문', 'story', 0, 13, '민준',
      '자정. 교문이 소리 없이 열려 있다. "세 번만 버티면 된대. 계단, 거울, 피아노."',
      [choice('c4a', '들어간다', 't1')],
      **pics('school-gate-night', 'street-night'), audio={'bgmMode': 'stop'},
      **stage({'weather': 'rain', 'mood': 'night', 'transition': 'blackFade', 'beats': [{'when': 'start', 'fx': 'lightning'}]}, boy=BN))
scene('t1', '첫 번째 시험 · 계단', 'branch', 0, 14, '나',
      '2층으로 가는 계단이 끝나지 않는다. {관찰력? 열세 번째 계단만 색이 다르다.|몇 칸을 올랐는지 모르겠다.}',
      [choice('t1a', '열세 번째 칸을 건너뛴다', 't2', requires='eye'), choice('t1b', '숨을 고르며 천천히 오른다', 't2', hp=-2),
       choice('t1c', '뛰어 올라간다', 'x1')],
      **pics('hallway-night'), audio={'dialogue': lib_sound('footsteps', 75, kind='effect')}, **stage({'mood': 'horror', 'camera': 'zoomIn', 'cameraSpeed': 'fast'}))
scene('t2', '두 번째 시험 · 거울', 'branch', 0, 15, '나',
      '화장실 거울에 내가 비친다. 거울 속 나만 웃고 있다.',
      [choice('t2a', '손전등으로 거울을 비춘다', 't3', requires='light', lose='light'), choice('t2b', '눈을 감고 지나간다', 't3', mental=-1),
       choice('t2c', '거울을 들여다본다', 'x2')],
      **pics('hallway-night', 'classroom-night'), **stage({'top': {'warp': 'water'}, 'beats': [{'when': 'start', 'fx': 'glitch'}]}))
scene('t3', '세 번째 시험 · 피아노', 'branch', 0, 16, '나',
      '음악실 피아노가 같은 곡을 되풀이한다. {음악실을 조사했다? 악보의 이름이 떠오른다.|곡이 머릿속을 파고든다.}',
      [choice('t3a', '악보의 이름을 부른다', 'c4e', requires='mus'), choice('t3b', '귀를 막고 버틴다', 'c4e', hp=-1, mental=-1),
       choice('t3c', '건반을 같이 친다', 'x3')],
      **pics('classroom-night'), **stage({'mood': 'dream', 'overlays': ['grain'], 'beats': [{'when': 'loss', 'fx': 'redFlash'}]}))
for sid, title, row, label, text, img in [('x1', '사망 · 끝나지 않는 계단', 15, '끝나지 않는 계단', '계단은 끝나지 않았다. 아침이 와도.', 'hallway-night'),
                                           ('x2', '사망 · 거울 속으로', 16, '거울 속으로', '거울 속의 내가 손을 내밀었다. 이번엔 내가 웃고 있었다.', 'hallway-night'),
                                           ('x3', '사망 · 멈추지 않는 연주', 17, '멈추지 않는 연주', '손가락이 멈추지 않는다. 곡은 일곱 번째 마디에서 다시 시작된다.', 'classroom-night')]:
    scene(sid, title, 'branch', 1.6, row, '나', text, [choice(sid + 'a', '처음부터', 'end')], ending='death', endLabel=label,
          mode='full', top={'image': bg(img)}, bottom={}, **stage({'mood': 'horror', 'transition': 'blackFade', 'beats': [{'when': 'start', 'fx': 'bigShake'}]}))
scene('c4e', '4장 끝 · 새벽 옥상', 'story', 0, 17, '서연',
      '세 시험을 지나 옥상에 나오자 하늘이 밝아 온다. "살았다…" 서연이 주저앉았다.' + N + '{겁먹음? 손이 아직 떨린다.|생각보다 담담하다.}',
      [choice('c4ea', '집으로 돌아간다', hp=1)],
      **pics('rooftop-evening'), **stage({'mood': 'dawn', 'overlays': ['lightRays'], 'transition': 'whiteFade'}, girl=GU))

# ───────────── 막간 · 🎲 밤의 소문 ─────────────
note('n6', 18, '막간 · 🎲 두 번째 묶음: 밤의 소문 셋 중 하나')
scene('c45', '막간 · 비 오는 귀갓길', 'story', 0, 18, '나',
      '비가 온다. 집으로 가는 길에 또 하나의 소문을 마주친다.',
      [choice('c45a', '골목으로 들어선다', 'random:gnight')], **pics('street-night'), **stage({'weather': 'rain', 'overlays': ['letterbox']}))
NIGHT = [('e1', '밤의 공원 그네', 'park-night', '아무도 없는 그네가 혼자 흔들린다. 일곱 번 흔들리고 멈췄다.'),
         ('e2', '편의점 앞 우산', 'street-night', '편의점 앞에 우산이 일곱 개 꽂혀 있다. 하나에 내 이름표가 붙어 있다.'),
         ('e3', '집 앞 전화', 'house-front-night', '집 앞에서 전화가 울린다. 수화기 너머에서 서연 목소리가 말한다. "아직 하나 남았어."')]
for k, (sid, title, img, text) in enumerate(NIGHT):
    scene(sid, '밤의 소문 · ' + title, 'encounter', (k - 1) * 1.0, 19.35, '나', text,
          [choice(sid + 'a', '단서로 적는다', 'sequence', gain='clue'), choice(sid + 'b', '서둘러 지나간다', 'sequence', mental=-1)],
          randomGroup='gnight', **pics(img), **stage({'weather': 'fog', 'mood': 'night'}))

# ───────────── 5장 · 두 갈래 추적 ─────────────
note('n7', 20.6, '5장 · 두 갈래 + 교차: 서로의 길로 건너가는 선이 있어요')
scene('c5', '5장 · 두 갈래', 'story', 0, 20.6, '민준',
      '"서연은 언니 집을, 나는 졸업 앨범을 뒤져 볼게. 넌 어느 쪽?"',
      [choice('c5a', '서연과 간다', 's1'), choice('c5b', '민준과 간다', 'j1')],
      **pics('street-evening'), **stage({'transition': 'fade'}, girl=GN, boy=BN))
scene('s1', '서연 쪽 · 오래된 집', 'branch', -1.1, 21.6, '서연',
      '"언니 방은 그대로야. 엄마가 못 치우게 해." 서연이 열쇠를 돌렸다.' + N + '{열쇠 꾸러미? 내 열쇠 하나가 이 집 대문에 맞는다.|}',
      [choice('s1a', '언니 방으로 간다', 's2')], **pics('house-front-evening'), **stage({}, girl=GD))
scene('s2', '서연 쪽 · 언니의 일기', 'branch', -1.1, 22.6, '나',
      '일기장 마지막 장: "졸업식 전날 밤, 옥상에서 일곱 번째를 만나기로 했다."',
      [choice('s2a', '일기장을 챙긴다', 's3', gain='clue'), choice('s2b', '민준에게 전화한다', 'j2', remember='trustM')],
      **pics('girl-room-evening'), **stage({'mood': 'memory', 'overlays': ['vignette']}))
scene('s3', '서연 쪽 · 일기의 뒷장', 'branch', -1.1, 23.6, '서연',
      '뒷장에 연필로 흐리게 적힌 글. "나 대신 졸업해 줘."' + N + '서연이 일기장을 끌어안았다.',
      [choice('s3a', '학교로 돌아간다', 'fin', remember='trustS')], **pics('girl-room-night'), **stage({'mood': 'memory'}, girl=GD))
scene('j1', '민준 쪽 · 공원 벤치', 'branch', 1.1, 21.6, '민준',
      '"앨범은 우리 집에 있어. 형 거야." 민준이 벤치에서 일어났다. "형도 그 해 졸업생이었어."',
      [choice('j1a', '민준의 집으로 간다', 'j2')], **pics('park-evening'), **stage({'weather': 'fireflies'}, boy=BN))
scene('j2', '민준 쪽 · 상자 속 앨범', 'branch', 1.1, 22.6, '민준',
      '형 방 상자에서 졸업 앨범이 나왔다. 단체 사진에 한 자리가 비어 있다.' + N + '{낡은 사진? 내 사진과 겹쳐 보니 빈자리가 딱 맞는다.|}',
      [choice('j2a', '앨범을 챙긴다', 'j3', gain='clue'), choice('j2b', '서연에게 간다', 's3', remember='trustS')],
      **pics('boy-room-evening'), **stage({}, boy=BU))
scene('j3', '민준 쪽 · 빈자리', 'branch', 1.1, 23.6, '민준',
      '"빈자리 이름… 서연이 언니야." 민준이 앨범을 덮었다. "우리가 채워 주자."',
      [choice('j3a', '학교로 돌아간다', 'fin', remember='trustM')], **pics('boy-room-night'), **stage({}, boy=BN))

# ───────────── 최종장 · 분류 모자 ─────────────
note('n8', 24.8, '최종장 · 분류 모자: 모은 기억·단서에 따라 숨은 선택지가 열려요')
scene('fin', '최종장 · 졸업식 전날 밤', 'story', 0, 24.8, '서연',
      '졸업식 전날 밤, 옥상. 공책의 일곱 번째 줄이 천천히 떠오른다.' + N
      + '괴담 조각 {=괴담 조각}개.{서연을 믿었다?  서연이 내 손을 잡았다.|}{민준을 믿었다?  민준이 손전등을 켰다.|}{일곱 번째를 들었다?  지워졌던 연필 자국이 글자가 된다.|}' + N
      + '{괴담 조각>=6? 이제 모든 괴담이 하나로 이어진다.|아직 무언가 빠진 것 같다.}',
      [choice('fa', '일곱 번째 괴담을 말한다', 'tEnd', requires='clue', requiresCount=6, hideLocked=True),
       choice('fb', '서연의 손을 잡는다', 'sEnd', requires='trustS', hideLocked=True),
       choice('fc', '민준을 따라 내려간다', 'mEnd', requires='trustM', hideLocked=True),
       choice('fd', '그냥 집에 간다', 'nEnd'),
       choice('fe', '난간 너머를 본다', 'x4')],
      **pics('rooftop-night'), audio={'bgmMode': 'play', 'bgm': music('bgm-comfortable-mystery', 45)},
      **stage({'weather': 'stars', 'mood': 'night', 'overlays': ['glow'], 'transition': 'iris'}, girl=GN))
ENDS = [('tEnd', '진 엔딩 · 일곱 번째는 우리였다', -2, 'end', '일곱 번째는 괴담이 아니었다. 졸업하지 못한 사람을 기억하는 우리였다. 다음 날, 졸업식 단상에 빈 의자 하나가 놓였다.', 'school-gate-day', GS),
        ('sEnd', '엔딩 · 서연과 함께', -1, 'end', '"언니 몫까지 졸업하자." 서연이 웃었다. 처음 만난 날처럼.', 'girl-room-day', GS),
        ('mEnd', '엔딩 · 민준과 함께', 0, 'end', '민준이 형의 앨범에 우리 사진을 끼워 넣었다. "이제 빈자리 없다."', 'boy-room-day', BS),
        ('nEnd', '엔딩 · 평범한 졸업', 1, 'end', '아무 일도 없었다. 졸업식은 맑았다. 가끔, 옥상 쪽에서 피아노 소리가 들린다.', 'park-day', None),
        ('x4', '사망 · 졸업식에 오지 못한 사람', 2, 'death', '난간 너머에서 누군가 손을 흔들었다. 나는 그 손을 잡았다.', 'rooftop-night', None)]
for sid, title, col, kind, text, img, person in ENDS:
    extra = stage({'weather': 'sparkles' if kind == 'end' else 'storm', 'transition': 'whiteFade' if kind == 'end' else 'blackFade'}, girl=person) if person else stage({'transition': 'fade' if kind == 'end' else 'blackFade', 'mood': 'mono' if kind == 'death' else 'none'})
    scene(sid, title, 'branch', col, 26.1, '나', text, [choice(sid + 'a', '처음부터', 'end')], ending=kind, endLabel=title.split(' · ', 1)[1],
          mode='full', top={'image': bg(img)}, bottom={}, **extra)

project = {
    'format': 'event-vn', 'version': 1, 'title': '일곱 번째 괴담', 'theme': 'cream', 'panelTransparency': 10, 'manualSaves': True,
    'hp': 4, 'maxHp': 5, 'mental': 3, 'money': 1, 'randomStart': 2,
    'randomGroups': [{'id': 'gday', 'name': '낮의 소문', 'map': at(0, 8.6)}, {'id': 'gnight', 'name': '밤의 소문', 'map': at(0, 18.6)}],
    'definitions': definitions, 'events': EVENTS, 'mapNotes': NOTES,
    'finish': {'deathText': '쓰러진 채로 아침을 맞았다. 일곱 번째는 오지 않았다. (체력·멘탈 0)', 'death': {'image': bg('hallway-night')}},
    'audio': {'bgm': music('bgm-comfortable-mystery', 45), 'stageSound': True, 'stageVolume': 70},
    'landing': {'intro': '구조도로 읽는 긴 예제. 장마다 다른 분기 구조를 메모와 함께 보여 줍니다.', 'author': '사건 게임 에디터',
                'credits': '그림: 에디터 기본 그림 (그림 모음)\n소리: 에디터 기본 소리', 'image': bg('school-gate-night')},
}

body = json.dumps(project, ensure_ascii=False, separators=(',', ':'))
for name in POOL:
    body = body.replace(json.dumps('@@' + name + '@@'), 'P[' + json.dumps(name) + ']')
pool = json.dumps(POOL, separators=(',', ':'))
out = ROOT / 'assets' / 'mystery-sample.js'
out.write_text("'use strict';\n// 일곱 번째 괴담 (generated by make-mystery.py; edit that file, not this one). Pictures and music are listed once in P.\n"
               "(function(root){const P=" + pool + ";root.MYSTERY_SAMPLE=" + body + ";})(globalThis);\n")
print(out, len(EVENTS), 'scenes', round(out.stat().st_size / 1048576, 2), 'MB')
