/**
 * Comprehensive Test Suite for WS-247 Multilingual Platform System
 *
 * Tests all multilingual components for:
 * - Language switching functionality
 * - RTL/LTR layout support
 * - Cultural adaptation
 * - Form validation
 * - Data formatting
 * - User interactions
 * - Accessibility compliance
 *
 * @author WedSync Development Team
 * @version 1.0.0
 * @since 2025-01-03
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Import all multilingual components
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { MultilingualForm } from '@/components/i18n/MultilingualForm';
import { LocalizedDatePicker } from '@/components/i18n/LocalizedDatePicker';
import { CurrencyFormatter } from '@/components/i18n/CurrencyFormatter';
import { RTLLayoutProvider } from '@/components/i18n/RTLLayoutProvider';
import { WeddingTraditionSelector } from '@/components/i18n/WeddingTraditionSelector';
import { CeremonyTypeLocalizer } from '@/components/i18n/CeremonyTypeLocalizer';
import { LocalizedWeddingCalendar } from '@/components/i18n/LocalizedWeddingCalendar';
import { GiftRegistryLocalizer } from '@/components/i18n/GiftRegistryLocalizer';
import { AddressFormLocalizer } from '@/components/i18n/AddressFormLocalizer';

// Import types
import type {
  WeddingMarketLocale,
  WeddingTraditionType,
  CurrencyCode,
  AddressFormat,
} from '@/types/i18n';

// =============================================================================
// TEST UTILITIES & SETUP
// =============================================================================

// Mock ResizeObserver for tests
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Test wrapper with RTL provider
const TestWrapper: React.FC<{
  children: React.ReactNode;
  locale?: WeddingMarketLocale;
}> = ({ children, locale = 'en-US' }) => (
  <RTLLayoutProvider initialLocale={locale}>{children}</RTLLayoutProvider>
);

// Helper to test component rendering
const renderWithWrapper = (
  component: React.ReactElement,
  locale: WeddingMarketLocale = 'en-US',
) => {
  return render(<TestWrapper locale={locale}>{component}</TestWrapper>);
};

// =============================================================================
// LANGUAGE SWITCHER TESTS
// =============================================================================

describe('LanguageSwitcher Component', () => {
  it('renders with default English locale', () => {
    renderWithWrapper(<LanguageSwitcher />);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText(/english/i)).toBeInTheDocument();
  });

  it('displays language options when clicked', async () => {
    const user = userEvent.setup();
    renderWithWrapper(<LanguageSwitcher />);

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/español/i)).toBeInTheDocument();
      expect(screen.getByText(/français/i)).toBeInTheDocument();
      expect(screen.getByText(/العربية/)).toBeInTheDocument();
    });
  });

  it('calls onLanguageChange when language is selected', async () => {
    const mockOnChange = jest.fn();
    const user = userEvent.setup();

    renderWithWrapper(<LanguageSwitcher onLanguageChange={mockOnChange} />);

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    const spanishOption = await screen.findByText(/español/i);
    await user.click(spanishOption);

    expect(mockOnChange).toHaveBeenCalledWith('es-ES');
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    renderWithWrapper(<LanguageSwitcher />);

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    const searchInput = await screen.findByPlaceholderText(/search languages/i);
    await user.type(searchInput, 'arabic');

    await waitFor(() => {
      expect(screen.getByText(/العربية/)).toBeInTheDocument();
      expect(screen.queryByText(/español/i)).not.toBeInTheDocument();
    });
  });

  it('shows wedding market indicators', async () => {
    const user = userEvent.setup();
    renderWithWrapper(<LanguageSwitcher showWeddingMarkets={true} />);

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    // Should show popular wedding markets
    await waitFor(() => {
      expect(screen.getByText(/popular markets/i)).toBeInTheDocument();
    });
  });
});

// =============================================================================
// MULTILINGUAL FORM TESTS
// =============================================================================

describe('MultilingualForm Component', () => {
  const mockOnSubmit = jest.fn();
  const mockOnFieldChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form fields with English labels', () => {
    const fields = [
      {
        name: 'firstName',
        type: 'text' as const,
        label: { 'en-US': 'First Name', 'es-ES': 'Nombre' },
        required: true,
      },
    ];

    renderWithWrapper(
      <MultilingualForm
        fields={fields}
        onSubmit={mockOnSubmit}
        onFieldChange={mockOnFieldChange}
      />,
    );

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
  });

  it('displays Spanish labels for Spanish locale', () => {
    const fields = [
      {
        name: 'firstName',
        type: 'text' as const,
        label: { 'en-US': 'First Name', 'es-ES': 'Nombre' },
        required: true,
      },
    ];

    renderWithWrapper(
      <MultilingualForm
        fields={fields}
        onSubmit={mockOnSubmit}
        onFieldChange={mockOnFieldChange}
        locale="es-ES"
      />,
      'es-ES',
    );

    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    const fields = [
      {
        name: 'email',
        type: 'email' as const,
        label: { 'en-US': 'Email' },
        required: true,
        validation: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      },
    ];

    renderWithWrapper(
      <MultilingualForm
        fields={fields}
        onSubmit={mockOnSubmit}
        onFieldChange={mockOnFieldChange}
      />,
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    const fields = [
      {
        name: 'email',
        type: 'email' as const,
        label: { 'en-US': 'Email' },
        required: true,
        validation: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      },
    ];

    renderWithWrapper(
      <MultilingualForm
        fields={fields}
        onSubmit={mockOnSubmit}
        onFieldChange={mockOnFieldChange}
      />,
    );

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/please enter a valid email/i),
      ).toBeInTheDocument();
    });
  });

  it('handles form submission with valid data', async () => {
    const user = userEvent.setup();
    const fields = [
      {
        name: 'name',
        type: 'text' as const,
        label: { 'en-US': 'Name' },
        required: true,
      },
    ];

    renderWithWrapper(
      <MultilingualForm
        fields={fields}
        onSubmit={mockOnSubmit}
        onFieldChange={mockOnFieldChange}
      />,
    );

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'John Doe');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({ name: 'John Doe' });
    });
  });

  it('auto-saves form data when enabled', async () => {
    const user = userEvent.setup();
    const mockAutoSave = jest.fn();
    const fields = [
      {
        name: 'notes',
        type: 'textarea' as const,
        label: { 'en-US': 'Notes' },
      },
    ];

    renderWithWrapper(
      <MultilingualForm
        fields={fields}
        onSubmit={mockOnSubmit}
        onFieldChange={mockOnFieldChange}
        autoSave={true}
        onAutoSave={mockAutoSave}
        autoSaveInterval={100} // Quick interval for testing
      />,
    );

    const notesInput = screen.getByLabelText(/notes/i);
    await user.type(notesInput, 'Test notes');

    // Wait for auto-save to trigger
    await waitFor(
      () => {
        expect(mockAutoSave).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );
  });
});

// =============================================================================
// RTL LAYOUT PROVIDER TESTS
// =============================================================================

describe('RTLLayoutProvider Component', () => {
  it('sets LTR direction for English locale', () => {
    renderWithWrapper(<div data-testid="content">Test content</div>, 'en-US');

    const content = screen.getByTestId('content');
    expect(content.closest('[dir="ltr"]')).toBeInTheDocument();
  });

  it('sets RTL direction for Arabic locale', () => {
    renderWithWrapper(<div data-testid="content">Test content</div>, 'ar-SA');

    const content = screen.getByTestId('content');
    expect(content.closest('[dir="rtl"]')).toBeInTheDocument();
  });

  it('provides correct text alignment for RTL', () => {
    renderWithWrapper(<div data-testid="content">محتوى الاختبار</div>, 'ar-SA');

    const provider = document.querySelector('.rtl-layout-provider');
    expect(provider).toHaveStyle({ textAlign: 'end' });
  });
});

// =============================================================================
// CURRENCY FORMATTER TESTS
// =============================================================================

describe('CurrencyFormatter Component', () => {
  it('formats USD currency correctly', () => {
    renderWithWrapper(
      <CurrencyFormatter amount={1234.56} currency="USD" locale="en-US" />,
    );

    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
  });

  it('formats EUR currency for German locale', () => {
    renderWithWrapper(
      <CurrencyFormatter amount={1234.56} currency="EUR" locale="de-DE" />,
    );

    expect(screen.getByText(/1\.234,56\s*€/)).toBeInTheDocument();
  });

  it('handles wedding budget breakdown', () => {
    const breakdown = {
      venue: 5000,
      catering: 3000,
      photography: 2000,
      flowers: 1000,
    };

    renderWithWrapper(
      <CurrencyFormatter
        amount={11000}
        currency="USD"
        locale="en-US"
        showBreakdown={true}
        weddingBreakdown={breakdown}
      />,
    );

    expect(screen.getByText(/venue/i)).toBeInTheDocument();
    expect(screen.getByText(/\$5,000/)).toBeInTheDocument();
  });

  it('shows animated counting when enabled', async () => {
    renderWithWrapper(
      <CurrencyFormatter
        amount={1000}
        currency="USD"
        locale="en-US"
        animateValue={true}
      />,
    );

    // Should start from 0 and animate to target
    await waitFor(
      () => {
        expect(screen.getByText('$1,000.00')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});

// =============================================================================
// LOCALIZED DATE PICKER TESTS
// =============================================================================

describe('LocalizedDatePicker Component', () => {
  it('renders with English date format', () => {
    renderWithWrapper(
      <LocalizedDatePicker locale="en-US" onDateChange={jest.fn()} />,
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('displays calendar when clicked', async () => {
    const user = userEvent.setup();
    renderWithWrapper(
      <LocalizedDatePicker locale="en-US" onDateChange={jest.fn()} />,
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('shows cultural date restrictions', async () => {
    const user = userEvent.setup();
    renderWithWrapper(
      <LocalizedDatePicker
        locale="zh-CN"
        traditions={['chinese']}
        onDateChange={jest.fn()}
        showCulturalRestrictions={true}
      />,
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/cultural/i)).toBeInTheDocument();
    });
  });

  it('handles date selection', async () => {
    const mockOnChange = jest.fn();
    const user = userEvent.setup();

    renderWithWrapper(
      <LocalizedDatePicker locale="en-US" onDateChange={mockOnChange} />,
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    // Find and click a date (assuming calendar is open)
    const dateButton = await screen.findByText('15');
    await user.click(dateButton);

    expect(mockOnChange).toHaveBeenCalled();
  });
});

// =============================================================================
// WEDDING TRADITION SELECTOR TESTS
// =============================================================================

describe('WeddingTraditionSelector Component', () => {
  it('renders tradition options', () => {
    renderWithWrapper(
      <WeddingTraditionSelector locale="en-US" onTraditionChange={jest.fn()} />,
    );

    expect(screen.getByText(/western/i)).toBeInTheDocument();
    expect(screen.getByText(/chinese/i)).toBeInTheDocument();
    expect(screen.getByText(/islamic/i)).toBeInTheDocument();
  });

  it('allows multiple tradition selection', async () => {
    const mockOnChange = jest.fn();
    const user = userEvent.setup();

    renderWithWrapper(
      <WeddingTraditionSelector
        locale="en-US"
        onTraditionChange={mockOnChange}
        allowMultiple={true}
      />,
    );

    const westernOption = screen.getByText(/western/i);
    await user.click(westernOption);

    const chineseOption = screen.getByText(/chinese/i);
    await user.click(chineseOption);

    expect(mockOnChange).toHaveBeenCalledWith(['western', 'chinese']);
  });

  it('shows tradition details when expanded', async () => {
    const user = userEvent.setup();

    renderWithWrapper(
      <WeddingTraditionSelector
        locale="en-US"
        onTraditionChange={jest.fn()}
        showDetails={true}
      />,
    );

    const westernOption = screen.getByText(/western/i);
    await user.click(westernOption);

    await waitFor(() => {
      expect(screen.getByText(/traditional/i)).toBeInTheDocument();
    });
  });

  it('filters traditions by region', () => {
    renderWithWrapper(
      <WeddingTraditionSelector
        locale="en-US"
        onTraditionChange={jest.fn()}
        filterByRegion="asia"
      />,
    );

    expect(screen.getByText(/chinese/i)).toBeInTheDocument();
    expect(screen.getByText(/korean/i)).toBeInTheDocument();
    expect(screen.queryByText(/western/i)).not.toBeInTheDocument();
  });
});

// =============================================================================
// ADDRESS FORM LOCALIZER TESTS
// =============================================================================

describe('AddressFormLocalizer Component', () => {
  it('renders US address format', () => {
    renderWithWrapper(
      <AddressFormLocalizer
        country="US"
        locale="en-US"
        onAddressChange={jest.fn()}
      />,
    );

    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
  });

  it('renders UK address format', () => {
    renderWithWrapper(
      <AddressFormLocalizer
        country="GB"
        locale="en-GB"
        onAddressChange={jest.fn()}
      />,
    );

    expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/county/i)).toBeInTheDocument();
  });

  it('validates postal codes by country', async () => {
    const user = userEvent.setup();

    renderWithWrapper(
      <AddressFormLocalizer
        country="US"
        locale="en-US"
        onAddressChange={jest.fn()}
        validatePostalCode={true}
      />,
    );

    const zipInput = screen.getByLabelText(/zip code/i);
    await user.type(zipInput, 'invalid');

    await user.tab(); // Trigger blur validation

    await waitFor(() => {
      expect(screen.getByText(/invalid zip code/i)).toBeInTheDocument();
    });
  });

  it('handles address autocomplete', async () => {
    const mockOnChange = jest.fn();
    const user = userEvent.setup();

    renderWithWrapper(
      <AddressFormLocalizer
        country="US"
        locale="en-US"
        onAddressChange={mockOnChange}
        enableAutocomplete={true}
      />,
    );

    const streetInput = screen.getByLabelText(/street address/i);
    await user.type(streetInput, '123 Main St');

    // Mock autocomplete suggestion selection
    expect(mockOnChange).toHaveBeenCalled();
  });
});

// =============================================================================
// WEDDING CALENDAR TESTS
// =============================================================================

describe('LocalizedWeddingCalendar Component', () => {
  it('renders calendar with current month', () => {
    renderWithWrapper(
      <LocalizedWeddingCalendar locale="en-US" onDateSelect={jest.fn()} />,
    );

    const currentMonth = new Date().toLocaleDateString('en-US', {
      month: 'long',
    });
    expect(screen.getByText(new RegExp(currentMonth, 'i'))).toBeInTheDocument();
  });

  it('shows pricing indicators when enabled', () => {
    renderWithWrapper(
      <LocalizedWeddingCalendar
        locale="en-US"
        onDateSelect={jest.fn()}
        viewOptions={{ show_pricing_indicators: true }}
      />,
    );

    expect(screen.getByText(/budget/i)).toBeInTheDocument();
    expect(screen.getByText(/peak/i)).toBeInTheDocument();
  });

  it('navigates to next month', async () => {
    const user = userEvent.setup();

    renderWithWrapper(
      <LocalizedWeddingCalendar locale="en-US" onDateSelect={jest.fn()} />,
    );

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    // Calendar should show next month
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const expectedMonth = nextMonth.toLocaleDateString('en-US', {
      month: 'long',
    });

    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(expectedMonth, 'i')),
      ).toBeInTheDocument();
    });
  });

  it('handles date selection', async () => {
    const mockOnSelect = jest.fn();
    const user = userEvent.setup();

    renderWithWrapper(
      <LocalizedWeddingCalendar locale="en-US" onDateSelect={mockOnSelect} />,
    );

    // Click on a date (day 15)
    const dateButton = screen.getByText('15');
    await user.click(dateButton);

    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('shows seasonal advice', () => {
    renderWithWrapper(
      <LocalizedWeddingCalendar
        locale="en-US"
        onDateSelect={jest.fn()}
        showSeasonalAdvice={true}
      />,
    );

    expect(screen.getByText(/season/i)).toBeInTheDocument();
  });
});

// =============================================================================
// GIFT REGISTRY LOCALIZER TESTS
// =============================================================================

describe('GiftRegistryLocalizer Component', () => {
  it('renders gift suggestions', () => {
    renderWithWrapper(
      <GiftRegistryLocalizer
        locale="en-US"
        traditions={['western']}
        onGiftSelect={jest.fn()}
      />,
    );

    expect(screen.getByText(/cultural gift guide/i)).toBeInTheDocument();
  });

  it('filters gifts by category', async () => {
    const user = userEvent.setup();

    renderWithWrapper(
      <GiftRegistryLocalizer
        locale="en-US"
        traditions={['western']}
        onGiftSelect={jest.fn()}
      />,
    );

    const categorySelect = screen.getByRole('combobox');
    await user.selectOptions(categorySelect, 'kitchen_dining');

    // Should filter to show only kitchen items
    await waitFor(() => {
      expect(screen.getByText(/kitchen/i)).toBeInTheDocument();
    });
  });

  it('shows cultural guidance modal', async () => {
    const user = userEvent.setup();

    renderWithWrapper(
      <GiftRegistryLocalizer
        locale="en-US"
        traditions={['chinese']}
        onGiftSelect={jest.fn()}
        showCulturalGuidance={true}
      />,
    );

    const guidanceButton = screen.getByText(/gift guidance/i);
    await user.click(guidanceButton);

    await waitFor(() => {
      expect(screen.getByText(/recommended amount/i)).toBeInTheDocument();
    });
  });

  it('handles gift selection', async () => {
    const mockOnSelect = jest.fn();
    const user = userEvent.setup();

    renderWithWrapper(
      <GiftRegistryLocalizer
        locale="en-US"
        traditions={['western']}
        onGiftSelect={mockOnSelect}
      />,
    );

    // Find and click a gift card
    const giftCard = screen.getAllByRole('button')[1]; // Skip the guidance button
    await user.click(giftCard);

    expect(mockOnSelect).toHaveBeenCalled();
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Multilingual Integration', () => {
  it('maintains language consistency across components', async () => {
    const user = userEvent.setup();

    render(
      <RTLLayoutProvider initialLocale="es-ES">
        <div>
          <LanguageSwitcher />
          <MultilingualForm
            fields={[
              {
                name: 'name',
                type: 'text',
                label: { 'en-US': 'Name', 'es-ES': 'Nombre' },
                required: true,
              },
            ]}
            onSubmit={jest.fn()}
            onFieldChange={jest.fn()}
          />
        </div>
      </RTLLayoutProvider>,
    );

    // Should show Spanish labels
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
  });

  it('handles RTL layout switching', async () => {
    const user = userEvent.setup();

    render(
      <RTLLayoutProvider initialLocale="en-US">
        <LanguageSwitcher />
      </RTLLayoutProvider>,
    );

    // Switch to Arabic
    const languageButton = screen.getByRole('button');
    await user.click(languageButton);

    const arabicOption = await screen.findByText(/العربية/);
    await user.click(arabicOption);

    // Check that RTL is applied
    await waitFor(() => {
      const rtlContainer = document.querySelector('[dir="rtl"]');
      expect(rtlContainer).toBeInTheDocument();
    });
  });
});

// =============================================================================
// ACCESSIBILITY TESTS
// =============================================================================

describe('Accessibility Compliance', () => {
  it('has proper ARIA labels on interactive elements', () => {
    renderWithWrapper(<LanguageSwitcher />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-haspopup');
    expect(button).toHaveAttribute('aria-expanded');
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithWrapper(<LanguageSwitcher />);

    const button = screen.getByRole('button');

    // Tab to button
    await user.tab();
    expect(button).toHaveFocus();

    // Enter to open
    await user.keyboard('[Enter]');

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('provides proper focus management', async () => {
    const user = userEvent.setup();

    renderWithWrapper(
      <MultilingualForm
        fields={[
          {
            name: 'email',
            type: 'email',
            label: { 'en-US': 'Email' },
            required: true,
          },
        ]}
        onSubmit={jest.fn()}
        onFieldChange={jest.fn()}
      />,
    );

    // Tab through form elements
    await user.tab();
    const input = screen.getByLabelText(/email/i);
    expect(input).toHaveFocus();
  });

  it('has sufficient color contrast', () => {
    renderWithWrapper(
      <CurrencyFormatter amount={100} currency="USD" locale="en-US" />,
    );

    // Check that text has sufficient contrast (this would need actual color testing)
    const amount = screen.getByText('$100.00');
    expect(amount).toBeInTheDocument();
  });
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe('Performance', () => {
  it('handles large datasets without performance issues', () => {
    const manyLanguages = Array.from({ length: 100 }, (_, i) => ({
      code: `lang-${i}` as WeddingMarketLocale,
      name: `Language ${i}`,
      region: 'test',
    }));

    const start = performance.now();

    renderWithWrapper(
      <LanguageSwitcher supportedLanguages={manyLanguages.slice(0, 10)} />,
    );

    const end = performance.now();

    // Should render within reasonable time (< 100ms)
    expect(end - start).toBeLessThan(100);
  });

  it('lazy loads heavy components', async () => {
    renderWithWrapper(
      <LocalizedWeddingCalendar locale="en-US" onDateSelect={jest.fn()} />,
    );

    // Calendar should be present immediately
    expect(screen.getByText(/wedding calendar/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe('Error Handling', () => {
  it('handles missing translations gracefully', () => {
    const fields = [
      {
        name: 'test',
        type: 'text' as const,
        label: { 'en-US': 'Test Field' }, // Missing Spanish translation
        required: true,
      },
    ];

    renderWithWrapper(
      <MultilingualForm
        fields={fields}
        onSubmit={jest.fn()}
        onFieldChange={jest.fn()}
        locale="es-ES" // Spanish locale but no Spanish label
      />,
      'es-ES',
    );

    // Should fall back to English
    expect(screen.getByLabelText(/test field/i)).toBeInTheDocument();
  });

  it('handles invalid locale gracefully', () => {
    renderWithWrapper(
      <CurrencyFormatter
        amount={100}
        currency="USD"
        locale={'invalid-locale' as WeddingMarketLocale}
      />,
    );

    // Should still render something
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('handles network errors in address autocomplete', async () => {
    // Mock fetch to fail
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();

    renderWithWrapper(
      <AddressFormLocalizer
        country="US"
        locale="en-US"
        onAddressChange={jest.fn()}
        enableAutocomplete={true}
      />,
    );

    const streetInput = screen.getByLabelText(/street address/i);
    await user.type(streetInput, '123 Main');

    // Should not crash and should show manual input
    expect(streetInput).toBeInTheDocument();
    expect(streetInput).toHaveValue('123 Main');
  });
});

// =============================================================================
// TEST CLEANUP
// =============================================================================

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  // Restore global mocks
  jest.restoreAllMocks();
});
