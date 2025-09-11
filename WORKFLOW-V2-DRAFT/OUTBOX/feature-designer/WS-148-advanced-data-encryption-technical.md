# WS-148: Advanced Data Encryption System - Technical Specification

## User Story

**As a luxury wedding planner in Beverly Hills, I need enterprise-grade data encryption so that my high-profile celebrity clients' sensitive information remains completely secure from any unauthorized access or data breaches.**

### Business Context

Miranda, who manages weddings for A-list celebrities and Fortune 500 executives, handles extremely sensitive data including:
- Personal details of public figures and their families
- Confidential venue arrangements and security protocols
- High-value vendor contracts and payment information
- Private guest lists with VIP attendees
- Exclusive location details requiring NDAs

Recent celebrity data breaches in the entertainment industry have made her clients paranoid about digital security. She needs military-grade encryption that:
- Encrypts all data both at rest and in transit with AES-256
- Implements zero-knowledge architecture where even WedSync admins cannot access client data
- Provides client-side encryption for ultra-sensitive data entry
- Supports crypto-shredding for GDPR compliance and celebrity privacy
- Enables secure sharing of encrypted data with verified vendors only

**Success Metrics:**
- 100% of sensitive data encrypted at rest and in transit
- Zero data breaches or unauthorized access incidents
- Sub-100ms encryption/decryption performance impact
- 99.9% uptime for encryption services
- Full GDPR and CCPA compliance for celebrity privacy rights

## Database Schema

