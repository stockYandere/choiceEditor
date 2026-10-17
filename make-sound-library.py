#!/usr/bin/env python3
"""Builds the editor's built-in sound library from free sources (CC0 / CC BY only, both allow redistribution).

  python3 make-sound-library.py [cache dir]      (--credits-only rewrites SOUND-CREDITS.md from the catalogue;
                                                  --site DIR writes DIR/sounds.json for the download site)

Writes
  assets/sounds/<id>.ogg      effects and ambience loops shipped inside the editor (also used by 연출 by default)
  sound-library/<id>.ogg      background music, downloaded by the editor on first pick (kept out of the APK)
  assets/sound-library.js     catalogue: names, groups, loop flags and the credit of every sound
Sources are downloaded once into the cache dir. Every sound is trimmed, loudness-normalised and encoded as Ogg Opus;
ambience is cut into a seamless loop by crossfading its tail into its head. Loudness is matched with EBU R128 measurements
(effects by their loudest moment, ambience and music by their average) and effects are kept to about 3 seconds.
"""
import json, os, re, subprocess, sys, urllib.parse
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else os.path.join(ROOT, '.sound-cache'))
RATE = 48000
FS = 'https://freesound.org/people/%s/sounds/%d/'
KENNEY = {'rpg': 'rpg-audio', 'impact': 'impact-sounds', 'interface': 'interface-sounds', 'scifi': 'sci-fi-sounds', 'digital': 'digital-audio'}
CC0 = 'CC0'
BY = 'CC BY 4.0'

