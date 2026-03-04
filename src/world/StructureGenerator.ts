import { Chunk } from './Chunk';
import { BlockType } from '../blocks/BlockTypes';
import { CHUNK_SIZE, WORLD_HEIGHT } from '../utils/constants';
import { fbm2d, noise2d } from '../utils/noise';
import { ChestManager } from './ChestManager';
import { ItemStack } from '../ui/InventorySystem';
import { ItemType } from '../ui/ItemTypes';

const GRID = 192;
const CHANCE = 0.55;
const SEA = 34;
const BASE_H = 30;
const H_SCALE = 38;

const enum SType { RUINS = 0, VILLAGE = 1, CASTLE = 2, TEMPLE = 3 }

export type StructureTypeName = 'ruins' | 'village' | 'castle' | 'temple';

const STYPE_MAP: Record<StructureTypeName, SType> = {
  ruins: SType.RUINS,
  village: SType.VILLAGE,
  castle: SType.CASTLE,
  temple: SType.TEMPLE,
};

export interface StructureLocation {
  readonly type: StructureTypeName;
  readonly wx: number;
  readonly wy: number;
  readonly wz: number;
  readonly dist: number;
}

type Bounds = { minX: number; minZ: number; maxX: number; maxZ: number };
type RNG = () => number;

interface LootEntry {
  readonly item: ItemType;
  readonly min: number;
  readonly max: number;
  readonly chance: number;
}

const LOOT_RUINS: LootEntry[] = [
  { item: ItemType.STICK, min: 1, max: 4, chance: 0.6 },
  { item: ItemType.TORCH, min: 1, max: 3, chance: 0.5 },
  { item: ItemType.COBBLESTONE, min: 2, max: 8, chance: 0.7 },
  { item: ItemType.WOODEN_PICKAXE, min: 1, max: 1, chance: 0.2 },
  { item: ItemType.PLANKS, min: 1, max: 4, chance: 0.3 },
];

const LOOT_VILLAGE: LootEntry[] = [
  { item: ItemType.PLANKS, min: 2, max: 8, chance: 0.7 },
  { item: ItemType.TORCH, min: 1, max: 4, chance: 0.6 },
  { item: ItemType.STICK, min: 2, max: 6, chance: 0.5 },
  { item: ItemType.COBBLESTONE, min: 2, max: 6, chance: 0.4 },
  { item: ItemType.WOODEN_PICKAXE, min: 1, max: 1, chance: 0.15 },
  { item: ItemType.WOODEN_SWORD, min: 1, max: 1, chance: 0.15 },
];

const LOOT_CASTLE: LootEntry[] = [
  { item: ItemType.IRON_BLOCK, min: 1, max: 3, chance: 0.5 },
  { item: ItemType.STONE_PICKAXE, min: 1, max: 1, chance: 0.35 },
  { item: ItemType.STONE_SWORD, min: 1, max: 1, chance: 0.35 },
  { item: ItemType.TORCH, min: 2, max: 6, chance: 0.6 },
  { item: ItemType.WOOL_RED, min: 1, max: 4, chance: 0.3 },
  { item: ItemType.BOOKSHELF, min: 1, max: 2, chance: 0.2 },
  { item: ItemType.PLANKS, min: 3, max: 10, chance: 0.5 },
];

const LOOT_TEMPLE: LootEntry[] = [
  { item: ItemType.IRON_BLOCK, min: 2, max: 5, chance: 0.7 },
  { item: ItemType.STONE_PICKAXE, min: 1, max: 1, chance: 0.45 },
  { item: ItemType.STONE_SWORD, min: 1, max: 1, chance: 0.45 },
  { item: ItemType.CHISELED_STONE, min: 2, max: 6, chance: 0.4 },
  { item: ItemType.TORCH, min: 2, max: 8, chance: 0.5 },
  { item: ItemType.DARK_PLANKS, min: 2, max: 6, chance: 0.3 },
];

let _logged = false;

export class StructureGenerator {
  private readonly chestManager: ChestManager | undefined;

  constructor(chestManager?: ChestManager) {
    this.chestManager = chestManager;
  }

  // ══════════ Terrain height from noise ══════════

  private terrainH(wx: number, wz: number): number {
    const hn = fbm2d(wx * 0.01, wz * 0.01, 5, 2.0, 0.45);
    const fl = fbm2d(wx * 0.005 + 100, wz * 0.005 + 100, 3);
    let h = Math.floor(BASE_H + hn * H_SCALE * (0.5 + fl * 0.8));
    const oc = this.ocean(wx, wz);
    const rv = this.river(wx, wz);
    if (oc < 1) { const f = 12 + Math.floor(oc * 10); h = Math.floor(f + (h - f) * oc); if (oc < 0.3) h = Math.min(h, 18); }
    if (rv < 1 && h >= SEA - 2) { const c = Math.floor(8 * (1 - rv)); const b = SEA - c; h = Math.min(h, Math.floor(b + (h - b) * rv)); }
    return Math.max(1, Math.min(h, WORLD_HEIGHT - 1));
  }

  private ocean(wx: number, wz: number): number {
    const n = fbm2d(wx * 0.0012, wz * 0.0012, 4, 2.0, 0.45);
    if (n < 0.38) return 0; if (n < 0.48) return (n - 0.38) / 0.1; return 1;
  }

  private river(wx: number, wz: number): number {
    const a = Math.abs(noise2d(wx * 0.003 + 300, wz * 0.003 + 300));
    const b = Math.abs(noise2d(wx * 0.0045 + 700, wz * 0.0045 - 200));
    const m = Math.min(a, b);
    if (m < 0.045) return 0; if (m < 0.07) return (m - 0.045) / 0.025; return 1;
  }

  // ══════════ Helpers ══════════

  private hash(x: number, z: number): number {
    let h = (x * 374761393 + z * 668265263 + 1234567) | 0;
    h = ((h ^ (h >> 13)) * 1274126177) | 0; return (h ^ (h >> 16)) >>> 0;
  }

