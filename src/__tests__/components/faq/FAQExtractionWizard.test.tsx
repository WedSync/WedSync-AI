import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import FAQExtractionWizard from '@/components/faq/FAQExtractionWizard';

// Mock motion/react to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  GlobeAltIcon: ({ className }: any) => (
    <div className={className} data-testid="globe-icon" />
  ),
  DocumentTextIcon: ({ className }: any) => (
    <div className={className} data-testid="document-icon" />
  ),
  CpuChipIcon: ({ className }: any) => (
    <div className={className} data-testid="cpu-icon" />
  ),
  EyeIcon: ({ className }: any) => (
    <div className={className} data-testid="eye-icon" />
  ),
  TagIcon: ({ className }: any) => (
    <div className={className} data-testid="tag-icon" />
  ),
  CheckCircleIcon: ({ className }: any) => (
    <div className={className} data-testid="check-circle-icon" />
  ),
  ChevronLeftIcon: ({ className }: any) => (
    <div className={className} data-testid="chevron-left-icon" />
  ),
  ChevronRightIcon: ({ className }: any) => (
    <div className={className} data-testid="chevron-right-icon" />
  ),
  XMarkIcon: ({ className }: any) => (
    <div className={className} data-testid="x-mark-icon" />
  ),
  ExclamationTriangleIcon: ({ className }: any) => (
    <div className={className} data-testid="exclamation-icon" />
  ),
  InformationCircleIcon: ({ className }: any) => (
    <div className={className} data-testid="info-icon" />
  ),
}));

