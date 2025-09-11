# WS-147: Authentication Security Technical Specification

## 1. User Story & Real-World Wedding Scenario

**As a wedding photographer Sarah**, I need robust authentication security so that my client portfolios, contracts, and sensitive wedding photos are protected from unauthorized access, especially when working with high-profile celebrity weddings where privacy breaches could damage my reputation and business.

**Real Wedding Scenario**: Sarah is photographing a celebrity wedding where unauthorized access to photos before the couple's announcement could result in tabloid leaks worth millions. She needs multi-factor authentication, device tracking, and immediate alerts for any suspicious login attempts from her team members or assistants.

**Business Impact**: 
- Protects $50,000+ wedding contracts from unauthorized access
- Prevents legal liability from privacy breaches
- Maintains photographer's professional reputation
- Ensures compliance with celebrity privacy contracts

## 2. Technical Architecture

### Core Security Framework
```typescript
// Multi-layered authentication architecture
interface AuthenticationArchitecture {
  primaryAuth: EmailPasswordAuth | OAuthAuth | MagicLinkAuth;
  multiFactorAuth: TOTPAuth | SMSAuth | BackupCodesAuth;
  sessionManagement: JWTTokens | DeviceFingerprinting;
  bruteForceProtection: RateLimiting | AccountLockout;
  suspicious ActivityDetection: MLAnomalyDetection;
}
```

### Authentication Flow
1. **Primary Authentication** → 2. **Device Verification** → 3. **MFA Challenge** → 4. **Session Creation** → 5. **Ongoing Monitoring**

## 3. Database Schema

```sql
-- Enhanced user authentication tables
CREATE TABLE user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL UNIQUE,
  device_name TEXT,
  browser_info JSONB,
  operating_system TEXT,
  ip_address INET,
  location JSONB, -- Country, city from IP
  trusted BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_user_devices_user_id ON user_devices(user_id),
  INDEX idx_user_devices_fingerprint ON user_devices(device_fingerprint),
  INDEX idx_user_devices_last_seen ON user_devices(last_seen DESC)
);

-- MFA configuration and backup codes
CREATE TABLE user_mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  totp_secret_encrypted BYTEA,
  totp_enabled BOOLEAN DEFAULT false,
  sms_phone_encrypted BYTEA,
  sms_enabled BOOLEAN DEFAULT false,
  backup_codes_encrypted BYTEA, -- JSON array of hashed codes
  backup_codes_used JSONB DEFAULT '[]',
  recovery_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Authentication audit trail
CREATE TABLE auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL, -- login_success, login_failed, mfa_enabled, password_changed
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  location JSONB,
  risk_score INTEGER, -- 0-100 calculated risk
  error_code TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_auth_audit_user_id ON auth_audit_log(user_id),
  INDEX idx_auth_audit_event_type ON auth_audit_log(event_type),
  INDEX idx_auth_audit_created_at ON auth_audit_log(created_at DESC),
  INDEX idx_auth_audit_risk_score ON auth_audit_log(risk_score DESC)
);

-- Failed login attempts tracking
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  attempt_count INTEGER DEFAULT 1,
  locked_until TIMESTAMPTZ,
  first_attempt TIMESTAMPTZ DEFAULT NOW(),
  last_attempt TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(email, ip_address),
  INDEX idx_login_attempts_email ON login_attempts(email),
  INDEX idx_login_attempts_ip ON login_attempts(ip_address),
  INDEX idx_login_attempts_locked_until ON login_attempts(locked_until)
);

-- Password history for prevention of reuse
CREATE TABLE password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_password_history_user_id ON password_history(user_id),
  INDEX idx_password_history_created_at ON password_history(created_at DESC)
);
```

## 4. API Endpoints

