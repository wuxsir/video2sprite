import { create } from 'zustand';
import { Asset } from '../shared/types';
import { database } from '../db/database';

interface AssetStore {
  assets: Asset[];
  isLoading: boolean;
  error: string | null;
  loadAssets: () => Promise<void>;
  addAsset: (asset: Asset) => Promise<void>;
  updateAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  clearAssets: () => Promise<void>;
}

export const useAssetStore = create<AssetStore>((set) => ({
  assets: [],
  isLoading: false,
  error: null,

  loadAssets: async () => {
    set({ isLoading: true, error: null });
    try {
      const assets = await database.getAssets();
      set({ assets, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to load assets', isLoading: false });
    }
  },

  addAsset: async (asset: Asset) => {
    try {
      await database.addAsset(asset);
      set((state) => ({ assets: [...state.assets, asset] }));
    } catch (error) {
      set({ error: 'Failed to add asset' });
    }
  },

  updateAsset: async (asset: Asset) => {
    try {
      await database.updateAsset(asset);
      set((state) => ({
        assets: state.assets.map((a) => (a.id === asset.id ? asset : a))
      }));
    } catch (error) {
      set({ error: 'Failed to update asset' });
    }
  },

  deleteAsset: async (id: string) => {
    try {
      await database.deleteAsset(id);
      set((state) => ({
        assets: state.assets.filter((asset) => asset.id !== id)
      }));
    } catch (error) {
      set({ error: 'Failed to delete asset' });
    }
  },

  clearAssets: async () => {
    try {
      await database.clearAssets();
      set({ assets: [] });
    } catch (error) {
      set({ error: 'Failed to clear assets' });
    }
  }
}));
