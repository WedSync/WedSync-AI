import { AdvancedEncryption } from '@/lib/security/advanced-encryption';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: vi.fn()
}));
describe('Advanced Encryption System', () => {
  let encryptionManager: AdvancedEncryption;
  let mockSupabase: unknown;
  beforeEach(() => {
    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn(() => ({
        insert: jest.fn(() => Promise.resolve({ error: null })),
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        delete: jest.fn(() => ({
        upsert: jest.fn(() => Promise.resolve({ error: null }))
      })),
      rpc: jest.fn(() => Promise.resolve({ data: { keys_shredded: true, data_recoverable: false } }))
    };
    (createClientComponentClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
    encryptionManager = new AdvancedEncryption();
  });
  afterEach(() => {
    vi.clearAllMocks();
  describe('Key Generation', () => {
    test('should generate unique encryption keys per user', async () => {
      const user1Keys = await encryptionManager.generateUserKeys('user-1');
      const user2Keys = await encryptionManager.generateUserKeys('user-2');
      
      expect(user1Keys.publicKey).toBeDefined();
      expect(user1Keys.privateKey).toBeDefined();
      expect(user1Keys.salt).toBeDefined();
      expect(user1Keys.version).toBe(1);
      expect(user1Keys.publicKey).not.toEqual(user2Keys.publicKey);
      expect(user1Keys.privateKey).not.toEqual(user2Keys.privateKey);
      expect(user1Keys.salt).not.toEqual(user2Keys.salt);
    });
    test('should generate RSA keys with proper format', async () => {
      const keys = await encryptionManager.generateUserKeys('test-user');
      expect(keys.publicKey).toContain('-----BEGIN RSA PUBLIC KEY-----');
      expect(keys.publicKey).toContain('-----END RSA PUBLIC KEY-----');
      expect(keys.privateKey).toContain('-----BEGIN RSA PRIVATE KEY-----');
      expect(keys.privateKey).toContain('-----END RSA PRIVATE KEY-----');
    test('should store keys in database', async () => {
      const userId = 'test-user-123';
      await encryptionManager.generateUserKeys(userId);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_encryption_keys');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          public_key: expect.any(String),
          encrypted_private_key: expect.any(String),
          salt: expect.any(Buffer),
          key_version: 1,
          algorithm: 'aes-256-gcm'
        })
      );
  describe('Field Encryption', () => {
    test('should encrypt field-level data with AES-256-GCM', async () => {
      const sensitiveData = 'Credit Card: 4532-1234-5678-9012';
      const userKey = await encryptionManager.generateUserKeys('test-user');
      const encrypted = await encryptionManager.encryptField(
        sensitiveData, 
        userKey.publicKey, 
        'payment_info'
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.ciphertext).not.toContain('4532');
      expect(encrypted.ciphertext).not.toContain('1234');
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.nonce).toBeDefined();
      expect(encrypted.keyVersion).toBe(1);
    test('should generate unique nonces for each encryption', async () => {
      const data = 'Same data encrypted twice';
      const encrypted1 = await encryptionManager.encryptField(data, userKey.publicKey, 'field1');
      const encrypted2 = await encryptionManager.encryptField(data, userKey.publicKey, 'field2');
      expect(encrypted1.nonce).not.toEqual(encrypted2.nonce);
      expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
    test('should handle large data fields', async () => {
      const largeData = 'x'.repeat(10000); // 10KB of data
        largeData,
        userKey.publicKey,
        'large_field'
      expect(encrypted.ciphertext.length).toBeGreaterThan(0);
    test('should handle special characters and Unicode', async () => {
      const specialData = '🎉 Wedding Day! Venue: Château de Versailles €50,000';
        specialData,
        'unicode_field'
      expect(encrypted.ciphertext).not.toContain('Wedding');
      expect(encrypted.ciphertext).not.toContain('Château');
      expect(encrypted.ciphertext).not.toContain('€');
  describe('Field Decryption', () => {
    test('should successfully decrypt with correct keys', async () => {
      const originalData = 'Guest List: John Doe, Jane Smith, Bob Wilson';
        originalData, 
        'guest_list'
      const decrypted = await encryptionManager.decryptField(
        encrypted, 
        userKey.privateKey
      expect(decrypted).toEqual(originalData);
    test('should fail decryption with wrong keys', async () => {
      const sensitiveData = 'Venue: Secret Garden, Beverly Hills';
      const user1Key = await encryptionManager.generateUserKeys('user-1');
      const user2Key = await encryptionManager.generateUserKeys('user-2');
        user1Key.publicKey, 
        'venue_info'
      await expect(
        encryptionManager.decryptField(encrypted, user2Key.privateKey)
      ).rejects.toThrow('Decryption failed');
    test('should maintain data integrity', async () => {
      const testData = [
        'Client Name: Sarah Johnson',
        'Wedding Date: 2024-06-15',
        'Budget: $75,000',
        'Guest Count: 150'
      ];
      for (const data of testData) {
        const encrypted = await encryptionManager.encryptField(
          data,
          userKey.publicKey,
          'test_field'
        );
        
        const decrypted = await encryptionManager.decryptField(
          encrypted,
          userKey.privateKey
        expect(decrypted).toEqual(data);
      }
  describe('Key Rotation', () => {
    test('should rotate keys while preserving data access', async () => {
        'Client: Sarah & Michael Johnson',
        'Venue: Oceanview Resort & Spa'
      const initialKeys = await encryptionManager.generateUserKeys('test-user');
      // Mock encrypted fields retrieval
      mockSupabase.from = jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({
            data: testData.map((data, index) => ({
              id: `field-${index}`,
              encrypted_value: 'encrypted',
              nonce: Buffer.from('nonce'),
              column_name: `field_${index}`
            }))
        insert: jest.fn(() => Promise.resolve({ error: null }))
      }));
      // Encrypt data with initial keys
      const encryptedFields = await Promise.all(
        testData.map(data => 
          encryptionManager.encryptField(data, initialKeys.publicKey, 'test_field')
        )
      // Rotate keys
      const rotatedKeys = await encryptionManager.rotateUserKeys('test-user', initialKeys);
      expect(rotatedKeys.version).toBe(2);
      expect(rotatedKeys.publicKey).not.toEqual(initialKeys.publicKey);
      expect(rotatedKeys.privateKey).not.toEqual(initialKeys.privateKey);
    test('should track rotation history', async () => {
      const userId = 'test-user';
      const initialKeys = await encryptionManager.generateUserKeys(userId);
      await encryptionManager.rotateUserKeys(userId, initialKeys);
      expect(mockSupabase.from).toHaveBeenCalledWith('key_rotation_history');
    test('should handle rotation failure gracefully', async () => {
      // Mock rotation failure
          eq: jest.fn(() => Promise.resolve({ error: new Error('Rotation failed') }))
        encryptionManager.rotateUserKeys(userId, initialKeys)
      ).rejects.toThrow('Key rotation failed');
  describe('Crypto-Shredding for GDPR', () => {
    test('should render data permanently unrecoverable after shredding', async () => {
      const sensitiveData = [
        'SSN: 123-45-6789',
        'Credit Card: 4532-8901-2345-6789',
        'Address: 789 Private Lane, Beverly Hills, CA 90210'
      const userKeys = await encryptionManager.generateUserKeys('gdpr-test-user');
      // Encrypt sensitive data
      const encryptedData = await Promise.all(
        sensitiveData.map(data => 
          encryptionManager.encryptField(data, userKeys.publicKey, 'sensitive_field')
      // Verify data is accessible before shredding
      const decryptedBefore = await Promise.all(
        encryptedData.map(encrypted => 
          encryptionManager.decryptField(encrypted, userKeys.privateKey)
      expect(decryptedBefore).toEqual(sensitiveData);
      // Perform crypto-shredding
      await encryptionManager.cryptoShred('gdpr-test-user', 'user_request');
      // Mock shredded keys check
            single: jest.fn(() => Promise.resolve({ data: { user_id: 'gdpr-test-user' } }))
        }))
      // Attempt to decrypt - should fail
      await Promise.all(
          expect(
            encryptionManager.decryptField(encrypted, userKeys.privateKey)
          ).rejects.toThrow('Keys have been shredded')
    test('should create audit trail for shredding', async () => {
      await encryptionManager.cryptoShred('test-user', 'gdpr_compliance');
      expect(mockSupabase.from).toHaveBeenCalledWith('shredded_keys');
      expect(mockSupabase.from).toHaveBeenCalledWith('encryption_audit');
    test('should verify shredding completeness', async () => {
      await encryptionManager.cryptoShred(userId, 'user_request');
      // Mock shred audit retrieval
            single: jest.fn(() => Promise.resolve({
              data: {
                user_id: userId,
                reason: 'user_request',
                shredded_at: new Date().toISOString()
              }
      const shredAudit = await encryptionManager.getShredAudit(userId);
      expect(shredAudit).not.toBeNull();
      expect(shredAudit?.shredded).toBe(true);
      expect(shredAudit?.reason).toBe('user_request');
      expect(shredAudit?.shredded_at).toBeDefined();
  describe('Key Derivation', () => {
    test('should derive keys using Argon2id', async () => {
      const password = 'SecurePassword123!';
      const salt = Buffer.from('random-salt-value').toString('base64');
      const derivedKey = await encryptionManager.deriveKeyFromPassword(password, salt);
      expect(derivedKey).toBeInstanceOf(Buffer);
      expect(derivedKey.length).toBe(32); // 256 bits
    test('should produce different keys for different passwords', async () => {
      const salt = Buffer.from('same-salt').toString('base64');
      const key1 = await encryptionManager.deriveKeyFromPassword('Password1!', salt);
      const key2 = await encryptionManager.deriveKeyFromPassword('Password2!', salt);
      expect(key1).not.toEqual(key2);
    test('should produce different keys for different salts', async () => {
      const password = 'SamePassword123!';
      const key1 = await encryptionManager.deriveKeyFromPassword(
        password,
        Buffer.from('salt1').toString('base64')
      const key2 = await encryptionManager.deriveKeyFromPassword(
        Buffer.from('salt2').toString('base64')
  describe('Performance Metrics', () => {
    test('should record encryption performance metrics', async () => {
      await encryptionManager.recordPerformanceMetric(
        'encrypt',
        'clients',
        'sensitive_data',
        1024,
        50,
        'test-user'
      expect(mockSupabase.from).toHaveBeenCalledWith('performance_metrics');
          operation_type: 'encrypt',
          table_name: 'clients',
          field_name: 'sensitive_data',
          data_size_bytes: 1024,
          encryption_time_ms: 50,
          user_id: 'test-user'
  describe('Key Status Management', () => {
    test('should retrieve key status for a user', async () => {
      // Mock key status retrieval
            data: [
              { key_version: 2, status: 'active' },
              { key_version: 1, status: 'deprecated' }
            ]
      const keyStatus = await encryptionManager.getKeyStatus('test-user');
      expect(keyStatus.active.version).toBe(2);
      expect(keyStatus.deprecated).toHaveLength(1);
      expect(keyStatus.deprecated[0].version).toBe(1);
});
