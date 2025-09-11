/**
 * WS-251: Mobile Enterprise SSO - Web Crypto API Mock for Testing
 * Mock Web Crypto API for enterprise SSO encryption testing
 */

class MockCryptoKey {
  type: 'secret' | 'private' | 'public';
  extractable: boolean;
  algorithm: any;
  usages: KeyUsage[];

  constructor(type: 'secret' | 'private' | 'public', extractable: boolean, algorithm: any, usages: KeyUsage[]) {
    this.type = type;
    this.extractable = extractable;
    this.algorithm = algorithm;
    this.usages = usages;
  }
}

class MockSubtleCrypto {
  async generateKey(
    algorithm: any,
    extractable: boolean,
    keyUsages: KeyUsage[]
  ): Promise<CryptoKey | CryptoKeyPair> {
    if (algorithm.name === 'AES-GCM') {
      return new MockCryptoKey('secret', extractable, algorithm, keyUsages) as any;
    }
    
    if (algorithm.name === 'RSA-OAEP' || algorithm.name === 'RSA-PSS') {
      return {
        publicKey: new MockCryptoKey('public', extractable, algorithm, keyUsages),
        privateKey: new MockCryptoKey('private', extractable, algorithm, keyUsages)
      } as any;
    }

    return new MockCryptoKey('secret', extractable, algorithm, keyUsages) as any;
  }

  async importKey(
    format: KeyFormat,
    keyData: BufferSource | JsonWebKey,
    algorithm: any,
    extractable: boolean,
    keyUsages: KeyUsage[]
  ): Promise<CryptoKey> {
    return new MockCryptoKey('secret', extractable, algorithm, keyUsages) as any;
  }

  async exportKey(format: KeyFormat, key: CryptoKey): Promise<ArrayBuffer | JsonWebKey> {
    if (format === 'jwk') {
      return {
        kty: 'oct',
        k: 'mock-key-data',
        alg: 'A256GCM',
        use: 'enc'
      };
    }
    
    return new ArrayBuffer(32); // Mock key data
  }

  async encrypt(algorithm: any, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer> {
    const inputArray = new Uint8Array(data as ArrayBuffer);
    
    if (algorithm.name === 'AES-GCM') {
      // Mock AES-GCM encryption - just XOR with a pattern for testing
      const result = new Uint8Array(inputArray.length + 16); // +16 for auth tag
      
      for (let i = 0; i < inputArray.length; i++) {
        result[i] = inputArray[i] ^ 0xAA; // Simple XOR for testing
      }
      
      // Add mock auth tag
      for (let i = inputArray.length; i < result.length; i++) {
        result[i] = 0xFF;
      }
      
      return result.buffer;
    }
    
    // Default mock encryption
    const result = new Uint8Array(inputArray.length);
    for (let i = 0; i < inputArray.length; i++) {
      result[i] = inputArray[i] ^ 0x55;
    }
    
    return result.buffer;
  }

  async decrypt(algorithm: any, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer> {
    const inputArray = new Uint8Array(data as ArrayBuffer);
    
    if (algorithm.name === 'AES-GCM') {
      // Mock AES-GCM decryption - reverse of encryption
      const dataLength = inputArray.length - 16; // -16 for auth tag
      const result = new Uint8Array(dataLength);
      
      for (let i = 0; i < dataLength; i++) {
        result[i] = inputArray[i] ^ 0xAA; // Reverse XOR
      }
      
      return result.buffer;
    }
    
    // Default mock decryption
    const result = new Uint8Array(inputArray.length);
    for (let i = 0; i < inputArray.length; i++) {
      result[i] = inputArray[i] ^ 0x55;
    }
    
    return result.buffer;
  }

  async sign(algorithm: any, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer> {
    // Mock signature - just return a fixed-size buffer
    const signature = new Uint8Array(64); // 64 bytes for HMAC-SHA256/RSA
    
    for (let i = 0; i < signature.length; i++) {
      signature[i] = (i + 0x80) % 256;
    }
    
    return signature.buffer;
  }

  async verify(algorithm: any, key: CryptoKey, signature: BufferSource, data: BufferSource): Promise<boolean> {
    // Mock verification - always return true for testing unless signature is specifically "invalid"
    const sigArray = new Uint8Array(signature as ArrayBuffer);
    
    // Check for test failure case
    if (sigArray.length === 5 && 
        sigArray[0] === 0x69 && sigArray[1] === 0x6E && 
        sigArray[2] === 0x76 && sigArray[3] === 0x61 && 
        sigArray[4] === 0x6C) { // "inval" in hex
      return false;
    }
    
    return true;
  }

  async digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer> {
    const input = new Uint8Array(data as ArrayBuffer);
    
    if (algorithm === 'SHA-256') {
      // Mock SHA-256 - 32 bytes
      const result = new Uint8Array(32);
      let hash = 0;
      
      for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash + input[i]) & 0xffffffff;
      }
      
      // Fill result with hash-based pattern
      for (let i = 0; i < 32; i++) {
        result[i] = (hash + i) % 256;
      }
      
      return result.buffer;
    }
    
    if (algorithm === 'SHA-1') {
      // Mock SHA-1 - 20 bytes
      const result = new Uint8Array(20);
      let hash = 0;
      
      for (let i = 0; i < input.length; i++) {
        hash = ((hash << 3) - hash + input[i]) & 0xffffffff;
      }
      
      for (let i = 0; i < 20; i++) {
        result[i] = (hash + i) % 256;
      }
      
      return result.buffer;
    }
    
    // Default mock digest
    return new ArrayBuffer(32);
  }

  async deriveBits(algorithm: any, baseKey: CryptoKey, length: number): Promise<ArrayBuffer> {
    const result = new Uint8Array(length / 8);
    
    // Generate deterministic "random" bits for testing
    for (let i = 0; i < result.length; i++) {
      result[i] = (i * 17 + 42) % 256;
    }
    
    return result.buffer;
  }

  async deriveKey(
    algorithm: any,
    baseKey: CryptoKey,
    derivedKeyType: any,
    extractable: boolean,
    keyUsages: KeyUsage[]
  ): Promise<CryptoKey> {
    return new MockCryptoKey('secret', extractable, derivedKeyType, keyUsages) as any;
  }
}

// Mock the global crypto object
const mockSubtle = new MockSubtleCrypto();

global.crypto = {
  subtle: mockSubtle,
  
  getRandomValues<T extends ArrayBufferView>(array: T): T {
    // Fill with deterministic "random" values for testing
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = (i * 123 + 456) % 256;
    }
    
    return array;
  },
  
