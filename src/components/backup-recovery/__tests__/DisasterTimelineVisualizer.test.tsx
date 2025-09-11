import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DisasterTimelineVisualizer from '../DisasterTimelineVisualizer';

// Mock data for testing
const mockIncidentTimeline = {
  incidentId: 'incident-001',
  startTime: '2025-01-22T11:30:00Z',
  incidentType: 'data-corruption' as const,
  severity: 'critical' as const,
  affectedWeddings: [
    {
      weddingId: 'wedding-001',
      coupleName: 'Sarah & John',
      weddingDate: '2025-01-25T14:00:00Z',
      daysUntilWedding: 3,
      impactLevel: 'severe' as const,
      affectedSystems: ['guest-list', 'photos', 'timeline'],
      priorityLevel: 1,
    },
    {
      weddingId: 'wedding-002',
      coupleName: 'Emma & David',
      weddingDate: '2025-01-24T15:30:00Z',
      daysUntilWedding: 2,
      impactLevel: 'critical' as const,
      affectedSystems: ['timeline', 'contracts', 'photos'],
      priorityLevel: 2,
    },
  ],
  rootCause: 'Database corruption during scheduled backup',
  detectedBy: 'automated-monitoring',
  initialResponse: 'Emergency team activated, backup systems initiated',
};

const mockRecoveryProgress = {
  currentStep: 3,
  totalSteps: 8,
  milestones: [
    {
      id: 'milestone-001',
      order: 1,
      title: 'Incident Assessment',
      description: 'Evaluate scope and impact of data corruption',
      status: 'completed' as const,
      startTime: '2025-01-22T11:35:00Z',
      completedAt: '2025-01-22T11:42:00Z',
      duration: '7 minutes',
      dependencies: [],
      weddingImpact: 'none' as const,
      automatedStep: true,
      successCriteria: [
        'Impact scope identified',
        'Affected systems catalogued',
      ],
    },
    {
      id: 'milestone-002',
      order: 2,
      title: 'Emergency Notification',
      description: 'Notify affected couples and vendors',
      status: 'completed' as const,
      startTime: '2025-01-22T11:42:00Z',
      completedAt: '2025-01-22T11:50:00Z',
      duration: '8 minutes',
      dependencies: ['milestone-001'],
      weddingImpact: 'high' as const,
      automatedStep: false,
      successCriteria: [
        'All stakeholders notified',
        'Emergency contacts reached',
      ],
    },
    {
      id: 'milestone-003',
      order: 3,
      title: 'Data Recovery Preparation',
      description: 'Prepare recovery environment and validate backups',
      status: 'in-progress' as const,
      startTime: '2025-01-22T11:50:00Z',
      eta: '2025-01-22T12:05:00Z',
      dependencies: ['milestone-002'],
      weddingImpact: 'medium' as const,
      automatedStep: true,
      successCriteria: [
        'Backup integrity verified',
        'Recovery environment ready',
      ],
    },
    {
      id: 'milestone-004',
      order: 4,
      title: 'Critical Data Restoration',
      description: 'Restore guest lists and wedding timelines',
      status: 'pending' as const,
      eta: '2025-01-22T12:20:00Z',
      dependencies: ['milestone-003'],
      weddingImpact: 'high' as const,
      automatedStep: false,
      successCriteria: [
        'Guest lists restored',
        'Timelines recovered',
        'Data integrity validated',
      ],
    },
    {
      id: 'milestone-005',
      order: 5,
      title: 'Photo Gallery Recovery',
      description: 'Restore wedding photo galleries and metadata',
      status: 'pending' as const,
      eta: '2025-01-22T12:45:00Z',
      dependencies: ['milestone-004'],
      weddingImpact: 'high' as const,
      automatedStep: true,
      successCriteria: ['Photo galleries restored', 'Metadata recovered'],
    },
    {
      id: 'milestone-006',
      order: 6,
      title: 'System Verification',
      description: 'Verify all systems operational and data consistent',
      status: 'pending' as const,
      eta: '2025-01-22T13:00:00Z',
      dependencies: ['milestone-005'],
      weddingImpact: 'medium' as const,
      automatedStep: true,
      successCriteria: ['All systems online', 'Data consistency verified'],
    },
    {
      id: 'milestone-007',
      order: 7,
      title: 'Stakeholder Confirmation',
      description: 'Confirm recovery with affected couples and vendors',
      status: 'pending' as const,
      eta: '2025-01-22T13:15:00Z',
      dependencies: ['milestone-006'],
      weddingImpact: 'high' as const,
      automatedStep: false,
      successCriteria: [
        'Customer confirmation received',
        'Vendor systems synchronized',
      ],
    },
    {
      id: 'milestone-008',
      order: 8,
      title: 'Post-Recovery Analysis',
      description: 'Conduct post-mortem and implement preventive measures',
      status: 'pending' as const,
      eta: '2025-01-22T14:00:00Z',
      dependencies: ['milestone-007'],
      weddingImpact: 'none' as const,
      automatedStep: false,
      successCriteria: [
        'Root cause analysis completed',
        'Prevention measures implemented',
      ],
    },
  ],
  overallStatus: 'in-progress' as const,
  startedAt: '2025-01-22T11:35:00Z',
  lastUpdated: '2025-01-22T11:55:00Z',
  nextMilestoneEta: '2025-01-22T12:05:00Z',
};