# id, Korean name, group, source, options.  group: effect | ambient | bgm.
# source: ('fs', user, id) freesound · ('kenney', pack, file) · ('inc', title) incompetech (Kevin MacLeod).
# options: start/dur seconds, loop (ambient), xf crossfade, gain LUFS target, steps (repeat a short clip with spacing).
SOUNDS = [
 # ---- ambience loops (연출 날씨 소리 + 라이브러리)
 ('rain', '비', 'ambient', ('fs', 'unfa', 177479), dict(start=8, dur=30)),
 ('storm', '거센 비', 'ambient', ('fs', 'Q.K.', 56311), dict(start=20, dur=30)),
 ('rain-indoor', '창밖 빗소리', 'ambient', ('fs', 'samesamesame', 242889), dict(start=4, dur=30)),
 ('wind', '바람', 'ambient', ('fs', 'dhallcomposer', 697217), dict(start=2, dur=30)),
 ('wind-strong', '거센 바람', 'ambient', ('fs', 'florianreichelt', 459981), dict(start=6, dur=26)),
 ('wind-winter', '겨울바람', 'ambient', ('fs', 'Kinoton', 352436), dict(start=8, dur=30)),
 ('wind-eerie', '으스스한 바람', 'ambient', ('fs', 'janbezouska', 397091), dict(start=6, dur=30)),
 ('wind-dark', '쓸쓸한 바람', 'ambient', ('fs', 'janbezouska', 397092), dict(start=6, dur=30)),
 ('fire', '모닥불', 'ambient', ('fs', 'ahriik', 508110), dict(start=1, dur=24)),
 ('crickets', '풀벌레', 'ambient', ('fs', 'sengjinn', 175020), dict(start=6, dur=30)),
 ('night', '고요한 밤', 'ambient', ('fs', 'DidntGoToFilmSchool', 248103), dict(start=0, dur=17)),
 ('birds', '새소리', 'ambient', ('fs', 'petebuchwald', 288899), dict(start=10, dur=30)),
 ('leaves', '나뭇잎 바람', 'ambient', ('fs', 'lunchmoney', 378725), dict(start=2, dur=30)),
 ('underwater', '물속', 'ambient', ('fs', 'Fission9', 504641), dict(start=4, dur=30)),
 ('waves', '파도', 'ambient', ('fs', 'Noted451', 531015), dict(start=10, dur=30)),
 ('stream', '시냇물', 'ambient', ('fs', 'jackthemurray', 433589), dict(start=10, dur=30)),
 ('city', '도시 거리', 'ambient', ('fs', 'lupalenzuela', 512142), dict(start=5, dur=30)),
 ('cafe', '카페 웅성거림', 'ambient', ('fs', 'sonically_sound', 625112), dict(start=10, dur=30)),
 ('clock', '시계 째깍', 'ambient', ('fs', 'Mortifreshman', 237210), dict(start=2, dur=12, xf=.02)),
 ('heartbeat-loop', '두근거림 (반복)', 'ambient', ('fs', 'michorvath', 273150), dict(start=1, dur=7.2, xf=.05)),
 # ---- effects
 ('thunder', '천둥', 'effect', ('fs', 'bajko', 399656), dict(start=0, dur=8, max=4.5)),
 ('thunder-far', '먼 천둥', 'effect', ('fs', 'lennyboy', 244053), dict(start=0, dur=10, max=5)),
 ('flash', '번쩍 (플래시)', 'effect', ('fs', 'Werra', 232130), dict()),
 ('shutter', '카메라 셔터', 'effect', ('fs', 'roachpowder', 170229), dict()),
 ('shine', '빛남', 'effect', ('fs', 'RoccoGermani', 591131), dict(dur=4.5)),
 ('sparkle', '반짝', 'effect', ('fs', 'MLaudio', 511485), dict()),
 ('magic', '마법', 'effect', ('fs', 'renatalmar', 264981), dict()),
 ('freeze', '얼어붙음', 'effect', ('fs', 'antonsoederberg', 685253), dict()),
 ('hit', '충격', 'effect', ('fs', 'qubodup', 222517), dict(dur=4.5)),
 ('impact', '쾅', 'effect', ('fs', 'deleted_user_3277771', 177242), dict(dur=4.5)),
 ('boom', '굉음', 'effect', ('fs', 'Rizzard', 559529), dict(dur=5)),
 ('boom-low', '둔탁한 울림', 'effect', ('fs', 'AudioPapkin', 430978), dict(dur=4)),
 ('quake', '땅울림', 'effect', ('fs', 'uagadugu', 222521), dict(start=0, dur=6, max=3.5)),
 ('thud', '쿵', 'effect', ('fs', 'Breviceps', 447922), dict()),
 ('fall', '쓰러짐', 'effect', ('fs', 'leonelmail', 504626), dict()),
 ('heartbeat', '두근', 'effect', ('fs', 'michorvath', 273150), dict(start=1, dur=1.9)),
 ('glitch', '지직', 'effect', ('fs', 'AmicaSys', 332711), dict()),
 ('whoosh', '휙', 'effect', ('fs', 'qubodup', 60013), dict()),
 ('swoosh', '스윽', 'effect', ('fs', 'florianreichelt', 683101), dict()),
 ('punch', '주먹', 'effect', ('fs', 'Ekokubza123', 104183), dict()),
 ('sword', '칼 뽑기', 'effect', ('fs', 'deleted_user_2906614', 320521), dict()),
 ('glass', '유리 깨짐', 'effect', ('kenney', 'impact', 'impactGlass_heavy_000.ogg'), dict()),
 ('explosion', '폭발', 'effect', ('kenney', 'scifi', 'lowFrequency_explosion_000.ogg'), dict()),
 ('knock', '노크', 'effect', ('fs', 'Flem0527', 629987), dict()),
 ('creak', '삐걱', 'effect', ('fs', 'Mafon2', 377552), dict()),
 ('door-open', '문 열림', 'effect', ('kenney', 'rpg', 'doorOpen_1.ogg'), dict()),
 ('door-close', '문 닫힘', 'effect', ('kenney', 'rpg', 'doorClose_1.ogg'), dict()),
 ('footsteps', '걷는 발소리', 'effect', ('kenney', 'rpg', 'footstep0%d.ogg'), dict(steps=[0, 1, 2, 3, 4, 5], gap=.48)),
 ('run', '뛰는 발소리', 'effect', ('fs', 'florianreichelt', 459965), dict()),
 ('bell', '종소리', 'effect', ('fs', 'dsp9000', 76405), dict(max=3.5)),
 ('phone', '전화벨', 'effect', ('fs', 'jourblue', 344365), dict()),
 ('typewriter', '타자기', 'effect', ('fs', 'pakasit21', 138049), dict(dur=4)),
 ('page', '책장 넘김', 'effect', ('fs', 'davidbain', 136778), dict()),
 ('coins', '동전', 'effect', ('kenney', 'rpg', 'handleCoins.ogg'), dict()),
 ('cloth', '옷깃 스침', 'effect', ('kenney', 'rpg', 'cloth1.ogg'), dict()),
 ('pop', '톡', 'effect', ('kenney', 'interface', 'pluck_001.ogg'), dict()),
 ('ding', '띵', 'effect', ('kenney', 'interface', 'confirmation_001.ogg'), dict()),
 ('dog', '개 짖음', 'effect', ('fs', 'ken788', 386766), dict()),
 ('cat', '고양이', 'effect', ('fs', 'skymary', 412017), dict()),
 ('gasp', '헉 (놀람)', 'effect', ('fs', 'Dvideoguy', 207779), dict()),
 ('applause', '박수', 'effect', ('fs', 'Sandermotions', 277022), dict(max=3.5)),
 ('scratch', '레코드 긁힘', 'effect', ('fs', 'simkiott', 43404), dict()),
 # ---- background music (Kevin MacLeod, CC BY 4.0) — hosted, downloaded on pick
 ('bgm-easy-lemon', '밝은 일상 · Easy Lemon', 'bgm', ('inc', 'Easy Lemon'), dict()),
 ('bgm-morning', '평화로운 아침 · Morning', 'bgm', ('inc', 'Morning'), dict()),
 ('bgm-fluffing-a-duck', '코믹 · Fluffing a Duck', 'bgm', ('inc', 'Fluffing a Duck'), dict()),
 ('bgm-investigations', '수상한 기척 · Investigations', 'bgm', ('inc', 'Investigations'), dict()),
 ('bgm-dreamy-flashback', '회상·꿈 · Dreamy Flashback', 'bgm', ('inc', 'Dreamy Flashback'), dict()),
 ('bgm-heartbreaking', '슬픔 · Heartbreaking', 'bgm', ('inc', 'Heartbreaking'), dict()),
 ('bgm-peaceful-desolation', '잔잔한 여운 · Peaceful Desolation', 'bgm', ('inc', 'Peaceful Desolation'), dict()),
 ('bgm-comfortable-mystery', '미스터리 · Comfortable Mystery 4', 'bgm', ('inc', 'Comfortable Mystery 4'), dict()),
 ('bgm-crypto', '긴장 · Crypto', 'bgm', ('inc', 'Crypto'), dict()),
 ('bgm-darkest-child', '공포 · Darkest Child', 'bgm', ('inc', 'Darkest Child'), dict()),
 ('bgm-movement-proposition', '추격·액션 · Movement Proposition', 'bgm', ('inc', 'Movement Proposition'), dict()),
 ('bgm-floating-cities', '신비·판타지 · Floating Cities', 'bgm', ('inc', 'Floating Cities'), dict()),
 ('bgm-heroic-age', '결전·엔딩 · Heroic Age', 'bgm', ('inc', 'Heroic Age'), dict()),
]
# gain: target loudness in LUFS (effects: loudest moment; ambience and music: whole-sound average).
GROUP = {'ambient': dict(gain=-26, bitrate='40k', channels=1), 'effect': dict(gain=-14, bitrate='48k', channels=1), 'bgm': dict(gain=-19, bitrate='64k', channels=2)}

