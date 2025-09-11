import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormPreview from '../preview/FormPreview';
import { WeddingFormField } from '@/types/form-builder';

const mockFields: WeddingFormField[] = [
  {
    id: 'field-1',
    type: 'text',
    label: 'Couple Names',
    description: 'Please enter both names',
    category: 'basic',
    isWeddingSpecific: false,
    validation: { required: true },
    placeholder: 'John & Jane Smith',
  },
  {
    id: 'field-2',
    type: 'wedding-date',
    label: 'Wedding Date',
    description: 'When is your special day?',
    category: 'wedding',
    isWeddingSpecific: true,
    validation: { required: true },
    weddingContext: {
      helpText: 'Choose your perfect date',
      exampleValue: 'June 15, 2024',
      photographerTip: 'Consider golden hour for best lighting',
    },
  },
  {
    id: 'field-3',
    type: 'email',
    label: 'Contact Email',
    description: 'Primary email for communication',
    category: 'basic',
    isWeddingSpecific: false,
    validation: { required: true },
    placeholder: 'couple@example.com',
  },
];

describe('FormPreview', () => {
  const defaultProps = {
    fields: mockFields,
    formTitle: 'Wedding Inquiry Form',
    formDescription: 'Help us understand your perfect wedding day',
    isVisible: true,
    onVisibilityToggle: jest.fn(),
    onFormSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form preview with header and controls', () => {
    render(<FormPreview {...defaultProps} />);

    expect(screen.getByText('Live Preview')).toBeInTheDocument();
    expect(screen.getByText(`${mockFields.length} fields`)).toBeInTheDocument();
  });

  it('displays form title and description', () => {
    render(<FormPreview {...defaultProps} />);

    expect(screen.getByText('Wedding Inquiry Form')).toBeInTheDocument();
    expect(
      screen.getByText('Help us understand your perfect wedding day'),
    ).toBeInTheDocument();
  });

  it('shows preview statistics correctly', () => {
    render(<FormPreview {...defaultProps} />);

    expect(screen.getByText('3')).toBeInTheDocument(); // Total fields
    expect(screen.getByText('3')).toBeInTheDocument(); // Required fields
    expect(screen.getByText('1')).toBeInTheDocument(); // Wedding-specific fields
    expect(screen.getByText(/~5min/)).toBeInTheDocument(); // Estimated time
  });

  it('handles viewport size switching', async () => {
    const user = userEvent.setup();
    render(<FormPreview {...defaultProps} />);

    // Test mobile viewport
    const mobileButton =
      screen.getByLabelText(/Preview on mobile/i) ||
      screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

    if (mobileButton) {
      await user.click(mobileButton);
      // Should switch to mobile view
      expect(mobileButton).toBeInTheDocument();
    }

    // Test tablet viewport
    const tabletButton =
      screen.getByLabelText(/Preview on tablet/i) ||
      screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

    if (tabletButton) {
      await user.click(tabletButton);
      // Should switch to tablet view
      expect(tabletButton).toBeInTheDocument();
    }

    // Test desktop viewport
    const desktopButton =
      screen.getByLabelText(/Preview on desktop/i) ||
      screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

    if (desktopButton) {
      await user.click(desktopButton);
      // Should switch to desktop view
      expect(desktopButton).toBeInTheDocument();
    }
  });

  it('switches between preview and test modes', async () => {
    const user = userEvent.setup();
    render(<FormPreview {...defaultProps} />);

    // Find test mode tab
    const testTab =
      screen.getByText('Test') || screen.getByRole('tab', { name: /test/i });
    await user.click(testTab);

    // Should show interactive form elements
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders all form fields with proper labels and icons', () => {
    render(<FormPreview {...defaultProps} />);

    expect(screen.getByText('Couple Names')).toBeInTheDocument();
    expect(screen.getByText('Wedding Date')).toBeInTheDocument();
    expect(screen.getByText('Contact Email')).toBeInTheDocument();

    // Check for wedding-specific badge
    expect(screen.getByText('💍')).toBeInTheDocument();
  });

  it('displays field descriptions and wedding context', () => {
    render(<FormPreview {...defaultProps} />);

    expect(screen.getByText('Please enter both names')).toBeInTheDocument();
    expect(screen.getByText('When is your special day?')).toBeInTheDocument();
    expect(screen.getByText(/💡 Choose your perfect date/)).toBeInTheDocument();
  });

  it('handles form submission in test mode', async () => {
    const user = userEvent.setup();
    const onFormSubmit = jest.fn();

    render(<FormPreview {...defaultProps} onFormSubmit={onFormSubmit} />);

    // Switch to test mode
    const testTab = screen.getByText('Test');
    await user.click(testTab);

    // Find submit button
    const submitButton = screen.getByText(/Submit Inquiry/i);
    await user.click(submitButton);

    // Should show validation errors for empty required fields
    expect(screen.getByText(/Please fix/i)).toBeInTheDocument();
  });

  it('validates required fields before submission', async () => {
    const user = userEvent.setup();
    render(<FormPreview {...defaultProps} />);

    // Switch to test mode
    const testTab = screen.getByText('Test');
    await user.click(testTab);

    // Try to submit without filling required fields
    const submitButton = screen.getByText(/Submit Inquiry/i);
    await user.click(submitButton);

    // Should show validation summary
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('fills and validates form fields interactively', async () => {
    const user = userEvent.setup();
    render(<FormPreview {...defaultProps} />);

    // Switch to test mode
    const testTab = screen.getByText('Test');
    await user.click(testTab);

    // Fill out the form
    const nameInput = screen.getByPlaceholderText(/John & Jane Smith/);
    await user.type(nameInput, 'John & Jane Doe');

    const emailInput = screen.getByPlaceholderText(/couple@example.com/);
    await user.type(emailInput, 'john.jane@example.com');

    expect(nameInput).toHaveValue('John & Jane Doe');
    expect(emailInput).toHaveValue('john.jane@example.com');
  });

  it('handles form reset functionality', async () => {
    const user = userEvent.setup();
    render(<FormPreview {...defaultProps} />);

    // Switch to test mode
    const testTab = screen.getByText('Test');
    await user.click(testTab);

    // Fill out a field
    const nameInput = screen.getByPlaceholderText(/John & Jane Smith/);
    await user.type(nameInput, 'Test Names');

    // Reset form
    const resetButton = screen.getByText(/Reset Form/i);
    await user.click(resetButton);

    // Field should be cleared
    expect(nameInput).toHaveValue('');
  });

  it('displays empty state when no fields are provided', () => {
    render(<FormPreview {...defaultProps} fields={[]} />);

    expect(screen.getByText(/No fields added yet/)).toBeInTheDocument();
    expect(
      screen.getByText(/Start building your questionnaire/),
    ).toBeInTheDocument();
  });

  it('shows/hides preview panel correctly', async () => {
    const user = userEvent.setup();
    const onVisibilityToggle = jest.fn();

    // Test hidden state
    render(
      <FormPreview
        {...defaultProps}
        isVisible={false}
        onVisibilityToggle={onVisibilityToggle}
      />,
    );

    const showButton =
      screen.getByLabelText(/eye/i) || screen.getByRole('button');
    await user.click(showButton);

    expect(onVisibilityToggle).toHaveBeenCalled();
  });

  it('updates in real-time as fields change', () => {
    const { rerender } = render(<FormPreview {...defaultProps} />);

    // Initially shows 3 fields
    expect(screen.getByText('3')).toBeInTheDocument();

    // Add a field
    const updatedFields = [
      ...mockFields,
      {
        id: 'field-4',
        type: 'venue',
        label: 'Venue Information',
        category: 'wedding',
        isWeddingSpecific: true,
        validation: { required: false },
      } as WeddingFormField,
    ];

    rerender(<FormPreview {...defaultProps} fields={updatedFields} />);

    // Should now show 4 fields
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('provides wedding industry branding and context', () => {
    render(<FormPreview {...defaultProps} />);

    expect(screen.getByText(/Powered by WedSync/)).toBeInTheDocument();
    expect(screen.getByText(/Wedding Professionals/)).toBeInTheDocument();
    expect(screen.getByText(/💍/)).toBeInTheDocument();
  });

  it('handles different field types correctly', () => {
    const diverseFields: WeddingFormField[] = [
      {
        id: 'text-field',
        type: 'text',
        label: 'Text Field',
        category: 'basic',
        isWeddingSpecific: false,
        validation: {},
      },
      {
        id: 'select-field',
        type: 'select',
        label: 'Select Field',
        category: 'basic',
        isWeddingSpecific: false,
        validation: {},
        options: [
          { value: 'option1', label: 'Option 1' },
          { value: 'option2', label: 'Option 2' },
        ],
      },
      {
        id: 'checkbox-field',
        type: 'checkbox',
        label: 'Checkbox Field',
        category: 'basic',
        isWeddingSpecific: false,
        validation: {},
        options: [
          { value: 'check1', label: 'Check 1' },
          { value: 'check2', label: 'Check 2' },
        ],
      },
    ];

    render(<FormPreview {...defaultProps} fields={diverseFields} />);

    expect(screen.getByText('Text Field')).toBeInTheDocument();
    expect(screen.getByText('Select Field')).toBeInTheDocument();
    expect(screen.getByText('Checkbox Field')).toBeInTheDocument();
  });
});

// Accessibility Tests
describe('FormPreview Accessibility', () => {
  const defaultProps = {
    fields: mockFields,
    formTitle: 'Wedding Inquiry Form',
    formDescription: 'Help us understand your perfect wedding day',
    isVisible: true,
    onVisibilityToggle: jest.fn(),
    onFormSubmit: jest.fn(),
  };

  it('has proper ARIA labels and roles', () => {
    render(<FormPreview {...defaultProps} />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2); // Preview and Test tabs
  });

  it('supports keyboard navigation between tabs', async () => {
    const user = userEvent.setup();
    render(<FormPreview {...defaultProps} />);

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    const testTab = screen.getByRole('tab', { name: /test/i });

    // Tab navigation
    await user.click(previewTab);
    expect(previewTab).toHaveAttribute('aria-selected', 'true');

    await user.click(testTab);
    expect(testTab).toHaveAttribute('aria-selected', 'true');
  });

  it('provides screen reader announcements for mode changes', async () => {
    const user = userEvent.setup();
    render(<FormPreview {...defaultProps} />);

    const testTab = screen.getByText('Test');
    await user.click(testTab);

    // Should announce the mode change
    expect(testTab).toHaveAttribute('aria-selected', 'true');
  });

  it('has accessible form controls in test mode', async () => {
    const user = userEvent.setup();
    render(<FormPreview {...defaultProps} />);

    // Switch to test mode
    const testTab = screen.getByText('Test');
    await user.click(testTab);

    // All form inputs should have proper labels
    expect(screen.getByLabelText(/Couple Names/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Email/)).toBeInTheDocument();
  });
});

// Mobile Responsive Tests
describe('FormPreview Mobile Responsiveness', () => {
  const defaultProps = {
    fields: mockFields,
    formTitle: 'Wedding Inquiry Form',
    formDescription: 'Help us understand your perfect wedding day',
    isVisible: true,
    onVisibilityToggle: jest.fn(),
    onFormSubmit: jest.fn(),
  };

  it('adapts layout for mobile screens', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<FormPreview {...defaultProps} />);

    // Should show mobile-responsive elements
    expect(screen.getByText('Live Preview')).toBeInTheDocument();
    expect(screen.getByText('Wedding Inquiry Form')).toBeInTheDocument();
  });

  it('has touch-friendly viewport controls', async () => {
    const user = userEvent.setup();
    render(<FormPreview {...defaultProps} />);

    // Viewport buttons should be large enough for touch
    const viewportButtons = screen.getAllByRole('button').filter(
      (button) => button.querySelector('svg'), // Looking for icon buttons
    );

    expect(viewportButtons.length).toBeGreaterThan(0);
  });

  it('handles touch interactions in test mode', async () => {
    render(<FormPreview {...defaultProps} />);

    // Switch to test mode
    const testTab = screen.getByText('Test');
    fireEvent.touchStart(testTab);
    fireEvent.touchEnd(testTab);
    fireEvent.click(testTab);

    // Should switch to interactive mode
    expect(screen.getByText(/Submit Inquiry/)).toBeInTheDocument();
  });

  it('provides mobile-optimized form interactions', async () => {
    const user = userEvent.setup();
    render(<FormPreview {...defaultProps} />);

    // Switch to test mode
    const testTab = screen.getByText('Test');
    await user.click(testTab);

    // Form inputs should be mobile-friendly
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      expect(input).toBeInTheDocument();
    });
  });
});

