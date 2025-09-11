# WS-147: Authentication Security Enhancements - Technical Specification

## User Story

**As a wedding photographer in Denver, I need robust authentication security so that my client data and business information remain protected from unauthorized access and cyber threats.**

### Business Context

Sarah, a professional wedding photographer, manages sensitive data for 50+ couples annually, including personal information, venue details, and high-value photography packages. Recent industry breaches have made her clients increasingly concerned about data security. She needs enterprise-grade authentication that:

- Protects against credential stuffing attacks common in the photography industry
- Provides multi-factor authentication without impacting workflow efficiency
- Monitors suspicious access patterns, especially when accessing client portfolios
- Ensures client data isolation between different photographer accounts
- Meets insurance requirements for cybersecurity compliance

**Success Metrics:**
- Zero successful brute force attacks
- 95%+ user adoption of MFA within 30 days
- Sub-2 second authentication flow completion
- 100% compliance with industry security standards

## Database Schema

```sql
-- Enhanced authentication security tables
CREATE SCHEMA IF NOT EXISTS auth_security;

-- User security profiles
CREATE TABLE auth_security.user_security_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  security_level security_level_enum DEFAULT 'standard',
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT, -- TOTP secret, encrypted
  backup_codes TEXT[], -- Encrypted backup codes
  trusted_devices UUID[] DEFAULT '{}',
  password_changed_at TIMESTAMPTZ DEFAULT NOW(),
  password_history TEXT[], -- Hash of last 5 passwords
  last_security_audit TIMESTAMPTZ,
  risk_score INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device fingerprinting and tracking
CREATE TABLE auth_security.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL UNIQUE,
  device_name TEXT,
  browser_info JSONB,
  os_info JSONB,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  ip_address INET,
  location_data JSONB,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  trusted BOOLEAN DEFAULT false,
  trust_expires_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 1,
  suspicious_activity_count INTEGER DEFAULT 0,
  blocked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Authentication attempts and rate limiting
CREATE TABLE auth_security.auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  attempt_type attempt_type_enum NOT NULL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  ip_address INET NOT NULL,
  user_agent TEXT,
  device_fingerprint TEXT,
  location_data JSONB,
  mfa_used BOOLEAN DEFAULT false,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security audit log
CREATE TABLE auth_security.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type security_event_enum NOT NULL,
  event_severity severity_enum NOT NULL,
  event_data JSONB NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  automated_response TEXT,
  admin_notified BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Account lockouts and security holds
CREATE TABLE auth_security.account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lockout_type lockout_type_enum NOT NULL,
  reason TEXT NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  unlock_attempts INTEGER DEFAULT 0,
  unlocked_at TIMESTAMPTZ,
  unlocked_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE auth_security.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address INET,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create enums
CREATE TYPE security_level_enum AS ENUM ('standard', 'high', 'critical');
CREATE TYPE attempt_type_enum AS ENUM ('login', 'password_reset', 'mfa_verify', 'token_refresh');
CREATE TYPE security_event_enum AS ENUM (
  'login_success', 'login_failed', 'password_changed', 'mfa_enabled', 'mfa_disabled',
  'device_trusted', 'suspicious_login', 'account_locked', 'token_refresh',
  'permission_escalation', 'bulk_data_access', 'anomaly_detected'
);
CREATE TYPE severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE lockout_type_enum AS ENUM ('brute_force', 'suspicious_activity', 'admin_lock', 'security_violation');

-- Indexes for performance
CREATE INDEX idx_user_security_profiles_user_id ON auth_security.user_security_profiles(user_id);
CREATE INDEX idx_user_devices_user_id ON auth_security.user_devices(user_id);
CREATE INDEX idx_user_devices_fingerprint ON auth_security.user_devices(device_fingerprint);
CREATE INDEX idx_auth_attempts_email ON auth_security.auth_attempts(email);
CREATE INDEX idx_auth_attempts_ip_created ON auth_security.auth_attempts(ip_address, created_at DESC);
CREATE INDEX idx_security_audit_user_event ON auth_security.security_audit_log(user_id, event_type, created_at DESC);
CREATE INDEX idx_account_lockouts_user_active ON auth_security.account_lockouts(user_id) WHERE unlocked_at IS NULL;

-- Row Level Security
ALTER TABLE auth_security.user_security_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_security.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_security.auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_security.security_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own security profile" ON auth_security.user_security_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own devices" ON auth_security.user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own auth attempts" ON auth_security.auth_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all security data" ON auth_security.security_audit_log
  FOR SELECT USING (auth.jwt()->'app_metadata'->>'role' = 'admin');
```

