import { writable } from 'svelte/store';

export interface Download {
  slug: string;
  productTitle: string;
  price: number;
  date: string;
  downloadToken: string;
  downloadUrl: string;
  purchased: boolean;
}

interface DownloadStore {
  downloads: Download[];
}

function createDownloadStore() {
  const { subscribe, set, update } = writable<DownloadStore>({
    downloads: []
  });

  return {
    subscribe,
    addDownload: (download: Download) => update(store => ({
      downloads: [...store.downloads, { ...download, purchased: true }]
    })),
    removeDownload: (slug: string) => update(store => ({
      downloads: store.downloads.filter(d => d.slug !== slug)
    })),
    clear: () => set({ downloads: [] }),
    getDownloads: () => {
      let downloads: Download[] = [];
      subscribe(store => {
        downloads = store.downloads;
      })();
      return downloads;
    }
  };
}

export const downloadStore = createDownloadStore();
