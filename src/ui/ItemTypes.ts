import { BlockType, BLOCK_DEFINITIONS } from '../blocks/BlockTypes';

export enum ItemType {
  // Block items (IDs match BlockType for direct mapping)
  GRASS = BlockType.GRASS,
  DIRT = BlockType.DIRT,
  STONE = BlockType.STONE,
  WOOD = BlockType.WOOD,
  LEAVES = BlockType.LEAVES,
  SAND = BlockType.SAND,
  SNOW = BlockType.SNOW,
  BEDROCK = BlockType.BEDROCK,
  TALL_GRASS = BlockType.TALL_GRASS,
  FLOWER_RED = BlockType.FLOWER_RED,
  FLOWER_YELLOW = BlockType.FLOWER_YELLOW,
  PLANKS = BlockType.PLANKS,
  COBBLESTONE = BlockType.COBBLESTONE,
  CRAFTING_TABLE = BlockType.CRAFTING_TABLE,
  TORCH = BlockType.TORCH,
  STONE_BRICKS = BlockType.STONE_BRICKS,
  MOSSY_COBBLESTONE = BlockType.MOSSY_COBBLESTONE,
  GLASS = BlockType.GLASS,
  BOOKSHELF = BlockType.BOOKSHELF,
  WOOL_RED = BlockType.WOOL_RED,
  IRON_BLOCK = BlockType.IRON_BLOCK,
  DARK_PLANKS = BlockType.DARK_PLANKS,
  CHISELED_STONE = BlockType.CHISELED_STONE,
  CHEST = BlockType.CHEST,
  TNT = BlockType.TNT,
  ICE = BlockType.ICE,
  GLOWSTONE = BlockType.GLOWSTONE,
  MUSHROOM_RED = BlockType.MUSHROOM_RED,
  MUSHROOM_BROWN = BlockType.MUSHROOM_BROWN,
  CACTUS = BlockType.CACTUS,
  PUMPKIN = BlockType.PUMPKIN,
  OBSIDIAN = BlockType.OBSIDIAN,
  GOLD_BLOCK = BlockType.GOLD_BLOCK,
  DIAMOND_BLOCK = BlockType.DIAMOND_BLOCK,
  BRICK = BlockType.BRICK,
  HAY_BALE = BlockType.HAY_BALE,
  SLIME_BLOCK = BlockType.SLIME_BLOCK,
  GRAVEL = BlockType.GRAVEL,
  LADDER = BlockType.LADDER,
  COAL_ORE = BlockType.COAL_ORE,
  IRON_ORE = BlockType.IRON_ORE,
  GOLD_ORE = BlockType.GOLD_ORE,
  DIAMOND_ORE = BlockType.DIAMOND_ORE,
  EMERALD_ORE = BlockType.EMERALD_ORE,
  FURNACE = BlockType.FURNACE,
  ENCHANTING_TABLE = BlockType.ENCHANTING_TABLE,
  JUKEBOX = BlockType.JUKEBOX,

  // Non-block items (start at 100 to avoid collision)
  STICK = 100,
  WOODEN_PICKAXE = 101,
  STONE_PICKAXE = 102,
  WOODEN_SWORD = 103,
  STONE_SWORD = 104,
  // New tools
  IRON_PICKAXE = 105,
  IRON_SWORD = 106,
  IRON_AXE = 107,
  IRON_SHOVEL = 108,
  DIAMOND_PICKAXE = 109,
  DIAMOND_SWORD = 110,
  DIAMOND_AXE = 111,
  DIAMOND_SHOVEL = 112,
  WOODEN_AXE = 113,
  WOODEN_SHOVEL = 114,
  STONE_AXE = 115,
  STONE_SHOVEL = 116,
  BOW = 117,
  ARROW = 118,
  SHIELD = 119,
  FISHING_ROD = 120,
  // Raw materials
  COAL = 130,
  IRON_INGOT = 131,
  GOLD_INGOT = 132,
  DIAMOND = 133,
  EMERALD = 134,
  IRON_RAW = 135,
  GOLD_RAW = 136,
  BONE = 137,
  FEATHER = 138,
  LEATHER = 139,
  STRING = 140,
  // Food
  RAW_PORK = 150,
  COOKED_PORK = 151,
  RAW_BEEF = 152,
  COOKED_BEEF = 153,
  RAW_FISH = 154,
  COOKED_FISH = 155,
  APPLE = 156,
  GOLDEN_APPLE = 157,
  BREAD = 158,
  MUSHROOM_STEW = 159,
  RAW_CHICKEN = 160,
  COOKED_CHICKEN = 161,
  HONEY = 162,
  // Armor
  LEATHER_HELMET = 170,
  LEATHER_CHESTPLATE = 171,
  LEATHER_LEGGINGS = 172,
  LEATHER_BOOTS = 173,
  IRON_HELMET = 174,
  IRON_CHESTPLATE = 175,
  IRON_LEGGINGS = 176,
  IRON_BOOTS = 177,
  DIAMOND_HELMET = 178,
  DIAMOND_CHESTPLATE = 179,
  DIAMOND_LEGGINGS = 180,
  DIAMOND_BOOTS = 181,
  // Special
  ENDER_PEARL = 190,
  BUCKET = 191,
  WATER_BUCKET = 192,
  LAVA_BUCKET = 193,
  BOWL = 194,
  WHEAT = 195,
  EGG = 196,
  MUSIC_DISC = 197,
}

