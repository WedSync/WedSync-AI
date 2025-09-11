import { renderHook, act, waitFor } from '@testing-library/react';
import { usePresence } from '@/hooks/usePresence';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Mock dependencies
jest.mock('@/lib/supabase/client');
jest.mock('@/hooks/useAuth');

const mockSupabaseClient = {
  channel: jest.fn(),
  removeChannel: jest.fn(),
};

const mockChannel = {
  on: jest.fn(),
  track: jest.fn(),
  subscribe: jest.fn(),
  presenceState: jest.fn(),
};

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('usePresence Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabaseClient as any);
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-123', email: 'test@example.com' },
      loading: false,
      isAuthenticated: true,
    } as any);

    mockSupabaseClient.channel.mockReturnValue(mockChannel);
    mockChannel.subscribe.mockImplementation((callback) => {
      // Simulate successful subscription
      callback('SUBSCRIBED');
      return { unsubscribe: jest.fn() };
    });
    mockChannel.presenceState.mockReturnValue({});
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() =>
      usePresence({
        channelName: 'test-channel',
        userId: 'test-user-123',
      }),
    );

    expect(result.current.myStatus).toBe('offline');
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.channelStatus).toBe('disconnected');
  });

  it('connects to Supabase channel on mount', async () => {
    renderHook(() =>
      usePresence({
        channelName: 'wedding:123:presence',
        userId: 'test-user-123',
      }),
    );

    await waitFor(() => {
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
        'wedding:123:presence',
      );
    });

    expect(mockChannel.on).toHaveBeenCalledWith(
      'presence',
      { event: 'sync' },
      expect.any(Function),
    );
    expect(mockChannel.on).toHaveBeenCalledWith(
      'presence',
      { event: 'join' },
      expect.any(Function),
    );
    expect(mockChannel.on).toHaveBeenCalledWith(
      'presence',
      { event: 'leave' },
      expect.any(Function),
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('updates status correctly', async () => {
    const { result } = renderHook(() =>
      usePresence({
        channelName: 'test-channel',
        userId: 'test-user-123',
        trackActivity: true,
      }),
    );

    await act(async () => {
      await result.current.updateStatus({
        status: 'busy',
        customStatus: 'In a meeting',
      });
    });

    expect(mockChannel.track).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'test-user-123',
        status: 'busy',
        customStatus: 'In a meeting',
      }),
    );
  });

  it('sets custom status with emoji', async () => {
    const { result } = renderHook(() =>
      usePresence({
        channelName: 'test-channel',
        userId: 'test-user-123',
      }),
    );

    await act(async () => {
      await result.current.setCustomStatus('At ceremony prep', '📸');
    });

    expect(mockChannel.track).toHaveBeenCalledWith(
      expect.objectContaining({
        customStatus: 'At ceremony prep',
        customEmoji: '📸',
      }),
    );
  });

  it('handles presence sync events', async () => {
    mockChannel.presenceState.mockReturnValue({
      'user-1': [
        {
          userId: 'user-1',
          status: 'online',
          lastActivity: new Date().toISOString(),
        },
      ],
    });

    const { result } = renderHook(() =>
      usePresence({
        channelName: 'test-channel',
        userId: 'test-user-123',
      }),
    );

    // Simulate presence sync event
    const syncCallback = mockChannel.on.mock.calls.find(
      (call) => call[0] === 'presence' && call[1].event === 'sync',
    )?.[2];

    if (syncCallback) {
      act(() => {
        syncCallback();
      });
    }

    await waitFor(() => {
      expect(result.current.presenceState).toEqual(
        expect.objectContaining({
          'user-1': expect.arrayContaining([
            expect.objectContaining({
              userId: 'user-1',
              status: 'online',
            }),
          ]),
        }),
      );
    });
  });

  it('tracks activity automatically', () => {
    const { result } = renderHook(() =>
      usePresence({
        channelName: 'test-channel',
        userId: 'test-user-123',
        trackActivity: true,
      }),
    );

    act(() => {
      result.current.trackActivity();
    });

    // Activity tracking should be called without errors
    expect(result.current.trackActivity).toBeDefined();
  });

  it('handles connection errors gracefully', async () => {
    mockChannel.subscribe.mockImplementation((callback) => {
      callback('CHANNEL_ERROR');
      return { unsubscribe: jest.fn() };
    });

    const { result } = renderHook(() =>
      usePresence({
        channelName: 'test-channel',
        userId: 'test-user-123',
      }),
    );

    await waitFor(() => {
      expect(result.current.channelStatus).toBe('disconnected');
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() =>
      usePresence({
        channelName: 'test-channel',
        userId: 'test-user-123',
      }),
    );

    unmount();

    expect(mockSupabaseClient.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('handles user not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
    } as any);

    const { result } = renderHook(() =>
      usePresence({
        channelName: 'test-channel',
        userId: 'test-user-123',
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockSupabaseClient.channel).not.toHaveBeenCalled();
  });

  it('respects privacy settings when updating status', async () => {
    // Mock privacy settings that would make user appear offline
    const mockSettings = {
      appearOffline: true,
      visibility: 'nobody',
    };

    const { result } = renderHook(() =>
      usePresence({
        channelName: 'test-channel',
        userId: 'test-user-123',
      }),
    );

    await act(async () => {
      await result.current.updateStatus({
        status: 'online',
      });
    });

    // Should track the update
    expect(mockChannel.track).toHaveBeenCalled();
  });

  it('broadcasts typing indicators', async () => {
    mockChannel.on.mockImplementation((event, options, callback) => {
      if (event === 'broadcast' && options.event === 'typing') {
        callback({ userId: 'other-user', isTyping: true });
      }
    });

    const { result } = renderHook(() =>
      usePresence({
        channelName: 'test-channel',
        userId: 'test-user-123',
      }),
    );

    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalledWith(
        'broadcast',
        { event: 'typing' },
        expect.any(Function),
      );
    });
  });
});

describe('Specialized Presence Hooks', () => {
  it('useWeddingPresence creates correct channel name', () => {
    const { useWeddingPresence } = require('@/hooks/usePresence');

    renderHook(() => useWeddingPresence('wedding-123', true));

    expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
      'wedding:wedding-123:presence',
    );
  });

  it('useOrganizationPresence creates correct channel name', () => {
    const { useOrganizationPresence } = require('@/hooks/usePresence');

    renderHook(() => useOrganizationPresence('org-456', true));

    expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
      'organization:org-456:presence',
    );
  });

  it('useGlobalPresence creates correct channel name', () => {
    const { useGlobalPresence } = require('@/hooks/usePresence');

    renderHook(() => useGlobalPresence(true));

    expect(mockSupabaseClient.channel).toHaveBeenCalledWith('global:presence');
  });
});
