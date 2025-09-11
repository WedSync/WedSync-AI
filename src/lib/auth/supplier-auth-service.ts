// WS-161: Supplier Access Portal Authentication Service
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface SupplierUser {
  id: string;
  supplier_id: string;
  email: string;
  name: string;
  company_name: string;
  role: string;
  organization_id: string;

  // Authentication details
  password_hash?: string;
  email_verified: boolean;
  phone_verified: boolean;

  // Portal access
  portal_access_enabled: boolean;
  first_login: boolean;
  last_login_at?: Date;
  login_count: number;

  // Security
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  backup_codes?: string[];

  // Session management
  active_sessions: string[];
  max_concurrent_sessions: number;

  // Access control
  permissions: string[];
  restricted_features: string[];
  access_expiry?: Date;

  // Profile info
  profile_picture?: string;
  phone: string;
  address?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };

  // Notification preferences
  notification_preferences: {
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
    notification_frequency: 'immediate' | 'daily' | 'weekly';
    notification_types: string[];
  };

  created_at: Date;
  updated_at: Date;
}

export interface SupplierSession {
  id: string;
  supplier_id: string;
  user_agent: string;
  ip_address: string;
  location?: string;
  device_type: 'desktop' | 'mobile' | 'tablet';

  created_at: Date;
  last_activity: Date;
  expires_at: Date;

  is_active: boolean;
  session_token: string;
}

export interface SupplierLoginResult {
  success: boolean;
  user?: SupplierUser;
  session?: SupplierSession;
  access_token?: string;
  refresh_token?: string;
  requires_2fa?: boolean;
  two_fa_token?: string;
  error?: string;
}

export interface SupplierRegistrationData {
  supplier_id: string;
  email: string;
  password: string;
  phone?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  notification_preferences?: {
    email_notifications?: boolean;
    sms_notifications?: boolean;
    push_notifications?: boolean;
    notification_frequency?: 'immediate' | 'daily' | 'weekly';
    notification_types?: string[];
  };
}

export class SupplierAuthService {
  // 🔒 SECURITY: No fallback secrets - fail securely if not configured
  private static readonly JWT_SECRET = process.env.SUPPLIER_JWT_SECRET;
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly REFRESH_TOKEN_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

