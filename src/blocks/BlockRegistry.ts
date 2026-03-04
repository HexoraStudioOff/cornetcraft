import { BlockType, BLOCK_DEFINITIONS, BlockDefinition } from './BlockTypes';

export class BlockRegistry {
  private static instance: BlockRegistry;
  private readonly blocks: Map<BlockType, BlockDefinition> = new Map();

  private constructor() {
    for (const [key, def] of Object.entries(BLOCK_DEFINITIONS)) {
      this.blocks.set(Number(key) as BlockType, def);
    }
  }

  static getInstance(): BlockRegistry {
    if (!BlockRegistry.instance) {
      BlockRegistry.instance = new BlockRegistry();
    }
    return BlockRegistry.instance;
  }

  getDefinition(type: BlockType): BlockDefinition | undefined {
    return this.blocks.get(type);
  }

  isSolid(type: BlockType): boolean {
    return this.blocks.get(type)?.solid ?? false;
  }

  isTransparent(type: BlockType): boolean {
    return this.blocks.get(type)?.transparent ?? true;
  }

  /** Get the texture atlas index for a specific face direction
   *  faceIndex: 0=top(+Y), 1=bottom(-Y), 2-5=sides */
  getTextureIndex(type: BlockType, faceIndex: number): number {
    const def = this.blocks.get(type);
    if (!def) return 0;
    if (def.textures.length === 1) return def.textures[0];
    // [top, bottom, side]
    if (faceIndex === 0) return def.textures[0]; // top
    if (faceIndex === 1) return def.textures[1]; // bottom
    return def.textures[2]; // sides
  }
}
