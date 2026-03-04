import { TEXTURE_SIZE } from '../utils/constants';

type RGBA = [number, number, number, number];

class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

function colorVariation(base: RGBA, variation: number, rng: SeededRandom): RGBA {
  return [
    Math.max(0, Math.min(255, base[0] + (rng.next() - 0.5) * variation)),
    Math.max(0, Math.min(255, base[1] + (rng.next() - 0.5) * variation)),
    Math.max(0, Math.min(255, base[2] + (rng.next() - 0.5) * variation)),
    base[3],
  ];
}

function setPixel(data: Uint8ClampedArray, x: number, y: number, size: number, color: RGBA): void {
  const i = (y * size + x) * 4;
  data[i] = color[0];
  data[i + 1] = color[1];
  data[i + 2] = color[2];
  data[i + 3] = color[3];
}

function mixColors(a: RGBA, b: RGBA, t: number): RGBA {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ];
}

export class TextureGenerator {
  private readonly size: number;
  constructor(size: number = TEXTURE_SIZE) { this.size = size; }

  generateAll(): ImageData[] {
    return [
      this.generateGrassTop(),          // 0
      this.generateGrassSide(),         // 1
      this.generateDirt(),              // 2
      this.generateStone(),             // 3
      this.generateWoodSide(),          // 4
      this.generateWoodTop(),           // 5
      this.generateLeaves(),            // 6
      this.generateSand(),              // 7
      this.generateWater(),             // 8
      this.generateSnow(),              // 9
      this.generateBedrock(),           // 10
      this.generateTallGrass(),         // 11
      this.generateFlowerRed(),         // 12
      this.generateFlowerYellow(),      // 13
      this.generatePlanks(),            // 14
      this.generateCobblestone(),       // 15
      this.generateCraftingTableTop(),  // 16
      this.generateCraftingTableSide(), // 17
      this.generateTorch(),             // 18
      this.generateTorchSide(),         // 19
      this.generateTorchTop(),          // 20
      this.generateStoneBricks(),       // 21
      this.generateMossyCobblestone(),  // 22
      this.generateGlass(),             // 23
      this.generateBookshelf(),         // 24
      this.generateWoolRed(),           // 25
      this.generateIronBlock(),         // 26
      this.generateDarkPlanks(),        // 27
      this.generateChiseledStone(),     // 28
      this.generateChestSide(),         // 29
      this.generateChestTop(),          // 30
      this.generateTNTSide(),           // 31
      this.generateTNTTop(),            // 32
      this.generateTNTBottom(),         // 33
      this.generateLava(),              // 34
      this.generateIce(),               // 35
      this.generateGlowstone(),         // 36
      this.generateMushroomRed(),       // 37
      this.generateMushroomBrown(),     // 38
      this.generateCactusSide(),        // 39
      this.generateCactusTop(),         // 40
      this.generatePumpkinSide(),       // 41
      this.generatePumpkinTop(),        // 42
      this.generateObsidian(),          // 43
      this.generateGoldBlock(),         // 44
      this.generateDiamondBlock(),      // 45
      this.generateBrick(),             // 46
      this.generateHayBaleSide(),       // 47
      this.generateHayBaleTop(),        // 48
      this.generateSlimeBlock(),        // 49
      this.generateGravel(),            // 50
      this.generateLadder(),            // 51
      this.generateCoalOre(),           // 52
      this.generateIronOre(),           // 53
      this.generateGoldOre(),           // 54
      this.generateDiamondOre(),        // 55
      this.generateEmeraldOre(),        // 56
      this.generateFurnaceSide(),       // 57
      this.generateFurnaceFront(),      // 58
      this.generateFurnaceTop(),        // 59
      this.generateDoorBottom(),        // 60
      this.generateDoorTop(),           // 61
      this.generateBedTop(),            // 62
      this.generateBedSide(),           // 63
      this.generateEnchantingTableTop(), // 64
      this.generateEnchantingTableSide(), // 65
      this.generateSign(),              // 66
      this.generateJukeboxSide(),       // 67
      this.generateJukeboxTop(),        // 68
      // Biome block textures
      this.generateBirchWoodSide(),     // 69
      this.generateBirchWoodTop(),      // 70
      this.generateBirchLeaves(),       // 71
      this.generateSpruceWoodSide(),    // 72
      this.generateSpruceWoodTop(),     // 73
      this.generateSpruceLeaves(),      // 74
      this.generateJungleWoodSide(),    // 75
      this.generateJungleWoodTop(),     // 76
      this.generateJungleLeaves(),      // 77
      this.generateAcaciaWoodSide(),    // 78
      this.generateAcaciaWoodTop(),     // 79
      this.generateAcaciaLeaves(),      // 80
      this.generateSandstoneSide(),     // 81
      this.generateSandstoneTop(),      // 82
      this.generateSandstoneBottom(),   // 83
      this.generateRedSand(),           // 84
      this.generateTerracotta(),        // 85
      this.generateClay(),              // 86
      this.generateFern(),              // 87
      this.generateDeadBush(),          // 88
      this.generateLilyPad(),           // 89
    ];
  }

  private createImageData(): ImageData {
    return new ImageData(this.size, this.size);
  }

  generateGrassTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(1001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const base: RGBA = [72, 118, 30, 255];
        const dark: RGBA = [52, 90, 22, 255];
        const bright: RGBA = [88, 132, 38, 255];
        const r = rng.next();
        let color: RGBA;
        if (r < 0.15) color = colorVariation(dark, 20, rng);
        else if (r < 0.3) color = colorVariation(bright, 15, rng);
        else color = colorVariation(base, 25, rng);
        if ((x + y) % 4 === 0 && rng.next() > 0.5) color = mixColors(color, dark, 0.3) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateGrassSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(1002);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const grassHeight = 3 + Math.floor(rng.next() * 2);
        if (y < grassHeight) {
          setPixel(img.data, x, y, s, colorVariation([72, 118, 30, 255], 25, rng));
        } else {
          setPixel(img.data, x, y, s, colorVariation([134, 96, 67, 255], 20, rng));
        }
      }
    }
    return img;
  }

  generateDirt(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(2001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([134, 96, 67, 255], 20, rng);
        if (rng.next() < 0.08) color = colorVariation([100, 80, 60, 255], 15, rng);
        if ((x * 3 + y * 7) % 11 < 2) color = mixColors(color, [110, 78, 55, 255], 0.4) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateStone(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(3001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([128, 128, 128, 255], 20, rng);
        const cx = (x * 7 + y * 13) % s;
        const cy = (x * 11 + y * 3) % s;
        if (Math.abs(cx - s / 2) < 1 || Math.abs(cy - s / 2) < 1) {
          if (rng.next() > 0.4) color = mixColors(color, [90, 90, 90, 255], 0.5) as RGBA;
        }
        if (rng.next() < 0.05) color = colorVariation([155, 155, 155, 255], 10, rng);
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateWoodSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(4001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([101, 67, 33, 255], 12, rng);
        if (x % 3 === 0 || x % 5 === 0) color = mixColors(color, [80, 50, 25, 255], 0.3 + rng.next() * 0.2) as RGBA;
        if (y % 4 === 0) color = mixColors(color, [120, 80, 45, 255], 0.2) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateWoodTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(4002);
    const s = this.size;
    const center = s / 2;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x - center, dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let color: RGBA;
        if (dist > s * 0.42) color = colorVariation([80, 50, 25, 255], 15, rng);
        else {
          const ringVal = Math.sin(dist * 2.5) * 0.5 + 0.5;
          color = mixColors([160, 120, 70, 255], [120, 80, 40, 255], ringVal) as RGBA;
          color = colorVariation(color, 10, rng);
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateLeaves(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(5001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const r = rng.next();
        let color: RGBA;
        if (r < 0.25) color = colorVariation([58, 115, 38, 255], 18, rng);
        else if (r < 0.45) color = colorVariation([32, 75, 22, 255], 14, rng);
        else color = colorVariation([45, 98, 30, 255], 22, rng);
        const lx = (x + 2) % 5, ly = (y + 3) % 5;
        if (lx < 2 && ly < 2) color = mixColors(color, [58, 115, 38, 255], 0.25) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateSand(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(6001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([218, 198, 148, 255], 18, rng);
        if (rng.next() < 0.12) color = colorVariation([200, 180, 130, 255], 10, rng);
        if (rng.next() < 0.05) color = mixColors(color, [170, 150, 110, 255], 0.4) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateWater(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(7001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const wave = Math.sin(x * 0.8 + y * 0.3) * 0.5 + 0.5;
        let color = mixColors([30, 100, 200, 180], [50, 130, 220, 170], wave) as RGBA;
        color = colorVariation(color, 10, rng);
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateSnow(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(8001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([240, 245, 255, 255], 10, rng);
        if ((x + y * 3) % 7 === 0) color = mixColors(color, [210, 225, 245, 255], 0.3) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateBedrock(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(9001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const r = rng.next();
        let color: RGBA = r < 0.3 ? colorVariation([30, 30, 30, 255], 10, rng) : colorVariation([50, 50, 50, 255], 15, rng);
        if ((x * 7 + y * 11) % 13 < 3) color = mixColors(color, [65, 60, 55, 255], 0.4) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  // --- New vegetation textures ---

  generateTallGrass(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(10001);
    const s = this.size;
    // Transparent background with grass blades
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        setPixel(img.data, x, y, s, [0, 0, 0, 0]); // transparent
      }
    }
    // Draw several grass blades
    const bladePositions = [2, 5, 7, 9, 11, 13];
    for (const bx of bladePositions) {
      const bladeHeight = 8 + Math.floor(rng.next() * 6);
      const lean = (rng.next() - 0.5) * 2;
      const baseGreen: RGBA = [48 + Math.floor(rng.next() * 28), 95 + Math.floor(rng.next() * 30), 28 + Math.floor(rng.next() * 18), 255];
      const tipGreen: RGBA = [baseGreen[0] + 20, baseGreen[1] + 15, baseGreen[2] + 12, 255];
      for (let dy = 0; dy < bladeHeight; dy++) {
        const t = dy / bladeHeight;
        const px = Math.round(bx + lean * t);
        const py = s - 1 - dy;
        if (px >= 0 && px < s && py >= 0 && py < s) {
          const color = mixColors(baseGreen, tipGreen, t) as RGBA;
          setPixel(img.data, px, py, s, colorVariation(color, 12, rng));
          // Blade width at base
          if (dy < bladeHeight * 0.5 && px + 1 < s) {
            setPixel(img.data, px + 1, py, s, colorVariation(mixColors(color, [35, 72, 20, 255], 0.3) as RGBA, 8, rng));
          }
        }
      }
    }
    return img;
  }

  generateFlowerRed(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(11001);
    const s = this.size;
    // Transparent base
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++)
        setPixel(img.data, x, y, s, [0, 0, 0, 0]);

    // Stem
    const cx = Math.floor(s / 2);
    for (let y = s - 1; y > s - 10; y--) {
      setPixel(img.data, cx, y, s, colorVariation([38, 85, 25, 255], 12, rng));
      if (y > s - 5) setPixel(img.data, cx + 1, y, s, colorVariation([34, 75, 20, 255], 10, rng));
    }
    // Small leaf on stem
    setPixel(img.data, cx - 1, s - 5, s, [44, 95, 28, 255]);
    setPixel(img.data, cx - 2, s - 6, s, [40, 88, 24, 255]);

    // Flower petals (poppy-like)
    const fy = s - 11;
    const petalColor: RGBA = [210, 40, 30, 255];
    const centerColor: RGBA = [40, 30, 20, 255];
    const offsets = [[-1,-1],[-1,0],[0,-1],[0,0],[1,-1],[1,0],[-1,1],[0,1],[1,1],[2,0],[0,-2],[-2,0]];
    for (const [dx, dy] of offsets) {
      const px = cx + dx, py = fy + dy;
      if (px >= 0 && px < s && py >= 0 && py < s) {
        setPixel(img.data, px, py, s, colorVariation(petalColor, 25, rng));
      }
    }
    // Dark center
    setPixel(img.data, cx, fy, s, centerColor);
    setPixel(img.data, cx - 1, fy, s, colorVariation([50, 35, 25, 255], 10, rng));

    return img;
  }

  generatePlanks(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(13001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const plankRow = Math.floor(y / 4);
        const offset = plankRow % 2 === 0 ? 0 : 3;
        const plankEdgeX = (x + offset) % 8 === 0;
        const plankEdgeY = y % 4 === 0;
        let color = colorVariation([180, 140, 85, 255], 15, rng);
        if (plankEdgeX) color = mixColors(color, [120, 90, 50, 255], 0.5) as RGBA;
        if (plankEdgeY) color = mixColors(color, [130, 100, 55, 255], 0.4) as RGBA;
        if (x % 3 === 0) color = mixColors(color, [165, 128, 75, 255], 0.15 + rng.next() * 0.1) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateCobblestone(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(14001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([115, 115, 115, 255], 18, rng);
        const hash = (x * 17 + y * 31) % 37;
        if (hash < 6) color = colorVariation([90, 90, 90, 255], 12, rng);
        else if (hash < 12) color = colorVariation([135, 135, 135, 255], 10, rng);
        const jx = (x * 5 + y * 9) % s;
        const jy = (x * 11 + y * 7) % s;
        if (jx % 5 === 0 || jy % 4 === 0) {
          color = mixColors(color, [75, 75, 75, 255], 0.3 + rng.next() * 0.15) as RGBA;
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateCraftingTableTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(15001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([170, 130, 75, 255], 12, rng);
        if (x === 0 || x === s - 1 || y === 0 || y === s - 1) {
          color = colorVariation([110, 80, 45, 255], 8, rng);
        }
        const gridX = Math.floor((x - 1) / 4.5);
        const gridY = Math.floor((y - 1) / 4.5);
        const gx = (x - 1) % 4.5;
        const gy = (y - 1) % 4.5;
        if (x > 0 && x < s - 1 && y > 0 && y < s - 1) {
          if (gx < 0.8 || gy < 0.8) {
            color = mixColors(color, [95, 65, 35, 255], 0.5) as RGBA;
          }
          if (gridX >= 0 && gridX < 3 && gridY >= 0 && gridY < 3) {
            if (gx >= 1.2 && gy >= 1.2) {
              color = mixColors(color, [190, 148, 90, 255], 0.25) as RGBA;
            }
          }
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateCraftingTableSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(15002);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([160, 120, 70, 255], 12, rng);
        if (x === 0 || x === s - 1 || y === 0 || y === s - 1) {
          color = colorVariation([105, 75, 40, 255], 8, rng);
        }
        const plankRow = Math.floor(y / 4);
        if (y % 4 === 0) color = mixColors(color, [120, 85, 45, 255], 0.35) as RGBA;
        if (plankRow % 2 === 0 && x % 3 === 0) {
          color = mixColors(color, [145, 108, 60, 255], 0.2) as RGBA;
        }
        // Tool pattern - saw shape on left half
        if (x >= 2 && x <= 6 && y >= 4 && y <= 11) {
          const toolY = y - 4;
          const toolX = x - 2;
          if (toolX === 2 && toolY >= 0 && toolY <= 7) {
            color = mixColors(color, [80, 60, 40, 255], 0.55) as RGBA;
          }
          if (toolY === 0 && toolX >= 1 && toolX <= 3) {
            color = mixColors(color, [140, 140, 145, 255], 0.5) as RGBA;
          }
        }
        // Hammer shape on right half
        if (x >= 9 && x <= 13 && y >= 4 && y <= 11) {
          const toolY = y - 4;
          const toolX = x - 9;
          if (toolX === 2 && toolY >= 2 && toolY <= 7) {
            color = mixColors(color, [80, 60, 40, 255], 0.55) as RGBA;
          }
          if (toolY <= 2 && toolX >= 1 && toolX <= 3) {
            color = mixColors(color, [140, 140, 145, 255], 0.5) as RGBA;
          }
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateTorch(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(16001);
    const s = this.size;
    const cx = Math.floor(s / 2);

    // Clear to transparent
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++)
        setPixel(img.data, x, y, s, [0, 0, 0, 0]);

    // Wooden stick (rows 5-15, 4px wide for visibility)
    for (let y = 5; y < s; y++) {
      const darkening = (y - 5) / (s - 5) * 0.3;
      for (let dx = -2; dx <= 1; dx++) {
        const px = cx + dx;
        if (px < 0 || px >= s) continue;
        // Edge darkening for 3D depth
        const edgeFactor = (dx === -2 || dx === 1) ? 0.75 : 1.0;
        const stick: RGBA = [
          Math.floor((120 - darkening * 45) * edgeFactor + (rng.next() - 0.5) * 15),
          Math.floor((82 - darkening * 30) * edgeFactor + (rng.next() - 0.5) * 12),
          Math.floor((42 - darkening * 18) * edgeFactor + (rng.next() - 0.5) * 10),
          255,
        ];
        setPixel(img.data, px, y, s, stick);
      }
      // Highlight strip on left side of stick
      if (y > 6 && y < s - 1) {
        const hlx = cx - 1;
        const hl: RGBA = [
          Math.floor(140 - darkening * 40 + (rng.next() - 0.5) * 10),
          Math.floor(98 - darkening * 28 + (rng.next() - 0.5) * 8),
          Math.floor(52 - darkening * 16 + (rng.next() - 0.5) * 6),
          255,
        ];
        setPixel(img.data, hlx, y, s, hl);
      }
    }

    // Flame (rows 0-6, wider and more detailed)
    const flameRows: [number, number, number][] = [
      // [y, half-width, brightness]
      [0, 1, 1.0],
      [1, 2, 0.97],
      [2, 2, 0.93],
      [3, 3, 0.85],
      [4, 3, 0.75],
      [5, 2, 0.55],
      [6, 1, 0.35],
    ];
    for (const [fy, hw, bright] of flameRows) {
      for (let dx = -hw; dx <= hw; dx++) {
        const px = cx + dx;
        if (px < 0 || px >= s) continue;
        const edge = hw > 0 ? Math.abs(dx) / hw : 0;
        const r = Math.min(255, Math.floor(255 * bright + (rng.next() - 0.5) * 15));
        const g = Math.min(255, Math.floor((245 - edge * 140 - (1 - bright) * 110) + (rng.next() - 0.5) * 25));
        const b = Math.min(255, Math.max(0, Math.floor((110 - edge * 90 - (1 - bright) * 90) + (rng.next() - 0.5) * 20)));
        setPixel(img.data, px, fy, s, [r, Math.max(0, g), b, 255]);
      }
    }

    return img;
  }

  /** Solid side texture for 3D torch box — NO transparency */
  generateTorchSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(19001);
    const s = this.size;

    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        if (y <= 5) {
          // Flame region (top 6 rows): yellow-orange gradient
          const t = y / 5; // 0 at top, 1 at bottom of flame
          const edgeX = Math.abs(x - s / 2 + 0.5) / (s / 2);
          const r = Math.min(255, Math.floor(255 - t * 20 + (rng.next() - 0.5) * 15));
          const g = Math.min(255, Math.floor(230 - t * 80 - edgeX * 60 + (rng.next() - 0.5) * 20));
          const b = Math.max(0, Math.floor(80 - t * 50 - edgeX * 50 + (rng.next() - 0.5) * 15));
          setPixel(img.data, x, y, s, [r, Math.max(0, g), Math.max(0, b), 255]);
        } else {
          // Stick region: solid brown wood with grain
          const darkening = (y - 6) / (s - 6) * 0.3;
          const edgeX = Math.abs(x - s / 2 + 0.5) / (s / 2);
          const edgeDarken = edgeX * 0.25;
          const grain = Math.sin(y * 2.5 + x * 0.3) * 0.05;
          const factor = 1.0 - darkening - edgeDarken + grain;
          const r = Math.floor(Math.max(40, Math.min(180, 125 * factor + (rng.next() - 0.5) * 12)));
          const g = Math.floor(Math.max(25, Math.min(120, 85 * factor + (rng.next() - 0.5) * 10)));
          const b = Math.floor(Math.max(10, Math.min(80, 42 * factor + (rng.next() - 0.5) * 8)));
          setPixel(img.data, x, y, s, [r, g, b, 255]);
        }
      }
    }

    return img;
  }

  /** Solid top texture for 3D torch box — flame seen from above */
  generateTorchTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(20001);
    const s = this.size;
    const half = s / 2;

    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x - half + 0.5;
        const dy = y - half + 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy) / half;
        // Radial gradient: bright center to darker edges
        const t = Math.min(1, dist);
        const r = Math.floor(255 - t * 60 + (rng.next() - 0.5) * 12);
        const g = Math.floor(200 - t * 100 + (rng.next() - 0.5) * 15);
        const b = Math.max(0, Math.floor(60 - t * 50 + (rng.next() - 0.5) * 10));
        setPixel(img.data, x, y, s, [
          Math.min(255, Math.max(0, r)),
          Math.min(255, Math.max(0, g)),
          Math.max(0, b),
          255,
        ]);
      }
    }

    return img;
  }

  generateFlowerYellow(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(12001);
    const s = this.size;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++)
        setPixel(img.data, x, y, s, [0, 0, 0, 0]);

    // Stem
    const cx = Math.floor(s / 2);
    for (let y = s - 1; y > s - 9; y--) {
      setPixel(img.data, cx, y, s, colorVariation([40, 88, 26, 255], 10, rng));
    }
    setPixel(img.data, cx + 1, s - 4, s, [44, 95, 30, 255]);
    setPixel(img.data, cx + 2, s - 5, s, [40, 90, 26, 255]);

    // Dandelion-like flower (bright yellow puff)
    const fy = s - 10;
    const petalColor: RGBA = [255, 220, 40, 255];
    for (let dy = -2; dy <= 1; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue;
        const px = cx + dx, py = fy + dy;
        if (px >= 0 && px < s && py >= 0 && py < s) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          const t = dist / 2.5;
          const c = mixColors(petalColor, [255, 180, 20, 255], t) as RGBA;
          setPixel(img.data, px, py, s, colorVariation(c, 20, rng));
        }
      }
    }
    // bright center
    setPixel(img.data, cx, fy, s, [255, 240, 80, 255]);

    return img;
  }

  generateStoneBricks(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(21001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const brickRow = Math.floor(y / 4);
        const offset = brickRow % 2 === 0 ? 0 : 4;
        const bx = (x + offset) % 8;
        const by = y % 4;
        const isJointX = bx === 0;
        const isJointY = by === 0;
        let color: RGBA;
        if (isJointX || isJointY) {
          color = colorVariation([95, 95, 95, 255], 8, rng);
        } else {
          color = colorVariation([140, 140, 140, 255], 16, rng);
          if (rng.next() < 0.08) color = colorVariation([125, 125, 128, 255], 10, rng);
          if ((bx + by) % 3 === 0) color = mixColors(color, [155, 155, 155, 255], 0.15) as RGBA;
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateMossyCobblestone(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(22001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([115, 115, 115, 255], 18, rng);
        const hash = (x * 17 + y * 31) % 37;
        if (hash < 6) color = colorVariation([90, 90, 90, 255], 12, rng);
        else if (hash < 12) color = colorVariation([135, 135, 135, 255], 10, rng);
        const jx = (x * 5 + y * 9) % s;
        const jy = (x * 11 + y * 7) % s;
        if (jx % 5 === 0 || jy % 4 === 0) {
          color = mixColors(color, [75, 75, 75, 255], 0.3 + rng.next() * 0.15) as RGBA;
        }
        const mossNoise = Math.sin(x * 0.9 + y * 0.7) * 0.5 + 0.5;
        const mossChance = mossNoise * 0.6 + rng.next() * 0.4;
        if (mossChance > 0.55) {
          const mossGreen: RGBA = [58, 95, 38, 255];
          const t = Math.min(1, (mossChance - 0.55) * 3);
          color = mixColors(color, mossGreen, t * 0.7) as RGBA;
          color = colorVariation(color, 12, rng);
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateGlass(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(23001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const isBorder = x === 0 || x === s - 1 || y === 0 || y === s - 1;
        const isInnerBorder = x === 1 || x === s - 2 || y === 1 || y === s - 2;
        if (isBorder) {
          setPixel(img.data, x, y, s, colorVariation([180, 190, 200, 255], 8, rng));
        } else if (isInnerBorder) {
          setPixel(img.data, x, y, s, colorVariation([195, 210, 220, 200], 6, rng));
        } else {
          const highlight = Math.sin(x * 0.6 + y * 0.3) * 0.5 + 0.5;
          const r = Math.floor(200 + highlight * 30 + (rng.next() - 0.5) * 10);
          const g = Math.floor(220 + highlight * 20 + (rng.next() - 0.5) * 8);
          const b = Math.floor(235 + highlight * 15 + (rng.next() - 0.5) * 6);
          const a = Math.floor(60 + highlight * 30);
          setPixel(img.data, x, y, s, [
            Math.min(255, r), Math.min(255, g), Math.min(255, b), a,
          ]);
        }
      }
    }
    return img;
  }

  generateBookshelf(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(24001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const shelfY = y % 8;
        const isShelfEdge = shelfY === 0 || shelfY === 7;
        if (isShelfEdge) {
          setPixel(img.data, x, y, s, colorVariation([170, 130, 75, 255], 12, rng));
        } else {
          const bookCol = Math.floor(x / 3);
          const bookEdge = x % 3 === 0;
          if (bookEdge) {
            setPixel(img.data, x, y, s, colorVariation([50, 35, 25, 255], 8, rng));
          } else {
            const bookColors: RGBA[] = [
              [140, 40, 30, 255], [35, 55, 120, 255], [45, 100, 45, 255],
              [120, 90, 35, 255], [90, 30, 90, 255], [150, 60, 40, 255],
            ];
            const color = bookColors[bookCol % bookColors.length];
            let c = colorVariation(color, 18, rng);
            if (shelfY === 1 || shelfY === 6) c = mixColors(c, [30, 25, 20, 255], 0.3) as RGBA;
            const pageStripe = shelfY === 3 || shelfY === 4;
            if (pageStripe && rng.next() < 0.3) {
              c = mixColors(c, [220, 210, 190, 255], 0.5) as RGBA;
            }
            setPixel(img.data, x, y, s, c);
          }
        }
      }
    }
    return img;
  }

  generateWoolRed(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(25001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([160, 35, 30, 255], 15, rng);
        const weave = ((x + y) % 2 === 0) ? 0.05 : -0.05;
        color = [
          Math.max(0, Math.min(255, color[0] + weave * 40)),
          Math.max(0, Math.min(255, color[1] + weave * 10)),
          Math.max(0, Math.min(255, color[2] + weave * 8)),
          255,
        ];
        if (rng.next() < 0.06) color = mixColors(color, [130, 25, 22, 255], 0.35) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateIronBlock(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(26001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([195, 195, 200, 255], 12, rng);
        if (x === 0 || x === s - 1 || y === 0 || y === s - 1) {
          color = colorVariation([165, 165, 172, 255], 8, rng);
        }
        const scratch = Math.sin(x * 1.7 + y * 0.4) * 0.5 + 0.5;
        if (scratch > 0.85) color = mixColors(color, [215, 215, 220, 255], 0.3) as RGBA;
        if (scratch < 0.15) color = mixColors(color, [170, 170, 178, 255], 0.2) as RGBA;
        const crossX = Math.abs(x - s / 2) < 1.5;
        const crossY = Math.abs(y - s / 2) < 1.5;
        if (crossX || crossY) color = mixColors(color, [175, 175, 182, 255], 0.2) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateDarkPlanks(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(27001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const plankRow = Math.floor(y / 4);
        const offset = plankRow % 2 === 0 ? 0 : 3;
        const plankEdgeX = (x + offset) % 8 === 0;
        const plankEdgeY = y % 4 === 0;
        let color = colorVariation([85, 55, 30, 255], 12, rng);
        if (plankEdgeX) color = mixColors(color, [55, 35, 18, 255], 0.5) as RGBA;
        if (plankEdgeY) color = mixColors(color, [60, 40, 20, 255], 0.4) as RGBA;
        if (x % 3 === 0) color = mixColors(color, [75, 48, 26, 255], 0.15 + rng.next() * 0.1) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateChiseledStone(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(28001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const border = x === 0 || x === s - 1 || y === 0 || y === s - 1;
        const inner1 = x === 1 || x === s - 2 || y === 1 || y === s - 2;
        const inner2 = x === 2 || x === s - 3 || y === 2 || y === s - 3;
        let color: RGBA;
        if (border) {
          color = colorVariation([120, 120, 120, 255], 10, rng);
        } else if (inner1) {
          color = colorVariation([145, 145, 148, 255], 8, rng);
        } else if (inner2) {
          color = colorVariation([130, 130, 133, 255], 8, rng);
        } else {
          color = colorVariation([155, 155, 158, 255], 12, rng);
          const cx = x - s / 2, cy = y - s / 2;
          const dist = Math.sqrt(cx * cx + cy * cy);
          if (dist < 3.5 && dist > 2) {
            color = mixColors(color, [110, 110, 115, 255], 0.4) as RGBA;
          }
          if (dist < 1.5) {
            color = mixColors(color, [135, 130, 128, 255], 0.3) as RGBA;
          }
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateChestSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(29001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const plankRow = Math.floor(y / 4);
        const offset = plankRow % 2 === 0 ? 0 : 3;
        const plankEdgeX = (x + offset) % 8 === 0;
        const plankEdgeY = y % 4 === 0;
        let color = colorVariation([140, 90, 45, 255], 10, rng);
        if (plankEdgeX) color = mixColors(color, [100, 60, 30, 255], 0.5) as RGBA;
        if (plankEdgeY) color = mixColors(color, [105, 65, 32, 255], 0.4) as RGBA;
        // Border frame
        if (x === 0 || x === s - 1 || y === 0 || y === s - 1) {
          color = colorVariation([110, 70, 35, 255], 8, rng);
        }
        // Metal latch in center
        const cx = Math.abs(x - s / 2), cy = Math.abs(y - s / 2);
        if (cx <= 1.5 && cy <= 2.5 && y >= s / 2 - 2) {
          color = colorVariation([180, 180, 170, 255], 12, rng);
          if (cx <= 0.5 && cy <= 0.5) {
            color = colorVariation([60, 60, 55, 255], 8, rng);
          }
        }
        // Metal band across middle
        if (y === Math.floor(s / 2) || y === Math.floor(s / 2) + 1) {
          const metalBase = colorVariation([160, 155, 140, 255], 10, rng);
          color = mixColors(color, metalBase, 0.6) as RGBA;
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateChestTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(30001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([125, 80, 40, 255], 10, rng);
        if (x % 4 === 0) color = mixColors(color, [95, 60, 28, 255], 0.3) as RGBA;
        if (x === 0 || x === s - 1 || y === 0 || y === s - 1) {
          color = colorVariation([100, 65, 30, 255], 8, rng);
        }
        if (Math.abs(y - s / 2) < 1.5) {
          color = mixColors(color, colorVariation([165, 160, 148, 255], 10, rng), 0.55) as RGBA;
        }
        const nearCorner = (x <= 1 || x >= s - 2) && (y <= 1 || y >= s - 2);
        if (nearCorner) {
          color = mixColors(color, [155, 150, 138, 255], 0.4) as RGBA;
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  // ============= NEW TEXTURES =============

  generateTNTSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(31001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color: RGBA;
        if (y < 3 || y >= s - 3) {
          color = colorVariation([120, 100, 70, 255], 12, rng);
        } else {
          color = colorVariation([200, 40, 30, 255], 18, rng);
          if (y >= 5 && y <= 10) {
            const band = Math.abs(x - s / 2);
            if (band < 6) color = mixColors(color, [220, 200, 170, 255], 0.7) as RGBA;
          }
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateTNTTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(32001);
    const s = this.size;
    const c = s / 2;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x - c, dy = y - c;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let color: RGBA;
        if (dist < 3) {
          color = colorVariation([40, 40, 40, 255], 10, rng);
        } else {
          color = colorVariation([120, 100, 70, 255], 14, rng);
          if ((x + y) % 3 === 0) color = mixColors(color, [100, 80, 55, 255], 0.3) as RGBA;
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateTNTBottom(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(33001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([120, 100, 70, 255], 14, rng);
        if ((x + y) % 3 === 0) color = mixColors(color, [100, 80, 55, 255], 0.3) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateLava(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(34001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const flow = Math.sin(x * 0.6 + y * 0.4) * 0.5 + 0.5;
        const hot = Math.sin(x * 1.2 + y * 0.8) * 0.5 + 0.5;
        let color = mixColors([200, 60, 10, 240], [255, 160, 20, 240], flow) as RGBA;
        if (hot > 0.7) color = mixColors(color, [255, 230, 80, 255], (hot - 0.7) * 2) as RGBA;
        color = colorVariation(color, 15, rng);
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateIce(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(35001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const crack = Math.sin(x * 1.5 + y * 0.8) * Math.cos(x * 0.5 + y * 1.8);
        let color: RGBA = [160, 200, 240, 200];
        color = colorVariation(color, 12, rng);
        if (crack > 0.6) color = mixColors(color, [220, 240, 255, 220], 0.5) as RGBA;
        if (crack < -0.6) color = mixColors(color, [120, 170, 220, 180], 0.4) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateGlowstone(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(36001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const glow = Math.sin(x * 0.9 + y * 0.7) * 0.5 + 0.5;
        let color = mixColors([180, 150, 50, 255], [240, 220, 100, 255], glow) as RGBA;
        if (rng.next() < 0.1) color = mixColors(color, [255, 245, 180, 255], 0.5) as RGBA;
        color = colorVariation(color, 18, rng);
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateMushroomRed(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(37001);
    const s = this.size;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++)
        setPixel(img.data, x, y, s, [0, 0, 0, 0]);
    const cx = Math.floor(s / 2);
    for (let y = s - 1; y > s - 6; y--)
      setPixel(img.data, cx, y, s, colorVariation([200, 190, 170, 255], 10, rng));
    for (let dy = -4; dy <= 0; dy++) {
      const w = 3 + Math.floor((-dy) * 0.8);
      for (let dx = -w; dx <= w; dx++) {
        const px = cx + dx, py = s - 7 + dy;
        if (px >= 0 && px < s && py >= 0 && py < s) {
          let c: RGBA = [190, 30, 25, 255];
          if ((px + py) % 3 === 0) c = mixColors(c, [255, 240, 220, 255], 0.7) as RGBA;
          setPixel(img.data, px, py, s, colorVariation(c, 15, rng));
        }
      }
    }
    return img;
  }

  generateMushroomBrown(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(38001);
    const s = this.size;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++)
        setPixel(img.data, x, y, s, [0, 0, 0, 0]);
    const cx = Math.floor(s / 2);
    for (let y = s - 1; y > s - 6; y--)
      setPixel(img.data, cx, y, s, colorVariation([200, 190, 170, 255], 10, rng));
    for (let dy = -3; dy <= 0; dy++) {
      const w = 4 + Math.floor((-dy) * 0.5);
      for (let dx = -w; dx <= w; dx++) {
        const px = cx + dx, py = s - 7 + dy;
        if (px >= 0 && px < s && py >= 0 && py < s) {
          setPixel(img.data, px, py, s, colorVariation([140, 100, 60, 255], 18, rng));
        }
      }
    }
    return img;
  }

  generateCactusSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(39001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([55, 120, 40, 255], 18, rng);
        if (x <= 1 || x >= s - 2) color = mixColors(color, [35, 80, 25, 255], 0.4) as RGBA;
        if ((x + y * 3) % 7 === 0 && x > 1 && x < s - 2) {
          color = mixColors(color, [80, 150, 55, 255], 0.3) as RGBA;
        }
        if (y % 4 === 0 && x > 2 && x < s - 3 && rng.next() > 0.6) {
          color = mixColors(color, [90, 60, 30, 255], 0.5) as RGBA;
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateCactusTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(40001);
    const s = this.size;
    const c = s / 2;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x - c, dy = y - c;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let color: RGBA;
        if (dist < 2) color = colorVariation([45, 100, 35, 255], 12, rng);
        else if (dist < c - 1) color = colorVariation([55, 120, 40, 255], 16, rng);
        else color = colorVariation([40, 90, 30, 255], 10, rng);
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generatePumpkinSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(41001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([200, 120, 30, 255], 16, rng);
        const groove = Math.sin(x * 1.2) * 0.5 + 0.5;
        if (groove < 0.2) color = mixColors(color, [150, 80, 15, 255], 0.5) as RGBA;
        if (y <= 1) color = colorVariation([60, 90, 30, 255], 12, rng);
        if (x >= 6 && x <= 9 && y >= 4 && y <= 10) {
          const ex = x - 6, ey = y - 4;
          if ((ex === 0 || ex === 3) && ey >= 1 && ey <= 4)
            color = colorVariation([20, 15, 10, 255], 5, rng);
          if (ey === 5 && ex >= 1 && ex <= 2)
            color = colorVariation([20, 15, 10, 255], 5, rng);
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generatePumpkinTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(42001);
    const s = this.size;
    const c = s / 2;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const angle = Math.atan2(y - c, x - c);
        const segment = Math.floor((angle + Math.PI) / (Math.PI / 4));
        let color = colorVariation([190, 115, 28, 255], 14, rng);
        if (segment % 2 === 0) color = mixColors(color, [160, 90, 18, 255], 0.3) as RGBA;
        const dx = x - c, dy = y - c;
        if (Math.sqrt(dx * dx + dy * dy) < 2)
          color = colorVariation([50, 80, 25, 255], 10, rng);
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateObsidian(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(43001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([20, 15, 30, 255], 8, rng);
        const shine = Math.sin(x * 0.7 + y * 1.1) * 0.5 + 0.5;
        if (shine > 0.75) color = mixColors(color, [60, 40, 80, 255], 0.4) as RGBA;
        if (rng.next() < 0.05) color = mixColors(color, [80, 50, 110, 255], 0.3) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateGoldBlock(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(44001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([220, 180, 50, 255], 15, rng);
        if (x === 0 || x === s - 1 || y === 0 || y === s - 1)
          color = colorVariation([180, 140, 35, 255], 10, rng);
        const shine = Math.sin(x * 1.3 + y * 0.6) * 0.5 + 0.5;
        if (shine > 0.8) color = mixColors(color, [255, 240, 130, 255], 0.4) as RGBA;
        const crossX = Math.abs(x - s / 2) < 1.5;
        const crossY = Math.abs(y - s / 2) < 1.5;
        if (crossX || crossY) color = mixColors(color, [190, 150, 40, 255], 0.2) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateDiamondBlock(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(45001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([80, 210, 210, 255], 18, rng);
        if (x === 0 || x === s - 1 || y === 0 || y === s - 1)
          color = colorVariation([55, 170, 175, 255], 10, rng);
        const sparkle = Math.sin(x * 2.1 + y * 1.4) * Math.cos(x * 0.8 + y * 2.5);
        if (sparkle > 0.5) color = mixColors(color, [180, 255, 255, 255], 0.5) as RGBA;
        const crossX = Math.abs(x - s / 2) < 1.5;
        const crossY = Math.abs(y - s / 2) < 1.5;
        if (crossX || crossY) color = mixColors(color, [60, 180, 185, 255], 0.2) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateBrick(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(46001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const row = Math.floor(y / 4);
        const offset = row % 2 === 0 ? 0 : 4;
        const bx = (x + offset) % 8;
        const by = y % 4;
        if (bx === 0 || by === 0) {
          setPixel(img.data, x, y, s, colorVariation([180, 175, 160, 255], 10, rng));
        } else {
          let color = colorVariation([160, 70, 50, 255], 18, rng);
          if (rng.next() < 0.08) color = colorVariation([140, 55, 40, 255], 12, rng);
          setPixel(img.data, x, y, s, color);
        }
      }
    }
    return img;
  }

  generateHayBaleSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(47001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([190, 170, 60, 255], 20, rng);
        if (y % 4 === 0) color = mixColors(color, [140, 100, 30, 255], 0.3) as RGBA;
        if (x % 2 === 0) color = mixColors(color, [175, 155, 50, 255], 0.15) as RGBA;
        if (y <= 1 || y >= s - 2) color = colorVariation([120, 80, 30, 255], 12, rng);
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateHayBaleTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(48001);
    const s = this.size;
    const c = s / 2;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const angle = Math.atan2(y - c, x - c);
        const ring = Math.sin(angle * 8) * 0.3;
        let color = colorVariation([190, 170, 60, 255], 16, rng);
        color = mixColors(color, [160, 140, 40, 255], ring + 0.3) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateSlimeBlock(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(49001);
    const s = this.size;
    const c = s / 2;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const isBorder = x <= 1 || x >= s - 2 || y <= 1 || y >= s - 2;
        const dx = x - c, dy = y - c;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let color: RGBA;
        if (isBorder) {
          color = colorVariation([80, 160, 50, 160], 12, rng);
        } else if (dist < 4) {
          color = colorVariation([60, 140, 35, 200], 15, rng);
        } else {
          color = colorVariation([90, 190, 60, 140], 18, rng);
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateGravel(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(50001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const r = rng.next();
        let color: RGBA;
        if (r < 0.3) color = colorVariation([100, 95, 90, 255], 15, rng);
        else if (r < 0.6) color = colorVariation([130, 125, 118, 255], 12, rng);
        else color = colorVariation([115, 110, 105, 255], 18, rng);
        if ((x * 7 + y * 13) % 11 < 2) color = mixColors(color, [80, 78, 75, 255], 0.3) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateLadder(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(51001);
    const s = this.size;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++)
        setPixel(img.data, x, y, s, [0, 0, 0, 0]);
    for (let y = 0; y < s; y++) {
      setPixel(img.data, 3, y, s, colorVariation([120, 85, 45, 255], 10, rng));
      setPixel(img.data, 4, y, s, colorVariation([115, 80, 40, 255], 10, rng));
      setPixel(img.data, 11, y, s, colorVariation([120, 85, 45, 255], 10, rng));
      setPixel(img.data, 12, y, s, colorVariation([115, 80, 40, 255], 10, rng));
    }
    for (let rung = 0; rung < 4; rung++) {
      const ry = 2 + rung * 4;
      if (ry < s) {
        for (let x = 4; x <= 11; x++) {
          setPixel(img.data, x, ry, s, colorVariation([130, 95, 50, 255], 12, rng));
        }
      }
    }
    return img;
  }

  private generateOreTexture(seed: number, oreColor: RGBA, spotSize: number): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(seed);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([128, 128, 128, 255], 20, rng);
        const cx1 = (x * 7 + y * 13) % s;
        const cy1 = (x * 11 + y * 3) % s;
        if (Math.abs(cx1 - s / 2) < 1 || Math.abs(cy1 - s / 2) < 1) {
          if (rng.next() > 0.4) color = mixColors(color, [90, 90, 90, 255], 0.5) as RGBA;
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    const spots = [
      [3, 4], [4, 3], [4, 4], [5, 4],
      [9, 8], [10, 8], [10, 9], [9, 9],
      [6, 11], [7, 11], [7, 12], [5, 12],
      [12, 3], [13, 3], [12, 4],
    ];
    const rng2 = new SeededRandom(seed + 100);
    for (const [sx, sy] of spots) {
      if (sx < s && sy < s && rng2.next() < 0.7) {
        const c = colorVariation(oreColor, 20, rng2);
        setPixel(img.data, sx, sy, s, c);
        if (sx + 1 < s && spotSize > 1) setPixel(img.data, sx + 1, sy, s, colorVariation(oreColor, 15, rng2));
      }
    }
    return img;
  }

  generateCoalOre(): ImageData {
    return this.generateOreTexture(52001, [35, 35, 35, 255], 2);
  }

  generateIronOre(): ImageData {
    return this.generateOreTexture(53001, [195, 170, 145, 255], 2);
  }

  generateGoldOre(): ImageData {
    return this.generateOreTexture(54001, [220, 190, 50, 255], 2);
  }

  generateDiamondOre(): ImageData {
    return this.generateOreTexture(55001, [80, 220, 230, 255], 2);
  }

  generateEmeraldOre(): ImageData {
    return this.generateOreTexture(56001, [40, 200, 70, 255], 2);
  }

  generateFurnaceSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(57001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([130, 130, 130, 255], 16, rng);
        if (x === 0 || x === s - 1 || y === 0 || y === s - 1)
          color = colorVariation([100, 100, 100, 255], 10, rng);
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateFurnaceFront(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(58001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([130, 130, 130, 255], 16, rng);
        if (x === 0 || x === s - 1 || y === 0 || y === s - 1)
          color = colorVariation([100, 100, 100, 255], 10, rng);
        if (x >= 4 && x <= 11 && y >= 5 && y <= 12) {
          color = colorVariation([40, 30, 30, 255], 8, rng);
          if (y >= 7 && y <= 10 && x >= 5 && x <= 10) {
            const flicker = rng.next();
            if (flicker > 0.3)
              color = colorVariation([220, 100, 20, 255], 25, rng);
          }
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateFurnaceTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(59001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([140, 140, 140, 255], 14, rng);
        if (x === 0 || x === s - 1 || y === 0 || y === s - 1)
          color = colorVariation([105, 105, 105, 255], 8, rng);
        if (x >= 5 && x <= 10 && y >= 5 && y <= 10)
          color = colorVariation([90, 90, 90, 255], 10, rng);
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateDoorBottom(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(60001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([160, 120, 70, 255], 14, rng);
        if (x === 0 || x === s - 1) color = colorVariation([120, 85, 45, 255], 8, rng);
        if (y === s - 1) color = colorVariation([120, 85, 45, 255], 8, rng);
        if (x >= 6 && x <= 9 && y >= 2 && y <= 5)
          color = colorVariation([140, 140, 135, 255], 10, rng);
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateDoorTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(61001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([160, 120, 70, 255], 14, rng);
        if (x === 0 || x === s - 1) color = colorVariation([120, 85, 45, 255], 8, rng);
        if (y === 0) color = colorVariation([120, 85, 45, 255], 8, rng);
        if (x >= 4 && x <= 11 && y >= 4 && y <= 11)
          color = mixColors(color, [180, 200, 220, 150], 0.5) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateBedTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(62001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([160, 40, 35, 255], 14, rng);
        if (x <= 1 || x >= s - 2) color = colorVariation([220, 210, 190, 255], 10, rng);
        if (y <= 2) color = colorVariation([220, 210, 190, 255], 10, rng);
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateBedSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(63001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color: RGBA;
        if (y <= s / 3) color = colorVariation([160, 40, 35, 255], 12, rng);
        else color = colorVariation([170, 130, 80, 255], 14, rng);
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateEnchantingTableTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(64001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color: RGBA;
        if (x <= 1 || x >= s - 2 || y <= 1 || y >= s - 2) {
          color = colorVariation([40, 25, 45, 255], 8, rng);
        } else {
          color = colorVariation([180, 30, 35, 255], 12, rng);
          const cx = x - s / 2, cy = y - s / 2;
          const dist = Math.sqrt(cx * cx + cy * cy);
          if (dist < 3) color = mixColors(color, [60, 200, 180, 255], 0.6) as RGBA;
          if ((x + y) % 5 === 0) color = mixColors(color, [200, 180, 60, 255], 0.4) as RGBA;
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateEnchantingTableSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(65001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color: RGBA;
        if (y <= s / 2) {
          color = colorVariation([40, 25, 45, 255], 10, rng);
          if (y >= 3 && y <= s / 2 - 1 && x >= 2 && x <= s - 3) {
            if ((x + y) % 4 === 0) color = mixColors(color, [60, 200, 180, 255], 0.5) as RGBA;
          }
        } else {
          color = colorVariation([35, 20, 40, 255], 8, rng);
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateSign(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(66001);
    const s = this.size;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++)
        setPixel(img.data, x, y, s, [0, 0, 0, 0]);
    for (let y = 2; y < s - 4; y++) {
      for (let x = 1; x < s - 1; x++) {
        let color = colorVariation([180, 140, 85, 255], 12, rng);
        if (x === 1 || x === s - 2 || y === 2 || y === s - 5)
          color = colorVariation([130, 100, 55, 255], 8, rng);
        setPixel(img.data, x, y, s, color);
      }
    }
    for (let y = s - 4; y < s; y++) {
      setPixel(img.data, 7, y, s, colorVariation([120, 85, 45, 255], 8, rng));
      setPixel(img.data, 8, y, s, colorVariation([115, 80, 42, 255], 8, rng));
    }
    return img;
  }

  generateJukeboxSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(67001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([100, 60, 30, 255], 12, rng);
        if (x === 0 || x === s - 1 || y === 0 || y === s - 1)
          color = colorVariation([70, 42, 20, 255], 8, rng);
        if (y >= 6 && y <= 9 && x >= 3 && x <= 12) {
          color = colorVariation([50, 35, 20, 255], 8, rng);
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateJukeboxTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(68001);
    const s = this.size;
    const c = s / 2;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([100, 60, 30, 255], 12, rng);
        if (x === 0 || x === s - 1 || y === 0 || y === s - 1)
          color = colorVariation([70, 42, 20, 255], 8, rng);
        const dx = x - c, dy = y - c;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 4) {
          color = colorVariation([30, 25, 22, 255], 6, rng);
          if (dist < 1.5) color = colorVariation([140, 140, 135, 255], 8, rng);
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  // ============= BIOME BLOCK TEXTURES =============

  generateBirchWoodSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(69001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([215, 210, 200, 255], 10, rng);
        if (x % 4 === 0 || x % 7 === 0) color = mixColors(color, [200, 195, 185, 255], 0.2 + rng.next() * 0.1) as RGBA;
        if (y % 5 === 0) color = mixColors(color, [225, 220, 210, 255], 0.15) as RGBA;
        const darkPatch = Math.sin(y * 0.8 + x * 0.15) * 0.5 + 0.5;
        if (darkPatch > 0.75 && rng.next() > 0.4) {
          color = mixColors(color, [40, 35, 30, 255], 0.5 + rng.next() * 0.2) as RGBA;
        }
        if (rng.next() < 0.03) color = mixColors(color, [50, 45, 40, 255], 0.6) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateBirchWoodTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(70001);
    const s = this.size;
    const center = s / 2;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x - center, dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let color: RGBA;
        if (dist > s * 0.42) color = colorVariation([195, 190, 180, 255], 12, rng);
        else {
          const ringVal = Math.sin(dist * 2.8) * 0.5 + 0.5;
          color = mixColors([200, 180, 140, 255], [170, 150, 110, 255], ringVal) as RGBA;
          color = colorVariation(color, 10, rng);
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateBirchLeaves(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(71001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const r = rng.next();
        let color: RGBA;
        if (r < 0.25) color = colorVariation([65, 125, 45, 255], 18, rng);
        else if (r < 0.45) color = colorVariation([45, 100, 32, 255], 14, rng);
        else color = colorVariation([55, 115, 38, 255], 20, rng);
        const lx = (x + 2) % 5, ly = (y + 3) % 5;
        if (lx < 2 && ly < 2) color = mixColors(color, [70, 130, 48, 255], 0.25) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateSpruceWoodSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(72001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([55, 35, 18, 255], 10, rng);
        if (x % 3 === 0 || x % 5 === 0) color = mixColors(color, [40, 25, 12, 255], 0.3 + rng.next() * 0.15) as RGBA;
        if (y % 4 === 0) color = mixColors(color, [65, 42, 22, 255], 0.2) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateSpruceWoodTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(73001);
    const s = this.size;
    const center = s / 2;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x - center, dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let color: RGBA;
        if (dist > s * 0.42) color = colorVariation([45, 28, 14, 255], 10, rng);
        else {
          const ringVal = Math.sin(dist * 2.5) * 0.5 + 0.5;
          color = mixColors([100, 70, 35, 255], [70, 45, 22, 255], ringVal) as RGBA;
          color = colorVariation(color, 8, rng);
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateSpruceLeaves(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(74001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const r = rng.next();
        let color: RGBA;
        if (r < 0.3) color = colorVariation([22, 55, 22, 255], 12, rng);
        else if (r < 0.6) color = colorVariation([15, 42, 18, 255], 10, rng);
        else color = colorVariation([28, 65, 28, 255], 14, rng);
        const lx = (x + 1) % 4, ly = (y + 2) % 4;
        if (lx < 2 && ly < 2) color = mixColors(color, [18, 48, 20, 255], 0.3) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateJungleWoodSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(75001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([85, 68, 35, 255], 14, rng);
        if (x % 3 === 0) color = mixColors(color, [65, 50, 25, 255], 0.3 + rng.next() * 0.15) as RGBA;
        if (y % 3 === 0) color = mixColors(color, [95, 75, 40, 255], 0.2) as RGBA;
        const vine = Math.sin(y * 1.2 + x * 0.3) * 0.5 + 0.5;
        if (vine > 0.8 && rng.next() > 0.5) color = mixColors(color, [45, 80, 30, 255], 0.35) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateJungleWoodTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(76001);
    const s = this.size;
    const center = s / 2;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x - center, dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let color: RGBA;
        if (dist > s * 0.42) color = colorVariation([70, 55, 28, 255], 12, rng);
        else {
          const ringVal = Math.sin(dist * 2.2) * 0.5 + 0.5;
          color = mixColors([140, 110, 60, 255], [100, 75, 38, 255], ringVal) as RGBA;
          color = colorVariation(color, 10, rng);
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateJungleLeaves(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(77001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const r = rng.next();
        let color: RGBA;
        if (r < 0.3) color = colorVariation([28, 110, 22, 255], 18, rng);
        else if (r < 0.55) color = colorVariation([18, 85, 15, 255], 14, rng);
        else color = colorVariation([35, 125, 28, 255], 20, rng);
        const lx = (x + 3) % 6, ly = (y + 2) % 6;
        if (lx < 3 && ly < 3) color = mixColors(color, [25, 100, 20, 255], 0.2) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateAcaciaWoodSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(78001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([130, 100, 70, 255], 12, rng);
        if (x % 4 === 0 || x % 6 === 0) color = mixColors(color, [110, 82, 55, 255], 0.25 + rng.next() * 0.1) as RGBA;
        if (y % 3 === 0) color = mixColors(color, [145, 112, 78, 255], 0.15) as RGBA;
        const crack = Math.sin(y * 0.9 + x * 2.1) * 0.5 + 0.5;
        if (crack > 0.85) color = mixColors(color, [95, 70, 45, 255], 0.3) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateAcaciaWoodTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(79001);
    const s = this.size;
    const center = s / 2;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x - center, dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let color: RGBA;
        if (dist > s * 0.42) color = colorVariation([120, 90, 60, 255], 10, rng);
        else {
          const ringVal = Math.sin(dist * 2.0) * 0.5 + 0.5;
          color = mixColors([180, 140, 85, 255], [140, 100, 55, 255], ringVal) as RGBA;
          color = colorVariation(color, 10, rng);
        }
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateAcaciaLeaves(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(80001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const r = rng.next();
        let color: RGBA;
        if (r < 0.3) color = colorVariation([75, 110, 28, 255], 18, rng);
        else if (r < 0.55) color = colorVariation([60, 95, 22, 255], 14, rng);
        else color = colorVariation([85, 120, 32, 255], 20, rng);
        const lx = (x + 1) % 5, ly = (y + 2) % 5;
        if (lx < 2 && ly < 2) color = mixColors(color, [80, 115, 30, 255], 0.2) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateSandstoneSide(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(81001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const band = Math.sin(y * 0.8) * 0.15;
        let color = colorVariation([210, 190, 140, 255], 14, rng);
        color = mixColors(color, [190, 170, 120, 255], band + 0.15) as RGBA;
        if (y % 4 === 0) color = mixColors(color, [180, 160, 110, 255], 0.2) as RGBA;
        if (rng.next() < 0.06) color = mixColors(color, [175, 155, 105, 255], 0.3) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateSandstoneTop(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(82001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([215, 195, 145, 255], 16, rng);
        if ((x + y) % 5 === 0) color = mixColors(color, [195, 175, 125, 255], 0.2) as RGBA;
        if (rng.next() < 0.04) color = mixColors(color, [180, 160, 110, 255], 0.25) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateSandstoneBottom(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(83001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([200, 180, 130, 255], 14, rng);
        if ((x * 5 + y * 7) % 9 < 2) color = mixColors(color, [180, 160, 110, 255], 0.25) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateRedSand(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(84001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([190, 120, 60, 255], 18, rng);
        if (rng.next() < 0.1) color = colorVariation([170, 105, 48, 255], 12, rng);
        if (rng.next() < 0.05) color = mixColors(color, [155, 92, 40, 255], 0.35) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateTerracotta(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(85001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([160, 85, 55, 255], 14, rng);
        const crack = Math.sin(x * 1.5 + y * 0.8) * Math.cos(x * 0.5 + y * 1.5);
        if (crack > 0.55) color = mixColors(color, [140, 70, 42, 255], 0.3) as RGBA;
        if (rng.next() < 0.04) color = mixColors(color, [175, 95, 62, 255], 0.25) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateClay(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(86001);
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let color = colorVariation([155, 155, 165, 255], 12, rng);
        if ((x * 3 + y * 7) % 11 < 2) color = mixColors(color, [140, 140, 150, 255], 0.3) as RGBA;
        if (rng.next() < 0.06) color = mixColors(color, [145, 142, 155, 255], 0.2) as RGBA;
        setPixel(img.data, x, y, s, color);
      }
    }
    return img;
  }

  generateFern(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(87001);
    const s = this.size;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++)
        setPixel(img.data, x, y, s, [0, 0, 0, 0]);

    // Multiple fern fronds
    const fronds = [
      { bx: 4, lean: -1.8, h: 12 },
      { bx: 7, lean: 0.3, h: 14 },
      { bx: 10, lean: 1.5, h: 11 },
      { bx: 6, lean: -0.8, h: 10 },
      { bx: 9, lean: 1.0, h: 13 },
    ];
    for (const frond of fronds) {
      const baseGreen: RGBA = [30 + Math.floor(rng.next() * 25), 80 + Math.floor(rng.next() * 35), 20 + Math.floor(rng.next() * 15), 255];
      const tipGreen: RGBA = [baseGreen[0] + 15, baseGreen[1] + 20, baseGreen[2] + 10, 255];
      for (let dy = 0; dy < frond.h; dy++) {
        const t = dy / frond.h;
        const px = Math.round(frond.bx + frond.lean * t);
        const py = s - 1 - dy;
        if (px >= 0 && px < s && py >= 0 && py < s) {
          const color = mixColors(baseGreen, tipGreen, t) as RGBA;
          setPixel(img.data, px, py, s, colorVariation(color, 10, rng));
          if (dy > 2 && dy < frond.h - 1) {
            if (px - 1 >= 0) setPixel(img.data, px - 1, py, s, colorVariation(mixColors(color, [20, 60, 15, 255], 0.3) as RGBA, 8, rng));
            if (px + 1 < s) setPixel(img.data, px + 1, py, s, colorVariation(mixColors(color, [20, 60, 15, 255], 0.3) as RGBA, 8, rng));
          }
        }
      }
    }
    return img;
  }

  generateDeadBush(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(88001);
    const s = this.size;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++)
        setPixel(img.data, x, y, s, [0, 0, 0, 0]);

    const branchColor: RGBA = [110, 80, 40, 255];
    const branches = [
      { sx: 7, sy: s - 1, ex: 3, ey: s - 10 },
      { sx: 8, sy: s - 1, ex: 12, ey: s - 9 },
      { sx: 7, sy: s - 1, ex: 7, ey: s - 12 },
      { sx: 7, sy: s - 5, ex: 5, ey: s - 13 },
      { sx: 8, sy: s - 5, ex: 11, ey: s - 12 },
      { sx: 7, sy: s - 8, ex: 4, ey: s - 14 },
      { sx: 8, sy: s - 7, ex: 10, ey: s - 14 },
    ];
    for (const b of branches) {
      const steps = Math.max(Math.abs(b.ex - b.sx), Math.abs(b.ey - b.sy));
      for (let i = 0; i <= steps; i++) {
        const t = steps > 0 ? i / steps : 0;
        const px = Math.round(b.sx + (b.ex - b.sx) * t);
        const py = Math.round(b.sy + (b.ey - b.sy) * t);
        if (px >= 0 && px < s && py >= 0 && py < s) {
          setPixel(img.data, px, py, s, colorVariation(branchColor, 18, rng));
        }
      }
    }
    return img;
  }

  generateLilyPad(): ImageData {
    const img = this.createImageData();
    const rng = new SeededRandom(89001);
    const s = this.size;
    const c = s / 2;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++)
        setPixel(img.data, x, y, s, [0, 0, 0, 0]);

    for (let y = 2; y < s - 2; y++) {
      for (let x = 2; x < s - 2; x++) {
        const dx = x - c, dy = y - c;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        if (dist < 5.5 && !(angle > -0.3 && angle < 0.3 && dist > 2)) {
          let color = colorVariation([35, 100, 25, 255], 14, rng);
          if (dist > 4) color = mixColors(color, [25, 75, 18, 255], 0.4) as RGBA;
          if (Math.abs(angle + Math.PI * 0.5) < 0.15 || Math.abs(angle - Math.PI * 0.5) < 0.15) {
            color = mixColors(color, [25, 70, 18, 255], 0.3) as RGBA;
          }
          setPixel(img.data, x, y, s, color);
        }
      }
    }
    return img;
  }
}
