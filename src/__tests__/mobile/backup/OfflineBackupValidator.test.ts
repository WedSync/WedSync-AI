import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineBackupValidator } from '@/lib/mobile/offline-backup-validator';

describe('OfflineBackupValidator', () => {
  let validator: OfflineBackupValidator;

  beforeEach(() => {
    validator = new OfflineBackupValidator();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      },
      writable: true,
    });

    // Mock navigator.storage
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().mockResolvedValue({
          usage: 1000000,
          quota: 5000000,
        }),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateLocalBackups', () => {
    it('should return validation status for healthy data', async () => {
      // Setup mock data
      const mockWeddingDetails = {
        id: 'wedding-123',
        date: '2024-06-15',
        venue: 'Test Venue',
      };

      (localStorage.getItem as any).mockImplementation((key: string) => {
        switch (key) {
          case 'wedding_details':
            return JSON.stringify(mockWeddingDetails);
          case 'guest_lists':
            return JSON.stringify([
              { name: 'John Doe', email: 'john@example.com' },
            ]);
          case 'wedding_timeline':
            return JSON.stringify({
              events: [{ time: '14:00', event: 'Ceremony' }],
            });
          default:
            return null;
        }
      });

      const result = await validator.validateLocalBackups();

      expect(result).toBeDefined();
      expect(result.isValid).toBeTruthy();
      expect(result.lastValidation).toBeInstanceOf(Date);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should detect corrupted data', async () => {
      // Setup corrupted data
      (localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'wedding_details') {
          return 'invalid json data';
        }
        return null;
      });

      const result = await validator.validateLocalBackups();

      expect(result.isValid).toBeFalsy();
      expect(result.dataIntegrity).toBe('corrupted');
      expect(result.recommendations).toContain(
        'Contact emergency support immediately',
      );
    });

    it('should identify missing critical data', async () => {
      (localStorage.getItem as any).mockReturnValue(null);

      const result = await validator.validateLocalBackups();

      expect(result.criticalDataPresent).toBeFalsy();
      expect(result.missingCriticalData.length).toBeGreaterThan(0);
      expect(result.missingCriticalData).toContain('Wedding Details');
    });

    it('should calculate offline capacity correctly', async () => {
      const result = await validator.validateLocalBackups();

      expect(result.offlineCapacity).toBeGreaterThanOrEqual(0);
      expect(result.offlineCapacity).toBeLessThanOrEqual(100);
    });
  });

  describe('validateCriticalWeddingData', () => {
    it('should validate all critical data components', async () => {
      // Setup complete mock data
      (localStorage.getItem as any).mockImplementation((key: string) => {
        const mockData = {
          wedding_details: { id: '123', date: '2024-06-15', venue: 'Venue' },
          guest_lists: [{ name: 'Guest', email: 'guest@example.com' }],
          wedding_timeline: { events: [{ time: '14:00', event: 'Test' }] },
          vendors: [{ id: '1', name: 'Vendor', type: 'photographer' }],
          tasks: { tasks: [{ id: '1', title: 'Task' }] },
          photo_galleries: { galleries: [] },
          forms: { forms: [] },
          communications: { messages: [] },
        };
        return JSON.stringify(mockData[key as keyof typeof mockData] || null);
      });

      const result = await validator.validateCriticalWeddingData();

      expect(result.weddingDetails).toBeTruthy();
      expect(result.guestList).toBeTruthy();
      expect(result.timeline).toBeTruthy();
      expect(result.vendors).toBeTruthy();
    });

    it('should detect missing wedding details', async () => {
      (localStorage.getItem as any).mockReturnValue(null);

      const result = await validator.validateCriticalWeddingData();

      expect(result.weddingDetails).toBeFalsy();
      expect(result.guestList).toBeFalsy();
      expect(result.timeline).toBeFalsy();
    });
  });

  describe('generateVenueRecoveryPlan', () => {
    it('should generate comprehensive venue recovery plan', async () => {
      const plan = await validator.generateVenueRecoveryPlan();

      expect(plan.essentialData).toBeInstanceOf(Array);
      expect(plan.backupPlan).toBeInstanceOf(Array);
      expect(plan.emergencyContacts).toBeInstanceOf(Array);
      expect(plan.offlineActions).toBeInstanceOf(Array);

      // Check for key components
      expect(
        plan.essentialData.some((item) => item.includes('Wedding timeline')),
      ).toBeTruthy();

      expect(
        plan.emergencyContacts.some((contact) =>
          contact.includes('WedSync Emergency Support'),
        ),
      ).toBeTruthy();

      expect(
        plan.offlineActions.some((action) => action.includes('offline mode')),
      ).toBeTruthy();
    });
  });

  describe('createBackupMetadata', () => {
    it('should create valid backup metadata', async () => {
      // Setup some data in localStorage
      (localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'wedding_details') {
          return JSON.stringify({ id: '123', date: '2024-06-15' });
        }
        return null;
      });

      const metadata = await validator.createBackupMetadata();

      expect(metadata.version).toBe('1.0.0');
      expect(metadata.timestamp).toBeInstanceOf(Date);
      expect(metadata.dataChecksum).toBeDefined();
      expect(metadata.size).toBeGreaterThanOrEqual(0);
      expect(metadata.compressionRatio).toBeGreaterThan(0);
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      (localStorage.getItem as any).mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const result = await validator.validateLocalBackups();

      expect(result.isValid).toBeFalsy();
      expect(result.dataIntegrity).toBe('corrupted');
      expect(result.recommendations).toContain(
        'Contact emergency support immediately',
      );
    });

    it('should handle JSON parsing errors', async () => {
      (localStorage.getItem as any).mockReturnValue('invalid json');

      const result = await validator.validateLocalBackups();

      expect(result.dataIntegrity).toBe('corrupted');
    });

    it('should work without storage API support', async () => {
      // Remove storage API
      Object.defineProperty(navigator, 'storage', {
        value: undefined,
        writable: true,
      });

      const result = await validator.validateLocalBackups();

      expect(result).toBeDefined();
      expect(result.offlineCapacity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Wedding Day Detection', () => {
    it('should detect wedding day correctly', async () => {
      const today = new Date();
      const todayISO = today.toISOString();

      (localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'wedding_details') {
          return JSON.stringify({ id: '123', date: todayISO });
        }
        return null;
      });

      const result = await validator.validateLocalBackups();

      // Should include wedding day specific recommendations
      expect(
        result.recommendations.some((rec) => rec.includes('WEDDING DAY MODE')),
      ).toBeTruthy();
    });

    it('should provide different recommendations for non-wedding days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      (localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'wedding_details') {
          return JSON.stringify({ id: '123', date: futureDate.toISOString() });
        }
        return null;
      });

      const result = await validator.validateLocalBackups();

      // Should NOT include wedding day specific recommendations
      expect(
        result.recommendations.some((rec) => rec.includes('WEDDING DAY MODE')),
      ).toBeFalsy();
    });
  });

  describe('Data Integrity Validation', () => {
    it('should validate data structure correctly', async () => {
      const validData = {
        wedding_details: { id: '123', date: '2024-06-15', venue: 'Test Venue' },
        guest_lists: [{ name: 'John', email: 'john@example.com' }],
        vendors: [{ id: '1', name: 'Photographer', type: 'photography' }],
      };

      (localStorage.getItem as any).mockImplementation((key: string) => {
        return JSON.stringify(validData[key as keyof typeof validData] || null);
      });

      const result = await validator.validateLocalBackups();

      expect(result.dataIntegrity).toBe('excellent');
    });

    it('should detect poor data integrity', async () => {
      const invalidData = {
        wedding_details: { id: '123' }, // Missing required fields
        guest_lists: [{ name: 'John' }], // Missing email
        vendors: [{ id: '1' }], // Missing name and type
      };

      (localStorage.getItem as any).mockImplementation((key: string) => {
        return JSON.stringify(
          invalidData[key as keyof typeof invalidData] || null,
        );
      });

      const result = await validator.validateLocalBackups();

      expect(['poor', 'corrupted']).toContain(result.dataIntegrity);
    });
  });
});
