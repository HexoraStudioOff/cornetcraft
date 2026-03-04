/**
 * Procedural ambient music generator using Web Audio API.
 * Soft piano-like notes with pentatonic scale, day/night moods.
 */

// Pentatonic scale: C, D, E, G, A (major) or C, Eb, F, G, Bb (minor)
const MAJOR_PENTATONIC = [0, 2, 4, 7, 9]; // semitones from root
const MINOR_PENTATONIC = [0, 3, 5, 7, 10];

// Base frequency for C4
const C4 = 261.63;

function noteToFreq(semitones: number, octave: number): number {
  return C4 * Math.pow(2, (semitones + octave * 12) / 12);
}

export class ProceduralMusic {
  private ctx: AudioContext;
  private gain: GainNode;
  private playing = false;
  private phraseTimer = 0;
  private nextPhraseIn = 0;

  constructor() {
    this.ctx = new AudioContext();
    this.gain = this.ctx.createGain();
    this.gain.connect(this.ctx.destination);
    this.gain.gain.value = 0.15;
    this.nextPhraseIn = 3 + Math.random() * 5;
  }

  start(): void {
    this.playing = true;
    this.phraseTimer = 0;
    this.nextPhraseIn = 3 + Math.random() * 5;
  }

  stop(): void {
    this.playing = false;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setVolume(v: number): void {
    this.gain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, v)),
      this.ctx.currentTime,
      0.1
    );
  }

  update(dt: number, timeOfDay: number): void {
    if (!this.playing) return;

    this.phraseTimer += dt;

    if (this.phraseTimer >= this.nextPhraseIn) {
      this.playPhrase(timeOfDay);
      this.phraseTimer = 0;
      this.nextPhraseIn = 3 + Math.random() * 5;
    }
  }

  private playPhrase(timeOfDay: number): void {
    const scale =
      timeOfDay > 0.2 && timeOfDay < 0.8 ? MAJOR_PENTATONIC : MINOR_PENTATONIC;
    const root = timeOfDay > 0.2 && timeOfDay < 0.8 ? 0 : 0;
    const numNotes = 4 + Math.floor(Math.random() * 5);
    let lastIdx = Math.floor(Math.random() * scale.length);
    let lastOctave = 0;

    for (let i = 0; i < numNotes; i++) {
      const delay = i * 0.35 + Math.random() * 0.2;
      const idx = Math.max(
        0,
        Math.min(
          scale.length - 1,
          lastIdx + Math.floor((Math.random() - 0.5) * 3)
        )
      );
      const octaveDelta = Math.random() < 0.3 ? (Math.random() < 0.5 ? 1 : -1) : 0;
      const octave = Math.max(-1, Math.min(1, lastOctave + octaveDelta));
      lastIdx = idx;
      lastOctave = octave;

      const semitones = root + scale[idx];
      const freq = noteToFreq(semitones, octave);
      this.scheduleNote(freq, delay, 0.4 + Math.random() * 0.3);
    }
  }

  private scheduleNote(freq: number, delay: number, duration: number): void {
    const startTime = this.ctx.currentTime + delay;

    // Piano-like: sine + slight overtones (2nd and 3rd harmonic)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const gain2 = this.ctx.createGain();
    const gain3 = this.ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.value = freq;
    osc2.type = "sine";
    osc2.frequency.value = freq * 2;
    osc3.type = "sine";
    osc3.frequency.value = freq * 2.5;

    gain2.gain.value = 0.15;
    gain3.gain.value = 0.08;

    osc1.connect(gain);
    osc2.connect(gain2);
    osc3.connect(gain3);
    gain2.connect(gain);
    gain3.connect(gain);
    gain.connect(this.gain);

    // ADSR envelope: attack, decay, sustain, release
    const attack = 0.02;
    const decay = 0.1;
    const sustainLevel = 0.4;
    const release = duration * 0.5;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.6, startTime + attack);
    gain.gain.linearRampToValueAtTime(sustainLevel, startTime + attack + decay);
    gain.gain.setValueAtTime(sustainLevel, startTime + duration - release);
    gain.gain.linearRampToValueAtTime(0.001, startTime + duration);

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    osc3.stop(startTime + duration);
  }
}