  randomUUID(): string {
    // Generate a deterministic UUID for testing
    return 'mock-uuid-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }
} as any;

// Export utilities for tests
export { mockSubtle, MockCryptoKey };

// Helper functions for testing specific scenarios
export const createMockAESKey = (): CryptoKey => {
  return new MockCryptoKey('secret', false, { name: 'AES-GCM', length: 256 }, ['encrypt', 'decrypt']) as any;
};

export const createMockRSAKeyPair = (): CryptoKeyPair => {
  return {
    publicKey: new MockCryptoKey('public', true, { name: 'RSA-OAEP' }, ['encrypt']),
    privateKey: new MockCryptoKey('private', false, { name: 'RSA-OAEP' }, ['decrypt'])
  } as any;
};

export const createMockEncryptedData = (plaintext: string): ArrayBuffer => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Mock encryption - XOR with pattern
  const result = new Uint8Array(data.length + 16); // +16 for auth tag
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ 0xAA;
  }
  
  // Add mock auth tag
  for (let i = data.length; i < result.length; i++) {
    result[i] = 0xFF;
  }
  
  return result.buffer;
};

export const mockCryptoError = (methodName: keyof SubtleCrypto) => {
  const originalMethod = mockSubtle[methodName];
  
  jest.spyOn(mockSubtle, methodName).mockRejectedValue(
    new DOMException('Mock crypto error', 'OperationError')
  );
  
  return () => {
    jest.spyOn(mockSubtle, methodName).mockImplementation(originalMethod as any);
  };
};

// Wedding-specific test data encryption helpers
export const createMockWeddingEncryptedCredentials = () => {
  const credentials = {
    weddingId: 'wedding-789',
    vendorType: 'photographer',
    accessToken: 'mock-token-123',
    refreshToken: 'mock-refresh-456',
    expiresAt: Date.now() + 3600000
  };
  
  return {
    credentials,
    encrypted: createMockEncryptedData(JSON.stringify(credentials))
  };
};

export const createMockBiometricKey = (): CryptoKey => {
  return new MockCryptoKey(
    'secret', 
    false, 
    { name: 'AES-GCM', length: 256 }, 
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  ) as any;
};