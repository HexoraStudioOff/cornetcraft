export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  WOOD = 4,
  LEAVES = 5,
  SAND = 6,
  WATER = 7,
  SNOW = 8,
  BEDROCK = 9,
  TALL_GRASS = 10,
  FLOWER_RED = 11,
  FLOWER_YELLOW = 12,
  PLANKS = 13,
  COBBLESTONE = 14,
  CRAFTING_TABLE = 15,
  TORCH = 16,
  STONE_BRICKS = 17,
  MOSSY_COBBLESTONE = 18,
  GLASS = 19,
  BOOKSHELF = 20,
  WOOL_RED = 21,
  IRON_BLOCK = 22,
  DARK_PLANKS = 23,
  CHISELED_STONE = 24,
  CHEST = 25,
  // New blocks
  TNT = 26,
  LAVA = 27,
  ICE = 28,
  GLOWSTONE = 29,
  MUSHROOM_RED = 30,
  MUSHROOM_BROWN = 31,
  CACTUS = 32,
  PUMPKIN = 33,
  OBSIDIAN = 34,
  GOLD_BLOCK = 35,
  DIAMOND_BLOCK = 36,
  BRICK = 37,
  HAY_BALE = 38,
  SLIME_BLOCK = 39,
  GRAVEL = 40,
  LADDER = 41,
  // Ores
  COAL_ORE = 42,
  IRON_ORE = 43,
  GOLD_ORE = 44,
  DIAMOND_ORE = 45,
  EMERALD_ORE = 46,
  // Interactive blocks (Phase 4)
  FURNACE = 47,
  DOOR_BOTTOM = 48,
  DOOR_TOP = 49,
  BED_HEAD = 50,
  BED_FOOT = 51,
  ENCHANTING_TABLE = 52,
  SIGN = 53,
  JUKEBOX = 54,
  // Biome blocks
  BIRCH_WOOD = 55,
  BIRCH_LEAVES = 56,
  SPRUCE_WOOD = 57,
  SPRUCE_LEAVES = 58,
  JUNGLE_WOOD = 59,
  JUNGLE_LEAVES = 60,
  ACACIA_WOOD = 61,
  ACACIA_LEAVES = 62,
  SANDSTONE = 63,
  RED_SAND = 64,
  TERRACOTTA = 65,
  CLAY = 66,
  FERN = 67,
  DEAD_BUSH = 68,
  LILY_PAD = 69,
}

export interface BlockDefinition {
  readonly id: BlockType;
  readonly name: string;
  readonly solid: boolean;
  readonly transparent: boolean;
  /** If different textures per face: [top, bottom, side] indices into atlas, else single index */
  readonly textures: [number, number, number] | [number];
  /** If true, rendered as two crossing quads instead of a cube */
  readonly crossShaped?: boolean;
  /** Time in seconds to break by hand. Infinity = unbreakable */
  readonly hardness: number;
  /** What the block drops when broken. undefined = drops itself. null = drops nothing */
  readonly drops?: BlockType | null;
}

