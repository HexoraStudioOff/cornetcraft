import { ItemType } from '../ui/ItemTypes';

type Slot = ItemType | null;

export interface CraftingRecipe {
  /** Pattern rows (top to bottom). null = empty slot. Smallest bounding box is used for matching. */
  readonly pattern: Slot[][];
  readonly result: { readonly item: ItemType; readonly count: number };
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // ===== BASIC =====
  { pattern: [[ItemType.WOOD]], result: { item: ItemType.PLANKS, count: 4 } },
  { pattern: [[ItemType.PLANKS], [ItemType.PLANKS]], result: { item: ItemType.STICK, count: 4 } },
  { pattern: [[ItemType.PLANKS, ItemType.PLANKS], [ItemType.PLANKS, ItemType.PLANKS]], result: { item: ItemType.CRAFTING_TABLE, count: 1 } },
  { pattern: [[ItemType.PLANKS, ItemType.PLANKS, ItemType.PLANKS], [ItemType.PLANKS, null, ItemType.PLANKS], [ItemType.PLANKS, ItemType.PLANKS, ItemType.PLANKS]], result: { item: ItemType.CHEST, count: 1 } },
  { pattern: [[ItemType.STICK], [ItemType.STICK]], result: { item: ItemType.TORCH, count: 4 } },
  { pattern: [[ItemType.COAL], [ItemType.STICK]], result: { item: ItemType.TORCH, count: 4 } },
  { pattern: [[ItemType.PLANKS, ItemType.PLANKS], [ItemType.PLANKS, ItemType.PLANKS], [ItemType.PLANKS, ItemType.PLANKS]], result: { item: ItemType.LADDER, count: 3 } },
  { pattern: [[ItemType.PLANKS], [ItemType.PLANKS], [ItemType.PLANKS]], result: { item: ItemType.BOWL, count: 4 } },

  // ===== WOODEN TOOLS =====
  { pattern: [[ItemType.PLANKS, ItemType.PLANKS, ItemType.PLANKS], [null, ItemType.STICK, null], [null, ItemType.STICK, null]], result: { item: ItemType.WOODEN_PICKAXE, count: 1 } },
  { pattern: [[ItemType.PLANKS], [ItemType.PLANKS], [ItemType.STICK]], result: { item: ItemType.WOODEN_SWORD, count: 1 } },
  { pattern: [[ItemType.PLANKS, ItemType.PLANKS], [ItemType.PLANKS, ItemType.STICK], [null, ItemType.STICK]], result: { item: ItemType.WOODEN_AXE, count: 1 } },
  { pattern: [[ItemType.PLANKS], [ItemType.STICK], [ItemType.STICK]], result: { item: ItemType.WOODEN_SHOVEL, count: 1 } },

  // ===== STONE TOOLS =====
  { pattern: [[ItemType.COBBLESTONE, ItemType.COBBLESTONE, ItemType.COBBLESTONE], [null, ItemType.STICK, null], [null, ItemType.STICK, null]], result: { item: ItemType.STONE_PICKAXE, count: 1 } },
  { pattern: [[ItemType.COBBLESTONE], [ItemType.COBBLESTONE], [ItemType.STICK]], result: { item: ItemType.STONE_SWORD, count: 1 } },
  { pattern: [[ItemType.COBBLESTONE, ItemType.COBBLESTONE], [ItemType.COBBLESTONE, ItemType.STICK], [null, ItemType.STICK]], result: { item: ItemType.STONE_AXE, count: 1 } },
  { pattern: [[ItemType.COBBLESTONE], [ItemType.STICK], [ItemType.STICK]], result: { item: ItemType.STONE_SHOVEL, count: 1 } },

  // ===== IRON TOOLS =====
  { pattern: [[ItemType.IRON_INGOT, ItemType.IRON_INGOT, ItemType.IRON_INGOT], [null, ItemType.STICK, null], [null, ItemType.STICK, null]], result: { item: ItemType.IRON_PICKAXE, count: 1 } },
  { pattern: [[ItemType.IRON_INGOT], [ItemType.IRON_INGOT], [ItemType.STICK]], result: { item: ItemType.IRON_SWORD, count: 1 } },
  { pattern: [[ItemType.IRON_INGOT, ItemType.IRON_INGOT], [ItemType.IRON_INGOT, ItemType.STICK], [null, ItemType.STICK]], result: { item: ItemType.IRON_AXE, count: 1 } },
  { pattern: [[ItemType.IRON_INGOT], [ItemType.STICK], [ItemType.STICK]], result: { item: ItemType.IRON_SHOVEL, count: 1 } },