  /**
   * 🔒 SECURITY: Validate that SUPPLIER_JWT_SECRET is properly configured
   * Throws error if secret is missing to prevent using fallback values
   */
  private static validateSupplierSecret(): void {
    if (!this.JWT_SECRET || this.JWT_SECRET.length < 32) {
      const errorMsg = 
        '🚨 CRITICAL SECURITY ERROR: SUPPLIER_JWT_SECRET not configured or too weak. ' +
        'Set a strong SUPPLIER_JWT_SECRET environment variable (min 32 chars). ' +
        'This is required to prevent authentication bypass vulnerabilities.';
      
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Ensure supplier secret is different from main JWT secret
    if (this.JWT_SECRET === process.env.JWT_SECRET) {
      const errorMsg = 
        '🚨 CRITICAL SECURITY ERROR: SUPPLIER_JWT_SECRET must be different from JWT_SECRET. ' +
        'Use separate secrets for different authentication domains.';
      
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Register a new supplier for portal access
   */
  static async registerSupplier(
    registrationData: SupplierRegistrationData,
    organizationId: string,
  ): Promise<{
    success: boolean;
    user_id?: string;
    verification_token?: string;
    error?: string;
  }> {
    try {
      const supabase = await createClient();

      // Verify supplier exists and isn't already registered
      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('id, email, name, company_name, role')
        .eq('id', registrationData.supplier_id)
        .eq('organization_id', organizationId)
        .single();

      if (supplierError || !supplier) {
        return { success: false, error: 'Supplier not found or invalid' };
      }

      if (supplier.email !== registrationData.email) {
        return {
          success: false,
          error: 'Email does not match supplier record',
        };
      }

      // Check if supplier is already registered
      const { data: existingUser } = await supabase
        .from('supplier_portal_users')
        .select('id')
        .eq('supplier_id', registrationData.supplier_id)
        .single();

      if (existingUser) {
        return {
          success: false,
          error: 'Supplier is already registered for portal access',
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(registrationData.password, 12);

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create supplier portal user
      const userData = {
        supplier_id: registrationData.supplier_id,
        email: registrationData.email,
        name: supplier.name,
        company_name: supplier.company_name,
        role: supplier.role,
        organization_id: organizationId,
        password_hash: passwordHash,
        email_verified: false,
        phone_verified: false,
        phone: registrationData.phone,
        portal_access_enabled: true,
        first_login: true,
        login_count: 0,
        two_factor_enabled: false,
        active_sessions: [],
        max_concurrent_sessions: 3,
        permissions: this.getDefaultSupplierPermissions(),
        restricted_features: [],
        emergency_contact: registrationData.emergency_contact,
        notification_preferences: {
          email_notifications: true,
          sms_notifications: false,
          push_notifications: false,
          notification_frequency: 'immediate',
          notification_types: ['schedule_updates', 'messages', 'reminders'],
          ...registrationData.notification_preferences,
        },
        email_verification_token: verificationToken,
        email_verification_expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdUser, error: createError } = await supabase
        .from('supplier_portal_users')
        .insert(userData)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Send verification email
      await this.sendVerificationEmail(
        createdUser.email,
        createdUser.name,
        verificationToken,
      );

      // Log registration
      await supabase.from('supplier_auth_log').insert({
        supplier_id: registrationData.supplier_id,
        organization_id: organizationId,
        action: 'registration',
        ip_address: 'unknown',
        user_agent: 'system',
        details: {
          email: registrationData.email,
          verification_token_sent: true,
        },
        created_at: new Date().toISOString(),
      });

      return {
        success: true,
        user_id: createdUser.id,
        verification_token: verificationToken,
      };
    } catch (error) {
      console.error('Supplier registration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Authenticate supplier login
   */
  static async authenticateSupplier(
    email: string,
    password: string,
    metadata: {
      ip_address: string;
      user_agent: string;
      device_type?: 'desktop' | 'mobile' | 'tablet';
    },
  ): Promise<SupplierLoginResult> {
    try {
      const supabase = await createClient();

      // Get supplier user
      const { data: user, error: userError } = await supabase
        .from('supplier_portal_users')
        .select('*')
        .eq('email', email)
        .eq('portal_access_enabled', true)
        .single();

      if (userError || !user) {
        await this.logAuthAttempt(
          null,
          'login_failed',
          'user_not_found',
          metadata,
        );
        return { success: false, error: 'Invalid email or password' };
      }

      // Check if account is locked or expired
      if (user.access_expiry && new Date(user.access_expiry) < new Date()) {
        await this.logAuthAttempt(
          user.supplier_id,
          'login_failed',
          'account_expired',
          metadata,
        );
        return { success: false, error: 'Account access has expired' };
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      if (!passwordValid) {
        await this.logAuthAttempt(
          user.supplier_id,
          'login_failed',
          'invalid_password',
          metadata,
        );
        return { success: false, error: 'Invalid email or password' };
      }

      // Check if email is verified
      if (!user.email_verified) {
        await this.logAuthAttempt(
          user.supplier_id,
          'login_failed',
          'email_not_verified',
          metadata,
        );
        return {
          success: false,
          error: 'Please verify your email address before logging in',
        };
      }

      // Check 2FA if enabled
      if (user.two_factor_enabled) {
        // Generate 2FA token for later verification
        const twoFaToken = crypto.randomBytes(32).toString('hex');

        await supabase.from('supplier_2fa_tokens').insert({
          supplier_id: user.supplier_id,
          token: twoFaToken,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
          created_at: new Date().toISOString(),
        });

        return {
          success: false,
          requires_2fa: true,
          two_fa_token: twoFaToken,
          error: '2FA verification required',
        };
      }

      // Create session
      const sessionResult = await this.createSupplierSession(user, metadata);
      if (!sessionResult.success) {
        return { success: false, error: sessionResult.error };
      }

      // Update login tracking
      await supabase
        .from('supplier_portal_users')
        .update({
          first_login: false,
          last_login_at: new Date().toISOString(),
          login_count: user.login_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      await this.logAuthAttempt(
        user.supplier_id,
        'login_success',
        'authentication_successful',
        metadata,
      );

      // Generate JWT tokens
      const accessToken = this.generateAccessToken(
        user,
        sessionResult.session!,
      );
      const refreshToken = this.generateRefreshToken(
        user,
        sessionResult.session!,
      );

      return {
        success: true,
        user: {
          ...user,
          created_at: new Date(user.created_at),
          updated_at: new Date(user.updated_at),
          last_login_at: user.last_login_at
            ? new Date(user.last_login_at)
            : undefined,
          access_expiry: user.access_expiry
            ? new Date(user.access_expiry)
            : undefined,
        },
        session: sessionResult.session,
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    } catch (error) {
      console.error('Supplier authentication failed:', error);
      await this.logAuthAttempt(null, 'login_failed', 'system_error', metadata);
      return {
        success: false,
        error: 'Authentication failed due to system error',
      };
    }
  }

  /**
   * Verify email address
   */
  static async verifyEmail(
    token: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();

      // Find user by verification token
      const { data: user, error: userError } = await supabase
        .from('supplier_portal_users')
        .select('*')
        .eq('email_verification_token', token)
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: 'Invalid or expired verification token',
        };
      }

      // Check if token is expired
      if (new Date(user.email_verification_expires) < new Date()) {
        return { success: false, error: 'Verification token has expired' };
      }

      // Update user as verified
      const { error: updateError } = await supabase
        .from('supplier_portal_users')
        .update({
          email_verified: true,
          email_verification_token: null,
          email_verification_expires: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Log verification
      await supabase.from('supplier_auth_log').insert({
        supplier_id: user.supplier_id,
        organization_id: user.organization_id,
        action: 'email_verified',
        ip_address: 'unknown',
        user_agent: 'system',
        details: { email: user.email },
        created_at: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error('Email verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Validate supplier session
   */
  static async validateSession(sessionToken: string): Promise<{
    valid: boolean;
    user?: SupplierUser;
    session?: SupplierSession;
    error?: string;
  }> {
    try {
      const supabase = await createClient();

      // Get session
      const { data: session, error: sessionError } = await supabase
        .from('supplier_portal_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .single();

      if (sessionError || !session) {
        return { valid: false, error: 'Invalid session' };
      }

      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        // Mark session as inactive
        await supabase
          .from('supplier_portal_sessions')
          .update({ is_active: false })
          .eq('id', session.id);

        return { valid: false, error: 'Session expired' };
      }

      // Get user
      const { data: user, error: userError } = await supabase
        .from('supplier_portal_users')
        .select('*')
        .eq('supplier_id', session.supplier_id)
        .single();

      if (userError || !user || !user.portal_access_enabled) {
        return { valid: false, error: 'User not found or access disabled' };
      }

      // Update last activity
      await supabase
        .from('supplier_portal_sessions')
        .update({
          last_activity: new Date().toISOString(),
        })
        .eq('id', session.id);

      return {
        valid: true,
        user: {
          ...user,
          created_at: new Date(user.created_at),
          updated_at: new Date(user.updated_at),
          last_login_at: user.last_login_at
            ? new Date(user.last_login_at)
            : undefined,
          access_expiry: user.access_expiry
            ? new Date(user.access_expiry)
            : undefined,
        },
        session: {
          ...session,
          created_at: new Date(session.created_at),
          last_activity: new Date(session.last_activity),
          expires_at: new Date(session.expires_at),
        },
      };
    } catch (error) {
      console.error('Session validation failed:', error);
      return {
        valid: false,
        error: 'Session validation failed',
      };
    }
  }

  /**
   * Logout supplier
   */
  static async logoutSupplier(
    sessionToken: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();

      // Invalidate session
      const { error } = await supabase
        .from('supplier_portal_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .eq('session_token', sessionToken);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Supplier logout failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      };
    }
  }

  /**
   * Reset supplier password
   */
  static async requestPasswordReset(
    email: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();

      // Find user
      const { data: user } = await supabase
        .from('supplier_portal_users')
        .select('*')
        .eq('email', email)
        .eq('portal_access_enabled', true)
        .single();

      if (!user) {
        // Don't reveal if user exists for security
        return { success: true };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      await supabase
        .from('supplier_portal_users')
        .update({
          password_reset_token: resetToken,
          password_reset_expires: resetExpires.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      // Send reset email
      await this.sendPasswordResetEmail(user.email, user.name, resetToken);

      // Log password reset request
      await supabase.from('supplier_auth_log').insert({
        supplier_id: user.supplier_id,
        organization_id: user.organization_id,
        action: 'password_reset_requested',
        ip_address: 'unknown',
        user_agent: 'system',
        details: { email },
        created_at: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error('Password reset request failed:', error);
      return {
        success: false,
        error: 'Password reset request failed',
      };
    }
  }

  // Private helper methods

  private static async createSupplierSession(
    user: any,
    metadata: {
      ip_address: string;
      user_agent: string;
      device_type?: 'desktop' | 'mobile' | 'tablet';
    },
  ): Promise<{
    success: boolean;
    session?: SupplierSession;
    error?: string;
  }> {
    try {
      const supabase = await createClient();

      // Check concurrent session limit
      const { data: activeSessions } = await supabase
        .from('supplier_portal_sessions')
        .select('id')
        .eq('supplier_id', user.supplier_id)
        .eq('is_active', true);

      if (
        activeSessions &&
        activeSessions.length >= user.max_concurrent_sessions
      ) {
        // Deactivate oldest session
        const { data: oldestSession } = await supabase
          .from('supplier_portal_sessions')
          .select('id')
          .eq('supplier_id', user.supplier_id)
          .eq('is_active', true)
          .order('last_activity', { ascending: true })
          .limit(1)
          .single();

        if (oldestSession) {
          await supabase
            .from('supplier_portal_sessions')
            .update({ is_active: false })
            .eq('id', oldestSession.id);
        }
      }

      // Create new session
      const sessionToken = crypto.randomBytes(64).toString('hex');
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

      const sessionData = {
        supplier_id: user.supplier_id,
        session_token: sessionToken,
        user_agent: metadata.user_agent,
        ip_address: metadata.ip_address,
        device_type: metadata.device_type || 'desktop',
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
      };

      const { data: createdSession, error } = await supabase
        .from('supplier_portal_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        session: {
          ...createdSession,
          created_at: new Date(createdSession.created_at),
          last_activity: new Date(createdSession.last_activity),
          expires_at: new Date(createdSession.expires_at),
        },
      };
    } catch (error) {
      console.error('Failed to create supplier session:', error);
      return {
        success: false,
        error: 'Failed to create session',
      };
    }
  }

  private static generateAccessToken(
    user: SupplierUser,
    session: SupplierSession,
  ): string {
    // 🔒 SECURITY: Validate secrets before generating tokens
    this.validateSupplierSecret();
    
    return jwt.sign(
      {
        sub: user.supplier_id,
        email: user.email,
        name: user.name,
        organization_id: user.organization_id,
        session_id: session.id,
        permissions: user.permissions,
        type: 'supplier_access',
      },
      this.JWT_SECRET,
      { expiresIn: '15m' },
    );
  }

  private static generateRefreshToken(
    user: SupplierUser,
    session: SupplierSession,
  ): string {
    // 🔒 SECURITY: Validate secrets before generating tokens
    this.validateSupplierSecret();
    
    return jwt.sign(
      {
        sub: user.supplier_id,
        session_id: session.id,
        type: 'supplier_refresh',
      },
      this.JWT_SECRET,
      { expiresIn: '30d' },
    );
  }

  private static getDefaultSupplierPermissions(): string[] {
    return [
      'view_own_schedule',
      'submit_feedback',
      'update_profile',
      'view_communications',
      'upload_documents',
      'view_wedding_details',
    ];
  }

  private static async logAuthAttempt(
    supplierId: string | null,
    action: string,
    result: string,
    metadata: {
      ip_address: string;
      user_agent: string;
      device_type?: string;
    },
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from('supplier_auth_log').insert({
        supplier_id: supplierId,
        action,
        result,
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent,
        details: { device_type: metadata.device_type },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log auth attempt:', error);
    }
  }

  private static async sendVerificationEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    // Implementation would send verification email using your email service
    console.log(`Sending verification email to ${email} with token ${token}`);
  }

  private static async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    // Implementation would send password reset email using your email service
    console.log(`Sending password reset email to ${email} with token ${token}`);
  }
}
