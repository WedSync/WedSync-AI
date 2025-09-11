# 02-data-encryption.md

# Data Encryption Strategy

## Overview

WedSync/WedMe implements comprehensive encryption at rest and in transit to protect sensitive wedding planning data, personal information, and business intelligence.

## Encryption Architecture

### 1. Encryption at Rest

### Database Encryption

```sql
-- Supabase provides automatic encryption at rest
-- Additional column-level encryption for sensitive data

-- Encrypted columns setup
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive supplier data
CREATE TABLE supplier_sensitive_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  -- Encrypted fields
  tax_id_encrypted BYTEA, -- Encrypted with AES-256
  bank_account_encrypted BYTEA,
  ssn_encrypted BYTEA,
  api_keys_encrypted JSONB, -- Encrypted JSON for multiple keys
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Encryption helper functions
CREATE OR REPLACE FUNCTION encrypt_sensitive(
  data TEXT,
  key TEXT
) RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(data, key, 'cipher-algo=aes256');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_sensitive(
  encrypted_data BYTEA,
  key TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_data, key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

```

### File Storage Encryption

```tsx
// File encryption before storage
import crypto from 'crypto';

class FileEncryption {
  private algorithm = 'aes-256-gcm';
  private keyDerivation = 'pbkdf2';

  async encryptFile(
    file: Buffer,
    userKey: string
  ): Promise<EncryptedFile> {
    // Generate salt for this file
    const salt = crypto.randomBytes(32);

    // Derive encryption key from user key
    const key = crypto.pbkdf2Sync(
      userKey,
      salt,
      100000,
      32,
      'sha256'
    );

    // Generate initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    // Encrypt file
    const encrypted = Buffer.concat([
      cipher.update(file),
      cipher.final()
    ]);

    // Get auth tag for verification
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      salt,
      iv,
      authTag,
      algorithm: this.algorithm
    };
  }

  async decryptFile(
    encryptedData: EncryptedFile,
    userKey: string
  ): Promise<Buffer> {
    // Derive key using same salt
    const key = crypto.pbkdf2Sync(
      userKey,
      encryptedData.salt,
      100000,
      32,
      'sha256'
    );

    // Create decipher
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key,
      encryptedData.iv
    );

    // Set auth tag for verification
    decipher.setAuthTag(encryptedData.authTag);

    // Decrypt file
    return Buffer.concat([
      decipher.update(encryptedData.encrypted),
      decipher.final()
    ]);
  }
}

```

### 2. Encryption in Transit

### TLS Configuration

```tsx
// TLS 1.3 enforcement for all connections
export const tlsConfig = {
  minVersion: 'TLSv1.3',
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ].join(':'),
  honorCipherOrder: true,
  secureOptions:
    crypto.constants.SSL_OP_NO_SSLv2 |
    crypto.constants.SSL_OP_NO_SSLv3 |
    crypto.constants.SSL_OP_NO_TLSv1 |
    crypto.constants.SSL_OP_NO_TLSv1_1 |
    crypto.constants.SSL_OP_NO_TLSv1_2
};

// HSTS header for HTTPS enforcement
export const hstsHeader = {
  'Strict-Transport-Security':
    'max-age=63072000; includeSubDomains; preload'
};

```

### API Request Encryption

```tsx
// Additional encryption layer for sensitive API requests
class APIEncryption {
  // Encrypt request payload
  async encryptRequest(
    data: any,
    publicKey: string
  ): Promise<string> {
    const sessionKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    // Encrypt session key with RSA public key
    const encryptedSessionKey = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      sessionKey
    );

    // Encrypt data with AES using session key
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      sessionKey,
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Combine all components
    return JSON.stringify({
      sessionKey: encryptedSessionKey.toString('base64'),
      iv: iv.toString('base64'),
      data: encrypted.toString('base64'),
      authTag: authTag.toString('base64')
    });
  }
}

```

### 3. Key Management

### Key Hierarchy

```tsx
interface KeyHierarchy {
  master: {
    storage: 'AWS_KMS' | 'GCP_KMS' | 'AZURE_KEY_VAULT';
    rotation: 'quarterly';
    algorithm: 'AES-256-GCM';
  };

  dataEncryption: {
    derivation: 'PBKDF2';
    iterations: 100000;
    rotation: 'annually';
    perTenant: true;
  };

  sessionKeys: {
    lifetime: '1 hour';
    algorithm: 'AES-256-GCM';
    storage: 'memory_only';
  };
}

```

### Key Rotation Strategy

```sql
-- Key rotation tracking
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type TEXT NOT NULL, -- master, data, session
  key_version INTEGER NOT NULL,
  key_hash TEXT NOT NULL, -- SHA-256 of key for verification
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  UNIQUE(key_type, key_version)
);

-- Automatic key rotation procedure
CREATE OR REPLACE FUNCTION rotate_encryption_keys()
RETURNS void AS $$
DECLARE
  current_version INTEGER;
  new_key TEXT;
BEGIN
  -- Get current key version
  SELECT MAX(key_version) INTO current_version
  FROM encryption_keys
  WHERE key_type = 'data' AND active = true;

  -- Generate new key (placeholder - actual implementation uses KMS)
  new_key := generate_new_key();

  -- Deactivate old key
  UPDATE encryption_keys
  SET active = false, rotated_at = NOW()
  WHERE key_type = 'data' AND key_version = current_version;

  -- Insert new key
  INSERT INTO encryption_keys (key_type, key_version, key_hash, expires_at)
  VALUES ('data', current_version + 1, SHA256(new_key), NOW() + INTERVAL '1 year');

  -- Re-encrypt sensitive data with new key
  PERFORM re_encrypt_sensitive_data(current_version, current_version + 1);
END;
$$ LANGUAGE plpgsql;

```

