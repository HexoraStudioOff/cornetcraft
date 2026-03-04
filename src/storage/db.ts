import { openDB, type IDBPDatabase } from 'idb';

export type CornetcraftDB = IDBPDatabase;

let dbPromise: Promise<CornetcraftDB> | null = null;

export function getDb(): Promise<CornetcraftDB> {
  if (!dbPromise) {
    dbPromise = openDB('cornetcraft', 2, {
      upgrade(db) {
        // v1 store
        if (!db.objectStoreNames.contains('blocks')) {
          db.createObjectStore('blocks');
        }
        // v2 store
        if (!db.objectStoreNames.contains('player')) {
          db.createObjectStore('player');
        }
      },
    });
  }
  return dbPromise;
}