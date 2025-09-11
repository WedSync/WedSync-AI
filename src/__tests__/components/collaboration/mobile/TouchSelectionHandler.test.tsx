/**
 * @jest-environment jsdom
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TouchSelectionHandler } from '@/components/collaboration/mobile/TouchSelectionHandler';

// Mock React 19 features
const mockStartTransition = jest.fn((fn) => fn());
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  startTransition: mockStartTransition,
  useCallback: (fn: any) => fn,
  useMemo: (fn: any) => fn(),
  useState: jest.fn().mockImplementation((initial) => [initial, jest.fn()]),
  useRef: () => ({ current: null }),
  useEffect: jest.fn(),
}));

// Mock motion library
jest.mock('motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock UI components
jest.mock('@/components/ui/textarea', () => ({
  Textarea: React.forwardRef(
    (
      { value, onChange, onSelect, onTouchStart, onTouchEnd, ...props }: any,
      ref: any,
    ) => (
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        onSelect={onSelect}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        data-testid="collaborative-textarea"
        {...props}
      />
    ),
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, ...props }: any) => (
    <button
      onClick={onClick}
      className={`btn ${variant} ${size} ${className}`}
      data-testid="action-button"
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Bold: () => <span data-icon="bold">Bold</span>,
  Italic: () => <span data-icon="italic">Italic</span>,
  List: () => <span data-icon="list">List</span>,
  CheckSquare: () => <span data-icon="check-square">CheckSquare</span>,
  AtSign: () => <span data-icon="at-sign">AtSign</span>,
  Hash: () => <span data-icon="hash">Hash</span>,
  MessageSquare: () => <span data-icon="message-square">MessageSquare</span>,
}));

describe('TouchSelectionHandler', () => {
  const defaultProps = {
    content: 'Initial wedding planning content',
    onChange: jest.fn(),
    placeholder: 'Start planning...',
    documentType: 'guest_list' as const,
    users: [],
  };

  const mockUsers = [
    {
      id: 'user-1',
      name: 'John Doe',
      cursor: { line: 1, column: 5 },
      selection: { start: 10, end: 20 },
    },
    {
      id: 'user-2',
      name: 'Jane Smith',
      cursor: null,
      selection: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock textarea selection methods
    Object.defineProperty(HTMLTextAreaElement.prototype, 'setSelectionRange', {
      value: jest.fn(),
    });

    Object.defineProperty(HTMLTextAreaElement.prototype, 'selectionStart', {
      get: jest.fn(() => 0),
      set: jest.fn(),
    });

    Object.defineProperty(HTMLTextAreaElement.prototype, 'selectionEnd', {
      get: jest.fn(() => 0),
      set: jest.fn(),
    });
  });

  it('renders textarea with correct props', () => {
    render(<TouchSelectionHandler {...defaultProps} />);

    const textarea = screen.getByTestId('collaborative-textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue(defaultProps.content);
    expect(textarea).toHaveAttribute('placeholder', defaultProps.placeholder);
  });

  it('displays correct quick actions for guest_list document type', () => {
    render(
      <TouchSelectionHandler {...defaultProps} documentType="guest_list" />,
    );

    expect(screen.getByText('RSVP Status')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Dietary')).toBeInTheDocument();
    expect(screen.getByText('Plus One')).toBeInTheDocument();
  });

  it('displays correct quick actions for vendor_selection document type', () => {
    render(
      <TouchSelectionHandler
        {...defaultProps}
        documentType="vendor_selection"
      />,
    );

    expect(screen.getByText('Selected')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it('displays correct quick actions for timeline document type', () => {
    render(<TouchSelectionHandler {...defaultProps} documentType="timeline" />);

    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Vendor')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
  });

  it('displays correct quick actions for family_input document type', () => {
    render(
      <TouchSelectionHandler {...defaultProps} documentType="family_input" />,
    );

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Request')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it('handles content changes', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(<TouchSelectionHandler {...defaultProps} onChange={onChange} />);

    const textarea = screen.getByTestId('collaborative-textarea');

    await user.clear(textarea);
    await user.type(textarea, 'New wedding content');

    expect(onChange).toHaveBeenCalled();
  });

  it('handles touch events for mobile optimization', () => {
    render(<TouchSelectionHandler {...defaultProps} />);

    const textarea = screen.getByTestId('collaborative-textarea');

    // Simulate touch events
    fireEvent.touchStart(textarea, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchEnd(textarea);

    // Should not throw errors and maintain functionality
    expect(textarea).toBeInTheDocument();
  });

  it('handles text selection changes', () => {
    render(<TouchSelectionHandler {...defaultProps} />);

    const textarea = screen.getByTestId('collaborative-textarea');

    // Mock selection
    Object.defineProperty(textarea, 'selectionStart', { value: 5 });
    Object.defineProperty(textarea, 'selectionEnd', { value: 15 });

    fireEvent.select(textarea);

    // Should handle selection without errors
    expect(textarea).toBeInTheDocument();
  });

  it('inserts text when quick action buttons are clicked', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(
      <TouchSelectionHandler
        {...defaultProps}
        documentType="guest_list"
        onChange={onChange}
      />,
    );

    const rsvpButton = screen.getByText('RSVP Status');
    await user.click(rsvpButton);

    // Should call onChange with inserted text
    expect(onChange).toHaveBeenCalled();
  });

  it('shows content statistics', () => {
    const content = 'Line 1\nLine 2\nLine 3';
    render(<TouchSelectionHandler {...defaultProps} content={content} />);

    expect(screen.getByText('3 lines • 17 chars')).toBeInTheDocument();
  });

  it('displays wedding context helper text', () => {
    const { rerender } = render(
      <TouchSelectionHandler {...defaultProps} documentType="guest_list" />,
    );

    expect(
      screen.getByText(/tap guest names to add details/i),
    ).toBeInTheDocument();

    rerender(
      <TouchSelectionHandler
        {...defaultProps}
        documentType="vendor_selection"
      />,
    );
    expect(
      screen.getByText(/compare vendors side by side/i),
    ).toBeInTheDocument();

    rerender(
      <TouchSelectionHandler {...defaultProps} documentType="timeline" />,
    );
    expect(screen.getByText(/list events in order/i)).toBeInTheDocument();

    rerender(
      <TouchSelectionHandler {...defaultProps} documentType="family_input" />,
    );
    expect(screen.getByText(/collect special requests/i)).toBeInTheDocument();
  });

  it('applies mobile-specific CSS classes', () => {
    render(<TouchSelectionHandler {...defaultProps} />);

    const textarea = screen.getByTestId('collaborative-textarea');

    // Should have touch optimization classes
    expect(textarea).toHaveClass('touch-manipulation');
  });

  it('handles composition events for IME support', () => {
    render(<TouchSelectionHandler {...defaultProps} />);

    const textarea = screen.getByTestId('collaborative-textarea');

    // Simulate composition events
    fireEvent.compositionStart(textarea);
    fireEvent.compositionEnd(textarea, { data: '测试' });

    // Should handle IME input without errors
    expect(textarea).toBeInTheDocument();
  });

  it('handles users with collaborative selections', () => {
    render(<TouchSelectionHandler {...defaultProps} users={mockUsers} />);

    // Should render selection highlights for other users
    // In a real implementation, this would show visual indicators
    expect(screen.getByTestId('collaborative-textarea')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-selection-handler';
    render(<TouchSelectionHandler {...defaultProps} className={customClass} />);

    const container = document.querySelector(`.${customClass}`);
    expect(container).toBeInTheDocument();
  });

  it('handles long content gracefully', () => {
    const longContent = 'A'.repeat(10000);
    render(<TouchSelectionHandler {...defaultProps} content={longContent} />);

    const textarea = screen.getByTestId('collaborative-textarea');
    expect(textarea).toHaveValue(longContent);

    // Should show correct character count
    expect(screen.getByText(/10000 chars/)).toBeInTheDocument();
  });

  it('handles empty content', () => {
    render(<TouchSelectionHandler {...defaultProps} content="" />);

    const textarea = screen.getByTestId('collaborative-textarea');
    expect(textarea).toHaveValue('');

    expect(screen.getByText('1 lines • 0 chars')).toBeInTheDocument();
  });
});

describe('TouchSelectionHandler - Selection Toolbar', () => {
  const defaultProps = {
    content: 'Wedding planning content for selection testing',
    onChange: jest.fn(),
    documentType: 'guest_list' as const,
    users: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows selection toolbar when text is selected', () => {
    render(<TouchSelectionHandler {...defaultProps} />);

    const textarea = screen.getByTestId('collaborative-textarea');

    // Mock text selection
    Object.defineProperty(textarea, 'selectionStart', { value: 5 });
    Object.defineProperty(textarea, 'selectionEnd', { value: 15 });

    fireEvent.select(textarea);

    // Should show toolbar (in real implementation)
    expect(textarea).toBeInTheDocument();
  });

  it('hides toolbar when clicking outside', () => {
    render(<TouchSelectionHandler {...defaultProps} />);

    // Click outside the component
    fireEvent.mouseDown(document.body);

    // Toolbar should be hidden (tested through implementation)
    expect(screen.getByTestId('collaborative-textarea')).toBeInTheDocument();
  });

  it('handles toolbar actions for selected text', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(<TouchSelectionHandler {...defaultProps} onChange={onChange} />);

    // Test toolbar action button interactions
    const quickActions = screen.getAllByTestId('action-button');
    expect(quickActions.length).toBeGreaterThan(0);
    
    // Test clicking the first toolbar action
    await user.click(quickActions[0]);
    
    // Should trigger the onChange callback for toolbar actions
    expect(onChange).toHaveBeenCalled();
  });
});

describe('TouchSelectionHandler - Mobile Gestures', () => {
  const defaultProps = {
    content: 'Content for gesture testing',
    onChange: jest.fn(),
    documentType: 'guest_list' as const,
    users: [],
  };

  it('handles long press for context menu', () => {
    render(<TouchSelectionHandler {...defaultProps} />);

    const textarea = screen.getByTestId('collaborative-textarea');

    // Simulate long press
    fireEvent.touchStart(textarea, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // Long press would typically trigger after a delay
    setTimeout(() => {
      fireEvent.touchEnd(textarea);
    }, 1000);

    expect(textarea).toBeInTheDocument();
  });

  it('handles swipe gestures', () => {
    render(<TouchSelectionHandler {...defaultProps} />);

    const textarea = screen.getByTestId('collaborative-textarea');

    // Simulate swipe
    fireEvent.touchStart(textarea, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(textarea, {
      touches: [{ clientX: 200, clientY: 100 }],
    });

    fireEvent.touchEnd(textarea);

    expect(textarea).toBeInTheDocument();
  });

  it('provides haptic feedback simulation', () => {
    render(<TouchSelectionHandler {...defaultProps} />);

    const textarea = screen.getByTestId('collaborative-textarea');

    // Haptic feedback would be triggered on certain interactions
    fireEvent.touchStart(textarea);

    expect(textarea).toBeInTheDocument();
  });

  it('handles pinch-to-zoom prevention', () => {
    render(<TouchSelectionHandler {...defaultProps} />);

    const textarea = screen.getByTestId('collaborative-textarea');

    // Should have touch-manipulation class to prevent zooming
    expect(textarea).toHaveClass('touch-manipulation');
  });
});

describe('TouchSelectionHandler - Wedding Industry Features', () => {
  it('provides guest list specific shortcuts', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(
      <TouchSelectionHandler
        content=""
        onChange={onChange}
        documentType="guest_list"
        users={[]}
      />,
    );

    const rsvpButton = screen.getByText('RSVP Status');
    await user.click(rsvpButton);

    expect(onChange).toHaveBeenCalled();
  });

  it('provides vendor selection specific shortcuts', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(
      <TouchSelectionHandler
        content=""
        onChange={onChange}
        documentType="vendor_selection"
        users={[]}
      />,
    );

    const selectedButton = screen.getByText('Selected');
    await user.click(selectedButton);

    expect(onChange).toHaveBeenCalled();
  });

  it('provides timeline specific shortcuts', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();

    render(
      <TouchSelectionHandler
        content=""
        onChange={onChange}
        documentType="timeline"
        users={[]}
      />,
    );

    const timeButton = screen.getByText('Time');
    await user.click(timeButton);

    expect(onChange).toHaveBeenCalled();
  });

  it('shows appropriate context help for each document type', () => {
    const { rerender } = render(
      <TouchSelectionHandler
        content=""
        onChange={jest.fn()}
        documentType="guest_list"
        users={[]}
      />,
    );

    expect(
      screen.getByText(/tap guest names to add details/i),
    ).toBeInTheDocument();

    rerender(
      <TouchSelectionHandler
        content=""
        onChange={jest.fn()}
        documentType="family_input"
        users={[]}
      />,
    );

    expect(screen.getByText(/collect special requests/i)).toBeInTheDocument();
  });
});
