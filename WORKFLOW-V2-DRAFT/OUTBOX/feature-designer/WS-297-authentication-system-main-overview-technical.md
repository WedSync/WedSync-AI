# WS-297: Authentication System - Main Overview - Technical Specification

## Feature Overview
**Feature ID:** WS-297  
**Feature Name:** Authentication System - Main Overview  
**Feature Type:** Technical Architecture  
**Priority:** P0 - Critical (Security & Platform Foundation)  
**Estimated Effort:** 8 person-weeks  

## User Stories

### Primary User Stories

#### US-297-001: Wedding Photographer Registration & Login
**As a** professional wedding photographer  
**I want to** create an account with my business information and securely access the WedSync platform  
**So that I can** manage my clients and wedding planning workflow with confidence that my data is protected

**Acceptance Criteria:**
- I can register with email, business name, and business type
- My password must meet security requirements (8+ characters, mixed case, numbers)
- I receive an email verification link within 2 minutes
- After verification, I can log in and access my dashboard
- My business profile is automatically created with trial subscription (30 days)

**Example Scenario:**
Sarah owns "Captured Moments Photography" and needs to register for WedSync. She enters her business email, creates a secure password, selects "Photographer" as business type, and receives verification email to sarah@capturedmomentsphoto.com. After clicking verification link, she can log into her photographer dashboard.

#### US-297-002: Couple Social Login for WedMe
**As an** engaged couple planning our wedding  
**I want to** quickly sign up for WedMe using my Google/Apple account  
**So that I can** start coordinating with our vendors without creating another password

**Acceptance Criteria:**
- We can sign up/login with Google or Apple OAuth
- Our profile shows us as a "couple" user type
- We're automatically routed to the WedMe couple dashboard
- Our basic profile info (names, email) is pre-filled from social provider
- Invitation tracking works when we sign up via referral link

**Example Scenario:**
Emma and Jake are engaged and received a WedMe invitation link from their photographer. They click "Continue with Google" and both their Gmail accounts are linked to a shared couple profile, immediately accessing their wedding planning dashboard.

#### US-297-003: Secure Session Management
**As any** authenticated user (supplier or couple)  
**I want my** session to remain secure and automatically refresh  
**So that I can** work uninterrupted while maintaining platform security

**Acceptance Criteria:**
- Sessions last 1 week with automatic refresh on activity
- I'm automatically logged out after 30 minutes of inactivity on shared devices
- My authentication state persists across browser tabs
- I can explicitly "log out everywhere" if needed
- Failed login attempts are rate limited (5 attempts per 15 minutes)

**Example Scenario:**
Vendor Lisa works on wedding plans throughout the week. Her session refreshes automatically when active, but times out for security when she leaves her laptop unattended at a coffee shop.

#### US-297-004: Magic Link Passwordless Access
**As a** supplier who frequently switches devices  
**I want to** log in using magic links sent to my email  
**So that I can** quickly access WedSync without remembering passwords on different devices

**Acceptance Criteria:**
- I can request magic link instead of entering password
- Link arrives within 30 seconds and expires after 10 minutes
- One-time use links that become invalid after successful login
- Magic links work from any device/browser
- My login method preference is remembered

**Example Scenario:**
DJ Marcus needs to access WedSync from his mobile phone during a wedding venue visit. He enters his email, receives magic link, clicks it, and immediately accesses his supplier dashboard without typing passwords on mobile.

## Database Schema

### Authentication Tables