def run(cmd, data=None):
    r = subprocess.run(cmd, input=data, capture_output=True)
    if r.returncode: raise SystemExit(' '.join(cmd) + '\n' + r.stderr.decode()[-2000:])
    return r.stdout

def fetch(url, path):
    if not os.path.isfile(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        run(['curl', '-sSfL', '--retry', '3', '-o', path + '.part', url]); os.replace(path + '.part', path)
    return path

def freesound(user, sid):
    """CC0/CC BY only: the license is read from the sound's own page; the HQ preview is the downloadable rendition."""
    page = fetch(FS % (user, sid), os.path.join(CACHE, 'fs', '%d.html' % sid))
    html = open(page, encoding='utf-8', errors='replace').read()
    if 'creativecommons.org/publicdomain/zero/1.0' in html: lic = CC0
    elif re.search(r'creativecommons.org/licenses/by/(3|4)\.0', html): lic = BY if 'by/4.0' in html else 'CC BY 3.0'
    else: raise SystemExit('freesound %d: not CC0/CC BY' % sid)
    title = re.search(r'<meta property="og:title" content="([^"]*)"', html)
    ogg = re.search(r'https://cdn\.freesound\.org/previews/\d+/%d_\d+-hq\.ogg' % sid, html) or re.search(r'https://cdn\.freesound\.org/previews/\d+/%d_\d+-lq\.ogg' % sid, html)
    url = ogg.group(0).replace('-lq.ogg', '-hq.ogg')
    return fetch(url, os.path.join(CACHE, 'fs', '%d.ogg' % sid)), dict(title=title.group(1) if title else str(sid), author=user, license=lic, url=FS % (user, sid))

def kenney(pack, name):
    folder = os.path.join(CACHE, 'kenney', KENNEY[pack])
    if not os.path.isdir(folder):
        page = run(['curl', '-sSfL', 'https://kenney.nl/assets/' + KENNEY[pack]]).decode()
        if 'CC0' not in page: raise SystemExit('kenney %s: license not CC0' % pack)
        z = fetch(re.search(r'https://kenney\.nl/media/pages/assets/[^"\']+\.zip', page).group(0), folder + '.zip')
        os.makedirs(folder); run(['unzip', '-qo', z, '-d', folder])
    for base, _, files in os.walk(folder):
        if name in files: return os.path.join(base, name), dict(title=name, author='Kenney', license=CC0, url='https://kenney.nl/assets/' + KENNEY[pack])
    raise SystemExit('kenney %s/%s missing' % (pack, name))

def incompetech(title):
    url = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/' + urllib.parse.quote(title + '.mp3')
    return fetch(url, os.path.join(CACHE, 'inc', title + '.mp3')), dict(title=title, author='Kevin MacLeod (incompetech.com)', license=BY, url='https://incompetech.com/music/royalty-free/music.html')

def decode(path, channels):
    raw = run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', str(channels), '-ar', str(RATE), '-'])
    return np.frombuffer(raw, dtype='<f4').reshape(-1, channels).copy()

def trim_silence(a, floor=0.003):
    loud = np.where(np.abs(a).max(axis=1) > floor)[0]
    return a[max(0, loud[0] - int(.01 * RATE)):loud[-1] + int(.05 * RATE)] if len(loud) else a

def fade(a, inn=0.0, out=0.0):
    n = len(a)
    if inn: k = min(n, int(inn * RATE)); a[:k] *= np.linspace(0, 1, k)[:, None]
    if out: k = min(n, int(out * RATE)); a[n - k:] *= np.linspace(1, 0, k)[:, None]
    return a

def loop(a, start, dur, xf):
    """Seamless loop: take dur+xf seconds; the extra tail fades out over the head while the head fades in."""
    s, n, x = int(start * RATE), int(dur * RATE), int(xf * RATE)
    if s + n + x > len(a): s = max(0, len(a) - n - x)
    seg = a[s:s + n + x].copy()
    if len(seg) < n + x: raise SystemExit('loop source too short')
    body, tail = seg[:n].copy(), seg[n:n + x]
    t = np.linspace(0, 1, x)[:, None]
    body[:x] = body[:x] * np.sqrt(t) + tail * np.sqrt(1 - t)
    return body

def ffmpeg_pcm(a, channels, filters):
    """Runs raw float audio through ffmpeg filters and returns ffmpeg's log (stderr) and the filtered audio."""
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ac', str(channels), '-ar', str(RATE), '-i', '-', '-af', filters,
                        '-ar', str(RATE), '-f', 'f32le', '-ac', str(channels), '-'], input=a.astype('<f4').tobytes(), capture_output=True)
    if r.returncode: raise SystemExit(r.stderr.decode()[-2000:])
    return r.stderr.decode(), np.frombuffer(r.stdout, dtype='<f4').reshape(-1, channels)

