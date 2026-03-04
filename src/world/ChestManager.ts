import { ItemStack } from '../ui/InventorySystem';

const CHEST_SIZE = 27;

export class ChestManager {
  private readonly chests: Map<string, (ItemStack | null)[]> = new Map();

  private key(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  /** Register a chest. If one already exists at this position, it is NOT overwritten. */
  registerChest(x: number, y: number, z: number, items?: (ItemStack | null)[]): void {
    const k = this.key(x, y, z);
    if (this.chests.has(k)) return;
    this.chests.set(k, items ?? new Array<ItemStack | null>(CHEST_SIZE).fill(null));
  }

  /** Get the inventory of a chest at this position, or null if none exists. */
  getChest(x: number, y: number, z: number): (ItemStack | null)[] | null {
    return this.chests.get(this.key(x, y, z)) ?? null;
  }

  /** Remove a chest and return its inventory (for dropping items). */
  removeChest(x: number, y: number, z: number): (ItemStack | null)[] | null {
    const k = this.key(x, y, z);
    const items = this.chests.get(k) ?? null;
    this.chests.delete(k);
    return items;
  }

  /** Check if a chest exists at this position. */
  hasChest(x: number, y: number, z: number): boolean {
    return this.chests.has(this.key(x, y, z));
  }
}
