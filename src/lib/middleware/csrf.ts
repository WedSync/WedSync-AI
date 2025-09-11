// lib/middleware/csrf.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// import crypto from 'crypto'; // Edge Runtime compatibility
// import { randomUUID } from 'crypto'; // Edge Runtime compatibility

export interface CSRFConfig {
  secret: string;
  tokenLength: number;
  cookieName: string;
  headerName: string;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  httpOnly: boolean;
  maxAge: number;
}

export interface CSRFResult {
  success: boolean;
  token?: string;
  error?: string;
  reason?: string;
}

export class CSRFProtectionMiddleware {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  private config: CSRFConfig = {
    secret:
      process.env.CSRF_SECRET ||
      'wedsync-csrf-secret-key-wedding-industry-2025',
    tokenLength: 32,
    cookieName: 'csrf-token',
    headerName: 'x-csrf-token',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    httpOnly: false, // Allow JavaScript access for AJAX requests
    maxAge: 86400, // 24 hours
  };

  // Wedding industry state-changing operations that require CSRF protection
  private readonly PROTECTED_OPERATIONS = ['POST', 'PUT', 'PATCH', 'DELETE'];

  private readonly PROTECTED_ENDPOINTS = [
    '/api/forms/submit',
    '/api/clients/create',
    '/api/clients/update',
    '/api/clients/delete',
    '/api/bookings/create',
    '/api/bookings/update',
    '/api/bookings/cancel',
    '/api/payments/process',
    '/api/suppliers/update',
    '/api/couples/update',
    '/api/weddings/create',
    '/api/weddings/update',
    '/api/settings/update',
    '/api/integrations/connect',
    '/api/integrations/disconnect',
  ];

  async generateCSRFToken(
    request: NextRequest,
    userId?: string,
  ): Promise<CSRFResult> {
    try {
      // Generate cryptographically secure token
      const token = crypto.randomBytes(this.config.tokenLength).toString('hex');
      const timestamp = Date.now();
      const expiresAt = new Date(timestamp + this.config.maxAge * 1000);

      // Create token signature to prevent tampering
      const signature = this.createTokenSignature(token, timestamp, userId);
      const signedToken = `${token}.${timestamp}.${signature}`;

      // Store token in database for verification
      await this.storeCSRFToken({
        token,
        signature,
        userId,
        ipAddress: this.getClientIP(request),
        userAgent: request.headers.get('user-agent'),
        expiresAt: expiresAt.toISOString(),
        isUsed: false,
      });

      return {
        success: true,
        token: signedToken,
      };
    } catch (error) {
      console.error('CSRF token generation error:', error);
      return {
        success: false,
        error: 'Failed to generate CSRF token',
      };
    }
  }