## API Endpoints

### Authentication Security Endpoints

```typescript
// /api/auth/security - Authentication security management

// GET /api/auth/security/profile
interface SecurityProfileResponse {
  securityLevel: 'standard' | 'high' | 'critical';
  mfaEnabled: boolean;
  trustedDevicesCount: number;
  lastPasswordChange: string;
  riskScore: number;
  recommendations: SecurityRecommendation[];
}

// POST /api/auth/security/mfa/setup
interface MFASetupRequest {
  method: 'totp' | 'sms';
  phoneNumber?: string; // Required for SMS
}

interface MFASetupResponse {
  secret?: string; // For TOTP
  qrCode?: string; // For TOTP setup
  backupCodes: string[];
  setupToken: string;
}

// POST /api/auth/security/mfa/verify-setup
interface MFAVerifySetupRequest {
  setupToken: string;
  code: string;
}

// POST /api/auth/security/mfa/verify
interface MFAVerifyRequest {
  code: string;
  trustDevice?: boolean;
  trustDuration?: number; // Days
}

// GET /api/auth/security/devices
interface SecurityDevicesResponse {
  devices: SecurityDevice[];
}

interface SecurityDevice {
  id: string;
  name: string;
  browser: string;
  os: string;
  location: string;
  firstSeen: string;
  lastSeen: string;
  trusted: boolean;
  current: boolean;
  suspicious: boolean;
}

// POST /api/auth/security/devices/trust
interface TrustDeviceRequest {
  deviceId: string;
  trustDuration: number; // Days
}

// DELETE /api/auth/security/devices/:deviceId
// Revoke device trust and invalidate sessions

// GET /api/auth/security/audit-log
interface SecurityAuditLogResponse {
  events: SecurityEvent[];
  pagination: PaginationInfo;
}

interface SecurityEvent {
  id: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ipAddress: string;
  location: string;
  deviceInfo: string;
  timestamp: string;
  resolved: boolean;
}

// POST /api/auth/security/password-strength
interface PasswordStrengthRequest {
  password: string;
}

interface PasswordStrengthResponse {
  score: number; // 0-4 (zxcvbn scale)
  feedback: {
    suggestions: string[];
    warning: string;
  };
  meets_requirements: boolean;
  estimated_crack_time: string;
}
```

### Advanced Security Endpoints

```typescript
// POST /api/auth/security/suspicious-activity/report
interface SuspiciousActivityRequest {
  activityType: 'unusual_login' | 'bulk_access' | 'permission_escalation';
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// GET /api/auth/security/risk-assessment
interface RiskAssessmentResponse {
  overallRisk: number; // 0-100
  factors: RiskFactor[];
  recommendations: SecurityRecommendation[];
  nextAuditDue: string;
}

interface RiskFactor {
  type: string;
  score: number;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

// POST /api/auth/security/emergency-lockdown
interface EmergencyLockdownRequest {
  reason: string;
  duration?: number; // Hours, default 24
  notifyUser: boolean;
}

// Admin endpoints
// GET /api/admin/security/dashboard
interface SecurityDashboardResponse {
  metrics: {
    totalFailedLogins24h: number;
    suspiciousActivities: number;
    lockedAccounts: number;
    mfaAdoptionRate: number;
  };
  alerts: SecurityAlert[];
  trends: SecurityTrend[];
}

// POST /api/admin/security/bulk-unlock
interface BulkUnlockRequest {
  userIds: string[];
  reason: string;
  requirePasswordReset: boolean;
}
```

## Frontend Components

### MFA Setup Component

