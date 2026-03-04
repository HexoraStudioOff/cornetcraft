/**
 * Procedural sound engine using Web Audio API.
 * All sounds generated procedurally — no external assets.
 */

export type SoundType =
  | "footstep_grass"
  | "footstep_stone"
  | "footstep_wood"
  | "footstep_sand"
  | "footstep_snow"
  | "block_break"
  | "block_place"
  | "hurt"
  | "death"
  | "eat"
  | "xp_pickup"
  | "achievement"
  | "explosion"
  | "splash"
  | "bow_shoot"
  | "lightning";

export class SoundEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private musicGain: GainNode;
  private sfxGain: GainNode;

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.masterGain.connect(this.ctx.destination);
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);

    this.masterGain.gain.value = 1;
    this.musicGain.gain.value = 0.5;
    this.sfxGain.gain.value = 1;
  }

  play(sound: string, volume: number = 1): void {
    const generator = this.getGenerator(sound as SoundType);
    if (generator) {
      generator(volume);
    }
  }

  setMasterVolume(v: number): void {
    this.masterGain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, v)),
      this.ctx.currentTime,
      0.01
    );
  }

  setMusicVolume(v: number): void {
    this.musicGain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, v)),
      this.ctx.currentTime,
      0.01
    );
  }

  setSfxVolume(v: number): void {
    this.sfxGain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, v)),
      this.ctx.currentTime,
      0.01
    );
  }

  private getGenerator(sound: SoundType): ((vol: number) => void) | null {
    const generators: Record<SoundType, (vol: number) => void> = {
      footstep_grass: (v) => this.footstepGrass(v),
      footstep_stone: (v) => this.footstepStone(v),
      footstep_wood: (v) => this.footstepWood(v),
      footstep_sand: (v) => this.footstepSand(v),
      footstep_snow: (v) => this.footstepSnow(v),
      block_break: (v) => this.blockBreak(v),
      block_place: (v) => this.blockPlace(v),
      hurt: (v) => this.hurt(v),
      death: (v) => this.death(v),
      eat: (v) => this.eat(v),
      xp_pickup: (v) => this.xpPickup(v),
      achievement: (v) => this.achievement(v),
      explosion: (v) => this.explosion(v),
      splash: (v) => this.splash(v),
      bow_shoot: (v) => this.bowShoot(v),
      lightning: (v) => this.lightning(v),
    };
    return generators[sound] ?? null;
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    return buffer;
  }

  private playOsc(
    freq: number,
    duration: number,
    type: OscillatorType,
    vol: number,
    attack = 0.01,
    decay = 0.1
  ): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  private footstepGrass(vol: number): void {
    const buf = this.createNoiseBuffer(0.08);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    src.buffer = buf;
    src.connect(filter);
    filter.type = "lowpass";
    filter.frequency.value = 800;
    filter.connect(gain);
    gain.connect(this.sfxGain);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol * 0.15, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    src.start(this.ctx.currentTime);
    src.stop(this.ctx.currentTime + 0.08);
  }

  private footstepStone(vol: number): void {
    this.playOsc(120, 0.06, "square", vol * 0.12, 0.005, 0.04);
    this.playOsc(180, 0.05, "square", vol * 0.08, 0.005, 0.03);
  }

  private footstepWood(vol: number): void {
    this.playOsc(80, 0.1, "triangle", vol * 0.1, 0.01, 0.06);
    this.playOsc(160, 0.07, "triangle", vol * 0.06, 0.01, 0.05);
  }

  private footstepSand(vol: number): void {
    const buf = this.createNoiseBuffer(0.12);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    src.buffer = buf;
    src.connect(filter);
    filter.type = "bandpass";
    filter.frequency.value = 600;
    filter.Q.value = 2;
    filter.connect(gain);
    gain.connect(this.sfxGain);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol * 0.12, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    src.start(this.ctx.currentTime);
    src.stop(this.ctx.currentTime + 0.12);
  }

  private footstepSnow(vol: number): void {
    const buf = this.createNoiseBuffer(0.1);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    src.buffer = buf;
    src.connect(filter);
    filter.type = "lowpass";
    filter.frequency.value = 400;
    filter.connect(gain);
    gain.connect(this.sfxGain);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol * 0.1, this.ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    src.start(this.ctx.currentTime);
    src.stop(this.ctx.currentTime + 0.1);
  }

  private blockBreak(vol: number): void {
    this.playOsc(200, 0.15, "square", vol * 0.2, 0.01, 0.1);
    this.playOsc(150, 0.2, "sawtooth", vol * 0.15, 0.01, 0.15);
    const buf = this.createNoiseBuffer(0.12);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    src.buffer = buf;
    src.connect(filter);
    filter.type = "lowpass";
    filter.frequency.value = 1200;
    filter.connect(gain);
    gain.connect(this.sfxGain);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol * 0.1, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    src.start(this.ctx.currentTime);
    src.stop(this.ctx.currentTime + 0.12);
  }

  private blockPlace(vol: number): void {
    this.playOsc(180, 0.08, "sine", vol * 0.25, 0.005, 0.05);
    this.playOsc(360, 0.06, "sine", vol * 0.15, 0.005, 0.04);
  }

  private hurt(vol: number): void {
    this.playOsc(150, 0.2, "sawtooth", vol * 0.3, 0.01, 0.15);
    this.playOsc(100, 0.25, "square", vol * 0.2, 0.01, 0.2);
  }

  private death(vol: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol * 0.25, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.5);
  }

  private eat(vol: number): void {
    this.playOsc(400, 0.1, "sine", vol * 0.2, 0.01, 0.06);
    this.playOsc(600, 0.08, "sine", vol * 0.1, 0.01, 0.05);
  }

  private xpPickup(vol: number): void {
    this.playOsc(880, 0.08, "sine", vol * 0.2, 0.005, 0.05);
    this.playOsc(1320, 0.06, "sine", vol * 0.15, 0.005, 0.04);
  }

  private achievement(vol: number): void {
    const freqs = [523, 659, 784, 1047];
    freqs.forEach((f, i) => {
      this.playOsc(
        f,
        0.15 - i * 0.02,
        "sine",
        vol * (0.3 - i * 0.05),
        0.01,
        0.1
      );
    });
  }

  private explosion(vol: number): void {
    const buf = this.createNoiseBuffer(0.4);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    src.buffer = buf;
    src.connect(filter);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.4);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol * 0.4, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    src.start(this.ctx.currentTime);
    src.stop(this.ctx.currentTime + 0.4);
  }

  private splash(vol: number): void {
    const buf = this.createNoiseBuffer(0.25);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    src.buffer = buf;
    src.connect(filter);
    filter.type = "bandpass";
    filter.frequency.value = 800;
    filter.Q.value = 1;
    filter.connect(gain);
    gain.connect(this.sfxGain);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol * 0.25, this.ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    src.start(this.ctx.currentTime);
    src.stop(this.ctx.currentTime + 0.25);
  }

  private bowShoot(vol: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol * 0.15, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.15);
  }

  private lightning(vol: number): void {
    const buf = this.createNoiseBuffer(0.3);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    src.buffer = buf;
    src.connect(filter);
    filter.type = "highpass";
    filter.frequency.value = 2000;
    filter.connect(gain);
    gain.connect(this.sfxGain);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol * 0.35, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    src.start(this.ctx.currentTime);
    src.stop(this.ctx.currentTime + 0.3);
  }
}
