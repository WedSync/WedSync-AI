/**
 * AWS Cloud Provider Stub Implementation
 * Used when AWS SDK packages are not installed
 * Install @aws-sdk/client-ec2, @aws-sdk/client-rds, @aws-sdk/client-s3 to enable full functionality
 */

import BaseCloudProvider, {
  ResourceConfig,
  ScaleConfig,
  ResourceMetrics,
  CostData,
  TimeRange,
} from './base-provider';

import type { CloudProvider } from '@/types/cloud-infrastructure';

export class AWSProvider extends BaseCloudProvider {
  constructor(config: CloudProvider) {
    super(config);
    console.warn(
      'AWS Provider is running in stub mode. Install AWS SDK packages for full functionality.',
    );
  }

  async authenticate(credentials: Record<string, string>): Promise<boolean> {
    console.warn('AWS Provider: Authentication skipped in stub mode');
    return false;
  }

  async testConnection(timeout?: number): Promise<boolean> {
    console.warn('AWS Provider: Connection test skipped in stub mode');
    return false;
  }

  async createResource(config: ResourceConfig): Promise<string> {
    throw new Error(
      'AWS Provider: Create resource not available in stub mode. Install AWS SDK packages.',
    );
  }

  async deleteResource(resourceId: string): Promise<boolean> {
    throw new Error(
      'AWS Provider: Delete resource not available in stub mode. Install AWS SDK packages.',
    );
  }

  async scaleResource(
    resourceId: string,
    config: ScaleConfig,
  ): Promise<boolean> {
    throw new Error(
      'AWS Provider: Scale resource not available in stub mode. Install AWS SDK packages.',
    );
  }

  async getResourceMetrics(
    resourceId: string,
    timeRange: TimeRange,
  ): Promise<ResourceMetrics> {
    throw new Error(
      'AWS Provider: Get metrics not available in stub mode. Install AWS SDK packages.',
    );
  }

  async getCostData(
    resourceId: string,
    timeRange: TimeRange,
  ): Promise<CostData> {
    throw new Error(
      'AWS Provider: Get cost data not available in stub mode. Install AWS SDK packages.',
    );
  }

  async listResources(): Promise<any[]> {
    console.warn('AWS Provider: List resources not available in stub mode');
    return [];
  }

  async getResourceStatus(
    resourceId: string,
  ): Promise<'running' | 'stopped' | 'pending' | 'terminated'> {
    throw new Error(
      'AWS Provider: Get resource status not available in stub mode. Install AWS SDK packages.',
    );
  }
}
