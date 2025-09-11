import { createClient } from '@/lib/supabase/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';

type SupabaseClient = ReturnType<typeof createClient>;

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface AccessTokenPayload {
  supplier_id: string;
  timeline_id: string;
  token_id: string;
  permissions: string[];
  expires_at: string;
  issued_at: string;
  issued_by?: string;
  usage_limit?: number;
  ip_restrictions?: string[];
  domain_restrictions?: string[];
}

interface TokenGenerationOptions {
  expires_in_days?: number;
  usage_limit?: number;
  permissions?: ('view' | 'confirm' | 'export' | 'comment')[];
  ip_restrictions?: string[];
  domain_restrictions?: string[];
  one_time_use?: boolean;
  auto_expire_after_confirmation?: boolean;
}

interface AccessTokenRecord {
  id: string;
  supplier_id: string;
  timeline_id: string;
  token_hash: string;
  permissions: string[];
  usage_count: number;
  usage_limit?: number;
  ip_restrictions?: string[];
  domain_restrictions?: string[];
  expires_at: string;
  is_active: boolean;
  last_used_at?: string;
  last_used_ip?: string;
  created_at: string;
  created_by?: string;
}

interface TokenValidationResult {
  valid: boolean;
  payload?: AccessTokenPayload;
  error?: string;
  remaining_uses?: number;
  expires_in_hours?: number;
}

interface TokenUsageLog {
  token_id: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

// =====================================================
// SUPPLIER ACCESS TOKEN SERVICE
// =====================================================

export class SupplierAccessTokenService {
  private supabase: SupabaseClient;
  private readonly JWT_SECRET: string;
  private readonly DEFAULT_EXPIRY_DAYS = 30;
  private readonly MAX_EXPIRY_DAYS = 365;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

    if (!process.env.JWT_SECRET) {
      console.warn(
        'JWT_SECRET not found in environment variables, using default',
      );
    }
  }

  // Generate new access token
  async generateAccessToken(
    supplierId: string,
    timelineId: string,
    options: TokenGenerationOptions = {},
    issuedBy?: string,
  ): Promise<{ token: string; record: AccessTokenRecord }> {
    try {
      // Validate inputs
      this.validateTokenInputs(supplierId, timelineId, options);

      // Verify supplier and timeline exist
      await this.verifySupplierTimelineAccess(supplierId, timelineId);

      // Deactivate existing tokens if one-time use is required
      if (options.one_time_use || options.auto_expire_after_confirmation) {
        await this.deactivateExistingTokens(supplierId, timelineId);
      }

      // Generate token ID and hash
      const tokenId = crypto.randomUUID();
      const tokenHash = this.generateTokenHash(supplierId, timelineId, tokenId);

      // Calculate expiry
      const expiryDays = Math.min(
        options.expires_in_days || this.DEFAULT_EXPIRY_DAYS,
        this.MAX_EXPIRY_DAYS,
      );
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

      // Set default permissions
      const permissions = options.permissions || ['view', 'confirm'];

      // Create token record
      const tokenRecord: Partial<AccessTokenRecord> = {
        id: tokenId,
        supplier_id: supplierId,
        timeline_id: timelineId,
        token_hash: tokenHash,
        permissions,
        usage_count: 0,
        usage_limit: options.usage_limit,
        ip_restrictions: options.ip_restrictions,
        domain_restrictions: options.domain_restrictions,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        created_by: issuedBy,
      };

      // Store in database
      const { data: savedRecord, error: dbError } = await this.supabase
        .from('supplier_access_tokens')
        .insert(tokenRecord)
        .select()
        .single();

      if (dbError) {
        throw new Error(`Failed to store token record: ${dbError.message}`);
      }

      // Create JWT token
      const payload: AccessTokenPayload = {
        supplier_id: supplierId,
        timeline_id: timelineId,
        token_id: tokenId,
        permissions,
        expires_at: expiresAt.toISOString(),
        issued_at: new Date().toISOString(),
        issued_by: issuedBy,
        usage_limit: options.usage_limit,
        ip_restrictions: options.ip_restrictions,
        domain_restrictions: options.domain_restrictions,
      };

      const token = jwt.sign(payload, this.JWT_SECRET, {
        expiresIn: `${expiryDays}d`,
        issuer: 'wedsync-supplier-service',
        audience: 'wedsync-suppliers',
        subject: `supplier:${supplierId}:timeline:${timelineId}`,
      });

      console.log(
        `Generated access token for supplier ${supplierId}, timeline ${timelineId}`,
      );

      return {
        token,
        record: savedRecord as AccessTokenRecord,
      };
    } catch (error) {
      console.error('Error generating access token:', error);
      throw error;
    }
  }

