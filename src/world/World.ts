import * as THREE from 'three';
import { Chunk } from './Chunk';
import { WorldGenerator } from './WorldGenerator';
import { ChunkMesher } from '../rendering/ChunkMesher';
import { TextureAtlas } from '../textures/TextureAtlas';
import { BlockType, isBlockSolid } from '../blocks/BlockTypes';
import { CHUNK_SIZE, RENDER_DISTANCE, WORLD_HEIGHT, SHADOW_LAYER } from '../utils/constants';
import { ChestManager } from './ChestManager';
import { StructureTypeName, StructureLocation } from './StructureGenerator';
import { chunkKey, worldToChunk } from '../utils/math';

export class World {
  readonly scene: THREE.Scene;
  private readonly chunks: Map<string, Chunk> = new Map();
  private readonly terrainMeshes: Map<string, THREE.Mesh> = new Map();
  private readonly waterMeshes: Map<string, THREE.Mesh> = new Map();
  private readonly generator: WorldGenerator;
  private readonly mesher: ChunkMesher;
  readonly atlas: TextureAtlas;
  private terrainMaterial!: THREE.Material;
  private waterMaterial!: THREE.Material;
  renderDistance: number = RENDER_DISTANCE;

  constructor(scene: THREE.Scene, terrainMaterial: THREE.Material, waterMaterial: THREE.Material, atlas: TextureAtlas, chestManager?: ChestManager) {
    this.scene = scene;
    this.terrainMaterial = terrainMaterial;
    this.waterMaterial = waterMaterial;
    this.atlas = atlas;
    this.generator = new WorldGenerator(chestManager);
    this.mesher = new ChunkMesher(this.atlas);
    this.mesher.setBiomeSystem(this.generator.biomeSystem);
  }

  private readonly MAX_CHUNKS_GEN_PER_FRAME = 2;
  private readonly MAX_CHUNKS_MESH_PER_FRAME = 2;

  update(playerX: number, playerZ: number): void {
    const pcx = worldToChunk(Math.floor(playerX), CHUNK_SIZE);
    const pcz = worldToChunk(Math.floor(playerZ), CHUNK_SIZE);

    let generated = 0;
    for (let ring = 0; ring <= this.renderDistance; ring++) {
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dz = -ring; dz <= ring; dz++) {
          if (Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue;
          if (dx * dx + dz * dz > this.renderDistance * this.renderDistance) continue;
          const cx = pcx + dx, cz = pcz + dz;
          const key = chunkKey(cx, cz);
          if (!this.chunks.has(key)) {
            const chunk = new Chunk(cx, cz);
            this.generator.generateChunk(chunk);
            this.chunks.set(key, chunk);
            generated++;
            if (generated >= this.MAX_CHUNKS_GEN_PER_FRAME) break;
          }
        }
        if (generated >= this.MAX_CHUNKS_GEN_PER_FRAME) break;
      }
      if (generated >= this.MAX_CHUNKS_GEN_PER_FRAME) break;
    }

    let meshed = 0;
    for (const [key, chunk] of this.chunks) {
      if (!chunk.dirty) continue;
      const dx = chunk.cx - pcx, dz = chunk.cz - pcz;
      if (dx * dx + dz * dz > this.renderDistance * this.renderDistance) continue;
      this.rebuildChunkMesh(key, chunk);
      meshed++;
      if (meshed >= this.MAX_CHUNKS_MESH_PER_FRAME) break;
    }