def loudness(a, channels):
    """EBU R128 (ear-weighted) loudness: the loudest 400 ms moment and the whole-sound average, in LUFS."""
    log, _ = ffmpeg_pcm(a, channels, 'apad=pad_dur=0.6,ebur128=metadata=1,ametadata=print:key=lavfi.r128.M:file=/dev/stderr')
    moments = [float(x) for x in re.findall(r'lavfi\.r128\.M=(-?[\d.]+)', log)]
    whole = re.findall(r'I:\s+(-?[\d.]+) LUFS', log)
    return (max(moments) if moments else -70.0), (float(whole[-1]) if whole else -70.0)

def normalise(a, group, target, channels):
    """Gain, then a peak limiter (-1 dBFS) so loud transients cannot clip; repeated (up to 6 passes) because the limiter
    holds sharp clicks and knocks below the target on the first pass. When the limiter alone stalls (jingling coins,
    footsteps: all peaks, little body) a gentle compressor joins it to bring the body up. Effects are set by their
    loudest moment, so a short knock and a long rumble sound equally loud when they hit; ambience and music by their
    whole-sound average."""
    out, last, squeezed, best = a, None, False, None
    limiter = 'alimiter=limit=0.89:attack=2:release=80:level=disabled'
    fit = lambda b: b[:len(a)].copy() if len(b) >= len(a) else np.vstack([b, np.zeros((len(a) - len(b), channels), dtype='f4')])
    for _ in range(8):
        moment, whole = loudness(out, channels)
        level = moment if group == 'effect' else whole
        if best is None or abs(target - level) < best[0]: best = (abs(target - level), out)
        if level <= -90 or abs(target - level) < 0.5: break
        if last is not None and level - last < 0.3:
            if squeezed or group != 'effect' or target - level < 1.5: break
            out, last, squeezed = fit(ffmpeg_pcm(out, channels, 'acompressor=threshold=0.1:ratio=4:attack=0.5:release=40:knee=4')[1]), None, True
            continue
        last = level
        out = fit(ffmpeg_pcm(out, channels, 'volume=%.2fdB,%s' % (target - level, limiter))[1])
    return best[1]

