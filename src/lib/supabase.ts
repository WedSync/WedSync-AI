import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Types for better type safety
export type SupabaseClient = typeof supabase;

// Helper functions for analytics
export async function getAnalyticsData(
  table: string,
  filters?: Record<string, any>,
) {
  try {
    let query = supabase.from(table).select('*');

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch analytics data:', error);
    throw error;
  }
}

// Real-time subscription helper
export function subscribeToAnalytics(
  table: string,
  callback: (payload: any) => void,
  filters?: Record<string, any>,
) {
  let channel = supabase.channel(`${table}-changes`);

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `${key}=eq.${value}`,
        },
        callback,
      );
    });
  } else {
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
      },
      callback,
    );
  }

  channel.subscribe();

  return () => {
    channel.unsubscribe();
  };
}

// Auth helpers
export async function getCurrentUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Failed to sign out:', error);
    throw error;
  }
}
