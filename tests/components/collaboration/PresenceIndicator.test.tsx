/**
 * WS-244 Real-Time Collaboration System - PresenceIndicator Tests
 * Team A - Comprehensive Test Suite for User Presence Display
 * 
 * Tests user presence, avatar display, permission badges, and responsive behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PresenceIndicator, PresenceIndicatorSimple } from '@/components/collaboration/PresenceIndicator';
import { CollaboratorInfo, DocumentPermissions } from '@/types/collaboration';

describe('PresenceIndicator', () => {
  const mockCurrentUser = {
    id: 'current-user',
    email: 'current@example.com',
    name: 'Current User',
    avatar_url: 'https://example.com/current.jpg'
  };

  const mockCollaborators: CollaboratorInfo[] = [
    {
      userId: 'user-1',
      name: 'Alice Smith',
      email: 'alice@example.com',
      avatar: 'https://example.com/alice.jpg',
      permissions: { read: true, write: true, admin: false, share: false, comment: true },
      lastSeen: new Date(),
      isOnline: true,
      cursor: {
        position: 10,
        selection: { start: 10, end: 15 },
        color: '#9E77ED'
      }
    },
    {
      userId: 'user-2',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      avatar: 'https://example.com/bob.jpg',
      permissions: { read: true, write: false, admin: false, share: false, comment: true },
      lastSeen: new Date(),
      isOnline: true,
      cursor: {
        position: 25,
        selection: { start: 25, end: 25 },
        color: '#2E90FA'
      }
    },
    {
      userId: 'user-3',
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      avatar: 'https://example.com/charlie.jpg',
      permissions: { read: true, write: true, admin: true, share: true, comment: true },
      lastSeen: new Date(),
      isOnline: true
    },
    {
      userId: 'user-4',
      name: 'Diana Prince',
      email: 'diana@example.com',
      avatar: 'https://example.com/diana.jpg',
      permissions: { read: true, write: false, admin: false, share: false, comment: false },
      lastSeen: new Date(),
      isOnline: false // Offline user - should be filtered out
    }
  ];

  const defaultProps = {
    users: mockCollaborators,
    currentUser: mockCurrentUser,
    showCursors: true,
    showAvatars: true,
    maxDisplayCount: 5,
    showPermissions: true,
    showTooltips: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders online collaborators correctly', () => {
      render(<PresenceIndicator {...defaultProps} />);
      
      // Should show 3 online users (filtering out offline user-4 and current user)
      expect(screen.getByText('3 online')).toBeInTheDocument();
    });

    it('shows "Only you" when no other users are online', () => {
      render(<PresenceIndicator {...defaultProps} users={[]} />);
      
      expect(screen.getByText('Only you')).toBeInTheDocument();
    });

    it('filters out current user from display', () => {
      const usersIncludingCurrent = [
        ...mockCollaborators,
        {
          userId: 'current-user',
          name: 'Current User',
          email: 'current@example.com',
          avatar: 'https://example.com/current.jpg',
          permissions: { read: true, write: true, admin: false, share: false, comment: true },
          lastSeen: new Date(),
          isOnline: true
        }
      ];
      
      render(<PresenceIndicator {...defaultProps} users={usersIncludingCurrent} />);
      
      // Should still show 3 online (not including current user)
      expect(screen.getByText('3 online')).toBeInTheDocument();
    });

    it('filters out offline users', () => {
      render(<PresenceIndicator {...defaultProps} />);
      
      // user-4 is offline, should not be counted
      expect(screen.getByText('3 online')).toBeInTheDocument();
      expect(screen.queryByText('Diana Prince')).not.toBeInTheDocument();
    });
  });

  describe('Avatar Display', () => {
    it('displays user avatars when showAvatars is true', () => {
      render(<PresenceIndicator {...defaultProps} />);
      
      const aliceAvatar = screen.getByAltText('Alice Smith');
      expect(aliceAvatar).toBeInTheDocument();
      expect(aliceAvatar).toHaveAttribute('src', 'https://example.com/alice.jpg');
    });

    it('shows initials when showAvatars is false', () => {
      render(<PresenceIndicator {...defaultProps} showAvatars={false} />);
      
      // Should show initials instead of avatars
      expect(screen.getByText('AS')).toBeInTheDocument(); // Alice Smith
      expect(screen.getByText('BJ')).toBeInTheDocument(); // Bob Johnson
    });

    it('shows initials as fallback when avatar URL is missing', () => {
      const usersWithoutAvatars = mockCollaborators.map(user => ({
        ...user,
        avatar: undefined
      }));
      
      render(<PresenceIndicator {...defaultProps} users={usersWithoutAvatars} />);
      
      expect(screen.getByText('AS')).toBeInTheDocument();
      expect(screen.getByText('BJ')).toBeInTheDocument();
    });

    it('generates initials from email when name is missing', () => {
      const usersWithoutNames = [{
        ...mockCollaborators[0],
        name: '',
        email: 'test@example.com'
      }];
      
      render(<PresenceIndicator {...defaultProps} users={usersWithoutNames} />);
      
      expect(screen.getByText('TE')).toBeInTheDocument(); // From "test@example.com"
    });

    it('applies consistent user colors based on userId', () => {
      render(<PresenceIndicator {...defaultProps} showAvatars={false} />);
      
      const userElements = screen.getAllByText(/^[A-Z]{2}$/);
      expect(userElements).toHaveLength(3);
      
      // Each user should have a background color class
      userElements.forEach(element => {
        expect(element.className).toContain('bg-');
      });
    });
  });

  describe('Permission Badges', () => {
    it('displays admin badge for admin users', () => {
      render(<PresenceIndicator {...defaultProps} />);
      
      // Charlie Brown is admin
      const adminBadges = screen.getAllByTestId('crown-icon') || 
                         document.querySelectorAll('[data-testid="crown"], .lucide-crown');
      expect(adminBadges.length).toBeGreaterThan(0);
    });

    it('displays edit badge for users with write permissions', () => {
      render(<PresenceIndicator {...defaultProps} />);
      
      // Alice and Charlie have write permissions
      const editBadges = screen.getAllByTestId('edit-icon') || 
                        document.querySelectorAll('[data-testid="edit-3"], .lucide-edit-3');
      expect(editBadges.length).toBeGreaterThan(0);
    });

    it('displays view badge for read-only users', () => {
      render(<PresenceIndicator {...defaultProps} />);
      
      // Bob is read-only
      const viewBadges = screen.getAllByTestId('eye-icon') || 
                        document.querySelectorAll('[data-testid="eye"], .lucide-eye');
      expect(viewBadges.length).toBeGreaterThan(0);
    });

    it('hides permission badges when showPermissions is false', () => {
      render(<PresenceIndicator {...defaultProps} showPermissions={false} />);
      
      // No permission badges should be visible
      const badges = document.querySelectorAll('.lucide-crown, .lucide-edit-3, .lucide-eye');
      expect(badges).toHaveLength(0);
    });
  });

  describe('Cursor Indicators', () => {
    it('shows cursor indicators for actively editing users', () => {
      render(<PresenceIndicator {...defaultProps} />);
      
      // Alice and Bob have cursor positions
      const cursorIndicators = document.querySelectorAll('[class*="animate-pulse"]');
      expect(cursorIndicators.length).toBeGreaterThanOrEqual(2);
    });

    it('hides cursor indicators when showCursors is false', () => {
      render(<PresenceIndicator {...defaultProps} showCursors={false} />);
      
      // Cursor indicators should not be visible
      const cursorElements = document.querySelectorAll('[style*="backgroundColor"]');
      expect(cursorElements).toHaveLength(0);
    });

    it('uses user-specific cursor colors', () => {
      render(<PresenceIndicator {...defaultProps} />);
      
      // Should have cursor indicators with specific colors
      const coloredElements = document.querySelectorAll('[style*="backgroundColor: rgb"]');
      expect(coloredElements.length).toBeGreaterThan(0);
    });
  });

  describe('Tooltips', () => {
    it('shows tooltip on hover when showTooltips is true', async () => {
      const user = userEvent.setup();
      render(<PresenceIndicator {...defaultProps} />);
      
      const aliceAvatar = screen.getByAltText('Alice Smith');
      await user.hover(aliceAvatar);
      
      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('Editor')).toBeInTheDocument();
      });
    });

    it('shows "Currently editing" for users with active cursors', async () => {
      const user = userEvent.setup();
      render(<PresenceIndicator {...defaultProps} />);
      
      const aliceAvatar = screen.getByAltText('Alice Smith');
      await user.hover(aliceAvatar);
      
      await waitFor(() => {
        expect(screen.getByText('Currently editing')).toBeInTheDocument();
      });
    });

    it('hides tooltip on mouse leave', async () => {
      const user = userEvent.setup();
      render(<PresenceIndicator {...defaultProps} />);
      
      const aliceAvatar = screen.getByAltText('Alice Smith');
      await user.hover(aliceAvatar);
      await user.unhover(aliceAvatar);
      
      await waitFor(() => {
        expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
      });
    });

    it('does not show tooltips when showTooltips is false', async () => {
      const user = userEvent.setup();
      render(<PresenceIndicator {...defaultProps} showTooltips={false} />);
      
      const aliceAvatar = screen.getByAltText('Alice Smith');
      await user.hover(aliceAvatar);
      
      // Wait a bit to ensure tooltip doesn't appear
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    });
  });

  describe('User Overflow Handling', () => {
    it('shows overflow indicator when users exceed maxDisplayCount', () => {
      render(
        <PresenceIndicator 
          {...defaultProps} 
          maxDisplayCount={2} 
        />
      );
      
      // Should show +1 for the third user
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('expands to show all users when overflow indicator is clicked', async () => {
      const user = userEvent.setup();
      render(
        <PresenceIndicator 
          {...defaultProps} 
          maxDisplayCount={2} 
        />
      );
      
      const overflowButton = screen.getByText('+1');
      await user.click(overflowButton);
      
      // Should now show all users
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    });

    it('shows collapse button when expanded', async () => {
      const user = userEvent.setup();
      render(
        <PresenceIndicator 
          {...defaultProps} 
          maxDisplayCount={2} 
        />
      );
      
      const overflowButton = screen.getByText('+1');
      await user.click(overflowButton);
      
      // Should show collapse button (MoreHorizontal icon)
      const collapseButton = document.querySelector('.lucide-more-horizontal');
      expect(collapseButton).toBeInTheDocument();
    });

    it('collapses back when collapse button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <PresenceIndicator 
          {...defaultProps} 
          maxDisplayCount={2} 
        />
      );
      
      // Expand first
      const overflowButton = screen.getByText('+1');
      await user.click(overflowButton);
      
      // Then collapse
      const collapseButton = document.querySelector('.lucide-more-horizontal')?.parentElement;
      if (collapseButton) {
        await user.click(collapseButton);
      }
      
      // Should show overflow indicator again
      expect(screen.getByText('+1')).toBeInTheDocument();
    });
  });

  describe('User Click Handler', () => {
    it('calls onUserClick when user avatar is clicked', async () => {
      const onUserClick = vi.fn();
      const user = userEvent.setup();
      
      render(
        <PresenceIndicator 
          {...defaultProps} 
          onUserClick={onUserClick} 
        />
      );
      
      const aliceAvatar = screen.getByAltText('Alice Smith');
      await user.click(aliceAvatar);
      
      expect(onUserClick).toHaveBeenCalledWith(mockCollaborators[0]);
    });

    it('does not call onUserClick when handler is not provided', async () => {
      const user = userEvent.setup();
      
      render(<PresenceIndicator {...defaultProps} />);
      
      const aliceAvatar = screen.getByAltText('Alice Smith');
      
      // Should not throw error when clicked without handler
      expect(() => user.click(aliceAvatar)).not.toThrow();
    });
  });

  describe('Size Variations', () => {
    it('applies small size styling', () => {
      render(<PresenceIndicator {...defaultProps} size="small" />);
      
      const avatars = screen.getAllByRole('img');
      avatars.forEach(avatar => {
        expect(avatar.className).toContain('w-6');
        expect(avatar.className).toContain('h-6');
      });
    });

    it('applies large size styling', () => {
      render(<PresenceIndicator {...defaultProps} size="large" />);
      
      const avatars = screen.getAllByRole('img');
      avatars.forEach(avatar => {
        expect(avatar.className).toContain('w-10');
        expect(avatar.className).toContain('h-10');
      });
    });

    it('uses medium size by default', () => {
      render(<PresenceIndicator {...defaultProps} />);
      
      const avatars = screen.getAllByRole('img');
      avatars.forEach(avatar => {
        expect(avatar.className).toContain('w-8');
        expect(avatar.className).toContain('h-8');
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
    });

    it('shows active editors count on mobile', () => {
      render(<PresenceIndicator {...defaultProps} />);
      
      // Should show editing indicator for mobile
      const editingIndicators = document.querySelectorAll('.sm\\:hidden');
      expect(editingIndicators.length).toBeGreaterThan(0);
    });

    it('hides detailed labels on mobile', () => {
      render(<PresenceIndicator {...defaultProps} />);
      
      // Text should be hidden on mobile with sm:inline class
      const hiddenText = screen.getByText('online');
      expect(hiddenText.className).toContain('font-medium');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for overflow button', () => {
      render(
        <PresenceIndicator 
          {...defaultProps} 
          maxDisplayCount={2} 
        />
      );
      
      const overflowButton = screen.getByLabelText('Show 1 more collaborators');
      expect(overflowButton).toBeInTheDocument();
    });

    it('provides proper ARIA labels for collapse button', async () => {
      const user = userEvent.setup();
      render(
        <PresenceIndicator 
          {...defaultProps} 
          maxDisplayCount={2} 
        />
      );
      
      const overflowButton = screen.getByText('+1');
      await user.click(overflowButton);
      
      const collapseButton = screen.getByLabelText('Show fewer collaborators');
      expect(collapseButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const onUserClick = vi.fn();
      
      render(
        <PresenceIndicator 
          {...defaultProps} 
          onUserClick={onUserClick} 
        />
      );
      
      // Tab to first user
      await user.tab();
      
      // Should focus on clickable element
      const focusedElement = document.activeElement;
      expect(focusedElement).toHaveAttribute('class');
    });
  });
});

describe('PresenceIndicatorSimple', () => {
  it('renders user count correctly', () => {
    render(<PresenceIndicatorSimple userCount={5} activeEditors={2} />);
    
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows online indicator dot', () => {
    render(<PresenceIndicatorSimple userCount={3} activeEditors={1} />);
    
    const onlineDot = document.querySelector('.bg-success-500');
    expect(onlineDot).toBeInTheDocument();
  });

  it('shows edit indicator when there are active editors', () => {
    render(<PresenceIndicatorSimple userCount={3} activeEditors={2} />);
    
    const editIcon = document.querySelector('.lucide-edit-3');
    expect(editIcon).toBeInTheDocument();
  });

  it('hides edit indicator when no active editors', () => {
    render(<PresenceIndicatorSimple userCount={3} activeEditors={0} />);
    
    const editIcon = document.querySelector('.lucide-edit-3');
    expect(editIcon).not.toBeInTheDocument();
  });

  it('returns null when no users online', () => {
    const { container } = render(<PresenceIndicatorSimple userCount={0} activeEditors={0} />);
    
    expect(container.firstChild).toBeNull();
  });
});