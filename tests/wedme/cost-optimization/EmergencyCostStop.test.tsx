/**
 * Emergency Cost Stop Tests
 * WS-240 AI Cost Optimization System - Team D
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmergencyCostStop } from '@/components/wedme/cost-optimization/EmergencyCostStop';

describe('EmergencyCostStop', () => {
  const mockProps = {
    isActive: false,
    currentThreat: {
      level: 'high' as const,
      message: 'Budget exceeded by 15%',
      suggestedActions: ['Pause new bookings', 'Review current expenses']
    },
    onActivate: jest.fn(),
    onDeactivate: jest.fn(),
    onContactSupport: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders emergency stop interface', () => {
    render(<EmergencyCostStop {...mockProps} />);
    
    expect(screen.getByText('Emergency Cost Stop')).toBeInTheDocument();
    expect(screen.getByText('Budget exceeded by 15%')).toBeInTheDocument();
  });

  it('shows activation button when not active', () => {
    render(<EmergencyCostStop {...mockProps} />);
    
    const activateButton = screen.getByRole('button', { name: /activate emergency stop/i });
    expect(activateButton).toBeInTheDocument();
    expect(activateButton).not.toBeDisabled();
  });

  it('shows deactivation controls when active', () => {
    render(<EmergencyCostStop {...mockProps} isActive={true} />);
    
    expect(screen.getByText(/emergency stop active/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument();
  });

  it('handles emergency stop activation', async () => {
    render(<EmergencyCostStop {...mockProps} />);
    
    const activateButton = screen.getByRole('button', { name: /activate emergency stop/i });
    fireEvent.click(activateButton);
    
    await waitFor(() => {
      expect(mockProps.onActivate).toHaveBeenCalledTimes(1);
    });
  });

  it('displays suggested actions for threat mitigation', () => {
    render(<EmergencyCostStop {...mockProps} />);
    
    expect(screen.getByText('Pause new bookings')).toBeInTheDocument();
    expect(screen.getByText('Review current expenses')).toBeInTheDocument();
  });

  it('shows contact support option for high threats', () => {
    render(<EmergencyCostStop {...mockProps} />);
    
    const contactButton = screen.getByRole('button', { name: /contact support/i });
    expect(contactButton).toBeInTheDocument();
    
    fireEvent.click(contactButton);
    expect(mockProps.onContactSupport).toHaveBeenCalledTimes(1);
  });

  it('has large touch-friendly emergency button', () => {
    render(<EmergencyCostStop {...mockProps} />);
    
    const emergencyButton = screen.getByRole('button', { name: /activate emergency stop/i });
    const styles = window.getComputedStyle(emergencyButton);
    const minHeight = parseInt(styles.minHeight || '0');
    
    expect(minHeight).toBeGreaterThanOrEqual(56); // Extra large for emergency
  });
});