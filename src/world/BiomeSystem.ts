import { BlockType } from '../blocks/BlockTypes';
import { fbm2d } from '../utils/noise';

export enum Biome {
  PLAINS = 0,
  FOREST = 1,
  DESERT = 2,
  TAIGA = 3,
  JUNGLE = 4,
  SWAMP = 5,
  SAVANNA = 6,
  MOUNTAINS = 7,
}

export type TreeType = 'oak' | 'birch' | 'spruce' | 'jungle' | 'acacia' | 'swamp_oak';

export interface VegetationEntry {
  readonly type: BlockType;
  readonly chance: number;
}

export interface BiomeConfig {
  readonly name: string;
  readonly surfaceBlock: BlockType;
  readonly subsurfaceBlock: BlockType;
  readonly deepBlock: BlockType;
  readonly treeType: TreeType;
  readonly treeDensity: number;
  readonly vegetation: readonly VegetationEntry[];
  readonly heightModifier: number;
  readonly fogColor: readonly [number, number, number];
  readonly fogDensity: number;
  readonly waterColor: readonly [number, number, number];
  readonly grassTint: readonly [number, number, number];
  readonly leavesTint: readonly [number, number, number];
}

const BIOME_CONFIGS: Record<Biome, BiomeConfig> = {
  [Biome.PLAINS]: {
    name: 'Plains',
    surfaceBlock: BlockType.GRASS,
    subsurfaceBlock: BlockType.DIRT,
    deepBlock: BlockType.STONE,
    treeType: 'oak',
    treeDensity: 0.004,
    vegetation: [
      { type: BlockType.TALL_GRASS, chance: 0.30 },
      { type: BlockType.FLOWER_RED, chance: 0.02 },
      { type: BlockType.FLOWER_YELLOW, chance: 0.02 },
    ],
    heightModifier: 0.7,
    fogColor: [0.75, 0.85, 1.0],
    fogDensity: 1.0,
    waterColor: [0.2, 0.5, 0.8],
    grassTint: [0.45, 0.74, 0.19],
    leavesTint: [0.36, 0.73, 0.24],
  },
  [Biome.FOREST]: {
    name: 'Forest',
    surfaceBlock: BlockType.GRASS,
    subsurfaceBlock: BlockType.DIRT,
    deepBlock: BlockType.STONE,
    treeType: 'oak',
    treeDensity: 0.025,
    vegetation: [
      { type: BlockType.TALL_GRASS, chance: 0.20 },
      { type: BlockType.FLOWER_RED, chance: 0.01 },
      { type: BlockType.MUSHROOM_BROWN, chance: 0.005 },
    ],
    heightModifier: 0.85,
    fogColor: [0.6, 0.78, 0.55],
    fogDensity: 1.1,
    waterColor: [0.18, 0.45, 0.7],
    grassTint: [0.35, 0.68, 0.15],
    leavesTint: [0.30, 0.65, 0.18],
  },
  [Biome.DESERT]: {
    name: 'Desert',
    surfaceBlock: BlockType.SAND,
    subsurfaceBlock: BlockType.SAND,
    deepBlock: BlockType.SANDSTONE,
    treeType: 'oak',
    treeDensity: 0.0,
    vegetation: [
      { type: BlockType.DEAD_BUSH, chance: 0.01 },
      { type: BlockType.CACTUS, chance: 0.003 },
    ],
    heightModifier: 0.5,
    fogColor: [0.95, 0.88, 0.7],
    fogDensity: 0.8,
    waterColor: [0.3, 0.6, 0.7],
    grassTint: [0.6, 0.65, 0.2],
    leavesTint: [0.5, 0.6, 0.2],
  },
  [Biome.TAIGA]: {
    name: 'Taiga',
    surfaceBlock: BlockType.GRASS,
    subsurfaceBlock: BlockType.DIRT,
    deepBlock: BlockType.STONE,
    treeType: 'spruce',
    treeDensity: 0.018,
    vegetation: [
      { type: BlockType.FERN, chance: 0.18 },
      { type: BlockType.TALL_GRASS, chance: 0.08 },
      { type: BlockType.MUSHROOM_RED, chance: 0.004 },
    ],
    heightModifier: 0.9,
    fogColor: [0.65, 0.72, 0.82],
    fogDensity: 1.2,
    waterColor: [0.15, 0.35, 0.65],
    grassTint: [0.30, 0.55, 0.28],
    leavesTint: [0.18, 0.42, 0.18],
  },
  [Biome.JUNGLE]: {
    name: 'Jungle',
    surfaceBlock: BlockType.GRASS,
    subsurfaceBlock: BlockType.DIRT,
    deepBlock: BlockType.STONE,
    treeType: 'jungle',
    treeDensity: 0.035,
    vegetation: [
      { type: BlockType.FERN, chance: 0.30 },
      { type: BlockType.TALL_GRASS, chance: 0.25 },
      { type: BlockType.FLOWER_RED, chance: 0.01 },
      { type: BlockType.FLOWER_YELLOW, chance: 0.01 },
    ],
    heightModifier: 1.0,
    fogColor: [0.55, 0.75, 0.5],
    fogDensity: 1.4,
    waterColor: [0.1, 0.55, 0.55],
    grassTint: [0.22, 0.78, 0.15],
    leavesTint: [0.15, 0.72, 0.12],
  },
  [Biome.SWAMP]: {
    name: 'Swamp',
    surfaceBlock: BlockType.GRASS,
    subsurfaceBlock: BlockType.DIRT,
    deepBlock: BlockType.CLAY,
    treeType: 'swamp_oak',
    treeDensity: 0.012,
    vegetation: [
      { type: BlockType.TALL_GRASS, chance: 0.25 },
      { type: BlockType.MUSHROOM_BROWN, chance: 0.01 },
      { type: BlockType.MUSHROOM_RED, chance: 0.005 },
      { type: BlockType.LILY_PAD, chance: 0.04 },
    ],
    heightModifier: 0.4,
    fogColor: [0.55, 0.6, 0.45],
    fogDensity: 1.6,
    waterColor: [0.25, 0.4, 0.2],
    grassTint: [0.40, 0.55, 0.22],
    leavesTint: [0.35, 0.50, 0.18],
  },
  [Biome.SAVANNA]: {
    name: 'Savanna',
    surfaceBlock: BlockType.GRASS,
    subsurfaceBlock: BlockType.DIRT,
    deepBlock: BlockType.STONE,
    treeType: 'acacia',
    treeDensity: 0.005,
    vegetation: [
      { type: BlockType.TALL_GRASS, chance: 0.35 },
      { type: BlockType.DEAD_BUSH, chance: 0.008 },
    ],
    heightModifier: 0.55,
    fogColor: [0.9, 0.82, 0.6],
    fogDensity: 0.9,
    waterColor: [0.25, 0.55, 0.65],
    grassTint: [0.62, 0.68, 0.18],
    leavesTint: [0.55, 0.65, 0.15],
  },
  [Biome.MOUNTAINS]: {
    name: 'Mountains',
    surfaceBlock: BlockType.STONE,
    subsurfaceBlock: BlockType.STONE,
    deepBlock: BlockType.STONE,
    treeType: 'spruce',
    treeDensity: 0.006,
    vegetation: [
      { type: BlockType.TALL_GRASS, chance: 0.05 },
      { type: BlockType.FERN, chance: 0.02 },
    ],
    heightModifier: 1.8,
    fogColor: [0.7, 0.78, 0.92],
    fogDensity: 1.0,
    waterColor: [0.15, 0.4, 0.75],
    grassTint: [0.35, 0.60, 0.22],
    leavesTint: [0.25, 0.50, 0.20],
  },
};

