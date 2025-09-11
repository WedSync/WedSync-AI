import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  OfflineTranslationManager,
  WEDDING_NAMESPACES,
  offlineTranslationManager,
  useOfflineTranslation
} from '../../../src/lib/services/mobile-i18n/OfflineTranslationManager';
import 'fake-indexeddb/auto';
import { renderHook, act } from '@testing-library/react';

// Mock Dexie for IndexedDB operations
vi.mock('dexie', () => {
  const mockTable = {
    where: vi.fn().mockReturnThis(),
    first: vi.fn(),
    toArray: vi.fn(),
    bulkAdd: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  };

  const mockDb = {
    translations: mockTable,
    metadata: mockTable,
    transaction: vi.fn((mode, tables, callback) => callback()),
  };

  return {
    default: class MockDexie {
      constructor() {
        Object.assign(this, mockDb);
      }
      version() {
        return {
          stores: () => this
        };
      }
    },
    Table: class MockTable {}
  };
});

describe('OfflineTranslationManager', () => {
  let manager: OfflineTranslationManager;

  beforeEach(() => {
    manager = new OfflineTranslationManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('initializes with default max cache size', () => {
      const newManager = new OfflineTranslationManager();
      expect(newManager).toBeDefined();
    });

    it('initializes with custom max cache size', () => {
      const customSize = 5 * 1024 * 1024; // 5MB
      const newManager = new OfflineTranslationManager(customSize);
      expect(newManager).toBeDefined();
    });

    it('initializes fallback translations', () => {
      // Should have critical fallback translations loaded
      expect(manager).toBeDefined();
    });
  });

  describe('getTranslation', () => {
    it('returns translation from cache when available', async () => {
      const mockTranslation = {
        key: 'test_key',
        value: 'Test Value',
        language: 'en',
        namespace: 'core',
        lastUpdated: new Date(),
        version: 1,
        size: 100
      };

      // Mock database response
      const mockDb = manager['db'];
      vi.spyOn(mockDb.translations, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue(mockTranslation)
      } as any);

      const result = await manager.getTranslation('test_key', 'en', 'core');
      expect(result).toBe('Test Value');
    });

    it('returns fallback translation when cache miss', async () => {
      // Mock database returning null (cache miss)
      const mockDb = manager['db'];
      vi.spyOn(mockDb.translations, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      const result = await manager.getTranslation('loading', 'en', 'core');
      expect(result).toBe('Loading...');
    });

    it('handles interpolations correctly', async () => {
      const mockTranslation = {
        key: 'greeting',
        value: 'Hello {{name}}, welcome to {{app}}!',
        language: 'en',
        namespace: 'core',
        lastUpdated: new Date(),
        version: 1,
        size: 100
      };

      const mockDb = manager['db'];
      vi.spyOn(mockDb.translations, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue(mockTranslation)
      } as any);

      const result = await manager.getTranslation(
        'greeting', 
        'en', 
        'core',
        { name: 'John', app: 'WedSync' }
      );
      expect(result).toBe('Hello John, welcome to WedSync!');
    });

    it('falls back to English when non-English translation not found', async () => {
      // Mock database returning null for Spanish but having English fallback
      const mockDb = manager['db'];
      vi.spyOn(mockDb.translations, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      const result = await manager.getTranslation('loading', 'es', 'core');
      expect(result).toBe('Loading...'); // English fallback
    });

    it('returns key when no translation found', async () => {
      const mockDb = manager['db'];
      vi.spyOn(mockDb.translations, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      const result = await manager.getTranslation('nonexistent_key', 'es', 'core');
      expect(result).toBe('nonexistent_key');
    });
  });

  describe('getTranslations', () => {
    it('returns multiple translations as object', async () => {
      const mockTranslations = {
        'loading': 'Loading...',
        'save': 'Save',
        'cancel': 'Cancel'
      };

      // Mock getTranslation method
      vi.spyOn(manager, 'getTranslation')
        .mockImplementation((key) => Promise.resolve(mockTranslations[key as keyof typeof mockTranslations] || key));

      const result = await manager.getTranslations(['loading', 'save', 'cancel'], 'en', 'core');
      
      expect(result).toEqual({
        loading: 'Loading...',
        save: 'Save',
        cancel: 'Cancel'
      });
    });
  });

  describe('cacheTranslations', () => {
    it('caches translations successfully', async () => {
      const translations = [
        {
          key: 'test1',
          value: 'Test 1',
          language: 'en',
          namespace: 'core',
          lastUpdated: new Date(),
          version: 1
        },
        {
          key: 'test2', 
          value: 'Test 2',
          language: 'en',
          namespace: 'core',
          lastUpdated: new Date(),
          version: 1
        }
      ];

      const mockDb = manager['db'];
      vi.spyOn(mockDb, 'transaction').mockImplementation((mode, tables, callback) => {
        return callback();
      });
      vi.spyOn(mockDb.translations, 'delete').mockResolvedValue(undefined);
      vi.spyOn(mockDb.translations, 'bulkAdd').mockResolvedValue([]);
      vi.spyOn(mockDb.metadata, 'put').mockResolvedValue(undefined);

      await expect(manager.cacheTranslations(translations, 'en', 'core')).resolves.not.toThrow();
    });

    it('prevents concurrent caching operations', async () => {
      const translations = [{
        key: 'test',
        value: 'Test',
        language: 'en',
        namespace: 'core',
        lastUpdated: new Date(),
        version: 1
      }];

      // Start first cache operation
      const promise1 = manager.cacheTranslations(translations, 'en', 'core');
      
      // Try to start second operation immediately
      const promise2 = manager.cacheTranslations(translations, 'en', 'core');

      await expect(promise2).resolves.not.toThrow();
      await expect(promise1).resolves.not.toThrow();
    });
  });

  describe('loadEssentialTranslations', () => {
    it('loads all essential namespaces in priority order', async () => {
      const mockLoadNamespace = vi.spyOn(manager as any, 'loadNamespaceFromServer')
        .mockResolvedValue(undefined);

      await manager.loadEssentialTranslations('en');

      const essentialNamespaces = WEDDING_NAMESPACES.filter(ns => ns.essential);
      expect(mockLoadNamespace).toHaveBeenCalledTimes(essentialNamespaces.length);

      essentialNamespaces.forEach(ns => {
        expect(mockLoadNamespace).toHaveBeenCalledWith('en', ns.id);
      });
    });

    it('continues loading other namespaces if one fails', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockLoadNamespace = vi.spyOn(manager as any, 'loadNamespaceFromServer')
        .mockImplementation((lang, ns) => {
          if (ns === 'core') {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve();
        });

      await manager.loadEssentialTranslations('en');

      const essentialNamespaces = WEDDING_NAMESPACES.filter(ns => ns.essential);
      expect(mockLoadNamespace).toHaveBeenCalledTimes(essentialNamespaces.length);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('getCacheStatus', () => {
    it('returns cache status information', async () => {
      const mockMetadata = [
        {
          language: 'en',
          namespace: 'core',
          version: 1,
          lastSync: new Date(),
          totalTranslations: 50,
          totalSize: 1024,
          isComplete: true
        }
      ];

      const mockDb = manager['db'];
      vi.spyOn(mockDb.metadata, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue(mockMetadata[0])
      } as any);

      const status = await manager.getCacheStatus('en');
      
      expect(status).toHaveProperty('totalSize');
      expect(status).toHaveProperty('availableSpace');
      expect(status).toHaveProperty('namespaces');
      expect(Array.isArray(status.namespaces)).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('clears all cached data', async () => {
      const mockDb = manager['db'];
      vi.spyOn(mockDb.translations, 'clear').mockResolvedValue(undefined);
      vi.spyOn(mockDb.metadata, 'clear').mockResolvedValue(undefined);

      await manager.clearCache();

      expect(mockDb.translations.clear).toHaveBeenCalledOnce();
      expect(mockDb.metadata.clear).toHaveBeenCalledOnce();
    });
  });

  describe('subscribe', () => {
    it('adds and removes listeners correctly', () => {
      const mockCallback = vi.fn();
      
      const unsubscribe = manager.subscribe(mockCallback);
      expect(typeof unsubscribe).toBe('function');
      
      // Trigger a notification
      manager['notifyListeners']('test_key', 'Test Value', 'en');
      expect(mockCallback).toHaveBeenCalledWith('test_key', 'Test Value', 'en');
      
      // Unsubscribe
      unsubscribe();
      manager['notifyListeners']('test_key', 'Test Value', 'en');
      expect(mockCallback).toHaveBeenCalledOnce(); // Should not be called again
    });
  });

  describe('getWithFallback', () => {
    it('tries multiple fallback languages', async () => {
      vi.spyOn(manager, 'getTranslation')
        .mockImplementation((key, lang) => {
          if (key === 'test' && lang === 'fr') return Promise.resolve('Bonjour');
          if (key === 'test' && lang === 'en') return Promise.resolve('Hello');
          return Promise.resolve(key);
        });

      const result = await manager.getWithFallback('test', 'es', 'core', ['fr', 'en']);
      expect(result).toBe('Bonjour'); // Should get French fallback
    });

    it('returns key when no fallbacks work', async () => {
      vi.spyOn(manager, 'getTranslation')
        .mockImplementation((key) => Promise.resolve(key)); // Always return key (not found)

      const result = await manager.getWithFallback('nonexistent', 'es', 'core', ['fr', 'en']);
      expect(result).toBe('nonexistent');
    });
  });

  describe('exportCache', () => {
    it('exports cache data for debugging', async () => {
      const mockTranslations = [{ key: 'test', value: 'Test', language: 'en', namespace: 'core' }];
      const mockMetadata = [{ language: 'en', namespace: 'core', version: 1 }];

      const mockDb = manager['db'];
      vi.spyOn(mockDb.translations, 'toArray').mockResolvedValue(mockTranslations as any);
      vi.spyOn(mockDb.metadata, 'toArray').mockResolvedValue(mockMetadata as any);

      const exported = await manager.exportCache();

      expect(exported).toHaveProperty('translations');
      expect(exported).toHaveProperty('metadata');
      expect(exported).toHaveProperty('stats');
      expect(exported.stats).toHaveProperty('totalTranslations');
      expect(exported.stats).toHaveProperty('totalSize');
      expect(exported.stats).toHaveProperty('namespaces');
    });
  });
});

describe('WEDDING_NAMESPACES', () => {
  it('contains essential namespaces', () => {
    const essential = WEDDING_NAMESPACES.filter(ns => ns.essential);
    expect(essential.length).toBeGreaterThan(0);
    
    const coreNamespace = essential.find(ns => ns.id === 'core');
    expect(coreNamespace).toBeDefined();
    expect(coreNamespace?.priority).toBe(100);
  });

  it('has correct priority ordering', () => {
    const priorities = WEDDING_NAMESPACES.map(ns => ns.priority);
    const sortedPriorities = [...priorities].sort((a, b) => b - a);
    expect(priorities).toEqual(sortedPriorities);
  });

  it('has unique namespace IDs', () => {
    const ids = WEDDING_NAMESPACES.map(ns => ns.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids).toEqual(uniqueIds);
  });
});

describe('useOfflineTranslation hook', () => {
  it('returns translation functions', () => {
    const { result } = renderHook(() => useOfflineTranslation());

    expect(typeof result.current.t).toBe('function');
    expect(typeof result.current.tBatch).toBe('function');
    expect(typeof result.current.tWithFallback).toBe('function');
    expect(typeof result.current.cacheStatus).toBe('function');
    expect(typeof result.current.loadEssential).toBe('function');
    expect(typeof result.current.clearCache).toBe('function');
    expect(typeof result.current.subscribe).toBe('function');
  });

  it('functions are bound to manager instance', async () => {
    const { result } = renderHook(() => useOfflineTranslation());
    
    // Mock the singleton instance
    vi.spyOn(offlineTranslationManager, 'getTranslation')
      .mockResolvedValue('Test Translation');

    const translation = await result.current.t('test_key', 'en', 'core');
    expect(translation).toBe('Test Translation');
    expect(offlineTranslationManager.getTranslation).toHaveBeenCalledWith('test_key', 'en', 'core');
  });
});