  async validateCSRFToken(
    request: NextRequest,
    userId?: string,
  ): Promise<CSRFResult> {
    try {
      // Skip CSRF validation for safe methods
      if (!this.PROTECTED_OPERATIONS.includes(request.method)) {
        return { success: true };
      }

      // Skip CSRF validation for non-protected endpoints
      const url = new URL(request.url);
      const isProtectedEndpoint = this.PROTECTED_ENDPOINTS.some((endpoint) =>
        url.pathname.startsWith(endpoint),
      );

      if (!isProtectedEndpoint) {
        return { success: true };
      }

      // Extract token from header or body
      const token = await this.extractCSRFToken(request);
      if (!token) {
        await this.logCSRFViolation(request, 'missing_csrf_token', userId);
        return {
          success: false,
          error: 'CSRF token required for this operation',
          reason: 'missing_token',
        };
      }

      // Parse signed token
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        await this.logCSRFViolation(request, 'malformed_csrf_token', userId);
        return {
          success: false,
          error: 'Invalid CSRF token format',
          reason: 'malformed_token',
        };
      }

      const [rawToken, timestamp, signature] = tokenParts;
      const tokenTimestamp = parseInt(timestamp, 10);

      // Verify token signature
      const expectedSignature = this.createTokenSignature(
        rawToken,
        tokenTimestamp,
        userId,
      );
      if (signature !== expectedSignature) {
        await this.logCSRFViolation(request, 'invalid_csrf_signature', userId);
        return {
          success: false,
          error: 'Invalid CSRF token signature',
          reason: 'invalid_signature',
        };
      }

      // Check token expiration
      const now = Date.now();
      if (now > tokenTimestamp + this.config.maxAge * 1000) {
        await this.logCSRFViolation(request, 'expired_csrf_token', userId);
        return {
          success: false,
          error: 'CSRF token has expired',
          reason: 'token_expired',
        };
      }

      // Verify token exists in database and hasn't been used
      const dbResult = await this.verifyStoredToken(rawToken, signature);
      if (!dbResult.success) {
        await this.logCSRFViolation(
          request,
          dbResult.reason || 'token_verification_failed',
          userId,
        );
        return dbResult;
      }

      // Mark token as used (one-time use for maximum security)
      await this.markTokenAsUsed(rawToken, signature);

      // Log successful CSRF validation
      await this.logCSRFSuccess(request, userId);

      return { success: true };
    } catch (error) {
      console.error('CSRF validation error:', error);
      await this.logCSRFViolation(request, 'csrf_validation_error', userId);
      return {
        success: false,
        error: 'CSRF validation failed due to internal error',
        reason: 'internal_error',
      };
    }
  }

  private createTokenSignature(
    token: string,
    timestamp: number,
    userId?: string,
  ): string {
    const payload = `${token}.${timestamp}.${userId || 'anonymous'}`;
    return crypto
      .createHmac('sha256', this.config.secret)
      .update(payload)
      .digest('hex');
  }

  private async extractCSRFToken(request: NextRequest): Promise<string | null> {
    // Check header first (recommended for AJAX requests)
    const headerToken = request.headers.get(this.config.headerName);
    if (headerToken) {
      return headerToken;
    }

    // Check form data for traditional form submissions
    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        const formToken = formData.get('csrf_token');
        if (formToken && typeof formToken === 'string') {
          return formToken;
        }
      }

      if (contentType?.includes('application/json')) {
        const body = await request.json();
        if (body.csrf_token && typeof body.csrf_token === 'string') {
          return body.csrf_token;
        }
      }
    } catch (error) {
      // Ignore errors when parsing request body
    }

    // Check cookie as fallback
    const cookieToken = request.cookies.get(this.config.cookieName)?.value;
    return cookieToken || null;
  }

  private async storeCSRFToken(tokenData: {
    token: string;
    signature: string;
    userId?: string;
    ipAddress: string;
    userAgent?: string;
    expiresAt: string;
    isUsed: boolean;
  }): Promise<void> {
    await this.supabase.from('csrf_tokens').insert({
      id: crypto.randomUUID(),
      token: tokenData.token,
      signature: tokenData.signature,
      user_id: tokenData.userId,
      ip_address: tokenData.ipAddress,
      user_agent: tokenData.userAgent,
      expires_at: tokenData.expiresAt,
      is_used: tokenData.isUsed,
      created_at: new Date().toISOString(),
    });
  }

  private async verifyStoredToken(
    token: string,
    signature: string,
  ): Promise<CSRFResult> {
    const { data, error } = await this.supabase
      .from('csrf_tokens')
      .select('*')
      .eq('token', token)
      .eq('signature', signature)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return {
        success: false,
        error: 'CSRF token not found, expired, or already used',
        reason: 'token_not_found',
      };
    }

    return { success: true };
  }

  private async markTokenAsUsed(
    token: string,
    signature: string,
  ): Promise<void> {
    await this.supabase
      .from('csrf_tokens')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .eq('token', token)
      .eq('signature', signature);
  }

  private async logCSRFViolation(
    request: NextRequest,
    violationType: string,
    userId?: string,
  ): Promise<void> {
    const url = new URL(request.url);

    await this.supabase.from('security_events').insert({
      event_type: 'csrf_violation',
      request_id: crypto.randomUUID(),
      ip_address: this.getClientIP(request),
      user_agent: request.headers.get('user-agent'),
      request_path: url.pathname,
      request_method: request.method,
      user_id: userId,
      severity: 'high',
      description: `CSRF protection violation: ${violationType}`,
      action_taken: 'blocked',
      additional_data: {
        violation_type: violationType,
        endpoint: url.pathname,
        method: request.method,
        referer: request.headers.get('referer'),
        origin: request.headers.get('origin'),
      },
      created_at: new Date().toISOString(),
    });
  }

  private async logCSRFSuccess(
    request: NextRequest,
    userId?: string,
  ): Promise<void> {
    // Optional: Log successful CSRF validations for analytics
    // This could be used to track legitimate form submissions vs attempts
  }

  private getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.ip ||
      '0.0.0.0'
    );
  }

  async cleanupExpiredTokens(): Promise<void> {
    // Clean up expired and used tokens from database
    await this.supabase
      .from('csrf_tokens')
      .delete()
      .or('expires_at.lt.now(),is_used.eq.true');
  }

  // Utility method to add CSRF token to response headers/cookies
  async addCSRFTokenToResponse(
    response: NextResponse,
    request: NextRequest,
    userId?: string,
  ): Promise<NextResponse> {
    const tokenResult = await this.generateCSRFToken(request, userId);

    if (tokenResult.success && tokenResult.token) {
      // Add token to cookie
      response.cookies.set(this.config.cookieName, tokenResult.token, {
        secure: this.config.secure,
        sameSite: this.config.sameSite,
        httpOnly: this.config.httpOnly,
        maxAge: this.config.maxAge,
      });

      // Add token to header for JavaScript access
      response.headers.set(this.config.headerName, tokenResult.token);
    }

    return response;
  }

  // Wedding industry specific CSRF protection for form builders
  async validateWeddingFormCSRF(
    request: NextRequest,
    formId: string,
    userId: string,
  ): Promise<CSRFResult> {
    // First validate standard CSRF token
    const standardResult = await this.validateCSRFToken(request, userId);
    if (!standardResult.success) {
      return standardResult;
    }

    // Additional validation for wedding forms
    try {
      // Verify the user has access to the form they're trying to submit
      const { data: form } = await this.supabase
        .from('forms')
        .select('supplier_id, is_active, requires_authentication')
        .eq('id', formId)
        .single();

      if (!form) {
        return {
          success: false,
          error: 'Form not found',
          reason: 'form_not_found',
        };
      }

      if (!form.is_active) {
        return {
          success: false,
          error: 'Form is no longer active',
          reason: 'form_inactive',
        };
      }

      // For wedding forms requiring authentication, verify user relationship
      if (form.requires_authentication) {
        const { data: relationship } = await this.supabase
          .from('client_supplier_relationships')
          .select('id')
          .eq('client_id', userId)
          .eq('supplier_id', form.supplier_id)
          .eq('is_active', true)
          .single();

        if (!relationship) {
          return {
            success: false,
            error: 'You do not have permission to submit this form',
            reason: 'unauthorized_form_access',
          };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Wedding form CSRF validation error:', error);
      return {
        success: false,
        error: 'Form validation failed',
        reason: 'validation_error',
      };
    }
  }
}

export const csrfMiddleware = new CSRFProtectionMiddleware();

// Convenience functions
export const generateCSRFToken = (request: NextRequest, userId?: string) =>
  csrfMiddleware.generateCSRFToken(request, userId);

export const validateCSRFToken = (request: NextRequest, userId?: string) =>
  csrfMiddleware.validateCSRFToken(request, userId);

export const addCSRFTokenToResponse = (
  response: NextResponse,
  request: NextRequest,
  userId?: string,
) => csrfMiddleware.addCSRFTokenToResponse(response, request, userId);
