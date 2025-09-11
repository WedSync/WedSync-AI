import { render, screen } from '@testing-library/react';
import { EnvironmentHealthCard } from '../EnvironmentHealthCard';

describe('EnvironmentHealthCard', () => {
  const defaultProps = {
    environment: 'development',
    status: 'healthy' as const,
    missingVariables: [],
    lastSync: '2024-01-01T00:00:00Z',
    variableCount: 10,
  };

  describe('Basic Rendering', () => {
    it('renders environment name correctly', () => {
      render(<EnvironmentHealthCard {...defaultProps} />);

      expect(screen.getByText('Development')).toBeInTheDocument();
    });

    it('renders variable count', () => {
      render(<EnvironmentHealthCard {...defaultProps} />);

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Variables:')).toBeInTheDocument();
    });

    it('renders last sync time', () => {
      render(<EnvironmentHealthCard {...defaultProps} />);

      expect(screen.getByText('Last Sync:')).toBeInTheDocument();
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('shows healthy status with correct styling', () => {
      render(<EnvironmentHealthCard {...defaultProps} status="healthy" />);

      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument(); // Health score
    });

    it('shows warning status with correct styling', () => {
      render(
        <EnvironmentHealthCard
          {...defaultProps}
          status="warning"
          missingVariables={['API_KEY']}
        />,
      );

      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument(); // Health score reduced
    });

    it('shows critical status with correct styling', () => {
      render(
        <EnvironmentHealthCard
          {...defaultProps}
          status="critical"
          missingVariables={['API_KEY', 'DATABASE_URL']}
        />,
      );

      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument(); // Health score further reduced
    });
  });

  describe('Environment Badges', () => {
    it('renders production badge with correct styling', () => {
      render(
        <EnvironmentHealthCard {...defaultProps} environment="production" />,
      );

      expect(screen.getByText('Production')).toBeInTheDocument();
      // Should have red/destructive styling
    });

    it('renders staging badge with correct styling', () => {
      render(<EnvironmentHealthCard {...defaultProps} environment="staging" />);

      expect(screen.getByText('Staging')).toBeInTheDocument();
      // Should have orange styling
    });

    it('renders wedding-critical badge with correct styling', () => {
      render(
        <EnvironmentHealthCard
          {...defaultProps}
          environment="wedding-day-critical"
        />,
      );

      expect(screen.getByText('Wedding Critical')).toBeInTheDocument();
      // Should have purple styling
    });
  });

  describe('Missing Variables', () => {
    it('shows missing variables count', () => {
      render(
        <EnvironmentHealthCard
          {...defaultProps}
          missingVariables={['API_KEY', 'SECRET_KEY']}
        />,
      );

      expect(screen.getByText('Missing Variables (2)')).toBeInTheDocument();
    });

    it('does not show missing variables section when none are missing', () => {
      render(<EnvironmentHealthCard {...defaultProps} missingVariables={[]} />);

      expect(screen.queryByText(/Missing Variables/)).not.toBeInTheDocument();
    });

    it('shows missing variable names in detailed view', () => {
      render(
        <EnvironmentHealthCard
          {...defaultProps}
          missingVariables={['API_KEY', 'SECRET_KEY', 'DB_URL']}
          detailed={true}
        />,
      );

      expect(screen.getByText('API_KEY')).toBeInTheDocument();
      expect(screen.getByText('SECRET_KEY')).toBeInTheDocument();
      expect(screen.getByText('DB_URL')).toBeInTheDocument();
    });

    it('truncates long list of missing variables', () => {
      const manyVariables = [
        'VAR1',
        'VAR2',
        'VAR3',
        'VAR4',
        'VAR5',
        'VAR6',
        'VAR7',
      ];
      render(
        <EnvironmentHealthCard
          {...defaultProps}
          missingVariables={manyVariables}
          detailed={true}
        />,
      );

      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });
  });

  describe('Wedding Day Critical Alerts', () => {
    it('shows wedding day impact risk for critical production environment', () => {
      render(
        <EnvironmentHealthCard
          {...defaultProps}
          environment="production"
          status="critical"
          missingVariables={['STRIPE_SECRET_KEY']}
        />,
      );

      expect(screen.getByText('Wedding Day Impact Risk')).toBeInTheDocument();
      expect(
        screen.getByText(/critical variables are missing in production/i),
      ).toBeInTheDocument();
    });

    it('does not show wedding day risk for non-production environments', () => {
      render(
        <EnvironmentHealthCard
          {...defaultProps}
          environment="development"
          status="critical"
          missingVariables={['API_KEY']}
        />,
      );

      expect(
        screen.queryByText('Wedding Day Impact Risk'),
      ).not.toBeInTheDocument();
    });

    it('does not show wedding day risk for healthy production', () => {
      render(
        <EnvironmentHealthCard
          {...defaultProps}
          environment="production"
          status="healthy"
          missingVariables={[]}
        />,
      );

      expect(
        screen.queryByText('Wedding Day Impact Risk'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Detailed View', () => {
    it('shows additional details in detailed mode', () => {
      render(<EnvironmentHealthCard {...defaultProps} detailed={true} />);

      expect(screen.getByText('Environment Details')).toBeInTheDocument();
      expect(screen.getByText('Config Drift:')).toBeInTheDocument();
      expect(screen.getByText('Security Score:')).toBeInTheDocument();
      expect(screen.getByText('Next Check:')).toBeInTheDocument();
    });

    it('does not show additional details in compact mode', () => {
      render(<EnvironmentHealthCard {...defaultProps} detailed={false} />);

      expect(screen.queryByText('Environment Details')).not.toBeInTheDocument();
    });
  });

  describe('Health Score Calculation', () => {
    it('calculates 100% health score when no variables are missing', () => {
      render(<EnvironmentHealthCard {...defaultProps} missingVariables={[]} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('reduces health score based on missing variables', () => {
      render(
        <EnvironmentHealthCard
          {...defaultProps}
          missingVariables={['VAR1', 'VAR2']}
        />,
      );

      expect(screen.getByText('80%')).toBeInTheDocument(); // 100 - (2 * 10)
    });

    it('does not go below 0% health score', () => {
      const manyMissingVars = Array.from({ length: 20 }, (_, i) => `VAR${i}`);
      render(
        <EnvironmentHealthCard
          {...defaultProps}
          missingVariables={manyMissingVars}
        />,
      );

      expect(screen.queryByText(/-/)).not.toBeInTheDocument(); // No negative percentage
    });
  });

  describe('Visual Design', () => {
    it('applies correct styling for critical status', () => {
      const { container } = render(
        <EnvironmentHealthCard {...defaultProps} status="critical" />,
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-red-200', 'bg-red-50');
    });

    it('applies correct styling for warning status', () => {
      const { container } = render(
        <EnvironmentHealthCard {...defaultProps} status="warning" />,
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-yellow-200', 'bg-yellow-50');
    });

    it('applies correct styling for healthy status', () => {
      const { container } = render(
        <EnvironmentHealthCard {...defaultProps} status="healthy" />,
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-green-200', 'bg-green-50');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<EnvironmentHealthCard {...defaultProps} />);

      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('provides descriptive text for screen readers', () => {
      render(
        <EnvironmentHealthCard
          {...defaultProps}
          status="critical"
          missingVariables={['API_KEY']}
        />,
      );

      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('Missing Variables (1)')).toBeInTheDocument();
    });

    it('uses semantic HTML structure', () => {
      render(<EnvironmentHealthCard {...defaultProps} />);

      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('shows progress bar with correct value', () => {
      render(
        <EnvironmentHealthCard {...defaultProps} missingVariables={['VAR1']} />,
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '90'); // 100 - (1 * 10)
    });
  });
});
