/**
 * Cloud Infrastructure Management - Zod Validation Schemas
 * WS-257 Team B Implementation
 */

import { z } from 'zod';
import {
  CloudProviderType,
  ResourceType,
  ResourceState,
  DeploymentState,
  AlertSeverity,
} from '@/types/cloud-infrastructure';

// =====================================================
// CORE VALIDATION SCHEMAS
// =====================================================

// Base schemas
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const timestampSchema = z.coerce.date();
export const positiveNumberSchema = z.number().positive();
export const nonNegativeNumberSchema = z.number().min(0);

// Enum schemas
export const cloudProviderTypeSchema = z.nativeEnum(CloudProviderType);
export const resourceTypeSchema = z.nativeEnum(ResourceType);
export const resourceStateSchema = z.nativeEnum(ResourceState);
export const deploymentStateSchema = z.nativeEnum(DeploymentState);
export const alertSeveritySchema = z.nativeEnum(AlertSeverity);

// =====================================================
// CLOUD PROVIDER CREDENTIALS SCHEMAS
// =====================================================

export const awsCredentialsSchema = z.object({
  accessKeyId: z
    .string()
    .min(16)
    .max(128)
    .regex(/^AKIA[0-9A-Z]{16}$/, 'Invalid AWS Access Key ID format'),
  secretAccessKey: z.string().min(40).max(128),
  sessionToken: z.string().optional(),
  defaultRegion: z
    .string()
    .min(9)
    .max(20)
    .regex(/^[a-z0-9-]+$/, 'Invalid AWS region format'),
});

export const azureCredentialsSchema = z.object({
  clientId: z.string().uuid('Invalid Azure Client ID format'),
  clientSecret: z.string().min(32).max(128),
  tenantId: z.string().uuid('Invalid Azure Tenant ID format'),
  subscriptionId: z.string().uuid('Invalid Azure Subscription ID format'),
});

export const gcpCredentialsSchema = z
  .object({
    projectId: z
      .string()
      .min(6)
      .max(30)
      .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, 'Invalid GCP Project ID format'),
    keyFilePath: z.string().optional(),
    keyFileContent: z.string().optional(),
    serviceAccountEmail: z.string().email().optional(),
  })
  .refine((data) => data.keyFilePath || data.keyFileContent, {
    message: 'Either keyFilePath or keyFileContent must be provided',
    path: ['keyFileContent'],
  });

export const cloudProviderCredentialsSchema = z.union([
  awsCredentialsSchema,
  azureCredentialsSchema,
  gcpCredentialsSchema,
  z.record(z.unknown()), // Allow other provider types
]);

// =====================================================
// CLOUD PROVIDER SCHEMAS
// =====================================================

export const cloudProviderConfigurationSchema = z
  .object({
    defaultVpc: z.string().optional(),
    defaultSubnet: z.string().optional(),
    defaultSecurityGroup: z.string().optional(),
    tags: z.record(z.string()).optional(),
    autoSync: z.boolean().optional().default(false),
    syncIntervalMinutes: z.number().min(15).max(1440).optional().default(60),
    costTrackingEnabled: z.boolean().optional().default(true),
    monitoringEnabled: z.boolean().optional().default(true),
  })
  .catchall(z.unknown());

export const createCloudProviderSchema = z.object({
  name: z
    .string()
    .min(1, 'Provider name is required')
    .max(255, 'Provider name must be less than 255 characters')
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Provider name contains invalid characters'),
  providerType: cloudProviderTypeSchema,
  region: z
    .string()
    .min(1, 'Region is required')
    .max(100, 'Region must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Invalid region format'),
  credentials: cloudProviderCredentialsSchema,
  configuration: cloudProviderConfigurationSchema.optional().default({}),
});

export const updateCloudProviderSchema = z.object({
  name: z
    .string()
    .min(1, 'Provider name is required')
    .max(255, 'Provider name must be less than 255 characters')
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Provider name contains invalid characters')
    .optional(),
  region: z
    .string()
    .min(1, 'Region is required')
    .max(100, 'Region must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Invalid region format')
    .optional(),
  credentials: cloudProviderCredentialsSchema.optional(),
  configuration: cloudProviderConfigurationSchema.optional(),
  isActive: z.boolean().optional(),
});

export const cloudProviderFilterSchema = z.object({
  providerType: cloudProviderTypeSchema.optional(),
  region: z.string().optional(),
  isActive: z.boolean().optional(),
  syncStatus: z.enum(['pending', 'syncing', 'synced', 'error']).optional(),
});

// =====================================================
// CLOUD RESOURCE SCHEMAS
// =====================================================

export const createResourceGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Resource group name is required')
    .max(255, 'Resource group name must be less than 255 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_.]+$/,
      'Resource group name contains invalid characters',
    ),
  description: z.string().max(1000).optional(),
  tags: z.record(z.string()).optional().default({}),
});

