/**
 * Demo Auth Provider
 * 
 * Dev-only authentication strategy that simulates real auth
 * by storing demo profile data in localStorage and providing
 * the same user context as Supabase auth.
 */

import { isDemoMode, validateDemoMode, getPersonaById, type DemoPersona } from './config';

// Demo session interface matching Supabase auth structure
export interface DemoSession {
  user: {
    id: string;
    email: string;
    user_metadata: {
      name: string;
      company?: string;
      role: string;
      type: string;
      permissions: string[];
      colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
      };
      metadata?: any;
    };
  };
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// Demo auth class
export class DemoAuth {
  private static instance: DemoAuth;
  private currentSession: DemoSession | null = null;
  private listeners: ((session: DemoSession | null) => void)[] = [];

  constructor() {
    // Validate demo mode on instantiation
    validateDemoMode();
    
    if (!isDemoMode()) {
      throw new Error('Demo auth can only be used in demo mode');
    }

    // Load existing session from localStorage
    this.loadSession();
  }

  static getInstance(): DemoAuth {
    if (!DemoAuth.instance) {
      DemoAuth.instance = new DemoAuth();
    }
    return DemoAuth.instance;
  }

  // Load session from localStorage
  private loadSession(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('demo_session');
      if (stored) {
        const session = JSON.parse(stored);
        // Validate session hasn't expired
        if (session.expires_at > Date.now()) {
          this.currentSession = session;
        } else {
          localStorage.removeItem('demo_session');
        }
      }
    } catch (error) {
      console.warn('Failed to load demo session:', error);
      localStorage.removeItem('demo_session');
    }
  }

  // Save session to localStorage
  private saveSession(session: DemoSession | null): void {
    if (typeof window === 'undefined') return;

    if (session) {
      localStorage.setItem('demo_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('demo_session');
    }
  }

  // Sign in with demo persona
  async signIn(personaId: string): Promise<{ data: { session: DemoSession | null }, error: any }> {
    try {
      const persona = getPersonaById(personaId);
      if (!persona) {
        return {
          data: { session: null },
          error: { message: `Demo persona '${personaId}' not found` }
        };
      }

      const session: DemoSession = {
        user: {
          id: persona.id,
          email: persona.email,
          user_metadata: {
            name: persona.name,
            company: persona.company,
            role: persona.role || persona.type,
            type: persona.type,
            permissions: persona.permissions,
            colors: persona.colors,
            metadata: persona.metadata
          }
        },
        access_token: `demo_token_${persona.id}_${Date.now()}`,
        refresh_token: `demo_refresh_${persona.id}_${Date.now()}`,
        expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };

      this.currentSession = session;
      this.saveSession(session);
      this.notifyListeners(session);

      return { data: { session }, error: null };
    } catch (error) {
      return {
        data: { session: null },
        error: { message: 'Failed to sign in with demo persona' }
      };
    }
  }

  // Sign out
  async signOut(): Promise<{ error: any }> {
    try {
      this.currentSession = null;
      this.saveSession(null);
      this.notifyListeners(null);
      return { error: null };
    } catch (error) {
      return { error: { message: 'Failed to sign out' } };
    }
  }

  // Get current session
  getSession(): { data: { session: DemoSession | null }, error: any } {
    return {
      data: { session: this.currentSession },
      error: null
    };
  }

  // Get current user
  getUser(): { data: { user: DemoSession['user'] | null }, error: any } {
    return {
      data: { user: this.currentSession?.user || null },
      error: null
    };
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback: (session: DemoSession | null) => void): { data: { subscription: { unsubscribe: () => void } } } {
    this.listeners.push(callback);
    
    // Call immediately with current session
    callback(this.currentSession);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
              this.listeners.splice(index, 1);
            }
          }
        }
      }
    };
  }

  // Notify all listeners of session changes
  private notifyListeners(session: DemoSession | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(session);
      } catch (error) {
        console.warn('Demo auth listener error:', error);
      }
    });
  }

  // Check if user has permission
  hasPermission(permission: string): boolean {
    if (!this.currentSession) return false;
    
    const permissions = this.currentSession.user.user_metadata.permissions;
    return permissions.includes(permission) || permissions.includes('admin_all');
  }

  // Get user role
  getUserRole(): string | null {
    return this.currentSession?.user.user_metadata.role || null;
  }

  // Get user type
  getUserType(): string | null {
    return this.currentSession?.user.user_metadata.type || null;
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.getUserType() === 'admin';
  }

  // Check if user is supplier
  isSupplier(): boolean {
    return this.getUserType() === 'supplier';
  }

  // Check if user is couple
  isCouple(): boolean {
    return this.getUserType() === 'couple';
  }
}

// Export singleton instance
export const demoAuth = DemoAuth.getInstance();

// Helper function to get demo auth client (mimics Supabase createClient)
export const createDemoClient = () => {
  if (!isDemoMode()) {
    throw new Error('Demo client can only be used in demo mode');
  }

  return {
    auth: demoAuth,
    // Add other Supabase-like methods as needed
    from: (table: string) => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null })
    })
  };
};

// Demo mode banner component data
export const DEMO_BANNER = {
  message: '🎭 Demo Mode Active - Sample data only',
  bgColor: '#FEF3C7',
  textColor: '#92400E',
  borderColor: '#F59E0B'
};
