'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  user_id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface ExtendedUser extends User {
  profile?: UserProfile;
  organization_id?: string;
}

export function useUser() {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial user
    getUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function getUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await loadUserProfile(user);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error getting user:', error);
      setLoading(false);
    }
  }

  async function loadUserProfile(user: User) {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        setUser({ ...user });
      } else {
        setUser({
          ...user,
          profile,
          organization_id: profile.organization_id,
        });
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      setUser({ ...user });
    } finally {
      setLoading(false);
    }
  }

  return { user, loading };
}
