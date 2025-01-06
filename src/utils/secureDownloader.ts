const WORKER_URL = import.meta.env.CLOUDFLARE_WORKER_URL;
const SECRET_KEY = import.meta.env.SECRET_KEY;

export class SecureDownloader {
  private static CHUNK_SIZE = 1024 * 1024; // 1MB chunks

  private static async createSignature(token: string): Promise<string> {
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

  static async generateSecureUrl(fileName: string, userId: string): Promise<string> {
    const expiration = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const downloads = 1;
    
    // Create token and signature
    const token = [userId, fileName, expiration, downloads].join(':');
    const signature = await this.createSignature(token);

    // Build URL with parameters
    const params = new URLSearchParams({
      file: fileName,
      userId: userId,
      signature: signature,
      downloads: downloads.toString(),
      expires: expiration.toString()
    });

    return `${WORKER_URL}?${params.toString()}`;
  }

  static async downloadWithProgress(
    fileName: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      const secureUrl = await this.generateSecureUrl(fileName, userId);
      const response = await fetch(secureUrl);

      if (!response.ok) {
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
      const fileName = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = fileName;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(fileName);

    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }
}
