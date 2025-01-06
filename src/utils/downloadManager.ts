import type { Download } from '../store/downloadsStore';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'miladsoft-secure-export-2024';

function encryptExportData(data: any): string {
  const fileData = {
    format: 'miladsoft',
    type: 'downloads-export',
    version: '1.0',
    timestamp: Date.now(),
    content: data
  };
  
  return CryptoJS.AES.encrypt(JSON.stringify(fileData), ENCRYPTION_KEY).toString();
}

function decryptExportData(encryptedContent: string): any {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedContent, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
    const fileData = JSON.parse(decrypted);

    if (fileData.format !== 'miladsoft' || fileData.type !== 'downloads-export') {
      throw new Error('Invalid file format');
    }

    return fileData.content;
  } catch (error) {
    throw new Error('Failed to decrypt file');
  }
}

export async function saveExportFile(downloads: Download[]) {
  // Encrypt the downloads data
  const encryptedData = encryptExportData(downloads);

  // Create Blob with encrypted data
  const blob = new Blob([encryptedData], { 
    type: 'application/x-miladsoft-downloads' 
  });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `miladsoft-downloads-${timestamp}.miladsoft`;

  // Download file
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function handleImportFile(file: File): Promise<Download[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const encryptedContent = e.target?.result as string;
        const downloads = decryptExportData(encryptedContent);
        
        // Validate downloads data structure
        if (!Array.isArray(downloads) || !downloads.every(isValidDownload)) {
          throw new Error('Invalid downloads data format');
        }

        resolve(downloads);
      } catch (error) {
        reject(new Error('Failed to import file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Helper function to validate download object structure
function isValidDownload(download: any): download is Download {
  return typeof download === 'object' &&
         typeof download.slug === 'string' &&
         typeof download.title === 'string' &&
         typeof download.fileName === 'string' &&
         typeof download.purchaseDate === 'string' &&
         typeof download.price === 'number' &&
         typeof download.token === 'string' &&
         typeof download.downloads === 'number' &&
         typeof download.maxDownloads === 'number';
}
