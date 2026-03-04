import { MobType } from '../entities/MobTypes';

type RGBA = [number, number, number, number];

class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

function colorVar(base: RGBA, variation: number, rng: SeededRandom): RGBA {
  return [
    Math.max(0, Math.min(255, base[0] + (rng.next() - 0.5) * variation)),
    Math.max(0, Math.min(255, base[1] + (rng.next() - 0.5) * variation)),
    Math.max(0, Math.min(255, base[2] + (rng.next() - 0.5) * variation)),
    base[3],
  ];
}

function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ];
}

function setPixel(data: Uint8ClampedArray, x: number, y: number, size: number, color: RGBA): void {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const i = (y * size + x) * 4;
  data[i] = color[0];
  data[i + 1] = color[1];
  data[i + 2] = color[2];
  data[i + 3] = color[3];
}

function fillRect(data: Uint8ClampedArray, x: number, y: number, w: number, h: number, size: number, color: RGBA): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(data, x + dx, y + dy, size, color);
    }
  }
}

interface PartTextureSet {
  [partName: string]: HTMLCanvasElement;
}

const TEX_SIZE = 32;

export class MobTextureGenerator {
  private readonly cache: Map<MobType, PartTextureSet> = new Map();

  getTextures(type: MobType): PartTextureSet {
    let cached = this.cache.get(type);
    if (cached) return cached;
    cached = this.generateForMob(type);
    this.cache.set(type, cached);
    return cached;
  }

  private generateForMob(type: MobType): PartTextureSet {
    switch (type) {
      case MobType.ZOMBIE: return this.generateZombie();
      case MobType.SKELETON: return this.generateSkeleton();
      case MobType.CREEPER: return this.generateCreeper();
      case MobType.SPIDER: return this.generateSpider();
      case MobType.PIG: return this.generatePig();
      case MobType.COW: return this.generateCow();
      case MobType.SHEEP: return this.generateSheep();
      case MobType.HORSE: return this.generateHorse();
      case MobType.SHARK: return this.generateShark();
      case MobType.FISH: return this.generateFish();
      case MobType.DOLPHIN: return this.generateDolphin();
      default: return this.generateZombie();
    }
  }

  private createCanvas(size: number = TEX_SIZE): { canvas: HTMLCanvasElement; data: ImageData } {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(size, size);
    return { canvas, data: imgData };
  }

  private finalize(canvas: HTMLCanvasElement, data: ImageData): HTMLCanvasElement {
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(data, 0, 0);
    return canvas;
  }

