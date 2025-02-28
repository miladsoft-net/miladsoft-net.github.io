import type { Download } from '../store/downloadsStore';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'miladsoft-secure-export-2024';

function encryptExportData(data: any): string {
  try {
    const fileData = {
      format: 'miladsoft',
      type: 'downloads-export',
      version: '1.0',
      timestamp: Date.now(),
      content: data
    };
    
    const jsonString = JSON.stringify(fileData);
    return CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
  } catch (error) {
    throw new Error('Failed to encrypt export data');
  }
}

function decryptExportData(encryptedContent: string): any {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedContent, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Invalid decryption result');
    }

    const fileData = JSON.parse(decrypted);

    if (!fileData || fileData.format !== 'miladsoft' || fileData.type !== 'downloads-export') {
      throw new Error('Invalid file format');
    }

    return fileData.content;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Invalid file format. Please make sure you selected the correct file.');
  }
}

export async function saveExportFile(downloads: Download[]) {
  try {
    if (!downloads || downloads.length === 0) {
      throw new Error('No downloads to export');
    }

    const encryptedData = encryptExportData(downloads);
    const blob = new Blob([encryptedData], { 
      type: 'application/x-miladsoft-downloads' 
    });

    const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('T')[0];
    const filename = `miladsoft-downloads-${timestamp}.miladsoft`;

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export error:', error);
    throw new Error('Error exporting downloads data');
  }
}

export async function handleImportFile(file: File): Promise<Download[]> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.miladsoft')) {
      reject(new Error('Invalid file format. Please select a .miladsoft file.'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          throw new Error('Invalid file content');
        }

        const downloads = decryptExportData(content);
        
        if (!Array.isArray(downloads)) {
          throw new Error('Invalid data format');
        }

        // Validate each download object
        downloads.forEach((download, index) => {
          if (!isValidDownload(download)) {
            throw new Error(`Invalid download data at index ${index}`);
          }
        });

        resolve(downloads);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to import file'));
      }
    };

    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
}

function isValidDownload(download: any): download is Download {
  return typeof download === 'object' &&
         typeof download.slug === 'string' &&
         typeof download.title === 'string' &&
         typeof download.fileName === 'string' &&
         typeof download.purchaseDate === 'string' &&
         typeof download.price === 'number' &&
         typeof download.userId === 'string' &&
         typeof download.quantity === 'number';
}