### Authentication Endpoints
```typescript
// Enhanced authentication API with security measures
interface AuthenticationAPI {
  // Primary authentication
  'POST /auth/login': {
    body: {
      email: string;
      password: string;
      deviceFingerprint: string;
      rememberDevice?: boolean;
    };
    response: {
      requiresMFA: boolean;
      mfaToken?: string;
      accessToken?: string;
      refreshToken?: string;
      user?: UserProfile;
    };
  };

  // MFA verification
  'POST /auth/mfa/verify': {
    body: {
      mfaToken: string;
      code: string; // TOTP code or SMS code
      deviceFingerprint: string;
    };
    response: {
      accessToken: string;
      refreshToken: string;
      user: UserProfile;
    };
  };

  // Device management
  'GET /auth/devices': {
    response: UserDevice[];
  };

  'POST /auth/devices/trust': {
    body: { deviceId: string };
    response: { success: boolean };
  };

  'DELETE /auth/devices/:deviceId': {
    response: { success: boolean };
  };

  // MFA setup
  'POST /auth/mfa/setup/totp': {
    response: {
      secret: string;
      qrCode: string;
      backupCodes: string[];
    };
  };

  'POST /auth/mfa/enable': {
    body: {
      method: 'totp' | 'sms';
      verificationCode: string;
      phoneNumber?: string;
    };
    response: { success: boolean; backupCodes?: string[] };
  };

  // Password security
  'POST /auth/password/change': {
    body: {
      currentPassword: string;
      newPassword: string;
      deviceFingerprint: string;
    };
    response: { success: boolean };
  };

  'POST /auth/password/reset/request': {
    body: { email: string };
    response: { success: boolean }; // Same response for valid/invalid emails
  };

  'POST /auth/password/reset/confirm': {
    body: {
      token: string;
      password: string;
      deviceFingerprint: string;
    };
    response: { success: boolean };
  };
}
```

### Security Monitoring Endpoints
```typescript
interface SecurityMonitoringAPI {
  // Audit log access
  'GET /security/audit-log': {
    query: {
      page?: number;
      limit?: number;
      eventType?: string;
      startDate?: string;
      endDate?: string;
    };
    response: {
      logs: AuthAuditLog[];
      pagination: PaginationInfo;
    };
  };

  // Security alerts
  'GET /security/alerts': {
    response: SecurityAlert[];
  };

  'POST /security/alerts/:alertId/acknowledge': {
    response: { success: boolean };
  };
}
```

## 5. Frontend Components

### Multi-Factor Authentication Setup Component
```tsx
// MFA setup wizard with TOTP and SMS options
'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface MFASetupProps {
  onComplete: (backupCodes: string[]) => void;
  onCancel: () => void;
}

export function MFASetupWizard({ onComplete, onCancel }: MFASetupProps) {
  const [step, setStep] = useState<'method' | 'totp_setup' | 'sms_setup' | 'verification'>('method');
  const [method, setMethod] = useState<'totp' | 'sms' | null>(null);
  const [totpData, setTotpData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const setupTOTP = async () => {
    setLoading(true);
    try {
      const response = await fetch('/auth/mfa/setup/totp', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      const data = await response.json();
      setTotpData(data);
      setStep('totp_setup');
    } catch (error) {
      console.error('TOTP setup failed:', error);
    }
    setLoading(false);
  };

  const enableMFA = async () => {
    setLoading(true);
    try {
      const response = await fetch('/auth/mfa/enable', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({
          method,
          verificationCode,
          phoneNumber: method === 'sms' ? phoneNumber : undefined
        })
      });
      const data = await response.json();
      
      if (data.success) {
        onComplete(data.backupCodes || []);
      }
    } catch (error) {
      console.error('MFA enable failed:', error);
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      {step === 'method' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Choose Authentication Method</h2>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setMethod('totp');
                setupTOTP();
              }}
            >
              📱 Authenticator App (Recommended)
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setMethod('sms');
                setStep('sms_setup');
              }}
            >
              📞 SMS Text Message
            </Button>
          </div>
        </div>
      )}

      {step === 'totp_setup' && totpData && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Setup Authenticator App</h2>
          <div className="text-center">
            <QRCodeSVG value={totpData.qrCode} size={200} />
          </div>
          <p className="text-sm text-gray-600">
            1. Open your authenticator app<br/>
            2. Scan the QR code above<br/>
            3. Enter the 6-digit code below
          </p>
          <Input
            placeholder="000000"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            maxLength={6}
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('method')}>
              Back
            </Button>
            <Button 
              onClick={enableMFA}
              disabled={verificationCode.length !== 6 || loading}
              className="flex-1"
            >
              {loading ? 'Verifying...' : 'Enable MFA'}
            </Button>
          </div>
        </div>
      )}

      {step === 'sms_setup' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Setup SMS Authentication</h2>
          <Input
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <Input
            placeholder="Enter verification code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            maxLength={6}
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('method')}>
              Back
            </Button>
            <Button 
              onClick={enableMFA}
              disabled={!phoneNumber || verificationCode.length !== 6 || loading}
              className="flex-1"
            >
              {loading ? 'Verifying...' : 'Enable SMS MFA'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
```

