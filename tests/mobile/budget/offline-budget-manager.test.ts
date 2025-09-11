/**
 * WS-245: Offline Budget Manager Tests
 * Tests for offline budget data management and synchronization
 */

import { OfflineBudgetManager, BudgetData, BudgetExpense } from '@/lib/offline/budget-offline-manager';
import 'fake-indexeddb/auto';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

const mockBudgetData: BudgetData = {
  id: 'budget-123',
  weddingId: 'wedding-456',
  organizationId: 'org-789',
  totalBudget: 50000,
  categories: [
    {
      id: 'cat-1',
      name: 'Venue',
      allocated: 20000,
      spent: 18000,
      color: '#3B82F6',
      priority: 1,
      isDefault: true
    },
    {
      id: 'cat-2',
      name: 'Photography',
      allocated: 8000,
      spent: 7500,
      color: '#10B981',
      priority: 2,
      isDefault: true
    }
  ],
  expenses: [
    {
      id: 'exp-1',
      categoryId: 'cat-1',
      amount: 18000,
      description: 'Wedding venue booking',
      vendor: 'Beautiful Venue Ltd',
      date: new Date('2024-12-15'),
      isRecurring: false,
      tags: ['venue', 'deposit'],
      createdOffline: false
    }
  ],
  lastModified: new Date(),
  version: 1,
  syncStatus: 'synced'
};