  // Validate access token
  async validateAccessToken(
    token: string,
    requiredPermission?: string,
    clientIp?: string,
    userAgent?: string,
  ): Promise<TokenValidationResult> {
    try {
      // Decode and verify JWT
      const decoded = jwt.verify(token, this.JWT_SECRET) as AccessTokenPayload;

      // Get token record from database
      const { data: tokenRecord, error: dbError } = await this.supabase
        .from('supplier_access_tokens')
        .select('*')
        .eq('id', decoded.token_id)
        .single();

      if (dbError || !tokenRecord) {
        await this.logTokenUsage(
          decoded.token_id,
          'validation_failed',
          clientIp,
          userAgent,
          false,
          'Token record not found',
        );
        return {
          valid: false,
          error: 'Token not found in database',
        };
      }

      // Check if token is active
      if (!tokenRecord.is_active) {
        await this.logTokenUsage(
          decoded.token_id,
          'validation_failed',
          clientIp,
          userAgent,
          false,
          'Token is deactivated',
        );
        return {
          valid: false,
          error: 'Token has been deactivated',
        };
      }

      // Check expiry
      const now = new Date();
      const expiresAt = new Date(tokenRecord.expires_at);
      if (now > expiresAt) {
        await this.deactivateToken(decoded.token_id, 'expired');
        await this.logTokenUsage(
          decoded.token_id,
          'validation_failed',
          clientIp,
          userAgent,
          false,
          'Token expired',
        );
        return {
          valid: false,
          error: 'Token has expired',
        };
      }

      // Check usage limit
      if (
        tokenRecord.usage_limit &&
        tokenRecord.usage_count >= tokenRecord.usage_limit
      ) {
        await this.deactivateToken(decoded.token_id, 'usage_limit_exceeded');
        await this.logTokenUsage(
          decoded.token_id,
          'validation_failed',
          clientIp,
          userAgent,
          false,
          'Usage limit exceeded',
        );
        return {
          valid: false,
          error: 'Token usage limit exceeded',
        };
      }

      // Check IP restrictions
      if (
        clientIp &&
        tokenRecord.ip_restrictions &&
        tokenRecord.ip_restrictions.length > 0
      ) {
        if (!tokenRecord.ip_restrictions.includes(clientIp)) {
          await this.logTokenUsage(
            decoded.token_id,
            'validation_failed',
            clientIp,
            userAgent,
            false,
            'IP not allowed',
          );
          return {
            valid: false,
            error: 'Access denied from this IP address',
          };
        }
      }

      // Check permissions
      if (
        requiredPermission &&
        !tokenRecord.permissions.includes(requiredPermission)
      ) {
        await this.logTokenUsage(
          decoded.token_id,
          'validation_failed',
          clientIp,
          userAgent,
          false,
          'Insufficient permissions',
        );
        return {
          valid: false,
          error: `Token does not have required permission: ${requiredPermission}`,
        };
      }

      // Update usage tracking
      await this.updateTokenUsage(decoded.token_id, clientIp);
      await this.logTokenUsage(
        decoded.token_id,
        'validation_success',
        clientIp,
        userAgent,
        true,
      );

      const expiresInHours = Math.floor(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60),
      );
      const remainingUses = tokenRecord.usage_limit
        ? tokenRecord.usage_limit - tokenRecord.usage_count - 1
        : undefined;

      return {
        valid: true,
        payload: decoded,
        remaining_uses: remainingUses,
        expires_in_hours: expiresInHours,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Token validation error:', errorMessage);

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: 'Invalid token format or signature',
        };
      }