```sql
-- Extend Supabase auth.users metadata
-- This uses Supabase built-in auth table with custom metadata

-- Custom profiles table for additional auth data
CREATE TABLE IF NOT EXISTS auth_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_type user_type_enum NOT NULL,
    business_name VARCHAR(200),
    business_type supplier_business_type_enum,
    couple_names JSONB, -- {"partner1": "Emma", "partner2": "Jake"}
    phone_number VARCHAR(20),
    referral_source VARCHAR(100),
    onboarding_step INTEGER DEFAULT 1,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    marketing_consent BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMPTZ,
    privacy_policy_accepted_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login_at TIMESTAMPTZ,
    account_locked_until TIMESTAMPTZ,
    remember_device BOOLEAN DEFAULT FALSE,
    preferred_login_method VARCHAR(20) DEFAULT 'email', -- 'email', 'google', 'apple', 'magic_link'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Authentication sessions tracking
CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_token VARCHAR(500) NOT NULL,
    device_info JSONB, -- User agent, IP, device fingerprint
    ip_address INET,
    location_data JSONB, -- City, country from IP
    login_method VARCHAR(20), -- 'password', 'google', 'apple', 'magic_link'
    remember_me BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Authentication audit log
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'signup', 'password_reset', 'failed_login'
    event_details JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    risk_score INTEGER DEFAULT 0, -- 0-100 suspicious activity score
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Magic links tracking
CREATE TABLE IF NOT EXISTS magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS auth_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    email VARCHAR(255),
    attempt_type VARCHAR(50) NOT NULL, -- 'login', 'signup', 'magic_link'
    attempts INTEGER DEFAULT 1,
    blocked_until TIMESTAMPTZ,
    first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ip_address, email, attempt_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_profiles_user_id ON auth_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_profiles_user_type ON auth_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active ON auth_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_event_type ON auth_audit_log(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links(expires_at) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON auth_rate_limits(ip_address, email);

-- RLS Policies
ALTER TABLE auth_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profiles
CREATE POLICY "Users can view own auth profile" ON auth_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own auth profile" ON auth_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Sessions policy
CREATE POLICY "Users can view own sessions" ON auth_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Audit log - users can view their own, admins can view all
CREATE POLICY "Users can view own auth audit" ON auth_audit_log
    FOR SELECT USING (auth.uid() = user_id OR is_admin());
```

### Enums

```sql
CREATE TYPE user_type_enum AS ENUM ('supplier', 'couple', 'admin');

CREATE TYPE supplier_business_type_enum AS ENUM (
    'photographer',
    'videographer',
    'venue',
    'caterer',
    'florist',
    'dj',
    'band',
    'planner',
    'decorator',
    'transportation',
    'other'
);
```

## API Endpoints

### Authentication Endpoints

```typescript
// POST /api/auth/signup
interface SignupRequest {
  email: string;
  password: string;
  user_type: 'supplier' | 'couple';
  business_name?: string;
  business_type?: string;
  couple_names?: { partner1: string; partner2: string };
  referral_code?: string;
  marketing_consent?: boolean;
}

interface SignupResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    user_type: string;
    email_verified: boolean;
  };
  message: string;
}

// POST /api/auth/login
interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

interface LoginResponse {
  success: boolean;
  user: AuthUser;
  session: AuthSession;
  redirect_url: string;
}

// POST /api/auth/oauth/google
interface OAuthRequest {
  user_type: 'supplier' | 'couple';
  referral_code?: string;
}

// POST /api/auth/magic-link
interface MagicLinkRequest {
  email: string;
}

interface MagicLinkResponse {
  success: boolean;
  message: string;
}

// POST /api/auth/verify-magic-link
interface VerifyMagicLinkRequest {
  token: string;
  remember_me?: boolean;
}

// POST /api/auth/logout
interface LogoutRequest {
  all_devices?: boolean;
}

// GET /api/auth/session
interface SessionResponse {
  authenticated: boolean;
  user?: AuthUser;
  session?: AuthSession;
}

// POST /api/auth/refresh
interface RefreshResponse {
  success: boolean;
  session: AuthSession;
}

// POST /api/auth/forgot-password
interface ForgotPasswordRequest {
  email: string;
}

// POST /api/auth/reset-password
interface ResetPasswordRequest {
  token: string;
  password: string;
}
```

### Security Endpoints

```typescript
// GET /api/auth/sessions
interface UserSessionsResponse {
  sessions: Array<{
    id: string;
    device_info: any;
    ip_address: string;
    location: string;
    last_activity: string;
    is_current: boolean;
  }>;
}

// DELETE /api/auth/sessions/:id
interface RevokeSessionResponse {
  success: boolean;
  message: string;
}

// GET /api/auth/audit-log
interface AuditLogResponse {
  events: Array<{
    event_type: string;
    timestamp: string;
    ip_address: string;
    success: boolean;
    details: any;
  }>;
  pagination: PaginationInfo;
}
```

## Frontend Components

### Core Auth Provider

