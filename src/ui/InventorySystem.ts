import { ItemType, ITEM_DEFINITIONS, getItemDefinition } from './ItemTypes';
import { findMatchingRecipe } from '../blocks/CraftingRecipes';

export interface ItemStack {
  itemType: ItemType;
  count: number;
}

export class InventorySystem {
  readonly hotbar: (ItemStack | null)[];
  readonly mainInventory: (ItemStack | null)[];
  /** 2x2 for player inventory, 3x3 for crafting table */
  craftingGrid: (ItemStack | null)[];
  craftingResult: ItemStack | null = null;
  craftingGridSize: number = 2;

  /** Item held by cursor during inventory interaction */
  cursorStack: ItemStack | null = null;

  /** Chest inventory slots (set when a chest is open) */
  chestInventory: (ItemStack | null)[] | null = null;

  constructor() {
    this.hotbar = new Array(9).fill(null);
    this.mainInventory = new Array(27).fill(null);
    this.craftingGrid = new Array(4).fill(null);
  }

  /** Set crafting grid size (2 for inventory, 3 for crafting table) */
  setCraftingGridSize(size: number): void {
    if (size === this.craftingGridSize) return;
    // Return items from current grid to inventory
    this.returnCraftingItems();
    this.craftingGridSize = size;
    this.craftingGrid = new Array(size * size).fill(null);
    this.craftingResult = null;
  }

  /** Return all crafting grid items to inventory */
  returnCraftingItems(): void {
    for (let i = 0; i < this.craftingGrid.length; i++) {
      const stack = this.craftingGrid[i];
      if (stack) {
        this.addItem(stack.itemType, stack.count);
        this.craftingGrid[i] = null;
      }
    }
    this.craftingResult = null;
  }

  /** Try to add items to inventory. Returns number of items that couldn't fit. */
  addItem(type: ItemType, count: number): number {
    const def = getItemDefinition(type);
    if (!def) return count;
    const maxStack = def.stackSize;
    let remaining = count;

    // First pass: fill existing stacks in hotbar
    for (let i = 0; i < this.hotbar.length && remaining > 0; i++) {
      const slot = this.hotbar[i];
      if (slot && slot.itemType === type && slot.count < maxStack) {
        const space = maxStack - slot.count;
        const toAdd = Math.min(space, remaining);
        slot.count += toAdd;
        remaining -= toAdd;
      }
    }

    // Second pass: fill existing stacks in main inventory
    for (let i = 0; i < this.mainInventory.length && remaining > 0; i++) {
      const slot = this.mainInventory[i];
      if (slot && slot.itemType === type && slot.count < maxStack) {
        const space = maxStack - slot.count;
        const toAdd = Math.min(space, remaining);
        slot.count += toAdd;
        remaining -= toAdd;
      }
    }

    // Third pass: empty slots in hotbar
    for (let i = 0; i < this.hotbar.length && remaining > 0; i++) {
      if (!this.hotbar[i]) {
        const toAdd = Math.min(maxStack, remaining);
        this.hotbar[i] = { itemType: type, count: toAdd };
        remaining -= toAdd;
      }
    }

    // Fourth pass: empty slots in main inventory
    for (let i = 0; i < this.mainInventory.length && remaining > 0; i++) {
      if (!this.mainInventory[i]) {
        const toAdd = Math.min(maxStack, remaining);
        this.mainInventory[i] = { itemType: type, count: toAdd };
        remaining -= toAdd;
      }
    }

    return remaining;
  }

  /** Get a slot by unified index: 0-8 = hotbar, 9-35 = main inventory */
  getSlot(index: number): ItemStack | null {
    if (index < 9) return this.hotbar[index];
    if (index < 36) return this.mainInventory[index - 9];
    return null;
  }

  /** Set a slot by unified index */
  setSlot(index: number, stack: ItemStack | null): void {
    if (index < 9) this.hotbar[index] = stack;
    else if (index < 36) this.mainInventory[index - 9] = stack;
  }

