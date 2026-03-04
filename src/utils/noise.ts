import { createNoise2D, createNoise3D, type NoiseFunction2D, type NoiseFunction3D } from 'simplex-noise';

/** Simple seeded PRNG (Mulberry32) */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Generate a stable seed from URL param, or create one and persist it */
function getWorldSeed(): number {
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get("seed");

  // 1) If seed is in URL, use it
  if (seedParam !== null) {
    const parsed = parseInt(seedParam, 10);
    if (!isNaN(parsed)) {
      // also store as fallback
      try { localStorage.setItem("cornetcraft_seed", String(parsed)); } catch {}
      return parsed;
    }
  }

  // 2) Fallback: try localStorage
  const saved = (() => {
    try { return localStorage.getItem("cornetcraft_seed"); } catch { return null; }
  })();

  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed)) {
      params.set("seed", String(parsed));
      const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash || ""}`;
      window.history.replaceState({}, "", newUrl);
      return parsed;
    }
  }

  // 3) Otherwise create a new seed and persist in URL + localStorage
  const newSeed = Math.floor(Math.random() * 2147483647);

  try { localStorage.setItem("cornetcraft_seed", String(newSeed)); } catch {}

  params.set("seed", String(newSeed));
  const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash || ""}`;
  window.history.replaceState({}, "", newUrl);

  return newSeed;
}

/** Current world seed — exported so UI can display it */
export const worldSeed: number = getWorldSeed();

const prng = mulberry32(worldSeed);
let noise2D: NoiseFunction2D = createNoise2D(prng);
let noise3D: NoiseFunction3D = createNoise3D(prng);

console.log(`%c🌍 World seed: ${worldSeed}`, 'color: #4CAF50; font-size: 14px; font-weight: bold;');

export function noise2d(x: number, y: number): number {
  return noise2D(x, y);
}

export function noise3d(x: number, y: number, z: number): number {
  return noise3D(x, y, z);
}

/** Multi-octave fractal noise 2D - returns value in [0, 1] */
export function fbm2d(x: number, y: number, octaves: number = 4, lacunarity: number = 2.0, gain: number = 0.5): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2D(x * freq, y * freq) * amp;
    maxAmp += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return (sum / maxAmp + 1) * 0.5;
}

/** Multi-octave fractal noise 3D - returns value in [0, 1] */
export function fbm3d(x: number, y: number, z: number, octaves: number = 3): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise3D(x * freq, y * freq, z * freq) * amp;
    maxAmp += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return (sum / maxAmp + 1) * 0.5;
}
