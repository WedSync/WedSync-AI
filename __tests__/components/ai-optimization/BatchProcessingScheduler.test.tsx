/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BatchProcessingScheduler from '@/components/ai-optimization/BatchProcessingScheduler';
import type { BatchProcessingJob } from '@/types/ai-optimization';

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <div data-testid="card" className={className}>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => 
    <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <span data-testid="badge" className={className}>{children}</span>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    variant?: string; 
    size?: string; 
  }) => 
    <button 
      data-testid="button" 
      onClick={onClick} 
      data-variant={variant} 
      data-size={size}
    >
      {children}
    </button>,
}));

describe('BatchProcessingScheduler', () => {
  const mockJobs: BatchProcessingJob[] = [
    {
      id: 'test-job-1',
      type: 'photo_processing',
      status: 'queued',
      priority: 'normal',
      scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      estimatedCostPence: 480,
      costSavingsVsImmediate: 120,
      isClientFacing: false,
      items: 25,
      processedItems: 0,
      failedItems: 0,
      metadata: {
        service: 'Photo AI tagging'
      }
    }
  ];

  const mockProps = {
    organizationId: 'test-org-1',
    jobs: mockJobs,
    onScheduleJob: jest.fn(),
    onCancelJob: jest.fn(),
    onRescheduleJob: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders batch processing scheduler', () => {
    render(<BatchProcessingScheduler {...mockProps} />);
    expect(screen.getByTestId('card-title')).toHaveTextContent('Batch Processing Scheduler');
  });

  test('displays job queue with active jobs', () => {
    render(<BatchProcessingScheduler {...mockProps} />);
    expect(screen.getByText('Photo AI tagging')).toBeInTheDocument();
  });

  test('shows cost savings for jobs', () => {
    render(<BatchProcessingScheduler {...mockProps} />);
    expect(screen.getByText('£1.20')).toBeInTheDocument(); // Cost savings
  });

  test('handles schedule job button click', () => {
    render(<BatchProcessingScheduler {...mockProps} />);
    const scheduleButton = screen.getByText('Schedule Job');
    fireEvent.click(scheduleButton);
    expect(mockProps.onScheduleJob).toHaveBeenCalled();
  });

  test('displays job status badges', () => {
    render(<BatchProcessingScheduler {...mockProps} />);
    expect(screen.getByText('queued')).toBeInTheDocument();
  });

  test('shows wedding season optimization settings', () => {
    render(<BatchProcessingScheduler {...mockProps} />);
    expect(screen.getByText(/wedding season/i)).toBeInTheDocument();
  });

  test('calculates total savings correctly', () => {
    render(<BatchProcessingScheduler {...mockProps} />);
    expect(screen.getByText('£1.20 saved')).toBeInTheDocument();
  });

  test('handles cancel job action', () => {
    render(<BatchProcessingScheduler {...mockProps} />);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(mockProps.onCancelJob).toHaveBeenCalledWith('test-job-1');
  });
});
