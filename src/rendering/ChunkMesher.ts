import * as THREE from 'three';
import { Chunk } from '../world/Chunk';
import { BlockType, isBlockSolid, isBlockTransparent, isBlockCrossShaped, BLOCK_DEFINITIONS } from '../blocks/BlockTypes';
import { BlockRegistry } from '../blocks/BlockRegistry';
import { CHUNK_SIZE, WORLD_HEIGHT } from '../utils/constants';
import { TextureAtlas } from '../textures/TextureAtlas';
import { BiomeSystem } from '../world/BiomeSystem';

// CCW winding, corners 0-1 at top (v=1), 2-3 at bottom (v=0)
// shade = Minecraft-style directional face brightness
const FACES = [
  { dir: [0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], normal: [0,1,0], faceIdx: 0, shade: 1.0 },
  { dir: [0,-1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], normal: [0,-1,0], faceIdx: 1, shade: 0.5 },
  { dir: [1, 0, 0], corners: [[1,1,0],[1,1,1],[1,0,1],[1,0,0]], normal: [1,0,0], faceIdx: 2, shade: 0.6 },
  { dir: [-1,0, 0], corners: [[0,1,1],[0,1,0],[0,0,0],[0,0,1]], normal: [-1,0,0], faceIdx: 3, shade: 0.6 },
  { dir: [0, 0, 1], corners: [[1,1,1],[0,1,1],[0,0,1],[1,0,1]], normal: [0,0,1], faceIdx: 4, shade: 0.8 },
  { dir: [0, 0,-1], corners: [[0,1,0],[1,1,0],[1,0,0],[0,0,0]], normal: [0,0,-1], faceIdx: 5, shade: 0.8 },
];

function computeVertexAO(side1: boolean, side2: boolean, corner: boolean): number {
  if (side1 && side2) return 0;
  return 3 - (side1 ? 1 : 0) - (side2 ? 1 : 0) - (corner ? 1 : 0);
}

/** Animation type encoded per-vertex */
const ANIM_STATIC = 0.0;
const ANIM_LEAVES = 1.0;
const ANIM_VEGETATION = 2.0;

function getAnimType(blockType: BlockType): number {
  if (blockType === BlockType.LEAVES || blockType === BlockType.BIRCH_LEAVES ||
      blockType === BlockType.SPRUCE_LEAVES || blockType === BlockType.JUNGLE_LEAVES ||
      blockType === BlockType.ACACIA_LEAVES) return ANIM_LEAVES;
  if (blockType === BlockType.TALL_GRASS || blockType === BlockType.FLOWER_RED ||
      blockType === BlockType.FLOWER_YELLOW || blockType === BlockType.FERN ||
      blockType === BlockType.DEAD_BUSH || blockType === BlockType.LILY_PAD) return ANIM_VEGETATION;
  return ANIM_STATIC;
}

/** Blocks that should receive biome grass tinting */
function isGrassTinted(blockType: BlockType): boolean {
  return blockType === BlockType.GRASS || blockType === BlockType.TALL_GRASS ||
         blockType === BlockType.FERN;
}

/** Blocks that should receive biome leaves tinting */
function isLeavesTinted(blockType: BlockType): boolean {
  return blockType === BlockType.LEAVES || blockType === BlockType.BIRCH_LEAVES ||
         blockType === BlockType.SPRUCE_LEAVES || blockType === BlockType.JUNGLE_LEAVES ||
         blockType === BlockType.ACACIA_LEAVES;
}

export interface ChunkMeshResult {
  terrain: THREE.BufferGeometry | null;
  water: THREE.BufferGeometry | null;
}

export class ChunkMesher {
  private readonly registry: BlockRegistry;
  private readonly atlas: TextureAtlas;
  private biomeSystem: BiomeSystem | null = null;

  constructor(atlas: TextureAtlas) {
    this.registry = BlockRegistry.getInstance();
    this.atlas = atlas;
  }

  setBiomeSystem(biomeSystem: BiomeSystem): void {
    this.biomeSystem = biomeSystem;
  }

