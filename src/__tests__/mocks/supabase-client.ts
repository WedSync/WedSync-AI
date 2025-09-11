/**
 * Mock Supabase Client for Testing
 * Provides comprehensive mocking for all Supabase operations
 */

export const MockSupabaseClient = {
  // Database operations
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
        limit: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
      in: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
      gte: jest.fn().mockReturnValue({
        lt: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
      not: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    }),
    insert: jest.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }),
    upsert: jest.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }),
  }),

  // Authentication
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        },
      },
      error: null,
    }),
    getUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      },
      error: null,
    }),
    signIn: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({
      error: null,
    }),
  },

  // Storage
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: { path: 'test-file.jpg' },
        error: null,
      }),
      download: jest.fn().mockResolvedValue({
        data: new Blob(),
        error: null,
      }),
      remove: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      list: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }),
  },

  // Realtime
  channel: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnValue({
      unsubscribe: jest.fn(),
    }),
    send: jest.fn().mockResolvedValue('ok'),
  }),

  // RPC functions
  rpc: jest.fn().mockResolvedValue({
    data: null,
    error: null,
  }),
};

// Helper functions for setting up mock responses
export const MockSupabaseHelpers = {
  // Set up successful user profile response
  mockUserProfile: (profileData: any) => {
    MockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: profileData,
            error: null,
          }),
        }),
      }),
    });
  },

  // Set up database error
  mockDatabaseError: (errorMessage: string) => {
    MockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockRejectedValue(new Error(errorMessage)),
        }),
      }),
    });
  },

  // Set up authentication session
  mockAuthSession: (userId: string, email: string) => {
    MockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: userId, email },
        },
      },
      error: null,
    });
  },

  // Set up no authentication
  mockNoAuth: () => {
    MockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  },

  // Reset all mocks
  resetMocks: () => {
    jest.clearAllMocks();
  },
};