export interface ItemDefinition {
  readonly id: ItemType;
  readonly name: string;
  readonly stackSize: number;
  readonly isBlock: boolean;
  readonly blockType?: BlockType;
  /** Texture atlas index for block items, or a procedural icon key for non-block items */
  readonly textureIndex?: number;
  /** Mining speed multiplier for tool items */
  readonly toolSpeed?: number;
  /** Which block types this tool is effective against */
  readonly toolEffective?: BlockType[];
  /** Attack damage for weapons */
  readonly attackDamage?: number;
  /** Durability for tools and armor */
  readonly durability?: number;
  /** Food: hunger points restored */
  readonly foodHunger?: number;
  /** Food: saturation restored */
  readonly foodSaturation?: number;
  /** Armor: defense points */
  readonly armorDefense?: number;
  /** Armor: slot (helmet, chestplate, leggings, boots) */
  readonly armorSlot?: 'helmet' | 'chestplate' | 'leggings' | 'boots';
  /** Item category for display */
  readonly category?: 'tool' | 'weapon' | 'armor' | 'food' | 'material' | 'block';
}

export const ITEM_DEFINITIONS: Record<number, ItemDefinition> = {};

// Auto-register all placeable blocks as items
for (const [key, def] of Object.entries(BLOCK_DEFINITIONS)) {
  const blockId = Number(key);
  if (blockId === BlockType.AIR || blockId === BlockType.WATER) continue;
  const texIdx = def.textures.length === 1 ? def.textures[0] : def.textures[2];
  ITEM_DEFINITIONS[blockId] = {
    id: blockId as ItemType,
    name: def.name,
    stackSize: 64,
    isBlock: true,
    blockType: blockId as BlockType,
    textureIndex: texIdx,
  };
}

const STONE_TYPES: BlockType[] = [
  BlockType.STONE, BlockType.COBBLESTONE, BlockType.STONE_BRICKS,
  BlockType.MOSSY_COBBLESTONE, BlockType.CHISELED_STONE, BlockType.IRON_BLOCK,
  BlockType.COAL_ORE, BlockType.IRON_ORE, BlockType.GOLD_ORE,
  BlockType.DIAMOND_ORE, BlockType.EMERALD_ORE, BlockType.OBSIDIAN,
  BlockType.BRICK, BlockType.FURNACE, BlockType.GOLD_BLOCK, BlockType.DIAMOND_BLOCK,
];
const WOOD_TYPES: BlockType[] = [BlockType.WOOD, BlockType.PLANKS, BlockType.DARK_PLANKS, BlockType.BOOKSHELF, BlockType.CHEST, BlockType.CRAFTING_TABLE, BlockType.JUKEBOX];
const DIRT_TYPES: BlockType[] = [BlockType.DIRT, BlockType.GRASS, BlockType.SAND, BlockType.GRAVEL, BlockType.SNOW, BlockType.HAY_BALE];

