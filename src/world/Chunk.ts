import { CHUNK_SIZE, WORLD_HEIGHT } from '../utils/constants';
import { BlockType } from '../blocks/BlockTypes';

/**
 * A chunk stores a CHUNK_SIZE x WORLD_HEIGHT x CHUNK_SIZE column of blocks.
 * Block data is stored in a flat Uint8Array for compact memory usage.
 */
export class Chunk {
  /** Chunk coordinates (in chunk space, not world space) */
  readonly cx: number;
  readonly cz: number;

  /** Flat block data: index = x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE */
  readonly blocks: Uint8Array;

  /** Whether this chunk needs its mesh rebuilt */
  dirty: boolean = true;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT);
  }

  private index(x: number, y: number, z: number): number {
    return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
  }

  getBlock(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 0 || y >= WORLD_HEIGHT) {
      return BlockType.AIR;
    }
    return this.blocks[this.index(x, y, z)] as BlockType;
  }

  setBlock(x: number, y: number, z: number, type: BlockType): void {
    if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 0 || y >= WORLD_HEIGHT) {
      return;
    }
    this.blocks[this.index(x, y, z)] = type;
    this.dirty = true;
  }

  /** Get world X offset */
  get worldX(): number {
    return this.cx * CHUNK_SIZE;
  }

  /** Get world Z offset */
  get worldZ(): number {
    return this.cz * CHUNK_SIZE;
  }
}
