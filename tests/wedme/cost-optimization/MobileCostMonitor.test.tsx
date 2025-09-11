/**
 * Mobile Cost Monitor Tests
 * WS-240 AI Cost Optimization System - Team D
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileCostMonitor } from '@/components/wedme/cost-optimization/MobileCostMonitor';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('MobileCostMonitor', () => {
  const mockProps = {
    supplierType: 'photography' as const,
    currentCosts: {
      daily: 1250.50,
      weekly: 8750.25,
      monthly: 25000.00,
      projected: 30000.00
    },
    budgetLimits: {
      daily: 1500.00,
      weekly: 10000.00,
      monthly: 28000.00
    },
    isOnline: true,
    onEmergencyStop: jest.fn(),
    onOptimizationToggle: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders mobile cost monitor with current costs', () => {
    render(<MobileCostMonitor {...mockProps} />);
    
    expect(screen.getByText('Mobile Cost Monitor')).toBeInTheDocument();
    expect(screen.getByText('£1,251')).toBeInTheDocument(); // Daily cost
    expect(screen.getByText('£8,750')).toBeInTheDocument(); // Weekly cost
  });

  it('shows correct alert status for over-budget scenarios', () => {
    const overBudgetProps = {
      ...mockProps,
      currentCosts: {
        ...mockProps.currentCosts,
        daily: 1600.00 // Over daily limit
      }
    };

    render(<MobileCostMonitor {...overBudgetProps} />);
    
    expect(screen.getByTestId('cost-alert-danger')).toBeInTheDocument();
  });

  it('handles emergency stop button click', async () => {
    render(<MobileCostMonitor {...mockProps} />);
    
    const emergencyButton = screen.getByRole('button', { name: /emergency stop/i });
    fireEvent.click(emergencyButton);
    
    await waitFor(() => {
      expect(mockProps.onEmergencyStop).toHaveBeenCalledTimes(1);
    });
  });

  it('displays offline indicator when not connected', () => {
    render(<MobileCostMonitor {...mockProps} isOnline={false} />);
    
    expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
  });

  it('shows supplier-specific cost metrics for photography', () => {
    render(<MobileCostMonitor {...mockProps} supplierType="photography" />);
    
    expect(screen.getByText(/equipment costs/i)).toBeInTheDocument();
    expect(screen.getByText(/editing time/i)).toBeInTheDocument();
  });

  it('adapts interface for venue supplier type', () => {
    render(<MobileCostMonitor {...mockProps} supplierType="venue" />);
    
    expect(screen.getByText(/booking costs/i)).toBeInTheDocument();
    expect(screen.getByText(/maintenance/i)).toBeInTheDocument();
  });

  it('has touch-friendly button sizes (minimum 48px)', () => {
    render(<MobileCostMonitor {...mockProps} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      const styles = window.getComputedStyle(button);
      const minHeight = parseInt(styles.minHeight || '0');
      expect(minHeight).toBeGreaterThanOrEqual(48);
    });
  });

  it('updates real-time when cost data changes', async () => {
    const { rerender } = render(<MobileCostMonitor {...mockProps} />);
    
    expect(screen.getByText('£1,251')).toBeInTheDocument();
    
    const updatedProps = {
      ...mockProps,
      currentCosts: {
        ...mockProps.currentCosts,
        daily: 1400.75
      }
    };
    
    rerender(<MobileCostMonitor {...updatedProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('£1,401')).toBeInTheDocument();
    });
  });
});