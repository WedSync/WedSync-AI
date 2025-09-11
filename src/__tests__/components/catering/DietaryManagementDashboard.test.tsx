// WS-254: Dietary Management Dashboard Component Tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DietaryManagementDashboard } from '@/components/catering/DietaryManagementDashboard';

// Mock dependencies
vi.mock('@/hooks/useNavigation');
vi.mock('@supabase/supabase-js');

const mockNavigationHook = {
  navigate: vi.fn(),
  currentPath: '/catering/dietary',
};

describe('DietaryManagementDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock useNavigation hook
    vi.mocked(require('@/hooks/useNavigation').useNavigation).mockReturnValue(
      mockNavigationHook,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockWeddingData = {
    id: 'wedding-123',
    couple_name: 'John & Jane Smith',
    wedding_date: '2024-06-15',
    guest_count: 150,
  };

  const mockDietaryRequirements = [
    {
      id: 'req-1',
      guest_name: 'Alice Johnson',
      category: 'allergy' as const,
      severity: 5,
      notes: 'Severe nut allergy',
      verified: true,
      emergency_contact: '+1234567890',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'req-2',
      guest_name: 'Bob Wilson',
      category: 'diet' as const,
      severity: 3,
      notes: 'Vegetarian',
      verified: false,
      emergency_contact: null,
      created_at: '2024-01-16T11:00:00Z',
    },
    {
      id: 'req-3',
      guest_name: 'Carol Davis',
      category: 'medical' as const,
      severity: 4,
      notes: 'Diabetic - sugar-free options needed',
      verified: true,
      emergency_contact: '+0987654321',
      created_at: '2024-01-17T09:30:00Z',
    },
  ];

  describe('Rendering', () => {
    it('should render main dashboard layout', () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      expect(
        screen.getByText('Dietary Requirements Management'),
      ).toBeInTheDocument();
      expect(screen.getByText('John & Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('June 15, 2024')).toBeInTheDocument();
    });

    it('should display key statistics correctly', () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      // Should show total requirements
      expect(screen.getByText('3')).toBeInTheDocument(); // Total requirements

      // Should show high severity count
      expect(screen.getByText('2')).toBeInTheDocument(); // High severity (4+)

      // Should show unverified count
      expect(screen.getByText('1')).toBeInTheDocument(); // Unverified
    });

    it('should render requirements list', () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      expect(screen.getByText('Carol Davis')).toBeInTheDocument();

      expect(screen.getByText('Severe nut allergy')).toBeInTheDocument();
      expect(screen.getByText('Vegetarian')).toBeInTheDocument();
      expect(
        screen.getByText('Diabetic - sugar-free options needed'),
      ).toBeInTheDocument();
    });

    it('should show severity badges correctly', () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      // Severity 5 should show as CRITICAL
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();

      // Severity 4 should show as HIGH
      expect(screen.getByText('HIGH')).toBeInTheDocument();

      // Severity 3 should show as MEDIUM
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    it('should display verification status', () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      // Should show verified and unverified indicators
      const verifiedElements = screen.getAllByText(/verified/i);
      expect(verifiedElements).toHaveLength(3); // One for each requirement
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate risk level correctly', () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      // With severity 5 allergy, should be CRITICAL risk
      expect(screen.getByText('CRITICAL RISK')).toBeInTheDocument();
    });

    it('should show appropriate risk factors', () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      expect(screen.getByText(/1 life-threatening allerg/)).toBeInTheDocument();
      expect(
        screen.getByText(/2 high-severity dietary requirements/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/1 unverified dietary requirements/),
      ).toBeInTheDocument();
    });

    it('should provide safety recommendations', () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      expect(screen.getByText(/Notify emergency services/)).toBeInTheDocument();
      expect(screen.getByText(/EpiPens available/)).toBeInTheDocument();
      expect(screen.getByText(/Contact guests to verify/)).toBeInTheDocument();
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter by category', async () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      // Click allergy filter
      const allergyFilter = screen.getByRole('button', { name: /allergy/i });
      fireEvent.click(allergyFilter);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
        expect(screen.queryByText('Carol Davis')).not.toBeInTheDocument();
      });
    });

    it('should filter by severity level', async () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      // Filter for high severity only (4+)
      const severityFilter = screen.getByRole('button', {
        name: /high severity/i,
      });
      fireEvent.click(severityFilter);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument(); // Severity 5
        expect(screen.getByText('Carol Davis')).toBeInTheDocument(); // Severity 4
        expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument(); // Severity 3
      });
    });

    it('should filter by verification status', async () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      // Filter for unverified only
      const unverifiedFilter = screen.getByRole('button', {
        name: /unverified/i,
      });
      fireEvent.click(unverifiedFilter);

      await waitFor(() => {
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
        expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
        expect(screen.queryByText('Carol Davis')).not.toBeInTheDocument();
      });
    });

    it('should sort by severity', async () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      const sortButton = screen.getByRole('button', {
        name: /sort by severity/i,
      });
      fireEvent.click(sortButton);

      // Should be sorted by severity descending (5, 4, 3)
      await waitFor(() => {
        const requirements = screen.getAllByTestId('requirement-item');
        expect(requirements[0]).toHaveTextContent('Alice Johnson'); // Severity 5
        expect(requirements[1]).toHaveTextContent('Carol Davis'); // Severity 4
        expect(requirements[2]).toHaveTextContent('Bob Wilson'); // Severity 3
      });
    });
  });

  describe('CRUD Operations', () => {
    it('should open add requirement dialog', async () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      const addButton = screen.getByRole('button', {
        name: /add requirement/i,
      });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add Dietary Requirement')).toBeInTheDocument();
        expect(screen.getByLabelText(/guest name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/severity/i)).toBeInTheDocument();
      });
    });

    it('should open edit requirement dialog', async () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(
          screen.getByText('Edit Dietary Requirement'),
        ).toBeInTheDocument();
        expect(screen.getByDisplayValue('Alice Johnson')).toBeInTheDocument();
        expect(
          screen.getByDisplayValue('Severe nut allergy'),
        ).toBeInTheDocument();
      });
    });

    it('should handle requirement verification', async () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      // Find and click verify button for unverified requirement
      const verifyButtons = screen.getAllByRole('button', { name: /verify/i });
      fireEvent.click(verifyButtons[0]); // Bob Wilson's requirement

      await waitFor(() => {
        expect(screen.getByText('Verification successful')).toBeInTheDocument();
      });
    });

    it('should handle requirement deletion with confirmation', async () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      // Try to delete high-severity requirement
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]); // Alice's critical allergy

      await waitFor(() => {
        expect(
          screen.getByText(/high-severity dietary requirement/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/safety risks/i)).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /confirm deletion/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should handle PDF export', async () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/generating pdf/i)).toBeInTheDocument();
      });
    });

    it('should handle CSV export', async () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      const csvExportButton = screen.getByRole('button', {
        name: /export csv/i,
      });
      fireEvent.click(csvExportButton);

      await waitFor(() => {
        expect(screen.getByText(/generating csv/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time requirement updates', async () => {
      const { rerender } = render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      const updatedRequirements = [
        ...mockDietaryRequirements,
        {
          id: 'req-4',
          guest_name: 'David Brown',
          category: 'preference' as const,
          severity: 2,
          notes: 'No seafood preference',
          verified: false,
          emergency_contact: null,
          created_at: '2024-01-18T14:00:00Z',
        },
      ];

      rerender(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={updatedRequirements}
        />,
      );

      expect(screen.getByText('David Brown')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument(); // Updated total count
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render mobile layout on small screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      // Should show mobile-optimized layout
      expect(screen.getByTestId('mobile-dietary-layout')).toBeInTheDocument();
    });

    it('should handle touch interactions', async () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      const requirementCard = screen.getAllByTestId('requirement-card')[0];

      // Simulate touch/tap
      fireEvent.touchStart(requirementCard);
      fireEvent.touchEnd(requirementCard);

      await waitFor(() => {
        expect(screen.getByTestId('requirement-details')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      expect(screen.getByRole('main')).toHaveAttribute(
        'aria-label',
        'Dietary requirements management',
      );
      expect(
        screen.getByRole('region', { name: 'Risk assessment' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: 'Requirements list' }),
      ).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      const firstRequirement = screen.getAllByTestId('requirement-item')[0];
      firstRequirement.focus();

      fireEvent.keyDown(firstRequirement, { key: 'Enter' });

      await waitFor(() => {
        expect(
          screen.getByText('Edit Dietary Requirement'),
        ).toBeInTheDocument();
      });
    });

    it('should announce changes to screen readers', async () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      const verifyButton = screen.getAllByRole('button', {
        name: /verify/i,
      })[0];
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(
          'Dietary requirement verified',
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API failure
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      const addButton = screen.getByRole('button', {
        name: /add requirement/i,
      });
      fireEvent.click(addButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/error saving requirement/i),
        ).toBeInTheDocument();
      });
    });

    it('should handle validation errors', async () => {
      render(
        <DietaryManagementDashboard
          weddingData={mockWeddingData}
          initialRequirements={mockDietaryRequirements}
        />,
      );

      const addButton = screen.getByRole('button', {
        name: /add requirement/i,
      });
      fireEvent.click(addButton);

      // Try to save without required fields
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/guest name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/notes are required/i)).toBeInTheDocument();
      });
    });
  });
});
