import Dexie, { Table } from 'dexie';

// Translation interfaces
export interface Translation {
  key: string;
  value: string;
  language: string;
  namespace?: string;
  lastUpdated: Date;
  version: number;
}

export interface TranslationNamespace {
  id: string;
  name: string;
  description: string;
  priority: number; // Higher priority loaded first
  essential: boolean; // Essential namespaces always cached
}

export interface CachedTranslation {
  id?: number;
  key: string;
  value: string;
  language: string;
  namespace: string;
  lastUpdated: Date;
  version: number;
  size: number; // Size in bytes for cache management
}

export interface CacheMetadata {
  id?: number;
  language: string;
  namespace: string;
  version: number;
  lastSync: Date;
  totalTranslations: number;
  totalSize: number;
  isComplete: boolean;
}

// Wedding-specific translation namespaces
export const WEDDING_NAMESPACES: TranslationNamespace[] = [
  {
    id: 'core',
    name: 'Core UI',
    description: 'Essential UI elements and navigation',
    priority: 100,
    essential: true,
  },
  {
    id: 'forms',
    name: 'Form Fields',
    description: 'Form labels, placeholders, and validation messages',
    priority: 90,
    essential: true,
  },
  {
    id: 'wedding',
    name: 'Wedding Terms',
    description: 'Wedding-specific terminology and phrases',
    priority: 80,
    essential: true,
  },
  {
    id: 'vendor',
    name: 'Vendor Management',
    description: 'Vendor-related terms and actions',
    priority: 70,
    essential: false,
  },
  {
    id: 'timeline',
    name: 'Timeline & Planning',
    description: 'Timeline management and planning terms',
    priority: 60,
    essential: false,
  },
  {
    id: 'gallery',
    name: 'Photo Gallery',
    description: 'Photo and media management terms',
    priority: 50,
    essential: false,
  },
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Push notification and alert messages',
    priority: 40,
    essential: false,
  },
  {
    id: 'help',
    name: 'Help & Support',
    description: 'Help documentation and support terms',
    priority: 30,
    essential: false,
  },
];

// IndexedDB database for offline translations
class OfflineTranslationDatabase extends Dexie {
  translations!: Table<CachedTranslation>;
  metadata!: Table<CacheMetadata>;

  constructor() {
    super('WedSyncTranslations');

    this.version(1).stores({
      translations: '++id, key, language, namespace, lastUpdated, version',
      metadata: '++id, language, namespace, version, lastSync',
    });
  }
}

export class OfflineTranslationManager {
  private db: OfflineTranslationDatabase;
  private fallbackTranslations: Map<string, Translation>;
  private loadedNamespaces: Set<string>;
  private syncInProgress: boolean;
  private cacheSize: number;
  private maxCacheSize: number; // 10MB default
  private listeners: Set<
    (key: string, value: string, language: string) => void
  >;

  constructor(maxCacheSize: number = 10 * 1024 * 1024) {
    this.db = new OfflineTranslationDatabase();
    this.fallbackTranslations = new Map();
    this.loadedNamespaces = new Set();
    this.syncInProgress = false;
    this.cacheSize = 0;
    this.maxCacheSize = maxCacheSize;
    this.listeners = new Set();

    this.initializeFallbacks();
    this.loadCacheMetrics();
  }