export const BLOCK_DEFINITIONS: Record<number, BlockDefinition> = {
  [BlockType.AIR]: {
    id: BlockType.AIR, name: 'Air', solid: false, transparent: true,
    textures: [0], hardness: 0,
  },
  [BlockType.GRASS]: {
    id: BlockType.GRASS, name: 'Grass', solid: true, transparent: false,
    textures: [0, 2, 1], hardness: 0.6, drops: BlockType.DIRT,
  },
  [BlockType.DIRT]: {
    id: BlockType.DIRT, name: 'Dirt', solid: true, transparent: false,
    textures: [2], hardness: 0.5,
  },
  [BlockType.STONE]: {
    id: BlockType.STONE, name: 'Stone', solid: true, transparent: false,
    textures: [3], hardness: 2.5, drops: BlockType.COBBLESTONE,
  },
  [BlockType.WOOD]: {
    id: BlockType.WOOD, name: 'Wood', solid: true, transparent: false,
    textures: [4, 5, 4], hardness: 2.0,
  },
  [BlockType.LEAVES]: {
    id: BlockType.LEAVES, name: 'Leaves', solid: true, transparent: false,
    textures: [6], hardness: 0.2, drops: null,
  },
  [BlockType.SAND]: {
    id: BlockType.SAND, name: 'Sand', solid: true, transparent: false,
    textures: [7], hardness: 0.5,
  },
  [BlockType.WATER]: {
    id: BlockType.WATER, name: 'Water', solid: false, transparent: true,
    textures: [8], hardness: Infinity, drops: null,
  },
  [BlockType.SNOW]: {
    id: BlockType.SNOW, name: 'Snow', solid: true, transparent: false,
    textures: [9], hardness: 0.5,
  },
  [BlockType.BEDROCK]: {
    id: BlockType.BEDROCK, name: 'Bedrock', solid: true, transparent: false,
    textures: [10], hardness: Infinity,
  },
  [BlockType.TALL_GRASS]: {
    id: BlockType.TALL_GRASS, name: 'Tall Grass', solid: false, transparent: true,
    textures: [11], crossShaped: true, hardness: 0.0, drops: null,
  },
  [BlockType.FLOWER_RED]: {
    id: BlockType.FLOWER_RED, name: 'Red Flower', solid: false, transparent: true,
    textures: [12], crossShaped: true, hardness: 0.0,
  },
  [BlockType.FLOWER_YELLOW]: {
    id: BlockType.FLOWER_YELLOW, name: 'Yellow Flower', solid: false, transparent: true,
    textures: [13], crossShaped: true, hardness: 0.0,
  },
  [BlockType.PLANKS]: {
    id: BlockType.PLANKS, name: 'Planks', solid: true, transparent: false,
    textures: [14], hardness: 2.0,
  },
  [BlockType.COBBLESTONE]: {
    id: BlockType.COBBLESTONE, name: 'Cobblestone', solid: true, transparent: false,
    textures: [15], hardness: 2.5,
  },
  [BlockType.CRAFTING_TABLE]: {
    id: BlockType.CRAFTING_TABLE, name: 'Crafting Table', solid: true, transparent: false,
    textures: [16, 14, 17], hardness: 2.5,
  },
  [BlockType.TORCH]: {
    id: BlockType.TORCH, name: 'Torch', solid: false, transparent: true,
    textures: [20, 20, 19], hardness: 0.0,
  },
  [BlockType.STONE_BRICKS]: {
    id: BlockType.STONE_BRICKS, name: 'Stone Bricks', solid: true, transparent: false,
    textures: [21], hardness: 2.0,
  },
  [BlockType.MOSSY_COBBLESTONE]: {
    id: BlockType.MOSSY_COBBLESTONE, name: 'Mossy Cobblestone', solid: true, transparent: false,
    textures: [22], hardness: 2.0,
  },
  [BlockType.GLASS]: {
    id: BlockType.GLASS, name: 'Glass', solid: true, transparent: true,
    textures: [23], hardness: 0.3, drops: null,
  },
  [BlockType.BOOKSHELF]: {
    id: BlockType.BOOKSHELF, name: 'Bookshelf', solid: true, transparent: false,
    textures: [14, 14, 24], hardness: 1.5,
  },
  [BlockType.WOOL_RED]: {
    id: BlockType.WOOL_RED, name: 'Red Wool', solid: true, transparent: false,
    textures: [25], hardness: 0.8,
  },
  [BlockType.IRON_BLOCK]: {
    id: BlockType.IRON_BLOCK, name: 'Iron Block', solid: true, transparent: false,
    textures: [26], hardness: 2.5,
  },
  [BlockType.DARK_PLANKS]: {
    id: BlockType.DARK_PLANKS, name: 'Dark Planks', solid: true, transparent: false,
    textures: [27], hardness: 2.0,
  },
  [BlockType.CHISELED_STONE]: {
    id: BlockType.CHISELED_STONE, name: 'Chiseled Stone', solid: true, transparent: false,
    textures: [28], hardness: 2.0,
  },
  [BlockType.CHEST]: {
    id: BlockType.CHEST, name: 'Chest', solid: true, transparent: false,
    textures: [30, 30, 29], hardness: 2.5,
  },
  [BlockType.TNT]: {
    id: BlockType.TNT, name: 'TNT', solid: true, transparent: false,
    textures: [32, 33, 31], hardness: 0.0,
  },
  [BlockType.LAVA]: {
    id: BlockType.LAVA, name: 'Lava', solid: false, transparent: true,
    textures: [34], hardness: Infinity, drops: null,
  },
  [BlockType.ICE]: {
    id: BlockType.ICE, name: 'Ice', solid: true, transparent: true,
    textures: [35], hardness: 0.5, drops: null,
  },
  [BlockType.GLOWSTONE]: {
    id: BlockType.GLOWSTONE, name: 'Glowstone', solid: true, transparent: false,
    textures: [36], hardness: 0.3,
  },
  [BlockType.MUSHROOM_RED]: {
    id: BlockType.MUSHROOM_RED, name: 'Red Mushroom', solid: false, transparent: true,
    textures: [37], crossShaped: true, hardness: 0.0,
  },
  [BlockType.MUSHROOM_BROWN]: {
    id: BlockType.MUSHROOM_BROWN, name: 'Brown Mushroom', solid: false, transparent: true,
    textures: [38], crossShaped: true, hardness: 0.0,
  },
  [BlockType.CACTUS]: {
    id: BlockType.CACTUS, name: 'Cactus', solid: true, transparent: false,
    textures: [40, 40, 39], hardness: 0.4,
  },
  [BlockType.PUMPKIN]: {
    id: BlockType.PUMPKIN, name: 'Pumpkin', solid: true, transparent: false,
    textures: [42, 42, 41], hardness: 1.0,
  },
  [BlockType.OBSIDIAN]: {
    id: BlockType.OBSIDIAN, name: 'Obsidian', solid: true, transparent: false,
    textures: [43], hardness: 50.0,
  },
  [BlockType.GOLD_BLOCK]: {
    id: BlockType.GOLD_BLOCK, name: 'Gold Block', solid: true, transparent: false,
    textures: [44], hardness: 3.0,
  },
  [BlockType.DIAMOND_BLOCK]: {
    id: BlockType.DIAMOND_BLOCK, name: 'Diamond Block', solid: true, transparent: false,
    textures: [45], hardness: 5.0,
  },
  [BlockType.BRICK]: {
    id: BlockType.BRICK, name: 'Brick', solid: true, transparent: false,
    textures: [46], hardness: 2.0,
  },
  [BlockType.HAY_BALE]: {
    id: BlockType.HAY_BALE, name: 'Hay Bale', solid: true, transparent: false,
    textures: [48, 48, 47], hardness: 0.5,
  },
  [BlockType.SLIME_BLOCK]: {
    id: BlockType.SLIME_BLOCK, name: 'Slime Block', solid: true, transparent: true,
    textures: [49], hardness: 0.0,
  },
  [BlockType.GRAVEL]: {
    id: BlockType.GRAVEL, name: 'Gravel', solid: true, transparent: false,
    textures: [50], hardness: 0.6,
  },
  [BlockType.LADDER]: {
    id: BlockType.LADDER, name: 'Ladder', solid: false, transparent: true,
    textures: [51], crossShaped: true, hardness: 0.4,
  },
  [BlockType.COAL_ORE]: {
    id: BlockType.COAL_ORE, name: 'Coal Ore', solid: true, transparent: false,
    textures: [52], hardness: 3.0,
  },
  [BlockType.IRON_ORE]: {
    id: BlockType.IRON_ORE, name: 'Iron Ore', solid: true, transparent: false,
    textures: [53], hardness: 3.0,
  },
  [BlockType.GOLD_ORE]: {
    id: BlockType.GOLD_ORE, name: 'Gold Ore', solid: true, transparent: false,
    textures: [54], hardness: 3.0,
  },
  [BlockType.DIAMOND_ORE]: {
    id: BlockType.DIAMOND_ORE, name: 'Diamond Ore', solid: true, transparent: false,
    textures: [55], hardness: 3.0,
  },
  [BlockType.EMERALD_ORE]: {
    id: BlockType.EMERALD_ORE, name: 'Emerald Ore', solid: true, transparent: false,
    textures: [56], hardness: 3.0,
  },
  [BlockType.FURNACE]: {
    id: BlockType.FURNACE, name: 'Furnace', solid: true, transparent: false,
    textures: [59, 59, 57], hardness: 3.5,
  },
  [BlockType.DOOR_BOTTOM]: {
    id: BlockType.DOOR_BOTTOM, name: 'Door', solid: true, transparent: true,
    textures: [60], hardness: 3.0,
  },
  [BlockType.DOOR_TOP]: {
    id: BlockType.DOOR_TOP, name: 'Door', solid: true, transparent: true,
    textures: [61], hardness: 3.0,
  },
  [BlockType.BED_HEAD]: {
    id: BlockType.BED_HEAD, name: 'Bed', solid: true, transparent: false,
    textures: [62, 63, 63], hardness: 0.2,
  },
  [BlockType.BED_FOOT]: {
    id: BlockType.BED_FOOT, name: 'Bed', solid: true, transparent: false,
    textures: [62, 63, 63], hardness: 0.2,
  },
  [BlockType.ENCHANTING_TABLE]: {
    id: BlockType.ENCHANTING_TABLE, name: 'Enchanting Table', solid: true, transparent: false,
    textures: [64, 65, 65], hardness: 5.0,
  },
  [BlockType.SIGN]: {
    id: BlockType.SIGN, name: 'Sign', solid: false, transparent: true,
    textures: [66], crossShaped: true, hardness: 1.0,
  },
  [BlockType.JUKEBOX]: {
    id: BlockType.JUKEBOX, name: 'Jukebox', solid: true, transparent: false,
    textures: [68, 14, 67], hardness: 2.0,
  },
  // Biome blocks
  [BlockType.BIRCH_WOOD]: {
    id: BlockType.BIRCH_WOOD, name: 'Birch Wood', solid: true, transparent: false,
    textures: [69, 70, 69], hardness: 2.0,
  },
  [BlockType.BIRCH_LEAVES]: {
    id: BlockType.BIRCH_LEAVES, name: 'Birch Leaves', solid: true, transparent: false,
    textures: [71], hardness: 0.2, drops: null,
  },
  [BlockType.SPRUCE_WOOD]: {
    id: BlockType.SPRUCE_WOOD, name: 'Spruce Wood', solid: true, transparent: false,
    textures: [72, 73, 72], hardness: 2.0,
  },
  [BlockType.SPRUCE_LEAVES]: {
    id: BlockType.SPRUCE_LEAVES, name: 'Spruce Leaves', solid: true, transparent: false,
    textures: [74], hardness: 0.2, drops: null,
  },
  [BlockType.JUNGLE_WOOD]: {
    id: BlockType.JUNGLE_WOOD, name: 'Jungle Wood', solid: true, transparent: false,
    textures: [75, 76, 75], hardness: 2.0,
  },
  [BlockType.JUNGLE_LEAVES]: {
    id: BlockType.JUNGLE_LEAVES, name: 'Jungle Leaves', solid: true, transparent: false,
    textures: [77], hardness: 0.2, drops: null,
  },
  [BlockType.ACACIA_WOOD]: {
    id: BlockType.ACACIA_WOOD, name: 'Acacia Wood', solid: true, transparent: false,
    textures: [78, 79, 78], hardness: 2.0,
  },
  [BlockType.ACACIA_LEAVES]: {
    id: BlockType.ACACIA_LEAVES, name: 'Acacia Leaves', solid: true, transparent: false,
    textures: [80], hardness: 0.2, drops: null,
  },
  [BlockType.SANDSTONE]: {
    id: BlockType.SANDSTONE, name: 'Sandstone', solid: true, transparent: false,
    textures: [82, 83, 81], hardness: 2.0,
  },
  [BlockType.RED_SAND]: {
    id: BlockType.RED_SAND, name: 'Red Sand', solid: true, transparent: false,
    textures: [84], hardness: 0.5,
  },
  [BlockType.TERRACOTTA]: {
    id: BlockType.TERRACOTTA, name: 'Terracotta', solid: true, transparent: false,
    textures: [85], hardness: 2.0,
  },
  [BlockType.CLAY]: {
    id: BlockType.CLAY, name: 'Clay', solid: true, transparent: false,
    textures: [86], hardness: 0.6,
  },
  [BlockType.FERN]: {
    id: BlockType.FERN, name: 'Fern', solid: false, transparent: true,
    textures: [87], crossShaped: true, hardness: 0.0, drops: null,
  },
  [BlockType.DEAD_BUSH]: {
    id: BlockType.DEAD_BUSH, name: 'Dead Bush', solid: false, transparent: true,
    textures: [88], crossShaped: true, hardness: 0.0, drops: null,
  },
  [BlockType.LILY_PAD]: {
    id: BlockType.LILY_PAD, name: 'Lily Pad', solid: false, transparent: true,
    textures: [89], crossShaped: true, hardness: 0.0,
  },
};

