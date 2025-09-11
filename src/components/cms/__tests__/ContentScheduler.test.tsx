import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentScheduler } from '../ContentScheduler';
import { ContentItem, ContentSchedule } from '@/types/cms';

// Mock ContentScheduler component tests
// WS-223 Team A - Round 1

const mockContentItems: ContentItem[] = [
  {
    id: '1',
    organization_id: 'org1',
    title: 'Welcome Message for Spring Weddings',
    body: {},
    plain_text: 'Welcome to our wedding photography service!',
    status: 'draft',
    type: 'welcome_message',
    media_urls: [],
    created_by: 'user1',
    created_at: '2025-01-30T10:00:00Z',
    updated_at: '2025-01-30T10:00:00Z',
    version: 1,
    is_template: false,
  },
  {
    id: '2',
    organization_id: 'org1',
    title: 'Service Package Descriptions',
    body: {},
    plain_text: 'Our comprehensive wedding photography packages...',
    status: 'scheduled',
    type: 'service_description',
    media_urls: [],
    scheduled_at: '2025-02-01T09:00:00Z',
    created_by: 'user1',
    created_at: '2025-01-29T15:00:00Z',
    updated_at: '2025-01-29T15:00:00Z',
    version: 1,
    is_template: false,
  },
  {
    id: '3',
    organization_id: 'org1',
    title: 'Client Testimonials Page',
    body: {},
    plain_text: 'Read what our happy couples have to say...',
    status: 'published',
    type: 'page_content',
    media_urls: [],
    published_at: '2025-01-28T12:00:00Z',
    created_by: 'user1',
    created_at: '2025-01-28T10:00:00Z',
    updated_at: '2025-01-28T10:00:00Z',
    version: 1,
    is_template: false,
  },
];

const mockSchedules: ContentSchedule[] = [
  {
    id: 'schedule1',
    content_id: '2',
    scheduled_at: '2025-02-01T09:00:00Z',
    timezone: 'UTC',
    status: 'pending',
    retry_count: 0,
    created_at: '2025-01-29T15:00:00Z',
  },
];

