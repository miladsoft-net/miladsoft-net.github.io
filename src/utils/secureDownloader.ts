import CryptoJS from 'crypto-js';

export class SecureDownloader {
  private static CHUNK_SIZE = 1024 * 1024; // 1MB chunks

  static generateSecureUrl(originalUrl: string, token: string): string {
    console.log('Generating secure URL for:', originalUrl);
    const timestamp = Date.now();
    const signature = CryptoJS.HmacSHA256(`${originalUrl}${timestamp}`, token).toString();
    const secureUrl = `/api/download?url=${encodeURIComponent(originalUrl)}&t=${timestamp}&s=${signature}`;
    console.log('Generated secure URL:', secureUrl);
    return secureUrl;
  }

  static async downloadWithProgress(
    url: string,
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    console.log('Starting download from:', url);
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Include credentials if needed
        headers: {
          'Accept': 'application/octet-stream',
        }
      });

      if (!response.ok) {
        console.error('Download failed with status:', response.status);
        console.error('Response:', await response.text());
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      const contentLength = Number(response.headers.get('content-length'));
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream not available');

      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      while(true) {
        const {done, value} = await reader.read();
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        if (onProgress) {
          onProgress((receivedLength / contentLength) * 100);
        }
      }

      const blob = new Blob(chunks);
      const downloadUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error details:', error);
      throw error;
    }
  }
}
