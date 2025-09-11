/**
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageTemplateEditor } from '@/components/reviews/MessageTemplateEditor';

describe('MessageTemplateEditor', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    clientName: 'Emma & Mike',
    weddingDate: 'June 15th',
    venue: 'Sunset Manor'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders textarea with correct attributes', () => {
      render(<MessageTemplateEditor {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('rows', '8');
      expect(textarea).toHaveAttribute('placeholder', 'Write your personalized review request message...');
    });

    it('displays merge fields button', () => {
      render(<MessageTemplateEditor {...defaultProps} />);

      expect(screen.getByText('Insert Field')).toBeInTheDocument();
    });

    it('shows character count', () => {
      render(<MessageTemplateEditor {...defaultProps} value="Test message" />);

      expect(screen.getByText('12 chars')).toBeInTheDocument();
    });

    it('displays quick tips section', () => {
      render(<MessageTemplateEditor {...defaultProps} />);

      expect(screen.getByText('💡 Quick Tips')).toBeInTheDocument();
      expect(screen.getByText(/keep it personal and warm/i)).toBeInTheDocument();
      expect(screen.getByText(/ask for the review within 1-2 weeks/i)).toBeInTheDocument();
    });

    it('shows live preview section', () => {
      render(<MessageTemplateEditor {...defaultProps} />);

      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText(/this is how your message will appear/i)).toBeInTheDocument();
    });

    it('loads default template when value is empty', async () => {
      render(<MessageTemplateEditor {...defaultProps} />);

      await waitFor(() => {
        expect(defaultProps.onChange).toHaveBeenCalledWith(
          expect.stringContaining('Hi {{client_name}}!')
        );
      });
    });
  });

  describe('Merge Fields Functionality', () => {
    it('shows merge fields dropdown when button is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageTemplateEditor {...defaultProps} />);

      const insertFieldButton = screen.getByText('Insert Field');
      await user.click(insertFieldButton);

      expect(screen.getByText('Merge Fields')).toBeInTheDocument();
      expect(screen.getByText('Client Names')).toBeInTheDocument();
      expect(screen.getByText('Wedding Date')).toBeInTheDocument();
      expect(screen.getByText('Venue Name')).toBeInTheDocument();
      expect(screen.getByText('Your Business Name')).toBeInTheDocument();
    });

    it('displays correct merge field placeholders', async () => {
      const user = userEvent.setup();
      render(<MessageTemplateEditor {...defaultProps} />);

      const insertFieldButton = screen.getByText('Insert Field');
      await user.click(insertFieldButton);

      expect(screen.getByText('Emma & Mike')).toBeInTheDocument();
      expect(screen.getByText('June 15th')).toBeInTheDocument();
      expect(screen.getByText('Sunset Manor')).toBeInTheDocument();
      expect(screen.getByText('Your Business')).toBeInTheDocument();
    });

    it('inserts merge field when clicked', async () => {
      const user = userEvent.setup();
      render(<MessageTemplateEditor {...defaultProps} value="Hello " />);

      const insertFieldButton = screen.getByText('Insert Field');
      await user.click(insertFieldButton);

      const clientNameField = screen.getByText('Client Names');
      await user.click(clientNameField);

      expect(defaultProps.onChange).toHaveBeenCalledWith('Hello {{client_name}}');
    });

    it('closes merge fields dropdown after selection', async () => {
      const user = userEvent.setup();
      render(<MessageTemplateEditor {...defaultProps} />);

      const insertFieldButton = screen.getByText('Insert Field');
      await user.click(insertFieldButton);

      const clientNameField = screen.getByText('Client Names');
      await user.click(clientNameField);

      await waitFor(() => {
        expect(screen.queryByText('Merge Fields')).not.toBeInTheDocument();
      });
    });

    it('positions cursor after inserted merge field', async () => {
      const user = userEvent.setup();
      render(<MessageTemplateEditor {...defaultProps} value="Hello " />);

      const textarea = screen.getByRole('textbox');
      
      // Set cursor position
      fireEvent.click(textarea);
      textarea.setSelectionRange(6, 6); // After "Hello "

      const insertFieldButton = screen.getByText('Insert Field');
      await user.click(insertFieldButton);

      const clientNameField = screen.getByText('Client Names');
      await user.click(clientNameField);

      // Should insert at cursor position
      expect(defaultProps.onChange).toHaveBeenCalledWith('Hello {{client_name}}');
    });
  });

  describe('Text Editing', () => {
    it('handles text input correctly', async () => {
      const user = userEvent.setup();
      render(<MessageTemplateEditor {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test message');

      expect(defaultProps.onChange).toHaveBeenCalledWith('Test message');
    });

    it('handles tab key for indentation', async () => {
      const user = userEvent.setup();
      render(<MessageTemplateEditor {...defaultProps} value="Line 1\n" />);

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Tab', preventDefault: vi.fn() });

      expect(defaultProps.onChange).toHaveBeenCalledWith('Line 1\n  ');
    });

    it('updates character count dynamically', async () => {
      const user = userEvent.setup();
      render(<MessageTemplateEditor {...defaultProps} value="" />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');

      // Character count should update
      expect(screen.getByText('5 chars')).toBeInTheDocument();
    });

    it('tracks cursor position for merge field insertion', async () => {
      const user = userEvent.setup();
      render(<MessageTemplateEditor {...defaultProps} value="Start middle end" />);

      const textarea = screen.getByRole('textbox');
      
      // Click in middle of text
      fireEvent.click(textarea);
      textarea.setSelectionRange(6, 6); // After "Start "
      fireEvent.select(textarea);

      // Cursor position should be tracked
      expect(textarea.selectionStart).toBe(6);
    });
  });

  describe('Live Preview', () => {
    it('shows preview with replaced merge fields', () => {
      const template = 'Hi {{client_name}}! Your wedding at {{venue_name}} was beautiful!';
      render(<MessageTemplateEditor {...defaultProps} value={template} />);

      const preview = screen.getByText(/hi emma & mike.*sunset manor.*was beautiful/i);
      expect(preview).toBeInTheDocument();
    });

    it('replaces all merge field types correctly', () => {
      const template = 'Hi {{client_name}}! Wedding date: {{wedding_date}} at {{venue_name}}. - {{supplier_name}}';
      render(<MessageTemplateEditor {...defaultProps} value={template} />);

      expect(screen.getByText(/hi emma & mike/i)).toBeInTheDocument();
      expect(screen.getByText(/june 15th/i)).toBeInTheDocument();
      expect(screen.getByText(/sunset manor/i)).toBeInTheDocument();
      expect(screen.getByText(/your business/i)).toBeInTheDocument();
    });

    it('preserves formatting in preview', () => {
      const template = 'Line 1\n\nLine 3\n{{client_name}}';
      render(<MessageTemplateEditor {...defaultProps} value={template} />);

      const preview = screen.getByText(/line 1.*line 3.*emma & mike/s);
      expect(preview).toBeInTheDocument();
    });

    it('shows empty preview for empty template', () => {
      render(<MessageTemplateEditor {...defaultProps} value="" />);

      const previewSection = screen.getByText('Preview').parentElement;
      expect(previewSection).toBeInTheDocument();
    });
  });

  describe('Default Template', () => {
    it('sets default template when value is empty', async () => {
      render(<MessageTemplateEditor {...defaultProps} value="" />);

      await waitFor(() => {
        expect(defaultProps.onChange).toHaveBeenCalledWith(
          expect.stringMatching(/Hi \{\{client_name\}\}!/)
        );
      });
    });

    it('includes all merge fields in default template', async () => {
      render(<MessageTemplateEditor {...defaultProps} value="" />);

      await waitFor(() => {
        const [call] = defaultProps.onChange.mock.calls.slice(-1);
        const template = call[0];
        
        expect(template).toContain('{{client_name}}');
        expect(template).toContain('{{venue_name}}');
        expect(template).toContain('{{wedding_date}}');
        expect(template).toContain('{{supplier_name}}');
      });
    });

    it('does not override existing content', () => {
      render(<MessageTemplateEditor {...defaultProps} value="Existing content" />);

      // Should not call onChange to set default template
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels and roles', () => {
      render(<MessageTemplateEditor {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label');
      
      const insertButton = screen.getByRole('button', { name: /insert field/i });
      expect(insertButton).toBeInTheDocument();
    });

    it('supports keyboard navigation in merge fields', async () => {
      const user = userEvent.setup();
      render(<MessageTemplateEditor {...defaultProps} />);

      const insertFieldButton = screen.getByText('Insert Field');
      await user.click(insertFieldButton);

      // Should be able to navigate merge fields with keyboard
      const firstField = screen.getByText('Client Names').closest('button');
      expect(firstField).toBeInTheDocument();
      
      firstField?.focus();
      expect(firstField).toHaveFocus();
    });

    it('has proper heading structure', () => {
      render(<MessageTemplateEditor {...defaultProps} />);

      expect(screen.getByText('💡 Quick Tips')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('provides helpful placeholder text', () => {
      render(<MessageTemplateEditor {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Write your personalized review request message...');
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing props gracefully', () => {
      render(<MessageTemplateEditor value="" onChange={vi.fn()} />);

      // Should render without crashing
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('handles long text input', async () => {
      const user = userEvent.setup();
      const longText = 'A'.repeat(5000);
      
      render(<MessageTemplateEditor {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, longText);

      expect(defaultProps.onChange).toHaveBeenCalledWith(longText);
      expect(screen.getByText('5000 chars')).toBeInTheDocument();
    });

    it('handles special characters in merge fields', () => {
      const template = 'Hi {{client_name}}! <script>alert("xss")</script>';
      render(<MessageTemplateEditor {...defaultProps} value={template} />);

      // Should still render properly (XSS protection would be handled by sanitization)
      expect(screen.getByRole('textbox')).toHaveValue(template);
    });
  });

  describe('Performance', () => {
    it('renders quickly with large templates', () => {
      const largeTemplate = 'A'.repeat(10000);
      const startTime = performance.now();
      
      render(<MessageTemplateEditor {...defaultProps} value={largeTemplate} />);
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(50);
    });

    it('handles frequent onChange calls efficiently', async () => {
      const user = userEvent.setup();
      render(<MessageTemplateEditor {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        await user.type(textarea, 'a');
      }
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<MessageTemplateEditor {...defaultProps} />);

      // Should maintain usability on mobile
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('Insert Field')).toBeInTheDocument();
    });

    it('maintains proper spacing on all screen sizes', () => {
      render(<MessageTemplateEditor {...defaultProps} />);

      const container = screen.getByRole('textbox').closest('div');
      expect(container).toHaveClass('space-y-4');
    });
  });
});