  // Initialize critical fallback translations
  private initializeFallbacks(): void {
    const criticalTranslations = [
      // Core UI
      {
        key: 'loading',
        en: 'Loading...',
        es: 'Cargando...',
        fr: 'Chargement...',
        ar: 'جاري التحميل...',
      },
      { key: 'error', en: 'Error', es: 'Error', fr: 'Erreur', ar: 'خطأ' },
      {
        key: 'retry',
        en: 'Retry',
        es: 'Reintentar',
        fr: 'Réessayer',
        ar: 'إعادة المحاولة',
      },
      {
        key: 'cancel',
        en: 'Cancel',
        es: 'Cancelar',
        fr: 'Annuler',
        ar: 'إلغاء',
      },
      { key: 'save', en: 'Save', es: 'Guardar', fr: 'Sauvegarder', ar: 'حفظ' },
      { key: 'back', en: 'Back', es: 'Atrás', fr: 'Retour', ar: 'العودة' },

      // Wedding terms
      { key: 'wedding', en: 'Wedding', es: 'Boda', fr: 'Mariage', ar: 'زفاف' },
      { key: 'bride', en: 'Bride', es: 'Novia', fr: 'Mariée', ar: 'العروس' },
      { key: 'groom', en: 'Groom', es: 'Novio', fr: 'Marié', ar: 'العريس' },
      { key: 'venue', en: 'Venue', es: 'Local', fr: 'Lieu', ar: 'المكان' },
      { key: 'date', en: 'Date', es: 'Fecha', fr: 'Date', ar: 'التاريخ' },

      // Form fields
      { key: 'name', en: 'Name', es: 'Nombre', fr: 'Nom', ar: 'الاسم' },
      {
        key: 'email',
        en: 'Email',
        es: 'Correo',
        fr: 'Email',
        ar: 'البريد الإلكتروني',
      },
      {
        key: 'phone',
        en: 'Phone',
        es: 'Teléfono',
        fr: 'Téléphone',
        ar: 'الهاتف',
      },
      {
        key: 'message',
        en: 'Message',
        es: 'Mensaje',
        fr: 'Message',
        ar: 'الرسالة',
      },
    ];

    criticalTranslations.forEach((item) => {
      Object.entries(item).forEach(([lang, value]) => {
        if (lang !== 'key') {
          const translation: Translation = {
            key: item.key,
            value: value as string,
            language: lang,
            namespace: 'core',
            lastUpdated: new Date(),
            version: 1,
          };
          this.fallbackTranslations.set(`${lang}:${item.key}`, translation);
        }
      });
    });
  }

  private async loadCacheMetrics(): Promise<void> {
    try {
      const translations = await this.db.translations.toArray();
      this.cacheSize = translations.reduce((sum, t) => sum + t.size, 0);
    } catch (error) {
      console.warn('Failed to load cache metrics:', error);
      this.cacheSize = 0;
    }
  }

  // Get translation with fallback support
  public async getTranslation(
    key: string,
    language: string,
    namespace: string = 'core',
    interpolations?: Record<string, string>,
  ): Promise<string> {
    try {
      // Try cache first
      const cached = await this.db.translations
        .where({ key, language, namespace })
        .first();

      if (cached) {
        let value = cached.value;

        // Handle interpolations
        if (interpolations) {
          Object.entries(interpolations).forEach(
            ([placeholder, replacement]) => {
              value = value.replace(
                new RegExp(`{{${placeholder}}}`, 'g'),
                replacement,
              );
            },
          );
        }

        return value;
      }

      // Try fallback
      const fallbackKey = `${language}:${key}`;
      const fallback = this.fallbackTranslations.get(fallbackKey);
      if (fallback) {
        let value = fallback.value;

        if (interpolations) {
          Object.entries(interpolations).forEach(
            ([placeholder, replacement]) => {
              value = value.replace(
                new RegExp(`{{${placeholder}}}`, 'g'),
                replacement,
              );
            },
          );
        }

        return value;
      }

      // Try English fallback
      if (language !== 'en') {
        const englishFallback = this.fallbackTranslations.get(`en:${key}`);
        if (englishFallback) {
          return englishFallback.value;
        }
      }

      // Return key if no translation found
      console.warn(`Translation not found: ${language}:${namespace}:${key}`);
      return key;
    } catch (error) {
      console.error('Error getting translation:', error);
      return key;
    }
  }

