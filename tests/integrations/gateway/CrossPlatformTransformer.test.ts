import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CrossPlatformTransformer } from '../../../src/integrations/api-gateway/CrossPlatformTransformer';

describe('CrossPlatformTransformer', () => {
  let transformer: CrossPlatformTransformer;
  const mockConfig = {
    defaultOutputFormat: 'standardized',
    enableValidation: true,
    enableSchemaCache: true,
    maxTransformationDepth: 10,
    timeoutMs: 5000,
    enableWeddingFieldMappings: true,
    customTransformationRules: {
      'tave-api': 'tave-transformer',
      'honeybook-api': 'honeybook-transformer'
    }
  };

  beforeEach(() => {
    transformer = new CrossPlatformTransformer(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Schema Management', () => {
    it('should register transformation schema successfully', async () => {
      const schema = {
        schemaId: 'vendor-profile-v1',
        name: 'Vendor Profile Schema',
        version: '1.0.0',
        sourceFormat: 'tave-api',
        targetFormat: 'wedsync-standard',
        fieldMappings: {
          'vendor_name': 'businessName',
          'contact_phone': 'phoneNumber',
          'contact_email': 'email',
          'services_offered': 'serviceCategories'
        },
        validationRules: {
          'businessName': { required: true, minLength: 2, maxLength: 100 },
          'phoneNumber': { required: true, pattern: '^\\+?[1-9]\\d{1,14}$' },
          'email': { required: true, format: 'email' },
          'serviceCategories': { required: true, type: 'array', minItems: 1 }
        },
        customTransformers: {
          'services_offered': 'arrayToServiceCategories'
        }
      };

      const result = await transformer.registerSchema(schema);
      expect(result.success).toBe(true);
      expect(result.schemaId).toBe('vendor-profile-v1');
    });

    it('should validate schema before registration', async () => {
      const invalidSchema = {
        schemaId: '',
        name: 'Invalid Schema',
        version: 'invalid',
        sourceFormat: '',
        targetFormat: '',
        fieldMappings: {},
        validationRules: {},
        customTransformers: {}
      };

      await expect(transformer.registerSchema(invalidSchema)).rejects.toThrow('Invalid schema configuration');
    });

    it('should update existing schema', async () => {
      const schema = {
        schemaId: 'vendor-profile-v1',
        name: 'Vendor Profile Schema',
        version: '1.0.0',
        sourceFormat: 'tave-api',
        targetFormat: 'wedsync-standard',
        fieldMappings: { 'vendor_name': 'businessName' },
        validationRules: {},
        customTransformers: {}
      };

      await transformer.registerSchema(schema);

      const updatedSchema = {
        ...schema,
        version: '1.1.0',
        fieldMappings: { 
          'vendor_name': 'businessName',
          'contact_email': 'email'
        }
      };

      const result = await transformer.registerSchema(updatedSchema);
      expect(result.success).toBe(true);
      expect(result.message).toContain('updated');
    });
  });

  describe('Data Transformation', () => {
    beforeEach(async () => {
      // Register test schemas
      const vendorSchema = {
        schemaId: 'vendor-profile-v1',
        name: 'Vendor Profile Schema',
        version: '1.0.0',
        sourceFormat: 'tave-api',
        targetFormat: 'wedsync-standard',
        fieldMappings: {
          'vendor_name': 'businessName',
          'contact_phone': 'phoneNumber',
          'contact_email': 'email',
          'services_offered': 'serviceCategories',
          'business_address': 'address'
        },
        validationRules: {
          'businessName': { required: true, minLength: 2 },
          'phoneNumber': { required: true, pattern: '^\\+?[1-9]\\d{1,14}$' },
          'email': { required: true, format: 'email' }
        },
        customTransformers: {}
      };

      await transformer.registerSchema(vendorSchema);
    });

    it('should transform vendor data from Tave format to WedSync standard', async () => {
      const taveData = {
        vendor_name: 'John\'s Photography',
        contact_phone: '+1234567890',
        contact_email: 'john@photography.com',
        services_offered: ['Wedding Photography', 'Portrait Photography'],
        business_address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001'
        }
      };

      const result = await transformer.transform(taveData, 'vendor-profile-v1');

      expect(result.success).toBe(true);
      expect(result.data.businessName).toBe('John\'s Photography');
      expect(result.data.phoneNumber).toBe('+1234567890');
      expect(result.data.email).toBe('john@photography.com');
      expect(result.data.serviceCategories).toEqual(['Wedding Photography', 'Portrait Photography']);
      expect(result.data.address).toEqual(taveData.business_address);
    });

    it('should handle missing optional fields gracefully', async () => {
      const partialData = {
        vendor_name: 'Minimal Vendor',
        contact_email: 'minimal@vendor.com'
      };

      const result = await transformer.transform(partialData, 'vendor-profile-v1');

      expect(result.success).toBe(true);
      expect(result.data.businessName).toBe('Minimal Vendor');
      expect(result.data.email).toBe('minimal@vendor.com');
      expect(result.data.phoneNumber).toBeUndefined();
    });

    it('should validate transformed data', async () => {
      const invalidData = {
        vendor_name: 'A', // Too short
        contact_phone: '123', // Invalid format
        contact_email: 'invalid-email'
      };

      const result = await transformer.transform(invalidData, 'vendor-profile-v1');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle nested object transformations', async () => {
      const weddingSchema = {
        schemaId: 'wedding-event-v1',
        name: 'Wedding Event Schema',
        version: '1.0.0',
        sourceFormat: 'external-api',
        targetFormat: 'wedsync-standard',
        fieldMappings: {
          'event_date': 'weddingDate',
          'bride_name': 'partner1.firstName',
          'groom_name': 'partner2.firstName',
          'venue_details': 'venue',
          'ceremony_time': 'ceremony.startTime',
          'reception_time': 'reception.startTime'
        },
        validationRules: {},
        customTransformers: {}
      };

      await transformer.registerSchema(weddingSchema);

      const externalWeddingData = {
        event_date: '2024-06-15',
        bride_name: 'Sarah',
        groom_name: 'Michael',
        venue_details: {
          name: 'Grand Ballroom',
          address: '456 Wedding Ave'
        },
        ceremony_time: '15:00',
        reception_time: '18:00'
      };

      const result = await transformer.transform(externalWeddingData, 'wedding-event-v1');

      expect(result.success).toBe(true);
      expect(result.data.weddingDate).toBe('2024-06-15');
      expect(result.data.partner1.firstName).toBe('Sarah');
      expect(result.data.partner2.firstName).toBe('Michael');
      expect(result.data.venue).toEqual(externalWeddingData.venue_details);
      expect(result.data.ceremony.startTime).toBe('15:00');
      expect(result.data.reception.startTime).toBe('18:00');
    });
  });

  describe('Custom Transformers', () => {
    beforeEach(async () => {
      // Register custom transformers
      await transformer.registerCustomTransformer('arrayToServiceCategories', (value: any) => {
        if (!Array.isArray(value)) return [];
        return value.map((item: string) => ({
          id: item.toLowerCase().replace(/\s+/g, '-'),
          name: item,
          category: item.includes('Photography') ? 'photography' : 'other'
        }));
      });

      await transformer.registerCustomTransformer('phoneNumberFormatter', (value: string) => {
        if (!value) return null;
        // Remove all non-digits and add formatting
        const digits = value.replace(/\D/g, '');
        if (digits.length === 10) {
          return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        return value; // Return original if not standard US format
      });

      await transformer.registerCustomTransformer('weddingDateParser', (value: string) => {
        const date = new Date(value);
        return {
          date: date.toISOString().split('T')[0],
          timestamp: date.getTime(),
          formatted: date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        };
      });
    });

    it('should apply custom transformer for service categories', async () => {
      const schema = {
        schemaId: 'vendor-with-custom-v1',
        name: 'Vendor with Custom Transform',
        version: '1.0.0',
        sourceFormat: 'external',
        targetFormat: 'wedsync-standard',
        fieldMappings: {
          'services': 'serviceCategories'
        },
        validationRules: {},
        customTransformers: {
          'services': 'arrayToServiceCategories'
        }
      };

      await transformer.registerSchema(schema);

      const data = {
        services: ['Wedding Photography', 'Portrait Photography', 'Event Planning']
      };

      const result = await transformer.transform(data, 'vendor-with-custom-v1');

      expect(result.success).toBe(true);
      expect(result.data.serviceCategories).toHaveLength(3);
      expect(result.data.serviceCategories[0]).toEqual({
        id: 'wedding-photography',
        name: 'Wedding Photography',
        category: 'photography'
      });
    });

    it('should chain multiple custom transformers', async () => {
      const schema = {
        schemaId: 'multi-transform-v1',
        name: 'Multi Transform Schema',
        version: '1.0.0',
        sourceFormat: 'external',
        targetFormat: 'wedsync-standard',
        fieldMappings: {
          'phone': 'phoneNumber',
          'wedding_date': 'eventDetails'
        },
        validationRules: {},
        customTransformers: {
          'phone': 'phoneNumberFormatter',
          'wedding_date': 'weddingDateParser'
        }
      };

      await transformer.registerSchema(schema);

      const data = {
        phone: '1234567890',
        wedding_date: '2024-06-15'
      };

      const result = await transformer.transform(data, 'multi-transform-v1');

      expect(result.success).toBe(true);
      expect(result.data.phoneNumber).toBe('(123) 456-7890');
      expect(result.data.eventDetails.date).toBe('2024-06-15');
      expect(result.data.eventDetails.formatted).toContain('June 15, 2024');
    });

    it('should handle custom transformer errors gracefully', async () => {
      await transformer.registerCustomTransformer('errorTransformer', () => {
        throw new Error('Custom transformer error');
      });

      const schema = {
        schemaId: 'error-test-v1',
        name: 'Error Test Schema',
        version: '1.0.0',
        sourceFormat: 'external',
        targetFormat: 'wedsync-standard',
        fieldMappings: {
          'test_field': 'output'
        },
        validationRules: {},
        customTransformers: {
          'test_field': 'errorTransformer'
        }
      };

      await transformer.registerSchema(schema);

      const data = { test_field: 'test value' };
      const result = await transformer.transform(data, 'error-test-v1');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Custom transformer error');
    });
  });

  describe('Wedding-Specific Transformations', () => {
    beforeEach(async () => {
      const weddingVendorSchema = {
        schemaId: 'wedding-vendor-v1',
        name: 'Wedding Vendor Schema',
        version: '1.0.0',
        sourceFormat: 'multi-platform',
        targetFormat: 'wedsync-wedding-standard',
        fieldMappings: {
          'business_name': 'businessName',
          'specialty': 'weddingSpecialty',
          'packages': 'weddingPackages',
          'availability': 'weddingAvailability',
          'portfolio': 'weddingPortfolio'
        },
        validationRules: {
          'businessName': { required: true },
          'weddingSpecialty': { required: true, enum: ['photography', 'catering', 'florist', 'venue', 'music', 'planning'] }
        },
        customTransformers: {}
      };

      await transformer.registerSchema(weddingVendorSchema);
    });

    it('should transform wedding vendor packages correctly', async () => {
      const vendorData = {
        business_name: 'Dream Weddings Photography',
        specialty: 'photography',
        packages: [
          {
            name: 'Essential Package',
            price: 2500,
            hours: 6,
            includes: ['Ceremony', 'Reception', 'Online Gallery']
          },
          {
            name: 'Premium Package', 
            price: 4000,
            hours: 10,
            includes: ['Engagement Session', 'Ceremony', 'Reception', 'Online Gallery', 'Photo Album']
          }
        ],
        availability: {
          saturdays_available: ['2024-07-20', '2024-08-10', '2024-09-14'],
          sundays_available: ['2024-07-21', '2024-08-11'],
          blackout_dates: ['2024-12-25', '2024-01-01']
        },
        portfolio: [
          { url: 'https://photos.com/wedding1.jpg', description: 'Beach Wedding' },
          { url: 'https://photos.com/wedding2.jpg', description: 'Garden Wedding' }
        ]
      };

      const result = await transformer.transform(vendorData, 'wedding-vendor-v1');

      expect(result.success).toBe(true);
      expect(result.data.businessName).toBe('Dream Weddings Photography');
      expect(result.data.weddingSpecialty).toBe('photography');
      expect(result.data.weddingPackages).toHaveLength(2);
      expect(result.data.weddingPackages[0].price).toBe(2500);
      expect(result.data.weddingAvailability.saturdays_available).toHaveLength(3);
      expect(result.data.weddingPortfolio).toHaveLength(2);
    });

    it('should validate wedding specialty categories', async () => {
      const invalidVendorData = {
        business_name: 'Invalid Vendor',
        specialty: 'invalid-category', // Not in enum
        packages: [],
        availability: {},
        portfolio: []
      };

      const result = await transformer.transform(invalidVendorData, 'wedding-vendor-v1');

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('weddingSpecialty'))).toBe(true);
    });

    it('should handle wedding date transformations', async () => {
      await transformer.registerCustomTransformer('weddingDateTransformer', (dates: string[]) => {
        return dates.map(dateStr => {
          const date = new Date(dateStr);
          return {
            date: dateStr,
            dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
            isWeekend: date.getDay() === 0 || date.getDay() === 6,
            season: getWeddingSeason(date.getMonth() + 1),
            pricing: getSeasonalPricing(date.getMonth() + 1)
          };
        });
      });

      function getWeddingSeason(month: number): string {
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        if (month >= 9 && month <= 11) return 'fall';
        return 'winter';
      }

      function getSeasonalPricing(month: number): 'peak' | 'standard' | 'off-season' {
        if (month >= 5 && month <= 10) return 'peak';
        if (month >= 3 && month <= 4 || month === 11) return 'standard';
        return 'off-season';
      }

      const dateSchema = {
        schemaId: 'wedding-dates-v1',
        name: 'Wedding Dates Schema',
        version: '1.0.0',
        sourceFormat: 'calendar-api',
        targetFormat: 'wedsync-wedding-calendar',
        fieldMappings: {
          'available_dates': 'weddingDates'
        },
        validationRules: {},
        customTransformers: {
          'available_dates': 'weddingDateTransformer'
        }
      };

      await transformer.registerSchema(dateSchema);

      const dateData = {
        available_dates: ['2024-06-15', '2024-12-31', '2024-03-20']
      };

      const result = await transformer.transform(dateData, 'wedding-dates-v1');

      expect(result.success).toBe(true);
      expect(result.data.weddingDates).toHaveLength(3);
      expect(result.data.weddingDates[0].season).toBe('summer');
      expect(result.data.weddingDates[0].pricing).toBe('peak');
      expect(result.data.weddingDates[1].season).toBe('winter');
      expect(result.data.weddingDates[1].pricing).toBe('off-season');
    });
  });

  describe('Platform-Specific Adapters', () => {
    it('should create platform adapter for Tave API', async () => {
      const taveAdapter = {
        adapterId: 'tave-adapter-v1',
        platformName: 'Tave',
        apiVersion: '2.0',
        authMethod: 'api-key',
        dataFormat: 'json',
        fieldMappings: {
          'client_name': 'clientName',
          'client_email': 'email',
          'event_date': 'weddingDate',
          'photographer_notes': 'notes'
        },
        rateLimiting: {
          requestsPerMinute: 60,
          burstLimit: 10
        }
      };

      const result = await transformer.registerPlatformAdapter(taveAdapter);
      expect(result.success).toBe(true);
      expect(result.adapterId).toBe('tave-adapter-v1');
    });

    it('should create platform adapter for HoneyBook API', async () => {
      const honeybookAdapter = {
        adapterId: 'honeybook-adapter-v1',
        platformName: 'HoneyBook',
        apiVersion: '1.0',
        authMethod: 'oauth2',
        dataFormat: 'json',
        fieldMappings: {
          'contact.first_name': 'firstName',
          'contact.last_name': 'lastName',
          'contact.email_address': 'email',
          'project.event_date': 'weddingDate',
          'project.budget': 'budget'
        },
        rateLimiting: {
          requestsPerMinute: 120,
          burstLimit: 20
        }
      };

      const result = await transformer.registerPlatformAdapter(honeybookAdapter);
      expect(result.success).toBe(true);
    });

    it('should apply platform-specific transformations', async () => {
      const honeybookData = {
        'contact.first_name': 'Emma',
        'contact.last_name': 'Johnson',
        'contact.email_address': 'emma@example.com',
        'project.event_date': '2024-07-20T16:00:00Z',
        'project.budget': '$15000'
      };

      const result = await transformer.transformFromPlatform(honeybookData, 'honeybook-adapter-v1');

      expect(result.success).toBe(true);
      expect(result.data.firstName).toBe('Emma');
      expect(result.data.lastName).toBe('Johnson');
      expect(result.data.email).toBe('emma@example.com');
      expect(result.data.weddingDate).toBe('2024-07-20T16:00:00Z');
      expect(result.data.budget).toBe('$15000');
    });
  });

  describe('Batch Transformations', () => {
    it('should transform multiple records in batch', async () => {
      const vendorRecords = [
        {
          vendor_name: 'Photo Studio A',
          contact_email: 'studioa@example.com',
          services_offered: ['Wedding Photography']
        },
        {
          vendor_name: 'Catering Co B',
          contact_email: 'cateringb@example.com',
          services_offered: ['Wedding Catering']
        },
        {
          vendor_name: 'Flower Shop C',
          contact_email: 'flowersc@example.com',
          services_offered: ['Wedding Florals']
        }
      ];

      const result = await transformer.transformBatch(vendorRecords, 'vendor-profile-v1');

      expect(result.success).toBe(true);
      expect(result.transformed).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.transformed[0].businessName).toBe('Photo Studio A');
    });

    it('should handle partial failures in batch transformation', async () => {
      const mixedRecords = [
        {
          vendor_name: 'Valid Vendor',
          contact_email: 'valid@example.com'
        },
        {
          vendor_name: '', // Invalid - empty name
          contact_email: 'invalid-email' // Invalid format
        },
        {
          vendor_name: 'Another Valid Vendor',
          contact_email: 'valid2@example.com'
        }
      ];

      const result = await transformer.transformBatch(mixedRecords, 'vendor-profile-v1');

      expect(result.transformed).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].index).toBe(1);
      expect(result.failed[0].errors).toBeDefined();
    });

    it('should provide progress tracking for large batches', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        vendor_name: `Vendor ${i}`,
        contact_email: `vendor${i}@example.com`
      }));

      const progressCallback = vi.fn();
      const result = await transformer.transformBatch(
        largeDataset, 
        'vendor-profile-v1',
        { 
          batchSize: 10,
          onProgress: progressCallback
        }
      );

      expect(result.success).toBe(true);
      expect(result.transformed).toHaveLength(100);
      expect(progressCallback).toHaveBeenCalledWith(expect.objectContaining({
        completed: expect.any(Number),
        total: 100,
        percentage: expect.any(Number)
      }));
    });
  });

  describe('Performance and Caching', () => {
    it('should cache transformation schemas', async () => {
      const start = Date.now();
      await transformer.getSchema('vendor-profile-v1');
      const firstCallTime = Date.now() - start;

      const start2 = Date.now();
      await transformer.getSchema('vendor-profile-v1');
      const secondCallTime = Date.now() - start2;

      expect(secondCallTime).toBeLessThan(firstCallTime); // Should be faster due to caching
    });

    it('should handle concurrent transformations', async () => {
      const data = {
        vendor_name: 'Concurrent Test Vendor',
        contact_email: 'concurrent@example.com'
      };

      const promises = Array.from({ length: 10 }, () => 
        transformer.transform(data, 'vendor-profile-v1')
      );

      const results = await Promise.all(promises);

      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.data.businessName === 'Concurrent Test Vendor')).toBe(true);
    });

    it('should implement timeout for long-running transformations', async () => {
      await transformer.registerCustomTransformer('slowTransformer', async (value: any) => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        return value;
      });

      const slowSchema = {
        schemaId: 'slow-schema-v1',
        name: 'Slow Schema',
        version: '1.0.0',
        sourceFormat: 'external',
        targetFormat: 'wedsync-standard',
        fieldMappings: { 'test': 'output' },
        validationRules: {},
        customTransformers: { 'test': 'slowTransformer' }
      };

      await transformer.registerSchema(slowSchema);

      const data = { test: 'value' };
      const result = await transformer.transform(data, 'slow-schema-v1', { timeout: 1000 });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('timeout');
    });
  });
});