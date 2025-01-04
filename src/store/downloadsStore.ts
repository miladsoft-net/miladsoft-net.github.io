import { writable, get } from 'svelte/store';
import CryptoJS from 'crypto-js';

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

const STORAGE_KEY = 'miladsoft_downloads';
const ENCRYPTION_KEY = 'miladsoft-secure-storage-2024';

function encryptData(data: Download[]): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
}

function decryptData(encryptedData: string): Download[] {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to decrypt downloads data');
    return [];
  }
}

function createDownloadStore() {
  // Load and decrypt initial data
  const savedDownloads = typeof window !== 'undefined'
    ? (() => {
        const encrypted = localStorage.getItem(STORAGE_KEY);
        return encrypted ? decryptData(encrypted) : [];
      })()
    : [];

  const { subscribe, set, update } = writable<Download[]>(savedDownloads);

  function saveToStorage(downloads: Download[]) {
    if (typeof window !== 'undefined') {
      const encrypted = encryptData(downloads);
      localStorage.setItem(STORAGE_KEY, encrypted);
    }
  }

  return {
    subscribe,
    addDownload: (download: Download) => update(downloads => {
      const newDownloads = [...downloads, download];
      saveToStorage(newDownloads);
      return newDownloads;
    }),
    removeDownload: (slug: string) => update(downloads => {
      const newDownloads = downloads.filter(d => d.slug !== slug);
      saveToStorage(newDownloads);
      return newDownloads;
    }),
    incrementDownloadCount: (slug: string) => update(downloads => {
      const newDownloads = downloads.map(d =>
        d.slug === slug ? { ...d, downloads: (d.downloads || 0) + 1 } : d
      );
      saveToStorage(newDownloads);
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

          saveToStorage(newDownloads);
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