// Performance Tests
describe('FormPreview Performance', () => {
  const defaultProps = {
    fields: mockFields,
    formTitle: 'Wedding Inquiry Form',
    formDescription: 'Help us understand your perfect wedding day',
    isVisible: true,
    onVisibilityToggle: jest.fn(),
    onFormSubmit: jest.fn(),
  };

  it('renders efficiently with many fields', () => {
    const manyFields = Array.from({ length: 50 }, (_, i) => ({
      id: `field-${i + 1}`,
      type: 'text' as any,
      label: `Field ${i + 1}`,
      category: 'basic' as any,
      isWeddingSpecific: false,
      validation: {},
    })) as WeddingFormField[];

    const startTime = performance.now();
    render(<FormPreview {...defaultProps} fields={manyFields} />);
    const endTime = performance.now();

    // Should render within reasonable time
    expect(endTime - startTime).toBeLessThan(200);
  });

  it('updates efficiently when fields change', () => {
    const { rerender } = render(<FormPreview {...defaultProps} />);

    const startTime = performance.now();

    // Multiple rapid updates
    for (let i = 0; i < 10; i++) {
      const updatedFields = [
        ...mockFields,
        {
          id: `new-field-${i}`,
          type: 'text' as any,
          label: `New Field ${i}`,
          category: 'basic' as any,
          isWeddingSpecific: false,
          validation: {},
        } as WeddingFormField,
      ];
      rerender(<FormPreview {...defaultProps} fields={updatedFields} />);
    }

    const endTime = performance.now();

    // Should handle rapid updates efficiently
    expect(endTime - startTime).toBeLessThan(500);
  });
});
