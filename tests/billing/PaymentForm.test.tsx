import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PaymentForm } from '@/components/billing/PaymentForm';

// Mock Stripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({
    elements: vi.fn(() => ({
      getElement: vi.fn(),
      create: vi.fn(),
      confirmPayment: vi.fn(),
    })),
    confirmPayment: vi.fn(),
  })),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
  CardElement: ({ onChange }: { onChange?: (event: any) => void }) => {
    const handleChange = () => {
      onChange?.({ complete: true, error: null });
    };
    
    return (
      <div 
        data-testid="card-element" 
        onClick={handleChange}
      >
        Card Element Mock
      </div>
    );
  },
  useStripe: () => ({
    confirmPayment: vi.fn(),
    createPaymentMethod: vi.fn(),
  }),
  useElements: () => ({
    getElement: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => 'mock-token'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
});

describe('PaymentForm', () => {
  const defaultProps = {
    tier: 'PROFESSIONAL' as const,
    billingCycle: 'monthly' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders payment form with correct tier information', () => {
    render(<PaymentForm {...defaultProps} />);
    
    expect(screen.getByText('Professional Plan')).toBeInTheDocument();
    expect(screen.getByText('Everything you need to scale your wedding business')).toBeInTheDocument();
    expect(screen.getByText('£49/mo')).toBeInTheDocument();
  });

  it('displays annual billing correctly', () => {
    render(
      <PaymentForm 
        {...defaultProps} 
        billingCycle="annual" 
      />
    );
    
    expect(screen.getByText('£41/mo')).toBeInTheDocument(); // Annual pricing
    expect(screen.getByText('Save £98 yearly')).toBeInTheDocument();
  });

  it('renders billing information form fields', () => {
    render(<PaymentForm {...defaultProps} />);
    
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByTestId('card-element')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<PaymentForm {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: /subscribe for/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(<PaymentForm {...defaultProps} />);
    
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const submitButton = screen.getByRole('button', { name: /subscribe for/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });
  });

  it('enables card validation when card is complete', async () => {
    render(<PaymentForm {...defaultProps} />);
    
    // Fill form fields
    const nameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email Address');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    
    // Simulate card completion
    const cardElement = screen.getByTestId('card-element');
    fireEvent.click(cardElement);
    
    const submitButton = screen.getByRole('button', { name: /subscribe for/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('creates checkout session on form submission', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ url: 'https://checkout.stripe.com/session-id' }),
    } as Response);

    // Mock window.location.href
    delete (window as any).location;
    window.location = { href: '' } as any;

    render(<PaymentForm {...defaultProps} />);
    
    // Fill form
    const nameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email Address');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    
    // Complete card
    const cardElement = screen.getByTestId('card-element');
    fireEvent.click(cardElement);
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /subscribe for/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
        },
        body: expect.stringContaining('"tier":"professional"'),
      });
    });
  });

  it('handles API errors gracefully', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Payment failed' }),
    } as Response);

    const onError = vi.fn();
    render(<PaymentForm {...defaultProps} onError={onError} />);
    
    // Fill and submit form
    const nameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email Address');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    
    const cardElement = screen.getByTestId('card-element');
    fireEvent.click(cardElement);
    
    const submitButton = screen.getByRole('button', { name: /subscribe for/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Payment failed')).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith('Payment failed');
    });
  });

  it('displays loading state during submission', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    render(<PaymentForm {...defaultProps} />);
    
    // Fill and submit form
    const nameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email Address');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    
    const cardElement = screen.getByTestId('card-element');
    fireEvent.click(cardElement);
    
    const submitButton = screen.getByRole('button', { name: /subscribe for/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  it('includes security and terms information', () => {
    render(<PaymentForm {...defaultProps} />);
    
    expect(screen.getByText(/your payment information is encrypted and secure/i)).toBeInTheDocument();
    expect(screen.getByText(/powered by stripe/i)).toBeInTheDocument();
    expect(screen.getByText(/pci dss compliant/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
  });

  it('handles authentication errors', async () => {
    // Mock missing token
    vi.mocked(window.localStorage.getItem).mockReturnValue(null);
    
    render(<PaymentForm {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email Address');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    
    const cardElement = screen.getByTestId('card-element');
    fireEvent.click(cardElement);
    
    const submitButton = screen.getByRole('button', { name: /subscribe for/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Authentication required. Please sign in.')).toBeInTheDocument();
    });
  });
});