// Noise offsets to decorrelate temperature and humidity
const TEMP_OFFSET_X = 500;
const TEMP_OFFSET_Z = 500;
const HUMID_OFFSET_X = -300;
const HUMID_OFFSET_Z = 800;
const TEMP_SCALE = 0.0025;
const HUMID_SCALE = 0.003;
const MOUNTAIN_SCALE = 0.006;
const MOUNTAIN_THRESHOLD = 0.72;

export class BiomeSystem {
  /**
   * Get temperature value [0, 1] at world position
   */
  getTemperature(wx: number, wz: number): number {
    return fbm2d(
      (wx + TEMP_OFFSET_X) * TEMP_SCALE,
      (wz + TEMP_OFFSET_Z) * TEMP_SCALE,
      3, 2.0, 0.45
    );
  }

  /**
   * Get humidity value [0, 1] at world position
   */
  getHumidity(wx: number, wz: number): number {
    return fbm2d(
      (wx + HUMID_OFFSET_X) * HUMID_SCALE,
      (wz + HUMID_OFFSET_Z) * HUMID_SCALE,
      3, 2.0, 0.45
    );
  }

  /**
   * Get mountain factor [0, 1] at world position
   */
  getMountainFactor(wx: number, wz: number): number {
    return fbm2d(
      wx * MOUNTAIN_SCALE + 1000,
      wz * MOUNTAIN_SCALE + 1000,
      4, 2.0, 0.5
    );
  }

  /**
   * Determine biome at world (x,z) from temperature + humidity
   */
  getBiome(wx: number, wz: number): Biome {
    const mountain = this.getMountainFactor(wx, wz);
    if (mountain > MOUNTAIN_THRESHOLD) {
      return Biome.MOUNTAINS;
    }

    const temp = this.getTemperature(wx, wz);
    const humid = this.getHumidity(wx, wz);

    // Hot biomes (temp > 0.6)
    if (temp > 0.6) {
      if (humid < 0.35) return Biome.DESERT;
      if (humid > 0.6) return Biome.JUNGLE;
      return Biome.SAVANNA;
    }

    // Cold biomes (temp < 0.35)
    if (temp < 0.35) {
      return Biome.TAIGA;
    }

    // Temperate biomes (0.35 <= temp <= 0.6)
    if (humid > 0.6) return Biome.SWAMP;
    if (humid > 0.4) return Biome.FOREST;
    return Biome.PLAINS;
  }

  /**
   * Get configuration for a biome
   */
  getConfig(biome: Biome): BiomeConfig {
    return BIOME_CONFIGS[biome];
  }

  /**
   * Get the surface block for a given world position, considering
   * snow on mountain tops
   */
  getSurfaceBlock(biome: Biome, height: number): BlockType {
    const config = BIOME_CONFIGS[biome];
    if (biome === Biome.MOUNTAINS && height > 58) {
      return BlockType.SNOW;
    }
    if (biome === Biome.TAIGA && height > 52) {
      return BlockType.SNOW;
    }
    return config.surfaceBlock;
  }
}
