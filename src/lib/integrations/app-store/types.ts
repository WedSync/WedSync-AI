/**
 * App Store Integration - Shared Type Definitions
 *
 * Shared type definitions to prevent circular dependencies in the app store
 * integration system. All app store services should use these types to ensure
 * compatibility and avoid circular imports.
 */

// Core app store metadata interface
export interface AppStoreMetadata {
  title: string;
  shortDescription: string;
  fullDescription: string;
  version: string;
  releaseNotes: string;
  keywords: string[];
  category: string;
  contentRating: string;
  privacyPolicyUrl: string;
  supportUrl: string;
  websiteUrl: string;
  contactEmail: string;
  screenshots: { [size: string]: string[] };
  icons: { [size: string]: string };
  promoVideoUrl?: string;
  features: string[];
  pricing?: {
    model: 'free' | 'paid' | 'freemium' | 'subscription';
    price?: number;
    currency?: string;
    subscriptionPeriod?: 'monthly' | 'yearly';
  };
  localization?: { [locale: string]: Partial<AppStoreMetadata> };
  weddingSpecific: {
    targetAudience: 'photographers' | 'planners' | 'couples' | 'vendors';
    weddingCategories: string[];
    seasonality: 'year-round' | 'seasonal';
    geographicFocus: string[];
  };
}

// Submission configuration interfaces
export interface SubmissionConfig {
  platforms: ('microsoft' | 'google' | 'apple')[];
  submissionType: 'immediate' | 'scheduled';
  scheduledDate?: Date;
  testMode?: boolean;
  notificationPreferences: {
    email: boolean;
    slack: boolean;
    dashboard: boolean;
  };
}

export interface SubmissionWorkflow {
  id: string;
  organizationId: string;
  config: SubmissionConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  platformSubmissions: { [platform: string]: string };
  assets: { [platform: string]: AppStoreAsset[] };
  metadata: AppStoreMetadata;
  progress: number;
  errors: string[];
  createdAt: Date;
  updatedAt: Date;
  submittedBy: string;
}

// Asset generation interfaces
export interface AssetGenerationConfig {
  platform: 'microsoft' | 'google' | 'apple';
  testMode: boolean;
  brandingOptions: {
    primaryColor: string;
    secondaryColor: string;
    logo: string;
    watermarkText?: string;
  };
  localization: {
    language: string;
    region: string;
    currency?: string;
  };
}

export interface GeneratedAsset {
  type: 'icon' | 'screenshot' | 'banner' | 'package';
  size: string;
  format: string;
  url: string;
  platform: string;
  generated: boolean;
  optimized: boolean;
  metadata: {
    fileSize: number;
    dimensions: { width: number; height: number };
    compression: number;
    quality: number;
  };
}

export interface PackageManifest {
  name: string;
  version: string;
  platform: string;
  files: {
    manifest: string;
    icons: { [size: string]: string };
    screenshots: string[];
    packageFile?: string;
  };
  metadata: AppStoreMetadata;
  signatures: {
    manifest: string;
    package?: string;
  };
}

// App store asset interface (referenced in multiple files)
export interface AppStoreAsset {
  id: string;
  type: 'icon' | 'screenshot' | 'banner';
  size: string;
  url: string;
  platform: string;
  optimized: boolean;
}

// Compliance interfaces
export interface ComplianceResult {
  isCompliant: boolean;
  violations: string[];
  warnings: string[];
  recommendations: string[];
}

export interface PlatformRequirements {
  metadata: {
    titleMinLength: number;
    titleMaxLength: number;
    shortDescriptionMinLength: number;
    shortDescriptionMaxLength: number;
    fullDescriptionMinLength: number;
    fullDescriptionMaxLength: number;
    keywordsMaxCount: number;
    keywordMaxLength: number;
    requiredFields: string[];
  };
  assets: {
    requiredIcons: { size: string; format: string[] }[];
    requiredScreenshots: { size: string; minCount: number; maxCount: number }[];
    maxFileSize: number; // in bytes
    supportedFormats: string[];
  };
  content: {
    prohibitedWords: string[];
    requiredDisclosures: string[];
    ageRatingRequirements: { [rating: string]: string[] };
    privacyPolicyRequired: boolean;
  };
  technical: {
    minVersion: string;
    supportedPlatforms: string[];
    requiredPermissions: string[];
    prohibitedPermissions: string[];
  };
}

// Store APIs interfaces (to avoid circular dependencies)
export interface StoreCredentials {
  microsoft?: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    partnerId: string;
  };
  google?: {
    serviceAccountKey: any;
    packageName: string;
  };
  apple?: {
    teamId: string;
    keyId: string;
    privateKey: string;
    bundleId: string;
  };
}

export interface SubmissionStatus {
  id: string;
  platform: string;
  status: 'pending' | 'processing' | 'review' | 'approved' | 'rejected';
  progress: number;
  lastUpdated: Date;
  statusDetails?: string;
  reviewNotes?: string;
}

// Service interfaces for dependency injection
export interface AssetDistributorInterface {
  generateAssets(
    config: AssetGenerationConfig,
    metadata: AppStoreMetadata,
  ): Promise<GeneratedAsset[]>;
  createPackageManifest(
    assets: GeneratedAsset[],
    metadata: AppStoreMetadata,
    platform: string,
  ): Promise<PackageManifest>;
}

export interface ComplianceCheckerInterface {
  validateForPlatform(
    platform: 'microsoft' | 'google' | 'apple',
    metadata: AppStoreMetadata,
    assets: AppStoreAsset[],
  ): Promise<ComplianceResult>;
  validateMetadata(
    platform: string,
    metadata: AppStoreMetadata,
  ): ComplianceResult;
  validateAssets(platform: string, assets: AppStoreAsset[]): ComplianceResult;
}

export interface SubmissionOrchestratorInterface {
  submitToStores(
    config: SubmissionConfig,
    metadata: AppStoreMetadata,
  ): Promise<SubmissionWorkflow>;
  getSubmissionStatus(workflowId: string): Promise<SubmissionWorkflow | null>;
  cancelSubmission(workflowId: string): Promise<boolean>;
}

// Service dependency injection interface
export interface AppStoreServices {
  assetDistributor?: AssetDistributorInterface;
  complianceChecker?: ComplianceCheckerInterface;
  submissionOrchestrator?: SubmissionOrchestratorInterface;
}
