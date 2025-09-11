import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import MessageBubble from '@/components/chatbot/MessageBubble';
import { ChatMessage } from '@/types/chatbot';

expect.extend(toHaveNoViolations);

describe('MessageBubble Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  const mockUserMessage: ChatMessage = {
    id: 'msg-1',
    role: 'user',
    content: 'How do I plan my wedding timeline?',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    status: 'sent'
  };

  const mockAIMessage: ChatMessage = {
    id: 'msg-2',
    role: 'assistant',
    content: 'I\'d be happy to help you plan your wedding timeline! Here are the key considerations...',
    timestamp: new Date('2024-01-15T10:00:30Z'),
    status: 'delivered',
    metadata: {
      confidence: 0.95,
      sources: ['wedding-planning-guide.pdf'],
      weddingContext: { phase: 'planning', daysUntilWedding: 180 }
    }
  };

  describe('WS-243-M001: MessageBubble rendering variations', () => {
    it('renders user messages with correct styling', () => {
      render(<MessageBubble message={mockUserMessage} />);

      const bubble = screen.getByTestId('message-bubble-msg-1');
      expect(bubble).toHaveClass('user-message');
      expect(bubble).toHaveClass('message-bubble-user');
      
      expect(screen.getByText('How do I plan my wedding timeline?')).toBeInTheDocument();
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
      expect(screen.getByTestId('message-status-sent')).toBeInTheDocument();
    });

    it('renders AI messages with correct styling', () => {
      render(<MessageBubble message={mockAIMessage} />);

      const bubble = screen.getByTestId('message-bubble-msg-2');
      expect(bubble).toHaveClass('ai-message');
      expect(bubble).toHaveClass('message-bubble-assistant');
      
      expect(screen.getByText(/I'd be happy to help you plan/)).toBeInTheDocument();
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
      expect(screen.getByTestId('message-status-delivered')).toBeInTheDocument();
    });

    it('displays different message statuses correctly', () => {
      const statuses: ChatMessage['status'][] = ['sending', 'sent', 'delivered', 'read', 'failed'];
      
      statuses.forEach(status => {
        const message = { ...mockUserMessage, status, id: `msg-${status}` };
        const { rerender } = render(<MessageBubble message={message} />);

        expect(screen.getByTestId(`message-status-${status}`)).toBeInTheDocument();
        
        if (status === 'failed') {
          expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
        }

        rerender(<div />); // Clear for next iteration
      });
    });

    it('shows timestamp in user-friendly format', () => {
      const recentMessage = {
        ...mockUserMessage,
        timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      };

      render(<MessageBubble message={recentMessage} />);
      expect(screen.getByText('5 min ago')).toBeInTheDocument();

      const todayMessage = {
        ...mockUserMessage,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      };

      render(<MessageBubble message={todayMessage} />);
      expect(screen.getByText(/\d{1,2}:\d{2} [AP]M/)).toBeInTheDocument();

      const yesterdayMessage = {
        ...mockUserMessage,
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000) // Yesterday
      };

      render(<MessageBubble message={yesterdayMessage} />);
      expect(screen.getByText(/yesterday/i)).toBeInTheDocument();
    });

    it('displays read receipts for user messages', () => {
      const readMessage = { ...mockUserMessage, status: 'read' as const };
      render(<MessageBubble message={readMessage} />);

      expect(screen.getByTestId('message-status-read')).toBeInTheDocument();
      expect(screen.getByTitle('Message read by assistant')).toBeInTheDocument();
    });
  });

  describe('WS-243-M002: MessageBubble content formatting', () => {
    it('renders rich text content correctly', () => {
      const richTextMessage = {
        ...mockAIMessage,
        content: 'Here are **important** considerations:\n\n1. Book venue *early*\n2. Create [budget tracker](https://example.com)\n3. Consider `seasonal` factors'
      };

      render(<MessageBubble message={richTextMessage} />);

      expect(screen.getByText('important')).toHaveClass('font-bold');
      expect(screen.getByText('early')).toHaveClass('italic');
      expect(screen.getByRole('link', { name: 'budget tracker' })).toHaveAttribute('href', 'https://example.com');
      expect(screen.getByText('seasonal')).toHaveClass('code');
    });

    it('parses and displays links with previews', () => {
      const linkMessage = {
        ...mockAIMessage,
        content: 'Check out this venue: https://sunsetgardens.com/weddings'
      };

      render(<MessageBubble message={linkMessage} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://sunsetgardens.com/weddings');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      
      // Should show link preview card
      expect(screen.getByTestId('link-preview-card')).toBeInTheDocument();
    });

    it('displays wedding venue cards correctly', () => {
      const venueCardMessage = {
        ...mockAIMessage,
        content: 'Here are some venue recommendations:',
        metadata: {
          venues: [
            {
              name: 'Sunset Gardens',
              type: 'outdoor',
              capacity: 150,
              priceRange: '$$',
              rating: 4.8,
              image: '/venues/sunset-gardens.jpg'
            }
          ]
        }
      };

      render(<MessageBubble message={venueCardMessage} />);

      expect(screen.getByText('Sunset Gardens')).toBeInTheDocument();
      expect(screen.getByText('Outdoor • Up to 150 guests')).toBeInTheDocument();
      expect(screen.getByText('4.8 ⭐')).toBeInTheDocument();
      expect(screen.getByText('$$')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    });

    it('formats price information correctly', () => {
      const priceMessage = {
        ...mockAIMessage,
        content: 'Wedding photography typically costs $2,500-$5,000 for your budget range.',
        metadata: {
          priceBreakdown: {
            photography: { min: 2500, max: 5000, currency: 'USD' }
          }
        }
      };

      render(<MessageBubble message={priceMessage} />);

      expect(screen.getByText('$2,500 - $5,000')).toBeInTheDocument();
      expect(screen.getByText('Photography')).toBeInTheDocument();
      expect(screen.getByTestId('price-range-indicator')).toBeInTheDocument();
    });

    it('handles code blocks and formatting', () => {
      const codeMessage = {
        ...mockAIMessage,
        content: 'Here\'s a sample timeline:\n```\n10:00 AM - Hair & Makeup\n12:00 PM - Photography\n2:00 PM - Ceremony\n```'
      };

      render(<MessageBubble message={codeMessage} />);

      const codeBlock = screen.getByTestId('code-block');
      expect(codeBlock).toHaveClass('bg-gray-100', 'rounded', 'p-4');
      expect(codeBlock).toContainHTML('10:00 AM - Hair & Makeup<br>12:00 PM - Photography<br>2:00 PM - Ceremony');
    });
  });

  describe('WS-243-M003: MessageBubble accessibility features', () => {
    it('meets WCAG 2.1 AA standards', async () => {
      const { container } = render(<MessageBubble message={mockUserMessage} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper screen reader support', () => {
      render(<MessageBubble message={mockAIMessage} />);

      const bubble = screen.getByTestId('message-bubble-msg-2');
      expect(bubble).toHaveAttribute('role', 'article');
      expect(bubble).toHaveAttribute('aria-label', 'Assistant message from 10:00 AM');
      
      const content = screen.getByTestId('message-content');
      expect(content).toHaveAttribute('aria-describedby', 'message-timestamp-msg-2');
      
      const timestamp = screen.getByTestId('message-timestamp-msg-2');
      expect(timestamp).toHaveAttribute('aria-label', 'Message sent at 10:00 AM on January 15, 2024');
    });

    it('supports high contrast mode', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      render(<MessageBubble message={mockUserMessage} />);

      const bubble = screen.getByTestId('message-bubble-msg-1');
      expect(bubble).toHaveClass('high-contrast');
      
      // Check contrast ratios meet WCAG standards
      const computedStyles = window.getComputedStyle(bubble);
      expect(computedStyles.getPropertyValue('--contrast-ratio')).toBe('7:1');
    });

    it('handles font scaling correctly', () => {
      // Mock user preference for larger fonts
      Object.defineProperty(document.documentElement, 'style', {
        value: { fontSize: '20px' }, // 125% scaling
        writable: true,
      });

      render(<MessageBubble message={mockAIMessage} />);

      const bubble = screen.getByTestId('message-bubble-msg-2');
      const computedStyles = window.getComputedStyle(bubble);
      
      // Should maintain readability at larger sizes
      expect(parseFloat(computedStyles.fontSize)).toBeGreaterThanOrEqual(16);
      expect(parseFloat(computedStyles.lineHeight)).toBeGreaterThanOrEqual(1.4);
    });

    it('provides focus indicators for interactive elements', async () => {
      const interactiveMessage = {
        ...mockAIMessage,
        metadata: {
          actions: [
            { type: 'quick-reply', text: 'Tell me more', action: 'expand-timeline' }
          ]
        }
      };

      render(<MessageBubble message={interactiveMessage} />);

      const quickReplyButton = screen.getByRole('button', { name: 'Tell me more' });
      
      await user.tab(); // Navigate to the button
      expect(quickReplyButton).toHaveFocus();
      expect(quickReplyButton).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-blue-500');
    });
  });

  describe('WS-243-M004: MessageBubble interaction handling', () => {
    it('implements copy message functionality', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });

      render(<MessageBubble message={mockAIMessage} showActions={true} />);

      const copyButton = screen.getByRole('button', { name: /copy message/i });
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockAIMessage.content);
      expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();
    });

    it('displays quick reply buttons', async () => {
      const messageWithReplies = {
        ...mockAIMessage,
        metadata: {
          quickReplies: [
            { text: 'Tell me more', value: 'more-details' },
            { text: 'Skip this', value: 'skip' },
            { text: 'Book now', value: 'book-venue' }
          ]
        }
      };

      const onQuickReply = jest.fn();
      render(<MessageBubble message={messageWithReplies} onQuickReply={onQuickReply} />);

      const tellMeMoreButton = screen.getByRole('button', { name: 'Tell me more' });
      const skipButton = screen.getByRole('button', { name: 'Skip this' });
      const bookButton = screen.getByRole('button', { name: 'Book now' });

      await user.click(tellMeMoreButton);
      expect(onQuickReply).toHaveBeenCalledWith('more-details');

      await user.click(skipButton);
      expect(onQuickReply).toHaveBeenCalledWith('skip');

      await user.click(bookButton);
      expect(onQuickReply).toHaveBeenCalledWith('book-venue');
    });

    it('shows feedback mechanisms', async () => {
      const onFeedback = jest.fn();
      render(<MessageBubble message={mockAIMessage} showFeedback={true} onFeedback={onFeedback} />);

      const thumbsUpButton = screen.getByRole('button', { name: /helpful/i });
      const thumbsDownButton = screen.getByRole('button', { name: /not helpful/i });

      await user.click(thumbsUpButton);
      expect(onFeedback).toHaveBeenCalledWith('positive', mockAIMessage.id);

      await user.click(thumbsDownButton);
      expect(onFeedback).toHaveBeenCalledWith('negative', mockAIMessage.id);
    });

    it('handles context menu actions', async () => {
      render(<MessageBubble message={mockAIMessage} showActions={true} />);

      const bubble = screen.getByTestId('message-bubble-msg-2');
      await user.pointer({ keys: '[MouseRight]', target: bubble });

      const contextMenu = screen.getByRole('menu');
      expect(contextMenu).toBeInTheDocument();
      
      expect(screen.getByRole('menuitem', { name: /copy message/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /share message/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /report issue/i })).toBeInTheDocument();
    });

    it('supports message reactions', async () => {
      const onReaction = jest.fn();
      render(<MessageBubble message={mockAIMessage} showReactions={true} onReaction={onReaction} />);

      const reactionButton = screen.getByRole('button', { name: /add reaction/i });
      await user.click(reactionButton);

      const reactionPicker = screen.getByTestId('reaction-picker');
      expect(reactionPicker).toBeInTheDocument();

      const heartReaction = screen.getByRole('button', { name: '❤️' });
      await user.click(heartReaction);

      expect(onReaction).toHaveBeenCalledWith('❤️', mockAIMessage.id);
    });
  });

  describe('WS-243-M005: MessageBubble performance optimization', () => {
    it('implements virtual scrolling for long messages', () => {
      const longMessage = {
        ...mockAIMessage,
        content: 'A'.repeat(10000), // Very long message
      };

      render(<MessageBubble message={longMessage} />);

      const contentContainer = screen.getByTestId('message-content');
      expect(contentContainer).toHaveAttribute('data-virtualized', 'true');
      expect(contentContainer).toHaveStyle({ maxHeight: '300px', overflow: 'auto' });
    });

    it('lazy loads images in message content', async () => {
      const imageMessage = {
        ...mockAIMessage,
        content: 'Check out these venue photos:',
        metadata: {
          images: [
            { url: '/venues/image1.jpg', alt: 'Sunset Gardens ceremony area' },
            { url: '/venues/image2.jpg', alt: 'Reception hall setup' }
          ]
        }
      };

      render(<MessageBubble message={imageMessage} />);

      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('decoding', 'async');
      });
    });

    it('prevents memory leaks with proper cleanup', () => {
      const { unmount } = render(<MessageBubble message={mockAIMessage} />);
      
      // Should not cause memory leaks when unmounted
      unmount();
      
      // Verify event listeners are cleaned up
      expect(document.querySelectorAll('[data-message-listener]')).toHaveLength(0);
    });

    it('optimizes re-renders with memoization', () => {
      const renderSpy = jest.fn();
      const MemoizedMessageBubble = React.memo(() => {
        renderSpy();
        return <MessageBubble message={mockAIMessage} />;
      });

      const { rerender } = render(<MemoizedMessageBubble />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props shouldn't trigger re-render
      rerender(<MemoizedMessageBubble />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with different props should trigger re-render
      rerender(<MessageBubble message={{ ...mockAIMessage, content: 'Updated content' }} />);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('WS-243-M006: MessageBubble wedding-specific content', () => {
    it('displays vendor showcase cards correctly', () => {
      const vendorMessage = {
        ...mockAIMessage,
        content: 'I found some great photographers for you:',
        metadata: {
          vendors: [
            {
              id: 'photographer-1',
              name: 'Sarah Photography',
              type: 'photographer',
              rating: 4.9,
              priceRange: '$2,500-$4,000',
              portfolio: ['/photos/sarah1.jpg', '/photos/sarah2.jpg'],
              specialties: ['wedding', 'portrait', 'outdoor']
            }
          ]
        }
      };

      render(<MessageBubble message={vendorMessage} />);

      expect(screen.getByText('Sarah Photography')).toBeInTheDocument();
      expect(screen.getByText('Photographer')).toBeInTheDocument();
      expect(screen.getByText('4.9 ⭐')).toBeInTheDocument();
      expect(screen.getByText('$2,500 - $4,000')).toBeInTheDocument();
      expect(screen.getByText('Wedding • Portrait • Outdoor')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view portfolio/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /contact vendor/i })).toBeInTheDocument();
    });

    it('shows timeline suggestions appropriately', () => {
      const timelineMessage = {
        ...mockAIMessage,
        content: 'Here\'s a suggested timeline for your wedding day:',
        metadata: {
          timeline: [
            { time: '8:00 AM', activity: 'Hair & Makeup begins', duration: 120, priority: 'high' },
            { time: '2:00 PM', activity: 'First Look Photos', duration: 30, priority: 'medium' },
            { time: '4:00 PM', activity: 'Ceremony', duration: 45, priority: 'high' }
          ]
        }
      };

      render(<MessageBubble message={timelineMessage} />);

      expect(screen.getByText('Wedding Day Timeline')).toBeInTheDocument();
      expect(screen.getByText('8:00 AM')).toBeInTheDocument();
      expect(screen.getByText('Hair & Makeup begins')).toBeInTheDocument();
      expect(screen.getByText('2 hours')).toBeInTheDocument();
      expect(screen.getByTestId('priority-high')).toBeInTheDocument();
      
      expect(screen.getByRole('button', { name: /add to my timeline/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /customize timeline/i })).toBeInTheDocument();
    });

    it('presents budget breakdowns clearly', () => {
      const budgetMessage = {
        ...mockAIMessage,
        content: 'Based on your budget of $25,000, here\'s how you might allocate funds:',
        metadata: {
          budgetBreakdown: {
            venue: { amount: 8000, percentage: 32, category: 'venue' },
            catering: { amount: 7500, percentage: 30, category: 'catering' },
            photography: { amount: 3500, percentage: 14, category: 'photography' },
            flowers: { amount: 2000, percentage: 8, category: 'flowers' },
            other: { amount: 4000, percentage: 16, category: 'other' }
          },
          totalBudget: 25000
        }
      };

      render(<MessageBubble message={budgetMessage} />);

      expect(screen.getByText('Budget Breakdown')).toBeInTheDocument();
      expect(screen.getByText('$25,000 Total Budget')).toBeInTheDocument();
      
      expect(screen.getByText('Venue: $8,000 (32%)')).toBeInTheDocument();
      expect(screen.getByText('Catering: $7,500 (30%)')).toBeInTheDocument();
      expect(screen.getByText('Photography: $3,500 (14%)')).toBeInTheDocument();
      
      expect(screen.getByTestId('budget-pie-chart')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /adjust budget/i })).toBeInTheDocument();
    });

    it('handles seasonal wedding considerations', () => {
      const seasonalMessage = {
        ...mockAIMessage,
        content: 'For your December wedding, here are important considerations:',
        metadata: {
          weddingDate: '2024-12-15',
          season: 'winter',
          considerations: [
            { type: 'weather', text: 'Plan for potential snow/rain', priority: 'high' },
            { type: 'decor', text: 'Winter florals are limited but beautiful', priority: 'medium' },
            { type: 'attire', text: 'Consider warm wraps for outdoor photos', priority: 'high' }
          ]
        }
      };

      render(<MessageBubble message={seasonalMessage} />);

      expect(screen.getByText('Winter Wedding Considerations')).toBeInTheDocument();
      expect(screen.getByText('December 15, 2024')).toBeInTheDocument();
      
      expect(screen.getByText('Plan for potential snow/rain')).toBeInTheDocument();
      expect(screen.getByText('Winter florals are limited but beautiful')).toBeInTheDocument();
      expect(screen.getByText('Consider warm wraps for outdoor photos')).toBeInTheDocument();
      
      expect(screen.getAllByTestId('priority-high')).toHaveLength(2);
      expect(screen.getAllByTestId('priority-medium')).toHaveLength(1);
    });
  });
});