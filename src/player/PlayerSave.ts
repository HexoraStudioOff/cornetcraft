// src/player/PlayerSave.ts
import { openDB, type IDBPDatabase } from 'idb';
import type { ItemStack } from '../ui/InventorySystem';

type Slot = ItemStack | null;

export type InventorySnapshot = {
  v: 1;
  hotbar: Slot[];        // length 9
  main: Slot[];          // length 27
  craftingGrid: Slot[];  // length 4 (ou 9 si table)
  craftingGridSize: number;
  cursorStack: Slot;     // item dans le curseur
};

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB('cornetcraft', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('blocks')) db.createObjectStore('blocks');
        if (!db.objectStoreNames.contains('player')) db.createObjectStore('player');
      },
    });
  }
  return dbPromise;
}

function invKey(seed: number) {
  return `inv:${seed}`;
}

export class PlayerSave {
  constructor(private seed: number) {}

  async saveInventory(snapshot: InventorySnapshot) {
    const db = await getDb();
    await db.put('player', snapshot, invKey(this.seed));
  }

  async loadInventory(): Promise<InventorySnapshot | null> {
    const db = await getDb();
    const v = await db.get('player', invKey(this.seed));
    return (v as InventorySnapshot | undefined) ?? null;
  }

  async clearInventory() {
    const db = await getDb();
    await db.delete('player', invKey(this.seed));
  }
}