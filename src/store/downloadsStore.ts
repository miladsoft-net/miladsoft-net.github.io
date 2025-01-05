import { writable, get } from 'svelte/store';
import CryptoJS from 'crypto-js';
import { SecureDownloader } from '../utils/secureDownloader'; // Adjust the path as necessary
import type { Post } from '../content/config';

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
    },

    handleSecureDownload: async (download: Download, onProgress?: (progress: number) => void, posts?: Post[]) => {
      try {
        console.log('Starting secure download process...', { download, postsAvailable: !!posts });
        
        if (!download || !download.slug) {
          throw new Error('Invalid download object');
        }
    
        if (!posts || posts.length === 0) {
          throw new Error('Posts array is empty or undefined');
        }
    
        const post = posts.find(p => p.slug === download.slug);
        if (!post) {
          throw new Error(`Post not found for slug: ${download.slug}`);
        }
    
        const downloadUrl = post.data?.downloadUrl || download.downloadUrl;
        if (!downloadUrl) {
          throw new Error('Download URL is missing');
        }
    
        if (!download.token) {
          throw new Error('Download token is missing');
        }
    
        console.log('Generating secure URL for:', downloadUrl);
        const secureUrl = SecureDownloader.generateSecureUrl(downloadUrl, download.token);
        
        console.log('Starting file download...');
        await SecureDownloader.downloadWithProgress(
          secureUrl,
          download.title, // This will be ignored in favor of the original filename
          (progress) => {
            console.log(`Download progress: ${progress}%`);
            onProgress?.(progress);
          }
        );
    
        console.log('Download completed successfully');
        
        return update(downloads => {
          const newDownloads = downloads.map(d =>
            d.slug === download.slug ? { ...d, downloads: (d.downloads || 0) + 1 } : d
          );
          saveToStorage(newDownloads);
          return newDownloads;
        });
    
      } catch (error) {
        console.error('Download failed:', error);
        throw error;
      }
    }
  };
}

export const downloadStore = createDownloadStore();