// Non-block items: Materials
ITEM_DEFINITIONS[ItemType.STICK] = { id: ItemType.STICK, name: 'Stick', stackSize: 64, isBlock: false, textureIndex: -1, category: 'material' };
ITEM_DEFINITIONS[ItemType.COAL] = { id: ItemType.COAL, name: 'Coal', stackSize: 64, isBlock: false, textureIndex: -20, category: 'material' };
ITEM_DEFINITIONS[ItemType.IRON_RAW] = { id: ItemType.IRON_RAW, name: 'Raw Iron', stackSize: 64, isBlock: false, textureIndex: -21, category: 'material' };
ITEM_DEFINITIONS[ItemType.IRON_INGOT] = { id: ItemType.IRON_INGOT, name: 'Iron Ingot', stackSize: 64, isBlock: false, textureIndex: -22, category: 'material' };
ITEM_DEFINITIONS[ItemType.GOLD_RAW] = { id: ItemType.GOLD_RAW, name: 'Raw Gold', stackSize: 64, isBlock: false, textureIndex: -23, category: 'material' };
ITEM_DEFINITIONS[ItemType.GOLD_INGOT] = { id: ItemType.GOLD_INGOT, name: 'Gold Ingot', stackSize: 64, isBlock: false, textureIndex: -24, category: 'material' };
ITEM_DEFINITIONS[ItemType.DIAMOND] = { id: ItemType.DIAMOND, name: 'Diamond', stackSize: 64, isBlock: false, textureIndex: -25, category: 'material' };
ITEM_DEFINITIONS[ItemType.EMERALD] = { id: ItemType.EMERALD, name: 'Emerald', stackSize: 64, isBlock: false, textureIndex: -26, category: 'material' };
ITEM_DEFINITIONS[ItemType.BONE] = { id: ItemType.BONE, name: 'Bone', stackSize: 64, isBlock: false, textureIndex: -27, category: 'material' };
ITEM_DEFINITIONS[ItemType.FEATHER] = { id: ItemType.FEATHER, name: 'Feather', stackSize: 64, isBlock: false, textureIndex: -28, category: 'material' };
ITEM_DEFINITIONS[ItemType.LEATHER] = { id: ItemType.LEATHER, name: 'Leather', stackSize: 64, isBlock: false, textureIndex: -29, category: 'material' };
ITEM_DEFINITIONS[ItemType.STRING] = { id: ItemType.STRING, name: 'String', stackSize: 64, isBlock: false, textureIndex: -30, category: 'material' };
ITEM_DEFINITIONS[ItemType.ARROW] = { id: ItemType.ARROW, name: 'Arrow', stackSize: 64, isBlock: false, textureIndex: -31, category: 'material' };
ITEM_DEFINITIONS[ItemType.BOWL] = { id: ItemType.BOWL, name: 'Bowl', stackSize: 64, isBlock: false, textureIndex: -32, category: 'material' };
ITEM_DEFINITIONS[ItemType.WHEAT] = { id: ItemType.WHEAT, name: 'Wheat', stackSize: 64, isBlock: false, textureIndex: -33, category: 'material' };
ITEM_DEFINITIONS[ItemType.EGG] = { id: ItemType.EGG, name: 'Egg', stackSize: 16, isBlock: false, textureIndex: -34, category: 'material' };
ITEM_DEFINITIONS[ItemType.MUSIC_DISC] = { id: ItemType.MUSIC_DISC, name: 'Music Disc', stackSize: 1, isBlock: false, textureIndex: -35, category: 'material' };
ITEM_DEFINITIONS[ItemType.BUCKET] = { id: ItemType.BUCKET, name: 'Bucket', stackSize: 1, isBlock: false, textureIndex: -36, category: 'material' };
ITEM_DEFINITIONS[ItemType.WATER_BUCKET] = { id: ItemType.WATER_BUCKET, name: 'Water Bucket', stackSize: 1, isBlock: false, textureIndex: -37, category: 'material' };
ITEM_DEFINITIONS[ItemType.LAVA_BUCKET] = { id: ItemType.LAVA_BUCKET, name: 'Lava Bucket', stackSize: 1, isBlock: false, textureIndex: -38, category: 'material' };
ITEM_DEFINITIONS[ItemType.ENDER_PEARL] = { id: ItemType.ENDER_PEARL, name: 'Ender Pearl', stackSize: 16, isBlock: false, textureIndex: -39, category: 'material' };

