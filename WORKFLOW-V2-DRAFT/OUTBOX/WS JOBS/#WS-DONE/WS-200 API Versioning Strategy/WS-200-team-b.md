# WS-200 API Versioning Strategy - Team B Backend Development

## 🎯 MISSION: Enterprise API Versioning Infrastructure

**Business Impact**: Build a robust backend system for API versioning that ensures seamless transitions for wedding suppliers, comprehensive migration support, and enterprise-grade backward compatibility. Enable thousands of wedding vendor integrations to upgrade safely without business disruption.

**Target Scale**: Support 10,000+ API integrations with automated version detection, migration assistance, and zero-downtime upgrades.

## 📋 TEAM B CORE DELIVERABLES

### 1. Comprehensive API Versioning System
Implement the core versioning infrastructure with automatic version detection and routing.

```typescript
// src/lib/api/versioning.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export class WedSyncAPIVersionManager {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Version configuration for wedding industry APIs
  private readonly VERSION_CONFIG = {
    v1: {
      version: 'v1',
      majorVersion: 1,
      minorVersion: 0,
      patchVersion: 0,
      status: 'stable',
      releaseDate: new Date('2024-01-15'),
      deprecationDate: new Date('2025-07-01'), // 6 months notice
      sunsetDate: new Date('2026-01-01'), // 12 months total
      supportedEndpoints: [
        '/api/v1/suppliers',
        '/api/v1/suppliers/{id}/clients',
        '/api/v1/forms',
        '/api/v1/forms/{id}/responses',
        '/api/v1/search/suppliers',
        '/api/v1/uploads/portfolio'
      ],
      weddingFeatures: [
        'basic_client_management',
        'form_creation',
        'supplier_search',
        'portfolio_upload'
      ],
      limitations: [
        'no_advanced_analytics',
        'no_ai_features',
        'basic_guest_management'
      ]
    },
    v2: {
      version: 'v2',
      majorVersion: 2,
      minorVersion: 0,
      patchVersion: 0,
      status: 'beta',
      releaseDate: new Date('2025-03-01'),
      supportedEndpoints: [
        '/api/v2/suppliers',
        '/api/v2/suppliers/{id}/clients',
        '/api/v2/suppliers/{id}/analytics',
        '/api/v2/forms',
        '/api/v2/forms/{id}/ai-suggestions',
        '/api/v2/search/suppliers',
        '/api/v2/ai/content-generation',
        '/api/v2/guests/management',
        '/api/v2/timeline/wedding-planning'
      ],
      weddingFeatures: [
        'advanced_client_management',
        'ai_powered_forms',
        'guest_list_management',
        'wedding_timeline_tracking',
        'supplier_analytics',
        'smart_recommendations'
      ],
      breakingChanges: [
        'client_response_structure_changed',
        'search_filters_enhanced',
        'authentication_requirements_updated'
      ],
      migrationRequired: true
    }
  };

  async detectAPIVersion(request: NextRequest): Promise<APIVersionInfo> {
    const pathname = request.nextUrl.pathname;
    
    // Method 1: URL path version detection (primary)
    const urlVersionMatch = pathname.match(/^\/api\/(v\d+(?:\.\d+)*)\//);
    if (urlVersionMatch) {
      const version = urlVersionMatch[1];
      return this.getVersionInfo(version);
    }

    // Method 2: Accept header version detection
    const acceptHeader = request.headers.get('accept');
    if (acceptHeader?.includes('application/vnd.wedsync.')) {
      const headerVersionMatch = acceptHeader.match(/application\/vnd\.wedsync\.(v\d+(?:\.\d+)*)\+json/);
      if (headerVersionMatch) {
        const version = headerVersionMatch[1];
        return this.getVersionInfo(version);
      }
    }

    // Method 3: Custom API-Version header
    const versionHeader = request.headers.get('API-Version');
    if (versionHeader) {
      return this.getVersionInfo(versionHeader);
    }

    // Default to latest stable version
    return this.getVersionInfo('v1');
  }

  async processVersionedRequest(request: NextRequest): Promise<NextResponse> {
    try {
      const versionInfo = await this.detectAPIVersion(request);
      
      // Log version usage for analytics
      await this.logVersionUsage({
        version: versionInfo.version,
        endpoint: request.nextUrl.pathname,
        clientIdentifier: this.extractClientIdentifier(request),
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date()
      });

      // Check if version is deprecated or sunset
      const deprecationResponse = await this.checkDeprecationStatus(versionInfo, request);
      if (deprecationResponse) {
        return deprecationResponse;
      }

      // Add version context to request headers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('X-API-Version', versionInfo.version);
      requestHeaders.set('X-API-Major-Version', versionInfo.majorVersion.toString());
      requestHeaders.set('X-Version-Status', versionInfo.status);

      return NextResponse.next({
        request: { headers: requestHeaders }
      });

    } catch (error) {
      console.error('API versioning error:', error);
      return this.createVersionErrorResponse(error);
    }
  }

  async checkDeprecationStatus(versionInfo: APIVersionInfo, request: NextRequest): Promise<NextResponse | null> {
    const now = new Date();

    // Check if version is sunset (no longer supported)
    if (versionInfo.sunsetDate && now > versionInfo.sunsetDate) {
      return NextResponse.json({
        error: {
          code: 'API_VERSION_SUNSET',
          message: `API version ${versionInfo.version} is no longer supported. Please upgrade to the latest version.`,
          sunsetDate: versionInfo.sunsetDate.toISOString(),
          migrationGuide: await this.getMigrationGuideUrl(versionInfo.version),
          supportedVersions: this.getSupportedVersions()
        }
      }, { status: 410 }); // Gone
    }

    // Check if version is deprecated
    if (versionInfo.deprecationDate && now > versionInfo.deprecationDate) {
      // Send deprecation notifications
      await this.sendDeprecationNotification({
        clientIdentifier: this.extractClientIdentifier(request),
        version: versionInfo.version,
        notificationType: 'deprecated_version_usage'
      });

      // Add deprecation headers but allow request to continue
      const response = NextResponse.next();
      response.headers.set('Deprecation', 'true');
      response.headers.set('Sunset', versionInfo.sunsetDate?.toUTCString() || '');
      response.headers.set('Link', `<${await this.getMigrationGuideUrl(versionInfo.version)}>; rel="successor-version"`);
      
      return response;
    }

    return null;
  }

  private extractClientIdentifier(request: NextRequest): string {
    // Try API key first
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (apiKey) return apiKey;

    // Try user ID from headers
    const userId = request.headers.get('X-User-ID');
    if (userId) return userId;

    // Fallback to IP address
    return request.headers.get('X-Forwarded-For')?.split(',')[0] || 
           request.headers.get('X-Real-IP') || 
           'unknown';
  }

  private getVersionInfo(version: string): APIVersionInfo {
    const config = this.VERSION_CONFIG[version];
    if (!config) {
      throw new Error(`Unsupported API version: ${version}`);
    }

    return {
      version: config.version,
      majorVersion: config.majorVersion,
      minorVersion: config.minorVersion,
      patchVersion: config.patchVersion,
      status: config.status,
      releaseDate: config.releaseDate,
      deprecationDate: config.deprecationDate,
      sunsetDate: config.sunsetDate,
      supportedEndpoints: config.supportedEndpoints,
      weddingFeatures: config.weddingFeatures
    };
  }

  private getSupportedVersions(): string[] {
    return Object.keys(this.VERSION_CONFIG)
      .filter(version => this.VERSION_CONFIG[version].status !== 'sunset');
  }

  async logVersionUsage(usage: VersionUsageLog): Promise<void> {
    try {
      await this.supabase
        .from('api_version_usage_logs')
        .insert({
          version: usage.version,
          endpoint: usage.endpoint,
          client_identifier: usage.clientIdentifier,
          user_agent: usage.userAgent,
          timestamp: usage.timestamp.toISOString(),
          request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
    } catch (error) {
      console.error('Failed to log version usage:', error);
    }
  }
}

export const apiVersionManager = new WedSyncAPIVersionManager();
```