  // ===== DIAMOND TOOLS =====
  { pattern: [[ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND], [null, ItemType.STICK, null], [null, ItemType.STICK, null]], result: { item: ItemType.DIAMOND_PICKAXE, count: 1 } },
  { pattern: [[ItemType.DIAMOND], [ItemType.DIAMOND], [ItemType.STICK]], result: { item: ItemType.DIAMOND_SWORD, count: 1 } },
  { pattern: [[ItemType.DIAMOND, ItemType.DIAMOND], [ItemType.DIAMOND, ItemType.STICK], [null, ItemType.STICK]], result: { item: ItemType.DIAMOND_AXE, count: 1 } },
  { pattern: [[ItemType.DIAMOND], [ItemType.STICK], [ItemType.STICK]], result: { item: ItemType.DIAMOND_SHOVEL, count: 1 } },

  // ===== SPECIAL TOOLS =====
  { pattern: [[null, ItemType.STICK, null], [ItemType.STRING, null, ItemType.STRING], [null, ItemType.STICK, null]], result: { item: ItemType.BOW, count: 1 } },
  { pattern: [[ItemType.STICK], [ItemType.FEATHER], [ItemType.COBBLESTONE]], result: { item: ItemType.ARROW, count: 4 } },
  { pattern: [[ItemType.PLANKS, ItemType.IRON_INGOT, ItemType.PLANKS], [ItemType.PLANKS, ItemType.PLANKS, ItemType.PLANKS], [null, ItemType.PLANKS, null]], result: { item: ItemType.SHIELD, count: 1 } },
  { pattern: [[null, null, ItemType.STICK], [null, ItemType.STICK, ItemType.STRING], [ItemType.STICK, null, ItemType.STRING]], result: { item: ItemType.FISHING_ROD, count: 1 } },
  { pattern: [[ItemType.IRON_INGOT, ItemType.IRON_INGOT, ItemType.IRON_INGOT], [null, null, null], [null, null, null]], result: { item: ItemType.BUCKET, count: 1 } },

  // ===== ARMOR - LEATHER =====
  { pattern: [[ItemType.LEATHER, null, ItemType.LEATHER], [ItemType.LEATHER, ItemType.LEATHER, ItemType.LEATHER]], result: { item: ItemType.LEATHER_HELMET, count: 1 } },
  { pattern: [[ItemType.LEATHER, null, ItemType.LEATHER], [ItemType.LEATHER, ItemType.LEATHER, ItemType.LEATHER], [ItemType.LEATHER, ItemType.LEATHER, ItemType.LEATHER]], result: { item: ItemType.LEATHER_CHESTPLATE, count: 1 } },
  { pattern: [[ItemType.LEATHER, ItemType.LEATHER, ItemType.LEATHER], [ItemType.LEATHER, null, ItemType.LEATHER], [ItemType.LEATHER, null, ItemType.LEATHER]], result: { item: ItemType.LEATHER_LEGGINGS, count: 1 } },
  { pattern: [[ItemType.LEATHER, null, ItemType.LEATHER], [ItemType.LEATHER, null, ItemType.LEATHER]], result: { item: ItemType.LEATHER_BOOTS, count: 1 } },

  // ===== ARMOR - IRON =====
  { pattern: [[ItemType.IRON_INGOT, null, ItemType.IRON_INGOT], [ItemType.IRON_INGOT, ItemType.IRON_INGOT, ItemType.IRON_INGOT]], result: { item: ItemType.IRON_HELMET, count: 1 } },
  { pattern: [[ItemType.IRON_INGOT, null, ItemType.IRON_INGOT], [ItemType.IRON_INGOT, ItemType.IRON_INGOT, ItemType.IRON_INGOT], [ItemType.IRON_INGOT, ItemType.IRON_INGOT, ItemType.IRON_INGOT]], result: { item: ItemType.IRON_CHESTPLATE, count: 1 } },
  { pattern: [[ItemType.IRON_INGOT, ItemType.IRON_INGOT, ItemType.IRON_INGOT], [ItemType.IRON_INGOT, null, ItemType.IRON_INGOT], [ItemType.IRON_INGOT, null, ItemType.IRON_INGOT]], result: { item: ItemType.IRON_LEGGINGS, count: 1 } },
  { pattern: [[ItemType.IRON_INGOT, null, ItemType.IRON_INGOT], [ItemType.IRON_INGOT, null, ItemType.IRON_INGOT]], result: { item: ItemType.IRON_BOOTS, count: 1 } },

