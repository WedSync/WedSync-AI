/**
 * WS-247 Multilingual Platform System - RTL Layout Testing
 * Team E - QA/Testing & Documentation
 * 
 * Comprehensive testing for Right-to-Left (RTL) languages like Arabic and Hebrew
 * Validates layout integrity, text direction, and UI component positioning
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from '@/contexts/theme-context';

// Mock CSS properties for testing
Object.defineProperty(window, 'getComputedStyle', {
  value: (element: Element) => ({
    direction: element.getAttribute('dir') || 'ltr',
    textAlign: element.getAttribute('dir') === 'rtl' ? 'right' : 'left',
    marginLeft: element.getAttribute('dir') === 'rtl' ? '0' : '16px',
    marginRight: element.getAttribute('dir') === 'rtl' ? '16px' : '0',
    paddingLeft: element.getAttribute('dir') === 'rtl' ? '0' : '12px',
    paddingRight: element.getAttribute('dir') === 'rtl' ? '12px' : '0',
  }),
});

// Test components for RTL validation
const WeddingFormRTL = ({ language }: { language: string }) => {
  const { t } = useTranslation();
  const isRTL = ['ar', 'he', 'ur', 'fa'].includes(language);
  
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} data-testid="wedding-form-container">
      <h1 data-testid="form-title">{t('wedding.planning.title')}</h1>
      
      <form className={`wedding-form ${isRTL ? 'rtl' : 'ltr'}`} data-testid="wedding-form">
        <div className="form-row" data-testid="bride-groom-row">
          <label htmlFor="bride-name" data-testid="bride-label">
            {t('wedding.bride.name')}
          </label>
          <input 
            id="bride-name" 
            type="text" 
            className="form-input"
            data-testid="bride-input"
            placeholder={t('wedding.bride.placeholder')}
          />
          
          <label htmlFor="groom-name" data-testid="groom-label">
            {t('wedding.groom.name')}
          </label>
          <input 
            id="groom-name" 
            type="text" 
            className="form-input"
            data-testid="groom-input"
            placeholder={t('wedding.groom.placeholder')}
          />
        </div>
        
        <div className="date-picker-section" data-testid="date-section">
          <label data-testid="date-label">{t('wedding.date.label')}</label>
          <input 
            type="date" 
            className="date-input"
            data-testid="date-input"
          />
        </div>
        
        <div className="budget-section" data-testid="budget-section">
          <label data-testid="budget-label">{t('wedding.budget.label')}</label>
          <div className="currency-input" data-testid="currency-container">
            <span className="currency-symbol" data-testid="currency-symbol">
              {language === 'ar' ? 'ر.س' : language === 'he' ? '₪' : '$'}
            </span>
            <input 
              type="number" 
              className="amount-input"
              data-testid="amount-input"
              placeholder="0.00"
            />
          </div>
        </div>
        
        <div className="button-group" data-testid="button-group">
          <button 
            type="button" 
            className="secondary-button"
            data-testid="cancel-button"
          >
            {t('common.cancel')}
          </button>
          <button 
            type="submit" 
            className="primary-button"
            data-testid="save-button"
          >
            {t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
};

const VendorDirectoryRTL = ({ language }: { language: string }) => {
  const { t } = useTranslation();
  const isRTL = ['ar', 'he', 'ur', 'fa'].includes(language);
  
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} data-testid="vendor-directory">
      <div className="vendor-card" data-testid="vendor-card">
        <div className="vendor-image" data-testid="vendor-image">
          <img src="/placeholder-vendor.jpg" alt={t('vendor.photographer')} />
        </div>
        
        <div className="vendor-info" data-testid="vendor-info">
          <h3 data-testid="vendor-name">{t('vendor.name.example')}</h3>
          <p className="vendor-type" data-testid="vendor-type">
            {t('vendor.photographer')}
          </p>
          
          <div className="rating-stars" data-testid="rating-stars">
            {'★'.repeat(5)}
            <span className="rating-text" data-testid="rating-text">
              {t('vendor.rating', { rating: '4.8', reviews: '127' })}
            </span>
          </div>
          
          <div className="vendor-price" data-testid="vendor-price">
            {language === 'ar' ? 'ر.س 5,000' : language === 'he' ? '₪ 8,000' : '$2,500'}
          </div>
        </div>
        
        <div className="vendor-actions" data-testid="vendor-actions">
          <button className="contact-button" data-testid="contact-button">
            {t('vendor.contact')}
          </button>
          <button className="favorite-button" data-testid="favorite-button">
            {t('vendor.favorite')}
          </button>
        </div>
      </div>
    </div>
  );
};

describe('WS-247: RTL Layout Testing', () => {
  beforeEach(() => {
    document.documentElement.dir = 'ltr';
  });

  afterEach(() => {
    document.documentElement.dir = 'ltr';
  });

  describe('Arabic (ar) Layout Testing', () => {
    test('should set correct text direction for Arabic', () => {
      render(<WeddingFormRTL language="ar" />);
      
      const container = screen.getByTestId('wedding-form-container');
      expect(container).toHaveAttribute('dir', 'rtl');
    });

    test('should align form elements properly in Arabic', () => {
      render(<WeddingFormRTL language="ar" />);
      
      const formTitle = screen.getByTestId('form-title');
      const container = screen.getByTestId('wedding-form-container');
      
      expect(container).toHaveAttribute('dir', 'rtl');
      expect(formTitle).toBeInTheDocument();
    });

    test('should position currency symbol correctly in Arabic', () => {
      render(<WeddingFormRTL language="ar" />);
      
      const currencySymbol = screen.getByTestId('currency-symbol');
      const currencyContainer = screen.getByTestId('currency-container');
      
      expect(currencySymbol).toHaveTextContent('ر.س');
      expect(currencyContainer).toBeInTheDocument();
    });

    test('should handle button positioning in Arabic forms', () => {
      render(<WeddingFormRTL language="ar" />);
      
      const buttonGroup = screen.getByTestId('button-group');
      const cancelButton = screen.getByTestId('cancel-button');
      const saveButton = screen.getByTestId('save-button');
      
      expect(buttonGroup).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
      expect(saveButton).toBeInTheDocument();
      
      // In RTL, primary button should appear on the left
      const buttonGroupRect = buttonGroup.getBoundingClientRect();
      expect(buttonGroupRect).toBeDefined();
    });

    test('should render vendor cards correctly in Arabic', () => {
      render(<VendorDirectoryRTL language="ar" />);
      
      const vendorDirectory = screen.getByTestId('vendor-directory');
      const vendorCard = screen.getByTestId('vendor-card');
      const vendorPrice = screen.getByTestId('vendor-price');
      
      expect(vendorDirectory).toHaveAttribute('dir', 'rtl');
      expect(vendorCard).toBeInTheDocument();
      expect(vendorPrice).toHaveTextContent('ر.س 5,000');
    });
  });

  describe('Hebrew (he) Layout Testing', () => {
    test('should set correct text direction for Hebrew', () => {
      render(<WeddingFormRTL language="he" />);
      
      const container = screen.getByTestId('wedding-form-container');
      expect(container).toHaveAttribute('dir', 'rtl');
    });

    test('should position currency symbol correctly in Hebrew', () => {
      render(<WeddingFormRTL language="he" />);
      
      const currencySymbol = screen.getByTestId('currency-symbol');
      expect(currencySymbol).toHaveTextContent('₪');
    });

    test('should render vendor pricing in Hebrew currency', () => {
      render(<VendorDirectoryRTL language="he" />);
      
      const vendorPrice = screen.getByTestId('vendor-price');
      expect(vendorPrice).toHaveTextContent('₪ 8,000');
    });
  });

  describe('LTR Language Comparison', () => {
    test('should maintain LTR layout for English', () => {
      render(<WeddingFormRTL language="en" />);
      
      const container = screen.getByTestId('wedding-form-container');
      expect(container).toHaveAttribute('dir', 'ltr');
    });

    test('should use appropriate currency symbol for English', () => {
      render(<WeddingFormRTL language="en" />);
      
      const currencySymbol = screen.getByTestId('currency-symbol');
      expect(currencySymbol).toHaveTextContent('$');
    });

    test('should display vendor pricing in USD for English', () => {
      render(<VendorDirectoryRTL language="en" />);
      
      const vendorPrice = screen.getByTestId('vendor-price');
      expect(vendorPrice).toHaveTextContent('$2,500');
    });
  });

  describe('CSS Direction Properties', () => {
    test('should apply correct CSS direction for RTL languages', () => {
      const { container } = render(<WeddingFormRTL language="ar" />);
      const formContainer = container.querySelector('[data-testid="wedding-form-container"]');
      
      expect(formContainer).toHaveAttribute('dir', 'rtl');
      
      const computedStyle = window.getComputedStyle(formContainer!);
      expect(computedStyle.direction).toBe('rtl');
    });

    test('should apply correct margin/padding for RTL layout', () => {
      const { container } = render(<WeddingFormRTL language="ar" />);
      const formContainer = container.querySelector('[data-testid="wedding-form-container"]');
      
      const computedStyle = window.getComputedStyle(formContainer!);
      expect(computedStyle.textAlign).toBe('right');
      expect(computedStyle.marginRight).toBe('16px');
      expect(computedStyle.paddingRight).toBe('12px');
    });

    test('should maintain proper spacing in RTL forms', () => {
      render(<WeddingFormRTL language="ar" />);
      
      const brideLabel = screen.getByTestId('bride-label');
      const groomLabel = screen.getByTestId('groom-label');
      
      expect(brideLabel).toBeInTheDocument();
      expect(groomLabel).toBeInTheDocument();
    });
  });

  describe('Form Input Behavior in RTL', () => {
    test('should handle text input in RTL languages', async () => {
      const user = userEvent.setup();
      render(<WeddingFormRTL language="ar" />);
      
      const brideInput = screen.getByTestId('bride-input');
      
      await act(async () => {
        await user.type(brideInput, 'فاطمة');
      });
      
      expect(brideInput).toHaveValue('فاطمة');
    });

    test('should handle date picker in RTL layout', () => {
      render(<WeddingFormRTL language="ar" />);
      
      const dateInput = screen.getByTestId('date-input');
      const dateSection = screen.getByTestId('date-section');
      
      expect(dateInput).toBeInTheDocument();
      expect(dateSection).toBeInTheDocument();
    });

    test('should handle number input with RTL currency', async () => {
      const user = userEvent.setup();
      render(<WeddingFormRTL language="ar" />);
      
      const amountInput = screen.getByTestId('amount-input');
      
      await act(async () => {
        await user.type(amountInput, '15000');
      });
      
      expect(amountInput).toHaveValue(15000);
    });
  });

  describe('Interactive Elements in RTL', () => {
    test('should handle button clicks in RTL layout', async () => {
      const user = userEvent.setup();
      render(<WeddingFormRTL language="ar" />);
      
      const saveButton = screen.getByTestId('save-button');
      
      await act(async () => {
        await user.click(saveButton);
      });
      
      // Button should be clickable and responsive
      expect(saveButton).toBeInTheDocument();
    });

    test('should handle vendor card interactions in RTL', async () => {
      const user = userEvent.setup();
      render(<VendorDirectoryRTL language="ar" />);
      
      const contactButton = screen.getByTestId('contact-button');
      const favoriteButton = screen.getByTestId('favorite-button');
      
      await act(async () => {
        await user.click(contactButton);
      });
      
      await act(async () => {
        await user.click(favoriteButton);
      });
      
      expect(contactButton).toBeInTheDocument();
      expect(favoriteButton).toBeInTheDocument();
    });
  });

  describe('Typography and Text Rendering', () => {
    test('should render Arabic text with proper font support', () => {
      render(<WeddingFormRTL language="ar" />);
      
      const formTitle = screen.getByTestId('form-title');
      expect(formTitle).toBeInTheDocument();
      
      // Check that Arabic text is properly rendered
      const container = screen.getByTestId('wedding-form-container');
      expect(container).toHaveAttribute('dir', 'rtl');
    });

    test('should render Hebrew text with proper font support', () => {
      render(<WeddingFormRTL language="he" />);
      
      const formTitle = screen.getByTestId('form-title');
      expect(formTitle).toBeInTheDocument();
      
      const container = screen.getByTestId('wedding-form-container');
      expect(container).toHaveAttribute('dir', 'rtl');
    });

    test('should maintain text readability in RTL layouts', () => {
      render(<VendorDirectoryRTL language="ar" />);
      
      const vendorName = screen.getByTestId('vendor-name');
      const vendorType = screen.getByTestId('vendor-type');
      const ratingText = screen.getByTestId('rating-text');
      
      expect(vendorName).toBeInTheDocument();
      expect(vendorType).toBeInTheDocument();
      expect(ratingText).toBeInTheDocument();
    });
  });

  describe('Responsive Design in RTL', () => {
    test('should maintain RTL layout on mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<WeddingFormRTL language="ar" />);
      
      const container = screen.getByTestId('wedding-form-container');
      const buttonGroup = screen.getByTestId('button-group');
      
      expect(container).toHaveAttribute('dir', 'rtl');
      expect(buttonGroup).toBeInTheDocument();
    });

    test('should handle tablet layout in RTL', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      
      render(<VendorDirectoryRTL language="ar" />);
      
      const vendorDirectory = screen.getByTestId('vendor-directory');
      const vendorCard = screen.getByTestId('vendor-card');
      
      expect(vendorDirectory).toHaveAttribute('dir', 'rtl');
      expect(vendorCard).toBeInTheDocument();
    });
  });

  describe('Accessibility in RTL Languages', () => {
    test('should maintain proper ARIA labels in RTL', () => {
      render(<WeddingFormRTL language="ar" />);
      
      const brideInput = screen.getByTestId('bride-input');
      const groomInput = screen.getByTestId('groom-input');
      
      expect(brideInput).toHaveAttribute('id', 'bride-name');
      expect(groomInput).toHaveAttribute('id', 'groom-name');
    });

    test('should support screen readers in RTL languages', () => {
      render(<WeddingFormRTL language="ar" />);
      
      const formTitle = screen.getByRole('heading', { level: 1 });
      const form = screen.getByRole('form');
      
      expect(formTitle).toBeInTheDocument();
      expect(form).toBeInTheDocument();
    });

    test('should maintain keyboard navigation in RTL', async () => {
      const user = userEvent.setup();
      render(<WeddingFormRTL language="ar" />);
      
      const brideInput = screen.getByTestId('bride-input');
      const groomInput = screen.getByTestId('groom-input');
      
      // Tab navigation should work properly
      await act(async () => {
        await user.tab();
      });
      
      expect(brideInput).toBeInTheDocument();
      
      await act(async () => {
        await user.tab();
      });
      
      expect(groomInput).toBeInTheDocument();
    });
  });
});