```typescript
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthProfile {
  id: string;
  user_type: 'supplier' | 'couple';
  business_name?: string;
  business_type?: string;
  couple_names?: { partner1: string; partner2: string };
  onboarding_step: number;
  email_verified: boolean;
  phone_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: AuthProfile | null;
  session: Session | null;
  loading: boolean;
  signUp: (data: SignupRequest) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  signInWithOAuth: (provider: 'google' | 'apple', userType: 'supplier' | 'couple') => Promise<void>;
  sendMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: (allDevices?: boolean) => Promise<void>;
  refreshSession: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session && !error) {
        setSession(session);
        setUser(session.user);
        await loadUserProfile(session.user.id);
      }
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session);
        
        if (session) {
          setSession(session);
          setUser(session.user);
          await loadUserProfile(session.user.id);
          
          // Route to appropriate dashboard
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            const userType = session.user.user_metadata?.user_type;
            const dashboardUrl = userType === 'couple' ? '/wedme' : '/dashboard';
            router.push(dashboardUrl);
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          if (event === 'SIGNED_OUT') {
            router.push('/');
          }
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('auth_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (data && !error) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const signUp = async (signupData: SignupRequest) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            user_type: signupData.user_type,
            business_name: signupData.business_name,
            business_type: signupData.business_type,
            couple_names: signupData.couple_names,
            referral_code: signupData.referral_code,
            marketing_consent: signupData.marketing_consent
          }
        }
      });

      if (error) throw error;

      // Track signup event
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'user_signup',
          user_type: signupData.user_type,
          business_type: signupData.business_type,
          referral_code: signupData.referral_code
        })
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Update remember me preference
      if (rememberMe) {
        await supabase
          .from('auth_profiles')
          .update({ remember_device: true })
          .eq('user_id', data.user.id);
      }

      // Track login event
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'user_login',
          method: 'email'
        })
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'apple', userType: 'supplier' | 'couple') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          user_type: userType
        }
      }
    });

    if (error) throw error;
  };

  const sendMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async (allDevices: boolean = false) => {
    if (allDevices) {
      // Revoke all sessions via API
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all_devices: true })
      });
    }
    
    await supabase.auth.signOut();
  };

  const refreshSession = async () => {
    await supabase.auth.refreshSession();
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    sendMagicLink,
    signOut,
    refreshSession,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Auth Components

```typescript
// components/auth/SignupForm.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface SignupFormProps {
  userType: 'supplier' | 'couple';
  referralCode?: string;
}

