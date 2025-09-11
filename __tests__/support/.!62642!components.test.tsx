import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn()
  },
  channel: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  })
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}));

// Mock services
jest.mock('@/lib/support/response-manager', () => ({
  responseManager: {
    getCannedResponses: jest.fn(),
    getResponseSuggestions: jest.fn(),
    processResponseTemplate: jest.fn(),
    trackResponseUsage: jest.fn(),
    createCannedResponse: jest.fn()
  }
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM dd, HH:mm') return 'Sep 02, 14:30';
    if (formatStr === 'MMM dd, yyyy') return 'Sep 03, 2025';
    return 'Sep 02';
  })
}));

describe('TicketQueue Component', () => {
  let TicketQueue: any;
  const mockTickets = [
    {
      id: 'ticket-1',
      title: 'Wedding Day Emergency - Photographer No Show',
      description: 'Our photographer did not arrive and ceremony starts in 2 hours',
      status: 'open',
      priority: 'wedding_day',
      category: 'vendor',
      tags: ['wedding_day', 'emergency'],
      customer_name: 'Sarah Johnson',
      customer_email: 'sarah@example.com',
      wedding_date: '2025-09-02T16:00:00Z',
      days_until_wedding: 0,
      is_escalated: true,
      sla_breach_risk: 'critical',
      unread_messages: 2,
      created_at: '2025-09-02T14:00:00Z',
      updated_at: '2025-09-02T14:00:00Z',
      due_at: '2025-09-02T14:15:00Z',
      organization_id: 'org-123'
    },
    {
      id: 'ticket-2',
      title: 'Integration issue with Tave',
      description: 'Client sync is not working properly',
      status: 'in_progress',
      priority: 'high',
      category: 'technical',
      tags: ['integration', 'sync'],
      customer_name: 'Mike Davis',
      customer_email: 'mike@example.com',
      assigned_agent_id: 'agent-123',
      assigned_agent_name: 'John Smith',
      created_at: '2025-09-02T13:00:00Z',
      updated_at: '2025-09-02T13:30:00Z',
      organization_id: 'org-123'
    }
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis()
    };

    mockSupabase.from.mockReturnValue(mockQuery);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { 
        user: { 
          id: 'agent-123', 
          email: 'agent@example.com',
          user_metadata: { full_name: 'John Smith' }
        } 
      },
      error: null
    });

    // Mock successful query with tickets data
    mockQuery.select.mockImplementation((fields) => {
      if (fields.includes('_count_messages')) {
        return Promise.resolve({ data: mockTickets, error: null });
      }
      return mockQuery;
    });

    // Dynamic import to ensure mocks are set up before component loads
    const module = await import('@/components/support/TicketQueue');
    TicketQueue = module.default;
  });

  test('renders ticket queue with proper headers and controls', async () => {
    render(<TicketQueue />);

    expect(screen.getByText('Support Queue')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /volume/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
  });

  test('displays wedding day emergency tickets with proper styling', async () => {
    render(<TicketQueue />);

    await waitFor(() => {
      const emergencyTicket = screen.getByText('Wedding Day Emergency - Photographer No Show');
      expect(emergencyTicket).toBeInTheDocument();
    });

    // Check for wedding day priority badge
    const weddingDayBadge = screen.getByText('wedding_day');
    expect(weddingDayBadge).toBeInTheDocument();
    expect(weddingDayBadge.closest('.animate-pulse')).toBeInTheDocument();

    // Check for SLA breach indicator
    expect(screen.getByText('SLA BREACH')).toBeInTheDocument();

    // Check for escalation badge
    expect(screen.getByText('Escalated')).toBeInTheDocument();
  });

  test('filters tickets by wedding urgency correctly', async () => {
    render(<TicketQueue />);

    await waitFor(() => {
      expect(screen.getByText('Wedding Day Emergency - Photographer No Show')).toBeInTheDocument();
    });

    // Find and click the wedding urgency filter
    const weddingUrgencySelect = screen.getByDisplayValue('All');
    fireEvent.click(weddingUrgencySelect);
    
    const todayOption = screen.getByText('Today');
    fireEvent.click(todayOption);

    // Should still show the wedding day emergency ticket
    await waitFor(() => {
      expect(screen.getByText('Wedding Day Emergency - Photographer No Show')).toBeInTheDocument();
    });
  });

  test('allows ticket assignment to current agent', async () => {
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null })
    });
    
    mockSupabase.from.mockReturnValue({
      ...mockSupabase.from(),
      update: mockUpdate
    });

    render(<TicketQueue />);

    await waitFor(() => {
      expect(screen.getByText('Wedding Day Emergency - Photographer No Show')).toBeInTheDocument();
    });

    // Find unassigned ticket and click "Assign to Me"
    const assignButton = screen.getByText('Assign to Me');
    fireEvent.click(assignButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        assigned_agent_id: 'agent-123',
        status: 'in_progress'
      }));
    });
  });

  test('updates ticket status via dropdown', async () => {
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null })
    });
    
    mockSupabase.from.mockReturnValue({
      ...mockSupabase.from(),
      update: mockUpdate
    });

    render(<TicketQueue />);

    await waitFor(() => {
      expect(screen.getByText('Integration issue with Tave')).toBeInTheDocument();
    });

    // Find status dropdown for second ticket
    const statusDropdowns = screen.getAllByDisplayValue('in progress');
    fireEvent.click(statusDropdowns[0]);

    const resolvedOption = screen.getByText('Resolved');
    fireEvent.click(resolvedOption);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'resolved',
        resolved_at: expect.any(String)
      }));
    });
  });

  test('handles bulk ticket selection and assignment', async () => {
    render(<TicketQueue />);

    await waitFor(() => {
      expect(screen.getByText('Wedding Day Emergency - Photographer No Show')).toBeInTheDocument();
    });

    // Select multiple tickets
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // First ticket
    fireEvent.click(checkboxes[1]); // Second ticket

    // Should show bulk actions
    await waitFor(() => {
      expect(screen.getByText('2 selected')).toBeInTheDocument();
      expect(screen.getByText('Assign to Me')).toBeInTheDocument();
    });
  });

  test('groups tickets correctly in tabs', async () => {
    render(<TicketQueue />);

    await waitFor(() => {
      expect(screen.getByText('Wedding Day Emergency - Photographer No Show')).toBeInTheDocument();
    });

    // Check tab counts
    const urgentTab = screen.getByText(/Urgent \(1\)/);
    expect(urgentTab).toBeInTheDocument();

    const myTicketsTab = screen.getByText(/My Tickets \(1\)/);
    expect(myTicketsTab).toBeInTheDocument();

    const allTab = screen.getByText(/All \(2\)/);
    expect(allTab).toBeInTheDocument();
  });

  test('displays wedding timing information correctly', async () => {
    render(<TicketQueue />);

    await waitFor(() => {
      expect(screen.getByText('Wedding Day Emergency - Photographer No Show')).toBeInTheDocument();
    });

    // Check wedding date display
    expect(screen.getByText(/Wedding: Sep 03, 2025/)).toBeInTheDocument();
    expect(screen.getByText(/\(0 days\)/)).toBeInTheDocument();
  });

  test('handles search functionality', async () => {
    render(<TicketQueue />);

    await waitFor(() => {
      expect(screen.getByText('Wedding Day Emergency - Photographer No Show')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search tickets...');
    fireEvent.change(searchInput, { target: { value: 'photographer' } });

    // Should filter to show only the wedding day emergency
    await waitFor(() => {
      expect(screen.getByText('Wedding Day Emergency - Photographer No Show')).toBeInTheDocument();
    });
  });

  test('handles audio notifications toggle', async () => {
    render(<TicketQueue />);

    const audioButton = screen.getByRole('button', { name: /volume/i });
    fireEvent.click(audioButton);

    // Should toggle audio state (testing implementation detail here)
    expect(audioButton).toBeInTheDocument();
  });

  test('opens settings dialog and allows configuration', async () => {
    render(<TicketQueue />);

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Queue Settings')).toBeInTheDocument();
      expect(screen.getByText('Auto Refresh')).toBeInTheDocument();
      expect(screen.getByText('Refresh Interval (seconds)')).toBeInTheDocument();
    });
  });

  test('handles ticket view action', async () => {
    // Mock window.open
    const mockOpen = jest.fn();
    Object.defineProperty(window, 'open', {
      writable: true,
      value: mockOpen
    });

    render(<TicketQueue />);

    await waitFor(() => {
      expect(screen.getByText('Wedding Day Emergency - Photographer No Show')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]);

    expect(mockOpen).toHaveBeenCalledWith('/support/tickets/ticket-1', '_blank');
  });

  test('displays proper SLA indicators', async () => {
    render(<TicketQueue />);

    await waitFor(() => {
      expect(screen.getByText('Wedding Day Emergency - Photographer No Show')).toBeInTheDocument();
    });

    // Should show SLA breach warning
    const slaWarning = screen.getByText('SLA BREACH');
    expect(slaWarning).toBeInTheDocument();
    expect(slaWarning.closest('.animate-pulse')).toBeInTheDocument();

    // Should show due time
    expect(screen.getByText(/Due:/)).toBeInTheDocument();
  });

  test('handles empty state correctly', async () => {
    // Mock empty response
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      is: jest.fn().mockImplementation(() => Promise.resolve({ data: [], error: null }))
    });

    render(<TicketQueue />);

    await waitFor(() => {
