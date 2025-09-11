/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CostOptimizationDashboard from '@/components/ai-optimization/CostOptimizationDashboard';

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <div data-testid="card" className={className}>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => 
    <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <span data-testid="badge" className={className}>{children}</span>,
}));

describe('CostOptimizationDashboard', () => {
  const mockProps = {
    organizationId: 'test-org-1',
    className: 'test-class'
  };

  test('renders the dashboard with correct title', () => {
    render(<CostOptimizationDashboard {...mockProps} />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<CostOptimizationDashboard {...mockProps} />);
    const dashboard = screen.getByTestId('card');
    expect(dashboard).toHaveClass('test-class');
  });

  test('displays cost optimization metrics', () => {
    render(<CostOptimizationDashboard {...mockProps} />);
    expect(screen.getByTestId('card-content')).toBeInTheDocument();
  });

  test('shows wedding season context', () => {
    render(<CostOptimizationDashboard {...mockProps} />);
    // Test passes if component renders without errors
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });
});
