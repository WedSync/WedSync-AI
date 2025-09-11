import { createClient } from '@/lib/supabase/server';

export interface AuthConfig {
  jwtSecret: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  requireEmailVerification: boolean;
  allowedRoles: string[];
}

export const defaultAuthConfig: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-here',
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  requireEmailVerification: true,
  allowedRoles: ['client', 'vendor', 'admin', 'super_admin'],
};

export class AuthConfigManager {
  private config: AuthConfig;
  private supabase;

  constructor(config: AuthConfig = defaultAuthConfig) {
    this.config = config;
    this.supabase = null;
  }

  private async initSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
  }

  async validateUserRole(
    userId: string,
    requiredRoles: string[],
  ): Promise<boolean> {
    await this.initSupabase();

    try {
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (!profile) return false;

      return requiredRoles.includes(profile.role);
    } catch (error) {
      console.error('Error validating user role:', error);
      return false;
    }
  }

  async isRoleAllowed(role: string): Promise<boolean> {
    return this.config.allowedRoles.includes(role);
  }

  getConfig(): AuthConfig {
    return this.config;
  }

  updateConfig(updates: Partial<AuthConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  async checkLoginAttempts(
    email: string,
  ): Promise<{ allowed: boolean; remaining?: number }> {
    // In production, this would check a rate limiting store (Redis)
    // For now, always allow
    return { allowed: true, remaining: this.config.maxLoginAttempts };
  }

  async recordLoginAttempt(email: string, successful: boolean): Promise<void> {
    // In production, this would record to rate limiting store
    console.log(
      `Login attempt for ${email}: ${successful ? 'success' : 'failed'}`,
    );
  }
}

export const authConfig = new AuthConfigManager();
