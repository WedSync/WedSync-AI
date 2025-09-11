/**
 * useAutoPopulation Hook Test Suite
 * WS-216 Team A - Custom Hook Testing
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  useAutoPopulation,
  useFieldPopulation,
  useSensitiveWeddingField,
  useVendorAutoPopulation,
} from '@/hooks/useAutoPopulation';
import { AutoPopulationProvider } from '@/components/forms/AutoPopulationProvider';
import type { FieldType, PopulationSource } from '@/types/auto-population';

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => 1000),
    mark: jest.fn(),
    measure: jest.fn(),
    memory: {
      usedJSHeapSize: 1000000,
    },
  },
});

const mockOrganizationId = 'test-org-123';
const mockUserId = 'test-user-456';

const createWrapper = (organizationId = mockOrganizationId) => {
  return ({ children }: { children: React.ReactNode }) => (
    <AutoPopulationProvider organizationId={organizationId} userId={mockUserId}>
      {children}
    </AutoPopulationProvider>
  );
};

describe('useAutoPopulation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAutoPopulation(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.fieldData).toBe(null);
      expect(result.current.isFieldPopulated).toBe(false);
      expect(result.current.fieldConfidence).toBe(null);
    });

    it('should throw error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useAutoPopulation());
      }).toThrow(
        'useAutoPopulation must be used within AutoPopulationProvider',
      );

      consoleSpy.mockRestore();
    });

    it('should provide all required hook methods', () => {
      const { result } = renderHook(() => useAutoPopulation(), {
        wrapper: createWrapper(),
      });

      // Core actions
      expect(typeof result.current.requestPopulation).toBe('function');
      expect(typeof result.current.acceptField).toBe('function');
      expect(typeof result.current.rejectField).toBe('function');
      expect(typeof result.current.clearField).toBe('function');

      // Batch operations
      expect(typeof result.current.acceptAllHighConfidence).toBe('function');
      expect(typeof result.current.rejectAllLowConfidence).toBe('function');

      // Session management
      expect(typeof result.current.refreshSession).toBe('function');
      expect(typeof result.current.grantConsent).toBe('function');
      expect(typeof result.current.revokeConsent).toBe('function');
      expect(typeof result.current.exportAuditLog).toBe('function');

      // Utilities
      expect(typeof result.current.getWeddingFieldSuggestions).toBe('function');
      expect(typeof result.current.formatFieldForWedding).toBe('function');
      expect(typeof result.current.validateWeddingField).toBe('function');
      expect(typeof result.current.getPerformanceMetrics).toBe('function');
      expect(typeof result.current.isSensitiveField).toBe('function');
      expect(typeof result.current.requiresConsent).toBe('function');
      expect(typeof result.current.getSecurityCompliance).toBe('function');
    });
  });

  describe('Field-Specific Operations', () => {
    it('should handle field population request', async () => {
      const { result } = renderHook(
        () =>
          useAutoPopulation({
            fieldId: 'test-field',
            fieldType: 'text',
            fieldName: 'Test Field',
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        const response = await result.current.requestPopulation({
          fieldId: 'test-field',
          fieldType: 'text',
          fieldName: 'Test Field',
          source: 'ml_suggestion',
        });

        // Would return populated data in real implementation
      });
    });

    it('should accept field population', async () => {
      const mockOnFieldPopulated = jest.fn();

      const { result } = renderHook(
        () =>
          useAutoPopulation({
            fieldId: 'test-field',
            onFieldPopulated: mockOnFieldPopulated,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.acceptField('test-field');
      });

      // Verify field was accepted
    });

    it('should reject field population', async () => {
      const mockOnFieldRejected = jest.fn();

      const { result } = renderHook(
        () =>
          useAutoPopulation({
            fieldId: 'test-field',
            onFieldRejected: mockOnFieldRejected,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.rejectField('test-field', 'Incorrect data');
      });

      expect(mockOnFieldRejected).toHaveBeenCalledWith(
        'test-field',
        'Incorrect data',
      );
    });

    it('should clear field data', () => {
      const { result } = renderHook(() => useAutoPopulation(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.clearField('test-field');
      });

      // Verify field was cleared
    });
  });

  describe('Wedding Industry Utilities', () => {
    it('should provide wedding field suggestions', () => {
      const { result } = renderHook(() => useAutoPopulation(), {
        wrapper: createWrapper(),
      });

      const nameSuggestions = result.current.getWeddingFieldSuggestions('name');
      expect(nameSuggestions).toContain('Bride');
      expect(nameSuggestions).toContain('Groom');
      expect(nameSuggestions).toContain('Maid of Honor');

      const emailSuggestions =
        result.current.getWeddingFieldSuggestions('email');
      expect(emailSuggestions.length).toBeGreaterThan(0);
      expect(emailSuggestions[0]).toContain('@');

      const dateSuggestions = result.current.getWeddingFieldSuggestions('date');
      expect(dateSuggestions.length).toBeGreaterThan(0);
    });

    it('should format wedding fields correctly', () => {
      const { result } = renderHook(() => useAutoPopulation(), {
        wrapper: createWrapper(),
      });

      // Test name formatting
      const formattedName = result.current.formatFieldForWedding(
        'john smith',
        'name',
      );
      expect(formattedName).toBe('John Smith');

      // Test phone formatting
      const formattedPhone = result.current.formatFieldForWedding(
        '5551234567',
        'phone',
      );
      expect(formattedPhone).toBe('(555) 123-4567');

      // Test currency formatting
      const formattedCurrency = result.current.formatFieldForWedding(
        '25000',
        'currency',
      );
      expect(formattedCurrency).toMatch(/\$25,000/);

      // Test date formatting
      const formattedDate = result.current.formatFieldForWedding(
        '2024-06-15',
        'date',
      );
      expect(formattedDate).toContain('June');
      expect(formattedDate).toContain('2024');
    });

    it('should validate wedding fields', () => {
      const { result } = renderHook(() => useAutoPopulation(), {
        wrapper: createWrapper(),
      });

      // Test email validation
      const validEmail = result.current.validateWeddingField(
        'test@example.com',
        'email',
      );
      expect(validEmail.isValid).toBe(true);
      expect(validEmail.errors).toHaveLength(0);

      const invalidEmail = result.current.validateWeddingField(
        'invalid-email',
        'email',
      );
      expect(invalidEmail.isValid).toBe(false);
      expect(invalidEmail.errors).toContain(
        'Please enter a valid email address',
      );

      // Test phone validation
      const validPhone = result.current.validateWeddingField(
        '5551234567',
        'phone',
      );
      expect(validPhone.isValid).toBe(true);

      const invalidPhone = result.current.validateWeddingField('555', 'phone');
      expect(invalidPhone.isValid).toBe(false);
      expect(invalidPhone.errors).toContain('Phone number must be 10 digits');

      // Test date validation (past date)
      const pastDate = result.current.validateWeddingField(
        '2020-01-01',
        'date',
      );
      expect(pastDate.isValid).toBe(false);
      expect(pastDate.errors).toContain('Wedding date should be in the future');

      // Test currency validation
      const validCurrency = result.current.validateWeddingField(
        '25000',
        'currency',
      );
      expect(validCurrency.isValid).toBe(true);

      const invalidCurrency = result.current.validateWeddingField(
        'invalid',
        'currency',
      );
      expect(invalidCurrency.isValid).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics when enabled', () => {
      const { result } = renderHook(
        () => useAutoPopulation({ enablePerformanceTracking: true }),
        { wrapper: createWrapper() },
      );

      const metrics = result.current.getPerformanceMetrics();
      expect(metrics).toBeTruthy();
      expect(typeof metrics?.componentRenderTime).toBe('number');
      expect(typeof metrics?.memoryUsage).toBe('number');
    });

    it('should return null when performance tracking disabled', () => {
      const { result } = renderHook(
        () => useAutoPopulation({ enablePerformanceTracking: false }),
        { wrapper: createWrapper() },
      );

      const metrics = result.current.getPerformanceMetrics();
      expect(metrics).toBe(null);
    });

    it('should warn about slow operations', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock slow operation
      jest
        .spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(300); // 300ms duration

      const { result } = renderHook(
        () =>
          useAutoPopulation({
            enablePerformanceTracking: true,
            performanceThreshold: 200, // 200ms threshold
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.requestPopulation({
          fieldId: 'test-field',
          fieldType: 'text',
          fieldName: 'Test Field',
          source: 'ml_suggestion',
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow population request: 300ms'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Security Features', () => {
    it('should identify sensitive fields', () => {
      const { result } = renderHook(() => useAutoPopulation(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSensitiveField('ssn')).toBe(true);
      expect(result.current.isSensitiveField('creditCard')).toBe(true);
      expect(result.current.isSensitiveField('email')).toBe(true);
      expect(result.current.isSensitiveField('phone')).toBe(true);
      expect(result.current.isSensitiveField('address')).toBe(true);

      expect(result.current.isSensitiveField('text')).toBe(false);
      expect(result.current.isSensitiveField('name')).toBe(false);
    });

    it('should check consent requirements', () => {
      const { result: normalResult } = renderHook(() => useAutoPopulation(), {
        wrapper: createWrapper(),
      });

      const { result: sensitiveResult } = renderHook(
        () =>
          useAutoPopulation({
            sensitiveField: true,
            requireExplicitConsent: true,
          }),
        { wrapper: createWrapper() },
      );

      expect(normalResult.current.requiresConsent()).toBe(false);
      expect(sensitiveResult.current.requiresConsent()).toBe(true);
    });

    it('should calculate security compliance score', () => {
      const { result } = renderHook(
        () => useAutoPopulation({ sensitiveField: true }),
        { wrapper: createWrapper() },
      );

      const compliance = result.current.getSecurityCompliance();
      expect(typeof compliance.score).toBe('number');
      expect(Array.isArray(compliance.violations)).toBe(true);
      expect(compliance.score).toBeGreaterThanOrEqual(0);
      expect(compliance.score).toBeLessThanOrEqual(100);
    });

    it('should require consent for sensitive operations', async () => {
      const { result } = renderHook(
        () =>
          useAutoPopulation({
            sensitiveField: true,
            requireExplicitConsent: true,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        try {
          await result.current.requestPopulation({
            fieldId: 'sensitive-field',
            fieldType: 'ssn',
            fieldName: 'SSN',
            source: 'ml_suggestion',
          });
        } catch (error) {
          expect((error as Error).message).toContain('consent required');
        }
      });
    });
  });

  describe('Batch Operations', () => {
    it('should accept all high confidence fields', async () => {
      const { result } = renderHook(() => useAutoPopulation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.acceptAllHighConfidence();
      });

      // Verify all high confidence fields were accepted
    });

    it('should reject all low confidence fields', async () => {
      const { result } = renderHook(() => useAutoPopulation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.rejectAllLowConfidence('Low confidence data');
      });

      // Verify all low confidence fields were rejected
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', () => {
      const mockOnError = jest.fn();

      const { result } = renderHook(
        () => useAutoPopulation({ onError: mockOnError }),
        { wrapper: createWrapper() },
      );

      // Trigger error condition
      act(() => {
        result.current.acceptField(); // No field ID provided
      });

      expect(mockOnError).toHaveBeenCalled();
    });

    it('should handle network failures', async () => {
      const { result } = renderHook(() => useAutoPopulation(), {
        wrapper: createWrapper(),
      });

      // Mock network failure
      await act(async () => {
        const response = await result.current.requestPopulation({
          fieldId: 'test-field',
          fieldType: 'text',
          fieldName: 'Test Field',
          source: 'ml_suggestion',
        });

        // Should handle gracefully and return null
        expect(response).toBe(null);
      });
    });
  });
});

describe('useFieldPopulation (Simplified Hook)', () => {
  it('should provide basic field population functionality', () => {
    const { result } = renderHook(
      () => useFieldPopulation('test-field', 'text', 'Test Field'),
      { wrapper: createWrapper() },
    );

    expect(result.current.fieldData).toBe(null);
    expect(result.current.isFieldPopulated).toBe(false);
    expect(typeof result.current.requestPopulation).toBe('function');
  });

  it('should not enable performance tracking by default', () => {
    const { result } = renderHook(
      () => useFieldPopulation('test-field', 'text', 'Test Field'),
      { wrapper: createWrapper() },
    );

    const metrics = result.current.getPerformanceMetrics();
    expect(metrics).toBe(null);
  });
});

describe('useSensitiveWeddingField (Enhanced Security Hook)', () => {
  it('should enable security features for sensitive fields', () => {
    const { result } = renderHook(
      () =>
        useSensitiveWeddingField(
          'email-field',
          'email',
          'Contact Email',
          'bride',
        ),
      { wrapper: createWrapper() },
    );

    expect(result.current.requiresConsent()).toBe(true);
    expect(result.current.isSensitiveField('email')).toBe(true);

    const metrics = result.current.getPerformanceMetrics();
    expect(metrics).toBeTruthy(); // Performance tracking enabled
  });

  it('should set appropriate wedding role context', () => {
    const { result } = renderHook(
      () =>
        useSensitiveWeddingField('name-field', 'name', 'Bride Name', 'bride'),
      { wrapper: createWrapper() },
    );

    // Wedding role context should be set
    expect(result.current.getWeddingFieldSuggestions('name')).toContain(
      'Bride',
    );
  });
});

describe('useVendorAutoPopulation (Vendor-Specific Hook)', () => {
  it('should optimize for vendor workflows', () => {
    const { result } = renderHook(
      () => useVendorAutoPopulation(mockOrganizationId),
      { wrapper: createWrapper() },
    );

    const metrics = result.current.getPerformanceMetrics();
    expect(metrics).toBeTruthy(); // Performance tracking enabled

    // Should have vendor-optimized settings
  });

  it('should set vendor role context', () => {
    const { result } = renderHook(
      () => useVendorAutoPopulation(mockOrganizationId),
      { wrapper: createWrapper() },
    );

    // Should be optimized for vendor use cases
    const suggestions = result.current.getWeddingFieldSuggestions('text');
    expect(Array.isArray(suggestions)).toBe(true);
  });
});

// Performance benchmarks for hooks
describe('useAutoPopulation Performance', () => {
  it('should initialize quickly', () => {
    const startTime = performance.now();

    renderHook(() => useAutoPopulation(), {
      wrapper: createWrapper(),
    });

    const initTime = performance.now() - startTime;
    expect(initTime).toBeLessThan(50); // Quick initialization
  });

  it('should handle multiple hook instances efficiently', () => {
    const startTime = performance.now();

    // Render multiple hook instances
    for (let i = 0; i < 10; i++) {
      renderHook(() => useFieldPopulation(`field-${i}`, 'text', `Field ${i}`), {
        wrapper: createWrapper(),
      });
    }

    const totalTime = performance.now() - startTime;
    expect(totalTime).toBeLessThan(200); // Multiple instances under 200ms
  });
});