### 2. Migration Planning and Assistance System
Build comprehensive migration planning with wedding-specific guidance.

```typescript
// src/lib/api/migration-planner.ts
interface MigrationPlan {
  from_version: string;
  to_version: string;
  total_estimated_hours: number;
  complexity: 'low' | 'medium' | 'high';
  steps: MigrationStep[];
  benefits: string[];
  risks: string[];
  timeline: MigrationTimeline;
  support_options: SupportOptions;
}

class APIVersionMigrationPlanner {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  async generateMigrationPlan(
    fromVersion: string, 
    toVersion: string, 
    clientContext: ClientContext
  ): Promise<MigrationPlan> {
    
    console.log(`🗺️ Generating migration plan: ${fromVersion} → ${toVersion}`);
    
    // Get compatibility matrix
    const compatibility = await this.getCompatibilityMatrix(fromVersion, toVersion);
    
    // Generate step-by-step migration plan
    const migrationSteps: MigrationStep[] = [];

    // Step 1: Assess breaking changes
    if (compatibility.breakingChanges.length > 0) {
      migrationSteps.push({
        step: 1,
        title: 'Address Breaking Changes',
        description: 'Update code to handle breaking changes in API responses',
        breakingChanges: compatibility.breakingChanges,
        estimatedTimeHours: compatibility.breakingChanges.length * 2,
        codeExamples: await this.getCodeExamples(fromVersion, toVersion),
        priority: 'high',
        weddingBusinessImpact: 'Critical for maintaining booking and payment functionality'
      });
    }

    // Step 2: Update authentication if needed
    if (this.requiresAuthenticationUpdate(fromVersion, toVersion)) {
      migrationSteps.push({
        step: 2,
        title: 'Update Authentication',
        description: 'Upgrade to new authentication requirements',
        changes: ['Bearer token format updated', 'New scopes required'],
        estimatedTimeHours: 4,
        priority: 'high',
        weddingBusinessImpact: 'Ensures secure access to client wedding data'
      });
    }

    // Step 3: Adopt new endpoints
    const newEndpoints = compatibility.newEndpoints.filter(endpoint => 
      this.isRelevantForClient(endpoint, clientContext)
    );
    
    if (newEndpoints.length > 0) {
      migrationSteps.push({
        step: 3,
        title: 'Adopt New Features',
        description: 'Integrate with new wedding industry features',
        newFeatures: newEndpoints.map(endpoint => ({
          endpoint,
          benefit: this.getFeatureBenefit(endpoint, clientContext.vendorType),
          optional: true
        })),
        estimatedTimeHours: newEndpoints.length * 3,
        priority: 'medium',
        weddingBusinessImpact: 'Enhances client experience with new wedding planning tools'
      });
    }

    // Step 4: Testing and validation
    migrationSteps.push({
      step: 4,
      title: 'Testing and Validation',
      description: 'Comprehensive testing of migrated integration',
      testingAreas: [
        'Core business workflows',
        'Error handling',
        'Performance validation',
        'Wedding season load testing'
      ],
      estimatedTimeHours: 8,
      priority: 'high',
      weddingBusinessImpact: 'Ensures reliability during critical wedding booking periods'
    });

    const totalEstimatedHours = migrationSteps.reduce((total, step) => 
      total + step.estimatedTimeHours, 0
    );

    return {
      from_version: fromVersion,
      to_version: toVersion,
      total_estimated_hours: totalEstimatedHours,
      complexity: this.assessMigrationComplexity(compatibility, totalEstimatedHours),
      steps: migrationSteps,
      benefits: await this.getVersionBenefits(toVersion, clientContext),
      risks: await this.getMigrationRisks(fromVersion, toVersion, clientContext),
      timeline: this.generateMigrationTimeline(migrationSteps, clientContext),
      support_options: {
        migrationGuide: await this.getMigrationGuideUrl(fromVersion, toVersion),
        codeExamples: await this.getCodeExamples(fromVersion, toVersion),
        supportContact: 'api-support@wedsync.app',
        dedicatedSupport: clientContext.subscriptionTier === 'enterprise'
      }
    };
  }

  private getFeatureBenefit(endpoint: string, vendorType?: string): string {
    const benefitMap = {
      '/api/v2/ai/content-generation': 'AI-powered content creation for faster form building',
      '/api/v2/guests/management': 'Advanced guest list management with RSVP tracking',
      '/api/v2/timeline/wedding-planning': 'Automated wedding timeline generation',
      '/api/v2/suppliers/{id}/analytics': 'Detailed performance analytics for your business',
      '/api/v2/forms/{id}/ai-suggestions': 'Smart form recommendations based on wedding type'
    };

    return benefitMap[endpoint] || 'Enhanced functionality for wedding management';
  }

  async trackMigrationProgress(
    clientIdentifier: string, 
    migrationData: MigrationProgressUpdate
  ): Promise<void> {
    try {
      await this.supabase
        .from('client_migrations')
        .upsert({
          client_identifier: clientIdentifier,
          from_version: migrationData.fromVersion,
          to_version: migrationData.toVersion,
          migration_status: migrationData.status,
          migration_started_at: migrationData.startedAt,
          migration_completed_at: migrationData.completedAt,
          breaking_changes_addressed: migrationData.breakingChangesAddressed,
          compatibility_issues: migrationData.compatibilityIssues,
          post_migration_error_rate: migrationData.postMigrationErrorRate,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'client_identifier,from_version,to_version'
        });

      // Send progress notifications if significant milestones reached
      if (migrationData.status === 'completed') {
        await this.sendMigrationSuccessNotification(clientIdentifier, migrationData);
      } else if (migrationData.status === 'failed') {
        await this.sendMigrationFailureSupport(clientIdentifier, migrationData);
      }

    } catch (error) {
      console.error('Failed to track migration progress:', error);
    }
  }

  private async getCompatibilityMatrix(fromVersion: string, toVersion: string): Promise<CompatibilityMatrix> {
    const { data: compatibility } = await this.supabase
      .from('api_compatibility_matrix')
      .select('*')
      .eq('current_version', fromVersion)
      .eq('target_version', toVersion)
      .single();

    if (compatibility) {
      return compatibility;
    }

    // Generate compatibility matrix if not exists
    return this.generateCompatibilityMatrix(fromVersion, toVersion);
  }

  private generateCompatibilityMatrix(fromVersion: string, toVersion: string): CompatibilityMatrix {
    const fromConfig = this.VERSION_CONFIG[fromVersion];
    const toConfig = this.VERSION_CONFIG[toVersion];

    if (!fromConfig || !toConfig) {
      throw new Error(`Invalid version configuration: ${fromVersion} -> ${toVersion}`);
    }

    // Compare endpoints
    const compatibleEndpoints = fromConfig.supportedEndpoints.filter(endpoint =>
      toConfig.supportedEndpoints.some(newEndpoint => 
        this.isEndpointCompatible(endpoint, newEndpoint)
      )
    );

    const newEndpoints = toConfig.supportedEndpoints.filter(endpoint =>
      !fromConfig.supportedEndpoints.some(oldEndpoint => 
        this.isEndpointCompatible(oldEndpoint, endpoint)
      )
    );

    const deprecatedEndpoints = fromConfig.supportedEndpoints.filter(endpoint =>
      !toConfig.supportedEndpoints.some(newEndpoint => 
        this.isEndpointCompatible(endpoint, newEndpoint)
      )
    );

    // Determine compatibility level
    let compatibilityLevel: string;
    if (toConfig.breakingChanges && toConfig.breakingChanges.length > 0) {
      compatibilityLevel = 'breaking_changes';
    } else if (newEndpoints.length > 0 || deprecatedEndpoints.length > 0) {
      compatibilityLevel = 'requires_changes';
    } else {
      compatibilityLevel = 'fully_compatible';
    }

    return {
      currentVersion: fromVersion,
      targetVersion: toVersion,
      isCompatible: compatibilityLevel !== 'breaking_changes',
      compatibilityLevel,
      compatibleEndpoints,
      newEndpoints,
      deprecatedEndpoints,
      breakingChanges: toConfig.breakingChanges || [],
      migrationEffortHours: this.estimateMigrationEffort(fromConfig, toConfig),
      migrationComplexity: this.assessComplexity(fromConfig, toConfig)
    };
  }

  private isEndpointCompatible(oldEndpoint: string, newEndpoint: string): boolean {
    // Remove version prefixes for comparison
    const oldPath = oldEndpoint.replace(/\/api\/v\d+/, '');
    const newPath = newEndpoint.replace(/\/api\/v\d+/, '');
    
    return oldPath === newPath;
  }

  private estimateMigrationEffort(fromConfig: any, toConfig: any): number {
    let hours = 0;
    
    // Base migration effort
    hours += 8; // Basic setup and testing
    
    // Add time for breaking changes
    if (toConfig.breakingChanges) {
      hours += toConfig.breakingChanges.length * 2;
    }
    
    // Add time for new feature adoption
    const newFeatures = toConfig.weddingFeatures.filter(
      feature => !fromConfig.weddingFeatures.includes(feature)
    );
    hours += newFeatures.length * 3;
    
    // Wedding season testing factor
    hours += 4; // Additional wedding season load testing
    
    return hours;
  }
}

export const migrationPlanner = new APIVersionMigrationPlanner();
```

