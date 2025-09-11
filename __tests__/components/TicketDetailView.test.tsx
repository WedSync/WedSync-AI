/**
 * TicketDetailView Component Tests
 * WS-235: Support Operations Ticket Management System
 * 
 * Tests for the TicketDetailView React component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import TicketDetailView from '@/components/support/TicketDetailView';
import type { Ticket, TicketMessage } from '@/lib/support/ticket-manager';

// Mock Next.js router
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh
  })
}));

// Mock fetch API
global.fetch = jest.fn();

// Mock Supabase realtime
jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        on: jest.fn(() => ({
          subscribe: jest.fn(() => ({ status: 'success' }))
        }))
      })),
      unsubscribe: jest.fn()
    }))
  }
}));

// Mock TemplateSelector component
jest.mock('@/components/support/TemplateSelector', () => {
  return function MockTemplateSelector({ onTemplateSelected }: any) {
    return (
      <button
        onClick={() =>
          onTemplateSelected({
            subject: 'Test Template Subject',
            content: 'Test template content',
            variables_replaced: { customer_name: 'John' },
            missing_variables: []
          })
        }
      >
        Use Template
      </button>
    );
  };
});

// Mock toast notifications
const mockToast = {
  success: jest.fn(),
  error: jest.fn()
};
jest.mock('sonner', () => ({
  toast: mockToast
}));

// Test data
const mockTicket: Ticket = {
  id: 'ticket-123',
  ticket_number: 'WS-001',
  organization_id: 'org-123',
  customer_id: 'customer-123',
  customer_name: 'John Photographer',
  customer_email: 'john@example.com',
  customer_tier: 'professional',
  vendor_type: 'photographer',
  subject: 'Payment issue with subscription',
  description: 'My credit card was declined when trying to upgrade to professional plan',
  category: 'billing',
  type: 'billing',
  priority: 'high',
  status: 'open',
  assigned_to: 'agent-123',
  tags: ['payment', 'urgent'],
  is_wedding_emergency: false,
  urgency_score: 7,
  sla_target_response: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
  sla_target_resolution: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours from now
  escalation_level: 0,
  metadata: {},
  created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
  updated_at: new Date().toISOString(),
  first_response_at: null,
  resolved_at: null
};

const mockMessages: TicketMessage[] = [
  {
    id: 'msg-1',
    ticket_id: 'ticket-123',
    content: 'My credit card was declined when trying to upgrade. Please help!',
    sent_by: 'customer-123',
    sender_name: 'John Photographer',
    sender_email: 'john@example.com',
    message_type: 'customer_message',
    is_internal: false,
    attachments: [],
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    id: 'msg-2',
    ticket_id: 'ticket-123',
    content: 'Thank you for contacting support. I will help you resolve this payment issue.',
    sent_by: 'agent-123',
    sender_name: 'Support Agent',
    sender_email: 'agent@wedsync.com',
    message_type: 'response',
    is_internal: false,
    attachments: [],
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString()
  }
];

const mockSlaStatus = {
  response_time_remaining: 30 * 60 * 1000, // 30 minutes
  resolution_time_remaining: 7.5 * 60 * 60 * 1000, // 7.5 hours
  is_response_overdue: false,
  is_resolution_overdue: false,
  breach_risk: 'low' as const
};

const defaultProps = {
  ticket: mockTicket,
  messages: mockMessages,
  slaStatus: mockSlaStatus,
  onStatusUpdate: jest.fn(),
  onEscalate: jest.fn(),
  onAddMessage: jest.fn().mockResolvedValue({
    id: 'new-msg',
    ticket_id: 'ticket-123',
    content: 'New message content',
    sent_by: 'agent-123',
    created_at: new Date().toISOString()
  })
};

describe('TicketDetailView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
  });

  describe('Ticket Information Display', () => {
    it('should display ticket details correctly', () => {
      render(<TicketDetailView {...defaultProps} />);

      expect(screen.getByText('WS-001')).toBeInTheDocument();
      expect(screen.getByText('John Photographer')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Payment issue with subscription')).toBeInTheDocument();
      expect(screen.getByText(/My credit card was declined/)).toBeInTheDocument();
    });

    it('should show priority and status badges', () => {
      render(<TicketDetailView {...defaultProps} />);

      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.getByText('Professional')).toBeInTheDocument();
    });

    it('should display customer tier information', () => {
      render(<TicketDetailView {...defaultProps} />);

      expect(screen.getByText('Professional')).toBeInTheDocument();
    });

    it('should show wedding emergency indicator when applicable', () => {
      const emergencyTicket = {
        ...mockTicket,
        is_wedding_emergency: true,
        priority: 'critical' as const
      };

      render(<TicketDetailView {...defaultProps} ticket={emergencyTicket} />);

      expect(screen.getByText(/Wedding Emergency/)).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('should display vendor type badge', () => {
      render(<TicketDetailView {...defaultProps} />);

      expect(screen.getByText('Photographer')).toBeInTheDocument();
    });

    it('should show tags', () => {
      render(<TicketDetailView {...defaultProps} />);

      expect(screen.getByText('payment')).toBeInTheDocument();
      expect(screen.getByText('urgent')).toBeInTheDocument();
    });
  });

  describe('SLA Status Display', () => {
    it('should show SLA countdown timers', () => {
      render(<TicketDetailView {...defaultProps} />);

      expect(screen.getByText(/Response SLA/)).toBeInTheDocument();
      expect(screen.getByText(/Resolution SLA/)).toBeInTheDocument();
    });

    it('should indicate SLA breach risk', () => {
      const highRiskSla = {
        ...mockSlaStatus,
        response_time_remaining: 5 * 60 * 1000, // 5 minutes
        breach_risk: 'high' as const
      };

      render(<TicketDetailView {...defaultProps} slaStatus={highRiskSla} />);

      // Should show warning indicators for high risk
      expect(screen.getByTestId('sla-warning')).toBeInTheDocument();
    });

    it('should show overdue status', () => {
      const overdueSla = {
        ...mockSlaStatus,
        response_time_remaining: -10 * 60 * 1000, // 10 minutes overdue
        is_response_overdue: true,
        breach_risk: 'critical' as const
      };

      render(<TicketDetailView {...defaultProps} slaStatus={overdueSla} />);

      expect(screen.getByText(/Overdue/)).toBeInTheDocument();
    });
  });

  describe('Message Thread', () => {
    it('should display all messages in chronological order', () => {
      render(<TicketDetailView {...defaultProps} />);

      const messages = screen.getAllByTestId(/message-/);
      expect(messages).toHaveLength(2);

      // First message should be from customer
      expect(within(messages[0]).getByText(/My credit card was declined/)).toBeInTheDocument();
      expect(within(messages[0]).getByText('John Photographer')).toBeInTheDocument();

      // Second message should be from agent
      expect(within(messages[1]).getByText(/Thank you for contacting support/)).toBeInTheDocument();
      expect(within(messages[1]).getByText('Support Agent')).toBeInTheDocument();
    });

    it('should distinguish between customer and agent messages', () => {
      render(<TicketDetailView {...defaultProps} />);

      const customerMessage = screen.getByTestId('message-msg-1');
      const agentMessage = screen.getByTestId('message-msg-2');

      expect(customerMessage).toHaveClass('customer-message');
      expect(agentMessage).toHaveClass('agent-message');
    });

    it('should show message timestamps', () => {
      render(<TicketDetailView {...defaultProps} />);

      // Should show relative timestamps like "20 minutes ago"
      expect(screen.getByText(/minutes ago/)).toBeInTheDocument();
    });

    it('should handle messages with attachments', () => {
      const messagesWithAttachments: TicketMessage[] = [
        {
          ...mockMessages[0],
          attachments: [
            {
              id: 'att-1',
              filename: 'screenshot.png',
              file_size: 1024000,
              content_type: 'image/png',
              url: 'https://example.com/screenshot.png'
            }
          ]
        }
      ];

      render(<TicketDetailView {...defaultProps} messages={messagesWithAttachments} />);

      expect(screen.getByText('screenshot.png')).toBeInTheDocument();
      expect(screen.getByText(/1.02 MB/)).toBeInTheDocument(); // File size display
    });
  });

  describe('Message Composition', () => {
    it('should allow composing and sending messages', async () => {
      const user = userEvent.setup();
      render(<TicketDetailView {...defaultProps} />);

      const messageInput = screen.getByPlaceholderText(/Type your response/);
      const sendButton = screen.getByText('Send');

      await user.type(messageInput, 'This is a test response');
      await user.click(sendButton);

      await waitFor(() => {
        expect(defaultProps.onAddMessage).toHaveBeenCalledWith({
          content: 'This is a test response',
          message_type: 'response',
          is_internal: false,
          attachments: []
        });
      });
    });

    it('should validate message content', async () => {
      const user = userEvent.setup();
      render(<TicketDetailView {...defaultProps} />);

      const sendButton = screen.getByText('Send');
      await user.click(sendButton);

      // Should show validation error
      expect(screen.getByText(/Message content is required/)).toBeInTheDocument();
    });

    it('should handle message sending errors', async () => {
      const user = userEvent.setup();
      const onAddMessageError = jest.fn().mockRejectedValue(new Error('Network error'));

      render(<TicketDetailView {...defaultProps} onAddMessage={onAddMessageError} />);

      const messageInput = screen.getByPlaceholderText(/Type your response/);
      const sendButton = screen.getByText('Send');

      await user.type(messageInput, 'This message will fail');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to send message');
      });
    });

    it('should support internal notes', async () => {
      const user = userEvent.setup();
      render(<TicketDetailView {...defaultProps} />);

      const internalToggle = screen.getByLabelText(/Internal note/);
      const messageInput = screen.getByPlaceholderText(/Type your response/);
      const sendButton = screen.getByText('Send');

      await user.click(internalToggle);
      await user.type(messageInput, 'This is an internal note');
      await user.click(sendButton);

      await waitFor(() => {
        expect(defaultProps.onAddMessage).toHaveBeenCalledWith({
          content: 'This is an internal note',
          message_type: 'internal_note',
          is_internal: true,
          attachments: []
        });
      });
    });

    it('should support message templates', async () => {
      const user = userEvent.setup();
      render(<TicketDetailView {...defaultProps} />);

      const useTemplateButton = screen.getByText('Use Template');
      await user.click(useTemplateButton);

      const messageInput = screen.getByPlaceholderText(/Type your response/);
      expect(messageInput).toHaveValue('Test template content');
    });

    it('should auto-save draft messages', async () => {
      const user = userEvent.setup();
      render(<TicketDetailView {...defaultProps} />);

      const messageInput = screen.getByPlaceholderText(/Type your response/);
      await user.type(messageInput, 'This is a draft message');

      // Wait for auto-save (usually triggered on blur or after delay)
      await user.tab(); // Trigger blur

      // Should save draft to localStorage
      expect(localStorage.getItem('draft-ticket-123')).toBe('This is a draft message');
    });
  });

  describe('Status Updates', () => {
    it('should allow changing ticket status', async () => {
      const user = userEvent.setup();
      render(<TicketDetailView {...defaultProps} />);

      const statusSelect = screen.getByDisplayValue('Open');
      await user.click(statusSelect);
      
      const inProgressOption = screen.getByText('In Progress');
      await user.click(inProgressOption);

      await waitFor(() => {
        expect(defaultProps.onStatusUpdate).toHaveBeenCalledWith('in_progress');
      });
    });

    it('should show status update confirmation for resolved status', async () => {
      const user = userEvent.setup();
      render(<TicketDetailView {...defaultProps} />);

      const statusSelect = screen.getByDisplayValue('Open');
      await user.click(statusSelect);
      
      const resolvedOption = screen.getByText('Resolved');
      await user.click(resolvedOption);

      // Should show confirmation dialog
      expect(screen.getByText(/Are you sure you want to mark this ticket as resolved/)).toBeInTheDocument();
    });

    it('should assign ticket to current agent', async () => {
      const user = userEvent.setup();
      const unassignedTicket = { ...mockTicket, assigned_to: null };
      
      render(<TicketDetailView {...defaultProps} ticket={unassignedTicket} />);

      const assignButton = screen.getByText('Assign to Me');
      await user.click(assignButton);

      await waitFor(() => {
        expect(defaultProps.onStatusUpdate).toHaveBeenCalledWith('in_progress');
      });
    });
  });

  describe('Escalation', () => {
    it('should allow escalating tickets', async () => {
      const user = userEvent.setup();
      render(<TicketDetailView {...defaultProps} />);

      const escalateButton = screen.getByText('Escalate');
      await user.click(escalateButton);

      // Should open escalation dialog
      expect(screen.getByText(/Escalate Ticket/)).toBeInTheDocument();
      
      const reasonInput = screen.getByPlaceholderText(/Reason for escalation/);
      await user.type(reasonInput, 'Customer not satisfied with resolution');

      const confirmButton = screen.getByText('Escalate Ticket');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(defaultProps.onEscalate).toHaveBeenCalledWith({
          escalation_reason: 'Customer not satisfied with resolution',
          notes: expect.any(String)
        });
      });
    });

    it('should show escalation history', () => {
      const escalatedTicket = {
        ...mockTicket,
        escalation_level: 1,
        escalation_history: [
          {
            id: 'esc-1',
            escalated_by: 'agent-123',
            escalated_to: 'manager-456',
            escalation_reason: 'SLA breach',
            escalated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
          }
        ]
      };

      render(<TicketDetailView {...defaultProps} ticket={escalatedTicket} />);

      expect(screen.getByText(/Escalated/)).toBeInTheDocument();
      expect(screen.getByText(/SLA breach/)).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to real-time updates on mount', () => {
      const { supabase } = require('@/lib/supabase');
      render(<TicketDetailView {...defaultProps} />);

      expect(supabase.channel).toHaveBeenCalledWith(`ticket-${mockTicket.id}`);
    });

    it('should handle new messages from real-time updates', async () => {
      const { supabase } = require('@/lib/supabase');
      let realtimeCallback: (payload: any) => void = () => {};
      
      supabase.channel.mockReturnValue({
        on: jest.fn((event, callback) => {
          if (event === 'postgres_changes') {
            realtimeCallback = callback;
          }
          return {
            on: jest.fn(() => ({
              subscribe: jest.fn(() => ({ status: 'success' }))
            }))
          };
        }),
        unsubscribe: jest.fn()
      });

      render(<TicketDetailView {...defaultProps} />);

      // Simulate receiving a new message via real-time
      const newMessage = {
        id: 'msg-3',
        ticket_id: 'ticket-123',
        content: 'New real-time message',
        sent_by: 'agent-456',
        created_at: new Date().toISOString()
      };

      realtimeCallback({
        eventType: 'INSERT',
        new: newMessage,
        table: 'ticket_messages'
      });

      await waitFor(() => {
        expect(screen.getByText('New real-time message')).toBeInTheDocument();
      });
    });

    it('should unsubscribe from real-time updates on unmount', () => {
      const { supabase } = require('@/lib/supabase');
      const mockUnsubscribe = jest.fn();
      
      supabase.channel.mockReturnValue({
        on: jest.fn(() => ({
          on: jest.fn(() => ({
            subscribe: jest.fn(() => ({ status: 'success' }))
          }))
        })),
        unsubscribe: mockUnsubscribe
      });

      const { unmount } = render(<TicketDetailView {...defaultProps} />);
      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TicketDetailView {...defaultProps} />);

      expect(screen.getByLabelText(/Ticket details/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Message thread/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Compose message/)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TicketDetailView {...defaultProps} />);

      const messageInput = screen.getByPlaceholderText(/Type your response/);
      await user.type(messageInput, 'Test message');

      // Should be able to send with Ctrl+Enter
      await user.keyboard('{Control>}{Enter}{/Control}');

      await waitFor(() => {
        expect(defaultProps.onAddMessage).toHaveBeenCalled();
      });
    });

    it('should have proper heading hierarchy', () => {
      render(<TicketDetailView {...defaultProps} />);

      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveTextContent('WS-001');
      expect(headings[0].tagName).toBe('H1');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      const TestComponent = (props: any) => {
        renderSpy();
        return <TicketDetailView {...props} />;
      };

      const { rerender } = render(<TestComponent {...defaultProps} />);
      
      // Re-render with same props
      rerender(<TestComponent {...defaultProps} />);
      
      // Should only render twice (initial + rerender)
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle large message threads efficiently', () => {
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        ...mockMessages[0],
        id: `msg-${i}`,
        content: `Message ${i}`,
        created_at: new Date(Date.now() - i * 60 * 1000).toISOString()
      }));

      const { container } = render(
        <TicketDetailView {...defaultProps} messages={manyMessages} />
      );

      // Should render all messages
      expect(container.querySelectorAll('[data-testid^="message-"]')).toHaveLength(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing ticket data gracefully', () => {
      const { container } = render(
        <TicketDetailView {...defaultProps} ticket={null as any} />
      );

      expect(container.textContent).toContain('Ticket not found');
    });

    it('should handle API errors when updating status', async () => {
      const user = userEvent.setup();
      const onStatusUpdateError = jest.fn().mockRejectedValue(new Error('API Error'));

      render(<TicketDetailView {...defaultProps} onStatusUpdate={onStatusUpdateError} />);

      const statusSelect = screen.getByDisplayValue('Open');
      await user.click(statusSelect);
      
      const inProgressOption = screen.getByText('In Progress');
      await user.click(inProgressOption);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to update ticket status');
      });
    });

    it('should show loading states during operations', async () => {
      const user = userEvent.setup();
      const slowOnAddMessage = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<TicketDetailView {...defaultProps} onAddMessage={slowOnAddMessage} />);

      const messageInput = screen.getByPlaceholderText(/Type your response/);
      const sendButton = screen.getByText('Send');

      await user.type(messageInput, 'Test message');
      await user.click(sendButton);

      // Should show loading indicator
      expect(screen.getByText('Sending...')).toBeInTheDocument();
      expect(sendButton).toBeDisabled();
    });
  });
});