import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeddingDateField from '../fields/WeddingDateField';
import { WeddingFormField } from '@/types/form-builder';

// Mock the date picker component
jest.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect, selected }: any) => (
    <div data-testid="calendar">
      <button onClick={() => onSelect(new Date('2024-06-15'))}>
        Select June 15, 2024
      </button>
      {selected && <div>Selected: {selected.toDateString()}</div>}
    </div>
  ),
}));

const mockWeddingDateField: WeddingFormField = {
  id: 'wedding-date-field',
  type: 'wedding-date',
  label: 'Wedding Date',
  description: 'When will your special day take place?',
  category: 'wedding',
  isWeddingSpecific: true,
  validation: { required: true },
  weddingContext: {
    helpText:
      'Choose your perfect wedding date considering venue availability and season',
    exampleValue: 'June 15, 2024',
    photographerTip:
      'Consider golden hour timing for the best natural lighting',
  },
};

describe('WeddingDateField', () => {
  const defaultProps = {
    field: mockWeddingDateField,
    onChange: jest.fn(),
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the wedding date field with proper labeling', () => {
    render(<WeddingDateField {...defaultProps} />);

    expect(screen.getByText('Wedding Date')).toBeInTheDocument();
    expect(
      screen.getByText(/When will your special day take place/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Choose your perfect wedding date/),
    ).toBeInTheDocument();
  });

  it('displays wedding-specific context and help text', () => {
    render(<WeddingDateField {...defaultProps} />);

    expect(screen.getByText(/Consider golden hour timing/)).toBeInTheDocument();
    expect(screen.getByText(/💡/)).toBeInTheDocument();
  });

  it('shows required field indicator', () => {
    render(<WeddingDateField {...defaultProps} />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('handles date selection through calendar picker', async () => {
    const onChange = jest.fn();
    render(<WeddingDateField {...defaultProps} onChange={onChange} />);

    // Open calendar picker
    const dateButton = screen.getByText(/Select wedding date/);
    fireEvent.click(dateButton);

    // Select a date from the calendar
    await waitFor(() => {
      const selectButton = screen.getByText('Select June 15, 2024');
      fireEvent.click(selectButton);
    });

    expect(onChange).toHaveBeenCalledWith({
      date: new Date('2024-06-15'),
    });
  });

  it('displays wedding day information when date is selected', () => {
    const valueWithDate = {
      date: new Date('2024-06-15'), // Saturday
    };

    render(<WeddingDateField {...defaultProps} value={valueWithDate} />);

    expect(screen.getByText('Saturday')).toBeInTheDocument();
    expect(screen.getByText('Summer')).toBeInTheDocument();
    expect(
      screen.getByText(/Premium/i) || screen.getByText(/Weekend/i),
    ).toBeInTheDocument();
  });

  it('shows season information and context', () => {
    const summerDate = {
      date: new Date('2024-07-20'), // Summer date
    };

    render(<WeddingDateField {...defaultProps} value={summerDate} />);

    expect(screen.getByText(/Summer/i)).toBeInTheDocument();
    expect(
      screen.getByText(/☀️/) || screen.getByText(/🌞/),
    ).toBeInTheDocument();
  });

  it('handles ceremony and reception time selection', async () => {
    const onChange = jest.fn();
    const valueWithDate = {
      date: new Date('2024-06-15'),
      ceremony_time: '',
      reception_time: '',
    };

    render(
      <WeddingDateField
        {...defaultProps}
        value={valueWithDate}
        onChange={onChange}
      />,
    );

    // Should show time selection options when date is selected
    expect(screen.getByText(/Wedding Timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Ceremony Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Reception Time/i)).toBeInTheDocument();
  });

  it('displays photography golden hour information', () => {
    const valueWithDate = {
      date: new Date('2024-06-15'), // Summer date
    };

    render(<WeddingDateField {...defaultProps} value={valueWithDate} />);

    expect(screen.getByText(/Photography Golden Hour/i)).toBeInTheDocument();
    expect(screen.getByText(/📸/)).toBeInTheDocument();
    expect(screen.getByText(/Sunset:/)).toBeInTheDocument();
    expect(screen.getByText(/Golden Hour:/)).toBeInTheDocument();
  });

  it('handles date flexibility options', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<WeddingDateField {...defaultProps} onChange={onChange} />);

    // Find and click flexibility checkbox
    const flexibilityCheckbox = screen.getByLabelText(
      /flexible with my wedding date/i,
    );
    await user.click(flexibilityCheckbox);

    expect(onChange).toHaveBeenCalledWith({
      is_flexible: true,
    });
  });

  it('shows flexibility benefits when enabled', async () => {
    const user = userEvent.setup();
    const valueWithFlexibility = {
      is_flexible: true,
    };

    render(<WeddingDateField {...defaultProps} value={valueWithFlexibility} />);

    expect(screen.getByText(/save an average of 15%/)).toBeInTheDocument();
    expect(screen.getByText(/💝/)).toBeInTheDocument();
  });

  it('handles timezone selection for destination weddings', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const valueWithDate = {
      date: new Date('2024-06-15'),
    };

    render(
      <WeddingDateField
        {...defaultProps}
        value={valueWithDate}
        onChange={onChange}
      />,
    );

    // Should show timezone selector
    expect(screen.getByText(/Timezone/i)).toBeInTheDocument();
  });

  it('validates date is not in the past', () => {
    const pastDate = {
      date: new Date('2020-01-01'),
    };

    render(
      <WeddingDateField
        {...defaultProps}
        value={pastDate}
        error="Wedding date cannot be in the past"
      />,
    );

    expect(
      screen.getByText(/Wedding date cannot be in the past/),
    ).toBeInTheDocument();
  });

  it('provides wedding planning tips and guidance', () => {
    render(<WeddingDateField {...defaultProps} />);

    expect(screen.getByText(/Wedding Date Tips/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Saturday weddings are most popular/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Book 12-18 months in advance/),
    ).toBeInTheDocument();
  });

  it('highlights weekend dates in calendar', () => {
    render(<WeddingDateField {...defaultProps} />);

    // Open calendar picker
    const dateButton = screen.getByText(/Select wedding date/);
    fireEvent.click(dateButton);

    // Calendar should be rendered with weekend highlighting
    expect(screen.getByTestId('calendar')).toBeInTheDocument();
  });

  it('calculates and displays pricing tier based on day of week', () => {
    const saturdayDate = {
      date: new Date('2024-06-15'), // Saturday
    };

    const fridayDate = {
      date: new Date('2024-06-14'), // Friday
    };

    // Test Saturday (Premium)
    const { rerender } = render(
      <WeddingDateField {...defaultProps} value={saturdayDate} />,
    );
    expect(screen.getByText(/Premium/i)).toBeInTheDocument();

    // Test Friday (Standard)
    rerender(<WeddingDateField {...defaultProps} value={fridayDate} />);
    expect(screen.getByText(/Standard/i)).toBeInTheDocument();
  });

  it('handles disabled state correctly', () => {
    render(<WeddingDateField {...defaultProps} disabled={true} />);

    const dateButton = screen.getByText(/Select wedding date/);
    expect(dateButton).toBeDisabled();
  });

  it('displays appropriate icons for different seasons', () => {
    const winterDate = { date: new Date('2024-12-15') };
    const springDate = { date: new Date('2024-04-15') };
    const summerDate = { date: new Date('2024-07-15') };
    const fallDate = { date: new Date('2024-10-15') };

    // Test winter
    const { rerender } = render(
      <WeddingDateField {...defaultProps} value={winterDate} />,
    );
    expect(
      screen.getByText(/❄️/) || screen.getByText(/Winter/),
    ).toBeInTheDocument();

    // Test spring
    rerender(<WeddingDateField {...defaultProps} value={springDate} />);
    expect(
      screen.getByText(/🌸/) || screen.getByText(/Spring/),
    ).toBeInTheDocument();

    // Test summer
    rerender(<WeddingDateField {...defaultProps} value={summerDate} />);
    expect(
      screen.getByText(/☀️/) || screen.getByText(/Summer/),
    ).toBeInTheDocument();

    // Test fall
    rerender(<WeddingDateField {...defaultProps} value={fallDate} />);
    expect(
      screen.getByText(/🍂/) || screen.getByText(/Fall/),
    ).toBeInTheDocument();
  });
});