export const PLACEABLE_BLOCKS: BlockType[] = [
  BlockType.GRASS, BlockType.DIRT, BlockType.STONE, BlockType.WOOD,
  BlockType.LEAVES, BlockType.SAND, BlockType.SNOW, BlockType.BEDROCK,
  BlockType.TALL_GRASS, BlockType.FLOWER_RED, BlockType.FLOWER_YELLOW,
  BlockType.PLANKS, BlockType.COBBLESTONE, BlockType.CRAFTING_TABLE,
  BlockType.TORCH, BlockType.STONE_BRICKS, BlockType.MOSSY_COBBLESTONE,
  BlockType.GLASS, BlockType.BOOKSHELF, BlockType.WOOL_RED,
  BlockType.IRON_BLOCK, BlockType.DARK_PLANKS, BlockType.CHISELED_STONE,
  BlockType.CHEST, BlockType.TNT, BlockType.ICE, BlockType.GLOWSTONE,
  BlockType.MUSHROOM_RED, BlockType.MUSHROOM_BROWN, BlockType.CACTUS,
  BlockType.PUMPKIN, BlockType.OBSIDIAN, BlockType.GOLD_BLOCK,
  BlockType.DIAMOND_BLOCK, BlockType.BRICK, BlockType.HAY_BALE,
  BlockType.SLIME_BLOCK, BlockType.GRAVEL, BlockType.LADDER,
  BlockType.COAL_ORE, BlockType.IRON_ORE, BlockType.GOLD_ORE,
  BlockType.DIAMOND_ORE, BlockType.EMERALD_ORE, BlockType.FURNACE,
  BlockType.ENCHANTING_TABLE, BlockType.JUKEBOX,
  BlockType.BIRCH_WOOD, BlockType.BIRCH_LEAVES,
  BlockType.SPRUCE_WOOD, BlockType.SPRUCE_LEAVES,
  BlockType.JUNGLE_WOOD, BlockType.JUNGLE_LEAVES,
  BlockType.ACACIA_WOOD, BlockType.ACACIA_LEAVES,
  BlockType.SANDSTONE, BlockType.RED_SAND, BlockType.TERRACOTTA,
  BlockType.CLAY,
];

export function isBlockSolid(type: BlockType): boolean {
  return BLOCK_DEFINITIONS[type]?.solid ?? false;
}

export function isBlockTransparent(type: BlockType): boolean {
  return BLOCK_DEFINITIONS[type]?.transparent ?? true;
}

export function isBlockCrossShaped(type: BlockType): boolean {
  return BLOCK_DEFINITIONS[type]?.crossShaped ?? false;
}
