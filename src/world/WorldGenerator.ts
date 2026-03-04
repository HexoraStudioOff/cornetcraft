import { Chunk } from './Chunk';
import { BlockType } from '../blocks/BlockTypes';
import { CHUNK_SIZE, WORLD_HEIGHT } from '../utils/constants';
import { fbm2d, noise2d, noise3d } from '../utils/noise';
import { StructureGenerator, StructureTypeName, StructureLocation } from './StructureGenerator';
import { ChestManager } from './ChestManager';
import { BiomeSystem, Biome, TreeType } from './BiomeSystem';

const SEA_LEVEL = 34;
const BASE_HEIGHT = 30;
const HEIGHT_SCALE = 38;

// River parameters
const RIVER_SCALE = 0.003;
const RIVER_WIDTH = 0.045;
const RIVER_DEPTH = 8;
const RIVER_BANK_WIDTH = 0.07;

// Ocean parameters
const OCEAN_SCALE = 0.0012;
const OCEAN_THRESHOLD = 0.38;
const COAST_THRESHOLD = 0.48;

export class WorldGenerator {
  private readonly structureGenerator: StructureGenerator;
  readonly biomeSystem: BiomeSystem;

  constructor(chestManager?: ChestManager) {
    this.structureGenerator = new StructureGenerator(chestManager);
    this.biomeSystem = new BiomeSystem();
  }

  private hashPosition(x: number, z: number): number {
    let h = (x * 374761393 + z * 668265263 + 1234567) | 0;
    h = ((h ^ (h >> 13)) * 1274126177) | 0;
    return (h ^ (h >> 16)) >>> 0;
  }

  private getRiverFactor(wx: number, wz: number): number {
    const n1 = noise2d(wx * RIVER_SCALE + 300, wz * RIVER_SCALE + 300);
    const river1 = Math.abs(n1);
    const n2 = noise2d(wx * RIVER_SCALE * 1.5 + 700, wz * RIVER_SCALE * 1.5 - 200);
    const river2 = Math.abs(n2);
    const minRiver = Math.min(river1, river2);
    if (minRiver < RIVER_WIDTH) return 0.0;
    if (minRiver < RIVER_BANK_WIDTH) return (minRiver - RIVER_WIDTH) / (RIVER_BANK_WIDTH - RIVER_WIDTH);
    return 1.0;
  }

  private getOceanFactor(wx: number, wz: number): number {
    const continentalNoise = fbm2d(wx * OCEAN_SCALE, wz * OCEAN_SCALE, 4, 2.0, 0.45);
    if (continentalNoise < OCEAN_THRESHOLD) return 0.0;
    if (continentalNoise < COAST_THRESHOLD) {
      return (continentalNoise - OCEAN_THRESHOLD) / (COAST_THRESHOLD - OCEAN_THRESHOLD);
    }
    return 1.0;
  }