  private makeBaseTex(seed: number, baseColor: RGBA, variation: number = 12): HTMLCanvasElement {
    const s = TEX_SIZE;
    const t = this.createCanvas(s);
    const r = new SeededRandom(seed);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const c = colorVar(baseColor, variation, r);
        setPixel(t.data.data, x, y, s, c);
      }
    }
    return this.finalize(t.canvas, t.data);
  }

  private generateZombie(): PartTextureSet {
    const s = TEX_SIZE;
    const result: PartTextureSet = {};

    // Head
    const head = this.createCanvas(s);
    const headRng = new SeededRandom(50001);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c = colorVar([100, 140, 85, 255], 18, headRng);
        if (headRng.next() < 0.08) c = colorVar([75, 110, 65, 255], 12, headRng);
        const isEyeRow = y >= 10 && y <= 14;
        const isLeftEye = x >= 6 && x <= 10 && isEyeRow;
        const isRightEye = x >= 20 && x <= 24 && isEyeRow;
        if (isLeftEye || isRightEye) {
          c = [40, 10, 10, 255];
          if (y >= 11 && y <= 13 && ((isLeftEye && x >= 7 && x <= 9) || (isRightEye && x >= 21 && x <= 23))) {
            c = [180, 30, 20, 255];
          }
        }
        const isMouth = y >= 20 && y <= 23 && x >= 10 && x <= 22;
        if (isMouth) {
          c = mix(c, [50, 70, 40, 255] as RGBA, 0.6) as RGBA;
          if (y === 20 || y === 23) c = [40, 55, 30, 255];
        }
        setPixel(head.data.data, x, y, s, c);
      }
    }
    result['head'] = this.finalize(head.canvas, head.data);
    result['head_side'] = this.makeBaseTex(50050, [100, 140, 85, 255], 18);

    // Body
    const body = this.createCanvas(s);
    const bodyRng = new SeededRandom(50002);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c: RGBA;
        if (y < 6) {
          c = colorVar([60, 75, 120, 255], 15, bodyRng);
        } else {
          c = colorVar([50, 65, 105, 255], 12, bodyRng);
          if (bodyRng.next() < 0.1) c = mix(c, [80, 100, 70, 255] as RGBA, 0.3) as RGBA;
        }
        if (x < 3 || x >= s - 3) c = mix(c, [35, 45, 75, 255] as RGBA, 0.3) as RGBA;
        setPixel(body.data.data, x, y, s, c);
      }
    }
    result['body'] = this.finalize(body.canvas, body.data);

    // Arms (green skin)
    const arm = this.createCanvas(s);
    const armRng = new SeededRandom(50003);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c: RGBA;
        if (y < 8) {
          c = colorVar([55, 70, 110, 255], 12, armRng);
        } else {
          c = colorVar([95, 135, 80, 255], 15, armRng);
        }
        setPixel(arm.data.data, x, y, s, c);
      }
    }
    result['armLeft'] = this.finalize(arm.canvas, arm.data);
    const arm2 = this.createCanvas(s);
    const armRng2 = new SeededRandom(50004);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c: RGBA;
        if (y < 8) {
          c = colorVar([55, 70, 110, 255], 12, armRng2);
        } else {
          c = colorVar([95, 135, 80, 255], 15, armRng2);
        }
        setPixel(arm2.data.data, x, y, s, c);
      }
    }
    result['armRight'] = this.finalize(arm2.canvas, arm2.data);

    // Legs
    const leg = this.createCanvas(s);
    const legRng = new SeededRandom(50005);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c = colorVar([45, 55, 90, 255], 12, legRng);
        if (y > s - 4) c = mix(c, [35, 40, 65, 255] as RGBA, 0.4) as RGBA;
        setPixel(leg.data.data, x, y, s, c);
      }
    }
    result['legLeft'] = this.finalize(leg.canvas, leg.data);
    const leg2 = this.createCanvas(s);
    const legRng2 = new SeededRandom(50006);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c = colorVar([45, 55, 90, 255], 12, legRng2);
        if (y > s - 4) c = mix(c, [35, 40, 65, 255] as RGBA, 0.4) as RGBA;
        setPixel(leg2.data.data, x, y, s, c);
      }
    }
    result['legRight'] = this.finalize(leg2.canvas, leg2.data);

    return result;
  }

  private generateSkeleton(): PartTextureSet {
    const s = TEX_SIZE;
    const result: PartTextureSet = {};

    // Head (skull)
    const head = this.createCanvas(s);
    const rng = new SeededRandom(51001);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c = colorVar([220, 215, 200, 255], 10, rng);
        if (rng.next() < 0.05) c = mix(c, [185, 180, 170, 255] as RGBA, 0.4) as RGBA;
        const isEyeRow = y >= 10 && y <= 16;
        const isLeftEye = x >= 5 && x <= 11 && isEyeRow;
        const isRightEye = x >= 19 && x <= 25 && isEyeRow;
        if (isLeftEye || isRightEye) c = [15, 15, 15, 255];
        const isNose = y >= 17 && y <= 20 && x >= 13 && x <= 17;
        if (isNose) c = [30, 28, 25, 255];
        const isMouth = y >= 23 && y <= 26 && x >= 8 && x <= 23;
        if (isMouth && (x % 3 === 0)) c = [20, 18, 16, 255];
        setPixel(head.data.data, x, y, s, c);
      }
    }
    result['head'] = this.finalize(head.canvas, head.data);
    result['head_side'] = this.makeBaseTex(51050, [220, 215, 200, 255], 10);

    // Body (ribcage)
    const body = this.createCanvas(s);
    const bodyRng = new SeededRandom(51002);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c: RGBA = [30, 28, 26, 255];
        const isSpine = x >= 14 && x <= 17;
        const isRib = y % 5 >= 1 && y % 5 <= 2 && x >= 6 && x <= 25;
        if (isSpine || isRib) c = colorVar([210, 205, 190, 255], 10, bodyRng);
        setPixel(body.data.data, x, y, s, c);
      }
    }
    result['body'] = this.finalize(body.canvas, body.data);

    // Arms (bones)
    const armTex = (seed: number): HTMLCanvasElement => {
      const a = this.createCanvas(s);
      const r = new SeededRandom(seed);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          let c: RGBA = [25, 23, 22, 255];
          const isBone = x >= 10 && x <= 20;
          if (isBone) c = colorVar([215, 210, 195, 255], 8, r);
          setPixel(a.data.data, x, y, s, c);
        }
      }
      return this.finalize(a.canvas, a.data);
    };
    result['armLeft'] = armTex(51003);
    result['armRight'] = armTex(51004);

    // Legs (bones)
    const legTex = (seed: number): HTMLCanvasElement => {
      const l = this.createCanvas(s);
      const r = new SeededRandom(seed);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          let c: RGBA = [25, 23, 22, 255];
          const isBone = x >= 10 && x <= 20;
          if (isBone) c = colorVar([215, 210, 195, 255], 8, r);
          setPixel(l.data.data, x, y, s, c);
        }
      }
      return this.finalize(l.canvas, l.data);
    };
    result['legLeft'] = legTex(51005);
    result['legRight'] = legTex(51006);

    return result;
  }

  private generateCreeper(): PartTextureSet {
    const s = TEX_SIZE;
    const result: PartTextureSet = {};

    // Head (iconic creeper face)
    const head = this.createCanvas(s);
    const rng = new SeededRandom(52001);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const noise = (Math.sin(x * 1.3 + y * 0.7) + Math.sin(x * 0.5 + y * 1.8)) * 0.25;
        let c = colorVar([80 + noise * 30, 140 + noise * 20, 60 + noise * 25, 255], 15, rng);
        // Eyes
        const isLeftEye = x >= 5 && x <= 11 && y >= 8 && y <= 16;
        const isRightEye = x >= 19 && x <= 25 && y >= 8 && y <= 16;
        if (isLeftEye || isRightEye) c = [15, 15, 15, 255];
        // Mouth (2 pixels wide running down)
        const isMouthTop = y >= 16 && y <= 18 && x >= 11 && x <= 19;
        const isMouthBottom = y >= 18 && y <= 26 && x >= 13 && x <= 17;
        if (isMouthTop || isMouthBottom) c = [15, 15, 15, 255];
        setPixel(head.data.data, x, y, s, c);
      }
    }
    result['head'] = this.finalize(head.canvas, head.data);

    // Body (green camouflage)
    const bodyTex = (seed: number): HTMLCanvasElement => {
      const b = this.createCanvas(s);
      const r = new SeededRandom(seed);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const noise = (Math.sin(x * 0.9 + y * 1.2) + Math.sin(x * 1.5 + y * 0.4)) * 0.25;
          const c = colorVar([70 + noise * 30, 130 + noise * 20, 55 + noise * 25, 255], 18, r);
          setPixel(b.data.data, x, y, s, c);
        }
      }
      return this.finalize(b.canvas, b.data);
    };
    result['head_side'] = bodyTex(52050);
    result['body'] = bodyTex(52002);

    const legNames = ['legFrontLeft', 'legFrontRight', 'legBackLeft', 'legBackRight'];
    for (let i = 0; i < 4; i++) {
      result[legNames[i]] = bodyTex(52003 + i);
    }

    return result;
  }

  private generateSpider(): PartTextureSet {
    const s = TEX_SIZE;
    const result: PartTextureSet = {};

    // Head (multiple red eyes)
    const head = this.createCanvas(s);
    const rng = new SeededRandom(53001);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c = colorVar([35, 30, 28, 255], 10, rng);
        if (rng.next() < 0.06) c = mix(c, [55, 45, 40, 255] as RGBA, 0.4) as RGBA;
        // Eight eyes (2 rows of 4)
        const eyePositions = [
          [8, 10], [12, 9], [18, 9], [22, 10],
          [10, 14], [14, 13], [17, 13], [21, 14],
        ];
        for (const [ex, ey] of eyePositions) {
          if (Math.abs(x - ex) <= 1 && Math.abs(y - ey) <= 1) {
            c = [200, 20, 20, 255];
            if (x === ex && y === ey) c = [255, 40, 30, 255];
          }
        }
        setPixel(head.data.data, x, y, s, c);
      }
    }
    result['head'] = this.finalize(head.canvas, head.data);
    result['head_side'] = this.makeBaseTex(53050, [35, 30, 28, 255], 10);

    // Body
    const body = this.createCanvas(s);
    const bodyRng = new SeededRandom(53002);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c = colorVar([30, 26, 24, 255], 8, bodyRng);
        const cx = s / 2, cy = s / 2;
        const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (dist < 8) c = mix(c, [50, 35, 30, 255] as RGBA, 0.3) as RGBA;
        if (bodyRng.next() < 0.03) c = colorVar([60, 20, 15, 255], 10, bodyRng);
        setPixel(body.data.data, x, y, s, c);
      }
    }
    result['body'] = this.finalize(body.canvas, body.data);

    // Legs
    const legNames = ['legL1', 'legR1', 'legL2', 'legR2', 'legL3', 'legR3', 'legL4', 'legR4'];
    for (let i = 0; i < legNames.length; i++) {
      const leg = this.createCanvas(s);
      const r = new SeededRandom(53010 + i);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          let c = colorVar([40, 35, 32, 255], 10, r);
          if (y % 6 < 2) c = mix(c, [55, 40, 35, 255] as RGBA, 0.3) as RGBA;
          setPixel(leg.data.data, x, y, s, c);
        }
      }
      result[legNames[i]] = this.finalize(leg.canvas, leg.data);
    }

    return result;
  }

  private generatePig(): PartTextureSet {
    const s = TEX_SIZE;
    const result: PartTextureSet = {};

    // Head (pink with snout)
    const head = this.createCanvas(s);
    const rng = new SeededRandom(54001);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c = colorVar([230, 170, 155, 255], 12, rng);
        // Eyes
        if (((x >= 7 && x <= 10) || (x >= 20 && x <= 23)) && y >= 10 && y <= 13) {
          c = [25, 20, 18, 255];
          if (((x === 8 || x === 9) || (x === 21 || x === 22)) && (y === 11 || y === 12)) {
            c = [15, 10, 8, 255];
          }
        }
        // Snout
        if (x >= 10 && x <= 21 && y >= 17 && y <= 24) {
          c = colorVar([215, 145, 130, 255], 10, rng);
          if ((x === 13 || x === 14) && y >= 19 && y <= 22) c = [60, 40, 35, 255];
          if ((x === 17 || x === 18) && y >= 19 && y <= 22) c = [60, 40, 35, 255];
        }
        setPixel(head.data.data, x, y, s, c);
      }
    }
    result['head'] = this.finalize(head.canvas, head.data);
    result['head_side'] = this.makeBaseTex(54050, [230, 170, 155, 255], 12);

    // Body (pink)
    const bodyTex = (seed: number): HTMLCanvasElement => {
      const b = this.createCanvas(s);
      const r = new SeededRandom(seed);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const c = colorVar([225, 165, 150, 255], 15, r);
          setPixel(b.data.data, x, y, s, c);
        }
      }
      return this.finalize(b.canvas, b.data);
    };
    result['body'] = bodyTex(54002);
    result['legFrontLeft'] = bodyTex(54003);
    result['legFrontRight'] = bodyTex(54004);
    result['legBackLeft'] = bodyTex(54005);
    result['legBackRight'] = bodyTex(54006);

    return result;
  }

  private generateCow(): PartTextureSet {
    const s = TEX_SIZE;
    const result: PartTextureSet = {};

    // Head (brown/white with eyes)
    const head = this.createCanvas(s);
    const rng = new SeededRandom(55001);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c = colorVar([80, 55, 35, 255], 12, rng);
        if (y >= 12 && y < 24 && x >= 6 && x <= 25) {
          c = colorVar([220, 210, 195, 255], 10, rng);
        }
        // Eyes
        if (((x >= 7 && x <= 10) || (x >= 20 && x <= 23)) && y >= 8 && y <= 11) {
          c = [20, 15, 12, 255];
        }
        // Muzzle
        if (x >= 9 && x <= 22 && y >= 20 && y <= 27) {
          c = colorVar([180, 155, 130, 255], 10, rng);
          if ((x === 12 || x === 13) && y >= 22 && y <= 25) c = [40, 30, 25, 255];
          if ((x === 18 || x === 19) && y >= 22 && y <= 25) c = [40, 30, 25, 255];
        }
        setPixel(head.data.data, x, y, s, c);
      }
    }
    result['head'] = this.finalize(head.canvas, head.data);
    result['head_side'] = this.makeBaseTex(55050, [80, 55, 35, 255], 12);

    // Body (white with black patches)
    const cowBodyTex = (seed: number): HTMLCanvasElement => {
      const b = this.createCanvas(s);
      const r = new SeededRandom(seed);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          let c = colorVar([230, 225, 210, 255], 10, r);
          const noise = Math.sin(x * 0.7 + seed * 0.1) * Math.sin(y * 0.5 + seed * 0.2);
          if (noise > 0.2) {
            c = colorVar([55, 40, 28, 255], 12, r);
          }
          setPixel(b.data.data, x, y, s, c);
        }
      }
      return this.finalize(b.canvas, b.data);
    };
    result['body'] = cowBodyTex(55002);

    // Legs (brown-ish)
    const legTex = (seed: number): HTMLCanvasElement => {
      const l = this.createCanvas(s);
      const r = new SeededRandom(seed);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          let c = colorVar([225, 220, 205, 255], 10, r);
          if (y > s * 0.6) c = mix(c, [65, 45, 30, 255] as RGBA, 0.2) as RGBA;
          setPixel(l.data.data, x, y, s, c);
        }
      }
      return this.finalize(l.canvas, l.data);
    };
    result['legFrontLeft'] = legTex(55003);
    result['legFrontRight'] = legTex(55004);
    result['legBackLeft'] = legTex(55005);
    result['legBackRight'] = legTex(55006);

    return result;
  }

  private generateSheep(): PartTextureSet {
    const s = TEX_SIZE;
    const result: PartTextureSet = {};

    // Head (gray face)
    const head = this.createCanvas(s);
    const rng = new SeededRandom(56001);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c = colorVar([140, 135, 125, 255], 12, rng);
        // Eyes
        if (((x >= 7 && x <= 10) || (x >= 20 && x <= 23)) && y >= 10 && y <= 13) {
          c = [20, 15, 12, 255];
        }
        // Nose
        if (x >= 12 && x <= 18 && y >= 19 && y <= 24) {
          c = colorVar([110, 105, 95, 255], 8, rng);
          if (x >= 13 && x <= 14 && y >= 20 && y <= 22) c = [50, 45, 40, 255];
          if (x >= 16 && x <= 17 && y >= 20 && y <= 22) c = [50, 45, 40, 255];
        }
        setPixel(head.data.data, x, y, s, c);
      }
    }
    result['head'] = this.finalize(head.canvas, head.data);
    result['head_side'] = this.makeBaseTex(56050, [140, 135, 125, 255], 12);

    // Body (fluffy wool)
    const woolTex = (seed: number): HTMLCanvasElement => {
      const b = this.createCanvas(s);
      const r = new SeededRandom(seed);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          let c = colorVar([240, 238, 230, 255], 12, r);
          const fluff = Math.sin(x * 1.5) * Math.cos(y * 1.3) * 0.5 + 0.5;
          if (fluff > 0.6) c = mix(c, [250, 248, 242, 255] as RGBA, 0.3) as RGBA;
          if (fluff < 0.3) c = mix(c, [215, 212, 205, 255] as RGBA, 0.3) as RGBA;
          setPixel(b.data.data, x, y, s, c);
        }
      }
      return this.finalize(b.canvas, b.data);
    };
    result['body'] = woolTex(56002);

    // Legs (gray)
    const legTex = (seed: number): HTMLCanvasElement => {
      const l = this.createCanvas(s);
      const r = new SeededRandom(seed);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const c = colorVar([135, 130, 120, 255], 10, r);
          setPixel(l.data.data, x, y, s, c);
        }
      }
      return this.finalize(l.canvas, l.data);
    };
    result['legFrontLeft'] = legTex(56003);
    result['legFrontRight'] = legTex(56004);
    result['legBackLeft'] = legTex(56005);
    result['legBackRight'] = legTex(56006);

    return result;
  }

  private generateHorse(): PartTextureSet {
    const s = TEX_SIZE;
    const result: PartTextureSet = {};

    // Head (brown with white blaze)
    const head = this.createCanvas(s);
    const rng = new SeededRandom(57001);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c = colorVar([140, 85, 45, 255], 12, rng);
        // White blaze down face
        if (x >= 13 && x <= 18 && y >= 4 && y <= 20) {
          c = colorVar([235, 230, 220, 255], 8, rng);
        }
        // Eyes
        if (((x >= 6 && x <= 9) || (x >= 22 && x <= 25)) && y >= 8 && y <= 11) {
          c = [25, 18, 12, 255];
        }
        // Nostrils
        if (x >= 11 && x <= 13 && y >= 24 && y <= 27) c = [50, 30, 20, 255];
        if (x >= 18 && x <= 20 && y >= 24 && y <= 27) c = [50, 30, 20, 255];
        // Darker top (mane area)
        if (y < 4) c = colorVar([50, 35, 22, 255], 10, rng);
        setPixel(head.data.data, x, y, s, c);
      }
    }
    result['head'] = this.finalize(head.canvas, head.data);
    result['head_side'] = this.makeBaseTex(57050, [140, 85, 45, 255], 12);

    // Neck (brown with mane)
    const neck = this.createCanvas(s);
    const neckRng = new SeededRandom(57002);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c = colorVar([135, 80, 42, 255], 12, neckRng);
        if (x < 6) c = colorVar([45, 30, 18, 255], 10, neckRng);
        setPixel(neck.data.data, x, y, s, c);
      }
    }
    result['neck'] = this.finalize(neck.canvas, neck.data);

    // Body (brown)
    const body = this.createCanvas(s);
    const bodyRng = new SeededRandom(57003);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let c = colorVar([130, 78, 40, 255], 15, bodyRng);
        if (y > s * 0.7) c = mix(c, [110, 65, 32, 255] as RGBA, 0.2) as RGBA;
        setPixel(body.data.data, x, y, s, c);
      }
    }
    result['body'] = this.finalize(body.canvas, body.data);

    // Legs (darker brown, hooves)
    const legTex = (seed: number): HTMLCanvasElement => {
      const l = this.createCanvas(s);
      const r = new SeededRandom(seed);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          let c = colorVar([125, 75, 38, 255], 12, r);
          if (y > s * 0.75) c = colorVar([45, 35, 25, 255], 8, r);
          setPixel(l.data.data, x, y, s, c);
        }
      }
      return this.finalize(l.canvas, l.data);
    };
    result['legFrontLeft'] = legTex(57004);
    result['legFrontRight'] = legTex(57005);
    result['legBackLeft'] = legTex(57006);
    result['legBackRight'] = legTex(57007);

    // Tail (dark)
    const tail = this.createCanvas(s);
    const tailRng = new SeededRandom(57008);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const c = colorVar([45, 30, 18, 255], 10, tailRng);
        setPixel(tail.data.data, x, y, s, c);
      }
    }
    result['tail'] = this.finalize(tail.canvas, tail.data);

    return result;
  }

  private generateShark(): PartTextureSet {
    const s = TEX_SIZE;
    const result: PartTextureSet = {};

    const sharkTex = (seed: number, baseColor: RGBA, darkColor: RGBA): HTMLCanvasElement => {
      const t = this.createCanvas(s);
      const r = new SeededRandom(seed);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const grad = y / s;
          let c = mix(baseColor, darkColor, grad * 0.5) as RGBA;
          c = colorVar(c, 12, r);
          if (y > s * 0.7) c = mix(c, [220, 215, 205, 255] as RGBA, (y / s - 0.7) * 2) as RGBA;
          setPixel(t.data.data, x, y, s, c);
        }
      }
      return this.finalize(t.canvas, t.data);
    };

    result['body'] = sharkTex(58001, [85, 95, 110, 255], [55, 65, 80, 255]);

    // Head with eyes and mouth
    const head = this.createCanvas(s);
    const rng = new SeededRandom(58002);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const grad = y / s;
        let c = mix([90, 100, 115, 255] as RGBA, [60, 70, 85, 255] as RGBA, grad * 0.5) as RGBA;
        c = colorVar(c, 10, rng);
        if (y > s * 0.65) c = mix(c, [215, 210, 200, 255] as RGBA, (y / s - 0.65) * 2) as RGBA;
        // Eyes
        if (((x >= 4 && x <= 7) || (x >= 24 && x <= 27)) && y >= 8 && y <= 11) {
          c = [10, 10, 10, 255];
          if ((x === 5 || x === 6 || x === 25 || x === 26) && (y === 9 || y === 10)) c = [20, 20, 20, 255];
        }
        // Mouth
        if (y >= 22 && y <= 24 && x >= 6 && x <= 25) {
          c = [30, 25, 25, 255];
          if (y === 23 && x % 3 === 0) c = [220, 220, 215, 255];
        }
        setPixel(head.data.data, x, y, s, c);
      }
    }
    result['head'] = this.finalize(head.canvas, head.data);
    result['head_side'] = sharkTex(58050, [90, 100, 115, 255], [60, 70, 85, 255]);

    result['tail'] = sharkTex(58003, [75, 85, 100, 255], [50, 60, 75, 255]);
    result['finDorsal'] = sharkTex(58004, [70, 80, 95, 255], [45, 55, 70, 255]);
    result['finLeft'] = sharkTex(58005, [80, 90, 105, 255], [55, 65, 80, 255]);
    result['finRight'] = sharkTex(58006, [80, 90, 105, 255], [55, 65, 80, 255]);

    return result;
  }

  private generateFish(): PartTextureSet {
    const s = TEX_SIZE;
    const result: PartTextureSet = {};

    // Colorful tropical fish
    const body = this.createCanvas(s);
    const rng = new SeededRandom(59001);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const stripe = Math.sin(x * 0.8) > 0;
        let c: RGBA;
        if (stripe) {
          c = colorVar([255, 140, 30, 255], 15, rng);
        } else {
          c = colorVar([240, 240, 240, 255], 10, rng);
        }
        // Eye
        if (Math.abs(x - 6) <= 2 && Math.abs(y - s / 2) <= 2) {
          c = [15, 15, 15, 255];
          if (x === 6 && y === Math.floor(s / 2)) c = [5, 5, 5, 255];
        }
        setPixel(body.data.data, x, y, s, c);
      }
    }
    result['body'] = this.finalize(body.canvas, body.data);

    const finTex = (seed: number): HTMLCanvasElement => {
      const f = this.createCanvas(s);
      const r = new SeededRandom(seed);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const c = colorVar([255, 160, 50, 255], 20, r);
          setPixel(f.data.data, x, y, s, c);
        }
      }
      return this.finalize(f.canvas, f.data);
    };
    result['tail'] = finTex(59002);
    result['finDorsal'] = finTex(59003);

    return result;
  }

  private generateDolphin(): PartTextureSet {
    const s = TEX_SIZE;
    const result: PartTextureSet = {};

    const dolphinTex = (seed: number): HTMLCanvasElement => {
      const t = this.createCanvas(s);
      const r = new SeededRandom(seed);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const grad = y / s;
          let c: RGBA;
          if (grad < 0.55) {
            c = colorVar([110, 125, 145, 255], 10, r);
          } else {
            c = colorVar([195, 200, 210, 255], 8, r);
          }
          const blend = Math.abs(grad - 0.55) < 0.1 ? 0.5 : 0;
          if (blend > 0) c = mix([110, 125, 145, 255] as RGBA, [195, 200, 210, 255] as RGBA, 0.5) as RGBA;
          setPixel(t.data.data, x, y, s, c);
        }
      }
      return this.finalize(t.canvas, t.data);
    };

    result['body'] = dolphinTex(60001);

    // Head with eyes and smile
    const head = this.createCanvas(s);
    const rng = new SeededRandom(60002);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const grad = y / s;
        let c: RGBA;
        if (grad < 0.55) {
          c = colorVar([115, 130, 150, 255], 10, rng);
        } else {
          c = colorVar([200, 205, 215, 255], 8, rng);
        }
        // Eyes
        if (((x >= 5 && x <= 8) || (x >= 23 && x <= 26)) && y >= 10 && y <= 13) {
          c = [15, 12, 10, 255];
          if ((x === 6 || x === 7 || x === 24 || x === 25) && (y === 11 || y === 12)) c = [30, 25, 22, 255];
        }
        // Smile
        if (y >= 18 && y <= 19 && x >= 8 && x <= 23) {
          c = mix(c, [70, 80, 95, 255] as RGBA, 0.5) as RGBA;
        }
        setPixel(head.data.data, x, y, s, c);
      }
    }
    result['head'] = this.finalize(head.canvas, head.data);
    result['head_side'] = dolphinTex(60050);

    result['snout'] = dolphinTex(60003);
    result['tail'] = dolphinTex(60004);
    result['fluke'] = dolphinTex(60005);
    result['finLeft'] = dolphinTex(60006);
    result['finRight'] = dolphinTex(60007);
    result['finDorsal'] = dolphinTex(60008);

    return result;
  }
}