export const cloudResourceSchema = z.object({
  name: z
    .string()
    .min(1, 'Resource name is required')
    .max(255, 'Resource name must be less than 255 characters'),
  resourceType: resourceTypeSchema,
  providerResourceId: z
    .string()
    .min(1, 'Provider resource ID is required')
    .max(500, 'Provider resource ID too long'),
  arnOrId: z.string().max(1000).optional(),
  configuration: z.record(z.unknown()).default({}),
  state: resourceStateSchema,
  region: z
    .string()
    .min(1, 'Region is required')
    .max(100, 'Region must be less than 100 characters'),
  availabilityZone: z.string().max(100).optional(),
  monthlyCost: z.number().min(0).optional(),
  currency: z.string().length(3).default('USD'),
  tags: z.record(z.string()).default({}),
  metadata: z.record(z.unknown()).default({}),
});

export const resourceFilterSchema = z.object({
  resourceType: resourceTypeSchema.optional(),
  state: resourceStateSchema.optional(),
  cloudProviderId: uuidSchema.optional(),
  resourceGroupId: uuidSchema.optional(),
  region: z.string().optional(),
  tags: z.record(z.string()).optional(),
});

// =====================================================
// DEPLOYMENT SCHEMAS
// =====================================================

export const deploymentVariablesSchema = z.record(
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.unknown()),
    z.record(z.unknown()),
  ]),
);

export const createDeploymentSchema = z.object({
  name: z
    .string()
    .min(1, 'Deployment name is required')
    .max(255, 'Deployment name must be less than 255 characters')
    .regex(/^[a-zA-Z0-9\-_.]+$/, 'Deployment name contains invalid characters'),
  description: z.string().max(1000).optional(),
  templateContent: z.record(z.unknown()),
  templateType: z
    .enum(['terraform', 'arm', 'cloudformation', 'pulumi', 'ansible'])
    .default('terraform'),
  variables: deploymentVariablesSchema.default({}),
  tags: z.record(z.string()).default({}),
});

export const updateDeploymentSchema = z.object({
  name: z
    .string()
    .min(1, 'Deployment name is required')
    .max(255, 'Deployment name must be less than 255 characters')
    .regex(/^[a-zA-Z0-9\-_.]+$/, 'Deployment name contains invalid characters')
    .optional(),
  description: z.string().max(1000).optional(),
  templateContent: z.record(z.unknown()).optional(),
  variables: deploymentVariablesSchema.optional(),
  tags: z.record(z.string()).optional(),
});

// =====================================================
// COST MANAGEMENT SCHEMAS
// =====================================================

export const createCostBudgetSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Budget name is required')
      .max(255, 'Budget name must be less than 255 characters'),
    description: z.string().max(1000).optional(),
    budgetAmount: positiveNumberSchema,
    currency: z.string().length(3).default('USD'),
    period: z
      .enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
      .default('monthly'),
    warningThresholdPercent: z.number().min(1).max(100).default(80),
    criticalThresholdPercent: z.number().min(1).max(100).default(95),
    cloudProviderId: uuidSchema.optional(),
    resourceGroupId: uuidSchema.optional(),
  })
  .refine(
    (data) => data.warningThresholdPercent <= data.criticalThresholdPercent,
    {
      message:
        'Warning threshold must be less than or equal to critical threshold',
      path: ['criticalThresholdPercent'],
    },
  );

export const costOptimizationRecommendationSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  recommendationType: z.string().min(1).max(100),
  impact: z.enum(['low', 'medium', 'high', 'critical']),
  estimatedMonthlySavings: nonNegativeNumberSchema,
  currency: z.string().length(3).default('USD'),
  confidenceScore: z.number().min(0).max(100),
  implementationEffort: z.enum(['low', 'medium', 'high']),
  implementationSteps: z.array(z.string()),
  automationAvailable: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
});

// =====================================================
// DISASTER RECOVERY SCHEMAS
// =====================================================

export const createDRPlanSchema = z.object({
  name: z
    .string()
    .min(1, 'DR plan name is required')
    .max(255, 'DR plan name must be less than 255 characters'),
  description: z.string().max(1000).optional(),
  planType: z
    .enum([
      'backup_restore',
      'failover',
      'pilot_light',
      'warm_standby',
      'hot_standby',
    ])
    .default('backup_restore'),
  rtoMinutes: positiveNumberSchema,
  rpoMinutes: positiveNumberSchema,
  priority: z.number().min(1).max(10).default(1),
  recoverySteps: z
    .array(z.string())
    .min(1, 'At least one recovery step is required'),
  rollbackSteps: z
    .array(z.string())
    .min(1, 'At least one rollback step is required'),
  dependencies: z.array(z.string()).default([]),
  testFrequencyDays: z.number().min(1).max(365).default(90),
  tags: z.record(z.string()).default({}),
  contacts: z.array(z.string().email()).default([]),
});

export const executeFailoverSchema = z.object({
  drPlanId: uuidSchema,
  executionType: z
    .enum(['manual', 'automated', 'test', 'rollback'])
    .default('manual'),
  triggerReason: z.string().min(1).max(1000),
  estimatedCompletionMinutes: positiveNumberSchema.optional(),
});

// =====================================================
// MONITORING SCHEMAS
// =====================================================

