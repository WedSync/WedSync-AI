/**
 * Enterprise OAuth 2.0 Token Refresh API Endpoint
 *
 * Handles automatic token refresh with rotation and security validation
 */

import { NextRequest } from 'next/server';
import { EnterpriseOAuthMiddleware } from '@/lib/auth/enterprise-oauth-system';
import { withMediumSecurity } from '@/lib/comprehensive-security-middleware';

async function handleTokenRefresh(request: NextRequest) {
  return EnterpriseOAuthMiddleware.handleTokenRefresh(request);
}

// Apply enterprise security middleware
export const POST = withMediumSecurity(handleTokenRefresh);
