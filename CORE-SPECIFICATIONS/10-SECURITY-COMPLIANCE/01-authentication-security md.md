# 01-authentication-security.md

# Authentication Security

## Overview

WedSync/WedMe implements a multi-layered authentication security approach using Supabase Auth with additional custom security measures to protect user accounts and prevent unauthorized access.

## Authentication Architecture

### 1. Primary Authentication Methods

### Email/Password Authentication

- **Password Requirements**:
    - Minimum 12 characters
    - Must include uppercase, lowercase, numbers, and special characters
    - Password strength meter using zxcvbn library
    - Rejection of common passwords (top 10,000 list)
    - No password reuse for last 5 passwords

### OAuth Providers

- Google OAuth 2.0 (primary for suppliers)
- Apple Sign In (for iOS users)
- Facebook Login (couples only)
- All OAuth providers use PKCE flow for enhanced security

### Magic Link Authentication

- Time-limited tokens (15 minutes expiry)
- Single-use tokens that expire after first click
- Rate-limited to 3 requests per hour per email
- Secure random token generation (32 bytes)

### 2. Multi-Factor Authentication (MFA)

```tsx
// MFA Configuration
interface MFAConfig {
  methods: {
    totp: {
      enabled: boolean;
      issuer: 'WedSync';
      algorithm: 'SHA256';
      digits: 6;
      period: 30;
    };
    sms: {
      enabled: boolean;
      provider: 'Twilio';
      rateLimit: '5 per hour';
    };
    backup_codes: {
      quantity: 10;
      length: 8;
      format: 'alphanumeric';
    };
  };
  enforcement: {
    required_for: ['admin_users', 'high_value_accounts'];
    optional_for: ['all_users'];
    grace_period_days: 7;
  };
}

```

### 3. Session Management

### Session Security

- JWT tokens with 1-hour access token lifetime
- Refresh tokens with 7-day lifetime (30-day for remembered devices)
- Secure httpOnly cookies for token storage
- SameSite=Strict cookie policy
- Token rotation on each refresh

### Device Management

```sql
-- Device tracking table
CREATE TABLE user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  browser TEXT,
  os TEXT,
  ip_address INET,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  trusted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert on new device login
CREATE FUNCTION notify_new_device_login() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_devices
    WHERE user_id = NEW.user_id
    AND device_fingerprint = NEW.device_fingerprint
  ) THEN
    -- Send email alert
    PERFORM send_security_alert(NEW.user_id, 'new_device_login', NEW);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

```

### 4. Brute Force Protection

### Rate Limiting

```tsx
const rateLimits = {
  login_attempts: {
    max_attempts: 5,
    window_minutes: 15,
    lockout_minutes: 30,
    progressive_delay: true // Increases with each failed attempt
  },
  password_reset: {
    max_attempts: 3,
    window_hours: 1,
    cooldown_hours: 24
  },
  api_requests: {
    authenticated: '1000/hour',
    unauthenticated: '100/hour',
    per_ip: '500/hour'
  }
};

```

### Account Lockout Strategy

1. After 5 failed attempts: 30-minute lockout
2. After 10 failed attempts in 24 hours: 24-hour lockout
3. After 20 failed attempts in 7 days: Account requires admin unlock
4. All lockouts trigger security email to account owner

### 5. Password Reset Security

### Secure Reset Flow

1. User requests reset via email
2. System validates email exists (same response for invalid emails)
3. Generates cryptographically secure token
4. Sends email with time-limited link (1 hour expiry)
5. Requires old password or security questions for high-value accounts
6. Invalidates all existing sessions after reset
7. Sends confirmation email after successful reset

### Additional Reset Security

- Cannot reuse token
- Token includes IP address validation
- Suspicious activity triggers additional verification
- Admin accounts require phone verification

### 6. Row Level Security (RLS) Policies

```sql
-- Ensure users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Suppliers can view their clients" ON public.clients
  FOR SELECT USING (
    auth.uid() IN (
      SELECT supplier_id FROM supplier_clients
      WHERE client_id = clients.id
    )
  );

-- Couples can only see connected suppliers
CREATE POLICY "Couples view connected suppliers" ON public.suppliers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM couple_suppliers
      WHERE couple_id = auth.uid()
      AND supplier_id = suppliers.id
      AND status = 'connected'
    )
  );

```

### 7. API Security

### JWT Validation

```tsx
// Middleware for JWT validation
export async function validateJWT(req: Request): Promise<User | null> {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) return null;

  try {
    // Verify signature
    const payload = await verifyJWT(token, process.env.JWT_SECRET);

    // Check token expiry
    if (payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    // Validate token claims
    if (!payload.sub || !payload.email) {
      throw new Error('Invalid token claims');
    }

    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      throw new Error('Token revoked');
    }

    return payload as User;
  } catch (error) {
    logSecurityEvent('invalid_jwt', { error, ip: req.ip });
    return null;
  }
}

```

### 8. Security Headers

```tsx
// Security headers configuration
export const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://apis.google.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  `.replace(/\s+/g, ' ').trim()
};

```

### 9. Suspicious Activity Detection

```tsx
interface SuspiciousActivityRules {
  triggers: {
    rapid_password_changes: '3 in 24 hours';
    multiple_country_logins: '2+ countries in 1 hour';
    unusual_access_pattern: 'ML-based anomaly detection';
    bulk_data_access: 'Downloading 100+ records';
    permission_escalation_attempts: 'Any unauthorized access';
  };

  actions: {
    log_event: 'always';
    notify_user: 'high_severity';
    require_mfa: 'medium_severity';
    lock_account: 'critical_severity';
    notify_admin: 'critical_severity';
  };
}

```

### 10. Authentication Monitoring

```sql
-- Authentication audit log
CREATE TABLE auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL, -- login, logout, password_change, mfa_enable, etc.
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick queries
CREATE INDEX idx_auth_audit_user_id ON auth_audit_log(user_id);
CREATE INDEX idx_auth_audit_created_at ON auth_audit_log(created_at DESC);
CREATE INDEX idx_auth_audit_event_type ON auth_audit_log(event_type);

```

## Implementation Checklist

- [ ]  Configure Supabase Auth with secure defaults
- [ ]  Implement password complexity requirements
- [ ]  Set up MFA for high-value accounts
- [ ]  Configure rate limiting on all auth endpoints
- [ ]  Implement device fingerprinting
- [ ]  Set up security alert emails
- [ ]  Configure RLS policies for all tables
- [ ]  Implement JWT validation middleware
- [ ]  Add security headers to all responses
- [ ]  Set up authentication monitoring dashboard
- [ ]  Create incident response procedures
- [ ]  Regular security audits (quarterly)

## Testing Requirements

### Security Testing

- Penetration testing of auth endpoints
- Brute force attack simulation
- Session hijacking attempts
- Token manipulation tests
- SQL injection testing
- Cross-site scripting (XSS) testing
- Cross-site request forgery (CSRF) testing

### Compliance Testing

- GDPR compliance verification
- OWASP Top 10 vulnerability assessment
- PCI DSS compliance (if handling payments)
- Regular security audits

## Emergency Procedures

### Account Compromise Response

1. Immediately lock affected account
2. Invalidate all active sessions
3. Force password reset
4. Review audit logs for unauthorized actions
5. Notify user via verified contact method
6. Document incident for compliance

### Mass Security Event

1. Activate incident response team
2. Assess scope of breach
3. Lock affected accounts
4. Force password reset for affected users
5. Notify users within 72 hours (GDPR requirement)
6. File regulatory notifications if required
7. Post-incident security review and improvements