// Pickaxes
ITEM_DEFINITIONS[ItemType.WOODEN_PICKAXE] = { id: ItemType.WOODEN_PICKAXE, name: 'Wooden Pickaxe', stackSize: 1, isBlock: false, textureIndex: -2, toolSpeed: 2.0, toolEffective: STONE_TYPES, durability: 59, category: 'tool' };
ITEM_DEFINITIONS[ItemType.STONE_PICKAXE] = { id: ItemType.STONE_PICKAXE, name: 'Stone Pickaxe', stackSize: 1, isBlock: false, textureIndex: -3, toolSpeed: 4.0, toolEffective: STONE_TYPES, durability: 131, category: 'tool' };
ITEM_DEFINITIONS[ItemType.IRON_PICKAXE] = { id: ItemType.IRON_PICKAXE, name: 'Iron Pickaxe', stackSize: 1, isBlock: false, textureIndex: -6, toolSpeed: 6.0, toolEffective: STONE_TYPES, durability: 250, category: 'tool' };
ITEM_DEFINITIONS[ItemType.DIAMOND_PICKAXE] = { id: ItemType.DIAMOND_PICKAXE, name: 'Diamond Pickaxe', stackSize: 1, isBlock: false, textureIndex: -7, toolSpeed: 8.0, toolEffective: STONE_TYPES, durability: 1561, category: 'tool' };

// Swords
ITEM_DEFINITIONS[ItemType.WOODEN_SWORD] = { id: ItemType.WOODEN_SWORD, name: 'Wooden Sword', stackSize: 1, isBlock: false, textureIndex: -4, attackDamage: 4, durability: 59, category: 'weapon' };
ITEM_DEFINITIONS[ItemType.STONE_SWORD] = { id: ItemType.STONE_SWORD, name: 'Stone Sword', stackSize: 1, isBlock: false, textureIndex: -5, attackDamage: 5, durability: 131, category: 'weapon' };
ITEM_DEFINITIONS[ItemType.IRON_SWORD] = { id: ItemType.IRON_SWORD, name: 'Iron Sword', stackSize: 1, isBlock: false, textureIndex: -8, attackDamage: 6, durability: 250, category: 'weapon' };
ITEM_DEFINITIONS[ItemType.DIAMOND_SWORD] = { id: ItemType.DIAMOND_SWORD, name: 'Diamond Sword', stackSize: 1, isBlock: false, textureIndex: -9, attackDamage: 7, durability: 1561, category: 'weapon' };

// Axes
ITEM_DEFINITIONS[ItemType.WOODEN_AXE] = { id: ItemType.WOODEN_AXE, name: 'Wooden Axe', stackSize: 1, isBlock: false, textureIndex: -10, toolSpeed: 2.0, toolEffective: WOOD_TYPES, attackDamage: 3, durability: 59, category: 'tool' };
ITEM_DEFINITIONS[ItemType.STONE_AXE] = { id: ItemType.STONE_AXE, name: 'Stone Axe', stackSize: 1, isBlock: false, textureIndex: -11, toolSpeed: 4.0, toolEffective: WOOD_TYPES, attackDamage: 4, durability: 131, category: 'tool' };
ITEM_DEFINITIONS[ItemType.IRON_AXE] = { id: ItemType.IRON_AXE, name: 'Iron Axe', stackSize: 1, isBlock: false, textureIndex: -12, toolSpeed: 6.0, toolEffective: WOOD_TYPES, attackDamage: 5, durability: 250, category: 'tool' };
ITEM_DEFINITIONS[ItemType.DIAMOND_AXE] = { id: ItemType.DIAMOND_AXE, name: 'Diamond Axe', stackSize: 1, isBlock: false, textureIndex: -13, toolSpeed: 8.0, toolEffective: WOOD_TYPES, attackDamage: 6, durability: 1561, category: 'tool' };

// Shovels
ITEM_DEFINITIONS[ItemType.WOODEN_SHOVEL] = { id: ItemType.WOODEN_SHOVEL, name: 'Wooden Shovel', stackSize: 1, isBlock: false, textureIndex: -14, toolSpeed: 2.0, toolEffective: DIRT_TYPES, durability: 59, category: 'tool' };
ITEM_DEFINITIONS[ItemType.STONE_SHOVEL] = { id: ItemType.STONE_SHOVEL, name: 'Stone Shovel', stackSize: 1, isBlock: false, textureIndex: -15, toolSpeed: 4.0, toolEffective: DIRT_TYPES, durability: 131, category: 'tool' };
ITEM_DEFINITIONS[ItemType.IRON_SHOVEL] = { id: ItemType.IRON_SHOVEL, name: 'Iron Shovel', stackSize: 1, isBlock: false, textureIndex: -16, toolSpeed: 6.0, toolEffective: DIRT_TYPES, durability: 250, category: 'tool' };
ITEM_DEFINITIONS[ItemType.DIAMOND_SHOVEL] = { id: ItemType.DIAMOND_SHOVEL, name: 'Diamond Shovel', stackSize: 1, isBlock: false, textureIndex: -17, toolSpeed: 8.0, toolEffective: DIRT_TYPES, durability: 1561, category: 'tool' };

