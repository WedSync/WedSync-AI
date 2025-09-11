/**
 * Tests for Communications UI Components
 * Covers messaging interface, conversation list, and activity feed
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MessagingLayout } from '@/components/messaging/MessagingLayout'
import { ConversationList } from '@/components/messaging/ConversationList'
import { MessageThread } from '@/components/messaging/MessageThread'
import { ActivityFeed } from '@/components/messaging/ActivityFeed'
import { MessageInput } from '@/components/messaging/MessageInput'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/communications'
}))

// Mock Supabase hooks
jest.mock('@/lib/supabase/realtime', () => ({
  useRealtimeMessages: jest.fn(() => ({
    messages: [],
    loading: false,
    error: null
  })),
  useRealtimeConversations: jest.fn(() => ({
    conversations: [],
    loading: false,
    error: null
  })),
  useRealtimeActivity: jest.fn(() => ({
    activities: [],
    loading: false,
    error: null
  }))
}))

describe('Communications UI Components', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  describe('MessagingLayout', () => {
    it('should render all three panels on desktop', () => {
      render(<MessagingLayout />, { wrapper })

      expect(screen.getByTestId('conversations-panel')).toBeInTheDocument()
      expect(screen.getByTestId('messages-panel')).toBeInTheDocument()
      expect(screen.getByTestId('activity-panel')).toBeInTheDocument()
    })

    it('should show mobile navigation on small screens', () => {
      // Mock window.matchMedia for mobile view
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        }))
      })

      render(<MessagingLayout />, { wrapper })

      expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
      expect(screen.getByText('Conversations')).toBeInTheDocument()
      expect(screen.getByText('Messages')).toBeInTheDocument()
      expect(screen.getByText('Activity')).toBeInTheDocument()
    })

    it('should switch panels on mobile when navigation is clicked', async () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        }))
      })

      render(<MessagingLayout />, { wrapper })

      // Initially shows conversations
      expect(screen.getByTestId('conversations-panel')).toBeVisible()

      // Click Messages tab
      fireEvent.click(screen.getByText('Messages'))
      await waitFor(() => {
        expect(screen.getByTestId('messages-panel')).toBeVisible()
      })

      // Click Activity tab
      fireEvent.click(screen.getByText('Activity'))
      await waitFor(() => {
        expect(screen.getByTestId('activity-panel')).toBeVisible()
      })
    })
  })

  describe('ConversationList', () => {
    const mockConversations = [
      {
        id: 'conv-1',
        client_name: 'John & Jane Smith',
        title: 'Summer Wedding 2025',
        last_message: 'Looking forward to our meeting!',
        last_message_at: new Date().toISOString(),
        unread_count: 2,
        status: 'active' as const
      },
      {
        id: 'conv-2',
        client_name: 'Bob Johnson',
        title: 'Fall Wedding Planning',
        last_message: 'Thank you for the proposal',
        last_message_at: new Date(Date.now() - 86400000).toISOString(),
        unread_count: 0,
        status: 'active' as const
      }
    ]

    it('should render conversation list', () => {
      render(
        <ConversationList 
          conversations={mockConversations}
          selectedId="conv-1"
          onSelect={jest.fn()}
        />,
        { wrapper }
      )

      expect(screen.getByText('John & Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Summer Wedding 2025')).toBeInTheDocument()
      expect(screen.getByText('Looking forward to our meeting!')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // Unread count
    })

    it('should highlight selected conversation', () => {
      render(
        <ConversationList 
          conversations={mockConversations}
          selectedId="conv-1"
          onSelect={jest.fn()}
        />,
        { wrapper }
      )

      const selectedConv = screen.getByTestId('conversation-conv-1')
      expect(selectedConv).toHaveClass('bg-blue-50')
    })

    it('should call onSelect when conversation is clicked', async () => {
      const onSelect = jest.fn()
      
      render(
        <ConversationList 
          conversations={mockConversations}
          selectedId="conv-1"
          onSelect={onSelect}
        />,
        { wrapper }
      )

      fireEvent.click(screen.getByText('Bob Johnson'))
      
      expect(onSelect).toHaveBeenCalledWith('conv-2')
    })

    it('should show empty state when no conversations', () => {
      render(
        <ConversationList 
          conversations={[]}
          selectedId={null}
          onSelect={jest.fn()}
        />,
        { wrapper }
      )

      expect(screen.getByText('No conversations yet')).toBeInTheDocument()
      expect(screen.getByText('Start a new conversation to begin messaging')).toBeInTheDocument()
    })

    it('should filter conversations by search term', async () => {
      const user = userEvent.setup()
      
      render(
        <ConversationList 
          conversations={mockConversations}
          selectedId={null}
          onSelect={jest.fn()}
        />,
        { wrapper }
      )

      const searchInput = screen.getByPlaceholderText('Search conversations...')
      await user.type(searchInput, 'Smith')

      await waitFor(() => {
        expect(screen.getByText('John & Jane Smith')).toBeInTheDocument()
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument()
      })
    })

    it('should show loading state', () => {
      render(
        <ConversationList 
          conversations={[]}
          selectedId={null}
          onSelect={jest.fn()}
          loading={true}
        />,
        { wrapper }
      )

      expect(screen.getByTestId('conversations-loading')).toBeInTheDocument()
    })
  })

  describe('MessageThread', () => {
    const mockMessages = [
      {
        id: 'msg-1',
        sender_name: 'John Doe',
        sender_type: 'vendor' as const,
        content: 'Hello! How can I help you today?',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        is_read: true
      },
      {
        id: 'msg-2',
        sender_name: 'Jane Smith',
        sender_type: 'client' as const,
        content: 'I have questions about the wedding package',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        is_read: true
      },
      {
        id: 'msg-3',
        sender_name: 'John Doe',
        sender_type: 'vendor' as const,
        content: 'Of course! What would you like to know?',
        created_at: new Date().toISOString(),
        is_read: false
      }
    ]

    it('should render message thread', () => {
      render(
        <MessageThread 
          messages={mockMessages}
          conversationId="conv-1"
        />,
        { wrapper }
      )

      expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
      expect(screen.getByText('I have questions about the wedding package')).toBeInTheDocument()
      expect(screen.getByText('Of course! What would you like to know?')).toBeInTheDocument()
    })

    it('should distinguish between sender types', () => {
      render(
        <MessageThread 
          messages={mockMessages}
          conversationId="conv-1"
        />,
        { wrapper }
      )

      const vendorMessages = screen.getAllByTestId(/message-vendor/)
      const clientMessages = screen.getAllByTestId(/message-client/)

      expect(vendorMessages).toHaveLength(2)
      expect(clientMessages).toHaveLength(1)

      // Vendor messages should be on the right
      vendorMessages.forEach(msg => {
        expect(msg).toHaveClass('justify-end')
      })

      // Client messages should be on the left
      clientMessages.forEach(msg => {
        expect(msg).toHaveClass('justify-start')
      })
    })

    it('should auto-scroll to bottom on new messages', async () => {
      const { rerender } = render(
        <MessageThread 
          messages={mockMessages.slice(0, 2)}
          conversationId="conv-1"
        />,
        { wrapper }
      )

      const scrollContainer = screen.getByTestId('messages-container')
      const scrollSpy = jest.spyOn(scrollContainer, 'scrollTo')

      // Add new message
      rerender(
        <MessageThread 
          messages={mockMessages}
          conversationId="conv-1"
        />
      )

      await waitFor(() => {
        expect(scrollSpy).toHaveBeenCalledWith({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        })
      })
    })

    it('should show typing indicator', () => {
      render(
        <MessageThread 
          messages={mockMessages}
          conversationId="conv-1"
          isTyping={true}
          typingUser="Jane Smith"
        />,
        { wrapper }
      )

      expect(screen.getByText('Jane Smith is typing...')).toBeInTheDocument()
      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
    })

    it('should handle file attachments', () => {
      const messageWithFile = {
        id: 'msg-file',
        sender_name: 'John Doe',
        sender_type: 'vendor' as const,
        content: 'Please see the attached contract',
        message_type: 'file' as const,
        attachments: [{
          name: 'wedding-contract.pdf',
          url: 'https://example.com/contract.pdf',
          size: 1024000,
          type: 'application/pdf'
        }],
        created_at: new Date().toISOString(),
        is_read: false
      }

      render(
        <MessageThread 
          messages={[messageWithFile]}
          conversationId="conv-1"
        />,
        { wrapper }
      )

      expect(screen.getByText('wedding-contract.pdf')).toBeInTheDocument()
      expect(screen.getByText('1.0 MB')).toBeInTheDocument()
      
      const downloadButton = screen.getByRole('button', { name: /download/i })
      expect(downloadButton).toHaveAttribute('href', 'https://example.com/contract.pdf')
    })
  })

  describe('MessageInput', () => {
    it('should render message input field', () => {
      render(
        <MessageInput 
          onSend={jest.fn()}
          disabled={false}
        />,
        { wrapper }
      )

      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    })

    it('should send message on form submit', async () => {
      const onSend = jest.fn()
      const user = userEvent.setup()

      render(
        <MessageInput 
          onSend={onSend}
          disabled={false}
        />,
        { wrapper }
      )

      const input = screen.getByPlaceholderText('Type your message...')
      await user.type(input, 'Test message')
      
      const sendButton = screen.getByRole('button', { name: /send/i })
      await user.click(sendButton)

      expect(onSend).toHaveBeenCalledWith({
        content: 'Test message',
        type: 'text',
        attachments: []
      })

      // Input should be cleared after sending
      expect(input).toHaveValue('')
    })

    it('should send message on Enter key', async () => {
      const onSend = jest.fn()
      const user = userEvent.setup()

      render(
        <MessageInput 
          onSend={onSend}
          disabled={false}
        />,
        { wrapper }
      )

      const input = screen.getByPlaceholderText('Type your message...')
      await user.type(input, 'Test message{Enter}')

      expect(onSend).toHaveBeenCalledWith({
        content: 'Test message',
        type: 'text',
        attachments: []
      })
    })

    it('should allow line breaks with Shift+Enter', async () => {
      const onSend = jest.fn()
      const user = userEvent.setup()

      render(
        <MessageInput 
          onSend={onSend}
          disabled={false}
        />,
        { wrapper }
      )

      const input = screen.getByPlaceholderText('Type your message...')
      await user.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2')

      expect(onSend).not.toHaveBeenCalled()
      expect(input).toHaveValue('Line 1\nLine 2')
    })

    it('should disable input when disabled prop is true', () => {
      render(
        <MessageInput 
          onSend={jest.fn()}
          disabled={true}
        />,
        { wrapper }
      )

      const input = screen.getByPlaceholderText('Type your message...')
      const sendButton = screen.getByRole('button', { name: /send/i })

      expect(input).toBeDisabled()
      expect(sendButton).toBeDisabled()
    })

    it('should handle file attachments', async () => {
      const onSend = jest.fn()
      const user = userEvent.setup()

      render(
        <MessageInput 
          onSend={onSend}
          disabled={false}
          allowAttachments={true}
        />,
        { wrapper }
      )

      const file = new File(['contract content'], 'contract.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')

      await user.upload(fileInput, file)

      expect(screen.getByText('contract.pdf')).toBeInTheDocument()

      const sendButton = screen.getByRole('button', { name: /send/i })
      await user.click(sendButton)

      expect(onSend).toHaveBeenCalledWith({
        content: '',
        type: 'file',
        attachments: expect.arrayContaining([
          expect.objectContaining({
            name: 'contract.pdf',
            type: 'application/pdf'
          })
        ])
      })
    })

    it('should show character count for long messages', async () => {
      const user = userEvent.setup()

      render(
        <MessageInput 
          onSend={jest.fn()}
          disabled={false}
          maxLength={500}
        />,
        { wrapper }
      )

      const input = screen.getByPlaceholderText('Type your message...')
      const longMessage = 'a'.repeat(450)
      
      await user.type(input, longMessage)

      expect(screen.getByText('450 / 500')).toBeInTheDocument()
    })
  })

  describe('ActivityFeed', () => {
    const mockActivities = [
      {
        id: 'activity-1',
        actor_name: 'Jane Smith',
        action: 'form_submitted',
        entity_name: 'Wedding Details Form',
        description: 'Jane Smith submitted Wedding Details Form',
        importance: 'high' as const,
        is_read: false,
        created_at: new Date().toISOString()
      },
      {
        id: 'activity-2',
        actor_name: 'System',
        action: 'email_sent',
        entity_name: 'Welcome Email',
        description: 'Welcome email sent to client',
        importance: 'low' as const,
        is_read: true,
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ]

    it('should render activity feed', () => {
      render(
        <ActivityFeed 
          activities={mockActivities}
        />,
        { wrapper }
      )

      expect(screen.getByText('Jane Smith submitted Wedding Details Form')).toBeInTheDocument()
      expect(screen.getByText('Welcome email sent to client')).toBeInTheDocument()
    })

    it('should show importance badges', () => {
      render(
        <ActivityFeed 
          activities={mockActivities}
        />,
        { wrapper }
      )

      const highImportance = screen.getByTestId('activity-activity-1')
      const lowImportance = screen.getByTestId('activity-activity-2')

      expect(within(highImportance).getByText('High')).toHaveClass('bg-red-100')
      expect(within(lowImportance).getByText('Low')).toHaveClass('bg-gray-100')
    })

    it('should mark activities as read when clicked', async () => {
      const onMarkAsRead = jest.fn()
      
      render(
        <ActivityFeed 
          activities={mockActivities}
          onMarkAsRead={onMarkAsRead}
        />,
        { wrapper }
      )

      const unreadActivity = screen.getByTestId('activity-activity-1')
      fireEvent.click(unreadActivity)

      expect(onMarkAsRead).toHaveBeenCalledWith('activity-1')
    })

    it('should filter activities by importance', async () => {
      const user = userEvent.setup()
      
      render(
        <ActivityFeed 
          activities={mockActivities}
        />,
        { wrapper }
      )

      const filterButton = screen.getByRole('button', { name: /filter/i })
      await user.click(filterButton)

      const highFilter = screen.getByRole('checkbox', { name: /high/i })
      await user.click(highFilter)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith submitted Wedding Details Form')).toBeInTheDocument()
        expect(screen.queryByText('Welcome email sent to client')).not.toBeInTheDocument()
      })
    })

    it('should group activities by date', () => {
      const activitiesWithDates = [
        {
          ...mockActivities[0],
          created_at: new Date().toISOString()
        },
        {
          ...mockActivities[1],
          created_at: new Date(Date.now() - 86400000).toISOString() // Yesterday
        }
      ]

      render(
        <ActivityFeed 
          activities={activitiesWithDates}
        />,
        { wrapper }
      )

      expect(screen.getByText('Today')).toBeInTheDocument()
      expect(screen.getByText('Yesterday')).toBeInTheDocument()
    })

    it('should show empty state when no activities', () => {
      render(
        <ActivityFeed 
          activities={[]}
        />,
        { wrapper }
      )

      expect(screen.getByText('No activity yet')).toBeInTheDocument()
      expect(screen.getByText('Activities will appear here as they happen')).toBeInTheDocument()
    })

    it('should auto-refresh activities', async () => {
      jest.useFakeTimers()
      
      const onRefresh = jest.fn()
      
      render(
        <ActivityFeed 
          activities={mockActivities}
          onRefresh={onRefresh}
          autoRefresh={true}
          refreshInterval={30000} // 30 seconds
        />,
        { wrapper }
      )

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000)

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled()
      })

      jest.useRealTimers()
    })
  })

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        }))
      })
    })

    it('should show hamburger menu on mobile', () => {
      render(<MessagingLayout />, { wrapper })
      
      expect(screen.getByTestId('mobile-menu-button')).toBeInTheDocument()
    })

    it('should collapse conversation list on mobile when message is selected', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          client_name: 'Test Client',
          title: 'Test Conversation',
          last_message: 'Test message',
          last_message_at: new Date().toISOString(),
          unread_count: 0,
          status: 'active' as const
        }
      ]

      render(
        <MessagingLayout 
          initialConversations={mockConversations}
        />,
        { wrapper }
      )

      // Click on conversation
      fireEvent.click(screen.getByText('Test Client'))

      await waitFor(() => {
        // Conversation list should be hidden
        expect(screen.getByTestId('conversations-panel')).toHaveClass('hidden')
        // Message thread should be visible
        expect(screen.getByTestId('messages-panel')).toBeVisible()
      })
    })

    it('should show back button in message thread on mobile', async () => {
      render(
        <MessageThread 
          messages={[]}
          conversationId="conv-1"
          isMobile={true}
        />,
        { wrapper }
      )

      const backButton = screen.getByRole('button', { name: /back/i })
      expect(backButton).toBeInTheDocument()
    })
  })
})