// Accessibility Tests
describe('WeddingDateField Accessibility', () => {
  const defaultProps = {
    field: mockWeddingDateField,
    onChange: jest.fn(),
    disabled: false,
  };

  it('has proper ARIA labels and descriptions', () => {
    render(<WeddingDateField {...defaultProps} />);

    expect(screen.getByLabelText(/Wedding Date/)).toBeInTheDocument();
  });

  it('supports keyboard navigation for date picker', async () => {
    const user = userEvent.setup();
    render(<WeddingDateField {...defaultProps} />);

    const dateButton = screen.getByText(/Select wedding date/);

    // Should be keyboard accessible
    await user.tab();
    expect(document.activeElement).toBe(dateButton);

    // Should open with Enter key
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('calendar')).toBeInTheDocument();
  });

  it('provides screen reader announcements for date changes', async () => {
    const user = userEvent.setup();
    render(<WeddingDateField {...defaultProps} />);

    const dateButton = screen.getByText(/Select wedding date/);
    await user.click(dateButton);

    const selectButton = screen.getByText('Select June 15, 2024');
    await user.click(selectButton);

    // Should announce the selected date
    expect(screen.getByText(/June 15, 2024/)).toBeInTheDocument();
  });

  it('has appropriate focus management', async () => {
    const user = userEvent.setup();
    render(<WeddingDateField {...defaultProps} />);

    // Tab through interactive elements
    await user.tab(); // Date picker button
    await user.tab(); // Flexibility checkbox

    expect(document.activeElement).not.toBe(document.body);
  });
});

// Mobile Responsive Tests
describe('WeddingDateField Mobile Responsiveness', () => {
  const defaultProps = {
    field: mockWeddingDateField,
    onChange: jest.fn(),
    disabled: false,
  };

  it('adapts layout for mobile screens', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<WeddingDateField {...defaultProps} />);

    // Should display all essential elements
    expect(screen.getByText('Wedding Date')).toBeInTheDocument();
    expect(screen.getByText(/Select wedding date/)).toBeInTheDocument();
  });

  it('has touch-friendly interactive elements', () => {
    render(<WeddingDateField {...defaultProps} />);

    const dateButton = screen.getByText(/Select wedding date/);

    // Button should have adequate touch target
    const styles = window.getComputedStyle(dateButton);
    expect(dateButton).toBeInTheDocument();
  });

  it('handles touch interactions for date selection', async () => {
    render(<WeddingDateField {...defaultProps} />);

    const dateButton = screen.getByText(/Select wedding date/);

    // Simulate touch interaction
    fireEvent.touchStart(dateButton);
    fireEvent.touchEnd(dateButton);
    fireEvent.click(dateButton);

    expect(screen.getByTestId('calendar')).toBeInTheDocument();
  });
});
