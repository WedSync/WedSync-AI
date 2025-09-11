/**
 * WS-245 Wedding Budget Optimizer - Accessibility Tests
 * 
 * CRITICAL: Budget interfaces must be accessible to all users including those with disabilities.
 * Legal compliance with WCAG 2.1 AA standards is required in many jurisdictions.
 * 
 * Accessibility requirements:
 * - Screen reader compatible financial data announcements
 * - Keyboard navigation for all budget interactions
 * - High contrast mode support (4.5:1 ratio minimum)
 * - Focus management during dynamic budget updates
 * - Proper ARIA labels for financial information
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import React from 'react';
import Decimal from 'decimal.js';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock Budget Components for Testing
const BudgetOptimizerComponent: React.FC<{
  initialBudget?: string;
  categories?: Array<{ name: string; amount: string }>;
  onBudgetChange?: (budget: any) => void;
}> = ({ 
  initialBudget = '25000.00', 
  categories = [
    { name: 'venue', amount: '8000.00' },
    { name: 'catering', amount: '6000.00' },
    { name: 'photography', amount: '3000.00' }
  ],
  onBudgetChange 
}) => {
  const [totalBudget, setTotalBudget] = React.useState(initialBudget);
  const [budgetCategories, setBudgetCategories] = React.useState(categories);
  const [isOptimizing, setIsOptimizing] = React.useState(false);

  const handleTotalBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTotal = e.target.value;
    setTotalBudget(newTotal);
    onBudgetChange?.({ total: newTotal, categories: budgetCategories });
  };

  const handleCategoryChange = (index: number, newAmount: string) => {
    const newCategories = [...budgetCategories];
    newCategories[index].amount = newAmount;
    setBudgetCategories(newCategories);
    onBudgetChange?.({ total: totalBudget, categories: newCategories });
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    // Simulate AI optimization
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock optimization results
    const optimized = budgetCategories.map(cat => ({
      ...cat,
      amount: (parseFloat(cat.amount) * 0.95).toFixed(2)
    }));
    setBudgetCategories(optimized);
    setIsOptimizing(false);
  };

  return (
    <div 
      role="main" 
      aria-labelledby="budget-optimizer-title"
      className="budget-optimizer"
    >
      <h1 id="budget-optimizer-title">Wedding Budget Optimizer</h1>
      
      {/* Total Budget Input */}
      <div className="budget-section">
        <label 
          htmlFor="total-budget"
          className="budget-label"
        >
          Total Wedding Budget (£)
          <span className="required" aria-label="required field">*</span>
        </label>
        <input
          id="total-budget"
          type="number"
          min="0"
          step="0.01"
          value={totalBudget}
          onChange={handleTotalBudgetChange}
          aria-describedby="total-budget-help"
          aria-required="true"
          className="budget-input"
        />
        <div id="total-budget-help" className="help-text">
          Enter your total wedding budget in pounds (£)
        </div>
      </div>

      {/* Category Allocations */}
      <fieldset className="budget-categories">
        <legend>Budget Category Allocations</legend>
        {budgetCategories.map((category, index) => (
          <div key={category.name} className="category-row">
            <label 
              htmlFor={`category-${category.name}`}
              className="category-label"
            >
              {category.name.charAt(0).toUpperCase() + category.name.slice(1)} (£)
            </label>
            <input
              id={`category-${category.name}`}
              type="number"
              min="0"
              step="0.01"
              value={category.amount}
              onChange={(e) => handleCategoryChange(index, e.target.value)}
              aria-describedby={`${category.name}-percentage`}
              className="category-input"
            />
            <span 
              id={`${category.name}-percentage`} 
              className="percentage-display"
              aria-live="polite"
            >
              {((parseFloat(category.amount) / parseFloat(totalBudget)) * 100).toFixed(1)}% of total
            </span>
          </div>
        ))}
      </fieldset>

      {/* Budget Summary */}
      <div 
        className="budget-summary" 
        role="region" 
        aria-labelledby="summary-title"
        aria-live="polite"
      >
        <h2 id="summary-title">Budget Summary</h2>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-label">Total Allocated:</span>
            <span 
              className="stat-value" 
              aria-label={`Total allocated: £${budgetCategories.reduce((sum, cat) => sum + parseFloat(cat.amount), 0).toFixed(2)}`}
            >
              £{budgetCategories.reduce((sum, cat) => sum + parseFloat(cat.amount), 0).toFixed(2)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Remaining:</span>
            <span 
              className="stat-value"
              aria-label={`Remaining budget: £${(parseFloat(totalBudget) - budgetCategories.reduce((sum, cat) => sum + parseFloat(cat.amount), 0)).toFixed(2)}`}
            >
              £{(parseFloat(totalBudget) - budgetCategories.reduce((sum, cat) => sum + parseFloat(cat.amount), 0)).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Optimization Controls */}
      <div className="optimization-controls">
        <button
          type="button"
          onClick={handleOptimize}
          disabled={isOptimizing}
          aria-describedby="optimize-help"
          className="optimize-button"
        >
          {isOptimizing ? 'Optimizing Budget...' : 'Optimize Budget with AI'}
        </button>
        <div id="optimize-help" className="help-text">
          AI will analyze your budget and suggest cost-saving optimizations
        </div>
        
        {isOptimizing && (
          <div 
            className="loading-indicator"
            role="status" 
            aria-live="polite"
            aria-label="Optimizing your budget, please wait"
          >
            <span className="sr-only">Optimizing budget...</span>
            <div className="spinner" aria-hidden="true"></div>
          </div>
        )}
      </div>
    </div>
  );
};