### 3. API Routes for Version Management
Create comprehensive API endpoints for version management and migration assistance.

```typescript
// src/app/api/admin/versions/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get version information
    const { data: versions } = await supabase
      .from('api_versions')
      .select('*')
      .order('major_version', { ascending: true });

    // Get usage analytics
    const { data: usageAnalytics } = await supabase
      .from('api_version_usage')
      .select('*')
      .gte('measurement_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('measurement_date', { ascending: false });

    // Get migration progress
    const { data: migrationProgress } = await supabase
      .rpc('get_migration_summary');

    return NextResponse.json({
      success: true,
      data: {
        currentVersions: versions,
        usageAnalytics,
        migrationProgress,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to fetch API version status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version status' },
      { status: 500 }
    );
  }
}

// src/app/api/versions/migration-plan/route.ts
export async function POST(request: NextRequest) {
  try {
    const { fromVersion, toVersion, clientContext } = await request.json();
    
    if (!fromVersion || !toVersion) {
      return NextResponse.json(
        { error: 'Both fromVersion and toVersion are required' },
        { status: 400 }
      );
    }

    const migrationPlan = await migrationPlanner.generateMigrationPlan(
      fromVersion,
      toVersion,
      clientContext
    );

    return NextResponse.json({
      success: true,
      migrationPlan,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Migration plan generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate migration plan' },
      { status: 500 }
    );
  }
}

// src/app/api/versions/compatibility/route.ts
export async function POST(request: NextRequest) {
  try {
    const { fromVersion, toVersion, vendorContext } = await request.json();
    
    const compatibilityReport = await migrationPlanner.checkCompatibility(
      fromVersion,
      toVersion,
      vendorContext
    );

    return NextResponse.json({
      success: true,
      compatibility_report: compatibilityReport,
      checkedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Compatibility check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check compatibility' },
      { status: 500 }
    );
  }
}
```