  private rng(seed: number): RNG {
    let s = seed | 0;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  private set(c: Chunk, wx: number, wy: number, wz: number, t: BlockType): void {
    if (wy < 0 || wy >= WORLD_HEIGHT) return;
    const lx = wx - c.worldX, lz = wz - c.worldZ;
    if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) return;
    c.setBlock(lx, wy, lz, t);
  }

  private clear(c: Chunk, wx: number, wz: number, y0: number, y1: number): void {
    for (let y = y0; y <= y1; y++) this.set(c, wx, y, wz, BlockType.AIR);
  }

  private fillBox(c: Chunk, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, t: BlockType): void {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(c, x, y, z, t);
  }

  private hollowBox(c: Chunk, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, t: BlockType): void {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      if (x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1) this.set(c, x, y, z, t);
    }
  }

  private generateLoot(loot: LootEntry[], r: RNG): (ItemStack | null)[] {
    const slots: (ItemStack | null)[] = new Array(27).fill(null);
    let slotIdx = 0;
    for (const entry of loot) {
      if (slotIdx >= 27) break;
      if (r() < entry.chance) {
        const count = entry.min + Math.floor(r() * (entry.max - entry.min + 1));
        slots[slotIdx] = { itemType: entry.item, count };
        slotIdx++;
      }
    }
    // Scatter items randomly across slots
    for (let i = slotIdx - 1; i > 0; i--) {
      const j = Math.floor(r() * 27);
      if (!slots[j]) {
        slots[j] = slots[i];
        slots[i] = null;
      }
    }
    return slots;
  }

  private placeChest(c: Chunk, wx: number, wy: number, wz: number, loot: LootEntry[], r: RNG): void {
    this.set(c, wx, wy, wz, BlockType.CHEST);
    if (this.chestManager) {
      const items = this.generateLoot(loot, r);
      this.chestManager.registerChest(wx, wy, wz, items);
    }
  }

  // ══════════ Cell lookup ══════════

  private cellInfo(cx: number, cz: number): { type: SType; wx: number; wz: number; sy: number; seed: number } | null {
    const h = this.hash(cx * 7 + 1000, cz * 13 + 2000);
    if ((h % 10000) / 10000 >= CHANCE) return null;
    const seed = this.hash(cx * 31 + 5555, cz * 47 + 7777);
    const r = this.rng(seed);
    const m = 8, wx = cx * GRID + m + Math.floor(r() * (GRID - m * 2)), wz = cz * GRID + m + Math.floor(r() * (GRID - m * 2));
    if (this.ocean(wx, wz) < 0.85 || this.river(wx, wz) < 0.75) return null;
    const sy = this.terrainH(wx, wz);
    if (sy < SEA + 2) return null;
    const temp = fbm2d(wx * 0.003 + 500, wz * 0.003 + 500, 2);
    const roll = r();
    let type: SType;
    if (temp < 0.35) type = SType.TEMPLE;
    else if (roll < 0.25) type = SType.RUINS;
    else if (roll < 0.55) type = SType.VILLAGE;
    else type = SType.CASTLE;
    return { type, wx, wz, sy, seed };
  }

  // ══════════ Main ══════════

  generateStructures(chunk: Chunk): Bounds[] {
    const bounds: Bounds[] = [];
    const [cMX, cMZ, cXX, cXZ] = [chunk.worldX, chunk.worldZ, chunk.worldX + CHUNK_SIZE, chunk.worldZ + CHUNK_SIZE];
    const R = 40;
    const [xMin, xMax] = [Math.floor((cMX - R) / GRID), Math.floor((cXX + R) / GRID)];
    const [zMin, zMax] = [Math.floor((cMZ - R) / GRID), Math.floor((cXZ + R) / GRID)];
    for (let cx = xMin; cx <= xMax; cx++) for (let cz = zMin; cz <= zMax; cz++) {
      const info = this.cellInfo(cx, cz);
      if (!info) continue;
      if (!_logged) { console.log(`%c🏰 Structure: type=${info.type} at (${info.wx}, ${info.sy}, ${info.wz})`, 'color:#FF9800;font-size:12px'); _logged = true; }
      let b: Bounds | null = null;
      switch (info.type) {
        case SType.RUINS: b = this.genRuins(chunk, info.wx, info.sy, info.wz, info.seed); break;
        case SType.VILLAGE: b = this.genVillage(chunk, info.wx, info.sy, info.wz, info.seed); break;
        case SType.CASTLE: b = this.genCastle(chunk, info.wx, info.sy, info.wz, info.seed); break;
        case SType.TEMPLE: b = this.genTemple(chunk, info.wx, info.sy, info.wz, info.seed); break;
      }
      if (b) bounds.push(b);
    }
    return bounds;
  }

  /** Find the nearest structure of a given type from a world position. Searches in expanding rings. */
  findNearest(px: number, pz: number, typeName: StructureTypeName): StructureLocation | null {
    const target = STYPE_MAP[typeName];
    const pcx = Math.floor(px / GRID);
    const pcz = Math.floor(pz / GRID);
    let best: StructureLocation | null = null;
    let bestDist = Infinity;

    const MAX_RING = 50;
    for (let ring = 0; ring <= MAX_RING; ring++) {
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dz = -ring; dz <= ring; dz++) {
          if (Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue;
          const info = this.cellInfo(pcx + dx, pcz + dz);
          if (!info || info.type !== target) continue;
          const dist = Math.sqrt((info.wx - px) ** 2 + (info.wz - pz) ** 2);
          if (dist < bestDist) {
            bestDist = dist;
            best = { type: typeName, wx: info.wx, wy: info.sy, wz: info.wz, dist };
          }
        }
      }
      if (best) return best;
    }
    return best;
  }

  // ═══════════════════════ RUINS ═══════════════════════

  private genRuins(c: Chunk, ax: number, ay: number, az: number, seed: number): Bounds {
    const S = 14, r = this.rng(seed + 100);
    const bounds: Bounds = { minX: ax - 1, minZ: az - 1, maxX: ax + S + 1, maxZ: az + S + 1 };

    // Floor remnants with mixed materials
    for (let dx = 0; dx < S; dx++) for (let dz = 0; dz < S; dz++) {
      if (r() < 0.45) {
        const roll = r();
        const block = roll < 0.35 ? BlockType.MOSSY_COBBLESTONE : roll < 0.65 ? BlockType.COBBLESTONE : BlockType.STONE_BRICKS;
        this.set(c, ax + dx, ay, az + dz, block);
      }
    }

    // Partial walls with varying height and decay
    const walls = [
      { sx: 0, sz: 0, dx: 1, dz: 0 }, { sx: 0, sz: S - 1, dx: 1, dz: 0 },
      { sx: 0, sz: 0, dx: 0, dz: 1 }, { sx: S - 1, sz: 0, dx: 0, dz: 1 },
    ];
    for (const w of walls) {
      if (r() < 0.15) continue;
      for (let i = 0; i < S; i++) {
        if (r() < 0.2) continue;
        const wx = ax + w.sx + w.dx * i, wz = az + w.sz + w.dz * i;
        const h = 1 + Math.floor(r() * 4);
        for (let dy = 1; dy <= h; dy++) {
          const roll = r();
          this.set(c, wx, ay + dy, wz,
            roll < 0.5 ? BlockType.MOSSY_COBBLESTONE : roll < 0.8 ? BlockType.STONE_BRICKS : BlockType.COBBLESTONE);
        }
      }
    }

    // Collapsed pillars (2-3 random positions)
    const pillars = 2 + Math.floor(r() * 2);
    for (let p = 0; p < pillars; p++) {
      const px = ax + 2 + Math.floor(r() * (S - 4));
      const pz = az + 2 + Math.floor(r() * (S - 4));
      const ph = 2 + Math.floor(r() * 3);
      for (let dy = 1; dy <= ph; dy++) {
        this.set(c, px, ay + dy, pz, BlockType.STONE_BRICKS);
      }
      // Fallen blocks around pillar
      if (r() < 0.6) this.set(c, px + 1, ay + 1, pz, BlockType.MOSSY_COBBLESTONE);
      if (r() < 0.4) this.set(c, px, ay + 1, pz + 1, BlockType.COBBLESTONE);
    }

    // Hidden treasure area
    if (r() < 0.6) {
      const tx = ax + Math.floor(S / 2), tz = az + Math.floor(S / 2);
      this.set(c, tx, ay, tz, BlockType.CHISELED_STONE);
      // Buried chest below floor
      this.set(c, tx, ay - 1, tz, BlockType.AIR);
      this.placeChest(c, tx, ay - 1, tz, LOOT_RUINS, r);
      // Camouflage with surrounding stone
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        this.set(c, tx + dx, ay - 1, tz + dz, BlockType.MOSSY_COBBLESTONE);
      }
    }

    // Second hidden chest among rubble
    if (r() < 0.4) {
      const rx = ax + 1 + Math.floor(r() * (S - 2));
      const rz = az + 1 + Math.floor(r() * (S - 2));
      this.placeChest(c, rx, ay + 1, rz, LOOT_RUINS, r);
    }

    // Vegetation overgrowth
    for (let dx = 0; dx < S; dx++) for (let dz = 0; dz < S; dz++) {
      if (r() < 0.12) this.set(c, ax + dx, ay + 1, az + dz, BlockType.TALL_GRASS);
      if (r() < 0.02) this.set(c, ax + dx, ay + 1, az + dz, BlockType.FLOWER_RED);
    }

    return bounds;
  }

  // ═══════════════════════ VILLAGE ═══════════════════════

  private genVillage(c: Chunk, ax: number, ay: number, az: number, seed: number): Bounds {
    const RAD = 28, r = this.rng(seed + 200);
    const bounds: Bounds = { minX: ax - RAD, minZ: az - RAD, maxX: ax + RAD, maxZ: az + RAD };

    // Well at center
    this.buildWell(c, ax, ay, az);

    // Cobblestone paths (cross + ring)
    for (let i = -RAD; i <= RAD; i++) {
      for (let w = -1; w <= 1; w++) {
        const hx = this.terrainH(ax + i, az + w); this.set(c, ax + i, hx, az + w, BlockType.COBBLESTONE);
        const hz = this.terrainH(ax + w, az + i); this.set(c, ax + w, hz, az + i, BlockType.COBBLESTONE);
      }
    }

    // Lamp posts along paths
    for (let i = -RAD; i <= RAD; i += 6) {
      for (const side of [-3, 3]) {
        const lh = this.terrainH(ax + i, az + side);
        if (lh >= SEA + 1) {
          this.set(c, ax + i, lh + 1, az + side, BlockType.WOOD);
          this.set(c, ax + i, lh + 2, az + side, BlockType.WOOD);
          this.set(c, ax + i, lh + 3, az + side, BlockType.TORCH);
        }
        const lv = this.terrainH(ax + side, az + i);
        if (lv >= SEA + 1) {
          this.set(c, ax + side, lv + 1, az + i, BlockType.WOOD);
          this.set(c, ax + side, lv + 2, az + i, BlockType.WOOD);
          this.set(c, ax + side, lv + 3, az + i, BlockType.TORCH);
        }
      }
    }

    // Houses (4-6)
    const houseCount = 4 + Math.floor(r() * 3);
    const placed: Array<[number, number]> = [];

    for (let h = 0; h < houseCount; h++) {
      const angle = (h / houseCount) * Math.PI * 2 + r() * 0.4;
      const dist = 9 + Math.floor(r() * 9);
      const hx = ax + Math.floor(Math.cos(angle) * dist);
      const hz = az + Math.floor(Math.sin(angle) * dist);
      let skip = false;
      for (const [px, pz] of placed) { if ((hx - px) ** 2 + (hz - pz) ** 2 < 100) { skip = true; break; } }
      if (skip) continue;
      const hsy = this.terrainH(hx, hz);
      if (hsy < SEA + 1) continue;
      placed.push([hx, hz]);

      // 30% chance of library, otherwise normal house
      if (r() < 0.3 && placed.length <= 2) {
        this.buildLibrary(c, hx, hsy, hz, r);
      } else {
        this.buildHouse(c, hx, hsy, hz, r);
      }
    }

    // Farm area near village
    const farmX = ax + 15 + Math.floor(r() * 6);
    const farmZ = az + 5 + Math.floor(r() * 6);
    const farmSY = this.terrainH(farmX, farmZ);
    if (farmSY >= SEA + 1) this.buildFarm(c, farmX, farmSY, farmZ, r);

    return bounds;
  }

  private buildWell(c: Chunk, wx: number, sy: number, wz: number): void {
    // 5x5 cobblestone platform
    this.fillBox(c, wx - 2, sy, wz - 2, wx + 2, sy, wz + 2, BlockType.COBBLESTONE);
    // Ring walls
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) {
        for (let dy = -4; dy <= 0; dy++) this.set(c, wx, sy + dy, wz, BlockType.WATER);
      } else {
        this.set(c, wx + dx, sy + 1, wz + dz, BlockType.COBBLESTONE);
        this.set(c, wx + dx, sy + 2, wz + dz, BlockType.COBBLESTONE);
      }
    }
    // Corner pillars + roof
    for (const [dx, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      this.set(c, wx + dx, sy + 3, wz + dz, BlockType.WOOD);
    }
    this.fillBox(c, wx - 1, sy + 4, wz - 1, wx + 1, sy + 4, wz + 1, BlockType.DARK_PLANKS);
  }

  private buildHouse(c: Chunk, wx: number, sy: number, wz: number, r: RNG): void {
    const w = 3 + Math.floor(r() * 2), d = 3 + Math.floor(r() * 2), wH = 4;
    const useDark = r() < 0.4;
    const roofBlock = useDark ? BlockType.DARK_PLANKS : BlockType.PLANKS;

    // Clear + foundation
    for (let dx = -w - 1; dx <= w + 1; dx++) for (let dz = -d - 1; dz <= d + 1; dz++)
      this.clear(c, wx + dx, wz + dz, sy + 1, sy + wH + w + 3);
    this.fillBox(c, wx - w, sy, wz - d, wx + w, sy, wz + d, BlockType.COBBLESTONE);

    // Walls
    for (let dy = 1; dy <= wH; dy++) for (let dx = -w; dx <= w; dx++) for (let dz = -d; dz <= d; dz++) {
      const eX = dx === -w || dx === w, eZ = dz === -d || dz === d;
      if (!eX && !eZ) continue;
      if (dz === -d && dx === 0 && dy <= 2) continue; // door
      if (dy === 2 && ((eX && !eZ && dz % 2 === 0) || (eZ && !eX && dx % 2 === 0))) {
        this.set(c, wx + dx, sy + dy, wz + dz, BlockType.GLASS); continue;
      }
      this.set(c, wx + dx, sy + dy, wz + dz, dy <= 1 ? BlockType.COBBLESTONE : BlockType.PLANKS);
    }

    // Roof
    for (let layer = 0; layer <= w; layer++) {
      const ry = sy + wH + 1 + layer, rW = w - layer;
      if (rW < 0) break;
      for (let dx = -rW; dx <= rW; dx++) for (let dz = -d - 1; dz <= d + 1; dz++)
        this.set(c, wx + dx, ry, wz + dz, roofBlock);
      if (layer > 0 && rW > 0) for (let dx = -rW + 1; dx < rW; dx++) for (let dz = -d; dz <= d; dz++)
        this.set(c, wx + dx, ry, wz + dz, BlockType.AIR);
    }

    // Interior furniture
    // Table + torch
    this.set(c, wx, sy + 1, wz, BlockType.PLANKS);
    this.set(c, wx, sy + 2, wz, BlockType.TORCH);
    // Bed (wool block at one side)
    this.set(c, wx + w - 1, sy + 1, wz + d - 1, BlockType.WOOL_RED);
    this.set(c, wx + w - 1, sy + 1, wz + d - 2, BlockType.PLANKS);
    // Crafting table
    if (w >= 3) this.set(c, wx - w + 1, sy + 1, wz + d - 1, BlockType.CRAFTING_TABLE);
    // Supply chest
    this.placeChest(c, wx - w + 1, sy + 1, wz - d + 1, LOOT_VILLAGE, r);
  }

  private buildLibrary(c: Chunk, wx: number, sy: number, wz: number, r: RNG): void {
    const w = 4, d = 4, wH = 5;

    // Clear + foundation
    for (let dx = -w - 1; dx <= w + 1; dx++) for (let dz = -d - 1; dz <= d + 1; dz++)
      this.clear(c, wx + dx, wz + dz, sy + 1, sy + wH + w + 3);
    this.fillBox(c, wx - w, sy, wz - d, wx + w, sy, wz + d, BlockType.STONE_BRICKS);

    // Stone brick walls
    for (let dy = 1; dy <= wH; dy++) for (let dx = -w; dx <= w; dx++) for (let dz = -d; dz <= d; dz++) {
      const eX = dx === -w || dx === w, eZ = dz === -d || dz === d;
      if (!eX && !eZ) continue;
      if (dz === -d && dx === 0 && dy <= 2) continue; // door
      if (dy === 3 && ((eX && !eZ && Math.abs(dz) <= d - 2) || (eZ && !eX && Math.abs(dx) <= w - 2))) {
        this.set(c, wx + dx, sy + dy, wz + dz, BlockType.GLASS); continue;
      }
      this.set(c, wx + dx, sy + dy, wz + dz, BlockType.STONE_BRICKS);
    }

    // Dark plank roof (flat)
    this.fillBox(c, wx - w, sy + wH + 1, wz - d, wx + w, sy + wH + 1, wz + d, BlockType.DARK_PLANKS);

    // Bookshelves lining inside walls (skip door area on front wall)
    for (let dy = 1; dy <= 3; dy++) {
      for (let dx = -w + 1; dx <= w - 1; dx++) {
        this.set(c, wx + dx, sy + dy, wz + d - 1, BlockType.BOOKSHELF);
        // Front wall: leave 3-block opening for the door
        if (Math.abs(dx) > 1) {
          this.set(c, wx + dx, sy + dy, wz - d + 1, BlockType.BOOKSHELF);
        }
      }
      for (let dz = -d + 2; dz <= d - 2; dz++) {
        this.set(c, wx + w - 1, sy + dy, wz + dz, BlockType.BOOKSHELF);
        this.set(c, wx - w + 1, sy + dy, wz + dz, BlockType.BOOKSHELF);
      }
    }

    // Reading table + torches
    this.set(c, wx, sy + 1, wz, BlockType.DARK_PLANKS);
    this.set(c, wx, sy + 2, wz, BlockType.TORCH);
    this.set(c, wx - 1, sy + 1, wz, BlockType.DARK_PLANKS);
    this.set(c, wx + 1, sy + 1, wz, BlockType.DARK_PLANKS);
    // Wall torches
    this.set(c, wx, sy + 3, wz + d - 2, BlockType.TORCH);
    this.set(c, wx, sy + 3, wz - d + 2, BlockType.TORCH);
    // Library chest with materials
    this.placeChest(c, wx - w + 2, sy + 1, wz, LOOT_VILLAGE, r);
  }

  private buildFarm(c: Chunk, wx: number, sy: number, wz: number, r: RNG): void {
    // 8x6 farm plot
    for (let dx = 0; dx < 8; dx++) for (let dz = 0; dz < 6; dz++) {
      this.set(c, wx + dx, sy, wz + dz, BlockType.DIRT);
      if (dz % 2 === 0) this.set(c, wx + dx, sy + 1, wz + dz, BlockType.TALL_GRASS);
    }
    // Fence posts (wood around)
    for (let dx = -1; dx <= 8; dx++) {
      this.set(c, wx + dx, sy + 1, wz - 1, BlockType.WOOD);
      this.set(c, wx + dx, sy + 1, wz + 6, BlockType.WOOD);
    }
    for (let dz = 0; dz < 6; dz++) {
      this.set(c, wx - 1, sy + 1, wz + dz, BlockType.WOOD);
      this.set(c, wx + 8, sy + 1, wz + dz, BlockType.WOOD);
    }
    // Tool chest near farm entrance
    this.placeChest(c, wx - 1, sy + 1, wz - 2, LOOT_VILLAGE, r);
  }

  // ═══════════════════════ CASTLE ═══════════════════════

  private genCastle(c: Chunk, ax: number, ay: number, az: number, seed: number): Bounds {
    const HALF = 14, r = this.rng(seed + 300);
    const bounds: Bounds = { minX: ax - HALF - 2, minZ: az - HALF - 2, maxX: ax + HALF + 2, maxZ: az + HALF + 2 };
    const wallH = 7, towerH = 12 + Math.floor(r() * 4), tS = 5;

    // Flatten + courtyard
    for (let dx = -HALF; dx <= HALF; dx++) for (let dz = -HALF; dz <= HALF; dz++) {
      const lh = this.terrainH(ax + dx, az + dz);
      if (lh < ay) for (let y = lh; y <= ay; y++) this.set(c, ax + dx, y, az + dz, BlockType.STONE_BRICKS);
      this.clear(c, ax + dx, az + dz, ay + 1, ay + towerH + 8);
      this.set(c, ax + dx, ay, az + dz, BlockType.STONE_BRICKS);
    }

    // Outer walls with arrow slits
    for (let dy = 1; dy <= wallH; dy++) for (let dx = -HALF; dx <= HALF; dx++) for (let dz = -HALF; dz <= HALF; dz++) {
      const eX = dx === -HALF || dx === HALF, eZ = dz === -HALF || dz === HALF;
      if (!eX && !eZ) continue;
      if (dz === -HALF && Math.abs(dx) <= 2 && dy <= 4) continue; // gate
      // Arrow slits every 4 blocks
      if (dy === 4 && ((eX && dz % 4 === 0) || (eZ && dx % 4 === 0))) {
        this.set(c, ax + dx, ay + dy, az + dz, BlockType.AIR); continue;
      }
      this.set(c, ax + dx, ay + dy, az + dz, BlockType.STONE_BRICKS);
    }

    // Wall walkway (planks on top of wall)
    for (let dx = -HALF; dx <= HALF; dx++) for (let dz = -HALF; dz <= HALF; dz++) {
      const eX = dx === -HALF || dx === HALF, eZ = dz === -HALF || dz === HALF;
      const eX1 = Math.abs(dx) >= HALF - 1, eZ1 = Math.abs(dz) >= HALF - 1;
      if (eX1 || eZ1) {
        this.set(c, ax + dx, ay + wallH + 1, az + dz, BlockType.STONE_BRICKS);
      }
      // Crenellations on outer edge only
      if ((eX || eZ) && (Math.abs(dx) + Math.abs(dz)) % 2 === 0) {
        this.set(c, ax + dx, ay + wallH + 2, az + dz, BlockType.STONE_BRICKS);
      }
    }

    // Gate arch
    for (let dx = -2; dx <= 2; dx++) {
      this.set(c, ax + dx, ay + 5, az - HALF, BlockType.STONE_BRICKS);
    }
    // Gate torches
    this.set(c, ax - 3, ay + 4, az - HALF, BlockType.TORCH);
    this.set(c, ax + 3, ay + 4, az - HALF, BlockType.TORCH);

    // 4 corner towers
    const corners = [[-HALF, -HALF], [-HALF, HALF], [HALF, -HALF], [HALF, HALF]];
    for (const [cx, cz] of corners) {
      const ox = cx > 0 ? -tS + 1 : 0, oz = cz > 0 ? -tS + 1 : 0;
      // Tower shell
      for (let dy = 1; dy <= towerH; dy++) for (let tx = 0; tx < tS; tx++) for (let tz = 0; tz < tS; tz++) {
        const twx = ax + cx + ox + tx, twz = az + cz + oz + tz;
        const edge = tx === 0 || tx === tS - 1 || tz === 0 || tz === tS - 1;
        if (edge) {
          this.set(c, twx, ay + dy, twz, BlockType.STONE_BRICKS);
        } else if (dy < towerH) {
          this.set(c, twx, ay + dy, twz, BlockType.AIR);
        }
      }
      // Tower top crenellations
      for (let tx = 0; tx < tS; tx++) for (let tz = 0; tz < tS; tz++) {
        const twx = ax + cx + ox + tx, twz = az + cz + oz + tz;
        const edge = tx === 0 || tx === tS - 1 || tz === 0 || tz === tS - 1;
        if (edge) {
          this.set(c, twx, ay + towerH + 1, twz, BlockType.STONE_BRICKS);
          if ((tx + tz) % 2 === 0) this.set(c, twx, ay + towerH + 2, twz, BlockType.STONE_BRICKS);
        }
      }
      // Spiral staircase inside tower
      for (let dy = 1; dy < towerH; dy++) {
        const step = dy % 4;
        const sx = ox + 1 + (step === 0 || step === 3 ? 0 : (step === 1 ? 1 : 2));
        const sz = oz + 1 + (step === 0 ? 0 : (step === 1 || step === 2 ? 0 : 1));
        const stx = Math.min(tS - 2, Math.max(1, sx));
        const stz = Math.min(tS - 2, Math.max(1, sz));
        this.set(c, ax + cx + stx, ay + dy, az + cz + stz, BlockType.COBBLESTONE);
      }
      // Tower torch
      this.set(c, ax + cx + ox + Math.floor(tS / 2), ay + 3, az + cz + oz + Math.floor(tS / 2), BlockType.TORCH);
    }

    // Central keep
    const kH = 4, keepH = towerH + 5;
    for (let dy = 1; dy <= keepH; dy++) for (let dx = -kH; dx <= kH; dx++) for (let dz = -kH; dz <= kH; dz++) {
      const eX = dx === -kH || dx === kH, eZ = dz === -kH || dz === kH;
      if (eX || eZ) {
        if ((dy === 3 || dy === 7 || dy === 11) && ((dx === 0 && eZ) || (dz === 0 && eX))) {
          this.set(c, ax + dx, ay + dy, az + dz, BlockType.GLASS); continue;
        }
        if (dz === -kH && dx === 0 && dy <= 3) continue; // door
        this.set(c, ax + dx, ay + dy, az + dz, BlockType.STONE_BRICKS);
      }
    }

    // Keep floors
    this.fillBox(c, ax - kH + 1, ay + 5, az - kH + 1, ax + kH - 1, ay + 5, az + kH - 1, BlockType.DARK_PLANKS);
    this.fillBox(c, ax - kH + 1, ay + 9, az - kH + 1, ax + kH - 1, ay + 9, az + kH - 1, BlockType.DARK_PLANKS);
    this.fillBox(c, ax - kH + 1, ay + 13, az - kH + 1, ax + kH - 1, ay + 13, az + kH - 1, BlockType.DARK_PLANKS);

    // Keep top
    this.fillBox(c, ax - kH, ay + keepH + 1, az - kH, ax + kH, ay + keepH + 1, az + kH, BlockType.STONE_BRICKS);
    for (let dx = -kH; dx <= kH; dx++) for (let dz = -kH; dz <= kH; dz++) {
      const eX = dx === -kH || dx === kH, eZ = dz === -kH || dz === kH;
      if ((eX || eZ) && (dx + dz + 100) % 2 === 0) this.set(c, ax + dx, ay + keepH + 2, az + dz, BlockType.STONE_BRICKS);
    }

    // ── Staircase along east wall of keep (connects all floors) ──
    const stairX = ax + kH - 1;
    for (let floor = 0; floor < 3; floor++) {
      const baseY = ay + 1 + floor * 4;
      const targetY = baseY + 4;
      for (let step = 0; step < 4; step++) {
        const sz = -kH + 1 + step;
        this.set(c, stairX, baseY + step, az + sz, BlockType.COBBLESTONE);
        // Clear above stairs
        this.set(c, stairX, baseY + step + 1, az + sz, BlockType.AIR);
        this.set(c, stairX, baseY + step + 2, az + sz, BlockType.AIR);
      }
      // Stair hole in floor above
      for (let step = 0; step < 4; step++) {
        this.set(c, stairX, targetY, az - kH + 1 + step, BlockType.AIR);
      }
    }

    // ── Floor 1: Throne room (ground floor) ──
    // Red carpet replaces floor down the center
    for (let dz = -kH + 1; dz <= kH - 1; dz++) this.set(c, ax, ay, az + dz, BlockType.WOOL_RED);
    // Throne (back wall)
    this.set(c, ax, ay + 1, az + kH - 1, BlockType.CHISELED_STONE);
    this.set(c, ax, ay + 2, az + kH - 1, BlockType.WOOL_RED);
    this.set(c, ax - 1, ay + 1, az + kH - 1, BlockType.STONE_BRICKS);
    this.set(c, ax + 1, ay + 1, az + kH - 1, BlockType.STONE_BRICKS);
    // Throne room chest (behind throne)
    this.placeChest(c, ax + 2, ay + 1, az + kH - 1, LOOT_CASTLE, r);
    // Torches
    this.set(c, ax - kH + 1, ay + 3, az + kH - 1, BlockType.TORCH);
    this.set(c, ax + kH - 1, ay + 3, az + kH - 1, BlockType.TORCH);
    this.set(c, ax - kH + 1, ay + 3, az - kH + 1, BlockType.TORCH);
    this.set(c, ax + kH - 1, ay + 3, az - kH + 1, BlockType.TORCH);
    // Banners (wool columns)
    for (const sx of [-kH + 1, kH - 1]) {
      this.set(c, ax + sx, ay + 3, az, BlockType.WOOL_RED);
      this.set(c, ax + sx, ay + 4, az, BlockType.WOOL_RED);
    }

    // ── Floor 2: Library ──
    for (let dx = -kH + 1; dx <= kH - 2; dx++) {
      this.set(c, ax + dx, ay + 6, az + kH - 1, BlockType.BOOKSHELF);
      this.set(c, ax + dx, ay + 7, az + kH - 1, BlockType.BOOKSHELF);
      this.set(c, ax + dx, ay + 6, az - kH + 1, BlockType.BOOKSHELF);
      this.set(c, ax + dx, ay + 7, az - kH + 1, BlockType.BOOKSHELF);
    }
    // Reading tables
    this.set(c, ax, ay + 6, az, BlockType.DARK_PLANKS);
    this.set(c, ax - 1, ay + 6, az, BlockType.DARK_PLANKS);
    this.set(c, ax + 1, ay + 6, az, BlockType.DARK_PLANKS);
    this.set(c, ax, ay + 7, az, BlockType.TORCH);
    // Library chest
    this.placeChest(c, ax - kH + 1, ay + 6, az, LOOT_CASTLE, r);
    // Wall torches
    this.set(c, ax, ay + 7, az + kH - 2, BlockType.TORCH);
    this.set(c, ax, ay + 7, az - kH + 2, BlockType.TORCH);

    // ── Floor 3: Armory ──
    // Weapon racks along walls (wood + sticks pattern)
    for (let dz = -kH + 2; dz <= kH - 2; dz += 2) {
      this.set(c, ax - kH + 1, ay + 10, az + dz, BlockType.PLANKS);
      this.set(c, ax - kH + 1, ay + 11, az + dz, BlockType.WOOD);
    }
    // Armor stands (wool mannequins)
    for (let dz = -2; dz <= 2; dz += 2) {
      this.set(c, ax - kH + 2, ay + 10, az + dz, BlockType.COBBLESTONE);
      this.set(c, ax - kH + 2, ay + 11, az + dz, BlockType.WOOL_RED);
      this.set(c, ax - kH + 2, ay + 12, az + dz, BlockType.IRON_BLOCK);
    }
    // Central table
    this.set(c, ax, ay + 10, az, BlockType.DARK_PLANKS);
    this.set(c, ax - 1, ay + 10, az, BlockType.DARK_PLANKS);
    this.set(c, ax, ay + 11, az, BlockType.TORCH);
    // Armory chests
    this.placeChest(c, ax + 1, ay + 10, az + kH - 2, LOOT_CASTLE, r);
    this.placeChest(c, ax - 1, ay + 10, az + kH - 2, LOOT_CASTLE, r);
    // Torches
    this.set(c, ax - kH + 1, ay + 12, az + kH - 1, BlockType.TORCH);
    this.set(c, ax - kH + 1, ay + 12, az - kH + 1, BlockType.TORCH);
    this.set(c, ax + kH - 2, ay + 12, az + kH - 1, BlockType.TORCH);
    this.set(c, ax + kH - 2, ay + 12, az - kH + 1, BlockType.TORCH);

    // ── Floor 4: Royal bedroom ──
    // Bed
    this.set(c, ax + kH - 2, ay + 14, az + kH - 2, BlockType.WOOL_RED);
    this.set(c, ax + kH - 2, ay + 14, az + kH - 3, BlockType.WOOL_RED);
    this.set(c, ax + kH - 3, ay + 14, az + kH - 2, BlockType.PLANKS);
    this.set(c, ax + kH - 3, ay + 14, az + kH - 3, BlockType.PLANKS);
    // Nightstand + torch
    this.set(c, ax + kH - 2, ay + 14, az + kH - 4, BlockType.DARK_PLANKS);
    this.set(c, ax + kH - 2, ay + 15, az + kH - 4, BlockType.TORCH);
    // Desk
    this.set(c, ax - kH + 2, ay + 14, az - kH + 2, BlockType.DARK_PLANKS);
    this.set(c, ax - kH + 3, ay + 14, az - kH + 2, BlockType.DARK_PLANKS);
    this.set(c, ax - kH + 2, ay + 15, az - kH + 2, BlockType.TORCH);
    // Carpet center
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      this.set(c, ax + dx, ay + 14, az + dz, BlockType.WOOL_RED);
    }
    // Royal chest
    this.placeChest(c, ax - kH + 2, ay + 14, az + kH - 2, LOOT_CASTLE, r);
    // Torches
    this.set(c, ax - kH + 1, ay + 16, az + kH - 1, BlockType.TORCH);
    this.set(c, ax + kH - 2, ay + 16, az - kH + 1, BlockType.TORCH);
    this.set(c, ax - kH + 1, ay + 16, az - kH + 1, BlockType.TORCH);
    this.set(c, ax + kH - 2, ay + 16, az + kH - 1, BlockType.TORCH);

    return bounds;
  }

  // ═══════════════════════ DESERT TEMPLE ═══════════════════════

  private genTemple(c: Chunk, ax: number, ay: number, az: number, seed: number): Bounds {
    const HALF = 11, r = this.rng(seed + 400);
    const bounds: Bounds = { minX: ax - HALF - 2, minZ: az - HALF - 2, maxX: ax + HALF + 2, maxZ: az + HALF + 2 };
    const levels = 4 + Math.floor(r() * 2);

    // Clear above
    for (let dx = -HALF - 2; dx <= HALF + 2; dx++) for (let dz = -HALF - 2; dz <= HALF + 2; dz++)
      this.clear(c, ax + dx, az + dz, ay + 1, ay + levels * 3 + 8);

    // Stepped pyramid
    for (let lv = 0; lv < levels; lv++) {
      const lH = HALF - lv * 2;
      if (lH < 2) break;
      const by = ay + lv * 3;

      for (let dy = 0; dy < 3; dy++) for (let dx = -lH; dx <= lH; dx++) for (let dz = -lH; dz <= lH; dz++) {
        const eX = dx === -lH || dx === lH, eZ = dz === -lH || dz === lH;

        if (lv === 0 && dy === 0) {
          this.set(c, ax + dx, by, az + dz, r() < 0.3 ? BlockType.CHISELED_STONE : BlockType.SAND);
        } else if (eX || eZ) {
          // Decorative pattern: alternating with chiseled stone at corners
          const isCorner = eX && eZ;
          if (isCorner) {
            this.set(c, ax + dx, by + dy, az + dz, BlockType.CHISELED_STONE);
          } else {
            this.set(c, ax + dx, by + dy, az + dz, (lv + dy) % 2 === 0 ? BlockType.SAND : BlockType.COBBLESTONE);
          }
        } else if (dy === 0) {
          this.set(c, ax + dx, by, az + dz, BlockType.COBBLESTONE);
        }
      }
    }

    // Top platform + obelisk
    const topH = HALF - levels * 2, topY = ay + levels * 3;
    if (topH >= 1) {
      this.fillBox(c, ax - topH, topY, az - topH, ax + topH, topY, az + topH, BlockType.CHISELED_STONE);
      for (let dy = 1; dy <= 4; dy++) this.set(c, ax, topY + dy, az, BlockType.CHISELED_STONE);
    }

    // Grand entrance (front face)
    for (let dy = 1; dy <= 3; dy++) for (let dx = -1; dx <= 1; dx++)
      this.set(c, ax + dx, ay + dy, az - HALF, BlockType.AIR);
    // Entrance columns
    for (let dy = 0; dy <= 4; dy++) {
      this.set(c, ax - 3, ay + dy, az - HALF - 1, BlockType.CHISELED_STONE);
      this.set(c, ax + 3, ay + dy, az - HALF - 1, BlockType.CHISELED_STONE);
    }
    this.fillBox(c, ax - 3, ay + 5, az - HALF - 1, ax + 3, ay + 5, az - HALF - 1, BlockType.COBBLESTONE);
    // Entrance torches
    this.set(c, ax - 3, ay + 5, az - HALF - 1, BlockType.TORCH);
    this.set(c, ax + 3, ay + 5, az - HALF - 1, BlockType.TORCH);

    // Interior: central altar
    this.set(c, ax, ay + 1, az, BlockType.CHISELED_STONE);
    this.set(c, ax, ay + 2, az, BlockType.TORCH);
    // Decorative inner pillars (taller)
    for (const [px, pz] of [[-3, -3], [-3, 3], [3, -3], [3, 3]]) {
      for (let dy = 1; dy <= 2; dy++) this.set(c, ax + px, ay + dy, az + pz, BlockType.CHISELED_STONE);
      this.set(c, ax + px, ay + 3, az + pz, BlockType.TORCH);
    }
    // Side alcoves with offerings
    for (const [sx, sz] of [[-5, 0], [5, 0], [0, 5]]) {
      this.set(c, ax + sx, ay + 1, az + sz, BlockType.CHISELED_STONE);
      this.set(c, ax + sx, ay + 2, az + sz, BlockType.IRON_BLOCK);
    }
    // Interior torches
    this.set(c, ax - 4, ay + 2, az, BlockType.TORCH);
    this.set(c, ax + 4, ay + 2, az, BlockType.TORCH);
    this.set(c, ax, ay + 2, az + 4, BlockType.TORCH);
    this.set(c, ax, ay + 2, az - 4, BlockType.TORCH);

    // ── Underground treasure chamber ──
    const chamberY = ay - 6;
    // Dig chamber (larger)
    this.fillBox(c, ax - 5, chamberY, az - 5, ax + 5, chamberY + 4, az + 5, BlockType.AIR);
    // Chamber walls
    this.hollowBox(c, ax - 6, chamberY - 1, az - 6, ax + 6, chamberY + 5, az + 6, BlockType.COBBLESTONE);
    // Chamber floor with decorative pattern
    for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
      const pattern = (Math.abs(dx) + Math.abs(dz)) % 2 === 0;
      this.set(c, ax + dx, chamberY - 1, az + dz, pattern ? BlockType.CHISELED_STONE : BlockType.COBBLESTONE);
    }
    // Central altar in chamber
    this.set(c, ax, chamberY, az, BlockType.CHISELED_STONE);
    this.set(c, ax, chamberY + 1, az, BlockType.CHISELED_STONE);
    this.set(c, ax, chamberY + 2, az, BlockType.TORCH);
    // Treasure chests in corners
    this.placeChest(c, ax - 4, chamberY, az - 4, LOOT_TEMPLE, r);
    this.placeChest(c, ax + 4, chamberY, az - 4, LOOT_TEMPLE, r);
    this.placeChest(c, ax - 4, chamberY, az + 4, LOOT_TEMPLE, r);
    this.placeChest(c, ax + 4, chamberY, az + 4, LOOT_TEMPLE, r);
    // Sand traps around chests
    for (const [cx, cz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        this.set(c, ax + cx + dx, chamberY - 1, az + cz + dz, BlockType.SAND);
      }
    }
    // Chamber torches
    this.set(c, ax - 5, chamberY + 2, az - 5, BlockType.TORCH);
    this.set(c, ax + 5, chamberY + 2, az - 5, BlockType.TORCH);
    this.set(c, ax - 5, chamberY + 2, az + 5, BlockType.TORCH);
    this.set(c, ax + 5, chamberY + 2, az + 5, BlockType.TORCH);
    this.set(c, ax, chamberY + 3, az - 5, BlockType.TORCH);
    this.set(c, ax, chamberY + 3, az + 5, BlockType.TORCH);
    // Stairway shaft down from center of base level
    for (let dy = 0; dy >= -6; dy--) {
      this.set(c, ax, ay + dy, az, BlockType.AIR);
      this.set(c, ax + 1, ay + dy, az, BlockType.AIR);
    }
    // Stair steps down
    for (let step = 0; step < 6; step++) {
      this.set(c, ax + 1, ay - step, az, BlockType.COBBLESTONE);
    }

    return bounds;
  }
}