def encode(a, path, bitrate, channels):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', str(channels), '-ar', str(RATE), '-i', '-', '-c:a', 'libopus', '-b:a', bitrate, '-vbr', 'on', '-application', 'audio', '-map_metadata', '-1', path], a.astype('<f4').tobytes())

def build():
    catalogue = []
    for sid, name, group, src, opt in SOUNDS:
        g = dict(GROUP[group]); ch = g['channels']
        if src[0] == 'fs': path, credit = freesound(src[1], src[2])
        elif src[0] == 'kenney' and 'steps' in opt:
            parts = [kenney(src[1], src[2] % i) for i in opt['steps']]; credit = dict(parts[0][1], title='footsteps')
            gap = int(opt['gap'] * RATE); clips = [trim_silence(decode(p, ch)) for p, _ in parts]
            a = np.zeros((gap * len(clips) + max(len(c) for c in clips), ch), dtype='f4')
            for i, c in enumerate(clips): a[i * gap:i * gap + len(c)] += c
            path = None
        elif src[0] == 'kenney': path, credit = kenney(src[1], src[2])
        else: path, credit = incompetech(src[1])
        if path: a = decode(path, ch)
        if group == 'ambient':
            a = loop(a, opt.get('start', 0), opt['dur'], opt.get('xf', 1.5))
        elif group == 'effect':
            if 'start' in opt or 'dur' in opt:
                s = int(opt.get('start', 0) * RATE); a = a[s:s + int(opt.get('dur', 60) * RATE)].copy()
                a = fade(trim_silence(a), out=min(.6, len(a) / RATE / 4))
            else: a = trim_silence(a)
            # Effects stay short: anything past its cap (3 s unless set) fades out over the last 0.7 s.
            cap = int(opt.get('max', 3.0) * RATE)
            if len(a) > cap: a = fade(a[:cap].copy(), out=.7)
            a = fade(a, inn=.003, out=.02)
        a = normalise(a, group, opt.get('gain', g['gain']), ch)
        out = os.path.join(ROOT, 'sound-library' if group == 'bgm' else 'assets/sounds', sid + '.ogg')
        encode(a, out, g['bitrate'], ch)
        size = os.path.getsize(out)
        catalogue.append(dict(id=sid, name=name, group=group, loop=group != 'effect', duration=round(len(a) / RATE, 1), size=size, credit=credit))
        print('%-26s %-7s %5.1fs %6.1f KB  %s · %s' % (sid, group, len(a) / RATE, size / 1024, credit['license'], credit['author']))
    js = ("'use strict';\n// Built-in sounds (generated by make-sound-library.py; do not edit by hand). effect/ambient files ship in assets/sounds/,\n"
          "// bgm files are downloaded from the repository's sound-library/ on first pick. credit.license CC0 needs no credit; CC BY must be credited.\n"
          "(function(root){const SOUNDS=" + json.dumps(catalogue, ensure_ascii=False, separators=(',', ':')) + ";\nroot.SoundLibrary={SOUNDS};})(globalThis);\n")
    open(os.path.join(ROOT, 'assets/sound-library.js'), 'w', encoding='utf-8').write(js)
    for group in GROUP:
        items = [c for c in catalogue if c['group'] == group]
        print('%-8s %3d sounds %7.1f KB' % (group, len(items), sum(c['size'] for c in items) / 1024))
    write_credits(catalogue)

