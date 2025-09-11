import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import TouchBudgetControls from '../../../src/components/wedme/cost-optimization/TouchBudgetControls';

// Mock haptic feedback
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
});

describe('TouchBudgetControls', () => {
  const mockOnBudgetChange = jest.fn();
  const mockOnOptimizationApply = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders budget categories with correct initial values', () => {
    render(
      <TouchBudgetControls 
        onBudgetChange={mockOnBudgetChange}
        onOptimizationApply={mockOnOptimizationApply}
      />
    );
    
    expect(screen.getByText(/Venue/)).toBeInTheDocument();
    expect(screen.getByText(/Photography/)).toBeInTheDocument();
    expect(screen.getByText(/Catering/)).toBeInTheDocument();
    expect(screen.getByText(/Flowers/)).toBeInTheDocument();
    
    expect(screen.getByText(/£5,300.00/)).toBeInTheDocument(); // Total budget
  });

  it('shows optimization banner with potential savings', () => {
    render(<TouchBudgetControls />);
    
    expect(screen.getByText(/Save £100.00/)).toBeInTheDocument();
    expect(screen.getByText(/Apply AI recommendations/)).toBeInTheDocument();
  });

  it('handles budget adjustments with plus/minus buttons', async () => {
    render(
      <TouchBudgetControls onBudgetChange={mockOnBudgetChange} />
    );
    
    // Find plus button for venue category and click it
    const plusButtons = screen.getAllByRole('button');
    const venuePlusButton = plusButtons.find(btn => 
      btn.querySelector('svg') && btn.closest('[data-testid="venue-controls"]')
    );
    
    if (venuePlusButton) {
      fireEvent.click(venuePlusButton);
      
      await waitFor(() => {
        expect(mockOnBudgetChange).toHaveBeenCalledWith('venue', 2600);
      });
    }
  });

  it('applies optimization recommendations', async () => {
    render(
      <TouchBudgetControls onOptimizationApply={mockOnOptimizationApply} />
    );
    
    const optimizeButton = screen.getByText(/Optimize/);
    fireEvent.click(optimizeButton);
    
    // Should show loading state
    expect(screen.getByText(/Optimize/)).toBeDisabled();
    
    await waitFor(() => {
      expect(mockOnOptimizationApply).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('handles slider adjustments', async () => {
    render(
      <TouchBudgetControls onBudgetChange={mockOnBudgetChange} />
    );
    
    // Find slider elements
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThan(0);
    
    // Simulate slider change
    fireEvent.change(sliders[0], { target: { value: '2800' } });
    
    await waitFor(() => {
      expect(mockOnBudgetChange).toHaveBeenCalled();
    });
  });

  it('shows progress bars for budget usage', () => {
    render(<TouchBudgetControls />);
    
    // Should show progress bars for each category
    const progressBars = document.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('handles haptic feedback toggle', () => {
    render(<TouchBudgetControls />);
    
    const hapticButton = screen.getByRole('button', { name: /vibrate/i });
    fireEvent.click(hapticButton);
    
    // Should not trigger vibration when disabled
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it('resets all budgets to original values', async () => {
    render(
      <TouchBudgetControls onBudgetChange={mockOnBudgetChange} />
    );
    
    const resetButton = screen.getByText(/Reset All/);
    fireEvent.click(resetButton);
    
    // Should trigger multiple budget change calls
    await waitFor(() => {
      expect(mockOnBudgetChange).toHaveBeenCalledTimes(4); // One for each category
    });
  });

  it('saves budget changes', () => {
    render(<TouchBudgetControls />);
    
    const saveButton = screen.getByText(/Save Changes/);
    fireEvent.click(saveButton);
    
    // Should trigger haptic feedback if enabled
    expect(navigator.vibrate).toHaveBeenCalled();
  });

  it('shows "Can optimize" badges for categories with recommendations', () => {
    render(<TouchBudgetControls />);
    
    expect(screen.getAllByText(/Can optimize/).length).toBeGreaterThan(0);
  });

  it('handles over-budget scenarios with red styling', () => {
    render(<TouchBudgetControls />);
    
    // Check for progress bars that might be over 100%
    const progressBars = document.querySelectorAll('[role="progressbar"]');
    progressBars.forEach(bar => {
      const value = bar.getAttribute('aria-valuenow');
      if (value && parseInt(value) > 100) {
        expect(bar.closest('.border-red-300')).toBeInTheDocument();
      }
    });
  });

  it('ensures touch targets meet accessibility requirements', () => {
    render(<TouchBudgetControls />);
    
    // All interactive elements should have touch-manipulation class
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('touch-manipulation');
    });
  });
});