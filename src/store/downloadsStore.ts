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
  downloadLink?: string;  
  expirationDate: string;  
  quantity: number; 
}

const STORAGE_KEY = 'miladsoft_downloads';
const ENCRYPTION_KEY = 'miladsoft-secure-storage-2024';
const SECRET_KEY = "my-super-secret-key-123";

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

async function createSignature(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET_KEY);
  const messageData = encoder.encode(token);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function generateDownloadLink(userId: string, fileName: string, downloads: number): Promise<string> {
  const ONE_MONTH_IN_SECONDS = 30 * 24 * 60 * 60; // 30 days in seconds
  const expiration = Math.floor(Date.now() / 1000) + ONE_MONTH_IN_SECONDS;
  const token = [userId, fileName, expiration, downloads].join(':');
  const signature = await createSignature(token);

  const params = new URLSearchParams({
    file: fileName,
    userId: userId,
    signature: signature,
    downloads: downloads.toString(),
    expires: expiration.toString()
  });

  return `https://secure-download-worker.miladsoft.workers.dev/?${params.toString()}`;
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
    addDownload: async (download: Download) => {
          update((downloads) => {
        const existingDownload = downloads.find(d => d.slug === download.slug);
        
        if (existingDownload) {
          // Add 3 more downloads and extend expiration by 1 month
          const currentExpiration = new Date(existingDownload.expirationDate);
          const additionalMonths = download.quantity || 1; // Use quantity or default to 1
          const newExpiration = new Date(Math.max(
            currentExpiration.getTime(),
            Date.now()
          ));
          newExpiration.setMonth(newExpiration.getMonth() + additionalMonths);
          
          existingDownload.maxDownloads += 3 * additionalMonths;
          existingDownload.expirationDate = newExpiration.toISOString();
          existingDownload.quantity = (existingDownload.quantity || 1) + (download.quantity || 1);
          
          const updatedDownloads = downloads.map(d => 
            d.slug === download.slug ? existingDownload : d
          );
          saveToStorage(updatedDownloads);
          return updatedDownloads;
        } else {
          // Set initial expiration date to 1 month from now
          const expirationDate = new Date();
          const months = download.quantity || 1; // Use quantity or default to 1
          expirationDate.setMonth(expirationDate.getMonth() + months);
          download.expirationDate = expirationDate.toISOString();
          
          generateDownloadLink(download.userId, download.fileName, download.maxDownloads)
            .then(link => {
              download.downloadLink = link;
              const updatedDownloads = [...downloads, download];
              saveToStorage(updatedDownloads);
              set(updatedDownloads);
            });
          
          return downloads;
        }
      });
    },
    removeDownload: (slug: string) => update((downloads) => {
      const updatedDownloads = downloads.filter(download => download.slug !== slug);
      saveToStorage(updatedDownloads);
      return updatedDownloads;
    }),
    checkExistingDownload: (slug: string) => {
      const downloads = get({ subscribe });
      return downloads.some(download => download.slug === slug);
    },
    handleSecureDownload: async (download: Download) => {
      try {
        const now = new Date();
        const expirationDate = new Date(download.expirationDate);
        
        if (now > expirationDate) {
          throw new Error("Download link has expired");
        }
        
        if (download.downloads >= download.maxDownloads) {
          throw new Error("Maximum download limit reached");
        }

        // Update the download count
        update((downloads) => {
          const updatedDownloads = downloads.map((d) => {
            if (d.slug === download.slug) {
              d.downloads += 1;
            }
            return d;
          });
          saveToStorage(updatedDownloads);
          return updatedDownloads;
        });

        // Return the existing download link
        return download.downloadLink;
      } catch (error) {
        console.error("Secure download error:", error);
        throw error;
      }
    },
    updateExistingDownload: async (slug: string, additionalDownloads: number) => {
      const downloads = get({ subscribe });
      const updatedDownloads = await Promise.all(downloads.map(async (d) => {
        if (d.slug === slug) {
          // Add additional downloads
          d.maxDownloads += additionalDownloads;
          
          try {
            const now = new Date();
            // Add one month per additional download
            const additionalTime = additionalDownloads * (30 * 24 * 60 * 60 * 1000);
            const currentExpiration = new Date(d.expirationDate);
            
            // New expiration is the later of: current expiration + additional time, or now + additional time
            const newExpiration = new Date(
              Math.max(
                currentExpiration.getTime() + additionalTime,
                now.getTime() + additionalTime
              )
            );
            
            d.downloadLink = await generateDownloadLink(d.userId, d.fileName, d.maxDownloads);
            d.expirationDate = newExpiration.toISOString();
            
          } catch (error) {
            console.error('Error updating download:', error);
            const fallbackDate = new Date();
            fallbackDate.setMonth(fallbackDate.getMonth() + additionalDownloads);
            d.expirationDate = fallbackDate.toISOString();
          }
        }
        return d;
      }));
      
      update((downloads) => {
        const nonAsyncUpdatedDownloads = updatedDownloads.map((updatedDownload) => {
          const existingDownload = downloads.find((d) => d.slug === updatedDownload.slug);
          return existingDownload ? updatedDownload : updatedDownload;
        });
        saveToStorage(nonAsyncUpdatedDownloads);
        return nonAsyncUpdatedDownloads;
      });
    }
  };
}

export const downloadStore = createDownloadStore();
