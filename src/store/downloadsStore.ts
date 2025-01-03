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
      console.log('Store cleared'); // Debug log
    },
    getDownloads: () => get({ subscribe }), // Returns the current value of the store

    updateExistingDownload: (slug: string, additionalDownloads: number = 3) => {
      return new Promise((resolve) => {
        update(downloads => {
          const newDownloads = downloads.map(download => {
            if (download.slug === slug) {
              // Calculate new expiry date - add 30 more days from current expiry
              const currentExpiryDate = new Date(download.purchaseDate).getTime() + (30 * 24 * 60 * 60 * 1000);
              const newExpiryDate = new Date(currentExpiryDate + (30 * 24 * 60 * 60 * 1000));
              
              const updatedDownload = {
                ...download,
                maxDownloads: download.maxDownloads + additionalDownloads,
                purchaseDate: newExpiryDate.toISOString() // Update purchase date to extend expiry
              };
              
              console.log('Updated download:', updatedDownload);
              return updatedDownload;
            }
            return download;
          });

          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newDownloads));
          }
          
          resolve(true);
          return newDownloads;
        });
      });
    },

    checkExistingDownload: (slug: string): boolean => {
      // Get current downloads directly
      const downloads = get({ subscribe });
      const exists = downloads.some(d => d.slug === slug);
      console.log('Checking download exists:', slug, exists); // Debug log
      return exists;
    }
  };
}

export const downloadStore = createDownloadStore();