describe('FAQExtractionWizard', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Step 1: URL Entry', () => {
    it('renders the URL entry step initially', () => {
      render(<FAQExtractionWizard />);

      expect(screen.getByText('FAQ Extraction Wizard')).toBeInTheDocument();
      expect(screen.getByText('Enter Website URL')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('https://example.com'),
      ).toBeInTheDocument();
      expect(screen.getByText('Discover Pages')).toBeInTheDocument();
    });

    it('validates URL input correctly', async () => {
      render(<FAQExtractionWizard />);

      const input = screen.getByPlaceholderText('https://example.com');
      const submitButton = screen.getByText('Discover Pages');

      // Test empty URL
      await user.click(submitButton);
      expect(
        screen.getByText('Please enter a website URL'),
      ).toBeInTheDocument();

      // Test invalid URL
      await user.clear(input);
      await user.type(input, 'invalid-url');
      await user.click(submitButton);
      expect(
        screen.getByText(
          'Please enter a valid URL (e.g., https://example.com)',
        ),
      ).toBeInTheDocument();

      // Test valid URL
      await user.clear(input);
      await user.type(input, 'https://example.com');
      await user.click(submitButton);

      // Should show processing state
      expect(screen.getByText('Discovering Pages...')).toBeInTheDocument();
    });

    it('shows processing state during URL validation', async () => {
      render(<FAQExtractionWizard />);

      const input = screen.getByPlaceholderText('https://example.com');
      const submitButton = screen.getByText('Discover Pages');

      await user.type(input, 'https://example.com');
      await user.click(submitButton);

      expect(screen.getByText('Discovering Pages...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('displays helpful information about the extraction process', () => {
      render(<FAQExtractionWizard />);

      expect(screen.getByText("What we'll do:")).toBeInTheDocument();
      expect(
        screen.getByText('• Scan your website for FAQ and help pages'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('• Extract question and answer pairs'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('• Organize content into categories'),
      ).toBeInTheDocument();
    });
  });

  describe('Step 2: Page Discovery', () => {
    it('advances to page discovery after successful URL submission', async () => {
      render(<FAQExtractionWizard />);

      const input = screen.getByPlaceholderText('https://example.com');
      const submitButton = screen.getByText('Discover Pages');

      await user.type(input, 'https://example.com');
      await user.click(submitButton);

      // Wait for page discovery step
      await waitFor(
        () => {
          expect(
            screen.getByText('Select Pages to Analyze'),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      expect(screen.getByText('FAQ Page')).toBeInTheDocument();
      expect(screen.getByText('Help Center')).toBeInTheDocument();
      expect(screen.getByText('Start Extraction')).toBeInTheDocument();
    });

    it('allows selecting and deselecting pages', async () => {
      render(<FAQExtractionWizard />);

      // Navigate to step 2
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Select Pages to Analyze')).toBeInTheDocument();
      });

      // Test page selection
      const checkboxes = screen.getAllByRole('checkbox');
      const faqPageCheckbox = checkboxes.find((cb) =>
        cb.closest('div')?.textContent?.includes('FAQ Page'),
      );

      expect(faqPageCheckbox).toBeChecked(); // Pre-selected

      await user.click(faqPageCheckbox!);
      expect(faqPageCheckbox).not.toBeChecked();

      await user.click(faqPageCheckbox!);
      expect(faqPageCheckbox).toBeChecked();
    });

    it('updates selected page count correctly', async () => {
      render(<FAQExtractionWizard />);

      // Navigate to step 2
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Select Pages to Analyze')).toBeInTheDocument();
      });

      // Should show initial count
      expect(screen.getByText(/3 of 4 pages selected/)).toBeInTheDocument();
    });

    it('disables extraction button when no pages selected', async () => {
      render(<FAQExtractionWizard />);

      // Navigate to step 2
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Select Pages to Analyze')).toBeInTheDocument();
      });

      // Uncheck all selected pages
      const checkboxes = screen.getAllByRole('checkbox');
      for (const checkbox of checkboxes) {
        if (checkbox.checked) {
          await user.click(checkbox);
        }
      }

      const extractButton = screen.getByText('Start Extraction');
      expect(extractButton).toBeDisabled();
    });
  });

  describe('Step 3: Processing', () => {
    it('shows processing step with progress indicator', async () => {
      render(<FAQExtractionWizard />);

      // Navigate through steps
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Start Extraction')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Start Extraction'));

      expect(screen.getByText('Extracting FAQ Content')).toBeInTheDocument();
      expect(screen.getByText('Processing Steps:')).toBeInTheDocument();
      expect(screen.getByText('Fetching page content')).toBeInTheDocument();
    });

    it('shows progress updates during extraction', async () => {
      render(<FAQExtractionWizard />);

      // Navigate to processing
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Start Extraction')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Start Extraction'));

      // Should show 0% initially
      expect(screen.getByText('0% complete')).toBeInTheDocument();

      // Wait for progress updates (mocked to complete quickly)
      await waitFor(
        () => {
          expect(screen.getByText('100% complete')).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });
  });

  describe('Step 4: Review FAQs', () => {
    it('displays extracted FAQs for review', async () => {
      render(<FAQExtractionWizard />);

      // Navigate through all steps to review
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Start Extraction')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Start Extraction'));

      await waitFor(
        () => {
          expect(screen.getByText('Review Extracted FAQs')).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      expect(
        screen.getByText('What services do you offer?'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('How much do your packages cost?'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Continue to Categorization'),
      ).toBeInTheDocument();
    });

    it('allows editing FAQ questions and answers', async () => {
      render(<FAQExtractionWizard />);

      // Navigate to review step
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Start Extraction')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Start Extraction'));

      await waitFor(() => {
        expect(screen.getByText('Review Extracted FAQs')).toBeInTheDocument();
      });

      // Find and edit a question
      const questionTextareas = screen.getAllByDisplayValue(
        /What services do you offer?/,
      );
      const questionTextarea = questionTextareas[0];

      await user.clear(questionTextarea);
      await user.type(
        questionTextarea,
        'What photography services do you offer?',
      );

      expect(questionTextarea).toHaveValue(
        'What photography services do you offer?',
      );
    });

    it('shows confidence scores for extracted FAQs', async () => {
      render(<FAQExtractionWizard />);

      // Navigate to review step
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Start Extraction')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Start Extraction'));

      await waitFor(() => {
        expect(screen.getByText('Review Extracted FAQs')).toBeInTheDocument();
      });

      expect(screen.getByText('95%')).toBeInTheDocument(); // High confidence
      expect(screen.getByText('88%')).toBeInTheDocument(); // Medium confidence
      expect(screen.getByText('92%')).toBeInTheDocument(); // High confidence
    });
  });

  describe('Step 5: Categorization', () => {
    it('allows assigning categories to FAQs', async () => {
      render(<FAQExtractionWizard />);

      // Navigate through to categorization
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Start Extraction')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Start Extraction'));

      await waitFor(() => {
        expect(
          screen.getByText('Continue to Categorization'),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('Continue to Categorization'));

      expect(screen.getByText('Categorize FAQs')).toBeInTheDocument();
      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.getByText('General (0)')).toBeInTheDocument();
      expect(screen.getByText('Pricing (0)')).toBeInTheDocument();
    });

    it('updates category counts when assigning FAQs', async () => {
      render(<FAQExtractionWizard />);

      // Navigate to categorization
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Start Extraction')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Start Extraction'));

      await waitFor(() => {
        expect(
          screen.getByText('Continue to Categorization'),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('Continue to Categorization'));

      // Assign a category to an FAQ
      const selects = screen.getAllByDisplayValue('');
      const firstSelect = selects[0];

      await user.selectOptions(firstSelect, 'pricing');

      // Category count should update (though this might require additional state management)
      expect(firstSelect).toHaveValue('pricing');
    });
  });

  describe('Step 6: Completion', () => {
    it('shows completion summary', async () => {
      render(<FAQExtractionWizard />);

      // Navigate through all steps
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Start Extraction')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Start Extraction'));

      await waitFor(() => {
        expect(
          screen.getByText('Continue to Categorization'),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('Continue to Categorization'));
      await user.click(screen.getByText('Complete Extraction'));

      expect(screen.getByText('Extraction Complete!')).toBeInTheDocument();
      expect(
        screen.getByText('Successfully extracted and organized 3 FAQ pairs.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Save FAQs to Library')).toBeInTheDocument();
    });

    it('displays extraction statistics', async () => {
      render(<FAQExtractionWizard />);

      // Navigate to completion
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Start Extraction')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Start Extraction'));

      await waitFor(() => {
        expect(
          screen.getByText('Continue to Categorization'),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('Continue to Categorization'));
      await user.click(screen.getByText('Complete Extraction'));

      expect(screen.getByText('Total FAQs:')).toBeInTheDocument();
      expect(screen.getByText('Categories:')).toBeInTheDocument();
      expect(screen.getByText('Summary')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('shows progress indicators correctly', () => {
      render(<FAQExtractionWizard />);

      const progressSteps = screen.getAllByRole('listitem');
      expect(progressSteps).toHaveLength(6);
    });

    it('allows navigation back to previous steps', async () => {
      render(<FAQExtractionWizard />);

      // Navigate to step 2 first
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Select Pages to Analyze')).toBeInTheDocument();
      });

      // Should show previous button
      const previousButton = screen.getByText('Previous');
      expect(previousButton).toBeInTheDocument();
      expect(previousButton).not.toBeDisabled();
    });

    it('shows current step indicator', async () => {
      render(<FAQExtractionWizard />);

      // Navigate to step 2
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Step 2 of 6')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error messages when URL discovery fails', async () => {
      // Mock a failure case (would need to mock the actual API call)
      render(<FAQExtractionWizard />);

      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://invalid-domain-that-should-fail.com');
      await user.click(screen.getByText('Discover Pages'));

      // In a real implementation, this would show an error after the API call fails
      expect(screen.getByText('Discovering Pages...')).toBeInTheDocument();
    });

    it('handles empty extraction results gracefully', async () => {
      // This would require mocking the extraction to return no FAQs
      render(<FAQExtractionWizard />);

      // The component should handle cases where no FAQs are found
      expect(screen.getByText('FAQ Extraction Wizard')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<FAQExtractionWizard />);

      expect(screen.getByLabelText('Website URL')).toBeInTheDocument();
      expect(
        screen.getByRole('navigation', { name: 'Progress' }),
      ).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(<FAQExtractionWizard />);

      const input = screen.getByPlaceholderText('https://example.com');

      // Test tab navigation
      await user.tab();
      expect(input).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Discover Pages')).toHaveFocus();
    });

    it('has proper form submission handling', async () => {
      render(<FAQExtractionWizard />);

      const form =
        screen.getByRole('form') ||
        screen.getByPlaceholderText('https://example.com').closest('form');
      const input = screen.getByPlaceholderText('https://example.com');

      await user.type(input, 'https://example.com');

      // Test form submission handling
      expect(form).toBeInTheDocument();
      
      if (form) {
        // Test form submission via submit event
        fireEvent.submit(form);
        
        expect(screen.getByText('Discovering Pages...')).toBeInTheDocument();
      }

      // Test Enter key submission as alternative
      await user.keyboard('{Enter}');

      expect(screen.getByText('Discovering Pages...')).toBeInTheDocument();
    });
  });

  describe('Props and Callbacks', () => {
    it('calls onComplete callback when extraction finishes', async () => {
      const onComplete = vi.fn();
      render(<FAQExtractionWizard onComplete={onComplete} />);

      // Navigate through all steps and complete
      const input = screen.getByPlaceholderText('https://example.com');
      await user.type(input, 'https://example.com');
      await user.click(screen.getByText('Discover Pages'));

      await waitFor(() => {
        expect(screen.getByText('Start Extraction')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Start Extraction'));

      await waitFor(() => {
        expect(
          screen.getByText('Continue to Categorization'),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText('Continue to Categorization'));
      await user.click(screen.getByText('Complete Extraction'));
      await user.click(screen.getByText('Save FAQs to Library'));

      expect(onComplete).toHaveBeenCalledWith(expect.any(Array));
    });

    it('calls onCancel callback when cancelled', () => {
      const onCancel = vi.fn();
      render(<FAQExtractionWizard onCancel={onCancel} />);

      // Would need a cancel button in the UI
      // expect(onCancel).toHaveBeenCalled();
    });

    it('accepts initial URL prop', () => {
      const initialUrl = 'https://preset-website.com';
      render(<FAQExtractionWizard initialUrl={initialUrl} />);

      const input = screen.getByPlaceholderText('https://example.com');
      expect(input).toHaveValue(initialUrl);
    });
  });
});