export const createAlertRuleSchema = z.object({
  name: z
    .string()
    .min(1, 'Alert rule name is required')
    .max(255, 'Alert rule name must be less than 255 characters'),
  description: z.string().max(1000).optional(),
  metricName: z
    .string()
    .min(1, 'Metric name is required')
    .max(255, 'Metric name must be less than 255 characters'),
  condition: z
    .string()
    .min(1, 'Condition is required')
    .max(500, 'Condition must be less than 500 characters'),
  thresholdValue: z.number(),
  comparisonOperator: z.enum(['>', '<', '>=', '<=', '=', '!=']),
  severity: alertSeveritySchema,
  evaluationPeriodMinutes: z.number().min(1).max(1440).default(5),
  notificationChannels: z.array(z.string()).default([]),
  cloudProviderId: uuidSchema.optional(),
  resourceId: uuidSchema.optional(),
});

export const acknowledgeAlertSchema = z.object({
  acknowledgedBy: uuidSchema,
  notes: z.string().max(1000).optional(),
});

export const resolveAlertSchema = z.object({
  resolvedBy: uuidSchema,
  resolutionNotes: z.string().max(1000).optional(),
});

// =====================================================
// PAGINATION SCHEMAS
// =====================================================

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const searchSchema = z
  .object({
    query: z.string().max(255).optional(),
    filters: z.record(z.unknown()).optional(),
  })
  .merge(paginationSchema);

// =====================================================
// API RESPONSE SCHEMAS
// =====================================================

export const testConnectionRequestSchema = z.object({
  timeout: z.number().min(1000).max(30000).optional().default(10000),
  includeRegions: z.boolean().optional().default(true),
  includeServices: z.boolean().optional().default(false),
});

export const syncResourcesRequestSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  resourceTypes: z.array(resourceTypeSchema).optional(),
  regions: z.array(z.string()).optional(),
  syncMetrics: z.boolean().optional().default(true),
  syncCosts: z.boolean().optional().default(true),
});

// =====================================================
// AUDIT SCHEMAS
// =====================================================

export const auditLogSchema = z.object({
  action: z.string().min(1).max(255),
  resourceType: z.string().min(1).max(100),
  resourceId: uuidSchema.optional(),
  oldValues: z.record(z.unknown()).optional(),
  newValues: z.record(z.unknown()).optional(),
  changes: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  sessionId: z.string().optional(),
  apiKeyId: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});

// =====================================================
// COMPLIANCE SCHEMAS
// =====================================================

export const createComplianceCheckSchema = z.object({
  checkName: z
    .string()
    .min(1, 'Check name is required')
    .max(255, 'Check name must be less than 255 characters'),
  checkType: z.enum([
    'security',
    'cost',
    'performance',
    'availability',
    'governance',
  ]),
  description: z.string().max(1000).optional(),
  complianceFramework: z.string().max(100).optional(),
  checkConfiguration: z.record(z.unknown()).default({}),
  scheduleCron: z.string().optional(),
  isActive: z.boolean().default(true),
});

// =====================================================
// VALIDATION HELPERS
// =====================================================

export const validateCloudProviderCredentials = (
  providerType: CloudProviderType,
  credentials: unknown,
): boolean => {
  try {
    switch (providerType) {
      case CloudProviderType.AWS:
        awsCredentialsSchema.parse(credentials);
        return true;
      case CloudProviderType.AZURE:
        azureCredentialsSchema.parse(credentials);
        return true;
      case CloudProviderType.GCP:
        gcpCredentialsSchema.parse(credentials);
        return true;
      default:
        // For other providers, just check if it's a valid object
        return typeof credentials === 'object' && credentials !== null;
    }
  } catch {
    return false;
  }
};

export const sanitizeCloudProviderCredentials = (
  credentials: Record<string, unknown>,
): Record<string, unknown> => {
  const sanitized = { ...credentials };

  // Remove sensitive fields from logs
  const sensitiveFields = [
    'secretAccessKey',
    'clientSecret',
    'keyFileContent',
    'password',
    'token',
    'apiKey',
    'privateKey',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
};

// =====================================================
// TYPE EXPORTS
// =====================================================

export type CreateCloudProviderInput = z.infer<
  typeof createCloudProviderSchema
>;
export type UpdateCloudProviderInput = z.infer<
  typeof updateCloudProviderSchema
>;
export type CloudProviderFilterInput = z.infer<
  typeof cloudProviderFilterSchema
>;
export type CreateResourceGroupInput = z.infer<
  typeof createResourceGroupSchema
>;
export type ResourceFilterInput = z.infer<typeof resourceFilterSchema>;
export type CreateDeploymentInput = z.infer<typeof createDeploymentSchema>;
export type CreateCostBudgetInput = z.infer<typeof createCostBudgetSchema>;
export type CreateDRPlanInput = z.infer<typeof createDRPlanSchema>;
export type CreateAlertRuleInput = z.infer<typeof createAlertRuleSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type TestConnectionInput = z.infer<typeof testConnectionRequestSchema>;
export type SyncResourcesInput = z.infer<typeof syncResourcesRequestSchema>;
export type AuditLogInput = z.infer<typeof auditLogSchema>;
export type CreateComplianceCheckInput = z.infer<
  typeof createComplianceCheckSchema
>;