  // Batch get multiple translations
  public async getTranslations(
    keys: string[],
    language: string,
    namespace: string = 'core',
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    await Promise.all(
      keys.map(async (key) => {
        results[key] = await this.getTranslation(key, language, namespace);
      }),
    );

    return results;
  }

  // Cache translations from server
  public async cacheTranslations(
    translations: Translation[],
    language: string,
    namespace: string,
  ): Promise<void> {
    if (this.syncInProgress) {
      console.warn('Sync already in progress');
      return;
    }

    this.syncInProgress = true;

    try {
      // Check cache space
      const requiredSize = translations.reduce(
        (sum, t) => sum + new Blob([JSON.stringify(t)]).size,
        0,
      );

      if (this.cacheSize + requiredSize > this.maxCacheSize) {
        await this.performCacheCleanup(requiredSize);
      }

      // Prepare cached translations
      const cachedTranslations: CachedTranslation[] = translations.map((t) => ({
        key: t.key,
        value: t.value,
        language: t.language,
        namespace: t.namespace || namespace,
        lastUpdated: t.lastUpdated,
        version: t.version,
        size: new Blob([JSON.stringify(t)]).size,
      }));

      // Store in IndexedDB
      await this.db.transaction(
        'rw',
        [this.db.translations, this.db.metadata],
        async () => {
          // Clear existing translations for this language/namespace
          await this.db.translations.where({ language, namespace }).delete();

          // Add new translations
          await this.db.translations.bulkAdd(cachedTranslations);

          // Update metadata
          const metadata: CacheMetadata = {
            language,
            namespace,
            version: Math.max(...translations.map((t) => t.version)),
            lastSync: new Date(),
            totalTranslations: translations.length,
            totalSize: requiredSize,
            isComplete: true,
          };

          await this.db.metadata.put(metadata);
        },
      );

      this.cacheSize += requiredSize;
      this.loadedNamespaces.add(`${language}:${namespace}`);

      // Notify listeners
      translations.forEach((t) => {
        this.notifyListeners(t.key, t.value, t.language);
      });
    } catch (error) {
      console.error('Error caching translations:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Load essential namespaces for offline use
  public async loadEssentialTranslations(language: string): Promise<void> {
    const essential = WEDDING_NAMESPACES.filter((ns) => ns.essential).sort(
      (a, b) => b.priority - a.priority,
    );

    for (const namespace of essential) {
      try {
        await this.loadNamespaceFromServer(language, namespace.id);
      } catch (error) {
        console.warn(
          `Failed to load essential namespace ${namespace.id}:`,
          error,
        );
      }
    }
  }

  // Clean up cache when space is needed
  private async performCacheCleanup(requiredSpace: number): Promise<void> {
    console.log('Performing cache cleanup...');

    try {
      // Get all metadata sorted by priority (non-essential first, oldest first)
      const allMetadata = await this.db.metadata.toArray();
      const namespacesByPriority = allMetadata
        .map((meta) => {
          const namespace = WEDDING_NAMESPACES.find(
            (ns) => ns.id === meta.namespace,
          );
          return {
            ...meta,
            priority: namespace?.priority || 0,
            essential: namespace?.essential || false,
          };
        })
        .filter((meta) => !meta.essential) // Never delete essential namespaces
        .sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return a.lastSync.getTime() - b.lastSync.getTime();
        });

      let freedSpace = 0;
      const targetSpace = requiredSpace * 1.2; // Clean up 20% more for buffer

      for (const meta of namespacesByPriority) {
        if (freedSpace >= targetSpace) break;

        // Delete translations for this namespace
        await this.db.translations
          .where({ language: meta.language, namespace: meta.namespace })
          .delete();

        // Delete metadata
        await this.db.metadata
          .where({ language: meta.language, namespace: meta.namespace })
          .delete();

        freedSpace += meta.totalSize;
        this.loadedNamespaces.delete(`${meta.language}:${meta.namespace}`);
      }

      this.cacheSize -= freedSpace;
      console.log(`Cache cleanup completed. Freed ${freedSpace} bytes.`);
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  // Mock server loading (replace with actual API calls)
  private async loadNamespaceFromServer(
    language: string,
    namespace: string,
  ): Promise<void> {
    // Mock implementation - replace with actual API call
    const mockTranslations: Translation[] = [
      {
        key: 'example',
        value: 'Example translation',
        language,
        namespace,
        lastUpdated: new Date(),
        version: 1,
      },
    ];

    await this.cacheTranslations(mockTranslations, language, namespace);
  }

  // Check cache status
  public async getCacheStatus(language: string): Promise<{
    totalSize: number;
    availableSpace: number;
    namespaces: { name: string; cached: boolean; size: number }[];
  }> {
    const namespaceStatuses = await Promise.all(
      WEDDING_NAMESPACES.map(async (ns) => {
        const metadata = await this.db.metadata
          .where({ language, namespace: ns.id })
          .first();

        return {
          name: ns.name,
          cached: !!metadata,
          size: metadata?.totalSize || 0,
        };
      }),
    );

    return {
      totalSize: this.cacheSize,
      availableSpace: this.maxCacheSize - this.cacheSize,
      namespaces: namespaceStatuses,
    };
  }

  // Clear all cached translations
  public async clearCache(): Promise<void> {
    try {
      await this.db.translations.clear();
      await this.db.metadata.clear();
      this.cacheSize = 0;
      this.loadedNamespaces.clear();
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  // Subscribe to translation updates
  public subscribe(
    callback: (key: string, value: string, language: string) => void,
  ): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(key: string, value: string, language: string): void {
    this.listeners.forEach((callback) => {
      try {
        callback(key, value, language);
      } catch (error) {
        console.error('Error in translation listener:', error);
      }
    });
  }

  // Export cache for debugging
  public async exportCache(): Promise<{
    translations: CachedTranslation[];
    metadata: CacheMetadata[];
    stats: {
      totalTranslations: number;
      totalSize: number;
      namespaces: string[];
    };
  }> {
    const translations = await this.db.translations.toArray();
    const metadata = await this.db.metadata.toArray();

    return {
      translations,
      metadata,
      stats: {
        totalTranslations: translations.length,
        totalSize: this.cacheSize,
        namespaces: Array.from(this.loadedNamespaces),
      },
    };
  }

  // Get translation key with fallback chain
  public async getWithFallback(
    key: string,
    language: string,
    namespace: string = 'core',
    fallbackLanguages: string[] = ['en'],
  ): Promise<string> {
    // Try primary language
    let result = await this.getTranslation(key, language, namespace);
    if (result !== key) return result;

    // Try fallback languages
    for (const fallbackLang of fallbackLanguages) {
      if (fallbackLang === language) continue;
      result = await this.getTranslation(key, fallbackLang, namespace);
      if (result !== key) return result;
    }

    return key; // Return key if no translation found
  }
}

// Singleton instance
export const offlineTranslationManager = new OfflineTranslationManager();

// React hook for using offline translations
export const useOfflineTranslation = () => {
  return {
    t: offlineTranslationManager.getTranslation.bind(offlineTranslationManager),
    tBatch: offlineTranslationManager.getTranslations.bind(
      offlineTranslationManager,
    ),
    tWithFallback: offlineTranslationManager.getWithFallback.bind(
      offlineTranslationManager,
    ),
    cacheStatus: offlineTranslationManager.getCacheStatus.bind(
      offlineTranslationManager,
    ),
    loadEssential: offlineTranslationManager.loadEssentialTranslations.bind(
      offlineTranslationManager,
    ),
    clearCache: offlineTranslationManager.clearCache.bind(
      offlineTranslationManager,
    ),
    subscribe: offlineTranslationManager.subscribe.bind(
      offlineTranslationManager,
    ),
  };
};

export default OfflineTranslationManager;