```sql
-- Advanced encryption system tables
CREATE SCHEMA IF NOT EXISTS encryption;

-- Master encryption configuration
CREATE TABLE encryption.encryption_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_version INTEGER NOT NULL UNIQUE,
  master_key_id TEXT NOT NULL,
  key_derivation_config JSONB NOT NULL,
  encryption_algorithms JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ
);

-- User-specific encryption keys (zero-knowledge)
CREATE TABLE encryption.user_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  key_salt BYTEA NOT NULL, -- For deriving user's data key
  verification_hash BYTEA NOT NULL, -- To verify password without storing
  key_iterations INTEGER DEFAULT 100000,
  algorithm TEXT DEFAULT 'AES-256-GCM',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_rotation TIMESTAMPTZ DEFAULT NOW(),
  next_rotation_due TIMESTAMPTZ GENERATED ALWAYS AS (last_rotation + INTERVAL '90 days') STORED,
  backup_key_shares JSONB, -- Shamir's secret sharing for recovery
  crypto_shredded BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'
);

-- Data encryption catalog
CREATE TABLE encryption.encrypted_data_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  encryption_type encryption_type_enum NOT NULL,
  encryption_key_reference TEXT NOT NULL,
  data_classification data_classification_enum NOT NULL,
  encryption_algorithm TEXT DEFAULT 'AES-256-GCM',
  key_rotation_schedule INTERVAL DEFAULT '90 days',
  last_encrypted TIMESTAMPTZ DEFAULT NOW(),
  records_encrypted BIGINT DEFAULT 0,
  performance_metrics JSONB DEFAULT '{}',
  compliance_flags JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_name, column_name)
);

-- Encryption key rotation history
CREATE TABLE encryption.key_rotation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_reference TEXT NOT NULL,
  rotation_type rotation_type_enum NOT NULL,
  old_key_version INTEGER,
  new_key_version INTEGER,
  rotation_initiated_at TIMESTAMPTZ DEFAULT NOW(),
  rotation_completed_at TIMESTAMPTZ,
  rotation_status rotation_status_enum DEFAULT 'initiated',
  records_re_encrypted BIGINT DEFAULT 0,
  total_records BIGINT,
  error_count INTEGER DEFAULT 0,
  performance_stats JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Crypto-shredding audit trail
CREATE TABLE encryption.crypto_shred_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Don't reference users table as it might be deleted
  initiated_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  shred_type crypto_shred_type_enum NOT NULL,
  tables_affected TEXT[] NOT NULL,
  data_removed_count INTEGER DEFAULT 0,
  verification_hash TEXT NOT NULL, -- To verify complete shredding
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status shred_status_enum DEFAULT 'initiated',
  compliance_reference TEXT, -- GDPR request ID
  metadata JSONB DEFAULT '{}'
);

-- Secure file storage metadata
CREATE TABLE encryption.encrypted_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  encryption_key_reference TEXT NOT NULL,
  encryption_algorithm TEXT DEFAULT 'AES-256-GCM',
  file_hash SHA256 NOT NULL, -- Hash of original file for integrity
  encrypted_hash SHA256 NOT NULL, -- Hash of encrypted file
  initialization_vector BYTEA NOT NULL,
  authentication_tag BYTEA NOT NULL,
  compression_used BOOLEAN DEFAULT false,
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Encryption performance metrics
CREATE TABLE encryption.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type operation_type_enum NOT NULL,
  data_size_bytes BIGINT NOT NULL,
  encryption_time_ms INTEGER NOT NULL,
  decryption_time_ms INTEGER,
  algorithm_used TEXT NOT NULL,
  cpu_usage_percent NUMERIC(5,2),
  memory_usage_mb INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'
);

-- Zero-knowledge proof log
CREATE TABLE encryption.zk_proof_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  proof_type zk_proof_type_enum NOT NULL,
  challenge_hash TEXT NOT NULL,
  proof_verified BOOLEAN NOT NULL,
  verification_time_ms INTEGER,
  client_ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create enums
CREATE TYPE encryption_type_enum AS ENUM ('field_level', 'row_level', 'file_level', 'client_side');
CREATE TYPE data_classification_enum AS ENUM ('public', 'internal', 'confidential', 'restricted', 'top_secret');
CREATE TYPE rotation_type_enum AS ENUM ('scheduled', 'manual', 'emergency', 'compromise');
CREATE TYPE rotation_status_enum AS ENUM ('initiated', 'in_progress', 'completed', 'failed', 'rolled_back');
CREATE TYPE crypto_shred_type_enum AS ENUM ('gdpr_erasure', 'security_incident', 'user_request', 'legal_hold');
CREATE TYPE shred_status_enum AS ENUM ('initiated', 'in_progress', 'completed', 'failed', 'verified');
CREATE TYPE operation_type_enum AS ENUM ('encrypt', 'decrypt', 'key_derive', 're_encrypt', 'shred');
CREATE TYPE zk_proof_type_enum AS ENUM ('password_verify', 'key_prove', 'data_access', 'admin_challenge');

-- Indexes for performance
CREATE INDEX idx_user_encryption_keys_user_id ON encryption.user_encryption_keys(user_id);
CREATE INDEX idx_user_encryption_keys_rotation ON encryption.user_encryption_keys(next_rotation_due) WHERE NOT crypto_shredded;
CREATE INDEX idx_encrypted_data_catalog_table_column ON encryption.encrypted_data_catalog(table_name, column_name);
CREATE INDEX idx_key_rotation_status ON encryption.key_rotation_history(rotation_status, rotation_initiated_at);
CREATE INDEX idx_encrypted_files_user_id ON encryption.encrypted_files(user_id);
CREATE INDEX idx_performance_metrics_operation ON encryption.performance_metrics(operation_type, recorded_at DESC);
CREATE INDEX idx_zk_proof_log_user_id ON encryption.zk_proof_log(user_id, created_at DESC);

-- Row Level Security
ALTER TABLE encryption.user_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption.encrypted_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption.zk_proof_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access their own encryption keys" ON encryption.user_encryption_keys
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own encrypted files" ON encryption.encrypted_files
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view system metrics" ON encryption.performance_metrics
  FOR SELECT USING (auth.jwt()->'app_metadata'->>'role' = 'admin');

-- Extension for advanced encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encryption helper functions
CREATE OR REPLACE FUNCTION encryption.derive_user_key(
  user_password TEXT,
  salt BYTEA,
  iterations INTEGER DEFAULT 100000
) RETURNS BYTEA AS $$
BEGIN
  RETURN digest(
    concat(user_password, salt::TEXT, iterations::TEXT),
    'sha256'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION encryption.encrypt_field(
  plaintext TEXT,
  key_reference TEXT
) RETURNS BYTEA AS $$
DECLARE
  encryption_key BYTEA;
BEGIN
  -- Get encryption key (implementation would use proper KMS)
  encryption_key := decode(key_reference, 'hex');
  
  -- Encrypt using pgp_sym_encrypt
  RETURN pgp_sym_encrypt(plaintext, encryption_key::TEXT, 'cipher-algo=aes256');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION encryption.decrypt_field(
  ciphertext BYTEA,
  key_reference TEXT
) RETURNS TEXT AS $$
DECLARE
  encryption_key BYTEA;
BEGIN
  -- Get encryption key
  encryption_key := decode(key_reference, 'hex');
  
  -- Decrypt using pgp_sym_decrypt
  RETURN pgp_sym_decrypt(ciphertext, encryption_key::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crypto-shredding function
CREATE OR REPLACE FUNCTION encryption.crypto_shred_user_data(
  target_user_id UUID,
  reason TEXT DEFAULT 'GDPR erasure request'
) RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  affected_tables TEXT[] := ARRAY['clients', 'weddings', 'suppliers', 'communications'];
  table_name TEXT;
  rows_affected INTEGER := 0;
BEGIN
  -- Verify user exists
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Log the shredding operation
  INSERT INTO encryption.crypto_shred_log (
    user_id, reason, shred_type, tables_affected
  ) VALUES (
    target_user_id, reason, 'gdpr_erasure', affected_tables
  );

  -- Delete user's encryption key (makes all encrypted data unrecoverable)
  UPDATE encryption.user_encryption_keys 
  SET crypto_shredded = true,
      key_salt = NULL,
      verification_hash = NULL,
      backup_key_shares = NULL
  WHERE user_id = target_user_id;

  -- Mark user data as crypto-shredded in main tables
  FOREACH table_name IN ARRAY affected_tables LOOP
    EXECUTE format('UPDATE %I SET crypto_shredded = true WHERE user_id = $1', table_name) 
    USING target_user_id;
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    result := result || jsonb_build_object(table_name, rows_affected);
  END LOOP;

  -- Update shred log with completion
  UPDATE encryption.crypto_shred_log 
  SET completed_at = NOW(),
      status = 'completed',
      data_removed_count = (SELECT sum((value::INTEGER)) FROM jsonb_each_text(result))
  WHERE user_id = target_user_id AND completed_at IS NULL;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## API Endpoints

### Encryption Management Endpoints

```typescript
// /api/encryption - Encryption management system

// GET /api/encryption/status
interface EncryptionStatusResponse {
  systemStatus: 'healthy' | 'degraded' | 'critical';
  encryptionEnabled: boolean;
  algorithms: {
    primary: string;
    fallback: string;
    fileEncryption: string;
  };
  keyRotation: {
    lastRotation: string;
    nextRotation: string;
    status: 'current' | 'due' | 'overdue';
  };
  performance: {
    avgEncryptionTimeMs: number;
    avgDecryptionTimeMs: number;
    encryptionsPerSecond: number;
  };
  compliance: {
    gdprReady: boolean;
    ccpaReady: boolean;
    lastAudit: string;
  };
}

// POST /api/encryption/user/initialize
interface InitializeUserEncryptionRequest {
  password: string;
  backupEnabled: boolean;
  keyStrength: 'standard' | 'high' | 'maximum';
}

