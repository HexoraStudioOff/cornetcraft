import { openDB, type IDBPDatabase } from 'idb';
import { BlockType } from '../blocks/BlockTypes';
import { CHUNK_SIZE } from '../utils/constants';
import { chunkKey, worldToChunk } from '../utils/math';

/**
 * Save only modified blocks ("deltas") per world seed.
 * IndexedDB schema:
 *  - DB: cornetcraft
 *  - store: blocks (key = `${seed}:${wx},${wy},${wz}` value = {t})
 */
type BlockDelta = { t: number };

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB('cornetcraft', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('blocks')) {
          db.createObjectStore('blocks');
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

    // If block is "AIR", we still store it as a delta because it's a player modification.
    // (Optionally you can delete when it matches generator block, but that requires comparing.)
    await db.put('blocks', { t: type as number } satisfies BlockDelta, k);
  }

  async getBlock(wx: number, wy: number, wz: number): Promise<BlockType | null> {
    const db = await getDb();
    const v = (await db.get('blocks', key(this.seed, wx, wy, wz))) as BlockDelta | undefined;
    return v ? (v.t as BlockType) : null;
  }

  /**
   * Load all deltas for a chunk and return as a list.
   * We scan keys by range. Because IDB doesn't support partial prefix scan easily without an index,
   * we store per-block keys and then filter. This is fine for small/moderate numbers of edits.
   * If you expect huge edits, we can optimize with another store keyed by chunk.
   */
  async getChunkDeltas(cx: number, cz: number): Promise<Array<{ wx: number; wy: number; wz: number; t: BlockType }>> {
    const db = await getDb();
    const out: Array<{ wx: number; wy: number; wz: number; t: BlockType }> = [];
    const prefix = `${this.seed}:`;

    // Iterate all keys in the store and filter by chunk.
    // For performance later: we can move to a chunk-indexed store.
    let cursor = await db.transaction('blocks').store.openCursor();
    while (cursor) {
      const k = String(cursor.key);
      if (k.startsWith(prefix)) {
        const rest = k.slice(prefix.length);
        const [pos] = rest.split(':'); // safety if future format changes
        const [xs, ys, zs] = pos.split(',');
        const wx = Number(xs), wy = Number(ys), wz = Number(zs);
        if (!Number.isNaN(wx) && !Number.isNaN(wy) && !Number.isNaN(wz)) {
          const ccx = worldToChunk(Math.floor(wx), CHUNK_SIZE);
          const ccz = worldToChunk(Math.floor(wz), CHUNK_SIZE);
          if (ccx === cx && ccz === cz) {
            const v = cursor.value as BlockDelta;
            out.push({ wx, wy, wz, t: v.t as BlockType });
          }
        }
      }
      cursor = await cursor.continue();
    }
    return out;
  }

  async clearAll() {
    const db = await getDb();
    // Clear only this seed
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