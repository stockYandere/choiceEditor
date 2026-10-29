"""Builds assets/festival-sample.js: 축제 전날 밤, a 31-scene game made to show the features added in v0.1.57~v0.1.63
with the built-in pictures (그림 모음) and sounds (기본 소리):

  호감도   민준 · 서연 (visible), 의심 (hidden): several people moved by one choice (+/-), 이상/이하 conditions,
           negative comparisons in lines ({서연<=-1? …}), 다른 결과 by 호감도, 🎲 등장 조건 on 호감도
  조건     up to three per choice, 모두 만족 / 하나라도, 있을 때 / 없을 때 mixed, 다른 결과 with several conditions
  얻기·잃기 several items gained and lost by one choice
  🎲      two random groups, 무게 1~10 (rare 1, common 8) and 등장 조건 (items, 돈, 호감도, a hidden 호감도, a state)
  ⏱       two timed scenes with a 시간 초과 choice
  엔딩 모음 six endings, a 사망 장면 and 체력·멘탈 0; 2회차 lines {#셋이 함께 본 등불? …} and {#엔딩>=2? …}

Run: python3 make-festival.py   (then check it with test-festival-browser.cjs)
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
    x = BY_ID[sid]
    return {'name': x['name'] + ' (기본 소리)', 'volume': volume, 'lib': sid, 'src': f'sounds/{sid}.ogg', **extra}


def music(sid, volume=55):
    x = BY_ID[sid]
    data = (ROOT / 'sound-library' / f'{sid}.ogg').read_bytes()
    c = x['credit']
    return {'name': x['name'] + ' (기본 소리)', 'volume': volume, 'lib': sid, 'loop': True,
            'src': 'data:audio/ogg;base64,' + base64.b64encode(data).decode(),
            'credit': {k: c[k] for k in ('title', 'author', 'license', 'url')}}


def need(*conds, any=False):
    """Choice conditions: need(('key', 1), ('mj', 2, 'le'), ('nervous', 1, 'not')) -> the stored fields."""
    rows = [{'id': c[0], 'count': c[1], **({'le': True} if c[2:] == ('le',) else {'not': True} if c[2:] == ('not',) else {})}
            for c in conds]
    first, more = rows[0], rows[1:]
    out = {'requires': first['id'], 'requiresCount': first['count']}
    if first.get('not'):
        out['requiresNot'] = True
    if first.get('le'):
        out['requiresLe'] = True
    if more:
        out['requiresMore'] = more
    if any and len(rows) > 1:
        out['requiresAny'] = True
    return out


def when(*conds, any=False, **result):
    """다른 결과: the same condition rows as need() plus that outcome."""
    n = need(*conds, any=any)
    out = {'when': n['requires'], 'count': n['requiresCount'], 'hp': 0, 'mental': 0, 'money': 0, 'gain': '', 'lose': '',
           'next': 'sequence'}
    for a, b in (('requiresNot', 'whenNot'), ('requiresLe', 'whenLe'), ('requiresMore', 'whenMore'), ('requiresAny', 'whenAny')):
        if a in n:
            out[b] = n[a]
    out.update(result)
    return out


def items(key, *pairs):
    """Several items gained or lost: items('gain', ('bulb', 2), ('tape', 1))."""
    (first, n), more = pairs[0], pairs[1:]
    out = {key: first, key + 'Count': n}
    if more:
        out[key + 'More'] = [{'id': i, 'count': c} for i, c in more]
    return out


def aff(**d):
    return {'affinity': [{'id': k, 'delta': v} for k, v in d.items()]}


def choice(cid, text, *parts, **o):
    base = {'id': cid, 'text': text, 'hp': 0, 'mental': 0, 'money': 0, 'gain': '', 'lose': '', 'requires': '',
            'requiresCount': 1, 'gainCount': 1, 'loseCount': 1, 'next': 'sequence'}
    for p in parts:
        base.update(p)
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


GIRL = {k: person('girl-' + k) for k in ('smile', 'neutral', 'sad', 'surprised', 'angry')}
BOY = {k: person('boy-' + k) for k in ('smile', 'neutral', 'sad', 'surprised', 'angry')}
GIRL_FULL, BOY_FULL = person('girl-smile', bust=False), person('boy-smile', bust=False)

definitions = [
    {'id': 'mj', 'name': '민준', 'type': 'affinity', 'initial': 0},
    {'id': 'sy', 'name': '서연', 'type': 'affinity', 'initial': 0},
    {'id': 'doubt', 'name': '의심', 'type': 'affinity', 'initial': 0, 'hidden': True},
    {'id': 'hand', 'name': '손재주', 'type': 'ability', 'initial': 0},
    {'id': 'sense', 'name': '눈치', 'type': 'ability', 'initial': 0},
    {'id': 'talk', 'name': '말솜씨', 'type': 'ability', 'initial': 0},
    {'id': 'light', 'name': '손전등', 'type': 'item', 'initial': 1},
    {'id': 'tape', 'name': '테이프', 'type': 'item', 'initial': 0},
    {'id': 'bulb', 'name': '전구', 'type': 'item', 'initial': 0},
    {'id': 'snack', 'name': '간식', 'type': 'item', 'initial': 0},
    {'id': 'bandage', 'name': '반창고', 'type': 'item', 'initial': 0, 'effects': [{'kind': 'hpLoss', 'amount': 1}]},
    {'id': 'keys', 'name': '열쇠 꾸러미', 'type': 'item', 'initial': 0, 'image': bg('hallway-night'), 'imageX': 50,
     'imageY': 45, 'highlight': True, 'sound': lib_sound('sparkle', 80)},
    {'id': 'nervous', 'name': '긴장', 'type': 'state', 'initial': 0},
    {'id': 'fixed', 'name': '등을 고쳤다', 'type': 'memory', 'initial': 0},
    {'id': 'note', 'name': '쪽지를 읽었다', 'type': 'memory', 'initial': 0},
    {'id': 'song', 'name': '서연의 노래를 들었다', 'type': 'memory', 'initial': 0},
]

H = '\n'
TRIO = '셋이 함께 본 등불'
events = [
    # ── 1 · 방과 후
    scene('s1', '1 · 방과 후 교실', 'story', '서연',
          '{#' + TRIO + '? (어쩐지 본 적 있는 오후다.) |}{#엔딩>=2? (몇 번째 축제 전날일까.) |}'
          '"큰일이야. 내일 무대에 걸 반딧불 등이 없어졌어!" 서연이 빈 상자를 흔든다. 옆에서 민준이 머리를 긁는다.',
          [choice('s1-mj', '민준과 같이 찾는다', aff(mj=1, sy=-1), next='random:gprep'),
           choice('s1-sy', '서연과 같이 찾는다', aff(sy=1, mj=-1), next='random:gprep'),
           choice('s1-both', '{말솜씨? 둘을 설득해 셋이 찾는다|셋이 같이 찾자고 해 본다}', aff(mj=1, sy=1), need(('talk', 1)),
                  next='random:gprep'),
           choice('s1-alone', '혼자 조용히 찾아본다', mental=-1, gain='nervous', next='random:gprep')],
          top={'image': bg('classroom-day'), 'y': 45}, bottom={'image': bg('hallway-day'), 'y': 55},
          audio={'bgmMode': 'play', 'bgm': music('bgm-fluffing-a-duck', 50)},
          stage={'all': {'transition': 'fade'}, 'top': {'camera': 'zoomIn', 'cameraSpeed': 'slow', 'overlays': ['lightRays']},
                 'layers': {'top': layer(GIRL['surprised'], x=64, enter='rise', motion='breathe'),
                            'bottom': layer(BOY['neutral'], x=36, scale=62, enter='slideLeft', flip=True)}}),

    # ── 🎲 축제 준비 (gprep): 무게와 등장 조건
    scene('r-shop', '매점 심부름', 'encounter', '매점 아주머니',
          '"축제 준비니? 전구랑 테이프가 마침 남았어." 지갑엔 {=돈}칸.',
          [choice('rs-both', '전구와 테이프를 산다 (돈 2)', items('gain', ('bulb', 1), ('tape', 1)), money=-2),
           choice('rs-snack', '간식만 산다 (돈 1)', money=-1, gain='snack'),
           choice('rs-out', '그냥 나온다')],
          randomGroup='gprep', weight=5, appear=[{'id': '@money', 'count': 1}], mode='top',
          top={'image': bg('street-day'), 'y': 55}, audio={'dialogue': lib_sound('coins', 60, kind='effect')},
          stage={'all': {'camera': 'panRight', 'transition': 'slide'}}),
    scene('r-note', '복도의 쪽지', 'encounter', '나',
          '사물함 틈에 쪽지가 끼어 있다. "등은 가장 높은 곳에."{눈치?  글씨가 민준 것 같다.}',
          [choice('rn-keep', '쪽지를 챙긴다', remember='note'),
           choice('rn-more', '다른 곳도 둘러본다 (🎲 다시)', next='random:gprep')],
          randomGroup='gprep', weight=3, top={'image': bg('hallway-day')}, bottom={'image': bg('classroom-day'), 'fit': 'contain'},
          stage={'all': {'transition': 'wipeLeft'}, 'top': {'camera': 'drift'}}),
    scene('r-cat', '운동장 고양이', 'encounter', '나',
          '드물게 학교 고양이가 다가와 다리에 몸을 비빈다.',
          [choice('rc-feed', '간식을 나눠 준다', need(('snack', 1)), lose='snack', mental=2),
           choice('rc-pet', '쓰다듬는다', mental=1)],
          randomGroup='gprep', weight=1, mode='bottom', bottom={'image': bg('park-day')},
          audio={'dialogue': lib_sound('cat', 70, kind='effect')},
          stage={'all': {'weather': 'petals', 'transition': 'iris'}}),
    scene('r-mjsnack', '민준의 간식', 'encounter', '민준',
          '"배고프지?" 민준이 편의점 봉투를 내민다. {민준>=3? 귀가 살짝 빨갛다.|}',
          [choice('rm-take', '고맙게 받는다', aff(mj=1), gain='snack', gainCount=2),
           choice('rm-share', '서연 몫도 챙기자고 한다', aff(mj=1, sy=1), gain='snack')],
          randomGroup='gprep', weight=8, appear=[{'id': 'mj', 'count': 1}],
          top={'image': bg('classroom-day')}, bottom={'image': bg('street-day')},
          stage={'all': {'transition': 'dissolve'}, 'layers': {'top': layer(BOY['smile'], x=50, enter='pop', motion='bob')}}),
    scene('r-sysong', '서연의 노래 연습', 'encounter', '서연',
          '빈 교실에서 서연이 내일 부를 노래를 흥얼거린다.{서연<=-1?  나를 보자 노래를 멈춘다.}',
          [choice('ry-listen', '조용히 듣는다', aff(sy=1), remember='song'),
           choice('ry-clap', '박수를 친다', aff(sy=1), mental=1)],
          randomGroup='gprep', weight=3, appear=[{'id': 'sy', 'count': 0}], mode='full',
          top={'image': bg('classroom-evening'), 'y': 45}, audio={'dialogue': lib_sound('applause', 50, kind='effect')},
          stage={'all': {'mood': 'dusk', 'overlays': ['glow'], 'transition': 'fade'},
                 'layers': {'top': layer(GIRL['smile'], x=50, scale=100, enter='fade', motion='sway')}}),
    scene('r-art', '미술 준비물 정리', 'encounter', '나',
          '미술실 상자에서 쓸 만한 걸 하나 고를 수 있다.',
          [choice('ra-pick', '하나 골라 챙긴다 (랜덤 보상)', reward={'pool': ['tape', 'bulb', 'bandage'], 'count': 1}),
           choice('ra-mj', '민준을 불러 무거운 상자를 옮긴다', aff(mj=1), hp=-1),
           choice('ra-more', '다른 곳도 둘러본다 (🎲 다시)', next='random:gprep')],
          randomGroup='gprep', weight=3, top={'image': bg('classroom-day'), 'y': 60},
          stage={'all': {'camera': 'breathe', 'transition': 'wipeUp'}}),
    scene('r-teacher', '교감 선생님', 'encounter', '교감 선생님',
          '"너희, 아직도 안 갔니?" 안경 너머 눈이 가늘어진다.',
          [choice('rt-talk', '{말솜씨? 축제 준비라고 둘러댄다|우물쭈물한다}', aff(doubt=1),
                  branch=when(('talk', 1), affinity=[{'id': 'doubt', 'delta': -2}])),
           choice('rt-bow', '꾸벅 인사하고 지나간다')],
          randomGroup='gprep', weight=3, appear=[{'id': 'nervous', 'count': 1}, {'id': 'mj', 'count': -1, 'le': True}], appearAny=True,
          top={'image': bg('hallway-day')}, bottom={'image': bg('hallway-evening')},
          stage={'all': {'mood': 'cold', 'moodStrength': 50, 'transition': 'cut'}}),

    # ── 2 · 노을
    scene('s2', '2 · 노을 진 교실', 'story', '민준',
          '{민준>=2? 민준이 슬쩍 웃는다.|민준은 말이 없다.} 상자 바닥에서 깨진 등 뼈대가 나왔다. 전구도 테이프도 모자란다.',
          [choice('s2-fix', '테이프와 전구로 등을 고친다', need(('tape', 1), ('bulb', 1), ('nervous', 1, 'not')),
                  items('lose', ('tape', 1), ('bulb', 1)), aff(mj=1, sy=1), remember='fixed'),
           choice('s2-hand', '손재주로 대충 이어 붙인다', need(('hand', 1)), hp=-1, remember='fixed',
                  branch=when(('tape', 1), ('bandage', 1), any=True)),
           choice('s2-sy', '{서연<=-1? 서연에게 아까 일을 사과한다|서연에게 도와 달라고 한다}', aff(sy=1)),
           choice('s2-out', '포기하고 밖을 둘러본다')],
          mode='full', top={'image': bg('classroom-evening'), 'y': 45},
          stage={'all': {'camera': 'breathe', 'mood': 'dusk', 'moodStrength': 70, 'overlays': ['lightRays', 'vignette'],
                         'transition': 'dissolve', 'beats': [{'when': 'gain', 'fx': 'pulse'}]},
                 'layers': {'top': layer(BOY['neutral'], x=34, scale=100, enter='slideRight', motion='breathe')}}),

    # ── 3 · 닫히는 교문 (⏱ 6초)
    scene('s3', '3 · 닫히는 교문', 'story', '경비 아저씨',
          '"교문 닫는다! 남은 학생 얼른 나와!" 철문이 끼익 움직이기 시작한다.',
          [choice('s3-hide', '서연의 손짓을 따라 화단 뒤로 숨는다', need(('sy', 1)), hideLocked=True, next='sneakIn'),
           choice('s3-wall', '담을 넘는다', hp=-1, next='sneakIn'),
           choice('s3-talk', '경비실에 사정을 말한다', need(('talk', 1)), aff(doubt=1), next='sneakIn'),
           choice('s3-home', '오늘은 그냥 집에 간다', next='eHome'),
           choice('s3-freeze', '얼어붙는다', mental=-1, next='caught')],
          timer={'seconds': 6, 'choice': 's3-freeze'},
          top={'image': bg('school-gate-evening')}, bottom={'image': bg('street-evening'), 'y': 45},
          audio={'dialogue': lib_sound('creak', 75, kind='effect')},
          stage={'all': {'transition': 'blackFade', 'beats': [{'when': 'start', 'fx': 'shake'}]},
                 'top': {'camera': 'zoomIn', 'cameraSpeed': 'fast', 'mood': 'danger', 'moodStrength': 40}}),
    scene('sneakIn', '몰래 남은 학교', 'branch', '나',
          '교문이 닫혔다. 우리는 학교 안에 남았다.{긴장?  심장이 쿵쾅거린다.}',
          [choice('sn-keys', '경비실 열쇠 꾸러미를 슬쩍한다', aff(doubt=1), gain='keys'),
           choice('sn-go', '그냥 안으로 들어간다')],
          top={'image': bg('hallway-evening')}, bottom={'image': bg('school-gate-night')},
          stage={'all': {'mood': 'night', 'transition': 'fade'}}),
    scene('caught', '경비실 앞', 'branch', '경비 아저씨',
          '"학생, 거기서 뭐 해?" 손전등 빛이 얼굴을 비춘다.',
          [choice('cg-talk', '{말솜씨? 무대 준비라고 차분히 설명한다|더듬더듬 변명한다}', aff(doubt=2),
                  branch=when(('talk', 1), affinity=[{'id': 'doubt', 'delta': -1}])),
           choice('cg-run', '도망친다', hp=-1, mental=-1)],
          mode='top', top={'image': bg('school-gate-night'), 'y': 40},
          audio={'dialogue': lib_sound('footsteps', 70, kind='effect')},
          stage={'all': {'mood': 'horror', 'moodStrength': 40, 'transition': 'flashCut', 'beats': [{'when': 'start', 'fx': 'flash'}]}}),

    # ── 4 · 밤의 복도
    scene('s4', '4 · 밤의 복도', 'story', '나',
          '불 꺼진 복도. {@경비실 앞? 경비 아저씨에게 들킬 뻔한 게 아직도 떨린다. |}{의심>=2? 멀리서 교감 선생님 목소리가 들린다.|}',
          [choice('s4-light', '손전등을 켜고 둘러본다', need(('light', 1)), next='random:gnight'),
           choice('s4-sneak', '{눈치? 발소리를 피해 걷는다|조심조심 걷는다}', next='random:gnight'),
           choice('s4-call', '민준에게 전화한다', need(('mj', 1)), aff(mj=1), next='random:gnight')],
          top={'image': bg('hallway-night')}, bottom={'image': bg('classroom-night'), 'y': 70},
          audio={'bgmMode': 'play', 'bgm': music('bgm-comfortable-mystery', 50)},
          stage={'all': {'transition': 'glitch'}, 'top': {'mood': 'night', 'overlays': ['grain'], 'camera': 'drift'},
                 'bottom': {'mood': 'cold', 'warp': 'wobble'}}),

    # ── 🎲 밤 순찰 (gnight)
    scene('r-guard', '다가오는 손전등', 'encounter', '나',
          '복도 끝에서 둥근 빛이 다가온다.',
          [choice('rg-hide', '{눈치? 빛의 방향을 읽고 숨는다|교실 문 뒤에 숨는다}', aff(doubt=1), mental=-1,
                  branch=when(('sense', 1), ('@mental', 3), any=True)),
           choice('rg-hello', '정면으로 인사한다', aff(doubt=2)),
           choice('rg-more', '반대쪽으로 돌아간다 (🎲 다시)', next='random:gnight')],
          randomGroup='gnight', weight=5, mode='top', top={'image': bg('hallway-night'), 'y': 50},
          stage={'all': {'overlays': ['vignette'], 'transition': 'blinds', 'beats': [{'when': 'start', 'fx': 'flash'}]}}),
    scene('r-sound', '피아노 소리', 'encounter', '나',
          '음악실 쪽에서 피아노 소리가 난다.{서연의 노래를 들었다?  서연이 연습하던 그 멜로디다.}',
          [choice('rd-follow', '열쇠로 음악실 문을 연다', need(('keys', 1)), next='music'),
           choice('rd-leave', '못 들은 척 지나간다', mental=-1)],
          randomGroup='gnight', weight=3, top={'image': bg('hallway-night')}, bottom={'image': bg('classroom-night')},
          audio={'dialogue': lib_sound('creak', 50, kind='effect')},
          stage={'all': {'mood': 'memory', 'transition': 'dissolve'}}),
    scene('r-locked', '잠긴 음악실', 'encounter', '나',
          '열쇠 꾸러미 중 하나가 음악실 자물쇠에 딱 맞을 것 같다.',
          [choice('rl-open', '문을 연다', next='music'),
           choice('rl-skip', '나중에 오자')],
          randomGroup='gnight', weight=8, appear=[{'id': 'keys', 'count': 1}], mode='bottom', bottom={'image': bg('classroom-night')},
          stage={'all': {'camera': 'zoomIn', 'transition': 'iris'}}),
    scene('r-window', '창밖 반딧불', 'encounter', '나',
          '창밖으로 반딧불이 한 무리 날아간다. {#' + TRIO + '? 이 빛을 어디선가 본 것 같다.|드물게 보는 풍경이다.}',
          [choice('rw-look', '한참 바라본다', mental=2),
           choice('rw-more', '다시 걷는다 (🎲 다시)', next='random:gnight')],
          randomGroup='gnight', weight=1, mode='full', top={'image': bg('park-night'), 'y': 40},
          stage={'all': {'weather': 'fireflies', 'mood': 'dream', 'warp': 'dream', 'overlays': ['glow'], 'transition': 'whiteFade'}}),
    scene('r-mirror', '화장실 거울', 'encounter', '나',
          '긴장한 탓일까. 거울 속 내가 한 박자 늦게 움직인 것 같다.',
          [choice('rr-look', '거울을 똑바로 본다', mental=-1, lose='nervous'),
           choice('rr-run', '뛰쳐나간다', hp=-1)],
          randomGroup='gnight', weight=3, appear=[{'id': 'nervous', 'count': 1}], mode='top',
          top={'image': bg('hallway-night'), 'y': 30},
          stage={'all': {'mood': 'horror', 'overlays': ['scanlines'], 'transition': 'glitch', 'beats': [{'when': 'start', 'fx': 'glitch'}]}}),
    scene('music', '음악실', 'branch', '나',
          '피아노 위에 등 부품 상자가 있다. 누군가 미리 옮겨 둔 것 같다.',
          [choice('mu-take', '부품을 모두 챙긴다', items('gain', ('bulb', 2), ('tape', 1), ('bandage', 1))),
           choice('mu-fix', '그 자리에서 등을 고친다', aff(mj=1, sy=1), remember='fixed'),
           choice('mu-play', '서연의 노래를 쳐 본다', need(('song', 1)), aff(sy=2)),
           choice('mu-leave', '그냥 나온다')],
          mode='full', top={'image': bg('classroom-night'), 'y': 50},
          stage={'all': {'mood': 'memory', 'overlays': ['glow', 'vignette'], 'transition': 'fade'}}),

    # ── 5 · 옥상 계단 (⏱ 5초)
    scene('s5', '5 · 옥상 계단', 'story', '나',
          '옥상 문 위 선반에 등이 걸려 있다.{쪽지를 읽었다?  쪽지 말대로 "가장 높은 곳"이다.} 사다리가 흔들린다.',
          [choice('s5-friend', '{민준>=2? 민준이|서연이} 잡아 주는 사다리에 오른다', need(('mj', 2), ('sy', 2), any=True), aff(mj=1, sy=1)),
           choice('s5-solo', '혼자 올라간다', hp=-2, branch=when(('hand', 1), ('@hp', 3))),
           choice('s5-jump', '난간을 밟고 뛰어오른다', next='deathLadder'),
           choice('s5-wait', '머뭇거린다', next='ladderFall')],
          timer={'seconds': 5, 'choice': 's5-wait'},
          top={'image': bg('rooftop-night'), 'y': 70}, bottom={'image': bg('hallway-night')},
          audio={'dialogue': lib_sound('creak', 80, kind='effect')},
          stage={'all': {'transition': 'zoom', 'beats': [{'when': 'start', 'fx': 'shake'}, {'when': 'loss', 'fx': 'redFlash'}]},
                 'top': {'camera': 'tilt', 'weather': 'leaves'}}),
    scene('ladderFall', '기울어진 사다리', 'branch', '나',
          '사다리가 기울어 엉덩방아를 찧었다. 그래도 등은 손에 들어왔다.',
          [choice('lf-up', '툭툭 털고 옥상으로 간다', hp=-1, mental=-1)],
          mode='top', top={'image': bg('hallway-night'), 'y': 40},
          stage={'all': {'transition': 'cut', 'beats': [{'when': 'start', 'fx': 'bigShake'}]}}),

    # ── 6 · 옥상
    scene('s6', '6 · 자정 전 옥상', 'story', '민준',
          '"사실 등은 내가 숨겼어. 축제 전에 여기서 먼저 켜 보고 싶어서." 민준 옆에서 서연이 웃음을 참는다.',
          [choice('s6-light', '등에 불을 켠다', next='eAlone',
                  branch=when(('mj', 2), ('sy', 2), ('fixed', 1), next='eTrio')),
           choice('s6-mj', '민준 곁으로 간다', need(('mj', 2)), next='mjTalk'),
           choice('s6-sy', '서연 곁으로 간다', need(('sy', 2)), next='syTalk'),
           choice('s6-down', '운동장을 내려다본다', next='eAlone', branch=when(('doubt', 3), next='eCaught'))],
          top={'image': bg('rooftop-night'), 'y': 35}, bottom={'image': bg('street-night')},
          stage={'all': {'weather': 'stars', 'mood': 'night', 'moodStrength': 45, 'transition': 'blackFade'},
                 'layers': {'top': layer(BOY['smile'], x=50, enter='slideRight', motion='breathe'),
                            'bottom': layer(GIRL['smile'], x=50, scale=62, enter='slideLeft', motion='sway', flip=True)}}),
    scene('mjTalk', '민준의 속마음', 'branch', '민준',
          '"…너랑 같이 켜고 싶었어." 민준이 등을 내민다.',
          [choice('mt-yes', '{민준>=4? 웃으며 같이 불을 켠다|어색하게 등을 받는다}', aff(sy=-1), next='eMinjun'),
           choice('mt-call', '서연도 부르자고 한다', aff(sy=1), next='eAlone', branch=when(('sy', 2), ('fixed', 1), next='eTrio'))],
          mode='full', top={'image': bg('rooftop-night'), 'y': 40},
          stage={'all': {'mood': 'vivid', 'overlays': ['glow'], 'transition': 'fade'},
                 'layers': {'top': layer(BOY['smile'], scale=100, enter='rise', motion='breathe')}}),
    scene('syTalk', '서연의 부탁', 'branch', '서연',
          '"내일 무대에서 떨리면… 맨 앞에 서 있어 줄래?"',
          [choice('st-yes', '{서연의 노래를 들었다? "그 노래, 벌써 좋아."|고개를 끄덕인다}', aff(mj=-1), next='eSeoyeon'),
           choice('st-call', '민준도 같이 보자고 한다', aff(mj=1), next='eAlone', branch=when(('mj', 2), ('fixed', 1), next='eTrio'))],
          mode='full', top={'image': bg('rooftop-night'), 'y': 40},
          stage={'all': {'mood': 'dream', 'overlays': ['glow'], 'transition': 'fade'},
                 'layers': {'top': layer(GIRL['smile'], scale=100, enter='rise', motion='sway')}}),

    # ── 엔딩 · 사망 장면
    scene('eTrio', '엔딩 · 셋이 함께', 'branch', '서연',
          '셋이 함께 켠 등불이 밤하늘로 번진다.' + H + '"내일 무대, 이거면 충분해."',
          [choice('et-end', '처음부터', next='end')], ending='end', endLabel=TRIO,
          top={'image': bg('rooftop-night'), 'y': 30}, bottom={'image': bg('park-night'), 'y': 40},
          stage={'all': {'weather': 'fireflies', 'mood': 'vivid', 'overlays': ['glow'], 'transition': 'whiteFade',
                         'beats': [{'when': 'start', 'fx': 'whiteFlash'}]},
                 'layers': {'top': layer(GIRL['smile'], x=50, enter='drop', motion='float'),
                            'bottom': layer(BOY['smile'], x=50, scale=62, enter='rise', motion='float', flip=True)}}),
    scene('eMinjun', '엔딩 · 민준과', 'branch', '민준',
          '등불 아래서 민준이 처음으로 크게 웃었다.',
          [choice('em-end', '처음부터', next='end')], ending='end', endLabel='민준과 켠 등불', mode='full',
          top={'image': bg('rooftop-night'), 'y': 40},
          stage={'all': {'weather': 'stars', 'overlays': ['glow'], 'transition': 'whiteFade'},
                 'layers': {'top': layer(BOY_FULL, scale=100, enter='fade', motion='breathe')}}),
    scene('eSeoyeon', '엔딩 · 서연과', 'branch', '서연',
          '다음 날, 서연은 맨 앞줄의 나를 보며 노래를 시작했다.',
          [choice('es-end', '처음부터', next='end')], ending='end', endLabel='맨 앞줄의 노래', mode='full',
          top={'image': bg('school-gate-day'), 'y': 40},
          audio={'dialogue': lib_sound('applause', 60, kind='effect')},
          stage={'all': {'weather': 'petals', 'mood': 'vivid', 'transition': 'whiteFade'},
                 'layers': {'top': layer(GIRL_FULL, scale=100, enter='rise', motion='sway')}}),
    scene('eAlone', '엔딩 · 혼자 본 등불', 'branch', '나',
          '등은 켜졌지만, 어쩐지 마음 한쪽이 비어 있다. {&내일은 둘에게 먼저 말 걸어야지.|다음엔 더 솔직해져야지.}',
          [choice('ea-end', '처음부터', next='end')], ending='end', endLabel='혼자 본 등불', mode='full',
          top={'image': bg('rooftop-night'), 'y': 60},
          stage={'all': {'mood': 'mono', 'overlays': ['grain'], 'transition': 'fade'}}),
    scene('eHome', '엔딩 · 집에서', 'branch', '나',
          '창밖으로 학교 쪽 불빛이 보인다. 등은 끝내 찾지 못했다.',
          [choice('eh-end', '처음부터', next='end')], ending='end', endLabel='창밖의 축제', mode='full',
          top={'image': bg('boy-room-night'), 'y': 55},
          stage={'all': {'mood': 'memory', 'moodStrength': 60, 'transition': 'fade'}}),
    scene('eCaught', '엔딩 · 교무실', 'branch', '교감 선생님',
          '"이 시간에 옥상이라니." 축제 전날 밤은 교무실에서 반성문으로 끝났다.',
          [choice('ec-end', '처음부터', next='end')], ending='end', endLabel='교무실의 밤', mode='full',
          top={'image': bg('classroom-night'), 'y': 50},
          stage={'all': {'mood': 'cold', 'overlays': ['vignette'], 'transition': 'cut', 'beats': [{'when': 'start', 'fx': 'flash'}]}}),
    scene('deathLadder', '사망 · 난간', 'branch', '나',
          '발밑의 난간이 생각보다 미끄러웠다.' + H + '마지막으로 본 것은 흔들리는 등불이었다.',
          [choice('dl-end', '처음부터', next='end')], ending='death', endLabel='난간에서 미끄러짐', mode='full',
          top={'image': bg('rooftop-night'), 'y': 20}, audio={'dialogue': lib_sound('fall', 80, kind='effect')},
          stage={'all': {'mood': 'horror', 'transition': 'blackFade', 'beats': [{'when': 'start', 'fx': 'bigShake'}]}}),
]

project = {
    'format': 'event-vn', 'version': 1, 'title': '축제 전날 밤',
    'theme': 'romance', 'panelTransparency': 10, 'manualSaves': True,
    'hp': 4, 'maxHp': 5, 'mental': 3, 'money': 2, 'randomStart': 2,
    'randomGroups': [{'id': 'gprep', 'name': '축제 준비'}, {'id': 'gnight', 'name': '밤 순찰'}],
    'definitions': definitions, 'events': events,
    'defaultArt': {'top': {'image': bg('school-gate-evening'), 'text': '학교'}, 'bottom': {'text': ''}},
    'finish': {'deathText': '힘이 다해 주저앉았다… 축제는 내일 다른 사람들이 하게 되겠지.', 'death': {'image': bg('hallway-night')}},
    'audio': {'stageSound': True, 'stageVolume': 70,
              'effects': {'important': lib_sound('bell', 70), 'money': lib_sound('coins', 70)}},
    'landing': {'intro': '사라진 반딧불 등을 찾아, 축제 전날 밤 학교에 남았다. 민준과 서연, 누구와 등을 켤까?',
                'author': '사건 게임 에디터',
                'credits': '그림: 에디터 기본 그림 (그림 모음)\n소리: 에디터 기본 소리\n'
                           'v0.1.57~v0.1.63 새 기능 예제: 호감도 · 여러 조건 · 여러 개 얻기·잃기 · 랜덤 무게·등장 조건 · 시간 제한 · 엔딩 모음',
                'image': bg('school-gate-night')},
}

out = ROOT / 'assets' / 'festival-sample.js'
out.write_text("'use strict';\n// 축제 전날 밤 (generated by make-festival.py; edit that file, not this one).\n"
               "(function(root){root.FESTIVAL_SAMPLE=" + json.dumps(project, ensure_ascii=False, separators=(',', ':')) + ";})(globalThis);\n")
print(out, round(out.stat().st_size / 1048576, 2), 'MB', len(events), 'scenes')
