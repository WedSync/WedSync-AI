import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PricingPlans } from '@/components/billing/PricingPlans';

describe('PricingPlans', () => {
  const defaultProps = {
    onSelectPlan: vi.fn(),
    onBillingCycleChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all pricing tiers by default', () => {
    render(<PricingPlans {...defaultProps} />);
    
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('Scale')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('hides free tier when showFreeTier is false', () => {
    render(<PricingPlans {...defaultProps} showFreeTier={false} />);
    
    expect(screen.queryByText('Free')).not.toBeInTheDocument();
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Professional')).toBeInTheDocument();
  });

  it('highlights the specified tier as popular', () => {
    render(<PricingPlans {...defaultProps} highlightTier="STARTER" />);
    
    const starterCard = screen.getByText('Starter').closest('[class*="ring-wedding"]');
    expect(starterCard).toBeInTheDocument();
    
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('marks current tier as current plan', () => {
    render(<PricingPlans {...defaultProps} currentTier="PROFESSIONAL" />);
    
    const professionalButton = screen.getByText('Current Plan');
    expect(professionalButton).toBeInTheDocument();
    expect(professionalButton).toBeDisabled();
  });

  it('displays correct pricing for monthly billing', () => {
    render(<PricingPlans {...defaultProps} billingCycle="monthly" />);
    
    expect(screen.getByText('£19/mo')).toBeInTheDocument(); // Starter
    expect(screen.getByText('£49/mo')).toBeInTheDocument(); // Professional
    expect(screen.getByText('£79/mo')).toBeInTheDocument(); // Scale
  });

  it('displays correct pricing for annual billing', () => {
    render(<PricingPlans {...defaultProps} billingCycle="annual" />);
    
    // Annual prices (with monthly equivalent)
    expect(screen.getByText('£16/mo')).toBeInTheDocument(); // Starter annual
    expect(screen.getByText('£41/mo')).toBeInTheDocument(); // Professional annual
    expect(screen.getByText('£66/mo')).toBeInTheDocument(); // Scale annual
  });

  it('shows annual savings when billing cycle is annual', () => {
    render(<PricingPlans {...defaultProps} billingCycle="annual" />);
    
    expect(screen.getByText('Save £38 per year')).toBeInTheDocument(); // Starter
    expect(screen.getByText('Save £98 per year')).toBeInTheDocument(); // Professional
  });

  it('handles billing cycle toggle', () => {
    const onBillingCycleChange = vi.fn();
    render(<PricingPlans {...defaultProps} onBillingCycleChange={onBillingCycleChange} />);
    
    const annualButton = screen.getByRole('button', { name: /annual/i });
    fireEvent.click(annualButton);
    
    expect(onBillingCycleChange).toHaveBeenCalledWith('annual');
  });

  it('calls onSelectPlan when plan is selected', () => {
    const onSelectPlan = vi.fn();
    render(<PricingPlans {...defaultProps} onSelectPlan={onSelectPlan} />);
    
    const starterButton = screen.getByText('Choose Starter');
    fireEvent.click(starterButton);
    
    expect(onSelectPlan).toHaveBeenCalledWith('STARTER', 'monthly');
  });

  it('displays tier features correctly', () => {
    render(<PricingPlans {...defaultProps} />);
    
    // Check some Professional features
    expect(screen.getByText('3 user logins')).toBeInTheDocument();
    expect(screen.getByText('✅ AI-powered chatbot')).toBeInTheDocument();
    expect(screen.getByText('PDF import & parsing')).toBeInTheDocument();
  });

  it('shows features comparison table', () => {
    render(<PricingPlans {...defaultProps} />);
    
    expect(screen.getByText('Compare Features')).toBeInTheDocument();
    expect(screen.getByText('User Logins')).toBeInTheDocument();
    expect(screen.getByText('Forms')).toBeInTheDocument();
    expect(screen.getByText('PDF Import')).toBeInTheDocument();
    expect(screen.getByText('AI Chatbot')).toBeInTheDocument();
  });

  it('displays FAQ section', () => {
    render(<PricingPlans {...defaultProps} />);
    
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    expect(screen.getByText('Can I change plans anytime?')).toBeInTheDocument();
    expect(screen.getByText('Is there a free trial?')).toBeInTheDocument();
  });

  it('shows tier badges for premium tiers', () => {
    render(<PricingPlans {...defaultProps} />);
    
    expect(screen.getByText('Pro')).toBeInTheDocument(); // Professional badge
    expect(screen.getByText('Elite')).toBeInTheDocument(); // Scale badge
    expect(screen.getByText('Enterprise')).toBeInTheDocument(); // Enterprise badge
  });

  it('handles free tier selection', () => {
    const onSelectPlan = vi.fn();
    render(<PricingPlans {...defaultProps} onSelectPlan={onSelectPlan} />);
    
    const freeButton = screen.getByText('Get Started Free');
    fireEvent.click(freeButton);
    
    expect(onSelectPlan).toHaveBeenCalledWith('FREE', 'monthly');
  });

  it('displays correct feature availability in comparison table', () => {
    render(<PricingPlans {...defaultProps} />);
    
    // Get all table cells for PDF Import row
    const pdfImportCells = screen.getAllByText('✅').concat(screen.getAllByText('❌'));
    
    // Should have mix of ✅ and ❌ for different tiers
    expect(pdfImportCells.length).toBeGreaterThan(0);
  });

  it('shows unlimited features correctly', () => {
    render(<PricingPlans {...defaultProps} />);
    
    expect(screen.getByText('Unlimited user logins')).toBeInTheDocument(); // Enterprise
    expect(screen.getAllByText('Unlimited').length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    const { container } = render(<PricingPlans {...defaultProps} className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows save percentage badge for annual billing', () => {
    render(<PricingPlans {...defaultProps} />);
    
    expect(screen.getByText('Save 17%')).toBeInTheDocument();
  });

  it('renders tier descriptions correctly', () => {
    render(<PricingPlans {...defaultProps} />);
    
    expect(screen.getByText('Perfect for trying out WedSync')).toBeInTheDocument(); // Free
    expect(screen.getByText('Great for solo wedding vendors')).toBeInTheDocument(); // Starter
    expect(screen.getByText('Everything you need to scale your wedding business')).toBeInTheDocument(); // Professional
  });
});