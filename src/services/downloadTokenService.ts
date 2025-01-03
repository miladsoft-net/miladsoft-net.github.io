interface TokenData {
  token: string;
  slug: string;
  userId: string;
  expiresAt: Date;
  downloads: number; // Track number of downloads
  maxDownloads: number; // Maximum allowed downloads
}

// In-memory token storage (replace with database in production)
const tokenStore = new Map<string, TokenData>();

export async function storeDownloadToken(data: TokenData): Promise<void> {
  data.downloads = 0;
  data.maxDownloads = 3; // Allow 3 download attempts
  tokenStore.set(data.token, data);
  // Save to localStorage for persistence
  if (typeof window !== 'undefined') {
    const tokens = JSON.parse(localStorage.getItem('downloadTokens') || '{}');
    tokens[data.token] = data;
    localStorage.setItem('downloadTokens', JSON.stringify(tokens));
  }
}

export async function verifyDownloadToken(token: string, slug: string): Promise<boolean> {
  const tokenData = tokenStore.get(token);
  
  if (!tokenData) {
    // Check localStorage
    if (typeof window !== 'undefined') {
      const tokens = JSON.parse(localStorage.getItem('downloadTokens') || '{}');
      if (tokens[token]) {
        const data = tokens[token];
        if (data.downloads >= data.maxDownloads) {
          return false;
        }
        data.downloads++;
        localStorage.setItem('downloadTokens', JSON.stringify(tokens));
        return data.slug === slug && new Date(data.expiresAt) > new Date();
      }
    }
    return false;
  }

  if (tokenData.downloads >= tokenData.maxDownloads) {
    return false;
  }

  tokenData.downloads++;
  tokenStore.set(token, tokenData);

  return tokenData.slug === slug && tokenData.expiresAt > new Date();
}

export function getCurrentUserId(): string {
  // For demo purposes, return a fixed ID
  // In production, this should come from your authentication system
  return 'demo-user-id';
}
