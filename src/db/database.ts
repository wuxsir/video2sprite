import { openDB, IDBPDatabase } from 'idb';
import { Asset } from '../shared/types';

const DB_NAME = 'video2sprite';
const DB_VERSION = 1;
const ASSETS_STORE = 'assets';

class Database {
  private db: IDBPDatabase | null = null;

  async init() {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(ASSETS_STORE)) {
          db.createObjectStore(ASSETS_STORE, { keyPath: 'id' });
        }
      },
    });
  }

  async addAsset(asset: Asset): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(ASSETS_STORE, 'readwrite');
    await tx.store.add(asset);
    await tx.done;
  }

  async getAssets(): Promise<Asset[]> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(ASSETS_STORE, 'readonly');
    return await tx.store.getAll();
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(ASSETS_STORE, 'readonly');
    return await tx.store.get(id);
  }

  async updateAsset(asset: Asset): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(ASSETS_STORE, 'readwrite');
    await tx.store.put(asset);
    await tx.done;
  }

  async deleteAsset(id: string): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(ASSETS_STORE, 'readwrite');
    await tx.store.delete(id);
    await tx.done;
  }

  async clearAssets(): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(ASSETS_STORE, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
}

export const database = new Database();
