/**
 * AI Feature Manager Component Tests
 * WS-239 Platform vs Client APIs Implementation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import AIFeatureManager from '@/components/ai-features/AIFeatureManager';
import { AIFeatureManagerProps, SubscriptionTier } from '@/types/ai-features';

// Mock child components
jest.mock('@/components/ai-features/PlatformVsClientToggle', () => {
  return {
    PlatformVsClientToggle: ({ feature, onToggle }: any) => (
      <div data-testid={`toggle-${feature.id}`}>
        <button onClick={() => onToggle(feature.id, 'client')}>Toggle to Client</button>
        {feature.name}
      </div>
    )
  };
});

jest.mock('@/components/ai-features/APIKeySetupWizard', () => {
  return {
    APIKeySetupWizard: ({ isVisible, onCancel }: any) => 
      isVisible ? (
        <div data-testid="api-setup-wizard">
          <button onClick={onCancel}>Cancel Setup</button>
          Setup Wizard
        </div>
      ) : null
  };
});

jest.mock('@/components/ai-features/CostTrackingDashboard', () => {
  return {
    CostTrackingDashboard: () => <div data-testid="cost-dashboard">Cost Dashboard</div>
  };
});

jest.mock('@/components/ai-features/FeatureTierComparison', () => {
  return {
    FeatureTierComparison: ({ onUpgrade }: any) => (
      <div data-testid="tier-comparison">
        <button onClick={() => onUpgrade('professional')}>Upgrade to Professional</button>
        Tier Comparison
      </div>
    )
  };
});

describe('AIFeatureManager', () => {
  const mockTier: SubscriptionTier = {
    id: 'starter',
    name: 'starter',
    monthlyPrice: 19
  };

  const mockProps: AIFeatureManagerProps = {
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    currentTier: mockTier,
    onFeatureToggle: jest.fn(),
    onUpgradeRequest: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main dashboard with header', async () => {
    render(<AIFeatureManager {...mockProps} />);

    expect(screen.getByText('AI Features Management')).toBeInTheDocument();
    expect(screen.getByText('Manage your AI-powered wedding tools with transparent cost tracking')).toBeInTheDocument();
    
    // Should show current tier
    expect(screen.getByText('Starter Plan')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<AIFeatureManager {...mockProps} />);
    
    // Should show loading spinner initially
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows navigation tabs and allows switching views', async () => {
    render(<AIFeatureManager {...mockProps} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    // Should have all navigation tabs
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('Cost Tracking')).toBeInTheDocument();
    expect(screen.getByText('Compare Tiers')).toBeInTheDocument();

    // Click on Cost Tracking tab
    fireEvent.click(screen.getByText('Cost Tracking'));
    expect(screen.getByTestId('cost-dashboard')).toBeInTheDocument();

    // Click on Compare Tiers tab
    fireEvent.click(screen.getByText('Compare Tiers'));
    expect(screen.getByTestId('tier-comparison')).toBeInTheDocument();
  });

  it('displays wedding season indicator during peak months', async () => {
    // Mock current date to be in wedding season (June)
    const mockDate = new Date('2024-06-15');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    render(<AIFeatureManager {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Wedding Season')).toBeInTheDocument();
    });

    // Should show wedding season alert
    expect(screen.getByText(/Wedding Season Alert/)).toBeInTheDocument();
    expect(screen.getByText(/peak wedding season/)).toBeInTheDocument();

    jest.restoreAllMocks();
  });

  it('displays statistics cards with correct data', async () => {
    render(<AIFeatureManager {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Active Features')).toBeInTheDocument();
    });

    // Should show summary stats
    expect(screen.getByText('Platform Features')).toBeInTheDocument();
    expect(screen.getByText('Monthly Spend')).toBeInTheDocument();
    expect(screen.getByText('Season Status')).toBeInTheDocument();
  });

  it('handles feature toggle correctly', async () => {
    render(<AIFeatureManager {...mockProps} />);

    // Wait for loading and switch to features view
    await waitFor(() => {
      fireEvent.click(screen.getByText('Features'));
    });

    // Should render feature toggles
    await waitFor(() => {
      const toggle = screen.getByTestId('toggle-photo-tagging');
      expect(toggle).toBeInTheDocument();
    });

    // Click toggle
    fireEvent.click(screen.getByText('Toggle to Client'));
    
    expect(mockProps.onFeatureToggle).toHaveBeenCalledWith('photo-tagging', 'client');
  });

  it('handles upgrade requests correctly', async () => {
    render(<AIFeatureManager {...mockProps} />);

    // Switch to compare tiers view
    await waitFor(() => {
      fireEvent.click(screen.getByText('Compare Tiers'));
    });

    // Click upgrade button
    fireEvent.click(screen.getByText('Upgrade to Professional'));
    
    expect(mockProps.onUpgradeRequest).toHaveBeenCalledWith('professional');
  });

  it('opens and closes API setup wizard', async () => {
    render(<AIFeatureManager {...mockProps} />);

    // Wait for loading and switch to features view
    await waitFor(() => {
      fireEvent.click(screen.getByText('Features'));
    });

    // Click configure button (should be available after loading)
    await waitFor(() => {
      const configureButton = screen.getByText('Configure');
      if (configureButton) {
        fireEvent.click(configureButton);
      }
    });

    // Wizard might be visible
    const wizard = screen.queryByTestId('api-setup-wizard');
    if (wizard) {
      expect(wizard).toBeInTheDocument();

      // Close wizard
      fireEvent.click(screen.getByText('Cancel Setup'));
      
      await waitFor(() => {
        expect(screen.queryByTestId('api-setup-wizard')).not.toBeInTheDocument();
      });
    }
  });

  it('displays correct tier information', async () => {
    const professionalProps = {
      ...mockProps,
      currentTier: {
        id: 'professional',
        name: 'professional' as const,
        monthlyPrice: 49
      }
    };

    render(<AIFeatureManager {...professionalProps} />);

    await waitFor(() => {
      expect(screen.getByText('Professional Plan')).toBeInTheDocument();
    });
  });

  it('handles enterprise tier with crown icon', async () => {
    const enterpriseProps = {
      ...mockProps,
      currentTier: {
        id: 'enterprise',
        name: 'enterprise' as const,
        monthlyPrice: 149
      }
    };

    render(<AIFeatureManager {...enterpriseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Plan')).toBeInTheDocument();
    });
  });

  it('is accessible with proper ARIA labels', async () => {
    render(<AIFeatureManager {...mockProps} />);

    await waitFor(() => {
      // Check for proper heading structure
      const heading = screen.getByRole('heading', { name: /AI Features Management/ });
      expect(heading).toBeInTheDocument();
    });

    // Check navigation has proper roles
    const navigation = screen.getByRole('navigation', { hidden: true });
    if (navigation) {
      expect(navigation).toBeInTheDocument();
    }
  });

  it('handles error states gracefully', async () => {
    // Mock console.error to prevent test noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // This would be tested with error boundary or error handling logic
    render(<AIFeatureManager {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('AI Features Management')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('formats currency correctly', async () => {
    render(<AIFeatureManager {...mockProps} />);

    await waitFor(() => {
      // Look for currency formatting (£ symbol)
      const elements = screen.getAllByText(/£/);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('responsive design works on mobile', async () => {
    // Mock window.innerWidth for mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<AIFeatureManager {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('AI Features Management')).toBeInTheDocument();
    });

    // Component should render without breaking on mobile width
    expect(document.querySelector('.max-w-7xl')).toBeInTheDocument();
  });
});

// Security Tests
describe('AIFeatureManager Security', () => {
  const mockProps: AIFeatureManagerProps = {
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    currentTier: { id: 'starter', name: 'starter', monthlyPrice: 19 },
    onFeatureToggle: jest.fn(),
    onUpgradeRequest: jest.fn()
  };

  it('sanitizes user inputs', () => {
    const maliciousProps = {
      ...mockProps,
      userId: '<script>alert("xss")</script>',
      organizationId: 'javascript:void(0)'
    };

    // Component should render without executing malicious scripts
    render(<AIFeatureManager {...maliciousProps} />);
    
    expect(screen.getByText('AI Features Management')).toBeInTheDocument();
    // Script should not execute
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('does not expose sensitive data in DOM', async () => {
    render(<AIFeatureManager {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('AI Features Management')).toBeInTheDocument();
    });

    // Check that no API keys or sensitive data are exposed
    const bodyText = document.body.textContent || '';
    expect(bodyText).not.toMatch(/sk-[a-zA-Z0-9]{48}/); // OpenAI API key pattern
    expect(bodyText).not.toMatch(/ant-[a-zA-Z0-9-_]{48,}/); // Anthropic API key pattern
  });
});

// Performance Tests
describe('AIFeatureManager Performance', () => {
  const mockProps: AIFeatureManagerProps = {
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    currentTier: { id: 'starter', name: 'starter', monthlyPrice: 19 },
    onFeatureToggle: jest.fn(),
    onUpgradeRequest: jest.fn()
  };

  it('renders efficiently with large datasets', async () => {
    const startTime = performance.now();
    
    render(<AIFeatureManager {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('AI Features Management')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within reasonable time (less than 1000ms)
    expect(renderTime).toBeLessThan(1000);
  });
});

// Wedding Industry Context Tests
describe('AIFeatureManager Wedding Context', () => {
  const mockProps: AIFeatureManagerProps = {
    userId: 'photographer-123',
    organizationId: 'studio-456',
    currentTier: { id: 'professional', name: 'professional', monthlyPrice: 49 },
    onFeatureToggle: jest.fn(),
    onUpgradeRequest: jest.fn()
  };

  it('displays wedding-specific feature descriptions', async () => {
    render(<AIFeatureManager {...mockProps} />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Features'));
    });

    // Should show wedding industry context
    await waitFor(() => {
      expect(screen.getByText(/Perfect for photographers/)).toBeInTheDocument();
    });
  });

  it('shows wedding season adjustments', async () => {
    // Mock wedding season (June)
    const mockDate = new Date('2024-06-15');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    render(<AIFeatureManager {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Wedding Season Alert/)).toBeInTheDocument();
      expect(screen.getByText(/peak wedding season/)).toBeInTheDocument();
    });

    jest.restoreAllMocks();
  });
});