"""Original offline music and scene sounds. No sampled commercial recordings."""
from pathlib import Path
import numpy as np
import subprocess
import wave

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'example-media'
OUT.mkdir(exist_ok=True)
RATE = 22050
rng = np.random.default_rng(2033)

def write(name, signal):
    signal = np.asarray(signal)
    signal = np.tanh(signal * 1.2) * .65
    wav = OUT / (name + '.wav')
    with wave.open(str(wav), 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(RATE)
        f.writeframes((signal * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav),
                    '-codec:a', 'libmp3lame', '-b:a', '64k', str(OUT / (name + '.mp3'))], check=True)
    wav.unlink()

def note(freq, duration, tone='bell'):
    t = np.arange(int(duration * RATE)) / RATE
    if tone == 'pad':
        return (np.sin(2*np.pi*freq*t)+.25*np.sin(2*np.pi*freq*2.003*t)) * np.minimum(t/.5,1) * np.minimum((duration-t)/.6,1)
    return (np.sin(2*np.pi*freq*t)+.25*np.sin(2*np.pi*freq*2*t)+.08*np.sin(2*np.pi*freq*3*t)) * (1-np.exp(-t*70)) * np.exp(-t*2.5)

def music(name, chords, melody, tempo, dark=False):
    beat = 60/tempo
    length = len(chords)*4*beat
    a = np.zeros(int(length*RATE))
    def add(start, sound, gain):
        i=int(start*RATE); n=min(len(sound),len(a)-i)
        if n>0: a[i:i+n] += sound[:n]*gain
    for bar, chord in enumerate(chords):
        for pitch in chord:
            add(bar*4*beat,note(440*2**((pitch-69)/12),4*beat,'pad'),.027 if dark else .022)
        add(bar*4*beat,note(440*2**((chord[0]-12-69)/12),3*beat,'pad'),.045)
        for k in range(8):
            pitch = melody[(bar*8+k)%len(melody)]
            if pitch:
                add((bar*4+k/2)*beat,note(440*2**((pitch-69)/12),2.2*beat),.075)
    # Smooth boundary; each composition deliberately resolves before looping.
    fade=int(.3*RATE);a[:fade]*=np.linspace(0,1,fade);a[-fade:]*=np.linspace(1,0,fade)
    write(name,a)

music('night',[(57,60,64),(53,57,60),(48,52,55),(55,59,62)]*2,
      [76,0,72,71,69,0,72,0,77,0,76,72,69,0,67,0],72)
music('tension',[(45,48,52),(41,45,48),(43,47,50),(40,44,47)]*2,
      [64,0,63,0,59,60,0,59,64,0,67,0,63,0,59,0],88,True)
music('dawn',[(60,64,67),(57,60,64),(53,57,60),(55,59,62)]*2,
      [79,76,72,0,74,76,79,0,81,79,76,72,74,0,72,0],76)

for name, pitches in [('voice-soft',[660,784]),('voice-worried',[440,392]),
                      ('voice-happy',[659,880,988]),('radio-found',[440,659,880,1318]),
                      ('key-found',[880,1175,1568]),('bond',[523,659,784]),
                      ('cat',[1046,880,1175]),('bandage',[659,784])]:
    a=np.zeros(int(1.4*RATE))
    for i,freq in enumerate(pitches):
        s=note(freq,.8);start=int(i*.14*RATE);n=min(len(s),len(a)-start)
        a[start:start+n]+=s[:n]*.17
    write(name,a)

t=np.arange(3*RATE)/RATE
noise=rng.normal(0,1,len(t))
smooth=np.convolve(noise,np.ones(35)/35,'same')
rain=(noise*.035+smooth*.28)*np.minimum(t/.2,1)*np.minimum((3-t)/.4,1)
write('rain',rain)
thunder=np.convolve(rng.normal(0,1,len(t)),np.ones(150)/150,'same')
write('thunder',thunder*1.9*(1-np.exp(-t*8))*np.exp(-t*.8))
write('door',np.sin(2*np.pi*(150-20*t)*t)*np.exp(-t*8)*.35 + rng.normal(0,1,len(t))*.07*np.exp(-t*10))
write('radio-static',rain*2 + np.sin(2*np.pi*1100*t)*.04*(np.sin(t*17)>0)*np.exp(-t))
print('Created',len(list(OUT.glob('*.mp3'))),'original MP3 assets')
