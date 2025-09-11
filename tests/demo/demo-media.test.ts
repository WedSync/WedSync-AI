/**
 * Demo Media Asset System Tests
 * Critical tests for logo, photo, and document generation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { demoMediaService } from '@/lib/services/demo-media-service';
import type { MediaAssetConfig, CoupleAssetConfig } from '@/lib/services/demo-media-service';

// Mock Supabase
const mockSupabase = {
  storage: {
    createBucket: jest.fn(),
    getBucket: jest.fn(),
    from: jest.fn(() => ({
      upload: jest.fn(),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://test-url.com/asset.svg' } })),
      list: jest.fn(),
      remove: jest.fn()
    }))
  },
  rpc: jest.fn()
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase
}));

describe('Demo Media Asset System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful storage operations
    mockSupabase.storage.getBucket.mockResolvedValue({ data: { id: 'test-bucket' } });
    mockSupabase.storage.from().upload.mockResolvedValue({ data: { path: 'test/path' }, error: null });
    mockSupabase.storage.from().list.mockResolvedValue({ data: [], error: null });
    mockSupabase.storage.from().remove.mockResolvedValue({ error: null });
    mockSupabase.rpc.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initializeStorageBuckets', () => {
    it('should create all required storage buckets', async () => {
      mockSupabase.storage.getBucket.mockResolvedValue({ data: null });
      mockSupabase.storage.createBucket = jest.fn().mockResolvedValue({ error: null });
      
      await demoMediaService.initializeStorageBuckets();
      
      expect(mockSupabase.storage.createBucket).toHaveBeenCalledWith(
        'demo-logos',
        expect.objectContaining({
          public: true,
          allowedMimeTypes: expect.arrayContaining(['image/svg+xml', 'image/png']),
          fileSizeLimit: 2097152 // 2MB
        })
      );
      
      expect(mockSupabase.storage.createBucket).toHaveBeenCalledWith(
        'demo-profiles',
        expect.objectContaining({
          public: true,
          allowedMimeTypes: expect.arrayContaining(['image/jpeg', 'image/png']),
          fileSizeLimit: 2097152 // 2MB
        })
      );
      
      expect(mockSupabase.storage.createBucket).toHaveBeenCalledWith(
        'demo-documents',
        expect.objectContaining({
          public: true,
          allowedMimeTypes: expect.arrayContaining(['application/pdf', 'image/jpeg', 'image/png']),
          fileSizeLimit: 10485760 // 10MB
        })
      );
    });

    it('should skip creation if buckets already exist', async () => {
      mockSupabase.storage.getBucket.mockResolvedValue({ data: { id: 'existing-bucket' } });
      mockSupabase.storage.createBucket = jest.fn();
      
      await demoMediaService.initializeStorageBuckets();
      
      expect(mockSupabase.storage.createBucket).not.toHaveBeenCalled();
    });

    it('should handle bucket creation errors gracefully', async () => {
      mockSupabase.storage.getBucket.mockResolvedValue({ data: null });
      mockSupabase.storage.createBucket = jest.fn().mockResolvedValue({ 
        error: { message: 'Bucket creation failed' } 
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await demoMediaService.initializeStorageBuckets();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create bucket'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('generateSupplierLogo', () => {
    const mockConfig: MediaAssetConfig = {
      supplierId: 'supplier_1',
      supplierType: 'photographer',
      businessName: 'Sky Lens Studios',
      style: 'modern'
    };

    it('should generate SVG logo for photographer', async () => {
      const result = await demoMediaService.generateSupplierLogo(mockConfig);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe('logo');
      expect(result.url).toBe('https://test-url.com/asset.svg');
      expect(result.filePath).toBe('supplier_1/logo.svg');
      expect(result.metadata.format).toBe('svg');
      expect(result.metadata.dimensions).toBe('400x100');
      expect(result.metadata.size).toBeGreaterThan(0);
    });

    it('should generate different logos for different supplier types', async () => {
      const supplierTypes = ['photographer', 'videographer', 'venue', 'florist', 'dj', 'caterer', 'planner'] as const;
      
      for (const supplierType of supplierTypes) {
        const config: MediaAssetConfig = {
          supplierId: `supplier_${supplierType}`,
          supplierType,
          businessName: `Test ${supplierType}`,
          style: 'modern'
        };
        
        const result = await demoMediaService.generateSupplierLogo(config);
        
        expect(result.type).toBe('logo');
        expect(result.filePath).toContain(supplierType);
      }
    });

    it('should apply different styles correctly', async () => {
      const styles = ['modern', 'classic', 'elegant', 'minimalist'] as const;
      
      for (const style of styles) {
        const config: MediaAssetConfig = {
          ...mockConfig,
          style
        };
        
        const result = await demoMediaService.generateSupplierLogo(config);
        
        expect(result.type).toBe('logo');
        expect(result.metadata.format).toBe('svg');
      }
    });

    it('should handle upload failures gracefully', async () => {
      mockSupabase.storage.from().upload.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Upload failed' } 
      });
      
      await expect(demoMediaService.generateSupplierLogo(mockConfig))
        .rejects.toThrow('Failed to upload logo: Upload failed');
    });

    it('should generate valid SVG content', async () => {
      const uploadMock = mockSupabase.storage.from().upload;
      
      await demoMediaService.generateSupplierLogo(mockConfig);
      
      expect(uploadMock).toHaveBeenCalled();
      const uploadCall = uploadMock.mock.calls[0];
      const uploadedBlob = uploadCall[1] as Blob;
      
      expect(uploadedBlob.type).toBe('image/svg+xml');
      expect(uploadedBlob.size).toBeGreaterThan(0);
      
      // Verify SVG content structure
      const svgContent = await uploadedBlob.text();
      expect(svgContent).toContain('<svg');
      expect(svgContent).toContain('Sky Lens Studios');
      expect(svgContent).toContain('SLS'); // Initials
      expect(svgContent).toContain('</svg>');
    });
  });

  describe('generateCouplePhoto', () => {
    const mockConfig: CoupleAssetConfig = {
      coupleId: 'couple_1',
      firstName: 'Emily',
      lastName: 'Harper',
      partnerName: 'Jack'
    };

    it('should generate couple profile photo', async () => {
      const result = await demoMediaService.generateCouplePhoto(mockConfig);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe('profile_photo');
      expect(result.url).toBe('https://test-url.com/asset.svg');
      expect(result.filePath).toBe('couple_1/profile.svg');
      expect(result.metadata.format).toBe('svg');
      expect(result.metadata.dimensions).toBe('400x400');
    });

    it('should include couple names in generated avatar', async () => {
      const uploadMock = mockSupabase.storage.from().upload;
      
      await demoMediaService.generateCouplePhoto(mockConfig);
      
      const uploadCall = uploadMock.mock.calls[0];
      const uploadedBlob = uploadCall[1] as Blob;
      const svgContent = await uploadedBlob.text();
      
      expect(svgContent).toContain('Emily & Jack');
      expect(svgContent).toContain('E'); // First name initial
      expect(svgContent).toContain('J'); // Partner initial
    });

    it('should handle different couple names', async () => {
      const configs = [
        { coupleId: 'couple_1', firstName: 'Alice', lastName: 'Smith', partnerName: 'Bob' },
        { coupleId: 'couple_2', firstName: 'Carol', lastName: 'Jones', partnerName: 'Dave' },
        { coupleId: 'couple_3', firstName: 'Eve', lastName: 'Brown', partnerName: 'Frank' }
      ];
      
      for (const config of configs) {
        const result = await demoMediaService.generateCouplePhoto(config);
        
        expect(result.type).toBe('profile_photo');
        expect(result.filePath).toBe(`${config.coupleId}/profile.svg`);
      }
    });

    it('should generate unique colors based on names', async () => {
      const uploadMock = mockSupabase.storage.from().upload;
      
      // Generate two different couple photos
      await demoMediaService.generateCouplePhoto(mockConfig);
      await demoMediaService.generateCouplePhoto({
        coupleId: 'couple_2',
        firstName: 'Sophia',
        lastName: 'Bennett', 
        partnerName: 'Liam'
      });
      
      expect(uploadMock).toHaveBeenCalledTimes(2);
      
      // Get both SVG contents
      const svg1 = await (uploadMock.mock.calls[0][1] as Blob).text();
      const svg2 = await (uploadMock.mock.calls[1][1] as Blob).text();
      
      // Colors should be different (based on name length hashing)
      expect(svg1).not.toBe(svg2);
    });
  });

  describe('generateDocumentTemplates', () => {
    const mockConfig: MediaAssetConfig = {
      supplierId: 'supplier_1',
      supplierType: 'photographer',
      businessName: 'Sky Lens Studios',
      style: 'modern'
    };

    it('should generate all 5 document templates', async () => {
      const results = await demoMediaService.generateDocumentTemplates(mockConfig);
      
      expect(results).toHaveLength(5);
      
      const templateTypes = results.map(r => 
        r.filePath.split('/')[1].replace('.html', '')
      );
      
      expect(templateTypes).toContain('welcome-guide');
      expect(templateTypes).toContain('pricing-sheet');
      expect(templateTypes).toContain('questionnaire');
      expect(templateTypes).toContain('contract');
      expect(templateTypes).toContain('portfolio-sample');
    });

    it('should generate HTML documents with proper content', async () => {
      const uploadMock = mockSupabase.storage.from().upload;
      
      await demoMediaService.generateDocumentTemplates(mockConfig);
      
      expect(uploadMock).toHaveBeenCalledTimes(5);
      
      // Check each uploaded document
      for (let i = 0; i < 5; i++) {
        const uploadCall = uploadMock.mock.calls[i];
        const uploadedBlob = uploadCall[1] as Blob;
        const htmlContent = await uploadedBlob.text();
        
        expect(uploadedBlob.type).toBe('text/html');
        expect(htmlContent).toContain('<!DOCTYPE html>');
        expect(htmlContent).toContain('Sky Lens Studios');
        expect(htmlContent).toContain('</html>');
      }
    });

    it('should customize content for different supplier types', async () => {
      const configs = [
        { ...mockConfig, supplierType: 'photographer' as const, businessName: 'Test Photography' },
        { ...mockConfig, supplierType: 'venue' as const, businessName: 'Test Venue' },
        { ...mockConfig, supplierType: 'caterer' as const, businessName: 'Test Catering' }
      ];
      
      for (const config of configs) {
        const results = await demoMediaService.generateDocumentTemplates(config);
        
        expect(results).toHaveLength(5);
        results.forEach(result => {
          expect(result.type).toBe('document_template');
        });
      }
    });

    it('should handle partial upload failures gracefully', async () => {
      // Mock first upload to succeed, second to fail
      mockSupabase.storage.from().upload
        .mockResolvedValueOnce({ data: { path: 'test/path' }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Upload failed' } })
        .mockResolvedValue({ data: { path: 'test/path' }, error: null });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const results = await demoMediaService.generateDocumentTemplates(mockConfig);
      
      // Should return only successful uploads (4 out of 5)
      expect(results).toHaveLength(4);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('generateDemoAssets', () => {
    it('should generate all assets for all demo accounts', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      await demoMediaService.generateDemoAssets();
      
      // Should call upload multiple times for all suppliers and couples
      const uploadMock = mockSupabase.storage.from().upload;
      
      // 7 suppliers × 6 assets (1 logo + 5 docs) + 2 couples × 1 photo = 44 uploads
      expect(uploadMock.mock.calls.length).toBeGreaterThan(40);
      
      consoleSpy.mockRestore();
    });

    it('should initialize storage buckets before generating assets', async () => {
      mockSupabase.storage.getBucket.mockResolvedValue({ data: null });
      mockSupabase.storage.createBucket = jest.fn().mockResolvedValue({ error: null });
      
      await demoMediaService.generateDemoAssets();
      
      expect(mockSupabase.storage.createBucket).toHaveBeenCalledTimes(3);
    });

    it('should handle errors gracefully and continue processing', async () => {
      // Mock some uploads to fail
      mockSupabase.storage.from().upload
        .mockResolvedValueOnce({ data: null, error: { message: 'Upload failed' } })
        .mockResolvedValue({ data: { path: 'test/path' }, error: null });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await demoMediaService.generateDemoAssets();
      
      // Should continue despite errors
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('cleanupDemoAssets', () => {
    it('should remove all files from demo buckets', async () => {
      const mockFiles = [
        { name: 'supplier_1/logo.svg' },
        { name: 'couple_1/profile.svg' },
        { name: 'supplier_1/welcome-guide.html' }
      ];
      
      mockSupabase.storage.from().list.mockResolvedValue({ 
        data: mockFiles, 
        error: null 
      });
      
      await demoMediaService.cleanupDemoAssets();
      
      expect(mockSupabase.storage.from().remove).toHaveBeenCalledWith([
        'supplier_1/logo.svg',
        'couple_1/profile.svg', 
        'supplier_1/welcome-guide.html'
      ]);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockSupabase.storage.from().list.mockResolvedValue({ 
        data: null, 
        error: { message: 'List failed' } 
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      await demoMediaService.cleanupDemoAssets();
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle empty buckets', async () => {
      mockSupabase.storage.from().list.mockResolvedValue({ 
        data: [], 
        error: null 
      });
      
      await demoMediaService.cleanupDemoAssets();
      
      expect(mockSupabase.storage.from().remove).not.toHaveBeenCalled();
    });
  });

  describe('getAssetUrl', () => {
    it('should generate public URL for logo assets', async () => {
      const url = await demoMediaService.getAssetUrl('logo', 'supplier_1', 'logo.svg');
      
      expect(url).toBe('https://test-url.com/asset.svg');
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('demo-logos');
    });

    it('should generate public URL for profile assets', async () => {
      const url = await demoMediaService.getAssetUrl('profile', 'couple_1', 'profile.svg');
      
      expect(url).toBe('https://test-url.com/asset.svg');
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('demo-profiles');
    });

    it('should generate public URL for document assets', async () => {
      const url = await demoMediaService.getAssetUrl('document', 'supplier_1', 'welcome-guide.html');
      
      expect(url).toBe('https://test-url.com/asset.svg');
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('demo-documents');
    });

    it('should handle errors and return null', async () => {
      mockSupabase.storage.from().getPublicUrl.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const url = await demoMediaService.getAssetUrl('logo', 'supplier_1', 'logo.svg');
      
      expect(url).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Tests', () => {
    it('should generate logo quickly (< 1 second)', async () => {
      const config: MediaAssetConfig = {
        supplierId: 'supplier_1',
        supplierType: 'photographer',
        businessName: 'Sky Lens Studios',
        style: 'modern'
      };
      
      const startTime = Date.now();
      await demoMediaService.generateSupplierLogo(config);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000);
    });

    it('should generate couple photo quickly (< 1 second)', async () => {
      const config: CoupleAssetConfig = {
        coupleId: 'couple_1',
        firstName: 'Emily',
        lastName: 'Harper',
        partnerName: 'Jack'
      };
      
      const startTime = Date.now();
      await demoMediaService.generateCouplePhoto(config);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000);
    });

    it('should generate all demo assets within time limit (< 5 minutes)', async () => {
      const startTime = Date.now();
      await demoMediaService.generateDemoAssets();
      const duration = Date.now() - startTime;
      
      // Should complete within 5 minutes (300,000 ms)
      expect(duration).toBeLessThan(300000);
    }, 300000); // Set test timeout to 5 minutes
  });

  describe('Content Validation', () => {
    it('should generate realistic pricing for different supplier types', async () => {
      const uploadMock = mockSupabase.storage.from().upload;
      
      const photographerConfig: MediaAssetConfig = {
        supplierId: 'supplier_1',
        supplierType: 'photographer',
        businessName: 'Test Photography',
        style: 'modern'
      };
      
      await demoMediaService.generateDocumentTemplates(photographerConfig);
      
      // Find pricing sheet upload
      const pricingUploadCall = uploadMock.mock.calls.find(call => 
        call[0].includes('pricing-sheet')
      );
      
      expect(pricingUploadCall).toBeDefined();
      
      if (pricingUploadCall) {
        const pricingBlob = pricingUploadCall[1] as Blob;
        const pricingContent = await pricingBlob.text();
        
        expect(pricingContent).toContain('£'); // UK pricing
        expect(pricingContent).toContain('Package'); // Package structure
        expect(pricingContent).toContain('hours'); // Typical photography terms
      }
    });

    it('should generate appropriate questionnaires for each supplier type', async () => {
      const supplierTypes = ['photographer', 'venue', 'caterer'] as const;
      
      for (const supplierType of supplierTypes) {
        const uploadMock = mockSupabase.storage.from().upload;
        uploadMock.mockClear();
        
        const config: MediaAssetConfig = {
          supplierId: `supplier_${supplierType}`,
          supplierType,
          businessName: `Test ${supplierType}`,
          style: 'modern'
        };
        
        await demoMediaService.generateDocumentTemplates(config);
        
        // Find questionnaire upload
        const questionnaireCall = uploadMock.mock.calls.find(call =>
          call[0].includes('questionnaire')
        );
        
        expect(questionnaireCall).toBeDefined();
        
        if (questionnaireCall) {
          const questionnaireBlob = questionnaireCall[1] as Blob;
          const content = await questionnaireBlob.text();
          
          // Should contain supplier-type specific questions
          switch (supplierType) {
            case 'photographer':
              expect(content).toContain('photography');
              break;
            case 'venue':
              expect(content).toContain('guests');
              expect(content).toContain('spaces');
              break;
            case 'caterer':
              expect(content).toContain('dietary');
              expect(content).toContain('meal');
              break;
          }
        }
      }
    });
  });
});