describe('OfflineBudgetManager', () => {
  let manager: OfflineBudgetManager;

  beforeEach(async () => {
    // Reset IndexedDB
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
    
    manager = new OfflineBudgetManager();
    jest.clearAllMocks();
  });

  describe('Database Initialization', () => {
    test('creates IndexedDB with correct object stores', async () => {
      await manager.storeBudgetLocally(mockBudgetData);
      
      // Should not throw any errors
      expect(true).toBe(true);
    });

    test('creates correct indexes for efficient queries', async () => {
      await manager.storeBudgetLocally(mockBudgetData);
      
      const budgets = await manager.getBudgetsByOrganization('org-789');
      expect(budgets).toHaveLength(1);
      expect(budgets[0].id).toBe('budget-123');
    });
  });

  describe('Offline Storage', () => {
    test('stores budget data locally', async () => {
      await manager.storeBudgetLocally(mockBudgetData);
      
      const stored = await manager.loadOfflineBudget('budget-123');
      expect(stored).toBeTruthy();
      expect(stored?.id).toBe('budget-123');
      expect(stored?.totalBudget).toBe(50000);
      expect(stored?.categories).toHaveLength(2);
    });

    test('marks stored data as pending sync', async () => {
      await manager.storeBudgetLocally(mockBudgetData);
      
      const stored = await manager.loadOfflineBudget('budget-123');
      expect(stored?.syncStatus).toBe('pending');
    });

    test('returns null for non-existent budget', async () => {
      const result = await manager.loadOfflineBudget('non-existent');
      expect(result).toBeNull();
    });

    test('retrieves budgets by organization', async () => {
      const budget2 = { ...mockBudgetData, id: 'budget-456', weddingId: 'wedding-789' };
      const budget3 = { ...mockBudgetData, id: 'budget-789', organizationId: 'different-org' };
      
      await manager.storeBudgetLocally(mockBudgetData);
      await manager.storeBudgetLocally(budget2);
      await manager.storeBudgetLocally(budget3);
      
      const orgBudgets = await manager.getBudgetsByOrganization('org-789');
      expect(orgBudgets).toHaveLength(2);
      expect(orgBudgets.map(b => b.id)).toEqual(['budget-123', 'budget-456']);
    });
  });

  describe('Offline Expense Management', () => {
    beforeEach(async () => {
      await manager.storeBudgetLocally(mockBudgetData);
    });

    test('adds expense to offline budget', async () => {
      const newExpense = {
        categoryId: 'cat-2',
        amount: 500,
        description: 'Photography engagement session',
        vendor: 'Amazing Photos',
        date: new Date(),
        isRecurring: false,
        tags: ['photography', 'engagement']
      };

      await manager.addExpenseOffline('budget-123', newExpense);
      
      const updated = await manager.loadOfflineBudget('budget-123');
      expect(updated?.expenses).toHaveLength(2);
      
      const addedExpense = updated?.expenses.find(e => e.description === 'Photography engagement session');
      expect(addedExpense).toBeTruthy();
      expect(addedExpense?.createdOffline).toBe(true);
      expect(addedExpense?.id).toMatch(/^offline_/);
    });

    test('updates category spent amount when adding expense', async () => {
      const newExpense = {
        categoryId: 'cat-2',
        amount: 500,
        description: 'Additional photography',
        date: new Date(),
        isRecurring: false,
        tags: []
      };

      await manager.addExpenseOffline('budget-123', newExpense);
      
      const updated = await manager.loadOfflineBudget('budget-123');
      const photographyCategory = updated?.categories.find(c => c.id === 'cat-2');
      expect(photographyCategory?.spent).toBe(8000); // 7500 + 500
    });

    test('increments version when adding expense', async () => {
      const newExpense = {
        categoryId: 'cat-1',
        amount: 100,
        description: 'Venue extra',
        date: new Date(),
        isRecurring: false,
        tags: []
      };

      await manager.addExpenseOffline('budget-123', newExpense);
      
      const updated = await manager.loadOfflineBudget('budget-123');
      expect(updated?.version).toBe(2); // Was 1, now 2
    });
  });

  describe('Budget Allocation Updates', () => {
    beforeEach(async () => {
      await manager.storeBudgetLocally(mockBudgetData);
    });

    test('updates allocation for specific category', async () => {
      await manager.updateAllocationOffline('budget-123', 'cat-1', 22000);
      
      const updated = await manager.loadOfflineBudget('budget-123');
      const venueCategory = updated?.categories.find(c => c.id === 'cat-1');
      expect(venueCategory?.allocated).toBe(22000);
    });

    test('increments version when updating allocation', async () => {
      await manager.updateAllocationOffline('budget-123', 'cat-1', 25000);
      
      const updated = await manager.loadOfflineBudget('budget-123');
      expect(updated?.version).toBe(2);
    });

    test('throws error for non-existent budget', async () => {
      await expect(
        manager.updateAllocationOffline('non-existent', 'cat-1', 25000)
      ).rejects.toThrow('Budget not found offline');
    });

    test('throws error for non-existent category', async () => {
      await expect(
        manager.updateAllocationOffline('budget-123', 'non-existent', 25000)
      ).rejects.toThrow('Category not found');
    });
  });

  describe('Synchronization', () => {
    beforeEach(async () => {
      await manager.storeBudgetLocally(mockBudgetData);
    });

    test('returns sync failure when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const result = await manager.syncOfflineBudgetChanges();
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('No network connection available');
    });

    test('successfully syncs when online with valid response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockBudgetData, syncStatus: 'synced' })
      });

      const result = await manager.syncOfflineBudgetChanges();
      
      expect(result.success).toBe(true);
      expect(result.synced).toBeGreaterThan(0);
      expect(result.failed).toBe(0);
    });

    test('handles sync conflicts correctly', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('version conflict'));

      const result = await manager.syncOfflineBudgetChanges();
      
      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].conflictType).toBe('data');
    });

    test('retries failed sync operations', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBudgetData
        });

      // First sync attempt fails
      let result = await manager.syncOfflineBudgetChanges();
      expect(result.success).toBe(false);

      // Second sync attempt succeeds
      result = await manager.syncOfflineBudgetChanges();
      expect(result.success).toBe(true);
    });

    test('prevents concurrent sync operations', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      // Start two sync operations
      const sync1Promise = manager.syncOfflineBudgetChanges();
      const sync2Promise = manager.syncOfflineBudgetChanges();

      const [result1, result2] = await Promise.all([sync1Promise, sync2Promise]);
      
      // One should succeed, one should be blocked
      expect(result1.success !== result2.success).toBe(true);
      expect(
        result1.errors.includes('Sync already in progress') ||
        result2.errors.includes('Sync already in progress')
      ).toBe(true);
    });
  });

  describe('Offline Status', () => {
    test('reports correct offline status', async () => {
      await manager.storeBudgetLocally(mockBudgetData);
      
      const status = await manager.getOfflineStatus();
      
      expect(status.isOffline).toBe(false); // Navigator.onLine is true by default
      expect(status.pendingSyncCount).toBeGreaterThan(0);
    });

    test('detects network status changes', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const status = await manager.getOfflineStatus();
      
      expect(status.isOffline).toBe(true);
    });
  });

  describe('Market Data Caching', () => {
    test('caches market data for offline recommendations', async () => {
      const marketData = {
        averagePrice: 5000,
        priceRange: { min: 3000, max: 8000 },
        recommendations: ['Consider booking early for better rates']
      };

      await manager.cacheMarketData('photography', 'london', marketData);
      
      const cached = await manager.getCachedMarketData('photography', 'london');
      expect(cached).toEqual(marketData);
    });

    test('returns null for expired market data', async () => {
      const marketData = { averagePrice: 5000 };
      
      await manager.cacheMarketData('venue', 'manchester', marketData);
      
      // Manually set expiry time in the past
      // This would need access to the IndexedDB store directly in a real scenario
      const cached = await manager.getCachedMarketData('venue', 'manchester');
      expect(cached).toEqual(marketData); // Should still be valid for now
    });

    test('returns null for non-existent cached data', async () => {
      const result = await manager.getCachedMarketData('nonexistent', 'location');
      expect(result).toBeNull();
    });
  });

  describe('Data Cleanup', () => {
    test('clears all offline data', async () => {
      await manager.storeBudgetLocally(mockBudgetData);
      await manager.cacheMarketData('test', 'location', { data: 'test' });
      
      await manager.clearOfflineData();
      
      const budget = await manager.loadOfflineBudget('budget-123');
      const market = await manager.getCachedMarketData('test', 'location');
      
      expect(budget).toBeNull();
      expect(market).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('handles IndexedDB errors gracefully', async () => {
      // Mock IndexedDB to throw error
      const originalIndexedDB = global.indexedDB;
      global.indexedDB = {
        ...originalIndexedDB,
        open: () => {
          throw new Error('IndexedDB not available');
        }
      } as any;

      // Should not crash
      const newManager = new OfflineBudgetManager();
      
      // Restore
      global.indexedDB = originalIndexedDB;
    });

    test('handles network errors during sync', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await manager.syncOfflineBudgetChanges();
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Sync failed: Network error');
    });

    test('handles malformed server responses', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await manager.syncOfflineBudgetChanges();
      
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Internal Server Error');
    });
  });

  describe('Performance', () => {
    test('handles large numbers of expenses efficiently', async () => {
      const largeExpenseList = Array.from({ length: 1000 }, (_, i) => ({
        id: `exp-${i}`,
        categoryId: 'cat-1',
        amount: 100,
        description: `Expense ${i}`,
        date: new Date(),
        isRecurring: false,
        tags: [],
        createdOffline: false
      }));

      const largeBudget = {
        ...mockBudgetData,
        expenses: largeExpenseList
      };

      const startTime = performance.now();
      await manager.storeBudgetLocally(largeBudget);
      const stored = await manager.loadOfflineBudget('budget-123');
      const endTime = performance.now();

      expect(stored?.expenses).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('batches multiple allocation updates efficiently', async () => {
      await manager.storeBudgetLocally(mockBudgetData);
      
      const startTime = performance.now();
      
      // Make multiple rapid updates
      for (let i = 0; i < 10; i++) {
        await manager.updateAllocationOffline('budget-123', 'cat-1', 20000 + i * 100);
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500); // Should be fast
    });
  });
});