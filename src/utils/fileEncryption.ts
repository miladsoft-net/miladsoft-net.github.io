import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'miladsoft-secure-key-2024';

export function encryptFile(fileContent: ArrayBuffer): string {
  // Convert ArrayBuffer to Base64
  const base64 = btoa(String.fromCharCode(...new Uint8Array(fileContent)));
  
  // Add file format marker
  const fileData = {
    format: 'miladsoft',
    version: '1.0',
    content: base64,
    timestamp: Date.now()
  };

  // Encrypt the entire package
  return CryptoJS.AES.encrypt(JSON.stringify(fileData), ENCRYPTION_KEY).toString();
}

export function decryptFile(encryptedContent: string): ArrayBuffer {
  try {
    // Decrypt the content
    const decrypted = CryptoJS.AES.decrypt(encryptedContent, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
    const fileData = JSON.parse(decrypted);

    // Verify format
    if (fileData.format !== 'miladsoft') {
      throw new Error('Invalid file format');
    }

    // Convert Base64 back to ArrayBuffer
    const binaryString = atob(fileData.content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  } catch (error) {
    throw new Error('Failed to decrypt file');
  }
}
