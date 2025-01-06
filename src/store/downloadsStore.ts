import { writable, get } from 'svelte/store';
import CryptoJS from 'crypto-js';
 
export interface Download {
  slug: string;
  title: string;
  fileName: string; 
  purchaseDate: string;
  price: number;
  userId: string;  
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
    addDownload: (download: Download) => update((downloads) => {
      const updatedDownloads = [...downloads, download];
      saveToStorage(updatedDownloads);
      return updatedDownloads;
    }),
    removeDownload: (slug: string) => update((downloads) => {
      const updatedDownloads = downloads.filter(download => download.slug !== slug);
      saveToStorage(updatedDownloads);
      return updatedDownloads;
    }),
    checkExistingDownload: (slug: string) => {
      const downloads = get({ subscribe });
      return downloads.some(download => download.slug === slug);
    },
    handleSecureDownload: async (download: Download ) => {
alert('Secure download is not implemented yet');
    }
  };
}

export const downloadStore = createDownloadStore();