// Special tools
ITEM_DEFINITIONS[ItemType.BOW] = { id: ItemType.BOW, name: 'Bow', stackSize: 1, isBlock: false, textureIndex: -18, attackDamage: 6, durability: 384, category: 'weapon' };
ITEM_DEFINITIONS[ItemType.SHIELD] = { id: ItemType.SHIELD, name: 'Shield', stackSize: 1, isBlock: false, textureIndex: -19, durability: 336, category: 'tool' };
ITEM_DEFINITIONS[ItemType.FISHING_ROD] = { id: ItemType.FISHING_ROD, name: 'Fishing Rod', stackSize: 1, isBlock: false, textureIndex: -40, durability: 64, category: 'tool' };

// Food items
ITEM_DEFINITIONS[ItemType.RAW_PORK] = { id: ItemType.RAW_PORK, name: 'Raw Pork', stackSize: 64, isBlock: false, textureIndex: -50, foodHunger: 3, foodSaturation: 1.8, category: 'food' };
ITEM_DEFINITIONS[ItemType.COOKED_PORK] = { id: ItemType.COOKED_PORK, name: 'Cooked Pork', stackSize: 64, isBlock: false, textureIndex: -51, foodHunger: 8, foodSaturation: 12.8, category: 'food' };
ITEM_DEFINITIONS[ItemType.RAW_BEEF] = { id: ItemType.RAW_BEEF, name: 'Raw Beef', stackSize: 64, isBlock: false, textureIndex: -52, foodHunger: 3, foodSaturation: 1.8, category: 'food' };
ITEM_DEFINITIONS[ItemType.COOKED_BEEF] = { id: ItemType.COOKED_BEEF, name: 'Cooked Beef', stackSize: 64, isBlock: false, textureIndex: -53, foodHunger: 8, foodSaturation: 12.8, category: 'food' };
ITEM_DEFINITIONS[ItemType.RAW_FISH] = { id: ItemType.RAW_FISH, name: 'Raw Fish', stackSize: 64, isBlock: false, textureIndex: -54, foodHunger: 2, foodSaturation: 0.4, category: 'food' };
ITEM_DEFINITIONS[ItemType.COOKED_FISH] = { id: ItemType.COOKED_FISH, name: 'Cooked Fish', stackSize: 64, isBlock: false, textureIndex: -55, foodHunger: 5, foodSaturation: 6.0, category: 'food' };
ITEM_DEFINITIONS[ItemType.APPLE] = { id: ItemType.APPLE, name: 'Apple', stackSize: 64, isBlock: false, textureIndex: -56, foodHunger: 4, foodSaturation: 2.4, category: 'food' };
ITEM_DEFINITIONS[ItemType.GOLDEN_APPLE] = { id: ItemType.GOLDEN_APPLE, name: 'Golden Apple', stackSize: 64, isBlock: false, textureIndex: -57, foodHunger: 4, foodSaturation: 9.6, category: 'food' };
ITEM_DEFINITIONS[ItemType.BREAD] = { id: ItemType.BREAD, name: 'Bread', stackSize: 64, isBlock: false, textureIndex: -58, foodHunger: 5, foodSaturation: 6.0, category: 'food' };
ITEM_DEFINITIONS[ItemType.MUSHROOM_STEW] = { id: ItemType.MUSHROOM_STEW, name: 'Mushroom Stew', stackSize: 1, isBlock: false, textureIndex: -59, foodHunger: 6, foodSaturation: 7.2, category: 'food' };
ITEM_DEFINITIONS[ItemType.RAW_CHICKEN] = { id: ItemType.RAW_CHICKEN, name: 'Raw Chicken', stackSize: 64, isBlock: false, textureIndex: -60, foodHunger: 2, foodSaturation: 1.2, category: 'food' };
ITEM_DEFINITIONS[ItemType.COOKED_CHICKEN] = { id: ItemType.COOKED_CHICKEN, name: 'Cooked Chicken', stackSize: 64, isBlock: false, textureIndex: -61, foodHunger: 6, foodSaturation: 7.2, category: 'food' };
ITEM_DEFINITIONS[ItemType.HONEY] = { id: ItemType.HONEY, name: 'Honey', stackSize: 64, isBlock: false, textureIndex: -62, foodHunger: 6, foodSaturation: 1.2, category: 'food' };

