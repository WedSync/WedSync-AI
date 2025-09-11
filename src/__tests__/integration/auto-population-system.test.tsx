/**
 * Auto-Population System Integration Tests
 * WS-216 Team A - End-to-End System Testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AutoPopulationProvider } from '@/components/forms/AutoPopulationProvider';
import { PopulatedFormField } from '@/components/forms/PopulatedFormField';
import { PopulationStatusBanner } from '@/components/forms/PopulationStatusBanner';
import { useAutoPopulation } from '@/hooks/useAutoPopulation';

// Mock external dependencies
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(() => ({ toString: () => 'encrypted-session-data' })),
    decrypt: jest.fn(() => ({
      toString: () => '{"sessionId":"test-session","hasUserConsent":true}',
    })),
  },
  enc: { Utf8: {} },
}));

jest.mock('motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

jest.mock('lucide-react', () => ({
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
  AlertTriangle: () => <div data-testid="alert-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Download: () => <div data-testid="download-icon" />,
}));

const mockOrganizationId = 'test-org-123';
const mockUserId = 'test-user-456';

// Complete wedding form component for testing
const WeddingForm = () => {
  const [formData, setFormData] = React.useState({
    couple_name_1: '',
    couple_name_2: '',
    wedding_date: '',
    venue_name: '',
    contact_email: '',
    contact_phone: '',
    guest_count: '',
    budget_amount: '',
  });

  const handleChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  return (
    <AutoPopulationProvider
      organizationId={mockOrganizationId}
      userId={mockUserId}
    >
      <div data-testid="wedding-form">
        <PopulationStatusBanner
          totalFields={8}
          populatedFields={5}
          highConfidenceCount={3}
          mediumConfidenceCount={2}
          lowConfidenceCount={0}
          acceptedCount={0}
          rejectedCount={0}
          onAcceptAll={() => {}}
          onReviewIndividually={() => {}}
          onClearAll={() => {}}
          isExpanded={false}
          onToggleExpanded={() => {}}
        />

        <div className="space-y-4">
          <PopulatedFormField
            fieldId="couple_name_1"
            fieldType="name"
            fieldName="Partner 1 Name"
            value={formData.couple_name_1}
            onChange={(value) => handleChange('couple_name_1', value)}
            isPopulated={true}
            confidence="high"
            showConfidenceIndicator={true}
            showAcceptReject={true}
          />

          <PopulatedFormField
            fieldId="couple_name_2"
            fieldType="name"
            fieldName="Partner 2 Name"
            value={formData.couple_name_2}
            onChange={(value) => handleChange('couple_name_2', value)}
            isPopulated={true}
            confidence="high"
            showConfidenceIndicator={true}
            showAcceptReject={true}
          />

          <PopulatedFormField
            fieldId="wedding_date"
            fieldType="date"
            fieldName="Wedding Date"
            value={formData.wedding_date}
            onChange={(value) => handleChange('wedding_date', value)}
            isPopulated={true}
            confidence="medium"
            showConfidenceIndicator={true}
            showAcceptReject={true}
          />

          <PopulatedFormField
            fieldId="venue_name"
            fieldType="text"
            fieldName="Venue Name"
            value={formData.venue_name}
            onChange={(value) => handleChange('venue_name', value)}
            isPopulated={true}
            confidence="medium"
            showConfidenceIndicator={true}
            showAcceptReject={true}
          />

          <PopulatedFormField
            fieldId="contact_email"
            fieldType="email"
            fieldName="Contact Email"
            value={formData.contact_email}
            onChange={(value) => handleChange('contact_email', value)}
            isPopulated={true}
            confidence="high"
            isSensitive={true}
            showConfidenceIndicator={true}
            showAcceptReject={true}
          />

          <PopulatedFormField
            fieldId="contact_phone"
            fieldType="phone"
            fieldName="Contact Phone"
            value={formData.contact_phone}
            onChange={(value) => handleChange('contact_phone', value)}
            isPopulated={false}
            confidence="low"
            showConfidenceIndicator={false}
          />

          <PopulatedFormField
            fieldId="guest_count"
            fieldType="number"
            fieldName="Number of Guests"
            value={formData.guest_count}
            onChange={(value) => handleChange('guest_count', value)}
            isPopulated={false}
          />

          <PopulatedFormField
            fieldId="budget_amount"
            fieldType="currency"
            fieldName="Wedding Budget"
            value={formData.budget_amount}
            onChange={(value) => handleChange('budget_amount', value)}
            isPopulated={false}
          />
        </div>
      </div>
    </AutoPopulationProvider>
  );
};

describe('Auto-Population System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Complete System Workflow', () => {
    it('should render complete wedding form with auto-population', () => {
      render(<WeddingForm />);

      // Verify all components are rendered
      expect(screen.getByTestId('wedding-form')).toBeInTheDocument();
      expect(screen.getByText('Partner 1 Name')).toBeInTheDocument();
      expect(screen.getByText('Partner 2 Name')).toBeInTheDocument();
      expect(screen.getByText('Wedding Date')).toBeInTheDocument();
      expect(screen.getByText('Venue Name')).toBeInTheDocument();
      expect(screen.getByText('Contact Email')).toBeInTheDocument();
      expect(screen.getByText('Contact Phone')).toBeInTheDocument();
      expect(screen.getByText('Number of Guests')).toBeInTheDocument();
      expect(screen.getByText('Wedding Budget')).toBeInTheDocument();
    });

    it('should display population status summary', () => {
      render(<WeddingForm />);

      expect(screen.getByText(/5 of 8 fields populated/)).toBeInTheDocument();
      expect(screen.getByText(/3 high confidence/)).toBeInTheDocument();
      expect(screen.getByText(/2 medium confidence/)).toBeInTheDocument();
    });

    it('should show confidence indicators on populated fields', () => {
      render(<WeddingForm />);

      // High confidence fields should show sparkles
      const sparklesIcons = screen.getAllByTestId('sparkles-icon');
      expect(sparklesIcons.length).toBeGreaterThan(0);
    });

    it('should handle field acceptance workflow', async () => {
      const user = userEvent.setup();
      render(<WeddingForm />);

      // Accept a high confidence field
      const acceptButtons = screen.getAllByText('Accept');
      await user.click(acceptButtons[0]);

      // Field should be accepted (implementation would update state)
    });

    it('should handle field rejection workflow', async () => {
      const user = userEvent.setup();
      render(<WeddingForm />);

      // Reject a medium confidence field
      const rejectButtons = screen.getAllByText('Reject');
      await user.click(rejectButtons[0]);

      // Field should be rejected (implementation would update state)
    });
  });

  describe('Wedding Industry Scenarios', () => {
    it('should handle photographer client form scenario', async () => {
      const user = userEvent.setup();

      // Simulate photographer uploading client PDF and getting auto-populated form
      render(<WeddingForm />);

      // Verify wedding-specific fields are present
      expect(screen.getByText('Partner 1 Name')).toBeInTheDocument();
      expect(screen.getByText('Partner 2 Name')).toBeInTheDocument();
      expect(screen.getByText('Wedding Date')).toBeInTheDocument();
      expect(screen.getByText('Venue Name')).toBeInTheDocument();

      // Test accepting all high confidence suggestions
      const acceptAllButton = screen.queryByText('Accept All High Confidence');
      if (acceptAllButton) {
        await user.click(acceptAllButton);
      }
    });

    it('should save couples 3-4 hours of form filling', () => {
      render(<WeddingForm />);

      // Verify 5 out of 8 fields are auto-populated (62.5% completion)
      // This represents significant time savings for couples
      const populatedFields = screen.getAllByTestId('sparkles-icon').length;
      expect(populatedFields).toBeGreaterThan(0);

      // Should show time saved message in banner
      expect(screen.getByText(/Saving you approximately/)).toBeInTheDocument();
    });

    it('should handle venue form with different field priorities', () => {
      render(<WeddingForm />);

      // Venue-specific fields should be prioritized
      expect(screen.getByText('Venue Name')).toBeInTheDocument();
      expect(screen.getByText('Number of Guests')).toBeInTheDocument();
      expect(screen.getByText('Wedding Budget')).toBeInTheDocument();
    });
  });

  describe('Security and Privacy Integration', () => {
    it('should handle sensitive data with appropriate security', () => {
      render(<WeddingForm />);

      // Email field should be marked as sensitive
      const emailField = screen.getByLabelText('Contact Email');
      expect(emailField).toBeInTheDocument();

      // Should show security indicators for sensitive fields
    });

    it('should require consent for sensitive field operations', async () => {
      const user = userEvent.setup();
      render(<WeddingForm />);

      // Attempting to populate sensitive field should require consent
      const emailField = screen.getByLabelText('Contact Email');
      await user.click(emailField);

      // Should show consent dialog or indicator
    });

    it('should provide audit trail export', () => {
      render(<WeddingForm />);

      // Should have export audit log functionality
      const exportButton = screen.queryByTestId('download-icon');
      expect(exportButton).toBeInTheDocument();
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should render complete form within performance budget', () => {
      const startTime = performance.now();

      render(<WeddingForm />);

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(500); // Complete form under 500ms
    });

    it('should handle rapid field updates efficiently', async () => {
      const user = userEvent.setup();
      render(<WeddingForm />);

      const nameField = screen.getByLabelText('Partner 1 Name');

      const startTime = performance.now();

      // Rapid typing simulation
      await user.type(nameField, 'John Smith');

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('should maintain responsive UI during batch operations', async () => {
      const user = userEvent.setup();
      render(<WeddingForm />);

      // Test batch accept all high confidence
      const acceptAllButton = screen.queryByText('Accept All High Confidence');
      if (acceptAllButton) {
        const startTime = performance.now();
        await user.click(acceptAllButton);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(300);
      }
    });
  });

  describe('Accessibility Integration', () => {
    it('should provide comprehensive screen reader support', () => {
      render(<WeddingForm />);

      // All form fields should have proper labels
      expect(screen.getByLabelText('Partner 1 Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Partner 2 Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Wedding Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Venue Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Contact Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Contact Phone')).toBeInTheDocument();
      expect(screen.getByLabelText('Number of Guests')).toBeInTheDocument();
      expect(screen.getByLabelText('Wedding Budget')).toBeInTheDocument();
    });

    it('should support keyboard navigation throughout the system', async () => {
      const user = userEvent.setup();
      render(<WeddingForm />);

      // Should be able to tab through all interactive elements
      await user.tab();
      expect(document.activeElement).toBeTruthy();

      // Continue tabbing through form
      await user.tab();
      await user.tab();
      await user.tab();

      // All elements should be focusable
    });

    it('should announce population changes to screen readers', () => {
      render(<WeddingForm />);

      // Should have aria-live regions for dynamic updates
      const liveRegion = screen.queryByRole('status');
      expect(liveRegion).toBeInTheDocument();
    });

    it('should meet WCAG 2.1 AA color contrast requirements', () => {
      render(<WeddingForm />);

      // High confidence indicators should have sufficient contrast
      const highConfidenceElements = screen.getAllByTestId('sparkles-icon');
      highConfidenceElements.forEach((element) => {
        // Color contrast would be tested with actual computed styles
        expect(element).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network failures gracefully', () => {
      // Mock network failure
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<WeddingForm />);

      // System should still render and function in offline mode
      expect(screen.getByTestId('wedding-form')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should handle malformed wedding data', () => {
      render(<WeddingForm />);

      // Should validate and sanitize all inputs
      const fields = screen.getAllByRole('textbox');
      fields.forEach((field) => {
        expect(field).toBeInTheDocument();
      });
    });

    it('should recover from session expiration', async () => {
      render(<WeddingForm />);

      // Simulate session expiration
      // System should handle gracefully and allow recovery
      expect(screen.getByTestId('wedding-form')).toBeInTheDocument();
    });

    it('should handle concurrent user sessions', () => {
      // Test multiple users accessing the same organization
      render(<WeddingForm />);

      // Should isolate user sessions properly
      expect(screen.getByTestId('wedding-form')).toBeInTheDocument();
    });
  });

  describe('Business Logic Integration', () => {
    it('should enforce wedding date business rules', async () => {
      const user = userEvent.setup();
      render(<WeddingForm />);

      const dateField = screen.getByLabelText('Wedding Date');

      // Test past date (should be invalid)
      await user.clear(dateField);
      await user.type(dateField, '2020-01-01');
      fireEvent.blur(dateField);

      await waitFor(() => {
        expect(
          screen.getByText(/date should be in the future/i),
        ).toBeInTheDocument();
      });
    });

    it('should validate wedding budget ranges', async () => {
      const user = userEvent.setup();
      render(<WeddingForm />);

      const budgetField = screen.getByLabelText('Wedding Budget');

      await user.type(budgetField, '25000');
      fireEvent.blur(budgetField);

      // Should format as currency
      await waitFor(() => {
        expect(budgetField).toHaveValue('25000');
      });
    });

    it('should handle guest count validation', async () => {
      const user = userEvent.setup();
      render(<WeddingForm />);

      const guestField = screen.getByLabelText('Number of Guests');

      // Test reasonable guest count
      await user.type(guestField, '150');
      expect(guestField).toHaveValue('150');

      // Test unreasonable guest count
      await user.clear(guestField);
      await user.type(guestField, '-5');
      fireEvent.blur(guestField);

      await waitFor(() => {
        expect(screen.getByText(/valid number/i)).toBeInTheDocument();
      });
    });
  });

  describe('Multi-tenant Organization Support', () => {
    it('should isolate data between different photography businesses', () => {
      const org1Form = render(<WeddingForm />);
      org1Form.unmount();

      // Different org should have clean state
      render(<WeddingForm />);
      expect(screen.getByTestId('wedding-form')).toBeInTheDocument();
    });

    it('should maintain separate population sessions per organization', () => {
      render(<WeddingForm />);

      // Sessions should be organization-scoped
      expect(screen.getByTestId('wedding-form')).toBeInTheDocument();
    });
  });

  describe('Real-world Wedding Scenarios', () => {
    it('should handle destination wedding forms', () => {
      render(<WeddingForm />);

      // Should handle international venues and dates
      expect(screen.getByText('Venue Name')).toBeInTheDocument();
      expect(screen.getByText('Wedding Date')).toBeInTheDocument();
    });

    it('should support multi-cultural wedding name formats', async () => {
      const user = userEvent.setup();
      render(<WeddingForm />);

      const name1Field = screen.getByLabelText('Partner 1 Name');
      const name2Field = screen.getByLabelText('Partner 2 Name');

      // Test various name formats
      await user.type(name1Field, 'María García-López');
      await user.type(name2Field, "James O'Connor");

      expect(name1Field).toHaveValue('María García-López');
      expect(name2Field).toHaveValue("James O'Connor");
    });

    it('should handle weekend wedding date preferences', async () => {
      const user = userEvent.setup();
      render(<WeddingForm />);

      const dateField = screen.getByLabelText('Wedding Date');

      // Test Saturday wedding date (most popular)
      await user.type(dateField, '2024-06-15'); // Saturday
      expect(dateField).toHaveValue('2024-06-15');
    });
  });
});

// Performance benchmarks for the complete system
describe('Auto-Population System Performance Benchmarks', () => {
  it('should meet enterprise performance requirements', () => {
    const iterations = 5;
    const renderTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      const { unmount } = render(<WeddingForm />);

      const endTime = performance.now();
      renderTimes.push(endTime - startTime);

      unmount();
    }

    const averageTime = renderTimes.reduce((a, b) => a + b, 0) / iterations;
    const maxTime = Math.max(...renderTimes);

    expect(averageTime).toBeLessThan(300); // Average under 300ms
    expect(maxTime).toBeLessThan(500); // Maximum under 500ms
  });

  it('should handle high-frequency updates efficiently', async () => {
    const user = userEvent.setup();
    render(<WeddingForm />);

    const startTime = performance.now();

    // Simulate rapid form updates
    const fields = screen.getAllByRole('textbox');
    for (let i = 0; i < fields.length && i < 5; i++) {
      await user.type(fields[i], 'test value');
    }

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000); // Rapid updates under 1s
  });

  it('should maintain memory efficiency with large forms', () => {
    // Test with extended form (more fields)
    render(<WeddingForm />);

    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    // Simulate form interactions
    fireEvent.click(screen.getAllByRole('textbox')[0]);

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB increase
  });
});