```tsx
// components/security/MFASetupWizard.tsx
'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

interface MFASetupWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function MFASetupWizard({ onComplete, onCancel }: MFASetupWizardProps) {
  const [step, setStep] = useState<'method' | 'setup' | 'verify' | 'backup'>('method');
  const [method, setMethod] = useState<'totp' | 'sms'>('totp');
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMethodSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/security/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Setup failed');
      }

      setSecret(data.secret);
      setQrCode(data.qrCode);
      setBackupCodes(data.backupCodes);
      setSetupToken(data.setupToken);
      setStep('setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/security/mfa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupToken,
          code: verificationCode
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Verification failed');
      }

      setStep('backup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setVerificationCode('');
    } finally {
      setLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Choose MFA Method</h3>
      
      <div className="space-y-2">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            checked={method === 'totp'}
            onChange={() => setMethod('totp')}
            className="form-radio"
          />
          <span>Authenticator App (Recommended)</span>
        </label>
        
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            checked={method === 'sms'}
            onChange={() => setMethod('sms')}
            className="form-radio"
          />
          <span>SMS Text Message</span>
        </label>
      </div>

      <div className="flex space-x-2">
        <Button onClick={handleMethodSetup} disabled={loading}>
          {loading ? 'Setting up...' : 'Continue'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );

  const renderTOTPSetup = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Scan QR Code</h3>
      
      <div className="flex justify-center">
        <QRCodeSVG value={qrCode} size={200} />
      </div>
      
      <div className="text-sm text-gray-600">
        <p>1. Install an authenticator app (Google Authenticator, Authy, etc.)</p>
        <p>2. Scan the QR code above</p>
        <p>3. Enter the 6-digit code from your app below</p>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-blue-600">
          Can't scan? Enter manually
        </summary>
        <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-xs break-all">
          {secret}
        </div>
      </details>

      <div className="space-y-2">
        <Input
          type="text"
          placeholder="Enter 6-digit code"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          maxLength={6}
          className="text-center text-lg"
        />
        
        <Button 
          onClick={handleVerification} 
          disabled={loading || verificationCode.length !== 6}
          className="w-full"
        >
          {loading ? 'Verifying...' : 'Verify & Enable'}
        </Button>
      </div>
    </div>
  );

  const renderBackupCodes = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Save Backup Codes</h3>
      
      <Alert>
        <p>Save these backup codes in a secure location. Each code can only be used once.</p>
      </Alert>

      <div className="grid grid-cols-2 gap-2 p-4 bg-gray-100 rounded font-mono text-sm">
        {backupCodes.map((code, index) => (
          <div key={index} className="p-2 bg-white rounded">
            {code}
          </div>
        ))}
      </div>

      <div className="flex space-x-2">
        <Button onClick={onComplete} className="flex-1">
          I've Saved My Codes
        </Button>
        <Button 
          variant="outline"
          onClick={() => {
            const text = backupCodes.join('\n');
            navigator.clipboard.writeText(text);
          }}
        >
          Copy All
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      {step === 'method' && renderMethodSelection()}
      {step === 'setup' && method === 'totp' && renderTOTPSetup()}
      {step === 'backup' && renderBackupCodes()}
    </div>
  );
}
```

### Security Dashboard Component

