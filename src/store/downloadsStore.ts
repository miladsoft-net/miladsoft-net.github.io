import { writable, get } from 'svelte/store';
import CryptoJS from 'crypto-js';

export interface Download {
  slug: string;
  title: string;
  fileName: string; 
  purchaseDate: string;
  price: number;
  userId: string;  
  downloadLink?: string;  
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

async function generateDownloadLink(userId: string, fileName: string): Promise<string> {
  const token = [userId, fileName].join(':');
  const signature = await createSignature(token);

  const params = new URLSearchParams({
    file: fileName,
    userId: userId,
    signature: signature
  });

  return `https://miladsoft.net/dl/${fileName.toString()}`;
}

function createDownloadStore() {
  const savedDownloads = typeof window !== 'undefined'
    ? (() => {``
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
        if (!downloads.some(d => d.slug === download.slug)) {
          generateDownloadLink(download.userId, download.fileName)
            .then(link => {
              download.downloadLink = link;
              const updatedDownloads = [...downloads, download];
              saveToStorage(updatedDownloads);
              set(updatedDownloads);
            });
        }
        return downloads;
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
        if (!download.downloadLink) {
          download.downloadLink = await generateDownloadLink(download.userId, download.fileName);
          update(downloads => {
            const updatedDownloads = downloads.map(d => 
              d.slug === download.slug ? {...d, downloadLink: download.downloadLink} : d
            );
            saveToStorage(updatedDownloads);
            return updatedDownloads;
          });
        }
        return download.downloadLink;
      } catch (error) {
        console.error("Secure download error:", error);
        throw error;
      }
    }
  };
}

export const downloadStore = createDownloadStore();
