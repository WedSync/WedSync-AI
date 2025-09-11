import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { VariablesList } from '../VariablesList';
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

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe('VariablesList', () => {
  const mockVariables = [
    {
      id: '1',
      key: 'API_KEY',
      value: 'secret_api_key_value',
      environment: 'development' as const,
      security_level: 'Internal' as const,
      is_encrypted: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user1',
      description: 'API key for external service',
    },
    {
      id: '2',
      key: 'DATABASE_URL',
      value: 'postgresql://user:pass@localhost:5432/db',
      environment: 'production' as const,
      security_level: 'Wedding-Day-Critical' as const,
      is_encrypted: true,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      created_by: 'user2',
    },
    {
      id: '3',
      key: 'PUBLIC_SETTING',
      value: 'public_value',
      environment: 'staging' as const,
      security_level: 'Public' as const,
      is_encrypted: false,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
      created_by: 'user1',
    },
  ];

  const defaultProps = {
    variables: mockVariables,
    selectedEnvironment: 'all',
    onEnvironmentChange: jest.fn(),
    onVariableUpdated: jest.fn(),
    isReadOnly: false,
  };

  const mockSupabaseClient = {
    from: jest.fn(() => ({
      delete: jest.fn(() => ({ error: null })),
      insert: jest.fn(() => ({ error: null })),
    })),
    auth: {
      getUser: jest.fn(() => ({
        data: { user: { id: 'user123' } },
      })),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClientComponentClient as jest.Mock).mockReturnValue(
      mockSupabaseClient,
    );
  });

  describe('Component Rendering', () => {
    it('renders variables list with search and filters', () => {
      render(<VariablesList {...defaultProps} />);

      expect(
        screen.getByPlaceholderText('Search variables...'),
      ).toBeInTheDocument();
      expect(screen.getByText('Environment Variables')).toBeInTheDocument();
      expect(screen.getByText('Showing 3 of 3 variables')).toBeInTheDocument();
    });

    it('renders all variables when no filters are applied', () => {
      render(<VariablesList {...defaultProps} />);

      expect(screen.getByText('API_KEY')).toBeInTheDocument();
      expect(screen.getByText('DATABASE_URL')).toBeInTheDocument();
      expect(screen.getByText('PUBLIC_SETTING')).toBeInTheDocument();
    });

    it('shows empty state when no variables match filters', () => {
      render(<VariablesList {...defaultProps} variables={[]} />);

      expect(screen.getByText('No variables found')).toBeInTheDocument();
      expect(
        screen.getByText('Try adjusting your search or filters'),
      ).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    const user = userEvent.setup();

    it('filters variables by key name', async () => {
      render(<VariablesList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search variables...');
      await user.type(searchInput, 'API');

      expect(screen.getByText('API_KEY')).toBeInTheDocument();
      expect(screen.queryByText('DATABASE_URL')).not.toBeInTheDocument();
    });

    it('filters variables by description', async () => {
      render(<VariablesList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search variables...');
      await user.type(searchInput, 'external service');

      expect(screen.getByText('API_KEY')).toBeInTheDocument();
      expect(screen.queryByText('DATABASE_URL')).not.toBeInTheDocument();
    });

    it('updates results count based on search', async () => {
      render(<VariablesList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search variables...');
      await user.type(searchInput, 'API');

      await waitFor(() => {
        expect(
          screen.getByText('Showing 1 of 3 variables'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Environment Filtering', () => {
    it('filters variables by environment', () => {
      const props = {
        ...defaultProps,
        selectedEnvironment: 'production',
        variables: mockVariables.filter((v) => v.environment === 'production'),
      };

      render(<VariablesList {...props} />);

      expect(screen.getByText('DATABASE_URL')).toBeInTheDocument();
      expect(screen.queryByText('API_KEY')).not.toBeInTheDocument();
    });

    it('calls onEnvironmentChange when environment filter changes', async () => {
      const user = userEvent.setup();
      render(<VariablesList {...defaultProps} />);

      const envSelect = screen.getByDisplayValue('All Environments');
      await user.click(envSelect);
      await user.click(screen.getByText('Development'));

      expect(defaultProps.onEnvironmentChange).toHaveBeenCalledWith(
        'development',
      );
    });
  });

  describe('Security Level Filtering', () => {
    const user = userEvent.setup();

    it('filters variables by security level', async () => {
      render(<VariablesList {...defaultProps} />);

      const securitySelect = screen.getByDisplayValue('All Security Levels');
      await user.click(securitySelect);
      await user.click(screen.getByText('Public'));

      expect(screen.getByText('PUBLIC_SETTING')).toBeInTheDocument();
      expect(screen.queryByText('API_KEY')).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    const user = userEvent.setup();

    it('sorts variables by name by default', () => {
      render(<VariablesList {...defaultProps} />);

      const variableElements = screen.getAllByRole('heading', { level: 3 });
      expect(variableElements[0]).toHaveTextContent('API_KEY');
      expect(variableElements[1]).toHaveTextContent('DATABASE_URL');
      expect(variableElements[2]).toHaveTextContent('PUBLIC_SETTING');
    });

    it('allows sorting by security level', async () => {
      render(<VariablesList {...defaultProps} />);

      const sortSelect = screen.getByDisplayValue('Name');
      await user.click(sortSelect);
      await user.click(screen.getByText('Security'));

      // Should sort by security level (Wedding-Day-Critical first)
      await waitFor(() => {
        const variableElements = screen.getAllByRole('heading', { level: 3 });
        expect(variableElements[0]).toHaveTextContent('DATABASE_URL'); // Wedding-Day-Critical
      });
    });
  });

  describe('Value Visibility', () => {
    const user = userEvent.setup();

    it('masks values by default based on security level', () => {
      render(<VariablesList {...defaultProps} />);

      // Public values should be visible
      expect(screen.getByText('public_value')).toBeInTheDocument();

      // Confidential values should be masked
      expect(
        screen.queryByText('secret_api_key_value'),
      ).not.toBeInTheDocument();
      expect(screen.getByText('secr••••••••••••alue')).toBeInTheDocument(); // Masked
    });

    it('toggles value visibility when eye button is clicked', async () => {
      render(<VariablesList {...defaultProps} />);

      const eyeButtons = screen.getAllByRole('button');
      const toggleButton = eyeButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-eye'),
      );

      if (toggleButton) {
        await user.click(toggleButton);

        // Should show full value after toggle
        await waitFor(() => {
          expect(screen.getByText('secret_api_key_value')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Security Badges', () => {
    it('displays correct security level badges', () => {
      render(<VariablesList {...defaultProps} />);

      expect(screen.getByText('Internal')).toBeInTheDocument();
      expect(screen.getByText('Wedding Critical')).toBeInTheDocument();
      expect(screen.getByText('Public')).toBeInTheDocument();
    });

    it('displays encryption badges for encrypted variables', () => {
      render(<VariablesList {...defaultProps} />);

      expect(screen.getByText('Encrypted')).toBeInTheDocument();
    });
  });

  describe('Environment Badges', () => {
    it('displays correct environment badges', () => {
      render(<VariablesList {...defaultProps} />);

      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('Production')).toBeInTheDocument();
      expect(screen.getByText('Staging')).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    const user = userEvent.setup();

    it('copies variable key to clipboard', async () => {
      render(<VariablesList {...defaultProps} />);

      const copyButtons = screen.getAllByRole('button', { name: '' });
      const keyCopyButton = copyButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-copy'),
      );

      if (keyCopyButton) {
        await user.click(keyCopyButton);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('API_KEY');
        expect(toast.success).toHaveBeenCalledWith(
          'Variable key copied to clipboard',
        );
      }
    });

    it('copies variable value from dropdown menu', async () => {
      render(<VariablesList {...defaultProps} />);

      // First make the value visible
      const eyeButtons = screen.getAllByRole('button');
      const toggleButton = eyeButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-eye'),
      );

      if (toggleButton) {
        await user.click(toggleButton);
      }

      // Then access dropdown menu
      const moreButtons = screen.getAllByRole('button');
      const dropdownButton = moreButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-more-vertical'),
      );

      if (dropdownButton) {
        await user.click(dropdownButton);

        const copyValueOption = screen.getByText('Copy Value');
        await user.click(copyValueOption);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'secret_api_key_value',
        );
        expect(toast.success).toHaveBeenCalledWith(
          'Variable value copied to clipboard',
        );
      }
    });

    it('disables copy value option when value is not visible', async () => {
      render(<VariablesList {...defaultProps} />);

      const moreButtons = screen.getAllByRole('button');
      const dropdownButton = moreButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-more-vertical'),
      );

      if (dropdownButton) {
        await user.click(dropdownButton);

        const copyValueOption = screen.getByText('Copy Value');
        expect(copyValueOption.closest('button')).toBeDisabled();
      }
    });
  });

  describe('Variable Deletion', () => {
    const user = userEvent.setup();

    beforeEach(() => {
      // Mock window.confirm
      window.confirm = jest.fn(() => true);
    });

    it('deletes variable when confirmed', async () => {
      render(<VariablesList {...defaultProps} />);

      const moreButtons = screen.getAllByRole('button');
      const dropdownButton = moreButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-more-vertical'),
      );

      if (dropdownButton) {
        await user.click(dropdownButton);

        const deleteOption = screen.getByText('Delete Variable');
        await user.click(deleteOption);

        await waitFor(() => {
          expect(mockSupabaseClient.from).toHaveBeenCalledWith(
            'environment_variables',
          );
          expect(toast.success).toHaveBeenCalledWith(
            'Environment variable deleted successfully',
          );
          expect(defaultProps.onVariableUpdated).toHaveBeenCalled();
        });
      }
    });

    it('does not delete when confirmation is cancelled', async () => {
      window.confirm = jest.fn(() => false);

      render(<VariablesList {...defaultProps} />);

      const moreButtons = screen.getAllByRole('button');
      const dropdownButton = moreButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-more-vertical'),
      );

      if (dropdownButton) {
        await user.click(dropdownButton);

        const deleteOption = screen.getByText('Delete Variable');
        await user.click(deleteOption);

        expect(mockSupabaseClient.from).not.toHaveBeenCalled();
      }
    });

    it('prevents deletion in read-only mode', async () => {
      render(<VariablesList {...defaultProps} isReadOnly={true} />);

      const moreButtons = screen.getAllByRole('button');
      const dropdownButton = moreButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-more-vertical'),
      );

      if (dropdownButton) {
        await user.click(dropdownButton);

        const deleteOption = screen.getByText('Delete Variable');
        await user.click(deleteOption);

        expect(toast.error).toHaveBeenCalledWith(
          'Cannot delete variables during wedding day mode',
        );
      }
    });
  });

  describe('Variable Metadata', () => {
    it('displays creation and update timestamps', () => {
      render(<VariablesList {...defaultProps} />);

      expect(screen.getByText(/Updated.*ago/)).toBeInTheDocument();
    });

    it('displays variable descriptions when available', () => {
      render(<VariablesList {...defaultProps} />);

      expect(
        screen.getByText('API key for external service'),
      ).toBeInTheDocument();
    });
  });

  describe('Read-Only Mode', () => {
    it('disables edit and delete actions in read-only mode', () => {
      render(<VariablesList {...defaultProps} isReadOnly={true} />);

      const moreButtons = screen.getAllByRole('button');
      const dropdownButton = moreButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-more-vertical'),
      );

      if (dropdownButton) {
        fireEvent.click(dropdownButton);

        const editOption = screen.getByText('Edit Variable');
        const deleteOption = screen.getByText('Delete Variable');

        expect(editOption.closest('button')).toBeDisabled();
        expect(deleteOption.closest('button')).toBeDisabled();
      }
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<VariablesList {...defaultProps} />);

      expect(screen.getByRole('searchbox')).toBeInTheDocument();
      expect(screen.getAllByRole('combobox')).toHaveLength(3); // Environment, Security, Sort filters
      expect(screen.getAllByRole('button')).toBeDefined();
    });

    it('provides screen reader friendly content', () => {
      render(<VariablesList {...defaultProps} />);

      expect(screen.getByText('Showing 3 of 3 variables')).toBeInTheDocument();
      expect(
        screen.getByText('Filtered by: All Environments'),
      ).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('handles large lists of variables efficiently', () => {
      const manyVariables = Array.from({ length: 100 }, (_, i) => ({
        ...mockVariables[0],
        id: `var-${i}`,
        key: `VARIABLE_${i}`,
      }));

      const { container } = render(
        <VariablesList {...defaultProps} variables={manyVariables} />,
      );

      expect(container).toBeInTheDocument();
      expect(
        screen.getByText('Showing 100 of 100 variables'),
      ).toBeInTheDocument();
    });
  });
});