describe('DisasterTimelineVisualizer', () => {
  const mockOnRetryMilestone = vi.fn();
  const mockOnSkipMilestone = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock current time for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-22T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders disaster timeline with incident information', () => {
    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    expect(screen.getByText('Disaster Recovery Timeline')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL INCIDENT')).toBeInTheDocument();
    expect(screen.getByText('incident-001')).toBeInTheDocument();
    expect(screen.getByText('data-corruption')).toBeInTheDocument();
  });

  it('displays progress percentage and status', () => {
    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    expect(screen.getByText('25%')).toBeInTheDocument(); // 2 completed out of 8 total
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 8')).toBeInTheDocument();
  });

  it('shows urgent wedding impact alerts', () => {
    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    expect(screen.getByText('Urgent Wedding Impact')).toBeInTheDocument();
    expect(screen.getByText('Sarah & John')).toBeInTheDocument();
    expect(screen.getByText('Emma & David')).toBeInTheDocument();
    expect(screen.getByText('SEVERE')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('displays recovery milestones with proper status indicators', () => {
    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    expect(screen.getByText('1. Incident Assessment')).toBeInTheDocument();
    expect(screen.getByText('2. Emergency Notification')).toBeInTheDocument();
    expect(
      screen.getByText('3. Data Recovery Preparation'),
    ).toBeInTheDocument();

    // Check for status indicators
    const completedMilestones = screen.getAllByText(/completed:/i);
    expect(completedMilestones).toHaveLength(2);
  });

  it('shows milestone expansion with detailed information', async () => {
    const user = userEvent.setup();

    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    const milestoneCard = screen
      .getByText('1. Incident Assessment')
      .closest('[data-testid="milestone-card"]');
    await user.click(milestoneCard!);

    await waitFor(() => {
      expect(screen.getByText('Success Criteria')).toBeInTheDocument();
      expect(screen.getByText('Impact scope identified')).toBeInTheDocument();
      expect(
        screen.getByText('Affected systems catalogued'),
      ).toBeInTheDocument();
    });
  });

  it('displays wedding impact levels and urgency indicators', () => {
    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    expect(screen.getByText('HIGH IMPACT')).toBeInTheDocument();
    expect(screen.getByText('AUTO')).toBeInTheDocument(); // Automated step indicator
  });

  it('handles timeline view toggle between compact and detailed', async () => {
    const user = userEvent.setup();

    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    const toggleButton = screen.getByText('Compact View');
    await user.click(toggleButton);

    expect(screen.getByText('Detailed View')).toBeInTheDocument();
  });

  it('filters milestones when show only active is enabled', async () => {
    const user = userEvent.setup();

    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    const showActiveCheckbox = screen.getByLabelText('Show only active');
    await user.click(showActiveCheckbox);

    // Should only show in-progress and failed milestones
    expect(
      screen.getByText('3. Data Recovery Preparation'),
    ).toBeInTheDocument();
    // Completed milestones should be hidden
    expect(
      screen.queryByText('1. Incident Assessment'),
    ).not.toBeInTheDocument();
  });

  it('handles milestone retry functionality', async () => {
    const user = userEvent.setup();

    // Create a failed milestone for testing retry
    const failedProgress = {
      ...mockRecoveryProgress,
      milestones: [
        ...mockRecoveryProgress.milestones,
        {
          id: 'milestone-failed',
          order: 9,
          title: 'Failed Recovery Step',
          description: 'This step failed and needs retry',
          status: 'failed' as const,
          startTime: '2025-01-22T12:00:00Z',
          dependencies: [],
          weddingImpact: 'high' as const,
          automatedStep: false,
          successCriteria: ['Data restored'],
          failureReason: 'Network timeout during data transfer',
          retryCount: 1,
          maxRetries: 3,
        },
      ],
    };

    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={failedProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    expect(mockOnRetryMilestone).toHaveBeenCalledWith('milestone-failed');
  });

  it('handles milestone skip functionality', async () => {
    const user = userEvent.setup();

    const failedProgress = {
      ...mockRecoveryProgress,
      milestones: [
        ...mockRecoveryProgress.milestones,
        {
          id: 'milestone-failed',
          order: 9,
          title: 'Failed Recovery Step',
          description: 'This step failed and can be skipped',
          status: 'failed' as const,
          startTime: '2025-01-22T12:00:00Z',
          dependencies: [],
          weddingImpact: 'low' as const,
          automatedStep: false,
          successCriteria: ['Data restored'],
          failureReason: 'Non-critical service unavailable',
        },
      ],
    };

    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={failedProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    const skipButton = screen.getByText('Skip');
    await user.click(skipButton);

    expect(mockOnSkipMilestone).toHaveBeenCalledWith('milestone-failed');
  });

  it('displays real-time elapsed time calculation', () => {
    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
        realTimeUpdates={true}
      />,
    );

    // With mocked time, elapsed should be 30 minutes (12:00 - 11:30)
    expect(screen.getByText(/30m/)).toBeInTheDocument();
  });

  it('shows milestone dependencies and relationships', async () => {
    const user = userEvent.setup();

    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    // Expand milestone 2 which has dependencies
    const milestone2Card = screen
      .getByText('2. Emergency Notification')
      .closest('[data-testid="milestone-card"]');
    await user.click(milestone2Card!);

    await waitFor(() => {
      expect(screen.getByText('Dependencies')).toBeInTheDocument();
      expect(screen.getByText('milestone-001')).toBeInTheDocument();
    });
  });

  it('displays failure reasons for failed milestones', async () => {
    const user = userEvent.setup();

    const failedProgress = {
      ...mockRecoveryProgress,
      milestones: [
        ...mockRecoveryProgress.milestones,
        {
          id: 'milestone-failed',
          order: 9,
          title: 'Failed Step',
          description: 'This step failed',
          status: 'failed' as const,
          dependencies: [],
          weddingImpact: 'high' as const,
          automatedStep: false,
          successCriteria: ['Data restored'],
          failureReason: 'Database connection timeout after 3 attempts',
        },
      ],
    };

    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={failedProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    const failedMilestone = screen
      .getByText('Failed Step')
      .closest('[data-testid="milestone-card"]');
    await user.click(failedMilestone!);

    await waitFor(() => {
      expect(screen.getByText('Failure Reason')).toBeInTheDocument();
      expect(
        screen.getByText('Database connection timeout after 3 attempts'),
      ).toBeInTheDocument();
    });
  });

  it('shows wedding countdown with urgency colors', () => {
    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    // Wedding in 2 days should show urgency
    expect(screen.getByText('2 days')).toBeInTheDocument();
    expect(screen.getByText('3 days')).toBeInTheDocument();
  });

  it('displays timeline footer with summary information', () => {
    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    expect(screen.getByText('2 weddings affected')).toBeInTheDocument();
    expect(screen.getByText('2 steps completed')).toBeInTheDocument();
    expect(
      screen.getByText('Recovery initiated by automated-monitoring'),
    ).toBeInTheDocument();
  });

  it('handles progress bar updates correctly', () => {
    const { rerender } = render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    expect(screen.getByText('25%')).toBeInTheDocument();

    // Update progress
    const updatedProgress = {
      ...mockRecoveryProgress,
      currentStep: 5,
      milestones: mockRecoveryProgress.milestones.map((m) =>
        m.order <= 4 ? { ...m, status: 'completed' as const } : m,
      ),
    };

    rerender(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={updatedProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('provides accessible navigation and ARIA support', () => {
    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByLabelText(/disaster recovery timeline/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/recovery progress/i)).toBeInTheDocument();
  });

  it('handles keyboard navigation for milestone interactions', async () => {
    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
      />,
    );

    const milestoneCard = screen
      .getByText('1. Incident Assessment')
      .closest('[data-testid="milestone-card"]');
    milestoneCard!.focus();

    fireEvent.keyDown(milestoneCard!, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Success Criteria')).toBeInTheDocument();
    });
  });

  it('updates real-time when realTimeUpdates is enabled', () => {
    vi.advanceTimersByTime(60000); // Advance 1 minute

    render(
      <DisasterTimelineVisualizer
        incidentTimeline={mockIncidentTimeline}
        recoveryProgress={mockRecoveryProgress}
        estimatedCompletion="2025-01-22T14:00:00Z"
        onRetryMilestone={mockOnRetryMilestone}
        onSkipMilestone={mockOnSkipMilestone}
        realTimeUpdates={true}
      />,
    );

    // Time should be updated in real-time
    expect(screen.getByText(/31m/)).toBeInTheDocument(); // 31 minutes elapsed
  });
});