## 📊 WEDDING BUSINESS CONTEXT INTEGRATION

### Critical Wedding API Operations:
- **Booking Management**: Seamless version transitions for venue and service bookings
- **Payment Processing**: Zero-downtime upgrades for revenue-critical payment APIs
- **Vendor Discovery**: Enhanced search capabilities without breaking existing integrations
- **Timeline Coordination**: Wedding day coordination APIs with backward compatibility

### Performance Targets:
- Version detection: <5ms overhead per request
- Migration plan generation: <10 seconds
- Compatibility checking: <3 seconds
- Deprecation notification delivery: <30 seconds

## 🧪 TESTING STRATEGY

### Backend Testing Suite:
```typescript
// tests/api-versioning.integration.test.ts
describe('API Versioning System', () => {
  test('detects API version from multiple sources correctly', async () => {
    const requests = [
      { url: '/api/v1/suppliers', expectedVersion: 'v1' },
      { url: '/api/v2/suppliers', expectedVersion: 'v2' },
      { headers: { 'API-Version': 'v1' }, expectedVersion: 'v1' }
    ];

    for (const req of requests) {
      const version = await apiVersionManager.detectAPIVersion(req as any);
      expect(version.version).toBe(req.expectedVersion);
    }
  });

  test('generates comprehensive migration plans for wedding vendors', async () => {
    const plan = await migrationPlanner.generateMigrationPlan('v1', 'v2', {
      vendorType: 'photographer',
      subscriptionTier: 'premium'
    });

    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.total_estimated_hours).toBeGreaterThan(0);
    expect(plan.benefits).toContain('AI-powered features');
  });
});
```

## 🚀 DEPLOYMENT & MONITORING

### Backend Deployment:
- **Zero-Downtime Deployments**: Blue-green deployment strategy for API version updates
- **Circuit Breakers**: Fault tolerance for version detection and migration services
- **Performance Monitoring**: Track version detection overhead and migration success rates
- **Wedding Season Optimization**: Enhanced monitoring during peak wedding periods

This backend system provides enterprise-grade API versioning specifically designed for the stability and growth requirements of wedding industry integrations.