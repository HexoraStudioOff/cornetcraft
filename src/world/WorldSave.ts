// src/world/WorldSave.ts
import { openDB, type IDBPDatabase } from 'idb';
import { BlockType } from '../blocks/BlockTypes';
import { CHUNK_SIZE } from '../utils/constants';
import { worldToChunk } from '../utils/math';

/**
 * Save only modified blocks ("deltas") per world seed.
 * IndexedDB schema:
 *  - DB: cornetcraft
 *  - store: blocks (key = `${seed}:${wx},${wy},${wz}` value = { t })
 *
 * Notes:
 * - DB version bumped to 2 so we can add future stores (ex: 'player') without breaking.
 * - This file still works even if you later add other stores in the same DB.
 */
type BlockDelta = { t: number };

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB('cornetcraft', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('blocks')) {
          db.createObjectStore('blocks');
        }
        // Optional future store (safe to keep here)
        if (!db.objectStoreNames.contains('player')) {
          db.createObjectStore('player');
        }
      },
    });
  }
  return dbPromise;
}

function key(seed: number, wx: number, wy: number, wz: number) {
  return `${seed}:${wx},${wy},${wz}`;
}

export class WorldSave {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  async setBlock(wx: number, wy: number, wz: number, type: BlockType) {
    const db = await getDb();
    const k = key(this.seed, wx, wy, wz);

    // Even AIR is a meaningful player modification.
    await db.put('blocks', { t: type as number } satisfies BlockDelta, k);
  }

  async getBlock(wx: number, wy: number, wz: number): Promise<BlockType | null> {
    const db = await getDb();
    const v = (await db.get('blocks', key(this.seed, wx, wy, wz))) as BlockDelta | undefined;
    return v ? (v.t as BlockType) : null;
  }

  /**
   * Load all deltas for a chunk and return as a list.
   * We iterate all keys and filter by:
   *  - same seed prefix
   *  - same chunk coords
   *
   * OK for small/moderate edits. If it grows huge, we can add a chunk-indexed store.
   */
  async getChunkDeltas(
    cx: number,
    cz: number
  ): Promise<Array<{ wx: number; wy: number; wz: number; t: BlockType }>> {
    const db = await getDb();
    const out: Array<{ wx: number; wy: number; wz: number; t: BlockType }> = [];
    const prefix = `${this.seed}:`;

    const tx = db.transaction('blocks', 'readonly');
    let cursor = await tx.store.openCursor();

    while (cursor) {
      const k = String(cursor.key);

      if (k.startsWith(prefix)) {
        const rest = k.slice(prefix.length); // "wx,wy,wz"
        const parts = rest.split(',');

        if (parts.length === 3) {
          const wx = Number(parts[0]);
          const wy = Number(parts[1]);
          const wz = Number(parts[2]);

          if (!Number.isNaN(wx) && !Number.isNaN(wy) && !Number.isNaN(wz)) {
            const ccx = worldToChunk(Math.floor(wx), CHUNK_SIZE);
            const ccz = worldToChunk(Math.floor(wz), CHUNK_SIZE);

            if (ccx === cx && ccz === cz) {
              const v = cursor.value as BlockDelta;
              out.push({ wx, wy, wz, t: v.t as BlockType });
            }
          }
        }
      }

      cursor = await cursor.continue();
    }

    await tx.done;
    return out;
  }

  async clearAll() {
    const db = await getDb();
    const prefix = `${this.seed}:`;

    const tx = db.transaction('blocks', 'readwrite');
    let cursor = await tx.store.openCursor();

    while (cursor) {
      const k = String(cursor.key);
      if (k.startsWith(prefix)) await cursor.delete();
      cursor = await cursor.continue();
    }

    await tx.done;
  }
}