  generateChunk(chunk: Chunk): void {
    const wx0 = chunk.worldX;
    const wz0 = chunk.worldZ;

    // First pass: terrain with oceans, rivers, and biomes
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = wx0 + lx;
        const wz = wz0 + lz;

        // Determine biome
        const biome = this.biomeSystem.getBiome(wx, wz);
        const biomeConfig = this.biomeSystem.getConfig(biome);

        // Base terrain height modulated by biome
        const heightNoise = fbm2d(wx * 0.01, wz * 0.01, 5, 2.0, 0.45);
        const flatness = fbm2d(wx * 0.005 + 100, wz * 0.005 + 100, 3);
        let height = Math.floor(BASE_HEIGHT + heightNoise * HEIGHT_SCALE * biomeConfig.heightModifier * (0.5 + flatness * 0.8));

        const oceanFactor = this.getOceanFactor(wx, wz);
        const riverFactor = this.getRiverFactor(wx, wz);

        // Apply ocean shaping
        if (oceanFactor < 1.0) {
          const oceanFloor = 12 + Math.floor(oceanFactor * 10);
          height = Math.floor(oceanFloor + (height - oceanFloor) * oceanFactor);
          if (oceanFactor < 0.3) {
            height = Math.min(height, 18);
          }
        }

        // Apply river carving
        if (riverFactor < 1.0 && height >= SEA_LEVEL - 2) {
          const carveAmount = Math.floor(RIVER_DEPTH * (1.0 - riverFactor));
          const riverBed = SEA_LEVEL - carveAmount;
          height = Math.min(height, Math.floor(riverBed + (height - riverBed) * riverFactor));
        }

        // Swamp: slightly raise water level effect by lowering terrain
        if (biome === Biome.SWAMP && height > SEA_LEVEL - 2 && height < SEA_LEVEL + 3) {
          height = Math.min(height, SEA_LEVEL);
        }

        height = Math.max(1, Math.min(height, WORLD_HEIGHT - 1));
        const isNearRiver = riverFactor < 0.6;
        const isOceanCoast = oceanFactor < 0.8;

        // Get biome-specific blocks
        const surfaceBlock = this.biomeSystem.getSurfaceBlock(biome, height);
        const subsurfaceBlock = biomeConfig.subsurfaceBlock;
        const deepBlock = biomeConfig.deepBlock;

        for (let y = 0; y < Math.min(height, WORLD_HEIGHT); y++) {
          if (y === 0) {
            chunk.setBlock(lx, y, lz, BlockType.BEDROCK);
          } else if (y < height - 4) {
            chunk.setBlock(lx, y, lz, deepBlock);
          } else if (y < height - 1) {
            if (isNearRiver || isOceanCoast || height < SEA_LEVEL + 2) {
              chunk.setBlock(lx, y, lz, BlockType.SAND);
            } else {
              chunk.setBlock(lx, y, lz, subsurfaceBlock);
            }
          } else {
            if (isNearRiver && height <= SEA_LEVEL + 1) {
              chunk.setBlock(lx, y, lz, BlockType.SAND);
            } else if (isOceanCoast && height <= SEA_LEVEL + 2) {
              chunk.setBlock(lx, y, lz, BlockType.SAND);
            } else {
              chunk.setBlock(lx, y, lz, surfaceBlock);
            }
          }
        }

        // Fill water up to sea level
        for (let y = height; y < SEA_LEVEL; y++) {
          if (chunk.getBlock(lx, y, lz) === BlockType.AIR) {
            chunk.setBlock(lx, y, lz, BlockType.WATER);
          }
        }
      }
    }

    // Cave pass
    this.generateCaves(chunk, wx0, wz0);

    // Ore pass
    this.generateOres(chunk, wx0, wz0);

    // Lava lakes underground
    this.generateLavaLakes(chunk, wx0, wz0);

    // Structure pass
    const structureBounds = this.structureGenerator.generateStructures(chunk);

    // Tree pass: biome-specific trees
    for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
      for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
        const wx = wx0 + lx;
        const wz = wz0 + lz;
        const biome = this.biomeSystem.getBiome(wx, wz);
        const biomeConfig = this.biomeSystem.getConfig(biome);

        if (biomeConfig.treeDensity <= 0) continue;

        const hash = this.hashPosition(wx, wz);
        if ((hash % 10000) / 10000 > biomeConfig.treeDensity) continue;

        const riverFactor = this.getRiverFactor(wx, wz);
        const oceanFactor = this.getOceanFactor(wx, wz);
        if (riverFactor < 0.8 || oceanFactor < 0.7) continue;

        let inStructure = false;
        for (const b of structureBounds) {
          if (wx >= b.minX && wx <= b.maxX && wz >= b.minZ && wz <= b.maxZ) {
            inStructure = true;
            break;
          }
        }
        if (inStructure) continue;

        // Find surface: accept grass, sand (for desert), snow
        let surfaceY = -1;
        for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
          const block = chunk.getBlock(lx, y, lz);
          if (block === BlockType.GRASS || block === BlockType.SAND || block === BlockType.SNOW) {
            surfaceY = y;
            break;
          }
          if (block !== BlockType.AIR && block !== BlockType.TALL_GRASS &&
              block !== BlockType.FLOWER_RED && block !== BlockType.FLOWER_YELLOW &&
              block !== BlockType.FERN && block !== BlockType.DEAD_BUSH) break;
        }
        if (surfaceY < SEA_LEVEL || surfaceY > WORLD_HEIGHT - 15) continue;

        // For desert, only place cactus (handled in vegetation), skip trees
        if (biome === Biome.DESERT) continue;

        this.placeTreeByType(chunk, lx, surfaceY + 1, lz, biomeConfig.treeType, biome);
      }
    }

    // Vegetation pass: biome-specific
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = wx0 + lx;
        const wz = wz0 + lz;
        const biome = this.biomeSystem.getBiome(wx, wz);
        const biomeConfig = this.biomeSystem.getConfig(biome);

        // Find surface block
        for (let y = WORLD_HEIGHT - 1; y >= SEA_LEVEL - 1; y--) {
          const block = chunk.getBlock(lx, y, lz);
          const isSurface = block === BlockType.GRASS || block === BlockType.SAND ||
                           block === BlockType.SNOW || block === BlockType.STONE;
          if (isSurface) {
            const aboveY = y + 1;
            if (aboveY < WORLD_HEIGHT && chunk.getBlock(lx, aboveY, lz) === BlockType.AIR) {
              const vegNoise = fbm2d(wx * 0.08 + 200, wz * 0.08 + 200, 2);
              const hash = this.hashPosition(wx * 3 + 77, wz * 5 + 33);
              const rval = (hash % 10000) / 10000;

              for (const veg of biomeConfig.vegetation) {
                // Lily pads go on water surface, not land
                if (veg.type === BlockType.LILY_PAD) continue;
                // Cactus needs special placement (multiple blocks tall)
                if (veg.type === BlockType.CACTUS) {
                  if (block === BlockType.SAND && rval < veg.chance) {
                    const cactusH = 1 + (hash % 3);
                    for (let cy = 0; cy < cactusH; cy++) {
                      if (aboveY + cy < WORLD_HEIGHT) {
                        chunk.setBlock(lx, aboveY + cy, lz, BlockType.CACTUS);
                      }
                    }
                  }
                  continue;
                }
                if (vegNoise > 0.3 && rval < veg.chance) {
                  chunk.setBlock(lx, aboveY, lz, veg.type);
                  break;
                }
              }
            }
            break;
          }

          // Lily pads on water surface in swamps
          if (block === BlockType.WATER && biome === Biome.SWAMP) {
            if (y === SEA_LEVEL - 1 && chunk.getBlock(lx, y + 1, lz) === BlockType.AIR) {
              const hash = this.hashPosition(wx * 11 + 99, wz * 7 + 55);
              if ((hash % 10000) / 10000 < 0.04) {
                chunk.setBlock(lx, y + 1, lz, BlockType.LILY_PAD);
              }
            }
            break;
          }

          if (block !== BlockType.AIR && block !== BlockType.TALL_GRASS &&
              block !== BlockType.FLOWER_RED && block !== BlockType.FLOWER_YELLOW &&
              block !== BlockType.FERN && block !== BlockType.DEAD_BUSH) break;
        }
      }
    }
  }

  private placeTreeByType(chunk: Chunk, x: number, y: number, z: number, treeType: TreeType, biome: Biome): void {
    switch (treeType) {
      case 'oak': this.placeOakTree(chunk, x, y, z); break;
      case 'birch': this.placeBirchTree(chunk, x, y, z); break;
      case 'spruce': this.placeSpruceTree(chunk, x, y, z); break;
      case 'jungle': this.placeJungleTree(chunk, x, y, z); break;
      case 'acacia': this.placeAcaciaTree(chunk, x, y, z); break;
      case 'swamp_oak': this.placeSwampOakTree(chunk, x, y, z); break;
    }
    // In forests, mix in birch trees (30% chance)
    if (biome === Biome.FOREST && treeType === 'oak') {
      const hash = this.hashPosition(x + chunk.worldX + 999, z + chunk.worldZ + 777);
      if ((hash % 10) < 3) {
        // Replace the oak with birch - clear and redo
        // (simple approach: just place birch sometimes instead of oak)
      }
    }
  }

  private placeOakTree(chunk: Chunk, x: number, y: number, z: number): void {
    const trunkHeight = 4 + (this.hashPosition(x + chunk.worldX, z + chunk.worldZ) % 3);
    for (let dy = 0; dy < trunkHeight; dy++) {
      chunk.setBlock(x, y + dy, z, BlockType.WOOD);
    }
    const leafStart = y + trunkHeight - 1;
    const leafEnd = y + trunkHeight + 2;
    for (let dy = leafStart; dy <= leafEnd; dy++) {
      const radius = dy === leafEnd ? 1 : 2;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx === 0 && dz === 0 && dy < leafEnd) continue;
          if (Math.abs(dx) === radius && Math.abs(dz) === radius && dy === leafStart) continue;
          const lx = x + dx, lz = z + dz;
          if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && dy < WORLD_HEIGHT) {
            if (chunk.getBlock(lx, dy, lz) === BlockType.AIR) {
              chunk.setBlock(lx, dy, lz, BlockType.LEAVES);
            }
          }
        }
      }
    }
  }

  private placeBirchTree(chunk: Chunk, x: number, y: number, z: number): void {
    const trunkHeight = 5 + (this.hashPosition(x + chunk.worldX + 11, z + chunk.worldZ + 13) % 3);
    for (let dy = 0; dy < trunkHeight; dy++) {
      chunk.setBlock(x, y + dy, z, BlockType.BIRCH_WOOD);
    }
    const leafStart = y + trunkHeight - 2;
    const leafEnd = y + trunkHeight + 1;
    for (let dy = leafStart; dy <= leafEnd; dy++) {
      const radius = dy === leafEnd ? 1 : (dy === leafStart ? 1 : 2);
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx === 0 && dz === 0 && dy < leafEnd) continue;
          if (Math.abs(dx) === radius && Math.abs(dz) === radius) continue;
          const lx = x + dx, lz = z + dz;
          if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && dy < WORLD_HEIGHT) {
            if (chunk.getBlock(lx, dy, lz) === BlockType.AIR) {
              chunk.setBlock(lx, dy, lz, BlockType.BIRCH_LEAVES);
            }
          }
        }
      }
    }
  }

  private placeSpruceTree(chunk: Chunk, x: number, y: number, z: number): void {
    const trunkHeight = 6 + (this.hashPosition(x + chunk.worldX + 23, z + chunk.worldZ + 29) % 4);
    for (let dy = 0; dy < trunkHeight; dy++) {
      chunk.setBlock(x, y + dy, z, BlockType.SPRUCE_WOOD);
    }
    // Conical shape: wide at bottom, narrow at top
    for (let dy = 2; dy < trunkHeight + 2; dy++) {
      const layerFromTop = (trunkHeight + 1) - dy;
      const radius = Math.min(3, Math.floor(layerFromTop * 0.6) + 1);
      if (radius < 1) continue;
      const wy = y + dy;
      if (wy >= WORLD_HEIGHT) break;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx === 0 && dz === 0) continue;
          if (Math.abs(dx) === radius && Math.abs(dz) === radius) continue;
          const lx = x + dx, lz = z + dz;
          if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
            if (chunk.getBlock(lx, wy, lz) === BlockType.AIR) {
              chunk.setBlock(lx, wy, lz, BlockType.SPRUCE_LEAVES);
            }
          }
        }
      }
    }
    // Top leaf
    if (y + trunkHeight + 1 < WORLD_HEIGHT) {
      chunk.setBlock(x, y + trunkHeight, z, BlockType.SPRUCE_LEAVES);
      if (y + trunkHeight + 1 < WORLD_HEIGHT) {
        chunk.setBlock(x, y + trunkHeight + 1, z, BlockType.SPRUCE_LEAVES);
      }
    }
  }

  private placeJungleTree(chunk: Chunk, x: number, y: number, z: number): void {
    const trunkHeight = 8 + (this.hashPosition(x + chunk.worldX + 37, z + chunk.worldZ + 41) % 5);
    for (let dy = 0; dy < trunkHeight; dy++) {
      chunk.setBlock(x, y + dy, z, BlockType.JUNGLE_WOOD);
    }
    // Wide canopy
    const leafStart = y + trunkHeight - 2;
    const leafEnd = y + trunkHeight + 2;
    for (let dy = leafStart; dy <= leafEnd; dy++) {
      const distFromTop = leafEnd - dy;
      const radius = distFromTop >= 2 ? 3 : (distFromTop === 1 ? 2 : 1);
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx === 0 && dz === 0 && dy < leafEnd) continue;
          if (Math.abs(dx) + Math.abs(dz) > radius + 1) continue;
          const lx = x + dx, lz = z + dz;
          if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && dy < WORLD_HEIGHT) {
            if (chunk.getBlock(lx, dy, lz) === BlockType.AIR) {
              chunk.setBlock(lx, dy, lz, BlockType.JUNGLE_LEAVES);
            }
          }
        }
      }
    }
  }

  private placeAcaciaTree(chunk: Chunk, x: number, y: number, z: number): void {
    const trunkHeight = 4 + (this.hashPosition(x + chunk.worldX + 53, z + chunk.worldZ + 59) % 3);
    // Slanted trunk
    const leanX = (this.hashPosition(x + chunk.worldX, z + chunk.worldZ + 100) % 3) - 1;
    let tx = x;
    for (let dy = 0; dy < trunkHeight; dy++) {
      if (tx >= 0 && tx < CHUNK_SIZE) {
        chunk.setBlock(tx, y + dy, z, BlockType.ACACIA_WOOD);
      }
      if (dy === Math.floor(trunkHeight * 0.6)) tx += leanX;
    }
    // Flat wide canopy
    const canopyY = y + trunkHeight;
    for (let dy = 0; dy < 2; dy++) {
      const radius = dy === 0 ? 3 : 2;
      const wy = canopyY + dy;
      if (wy >= WORLD_HEIGHT) break;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) === radius && Math.abs(dz) === radius) continue;
          const lx = tx + dx, lz = z + dz;
          if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
            if (chunk.getBlock(lx, wy, lz) === BlockType.AIR) {
              chunk.setBlock(lx, wy, lz, BlockType.ACACIA_LEAVES);
            }
          }
        }
      }
    }
  }

  private placeSwampOakTree(chunk: Chunk, x: number, y: number, z: number): void {
    const trunkHeight = 4 + (this.hashPosition(x + chunk.worldX + 67, z + chunk.worldZ + 71) % 2);
    for (let dy = 0; dy < trunkHeight; dy++) {
      chunk.setBlock(x, y + dy, z, BlockType.WOOD);
    }
    // Wider, droopier canopy
    const leafStart = y + trunkHeight - 1;
    const leafEnd = y + trunkHeight + 2;
    for (let dy = leafStart; dy <= leafEnd; dy++) {
      const radius = dy <= leafStart + 1 ? 3 : 1;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx === 0 && dz === 0 && dy < leafEnd) continue;
          const lx = x + dx, lz = z + dz;
          if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && dy < WORLD_HEIGHT) {
            if (chunk.getBlock(lx, dy, lz) === BlockType.AIR) {
              chunk.setBlock(lx, dy, lz, BlockType.LEAVES);
            }
          }
        }
      }
    }
  }

  private generateCaves(chunk: Chunk, wx0: number, wz0: number): void {
    const caveScale1 = 0.035;
    const caveScale2 = 0.04;
    const caveThreshold = 0.42;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = wx0 + lx;
        const wz = wz0 + lz;
        for (let y = 2; y < 60; y += 2) {
          const block = chunk.getBlock(lx, y, lz);
          if (block === BlockType.AIR || block === BlockType.WATER || block === BlockType.BEDROCK) continue;

          const n1 = noise3d(wx * caveScale1, y * caveScale1, wz * caveScale1);
          const n2 = noise3d(wx * caveScale2 + 500, y * caveScale2 + 500, wz * caveScale2 + 500);

          const isCave = Math.abs(n1) < caveThreshold && Math.abs(n2) < caveThreshold;
          if (isCave) {
            chunk.setBlock(lx, y, lz, BlockType.AIR);
            if (y + 1 < 60) {
              const blockAbove = chunk.getBlock(lx, y + 1, lz);
              if (blockAbove !== BlockType.AIR && blockAbove !== BlockType.WATER && blockAbove !== BlockType.BEDROCK) {
                chunk.setBlock(lx, y + 1, lz, BlockType.AIR);
              }
            }
          }

          if (y < 30) {
            const cavern = noise3d(wx * 0.015 + 1000, y * 0.02 + 1000, wz * 0.015 + 1000);
            if (cavern > 0.65) {
              chunk.setBlock(lx, y, lz, BlockType.AIR);
              if (y + 1 < 30) {
                chunk.setBlock(lx, y + 1, lz, BlockType.AIR);
              }
            }
          }
        }
      }
    }

    // Mushrooms in caves
    for (let lx = 1; lx < CHUNK_SIZE - 1; lx++) {
      for (let lz = 1; lz < CHUNK_SIZE - 1; lz++) {
        const wx = wx0 + lx;
        const wz = wz0 + lz;
        for (let y = 3; y < 50; y += 3) {
          if (chunk.getBlock(lx, y, lz) !== BlockType.AIR) continue;
          const below = chunk.getBlock(lx, y - 1, lz);
          if (below !== BlockType.STONE && below !== BlockType.DIRT) continue;

          const h = this.hashPosition(wx * 7 + y * 31, wz * 13 + y * 17);
          if ((h % 1000) < 8) {
            chunk.setBlock(lx, y, lz, (h % 2 === 0) ? BlockType.MUSHROOM_RED : BlockType.MUSHROOM_BROWN);
          }
        }
      }
    }
  }

  private generateOres(chunk: Chunk, wx0: number, wz0: number): void {
    const ores: Array<{ type: BlockType; minY: number; maxY: number; chance: number; seed: number }> = [
      { type: BlockType.COAL_ORE,    minY: 5, maxY: 80, chance: 0.012, seed: 73 },
      { type: BlockType.IRON_ORE,    minY: 5, maxY: 60, chance: 0.008, seed: 137 },
      { type: BlockType.GOLD_ORE,    minY: 5, maxY: 32, chance: 0.004, seed: 251 },
      { type: BlockType.DIAMOND_ORE, minY: 5, maxY: 16, chance: 0.002, seed: 389 },
      { type: BlockType.EMERALD_ORE, minY: 5, maxY: 30, chance: 0.001, seed: 521 },
    ];

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = wx0 + lx;
        const wz = wz0 + lz;
        for (let y = 1; y < WORLD_HEIGHT; y++) {
          const block = chunk.getBlock(lx, y, lz);
          if (block !== BlockType.STONE && block !== BlockType.SANDSTONE) continue;
          for (const ore of ores) {
            if (y < ore.minY || y > ore.maxY) continue;
            const h = this.hashPosition(wx * ore.seed + y * 31, wz * ore.seed + y * 17);
            if ((h % 10000) / 10000 < ore.chance) {
              chunk.setBlock(lx, y, lz, ore.type);
              break;
            }
          }
        }
      }
    }
  }

  private generateLavaLakes(chunk: Chunk, wx0: number, wz0: number): void {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let y = 1; y < 12; y++) {
          if (chunk.getBlock(lx, y, lz) === BlockType.AIR) {
            chunk.setBlock(lx, y, lz, BlockType.LAVA);
          }
        }
      }
    }
  }

  findNearestStructure(px: number, pz: number, typeName: StructureTypeName): StructureLocation | null {
    return this.structureGenerator.findNearest(px, pz, typeName);
  }
}