```tsx
// components/security/SecurityDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SecurityDashboardProps {
  userId: string;
}

interface SecurityProfile {
  securityLevel: 'standard' | 'high' | 'critical';
  mfaEnabled: boolean;
  trustedDevicesCount: number;
  lastPasswordChange: string;
  riskScore: number;
  recommendations: SecurityRecommendation[];
}

interface SecurityRecommendation {
  id: string;
  type: 'warning' | 'info' | 'critical';
  title: string;
  description: string;
  action?: string;
  actionUrl?: string;
}

export function SecurityDashboard({ userId }: SecurityDashboardProps) {
  const [profile, setProfile] = useState<SecurityProfile | null>(null);
  const [devices, setDevices] = useState<SecurityDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, [userId]);

  const loadSecurityData = async () => {
    try {
      const [profileRes, devicesRes] = await Promise.all([
        fetch('/api/auth/security/profile'),
        fetch('/api/auth/security/devices')
      ]);

      const [profileData, devicesData] = await Promise.all([
        profileRes.json(),
        devicesRes.json()
      ]);

      setProfile(profileData);
      setDevices(devicesData.devices);
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score <= 30) return 'text-green-600';
    if (score <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskScoreLabel = (score: number) => {
    if (score <= 30) return 'Low Risk';
    if (score <= 60) return 'Medium Risk';
    return 'High Risk';
  };

  if (loading) {
    return <div className="animate-pulse">Loading security dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Level</CardTitle>
            <Shield className="h-4 w-4 ml-auto text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {profile?.securityLevel || 'Standard'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <AlertTriangle className="h-4 w-4 ml-auto" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskScoreColor(profile?.riskScore || 0)}`}>
              {profile?.riskScore || 0}/100
            </div>
            <p className="text-xs text-muted-foreground">
              {getRiskScoreLabel(profile?.riskScore || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MFA Status</CardTitle>
            <Smartphone className="h-4 w-4 ml-auto" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {profile?.mfaEnabled ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {profile?.mfaEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {!profile?.mfaEnabled && (
              <Button size="sm" className="mt-2">
                Enable MFA
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Recommendations */}
      {profile?.recommendations && profile.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Security Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.recommendations.map((rec) => (
              <div key={rec.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                <AlertTriangle 
                  className={`h-5 w-5 mt-0.5 ${
                    rec.type === 'critical' ? 'text-red-600' :
                    rec.type === 'warning' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} 
                />
                <div className="flex-1">
                  <h4 className="font-medium">{rec.title}</h4>
                  <p className="text-sm text-gray-600">{rec.description}</p>
                  {rec.action && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => rec.actionUrl && window.open(rec.actionUrl)}
                    >
                      {rec.action}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Trusted Devices */}
      <Card>
        <CardHeader>
          <CardTitle>Trusted Devices ({devices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">{device.name || 'Unknown Device'}</div>
                    <div className="text-sm text-gray-600">
                      {device.browser} • {device.location}
                    </div>
                    <div className="text-xs text-gray-500">
                      Last seen: {new Date(device.lastSeen).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {device.current && (
                    <Badge variant="outline">Current</Badge>
                  )}
                  {device.trusted && (
                    <Badge variant="secondary">Trusted</Badge>
                  )}
                  {device.suspicious && (
                    <Badge variant="destructive">Suspicious</Badge>
                  )}
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Core Security Services

```typescript
// lib/security/auth-security-service.ts
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';
import speakeasy from 'speakeasy';
import zxcvbn from 'zxcvbn';
import { supabase } from '@/lib/supabase';

export class AuthSecurityService {
  private static readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

  // Password security
  static validatePasswordStrength(password: string): {
    score: number;
    feedback: any;
    meetsRequirements: boolean;
  } {
    const result = zxcvbn(password);
    
    const requirements = {
      minLength: password.length >= 12,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      notCommon: result.score >= 2
    };

    const meetsRequirements = Object.values(requirements).every(Boolean);

    return {
      score: result.score,
      feedback: result.feedback,
      meetsRequirements
    };
  }

  static async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(32).toString('hex');
    const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  // MFA management
  static generateMFASecret(): string {
    return speakeasy.generateSecret({
      name: 'WedSync',
      issuer: 'WedSync',
      length: 32
    }).base32;
  }

  static generateQRCode(secret: string, email: string): string {
    return speakeasy.otpauthURL({
      secret,
      label: email,
      issuer: 'WedSync',
      algorithm: 'sha256',
      digits: 6,
      period: 30
    });
  }

  static verifyTOTPCode(secret: string, code: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2
    });
  }

  static generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => 
      randomBytes(4).toString('hex').toUpperCase()
    );
  }

  // Device fingerprinting
  static generateDeviceFingerprint(req: Request): string {
    const userAgent = req.headers.get('user-agent') || '';
    const acceptLanguage = req.headers.get('accept-language') || '';
    const acceptEncoding = req.headers.get('accept-encoding') || '';
    
    const fingerprint = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
    return createHash('sha256').update(fingerprint).digest('hex');
  }

  // Rate limiting
  static async checkRateLimit(
    identifier: string, 
    type: 'login' | 'password_reset' | 'mfa'
  ): Promise<{ allowed: boolean; remainingAttempts: number; resetTime: Date }> {
    const { data: attempts } = await supabase
      .from('auth_attempts')
      .select('*')
      .eq('email', identifier)
      .eq('attempt_type', type)
      .gte('created_at', new Date(Date.now() - this.RATE_LIMIT_WINDOW).toISOString())
      .order('created_at', { ascending: false });

    const failedAttempts = attempts?.filter(a => !a.success) || [];
    const remainingAttempts = Math.max(0, this.MAX_LOGIN_ATTEMPTS - failedAttempts.length);
    const allowed = remainingAttempts > 0;
    
    const resetTime = new Date(Date.now() + this.RATE_LIMIT_WINDOW);

    return { allowed, remainingAttempts, resetTime };
  }

  static async logAuthAttempt(
    email: string,
    userId: string | null,
    type: string,
    success: boolean,
    req: Request,
    failureReason?: string
  ): Promise<void> {
    const deviceFingerprint = this.generateDeviceFingerprint(req);
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';

    await supabase
      .from('auth_attempts')
      .insert({
        email,
        user_id: userId,
        attempt_type: type,
        success,
        failure_reason: failureReason,
        ip_address: ipAddress,
        user_agent: req.headers.get('user-agent'),
        device_fingerprint: deviceFingerprint,
        metadata: {
          referer: req.headers.get('referer'),
          origin: req.headers.get('origin')
        }
      });
  }

  // Suspicious activity detection
  static async detectSuspiciousActivity(
    userId: string,
    activityData: any
  ): Promise<{ suspicious: boolean; reasons: string[]; severity: string }> {
    const reasons: string[] = [];
    let severity = 'low';

    // Check for rapid login attempts
    const recentAttempts = await supabase
      .from('auth_attempts')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 60000).toISOString());

    if (recentAttempts.data && recentAttempts.data.length > 10) {
      reasons.push('Rapid authentication attempts detected');
      severity = 'high';
    }

    // Check for multiple country logins
    const locationChecks = await supabase
      .from('user_devices')
      .select('location_data')
      .eq('user_id', userId)
      .gte('last_seen', new Date(Date.now() - 3600000).toISOString());

    if (locationChecks.data) {
      const countries = new Set(
        locationChecks.data
          .filter(d => d.location_data?.country)
          .map(d => d.location_data.country)
      );
      
      if (countries.size > 2) {
        reasons.push('Multiple country access detected');
        severity = 'critical';
      }
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
      severity
    };
  }

  // Account lockout management
  static async lockAccount(
    userId: string,
    reason: string,
    duration: number = 30 * 60 * 1000
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + duration);

    await supabase
      .from('account_lockouts')
      .insert({
        user_id: userId,
        lockout_type: 'brute_force',
        reason,
        expires_at: expiresAt.toISOString()
      });

    // Invalidate all sessions
    await this.invalidateUserSessions(userId);
  }

  static async isAccountLocked(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('account_lockouts')
      .select('*')
      .eq('user_id', userId)
      .is('unlocked_at', null)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    return data && data.length > 0;
  }

  private static async invalidateUserSessions(userId: string): Promise<void> {
    // Implementation depends on session storage mechanism
    // This would invalidate all JWT tokens for the user
  }
}
```

## Security Monitoring Service

```typescript
// lib/security/security-monitoring-service.ts
export class SecurityMonitoringService {
  static async logSecurityEvent(
    userId: string | null,
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    eventData: any,
    req?: Request
  ): Promise<void> {
    const ipAddress = req?.headers.get('x-forwarded-for') || '';
    const userAgent = req?.headers.get('user-agent') || '';
    const deviceFingerprint = req ? AuthSecurityService.generateDeviceFingerprint(req) : null;

    await supabase
      .from('security_audit_log')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_severity: severity,
        event_data: eventData,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_fingerprint: deviceFingerprint
      });

    // Trigger alerts for high/critical events
    if (severity === 'high' || severity === 'critical') {
      await this.triggerSecurityAlert(eventType, eventData, severity);
    }
  }

  private static async triggerSecurityAlert(
    eventType: string,
    eventData: any,
    severity: string
  ): Promise<void> {
    // Implementation for alerting system
    // Could send emails, SMS, Slack notifications, etc.
    console.log(`SECURITY ALERT [${severity.toUpperCase()}]: ${eventType}`, eventData);
  }

  static async generateRiskScore(userId: string): Promise<number> {
    let riskScore = 0;

    // Recent failed logins
    const failedLogins = await supabase
      .from('auth_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('success', false)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    riskScore += Math.min((failedLogins.data?.length || 0) * 5, 25);

    // MFA status
    const securityProfile = await supabase
      .from('user_security_profiles')
      .select('mfa_enabled')
      .eq('user_id', userId)
      .single();

    if (!securityProfile.data?.mfa_enabled) {
      riskScore += 30;
    }

    // Password age
    const passwordAge = securityProfile.data?.password_changed_at;
    if (passwordAge) {
      const daysSinceChange = (Date.now() - new Date(passwordAge).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceChange > 90) {
        riskScore += 20;
      }
    }

    // Suspicious devices
    const suspiciousDevices = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .gt('suspicious_activity_count', 0);

    riskScore += Math.min((suspiciousDevices.data?.length || 0) * 10, 25);

    return Math.min(riskScore, 100);
  }
}
```

## Testing Requirements

### Unit Tests

```typescript
// __tests__/unit/auth-security-service.test.ts
import { AuthSecurityService } from '@/lib/security/auth-security-service';

describe('AuthSecurityService', () => {
  describe('validatePasswordStrength', () => {
    it('should reject weak passwords', () => {
      const result = AuthSecurityService.validatePasswordStrength('password123');
      expect(result.meetsRequirements).toBe(false);
      expect(result.score).toBeLessThan(3);
    });

    it('should accept strong passwords', () => {
      const result = AuthSecurityService.validatePasswordStrength('MySecure!Password123$');
      expect(result.meetsRequirements).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(3);
    });
  });

  describe('MFA functionality', () => {
    it('should generate valid TOTP secrets', () => {
      const secret = AuthSecurityService.generateMFASecret();
      expect(secret).toHaveLength(32);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });

    it('should verify TOTP codes correctly', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      // This would need a time-synchronized test
      // Implementation depends on test environment
    });
  });

  describe('rate limiting', () => {
    it('should enforce login attempt limits', async () => {
      // Mock multiple failed attempts
      // Test that rate limiting kicks in
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/auth-security-api.test.ts
import { testApiHandler } from 'next-test-api-route-handler';
import handler from '@/app/api/auth/security/profile/route';

describe('/api/auth/security/profile', () => {
  it('should return security profile for authenticated user', async () => {
    await testApiHandler({
      handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: {
            authorization: 'Bearer valid-jwt-token'
          }
        });

        expect(res.status).toBe(200);
        
        const data = await res.json();
        expect(data).toMatchObject({
          securityLevel: expect.any(String),
          mfaEnabled: expect.any(Boolean),
          riskScore: expect.any(Number)
        });
      }
    });
  });
});
```

### Security Testing

```typescript
// __tests__/security/auth-security.test.ts
describe('Authentication Security Tests', () => {
  describe('Brute Force Protection', () => {
    it('should lock account after multiple failed attempts', async () => {
      // Simulate multiple failed login attempts
      // Verify account is locked
      // Verify lockout duration is enforced
    });

    it('should implement progressive delays', async () => {
      // Test increasing delays between attempts
    });
  });

  describe('JWT Security', () => {
    it('should reject tampered tokens', async () => {
      // Test token signature validation
    });

    it('should enforce token expiration', async () => {
      // Test expired token rejection
    });
  });

  describe('Device Fingerprinting', () => {
    it('should detect device changes', async () => {
      // Test device fingerprint generation
      // Test suspicious device detection
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce API rate limits', async () => {
      // Test various rate limiting scenarios
    });
  });
});
```

## Dependencies

### Security Libraries
```json
{
  "dependencies": {
    "speakeasy": "^2.0.0",
    "qrcode.react": "^3.1.0",
    "zxcvbn": "^4.4.2",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "rate-limiter-flexible": "^3.0.5",
    "helmet": "^7.1.0",
    "express-validator": "^7.0.1",
    "ua-parser-js": "^1.0.37"
  },
  "devDependencies": {
    "@types/speakeasy": "^2.0.7",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5"
  }
}
```

## Effort Estimate

**Total Effort: 8-10 Sprint Points (16-20 days)**

### Breakdown:
- **Database Schema & Migrations**: 1 day
- **Core Security Services**: 3-4 days
- **API Endpoints**: 2-3 days
- **Frontend Components**: 4-5 days
- **MFA Implementation**: 2-3 days
- **Device Management**: 2 days
- **Security Monitoring**: 2 days
- **Rate Limiting & Protection**: 1-2 days
- **Testing & Security Audits**: 3-4 days
- **Documentation & Deployment**: 1 day

### Risk Factors:
- **High**: Security implementation complexity
- **Medium**: MFA user experience design
- **Medium**: Device fingerprinting accuracy
- **Low**: Database performance with audit logging

### Success Criteria:
- ✅ Zero successful brute force attacks in testing
- ✅ Sub-2 second MFA verification flow
- ✅ 95%+ accurate device fingerprinting
- ✅ Comprehensive security audit logging
- ✅ OWASP Top 10 compliance verification
- ✅ Penetration testing clearance