describe('ContentScheduler', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnPublish = jest.fn();
  const mockOnSchedule = jest.fn();
  const mockOnPreview = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders content scheduler header', () => {
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    expect(screen.getByText('Content Scheduler')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Manage your content publishing workflow and schedule posts',
      ),
    ).toBeInTheDocument();
  });

  it('displays content status statistics', () => {
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('renders content items with correct status', () => {
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    expect(
      screen.getByText('Welcome Message for Spring Weddings'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service Package Descriptions'),
    ).toBeInTheDocument();
    expect(screen.getByText('Client Testimonials Page')).toBeInTheDocument();
  });

  it('shows publish now button for draft content', () => {
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    const publishButtons = screen.getAllByText('Publish Now');
    expect(publishButtons.length).toBeGreaterThan(0);
  });

  it('shows schedule button for draft content', () => {
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    const scheduleButtons = screen.getAllByText('Schedule');
    expect(scheduleButtons.length).toBeGreaterThan(0);
  });

  it('handles publish now action', async () => {
    const user = userEvent.setup();
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    const publishButton = screen.getAllByText('Publish Now')[0];
    await user.click(publishButton);

    expect(mockOnPublish).toHaveBeenCalledWith('1');
  });

  it('opens schedule modal when schedule button clicked', async () => {
    const user = userEvent.setup();
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    const scheduleButton = screen.getAllByText('Schedule')[0];
    await user.click(scheduleButton);

    expect(screen.getByText('Schedule Content')).toBeInTheDocument();
    expect(screen.getByText('Publish Date')).toBeInTheDocument();
    expect(screen.getByText('Publish Time')).toBeInTheDocument();
  });

  it('handles content scheduling', async () => {
    const user = userEvent.setup();
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    // Open schedule modal
    const scheduleButton = screen.getAllByText('Schedule')[0];
    await user.click(scheduleButton);

    // Fill in date and time
    const dateInput = screen.getByLabelText('Publish Date');
    const timeInput = screen.getByLabelText('Publish Time');

    await user.type(dateInput, '2025-02-15');
    await user.type(timeInput, '14:30');

    // Submit schedule
    const submitButton = screen.getByRole('button', { name: 'Schedule' });
    await user.click(submitButton);

    expect(mockOnSchedule).toHaveBeenCalledWith(
      '1',
      '2025-02-15T14:30:00.000Z',
    );
  });

  it('shows scheduled content information', () => {
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    expect(screen.getByText(/Scheduled for/)).toBeInTheDocument();
  });

  it('handles content editing', async () => {
    const user = userEvent.setup();
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    const editButtons = screen.getAllByTitle('Edit');
    await user.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockContentItems[0]);
  });

  it('handles content deletion', async () => {
    const user = userEvent.setup();
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    const deleteButtons = screen.getAllByTitle('Delete');
    await user.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('handles content preview', async () => {
    const user = userEvent.setup();
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    const previewButtons = screen.getAllByTitle('Preview');
    await user.click(previewButtons[0]);

    expect(mockOnPreview).toHaveBeenCalledWith(mockContentItems[0]);
  });

  it('filters content by status', async () => {
    const user = userEvent.setup();
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    const statusFilter = screen.getByDisplayValue('All Status');
    await user.selectOptions(statusFilter, 'draft');

    // Only draft items should be visible
    expect(
      screen.getByText('Welcome Message for Spring Weddings'),
    ).toBeInTheDocument();
  });

  it('searches content by query', async () => {
    const user = userEvent.setup();
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    const searchInput = screen.getByPlaceholderText('Search content...');
    await user.type(searchInput, 'testimonials');

    // Only matching items should be visible
    expect(screen.getByText('Client Testimonials Page')).toBeInTheDocument();
  });

  it('sorts content by different criteria', async () => {
    const user = userEvent.setup();
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    const sortSelect = screen.getByDisplayValue('Sort by Created');
    await user.selectOptions(sortSelect, 'published');

    // Content would be re-sorted by published date
    expect(sortSelect).toHaveValue('published');
  });

  it('shows empty state when no content matches filters', async () => {
    const user = userEvent.setup();
    render(
      <ContentScheduler
        items={[]}
        schedules={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    expect(screen.getByText('No content found')).toBeInTheDocument();
    expect(
      screen.getByText('Create your first piece of content to get started'),
    ).toBeInTheDocument();
  });

  it('validates schedule date input', async () => {
    const user = userEvent.setup();
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    // Open schedule modal
    const scheduleButton = screen.getAllByText('Schedule')[0];
    await user.click(scheduleButton);

    const submitButton = screen.getByRole('button', { name: 'Schedule' });
    expect(submitButton).toBeDisabled();
  });

  it('shows failed publishing status', () => {
    const failedSchedule: ContentSchedule = {
      id: 'failed1',
      content_id: '4',
      scheduled_at: '2025-02-01T09:00:00Z',
      timezone: 'UTC',
      status: 'failed',
      retry_count: 1,
      error_message: 'Network error',
      created_at: '2025-01-29T15:00:00Z',
    };

    const failedContent: ContentItem = {
      ...mockContentItems[0],
      id: '4',
      status: 'draft',
    };

    render(
      <ContentScheduler
        items={[failedContent]}
        schedules={[failedSchedule]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    expect(screen.getByText('Publishing failed')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('handles retry failed publishing', async () => {
    const user = userEvent.setup();
    const failedSchedule: ContentSchedule = {
      id: 'failed1',
      content_id: '4',
      scheduled_at: '2025-02-01T09:00:00Z',
      timezone: 'UTC',
      status: 'failed',
      retry_count: 1,
      error_message: 'Network error',
      created_at: '2025-01-29T15:00:00Z',
    };

    const failedContent: ContentItem = {
      ...mockContentItems[0],
      id: '4',
      status: 'draft',
    };

    render(
      <ContentScheduler
        items={[failedContent]}
        schedules={[failedSchedule]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    expect(mockOnPublish).toHaveBeenCalledWith('4');
  });

  it('shows content type and metadata', () => {
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    expect(screen.getByText('Type: Welcome Message')).toBeInTheDocument();
    expect(screen.getByText('Type: Service Description')).toBeInTheDocument();
    expect(screen.getByText('Type: Page Content')).toBeInTheDocument();
  });

  it('displays creation and publication dates', () => {
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    expect(screen.getByText(/Created:/)).toBeInTheDocument();
    expect(screen.getByText(/Published:/)).toBeInTheDocument();
    expect(screen.getByText(/Scheduled:/)).toBeInTheDocument();
  });

  it('cancels schedule modal', async () => {
    const user = userEvent.setup();
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    // Open schedule modal
    const scheduleButton = screen.getAllByText('Schedule')[0];
    await user.click(scheduleButton);

    // Cancel
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Schedule Content')).not.toBeInTheDocument();
    });
  });

  it('shows correct status icons', () => {
    render(
      <ContentScheduler
        items={mockContentItems}
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onPublish={mockOnPublish}
        onSchedule={mockOnSchedule}
        onPreview={mockOnPreview}
      />,
    );

    // Status badges would be displayed with appropriate colors
    const statusBadges = document.querySelectorAll(
      '[class*="bg-green-100"], [class*="bg-blue-100"], [class*="bg-gray-100"]',
    );
    expect(statusBadges.length).toBeGreaterThan(0);
  });
});