  /** Handle left-click on an inventory slot */
  clickSlot(index: number): void {
    const current = this.getSlot(index);
    if (!this.cursorStack && !current) return;

    if (!this.cursorStack) {
      // Pick up entire stack
      this.cursorStack = current;
      this.setSlot(index, null);
    } else if (!current) {
      // Place entire stack
      this.setSlot(index, this.cursorStack);
      this.cursorStack = null;
    } else if (current.itemType === this.cursorStack.itemType) {
      // Merge stacks
      const def = getItemDefinition(current.itemType);
      const maxStack = def?.stackSize ?? 64;
      const space = maxStack - current.count;
      const toAdd = Math.min(space, this.cursorStack.count);
      current.count += toAdd;
      this.cursorStack.count -= toAdd;
      if (this.cursorStack.count <= 0) this.cursorStack = null;
    } else {
      // Swap stacks
      this.setSlot(index, this.cursorStack);
      this.cursorStack = current;
    }
  }

  /** Handle right-click on an inventory slot (place single item) */
  rightClickSlot(index: number): void {
    const current = this.getSlot(index);

    if (!this.cursorStack) {
      // Split stack: take half
      if (current && current.count > 1) {
        const takeCount = Math.ceil(current.count / 2);
        this.cursorStack = { itemType: current.itemType, count: takeCount };
        current.count -= takeCount;
        if (current.count <= 0) this.setSlot(index, null);
      } else if (current) {
        this.cursorStack = current;
        this.setSlot(index, null);
      }
    } else {
      // Place one item
      if (!current) {
        this.setSlot(index, { itemType: this.cursorStack.itemType, count: 1 });
        this.cursorStack.count--;
        if (this.cursorStack.count <= 0) this.cursorStack = null;
      } else if (current.itemType === this.cursorStack.itemType) {
        const def = getItemDefinition(current.itemType);
        const maxStack = def?.stackSize ?? 64;
        if (current.count < maxStack) {
          current.count++;
          this.cursorStack.count--;
          if (this.cursorStack.count <= 0) this.cursorStack = null;
        }
      }
    }
  }

  /** Handle click on a crafting grid slot */
  clickCraftingSlot(slotIndex: number): void {
    const current = this.craftingGrid[slotIndex] ?? null;

    if (!this.cursorStack && !current) return;

    if (!this.cursorStack) {
      this.cursorStack = current;
      this.craftingGrid[slotIndex] = null;
    } else if (!current) {
      this.craftingGrid[slotIndex] = this.cursorStack;
      this.cursorStack = null;
    } else if (current.itemType === this.cursorStack.itemType) {
      const def = getItemDefinition(current.itemType);
      const maxStack = def?.stackSize ?? 64;
      const space = maxStack - current.count;
      const toAdd = Math.min(space, this.cursorStack.count);
      current.count += toAdd;
      this.cursorStack.count -= toAdd;
      if (this.cursorStack.count <= 0) this.cursorStack = null;
    } else {
      this.craftingGrid[slotIndex] = this.cursorStack;
      this.cursorStack = current;
    }
    this.updateCraftingResult();
  }

  /** Handle right-click on crafting slot */
  rightClickCraftingSlot(slotIndex: number): void {
    const current = this.craftingGrid[slotIndex] ?? null;

    if (!this.cursorStack) {
      if (current && current.count > 1) {
        const takeCount = Math.ceil(current.count / 2);
        this.cursorStack = { itemType: current.itemType, count: takeCount };
        current.count -= takeCount;
      } else if (current) {
        this.cursorStack = current;
        this.craftingGrid[slotIndex] = null;
      }
    } else {
      if (!current) {
        this.craftingGrid[slotIndex] = { itemType: this.cursorStack.itemType, count: 1 };
        this.cursorStack.count--;
        if (this.cursorStack.count <= 0) this.cursorStack = null;
      } else if (current.itemType === this.cursorStack.itemType) {
        const def = getItemDefinition(current.itemType);
        if (current.count < (def?.stackSize ?? 64)) {
          current.count++;
          this.cursorStack.count--;
          if (this.cursorStack.count <= 0) this.cursorStack = null;
        }
      }
    }
    this.updateCraftingResult();
  }

