import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  MobileRTLLayout, 
  RTLAdaptive, 
  useRTL,
  createRTLClassMapper,
  MobileRTLContainer,
  MobileRTLHeader,
  MobileRTLCard
} from '../../../src/components/mobile/i18n/MobileRTLLayout';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('MobileRTLLayout', () => {
  beforeEach(() => {
    // Reset document direction before each test
    document.documentElement.dir = 'ltr';
  });

  it('renders children with LTR direction by default', () => {
    render(
      <MobileRTLLayout>
        <div data-testid="content">Test Content</div>
      </MobileRTLLayout>
    );

    const container = screen.getByTestId('content').parentElement;
    expect(container).toHaveAttribute('dir', 'ltr');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('renders children with RTL direction when isRTL is true', async () => {
    render(
      <MobileRTLLayout isRTL={true}>
        <div data-testid="content">Test Content</div>
      </MobileRTLLayout>
    );

    const container = screen.getByTestId('content').parentElement;
    expect(container).toHaveAttribute('dir', 'rtl');
    
    await waitFor(() => {
      expect(document.documentElement.dir).toBe('rtl');
    });
  });

  it('applies custom className', () => {
    render(
      <MobileRTLLayout className="custom-class">
        <div data-testid="content">Test Content</div>
      </MobileRTLLayout>
    );

    const container = screen.getByTestId('content').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('handles direction transitions when enableTransitions is true', async () => {
    const { rerender } = render(
      <MobileRTLLayout isRTL={false} enableTransitions={true}>
        <div data-testid="content">Test Content</div>
      </MobileRTLLayout>
    );

    rerender(
      <MobileRTLLayout isRTL={true} enableTransitions={true}>
        <div data-testid="content">Test Content</div>
      </MobileRTLLayout>
    );

    const container = screen.getByTestId('content').parentElement;
    expect(container).toHaveClass('transition-opacity');
  });
});

describe('RTLAdaptive', () => {
  const TestWrapper = ({ isRTL = false }: { isRTL?: boolean }) => (
    <MobileRTLLayout isRTL={isRTL}>
      <RTLAdaptive 
        className="ml-4 text-left"
        rtlClassName="rtl-specific"
        ltrClassName="ltr-specific"
      >
        <div data-testid="adaptive-content">Adaptive Content</div>
      </RTLAdaptive>
    </MobileRTLLayout>
  );

  it('applies RTL class mappings in RTL context', () => {
    render(<TestWrapper isRTL={true} />);

    const adaptiveContainer = screen.getByTestId('adaptive-content').parentElement;
    expect(adaptiveContainer).toHaveClass('mr-4'); // ml-4 should become mr-4
    expect(adaptiveContainer).toHaveClass('text-right'); // text-left should become text-right
    expect(adaptiveContainer).toHaveClass('rtl-specific');
  });

  it('keeps original classes in LTR context', () => {
    render(<TestWrapper isRTL={false} />);

    const adaptiveContainer = screen.getByTestId('adaptive-content').parentElement;
    expect(adaptiveContainer).toHaveClass('ml-4'); // Should stay ml-4
    expect(adaptiveContainer).toHaveClass('text-left'); // Should stay text-left
    expect(adaptiveContainer).toHaveClass('ltr-specific');
  });

  it('warns when used outside RTL context', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <RTLAdaptive className="test-class">
        <div>Content</div>
      </RTLAdaptive>
    );

    expect(consoleSpy).toHaveBeenCalledWith('RTLAdaptive must be used within MobileRTLLayout');
    consoleSpy.mockRestore();
  });
});

describe('createRTLClassMapper', () => {
  it('maps margin classes correctly for RTL', () => {
    const rtlMapper = createRTLClassMapper(true);

    expect(rtlMapper('ml-4')).toBe('mr-4');
    expect(rtlMapper('mr-4')).toBe('ml-4');
    expect(rtlMapper('ml-4 mr-2')).toBe('mr-4 ml-2');
  });

  it('maps padding classes correctly for RTL', () => {
    const rtlMapper = createRTLClassMapper(true);

    expect(rtlMapper('pl-4')).toBe('pr-4');
    expect(rtlMapper('pr-4')).toBe('pl-4');
    expect(rtlMapper('pl-4 pr-2')).toBe('pr-4 pl-2');
  });

  it('maps position classes correctly for RTL', () => {
    const rtlMapper = createRTLClassMapper(true);

    expect(rtlMapper('left-0')).toBe('right-0');
    expect(rtlMapper('right-0')).toBe('left-0');
    expect(rtlMapper('left-4 right-2')).toBe('right-4 left-2');
  });

  it('maps text alignment classes correctly for RTL', () => {
    const rtlMapper = createRTLClassMapper(true);

    expect(rtlMapper('text-left')).toBe('text-right');
    expect(rtlMapper('text-right')).toBe('text-left');
    expect(rtlMapper('justify-start')).toBe('justify-end');
    expect(rtlMapper('justify-end')).toBe('justify-start');
  });

  it('maps border classes correctly for RTL', () => {
    const rtlMapper = createRTLClassMapper(true);

    expect(rtlMapper('border-l')).toBe('border-r');
    expect(rtlMapper('border-r')).toBe('border-l');
    expect(rtlMapper('border-l-2')).toBe('border-r-2');
  });

  it('maps rounded corner classes correctly for RTL', () => {
    const rtlMapper = createRTLClassMapper(true);

    expect(rtlMapper('rounded-l')).toBe('rounded-r');
    expect(rtlMapper('rounded-r')).toBe('rounded-l');
    expect(rtlMapper('rounded-tl')).toBe('rounded-tr');
    expect(rtlMapper('rounded-tr')).toBe('rounded-tl');
  });

  it('does not modify classes for LTR', () => {
    const ltrMapper = createRTLClassMapper(false);

    expect(ltrMapper('ml-4 text-left border-l')).toBe('ml-4 text-left border-l');
  });

  it('leaves unmapped classes unchanged', () => {
    const rtlMapper = createRTLClassMapper(true);

    expect(rtlMapper('bg-blue-500 py-4 rounded')).toBe('bg-blue-500 py-4 rounded');
  });
});

describe('useRTL hook', () => {
  it('throws error when used outside RTL context', () => {
    expect(() => {
      renderHook(() => useRTL());
    }).toThrow('useRTL must be used within MobileRTLLayout');
  });

  it('returns correct RTL context values', () => {
    const TestComponent = () => {
      const { isRTL, direction, rtlClass } = useRTL();
      return (
        <div data-testid="rtl-info" data-is-rtl={isRTL} data-direction={direction}>
          <div className={rtlClass('ml-4')}>Test</div>
        </div>
      );
    };

    render(
      <MobileRTLLayout isRTL={true}>
        <TestComponent />
      </MobileRTLLayout>
    );

    const rtlInfo = screen.getByTestId('rtl-info');
    expect(rtlInfo).toHaveAttribute('data-is-rtl', 'true');
    expect(rtlInfo).toHaveAttribute('data-direction', 'rtl');
    expect(rtlInfo.firstChild).toHaveClass('mr-4'); // ml-4 mapped to mr-4
  });
});

describe('MobileRTLContainer', () => {
  it('applies RTL class mappings to container styles', () => {
    render(
      <MobileRTLLayout isRTL={true}>
        <MobileRTLContainer className="ml-4">
          <div data-testid="container-content">Content</div>
        </MobileRTLContainer>
      </MobileRTLLayout>
    );

    const container = screen.getByTestId('container-content').parentElement;
    expect(container).toHaveClass('mr-4'); // ml-4 should be mapped to mr-4
    expect(container).toHaveClass('relative', 'min-h-screen', 'touch-manipulation');
  });
});

describe('MobileRTLHeader', () => {
  it('renders header with RTL adaptations', () => {
    render(
      <MobileRTLLayout isRTL={true}>
        <MobileRTLHeader showBackButton={true} onBack={vi.fn()}>
          <h1>Header Title</h1>
        </MobileRTLHeader>
      </MobileRTLLayout>
    );

    expect(screen.getByText('Header Title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forward' })).toBeInTheDocument(); // RTL changes "Back" to "Forward"
  });

  it('shows back button when showBackButton is true', () => {
    const mockOnBack = vi.fn();
    
    render(
      <MobileRTLLayout isRTL={false}>
        <MobileRTLHeader showBackButton={true} onBack={mockOnBack}>
          <h1>Header Title</h1>
        </MobileRTLHeader>
      </MobileRTLLayout>
    );

    const backButton = screen.getByRole('button', { name: 'Back' });
    expect(backButton).toBeInTheDocument();
    
    fireEvent.click(backButton);
    expect(mockOnBack).toHaveBeenCalledOnce();
  });

  it('does not show back button when showBackButton is false', () => {
    render(
      <MobileRTLLayout isRTL={false}>
        <MobileRTLHeader showBackButton={false}>
          <h1>Header Title</h1>
        </MobileRTLHeader>
      </MobileRTLLayout>
    );

    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });
});

describe('MobileRTLCard', () => {
  it('renders card with RTL class mappings', () => {
    render(
      <MobileRTLLayout isRTL={true}>
        <MobileRTLCard className="ml-4">
          <div data-testid="card-content">Card Content</div>
        </MobileRTLCard>
      </MobileRTLLayout>
    );

    const card = screen.getByTestId('card-content').parentElement;
    expect(card).toHaveClass('mr-4'); // ml-4 should be mapped to mr-4
    expect(card).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'border');
  });
});

// Test the wedding-specific form component
describe('MobileWeddingRTLForm', () => {
  it('renders wedding form with RTL adaptations', () => {
    const { MobileWeddingRTLForm } = require('../../../src/components/mobile/i18n/MobileRTLLayout');
    
    render(
      <MobileRTLLayout isRTL={true}>
        <MobileWeddingRTLForm title="Wedding Details">
          <div data-testid="form-content">Form fields</div>
        </MobileWeddingRTLForm>
      </MobileRTLLayout>
    );

    expect(screen.getByText('Wedding Details')).toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
    
    const title = screen.getByText('Wedding Details');
    expect(title).toHaveClass('text-center'); // RTL adapted classes
  });
});

// Helper for hook testing
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';