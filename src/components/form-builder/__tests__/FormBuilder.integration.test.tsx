import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import FormBuilderCanvas from '../canvas/FormBuilderCanvas';
import FieldPalette from '../palette/FieldPalette';
import FormPreview from '../preview/FormPreview';
import {
  WeddingFormField,
  TierLimitations,
  WeddingFieldType,
} from '@/types/form-builder';

// Mock @dnd-kit/core for integration tests
jest.mock('@dnd-kit/core', () => {
  const originalModule = jest.requireActual('@dnd-kit/core');
  return {
    ...originalModule,
    useDndContext: () => ({
      active: null,
      over: null,
      dragOverlay: { setNodeRef: jest.fn() },
    }),
    useDndMonitor: jest.fn(),
    useDraggable: () => ({
      attributes: { role: 'button', tabIndex: 0 },
      listeners: { onMouseDown: jest.fn(), onTouchStart: jest.fn() },
      setNodeRef: jest.fn(),
      transform: null,
      isDragging: false,
    }),
    useDroppable: () => ({
      setNodeRef: jest.fn(),
      isOver: false,
    }),
  };
});

// Mock the UI components
jest.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect, selected }: any) => (
    <div data-testid="calendar">
      <button onClick={() => onSelect(new Date('2024-06-15'))}>
        Select Date
      </button>
      {selected && <div>Selected: {selected.toDateString()}</div>}
    </div>
  ),
}));

const mockTierLimitations: TierLimitations = {
  availableFieldTypes: [
    'text',
    'email',
    'wedding-date',
    'venue',
    'guest-count',
  ] as WeddingFieldType[],
  maxFields: 10,
  advancedFields: ['photo-preferences', 'timeline-event'] as WeddingFieldType[],
  canUseLogic: true,
  canUseTemplates: true,
  canExportData: true,
  canUseIntegrations: false,
};

const mockInitialData = {
  id: 'test-form',
  title: 'Wedding Inquiry Form',
  description: 'Test description',
  fields: [] as WeddingFormField[],
  settings: {
    theme: 'default',
    submitButtonText: 'Submit',
  },
};

/**
 * Full Form Builder Integration Test Suite
 *
 * Tests the complete workflow of building a wedding form:
 * 1. Canvas with field drag-and-drop
 * 2. Field palette with categorized fields
 * 3. Real-time preview updates
 * 4. Form submission and validation
 * 5. Wedding-specific features
 */