  /** Recalculate crafting result based on current grid */
  updateCraftingResult(): void {
    const gridItems = this.craftingGrid.map(s => s?.itemType ?? null);
    const recipe = findMatchingRecipe(gridItems, this.craftingGridSize);
    if (recipe) {
      this.craftingResult = { itemType: recipe.result.item, count: recipe.result.count };
    } else {
      this.craftingResult = null;
    }
  }

  /** Take the crafting result, consuming ingredients */
  takeCraftingResult(): void {
    if (!this.craftingResult) return;

    const result = { ...this.craftingResult };

    // Add to cursor or merge
    if (!this.cursorStack) {
      this.cursorStack = result;
    } else if (this.cursorStack.itemType === result.itemType) {
      const def = getItemDefinition(result.itemType);
      const maxStack = def?.stackSize ?? 64;
      if (this.cursorStack.count + result.count > maxStack) return;
      this.cursorStack.count += result.count;
    } else {
      return;
    }

    // Consume one of each ingredient
    for (let i = 0; i < this.craftingGrid.length; i++) {
      const slot = this.craftingGrid[i];
      if (slot) {
        slot.count--;
        if (slot.count <= 0) this.craftingGrid[i] = null;
      }
    }

    this.updateCraftingResult();
  }

  /** Open a chest: attach its inventory slots for interaction */
  openChest(slots: (ItemStack | null)[]): void {
    this.chestInventory = slots;
  }

  /** Close a chest: detach and return the chest inventory */
  closeChest(): (ItemStack | null)[] | null {
    const inv = this.chestInventory;
    this.chestInventory = null;
    return inv;
  }

  /** Handle left-click on a chest slot */
  clickChestSlot(index: number): void {
    if (!this.chestInventory) return;
    const current = this.chestInventory[index] ?? null;

    if (!this.cursorStack && !current) return;

    if (!this.cursorStack) {
      this.cursorStack = current;
      this.chestInventory[index] = null;
    } else if (!current) {
      this.chestInventory[index] = this.cursorStack;
      this.cursorStack = null;
    } else if (current.itemType === this.cursorStack.itemType) {
      const def = getItemDefinition(current.itemType);
      const maxStack = def?.stackSize ?? 64;
      const space = maxStack - current.count;
      const toAdd = Math.min(space, this.cursorStack.count);
      current.count += toAdd;
      this.cursorStack.count -= toAdd;
      if (this.cursorStack.count <= 0) this.cursorStack = null;
    } else {
      this.chestInventory[index] = this.cursorStack;
      this.cursorStack = current;
    }
  }

  /** Handle right-click on a chest slot */
  rightClickChestSlot(index: number): void {
    if (!this.chestInventory) return;
    const current = this.chestInventory[index] ?? null;

    if (!this.cursorStack) {
      if (current && current.count > 1) {
        const takeCount = Math.ceil(current.count / 2);
        this.cursorStack = { itemType: current.itemType, count: takeCount };
        current.count -= takeCount;
        if (current.count <= 0) this.chestInventory[index] = null;
      } else if (current) {
        this.cursorStack = current;
        this.chestInventory[index] = null;
      }
    } else {
      if (!current) {
        this.chestInventory[index] = { itemType: this.cursorStack.itemType, count: 1 };
        this.cursorStack.count--;
        if (this.cursorStack.count <= 0) this.cursorStack = null;
      } else if (current.itemType === this.cursorStack.itemType) {
        const def = getItemDefinition(current.itemType);
        if (current.count < (def?.stackSize ?? 64)) {
          current.count++;
          this.cursorStack.count--;
          if (this.cursorStack.count <= 0) this.cursorStack = null;
        }
      }
    }
  }

  /** Check if hotbar slot has an item with tool speed */
  getHeldToolSpeed(slotIndex: number): number {
    const stack = this.hotbar[slotIndex];
    if (!stack) return 1.0;
    const def = ITEM_DEFINITIONS[stack.itemType];
    return def?.toolSpeed ?? 1.0;
  }

  /** Check if held tool is effective against a block type */
  isToolEffective(slotIndex: number, blockType: number): boolean {
    const stack = this.hotbar[slotIndex];
    if (!stack) return false;
    const def = ITEM_DEFINITIONS[stack.itemType];
    if (!def?.toolEffective) return false;
    return def.toolEffective.includes(blockType);
  }
}