  private getBlock(chunk: Chunk, getNeighborBlock: (wx: number, wy: number, wz: number) => BlockType,
    lx: number, ly: number, lz: number): BlockType {
    if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && ly >= 0 && ly < WORLD_HEIGHT)
      return chunk.getBlock(lx, ly, lz);
    return getNeighborBlock(chunk.worldX + lx, ly, chunk.worldZ + lz);
  }

  private isSolidAt(chunk: Chunk, gnb: (wx: number, wy: number, wz: number) => BlockType,
    lx: number, ly: number, lz: number): boolean {
    return isBlockSolid(this.getBlock(chunk, gnb, lx, ly, lz));
  }

  buildMesh(chunk: Chunk, getNeighborBlock: (wx: number, wy: number, wz: number) => BlockType): ChunkMeshResult {
    // Terrain buffers
    const tPos: number[] = [], tNorm: number[] = [], tUv: number[] = [];
    const tCol: number[] = [], tAnim: number[] = [], tIdx: number[] = [];
    let tVtx = 0;

    // Water buffers
    const wPos: number[] = [], wNorm: number[] = [], wUv: number[] = [];
    const wIdx: number[] = [];
    let wVtx = 0;

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const blockType = chunk.getBlock(x, y, z);
          if (blockType === BlockType.AIR) continue;

          const wx = chunk.worldX + x;
          const wz = chunk.worldZ + z;

          // --- WATER: separate mesh ---
          if (blockType === BlockType.WATER) {
            const above = this.getBlock(chunk, getNeighborBlock, x, y + 1, z);
            const isTopSurface = above === BlockType.AIR || isBlockCrossShaped(above);

            // Top face (water surface) — only if exposed to air
            if (isTopSurface) {
              const waterY = y + 0.85; // surface slightly below block top
              const texIdx = this.registry.getTextureIndex(BlockType.WATER, 0);
              const [u0, , u1] = this.atlas.getUVs(texIdx);
              wPos.push(wx, waterY, wz + 1, wx + 1, waterY, wz + 1, wx + 1, waterY, wz, wx, waterY, wz);
              wNorm.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
              wUv.push(u0, 1, u1, 1, u1, 0, u0, 0);
              wIdx.push(wVtx, wVtx + 1, wVtx + 2, wVtx, wVtx + 2, wVtx + 3);
              wVtx += 4;
            }

            // Side faces — where water meets air (river banks, ocean edges)
            const waterSideFaces = [
              { dir: [1, 0, 0], corners: [[1,1,0],[1,1,1],[1,0,1],[1,0,0]], normal: [1,0,0] },
              { dir: [-1,0, 0], corners: [[0,1,1],[0,1,0],[0,0,0],[0,0,1]], normal: [-1,0,0] },
              { dir: [0, 0, 1], corners: [[1,1,1],[0,1,1],[0,0,1],[1,0,1]], normal: [0,0,1] },
              { dir: [0, 0,-1], corners: [[0,1,0],[1,1,0],[1,0,0],[0,0,0]], normal: [0,0,-1] },
            ];

            for (const face of waterSideFaces) {
              const nx = x + face.dir[0], ny = y, nz = z + face.dir[2];
              const neighbor = this.getBlock(chunk, getNeighborBlock, nx, ny, nz);
              // Only render side if adjacent to air (not solid, not water)
              if (neighbor === BlockType.AIR) {
                const texIdx = this.registry.getTextureIndex(BlockType.WATER, 0);
                const [u0, , u1] = this.atlas.getUVs(texIdx);
                const topY = isTopSurface ? y + 0.85 : y + 1;
                for (let i = 0; i < 4; i++) {
                  const c = face.corners[i];
                  const vy = c[1] === 1 ? topY : y;
                  wPos.push(wx + c[0], vy, wz + c[2]);
                  wNorm.push(face.normal[0], face.normal[1], face.normal[2]);
                }
                wUv.push(u0, 1, u1, 1, u1, 0, u0, 0);
                wIdx.push(wVtx, wVtx + 1, wVtx + 2, wVtx, wVtx + 2, wVtx + 3);
                wVtx += 4;
              }
            }

            continue;
          }

          // --- TORCH: solid 3D rectangular box (Minecraft-style) ---
          if (blockType === BlockType.TORCH) {
            const def = BLOCK_DEFINITIONS[blockType];
            const texs = def.textures;
            const sideTexIdx = texs.length >= 3 ? (texs as [number, number, number])[2] : texs[0];
            const topTexIdx = texs.length >= 3 ? (texs as [number, number, number])[0] : texs[0];

            const [su0, , su1] = this.atlas.getUVs(sideTexIdx);
            const [tu0, , tu1] = this.atlas.getUVs(topTexIdx);

            const cx = wx + 0.5, cz = wz + 0.5;
            const d = 0.1;    // half-width (total 0.2 blocks ≈ 3/16)
            const h = 0.625;  // height (10/16 of a block)

            // Helper to push one quad (4 vertices + 6 indices)
            const pushQuad = (
              v0: number[], v1: number[], v2: number[], v3: number[],
              nx: number, ny: number, nz: number,
              qu0: number, qv0: number, qu1: number, qv1: number,
            ): void => {
              tPos.push(v0[0], v0[1], v0[2], v1[0], v1[1], v1[2],
                         v2[0], v2[1], v2[2], v3[0], v3[1], v3[2]);
              for (let q = 0; q < 4; q++) {
                tNorm.push(nx, ny, nz);
                tCol.push(1, 1, 1);
                tAnim.push(ANIM_STATIC);
              }
              tUv.push(qu0, qv0, qu0, qv1, qu1, qv1, qu1, qv0);
              tIdx.push(tVtx, tVtx + 1, tVtx + 2, tVtx, tVtx + 2, tVtx + 3);
              tVtx += 4;
            };

            const x0 = cx - d, x1 = cx + d;
            const y0 = y, y1 = y + h;
            const z0 = cz - d, z1 = cz + d;

            // 4 side faces — solid torch side texture (no transparency)
            pushQuad([x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [x1, y0, z1],
              0, 0, 1, su0, 0, su1, 1);
            pushQuad([x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z0],
              0, 0, -1, su0, 0, su1, 1);
            pushQuad([x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0],
              1, 0, 0, su0, 0, su1, 1);
            pushQuad([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1],
              -1, 0, 0, su0, 0, su1, 1);
            // Top face — flame-from-above texture
            pushQuad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0],
              0, 1, 0, tu0, 0, tu1, 1);
            // Bottom face — brown stick bottom
            pushQuad([x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1],
              0, -1, 0, su0, 0, su1, 0.15);

            continue;
          }

          // --- CROSS-SHAPED vegetation ---
          if (isBlockCrossShaped(blockType)) {
            const texIdx = this.registry.getTextureIndex(blockType, 0);
            const [u0, , u1] = this.atlas.getUVs(texIdx);
            const animType = getAnimType(blockType);

            // Biome tinting for cross-shaped vegetation
            let cr = 1, cg = 1, cb = 1;
            if (this.biomeSystem && isGrassTinted(blockType)) {
              const biome = this.biomeSystem.getBiome(wx, wz);
              const config = this.biomeSystem.getConfig(biome);
              cr = config.grassTint[0] * 2.2;
              cg = config.grassTint[1] * 2.2;
              cb = config.grassTint[2] * 2.2;
            }

            // Two crossing quads at 45 degrees
            const cx = wx + 0.5, cz = wz + 0.5;
            const d = 0.45;
            const crossQuads = [
              [[cx - d, y, cz - d], [cx - d, y + 1, cz - d], [cx + d, y + 1, cz + d], [cx + d, y, cz + d]],
              [[cx + d, y, cz + d], [cx + d, y + 1, cz + d], [cx - d, y + 1, cz - d], [cx - d, y, cz - d]],
              [[cx + d, y, cz - d], [cx + d, y + 1, cz - d], [cx - d, y + 1, cz + d], [cx - d, y, cz + d]],
              [[cx - d, y, cz + d], [cx - d, y + 1, cz + d], [cx + d, y + 1, cz - d], [cx + d, y, cz - d]],
            ];

            for (const quad of crossQuads) {
              for (let i = 0; i < 4; i++) {
                tPos.push(quad[i][0], quad[i][1], quad[i][2]);
                tNorm.push(0, 1, 0);
                tCol.push(cr, cg, cb);
                tAnim.push(animType);
              }
              tUv.push(u0, 0, u0, 1, u1, 1, u1, 0);
              tIdx.push(tVtx, tVtx + 1, tVtx + 2, tVtx, tVtx + 2, tVtx + 3);
              tVtx += 4;
            }
            continue;
          }

          // --- SOLID BLOCKS: standard face-culled cubes ---
          if (!isBlockSolid(blockType)) continue;

          const animType = getAnimType(blockType);

          // Biome tinting for solid blocks (grass top, leaves)
          let biomeTintR = 1, biomeTintG = 1, biomeTintB = 1;
          if (this.biomeSystem) {
            if (isGrassTinted(blockType)) {
              const biome = this.biomeSystem.getBiome(wx, wz);
              const config = this.biomeSystem.getConfig(biome);
              biomeTintR = config.grassTint[0] * 2.2;
              biomeTintG = config.grassTint[1] * 2.2;
              biomeTintB = config.grassTint[2] * 2.2;
            } else if (isLeavesTinted(blockType)) {
              const biome = this.biomeSystem.getBiome(wx, wz);
              const config = this.biomeSystem.getConfig(biome);
              biomeTintR = config.leavesTint[0] * 2.2;
              biomeTintG = config.leavesTint[1] * 2.2;
              biomeTintB = config.leavesTint[2] * 2.2;
            }
          }

          for (const face of FACES) {
            const nx = x + face.dir[0], ny = y + face.dir[1], nz = z + face.dir[2];
            const neighborType = this.getBlock(chunk, getNeighborBlock, nx, ny, nz);
            if (isBlockSolid(neighborType) && !isBlockTransparent(neighborType)) continue;

            const texIdx = this.registry.getTextureIndex(blockType, face.faceIdx);
            const [u0, , u1] = this.atlas.getUVs(texIdx);
            const faceUVs: [number, number][] = [[u0, 1], [u1, 1], [u1, 0], [u0, 0]];

            const aoValues: number[] = [];
            for (const corner of face.corners) {
              aoValues.push(this.computeCornerAO(chunk, getNeighborBlock, x, y, z, corner, face.normal));
            }

            // For grass blocks, only tint the top face (faceIdx 0)
            const applyTint = (blockType === BlockType.GRASS) ? (face.faceIdx === 0) :
                              (isGrassTinted(blockType) || isLeavesTinted(blockType));

            for (let i = 0; i < 4; i++) {
              const c = face.corners[i];
              tPos.push(wx + c[0], y + c[1], wz + c[2]);
              tNorm.push(face.normal[0], face.normal[1], face.normal[2]);
              tUv.push(faceUVs[i][0], faceUVs[i][1]);
              const aoFactor = (aoValues[i] / 3) * 0.65 + 0.35;
              const shade = aoFactor * face.shade;
              if (applyTint) {
                tCol.push(shade * biomeTintR, shade * biomeTintG, shade * biomeTintB);
              } else {
                tCol.push(shade, shade, shade);
              }
              tAnim.push(animType);
            }

            if (aoValues[0] + aoValues[2] > aoValues[1] + aoValues[3]) {
              tIdx.push(tVtx, tVtx + 1, tVtx + 2, tVtx, tVtx + 2, tVtx + 3);
            } else {
              tIdx.push(tVtx + 1, tVtx + 2, tVtx + 3, tVtx + 1, tVtx + 3, tVtx);
            }
            tVtx += 4;
          }
        }
      }
    }

    let terrain: THREE.BufferGeometry | null = null;
    if (tPos.length > 0) {
      terrain = new THREE.BufferGeometry();
      terrain.setAttribute('position', new THREE.Float32BufferAttribute(tPos, 3));
      terrain.setAttribute('normal', new THREE.Float32BufferAttribute(tNorm, 3));
      terrain.setAttribute('uv', new THREE.Float32BufferAttribute(tUv, 2));
      terrain.setAttribute('color', new THREE.Float32BufferAttribute(tCol, 3));
      terrain.setAttribute('aAnimType', new THREE.Float32BufferAttribute(tAnim, 1));
      terrain.setIndex(tIdx);
    }

    let water: THREE.BufferGeometry | null = null;
    if (wPos.length > 0) {
      water = new THREE.BufferGeometry();
      water.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
      water.setAttribute('normal', new THREE.Float32BufferAttribute(wNorm, 3));
      water.setAttribute('uv', new THREE.Float32BufferAttribute(wUv, 2));
      water.setIndex(wIdx);
    }

    return { terrain, water };
  }

  private computeCornerAO(chunk: Chunk, gnb: (wx: number, wy: number, wz: number) => BlockType,
    bx: number, by: number, bz: number, corner: number[], faceNormal: number[]): number {
    const cx = corner[0], cy = corner[1], cz = corner[2];
    let s1 = false, s2 = false, diag = false;

    if (faceNormal[1] !== 0) {
      const ny = by + faceNormal[1];
      const sx = cx === 0 ? -1 : 0, sz = cz === 0 ? -1 : 0;
      s1 = this.isSolidAt(chunk, gnb, bx + sx, ny, bz + cz);
      s2 = this.isSolidAt(chunk, gnb, bx + cx, ny, bz + sz);
      diag = this.isSolidAt(chunk, gnb, bx + sx, ny, bz + sz);
    } else if (faceNormal[0] !== 0) {
      const nx = bx + faceNormal[0];
      const sy = cy === 0 ? -1 : 0, sz = cz === 0 ? -1 : 0;
      s1 = this.isSolidAt(chunk, gnb, nx, by + sy, bz + cz);
      s2 = this.isSolidAt(chunk, gnb, nx, by + cy, bz + sz);
      diag = this.isSolidAt(chunk, gnb, nx, by + sy, bz + sz);
    } else {
      const nz = bz + faceNormal[2];
      const sx = cx === 0 ? -1 : 0, sy = cy === 0 ? -1 : 0;
      s1 = this.isSolidAt(chunk, gnb, bx + sx, by + cy, nz);
      s2 = this.isSolidAt(chunk, gnb, bx + cx, by + sy, nz);
      diag = this.isSolidAt(chunk, gnb, bx + sx, by + sy, nz);
    }
    return computeVertexAO(s1, s2, diag);
  }
}