export function SignupForm({ userType, referralCode }: SignupFormProps) {
  const { signUp, signInWithOAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    business_name: '',
    business_type: 'photographer',
    couple_names: { partner1: '', partner2: '' },
    marketing_consent: false,
    terms_accepted: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.terms_accepted) {
      setError('Please accept the terms and conditions');
      return;
    }

    setLoading(true);
    setError(null);

    const signupData = {
      email: formData.email,
      password: formData.password,
      user_type: userType,
      referral_code: referralCode,
      marketing_consent: formData.marketing_consent,
      ...(userType === 'supplier' && {
        business_name: formData.business_name,
        business_type: formData.business_type
      }),
      ...(userType === 'couple' && {
        couple_names: formData.couple_names
      })
    };

    const result = await signUp(signupData);
    if (!result.success) {
      setError(result.error || 'Signup failed');
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 border rounded-lg">
      <h2 className="text-2xl font-bold mb-6">
        {userType === 'supplier' ? 'Join WedSync' : 'Join WedMe'}
      </h2>

      {/* OAuth Buttons */}
      <div className="space-y-2 mb-6">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signInWithOAuth('google', userType)}
        >
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signInWithOAuth('apple', userType)}
        >
          Continue with Apple
        </Button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {userType === 'supplier' ? (
          <>
            <div>
              <Input
                type="text"
                placeholder="Business Name"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Select
                value={formData.business_type}
                onValueChange={(value) => setFormData({ ...formData, business_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photographer">Photography</SelectItem>
                  <SelectItem value="videographer">Videography</SelectItem>
                  <SelectItem value="venue">Venue</SelectItem>
                  <SelectItem value="caterer">Catering</SelectItem>
                  <SelectItem value="florist">Florist</SelectItem>
                  <SelectItem value="dj">DJ</SelectItem>
                  <SelectItem value="band">Live Music</SelectItem>
                  <SelectItem value="planner">Wedding Planner</SelectItem>
                  <SelectItem value="decorator">Decorator</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="text"
              placeholder="Partner 1 Name"
              value={formData.couple_names.partner1}
              onChange={(e) => setFormData({ 
                ...formData, 
                couple_names: { ...formData.couple_names, partner1: e.target.value }
              })}
              required
            />
            <Input
              type="text"
              placeholder="Partner 2 Name"
              value={formData.couple_names.partner2}
              onChange={(e) => setFormData({ 
                ...formData, 
                couple_names: { ...formData.couple_names, partner2: e.target.value }
              })}
              required
            />
          </div>
        )}

        <div>
          <Input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        <div>
          <Input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
        </div>

        <div>
          <Input
            type="password"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="marketing"
            checked={formData.marketing_consent}
            onCheckedChange={(checked) => setFormData({ ...formData, marketing_consent: checked as boolean })}
          />
          <label htmlFor="marketing" className="text-sm">
            Send me wedding tips and product updates
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={formData.terms_accepted}
            onCheckedChange={(checked) => setFormData({ ...formData, terms_accepted: checked as boolean })}
            required
          />
          <label htmlFor="terms" className="text-sm">
            I agree to the Terms of Service and Privacy Policy
          </label>
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>
    </div>
  );
}

// components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

export function LoginForm() {
  const { signIn, sendMagicLink, signInWithOAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember_me: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn(formData.email, formData.password, formData.remember_me);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
    
    setLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await sendMagicLink(formData.email);
    if (result.success) {
      setMagicLinkSent(true);
    } else {
      setError(result.error || 'Failed to send magic link');
    }

    setLoading(false);
  };

  if (magicLinkSent) {
    return (
      <div className="max-w-md mx-auto p-6 border rounded-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
        <p className="text-muted-foreground mb-4">
          We've sent a magic link to {formData.email}. Click the link to log in.
        </p>
        <Button
          variant="outline"
          onClick={() => setMagicLinkSent(false)}
        >
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 border rounded-lg">
      <h2 className="text-2xl font-bold mb-6">Welcome Back</h2>

      {/* OAuth Buttons */}
      <div className="space-y-2 mb-6">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signInWithOAuth('google', 'supplier')}
        >
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signInWithOAuth('apple', 'supplier')}
        >
          Continue with Apple
        </Button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      {showMagicLink ? (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setShowMagicLink(false)}
          >
            Back to Password Login
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <Input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={formData.remember_me}
                onCheckedChange={(checked) => setFormData({ ...formData, remember_me: checked as boolean })}
              />
              <label htmlFor="remember" className="text-sm">
                Remember me
              </label>
            </div>
            <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setShowMagicLink(true)}
          >
            Use Magic Link Instead
          </Button>
        </form>
      )}
    </div>
  );
}
```

## MCP Server Usage

### Required MCP Servers

1. **Supabase MCP** - For authentication operations
   - User management and authentication
   - Database operations for auth tables
   - Row Level Security policy management

2. **PostgreSQL MCP** - For direct database operations
   - Complex queries for auth audit logs
   - Performance monitoring of auth tables
   - Migration management for auth schema

### Implementation Priority

**Phase 1 (Week 1-2): Core Authentication**
- Supabase Auth setup and configuration
- Basic email/password authentication
- User registration and login flows
- Database schema creation

**Phase 2 (Week 3-4): Enhanced Features**
- OAuth providers (Google, Apple)
- Magic link authentication
- Session management and security
- Rate limiting and audit logging

**Phase 3 (Week 5-6): Security & Optimization**
- Advanced security features
- Performance optimization
- Monitoring and alerting
- Testing and validation

## Test Requirements

### Unit Tests

```typescript
// __tests__/auth/auth-provider.test.ts
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