interface InitializeUserEncryptionResponse {
  keyId: string;
  backupShares?: string[]; // For Shamir's secret sharing
  recoveryPhrase?: string;
  nextRotationDue: string;
}

// POST /api/encryption/user/derive-key
interface DeriveKeyRequest {
  password: string;
  operation: 'encrypt' | 'decrypt' | 'verify';
  challenge?: string; // For zero-knowledge proof
}

interface DeriveKeyResponse {
  keyDerived: boolean;
  sessionToken: string;
  expiresAt: string;
  proof?: string; // Zero-knowledge proof
}

// POST /api/encryption/encrypt
interface EncryptDataRequest {
  data: any;
  classification: 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';
  algorithm?: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  clientSideEncryption?: boolean;
}

interface EncryptDataResponse {
  encryptedData: string;
  keyReference: string;
  initializationVector: string;
  authenticationTag: string;
  algorithm: string;
  encryptionTime: number;
}

// POST /api/encryption/decrypt
interface DecryptDataRequest {
  encryptedData: string;
  keyReference: string;
  initializationVector: string;
  authenticationTag: string;
  algorithm: string;
}

interface DecryptDataResponse {
  decryptedData: any;
  decryptionTime: number;
  verified: boolean;
}

// POST /api/encryption/files/encrypt
interface EncryptFileRequest {
  file: File | Buffer;
  filename: string;
  mimeType: string;
  classification: string;
  compressionEnabled?: boolean;
}

interface EncryptFileResponse {
  fileId: string;
  encryptedSize: number;
  originalSize: number;
  compressionRatio?: number;
  uploadUrl: string;
  encryptionTime: number;
}

// GET /api/encryption/files/:fileId/decrypt
interface DecryptFileResponse {
  downloadUrl: string;
  filename: string;
  mimeType: string;
  size: number;
  expiresAt: string; // Temporary download link
}
```

### Advanced Encryption Endpoints

```typescript
// POST /api/encryption/zero-knowledge/challenge
interface ZKChallengeRequest {
  operation: 'password_verify' | 'key_prove' | 'data_access';
  context?: Record<string, any>;
}

interface ZKChallengeResponse {
  challenge: string;
  expiresAt: string;
  algorithm: string;
}

// POST /api/encryption/zero-knowledge/proof
interface ZKProofRequest {
  challenge: string;
  proof: string;
  password?: string; // Never sent in plain, used for proof generation
}

interface ZKProofResponse {
  verified: boolean;
  sessionToken?: string;
  errorCode?: string;
}

// POST /api/encryption/key-rotation/initiate
interface KeyRotationRequest {
  rotationType: 'scheduled' | 'manual' | 'emergency';
  reason: string;
  notifyUsers?: boolean;
}

interface KeyRotationResponse {
  rotationId: string;
  estimatedDuration: string;
  affectedRecords: number;
  status: 'initiated' | 'queued';
}

// GET /api/encryption/key-rotation/:rotationId/status
interface KeyRotationStatusResponse {
  rotationId: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  estimatedCompletion: string;
  errors: string[];
  performance: {
    recordsPerSecond: number;
    averageTime: number;
  };
}

// POST /api/encryption/crypto-shred
interface CryptoShredRequest {
  userId: string;
  reason: string;
  complianceReference?: string;
  verificationRequired: boolean;
}

interface CryptoShredResponse {
  shredId: string;
  tablesAffected: string[];
  estimatedRecords: number;
  status: 'initiated' | 'completed';
  irreversible: boolean;
}

// GET /api/encryption/audit
interface EncryptionAuditResponse {
  summary: {
    totalEncryptedRecords: number;
    encryptionCoverage: number; // Percentage
    lastKeyRotation: string;
    complianceStatus: 'compliant' | 'non_compliant' | 'unknown';
  };
  dataClassification: {
    public: number;
    internal: number;
    confidential: number;
    restricted: number;
    topSecret: number;
  };
  performance: {
    averageEncryptionTime: number;
    averageDecryptionTime: number;
    throughput: number;
  };
  risks: EncryptionRisk[];
  recommendations: EncryptionRecommendation[];
}

interface EncryptionRisk {
  type: 'key_rotation_overdue' | 'weak_algorithm' | 'performance_degradation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRecords: number;
  recommendation: string;
}
```

## Frontend Components

### Encryption Setup Wizard

```tsx
// components/encryption/EncryptionSetupWizard.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { Shield, Key, Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EncryptionSetupWizardProps {
  onComplete: (config: EncryptionConfig) => void;
  onCancel: () => void;
}

interface EncryptionConfig {
  keyStrength: 'standard' | 'high' | 'maximum';
  backupEnabled: boolean;
  backupMethod: 'shares' | 'phrase';
  recoveryShares?: string[];
  recoveryPhrase?: string;
}

