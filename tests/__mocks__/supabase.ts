import { vi } from 'vitest';

export const createMockSupabaseClient = () => {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-id', name: 'Test' },
            error: null,
          }),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'test-id', name: 'Test' },
            error: null,
          }),
        }),
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
      insert: vi.fn().mockResolvedValue({
        data: { id: 'test-id' },
        error: null,
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'test-id' },
          error: null,
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
      upsert: vi.fn().mockResolvedValue({
        data: { id: 'test-id' },
        error: null,
      }),
    }),
  };
};

export const mockSupabaseService = {
  createServerClient: vi.fn().mockImplementation(() => createMockSupabaseClient()),
};