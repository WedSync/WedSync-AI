'use client';

import CryptoJS from 'crypto-js';

interface StorageOptions {
  encrypt?: boolean;
  ttl?: number; // Time to live in milliseconds
  compress?: boolean;
  namespace?: string;
}

interface StorageItem<T = any> {
  data: T;
  timestamp: number;
  ttl?: number;
  encrypted: boolean;
  compressed: boolean;
  checksum: string;
}

class SecureOfflineStorage {
  private readonly storageKey: string;
  private readonly encryptionKey: string;
  private readonly namespace: string;

  constructor(namespace = 'wedsync_music') {
    this.namespace = namespace;
    this.storageKey = `${namespace}_secure_storage`;
    this.encryptionKey = this.generateEncryptionKey();
  }

  private generateEncryptionKey(): string {
    // Generate a device-specific encryption key
    const deviceInfo = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
    ].join('|');

    return CryptoJS.SHA256(deviceInfo + 'WedSync_Music_2025').toString();
  }

  private encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }

  private decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  private compress(data: string): string {
    // Simple compression using RLE for repeated patterns
    return data.replace(/(.)\1{2,}/g, (match, char) => {
      return `${char}${match.length}`;
    });
  }

  private decompress(data: string): string {
    // Decompress RLE
    return data.replace(/(.)\d+/g, (match, char) => {
      const count = parseInt(match.slice(1));
      return char.repeat(count);
    });
  }

  private generateChecksum(data: any): string {
    return CryptoJS.SHA256(JSON.stringify(data)).toString().substring(0, 16);
  }

  private isItemExpired(item: StorageItem): boolean {
    if (!item.ttl) return false;
    return Date.now() - item.timestamp > item.ttl;
  }

  private getStorageSize(): number {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith(this.namespace)) {
        total += (localStorage[key].length + key.length) * 2; // UTF-16 encoding
      }
    }
    return total;
  }

  private cleanupExpiredItems(): void {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(this.namespace),
    );

    for (const key of keys) {
      try {
        const item = JSON.parse(
          localStorage.getItem(key) || '{}',
        ) as StorageItem;
        if (this.isItemExpired(item)) {
          localStorage.removeItem(key);
        }
      } catch (error) {
        // Remove corrupted items
        localStorage.removeItem(key);
      }
    }
  }

  private ensureStorageQuota(requiredSize: number): boolean {
    const currentSize = this.getStorageSize();
    const maxSize = 5 * 1024 * 1024; // 5MB limit for music cache

    if (currentSize + requiredSize > maxSize) {
      // Cleanup expired items first
      this.cleanupExpiredItems();

      // If still over quota, remove oldest items
      if (this.getStorageSize() + requiredSize > maxSize) {
        this.evictOldestItems(requiredSize);
      }

      return this.getStorageSize() + requiredSize <= maxSize;
    }

    return true;
  }

  private evictOldestItems(requiredSize: number): void {
    const keys = Object.keys(localStorage)
      .filter((key) => key.startsWith(this.namespace))
      .map((key) => {
        try {
          const item = JSON.parse(
            localStorage.getItem(key) || '{}',
          ) as StorageItem;
          return { key, timestamp: item.timestamp };
        } catch {
          return { key, timestamp: 0 };
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    let freedSize = 0;
    for (const { key } of keys) {
      const itemSize = (localStorage.getItem(key)?.length || 0) * 2;
      localStorage.removeItem(key);
      freedSize += itemSize;

      if (freedSize >= requiredSize) {
        break;
      }
    }
  }

  public setItem<T>(
    key: string,
    value: T,
    options: StorageOptions = {},
  ): boolean {
    try {
      const {
        encrypt = true,
        ttl,
        compress = true,
        namespace = this.namespace,
      } = options;

      let serializedData = JSON.stringify(value);

      if (compress) {
        serializedData = this.compress(serializedData);
      }

      if (encrypt) {
        serializedData = this.encrypt(serializedData);
      }

      const storageItem: StorageItem<T> = {
        data: serializedData as any,
        timestamp: Date.now(),
        ttl,
        encrypted: encrypt,
        compressed: compress,
        checksum: this.generateChecksum(value),
      };

      const storageKey = `${namespace}_${key}`;
      const serializedItem = JSON.stringify(storageItem);

      // Check storage quota
      if (!this.ensureStorageQuota(serializedItem.length * 2)) {
        console.warn('Storage quota exceeded, could not store item:', key);
        return false;
      }

      localStorage.setItem(storageKey, serializedItem);
      return true;
    } catch (error) {
      console.error('Error storing item:', error);
      return false;
    }
  }

  public getItem<T>(key: string, namespace = this.namespace): T | null {
    try {
      const storageKey = `${namespace}_${key}`;
      const serializedItem = localStorage.getItem(storageKey);

      if (!serializedItem) {
        return null;
      }

      const storageItem: StorageItem = JSON.parse(serializedItem);

      // Check if item is expired
      if (this.isItemExpired(storageItem)) {
        this.removeItem(key, namespace);
        return null;
      }

      let data = storageItem.data as string;

      if (storageItem.encrypted) {
        data = this.decrypt(data);
      }

      if (storageItem.compressed) {
        data = this.decompress(data);
      }

      const parsedData = JSON.parse(data) as T;

      // Verify checksum
      const expectedChecksum = this.generateChecksum(parsedData);
      if (storageItem.checksum !== expectedChecksum) {
        console.warn('Data integrity check failed for key:', key);
        this.removeItem(key, namespace);
        return null;
      }

      return parsedData;
    } catch (error) {
      console.error('Error retrieving item:', error);
      // Remove corrupted item
      this.removeItem(key, namespace);
      return null;
    }
  }

  public removeItem(key: string, namespace = this.namespace): boolean {
    try {
      const storageKey = `${namespace}_${key}`;
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error('Error removing item:', error);
      return false;
    }
  }

  public clear(namespace = this.namespace): boolean {
    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(namespace),
      );
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }

  public getKeys(namespace = this.namespace): string[] {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(`${namespace}_`))
      .map((key) => key.substring(namespace.length + 1));
  }

  public getStorageInfo() {
    const totalSize = this.getStorageSize();
    const keys = this.getKeys();
    const itemCount = keys.length;
    const maxSize = 5 * 1024 * 1024; // 5MB
    const usagePercentage = (totalSize / maxSize) * 100;

    return {
      totalSize,
      itemCount,
      maxSize,
      usagePercentage,
      freeSpace: maxSize - totalSize,
      keys,
    };
  }

  // Music-specific methods
  public cacheTrack(
    trackId: string,
    trackData: any,
    ttl = 24 * 60 * 60 * 1000,
  ): boolean {
    return this.setItem(`track_${trackId}`, trackData, {
      ttl,
      encrypt: true,
      compress: true,
    });
  }

  public getCachedTrack(trackId: string): any {
    return this.getItem(`track_${trackId}`);
  }

  public cachePlaylist(
    playlistId: string,
    playlistData: any,
    ttl = 12 * 60 * 60 * 1000,
  ): boolean {
    return this.setItem(`playlist_${playlistId}`, playlistData, {
      ttl,
      encrypt: true,
      compress: true,
    });
  }

  public getCachedPlaylist(playlistId: string): any {
    return this.getItem(`playlist_${playlistId}`);
  }

  public cacheSearchResults(
    query: string,
    results: any,
    ttl = 30 * 60 * 1000,
  ): boolean {
    const queryKey = CryptoJS.SHA256(query.toLowerCase())
      .toString()
      .substring(0, 16);
    return this.setItem(`search_${queryKey}`, results, {
      ttl,
      encrypt: false,
      compress: true,
    });
  }

  public getCachedSearchResults(query: string): any {
    const queryKey = CryptoJS.SHA256(query.toLowerCase())
      .toString()
      .substring(0, 16);
    return this.getItem(`search_${queryKey}`);
  }

  public cacheUserPreferences(userId: string, preferences: any): boolean {
    return this.setItem(`preferences_${userId}`, preferences, {
      encrypt: true,
    });
  }

  public getCachedUserPreferences(userId: string): any {
    return this.getItem(`preferences_${userId}`);
  }
}

// Singleton instance
const secureStorage = new SecureOfflineStorage('wedsync_music');

export { secureStorage as secureOfflineStorage, SecureOfflineStorage };
export default secureStorage;
