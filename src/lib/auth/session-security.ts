// Session Security for Wedding Industry SaaS
import { createBrowserClient } from '@supabase/ssr';

interface SessionValidation {
  isValid: boolean;
  reason?: string;
  expiresAt?: Date;
}

export class SessionSecurity {
  private supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async validateSession(session: any): Promise<SessionValidation> {
    if (!session) {
      return { isValid: false, reason: 'No session provided' };
    }

    // Check if session is expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at * 1000);

    if (now > expiresAt) {
      return { isValid: false, reason: 'Session expired' };
    }

    // Validate session token
    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser(session.access_token);

      if (error || !user) {
        return { isValid: false, reason: 'Invalid session token' };
      }

      return { isValid: true, expiresAt };
    } catch (error) {
      return { isValid: false, reason: 'Session validation failed' };
    }
  }

  async refreshSession(session: any) {
    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: session.refresh_token,
      });

      if (error) {
        throw new Error('Failed to refresh session');
      }

      return data.session;
    } catch (error) {
      throw new Error('Session refresh failed');
    }
  }
}

export const sessionSecurity = new SessionSecurity();

export async function validateSession(
  session: any,
): Promise<SessionValidation> {
  return await sessionSecurity.validateSession(session);
}