describe('AuthProvider', () => {
  test('handles user signup successfully', async () => {
    const TestComponent = () => {
      const { signUp } = useAuth();
      return (
        <button onClick={() => signUp({
          email: 'test@example.com',
          password: 'password123',
          user_type: 'supplier',
          business_name: 'Test Business',
          business_type: 'photographer'
        })}>
          Sign Up
        </button>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const button = screen.getByText('Sign Up');
    await userEvent.click(button);

    await waitFor(() => {
      // Assert successful signup
    });
  });

  test('handles login with remember me', async () => {
    // Test login functionality with remember device
  });

  test('sends magic link correctly', async () => {
    // Test magic link generation and sending
  });
});

// __tests__/auth/signup-form.test.ts
describe('SignupForm', () => {
  test('validates supplier signup form', () => {
    // Test supplier-specific form validation
  });

  test('validates couple signup form', () => {
    // Test couple-specific form validation
  });

  test('shows appropriate error messages', () => {
    // Test error handling and display
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/auth-flow.test.ts
describe('Authentication Flow', () => {
  test('complete supplier signup and login flow', async () => {
    // Test end-to-end supplier authentication
  });

  test('OAuth login flow', async () => {
    // Test Google/Apple OAuth integration
  });

  test('magic link authentication flow', async () => {
    // Test passwordless authentication
  });

  test('session management and refresh', async () => {
    // Test session persistence and refresh
  });
});
```

### Security Tests

```typescript
// __tests__/security/auth-security.test.ts
describe('Authentication Security', () => {
  test('rate limiting blocks excessive attempts', () => {
    // Test login attempt rate limiting
  });

  test('passwords meet security requirements', () => {
    // Test password strength validation
  });

  test('sessions expire appropriately', () => {
    // Test session timeout behavior
  });

  test('audit log captures all events', () => {
    // Test comprehensive audit logging
  });
});
```

## Acceptance Criteria

### Functional Requirements
- ✅ Users can register with email/password or OAuth (Google/Apple)
- ✅ Separate registration flows for suppliers vs couples
- ✅ Email verification required before full access
- ✅ Magic link authentication available as alternative
- ✅ Sessions persist across browser tabs and refresh automatically
- ✅ Users can log out from current device or all devices
- ✅ Password reset functionality via email
- ✅ Remember device option for convenient access

### Security Requirements
- ✅ Passwords must meet complexity requirements (8+ characters)
- ✅ Rate limiting prevents brute force attacks (5 attempts/15 min)
- ✅ All authentication events are audit logged
- ✅ Sessions have appropriate timeouts (1 week with activity refresh)
- ✅ Magic links are single-use and time-limited (10 minutes)
- ✅ OAuth tokens are securely stored and refreshed
- ✅ User data isolation via Row Level Security

### Performance Requirements
- ✅ Login completes within 2 seconds under normal load
- ✅ Registration process completes within 3 seconds
- ✅ Magic link delivery within 30 seconds
- ✅ Session refresh is transparent to user
- ✅ Auth state changes propagate across tabs instantly

### Business Requirements
- ✅ Referral tracking for viral growth attribution
- ✅ User type correctly determines post-login routing
- ✅ Trial subscriptions automatically created for suppliers
- ✅ Marketing consent captured during registration
- ✅ Terms acceptance required and timestamped

### Technical Requirements
- ✅ Supabase Auth integration with custom metadata
- ✅ Next.js 15 App Router compatibility
- ✅ TypeScript type safety throughout
- ✅ Responsive design for all form factors
- ✅ Error handling with user-friendly messages
- ✅ Loading states for all async operations

## Effort Estimation

**Team B (Backend): 4 weeks**
- Database schema and RLS policies (1 week)
- API endpoint implementation (2 weeks)
- Security features and audit logging (1 week)

**Team A (Frontend): 3 weeks**
- Auth provider and context setup (1 week)
- Form components and UI flows (1.5 weeks)
- Integration and error handling (0.5 weeks)

**Team C (DevOps): 1 week**
- Supabase Auth configuration
- Environment setup and secrets management
- Monitoring and alerting setup

**Total Effort: 5 person-weeks** (with parallel development)

## Dependencies

**Critical Dependencies:**
- Supabase project setup and configuration
- Environment variables and secrets management
- Email service provider configuration (Resend)
- OAuth provider registration (Google, Apple)

**Integration Dependencies:**
- User profiles and organization setup
- Subscription management system
- Analytics and tracking infrastructure
- Monitoring and logging services

## Risk Assessment

**High Risk:**
- OAuth provider configuration complexity
- Rate limiting implementation accuracy
- Session management across multiple tabs

**Medium Risk:**
- Magic link delivery reliability
- Password strength validation edge cases
- Audit log performance at scale

**Mitigation:**
- Thorough testing of OAuth flows in staging
- Load testing of rate limiting logic
- Monitoring of email delivery rates
- Performance testing of auth tables

---

**Specification Completed:** 2025-01-20  
**Next Review:** 2025-01-27  
**Version:** 1.0