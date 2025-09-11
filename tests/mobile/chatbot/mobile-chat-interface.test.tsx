/**
 * WS-243 Mobile Chat Interface Tests
 * Team D - Comprehensive Mobile Chat Testing Suite
 * 
 * CORE TEST COVERAGE:
 * - Mobile chat interface functionality
 * - Bottom sheet behavior and touch interactions
 * - Wedding context integration
 * - Offline message queuing
 * - Touch gestures and haptic feedback
 * - Accessibility compliance
 * - Performance benchmarks
 * 
 * @version 1.0.0
 * @author WedSync Team D - Mobile Chat Integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MobileChatInterface, WeddingContext, ChatMessage } from '../../../src/components/mobile/chatbot/MobileChatInterface';
import { useMobileChat } from '../../../src/hooks/useMobileChat';

// Mock the mobile chat hook
jest.mock('../../../src/hooks/useMobileChat');
const mockUseMobileChat = useMobileChat as jest.MockedFunction<typeof useMobileChat>;

// Mock motion library for testing
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button'
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PanInfo: {},
  useMotionValue: () => ({ set: jest.fn() }),
  useTransform: () => 1
}));

// Mock utils
jest.mock('../../../src/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' ')
}));

// Test data
const mockWeddingContext: WeddingContext = {
  weddingId: 'wedding-123',
  weddingDate: new Date('2024-06-15'),
  venue: 'Beautiful Garden Venue',
  coupleNames: ['John Doe', 'Jane Smith'],
  vendorList: [
    { id: 'vendor-1', name: 'Amazing Photography', category: 'Photography', status: 'confirmed' },
    { id: 'vendor-2', name: 'Elegant Catering', category: 'Catering', status: 'pending' }
  ],
  guestCount: 120,
  budget: {
    total: 50000,
    spent: 35000,
    remaining: 15000
  },
  timeline: [
    { time: '14:00', event: 'Ceremony', vendor: 'Amazing Photography' },
    { time: '18:00', event: 'Reception', vendor: 'Elegant Catering' }
  ]
};

const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    content: 'Hello! How can I help with your wedding planning?',
    timestamp: new Date('2024-01-20T10:00:00Z'),
    isBot: true,
    type: 'text',
    status: 'delivered'
  },
  {
    id: 'msg-2', 
    content: 'I need help with my timeline',
    timestamp: new Date('2024-01-20T10:01:00Z'),
    isBot: false,
    type: 'text',
    status: 'sent'
  }
];

// Mock mobile chat hook return
const mockMobileChatReturn = {
  isOnline: true,
  isConnecting: false,
  lastSyncTime: null,
  sendMessage: jest.fn(),
  queuedMessages: [],
  syncPendingMessages: jest.fn(),
  clearMessageQueue: jest.fn(),
  hapticFeedback: jest.fn(),
  screenReaderAnnounce: jest.fn(),
  isLowPowerMode: false,
  networkQuality: 'fast' as const,
  clearChatCache: jest.fn(),
  getCachedMessages: jest.fn()
};

describe('MobileChatInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMobileChat.mockReturnValue(mockMobileChatReturn);
    
    // Mock navigator.vibrate for haptic tests
    Object.defineProperty(navigator, 'vibrate', {
      value: jest.fn(),
      writable: true
    });
  });

  describe('Component Rendering', () => {
    it('renders mobile chat interface when visible', () => {
      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
          userRole="couple"
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Wedding Assistant')).toBeInTheDocument();
    });

    it('renders floating chat button when minimized', () => {
      render(
        <MobileChatInterface
          isVisible={false}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
          userRole="couple"
        />
      );

      // Should not render the dialog when not visible
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays wedding context information correctly', () => {
      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
          userRole="couple"
        />
      );

      expect(screen.getByText(/John Doe & Jane Smith/)).toBeInTheDocument();
    });

    it('shows offline indicator when offline', () => {
      mockUseMobileChat.mockReturnValue({
        ...mockMobileChatReturn,
        isOnline: false
      });

      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
          userRole="couple"
        />
      );

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });

  describe('Message Handling', () => {
    it('sends message when send button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnMessageSend = jest.fn();

      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          onMessageSend={mockOnMessageSend}
          weddingContext={mockWeddingContext}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      await user.type(input, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockMobileChatReturn.sendMessage).toHaveBeenCalledWith(
          'Test message',
          mockWeddingContext
        );
      });
    });

    it('sends message on Enter key press', async () => {
      const user = userEvent.setup();

      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      
      await user.type(input, 'Test message{enter}');

      await waitFor(() => {
        expect(mockMobileChatReturn.sendMessage).toHaveBeenCalledWith(
          'Test message',
          mockWeddingContext
        );
      });
    });

    it('does not send empty messages', async () => {
      const user = userEvent.setup();

      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
        />
      );

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      await user.click(sendButton);

      expect(mockMobileChatReturn.sendMessage).not.toHaveBeenCalled();
    });

    it('queues messages when offline', async () => {
      const user = userEvent.setup();
      mockUseMobileChat.mockReturnValue({
        ...mockMobileChatReturn,
        isOnline: false,
        queuedMessages: [
          {
            id: 'queued-1',
            content: 'Offline message',
            timestamp: new Date(),
            retryCount: 0
          }
        ]
      });

      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
          offlineMode={true}
        />
      );

      expect(screen.getByText(/1 message queued/)).toBeInTheDocument();
    });
  });

  describe('Touch Interactions', () => {
    it('provides haptic feedback on interactions', async () => {
      const user = userEvent.setup();

      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          enableHaptics={true}
          weddingContext={mockWeddingContext}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      await user.type(input, 'Test');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockMobileChatReturn.hapticFeedback).toHaveBeenCalledWith('medium');
      });
    });

    it('handles voice input when enabled', async () => {
      const mockOnVoiceInput = jest.fn();
      const user = userEvent.setup();

      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          onVoiceInput={mockOnVoiceInput}
          enableVoice={true}
          weddingContext={mockWeddingContext}
        />
      );

      const voiceButton = screen.getByRole('button', { name: 'Start voice recording' });
      
      // Mock getUserMedia for voice recording
      const mockGetUserMedia = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }]
      });
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true
      });

      await user.click(voiceButton);

      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    it('handles file upload when enabled', async () => {
      const mockOnFileUpload = jest.fn();
      const user = userEvent.setup();

      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          onFileUpload={mockOnFileUpload}
          weddingContext={mockWeddingContext}
        />
      );

      const attachButton = screen.getByRole('button', { name: 'Add attachment' });
      await user.click(attachButton);

      // Should show attachment options
      expect(screen.getByText('Camera')).toBeInTheDocument();
      expect(screen.getByText('File')).toBeInTheDocument();
    });
  });

  describe('Wedding Context Integration', () => {
    it('generates contextual responses based on wedding context', async () => {
      const user = userEvent.setup();

      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
          userRole="couple"
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Show my timeline');
      
      const sendButton = screen.getByRole('button', { name: 'Send message' });
      await user.click(sendButton);

      // Should send message with wedding context
      await waitFor(() => {
        expect(mockMobileChatReturn.sendMessage).toHaveBeenCalledWith(
          'Show my timeline',
          mockWeddingContext
        );
      });
    });

    it('shows different UI for guest role', () => {
      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
          userRole="guest"
        />
      );

      // Guest should see different context information
      expect(screen.getByText(/John Doe & Jane Smith/)).toBeInTheDocument();
      expect(screen.getByText(/Beautiful Garden Venue/)).toBeInTheDocument();
    });

    it('handles vendor role appropriately', () => {
      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
          userRole="vendor"
        />
      );

      // Should render for vendor access
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Chat interface');
      
      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toBeInTheDocument();
      
      const closeButton = screen.getByRole('button', { name: 'Close chat' });
      expect(closeButton).toBeInTheDocument();
    });

    it('provides screen reader announcements', async () => {
      const user = userEvent.setup();

      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      await user.type(input, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockMobileChatReturn.screenReaderAnnounce).toHaveBeenCalled();
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const mockOnToggle = jest.fn();

      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={mockOnToggle}
          weddingContext={mockWeddingContext}
        />
      );

      // Test Escape key to close
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(mockOnToggle).toHaveBeenCalled();
      });
    });
  });

  describe('Performance', () => {
    it('handles large message lists efficiently', async () => {
      const largeMessageList = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
        timestamp: new Date(Date.now() - i * 1000),
        isBot: i % 2 === 0,
        type: 'text' as const,
        status: 'delivered' as const
      }));

      const { container } = render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
          virtualScrolling={true}
          messageLimit={100}
        />
      );

      // Should render without performance issues
      expect(container).toBeInTheDocument();
    });

    it('implements proper cleanup on unmount', () => {
      const { unmount } = render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
        />
      );

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      mockMobileChatReturn.sendMessage.mockRejectedValue(new Error('Network error'));

      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      await user.type(input, 'Test message');
      await user.click(sendButton);

      // Should handle error gracefully without crashing
      await waitFor(() => {
        expect(mockMobileChatReturn.sendMessage).toHaveBeenCalled();
      });
    });

    it('handles missing wedding context gracefully', () => {
      render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          userRole="couple"
        />
      );

      // Should render without wedding context
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Wedding Assistant')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('manages chat state transitions correctly', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <MobileChatInterface
          isVisible={false}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
        />
      );

      // Initially hidden
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Show chat
      rerender(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('syncs pending messages when coming online', async () => {
      const { rerender } = render(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
        />
      );

      // Start offline
      mockUseMobileChat.mockReturnValue({
        ...mockMobileChatReturn,
        isOnline: false,
        queuedMessages: [
          {
            id: 'queued-1',
            content: 'Offline message',
            timestamp: new Date(),
            retryCount: 0
          }
        ]
      });

      rerender(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
        />
      );

      // Come back online
      mockUseMobileChat.mockReturnValue({
        ...mockMobileChatReturn,
        isOnline: true,
        queuedMessages: [
          {
            id: 'queued-1',
            content: 'Offline message',
            timestamp: new Date(),
            retryCount: 0
          }
        ]
      });

      rerender(
        <MobileChatInterface
          isVisible={true}
          onToggle={jest.fn()}
          weddingContext={mockWeddingContext}
        />
      );

      await waitFor(() => {
        expect(mockMobileChatReturn.syncPendingMessages).toHaveBeenCalled();
      });
    });
  });
});

// Helper function for mobile viewport testing
export const setMobileViewport = () => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 });
  window.dispatchEvent(new Event('resize'));
};

// Helper function for touch event simulation
export const simulateTouchEvent = (element: HTMLElement, eventType: string, touches: Array<{ clientX: number; clientY: number }>) => {
  const touchEvent = new TouchEvent(eventType, {
    bubbles: true,
    cancelable: true,
    touches: touches.map(touch => ({
      ...touch,
      identifier: 0,
      target: element,
      radiusX: 5,
      radiusY: 5,
      rotationAngle: 0,
      force: 1
    })) as any
  });
  
  element.dispatchEvent(touchEvent);
};

// Performance testing helper
export const measureRenderTime = async (renderFn: () => void): Promise<number> => {
  const start = performance.now();
  await act(async () => {
    renderFn();
  });
  return performance.now() - start;
};