      return {
        valid: false,
        error: 'Token validation failed',
      };
    }
  }

  // Revoke/deactivate token
  async revokeAccessToken(
    tokenId: string,
    reason?: string,
    revokedBy?: string,
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('supplier_access_tokens')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: revokedBy,
          revoke_reason: reason || 'Manual revocation',
        })
        .eq('id', tokenId);

      if (error) {
        console.error('Error revoking token:', error);
        return false;
      }

      await this.logTokenUsage(
        tokenId,
        'revoked',
        undefined,
        undefined,
        true,
        reason,
      );
      console.log(`Token ${tokenId} revoked by ${revokedBy || 'system'}`);

      return true;
    } catch (error) {
      console.error('Error in token revocation:', error);
      return false;
    }
  }

  // Get token information
  async getTokenInfo(tokenId: string): Promise<AccessTokenRecord | null> {
    try {
      const { data: tokenRecord, error } = await this.supabase
        .from('supplier_access_tokens')
        .select(
          `
          *,
          suppliers:supplier_id (
            business_name,
            email
          ),
          wedding_timelines:timeline_id (
            timeline_name,
            wedding_date
          )
        `,
        )
        .eq('id', tokenId)
        .single();

      if (error || !tokenRecord) {
        return null;
      }

      return tokenRecord;
    } catch (error) {
      console.error('Error getting token info:', error);
      return null;
    }
  }

  // List tokens for supplier/timeline
  async listAccessTokens(
    supplierId?: string,
    timelineId?: string,
    includeInactive: boolean = false,
  ): Promise<AccessTokenRecord[]> {
    try {
      let query = this.supabase.from('supplier_access_tokens').select(`
          *,
          suppliers:supplier_id (
            business_name
          ),
          wedding_timelines:timeline_id (
            timeline_name,
            wedding_date
          )
        `);

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      if (timelineId) {
        query = query.eq('timeline_id', timelineId);
      }

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data: tokens, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) {
        throw new Error(`Failed to list tokens: ${error.message}`);
      }

      return tokens || [];
    } catch (error) {
      console.error('Error listing tokens:', error);
      return [];
    }
  }

  // Get token usage statistics
  async getTokenUsageStats(
    tokenId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    try {
      let query = this.supabase
        .from('supplier_token_usage_logs')
        .select('*')
        .eq('token_id', tokenId);

      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('timestamp', endDate.toISOString());
      }

      const { data: logs, error } = await query.order('timestamp', {
        ascending: false,
      });

      if (error) {
        throw new Error(`Failed to get usage stats: ${error.message}`);
      }

      // Process statistics
      const stats = {
        total_uses: logs?.length || 0,
        successful_uses: logs?.filter((log) => log.success).length || 0,
        failed_uses: logs?.filter((log) => !log.success).length || 0,
        unique_ips: new Set(logs?.map((log) => log.ip_address).filter(Boolean))
          .size,
        last_used: logs?.[0]?.timestamp,
        usage_by_action: {},
        usage_by_day: {},
      };

      // Group by action
      logs?.forEach((log) => {
        const action = log.action;
        if (!stats.usage_by_action[action]) {
          stats.usage_by_action[action] = 0;
        }
        stats.usage_by_action[action]++;
      });

      // Group by day
      logs?.forEach((log) => {
        const day = new Date(log.timestamp).toDateString();
        if (!stats.usage_by_day[day]) {
          stats.usage_by_day[day] = 0;
        }
        stats.usage_by_day[day]++;
      });

      return stats;
    } catch (error) {
      console.error('Error getting token usage stats:', error);
      return null;
    }
  }

  // Clean up expired tokens
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const { data: expiredTokens, error } = await this.supabase
        .from('supplier_access_tokens')
        .update({ is_active: false, revoke_reason: 'Expired cleanup' })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true)
        .select('id');

      if (error) {
        throw new Error(`Failed to cleanup expired tokens: ${error.message}`);
      }

      const count = expiredTokens?.length || 0;
      console.log(`Cleaned up ${count} expired tokens`);

      return count;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }

  // Private helper methods
  private validateTokenInputs(
    supplierId: string,
    timelineId: string,
    options: TokenGenerationOptions,
  ) {
    const supplierSchema = z.string().uuid();
    const timelineSchema = z.string().uuid();
    const optionsSchema = z.object({
      expires_in_days: z.number().min(1).max(365).optional(),
      usage_limit: z.number().min(1).max(1000).optional(),
      permissions: z
        .array(z.enum(['view', 'confirm', 'export', 'comment']))
        .optional(),
      ip_restrictions: z.array(z.string().ip()).optional(),
      domain_restrictions: z.array(z.string().url()).optional(),
      one_time_use: z.boolean().optional(),
      auto_expire_after_confirmation: z.boolean().optional(),
    });

    try {
      supplierSchema.parse(supplierId);
      timelineSchema.parse(timelineId);
      optionsSchema.parse(options);
    } catch (error) {
      throw new Error(
        `Invalid token parameters: ${error instanceof Error ? error.message : 'Validation failed'}`,
      );
    }
  }

  private async verifySupplierTimelineAccess(
    supplierId: string,
    timelineId: string,
  ) {
    const { data: supplier, error: supplierError } = await this.supabase
      .from('suppliers')
      .select('id, business_name')
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplier) {
      throw new Error('Supplier not found');
    }

    const { data: timeline, error: timelineError } = await this.supabase
      .from('wedding_timelines')
      .select('id, timeline_name')
      .eq('id', timelineId)
      .single();

    if (timelineError || !timeline) {
      throw new Error('Timeline not found');
    }
  }

  private generateTokenHash(
    supplierId: string,
    timelineId: string,
    tokenId: string,
  ): string {
    const data = `${supplierId}:${timelineId}:${tokenId}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async deactivateExistingTokens(
    supplierId: string,
    timelineId: string,
  ) {
    await this.supabase
      .from('supplier_access_tokens')
      .update({
        is_active: false,
        revoke_reason: 'Replaced by new token',
      })
      .eq('supplier_id', supplierId)
      .eq('timeline_id', timelineId)
      .eq('is_active', true);
  }

  private async deactivateToken(tokenId: string, reason: string) {
    await this.supabase
      .from('supplier_access_tokens')
      .update({
        is_active: false,
        revoke_reason: reason,
      })
      .eq('id', tokenId);
  }

  private async updateTokenUsage(tokenId: string, clientIp?: string) {
    await this.supabase
      .from('supplier_access_tokens')
      .update({
        usage_count: this.supabase.rpc('increment_usage_count', {
          token_id: tokenId,
        }),
        last_used_at: new Date().toISOString(),
        last_used_ip: clientIp,
      })
      .eq('id', tokenId);
  }

  private async logTokenUsage(
    tokenId: string,
    action: string,
    clientIp?: string,
    userAgent?: string,
    success: boolean = true,
    error?: string,
  ) {
    const logEntry: Partial<TokenUsageLog> = {
      token_id: tokenId,
      action,
      ip_address: clientIp,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
      success,
      error,
    };

    await this.supabase.from('supplier_token_usage_logs').insert(logEntry);
  }

  // Static method to create service instance
  static async create(): Promise<SupplierAccessTokenService> {
    const supabase = await createClient();
    return new SupplierAccessTokenService(supabase);
  }

  // Static convenience methods
  static async generateToken(
    supplierId: string,
    timelineId: string,
    options?: TokenGenerationOptions,
  ): Promise<string> {
    const service = await SupplierAccessTokenService.create();
    const result = await service.generateAccessToken(
      supplierId,
      timelineId,
      options,
    );
    return result.token;
  }

  static async validateToken(
    token: string,
    permission?: string,
    clientIp?: string,
  ): Promise<TokenValidationResult> {
    const service = await SupplierAccessTokenService.create();
    return service.validateAccessToken(token, permission, clientIp);
  }
}

export default SupplierAccessTokenService;
