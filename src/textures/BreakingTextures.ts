import * as THREE from 'three';
import { TEXTURE_SIZE } from '../utils/constants';

/** Generate 10 stages of block breaking crack overlay textures (0 = barely cracked, 9 = shattered) */
export function generateBreakingTextures(): THREE.Texture[] {
  const size = TEXTURE_SIZE;
  const textures: THREE.Texture[] = [];

  for (let stage = 0; stage < 10; stage++) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    const intensity = (stage + 1) / 10;
    const alpha = 0.15 + intensity * 0.55;
    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.lineWidth = 1;

    // Seed-based pseudo-random for consistent cracks
    let seed = stage * 7919 + 42;
    const rand = (): number => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Number of crack lines increases with stage
    const numCracks = 2 + stage * 2;
    for (let c = 0; c < numCracks; c++) {
      ctx.beginPath();
      let cx = rand() * size;
      let cy = rand() * size;
      ctx.moveTo(cx, cy);

      const segments = 3 + Math.floor(rand() * 4);
      for (let s = 0; s < segments; s++) {
        cx += (rand() - 0.5) * size * 0.4;
        cy += (rand() - 0.5) * size * 0.4;
        cx = Math.max(0, Math.min(size, cx));
        cy = Math.max(0, Math.min(size, cy));
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Add dark patches at higher stages
    if (stage >= 4) {
      const patches = stage - 3;
      for (let p = 0; p < patches; p++) {
        const px = rand() * size;
        const py = rand() * size;
        const pSize = 1 + rand() * 2;
        ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + intensity * 0.2})`;
        ctx.fillRect(px, py, pSize, pSize);
      }
    }

    // At stage 8-9, add border darkening
    if (stage >= 8) {
      ctx.fillStyle = `rgba(0, 0, 0, ${(stage - 7) * 0.1})`;
      ctx.fillRect(0, 0, size, 1);
      ctx.fillRect(0, size - 1, size, 1);
      ctx.fillRect(0, 0, 1, size);
      ctx.fillRect(size - 1, 0, 1, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    textures.push(texture);
  }

  return textures;
}