  // ===== ARMOR - DIAMOND =====
  { pattern: [[ItemType.DIAMOND, null, ItemType.DIAMOND], [ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND]], result: { item: ItemType.DIAMOND_HELMET, count: 1 } },
  { pattern: [[ItemType.DIAMOND, null, ItemType.DIAMOND], [ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND], [ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND]], result: { item: ItemType.DIAMOND_CHESTPLATE, count: 1 } },
  { pattern: [[ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND], [ItemType.DIAMOND, null, ItemType.DIAMOND], [ItemType.DIAMOND, null, ItemType.DIAMOND]], result: { item: ItemType.DIAMOND_LEGGINGS, count: 1 } },
  { pattern: [[ItemType.DIAMOND, null, ItemType.DIAMOND], [ItemType.DIAMOND, null, ItemType.DIAMOND]], result: { item: ItemType.DIAMOND_BOOTS, count: 1 } },

  // ===== BLOCKS =====
  { pattern: [[ItemType.COBBLESTONE, ItemType.COBBLESTONE, ItemType.COBBLESTONE], [ItemType.COBBLESTONE, null, ItemType.COBBLESTONE], [ItemType.COBBLESTONE, ItemType.COBBLESTONE, ItemType.COBBLESTONE]], result: { item: ItemType.FURNACE, count: 1 } },
  { pattern: [[ItemType.IRON_INGOT, ItemType.IRON_INGOT, ItemType.IRON_INGOT], [ItemType.IRON_INGOT, ItemType.IRON_INGOT, ItemType.IRON_INGOT], [ItemType.IRON_INGOT, ItemType.IRON_INGOT, ItemType.IRON_INGOT]], result: { item: ItemType.IRON_BLOCK, count: 1 } },
  { pattern: [[ItemType.GOLD_INGOT, ItemType.GOLD_INGOT, ItemType.GOLD_INGOT], [ItemType.GOLD_INGOT, ItemType.GOLD_INGOT, ItemType.GOLD_INGOT], [ItemType.GOLD_INGOT, ItemType.GOLD_INGOT, ItemType.GOLD_INGOT]], result: { item: ItemType.GOLD_BLOCK, count: 1 } },
  { pattern: [[ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND], [ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND], [ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND]], result: { item: ItemType.DIAMOND_BLOCK, count: 1 } },
  { pattern: [[ItemType.COBBLESTONE, ItemType.COBBLESTONE], [ItemType.COBBLESTONE, ItemType.COBBLESTONE]], result: { item: ItemType.STONE_BRICKS, count: 4 } },
  { pattern: [[ItemType.SAND, ItemType.SAND], [ItemType.SAND, ItemType.SAND]], result: { item: ItemType.GLASS, count: 1 } },
  { pattern: [[ItemType.PLANKS, ItemType.PLANKS, ItemType.PLANKS], [ItemType.PLANKS, ItemType.BOOKSHELF, ItemType.PLANKS], [ItemType.PLANKS, ItemType.PLANKS, ItemType.PLANKS]], result: { item: ItemType.JUKEBOX, count: 1 } },

  // ===== FOOD =====
  { pattern: [[ItemType.WHEAT, ItemType.WHEAT, ItemType.WHEAT]], result: { item: ItemType.BREAD, count: 1 } },
  { pattern: [[ItemType.GOLD_INGOT, ItemType.GOLD_INGOT, ItemType.GOLD_INGOT], [ItemType.GOLD_INGOT, ItemType.APPLE, ItemType.GOLD_INGOT], [ItemType.GOLD_INGOT, ItemType.GOLD_INGOT, ItemType.GOLD_INGOT]], result: { item: ItemType.GOLDEN_APPLE, count: 1 } },
  { pattern: [[ItemType.MUSHROOM_RED], [ItemType.MUSHROOM_BROWN], [ItemType.BOWL]], result: { item: ItemType.MUSHROOM_STEW, count: 1 } },

