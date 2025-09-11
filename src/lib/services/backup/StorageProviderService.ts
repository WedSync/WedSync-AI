/**
 * StorageProviderService - Stub implementation
 * This is a basic stub to resolve build errors.
 * Full implementation to be added during backup system development.
 */

interface StorageProvider {
  id: string;
  provider_name: string;
  provider_type: string;
  provider_tier: string;
  configuration: Record<string, unknown>;
  is_active: boolean;
}

export class StorageProviderService {
  async store(
    provider: StorageProvider,
    data: any,
    filename: string,
  ): Promise<string> {
    // Stub implementation - returns a mock storage location
    const storageLocation = `${provider.provider_type}://${provider.provider_name}/${filename}`;

    console.warn(
      `StorageProviderService: Using stub implementation - data not actually stored to ${storageLocation}`,
    );

    return storageLocation;
  }

  async retrieve(
    provider: StorageProvider,
    storageLocation: string,
  ): Promise<any> {
    // Stub implementation - returns mock data
    console.warn(
      `StorageProviderService: Using stub implementation - returning mock data from ${storageLocation}`,
    );
    return { mock: 'data' };
  }

  async delete(
    provider: StorageProvider,
    storageLocation: string,
  ): Promise<boolean> {
    // Stub implementation - returns success
    console.warn(
      `StorageProviderService: Using stub implementation - not actually deleting ${storageLocation}`,
    );
    return true;
  }

  async validateProvider(provider: StorageProvider): Promise<boolean> {
    // Stub implementation - always returns valid
    return provider.is_active;
  }
}
