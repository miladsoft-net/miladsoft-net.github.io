import { writable } from 'svelte/store';

interface Download {
  productTitle: string;
  date: string;
  price: number;
  downloadUrl: string;
}

interface DownloadStore {
  downloads: Download[];
}

function createDownloadStore() {
  // Initialize from localStorage if available
  const initialDownloads = typeof window !== 'undefined' ? 
    JSON.parse(localStorage.getItem('downloads') || '{"downloads":[]}') : 
    { downloads: [] };

  const { subscribe, set, update } = writable<DownloadStore>(initialDownloads);

  return {
    subscribe,
    addDownload: (download: Download) => {
      update(store => {
        const newStore = {
          downloads: [...store.downloads, download]
        };
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('downloads', JSON.stringify(newStore));
        }
        return newStore;
      });
    },
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
