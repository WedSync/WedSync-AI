/**
 * NextAuth Configuration for WedSync
 * Provides authentication options for the wedding platform
 */

import { NextAuthOptions } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
// SENIOR CODE REVIEWER FIX: Use require for bcryptjs to avoid esModuleInterop issue
const bcrypt = require('bcryptjs');

// Supabase client for authentication
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    {
      id: 'supabase-credentials',
      name: 'Supabase Credentials',
      type: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        try {
          // Check user in Supabase auth
          const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({
              email: credentials.email,
              password: credentials.password,
            });

          if (authError || !authData.user) {
            throw new Error('Invalid credentials');
          }

          // Get user profile data
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          return {
            id: authData.user.id,
            email: authData.user.email!,
            name: profile?.full_name || authData.user.email!,
            organizationId: profile?.organization_id,
            role: profile?.role || 'user',
            isAdmin:
              profile?.role === 'admin' || profile?.role === 'platform_admin',
            image: profile?.avatar_url,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    },
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.organizationId = user.organizationId;
        token.role = user.role;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string;
        session.user.role = token.role as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    // SENIOR CODE REVIEWER FIX: Removed duplicate signIn property
  },

  events: {
    async signIn({ user, account, profile }) {
      // Track sign-in events for wedding business analytics
      console.log(`User signed in: ${user.email}`);
    },

    async signOut({ session, token }) {
      // Track sign-out events
      console.log(`User signed out: ${session?.user?.email || 'unknown'}`);
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

// Extend NextAuth types
declare module 'next-auth' {
  interface User {
    id: string;
    organizationId?: string;
    role?: string;
    isAdmin?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      organizationId?: string;
      role?: string;
      isAdmin?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    organizationId?: string;
    role?: string;
    isAdmin?: boolean;
  }
}
