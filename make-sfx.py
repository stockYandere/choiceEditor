"""Original short UI sounds. No game recordings or third-party assets."""
from pathlib import Path
import wave,subprocess,re
import numpy as np
RATE=44100
rng=np.random.default_rng(2033)
def bell(track,start,freq,amp=.18,length=.45):
    n=min(int(length*RATE),len(track)-int(start*RATE));t=np.arange(n)/RATE
    env=(1-np.exp(-t*120))*np.exp(-t*8)
    tone=(np.sin(2*np.pi*freq*t)+.24*np.sin(2*np.pi*freq*2.005*t)+.10*np.sin(2*np.pi*freq*3.01*t))*env*amp
    i=int(start*RATE);track[i:i+n]+=tone
    for delay,gain in [(.047,.18),(.094,.08)]:
        j=i+int(delay*RATE);m=min(n,len(track)-j)
        if m>0:track[j:j+m]+=tone[:m]*gain
def thud(track,start=0,freq=160,amp=.21):
    n=min(int(.23*RATE),len(track)-int(start*RATE));t=np.arange(n)/RATE;i=int(start*RATE)
    track[i:i+n]+=amp*np.sin(2*np.pi*(freq*t-150*t*t))*(1-np.exp(-t*190))*np.exp(-t*18)
def cue(kind):
    length={'ability':.66,'item':.43,'state':.55,'money':.39,'important':.88,'recovery':.53,'loss':.32,'death':.64,'mixed':.81}[kind]
    a=np.zeros(int(RATE*length))
    if kind=='ability':
        for s,f,amp in [(0,523.25,.14),(.09,659.25,.14),(.18,783.99,.17)]:bell(a,s,f,amp,.46)
    elif kind=='item':
        bell(a,0,880,.17,.34);bell(a,.065,1320,.095,.33)
    elif kind=='state':
        bell(a,0,587.33,.14);bell(a,.09,698.46,.12)
    elif kind=='money':
        bell(a,0,1480,.13,.24);bell(a,.055,1975,.10,.29)
    elif kind=='important':
        for s,f in [(0,392),(.09,523.25),(.18,659.25),(.28,783.99)]:bell(a,s,f,.15,.55)
        bell(a,.28,1046.5,.055,.55)
    elif kind=='recovery':
        bell(a,0,440,.12);bell(a,.10,659.25,.14,.40)
    elif kind=='loss':thud(a)
    elif kind=='death':
        thud(a,freq=130);bell(a,.07,220,.14,.45);bell(a,.20,164.81,.12,.41)
    elif kind=='mixed':
        thud(a);bell(a,.24,880,.14,.39);bell(a,.31,1174.66,.11,.45)
    # Soft tactile attack under the chime; gentle fade eliminates clicks.
    n=min(int(.025*RATE),len(a));a[:n]+=rng.normal(0,.012,n)*np.exp(-np.arange(n)/RATE*150)
    edge=int(.012*RATE);a[:edge]*=np.linspace(0,1,edge);a[-edge:]*=np.linspace(1,0,edge)
    a*=1.8
    assert abs(a).max()<.8
    return a
def ffmpeg(a,filters):
    r=subprocess.run(['ffmpeg','-hide_banner','-nostats','-f','f32le','-ac','1','-ar',str(RATE),'-i','-','-af',filters,'-ar',str(RATE),'-f','f32le','-ac','1','-'],input=a.astype('<f4').tobytes(),capture_output=True,check=True)
    return r.stderr.decode(),np.frombuffer(r.stdout,dtype='<f4')
def loudest(a):
    log,_=ffmpeg(a,'apad=pad_dur=0.6,ebur128=metadata=1,ametadata=print:key=lavfi.r128.M:file=/dev/stderr')
    return max(float(x) for x in re.findall(r'lavfi\.r128\.M=(-?[\d.]+)',log))
def normalise(a,target=-14):
    # Same ear-weighted level as the built-in staging effects (loudest 400 ms at -14 LUFS), with a -1 dBFS limiter.
    for _ in range(4):
        level=loudest(a)
        if abs(target-level)<.5:break
        _,b=ffmpeg(a*10**((target-level)/20),'alimiter=limit=0.89:attack=2:release=80:level=disabled');a=np.concatenate([b[:len(a)],np.zeros(max(0,len(a)-len(b)),'f4')])
    return a
out=Path(__file__).parent/'assets/sfx';out.mkdir(exist_ok=True)
for kind in ['ability','item','state','money','important','recovery','loss','death','mixed']:
    a=normalise(cue(kind))
    with wave.open(str(out/(kind+'.wav')),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE);w.writeframes((a*32767).astype('<i2').tobytes())
    print(kind,round(len(a)/RATE,2),'s, peak',round(float(abs(a).max()),3))