  // ===== BLOCK DECOMPOSITION =====
  { pattern: [[ItemType.IRON_BLOCK]], result: { item: ItemType.IRON_INGOT, count: 9 } },
  { pattern: [[ItemType.GOLD_BLOCK]], result: { item: ItemType.GOLD_INGOT, count: 9 } },
  { pattern: [[ItemType.DIAMOND_BLOCK]], result: { item: ItemType.DIAMOND, count: 9 } },
];

/** Furnace smelting recipes: input item -> output item */
export interface SmeltingRecipe {
  readonly input: ItemType;
  readonly output: ItemType;
  readonly duration: number; // seconds
}

export const SMELTING_RECIPES: SmeltingRecipe[] = [
  { input: ItemType.IRON_ORE, output: ItemType.IRON_INGOT, duration: 10 },
  { input: ItemType.GOLD_ORE, output: ItemType.GOLD_INGOT, duration: 10 },
  { input: ItemType.IRON_RAW, output: ItemType.IRON_INGOT, duration: 10 },
  { input: ItemType.GOLD_RAW, output: ItemType.GOLD_INGOT, duration: 10 },
  { input: ItemType.RAW_PORK, output: ItemType.COOKED_PORK, duration: 8 },
  { input: ItemType.RAW_BEEF, output: ItemType.COOKED_BEEF, duration: 8 },
  { input: ItemType.RAW_FISH, output: ItemType.COOKED_FISH, duration: 8 },
  { input: ItemType.RAW_CHICKEN, output: ItemType.COOKED_CHICKEN, duration: 8 },
  { input: ItemType.SAND, output: ItemType.GLASS, duration: 10 },
  { input: ItemType.COBBLESTONE, output: ItemType.STONE, duration: 10 },
];

/** Fuel values: item -> burn time in seconds */
export const FUEL_VALUES: Record<number, number> = {
  [ItemType.WOOD]: 15,
  [ItemType.PLANKS]: 15,
  [ItemType.DARK_PLANKS]: 15,
  [ItemType.STICK]: 5,
  [ItemType.COAL]: 80,
  [ItemType.BOOKSHELF]: 15,
  [ItemType.CRAFTING_TABLE]: 15,
  [ItemType.CHEST]: 15,
  [ItemType.LADDER]: 15,
  [ItemType.BOWL]: 5,
};

/** Extract the minimal bounding box of a pattern (trim empty rows/cols) */
function trimPattern(pattern: Slot[][]): Slot[][] {
  let minRow = pattern.length, maxRow = -1;
  let minCol = pattern[0]?.length ?? 0, maxCol = -1;

  for (let r = 0; r < pattern.length; r++) {
    for (let c = 0; c < pattern[r].length; c++) {
      if (pattern[r][c] !== null) {
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
      }
    }
  }

  if (maxRow === -1) return [];

  const trimmed: Slot[][] = [];
  for (let r = minRow; r <= maxRow; r++) {
    const row: Slot[] = [];
    for (let c = minCol; c <= maxCol; c++) {
      row.push(pattern[r][c] ?? null);
    }
    trimmed.push(row);
  }
  return trimmed;
}

/** Check if a crafting grid matches any recipe. Grid is row-major, gridSize is 2 or 3. */
export function findMatchingRecipe(
  grid: (ItemType | null)[],
  gridSize: number,
): CraftingRecipe | null {
  const grid2D: Slot[][] = [];
  for (let r = 0; r < gridSize; r++) {
    const row: Slot[] = [];
    for (let c = 0; c < gridSize; c++) {
      row.push(grid[r * gridSize + c]);
    }
    grid2D.push(row);
  }

  const trimmedGrid = trimPattern(grid2D);
  if (trimmedGrid.length === 0) return null;

  for (const recipe of CRAFTING_RECIPES) {
    const trimmedRecipe = trimPattern(recipe.pattern);
    if (patternsMatch(trimmedGrid, trimmedRecipe)) {
      return recipe;
    }
  }
  return null;
}

function patternsMatch(a: Slot[][], b: Slot[][]): boolean {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    if (a[r].length !== b[r].length) return false;
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

/** Find smelting recipe for an input item */
export function findSmeltingRecipe(input: ItemType): SmeltingRecipe | null {
  return SMELTING_RECIPES.find(r => r.input === input) ?? null;
}

/** Get fuel burn time for an item (0 if not fuel) */
export function getFuelValue(item: ItemType): number {
  return FUEL_VALUES[item] ?? 0;
}