### Device Management Component
```tsx
// Component for managing trusted devices
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UserDevice {
  id: string;
  deviceName: string;
  browser: string;
  operatingSystem: string;
  location: string;
  trusted: boolean;
  lastSeen: string;
  current: boolean;
}

export function DeviceManagement() {
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await fetch('/auth/devices', {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      const data = await response.json();
      setDevices(data);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
    setLoading(false);
  };

  const trustDevice = async (deviceId: string) => {
    try {
      await fetch('/auth/devices/trust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ deviceId })
      });
      loadDevices();
    } catch (error) {
      console.error('Failed to trust device:', error);
    }
  };

  const removeDevice = async (deviceId: string) => {
    try {
      await fetch(`/auth/devices/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      loadDevices();
    } catch (error) {
      console.error('Failed to remove device:', error);
    }
  };

  if (loading) return <div>Loading devices...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Trusted Devices</h2>
      {devices.map((device) => (
        <Card key={device.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{device.deviceName}</span>
                {device.current && (
                  <Badge variant="secondary">Current Device</Badge>
                )}
                {device.trusted && (
                  <Badge variant="default">Trusted</Badge>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {device.browser} • {device.operatingSystem}
              </div>
              <div className="text-sm text-gray-500">
                {device.location} • Last seen {device.lastSeen}
              </div>
            </div>
            <div className="flex gap-2">
              {!device.trusted && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => trustDevice(device.id)}
                >
                  Trust
                </Button>
              )}
              {!device.current && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeDevice(device.id)}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

### Security Alert Component
```tsx
// Security alerts and suspicious activity notifications
'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SecurityAlert {
  id: string;
  type: 'new_device' | 'suspicious_login' | 'password_change' | 'mfa_disabled';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  metadata: Record<string, any>;
}

export function SecurityAlerts() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    // Set up real-time updates
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await fetch('/security/alerts', {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
    setLoading(false);
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/security/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      loadAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  if (loading) return <div>Loading security alerts...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Security Alerts</h2>
      {alerts.length === 0 ? (
        <Card className="p-4">
          <p className="text-gray-600">No security alerts. Your account is secure.</p>
        </Card>
      ) : (
        alerts.map((alert) => (
          <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{alert.message}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                {!alert.acknowledged && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        ))
      )}
    </div>
  );
}
```

## 6. Implementation Code Examples

### Enhanced Authentication Service
```typescript
// Comprehensive authentication service with security measures
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { rateLimit } from '@/lib/ratelimit';

export class AuthenticationService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly MFA_WINDOW = 2; // Allow 2 TOTP windows

  async authenticateUser(
    email: string,
    password: string,
    deviceFingerprint: string,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthenticationResult> {
    // Check rate limiting
    const rateLimitResult = await rateLimit({
      identifier: `login_${ipAddress}`,
      limit: 10,
      duration: 15 * 60 * 1000 // 15 minutes
    });

    if (!rateLimitResult.success) {
      throw new Error('Too many login attempts. Please try again later.');
    }

    // Check account lockout
    const lockoutCheck = await this.checkAccountLockout(email, ipAddress);
    if (lockoutCheck.locked) {
      await this.logAuthAttempt(email, 'login_blocked_lockout', false, ipAddress, userAgent);
      throw new Error(`Account locked until ${lockoutCheck.lockedUntil}`);
    }

    // Verify user credentials
    const user = await this.verifyCredentials(email, password);
    if (!user) {
      await this.recordFailedAttempt(email, ipAddress, userAgent);
      await this.logAuthAttempt(email, 'login_failed_credentials', false, ipAddress, userAgent);
      throw new Error('Invalid credentials');
    }

    // Check if device is known
    const device = await this.getOrCreateDevice(user.id, deviceFingerprint, userAgent, ipAddress);
    
    // Calculate risk score
    const riskScore = await this.calculateRiskScore(user.id, device, ipAddress);

    // Check if MFA is required
    const mfaSettings = await this.getMFASettings(user.id);
    const requiresMFA = mfaSettings.enabled || !device.trusted || riskScore > 50;

    if (requiresMFA) {
      // Generate MFA token
      const mfaToken = await this.generateMFAToken(user.id, deviceFingerprint);
      
      // Send notification if new device
      if (!device.trusted) {
        await this.sendNewDeviceAlert(user, device);
      }

      await this.logAuthAttempt(user.id, 'login_mfa_required', true, ipAddress, userAgent, riskScore);
      
      return {
        success: true,
        requiresMFA: true,
        mfaToken
      };
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, deviceFingerprint);
    
    // Update device last seen
    await this.updateDeviceLastSeen(device.id);

    await this.logAuthAttempt(user.id, 'login_success', true, ipAddress, userAgent, riskScore);

    return {
      success: true,
      requiresMFA: false,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user
    };
  }

  async verifyMFA(
    mfaToken: string,
    code: string,
    deviceFingerprint: string
  ): Promise<MFAVerificationResult> {
    // Verify MFA token
    const mfaData = await this.verifyMFAToken(mfaToken);
    if (!mfaData) {
      throw new Error('Invalid or expired MFA token');
    }

    const { userId } = mfaData;
    const mfaSettings = await this.getMFASettings(userId);

    let isValidCode = false;

    // Verify TOTP code
    if (mfaSettings.totpEnabled) {
      const secret = await this.decryptTOTPSecret(mfaSettings.totpSecretEncrypted);
      isValidCode = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: this.MFA_WINDOW
      });
    }

    // Verify SMS code (if TOTP failed)
    if (!isValidCode && mfaSettings.smsEnabled) {
      isValidCode = await this.verifySMSCode(userId, code);
    }

    // Check backup codes
    if (!isValidCode) {
      isValidCode = await this.verifyBackupCode(userId, code);
    }

    if (!isValidCode) {
      await this.logAuthAttempt(userId, 'mfa_failed', false);
      throw new Error('Invalid MFA code');
    }

    // Generate tokens
    const tokens = await this.generateTokens(userId, deviceFingerprint);
    const user = await this.getUserById(userId);

    // Trust device if explicitly requested
    const device = await this.getDeviceByFingerprint(userId, deviceFingerprint);
    if (device && !device.trusted) {
      await this.trustDevice(device.id);
    }

    await this.logAuthAttempt(userId, 'mfa_success', true);

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user
    };
  }

  private async calculateRiskScore(
    userId: string,
    device: UserDevice,
    ipAddress: string
  ): Promise<number> {
    let score = 0;

    // New device
    if (!device.trusted) score += 30;

    // Check IP reputation
    const ipRisk = await this.checkIPReputation(ipAddress);
    score += ipRisk * 20;

    // Check for unusual access patterns
    const recentLogins = await this.getRecentLogins(userId, 24); // Last 24 hours
    const uniqueIPs = new Set(recentLogins.map(l => l.ipAddress)).size;
    if (uniqueIPs > 3) score += 25; // Multiple IPs

    // Check time-based patterns
    const currentHour = new Date().getHours();
    const userHours = await this.getUserTypicalHours(userId);
    if (!userHours.includes(currentHour)) score += 15;

    // Geographic risk
    const userCountry = await this.getUserPrimaryCountry(userId);
    const currentCountry = await this.getCountryFromIP(ipAddress);
    if (userCountry !== currentCountry) score += 20;

    return Math.min(score, 100); // Cap at 100
  }

  async setupTOTP(userId: string): Promise<TOTPSetupData> {
    const user = await this.getUserById(userId);
    const secret = speakeasy.generateSecret({
      name: `WedSync (${user.email})`,
      issuer: 'WedSync'
    });

    // Store encrypted secret (not activated yet)
    await this.storeTOTPSecret(userId, secret.base32, false);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: await this.generateBackupCodes(userId)
    };
  }

  async enableMFA(
    userId: string,
    method: 'totp' | 'sms',
    verificationCode: string,
    phoneNumber?: string
  ): Promise<{ success: boolean; backupCodes?: string[] }> {
    if (method === 'totp') {
      const mfaSettings = await this.getMFASettings(userId);
      const secret = await this.decryptTOTPSecret(mfaSettings.totpSecretEncrypted);
      
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: verificationCode,
        window: this.MFA_WINDOW
      });

      if (!isValid) {
        throw new Error('Invalid TOTP code');
      }

      await this.enableTOTP(userId);
      await this.logAuthAttempt(userId, 'mfa_enabled_totp', true);
    } else if (method === 'sms') {
      if (!phoneNumber) {
        throw new Error('Phone number required for SMS MFA');
      }

      const isValid = await this.verifySMSCode(userId, verificationCode);
      if (!isValid) {
        throw new Error('Invalid SMS code');
      }

      await this.enableSMS(userId, phoneNumber);
      await this.logAuthAttempt(userId, 'mfa_enabled_sms', true);
    }

    const backupCodes = await this.getBackupCodes(userId);
    return { success: true, backupCodes };
  }

  // Additional helper methods for completeness
  private async recordFailedAttempt(email: string, ipAddress: string, userAgent: string): Promise<void> {
    // Implementation for recording failed attempts
  }

  private async checkAccountLockout(email: string, ipAddress: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
    // Implementation for checking account lockout
    return { locked: false };
  }

  private async logAuthAttempt(
    userId: string,
    eventType: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    riskScore?: number
  ): Promise<void> {
    // Implementation for logging authentication attempts
  }
}

// Supporting interfaces
interface AuthenticationResult {
  success: boolean;
  requiresMFA: boolean;
  mfaToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: any;
}

interface MFAVerificationResult {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: any;
}

interface TOTPSetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

interface UserDevice {
  id: string;
  userId: string;
  fingerprint: string;
  trusted: boolean;
  lastSeen: Date;
}
```

### Security Monitoring Service
```typescript
// Service for monitoring and detecting suspicious activities
export class SecurityMonitoringService {
  async detectSuspiciousActivity(userId: string): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];

    // Check for rapid password changes
    const passwordChanges = await this.getRecentPasswordChanges(userId, 24); // Last 24 hours
    if (passwordChanges.length >= 3) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'rapid_password_changes',
        severity: 'high',
        message: 'Multiple password changes detected in the last 24 hours',
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: { count: passwordChanges.length }
      });
    }

    // Check for logins from multiple countries
    const recentLogins = await this.getRecentLogins(userId, 1); // Last 1 hour
    const countries = new Set();
    for (const login of recentLogins) {
      const country = await this.getCountryFromIP(login.ipAddress);
      countries.add(country);
    }

    if (countries.size >= 2) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'multiple_country_logins',
        severity: 'critical',
        message: `Logins detected from ${countries.size} different countries within 1 hour`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: { countries: Array.from(countries) }
      });
    }

    // Check for unusual access patterns using ML
    const anomalyScore = await this.calculateAnomalyScore(userId);
    if (anomalyScore > 0.8) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'unusual_access_pattern',
        severity: 'medium',
        message: 'Unusual access pattern detected by AI system',
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: { anomalyScore }
      });
    }

    return alerts;
  }

  private async calculateAnomalyScore(userId: string): Promise<number> {
    // Simple anomaly detection based on historical patterns
    const userHistory = await this.getUserAccessHistory(userId, 30); // Last 30 days
    const currentSession = await this.getCurrentSessionData(userId);

    // Calculate deviation from normal patterns
    let anomalyScore = 0;

    // Time-based anomaly
    const typicalHours = this.extractTypicalHours(userHistory);
    const currentHour = new Date().getHours();
    if (!typicalHours.includes(currentHour)) {
      anomalyScore += 0.3;
    }

    // Location-based anomaly
    const typicalCountries = this.extractTypicalCountries(userHistory);
    const currentCountry = await this.getCountryFromIP(currentSession.ipAddress);
    if (!typicalCountries.includes(currentCountry)) {
      anomalyScore += 0.4;
    }

    // Device-based anomaly
    const knownDevices = this.extractKnownDevices(userHistory);
    if (!knownDevices.includes(currentSession.deviceFingerprint)) {
      anomalyScore += 0.3;
    }

    return Math.min(anomalyScore, 1.0);
  }

  async sendSecurityAlert(userId: string, alert: SecurityAlert): Promise<void> {
    const user = await this.getUserById(userId);
    
    // Send email notification
    await this.sendEmail({
      to: user.email,
      subject: `Security Alert: ${alert.message}`,
      template: 'security-alert',
      data: {
        userName: user.name,
        alertMessage: alert.message,
        timestamp: alert.timestamp,
        severity: alert.severity,
        actionUrl: `${process.env.APP_URL}/security/alerts/${alert.id}`
      }
    });

    // Send SMS for critical alerts
    if (alert.severity === 'critical' && user.phoneNumber) {
      await this.sendSMS({
        to: user.phoneNumber,
        message: `Security Alert: ${alert.message}. Check your email for details.`
      });
    }

    // Log the alert
    await this.logSecurityAlert(userId, alert);
  }
}
```

## 7. Security Features Implementation

### Rate Limiting and Brute Force Protection
```typescript
// Comprehensive rate limiting implementation
import { Redis } from 'ioredis';

export class RateLimitService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async checkRateLimit(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const window = Math.floor(now / windowMs);

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, now - windowMs);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    const count = results?.[2]?.[1] as number || 0;

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const resetTime = (window + 1) * windowMs;

    return { allowed, remaining, resetTime };
  }

  async implementProgressiveDelay(identifier: string, attemptCount: number): Promise<number> {
    // Progressive delay: 1s, 2s, 4s, 8s, etc.
    const delay = Math.min(Math.pow(2, attemptCount - 1) * 1000, 60000); // Max 1 minute
    await new Promise(resolve => setTimeout(resolve, delay));
    return delay;
  }
}
```

## 8. Testing Requirements

### Security Testing Suite
```typescript
// Comprehensive security tests
describe('Authentication Security', () => {
  describe('Brute Force Protection', () => {
    it('should lock account after 5 failed attempts', async () => {
      const email = 'test@example.com';
      
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({ email, password: 'wrong-password' })
          .expect(401);
      }

      // 6th attempt should return locked message
      const response = await request(app)
        .post('/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(423);

      expect(response.body.message).toContain('locked');
    });

    it('should implement progressive delays', async () => {
      const start = Date.now();
      
      await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
      
      const firstAttemptTime = Date.now() - start;

      const secondStart = Date.now();
      await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
      
      const secondAttemptTime = Date.now() - secondStart;

      expect(secondAttemptTime).toBeGreaterThan(firstAttemptTime);
    });
  });

  describe('MFA Security', () => {
    it('should require MFA for new devices', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
          deviceFingerprint: 'new-device-fingerprint'
        });

      expect(response.body.requiresMFA).toBe(true);
      expect(response.body.mfaToken).toBeDefined();
    });

    it('should validate TOTP codes correctly', async () => {
      const secret = 'test-secret';
      const token = speakeasy.totp({
        secret,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/auth/mfa/verify')
        .send({
          mfaToken: 'valid-mfa-token',
          code: token
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
    });
  });

  describe('Session Security', () => {
    it('should invalidate tokens after password change', async () => {
      // Login and get token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'old-password' });

      const { accessToken } = loginResponse.body;

      // Change password
      await request(app)
        .post('/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'old-password',
          newPassword: 'new-password'
        });

      // Old token should be invalid
      await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('should detect session hijacking attempts', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .set('X-Forwarded-For', 'different-ip')
        .set('User-Agent', 'different-browser');

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('suspicious');
    });
  });

  describe('Risk Scoring', () => {
    it('should calculate higher risk for new locations', async () => {
      const riskScore = await authService.calculateRiskScore(
        'user-id',
        { trusted: false } as UserDevice,
        '192.168.1.1' // Different IP
      );

      expect(riskScore).toBeGreaterThan(50);
    });

    it('should calculate lower risk for trusted devices', async () => {
      const riskScore = await authService.calculateRiskScore(
        'user-id',
        { trusted: true } as UserDevice,
        '192.168.1.1' // Known IP
      );

      expect(riskScore).toBeLessThan(30);
    });
  });
});

// Performance tests
describe('Authentication Performance', () => {
  it('should handle login within 200ms', async () => {
    const start = Date.now();
    
    await request(app)
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password',
        deviceFingerprint: 'known-device'
      });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('should handle 100 concurrent logins', async () => {
    const promises = Array.from({ length: 100 }, (_, i) =>
      request(app)
        .post('/auth/login')
        .send({
          email: `user${i}@example.com`,
          password: 'password',
          deviceFingerprint: `device-${i}`
        })
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    expect(successful).toBeGreaterThan(90); // Allow for some failures due to rate limiting
  });
});
```

### Penetration Testing Scenarios
```typescript
// Penetration testing scenarios
describe('Security Penetration Tests', () => {
  describe('SQL Injection', () => {
    it('should prevent SQL injection in login', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: "admin'; DROP TABLE users; --",
          password: 'password'
        });

      expect(response.status).toBe(401);
      
      // Verify table still exists
      const users = await db.query('SELECT COUNT(*) FROM users');
      expect(users.rowCount).toBeGreaterThan(0);
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize malicious inputs', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: '<script>alert("xss")</script>@example.com',
          password: 'password'
        });

      expect(response.body).not.toContain('<script>');
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for sensitive operations', async () => {
      const response = await request(app)
        .post('/auth/password/change')
        .set('Authorization', 'Bearer valid-token')
        .send({
          currentPassword: 'old',
          newPassword: 'new'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('CSRF');
    });
  });
});
```

## 9. Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "bcryptjs": "^2.4.3",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3",
    "jsonwebtoken": "^9.0.0",
    "crypto": "^1.0.1",
    "ioredis": "^5.3.0",
    "rate-limiter-flexible": "^3.0.0",
    "validator": "^13.11.0",
    "helmet": "^7.1.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/speakeasy": "^2.0.10",
    "@types/qrcode": "^1.5.5",
    "@types/jsonwebtoken": "^9.0.5",
    "jest": "^29.7.0",
    "supertest": "^6.3.4"
  }
}
```

### Infrastructure Dependencies
- **Redis**: For rate limiting and session storage
- **Supabase Auth**: Primary authentication provider
- **PostgreSQL**: User data and audit logs
- **Email Service**: Security notifications
- **SMS Service**: MFA and alerts

## 10. Effort Estimate

### Development Phases

**Phase 1: Core Authentication (3-4 weeks)**
- Basic authentication with Supabase
- Password security implementation
- Session management
- Device fingerprinting

**Phase 2: Multi-Factor Authentication (2-3 weeks)**
- TOTP implementation
- SMS authentication
- Backup codes system
- MFA setup UI

**Phase 3: Security Monitoring (2-3 weeks)**
- Brute force protection
- Risk scoring algorithm
- Suspicious activity detection
- Security alerts system

**Phase 4: Advanced Security (2-3 weeks)**
- Device management
- Progressive authentication
- Security audit logging
- Compliance features

**Phase 5: Testing & Optimization (1-2 weeks)**
- Security testing
- Performance optimization
- Penetration testing
- Documentation

**Total Estimated Effort: 10-15 weeks**

### Resource Requirements
- **Senior Security Engineer**: Full-time
- **Frontend Developer**: 60% allocation
- **DevOps Engineer**: 30% allocation
- **Security Consultant**: Part-time review

### Success Metrics
- **Security**: Zero successful brute force attacks
- **Performance**: <200ms authentication response time
- **Usability**: <5% MFA abandonment rate
- **Compliance**: Pass security audit
- **Reliability**: 99.9% authentication uptime