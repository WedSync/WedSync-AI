# TEAM D - BATCH 12 - ROUND 1: WS-148 Advanced Data Encryption System

## 🚀 MISSION OVERVIEW

**Team D**, you're implementing the **Advanced Data Encryption System (WS-148)** - the security foundation that protects every piece of sensitive client data in WedSync. This is not just encryption; it's a zero-knowledge architecture where even WedSync cannot access raw client data without proper authorization.

### 🎯 WEDDING CONTEXT & USER STORIES

**Primary User Story:**
*As a wedding photographer named Marcus who stores confidential client information including venue contracts, guest lists, and intimate photos, I need absolute confidence that if WedSync's database is compromised, my clients' sensitive information remains completely protected and unreadable.*

**Real Wedding Scenario:**
Sarah's Photography Studio handles 50+ weddings per year, storing everything from venue deposits ($15,000 contracts) to guest dietary restrictions. When Sarah heard about the recent data breach at a competitor platform, she realized she needed guarantees that client data is encrypted at the deepest level - not just "in transit" but completely scrambled even in WedSync's own database. The Advanced Data Encryption System ensures that even if hackers accessed WedSync servers directly, client data appears as meaningless encrypted strings.

**Critical Success Scenarios:**
1. **Client Contract Security**: Wedding supplier uploads a $25,000 venue contract PDF → System encrypts at field-level → Even database administrators see gibberish
2. **Guest List Protection**: Couple shares 200+ guest contacts with dietary restrictions → Each field encrypted separately → Breach cannot expose personal details
3. **Photo Metadata Safety**: Wedding photographer uploads 2,000+ photos with location/timestamp metadata → All EXIF data encrypted → Location privacy preserved
4. **Payment Information**: Client credit card details for deposit processing → Zero-knowledge encryption → Not even WedSync can see numbers

### 🔒 TECHNICAL SPECIFICATIONS

**Database Schema Foundation:**
```sql
-- Core encryption infrastructure
CREATE TABLE encryption.user_encryption_keys (
    user_id UUID REFERENCES user_profiles(id) PRIMARY KEY,
    public_key TEXT NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    salt BYTEA NOT NULL,
    key_version INTEGER DEFAULT 1,
    algorithm TEXT DEFAULT 'AES-256-GCM',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'rotating', 'deprecated'))
);

-- Field-level encryption mapping
CREATE TABLE encryption.encrypted_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    column_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    encrypted_value TEXT NOT NULL,
    encryption_key_id UUID REFERENCES encryption.user_encryption_keys(user_id),
    nonce BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(table_name, column_name, record_id)
);

-- Crypto-shredding for GDPR compliance
CREATE TABLE encryption.shredded_keys (
    user_id UUID PRIMARY KEY,
    shredded_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,
    performed_by UUID REFERENCES user_profiles(id)
);

-- Audit trail for encryption operations
CREATE TABLE encryption.encryption_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    operation TEXT NOT NULL,
    field_reference TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Zero-Knowledge Architecture Endpoints:**
```typescript
// POST /api/encryption/user-keys
interface UserKeySetupRequest {
  userId: string;
  clientPublicKey: string;
  passwordHash: string; // For key derivation
}

// POST /api/encryption/encrypt-field
interface FieldEncryptionRequest {
  tableId: string;
  fieldName: string;
  recordId: string;
  plaintext: string;
  userEncryptionKey: string;
}

// POST /api/encryption/decrypt-field
interface FieldDecryptionRequest {
  tableId: string;
  fieldName: string;
  recordId: string;
  userPrivateKey: string;
}

// POST /api/encryption/rotate-keys
interface KeyRotationRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

// DELETE /api/encryption/crypto-shred
interface CryptoShredRequest {
  userId: string;
  confirmationToken: string;
  reason: 'user_request' | 'gdpr_compliance' | 'security_incident';
}
```

### 🛠️ MCP SERVER USAGE INSTRUCTIONS

**Context7 Documentation (REQUIRED):**
```typescript
// Get latest encryption library documentation
await mcp__context7__resolve_library_id("crypto-js");
await mcp__context7__get_library_docs("/crypto-js/crypto-js", "AES encryption", 2000);

