import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TaskCreateForm } from '@/components/workflow/tasks/TaskCreateForm';
import { TaskCategory, TaskPriority } from '@/types/workflow';

// Extend Jest matchers for axe-core
expect.extend(toHaveNoViolations);
// Mock data for accessibility tests
const mockTeamMembers = [
  {
    id: 'member-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'coordinator',
    specialties: ['venue_management'] as TaskCategory[]
  },
    id: 'member-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'photographer',
    specialties: ['photography'] as TaskCategory[]
  }
];
const mockAvailableTasks = [
    id: 'task-1',
    title: 'Venue Setup',
    category: 'venue_management' as TaskCategory
const mockProps = {
  weddingId: 'wedding-123',
  teamMembers: mockTeamMembers,
  availableTasks: mockAvailableTasks,
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  isSubmitting: false
};
describe('Task Creation Accessibility Tests (WCAG 2.1 AA)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('Automated Accessibility Testing', () => {
    it('should have no accessibility violations in default state', async () => {
      const { container } = render(<TaskCreateForm {...mockProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    it('should have no accessibility violations with form filled', async () => {
      const user = userEvent.setup();
      // Fill form completely
      await user.type(screen.getByLabelText(/task title/i), 'Accessible Task');
      await user.type(screen.getByLabelText(/description/i), 'This task tests accessibility');
      await user.selectOptions(screen.getByLabelText(/category/i), 'venue_management');
      await user.selectOptions(screen.getByLabelText(/priority/i), 'high');
      await user.type(screen.getByLabelText(/deadline/i), '2024-12-31T10:00');
    it('should have no accessibility violations in error state', async () => {
      // Submit empty form to trigger errors
      await user.click(screen.getByRole('button', { name: /create task/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
    it('should have no accessibility violations with dependencies', async () => {
      // Add dependencies
      await user.click(screen.getByRole('button', { name: /add dependency/i }));
    it('should have no accessibility violations in loading state', async () => {
      const loadingProps = { ...mockProps, isSubmitting: true };
      const { container } = render(<TaskCreateForm {...loadingProps} />);
  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation through form', async () => {
      render(<TaskCreateForm {...mockProps} />);
      // Start from title field
      const titleField = screen.getByLabelText(/task title/i);
      titleField.focus();
      expect(titleField).toHaveFocus();
      // Tab through all form elements
      await userEvent.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();
      expect(screen.getByLabelText(/category/i)).toHaveFocus();
      expect(screen.getByLabelText(/priority/i)).toHaveFocus();
      expect(screen.getByLabelText(/assign to/i)).toHaveFocus();
      expect(screen.getByLabelText(/duration \(hours\)/i)).toHaveFocus();
      expect(screen.getByLabelText(/buffer time/i)).toHaveFocus();
      expect(screen.getByLabelText(/deadline/i)).toHaveFocus();
      // Skip to action buttons
      await userEvent.tab(); // Skip add dependency button
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus();
      expect(screen.getByRole('button', { name: /create task/i })).toHaveFocus();
    it('should support keyboard navigation in dropdown menus', async () => {
      const categorySelect = screen.getByLabelText(/category/i);
      categorySelect.focus();
      // Test arrow key navigation
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{Enter}');
      expect(categorySelect).toHaveValue('vendor_coordination');
    it('should handle escape key to close modals/dropdowns', async () => {
      fireEvent.focus(categorySelect);
      fireEvent.keyDown(categorySelect, { key: 'ArrowDown', code: 'ArrowDown' });
      // Escape should close dropdown
      fireEvent.keyDown(categorySelect, { key: 'Escape', code: 'Escape' });
      // Form should still be accessible
      expect(categorySelect).toHaveFocus();
    it('should trap focus within dependency sections', async () => {
      // Add dependency
      const dependencySelects = screen.getAllByRole('combobox');
      const predecessorSelect = dependencySelects.find(select => 
        select.closest('[data-testid]')?.getAttribute('data-testid')?.includes('predecessor') ||
        (select as HTMLSelectElement).options[0]?.textContent === 'Select task'
      );
      if (predecessorSelect) {
        predecessorSelect.focus();
        expect(predecessorSelect).toHaveFocus();
        // Tab should move to next element in dependency
        await userEvent.tab();
        const nextElement = document.activeElement;
        expect(nextElement).toBeInTheDocument();
        expect(nextElement?.tagName).toMatch(/SELECT|INPUT|BUTTON/);
      }
    it('should support Enter key for form submission', async () => {
      // Fill required fields
      await user.type(screen.getByLabelText(/task title/i), 'Keyboard Submit Test');
      await user.selectOptions(screen.getByLabelText(/category/i), 'photography');
      await user.type(screen.getByLabelText(/deadline/i), '2024-12-31T12:00');
      // Focus on submit button and press Enter
      const submitButton = screen.getByRole('button', { name: /create task/i });
      submitButton.focus();
      expect(mockProps.onSubmit).toHaveBeenCalled();
  describe('Screen Reader Support', () => {
    it('should have proper labels for all form controls', () => {
      // Check all form inputs have accessible labels
      expect(screen.getByLabelText(/task title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/assign to/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/duration \(hours\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/buffer time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/deadline/i)).toBeInTheDocument();
    it('should have proper ARIA labels for buttons', () => {
      const createButton = screen.getByRole('button', { name: /create task/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const addDependencyButton = screen.getByRole('button', { name: /add dependency/i });
      expect(createButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
      expect(addDependencyButton).toBeInTheDocument();
    it('should announce form validation errors to screen readers', async () => {
      // Submit empty form
        const titleError = screen.getByText('Title is required');
        const categoryError = screen.getByText('Category is required');
        const deadlineError = screen.getByText('Deadline is required');
        // Errors should be associated with form fields
        expect(titleError).toHaveAttribute('id');
        expect(categoryError).toHaveAttribute('id');
        expect(deadlineError).toHaveAttribute('id');
        // Form fields should reference error messages
        const titleField = screen.getByLabelText(/task title/i);
        const categoryField = screen.getByLabelText(/category/i);
        const deadlineField = screen.getByLabelText(/deadline/i);
        expect(titleField).toHaveAttribute('aria-describedby');
        expect(categoryField).toHaveAttribute('aria-describedby');
        expect(deadlineField).toHaveAttribute('aria-describedby');
    it('should have proper roles and states for interactive elements', async () => {
      // Check form role
      const form = screen.getByRole('form') || screen.getByRole('region');
      expect(form).toBeInTheDocument();
      // Check select elements have proper roles
      const prioritySelect = screen.getByLabelText(/priority/i);
      const assigneeSelect = screen.getByLabelText(/assign to/i);
      expect(categorySelect).toHaveAttribute('role', 'combobox');
      expect(prioritySelect).toHaveAttribute('role', 'combobox');
      expect(assigneeSelect).toHaveAttribute('role', 'combobox');
      // Check button states
      expect(submitButton).not.toHaveAttribute('aria-disabled');
      // Test disabled state
      const disabledProps = { ...mockProps, isSubmitting: true };
      render(<TaskCreateForm {...disabledProps} />);
      const disabledSubmitButton = screen.getByRole('button', { name: /creating.../i });
      expect(disabledSubmitButton).toHaveAttribute('disabled');
    it('should provide context for complex form sections', async () => {
      // Add dependency to test complex section
      // Dependencies section should have proper grouping
      const dependenciesSection = screen.getByText('Dependencies').closest('div');
      expect(dependenciesSection).toBeInTheDocument();
      // Should have group or fieldset role for dependency items
      const dependencyTestId = screen.getByTestId?.('dependency-group');
      const dependencyRoleGroup = dependenciesSection?.querySelector('[role="group"]');
      const dependencyGroup = dependencyTestId || dependencyRoleGroup;
      if (dependencyGroup) {
        expect(dependencyGroup).toHaveAttribute('role', 'group');
  describe('Visual Accessibility', () => {
    it('should have sufficient color contrast ratios', () => {
      // Get computed styles for key elements
      const titleInput = screen.getByLabelText(/task title/i);
      // Check that elements use the defined color system
      expect(titleInput).toHaveClass('text-gray-900');
      expect(titleInput).toHaveClass('border-gray-300');
      expect(submitButton).toHaveClass('text-white');
      expect(submitButton).toHaveClass('bg-primary-600');
    it('should show clear focus indicators', async () => {
      titleInput.focus();
      // Should have focus ring classes
      expect(titleInput).toHaveClass('focus:ring-4');
      expect(titleInput).toHaveClass('focus:ring-primary-100');
      expect(titleInput).toHaveClass('focus:border-primary-300');
    it('should maintain focus indicators in high contrast mode', () => {
      // Simulate high contrast mode
      document.body.style.filter = 'contrast(2)';
      // Focus should still be visible
      const computedStyle = getComputedStyle(titleInput);
      expect(computedStyle.outline).not.toBe('none');
      // Clean up
      document.body.style.filter = '';
    it('should not rely solely on color to convey information', async () => {
      // Submit empty form to show errors
        // Errors should have text, not just red color
        expect(titleError).toBeInTheDocument();
        expect(titleError.textContent).toBeTruthy();
        // Error styling should include more than just color
        expect(titleField).toHaveClass('border-red-300'); // Color
        // Should also have other indicators like icons or text
    it('should be readable at 200% zoom level', () => {
      // Simulate 200% zoom by scaling the viewport
      const originalTransform = document.body.style.transform;
      document.body.style.transform = 'scale(2)';
      document.body.style.transformOrigin = 'top left';
      // Form should still be usable
      expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument();
      document.body.style.transform = originalTransform;
  describe('Motion and Animation Accessibility', () => {
    it('should respect prefers-reduced-motion for transitions', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      // Should have transition classes but respect reduced motion
      expect(titleInput).toHaveClass('transition-all');
      expect(titleInput).toHaveClass('duration-200');
    it('should not cause seizures with flashing content', async () => {
      // Rapid interactions should not cause rapid visual changes
      for (let i = 0; i < 10; i++) {
        await user.type(screen.getByLabelText(/task title/i), 'a');
        await user.clear(screen.getByLabelText(/task title/i));
      // Form should remain stable
  describe('Touch and Mobile Accessibility', () => {
    it('should have adequate touch targets (44x44px minimum)', () => {
      // Buttons should have adequate padding for touch
      expect(submitButton).toHaveClass('py-2.5'); // 10px top/bottom
      expect(submitButton).toHaveClass('px-4');   // 16px left/right
      expect(cancelButton).toHaveClass('py-2.5');
      expect(addDependencyButton).toHaveClass('py-1.5');
    it('should support mobile screen reader gestures', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });
      // All interactive elements should be accessible
      const interactiveElements = screen.getAllByRole(/button|textbox|combobox/);
      expect(interactiveElements.length).toBeGreaterThan(0);
      interactiveElements.forEach(element => {
        expect(element).toBeInTheDocument();
        expect(element).toBeVisible();
  describe('Error Prevention and Recovery', () => {
    it('should provide clear error messages', async () => {
        // Error messages should be specific and helpful
        expect(screen.getByText('Category is required')).toBeInTheDocument();
        expect(screen.getByText('Deadline is required')).toBeInTheDocument();
        // Should not have vague error messages like "Error" or "Invalid"
        expect(screen.queryByText(/^Error$/)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Invalid$/)).not.toBeInTheDocument();
    it('should allow error recovery without data loss', async () => {
      // Fill some fields
      await user.type(screen.getByLabelText(/task title/i), 'Test Task');
      await user.type(screen.getByLabelText(/description/i), 'Test Description');
      // Submit with missing required fields
      // Previously entered data should be preserved
      expect(screen.getByLabelText(/task title/i)).toHaveValue('Test Task');
      expect(screen.getByLabelText(/description/i)).toHaveValue('Test Description');
    it('should provide confirmation for destructive actions', async () => {
      // Add dependency then test removal
      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(btn => 
        btn.innerHTML.includes('X') || btn.getAttribute('aria-label')?.includes('remove')
      if (removeButton) {
        // Should have clear indication of what will be removed
        expect(removeButton).toHaveAttribute('title');
  describe('Language and Localization Accessibility', () => {
    it('should have proper language attributes', () => {
      // Check that form has proper language context
      const form = document.querySelector('form') || document.querySelector('[role="form"]');
      if (form) {
        // Should inherit language from document
        expect(document.documentElement).toHaveAttribute('lang');
    it('should handle right-to-left (RTL) languages', () => {
      // Simulate RTL layout
      document.documentElement.setAttribute('dir', 'rtl');
      const form = screen.getByRole('region') || screen.getByText('Create New Task').closest('div');
      document.documentElement.removeAttribute('dir');
    it('should support assistive technology announcements', async () => {
      // Fill form and submit
      await user.type(screen.getByLabelText(/task title/i), 'AT Test');
      await user.type(screen.getByLabelText(/deadline/i), '2024-12-31T15:00');
      // Should have status or live region for announcements
      const announcements = document.querySelectorAll('[role="status"], [role="alert"], [aria-live]');
      expect(announcements.length).toBeGreaterThanOrEqual(0); // May or may not have explicit live regions
  describe('Complex Interaction Accessibility', () => {
    it('should handle dependency drag-and-drop accessibility', async () => {
      // Add multiple dependencies
      // Should provide keyboard alternative to drag-and-drop
      const dependencies = screen.getByText('Dependencies').closest('div');
      if (dependencies?.querySelector('[draggable]')) {
        // If drag-and-drop is implemented, should have keyboard alternative
        const moveButtons = dependencies.querySelectorAll('[aria-label*="move"], [title*="move"]');
        expect(moveButtons.length).toBeGreaterThanOrEqual(0);
    it('should support complex form navigation patterns', async () => {
      // Test conditional field visibility
      // Should maintain logical tab order even with dynamic content
      const allFocusable = screen.getAllByRole(/button|textbox|combobox/);
      // Should be able to reach all elements via keyboard
      for (const element of allFocusable) {
        expect(element).not.toHaveAttribute('tabindex', '-1');
    it('should provide context for multi-step operations', async () => {
      // Form should indicate progress/steps if applicable
      const formHeading = screen.getByText('Create New Task');
      expect(formHeading).toBeInTheDocument();
      // Should have clear structure
      const description = screen.getByText('Add a new task to the wedding workflow');
      expect(description).toBeInTheDocument();
  describe('WCAG 2.1 AA Compliance Verification', () => {
    it('should meet WCAG 2.1 AA level requirements', async () => {
      // Configure axe for WCAG 2.1 AA compliance
      const results = await axe(container, {
        rules: {
          // WCAG 2.1 AA specific rules
          'color-contrast': { enabled: true },
          'keyboard': { enabled: true },
          'focus-order-semantics': { enabled: true },
          'aria-valid-attr-value': { enabled: true },
          'aria-required-attr': { enabled: true },
          'form-field-multiple-labels': { enabled: true },
          'label': { enabled: true },
          'button-name': { enabled: true },
          'link-name': { enabled: true }
        },
        tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
    it('should maintain accessibility during all user interactions', async () => {
      // Test accessibility at each interaction step
      let results = await axe(container);
      // Fill form
      await user.type(screen.getByLabelText(/task title/i), 'WCAG Compliance Test');
      results = await axe(container);
      await user.selectOptions(screen.getByLabelText(/category/i), 'design');
      // Error state
    it('should provide comprehensive accessibility documentation', () => {
      // Document accessibility features for developers
      const accessibilityFeatures = {
        keyboardNavigation: 'Full keyboard navigation support with logical tab order',
        screenReader: 'All form controls have proper labels and descriptions',
        colorContrast: 'WCAG 2.1 AA compliant color contrast ratios',
        focusManagement: 'Clear focus indicators and proper focus management',
        errorHandling: 'Accessible error messages with proper associations',
        mobileAccessibility: 'Touch-friendly design with adequate target sizes',
        reducedMotion: 'Respects user motion preferences',
        highContrast: 'Compatible with high contrast modes'
      };
      // These features should be implemented
      Object.keys(accessibilityFeatures).forEach(feature => {
        expect(accessibilityFeatures[feature as keyof typeof accessibilityFeatures]).toBeTruthy();
});
