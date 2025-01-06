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
  downloadLink?: string; // Add downloadLink property
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
  const expiration = Math.floor(Date.now() / 1000) + 30; // 30 seconds
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
      if (!download.downloadLink) {
        download.downloadLink = await generateDownloadLink(download.userId, download.fileName, download.maxDownloads);
      }
      update((downloads) => {
        const updatedDownloads = [...downloads, download];
        saveToStorage(updatedDownloads);
        return updatedDownloads;
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
    }
  };
}

export const downloadStore = createDownloadStore();