await mcp__context7__resolve_library_id("argon2");
await mcp__context7__get_library_docs("/phc-argon2/argon2", "key derivation", 1500);

await mcp__context7__resolve_library_id("node-forge");
await mcp__context7__get_library_docs("/digitalbazaar/forge", "RSA key generation", 2000);
```

**PostgreSQL MCP Operations (REQUIRED):**
```sql
-- Create encryption schema
CREATE SCHEMA IF NOT EXISTS encryption;

-- Test encryption/decryption performance
SELECT 
    COUNT(*) as total_encrypted_fields,
    AVG(length(encrypted_value)) as avg_encrypted_size,
    MIN(created_at) as oldest_encryption,
    MAX(created_at) as newest_encryption
FROM encryption.encrypted_fields;

-- Verify key rotation functionality
SELECT 
    user_id,
    key_version,
    status,
    EXTRACT(days FROM NOW() - created_at) as key_age_days
FROM encryption.user_encryption_keys 
WHERE status = 'active'
ORDER BY key_age_days DESC;
```

**Supabase MCP Configuration:**
```typescript
// Enable Row Level Security for encryption tables
await mcp__supabase__execute_sql(`
    ALTER TABLE encryption.user_encryption_keys ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can only access own keys" ON encryption.user_encryption_keys
        FOR ALL USING (user_id = auth.uid());
        
    ALTER TABLE encryption.encrypted_fields ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Access encrypted data with valid key" ON encryption.encrypted_fields
        FOR ALL USING (
            encryption_key_id IN (
                SELECT user_id FROM encryption.user_encryption_keys 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        );
`);
```

### 🧪 TESTING REQUIREMENTS

**Playwright E2E Encryption Tests:**
```typescript
test('End-to-end client data encryption workflow', async ({ page }) => {
  // Setup: Login as wedding photographer
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'photographer@wedding.test');
  await page.fill('[data-testid="password"]', 'SecurePass123!');
  await page.click('[data-testid="login-button"]');
  
  // Navigate to client creation
  await page.goto('/clients/new');
  await page.waitForSelector('[data-testid="client-form"]');
  
  // Fill sensitive client information
  await page.fill('[data-testid="client-name"]', 'John & Jane Smith');
  await page.fill('[data-testid="venue-address"]', '123 Secret Wedding Venue, Beverly Hills, CA');
  await page.fill('[data-testid="budget-amount"]', '85000');
  await page.selectOption('[data-testid="dietary-restrictions"]', ['vegan', 'gluten-free']);
  
  // Submit and verify encryption
  await page.click('[data-testid="save-client"]');
  await page.waitForSelector('[data-testid="client-saved-confirmation"]');
  
  // Backend verification: Data should be encrypted in database
  const encryptedData = await page.evaluate(async () => {
    const response = await fetch('/api/debug/encryption-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName: 'John & Jane Smith' })
    });
    return response.json();
  });
  
  expect(encryptedData.venue_address_encrypted).not.toContain('Beverly Hills');
  expect(encryptedData.budget_amount_encrypted).not.toContain('85000');
  expect(encryptedData.dietary_data_encrypted).not.toContain('vegan');
});

test('Crypto-shredding for GDPR deletion', async ({ page }) => {
  // Login and create test client with sensitive data
  await page.goto('/clients/test-client-123');
  
  // Verify client data is visible (decrypted correctly)
  await expect(page.locator('[data-testid="client-venue"]')).toContainText('Secret Wedding Venue');
  
  // Initiate GDPR deletion
  await page.goto('/settings/privacy');
  await page.click('[data-testid="gdpr-delete-account"]');
  await page.fill('[data-testid="confirmation-text"]', 'DELETE MY ACCOUNT');
  await page.click('[data-testid="confirm-crypto-shred"]');
  
  // Wait for shredding process
  await page.waitForSelector('[data-testid="crypto-shred-complete"]', { timeout: 10000 });
  
  // Verify data is truly unrecoverable
  const shredVerification = await page.evaluate(async () => {
    const response = await fetch('/api/debug/verify-crypto-shred', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test-user-123' })
    });
    return response.json();
  });
  
  expect(shredVerification.keys_shredded).toBe(true);
  expect(shredVerification.data_recoverable).toBe(false);
});

