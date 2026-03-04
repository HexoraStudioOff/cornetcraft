/**
 * Minimap overlay using Canvas 2D.
 * Circular aerial view of terrain around player with mob indicators.
 * Uses math-based rotation to avoid black gaps from canvas rotation.
 */

import { BlockType } from '../blocks/BlockTypes';

const CANVAS_SIZE = 160;
const HALF_SIZE = CANVAS_SIZE / 2;
const ZOOM_LEVELS = [32, 64, 128] as const;
const DEFAULT_ZOOM_INDEX = 1;
const UPDATE_INTERVAL = 0.12;
const PIXEL_STEP = 3;

const BLOCK_COLORS: Record<number, [number, number, number]> = {
  [BlockType.GRASS]: [34, 139, 34],
  [BlockType.WATER]: [65, 105, 225],
  [BlockType.SAND]: [244, 208, 63],
  [BlockType.SNOW]: [245, 245, 255],
  [BlockType.STONE]: [128, 128, 128],
  [BlockType.WOOD]: [139, 69, 19],
  [BlockType.LAVA]: [255, 69, 0],
  [BlockType.DIRT]: [139, 115, 85],
  [BlockType.LEAVES]: [40, 150, 40],
  [BlockType.TALL_GRASS]: [50, 140, 50],
  [BlockType.PLANKS]: [160, 110, 50],
  [BlockType.COBBLESTONE]: [105, 105, 105],
  [BlockType.GRAVEL]: [169, 169, 169],
  [BlockType.BEDROCK]: [47, 47, 47],
  [BlockType.ICE]: [176, 224, 230],
};

const DEFAULT_COLOR: [number, number, number] = [60, 60, 60];

export interface MinimapMob {
  x: number;
  z: number;
  hostile: boolean;
}

export class Minimap {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly imageData: ImageData;
  private readonly pixels: Uint8ClampedArray;
  private visible: boolean = true;
  private zoomIndex: number = DEFAULT_ZOOM_INDEX;
  private keyHandler: (e: KeyboardEvent) => void;
  private timeSinceUpdate: number = 0;
  private needsRedraw: boolean = true;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;
    this.canvas.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      width: ${CANVAS_SIZE}px;
      height: ${CANVAS_SIZE}px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.6);
      border: 2px solid rgba(255, 255, 255, 0.35);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      pointer-events: none;
      display: none;
    `;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context for minimap canvas');
    }
    this.ctx = ctx;
    this.imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    this.pixels = this.imageData.data;

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        this.toggle();
      } else if (e.key === '+' || e.key === '=') {
        this.zoomIn();
      } else if (e.key === '-') {
        this.zoomOut();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
    document.body.appendChild(this.canvas);
  }

  update(
    playerX: number,
    playerZ: number,
    playerYaw: number,
    getBlock: (x: number, z: number) => number,
    mobs: MinimapMob[],
    dt: number = 0.016
  ): void {
    if (!this.visible) {
      this.canvas.style.display = 'none';
      return;
    }
    this.canvas.style.display = 'block';

    this.timeSinceUpdate += dt;
    if (this.timeSinceUpdate < UPDATE_INTERVAL && !this.needsRedraw) {
      return;
    }
    this.timeSinceUpdate = 0;
    this.needsRedraw = false;

    const radius = ZOOM_LEVELS[this.zoomIndex];
    const invScale = radius / HALF_SIZE;
    const scale = HALF_SIZE / radius;
    const step = PIXEL_STEP;
    const cosYaw = Math.cos(-playerYaw);
    const sinYaw = Math.sin(-playerYaw);
    const circleRadiusSq = HALF_SIZE * HALF_SIZE;

    const data = this.pixels;

    // Clear to transparent black
    data.fill(0);

    // Draw terrain using ImageData for performance (no fillRect overhead)
    for (let py = 0; py < CANVAS_SIZE; py += step) {
      for (let px = 0; px < CANVAS_SIZE; px += step) {
        const dx = px - HALF_SIZE + 0.5;
        const dy = py - HALF_SIZE + 0.5;

        // Skip pixels outside the circle
        if (dx * dx + dy * dy > circleRadiusSq) continue;

        // Rotate map coordinates by player yaw (math rotation, no canvas transform)
        const lx = dx * invScale;
        const lz = dy * invScale;
        const rx = lx * cosYaw - lz * sinYaw;
        const rz = lx * sinYaw + lz * cosYaw;

        const wx = Math.floor(playerX + rx);
        const wz = Math.floor(playerZ + rz);
        const blockId = getBlock(wx, wz);
        const rgb = BLOCK_COLORS[blockId] ?? DEFAULT_COLOR;

        // Fill the step×step block in the pixel buffer
        for (let sy = 0; sy < step && py + sy < CANVAS_SIZE; sy++) {
          for (let sx = 0; sx < step && px + sx < CANVAS_SIZE; sx++) {
            const idx = ((py + sy) * CANVAS_SIZE + (px + sx)) * 4;
            data[idx] = rgb[0];
            data[idx + 1] = rgb[1];
            data[idx + 2] = rgb[2];
            data[idx + 3] = 255;
          }
        }
      }
    }

    // Smooth edge anti-aliasing: fade alpha near circle border
    for (let py = 0; py < CANVAS_SIZE; py++) {
      for (let px = 0; px < CANVAS_SIZE; px++) {
        const dx = px - HALF_SIZE + 0.5;
        const dy = py - HALF_SIZE + 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > HALF_SIZE - 2) {
          const idx = (py * CANVAS_SIZE + px) * 4;
          const fade = Math.max(0, (HALF_SIZE - dist) / 2);
          data[idx + 3] = Math.min(data[idx + 3], Math.round(fade * 255));
        }
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);

    // Draw mobs as colored dots (using canvas API on top of pixel data)
    for (const mob of mobs) {
      const mdx = mob.x - playerX;
      const mdz = mob.z - playerZ;
      if (mdx * mdx + mdz * mdz > radius * radius) continue;

      const rmx = mdx * cosYaw - mdz * sinYaw;
      const rmz = mdx * sinYaw + mdz * cosYaw;
      const sx = rmx * scale + HALF_SIZE;
      const sz = rmz * scale + HALF_SIZE;
      const cdx = sx - HALF_SIZE;
      const cdz = sz - HALF_SIZE;
      if (cdx * cdx + cdz * cdz > circleRadiusSq) continue;

      this.ctx.fillStyle = mob.hostile ? '#FF3333' : '#33FF33';
      this.ctx.beginPath();
      this.ctx.arc(sx, sz, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Player direction indicator (triangle pointing up)
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.moveTo(HALF_SIZE, HALF_SIZE - 5);
    this.ctx.lineTo(HALF_SIZE - 4, HALF_SIZE + 3);
    this.ctx.lineTo(HALF_SIZE + 4, HALF_SIZE + 3);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  toggle(): void {
    this.visible = !this.visible;
  }

  zoomIn(): void {
    if (this.zoomIndex < ZOOM_LEVELS.length - 1) {
      this.zoomIndex++;
      this.needsRedraw = true;
    }
  }

  zoomOut(): void {
    if (this.zoomIndex > 0) {
      this.zoomIndex--;
      this.needsRedraw = true;
    }
  }

  isVisible(): boolean {
    return this.visible;
  }
}