// Armor - Leather
ITEM_DEFINITIONS[ItemType.LEATHER_HELMET] = { id: ItemType.LEATHER_HELMET, name: 'Leather Helmet', stackSize: 1, isBlock: false, textureIndex: -70, armorDefense: 1, armorSlot: 'helmet', durability: 55, category: 'armor' };
ITEM_DEFINITIONS[ItemType.LEATHER_CHESTPLATE] = { id: ItemType.LEATHER_CHESTPLATE, name: 'Leather Chestplate', stackSize: 1, isBlock: false, textureIndex: -71, armorDefense: 3, armorSlot: 'chestplate', durability: 80, category: 'armor' };
ITEM_DEFINITIONS[ItemType.LEATHER_LEGGINGS] = { id: ItemType.LEATHER_LEGGINGS, name: 'Leather Leggings', stackSize: 1, isBlock: false, textureIndex: -72, armorDefense: 2, armorSlot: 'leggings', durability: 75, category: 'armor' };
ITEM_DEFINITIONS[ItemType.LEATHER_BOOTS] = { id: ItemType.LEATHER_BOOTS, name: 'Leather Boots', stackSize: 1, isBlock: false, textureIndex: -73, armorDefense: 1, armorSlot: 'boots', durability: 65, category: 'armor' };

// Armor - Iron
ITEM_DEFINITIONS[ItemType.IRON_HELMET] = { id: ItemType.IRON_HELMET, name: 'Iron Helmet', stackSize: 1, isBlock: false, textureIndex: -74, armorDefense: 2, armorSlot: 'helmet', durability: 165, category: 'armor' };
ITEM_DEFINITIONS[ItemType.IRON_CHESTPLATE] = { id: ItemType.IRON_CHESTPLATE, name: 'Iron Chestplate', stackSize: 1, isBlock: false, textureIndex: -75, armorDefense: 6, armorSlot: 'chestplate', durability: 240, category: 'armor' };
ITEM_DEFINITIONS[ItemType.IRON_LEGGINGS] = { id: ItemType.IRON_LEGGINGS, name: 'Iron Leggings', stackSize: 1, isBlock: false, textureIndex: -76, armorDefense: 5, armorSlot: 'leggings', durability: 225, category: 'armor' };
ITEM_DEFINITIONS[ItemType.IRON_BOOTS] = { id: ItemType.IRON_BOOTS, name: 'Iron Boots', stackSize: 1, isBlock: false, textureIndex: -77, armorDefense: 2, armorSlot: 'boots', durability: 195, category: 'armor' };

// Armor - Diamond
ITEM_DEFINITIONS[ItemType.DIAMOND_HELMET] = { id: ItemType.DIAMOND_HELMET, name: 'Diamond Helmet', stackSize: 1, isBlock: false, textureIndex: -78, armorDefense: 3, armorSlot: 'helmet', durability: 363, category: 'armor' };
ITEM_DEFINITIONS[ItemType.DIAMOND_CHESTPLATE] = { id: ItemType.DIAMOND_CHESTPLATE, name: 'Diamond Chestplate', stackSize: 1, isBlock: false, textureIndex: -79, armorDefense: 8, armorSlot: 'chestplate', durability: 528, category: 'armor' };
ITEM_DEFINITIONS[ItemType.DIAMOND_LEGGINGS] = { id: ItemType.DIAMOND_LEGGINGS, name: 'Diamond Leggings', stackSize: 1, isBlock: false, textureIndex: -80, armorDefense: 6, armorSlot: 'leggings', durability: 495, category: 'armor' };
ITEM_DEFINITIONS[ItemType.DIAMOND_BOOTS] = { id: ItemType.DIAMOND_BOOTS, name: 'Diamond Boots', stackSize: 1, isBlock: false, textureIndex: -81, armorDefense: 3, armorSlot: 'boots', durability: 429, category: 'armor' };

export function getItemDefinition(type: ItemType): ItemDefinition | undefined {
  return ITEM_DEFINITIONS[type];
}

export function blockTypeToItemType(block: BlockType): ItemType | null {
  if (block === BlockType.AIR || block === BlockType.WATER) return null;
  return block as number as ItemType;
}