test('Key rotation during active session', async ({ page }) => {
  // Login with existing encrypted data
  await page.goto('/dashboard');
  
  // Verify existing data displays correctly
  await expect(page.locator('[data-testid="client-count"]')).toContainText('12 Active Clients');
  
  // Initiate key rotation
  await page.goto('/settings/security');
  await page.click('[data-testid="rotate-encryption-keys"]');
  await page.fill('[data-testid="current-password"]', 'CurrentPassword123!');
  await page.fill('[data-testid="new-password"]', 'NewStrongerPassword456!');
  await page.click('[data-testid="start-rotation"]');
  
  // Monitor rotation progress
  await page.waitForSelector('[data-testid="rotation-progress"]');
  const rotationComplete = await page.waitForSelector('[data-testid="rotation-complete"]', { timeout: 30000 });
  expect(rotationComplete).toBeTruthy();
  
  // Verify data still accessible with new keys
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="client-count"]')).toContainText('12 Active Clients');
  
  // Log out and back in with new password
  await page.click('[data-testid="logout"]');
  await page.fill('[data-testid="email"]', 'photographer@wedding.test');
  await page.fill('[data-testid="password"]', 'NewStrongerPassword456!');
  await page.click('[data-testid="login-button"]');
  
  // Confirm all data accessible
  await expect(page.locator('[data-testid="client-count"]')).toContainText('12 Active Clients');
});
```

**Jest Unit Tests:**
```typescript
import { AdvancedEncryption } from '@/lib/security/advanced-encryption';

describe('Advanced Encryption System', () => {
  let encryptionManager: AdvancedEncryption;
  
  beforeEach(() => {
    encryptionManager = new AdvancedEncryption();
  });
  
  test('should generate unique encryption keys per user', async () => {
    const user1Keys = await encryptionManager.generateUserKeys('user-1');
    const user2Keys = await encryptionManager.generateUserKeys('user-2');
    
    expect(user1Keys.publicKey).not.toEqual(user2Keys.publicKey);
    expect(user1Keys.privateKey).not.toEqual(user2Keys.privateKey);
    expect(user1Keys.salt).not.toEqual(user2Keys.salt);
  });
  
  test('should encrypt field-level data with AES-256-GCM', async () => {
    const sensitiveData = 'Credit Card: 4532-1234-5678-9012';
    const userKey = await encryptionManager.generateUserKeys('test-user');
    
    const encrypted = await encryptionManager.encryptField(
      sensitiveData, 
      userKey.publicKey, 
      'payment_info'
    );
    
    expect(encrypted.ciphertext).not.toContain('4532');
    expect(encrypted.ciphertext).not.toContain('1234');
    expect(encrypted.algorithm).toBe('AES-256-GCM');
    expect(encrypted.nonce).toHaveLength(24); // Base64 encoded 16-byte nonce
  });
  
  test('should successfully decrypt with correct keys', async () => {
    const originalData = 'Guest List: John Doe, Jane Smith, Bob Wilson';
    const userKey = await encryptionManager.generateUserKeys('test-user');
    
    const encrypted = await encryptionManager.encryptField(
      originalData, 
      userKey.publicKey, 
      'guest_list'
    );
    
    const decrypted = await encryptionManager.decryptField(
      encrypted, 
      userKey.privateKey
    );
    
    expect(decrypted).toEqual(originalData);
  });
  
  test('should fail decryption with wrong keys', async () => {
    const sensitiveData = 'Venue: Secret Garden, Beverly Hills';
    const user1Key = await encryptionManager.generateUserKeys('user-1');
    const user2Key = await encryptionManager.generateUserKeys('user-2');
    
    const encrypted = await encryptionManager.encryptField(
      sensitiveData, 
      user1Key.publicKey, 
      'venue_info'
    );
    
    await expect(
      encryptionManager.decryptField(encrypted, user2Key.privateKey)
    ).rejects.toThrow('Decryption failed: Invalid key or corrupted data');
  });
  
  test('should rotate keys while preserving data access', async () => {
    const testData = [
      'Client: Sarah & Michael Johnson',
      'Budget: $75,000',
      'Venue: Oceanview Resort & Spa'
    ];
    
    const initialKeys = await encryptionManager.generateUserKeys('test-user');
    
    // Encrypt data with initial keys
    const encryptedFields = await Promise.all(
      testData.map(data => 
        encryptionManager.encryptField(data, initialKeys.publicKey, 'test_field')
      )
    );
    
    // Rotate keys
    const rotatedKeys = await encryptionManager.rotateUserKeys('test-user', initialKeys);
    
    // Decrypt data with rotated keys - should work
    const decryptedFields = await Promise.all(
      encryptedFields.map(encrypted => 
        encryptionManager.decryptField(encrypted, rotatedKeys.privateKey)
      )
    );
    
    expect(decryptedFields).toEqual(testData);
    
    // Old keys should be marked as deprecated
    const keyStatus = await encryptionManager.getKeyStatus('test-user');
    expect(keyStatus.active.version).toBe(rotatedKeys.version);
    expect(keyStatus.deprecated).toHaveLength(1);
  });
});