    const unloadDist = this.renderDistance + 2;
    const toDelete: string[] = [];
    for (const [key, chunk] of this.chunks) {
      const dx = chunk.cx - pcx, dz = chunk.cz - pcz;
      if (dx * dx + dz * dz > unloadDist * unloadDist) {
        this.removeChunkMeshes(key);
        toDelete.push(key);
      }
    }
    for (const key of toDelete) this.chunks.delete(key);
  }

  forceLoadAll(playerX: number, playerZ: number): void {
    const pcx = worldToChunk(Math.floor(playerX), CHUNK_SIZE);
    const pcz = worldToChunk(Math.floor(playerZ), CHUNK_SIZE);
    for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
      for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
        if (dx * dx + dz * dz > this.renderDistance * this.renderDistance) continue;
        const cx = pcx + dx, cz = pcz + dz;
        const key = chunkKey(cx, cz);
        if (!this.chunks.has(key)) {
          const chunk = new Chunk(cx, cz);
          this.generator.generateChunk(chunk);
          this.chunks.set(key, chunk);
        }
      }
    }
    for (const [key, chunk] of this.chunks) {
      if (chunk.dirty) this.rebuildChunkMesh(key, chunk);
    }
  }

  private rebuildChunkMesh(key: string, chunk: Chunk): void {
    const result = this.mesher.buildMesh(chunk, (wx, wy, wz) => this.getBlock(wx, wy, wz));
    this.removeChunkMeshes(key);

    if (result.terrain) {
      const mesh = new THREE.Mesh(result.terrain, this.terrainMaterial);
      mesh.frustumCulled = true;
      mesh.layers.enable(SHADOW_LAYER);
      this.scene.add(mesh);
      this.terrainMeshes.set(key, mesh);
    }
    if (result.water) {
      const mesh = new THREE.Mesh(result.water, this.waterMaterial);
      mesh.frustumCulled = true;
      mesh.renderOrder = 1; // render water after opaque
      this.scene.add(mesh);
      this.waterMeshes.set(key, mesh);
    }
    chunk.dirty = false;
  }

  private removeChunkMeshes(key: string): void {
    const tm = this.terrainMeshes.get(key);
    if (tm) { this.scene.remove(tm); tm.geometry.dispose(); this.terrainMeshes.delete(key); }
    const wm = this.waterMeshes.get(key);
    if (wm) { this.scene.remove(wm); wm.geometry.dispose(); this.waterMeshes.delete(key); }
  }

  getBlock(wx: number, wy: number, wz: number): BlockType {
    if (wy < 0 || wy >= WORLD_HEIGHT) return BlockType.AIR;
    const cx = worldToChunk(Math.floor(wx), CHUNK_SIZE);
    const cz = worldToChunk(Math.floor(wz), CHUNK_SIZE);
    const chunk = this.chunks.get(chunkKey(cx, cz));
    if (!chunk) return BlockType.AIR;
    const lx = ((Math.floor(wx) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((Math.floor(wz) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.getBlock(lx, Math.floor(wy), lz);
  }

  setBlock(wx: number, wy: number, wz: number, type: BlockType): void {
    if (wy < 0 || wy >= WORLD_HEIGHT) return;
    const fwx = Math.floor(wx), fwy = Math.floor(wy), fwz = Math.floor(wz);
    const cx = worldToChunk(fwx, CHUNK_SIZE), cz = worldToChunk(fwz, CHUNK_SIZE);
    const chunk = this.chunks.get(chunkKey(cx, cz));
    if (!chunk) return;
    const lx = ((fwx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((fwz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    chunk.setBlock(lx, fwy, lz, type);
    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.markDirty(cx, cz + 1);
  }

  private markDirty(cx: number, cz: number): void {
    const chunk = this.chunks.get(chunkKey(cx, cz));
    if (chunk) chunk.dirty = true;
  }

  isSolid(wx: number, wy: number, wz: number): boolean {
    return isBlockSolid(this.getBlock(wx, wy, wz));
  }

  isWater(wx: number, wy: number, wz: number): boolean {
    return this.getBlock(Math.floor(wx), Math.floor(wy), Math.floor(wz)) === BlockType.WATER;
  }

  findNearestStructure(px: number, pz: number, typeName: StructureTypeName): StructureLocation | null {
    return this.generator.findNearestStructure(px, pz, typeName);
  }

  get biomeSystem() {
    return this.generator.biomeSystem;
  }
}
