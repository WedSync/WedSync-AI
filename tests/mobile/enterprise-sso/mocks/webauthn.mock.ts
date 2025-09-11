/**
 * WS-251: Mobile Enterprise SSO - WebAuthn Mock for Testing
 * Mock WebAuthn API since it's not available in Jest test environment
 */

export interface MockCredential {
  id: string;
  rawId: ArrayBuffer;
  response: {
    clientDataJSON: ArrayBuffer;
    authenticatorData?: ArrayBuffer;
    signature?: ArrayBuffer;
    attestationObject?: ArrayBuffer;
  };
  type: string;
  authenticatorAttachment?: string;
}

class MockCredentialsContainer {
  async create(options: CredentialCreationOptions): Promise<MockCredential | null> {
    const publicKey = options.publicKey;
    if (!publicKey) return null;

    // Simulate successful credential creation
    return {
      id: 'mock-credential-id-' + Date.now(),
      rawId: new ArrayBuffer(32),
      response: {
        clientDataJSON: new TextEncoder().encode(JSON.stringify({
          type: 'webauthn.create',
          challenge: publicKey.challenge,
          origin: 'http://localhost:3000'
        })),
        attestationObject: new ArrayBuffer(64)
      },
      type: 'public-key',
      authenticatorAttachment: 'platform'
    };
  }

  async get(options: CredentialRequestOptions): Promise<MockCredential | null> {
    const publicKey = options.publicKey;
    if (!publicKey) return null;

    // Simulate successful authentication
    return {
      id: 'mock-credential-id-existing',
      rawId: new ArrayBuffer(32),
      response: {
        clientDataJSON: new TextEncoder().encode(JSON.stringify({
          type: 'webauthn.get',
          challenge: publicKey.challenge,
          origin: 'http://localhost:3000'
        })),
        authenticatorData: new ArrayBuffer(37),
        signature: new ArrayBuffer(64)
      },
      type: 'public-key',
      authenticatorAttachment: 'platform'
    };
  }
}

// Mock the global navigator.credentials
const mockCredentials = new MockCredentialsContainer();

// Mock PublicKeyCredential
global.PublicKeyCredential = {
  isUserVerifyingPlatformAuthenticatorAvailable: jest.fn().mockResolvedValue(true),
  isConditionalMediationAvailable: jest.fn().mockResolvedValue(true)
} as any;

// Mock navigator.credentials
Object.defineProperty(global.navigator, 'credentials', {
  value: mockCredentials,
  writable: true
});

// Export for use in tests
export { mockCredentials };

// Helper functions for test scenarios
export const mockWebAuthnError = (errorName: string) => {
  jest.spyOn(mockCredentials, 'create').mockRejectedValue(
    new DOMException(`Mock ${errorName}`, errorName)
  );
  jest.spyOn(mockCredentials, 'get').mockRejectedValue(
    new DOMException(`Mock ${errorName}`, errorName)
  );
};

export const mockWebAuthnSuccess = () => {
  jest.spyOn(mockCredentials, 'create').mockImplementation(
    mockCredentials.create.bind(mockCredentials)
  );
  jest.spyOn(mockCredentials, 'get').mockImplementation(
    mockCredentials.get.bind(mockCredentials)
  );
};

export const mockWebAuthnUnavailable = () => {
  Object.defineProperty(global.navigator, 'credentials', {
    value: undefined,
    writable: true
  });
  
  global.PublicKeyCredential = undefined as any;
};

export const restoreWebAuthnMocks = () => {
  Object.defineProperty(global.navigator, 'credentials', {
    value: mockCredentials,
    writable: true
  });
  
  global.PublicKeyCredential = {
    isUserVerifyingPlatformAuthenticatorAvailable: jest.fn().mockResolvedValue(true),
    isConditionalMediationAvailable: jest.fn().mockResolvedValue(true)
  } as any;
};