describe('Crypto-Shredding for GDPR', () => {
  test('should render data permanently unrecoverable after shredding', async () => {
    const sensitiveData = [
      'SSN: 123-45-6789',
      'Credit Card: 4532-8901-2345-6789',
      'Address: 789 Private Lane, Beverly Hills, CA 90210'
    ];
    
    const userKeys = await encryptionManager.generateUserKeys('gdpr-test-user');
    
    // Encrypt sensitive data
    const encryptedData = await Promise.all(
      sensitiveData.map(data => 
        encryptionManager.encryptField(data, userKeys.publicKey, 'sensitive_field')
      )
    );
    
    // Verify data is accessible
    const decryptedBefore = await Promise.all(
      encryptedData.map(encrypted => 
        encryptionManager.decryptField(encrypted, userKeys.privateKey)
      )
    );
    expect(decryptedBefore).toEqual(sensitiveData);
    
    // Perform crypto-shredding
    await encryptionManager.cryptoShred('gdpr-test-user', 'user_request');
    
    // Attempt to decrypt - should fail completely
    await Promise.all(
      encryptedData.map(encrypted => 
        expect(
          encryptionManager.decryptField(encrypted, userKeys.privateKey)
        ).rejects.toThrow('Keys have been shredded')
      )
    );
    
    // Verify shredding audit trail
    const shredAudit = await encryptionManager.getShredAudit('gdpr-test-user');
    expect(shredAudit.shredded).toBe(true);
    expect(shredAudit.reason).toBe('user_request');
    expect(shredAudit.shredded_at).toBeDefined();
  });
});
```

### 🔄 INTEGRATION DEPENDENCIES

**Team Coordination Requirements:**
- **Team C (WS-147)**: Your encryption system integrates with their authentication security enhancements for key management
- **Team E (WS-149)**: Your crypto-shredding capabilities are essential for their GDPR compliance system
- **Team A & B**: Must coordinate on performance impact of field-level encryption on dashboard load times
- **All Teams**: Encryption affects every data field - coordinate on implementation timing

**Cross-Feature Dependencies:**
```typescript
// Client Management (WS-001-005) - Encrypt client data
interface ClientEncryption {
  name: string;           // Encrypted
  email: string;          // Encrypted  
  phone: string;          // Encrypted
  budget: number;         // Encrypted
  venue_details: string;  // Encrypted
  guest_count: number;    // Not encrypted (analytics needed)
  wedding_date: Date;     // Not encrypted (scheduling needed)
}

// Photo Management (WS-036) - Encrypt photo metadata
interface PhotoEncryption {
  filename: string;       // Not encrypted (file system)
  original_date: Date;    // Encrypted
  location_data: string;  // Encrypted (GPS coordinates)
  camera_settings: string; // Encrypted (EXIF data)
  client_notes: string;   // Encrypted
  file_size: number;      // Not encrypted (optimization)
}