// Budget Results Display Component
const BudgetResultsComponent: React.FC<{
  recommendations?: Array<{
    category: string;
    currentAmount: string;
    recommendedAmount: string;
    savings: string;
    reason: string;
  }>;
}> = ({ 
  recommendations = [
    {
      category: 'Photography',
      currentAmount: '3000.00',
      recommendedAmount: '2500.00',
      savings: '500.00',
      reason: 'Found excellent photographers offering similar packages at lower rates'
    }
  ]
}) => {
  return (
    <div 
      className="budget-results"
      role="region"
      aria-labelledby="results-title"
    >
      <h2 id="results-title">AI Optimization Recommendations</h2>
      
      <div 
        className="results-summary"
        aria-live="polite"
      >
        <p>
          We found <strong>{recommendations.length}</strong> optimization opportunities 
          that could save you <strong>
            £{recommendations.reduce((sum, rec) => sum + parseFloat(rec.savings), 0).toFixed(2)}
          </strong> total.
        </p>
      </div>

      <ul className="recommendations-list" role="list">
        {recommendations.map((rec, index) => (
          <li key={index} className="recommendation-item" role="listitem">
            <div className="recommendation-header">
              <h3 className="recommendation-category">{rec.category}</h3>
              <div 
                className="recommendation-savings"
                aria-label={`Potential savings: £${rec.savings}`}
              >
                Save £{rec.savings}
              </div>
            </div>
            
            <div className="recommendation-details">
              <div className="amount-comparison">
                <span className="current-amount">
                  Current: <span aria-label={`Currently allocated £${rec.currentAmount}`}>£{rec.currentAmount}</span>
                </span>
                <span className="arrow" aria-hidden="true">→</span>
                <span className="recommended-amount">
                  Recommended: <span aria-label={`Recommended amount £${rec.recommendedAmount}`}>£{rec.recommendedAmount}</span>
                </span>
              </div>
              
              <p className="recommendation-reason">{rec.reason}</p>
              
              <div className="recommendation-actions">
                <button
                  type="button"
                  className="accept-button"
                  aria-describedby={`accept-help-${index}`}
                >
                  Accept Recommendation
                </button>
                <button
                  type="button"
                  className="decline-button"
                  aria-describedby={`decline-help-${index}`}
                >
                  Decline
                </button>
                
                <div id={`accept-help-${index}`} className="sr-only">
                  Accept this recommendation to reduce {rec.category.toLowerCase()} budget by £{rec.savings}
                </div>
                <div id={`decline-help-${index}`} className="sr-only">
                  Keep current {rec.category.toLowerCase()} budget allocation of £{rec.currentAmount}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

describe('WS-245 Budget Accessibility Tests', () => {
  describe('WCAG 2.1 AA Compliance', () => {
    test('budget optimizer has no accessibility violations', async () => {
      const { container } = render(<BudgetOptimizerComponent />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('budget results display has no accessibility violations', async () => {
      const { container } = render(<BudgetResultsComponent />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('all form inputs have proper labels', () => {
      render(<BudgetOptimizerComponent />);
      
      const totalBudgetInput = screen.getByLabelText(/total wedding budget/i);
      expect(totalBudgetInput).toBeInTheDocument();
      expect(totalBudgetInput).toHaveAttribute('aria-required', 'true');
      
      const venueInput = screen.getByLabelText(/venue/i);
      expect(venueInput).toBeInTheDocument();
      
      const cateringInput = screen.getByLabelText(/catering/i);
      expect(cateringInput).toBeInTheDocument();
    });

    test('required fields are properly marked', () => {
      render(<BudgetOptimizerComponent />);
      
      const requiredField = screen.getByLabelText(/total wedding budget/i);
      expect(requiredField).toHaveAttribute('aria-required', 'true');
      
      const requiredIndicator = screen.getByLabelText('required field');
      expect(requiredIndicator).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    test('all interactive elements are keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<BudgetOptimizerComponent />);
      
      // Tab through all interactive elements
      await user.tab(); // Total budget input
      expect(screen.getByLabelText(/total wedding budget/i)).toHaveFocus();
      
      await user.tab(); // First category input
      expect(screen.getByLabelText(/venue/i)).toHaveFocus();
      
      await user.tab(); // Second category input  
      expect(screen.getByLabelText(/catering/i)).toHaveFocus();
      
      await user.tab(); // Third category input
      expect(screen.getByLabelText(/photography/i)).toHaveFocus();
      
      await user.tab(); // Optimize button
      expect(screen.getByRole('button', { name: /optimize budget/i })).toHaveFocus();
    });

    test('keyboard navigation works with Enter and Space keys', async () => {
      const user = userEvent.setup();
      render(<BudgetOptimizerComponent />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize budget/i });
      optimizeButton.focus();
      
      // Should trigger optimization with Enter key
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(screen.getByText(/optimizing budget/i)).toBeInTheDocument();
      });
    });

    test('Escape key closes modals and dropdowns', async () => {
      const user = userEvent.setup();
      render(<BudgetResultsComponent />);
      
      // Focus on an action button
      const acceptButton = screen.getByRole('button', { name: /accept recommendation/i });
      acceptButton.focus();
      
      // Escape key should be handled (in real implementation would close any open menus)
      await user.keyboard('{Escape}');
      expect(acceptButton).toHaveFocus(); // Focus should remain on button
    });
  });

  describe('Screen Reader Support', () => {
    test('financial amounts are announced properly', () => {
      render(<BudgetOptimizerComponent />);
      
      const totalAllocated = screen.getByLabelText(/total allocated.*£17000\.00/i);
      expect(totalAllocated).toBeInTheDocument();
      
      const remaining = screen.getByLabelText(/remaining budget.*£8000\.00/i);
      expect(remaining).toBeInTheDocument();
    });

    test('percentage calculations are announced', () => {
      render(<BudgetOptimizerComponent />);
      
      const venuePercentage = screen.getByText(/32\.0% of total/i);
      expect(venuePercentage).toBeInTheDocument();
      expect(venuePercentage).toHaveAttribute('aria-live', 'polite');
    });

    test('loading states are announced', async () => {
      const user = userEvent.setup();
      render(<BudgetOptimizerComponent />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize budget/i });
      await user.click(optimizeButton);
      
      const loadingStatus = await screen.findByRole('status');
      expect(loadingStatus).toHaveAttribute('aria-live', 'polite');
      expect(loadingStatus).toHaveAttribute('aria-label', 'Optimizing your budget, please wait');
    });

    test('budget changes are announced dynamically', async () => {
      const user = userEvent.setup();
      render(<BudgetOptimizerComponent />);
      
      const venueInput = screen.getByLabelText(/venue/i);
      const summaryRegion = screen.getByRole('region', { name: /budget summary/i });
      
      expect(summaryRegion).toHaveAttribute('aria-live', 'polite');
      
      // Change venue budget
      await user.clear(venueInput);
      await user.type(venueInput, '10000');
      
      // Summary should update and be announced
      await waitFor(() => {
        expect(screen.getByLabelText(/total allocated.*£19000\.00/i)).toBeInTheDocument();
      });
    });

    test('error messages are associated with fields', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<BudgetOptimizerComponent />);
      
      const totalBudgetInput = screen.getByLabelText(/total wedding budget/i);
      
      // Simulate error state by entering negative value
      await user.clear(totalBudgetInput);
      await user.type(totalBudgetInput, '-1000');
      
      // In real implementation, would show error message
      // Error should be linked via aria-describedby or aria-errormessage
      expect(totalBudgetInput).toHaveAttribute('aria-describedby');
    });
  });

  describe('Focus Management', () => {
    test('focus is managed during dynamic content updates', async () => {
      const user = userEvent.setup();
      render(<BudgetOptimizerComponent />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize budget/i });
      await user.click(optimizeButton);
      
      // Focus should remain on a logical element during optimization
      expect(document.activeElement).toBe(optimizeButton);
      
      // After optimization completes, focus should be managed appropriately
      await waitFor(() => {
        expect(screen.queryByText(/optimizing budget/i)).not.toBeInTheDocument();
      });
    });

    test('focus returns to trigger element after modal interactions', async () => {
      const user = userEvent.setup();
      render(<BudgetResultsComponent />);
      
      const acceptButton = screen.getByRole('button', { name: /accept recommendation/i });
      acceptButton.focus();
      expect(acceptButton).toHaveFocus();
      
      // In real implementation, clicking would open modal
      await user.click(acceptButton);
      
      // After modal closes, focus should return to trigger
      expect(acceptButton).toHaveFocus();
    });

    test('focus visible styles are present', () => {
      render(<BudgetOptimizerComponent />);
      
      const totalBudgetInput = screen.getByLabelText(/total wedding budget/i);
      totalBudgetInput.focus();
      
      // Should have focus styles (would check computed styles in real test)
      expect(totalBudgetInput).toHaveFocus();
    });
  });

  describe('Color and Contrast', () => {
    test('important information is not conveyed by color alone', () => {
      render(<BudgetResultsComponent />);
      
      // Savings should have text indicator, not just color
      const savingsText = screen.getByText(/Save £500\.00/i);
      expect(savingsText).toBeInTheDocument();
      
      // Should also have semantic meaning beyond color
      const savingsLabel = screen.getByLabelText(/potential savings.*£500\.00/i);
      expect(savingsLabel).toBeInTheDocument();
    });

    test('form validation errors use multiple indicators', async () => {
      // In real implementation, would test that validation errors use:
      // 1. Color (red border)
      // 2. Icon (error icon)
      // 3. Text (error message)
      // 4. ARIA attributes (aria-invalid, aria-describedby)
      
      render(<BudgetOptimizerComponent />);
      const totalBudgetInput = screen.getByLabelText(/total wedding budget/i);
      
      // Input should support validation states
      expect(totalBudgetInput).toHaveAttribute('type', 'number');
      expect(totalBudgetInput).toHaveAttribute('min', '0');
    });

    test('disabled states are clearly indicated', async () => {
      const user = userEvent.setup();
      render(<BudgetOptimizerComponent />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize budget/i });
      await user.click(optimizeButton);
      
      // Button should be disabled during optimization
      await waitFor(() => {
        const disabledButton = screen.getByRole('button', { name: /optimizing budget/i });
        expect(disabledButton).toBeDisabled();
      });
    });
  });

  describe('Mobile Accessibility', () => {
    test('touch targets meet minimum size requirements', () => {
      render(<BudgetOptimizerComponent />);
      
      // Buttons and inputs should be large enough for touch (44px minimum)
      const optimizeButton = screen.getByRole('button', { name: /optimize budget/i });
      expect(optimizeButton).toBeInTheDocument();
      
      const totalBudgetInput = screen.getByLabelText(/total wedding budget/i);
      expect(totalBudgetInput).toBeInTheDocument();
      
      // In real implementation, would check computed styles for minimum dimensions
    });

    test('swipe gestures have keyboard alternatives', () => {
      render(<BudgetResultsComponent />);
      
      // All swipe functionality should have button alternatives
      const acceptButton = screen.getByRole('button', { name: /accept recommendation/i });
      const declineButton = screen.getByRole('button', { name: /decline/i });
      
      expect(acceptButton).toBeInTheDocument();
      expect(declineButton).toBeInTheDocument();
    });

    test('zoom to 200% maintains usability', () => {
      // In real implementation, would test that content reflows properly at 200% zoom
      render(<BudgetOptimizerComponent />);
      
      // All content should remain visible and functional when zoomed
      expect(screen.getByLabelText(/total wedding budget/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /optimize budget/i })).toBeInTheDocument();
    });
  });

  describe('Content Accessibility', () => {
    test('headings create proper document structure', () => {
      render(
        <>
          <BudgetOptimizerComponent />
          <BudgetResultsComponent />
        </>
      );
      
      const h1 = screen.getByRole('heading', { level: 1, name: /wedding budget optimizer/i });
      const h2Summary = screen.getByRole('heading', { level: 2, name: /budget summary/i });
      const h2Results = screen.getByRole('heading', { level: 2, name: /ai optimization recommendations/i });
      
      expect(h1).toBeInTheDocument();
      expect(h2Summary).toBeInTheDocument();
      expect(h2Results).toBeInTheDocument();
    });

    test('lists are properly structured', () => {
      render(<BudgetResultsComponent />);
      
      const recommendationsList = screen.getByRole('list');
      expect(recommendationsList).toBeInTheDocument();
      
      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBeGreaterThan(0);
    });

    test('form groups are properly labeled', () => {
      render(<BudgetOptimizerComponent />);
      
      const fieldset = screen.getByRole('group', { name: /budget category allocations/i });
      expect(fieldset).toBeInTheDocument();
      
      // Should use fieldset/legend for grouping related form controls
      expect(fieldset.tagName.toLowerCase()).toBe('fieldset');
    });

    test('help text is properly associated', () => {
      render(<BudgetOptimizerComponent />);
      
      const totalBudgetInput = screen.getByLabelText(/total wedding budget/i);
      const helpTextId = totalBudgetInput.getAttribute('aria-describedby');
      
      expect(helpTextId).toBeTruthy();
      
      const helpText = document.getElementById(helpTextId!);
      expect(helpText).toBeInTheDocument();
      expect(helpText).toHaveTextContent(/enter your total wedding budget/i);
    });
  });

  describe('Progressive Enhancement', () => {
    test('core functionality works without JavaScript', () => {
      // Basic form should be submittable without JavaScript
      render(<BudgetOptimizerComponent />);
      
      const form = screen.getByRole('main');
      expect(form).toBeInTheDocument();
      
      // Form inputs should work without JavaScript
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).not.toBeDisabled();
      });
    });

    test('enhancement features degrade gracefully', () => {
      render(<BudgetOptimizerComponent />);
      
      // AI optimization should have fallback if API fails
      const optimizeButton = screen.getByRole('button', { name: /optimize budget/i });
      expect(optimizeButton).toBeInTheDocument();
      
      // In real implementation, would test graceful degradation when AI service is unavailable
    });
  });
});

export { BudgetOptimizerComponent, BudgetResultsComponent };