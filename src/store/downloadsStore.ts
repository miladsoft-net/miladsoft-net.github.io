import { writable, get } from 'svelte/store';

export interface Download {
  slug: string;
  title: string;
  downloadUrl: string;
  purchaseDate: string;
  price: number;
  token: string;
  downloads: number;
  maxDownloads: number;
}

const STORAGE_KEY = 'downloads';

function createDownloadStore() {
  const savedDownloads = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    : [];

  const { subscribe, set, update } = writable<Download[]>(savedDownloads);

  return {
    subscribe,
    addDownload: (download: Download) => update(downloads => {
      const newDownloads = [...downloads, download];
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newDownloads));
      }
      return newDownloads;
    }),
    removeDownload: (slug: string) => update(downloads => {
      const newDownloads = downloads.filter(d => d.slug !== slug);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newDownloads));
      }
      return newDownloads;
    }),
    incrementDownloadCount: (slug: string) => update(downloads => {
      const newDownloads = downloads.map(d =>
        d.slug === slug ? { ...d, downloads: (d.downloads || 0) + 1 } : d
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newDownloads));
      }
      return newDownloads;
    }),
    clear: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      set([]);
    },
    getDownloads: () => get({ subscribe }) // Returns the current value of the store
  };
}

export const downloadStore = createDownloadStore();
