import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileLanguageSelector, DEFAULT_LANGUAGES, useLanguageSelector } from '../../../src/components/mobile/i18n/MobileLanguageSelector';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  ChevronDownIcon: () => <div data-testid="chevron-down">ChevronDown</div>,
  CheckIcon: () => <div data-testid="check">Check</div>,
  GlobeAltIcon: () => <div data-testid="globe">Globe</div>,
}));

describe('MobileLanguageSelector', () => {
  const mockOnLanguageChange = vi.fn();
  const defaultProps = {
    selectedLanguage: DEFAULT_LANGUAGES[0], // English
    languages: DEFAULT_LANGUAGES,
    onLanguageChange: mockOnLanguageChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<MobileLanguageSelector {...defaultProps} />);
    
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
  });

  it('opens dropdown when trigger button is clicked', async () => {
    render(<MobileLanguageSelector {...defaultProps} />);
    
    const triggerButton = screen.getByRole('button', { name: /select language/i });
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  it('displays all available languages in dropdown', async () => {
    render(<MobileLanguageSelector {...defaultProps} />);
    
    const triggerButton = screen.getByRole('button', { name: /select language/i });
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      DEFAULT_LANGUAGES.forEach(language => {
        expect(screen.getByText(language.nativeName)).toBeInTheDocument();
      });
    });
  });

  it('shows search input when more than 8 languages', async () => {
    const manyLanguages = [...DEFAULT_LANGUAGES, ...DEFAULT_LANGUAGES.slice(0, 2)]; // 16 total
    render(
      <MobileLanguageSelector
        {...defaultProps}
        languages={manyLanguages}
      />
    );
    
    const triggerButton = screen.getByRole('button', { name: /select language/i });
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search languages...')).toBeInTheDocument();
    });
  });

  it('filters languages based on search input', async () => {
    const manyLanguages = [...DEFAULT_LANGUAGES, ...DEFAULT_LANGUAGES.slice(0, 2)];
    render(
      <MobileLanguageSelector
        {...defaultProps}
        languages={manyLanguages}
      />
    );
    
    const triggerButton = screen.getByRole('button', { name: /select language/i });
    fireEvent.click(triggerButton);
    
    await waitFor(async () => {
      const searchInput = screen.getByPlaceholderText('Search languages...');
      fireEvent.change(searchInput, { target: { value: 'Spanish' } });
      
      await waitFor(() => {
        expect(screen.getByText('Español')).toBeInTheDocument();
        expect(screen.queryByText('English')).not.toBeInTheDocument();
      });
    });
  });

  it('calls onLanguageChange when a language is selected', async () => {
    render(<MobileLanguageSelector {...defaultProps} />);
    
    const triggerButton = screen.getByRole('button', { name: /select language/i });
    fireEvent.click(triggerButton);
    
    await waitFor(async () => {
      const spanishOption = screen.getByText('Español');
      fireEvent.click(spanishOption.closest('button')!);
      
      expect(mockOnLanguageChange).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'es',
          name: 'Spanish',
          nativeName: 'Español'
        })
      );
    });
  });

  it('highlights selected language with check icon', async () => {
    render(<MobileLanguageSelector {...defaultProps} />);
    
    const triggerButton = screen.getByRole('button', { name: /select language/i });
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      const englishOption = screen.getByRole('option', { selected: true });
      expect(englishOption).toBeInTheDocument();
      expect(screen.getByTestId('check')).toBeInTheDocument();
    });
  });

  it('shows RTL indicator for RTL languages', async () => {
    render(<MobileLanguageSelector {...defaultProps} />);
    
    const triggerButton = screen.getByRole('button', { name: /select language/i });
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Arabic.*RTL/)).toBeInTheDocument();
      expect(screen.getByText(/Hebrew.*RTL/)).toBeInTheDocument();
    });
  });

  it('supports compact mode', () => {
    render(
      <MobileLanguageSelector
        {...defaultProps}
        isCompact={true}
      />
    );
    
    const triggerButton = screen.getByRole('button', { name: /select language/i });
    expect(triggerButton).toHaveClass('py-2', 'px-3');
    expect(screen.queryByText('EN')).not.toBeInTheDocument(); // Code not shown in compact mode
  });

  it('can hide flag when showFlag is false', () => {
    render(
      <MobileLanguageSelector
        {...defaultProps}
        showFlag={false}
      />
    );
    
    expect(screen.queryByText('🇺🇸')).not.toBeInTheDocument();
  });

  it('shows language name instead of native name when showNativeName is false', () => {
    render(
      <MobileLanguageSelector
        {...defaultProps}
        showNativeName={false}
      />
    );
    
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.queryByText('English')).toBeInTheDocument(); // Should show name, not nativeName
  });

  it('closes dropdown when backdrop is clicked', async () => {
    render(<MobileLanguageSelector {...defaultProps} />);
    
    const triggerButton = screen.getByRole('button', { name: /select language/i });
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      const backdrop = document.querySelector('.fixed.inset-0');
      expect(backdrop).toBeInTheDocument();
      
      fireEvent.click(backdrop!);
    });
    
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});

describe('useLanguageSelector hook', () => {
  it('initializes with provided language', () => {
    const { result } = renderHook(() => 
      useLanguageSelector(DEFAULT_LANGUAGES[1]) // Spanish
    );
    
    expect(result.current.selectedLanguage.code).toBe('es');
    expect(result.current.isRTL).toBe(false);
  });

  it('sets RTL correctly for RTL languages', () => {
    const arabicLanguage = DEFAULT_LANGUAGES.find(lang => lang.code === 'ar')!;
    const { result } = renderHook(() => 
      useLanguageSelector(arabicLanguage)
    );
    
    expect(result.current.isRTL).toBe(true);
  });

  it('updates document direction when language changes', () => {
    const { result } = renderHook(() => useLanguageSelector());
    
    const arabicLanguage = DEFAULT_LANGUAGES.find(lang => lang.code === 'ar')!;
    act(() => {
      result.current.handleLanguageChange(arabicLanguage);
    });
    
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('saves language preference to localStorage', () => {
    const localStorageSetItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useLanguageSelector());
    
    const spanishLanguage = DEFAULT_LANGUAGES.find(lang => lang.code === 'es')!;
    act(() => {
      result.current.handleLanguageChange(spanishLanguage);
    });
    
    expect(localStorageSetItemSpy).toHaveBeenCalledWith(
      'preferred-language',
      JSON.stringify(spanishLanguage)
    );
  });

  it('loads saved language from localStorage on mount', () => {
    const spanishLanguage = DEFAULT_LANGUAGES.find(lang => lang.code === 'es')!;
    const localStorageGetItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    localStorageGetItemSpy.mockReturnValue(JSON.stringify(spanishLanguage));
    
    const { result } = renderHook(() => useLanguageSelector());
    
    expect(result.current.selectedLanguage.code).toBe('es');
  });
});

// Helper for hook testing
import { renderHook, act } from '@testing-library/react';