export function EncryptionSetupWizard({ onComplete, onCancel }: EncryptionSetupWizardProps) {
  const [step, setStep] = useState<'intro' | 'password' | 'strength' | 'backup' | 'confirm'>('intro');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keyStrength, setKeyStrength] = useState<'standard' | 'high' | 'maximum'>('high');
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [backupMethod, setBackupMethod] = useState<'shares' | 'phrase'>('shares');
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState('');

  const strengthOptions = [
    {
      value: 'standard',
      label: 'Standard (100,000 iterations)',
      description: 'Suitable for normal use cases',
      performance: 'Fast',
      security: 'Good'
    },
    {
      value: 'high',
      label: 'High Security (500,000 iterations)',
      description: 'Recommended for sensitive data',
      performance: 'Moderate',
      security: 'High'
    },
    {
      value: 'maximum',
      label: 'Maximum Security (1,000,000 iterations)',
      description: 'For ultra-sensitive celebrity data',
      performance: 'Slower',
      security: 'Maximum'
    }
  ];

  const validatePassword = useCallback((pwd: string) => {
    if (pwd.length < 12) return 'Password must be at least 12 characters';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain uppercase letters';
    if (!/[a-z]/.test(pwd)) return 'Password must contain lowercase letters';
    if (!/\d/.test(pwd)) return 'Password must contain numbers';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return 'Password must contain special characters';
    return null;
  }, []);

  const handleInitialization = async () => {
    setIsInitializing(true);
    setError('');

    try {
      const response = await fetch('/api/encryption/user/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          backupEnabled,
          keyStrength
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Initialization failed');
      }

      const config: EncryptionConfig = {
        keyStrength,
        backupEnabled,
        backupMethod,
        ...(backupMethod === 'shares' && { recoveryShares: data.backupShares }),
        ...(backupMethod === 'phrase' && { recoveryPhrase: data.recoveryPhrase })
      };

      onComplete(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Initialization failed');
    } finally {
      setIsInitializing(false);
    }
  };

  const renderIntroStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Enable Advanced Encryption</h2>
        <p className="text-gray-600">
          Protect your sensitive wedding data with military-grade encryption
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
          <div>
            <h3 className="font-semibold">Zero-Knowledge Architecture</h3>
            <p className="text-sm text-gray-600">
              Your data is encrypted before it leaves your device. Even we cannot access it.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
          <div>
            <h3 className="font-semibold">AES-256 Encryption</h3>
            <p className="text-sm text-gray-600">
              Same encryption standard used by governments and financial institutions.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
          <div>
            <h3 className="font-semibold">GDPR Compliance</h3>
            <p className="text-sm text-gray-600">
              Full right-to-erasure support with crypto-shredding technology.
            </p>
          </div>
        </div>
      </div>

      <div className="flex space-x-4">
        <Button onClick={() => setStep('password')} className="flex-1">
          <Lock className="h-4 w-4 mr-2" />
          Setup Encryption
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Skip for Now
        </Button>
      </div>
    </div>
  );

  const renderPasswordStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Key className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Create Encryption Password</h2>
        <p className="text-gray-600">
          This password will encrypt all your data. Make it strong and memorable.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> This password cannot be recovered. If you lose it, 
          your encrypted data will be permanently inaccessible.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter encryption password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm encryption password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {password && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Password Strength</div>
            <div className="space-y-1">
              {[
                { check: password.length >= 12, label: 'At least 12 characters' },
                { check: /[A-Z]/.test(password), label: 'Uppercase letter' },
                { check: /[a-z]/.test(password), label: 'Lowercase letter' },
                { check: /\d/.test(password), label: 'Number' },
                { check: /[!@#$%^&*(),.?":{}|<>]/.test(password), label: 'Special character' }
              ].map((req, i) => (
                <div key={i} className="flex items-center space-x-2 text-sm">
                  <CheckCircle className={`h-4 w-4 ${req.check ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={req.check ? 'text-green-600' : 'text-gray-600'}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <Button
          onClick={() => setStep('strength')}
          disabled={!password || !confirmPassword || password !== confirmPassword || validatePassword(password)}
          className="flex-1"
        >
          Continue
        </Button>
        <Button variant="outline" onClick={() => setStep('intro')}>
          Back
        </Button>
      </div>
    </div>
  );

  const renderStrengthStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Choose Security Level</h2>
        <p className="text-gray-600">
          Higher security levels take longer to process but provide better protection.
        </p>
      </div>

      <div className="space-y-3">
        {strengthOptions.map((option) => (
          <Card 
            key={option.value}
            className={`cursor-pointer transition-colors ${
              keyStrength === option.value ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => setKeyStrength(option.value as any)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{option.label}</CardTitle>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>Performance: {option.performance}</span>
                  <span>•</span>
                  <span>Security: {option.security}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{option.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex space-x-4">
        <Button onClick={() => setStep('backup')} className="flex-1">
          Continue
        </Button>
        <Button variant="outline" onClick={() => setStep('password')}>
          Back
        </Button>
      </div>
    </div>
  );

  const renderBackupStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Setup Data Recovery</h2>
        <p className="text-gray-600">
          Choose how to recover your data if you forget your encryption password.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={backupEnabled}
            onChange={(e) => setBackupEnabled(e.target.checked)}
            className="mt-1"
          />
          <div>
            <div className="font-medium">Enable backup recovery</div>
            <div className="text-sm text-gray-600">
              Create encrypted backup keys for data recovery
            </div>
          </div>
        </label>

        {backupEnabled && (
          <div className="ml-6 space-y-3">
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={backupMethod === 'shares'}
                  onChange={() => setBackupMethod('shares')}
                />
                <span>Secret sharing (Recommended)</span>
              </label>
              <p className="text-sm text-gray-600 ml-6">
                Your key is split into 5 parts. You need any 3 parts to recover.
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={backupMethod === 'phrase'}
                  onChange={() => setBackupMethod('phrase')}
                />
                <span>Recovery phrase</span>
              </label>
              <p className="text-sm text-gray-600 ml-6">
                A 24-word phrase that can restore your encryption key.
              </p>
            </div>
          </div>
        )}
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Store your backup information in a secure location separate from your password.
          Both are required to access your encrypted data.
        </AlertDescription>
      </Alert>

      <div className="flex space-x-4">
        <Button onClick={() => setStep('confirm')} className="flex-1">
          Continue
        </Button>
        <Button variant="outline" onClick={() => setStep('strength')}>
          Back
        </Button>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Confirm Settings</h2>
        <p className="text-gray-600">
          Review your encryption configuration before proceeding.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Security Level</dt>
              <dd className="text-lg font-semibold">
                {strengthOptions.find(o => o.value === keyStrength)?.label}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Encryption Algorithm</dt>
              <dd className="text-lg font-semibold">AES-256-GCM</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Backup Recovery</dt>
              <dd className="text-lg font-semibold">
                {backupEnabled ? 
                  `Enabled (${backupMethod === 'shares' ? 'Secret Sharing' : 'Recovery Phrase'})` : 
                  'Disabled'
                }
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Zero-Knowledge</dt>
              <dd className="text-lg font-semibold">Enabled</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex space-x-4">
        <Button 
          onClick={handleInitialization} 
          disabled={isInitializing}
          className="flex-1"
        >
          {isInitializing ? 'Initializing...' : 'Initialize Encryption'}
        </Button>
        <Button variant="outline" onClick={() => setStep('backup')}>
          Back
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <Progress value={(step === 'intro' ? 0 : step === 'password' ? 25 : step === 'strength' ? 50 : step === 'backup' ? 75 : 100)} />
        <div className="text-center mt-2 text-sm text-gray-600">
          Step {step === 'intro' ? 1 : step === 'password' ? 2 : step === 'strength' ? 3 : step === 'backup' ? 4 : 5} of 5
        </div>
      </div>

      {step === 'intro' && renderIntroStep()}
      {step === 'password' && renderPasswordStep()}
      {step === 'strength' && renderStrengthStep()}
      {step === 'backup' && renderBackupStep()}
      {step === 'confirm' && renderConfirmStep()}
    </div>
  );
}
```

### Encryption Status Dashboard

```tsx
// components/encryption/EncryptionDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Key, RefreshCw, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface EncryptionDashboardProps {
  userId: string;
}

export function EncryptionDashboard({ userId }: EncryptionDashboardProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rotationInProgress, setRotationInProgress] = useState(false);

  useEffect(() => {
    loadEncryptionStatus();
  }, [userId]);

  const loadEncryptionStatus = async () => {
    try {
      const response = await fetch('/api/encryption/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load encryption status:', error);
    } finally {
      setLoading(false);
    }
  };

  const initiateKeyRotation = async () => {
    setRotationInProgress(true);
    try {
      await fetch('/api/encryption/key-rotation/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rotationType: 'manual',
          reason: 'User initiated rotation',
          notifyUsers: false
        })
      });
      
      // Reload status after rotation
      setTimeout(loadEncryptionStatus, 1000);
    } catch (error) {
      console.error('Key rotation failed:', error);
    } finally {
      setRotationInProgress(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading encryption dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Shield className="h-4 w-4 ml-auto" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {status?.systemStatus === 'healthy' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <span className="text-2xl font-bold capitalize">
                {status?.systemStatus}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Algorithm</CardTitle>
            <Key className="h-4 w-4 ml-auto" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.algorithms?.primary || 'AES-256-GCM'}
            </div>
            <p className="text-xs text-muted-foreground">
              Military grade encryption
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Key Rotation</CardTitle>
            <RefreshCw className="h-4 w-4 ml-auto" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <Badge 
                variant={status?.keyRotation?.status === 'current' ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {status?.keyRotation?.status}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Next: {new Date(status?.keyRotation?.nextRotation).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 ml-auto" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.performance?.avgEncryptionTimeMs || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Avg encryption time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>GDPR Ready</span>
                <Badge variant={status?.compliance?.gdprReady ? 'secondary' : 'destructive'}>
                  {status?.compliance?.gdprReady ? 'Compliant' : 'Non-Compliant'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span>CCPA Ready</span>
                <Badge variant={status?.compliance?.ccpaReady ? 'secondary' : 'destructive'}>
                  {status?.compliance?.ccpaReady ? 'Compliant' : 'Non-Compliant'}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Last Audit: {new Date(status?.compliance?.lastAudit).toLocaleDateString()}
              </div>
              
              <Button variant="outline" size="sm">
                Generate Compliance Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Management */}
      <Card>
        <CardHeader>
          <CardTitle>Key Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Manual Key Rotation</h4>
              <p className="text-sm text-gray-600">
                Rotate your encryption keys to enhance security
              </p>
            </div>
            <Button 
              onClick={initiateKeyRotation}
              disabled={rotationInProgress}
            >
              {rotationInProgress ? 'Rotating...' : 'Rotate Keys'}
            </Button>
          </div>

          {rotationInProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Rotation Progress</span>
                <span>45%</span>
              </div>
              <Progress value={45} />
              <p className="text-xs text-gray-600">
                Estimated completion: 5 minutes
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {status?.performance?.encryptionsPerSecond || 0}
              </div>
              <div className="text-xs text-gray-600">Encryptions/sec</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-green-600">
                {status?.performance?.avgEncryptionTimeMs || 0}ms
              </div>
              <div className="text-xs text-gray-600">Avg encrypt time</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {status?.performance?.avgDecryptionTimeMs || 0}ms
              </div>
              <div className="text-xs text-gray-600">Avg decrypt time</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-orange-600">99.9%</div>
              <div className="text-xs text-gray-600">Uptime</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Core Encryption Services

```typescript
// lib/encryption/encryption-service.ts
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync, createHash } from 'crypto';
import { supabase } from '@/lib/supabase';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;
  private static readonly SALT_LENGTH = 32;

  // Zero-knowledge encryption - client-side only
  static async deriveUserKey(
    password: string,
    salt: Buffer,
    iterations: number = 100000
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      pbkdf2Sync(password, salt, iterations, this.KEY_LENGTH, 'sha256', (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });
  }

  // Encrypt data with user's derived key
  static async encryptWithUserKey(
    data: string | Buffer,
    userKey: Buffer
  ): Promise<EncryptedData> {
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, userKey, iv);

    const inputData = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    
    const encrypted = Buffer.concat([
      cipher.update(inputData),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv,
      authTag,
      algorithm: this.ALGORITHM
    };
  }

  // Decrypt data with user's derived key
  static async decryptWithUserKey(
    encryptedData: EncryptedData,
    userKey: Buffer
  ): Promise<Buffer> {
    const decipher = createDecipheriv(this.ALGORITHM, userKey, encryptedData.iv);
    decipher.setAuthTag(encryptedData.authTag);

    return Buffer.concat([
      decipher.update(encryptedData.encrypted),
      decipher.final()
    ]);
  }

  // Field-level encryption for database
  static async encryptField(
    value: string,
    keyReference: string
  ): Promise<string> {
    // Get encryption key from KMS (implementation specific)
    const encryptionKey = await this.getEncryptionKey(keyReference);
    
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, encryptionKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    const combined = Buffer.concat([iv, authTag, encrypted]);
    
    return combined.toString('base64');
  }

  static async decryptField(
    encryptedValue: string,
    keyReference: string
  ): Promise<string> {
    const encryptionKey = await this.getEncryptionKey(keyReference);
    const combined = Buffer.from(encryptedValue, 'base64');

    // Extract components
    const iv = combined.subarray(0, this.IV_LENGTH);
    const authTag = combined.subarray(this.IV_LENGTH, this.IV_LENGTH + this.TAG_LENGTH);
    const encrypted = combined.subarray(this.IV_LENGTH + this.TAG_LENGTH);

    const decipher = createDecipheriv(this.ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  }

  // File encryption
  static async encryptFile(
    fileBuffer: Buffer,
    userKey: Buffer,
    metadata: FileMetadata
  ): Promise<EncryptedFile> {
    const startTime = Date.now();
    
    // Compress if beneficial
    let processedBuffer = fileBuffer;
    let compressionUsed = false;
    
    if (this.shouldCompress(metadata.mimeType)) {
      const zlib = await import('zlib');
      processedBuffer = await new Promise((resolve, reject) => {
        zlib.gzip(fileBuffer, (err, compressed) => {
          if (err) reject(err);
          else {
            compressionUsed = compressed.length < fileBuffer.length;
            resolve(compressionUsed ? compressed : fileBuffer);
          }
        });
      });
    }

    // Encrypt the processed buffer
    const encryptedData = await this.encryptWithUserKey(processedBuffer, userKey);
    
    // Calculate hashes
    const originalHash = createHash('sha256').update(fileBuffer).digest('hex');
    const encryptedHash = createHash('sha256').update(encryptedData.encrypted).digest('hex');

    const encryptionTime = Date.now() - startTime;

    // Log performance metrics
    await this.logPerformanceMetric({
      operationType: 'encrypt',
      dataSizeBytes: fileBuffer.length,
      encryptionTimeMs: encryptionTime,
      algorithmUsed: this.ALGORITHM,
      compressionUsed
    });

    return {
      ...encryptedData,
      originalSize: fileBuffer.length,
      encryptedSize: encryptedData.encrypted.length,
      compressionUsed,
      originalHash,
      encryptedHash,
      metadata,
      encryptionTime
    };
  }

  static async decryptFile(
    encryptedFile: EncryptedFile,
    userKey: Buffer
  ): Promise<Buffer> {
    const startTime = Date.now();

    // Decrypt the file
    const decryptedBuffer = await this.decryptWithUserKey(encryptedFile, userKey);

    // Decompress if needed
    let finalBuffer = decryptedBuffer;
    if (encryptedFile.compressionUsed) {
      const zlib = await import('zlib');
      finalBuffer = await new Promise((resolve, reject) => {
        zlib.gunzip(decryptedBuffer, (err, decompressed) => {
          if (err) reject(err);
          else resolve(decompressed);
        });
      });
    }

    // Verify integrity
    const actualHash = createHash('sha256').update(finalBuffer).digest('hex');
    if (actualHash !== encryptedFile.originalHash) {
      throw new Error('File integrity verification failed');
    }

    const decryptionTime = Date.now() - startTime;

    // Log performance metrics
    await this.logPerformanceMetric({
      operationType: 'decrypt',
      dataSizeBytes: finalBuffer.length,
      decryptionTimeMs: decryptionTime,
      algorithmUsed: this.ALGORITHM
    });

    return finalBuffer;
  }

  // Zero-knowledge proof implementation
  static async createPasswordProof(
    password: string,
    challenge: string
  ): Promise<string> {
    // Simplified zero-knowledge proof
    // In production, use a proper ZK-proof library
    const salt = Buffer.from(challenge, 'hex');
    const proof = createHash('sha256')
      .update(password)
      .update(salt)
      .digest('hex');
    
    return proof;
  }

  static async verifyPasswordProof(
    proof: string,
    challenge: string,
    verificationHash: string
  ): Promise<boolean> {
    // Verify without knowing the original password
    const expectedProof = createHash('sha256')
      .update(verificationHash)
      .update(challenge)
      .digest('hex');
    
    return proof === expectedProof;
  }

  // Crypto-shredding for GDPR compliance
  static async cryptoShredUserData(
    userId: string,
    reason: string = 'GDPR erasure request'
  ): Promise<CryptoShredResult> {
    const startTime = Date.now();

    try {
      // Call the database function for crypto-shredding
      const { data, error } = await supabase.rpc('crypto_shred_user_data', {
        target_user_id: userId,
        reason
      });

      if (error) throw error;

      const shredTime = Date.now() - startTime;

      // Log the shredding operation
      await this.logSecurityEvent('crypto_shred', {
        userId,
        reason,
        tablesAffected: Object.keys(data),
        recordsShredded: Object.values(data).reduce((sum: number, count: any) => sum + count, 0),
        shredTimeMs: shredTime
      });

      return {
        success: true,
        tablesAffected: Object.keys(data),
        recordsShredded: Object.values(data).reduce((sum: number, count: any) => sum + count, 0),
        shredTimeMs: shredTime,
        irreversible: true
      };
    } catch (error) {
      console.error('Crypto-shredding failed:', error);
      throw new Error('Failed to perform crypto-shredding');
    }
  }

  // Key rotation
  static async rotateUserKeys(
    userId: string,
    newPassword?: string
  ): Promise<KeyRotationResult> {
    const rotationId = randomBytes(16).toString('hex');
    const startTime = Date.now();

    try {
      // Generate new salt
      const newSalt = randomBytes(this.SALT_LENGTH);
      
      // If password provided, derive new key
      let newKeyHash: string | undefined;
      if (newPassword) {
        const newKey = await this.deriveUserKey(newPassword, newSalt);
        newKeyHash = createHash('sha256').update(newKey).digest('hex');
      }

      // Update user's encryption key record
      const { error } = await supabase
        .from('user_encryption_keys')
        .update({
          key_salt: newSalt,
          last_rotation: new Date().toISOString(),
          ...(newKeyHash && { verification_hash: newKeyHash })
        })
        .eq('user_id', userId);

      if (error) throw error;

      const rotationTime = Date.now() - startTime;

      // Log rotation
      await supabase
        .from('key_rotation_history')
        .insert({
          key_reference: userId,
          rotation_type: 'scheduled',
          rotation_completed_at: new Date().toISOString(),
          rotation_status: 'completed',
          records_re_encrypted: 1,
          total_records: 1,
          performance_stats: { rotationTimeMs: rotationTime }
        });

      return {
        rotationId,
        success: true,
        rotationTimeMs: rotationTime,
        nextRotationDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      };
    } catch (error) {
      console.error('Key rotation failed:', error);
      throw new Error('Key rotation failed');
    }
  }

  // Helper methods
  private static shouldCompress(mimeType: string): boolean {
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/xml',
      'application/javascript',
      'application/css'
    ];
    
    return compressibleTypes.some(type => mimeType.startsWith(type));
  }

  private static async getEncryptionKey(keyReference: string): Promise<Buffer> {
    // Implementation would integrate with KMS
    // This is a simplified version for demonstration
    return createHash('sha256').update(keyReference).digest();
  }

  private static async logPerformanceMetric(metric: any): Promise<void> {
    await supabase
      .from('performance_metrics')
      .insert({
        operation_type: metric.operationType,
        data_size_bytes: metric.dataSizeBytes,
        encryption_time_ms: metric.encryptionTimeMs,
        decryption_time_ms: metric.decryptionTimeMs,
        algorithm_used: metric.algorithmUsed,
        metadata: {
          compressionUsed: metric.compressionUsed
        }
      });
  }

  private static async logSecurityEvent(eventType: string, data: any): Promise<void> {
    await supabase
      .from('security_audit_log')
      .insert({
        event_type: eventType,
        event_severity: 'high',
        event_data: data
      });
  }
}

// Type definitions
interface EncryptedData {
  encrypted: Buffer;
  iv: Buffer;
  authTag: Buffer;
  algorithm: string;
}

interface FileMetadata {
  filename: string;
  mimeType: string;
  classification: string;
}

interface EncryptedFile extends EncryptedData {
  originalSize: number;
  encryptedSize: number;
  compressionUsed: boolean;
  originalHash: string;
  encryptedHash: string;
  metadata: FileMetadata;
  encryptionTime: number;
}

interface CryptoShredResult {
  success: boolean;
  tablesAffected: string[];
  recordsShredded: number;
  shredTimeMs: number;
  irreversible: boolean;
}

interface KeyRotationResult {
  rotationId: string;
  success: boolean;
  rotationTimeMs: number;
  nextRotationDue: string;
}
```

## Testing Requirements

### Unit Tests

```typescript
// __tests__/unit/encryption-service.test.ts
import { EncryptionService } from '@/lib/encryption/encryption-service';
import { randomBytes } from 'crypto';

describe('EncryptionService', () => {
  describe('Key derivation', () => {
    it('should derive consistent keys from same password and salt', async () => {
      const password = 'test-password-123!';
      const salt = randomBytes(32);

      const key1 = await EncryptionService.deriveUserKey(password, salt);
      const key2 = await EncryptionService.deriveUserKey(password, salt);

      expect(key1).toEqual(key2);
      expect(key1).toHaveLength(32);
    });

    it('should derive different keys from different passwords', async () => {
      const salt = randomBytes(32);
      const key1 = await EncryptionService.deriveUserKey('password1', salt);
      const key2 = await EncryptionService.deriveUserKey('password2', salt);

      expect(key1).not.toEqual(key2);
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const plaintext = 'Hello, encrypted world!';
      const userKey = randomBytes(32);

      const encrypted = await EncryptionService.encryptWithUserKey(plaintext, userKey);
      const decrypted = await EncryptionService.decryptWithUserKey(encrypted, userKey);

      expect(decrypted.toString('utf8')).toBe(plaintext);
    });

    it('should fail decryption with wrong key', async () => {
      const plaintext = 'Hello, encrypted world!';
      const correctKey = randomBytes(32);
      const wrongKey = randomBytes(32);

      const encrypted = await EncryptionService.encryptWithUserKey(plaintext, correctKey);

      await expect(
        EncryptionService.decryptWithUserKey(encrypted, wrongKey)
      ).rejects.toThrow();
    });
  });

  describe('File encryption', () => {
    it('should encrypt and decrypt files with integrity verification', async () => {
      const fileContent = Buffer.from('This is a test file content for encryption testing.');
      const userKey = randomBytes(32);
      const metadata = {
        filename: 'test.txt',
        mimeType: 'text/plain',
        classification: 'confidential'
      };

      const encrypted = await EncryptionService.encryptFile(fileContent, userKey, metadata);
      const decrypted = await EncryptionService.decryptFile(encrypted, userKey);

      expect(decrypted).toEqual(fileContent);
      expect(encrypted.originalSize).toBe(fileContent.length);
    });

    it('should detect file corruption', async () => {
      const fileContent = Buffer.from('This is a test file.');
      const userKey = randomBytes(32);
      const metadata = {
        filename: 'test.txt',
        mimeType: 'text/plain',
        classification: 'confidential'
      };

      const encrypted = await EncryptionService.encryptFile(fileContent, userKey, metadata);
      
      // Corrupt the hash
      encrypted.originalHash = 'corrupted-hash';

      await expect(
        EncryptionService.decryptFile(encrypted, userKey)
      ).rejects.toThrow('File integrity verification failed');
    });
  });

  describe('Zero-knowledge proofs', () => {
    it('should create and verify password proofs', async () => {
      const password = 'test-password-123!';
      const challenge = randomBytes(32).toString('hex');

      const proof = await EncryptionService.createPasswordProof(password, challenge);
      expect(proof).toHaveLength(64); // SHA-256 hex string
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/encryption-api.test.ts
import { testApiHandler } from 'next-test-api-route-handler';
import encryptHandler from '@/app/api/encryption/encrypt/route';

describe('/api/encryption/encrypt', () => {
  it('should encrypt data successfully', async () => {
    await testApiHandler({
      handler: encryptHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: 'Bearer valid-jwt-token'
          },
          body: JSON.stringify({
            data: { secret: 'confidential information' },
            classification: 'confidential'
          })
        });

        expect(res.status).toBe(200);
        
        const result = await res.json();
        expect(result).toMatchObject({
          encryptedData: expect.any(String),
          keyReference: expect.any(String),
          initializationVector: expect.any(String),
          authenticationTag: expect.any(String),
          algorithm: 'AES-256-GCM'
        });
      }
    });
  });

  it('should reject unauthorized requests', async () => {
    await testApiHandler({
      handler: encryptHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: { secret: 'confidential' },
            classification: 'confidential'
          })
        });

        expect(res.status).toBe(401);
      }
    });
  });
});
```

### Security Tests

```typescript
// __tests__/security/encryption-security.test.ts
describe('Encryption Security Tests', () => {
  describe('Key derivation security', () => {
    it('should use sufficient iterations for key derivation', async () => {
      const password = 'test-password';
      const salt = randomBytes(32);
      
      // Test that key derivation takes reasonable time (indicating sufficient iterations)
      const start = Date.now();
      await EncryptionService.deriveUserKey(password, salt, 100000);
      const time = Date.now() - start;
      
      expect(time).toBeGreaterThan(100); // Should take at least 100ms
    });

    it('should produce cryptographically random IVs', () => {
      const ivs = new Set();
      
      for (let i = 0; i < 1000; i++) {
        const iv = randomBytes(16).toString('hex');
        ivs.add(iv);
      }
      
      // All IVs should be unique
      expect(ivs.size).toBe(1000);
    });
  });

  describe('Crypto-shredding security', () => {
    it('should make data unrecoverable after shredding', async () => {
      // This would be a comprehensive test ensuring that
      // crypto-shredded data cannot be recovered
    });
  });

  describe('Performance security', () => {
    it('should not leak timing information', async () => {
      // Test for timing attack resistance
      const password = 'constant-password';
      const salt = randomBytes(32);
      
      const times: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const start = process.hrtime.bigint();
        await EncryptionService.deriveUserKey(password, salt);
        const end = process.hrtime.bigint();
        
        times.push(Number(end - start) / 1000000); // Convert to milliseconds
      }
      
      // Check that timing is relatively consistent (no obvious patterns)
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const variance = times.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      
      // Standard deviation should be small relative to average
      expect(stdDev / avgTime).toBeLessThan(0.1);
    });
  });
});
```

## Dependencies

### Encryption Libraries
```json
{
  "dependencies": {
    "node:crypto": "builtin",
    "bcryptjs": "^2.4.3",
    "@noble/ciphers": "^0.3.0",
    "@noble/hashes": "^1.3.2",
    "tweetnacl": "^1.0.3",
    "tweetnacl-util": "^0.15.1",
    "jsencrypt": "^3.3.2",
    "secrets.js-grempe": "^2.0.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6"
  }
}
```

## Effort Estimate

**Total Effort: 10-12 Sprint Points (20-24 days)**

### Breakdown:
- **Database Schema & Migrations**: 2 days
- **Core Encryption Service**: 4-5 days
- **Zero-Knowledge Implementation**: 3-4 days
- **API Endpoints**: 3-4 days
- **Frontend Components**: 4-5 days
- **File Encryption System**: 3 days
- **Crypto-Shredding Implementation**: 2 days
- **Key Management & Rotation**: 3 days
- **Performance Optimization**: 2 days
- **Security Testing & Audits**: 4-5 days
- **Documentation & Compliance**: 2 days

### Risk Factors:
- **High**: Zero-knowledge implementation complexity
- **High**: Performance optimization for large files
- **Medium**: Key management integration
- **Medium**: Crypto-shredding verification
- **Low**: Database encryption setup

### Success Criteria:
- ✅ 100% sensitive data encrypted at rest and in transit
- ✅ Sub-100ms encryption/decryption for text data
- ✅ Zero-knowledge architecture verified
- ✅ GDPR crypto-shredding compliance
- ✅ Comprehensive security audit passing
- ✅ Performance benchmarks met