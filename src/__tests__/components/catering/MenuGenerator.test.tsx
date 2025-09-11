// WS-254: Menu Generator Component Tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MenuGenerator } from '@/components/catering/MenuGenerator';

// Mock dependencies
vi.mock('@/hooks/useNavigation');
vi.mock('openai');

const mockNavigationHook = {
  navigate: vi.fn(),
  currentPath: '/catering/menu-generator',
};

describe('MenuGenerator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(require('@/hooks/useNavigation').useNavigation).mockReturnValue(
      mockNavigationHook,
    );

    // Mock fetch API
    global.fetch = vi.fn();
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
      category: 'allergy',
      severity: 5,
      notes: 'Severe nut allergy',
      verified: true,
    },
    {
      id: 'req-2',
      guest_name: 'Bob Wilson',
      category: 'diet',
      severity: 3,
      notes: 'Vegetarian',
      verified: true,
    },
  ];

  const mockGeneratedMenus = [
    {
      id: 'menu-1',
      name: 'Elegant Autumn Wedding Menu',
      description: 'A sophisticated seasonal menu featuring local ingredients',
      courses: [
        {
          id: 'course-1',
          name: 'Appetizers',
          type: 'appetizer',
          dishes: [
            {
              id: 'dish-1',
              name: 'Butternut Squash Soup',
              description: 'Roasted butternut squash with coconut cream',
              ingredients: ['butternut squash', 'coconut cream', 'sage'],
              allergens: [],
              dietary_tags: ['vegan', 'gluten-free'],
              cost: 8.5,
              prep_time: 45,
            },
          ],
        },
        {
          id: 'course-2',
          name: 'Main Courses',
          type: 'main',
          dishes: [
            {
              id: 'dish-2',
              name: 'Herb-Crusted Salmon',
              description: 'Atlantic salmon with fresh herb crust',
              ingredients: ['salmon', 'herbs', 'olive oil'],
              allergens: ['fish'],
              dietary_tags: ['gluten-free'],
              cost: 28.0,
              prep_time: 30,
            },
          ],
        },
      ],
      compliance_score: 0.92,
      total_cost: 11250.0,
      cost_per_person: 75.0,
      preparation_time: 4,
      warnings: [],
      ai_confidence: 0.95,
    },
  ];

  describe('Rendering', () => {
    it('should render the menu generator interface', () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      expect(screen.getByText('AI Menu Generator')).toBeInTheDocument();
      expect(screen.getByText('John & Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('150 guests')).toBeInTheDocument();
    });

    it('should show dietary requirements summary', () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      expect(
        screen.getByText('Current Dietary Requirements'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Alice Johnson - Severe nut allergy'),
      ).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson - Vegetarian')).toBeInTheDocument();
    });

    it('should display menu style options', () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      expect(screen.getByLabelText(/menu style/i)).toBeInTheDocument();
      expect(screen.getByText('Formal Plated Dinner')).toBeInTheDocument();
      expect(screen.getByText('Buffet Style')).toBeInTheDocument();
      expect(screen.getByText('Family Style')).toBeInTheDocument();
      expect(screen.getByText('Cocktail Reception')).toBeInTheDocument();
    });

    it('should show budget input', () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      const budgetInput = screen.getByLabelText(/budget per person/i);
      expect(budgetInput).toBeInTheDocument();
      expect(budgetInput).toHaveAttribute('type', 'number');
      expect(budgetInput).toHaveAttribute('min', '10');
      expect(budgetInput).toHaveAttribute('max', '500');
    });

    it('should display cultural and seasonal options', () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      expect(screen.getByText('Cultural Requirements')).toBeInTheDocument();
      expect(screen.getByText('Seasonal Preferences')).toBeInTheDocument();
      expect(screen.getByText('Venue Restrictions')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should handle menu style selection', async () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      const buffetOption = screen.getByLabelText(/buffet style/i);
      fireEvent.click(buffetOption);

      await waitFor(() => {
        expect(buffetOption).toBeChecked();
      });
    });

    it('should validate budget input', async () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      const budgetInput = screen.getByLabelText(/budget per person/i);

      // Test invalid low budget
      fireEvent.change(budgetInput, { target: { value: '5' } });
      fireEvent.blur(budgetInput);

      await waitFor(() => {
        expect(
          screen.getByText(/budget must be between \$10-\$500/i),
        ).toBeInTheDocument();
      });

      // Test invalid high budget
      fireEvent.change(budgetInput, { target: { value: '600' } });
      fireEvent.blur(budgetInput);

      await waitFor(() => {
        expect(
          screen.getByText(/budget must be between \$10-\$500/i),
        ).toBeInTheDocument();
      });
    });

    it('should handle cultural requirements selection', async () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      const halalOption = screen.getByLabelText(/halal/i);
      fireEvent.click(halalOption);

      const kosherOption = screen.getByLabelText(/kosher/i);
      fireEvent.click(kosherOption);

      await waitFor(() => {
        expect(halalOption).toBeChecked();
        expect(kosherOption).toBeChecked();
      });
    });

    it('should handle seasonal preferences', async () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      const seasonalSelect = screen.getByLabelText(/seasonal preferences/i);
      fireEvent.change(seasonalSelect, { target: { value: 'autumn' } });

      await waitFor(() => {
        expect(seasonalSelect).toHaveValue('autumn');
      });
    });

    it('should handle venue restrictions', async () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      const restrictionsInput = screen.getByLabelText(/venue restrictions/i);
      fireEvent.change(restrictionsInput, {
        target: { value: 'No open flames, limited kitchen space' },
      });

      await waitFor(() => {
        expect(restrictionsInput).toHaveValue(
          'No open flames, limited kitchen space',
        );
      });
    });
  });

  describe('Menu Generation', () => {
    it('should handle successful menu generation', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            menu_options: mockGeneratedMenus,
            generation_metadata: {
              wedding_name: 'John & Jane Smith',
              guest_count: 150,
              generated_at: new Date().toISOString(),
            },
          },
        }),
      } as Response);

      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      // Fill in required fields
      const budgetInput = screen.getByLabelText(/budget per person/i);
      fireEvent.change(budgetInput, { target: { value: '75' } });

      const formalOption = screen.getByLabelText(/formal/i);
      fireEvent.click(formalOption);

      // Generate menu
      const generateButton = screen.getByRole('button', {
        name: /generate menus/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(
          screen.getByText('Generating AI menu options...'),
        ).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(
          screen.getByText('Elegant Autumn Wedding Menu'),
        ).toBeInTheDocument();
        expect(screen.getByText('Compliance Score: 92%')).toBeInTheDocument();
        expect(screen.getByText('$75.00 per person')).toBeInTheDocument();
      });
    });

    it('should show generation progress', async () => {
      // Helper functions to reduce nesting - REFACTORED TO MEET 4-LEVEL LIMIT
      const createMenuResponse = () => ({
        success: true,
        data: { menu_options: mockGeneratedMenus },
      });

      const createMockResponse = (): Response => ({
        ok: true,
        json: async () => createMenuResponse(),
      } as Response);

      const createDelayedPromise = () => 
        new Promise<Response>((resolve) =>
          setTimeout(() => resolve(createMockResponse()), 2000)
        );

      // Mock a delayed response
      vi.mocked(global.fetch).mockImplementationOnce(() => createDelayedPromise());

      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      const generateButton = screen.getByRole('button', {
        name: /generate menus/i,
      });
      fireEvent.click(generateButton);

      expect(
        screen.getByText('Analyzing dietary requirements...'),
      ).toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.getByText('Consulting AI chef...')).toBeInTheDocument();
        },
        { timeout: 1000 },
      );

      await waitFor(
        () => {
          expect(
            screen.getByText('Calculating compliance scores...'),
          ).toBeInTheDocument();
        },
        { timeout: 1500 },
      );
    });

    it('should handle generation errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new Error('AI service unavailable'),
      );

      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      const generateButton = screen.getByRole('button', {
        name: /generate menus/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/error generating menus/i)).toBeInTheDocument();
        expect(screen.getByText(/ai service unavailable/i)).toBeInTheDocument();
      });
    });

    it('should validate form before generation', async () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      // Try to generate without filling required fields
      const generateButton = screen.getByRole('button', {
        name: /generate menus/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(
          screen.getByText(/please complete all required fields/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Generated Menu Display', () => {
    it('should display menu options with details', async () => {
      // First render with generation
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { menu_options: mockGeneratedMenus },
        }),
      } as Response);

      const { rerender } = render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      // Simulate successful generation
      rerender(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
          generatedMenus={mockGeneratedMenus}
        />,
      );

      expect(
        screen.getByText('Elegant Autumn Wedding Menu'),
      ).toBeInTheDocument();
      expect(screen.getByText('Butternut Squash Soup')).toBeInTheDocument();
      expect(screen.getByText('Herb-Crusted Salmon')).toBeInTheDocument();
      expect(screen.getByText('vegan, gluten-free')).toBeInTheDocument();
    });

    it('should show compliance warnings', async () => {
      const menuWithWarnings = [
        {
          ...mockGeneratedMenus[0],
          compliance_score: 0.65,
          warnings: [
            'Menu contains potential allergen conflicts',
            'Low vegetarian options',
          ],
        },
      ];

      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
          generatedMenus={menuWithWarnings}
        />,
      );

      expect(screen.getByText('Compliance Warnings')).toBeInTheDocument();
      expect(
        screen.getByText('Menu contains potential allergen conflicts'),
      ).toBeInTheDocument();
      expect(screen.getByText('Low vegetarian options')).toBeInTheDocument();
    });

    it('should display cost breakdown', async () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
          generatedMenus={mockGeneratedMenus}
        />,
      );

      expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
      expect(screen.getByText('$75.00 per person')).toBeInTheDocument();
      expect(screen.getByText('Total: $11,250.00')).toBeInTheDocument();
      expect(
        screen.getByText('Estimated prep time: 4 hours'),
      ).toBeInTheDocument();
    });

    it('should allow menu customization', async () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
          generatedMenus={mockGeneratedMenus}
        />,
      );

      const customizeButton = screen.getByRole('button', {
        name: /customize menu/i,
      });
      fireEvent.click(customizeButton);

      await waitFor(() => {
        expect(screen.getByText('Menu Customization')).toBeInTheDocument();
        expect(screen.getByLabelText(/modify dish/i)).toBeInTheDocument();
      });
    });
  });

  describe('Regeneration', () => {
    it('should allow menu regeneration with different parameters', async () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
          generatedMenus={mockGeneratedMenus}
        />,
      );

      const regenerateButton = screen.getByRole('button', {
        name: /regenerate/i,
      });
      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(
          screen.getByText('Modify Generation Parameters'),
        ).toBeInTheDocument();
      });

      // Change budget
      const budgetInput = screen.getByLabelText(/budget per person/i);
      fireEvent.change(budgetInput, { target: { value: '100' } });

      const confirmRegenerateButton = screen.getByRole('button', {
        name: /confirm regenerate/i,
      });
      fireEvent.click(confirmRegenerateButton);

      await waitFor(() => {
        expect(
          screen.getByText('Regenerating with new parameters...'),
        ).toBeInTheDocument();
      });
    });

    it('should handle partial regeneration', async () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
          generatedMenus={mockGeneratedMenus}
        />,
      );

      // Right-click on specific course for context menu
      const appetizerSection = screen.getByText('Appetizers');
      fireEvent.contextMenu(appetizerSection);

      await waitFor(() => {
        expect(
          screen.getByText('Regenerate this course only'),
        ).toBeInTheDocument();
      });

      const regenerateCourseButton = screen.getByText(
        'Regenerate this course only',
      );
      fireEvent.click(regenerateCourseButton);

      await waitFor(() => {
        expect(
          screen.getByText('Regenerating appetizer course...'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Save and Export', () => {
    it('should save generated menu', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
          generatedMenus={mockGeneratedMenus}
        />,
      );

      const saveButton = screen.getByRole('button', { name: /save menu/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Menu saved successfully')).toBeInTheDocument();
      });
    });

    it('should export menu as PDF', async () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
          generatedMenus={mockGeneratedMenus}
        />,
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Generating PDF...')).toBeInTheDocument();
      });
    });

    it('should send menu to suppliers', async () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
          generatedMenus={mockGeneratedMenus}
        />,
      );

      const shareButton = screen.getByRole('button', {
        name: /share with suppliers/i,
      });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(screen.getByText('Send Menu to Suppliers')).toBeInTheDocument();
        expect(screen.getByLabelText(/catering company/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/additional notes/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      expect(screen.getByRole('main')).toHaveAttribute(
        'aria-label',
        'AI menu generator',
      );
      expect(
        screen.getByRole('region', { name: 'Menu generation form' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: 'Dietary requirements summary' }),
      ).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      const generateButton = screen.getByRole('button', {
        name: /generate menus/i,
      });
      generateButton.focus();

      fireEvent.keyDown(generateButton, { key: 'Enter' });

      await waitFor(() => {
        expect(
          screen.getByText(/please complete all required fields/i),
        ).toBeInTheDocument();
      });
    });

    it('should announce generation progress to screen readers', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { menu_options: mockGeneratedMenus },
        }),
      } as Response);

      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      const generateButton = screen.getByRole('button', {
        name: /generate menus/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(
          'Analyzing dietary requirements',
        );
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render mobile layout', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
        />,
      );

      expect(screen.getByTestId('mobile-menu-generator')).toBeInTheDocument();
    });

    it('should handle touch interactions for menu cards', async () => {
      render(
        <MenuGenerator
          weddingData={mockWeddingData}
          existingRequirements={mockDietaryRequirements}
          generatedMenus={mockGeneratedMenus}
        />,
      );

      const menuCard = screen.getByTestId('menu-card-0');
      fireEvent.touchStart(menuCard);
      fireEvent.touchEnd(menuCard);

      await waitFor(() => {
        expect(screen.getByTestId('menu-details-expanded')).toBeInTheDocument();
      });
    });
  });
});
