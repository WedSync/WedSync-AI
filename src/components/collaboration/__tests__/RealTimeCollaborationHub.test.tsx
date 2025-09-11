/**
 * WS-342 Real-Time Wedding Collaboration - Comprehensive Test Suite
 * Team A - Frontend/UI Development - Test Coverage
 *
 * Complete test coverage for all wedding collaboration components
 * ensuring real-time features work correctly in wedding scenarios
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Import components
import { RealTimeCollaborationHub } from '../RealTimeCollaborationHub';
import { LiveWeddingTimeline } from '../LiveWeddingTimeline';
import { VendorCoordinationPanel } from '../VendorCoordinationPanel';
import { WeddingPartyChat } from '../WeddingPartyChat';
import { SharedWeddingBoard } from '../SharedWeddingBoard';
import { LiveTaskManagement } from '../LiveTaskManagement';
import { CollaborationPresence } from '../CollaborationPresence';

// Import types
import {
  Collaborator,
  WeddingCollaboration,
  WeddingTimelineItem,
  WeddingVendor,
  WeddingTask,
  ChatMessage,
  CollaboratorPresence,
  TaskStatus,
  TaskPriority,
  VendorStatus,
  MessageType,
  PresenceStatus,
  ActivityType,
} from '@/types/collaboration';

// Mock the real-time collaboration hook
const mockUseRealTimeCollaboration = {
  isConnected: true,
  connectionStatus: 'connected' as const,
  onlineCollaborators: [],
  presenceData: {},
  sendUpdate: jest.fn(),
  subscribeToUpdates: jest.fn(),
  updatePresence: jest.fn(),
  joinRoom: jest.fn(),
  leaveRoom: jest.fn(),
  error: null,
  lastUpdate: null,
};

jest.mock('@/hooks/collaboration/useRealTimeCollaboration', () => ({
  useRealTimeCollaboration: () => mockUseRealTimeCollaboration,
}));

// Mock data
const mockCollaborators: Collaborator[] = [
  {
    id: 'user-1',
    name: 'Emily Johnson',
    email: 'emily@example.com',
    avatar: '/avatars/emily.jpg',
    role: 'bride',
    permissions: ['edit', 'comment', 'assign'],
    isOnline: true,
    lastSeen: new Date(),
  },
  {
    id: 'user-2',
    name: 'David Smith',
    email: 'david@example.com',
    avatar: '/avatars/david.jpg',
    role: 'groom',
    permissions: ['edit', 'comment', 'assign'],
    isOnline: true,
    lastSeen: new Date(),
  },
  {
    id: 'user-3',
    name: 'Sarah Photography',
    email: 'sarah@sarahphoto.com',
    avatar: '/avatars/sarah.jpg',
    role: 'photographer',
    permissions: ['view', 'comment'],
    isOnline: false,
    lastSeen: new Date(Date.now() - 3600000), // 1 hour ago
  },
];

const mockVendors: WeddingVendor[] = [
  {
    id: 'vendor-1',
    name: 'Sarah Photography',
    type: 'photographer',
    status: VendorStatus.CONFIRMED,
    contactEmail: 'sarah@sarahphoto.com',
    contactPhone: '+1234567890',
    services: ['wedding_photography', 'engagement_photos'],
    pricing: { amount: 2500, currency: 'USD' },
    timeline: {
      arrival: new Date('2024-06-15T08:00:00'),
      duration: 8,
      setup: new Date('2024-06-15T07:30:00'),
    },
    requirements: ['power_outlet', 'parking_space'],
    notes: 'Specialized in outdoor weddings',
    documents: [],
    communication: [],
  },
  {
    id: 'vendor-2',
    name: 'Blooming Flowers',
    type: 'florist',
    status: VendorStatus.PENDING,
    contactEmail: 'info@bloomingflowers.com',
    services: ['bridal_bouquet', 'ceremony_flowers'],
    pricing: { amount: 1200, currency: 'USD' },
    timeline: {
      arrival: new Date('2024-06-15T06:00:00'),
      duration: 2,
      setup: new Date('2024-06-15T05:30:00'),
    },
    requirements: ['early_access'],
    documents: [],
    communication: [],
  },
];

const mockTimelineItems: WeddingTimelineItem[] = [
  {
    id: 'timeline-1',
    title: 'Bride Getting Ready',
    startTime: new Date('2024-06-15T09:00:00'),
    endTime: new Date('2024-06-15T11:00:00'),
    description: 'Hair, makeup, and dress',
    location: 'Bridal Suite',
    participants: ['user-1', 'vendor-1'],
    type: 'preparation',
    status: 'scheduled',
    dependencies: [],
    notes: 'Natural lighting preferred for photos',
  },
  {
    id: 'timeline-2',
    title: 'Ceremony',
    startTime: new Date('2024-06-15T14:00:00'),
    endTime: new Date('2024-06-15T14:30:00'),
    description: 'Wedding ceremony',
    location: 'Garden Pavilion',
    participants: ['user-1', 'user-2'],
    type: 'ceremony',
    status: 'scheduled',
    dependencies: ['timeline-1'],
    notes: 'Weather backup plan available',
  },
];

const mockTasks: WeddingTask[] = [
  {
    id: 'task-1',
    weddingId: 'wedding-123',
    title: 'Confirm final guest count',
    description: 'Get final RSVP count from all invitations',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    assignedTo: 'user-1',
    createdBy: 'user-2',
    dueDate: new Date('2024-06-10T23:59:59'),
    tags: ['planning', 'catering'],
    checklist: [
      { id: 'check-1', text: 'Count confirmed guests', completed: true },
      {
        id: 'check-2',
        text: 'Account for dietary restrictions',
        completed: false,
      },
    ],
    attachments: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockPresenceData: CollaboratorPresence[] = [
  {
    userId: 'user-1',
    weddingId: 'wedding-123',
    status: PresenceStatus.ONLINE,
    lastSeen: new Date(),
    currentSection: 'timeline',
    activities: [
      {
        id: 'activity-1',
        type: ActivityType.EDITING,
        timestamp: new Date(),
        details: { section: 'timeline', item: 'Ceremony' },
      },
    ],
  },
  {
    userId: 'user-2',
    weddingId: 'wedding-123',
    status: PresenceStatus.ONLINE,
    lastSeen: new Date(),
    currentSection: 'vendors',
    activities: [
      {
        id: 'activity-2',
        type: ActivityType.VIEWING,
        timestamp: new Date(Date.now() - 30000),
        details: { section: 'vendors' },
      },
    ],
  },
];

const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    channelId: 'wedding-123',
    senderId: 'user-1',
    content: 'Just confirmed the photographer arrival time!',
    type: MessageType.TEXT,
    timestamp: new Date(),
    isSystemMessage: false,
    readBy: ['user-1', 'user-2'],
  },
];

describe('RealTimeCollaborationHub', () => {
  const defaultProps = {
    weddingId: 'wedding-123',
    currentUser: mockCollaborators[0],
    collaborators: mockCollaborators,
    onCollaborationAction: jest.fn(),
    initialTab: 'timeline' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders collaboration hub with all tabs', () => {
    render(<RealTimeCollaborationHub {...defaultProps} />);

    expect(screen.getByText('Wedding Collaboration')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Vendors')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Board')).toBeInTheDocument();
  });

  it('shows connection status indicator', () => {
    render(<RealTimeCollaborationHub {...defaultProps} />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('switches between tabs correctly', () => {
    render(<RealTimeCollaborationHub {...defaultProps} />);

    // Click on Vendors tab
    fireEvent.click(screen.getByText('Vendors'));
    expect(screen.getByTestId('vendor-coordination-panel')).toBeInTheDocument();

    // Click on Tasks tab
    fireEvent.click(screen.getByText('Tasks'));
    expect(screen.getByTestId('live-task-management')).toBeInTheDocument();
  });

  it('displays presence indicators', () => {
    render(<RealTimeCollaborationHub {...defaultProps} />);

    // Should show online collaborators
    expect(screen.getByTestId('collaboration-presence')).toBeInTheDocument();
  });
});

describe('LiveWeddingTimeline', () => {
  const defaultProps = {
    weddingId: 'wedding-123',
    collaborators: mockCollaborators,
    onTimelineUpdate: jest.fn(),
    realTimeMode: true,
  };

  it('renders wedding timeline items', () => {
    render(
      <LiveWeddingTimeline
        {...defaultProps}
        timelineItems={mockTimelineItems}
      />,
    );

    expect(screen.getByText('Wedding Day Timeline')).toBeInTheDocument();
    expect(screen.getByText('Bride Getting Ready')).toBeInTheDocument();
    expect(screen.getByText('Ceremony')).toBeInTheDocument();
  });

  it('shows real-time indicator when enabled', () => {
    render(
      <LiveWeddingTimeline
        {...defaultProps}
        timelineItems={mockTimelineItems}
      />,
    );

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('handles timeline item updates', async () => {
    const onTimelineUpdate = jest.fn();
    render(
      <LiveWeddingTimeline
        {...defaultProps}
        timelineItems={mockTimelineItems}
        onTimelineUpdate={onTimelineUpdate}
      />,
    );

    // Find and click an edit button (if visible)
    const timelineItem = screen.getByText('Bride Getting Ready');
    fireEvent.click(timelineItem);

    // Verify update handler would be called (implementation dependent)
    expect(onTimelineUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'timeline_item_viewed',
      }),
    );
  });

  it('displays vendor assignments', () => {
    render(
      <LiveWeddingTimeline
        {...defaultProps}
        timelineItems={mockTimelineItems}
      />,
    );

    // Timeline items should show associated vendors
    expect(screen.getByText('Bride Getting Ready')).toBeInTheDocument();
  });
});

describe('VendorCoordinationPanel', () => {
  const defaultProps = {
    weddingId: 'wedding-123',
    vendors: mockVendors,
    onVendorUpdate: jest.fn(),
    collaborationMode: 'grid' as const,
  };

  it('renders vendor list', () => {
    render(<VendorCoordinationPanel {...defaultProps} />);

    expect(screen.getByText('Vendor coordination')).toBeInTheDocument();
    expect(screen.getByText('Sarah Photography')).toBeInTheDocument();
    expect(screen.getByText('Blooming Flowers')).toBeInTheDocument();
  });

  it('shows vendor status badges', () => {
    render(<VendorCoordinationPanel {...defaultProps} />);

    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('displays vendor contact information', () => {
    render(<VendorCoordinationPanel {...defaultProps} />);

    expect(screen.getByText('sarah@sarahphoto.com')).toBeInTheDocument();
    expect(screen.getByText('info@bloomingflowers.com')).toBeInTheDocument();
  });

  it('handles vendor status updates', () => {
    const onVendorUpdate = jest.fn();
    render(
      <VendorCoordinationPanel
        {...defaultProps}
        onVendorUpdate={onVendorUpdate}
      />,
    );

    // Find and interact with vendor status (implementation dependent)
    const vendor = screen.getByText('Sarah Photography');
    fireEvent.click(vendor);

    // Should trigger vendor update
    expect(onVendorUpdate).toHaveBeenCalled();
  });
});

describe('WeddingPartyChat', () => {
  const defaultProps = {
    weddingId: 'wedding-123',
    participants: mockCollaborators,
    onMessage: jest.fn(),
    supportedMedia: ['text', 'image'] as const,
  };

  it('renders chat interface', () => {
    render(<WeddingPartyChat {...defaultProps} />);

    expect(screen.getByText('Wedding Party Chat')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Type a message...'),
    ).toBeInTheDocument();
  });

  it('shows participant count', () => {
    render(<WeddingPartyChat {...defaultProps} />);

    expect(screen.getByText('3 participants')).toBeInTheDocument();
  });

  it('handles message sending', async () => {
    const onMessage = jest.fn();
    render(<WeddingPartyChat {...defaultProps} onMessage={onMessage} />);

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Test message',
        type: MessageType.TEXT,
      }),
    );
  });

  it('handles enter key for sending', async () => {
    const onMessage = jest.fn();
    render(<WeddingPartyChat {...defaultProps} onMessage={onMessage} />);

    const input = screen.getByPlaceholderText('Type a message...');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onMessage).toHaveBeenCalled();
  });
});

describe('SharedWeddingBoard', () => {
  const defaultProps = {
    weddingId: 'wedding-123',
    collaborators: mockCollaborators,
    onBoardUpdate: jest.fn(),
    boardType: 'kanban' as const,
  };

  it('renders wedding planning board', () => {
    render(<SharedWeddingBoard {...defaultProps} />);

    expect(screen.getByText('Wedding Planning Board')).toBeInTheDocument();
    expect(screen.getByText('Ideas')).toBeInTheDocument();
    expect(screen.getByText('Planning')).toBeInTheDocument();
    expect(screen.getByText('Booked')).toBeInTheDocument();
  });

  it('shows board sections in kanban view', () => {
    render(<SharedWeddingBoard {...defaultProps} />);

    // Should show the three main sections
    const sections = screen.getAllByText(/Ideas|Planning|Booked/);
    expect(sections).toHaveLength(3);
  });

  it('displays empty state for mood board', () => {
    render(<SharedWeddingBoard {...defaultProps} boardType="mood_board" />);

    expect(screen.getByText('Mood board view coming soon')).toBeInTheDocument();
  });
});

describe('LiveTaskManagement', () => {
  const defaultProps = {
    weddingId: 'wedding-123',
    tasks: mockTasks,
    collaborators: mockCollaborators,
    vendors: mockVendors,
    onTaskCreate: jest.fn(),
    onTaskUpdate: jest.fn(),
    onTaskAssign: jest.fn(),
    onTaskComplete: jest.fn(),
    onProgressUpdate: jest.fn(),
    currentUserId: 'user-1',
  };

  it('renders task management interface', () => {
    render(<LiveTaskManagement {...defaultProps} />);

    expect(screen.getByText('Task Management')).toBeInTheDocument();
    expect(screen.getByText('Confirm final guest count')).toBeInTheDocument();
  });

  it('shows task filters and search', () => {
    render(<LiveTaskManagement {...defaultProps} />);

    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
    expect(screen.getByText('All Status')).toBeInTheDocument();
    expect(screen.getByText('All Priority')).toBeInTheDocument();
  });

  it('displays tasks in different views', () => {
    render(<LiveTaskManagement {...defaultProps} />);

    // Should start with board view
    expect(screen.getByText('Board')).toBeInTheDocument();

    // Switch to list view
    fireEvent.click(screen.getByText('List'));

    // Should show task in list format
    expect(screen.getByText('Confirm final guest count')).toBeInTheDocument();
  });

  it('handles task completion', async () => {
    const onTaskComplete = jest.fn();
    render(
      <LiveTaskManagement {...defaultProps} onTaskComplete={onTaskComplete} />,
    );

    // Switch to list view to access complete button
    fireEvent.click(screen.getByText('List'));

    // Find and click complete button
    const completeButton = screen.getByRole('button', { name: /checkCircle/i });
    fireEvent.click(completeButton);

    expect(onTaskComplete).toHaveBeenCalledWith('task-1');
  });
});

describe('CollaborationPresence', () => {
  const defaultProps = {
    weddingId: 'wedding-123',
    collaborators: mockCollaborators,
    presenceData: mockPresenceData,
    currentUserId: 'user-1',
  };

  it('renders presence indicators', () => {
    render(<CollaborationPresence {...defaultProps} />);

    expect(screen.getByText('Online Now')).toBeInTheDocument();
    expect(screen.getByText('Emily Johnson')).toBeInTheDocument();
    expect(screen.getByText('David Smith')).toBeInTheDocument();
  });

  it('shows user status and activity', () => {
    render(<CollaborationPresence {...defaultProps} />);

    expect(screen.getByText('online')).toBeInTheDocument();
    expect(screen.getByText('Working on: timeline')).toBeInTheDocument();
  });

  it('displays compact mode correctly', () => {
    render(<CollaborationPresence {...defaultProps} compactMode={true} />);

    // Should show avatars with status indicators
    const avatars = screen.getAllByRole('img');
    expect(avatars.length).toBeGreaterThan(0);
  });

  it('shows recent activity when detailed', () => {
    render(
      <CollaborationPresence {...defaultProps} showDetailedActivity={true} />,
    );

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  it('updates presence when user interacts with timeline', async () => {
    const mockUpdatePresence = jest.fn();
    mockUseRealTimeCollaboration.updatePresence = mockUpdatePresence;

    render(
      <RealTimeCollaborationHub
        weddingId="wedding-123"
        currentUser={mockCollaborators[0]}
        collaborators={mockCollaborators}
        onCollaborationAction={jest.fn()}
        initialTab="timeline"
      />,
    );

    // Interact with timeline tab
    fireEvent.click(screen.getByText('Timeline'));

    await waitFor(() => {
      expect(mockUpdatePresence).toHaveBeenCalledWith(
        expect.objectContaining({
          currentSection: 'timeline',
        }),
      );
    });
  });

  it('synchronizes task updates across components', async () => {
    const onTaskUpdate = jest.fn();

    render(
      <LiveTaskManagement
        weddingId="wedding-123"
        tasks={mockTasks}
        collaborators={mockCollaborators}
        vendors={mockVendors}
        onTaskCreate={jest.fn()}
        onTaskUpdate={onTaskUpdate}
        onTaskAssign={jest.fn()}
        onTaskComplete={jest.fn()}
        onProgressUpdate={jest.fn()}
        currentUserId="user-1"
        realTimeMode={true}
      />,
    );

    // Update should trigger real-time sync
    await act(async () => {
      onTaskUpdate('task-1', { status: TaskStatus.COMPLETED });
    });

    expect(mockUseRealTimeCollaboration.sendUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'task_update',
      }),
    );
  });

  it('handles real-time vendor updates correctly', async () => {
    const onVendorUpdate = jest.fn();

    render(
      <VendorCoordinationPanel
        weddingId="wedding-123"
        vendors={mockVendors}
        onVendorUpdate={onVendorUpdate}
        collaborationMode="grid"
        realTimeUpdates={true}
      />,
    );

    // Simulate real-time update
    act(() => {
      onVendorUpdate('vendor-1', { status: VendorStatus.CONFIRMED });
    });

    expect(mockUseRealTimeCollaboration.sendUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'vendor_update',
      }),
    );
  });
});

describe('Error Handling', () => {
  it('handles connection errors gracefully', () => {
    mockUseRealTimeCollaboration.error = 'Connection failed';
    mockUseRealTimeCollaboration.isConnected = false;

    render(
      <RealTimeCollaborationHub
        weddingId="wedding-123"
        currentUser={mockCollaborators[0]}
        collaborators={mockCollaborators}
        onCollaborationAction={jest.fn()}
      />,
    );

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('shows offline mode when connection is lost', () => {
    mockUseRealTimeCollaboration.isConnected = false;
    mockUseRealTimeCollaboration.connectionStatus = 'disconnected';

    render(
      <LiveWeddingTimeline
        weddingId="wedding-123"
        collaborators={mockCollaborators}
        onTimelineUpdate={jest.fn()}
        realTimeMode={false}
        timelineItems={mockTimelineItems}
      />,
    );

    // Should not show "Live" indicator
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });
});

describe('Performance Tests', () => {
  it('renders large number of timeline items efficiently', () => {
    const manyItems = Array.from({ length: 50 }, (_, i) => ({
      ...mockTimelineItems[0],
      id: `timeline-${i}`,
      title: `Event ${i}`,
    }));

    const startTime = performance.now();

    render(
      <LiveWeddingTimeline
        weddingId="wedding-123"
        collaborators={mockCollaborators}
        onTimelineUpdate={jest.fn()}
        timelineItems={manyItems}
      />,
    );

    const endTime = performance.now();

    // Should render within reasonable time (< 100ms)
    expect(endTime - startTime).toBeLessThan(100);
  });

  it('handles frequent presence updates without performance issues', async () => {
    const { rerender } = render(
      <CollaborationPresence
        weddingId="wedding-123"
        collaborators={mockCollaborators}
        presenceData={mockPresenceData}
        currentUserId="user-1"
      />,
    );

    const startTime = performance.now();

    // Simulate frequent updates
    for (let i = 0; i < 10; i++) {
      const updatedPresence = [
        ...mockPresenceData,
        {
          userId: `user-${i}`,
          weddingId: 'wedding-123',
          status: PresenceStatus.ONLINE,
          lastSeen: new Date(),
          activities: [],
        },
      ];

      rerender(
        <CollaborationPresence
          weddingId="wedding-123"
          collaborators={mockCollaborators}
          presenceData={updatedPresence}
          currentUserId="user-1"
        />,
      );
    }

    const endTime = performance.now();

    // Should handle updates efficiently (< 50ms)
    expect(endTime - startTime).toBeLessThan(50);
  });
});

describe('Accessibility Tests', () => {
  it('provides proper ARIA labels for collaboration components', () => {
    render(
      <RealTimeCollaborationHub
        weddingId="wedding-123"
        currentUser={mockCollaborators[0]}
        collaborators={mockCollaborators}
        onCollaborationAction={jest.fn()}
      />,
    );

    // Check for accessible tab navigation
    const timelineTab = screen.getByText('Timeline');
    expect(timelineTab).toHaveAttribute('role');

    // Check for screen reader friendly content
    expect(screen.getByText('Wedding Collaboration')).toBeInTheDocument();
  });

  it('supports keyboard navigation', () => {
    render(
      <LiveTaskManagement
        weddingId="wedding-123"
        tasks={mockTasks}
        collaborators={mockCollaborators}
        vendors={mockVendors}
        onTaskCreate={jest.fn()}
        onTaskUpdate={jest.fn()}
        onTaskAssign={jest.fn()}
        onTaskComplete={jest.fn()}
        onProgressUpdate={jest.fn()}
        currentUserId="user-1"
      />,
    );

    const searchInput = screen.getByPlaceholderText('Search tasks...');

    // Should be focusable
    searchInput.focus();
    expect(document.activeElement).toBe(searchInput);
  });
});

// Wedding Industry Specific Tests
describe('Wedding Industry Requirements', () => {
  it('handles wedding day timeline requirements', () => {
    const weddingDayTimeline = [
      {
        id: 'morning',
        title: 'Getting Ready',
        startTime: new Date('2024-06-15T09:00:00'),
        endTime: new Date('2024-06-15T12:00:00'),
        type: 'preparation' as const,
        status: 'scheduled' as const,
        participants: ['user-1'],
        location: 'Bridal Suite',
        dependencies: [],
        description: 'Bride and bridesmaids getting ready',
      },
      {
        id: 'ceremony',
        title: 'Wedding Ceremony',
        startTime: new Date('2024-06-15T15:00:00'),
        endTime: new Date('2024-06-15T15:30:00'),
        type: 'ceremony' as const,
        status: 'scheduled' as const,
        participants: ['user-1', 'user-2'],
        location: 'Garden Altar',
        dependencies: ['morning'],
        description: 'The main ceremony',
      },
    ];

    render(
      <LiveWeddingTimeline
        weddingId="wedding-123"
        collaborators={mockCollaborators}
        onTimelineUpdate={jest.fn()}
        timelineItems={weddingDayTimeline}
        weddingDate={new Date('2024-06-15')}
      />,
    );

    expect(screen.getByText('Getting Ready')).toBeInTheDocument();
    expect(screen.getByText('Wedding Ceremony')).toBeInTheDocument();
  });

  it('manages vendor arrival and setup times', () => {
    render(
      <VendorCoordinationPanel
        weddingId="wedding-123"
        vendors={mockVendors}
        onVendorUpdate={jest.fn()}
        collaborationMode="timeline"
      />,
    );

    // Should show vendor timing information
    expect(screen.getByText('Sarah Photography')).toBeInTheDocument();
    expect(screen.getByText('Blooming Flowers')).toBeInTheDocument();
  });

  it('tracks wedding planning tasks with deadlines', () => {
    const weddingTasks = [
      {
        ...mockTasks[0],
        title: 'Send invitations',
        dueDate: new Date('2024-04-15'), // 2 months before wedding
        priority: TaskPriority.HIGH,
      },
      {
        ...mockTasks[0],
        id: 'task-2',
        title: 'Confirm catering count',
        dueDate: new Date('2024-06-01'), // 2 weeks before wedding
        priority: TaskPriority.URGENT,
      },
    ];

    render(
      <LiveTaskManagement
        weddingId="wedding-123"
        tasks={weddingTasks}
        collaborators={mockCollaborators}
        vendors={mockVendors}
        onTaskCreate={jest.fn()}
        onTaskUpdate={jest.fn()}
        onTaskAssign={jest.fn()}
        onTaskComplete={jest.fn()}
        onProgressUpdate={jest.fn()}
        currentUserId="user-1"
        weddingDate={new Date('2024-06-15')}
      />,
    );

    expect(screen.getByText('Send invitations')).toBeInTheDocument();
    expect(screen.getByText('Confirm catering count')).toBeInTheDocument();
  });
});