def write_credits(catalogue):
    """SOUND-CREDITS.md: where every built-in sound comes from and under which license."""
    names = {'effect': '효과음 (에디터에 포함)', 'ambient': '환경음 · 반복 (에디터에 포함)', 'bgm': '배경음악 (고를 때 내려받음)'}
    out = ['# 기본 소리 출처', '', '모든 소리는 재배포가 허용된 라이선스(CC0 또는 CC BY)만 사용했습니다. CC0는 크레딧이 필요 없고,',
           'CC BY 음악은 게임에서 고르면 크레딧 화면에 자동으로 표시됩니다. 생성: `python3 make-sound-library.py`.', '']
    for group, title in names.items():
        out += ['## ' + title, '', '| 이름 | 파일 | 원본 | 작성자 | 라이선스 |', '|---|---|---|---|---|']
        for c in catalogue:
            if c['group'] == group:
                cr = c['credit']; out.append('| %s | `%s.ogg` | [%s](%s) | %s | %s |' % (c['name'], c['id'], cr['title'].replace('|', '/'), cr['url'], cr['author'], cr['license']))
        out.append('')
    open(os.path.join(ROOT, 'SOUND-CREDITS.md'), 'w', encoding='utf-8').write('\n'.join(out))

def write_site(catalogue, folder):
    """sounds.json for the download site's sound list: every built-in sound, linked from this repository."""
    raw = 'https://raw.githubusercontent.com/stockYandere/choiceEditor/HEAD/'
    groups = [('effect', '효과음'), ('ambient', '환경음'), ('bgm', '배경음악')]
    out = [dict(id=g, title=t, items=[dict(name=c['name'], duration=c['duration'], loop=c['loop'], src=raw + ('sound-library/' if g == 'bgm' else 'assets/sounds/') + c['id'] + '.ogg',
                                           credit='' if c['credit']['license'] == 'CC0' else '%s · %s · %s' % (c['credit']['title'], c['credit']['author'], c['credit']['license']))
                                      for c in catalogue if c['group'] == g]) for g, t in groups]
    os.makedirs(folder, exist_ok=True)
    open(os.path.join(folder, 'sounds.json'), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1) + '\n')

def read_catalogue():
    js = open(os.path.join(ROOT, 'assets/sound-library.js'), encoding='utf-8').read()
    return json.loads(re.search(r'const SOUNDS=(\[.*?\]);\n', js, re.S).group(1))

if __name__ == '__main__':
    if '--site' in sys.argv:
        write_site(read_catalogue(), sys.argv[sys.argv.index('--site') + 1])
    elif '--credits-only' in sys.argv:
        write_credits(read_catalogue())
    else:
        build()
