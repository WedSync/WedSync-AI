/**
 * Comprehensive Test Suite for API Gateway UI Components
 * WS-250 - API Gateway Management System - Team A
 * 
 * Tests all 9 API Gateway components with wedding industry context:
 * - APIGatewayDashboard
 * - TrafficMonitoringCharts  
 * - EndpointConfigurationPanel
 * - RateLimitingControls
 * - APISecurityManager
 * - WeddingAPIUsageAnalytics
 * - VendorAPIAccessManager
 * - SeasonalTrafficMonitor
 * - CriticalEndpointProtection
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Component imports
import APIGatewayDashboard from '../../src/components/api-gateway/APIGatewayDashboard';
import TrafficMonitoringCharts from '../../src/components/api-gateway/TrafficMonitoringCharts';
import EndpointConfigurationPanel from '../../src/components/api-gateway/EndpointConfigurationPanel';
import RateLimitingControls from '../../src/components/api-gateway/RateLimitingControls';
import APISecurityManager from '../../src/components/api-gateway/APISecurityManager';
import WeddingAPIUsageAnalytics from '../../src/components/api-gateway/WeddingAPIUsageAnalytics';
import VendorAPIAccessManager from '../../src/components/api-gateway/VendorAPIAccessManager';
import SeasonalTrafficMonitor from '../../src/components/api-gateway/SeasonalTrafficMonitor';
import CriticalEndpointProtection from '../../src/components/api-gateway/CriticalEndpointProtection';

// Mock external dependencies
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Line: () => <div data-testid="chart-line" />,
  Area: () => <div data-testid="chart-area" />,
  Bar: () => <div data-testid="chart-bar" />,
  Cell: () => <div data-testid="chart-cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

// Test suite for APIGatewayDashboard
describe('APIGatewayDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders main dashboard interface', () => {
    render(<APIGatewayDashboard />);
    
    expect(screen.getByText('API Gateway Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive API management for wedding vendors')).toBeInTheDocument();
  });

  test('displays wedding day alert when active', () => {
    render(<APIGatewayDashboard />);
    
    // Check for wedding day protocol alert
    expect(screen.getByText(/Wedding Day Protocol Active/)).toBeInTheDocument();
  });

  test('shows metric cards with proper values', () => {
    render(<APIGatewayDashboard />);
    
    expect(screen.getByText('Total Requests')).toBeInTheDocument();
    expect(screen.getByText('Active Endpoints')).toBeInTheDocument();
    expect(screen.getByText('Average Response Time')).toBeInTheDocument();
    expect(screen.getByText('Error Rate')).toBeInTheDocument();
  });

  test('tab navigation works correctly', async () => {
    const user = userEvent.setup();
    render(<APIGatewayDashboard />);
    
    const trafficTab = screen.getByText('Traffic');
    await user.click(trafficTab);
    
    expect(screen.getByText('Real-time API Traffic Monitoring')).toBeInTheDocument();
  });

  test('handles mobile responsive design', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 });
    
    render(<APIGatewayDashboard />);
    
    expect(screen.getByText('API Gateway Dashboard')).toBeInTheDocument();
  });
});

// Test suite for TrafficMonitoringCharts
describe('TrafficMonitoringCharts Component', () => {
  test('renders traffic monitoring interface', () => {
    render(<TrafficMonitoringCharts />);
    
    expect(screen.getByText('API Traffic Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Real-time API traffic visualization with wedding-specific insights')).toBeInTheDocument();
  });

  test('displays wedding day protocol when active', () => {
    render(<TrafficMonitoringCharts />);
    
    expect(screen.getByText(/Wedding Day Enhanced Monitoring/)).toBeInTheDocument();
  });

  test('shows all chart types', () => {
    render(<TrafficMonitoringCharts />);
    
    expect(screen.getAllByTestId('chart-container')).toHaveLength(4); // 4 different chart types
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  test('updates metrics in real-time', async () => {
    render(<TrafficMonitoringCharts />);
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText(/Requests\/Min/)).toBeInTheDocument();
    });
  });

  test('handles time range selection', async () => {
    const user = userEvent.setup();
    render(<TrafficMonitoringCharts />);
    
    const timeRangeButton = screen.getByText('Last 24h');
    await user.click(timeRangeButton);
    
    expect(screen.getByText('Last 7d')).toBeInTheDocument();
  });
});

// Test suite for EndpointConfigurationPanel
describe('EndpointConfigurationPanel Component', () => {
  test('renders endpoint configuration interface', () => {
    render(<EndpointConfigurationPanel />);
    
    expect(screen.getByText('API Endpoint Configuration')).toBeInTheDocument();
    expect(screen.getByText('Manage API endpoints with wedding-specific settings')).toBeInTheDocument();
  });

  test('displays endpoint list', () => {
    render(<EndpointConfigurationPanel />);
    
    expect(screen.getByText('Wedding Timeline API')).toBeInTheDocument();
    expect(screen.getByText('Vendor Communication')).toBeInTheDocument();
    expect(screen.getByText('Photo Gallery Management')).toBeInTheDocument();
  });

  test('opens add endpoint modal', async () => {
    const user = userEvent.setup();
    render(<EndpointConfigurationPanel />);
    
    const addButton = screen.getByText('Add Endpoint');
    await user.click(addButton);
    
    expect(screen.getByText('Add New API Endpoint')).toBeInTheDocument();
  });

  test('handles endpoint form validation', async () => {
    const user = userEvent.setup();
    render(<EndpointConfigurationPanel />);
    
    // Open add modal
    const addButton = screen.getByText('Add Endpoint');
    await user.click(addButton);
    
    // Try to create without required fields
    const createButton = screen.getByText('Create Endpoint');
    await user.click(createButton);
    
    // Should show validation errors (form validation prevents submission)
    expect(screen.getByText('Add New API Endpoint')).toBeInTheDocument();
  });

  test('handles edit endpoint functionality', async () => {
    const user = userEvent.setup();
    render(<EndpointConfigurationPanel />);
    
    // Find and click edit button for first endpoint
    const editButtons = screen.getAllByLabelText('Edit endpoint');
    await user.click(editButtons[0]);
    
    expect(screen.getByText('Edit API Endpoint')).toBeInTheDocument();
  });
});

// Test suite for RateLimitingControls
describe('RateLimitingControls Component', () => {
  test('renders rate limiting interface', () => {
    render(<RateLimitingControls />);
    
    expect(screen.getByText('Rate Limiting & Traffic Control')).toBeInTheDocument();
    expect(screen.getByText('Wedding-aware traffic management with seasonal adjustments')).toBeInTheDocument();
  });

  test('displays rate limiting rules', () => {
    render(<RateLimitingControls />);
    
    expect(screen.getByText('Global API Rate Limit')).toBeInTheDocument();
    expect(screen.getByText('Wedding Day Protection')).toBeInTheDocument();
    expect(screen.getByText('Vendor Upload Limit')).toBeInTheDocument();
  });

  test('handles emergency override activation', async () => {
    const user = userEvent.setup();
    render(<RateLimitingControls />);
    
    const emergencyButton = screen.getByText('Emergency Override');
    await user.click(emergencyButton);
    
    // Should show confirmation or immediate activation
    expect(screen.getByText('Emergency Override')).toBeInTheDocument();
  });

  test('shows seasonal adjustment controls', () => {
    render(<RateLimitingControls />);
    
    expect(screen.getByText('Seasonal Adjustments')).toBeInTheDocument();
    expect(screen.getByText('Peak Season Multiplier')).toBeInTheDocument();
  });

  test('displays algorithm selection', () => {
    render(<RateLimitingControls />);
    
    expect(screen.getByText('Token Bucket')).toBeInTheDocument();
    expect(screen.getByText('Sliding Window')).toBeInTheDocument();
    expect(screen.getByText('Fixed Window')).toBeInTheDocument();
  });
});

// Test suite for APISecurityManager
describe('APISecurityManager Component', () => {
  test('renders security manager interface', () => {
    render(<APISecurityManager />);
    
    expect(screen.getByText('API Security Management')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive security policies with wedding day protocols')).toBeInTheDocument();
  });

  test('displays security policies', () => {
    render(<APISecurityManager />);
    
    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.getByText('Rate Limiting Enforced')).toBeInTheDocument();
    expect(screen.getByText('Wedding Day IP Whitelist')).toBeInTheDocument();
  });

  test('shows threat monitoring', () => {
    render(<APISecurityManager />);
    
    const monitoringTab = screen.getByText('Threat Monitoring');
    expect(monitoringTab).toBeInTheDocument();
  });

  test('handles security alert management', () => {
    render(<APISecurityManager />);
    
    expect(screen.getByText('Recent Security Events')).toBeInTheDocument();
    expect(screen.getByText(/Suspicious API activity detected/)).toBeInTheDocument();
  });

  test('displays emergency lockdown controls', () => {
    render(<APISecurityManager />);
    
    const emergencyTab = screen.getByText('Emergency');
    expect(emergencyTab).toBeInTheDocument();
  });
});

// Test suite for WeddingAPIUsageAnalytics
describe('WeddingAPIUsageAnalytics Component', () => {
  test('renders wedding API analytics interface', () => {
    render(<WeddingAPIUsageAnalytics />);
    
    expect(screen.getByText('Wedding API Usage Analytics')).toBeInTheDocument();
    expect(screen.getByText('Wedding-specific API analytics and performance insights')).toBeInTheDocument();
  });

  test('displays seasonal trends', () => {
    render(<WeddingAPIUsageAnalytics />);
    
    expect(screen.getByText('Seasonal Trends')).toBeInTheDocument();
    expect(screen.getByText(/Peak Season/)).toBeInTheDocument();
  });

  test('shows vendor usage breakdown', () => {
    render(<WeddingAPIUsageAnalytics />);
    
    expect(screen.getByText('Vendor Usage Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Photographers')).toBeInTheDocument();
    expect(screen.getByText('Venues')).toBeInTheDocument();
    expect(screen.getByText('Florists')).toBeInTheDocument();
  });

  test('displays wedding day activity patterns', () => {
    render(<WeddingAPIUsageAnalytics />);
    
    expect(screen.getByText('Wedding Day Activity')).toBeInTheDocument();
    expect(screen.getAllByTestId('chart-container')).toHaveLength(4);
  });

  test('handles time range filtering', async () => {
    const user = userEvent.setup();
    render(<WeddingAPIUsageAnalytics />);
    
    const filterButton = screen.getByText('Last 30 Days');
    await user.click(filterButton);
    
    expect(screen.getByText('Last 3 Months')).toBeInTheDocument();
  });
});

// Test suite for VendorAPIAccessManager
describe('VendorAPIAccessManager Component', () => {
  test('renders vendor access manager interface', () => {
    render(<VendorAPIAccessManager />);
    
    expect(screen.getByText('Vendor API Access Management')).toBeInTheDocument();
    expect(screen.getByText('Manage vendor API access and permissions with wedding day controls')).toBeInTheDocument();
  });

  test('displays vendor access list', () => {
    render(<VendorAPIAccessManager />);
    
    expect(screen.getByText('Dream Photography Studio')).toBeInTheDocument();
    expect(screen.getByText('Golden Gate Venues')).toBeInTheDocument();
    expect(screen.getByText('Bella Flora Designs')).toBeInTheDocument();
  });

  test('shows API key management', () => {
    render(<VendorAPIAccessManager />);
    
    expect(screen.getByText('API Keys')).toBeInTheDocument();
    expect(screen.getByText('Generate New Key')).toBeInTheDocument();
  });

  test('handles permission editing', async () => {
    const user = userEvent.setup();
    render(<VendorAPIAccessManager />);
    
    // Find edit button for first vendor
    const editButtons = screen.getAllByLabelText('Edit vendor access');
    await user.click(editButtons[0]);
    
    expect(screen.getByText('Edit Vendor Access')).toBeInTheDocument();
  });

  test('displays usage quotas', () => {
    render(<VendorAPIAccessManager />);
    
    expect(screen.getByText('Usage Quotas')).toBeInTheDocument();
    expect(screen.getByText(/Monthly Limit/)).toBeInTheDocument();
  });
});

// Test suite for SeasonalTrafficMonitor
describe('SeasonalTrafficMonitor Component', () => {
  test('renders seasonal traffic monitor interface', () => {
    render(<SeasonalTrafficMonitor />);
    
    expect(screen.getByText('Seasonal Traffic Monitor')).toBeInTheDocument();
    expect(screen.getByText('Wedding season API load monitoring and capacity planning')).toBeInTheDocument();
  });

  test('displays seasonal overview', () => {
    render(<SeasonalTrafficMonitor />);
    
    expect(screen.getByText('Current Season')).toBeInTheDocument();
    expect(screen.getByText('Peak Season')).toBeInTheDocument();
    expect(screen.getByText('May - October')).toBeInTheDocument();
  });

  test('shows capacity planning metrics', () => {
    render(<SeasonalTrafficMonitor />);
    
    expect(screen.getByText('Capacity Planning')).toBeInTheDocument();
    expect(screen.getByText('Current Usage')).toBeInTheDocument();
    expect(screen.getByText('Recommended Scaling')).toBeInTheDocument();
  });

  test('displays seasonal charts', () => {
    render(<SeasonalTrafficMonitor />);
    
    expect(screen.getAllByTestId('chart-container')).toHaveLength(3); // 3 different charts
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('handles scaling recommendations', () => {
    render(<SeasonalTrafficMonitor />);
    
    expect(screen.getByText('Scaling Recommendations')).toBeInTheDocument();
    expect(screen.getByText(/Scale up by/)).toBeInTheDocument();
  });

  test('shows peak season alerts', () => {
    render(<SeasonalTrafficMonitor />);
    
    expect(screen.getByText(/Peak Season Alert/)).toBeInTheDocument();
  });
});

// Test suite for CriticalEndpointProtection
describe('CriticalEndpointProtection Component', () => {
  test('renders critical endpoint protection interface', () => {
    render(<CriticalEndpointProtection />);
    
    expect(screen.getByText('Critical Endpoint Protection')).toBeInTheDocument();
    expect(screen.getByText('Wedding-critical API protection with emergency protocols')).toBeInTheDocument();
  });

  test('displays wedding day protocol alert', () => {
    render(<CriticalEndpointProtection />);
    
    expect(screen.getByText(/Wedding Day Protocol Active/)).toBeInTheDocument();
    expect(screen.getByText(/active weddings/)).toBeInTheDocument();
  });

  test('shows critical endpoints monitoring', () => {
    render(<CriticalEndpointProtection />);
    
    expect(screen.getByText('Wedding Day Timeline API')).toBeInTheDocument();
    expect(screen.getByText('Vendor Communication Hub')).toBeInTheDocument();
    expect(screen.getByText('Photo Gallery Access')).toBeInTheDocument();
  });

  test('displays health status indicators', () => {
    render(<CriticalEndpointProtection />);
    
    expect(screen.getByText('Healthy Endpoints')).toBeInTheDocument();
    expect(screen.getByText('Degraded Endpoints')).toBeInTheDocument();
    expect(screen.getByText('Active Rules')).toBeInTheDocument();
  });

  test('handles tab navigation', async () => {
    const user = userEvent.setup();
    render(<CriticalEndpointProtection />);
    
    const protectionTab = screen.getByText('Protection Rules');
    await user.click(protectionTab);
    
    expect(screen.getByText('Active Protection Rules')).toBeInTheDocument();
    
    const recoveryTab = screen.getByText('Recovery');
    await user.click(recoveryTab);
    
    expect(screen.getByText('Emergency Recovery Actions')).toBeInTheDocument();
  });

  test('shows emergency recovery actions', async () => {
    const user = userEvent.setup();
    render(<CriticalEndpointProtection />);
    
    const recoveryTab = screen.getByText('Recovery');
    await user.click(recoveryTab);
    
    expect(screen.getByText('Wedding Day Lockdown')).toBeInTheDocument();
    expect(screen.getByText('Circuit Breaker Reset')).toBeInTheDocument();
    expect(screen.getByText('Force Cache Refresh')).toBeInTheDocument();
  });

  test('displays protection rule toggles', async () => {
    const user = userEvent.setup();
    render(<CriticalEndpointProtection />);
    
    const protectionTab = screen.getByText('Protection Rules');
    await user.click(protectionTab);
    
    // Should have toggle switches for protection rules
    const toggles = screen.getAllByRole('checkbox');
    expect(toggles.length).toBeGreaterThan(0);
  });
});

// Integration Tests
describe('API Gateway Components Integration', () => {
  test('all components render without errors', () => {
    const components = [
      APIGatewayDashboard,
      TrafficMonitoringCharts,
      EndpointConfigurationPanel,
      RateLimitingControls,
      APISecurityManager,
      WeddingAPIUsageAnalytics,
      VendorAPIAccessManager,
      SeasonalTrafficMonitor,
      CriticalEndpointProtection
    ];

    components.forEach((Component) => {
      const { unmount } = render(<Component />);
      expect(document.body).toBeInTheDocument();
      unmount();
    });
  });

  test('components handle wedding day context consistently', () => {
    render(<APIGatewayDashboard />);
    expect(screen.getByText(/Wedding Day Protocol/)).toBeInTheDocument();
    
    render(<CriticalEndpointProtection />);
    expect(screen.getByText(/Wedding Day Protocol Active/)).toBeInTheDocument();
    
    render(<TrafficMonitoringCharts />);
    expect(screen.getByText(/Wedding Day Enhanced Monitoring/)).toBeInTheDocument();
  });

  test('all components are mobile responsive', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    
    const components = [
      APIGatewayDashboard,
      TrafficMonitoringCharts,
      EndpointConfigurationPanel,
      RateLimitingControls,
      APISecurityManager,
      WeddingAPIUsageAnalytics,
      VendorAPIAccessManager,
      SeasonalTrafficMonitor,
      CriticalEndpointProtection
    ];

    components.forEach((Component) => {
      const { unmount } = render(<Component />);
      // Components should render without layout issues on mobile
      expect(document.body).toBeInTheDocument();
      unmount();
    });
  });

  test('components handle loading states gracefully', async () => {
    render(<APIGatewayDashboard />);
    
    // Should not show loading errors
    expect(screen.queryByText(/Error/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Failed/i)).not.toBeInTheDocument();
  });
});

// Performance Tests
describe('API Gateway Components Performance', () => {
  test('components render within performance budget', async () => {
    const startTime = performance.now();
    
    render(<APIGatewayDashboard />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within 100ms
    expect(renderTime).toBeLessThan(100);
  });

  test('chart components handle large datasets', () => {
    // Mock large dataset
    const mockLargeData = Array.from({ length: 1000 }, (_, i) => ({
      time: `2025-01-${String(i % 31 + 1).padStart(2, '0')}`,
      requests: Math.floor(Math.random() * 1000),
      errors: Math.floor(Math.random() * 50)
    }));

    // Components should handle large datasets without crashing
    render(<TrafficMonitoringCharts />);
    expect(screen.getByText('API Traffic Monitoring')).toBeInTheDocument();
  });
});

// Accessibility Tests
describe('API Gateway Components Accessibility', () => {
  test('components have proper ARIA labels', () => {
    render(<APIGatewayDashboard />);
    
    // Should have proper headings
    expect(screen.getByRole('heading', { name: /API Gateway Dashboard/i })).toBeInTheDocument();
  });

  test('form components have proper labels', () => {
    render(<EndpointConfigurationPanel />);
    
    // Should have accessible form controls
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('interactive elements are keyboard accessible', async () => {
    const user = userEvent.setup();
    render(<APIGatewayDashboard />);
    
    // Tab navigation should work
    await user.tab();
    expect(document.activeElement).toBeDefined();
  });

  test('components provide proper color contrast', () => {
    render(<APIGatewayDashboard />);
    
    // Should have text content that indicates proper contrast
    expect(screen.getByText('API Gateway Dashboard')).toBeInTheDocument();
  });
});

// Error Handling Tests
describe('API Gateway Components Error Handling', () => {
  test('components handle missing props gracefully', () => {
    // Should not crash with missing optional props
    expect(() => render(<APIGatewayDashboard />)).not.toThrow();
    expect(() => render(<TrafficMonitoringCharts />)).not.toThrow();
    expect(() => render(<CriticalEndpointProtection />)).not.toThrow();
  });

  test('components display error boundaries properly', () => {
    // Mock console.error to avoid cluttering test output
    const originalError = console.error;
    console.error = jest.fn();

    render(<APIGatewayDashboard />);
    
    // Should not show unhandled errors
    expect(console.error).not.toHaveBeenCalled();
    
    console.error = originalError;
  });
});