describe('Form Builder Integration Tests', () => {
  const mockOnFormSaved = jest.fn();
  const mockOnFieldsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('completes the full form building workflow', async () => {
    const user = userEvent.setup();

    // Mock the drag and drop context
    const MockFormBuilder = () => {
      const [fields, setFields] = React.useState<WeddingFormField[]>([]);

      const handleFieldsChange = (newFields: WeddingFormField[]) => {
        setFields(newFields);
        mockOnFieldsChange(newFields);
      };

      return (
        <DndContext>
          <div style={{ display: 'flex', height: '100vh' }}>
            {/* Field Palette */}
            <div style={{ width: '300px' }}>
              <FieldPalette
                availableFields={mockTierLimitations.availableFieldTypes}
                tierLimitations={mockTierLimitations}
                searchQuery=""
                selectedCategory={null}
                onFieldDragStart={jest.fn()}
                onFieldDragEnd={jest.fn()}
              />
            </div>

            {/* Form Builder Canvas */}
            <div style={{ flex: 1 }}>
              <FormBuilderCanvas
                formId="test-form"
                initialData={{ ...mockInitialData, fields }}
                tierLimitations={mockTierLimitations}
                onFormSaved={mockOnFormSaved}
                onFieldsChange={handleFieldsChange}
              />
            </div>

            {/* Form Preview */}
            <div style={{ width: '400px' }}>
              <FormPreview
                fields={fields}
                formTitle="Wedding Inquiry Form"
                formDescription="Test description"
                isVisible={true}
                onVisibilityToggle={jest.fn()}
                onFormSubmit={jest.fn()}
              />
            </div>
          </div>
          <DragOverlay />
        </DndContext>
      );
    };

    render(<MockFormBuilder />);

    // Verify all components are rendered
    expect(screen.getByText('Field Library')).toBeInTheDocument();
    expect(
      screen.getByText(/Let's build your first questionnaire/),
    ).toBeInTheDocument();
    expect(screen.getByText('Live Preview')).toBeInTheDocument();
  });

  it('handles field addition from palette to canvas', async () => {
    const user = userEvent.setup();

    // This would require more complex setup to test actual drag and drop
    // For now, we test that the components can communicate
    render(
      <DndContext>
        <FieldPalette
          availableFields={mockTierLimitations.availableFieldTypes}
          tierLimitations={mockTierLimitations}
          searchQuery=""
          selectedCategory={null}
          onFieldDragStart={mockOnFieldsChange}
          onFieldDragEnd={jest.fn()}
        />
      </DndContext>,
    );

    // Simulate field drag start
    const textField = screen.getByText(/Text/);
    if (textField) {
      fireEvent.mouseDown(textField);
      expect(mockOnFieldsChange).toHaveBeenCalled();
    }
  });

  it('updates preview in real-time when fields are added', async () => {
    const user = userEvent.setup();

    // Start with empty form
    const { rerender } = render(
      <FormPreview
        fields={[]}
        formTitle="Wedding Inquiry Form"
        formDescription="Test description"
        isVisible={true}
        onVisibilityToggle={jest.fn()}
        onFormSubmit={jest.fn()}
      />,
    );

    // Should show empty state
    expect(screen.getByText(/No fields added yet/)).toBeInTheDocument();

    // Add fields
    const newFields: WeddingFormField[] = [
      {
        id: 'field-1',
        type: 'text',
        label: 'Couple Names',
        category: 'basic',
        isWeddingSpecific: false,
        validation: { required: true },
      },
      {
        id: 'field-2',
        type: 'wedding-date',
        label: 'Wedding Date',
        category: 'wedding',
        isWeddingSpecific: true,
        validation: { required: true },
        weddingContext: {
          helpText: 'Choose your perfect date',
          exampleValue: 'June 15, 2024',
        },
      },
    ];

    rerender(
      <FormPreview
        fields={newFields}
        formTitle="Wedding Inquiry Form"
        formDescription="Test description"
        isVisible={true}
        onVisibilityToggle={jest.fn()}
        onFormSubmit={jest.fn()}
      />,
    );

    // Should show the fields
    expect(screen.getByText('Couple Names')).toBeInTheDocument();
    expect(screen.getByText('Wedding Date')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Field count
  });

  it('enforces tier limitations across components', () => {
    const restrictedTier: TierLimitations = {
      availableFieldTypes: ['text', 'email'] as WeddingFieldType[],
      maxFields: 2,
      advancedFields: ['wedding-date', 'venue'] as WeddingFieldType[],
      canUseLogic: false,
      canUseTemplates: false,
      canExportData: false,
      canUseIntegrations: false,
    };

    // Test field palette with restrictions
    render(
      <FieldPalette
        availableFields={restrictedTier.availableFieldTypes}
        tierLimitations={restrictedTier}
        searchQuery=""
        selectedCategory={null}
        onFieldDragStart={jest.fn()}
        onFieldDragEnd={jest.fn()}
      />,
    );

    expect(screen.getByText(/Available fields:/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Only 2 available fields
    expect(screen.getByText(/Max fields per form:/)).toBeInTheDocument();
  });

  it('validates form submission end-to-end', async () => {
    const user = userEvent.setup();
    const onFormSubmit = jest.fn();

    const testFields: WeddingFormField[] = [
      {
        id: 'field-1',
        type: 'text',
        label: 'Couple Names',
        category: 'basic',
        isWeddingSpecific: false,
        validation: { required: true },
      },
    ];

    render(
      <FormPreview
        fields={testFields}
        formTitle="Wedding Inquiry Form"
        formDescription="Test description"
        isVisible={true}
        onVisibilityToggle={jest.fn()}
        onFormSubmit={onFormSubmit}
      />,
    );

    // Switch to test mode
    const testTab = screen.getByText('Test');
    await user.click(testTab);

    // Try to submit without filling required field
    const submitButton = screen.getByText(/Submit Inquiry/);
    await user.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    // Fill the required field
    const nameInput =
      screen.getByDisplayValue('') || screen.getAllByRole('textbox')[0];
    await user.type(nameInput, 'John & Jane Doe');

    // Submit again
    await user.click(submitButton);

    // Should call onFormSubmit
    expect(onFormSubmit).toHaveBeenCalledWith({
      'field-1': 'John & Jane Doe',
    });
  });

  it('handles wedding-specific field interactions', async () => {
    const user = userEvent.setup();

    const weddingFields: WeddingFormField[] = [
      {
        id: 'wedding-date',
        type: 'wedding-date',
        label: 'Wedding Date',
        category: 'wedding',
        isWeddingSpecific: true,
        validation: { required: true },
        weddingContext: {
          helpText: 'Choose your perfect date',
          exampleValue: 'June 15, 2024',
          photographerTip: 'Consider golden hour for best lighting',
        },
      },
    ];

    render(
      <FormPreview
        fields={weddingFields}
        formTitle="Wedding Inquiry Form"
        formDescription="Test description"
        isVisible={true}
        onVisibilityToggle={jest.fn()}
        onFormSubmit={jest.fn()}
      />,
    );

    // Should show wedding-specific context
    expect(screen.getByText('💍')).toBeInTheDocument();
    expect(screen.getByText(/💡 Choose your perfect date/)).toBeInTheDocument();
  });

  it('maintains state consistency across viewport changes', async () => {
    const user = userEvent.setup();

    const testFields: WeddingFormField[] = [
      {
        id: 'field-1',
        type: 'text',
        label: 'Test Field',
        category: 'basic',
        isWeddingSpecific: false,
        validation: {},
      },
    ];

    render(
      <FormPreview
        fields={testFields}
        formTitle="Wedding Inquiry Form"
        formDescription="Test description"
        isVisible={true}
        onVisibilityToggle={jest.fn()}
        onFormSubmit={jest.fn()}
      />,
    );

    // Switch to test mode
    const testTab = screen.getByText('Test');
    await user.click(testTab);

    // Fill a field
    const textInput = screen.getAllByRole('textbox')[0];
    await user.type(textInput, 'Test value');

    // Switch viewports
    const mobileButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg'), // Icon button
    );

    if (mobileButton) {
      await user.click(mobileButton);

      // Value should be preserved
      expect(textInput).toHaveValue('Test value');
    }
  });

  it('handles auto-save functionality', async () => {
    jest.useFakeTimers();

    render(
      <FormBuilderCanvas
        formId="test-form"
        initialData={mockInitialData}
        tierLimitations={mockTierLimitations}
        onFormSaved={mockOnFormSaved}
        onFieldsChange={mockOnFieldsChange}
      />,
    );

    // Fast-forward to trigger auto-save
    jest.advanceTimersByTime(30000); // 30 seconds

    // Should trigger auto-save (even with no changes)
    expect(mockOnFormSaved).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('provides accessibility support across all components', async () => {
    const user = userEvent.setup();

    render(
      <DndContext>
        <div>
          <FieldPalette
            availableFields={mockTierLimitations.availableFieldTypes}
            tierLimitations={mockTierLimitations}
            searchQuery=""
            selectedCategory={null}
            onFieldDragStart={jest.fn()}
            onFieldDragEnd={jest.fn()}
          />
          <FormPreview
            fields={[]}
            formTitle="Wedding Inquiry Form"
            formDescription="Test description"
            isVisible={true}
            onVisibilityToggle={jest.fn()}
            onFormSubmit={jest.fn()}
          />
        </div>
      </DndContext>,
    );

    // Should have proper ARIA landmarks
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();

    // Should support keyboard navigation
    await user.tab();
    expect(document.activeElement).not.toBe(document.body);
  });
});

// Performance Integration Tests
describe('Form Builder Performance Integration', () => {
  it('handles large forms efficiently', () => {
    const manyFields = Array.from({ length: 100 }, (_, i) => ({
      id: `field-${i + 1}`,
      type: 'text' as any,
      label: `Field ${i + 1}`,
      category: 'basic' as any,
      isWeddingSpecific: false,
      validation: {},
    })) as WeddingFormField[];

    const startTime = performance.now();

    render(
      <div>
        <FormBuilderCanvas
          formId="test-form"
          initialData={{ ...mockInitialData, fields: manyFields }}
          tierLimitations={mockTierLimitations}
          onFormSaved={jest.fn()}
          onFieldsChange={jest.fn()}
        />
        <FormPreview
          fields={manyFields}
          formTitle="Wedding Inquiry Form"
          formDescription="Test description"
          isVisible={true}
          onVisibilityToggle={jest.fn()}
          onFormSubmit={jest.fn()}
        />
      </div>,
    );

    const endTime = performance.now();

    // Should render within reasonable time even with 100 fields
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('optimizes re-renders during field updates', () => {
    const renderCount = jest.fn();

    const TestComponent = ({ fields }: { fields: WeddingFormField[] }) => {
      renderCount();
      return (
        <FormPreview
          fields={fields}
          formTitle="Wedding Inquiry Form"
          formDescription="Test description"
          isVisible={true}
          onVisibilityToggle={jest.fn()}
          onFormSubmit={jest.fn()}
        />
      );
    };

    const initialFields: WeddingFormField[] = [
      {
        id: 'field-1',
        type: 'text',
        label: 'Field 1',
        category: 'basic',
        isWeddingSpecific: false,
        validation: {},
      },
    ];

    const { rerender } = render(<TestComponent fields={initialFields} />);

    const initialRenderCount = renderCount.mock.calls.length;

    // Update fields multiple times
    for (let i = 2; i <= 5; i++) {
      const updatedFields = [
        ...initialFields,
        {
          id: `field-${i}`,
          type: 'text' as any,
          label: `Field ${i}`,
          category: 'basic' as any,
          isWeddingSpecific: false,
          validation: {},
        } as WeddingFormField,
      ];
      rerender(<TestComponent fields={updatedFields} />);
    }

    // Should not render excessively
    const totalRenders = renderCount.mock.calls.length;
    expect(totalRenders - initialRenderCount).toBeLessThanOrEqual(4); // One per update
  });
});

// Error Handling Integration Tests
describe('Form Builder Error Handling Integration', () => {
  it('gracefully handles invalid field configurations', () => {
    const invalidFields: WeddingFormField[] = [
      {
        id: '',
        type: 'invalid-type' as any,
        label: '',
        category: 'basic',
        isWeddingSpecific: false,
        validation: {},
      },
    ];

    // Should not crash with invalid fields
    expect(() => {
      render(
        <FormPreview
          fields={invalidFields}
          formTitle="Wedding Inquiry Form"
          formDescription="Test description"
          isVisible={true}
          onVisibilityToggle={jest.fn()}
          onFormSubmit={jest.fn()}
        />,
      );
    }).not.toThrow();
  });

  it('handles network errors during form submission', async () => {
    const user = userEvent.setup();
    const onFormSubmit = jest
      .fn()
      .mockRejectedValue(new Error('Network error'));

    const testFields: WeddingFormField[] = [
      {
        id: 'field-1',
        type: 'text',
        label: 'Test Field',
        category: 'basic',
        isWeddingSpecific: false,
        validation: { required: true },
      },
    ];

    render(
      <FormPreview
        fields={testFields}
        formTitle="Wedding Inquiry Form"
        formDescription="Test description"
        isVisible={true}
        onVisibilityToggle={jest.fn()}
        onFormSubmit={onFormSubmit}
      />,
    );

    // Switch to test mode and fill field
    const testTab = screen.getByText('Test');
    await user.click(testTab);

    const textInput = screen.getAllByRole('textbox')[0];
    await user.type(textInput, 'Test value');

    const submitButton = screen.getByText(/Submit Inquiry/);
    await user.click(submitButton);

    // Should handle the error gracefully
    expect(onFormSubmit).toHaveBeenCalled();
  });
});
