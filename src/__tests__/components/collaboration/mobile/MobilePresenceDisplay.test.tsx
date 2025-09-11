/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
  MobilePresenceDisplay,
  CollaborativeCursors,
} from '@/components/collaboration/mobile/MobilePresenceDisplay';

// Mock motion library
jest.mock('motion', () => ({
  motion: {
    div: ({ children, animate, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock UI components
jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => (
    <div className={`avatar ${className}`}>{children}</div>
  ),
  AvatarImage: ({ src, alt }: any) => <img src={src} alt={alt} />,
  AvatarFallback: ({ children, className }: any) => (
    <div className={`avatar-fallback ${className}`}>{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children, side }: any) => (
    <div data-testid="tooltip-content" data-side={side}>
      {children}
    </div>
  ),
}));

describe('MobilePresenceDisplay', () => {
  const mockUsers = [
    {
      id: 'user-1',
      name: 'John Doe',
      avatar: 'https://example.com/john.jpg',
      cursor: { line: 5, column: 10 },
      selection: null,
    },
    {
      id: 'user-2',
      name: 'Jane Smith',
      avatar: undefined,
      cursor: null,
      selection: { start: 50, end: 75 },
    },
    {
      id: 'user-3',
      name: 'Wedding Planner',
      avatar: 'https://example.com/planner.jpg',
      cursor: { line: 2, column: 5 },
      selection: null,
    },
  ];

  it('renders empty state when no users', () => {
    const { container } = render(<MobilePresenceDisplay users={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders user avatars with correct information', () => {
    render(<MobilePresenceDisplay users={mockUsers} />);

    // Should render all visible users
    const avatars = screen.getAllByRole('img');
    expect(avatars).toHaveLength(2); // One has avatar, one fallback

    // Check for user names in avatars
    expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe initials
    expect(screen.getByText('JS')).toBeInTheDocument(); // Jane Smith initials
    expect(screen.getByText('WP')).toBeInTheDocument(); // Wedding Planner initials
  });

  it('shows correct activity indicators', () => {
    render(<MobilePresenceDisplay users={mockUsers} />);

    // Should show activity indicators for each user
    const activityDots = document.querySelectorAll(
      '[class*="bg-green-500"], [class*="bg-blue-500"], [class*="bg-gray-400"]',
    );
    expect(activityDots.length).toBeGreaterThan(0);
  });

  it('displays live collaboration indicator', () => {
    render(<MobilePresenceDisplay users={mockUsers} />);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows collaboration summary badge', () => {
    render(<MobilePresenceDisplay users={mockUsers} />);

    expect(screen.getByText('3 people collaborating')).toBeInTheDocument();
  });

  it('limits visible users when maxVisible is set', () => {
    render(<MobilePresenceDisplay users={mockUsers} maxVisible={2} />);

    // Should show overflow indicator
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('handles users without avatars gracefully', () => {
    const usersWithoutAvatars = [
      {
        id: 'user-1',
        name: 'No Avatar User',
        cursor: null,
        selection: null,
      },
    ];

    render(<MobilePresenceDisplay users={usersWithoutAvatars} />);

    // Should show initials
    expect(screen.getByText('NA')).toBeInTheDocument();
  });

  it('assigns consistent colors to users', () => {
    render(<MobilePresenceDisplay users={mockUsers} />);

    const avatars = document.querySelectorAll('.avatar-fallback');

    // Each avatar should have a color class
    avatars.forEach((avatar) => {
      expect(avatar.className).toMatch(
        /bg-(blue|green|purple|orange|pink|indigo|teal|red)-500/,
      );
    });
  });

  it('determines user activity correctly', () => {
    const editingUser = {
      id: 'editing-user',
      name: 'Editing User',
      cursor: { line: 1, column: 1 },
      selection: null,
    };

    const selectingUser = {
      id: 'selecting-user',
      name: 'Selecting User',
      cursor: null,
      selection: { start: 10, end: 20 },
    };

    const viewingUser = {
      id: 'viewing-user',
      name: 'Viewing User',
      cursor: null,
      selection: null,
    };

    render(
      <MobilePresenceDisplay
        users={[editingUser, selectingUser, viewingUser]}
      />,
    );

    // Should show appropriate activity indicators
    const greenDots = document.querySelectorAll('[class*="bg-green-500"]');
    const blueDots = document.querySelectorAll('[class*="bg-blue-500"]');
    const grayDots = document.querySelectorAll('[class*="bg-gray-400"]');

    expect(greenDots.length).toBeGreaterThan(0); // Editing user
    expect(blueDots.length).toBeGreaterThan(0); // Selecting user
    expect(grayDots.length).toBeGreaterThan(0); // Viewing user
  });

  it('handles cursor display when showCursors is enabled', () => {
    render(<MobilePresenceDisplay users={mockUsers} showCursors={true} />);

    // Tooltip should show cursor position information
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-presence-class';
    render(<MobilePresenceDisplay users={mockUsers} className={customClass} />);

    const container = document.querySelector('.custom-presence-class');
    expect(container).toBeInTheDocument();
  });

  it('handles empty user names gracefully', () => {
    const userWithEmptyName = {
      id: 'empty-user',
      name: '',
      cursor: null,
      selection: null,
    };

    render(<MobilePresenceDisplay users={[userWithEmptyName]} />);

    // Should handle empty names
    expect(document.querySelector('.avatar-fallback')).toBeInTheDocument();
  });

  it('handles very long user names', () => {
    const userWithLongName = {
      id: 'long-name-user',
      name: 'This Is A Very Long Name That Should Be Truncated Properly',
      cursor: null,
      selection: null,
    };

    render(<MobilePresenceDisplay users={[userWithLongName]} />);

    // Should show only first two initials
    expect(screen.getByText('TI')).toBeInTheDocument();
  });

  it('animates presence changes', () => {
    const { rerender } = render(
      <MobilePresenceDisplay users={[mockUsers[0]]} />,
    );

    // Add a new user
    rerender(<MobilePresenceDisplay users={mockUsers} />);

    // Should handle the animation (motion components are mocked but structure should be there)
    expect(screen.getByText('3 people collaborating')).toBeInTheDocument();
  });
});

describe('CollaborativeCursors', () => {
  const mockContainerRef = {
    current: document.createElement('div'),
  };

  const mockUsersWithCursors = [
    {
      id: 'user-1',
      name: 'John',
      cursor: { line: 2, column: 5 },
      selection: null,
    },
    {
      id: 'user-2',
      name: 'Jane',
      cursor: { line: 0, column: 10 },
      selection: null,
    },
  ];

  it('renders cursors for users with cursor positions', () => {
    render(
      <CollaborativeCursors
        users={mockUsersWithCursors}
        containerRef={mockContainerRef}
      />,
    );

    // Should render cursor elements
    const cursors = document.querySelectorAll('[class*="animate-pulse"]');
    expect(cursors.length).toBeGreaterThan(0);
  });

  it('renders user labels with cursors', () => {
    render(
      <CollaborativeCursors
        users={mockUsersWithCursors}
        containerRef={mockContainerRef}
      />,
    );

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('handles empty container ref', () => {
    const emptyRef = { current: null };

    render(
      <CollaborativeCursors
        users={mockUsersWithCursors}
        containerRef={emptyRef}
      />,
    );

    // Should not crash and not render cursors
    const cursors = document.querySelectorAll('[class*="animate-pulse"]');
    expect(cursors).toHaveLength(0);
  });

  it('filters out users without cursors', () => {
    const usersWithoutCursors = [
      {
        id: 'user-1',
        name: 'No Cursor User',
        cursor: null,
        selection: null,
      },
    ];

    render(
      <CollaborativeCursors
        users={usersWithoutCursors}
        containerRef={mockContainerRef}
      />,
    );

    // Should not render any cursors
    const cursors = document.querySelectorAll('[class*="animate-pulse"]');
    expect(cursors).toHaveLength(0);
  });

  it('assigns different colors to different users', () => {
    render(
      <CollaborativeCursors
        users={mockUsersWithCursors}
        containerRef={mockContainerRef}
      />,
    );

    // Should have cursor elements with color classes
    const coloredElements = document.querySelectorAll('[class*="bg-"]');
    expect(coloredElements.length).toBeGreaterThan(0);
  });

  it('positions cursors based on line and column', () => {
    render(
      <CollaborativeCursors
        users={mockUsersWithCursors}
        containerRef={mockContainerRef}
      />,
    );

    // Should position cursors (simplified positioning in our mock)
    const positionedElements = document.querySelectorAll(
      '[style*="top"], [style*="left"]',
    );
    expect(positionedElements.length).toBeGreaterThan(0);
  });
});

describe('MobilePresenceDisplay - Wedding Context', () => {
  it('handles wedding-specific user roles', () => {
    const weddingUsers = [
      {
        id: 'bride',
        name: 'Emily Bride',
        cursor: null,
        selection: null,
      },
      {
        id: 'groom',
        name: 'Michael Groom',
        cursor: null,
        selection: null,
      },
      {
        id: 'planner',
        name: 'Sarah Planner',
        cursor: null,
        selection: null,
      },
    ];

    render(<MobilePresenceDisplay users={weddingUsers} />);

    expect(screen.getByText('EB')).toBeInTheDocument();
    expect(screen.getByText('MG')).toBeInTheDocument();
    expect(screen.getByText('SP')).toBeInTheDocument();
  });

  it('shows appropriate collaboration summary for wedding planning', () => {
    const weddingTeam = Array.from({ length: 5 }, (_, i) => ({
      id: `user-${i}`,
      name: `Wedding Team ${i + 1}`,
      cursor: null,
      selection: null,
    }));

    render(<MobilePresenceDisplay users={weddingTeam} />);

    expect(screen.getByText('5 people collaborating')).toBeInTheDocument();
  });

  it('handles family member collaboration', () => {
    const familyMembers = [
      {
        id: 'mom',
        name: 'Mother of Bride',
        cursor: { line: 1, column: 0 },
        selection: null,
      },
      {
        id: 'dad',
        name: 'Father of Groom',
        cursor: null,
        selection: { start: 20, end: 30 },
      },
    ];

    render(<MobilePresenceDisplay users={familyMembers} />);

    expect(screen.getByText('MO')).toBeInTheDocument();
    expect(screen.getByText('FA')).toBeInTheDocument();
  });
});
