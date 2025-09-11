import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { VariableConfigurationForm } from '../VariableConfigurationForm';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(),
}));

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('VariableConfigurationForm', () => {
  const mockOnVariableAdded = jest.fn();
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(() => ({
        data: { user: { id: 'user123' } },
      })),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ error: null })),
      update: jest.fn(() => ({ error: null })),
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClientComponentClient as jest.Mock).mockReturnValue(
      mockSupabaseClient,
    );
  });

  describe('Form Rendering', () => {
    it('renders form with all required fields', () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      expect(screen.getByLabelText(/variable key/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/environment/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/variable value/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/security level/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /add variable/i }),
      ).toBeInTheDocument();
    });

    it('shows correct form title for adding new variable', () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      expect(screen.getByText('Add Environment Variable')).toBeInTheDocument();
    });

    it('shows correct form title for editing existing variable', () => {
      const editingVariable = {
        id: '1',
        key: 'TEST_VAR',
        value: 'test_value',
        environment: 'development',
        security_level: 'Internal',
      };

      render(
        <VariableConfigurationForm
          onVariableAdded={mockOnVariableAdded}
          editingVariable={editingVariable}
        />,
      );

      expect(screen.getByText('Edit Environment Variable')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /update variable/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    const user = userEvent.setup();

    it('validates required fields', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      const submitButton = screen.getByRole('button', {
        name: /add variable/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Variable key is required'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Variable value is required'),
        ).toBeInTheDocument();
      });
    });

    it('validates variable key format', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      const keyInput = screen.getByLabelText(/variable key/i);
      await user.type(keyInput, 'invalid-key-format');
      await user.tab(); // Trigger validation

      await waitFor(() => {
        expect(
          screen.getByText('Key must be uppercase with underscores only'),
        ).toBeInTheDocument();
      });
    });

    it('accepts valid variable key format', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      const keyInput = screen.getByLabelText(/variable key/i);
      await user.type(keyInput, 'VALID_API_KEY');
      await user.tab();

      await waitFor(() => {
        expect(
          screen.queryByText('Key must be uppercase with underscores only'),
        ).not.toBeInTheDocument();
      });
    });

    it('validates value length limits', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      const valueInput = screen.getByLabelText(/variable value/i);
      await user.type(valueInput, 'a'.repeat(5001)); // Exceed max length
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText('Value must be less than 5000 characters'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Security Features', () => {
    const user = userEvent.setup();

    it('auto-encrypts high security variables', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      // Select high security level
      const securitySelect = screen.getByRole('combobox', {
        name: /security level/i,
      });
      await user.click(securitySelect);
      await user.click(screen.getByText('Wedding Day Critical'));

      await waitFor(() => {
        const encryptSwitch = screen.getByRole('switch', {
          name: /encrypt value/i,
        });
        expect(encryptSwitch).toBeChecked();
        expect(encryptSwitch).toBeDisabled();
      });
    });

    it('shows auto-encrypt badge for high security variables', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      const securitySelect = screen.getByRole('combobox', {
        name: /security level/i,
      });
      await user.click(securitySelect);
      await user.click(screen.getByText('Confidential'));

      await waitFor(() => {
        expect(screen.getByText('Auto-Encrypt')).toBeInTheDocument();
      });
    });

    it('allows manual encryption toggle for lower security levels', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      const encryptSwitch = screen.getByRole('switch', {
        name: /encrypt value/i,
      });
      expect(encryptSwitch).not.toBeChecked();
      expect(encryptSwitch).not.toBeDisabled();

      await user.click(encryptSwitch);
      expect(encryptSwitch).toBeChecked();
    });
  });

  describe('Value Visibility Toggle', () => {
    const user = userEvent.setup();

    it('toggles value visibility', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      const valueInput = screen.getByLabelText(/variable value/i);
      const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button

      // Initially should be password type
      expect(valueInput).toHaveAttribute('type', 'password');

      await user.click(toggleButton);

      // Should change to textarea for visible text
      await waitFor(() => {
        expect(
          screen.getByRole('textbox', { name: /variable value/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Wedding Day Mode', () => {
    it('disables form in read-only mode', () => {
      render(
        <VariableConfigurationForm
          onVariableAdded={mockOnVariableAdded}
          isReadOnly={true}
        />,
      );

      expect(screen.getByLabelText(/variable key/i)).toBeDisabled();
      expect(screen.getByLabelText(/variable value/i)).toBeDisabled();
      expect(
        screen.getByRole('button', { name: /add variable/i }),
      ).toBeDisabled();
    });

    it('shows error message when trying to submit in read-only mode', async () => {
      render(
        <VariableConfigurationForm
          onVariableAdded={mockOnVariableAdded}
          isReadOnly={true}
        />,
      );

      const submitButton = screen.getByRole('button', {
        name: /add variable/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Cannot modify variables during wedding day mode',
        );
      });
    });
  });

  describe('Production Environment Warnings', () => {
    const user = userEvent.setup();

    it('shows warning for production environment', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      const envSelect = screen.getByRole('combobox', { name: /environment/i });
      await user.click(envSelect);
      await user.click(screen.getByText('Production'));

      await waitFor(() => {
        expect(
          screen.getByText('Production Environment Warning'),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/you are configuring a variable for production/i),
        ).toBeInTheDocument();
      });
    });

    it('shows warning for wedding-critical environment', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      const envSelect = screen.getByRole('combobox', { name: /environment/i });
      await user.click(envSelect);
      await user.click(screen.getByText('Wedding Day Critical'));

      await waitFor(() => {
        expect(
          screen.getByText('Production Environment Warning'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    const user = userEvent.setup();

    it('successfully submits new variable', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      // Fill out form
      await user.type(screen.getByLabelText(/variable key/i), 'TEST_API_KEY');
      await user.type(screen.getByLabelText(/variable value/i), 'secret_value');

      const submitButton = screen.getByRole('button', {
        name: /add variable/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith(
          'environment_variables',
        );
        expect(toast.success).toHaveBeenCalledWith(
          'Environment variable created successfully',
        );
        expect(mockOnVariableAdded).toHaveBeenCalled();
      });
    });

    it('creates audit log entry on successful submission', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      await user.type(screen.getByLabelText(/variable key/i), 'TEST_API_KEY');
      await user.type(screen.getByLabelText(/variable value/i), 'secret_value');

      const submitButton = screen.getByRole('button', {
        name: /add variable/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith(
          'environment_variable_audit',
        );
      });
    });

    it('handles submission errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn(() => ({ error: new Error('Database error') })),
      });

      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      await user.type(screen.getByLabelText(/variable key/i), 'TEST_API_KEY');
      await user.type(screen.getByLabelText(/variable value/i), 'secret_value');

      const submitButton = screen.getByRole('button', {
        name: /add variable/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to save environment variable',
        );
      });
    });

    it('requires user authentication', async () => {
      mockSupabaseClient.auth.getUser.mockReturnValueOnce({
        data: { user: null },
      });

      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      await user.type(screen.getByLabelText(/variable key/i), 'TEST_API_KEY');
      await user.type(screen.getByLabelText(/variable value/i), 'secret_value');

      const submitButton = screen.getByRole('button', {
        name: /add variable/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'You must be logged in to manage environment variables',
        );
      });
    });
  });

  describe('Form Reset', () => {
    const user = userEvent.setup();

    it('resets form after successful submission', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      const keyInput = screen.getByLabelText(/variable key/i);
      const valueInput = screen.getByLabelText(/variable value/i);

      await user.type(keyInput, 'TEST_API_KEY');
      await user.type(valueInput, 'secret_value');

      const submitButton = screen.getByRole('button', {
        name: /add variable/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(keyInput).toHaveValue('');
        expect(valueInput).toHaveValue('');
      });
    });

    it('resets form when reset button is clicked', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      const keyInput = screen.getByLabelText(/variable key/i);
      await user.type(keyInput, 'TEST_API_KEY');

      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      expect(keyInput).toHaveValue('');
    });
  });

  describe('Advanced Options', () => {
    const user = userEvent.setup();

    it('toggles advanced options visibility', async () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      const toggleButton = screen.getByText('Advanced Options ▼');
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
        expect(screen.getByText('Advanced Options ▲')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      expect(screen.getByLabelText(/variable key/i)).toHaveAttribute('id');
      expect(screen.getByLabelText(/variable value/i)).toHaveAttribute('id');
      expect(screen.getByLabelText(/security level/i)).toBeInTheDocument();
    });

    it('shows validation errors with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(
        <VariableConfigurationForm onVariableAdded={mockOnVariableAdded} />,
      );

      const submitButton = screen.getByRole('button', {
        name: /add variable/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        const keyInput = screen.getByLabelText(/variable key/i);
        expect(keyInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });
});