// Journey Engine (WS-013-015) - Encrypt journey data
interface JourneyEncryption {
  journey_name: string;   // Not encrypted (templates)
  client_data: object;   // Encrypted (personalization)
  email_content: string; // Encrypted (personal details)
  execution_log: string; // Encrypted (client behavior)
  template_id: string;   // Not encrypted (system operation)
}
```

### 🎯 ACCEPTANCE CRITERIA

**Core Encryption Functionality:**
- [ ] AES-256-GCM encryption implemented for all sensitive data fields
- [ ] Zero-knowledge architecture: WedSync servers cannot decrypt user data
- [ ] Field-level encryption working for client information, photos, documents
- [ ] RSA-4096 public/private key pairs generated per user account
- [ ] Key derivation using Argon2id with appropriate salt and iterations
- [ ] Nonce generation ensuring no repetition across encryptions
- [ ] Encryption performance under 100ms for typical field sizes (< 1KB)

**Key Management System:**
- [ ] Automatic key generation during user account creation
- [ ] Secure key rotation functionality without data loss
- [ ] Key versioning system supporting multiple active key versions
- [ ] Password-based key derivation for user authentication
- [ ] Key recovery mechanism for legitimate password resets
- [ ] Key deprecation and cleanup for old versions (90-day retention)

**Crypto-Shredding for GDPR:**
- [ ] Immediate key destruction rendering all encrypted data unrecoverable
- [ ] Crypto-shredding audit trail with timestamp and reason
- [ ] GDPR "right to be forgotten" compliance through key destruction
- [ ] Selective shredding for specific data categories if needed
- [ ] Verification mechanism confirming data is truly unrecoverable
- [ ] Integration with GDPR compliance workflows

**Security & Performance:**
- [ ] All encryption operations use cryptographically secure random number generation
- [ ] Key material never stored in plaintext anywhere in system
- [ ] Memory cleared after encryption/decryption operations
- [ ] Database queries optimized to handle encrypted field searches where possible
- [ ] Monitoring and alerting for encryption/decryption failures
- [ ] Rate limiting on encryption operations to prevent abuse

**Error Handling & Recovery:**
- [ ] Graceful degradation when encryption keys are unavailable
- [ ] Clear error messages for key-related failures (without exposing sensitive info)
- [ ] Recovery procedures for corrupted encryption keys
- [ ] Backup and restore procedures for encryption infrastructure
- [ ] Data integrity verification after encryption/decryption operations

### 📊 SUCCESS METRICS

**Technical Performance Targets:**
- Encryption operation latency: < 100ms per field
- Key rotation completion: < 30 seconds for typical user
- Crypto-shredding execution: < 5 seconds for complete user data
- Database storage overhead: < 200% increase for encrypted fields
- Failed decryption rate: < 0.1% (excluding deliberate access denials)

**Security Validation Metrics:**
- Penetration test results: Zero recoverable data after crypto-shredding
- Key strength validation: All keys meet cryptographic standards
- Access control verification: 100% of unauthorized access attempts blocked
- Audit compliance: 100% of encryption operations logged

**User Experience Benchmarks:**
- No noticeable delay in UI response times for encrypted data display
- Seamless key rotation with zero user-facing disruption  
- Password reset recovery maintains full data access
- GDPR deletion requests completed within required timeframes

### 🚨 CRITICAL SECURITY NOTES

**DO NOT COMPROMISE ON:**
1. **Key Security**: Private keys must never be stored or transmitted in plaintext
2. **Algorithm Standards**: Only use approved cryptographic algorithms (AES-256-GCM, RSA-4096, Argon2id)
3. **Random Number Generation**: Use cryptographically secure randomness for all keys and nonces
4. **Memory Management**: Clear sensitive data from memory immediately after use
5. **Access Controls**: Implement defense in depth - multiple layers of access verification

**SECURITY TESTING REQUIREMENTS:**
- Run encryption against known test vectors to verify correctness
- Attempt brute force attacks on key derivation (should be computationally infeasible)
- Verify timing attack resistance in key operations
- Test key rotation under adverse conditions (network failures, etc.)
- Validate crypto-shredding makes data truly unrecoverable (forensic analysis)

This is a **CRITICAL SECURITY IMPLEMENTATION** - take extra time for thorough testing and code review. Wedding suppliers are trusting us with their most sensitive client data.

---

**Ready to secure WedSync at the deepest level? Let's build bulletproof encryption! 🔐**