### 4. Field-Level Encryption

### PII Encryption

```tsx
// Encrypt personally identifiable information
class PIIEncryption {
  private fields = [
    'ssn',
    'tax_id',
    'passport_number',
    'drivers_license',
    'bank_account',
    'credit_card'
  ];

  encryptPII(data: any): any {
    const encrypted = { ...data };

    for (const field of this.fields) {
      if (data[field]) {
        encrypted[field] = this.encryptField(data[field]);
        encrypted[`${field}_encrypted`] = true;
        encrypted[`${field}_last4`] = this.getLast4(data[field]);
      }
    }

    return encrypted;
  }

  private encryptField(value: string): string {
    const key = this.getDerivedKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final()
    ]);

    return JSON.stringify({
      iv: iv.toString('base64'),
      data: encrypted.toString('base64'),
      tag: cipher.getAuthTag().toString('base64')
    });
  }

  private getLast4(value: string): string {
    // Store last 4 digits for display purposes
    return value.slice(-4).padStart(value.length, '*');
  }
}

```

### 5. Email & Communication Encryption

```tsx
// Email content encryption for sensitive communications
class EmailEncryption {
  async encryptEmail(
    recipient: string,
    subject: string,
    body: string
  ): Promise<EncryptedEmail> {
    // Use recipient's public key if available (PGP)
    const recipientKey = await this.getRecipientPublicKey(recipient);

    if (recipientKey) {
      // PGP encryption
      return this.pgpEncrypt(subject, body, recipientKey);
    }

    // Fall back to link-based encryption
    const token = crypto.randomBytes(32).toString('hex');
    const encryptedContent = await this.symmetricEncrypt(
      { subject, body },
      token
    );

    // Store encrypted content
    await this.storeEncryptedEmail(encryptedContent, token);

    // Send email with secure link
    return {
      to: recipient,
      subject: 'Secure message from WedSync',
      body: `You have a secure message. View it here: ${this.getSecureLink(token)}`
    };
  }
}

```

### 6. Backup Encryption

```tsx
// Backup encryption strategy
class BackupEncryption {
  async encryptBackup(data: any): Promise<EncryptedBackup> {
    // Generate backup-specific key
    const backupKey = crypto.randomBytes(32);

    // Encrypt backup data
    const encrypted = await this.encrypt(data, backupKey);

    // Split key using Shamir's Secret Sharing
    const keyShares = this.splitKey(backupKey, {
      shares: 5,
      threshold: 3
    });

    // Store shares in different locations
    await Promise.all([
      this.storeShare(keyShares[0], 'aws_s3'),
      this.storeShare(keyShares[1], 'gcp_storage'),
      this.storeShare(keyShares[2], 'azure_blob'),
      this.storeShare(keyShares[3], 'on_premise'),
      this.storeShare(keyShares[4], 'offline_vault')
    ]);

    return encrypted;
  }
}

```

### 7. Zero-Knowledge Architecture

```tsx
// Zero-knowledge proof for sensitive operations
class ZeroKnowledge {
  // Client-side encryption before sending to server
  async clientSideEncrypt(
    data: any,
    userPassword: string
  ): Promise<string> {
    // Derive key from password (never sent to server)
    const salt = await this.getUserSalt();
    const key = await this.deriveKey(userPassword, salt);

    // Encrypt data
    const encrypted = await this.encrypt(data, key);

    // Server never sees unencrypted data or password
    return encrypted;
  }

  // Verify password without server knowing it
  async verifyPassword(
    password: string,
    challenge: string
  ): Promise<string> {
    // Create proof of password knowledge
    const proof = await this.createProof(password, challenge);

    // Server can verify proof without knowing password
    return proof;
  }
}

```

### 8. Compliance-Specific Encryption

### GDPR Right to Erasure

```sql
-- Crypto-shredding for GDPR compliance
CREATE TABLE user_encryption_keys (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  key_encrypted BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delete user's encryption key to make data unrecoverable
CREATE OR REPLACE FUNCTION crypto_shred_user(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete user's encryption key
  DELETE FROM user_encryption_keys WHERE user_id = user_id;

  -- Mark user data as crypto-shredded
  UPDATE users SET crypto_shredded = true WHERE id = user_id;

  -- Log the action for compliance
  INSERT INTO gdpr_actions (user_id, action, timestamp)
  VALUES (user_id, 'crypto_shred', NOW());
END;
$$ LANGUAGE plpgsql;

```

### 9. Monitoring & Alerts

```tsx
// Encryption monitoring
class EncryptionMonitor {
  async checkEncryptionHealth(): Promise<HealthStatus> {
    const checks = await Promise.all([
      this.verifyTLSCertificates(),
      this.checkKeyRotation(),
      this.auditEncryptedFields(),
      this.validateBackupEncryption(),
      this.testDecryptionCapability()
    ]);

    // Alert on any failures
    const failures = checks.filter(c => !c.success);
    if (failures.length > 0) {
      await this.sendSecurityAlert({
        severity: 'critical',
        message: 'Encryption health check failed',
        failures
      });
    }

    return {
      healthy: failures.length === 0,
      checks
    };
  }
}

```

## Implementation Checklist

- [ ]  Enable Supabase encryption at rest
- [ ]  Implement column-level encryption for PII
- [ ]  Configure TLS 1.3 for all connections
- [ ]  Set up key management system (KMS)
- [ ]  Implement key rotation procedures
- [ ]  Configure backup encryption
- [ ]  Set up client-side encryption for sensitive forms
- [ ]  Implement crypto-shredding for GDPR
- [ ]  Configure encryption monitoring
- [ ]  Document key recovery procedures
- [ ]  Regular encryption audits
- [ ]  Penetration testing of encryption implementation