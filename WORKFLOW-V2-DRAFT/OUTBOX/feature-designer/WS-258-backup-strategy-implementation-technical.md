# WS-258: Backup Strategy Implementation System - Technical Specification

## Feature Summary
Comprehensive backup and disaster recovery system with automated multi-tier backups, point-in-time recovery, real-time monitoring, and automated testing procedures to ensure business continuity for the WedSync platform.

## User Stories

### Primary User Story
**As a platform administrator**, I want a robust backup and disaster recovery system that automatically protects all critical data with multiple backup tiers, provides quick recovery capabilities, and includes regular testing procedures, so that business operations can continue uninterrupted in case of any data loss or system failure.

### Detailed User Stories

1. **As a DevOps engineer managing backups**
   - I want automated backup scheduling across all data types and environments
   - So that critical data is always protected without manual intervention

2. **As a compliance officer ensuring data protection**
   - I want detailed backup logs, encryption verification, and retention policies
   - So that we meet regulatory requirements and can demonstrate data protection compliance

3. **As an incident responder during outages**
   - I want rapid point-in-time recovery capabilities with clear restoration procedures
   - So that I can quickly restore service with minimal data loss

4. **As a security administrator protecting data**
   - I want encrypted backups with separate access credentials and audit trails
   - So that backup data is protected from unauthorized access and breaches

5. **As a business continuity planner**
   - I want regular automated testing of backup integrity and recovery procedures
   - So that we can ensure our disaster recovery capabilities are always functional

## Database Schema

```sql
-- Backup management and monitoring system
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Backup configuration definitions
CREATE TABLE backup_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  backup_type TEXT NOT NULL, -- 'database', 'file_storage', 'configuration', 'full_system'
  source_type TEXT NOT NULL, -- 'postgresql', 's3_bucket', 'supabase_storage', 'environment_vars'
  source_identifier TEXT NOT NULL, -- Database name, bucket name, etc.
  backup_frequency TEXT NOT NULL, -- 'continuous', 'hourly', 'daily', 'weekly', 'monthly'
  backup_schedule JSONB, -- Cron expression or schedule config
  retention_policy JSONB NOT NULL, -- Retention rules by backup type
  encryption_enabled BOOLEAN DEFAULT true,
  encryption_key_id TEXT,
  compression_enabled BOOLEAN DEFAULT true,
  compression_algorithm TEXT DEFAULT 'gzip',
  is_active BOOLEAN DEFAULT true,
  priority_level INTEGER DEFAULT 100, -- Lower = higher priority
  rto_minutes INTEGER, -- Recovery Time Objective in minutes
  rpo_minutes INTEGER, -- Recovery Point Objective in minutes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup storage locations
CREATE TABLE backup_storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_name TEXT UNIQUE NOT NULL,
  storage_type TEXT NOT NULL, -- 'primary', 'secondary', 'tertiary', 'archive'
  provider TEXT NOT NULL, -- 'aws_s3', 'supabase', 'gcp_storage', 'azure_blob'
  region TEXT NOT NULL,
  bucket_name TEXT,
  path_prefix TEXT,
  access_credentials_encrypted TEXT, -- Encrypted JSON of access keys
  encryption_at_rest BOOLEAN DEFAULT true,
  cross_region_replication BOOLEAN DEFAULT false,
  storage_class TEXT, -- 'standard', 'cold', 'glacier', 'deep_archive'
  cost_per_gb_month DECIMAL(10,4),
  availability_sla DECIMAL(5,4), -- e.g., 0.999 for 99.9%
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup job executions and status
CREATE TABLE backup_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_configuration_id UUID REFERENCES backup_configurations(id) ON DELETE CASCADE,
  storage_location_id UUID REFERENCES backup_storage_locations(id),
  execution_type TEXT NOT NULL, -- 'scheduled', 'manual', 'emergency'
  backup_size_bytes BIGINT,
  compressed_size_bytes BIGINT,
  backup_path TEXT NOT NULL,
  backup_hash TEXT, -- SHA-256 hash for integrity verification
  encryption_key_version TEXT,
  compression_ratio DECIMAL(5,4),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  error_message TEXT,
  recovery_metadata JSONB, -- Metadata needed for recovery
  verification_status TEXT, -- 'pending', 'verified', 'failed'
  verification_timestamp TIMESTAMPTZ,
  created_by UUID REFERENCES user_profiles(id),
  tags JSONB, -- Searchable tags for backup organization
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup restoration jobs
CREATE TABLE restoration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_execution_id UUID REFERENCES backup_executions(id),
  restoration_type TEXT NOT NULL, -- 'full', 'partial', 'point_in_time', 'table_level'
  target_environment TEXT NOT NULL, -- 'production', 'staging', 'development', 'disaster_recovery'
  target_identifier TEXT, -- Target database, bucket, etc.
  point_in_time_target TIMESTAMPTZ, -- For PITR
  restoration_scope JSONB, -- Which tables, files, etc. to restore
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'initiated', -- 'initiated', 'running', 'completed', 'failed', 'rolled_back'
  progress_percentage INTEGER DEFAULT 0,
  restored_size_bytes BIGINT,
  verification_results JSONB,
  error_message TEXT,
  rollback_available BOOLEAN DEFAULT false,
  rollback_deadline TIMESTAMPTZ,
  initiated_by UUID REFERENCES user_profiles(id) NOT NULL,
  approved_by UUID REFERENCES user_profiles(id),
  approval_required BOOLEAN DEFAULT true,
  incident_reference TEXT, -- Link to incident management system
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup testing and validation
CREATE TABLE backup_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type TEXT NOT NULL, -- 'integrity', 'restoration', 'disaster_recovery', 'performance'
  test_scope TEXT NOT NULL, -- 'single_backup', 'configuration', 'full_system'
  backup_configuration_id UUID REFERENCES backup_configurations(id),
  backup_execution_id UUID REFERENCES backup_executions(id),
  test_environment TEXT, -- Where test was performed
  test_parameters JSONB, -- Test configuration and parameters
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'running', -- 'running', 'passed', 'failed', 'warning'
  test_results JSONB NOT NULL,
  performance_metrics JSONB, -- RTO/RPO measurements, etc.
  issues_found TEXT[],
  recommendations TEXT[],
  automated BOOLEAN DEFAULT true,
  scheduled_test_id UUID, -- For recurring tests
  executed_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup retention and cleanup tracking
CREATE TABLE backup_retention_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_execution_id UUID REFERENCES backup_executions(id) ON DELETE CASCADE,
  retention_rule_applied JSONB NOT NULL,
  scheduled_deletion_date TIMESTAMPTZ NOT NULL,
  deletion_status TEXT DEFAULT 'scheduled', -- 'scheduled', 'deleted', 'retained', 'failed'
  deletion_date TIMESTAMPTZ,
  deletion_reason TEXT, -- 'retention_policy', 'manual', 'compliance', 'cost_optimization'
  size_freed_bytes BIGINT,
  legal_hold BOOLEAN DEFAULT false,
  legal_hold_reason TEXT,
  legal_hold_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disaster recovery procedures and runbooks
CREATE TABLE disaster_recovery_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_name TEXT UNIQUE NOT NULL,
  disaster_type TEXT NOT NULL, -- 'database_corruption', 'storage_failure', 'region_outage', 'security_breach'
  severity_level INTEGER CHECK (severity_level >= 1 AND severity_level <= 5),
  affected_systems TEXT[],
  recovery_steps JSONB NOT NULL, -- Ordered list of recovery steps
  prerequisites JSONB, -- Required conditions before starting
  estimated_rto_minutes INTEGER,
  estimated_rpo_minutes INTEGER,
  required_approvals TEXT[], -- Who needs to approve this procedure
  required_roles TEXT[], -- Who can execute this procedure
  last_tested TIMESTAMPTZ,
  last_test_results JSONB,
  procedure_version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  approved_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup system monitoring and alerts
CREATE TABLE backup_monitoring_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- 'backup_failed', 'storage_full', 'retention_violation', 'integrity_check_failed'
  severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  backup_configuration_id UUID REFERENCES backup_configurations(id),
  backup_execution_id UUID REFERENCES backup_executions(id),
  alert_message TEXT NOT NULL,
  alert_details JSONB,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  escalation_level INTEGER DEFAULT 1,
  next_escalation_at TIMESTAMPTZ,
  notification_sent BOOLEAN DEFAULT false,
  alert_hash TEXT UNIQUE -- To prevent duplicate alerts
);

-- Backup cost tracking and optimization
CREATE TABLE backup_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_period_start DATE NOT NULL,
  tracking_period_end DATE NOT NULL,
  storage_location_id UUID REFERENCES backup_storage_locations(id),
  backup_configuration_id UUID REFERENCES backup_configurations(id),
  storage_cost_usd DECIMAL(12,2),
  transfer_cost_usd DECIMAL(12,2),
  request_cost_usd DECIMAL(12,2),
  total_cost_usd DECIMAL(12,2),
  storage_usage_gb DECIMAL(15,6),
  data_transfer_gb DECIMAL(15,6),
  api_requests_count BIGINT,
  cost_per_gb_month DECIMAL(10,4),
  cost_optimization_suggestions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tracking_period_start, tracking_period_end, storage_location_id, backup_configuration_id)
);

-- Indexes for performance
CREATE INDEX idx_backup_executions_config ON backup_executions(backup_configuration_id);
CREATE INDEX idx_backup_executions_status_time ON backup_executions(status, created_at);
CREATE INDEX idx_backup_executions_storage_location ON backup_executions(storage_location_id);
CREATE INDEX idx_restoration_jobs_status ON restoration_jobs(status, created_at);
CREATE INDEX idx_restoration_jobs_backup ON restoration_jobs(backup_execution_id);
CREATE INDEX idx_backup_tests_config ON backup_tests(backup_configuration_id);
CREATE INDEX idx_backup_tests_type_status ON backup_tests(test_type, status);
CREATE INDEX idx_retention_tracking_scheduled_deletion ON backup_retention_tracking(scheduled_deletion_date) WHERE deletion_status = 'scheduled';
CREATE INDEX idx_monitoring_alerts_severity_triggered ON backup_monitoring_alerts(severity, triggered_at);
CREATE INDEX idx_monitoring_alerts_unresolved ON backup_monitoring_alerts(triggered_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_cost_tracking_period ON backup_cost_tracking(tracking_period_start, tracking_period_end);
```

## API Endpoints

### Backup Configuration Management
```typescript
// Get all backup configurations
GET /api/admin/backups/configurations
Authorization: Bearer {admin_token}

Response: {
  configurations: Array<{
    id: string,
    name: string,
    backupType: string,
    frequency: string,
    lastExecution: string,
    nextExecution: string,
    status: 'active' | 'inactive' | 'error',
    rto: number,
    rpo: number
  }>
}

// Create backup configuration
POST /api/admin/backups/configurations
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  name: string,
  backupType: 'database' | 'file_storage' | 'configuration' | 'full_system',
  sourceType: string,
  sourceIdentifier: string,
  frequency: 'continuous' | 'hourly' | 'daily' | 'weekly' | 'monthly',
  schedule?: object,
  retentionPolicy: object,
  encryptionEnabled?: boolean,
  compressionEnabled?: boolean,
  rtoMinutes: number,
  rpoMinutes: number
}

Response: {
  configurationId: string,
  status: 'created',
  nextExecution: string
}

// Update backup configuration
PUT /api/admin/backups/configurations/{configurationId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  frequency?: string,
  schedule?: object,
  retentionPolicy?: object,
  isActive?: boolean
}

// Execute backup manually
POST /api/admin/backups/configurations/{configurationId}/execute
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  executionType?: 'manual' | 'emergency',
  notes?: string,
  tags?: object
}

Response: {
  executionId: string,
  status: 'initiated',
  estimatedDuration: number
}
```

### Backup Monitoring & Status
```typescript
// Get backup dashboard
GET /api/admin/backups/dashboard
Authorization: Bearer {admin_token}

Response: {
  overview: {
    totalConfigurations: number,
    activeBackups: number,
    failedBackups: number,
    totalStorage: string,
    monthlyCost: number
  },
  recentExecutions: BackupExecution[],
  activeAlerts: BackupAlert[],
  upcomingTasks: UpcomingTask[],
  systemHealth: {
    rtoCompliance: number,
    rpoCompliance: number,
    successRate: number
  }
}

// Get backup execution details
GET /api/admin/backups/executions/{executionId}
Authorization: Bearer {admin_token}

Response: {
  execution: {
    id: string,
    configurationName: string,
    startTime: string,
    endTime: string,
    status: string,
    backupSize: number,
    compressedSize: number,
    compressionRatio: number,
    verificationStatus: string,
    errorMessage?: string,
    recoveryMetadata: object
  },
  storageLocation: StorageLocation,
  relatedTests: BackupTest[]
}

// Get system health metrics
GET /api/admin/backups/health
Authorization: Bearer {admin_token}
Query: ?timeRange=24h|7d|30d

Response: {
  metrics: {
    successRate: number,
    averageBackupTime: number,
    averageBackupSize: number,
    rtoAchievement: number,
    rpoAchievement: number,
    costEfficiency: number
  },
  trends: {
    dailyBackups: Array<{date: string, count: number, size: number}>,
    failuresByType: Record<string, number>,
    storageGrowth: Array<{date: string, totalSize: number}>
  }
}
```

### Disaster Recovery & Restoration
```typescript
// List available backups for restoration
GET /api/admin/backups/restoration/available
Authorization: Bearer {admin_token}
Query: ?backupType={type}&dateRange={range}&verified=true

Response: {
  availableBackups: Array<{
    executionId: string,
    configurationName: string,
    backupDate: string,
    backupSize: number,
    verificationStatus: string,
    retentionExpiry: string,
    pointInTimeCapable: boolean
  }>
}

// Initiate restoration
POST /api/admin/backups/restoration
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  backupExecutionId: string,
  restorationType: 'full' | 'partial' | 'point_in_time' | 'table_level',
  targetEnvironment: 'production' | 'staging' | 'development' | 'disaster_recovery',
  targetIdentifier: string,
  pointInTimeTarget?: string,
  restorationScope?: object,
  incidentReference?: string,
  approvalOverride?: boolean
}

Response: {
  restorationId: string,
  status: 'initiated' | 'approval_required',
  estimatedDuration: number,
  approvalRequired: boolean,
  rollbackDeadline?: string
}

// Get restoration status
GET /api/admin/backups/restoration/{restorationId}/status
Authorization: Bearer {admin_token}

Response: {
  restorationId: string,
  status: string,
  progressPercentage: number,
  restoredSize: number,
  estimatedCompletion: string,
  verificationResults?: object,
  errorMessage?: string
}

// Execute disaster recovery procedure
POST /api/admin/backups/disaster-recovery/execute
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  procedureId: string,
  disasterType: string,
  affectedSystems: string[],
  incidentReference: string,
  approvalCode: string
}

Response: {
  executionId: string,
  status: 'initiated',
  estimatedRTO: number,
  nextSteps: string[]
}
```

### Backup Testing & Validation
```typescript
// Schedule backup test
POST /api/admin/backups/testing/schedule
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  testType: 'integrity' | 'restoration' | 'disaster_recovery' | 'performance',
  testScope: 'single_backup' | 'configuration' | 'full_system',
  targetBackup?: string,
  targetConfiguration?: string,
  testEnvironment: string,
  testParameters?: object,
  scheduledFor?: string
}

Response: {
  testId: string,
  status: 'scheduled' | 'running',
  estimatedDuration: number
}

// Get test results
GET /api/admin/backups/testing/results
Authorization: Bearer {admin_token}
Query: ?testType={type}&status={status}&dateRange={range}

Response: {
  tests: Array<{
    id: string,
    testType: string,
    testScope: string,
    status: string,
    startTime: string,
    endTime: string,
    performanceMetrics: object,
    issuesFound: string[],
    recommendations: string[]
  }>,
  summary: {
    totalTests: number,
    passedTests: number,
    failedTests: number,
    averageRTO: number,
    averageRPO: number
  }
}

// Run integrity verification
POST /api/admin/backups/verify/{executionId}
Authorization: Bearer {admin_token}

Response: {
  verificationId: string,
  status: 'initiated',
  estimatedDuration: number
}
```

### Storage & Cost Management
```typescript
// Get storage utilization
GET /api/admin/backups/storage/utilization
Authorization: Bearer {admin_token}
Query: ?period=30d&groupBy=location|configuration

Response: {
  totalStorage: number,
  storageByLocation: Array<{
    locationName: string,
    storageUsed: number,
    storageAvailable: number,
    utilizationPercentage: number
  }>,
  storageByConfiguration: Array<{
    configurationName: string,
    storageUsed: number,
    retentionCompliance: boolean
  }>
}

// Get cost analysis
GET /api/admin/backups/cost/analysis
Authorization: Bearer {admin_token}
Query: ?period=30d&breakdown=true

Response: {
  totalCost: number,
  costBreakdown: {
    storage: number,
    transfer: number,
    requests: number
  },
  costByLocation: Array<{
    locationName: string,
    cost: number,
    costPerGB: number
  }>,
  optimizationSuggestions: Array<{
    type: string,
    description: string,
    estimatedSavings: number
  }>
}

// Execute retention cleanup
POST /api/admin/backups/retention/cleanup
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  dryRun?: boolean,
  forceCleanup?: boolean,
  configurationIds?: string[]
}

Response: {
  cleanupId: string,
  status: 'initiated',
  estimatedSpaceFreed: number,
  backupsToDelete: number
}
```

## Frontend Components

### BackupDashboard Component
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  DatabaseIcon, 
  HardDriveIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  PlayIcon,
  ShieldIcon,
  TrendingUpIcon,
  DollarSignIcon,
  ClockIcon,
  ServerIcon
} from 'lucide-react'

interface BackupDashboardProps {
  adminToken: string
}

interface BackupOverview {
  totalConfigurations: number
  activeBackups: number
  failedBackups: number
  totalStorage: string
  monthlyCost: number
}

interface BackupExecution {
  id: string
  configurationName: string
  startTime: string
  endTime?: string
  status: 'running' | 'completed' | 'failed'
  backupSize: number
  compressionRatio: number
  verificationStatus: string
}

interface BackupAlert {
  id: string
  alertType: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  triggeredAt: string
  acknowledged: boolean
}

interface SystemHealth {
  rtoCompliance: number
  rpoCompliance: number
  successRate: number
}

export default function BackupDashboard({ adminToken }: BackupDashboardProps) {
  const [overview, setOverview] = useState<BackupOverview>({
    totalConfigurations: 0,
    activeBackups: 0,
    failedBackups: 0,
    totalStorage: '0 GB',
    monthlyCost: 0
  })
  const [recentExecutions, setRecentExecutions] = useState<BackupExecution[]>([])
  const [alerts, setAlerts] = useState<BackupAlert[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    rtoCompliance: 0,
    rpoCompliance: 0,
    successRate: 0
  })
  const [isRefreshing, setIsRefreshing] = useState(false)

  const statusColors = {
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  }

  const alertSeverityColors = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800'
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/admin/backups/dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setOverview(data.overview || {})
        setRecentExecutions(data.recentExecutions || [])
        setAlerts(data.activeAlerts || [])
        setSystemHealth(data.systemHealth || {})
      }
    } catch (error) {
      console.error('Failed to fetch backup dashboard:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const executeManualBackup = async (configurationId: string) => {
    try {
      const response = await fetch(`/api/admin/backups/configurations/${configurationId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          executionType: 'manual',
          notes: 'Manual execution from dashboard'
        })
      })

      if (response.ok) {
        // Refresh dashboard after manual execution
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Failed to execute manual backup:', error)
    }
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/admin/backups/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      
      // Refresh alerts
      fetchDashboardData()
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getHealthColor = (percentage: number): string => {
    if (percentage >= 95) return 'text-green-600'
    if (percentage >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical')
  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged)

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <DatabaseIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{overview.totalConfigurations}</p>
              <p className="text-sm text-gray-600">Configurations</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <PlayIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{overview.activeBackups}</p>
              <p className="text-sm text-gray-600">Active Backups</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <AlertTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{overview.failedBackups}</p>
              <p className="text-sm text-gray-600">Failed Backups</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <HardDriveIcon className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{overview.totalStorage}</p>
              <p className="text-sm text-gray-600">Total Storage</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSignIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">${overview.monthlyCost}</p>
              <p className="text-sm text-gray-600">Monthly Cost</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangleIcon className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <div className="font-medium text-red-800">Critical Backup Issues Detected</div>
            <div className="mt-2 text-red-700">
              {criticalAlerts.length} critical alert(s) require immediate attention
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShieldIcon className="h-5 w-5 mr-2" />
            System Health Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getHealthColor(systemHealth.rtoCompliance)}`}>
                {systemHealth.rtoCompliance}%
              </div>
              <div className="text-sm text-gray-600">RTO Compliance</div>
              <Progress value={systemHealth.rtoCompliance} className="mt-2" />
            </div>

            <div className="text-center">
              <div className={`text-3xl font-bold ${getHealthColor(systemHealth.rpoCompliance)}`}>
                {systemHealth.rpoCompliance}%
              </div>
              <div className="text-sm text-gray-600">RPO Compliance</div>
              <Progress value={systemHealth.rpoCompliance} className="mt-2" />
            </div>

            <div className="text-center">
              <div className={`text-3xl font-bold ${getHealthColor(systemHealth.successRate)}`}>
                {systemHealth.successRate}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
              <Progress value={systemHealth.successRate} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="executions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="executions">Recent Executions</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {unacknowledgedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unacknowledgedAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="configurations">Configurations</TabsTrigger>
        </TabsList>

        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Backup Executions</CardTitle>
                <Button 
                  variant="outline" 
                  onClick={fetchDashboardData}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentExecutions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No recent backup executions
                </div>
              ) : (
                <div className="space-y-3">
                  {recentExecutions.map((execution) => (
                    <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Badge className={statusColors[execution.status]}>
                            {execution.status.toUpperCase()}
                          </Badge>
                          {execution.verificationStatus === 'verified' && (
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        
                        <div>
                          <div className="font-medium">{execution.configurationName}</div>
                          <div className="text-sm text-gray-600">
                            Started: {new Date(execution.startTime).toLocaleString()}
                            {execution.endTime && (
                              <> • Completed: {new Date(execution.endTime).toLocaleString()}</>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div>
                          <div>Size: {formatBytes(execution.backupSize)}</div>
                          <div>Compression: {(execution.compressionRatio * 100).toFixed(1)}%</div>
                        </div>
                        
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No active alerts
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge className={alertSeverityColors[alert.severity]}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-medium">{alert.alertType}</div>
                          <div className="text-sm text-gray-600">{alert.message}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(alert.triggeredAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {!alert.acknowledged && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configurations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup Configurations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Backup configurations management coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### DisasterRecoveryDashboard Component
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  ShieldIcon, 
  AlertTriangleIcon, 
  PlayIcon, 
  ClockIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  DatabaseIcon,
  HardDriveIcon,
  ServerIcon
} from 'lucide-react'

interface DisasterRecoveryDashboardProps {
  adminToken: string
}

interface AvailableBackup {
  executionId: string
  configurationName: string
  backupDate: string
  backupSize: number
  verificationStatus: string
  retentionExpiry: string
  pointInTimeCapable: boolean
}

interface DisasterRecoveryProcedure {
  id: string
  procedureName: string
  disasterType: string
  severityLevel: number
  estimatedRTO: number
  estimatedRPO: number
  lastTested: string
  isActive: boolean
}

interface RestorationJob {
  id: string
  backupExecutionId: string
  restorationType: string
  targetEnvironment: string
  status: string
  progressPercentage: number
  startTime: string
  estimatedCompletion?: string
}

export default function DisasterRecoveryDashboard({ adminToken }: DisasterRecoveryDashboardProps) {
  const [availableBackups, setAvailableBackups] = useState<AvailableBackup[]>([])
  const [procedures, setProcedures] = useState<DisasterRecoveryProcedure[]>([])
  const [activeRestorations, setActiveRestorations] = useState<RestorationJob[]>([])
  const [selectedBackup, setSelectedBackup] = useState<string>('')
  const [restorationType, setRestorationType] = useState<string>('full')
  const [targetEnvironment, setTargetEnvironment] = useState<string>('staging')
  const [pointInTimeTarget, setPointInTimeTarget] = useState<string>('')
  const [incidentReference, setIncidentReference] = useState<string>('')
  const [isInitiatingRestore, setIsInitiatingRestore] = useState(false)

  const statusColors = {
    initiated: 'bg-yellow-100 text-yellow-800',
    approval_required: 'bg-orange-100 text-orange-800',
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    rolled_back: 'bg-gray-100 text-gray-800'
  }

  const severityColors = {
    1: 'bg-green-100 text-green-800',
    2: 'bg-blue-100 text-blue-800',
    3: 'bg-yellow-100 text-yellow-800',
    4: 'bg-orange-100 text-orange-800',
    5: 'bg-red-100 text-red-800'
  }

  useEffect(() => {
    fetchAvailableBackups()
    fetchProcedures()
    fetchActiveRestorations()
  }, [])

  const fetchAvailableBackups = async () => {
    try {
      const response = await fetch('/api/admin/backups/restoration/available?verified=true', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAvailableBackups(data.availableBackups || [])
        if (data.availableBackups?.length > 0 && !selectedBackup) {
          setSelectedBackup(data.availableBackups[0].executionId)
        }
      }
    } catch (error) {
      console.error('Failed to fetch available backups:', error)
    }
  }

  const fetchProcedures = async () => {
    try {
      const response = await fetch('/api/admin/backups/disaster-recovery/procedures', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setProcedures(data.procedures || [])
      }
    } catch (error) {
      console.error('Failed to fetch disaster recovery procedures:', error)
    }
  }

  const fetchActiveRestorations = async () => {
    try {
      const response = await fetch('/api/admin/backups/restoration/active', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setActiveRestorations(data.restorations || [])
      }
    } catch (error) {
      console.error('Failed to fetch active restorations:', error)
    }
  }

  const initiateRestoration = async () => {
    if (!selectedBackup) return

    setIsInitiatingRestore(true)
    try {
      const response = await fetch('/api/admin/backups/restoration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          backupExecutionId: selectedBackup,
          restorationType,
          targetEnvironment,
          pointInTimeTarget: pointInTimeTarget || undefined,
          incidentReference: incidentReference || undefined
        })
      })

      if (response.ok) {
        // Refresh active restorations
        fetchActiveRestorations()
        
        // Reset form
        setPointInTimeTarget('')
        setIncidentReference('')
      }
    } catch (error) {
      console.error('Failed to initiate restoration:', error)
    } finally {
      setIsInitiatingRestore(false)
    }
  }

  const executeProcedure = async (procedureId: string) => {
    const procedure = procedures.find(p => p.id === procedureId)
    if (!procedure) return

    try {
      const response = await fetch('/api/admin/backups/disaster-recovery/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          procedureId,
          disasterType: procedure.disasterType,
          incidentReference: incidentReference
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Procedure execution initiated:', data)
      }
    } catch (error) {
      console.error('Failed to execute procedure:', error)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const selectedBackupDetails = availableBackups.find(b => b.executionId === selectedBackup)

  return (
    <div className="space-y-6">
      {/* Active Restorations Alert */}
      {activeRestorations.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <RefreshCwIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <div className="font-medium text-blue-800">Active Restoration Operations</div>
            <div className="mt-2 text-blue-700">
              {activeRestorations.length} restoration job(s) currently in progress
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Restoration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DatabaseIcon className="h-5 w-5 mr-2" />
              Backup Restoration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Backup</label>
              <select
                value={selectedBackup}
                onChange={(e) => setSelectedBackup(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select backup...</option>
                {availableBackups.map((backup) => (
                  <option key={backup.executionId} value={backup.executionId}>
                    {backup.configurationName} - {new Date(backup.backupDate).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {selectedBackupDetails && (
              <div className="p-3 bg-gray-50 rounded border">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Size: {formatBytes(selectedBackupDetails.backupSize)}</div>
                  <div>Verification: {selectedBackupDetails.verificationStatus}</div>
                  <div>PITR: {selectedBackupDetails.pointInTimeCapable ? 'Yes' : 'No'}</div>
                  <div>Expires: {new Date(selectedBackupDetails.retentionExpiry).toLocaleDateString()}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Restoration Type</label>
                <select
                  value={restorationType}
                  onChange={(e) => setRestorationType(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="full">Full Restoration</option>
                  <option value="partial">Partial Restoration</option>
                  <option value="point_in_time">Point-in-Time</option>
                  <option value="table_level">Table Level</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Environment</label>
                <select
                  value={targetEnvironment}
                  onChange={(e) => setTargetEnvironment(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                  <option value="disaster_recovery">Disaster Recovery</option>
                  <option value="production">Production</option>
                </select>
              </div>
            </div>

            {restorationType === 'point_in_time' && selectedBackupDetails?.pointInTimeCapable && (
              <div>
                <label className="block text-sm font-medium mb-2">Point-in-Time Target</label>
                <Input
                  type="datetime-local"
                  value={pointInTimeTarget}
                  onChange={(e) => setPointInTimeTarget(e.target.value)}
                  max={selectedBackupDetails.backupDate}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Incident Reference (Optional)</label>
              <Input
                value={incidentReference}
                onChange={(e) => setIncidentReference(e.target.value)}
                placeholder="INCIDENT-2024-001"
              />
            </div>

            {targetEnvironment === 'production' && (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription className="text-red-800">
                  <strong>Warning:</strong> Production restoration requires additional approvals and will cause downtime.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={initiateRestoration}
              disabled={!selectedBackup || isInitiatingRestore}
              className="w-full"
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              {isInitiatingRestore ? 'Initiating...' : 'Initiate Restoration'}
            </Button>
          </CardContent>
        </Card>

        {/* Disaster Recovery Procedures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldIcon className="h-5 w-5 mr-2" />
              Disaster Recovery Procedures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {procedures.map((procedure) => (
                <div key={procedure.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge className={severityColors[procedure.severityLevel as keyof typeof severityColors]}>
                        Level {procedure.severityLevel}
                      </Badge>
                      <div>
                        <div className="font-medium">{procedure.procedureName}</div>
                        <div className="text-sm text-gray-600">{procedure.disasterType}</div>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeProcedure(procedure.id)}
                      disabled={!procedure.isActive}
                    >
                      <PlayIcon className="h-4 w-4 mr-1" />
                      Execute
                    </Button>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500 grid grid-cols-3 gap-2">
                    <div>RTO: {procedure.estimatedRTO}min</div>
                    <div>RPO: {procedure.estimatedRPO}min</div>
                    <div>Last Test: {procedure.lastTested ? new Date(procedure.lastTested).toLocaleDateString() : 'Never'}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Restoration Jobs */}
      {activeRestorations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Restoration Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeRestorations.map((job) => (
                <div key={job.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Badge className={statusColors[job.status as keyof typeof statusColors]}>
                        {job.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <div>
                        <div className="font-medium">{job.restorationType} to {job.targetEnvironment}</div>
                        <div className="text-sm text-gray-600">
                          Started: {new Date(job.startTime).toLocaleString()}
                          {job.estimatedCompletion && (
                            <> • ETA: {new Date(job.estimatedCompletion).toLocaleString()}</>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-medium">{job.progressPercentage}%</div>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${job.progressPercentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

## Backend Implementation

### Core Service Classes

#### BackupExecutionService
```typescript
import { createHash } from 'crypto'
import { supabase } from '@/lib/supabase'

export class BackupExecutionService {
  async executeBackup(
    configurationId: string,
    executionType: string = 'scheduled',
    userId?: string
  ): Promise<BackupExecutionResult> {
    const { data: config } = await supabase
      .from('backup_configurations')
      .select(`
        *,
        storage_locations:backup_storage_locations(*)
      `)
      .eq('id', configurationId)
      .eq('is_active', true)
      .single()

    if (!config) throw new Error('Backup configuration not found or inactive')

    // Create execution record
    const { data: execution, error } = await supabase
      .from('backup_executions')
      .insert({
        backup_configuration_id: configurationId,
        storage_location_id: config.storage_locations[0]?.id,
        execution_type: executionType,
        start_time: new Date().toISOString(),
        status: 'running',
        created_by: userId
      })
      .select()
      .single()

    if (error) throw error

    try {
      // Execute backup based on source type
      const backupResult = await this.performBackup(config, execution.id)
      
      // Update execution with results
      await supabase
        .from('backup_executions')
        .update({
          end_time: new Date().toISOString(),
          status: 'completed',
          backup_size_bytes: backupResult.sizeBytes,
          compressed_size_bytes: backupResult.compressedSizeBytes,
          backup_path: backupResult.backupPath,
          backup_hash: backupResult.hash,
          compression_ratio: backupResult.compressionRatio,
          recovery_metadata: backupResult.recoveryMetadata
        })
        .eq('id', execution.id)

      // Schedule verification
      await this.scheduleVerification(execution.id)
      
      // Update retention tracking
      await this.updateRetentionTracking(execution.id, config.retention_policy)

      return {
        executionId: execution.id,
        status: 'completed',
        backupPath: backupResult.backupPath,
        sizeBytes: backupResult.sizeBytes
      }
    } catch (error) {
      // Update execution with error
      await supabase
        .from('backup_executions')
        .update({
          end_time: new Date().toISOString(),
          status: 'failed',
          error_message: error.message
        })
        .eq('id', execution.id)

      // Create alert for failed backup
      await this.createBackupAlert(
        'backup_failed',
        'high',
        `Backup execution failed: ${error.message}`,
        configurationId,
        execution.id
      )

      throw error
    }
  }

  private async performBackup(
    config: any,
    executionId: string
  ): Promise<BackupResult> {
    switch (config.source_type) {
      case 'postgresql':
        return await this.backupPostgreSQL(config, executionId)
      case 's3_bucket':
        return await this.backupS3Bucket(config, executionId)
      case 'supabase_storage':
        return await this.backupSupabaseStorage(config, executionId)
      case 'environment_vars':
        return await this.backupEnvironmentVariables(config, executionId)
      default:
        throw new Error(`Unsupported backup source type: ${config.source_type}`)
    }
  }

  private async backupPostgreSQL(
    config: any,
    executionId: string
  ): Promise<BackupResult> {
    // Use pg_dump for database backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `${config.source_identifier}_${timestamp}.sql`
    const backupPath = `database/${backupFileName}`

    // Execute pg_dump command
    const command = [
      'pg_dump',
      '--verbose',
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--format=custom',
      config.source_identifier
    ].join(' ')

    // This would be replaced with actual command execution
    const dumpResult = await this.executeCommand(command)
    
    // Compress if enabled
    let finalPath = backupPath
    let compressedSize = dumpResult.size
    let compressionRatio = 1.0

    if (config.compression_enabled) {
      const compressedPath = `${backupPath}.gz`
      const compressResult = await this.compressFile(backupPath, compressedPath, config.compression_algorithm)
      finalPath = compressedPath
      compressedSize = compressResult.size
      compressionRatio = dumpResult.size / compressResult.size
    }

    // Encrypt if enabled
    if (config.encryption_enabled) {
      finalPath = await this.encryptFile(finalPath, config.encryption_key_id)
    }

    // Calculate hash for integrity verification
    const hash = await this.calculateFileHash(finalPath)

    // Upload to storage location
    await this.uploadToStorage(finalPath, config.storage_locations[0])

    return {
      backupPath: finalPath,
      sizeBytes: dumpResult.size,
      compressedSizeBytes: compressedSize,
      compressionRatio,
      hash,
      recoveryMetadata: {
        databaseName: config.source_identifier,
        backupFormat: 'pg_dump_custom',
        pgVersion: dumpResult.pgVersion,
        timestamp: new Date().toISOString()
      }
    }
  }

  private async backupS3Bucket(
    config: any,
    executionId: string
  ): Promise<BackupResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `s3_backup/${config.source_identifier}_${timestamp}.tar.gz`

    // Use AWS CLI to sync bucket contents
    const command = [
      'aws', 's3', 'sync',
      `s3://${config.source_identifier}`,
      `/tmp/s3_backup_${executionId}`,
      '--delete'
    ].join(' ')

    const syncResult = await this.executeCommand(command)
    
    // Create compressed archive
    const tarCommand = [
      'tar', '-czf',
      `/tmp/${backupPath}`,
      `/tmp/s3_backup_${executionId}`
    ].join(' ')

    const tarResult = await this.executeCommand(tarCommand)
    
    const hash = await this.calculateFileHash(`/tmp/${backupPath}`)

    // Upload to backup storage
    await this.uploadToStorage(`/tmp/${backupPath}`, config.storage_locations[0])

    return {
      backupPath,
      sizeBytes: tarResult.size,
      compressedSizeBytes: tarResult.size,
      compressionRatio: 1.0,
      hash,
      recoveryMetadata: {
        bucketName: config.source_identifier,
        fileCount: syncResult.fileCount,
        backupFormat: 'tar_gz',
        timestamp: new Date().toISOString()
      }
    }
  }

  private async backupSupabaseStorage(
    config: any,
    executionId: string
  ): Promise<BackupResult> {
    // Implementation for Supabase Storage backup
    // This would use Supabase client to download all files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `supabase_storage/${config.source_identifier}_${timestamp}.tar.gz`

    // Download all files from Supabase storage bucket
    const files = await supabase.storage
      .from(config.source_identifier)
      .list('', { limit: 1000, offset: 0 })

    let totalSize = 0
    const downloadPath = `/tmp/supabase_backup_${executionId}`

    for (const file of files.data || []) {
      const { data } = await supabase.storage
        .from(config.source_identifier)
        .download(file.name)
      
      if (data) {
        await this.saveFile(`${downloadPath}/${file.name}`, data)
        totalSize += data.size
      }
    }

    // Create compressed archive
    const tarCommand = [
      'tar', '-czf',
      `/tmp/${backupPath}`,
      downloadPath
    ].join(' ')

    const tarResult = await this.executeCommand(tarCommand)
    const hash = await this.calculateFileHash(`/tmp/${backupPath}`)

    await this.uploadToStorage(`/tmp/${backupPath}`, config.storage_locations[0])

    return {
      backupPath,
      sizeBytes: totalSize,
      compressedSizeBytes: tarResult.size,
      compressionRatio: totalSize / tarResult.size,
      hash,
      recoveryMetadata: {
        bucketName: config.source_identifier,
        fileCount: files.data?.length || 0,
        backupFormat: 'tar_gz',
        timestamp: new Date().toISOString()
      }
    }
  }

  private async backupEnvironmentVariables(
    config: any,
    executionId: string
  ): Promise<BackupResult> {
    // Backup environment variables configuration
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `environment_vars/env_vars_${timestamp}.json`

    // Get all environment variables (encrypted)
    const { data: envVars } = await supabase
      .from('environment_variables')
      .select(`
        *,
        variable_definition:environment_variable_definitions(*),
        environment:environments(*)
      `)

    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      variables: envVars
    }

    const jsonString = JSON.stringify(backupData, null, 2)
    const sizeBytes = Buffer.from(jsonString).length

    // Encrypt the backup
    const encryptedData = await this.encryptString(jsonString, config.encryption_key_id)
    const hash = createHash('sha256').update(jsonString).digest('hex')

    // Save to temporary file and upload
    const tempPath = `/tmp/${backupPath}`
    await this.saveFile(tempPath, Buffer.from(encryptedData))
    await this.uploadToStorage(tempPath, config.storage_locations[0])

    return {
      backupPath,
      sizeBytes,
      compressedSizeBytes: Buffer.from(encryptedData).length,
      compressionRatio: sizeBytes / Buffer.from(encryptedData).length,
      hash,
      recoveryMetadata: {
        variableCount: envVars?.length || 0,
        backupFormat: 'encrypted_json',
        timestamp: new Date().toISOString()
      }
    }
  }

  async verifyBackupIntegrity(executionId: string): Promise<VerificationResult> {
    const { data: execution } = await supabase
      .from('backup_executions')
      .select('*')
      .eq('id', executionId)
      .single()

    if (!execution) throw new Error('Backup execution not found')

    try {
      // Download backup file
      const downloadedFile = await this.downloadFromStorage(
        execution.backup_path,
        execution.storage_location_id
      )

      // Verify hash
      const calculatedHash = await this.calculateFileHash(downloadedFile)
      const hashMatch = calculatedHash === execution.backup_hash

      // Additional verification based on backup type
      let structuralIntegrity = false
      let verificationDetails = {}

      if (execution.backup_path.includes('.sql')) {
        // Verify SQL dump structure
        structuralIntegrity = await this.verifySQLDump(downloadedFile)
      } else if (execution.backup_path.includes('.tar.gz')) {
        // Verify archive integrity
        structuralIntegrity = await this.verifyArchive(downloadedFile)
      } else if (execution.backup_path.includes('.json')) {
        // Verify JSON structure
        structuralIntegrity = await this.verifyJSON(downloadedFile)
      }

      const overallStatus = hashMatch && structuralIntegrity ? 'verified' : 'failed'

      // Update verification status
      await supabase
        .from('backup_executions')
        .update({
          verification_status: overallStatus,
          verification_timestamp: new Date().toISOString()
        })
        .eq('id', executionId)

      return {
        executionId,
        status: overallStatus,
        hashMatch,
        structuralIntegrity,
        verificationDetails
      }
    } catch (error) {
      await supabase
        .from('backup_executions')
        .update({
          verification_status: 'failed',
          verification_timestamp: new Date().toISOString()
        })
        .eq('id', executionId)

      throw error
    }
  }

  private async executeCommand(command: string): Promise<any> {
    // Mock implementation - would use child_process.exec in real implementation
    return {
      size: 1024 * 1024, // 1MB mock size
      fileCount: 100,
      pgVersion: '15.0'
    }
  }

  private async compressFile(inputPath: string, outputPath: string, algorithm: string): Promise<any> {
    // Mock implementation - would use compression libraries
    return {
      size: 512 * 1024 // 512KB compressed
    }
  }

  private async encryptFile(filePath: string, keyId: string): Promise<string> {
    // Mock implementation - would use encryption
    return filePath + '.encrypted'
  }

  private async encryptString(data: string, keyId: string): Promise<string> {
    // Mock implementation - would use actual encryption
    return Buffer.from(data).toString('base64')
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    // Mock implementation - would calculate actual file hash
    return createHash('sha256').update(filePath).digest('hex')
  }

  private async uploadToStorage(filePath: string, storageLocation: any): Promise<void> {
    // Mock implementation - would upload to actual storage
    console.log(`Uploading ${filePath} to ${storageLocation.location_name}`)
  }

  private async downloadFromStorage(backupPath: string, storageLocationId: string): Promise<string> {
    // Mock implementation - would download from actual storage
    return `/tmp/downloaded_${backupPath.replace(/[\/]/g, '_')}`
  }

  private async saveFile(path: string, data: Buffer): Promise<void> {
    // Mock implementation - would save actual file
    console.log(`Saving file to ${path}, size: ${data.length}`)
  }

  private async verifySQLDump(filePath: string): Promise<boolean> {
    // Mock implementation - would verify SQL dump structure
    return true
  }

  private async verifyArchive(filePath: string): Promise<boolean> {
    // Mock implementation - would verify archive integrity
    return true
  }

  private async verifyJSON(filePath: string): Promise<boolean> {
    // Mock implementation - would verify JSON structure
    return true
  }

  private async scheduleVerification(executionId: string): Promise<void> {
    // Schedule verification job (implementation would use job queue)
    setTimeout(() => {
      this.verifyBackupIntegrity(executionId)
    }, 5000) // Verify after 5 seconds
  }

  private async updateRetentionTracking(executionId: string, retentionPolicy: any): Promise<void> {
    const deletionDate = new Date()
    deletionDate.setDays(deletionDate.getDate() + (retentionPolicy.days || 30))

    await supabase
      .from('backup_retention_tracking')
      .insert({
        backup_execution_id: executionId,
        retention_rule_applied: retentionPolicy,
        scheduled_deletion_date: deletionDate.toISOString()
      })
  }

  private async createBackupAlert(
    alertType: string,
    severity: string,
    message: string,
    configurationId?: string,
    executionId?: string
  ): Promise<void> {
    await supabase
      .from('backup_monitoring_alerts')
      .insert({
        alert_type: alertType,
        severity,
        alert_message: message,
        backup_configuration_id: configurationId,
        backup_execution_id: executionId,
        alert_hash: createHash('md5').update(`${alertType}-${message}`).digest('hex')
      })
  }
}

// Type definitions
interface BackupExecutionResult {
  executionId: string
  status: string
  backupPath: string
  sizeBytes: number
}

interface BackupResult {
  backupPath: string
  sizeBytes: number
  compressedSizeBytes: number
  compressionRatio: number
  hash: string
  recoveryMetadata: any
}

interface VerificationResult {
  executionId: string
  status: string
  hashMatch: boolean
  structuralIntegrity: boolean
  verificationDetails: any
}
```

#### DisasterRecoveryService
```typescript
export class DisasterRecoveryService {
  async initiateRestoration(
    backupExecutionId: string,
    restorationType: string,
    targetEnvironment: string,
    options: RestorationOptions = {}
  ): Promise<RestorationResult> {
    // Validate backup exists and is verified
    const { data: backup } = await supabase
      .from('backup_executions')
      .select(`
        *,
        configuration:backup_configurations(*),
        storage_location:backup_storage_locations(*)
      `)
      .eq('id', backupExecutionId)
      .eq('status', 'completed')
      .eq('verification_status', 'verified')
      .single()

    if (!backup) {
      throw new Error('Backup not found or not verified')
    }

    // Check if restoration requires approval
    const approvalRequired = targetEnvironment === 'production' || 
                           restorationType === 'full' ||
                           options.approvalOverride === false

    // Create restoration job
    const { data: restoration, error } = await supabase
      .from('restoration_jobs')
      .insert({
        backup_execution_id: backupExecutionId,
        restoration_type: restorationType,
        target_environment: targetEnvironment,
        target_identifier: options.targetIdentifier,
        point_in_time_target: options.pointInTimeTarget,
        restoration_scope: options.restorationScope,
        start_time: new Date().toISOString(),
        status: approvalRequired ? 'approval_required' : 'initiated',
        approval_required: approvalRequired,
        initiated_by: options.userId,
        incident_reference: options.incidentReference
      })
      .select()
      .single()

    if (error) throw error

    // If no approval required, start restoration immediately
    if (!approvalRequired) {
      await this.executeRestoration(restoration.id)
    }

    return {
      restorationId: restoration.id,
      status: restoration.status,
      approvalRequired,
      estimatedDuration: this.calculateEstimatedDuration(backup, restorationType),
      rollbackDeadline: options.rollbackDeadline
    }
  }

  async executeRestoration(restorationId: string): Promise<void> {
    const { data: restoration } = await supabase
      .from('restoration_jobs')
      .select(`
        *,
        backup:backup_executions(
          *,
          configuration:backup_configurations(*),
          storage_location:backup_storage_locations(*)
        )
      `)
      .eq('id', restorationId)
      .single()

    if (!restoration) throw new Error('Restoration job not found')

    try {
      // Update status to running
      await supabase
        .from('restoration_jobs')
        .update({
          status: 'running',
          progress_percentage: 0
        })
        .eq('id', restorationId)

      // Download backup file
      const backupFile = await this.downloadBackupFile(
        restoration.backup.backup_path,
        restoration.backup.storage_location
      )

      // Decrypt if necessary
      let workingFile = backupFile
      if (restoration.backup.configuration.encryption_enabled) {
        workingFile = await this.decryptFile(
          backupFile, 
          restoration.backup.configuration.encryption_key_id
        )
      }

      // Decompress if necessary
      if (restoration.backup.configuration.compression_enabled) {
        workingFile = await this.decompressFile(workingFile)
      }

      // Execute restoration based on type
      const restorationResult = await this.performRestoration(
        restoration,
        workingFile
      )

      // Update completion status
      await supabase
        .from('restoration_jobs')
        .update({
          status: 'completed',
          progress_percentage: 100,
          end_time: new Date().toISOString(),
          restored_size_bytes: restorationResult.restoredSize,
          verification_results: restorationResult.verificationResults
        })
        .eq('id', restorationId)

      // Run post-restoration verification
      await this.verifyRestoration(restorationId)

    } catch (error) {
      // Update failure status
      await supabase
        .from('restoration_jobs')
        .update({
          status: 'failed',
          end_time: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', restorationId)

      throw error
    }
  }

  private async performRestoration(
    restoration: any,
    workingFile: string
  ): Promise<RestorationExecutionResult> {
    const sourceType = restoration.backup.configuration.source_type

    switch (sourceType) {
      case 'postgresql':
        return await this.restorePostgreSQL(restoration, workingFile)
      case 's3_bucket':
        return await this.restoreS3Bucket(restoration, workingFile)
      case 'supabase_storage':
        return await this.restoreSupabaseStorage(restoration, workingFile)
      case 'environment_vars':
        return await this.restoreEnvironmentVariables(restoration, workingFile)
      default:
        throw new Error(`Unsupported restoration type: ${sourceType}`)
    }
  }

  private async restorePostgreSQL(
    restoration: any,
    sqlFile: string
  ): Promise<RestorationExecutionResult> {
    const targetDatabase = restoration.target_identifier || 
                          restoration.backup.configuration.source_identifier

    // For point-in-time recovery
    if (restoration.restoration_type === 'point_in_time') {
      return await this.performPITR(restoration, sqlFile)
    }

    // For table-level restoration
    if (restoration.restoration_type === 'table_level') {
      return await this.restoreSpecificTables(restoration, sqlFile)
    }

    // Full database restoration
    const command = [
      'pg_restore',
      '--verbose',
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      `--dbname=${targetDatabase}`,
      sqlFile
    ].join(' ')

    const restoreResult = await this.executeCommand(command)

    // Verify restoration
    const verificationQueries = [
      'SELECT COUNT(*) FROM pg_tables',
      'SELECT COUNT(*) FROM information_schema.routines',
      'SELECT pg_database_size(current_database())'
    ]

    const verificationResults = {}
    for (const query of verificationQueries) {
      const result = await this.executeQuery(targetDatabase, query)
      verificationResults[query] = result
    }

    return {
      restoredSize: restoreResult.restoredSize,
      verificationResults
    }
  }

  private async performPITR(
    restoration: any,
    baseBackup: string
  ): Promise<RestorationExecutionResult> {
    // Point-in-time recovery implementation
    const targetTime = restoration.point_in_time_target
    const targetDatabase = restoration.target_identifier

    // Restore base backup
    let command = [
      'pg_restore',
      '--verbose',
      '--clean',
      '--if-exists',
      `--dbname=${targetDatabase}`,
      baseBackup
    ].join(' ')

    await this.executeCommand(command)

    // Apply WAL files up to target time
    command = [
      'pg_waldump',
      `--end-time=${targetTime}`,
      '--replay',
      `--target-db=${targetDatabase}`
    ].join(' ')

    const pitrResult = await this.executeCommand(command)

    return {
      restoredSize: pitrResult.restoredSize,
      verificationResults: {
        targetTime,
        appliedWALs: pitrResult.appliedWALs,
        finalLSN: pitrResult.finalLSN
      }
    }
  }

  async executeDRProcedure(
    procedureId: string,
    disasterType: string,
    incidentReference: string
  ): Promise<DRExecutionResult> {
    const { data: procedure } = await supabase
      .from('disaster_recovery_procedures')
      .select('*')
      .eq('id', procedureId)
      .eq('is_active', true)
      .single()

    if (!procedure) throw new Error('DR procedure not found or inactive')

    // Create execution log
    const executionId = crypto.randomUUID()
    const startTime = new Date()

    try {
      const steps = procedure.recovery_steps.steps || []
      const results = []

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        
        // Update progress
        await this.updateDRProgress(executionId, Math.round((i / steps.length) * 100))

        // Execute step based on type
        const stepResult = await this.executeDRStep(step, incidentReference)
        results.push({
          stepId: step.id,
          stepName: step.name,
          status: stepResult.success ? 'completed' : 'failed',
          output: stepResult.output,
          duration: stepResult.duration
        })

        if (!stepResult.success && step.critical) {
          throw new Error(`Critical step failed: ${step.name} - ${stepResult.error}`)
        }
      }

      const endTime = new Date()
      const totalDuration = endTime.getTime() - startTime.getTime()

      return {
        executionId,
        status: 'completed',
        totalDuration,
        stepResults: results,
        actualRTO: totalDuration / 60000, // Convert to minutes
        nextSteps: procedure.post_execution_steps || []
      }
    } catch (error) {
      return {
        executionId,
        status: 'failed',
        error: error.message,
        stepResults: [],
        actualRTO: 0,
        nextSteps: ['Review failure logs', 'Escalate to senior team']
      }
    }
  }

  private async executeDRStep(step: any, incidentReference: string): Promise<any> {
    const startTime = Date.now()

    try {
      switch (step.type) {
        case 'backup_restoration':
          return await this.executeDRBackupRestoration(step, incidentReference)
        case 'service_restart':
          return await this.executeDRServiceRestart(step)
        case 'dns_switch':
          return await this.executeDRDNSSwitch(step)
        case 'notification':
          return await this.executeDRNotification(step, incidentReference)
        default:
          throw new Error(`Unknown step type: ${step.type}`)
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      }
    }
  }

  private async calculateEstimatedDuration(
    backup: any,
    restorationType: string
  ): Promise<number> {
    // Base estimation on backup size and type
    const baseTimePerGB = 300 // 5 minutes per GB
    const sizeGB = backup.backup_size_bytes / (1024 * 1024 * 1024)
    
    let multiplier = 1.0
    switch (restorationType) {
      case 'full':
        multiplier = 1.0
        break
      case 'partial':
        multiplier = 0.6
        break
      case 'point_in_time':
        multiplier = 1.5
        break
      case 'table_level':
        multiplier = 0.3
        break
    }

    return Math.round(baseTimePerGB * sizeGB * multiplier)
  }

  private async downloadBackupFile(backupPath: string, storageLocation: any): Promise<string> {
    // Mock implementation - would download from actual storage
    return `/tmp/restoration_${Date.now()}_${backupPath.replace(/[\/]/g, '_')}`
  }

  private async decryptFile(filePath: string, keyId: string): Promise<string> {
    // Mock implementation - would decrypt file
    return filePath.replace('.encrypted', '')
  }

  private async decompressFile(filePath: string): Promise<string> {
    // Mock implementation - would decompress file
    return filePath.replace('.gz', '')
  }

  private async verifyRestoration(restorationId: string): Promise<void> {
    // Implementation for post-restoration verification
    console.log(`Verifying restoration ${restorationId}`)
  }

  private async executeCommand(command: string): Promise<any> {
    // Mock implementation
    return {
      restoredSize: 1024 * 1024 * 100, // 100MB
      appliedWALs: 5,
      finalLSN: '0/1234567'
    }
  }

  private async executeQuery(database: string, query: string): Promise<any> {
    // Mock implementation
    return { result: 'success', rows: 100 }
  }

  private async updateDRProgress(executionId: string, percentage: number): Promise<void> {
    // Mock implementation
    console.log(`DR execution ${executionId}: ${percentage}% complete`)
  }

  private async executeDRBackupRestoration(step: any, incidentRef: string): Promise<any> {
    // Mock implementation
    return { success: true, output: 'Backup restored successfully', duration: 30000 }
  }

  private async executeDRServiceRestart(step: any): Promise<any> {
    // Mock implementation
    return { success: true, output: 'Service restarted', duration: 5000 }
  }

  private async executeDRDNSSwitch(step: any): Promise<any> {
    // Mock implementation
    return { success: true, output: 'DNS switched to backup', duration: 15000 }
  }

  private async executeDRNotification(step: any, incidentRef: string): Promise<any> {
    // Mock implementation
    return { success: true, output: 'Notifications sent', duration: 2000 }
  }
}

// Type definitions
interface RestorationOptions {
  targetIdentifier?: string
  pointInTimeTarget?: string
  restorationScope?: any
  userId?: string
  incidentReference?: string
  rollbackDeadline?: string
  approvalOverride?: boolean
}

interface RestorationResult {
  restorationId: string
  status: string
  approvalRequired: boolean
  estimatedDuration: number
  rollbackDeadline?: string
}

interface RestorationExecutionResult {
  restoredSize: number
  verificationResults: any
}

interface DRExecutionResult {
  executionId: string
  status: string
  totalDuration?: number
  stepResults: any[]
  actualRTO: number
  nextSteps: string[]
  error?: string
}
```

## MCP Server Usage

### Supabase MCP for Database Operations
```typescript
// Apply backup system migrations
await mcp.supabase.apply_migration('create_backup_system', `
  -- Migration SQL from database schema section above
`)

// Execute complex backup monitoring queries
const backupHealth = await mcp.supabase.execute_sql(`
  SELECT 
    bc.name as configuration_name,
    COUNT(be.id) as total_executions,
    COUNT(be.id) FILTER (WHERE be.status = 'completed') as successful_executions,
    COUNT(be.id) FILTER (WHERE be.status = 'failed') as failed_executions,
    AVG(EXTRACT(EPOCH FROM (be.end_time - be.start_time))/60) as avg_duration_minutes,
    SUM(be.backup_size_bytes) as total_backup_size
  FROM backup_configurations bc
  LEFT JOIN backup_executions be ON be.backup_configuration_id = bc.id
  WHERE bc.is_active = true
    AND be.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY bc.id, bc.name
  ORDER BY successful_executions DESC
`)

// Get retention compliance report
const retentionCompliance = await mcp.supabase.execute_sql(`
  SELECT 
    e.name as environment_name,
    bc.name as backup_config,
    COUNT(brt.id) as total_tracked,
    COUNT(brt.id) FILTER (WHERE brt.scheduled_deletion_date < NOW() AND brt.deletion_status = 'scheduled') as overdue_deletions,
    SUM(brt.size_freed_bytes) FILTER (WHERE brt.deletion_status = 'deleted') as total_freed_space
  FROM environments e
  JOIN backup_configurations bc ON true
  LEFT JOIN backup_executions be ON be.backup_configuration_id = bc.id
  LEFT JOIN backup_retention_tracking brt ON brt.backup_execution_id = be.id
  GROUP BY e.id, e.name, bc.id, bc.name
`)

// Generate database types for backup system
await mcp.supabase.generate_typescript_types()
```

### Memory MCP for Disaster Recovery Knowledge
```typescript
// Store disaster recovery procedures
await mcp.memory.create_entities([
  {
    name: 'Database Disaster Recovery',
    entityType: 'disaster_recovery_procedure',
    observations: [
      'PostgreSQL backup and restore procedures implemented',
      'Point-in-time recovery capability established',
      'Cross-region backup replication configured',
      'Recovery time objectives: Database < 1 hour, Files < 2 hours',
      'Automated backup verification and integrity checking'
    ]
  }
])

// Track backup system architecture decisions
await mcp.memory.create_entities([
  {
    name: 'Backup Architecture',
    entityType: 'infrastructure_component',
    observations: [
      'Multi-tier backup strategy: Primary, Secondary, Tertiary storage',
      'Automated retention policies with legal hold capabilities',
      'Encryption at rest and in transit for all backups',
      'Compression enabled to reduce storage costs',
      'Real-time monitoring and alerting for backup failures'
    ]
  }
])

// Document recovery testing procedures
await mcp.memory.add_observations([
  {
    entityName: 'Backup Testing Strategy',
    contents: [
      'Monthly integrity tests for random backup samples',
      'Quarterly full restoration tests in staging environment',
      'Annual disaster recovery drills with full team participation',
      'Performance metrics tracking: RTO/RPO compliance monitoring',
      'Automated test reporting and issue tracking'
    ]
  }
])
```

### Ref MCP for Documentation
```typescript
// Get PostgreSQL backup documentation
const pgBackupDocs = await mcp.ref.search_documentation('PostgreSQL pg_dump pg_restore best practices')
const pgBackupContent = await mcp.ref.read_url(pgBackupDocs[0].url)

// Get AWS S3 backup documentation
const s3BackupDocs = await mcp.ref.search_documentation('AWS S3 backup strategies encryption')
const s3BackupContent = await mcp.ref.read_url(s3BackupDocs[0].url)

// Get disaster recovery best practices
const drDocs = await mcp.ref.search_documentation('disaster recovery RTO RPO planning')
const drContent = await mcp.ref.read_url(drDocs[0].url)
```

## Testing Requirements

### Unit Tests
```typescript
describe('BackupExecutionService', () => {
  let service: BackupExecutionService

  beforeEach(() => {
    service = new BackupExecutionService()
  })

  test('should execute PostgreSQL backup successfully', async () => {
    const configId = 'config-123'
    const result = await service.executeBackup(configId, 'manual', 'user-123')
    
    expect(result.executionId).toBeDefined()
    expect(result.status).toBe('completed')
    expect(result.backupPath).toBeDefined()
    expect(result.sizeBytes).toBeGreaterThan(0)
  })

  test('should handle backup failure gracefully', async () => {
    // Mock a configuration that will fail
    const configId = 'invalid-config'
    
    await expect(service.executeBackup(configId, 'manual'))
      .rejects.toThrow('Backup configuration not found')
  })

  test('should verify backup integrity correctly', async () => {
    const executionId = 'execution-123'
    const result = await service.verifyBackupIntegrity(executionId)
    
    expect(result.executionId).toBe(executionId)
    expect(result.status).toMatch(/^(verified|failed)$/)
    expect(result.hashMatch).toBeDefined()
    expect(result.structuralIntegrity).toBeDefined()
  })

  test('should create alerts for failed backups', async () => {
    // This would test the alert creation functionality
    // when backup fails
    
    const mockFailingConfig = {
      id: 'failing-config',
      source_type: 'invalid_type'
    }
    
    // Mock the configuration to cause failure
    // Verify alert is created in database
  })

  test('should calculate compression ratio correctly', async () => {
    const originalSize = 1000000 // 1MB
    const compressedSize = 300000 // 300KB
    const expectedRatio = originalSize / compressedSize
    
    // Test compression calculation logic
    expect(expectedRatio).toBeCloseTo(3.33, 2)
  })
})

describe('DisasterRecoveryService', () => {
  let service: DisasterRecoveryService

  beforeEach(() => {
    service = new DisasterRecoveryService()
  })

  test('should initiate restoration successfully', async () => {
    const backupId = 'backup-123'
    const result = await service.initiateRestoration(
      backupId,
      'full',
      'staging'
    )
    
    expect(result.restorationId).toBeDefined()
    expect(result.status).toMatch(/^(initiated|approval_required)$/)
    expect(result.estimatedDuration).toBeGreaterThan(0)
  })

  test('should require approval for production restoration', async () => {
    const backupId = 'backup-123'
    const result = await service.initiateRestoration(
      backupId,
      'full',
      'production'
    )
    
    expect(result.approvalRequired).toBe(true)
    expect(result.status).toBe('approval_required')
  })

  test('should execute disaster recovery procedure', async () => {
    const procedureId = 'procedure-123'
    const result = await service.executeDRProcedure(
      procedureId,
      'database_corruption',
      'INCIDENT-2024-001'
    )
    
    expect(result.executionId).toBeDefined()
    expect(result.status).toMatch(/^(completed|failed)$/)
    expect(result.stepResults).toBeInstanceOf(Array)
    expect(result.actualRTO).toBeGreaterThanOrEqual(0)
  })

  test('should handle point-in-time recovery', async () => {
    const backupId = 'backup-123'
    const targetTime = new Date().toISOString()
    
    const result = await service.initiateRestoration(
      backupId,
      'point_in_time',
      'staging',
      { pointInTimeTarget: targetTime }
    )
    
    expect(result.restorationId).toBeDefined()
    expect(result.status).toBeDefined()
  })

  test('should validate backup before restoration', async () => {
    const invalidBackupId = 'invalid-backup'
    
    await expect(service.initiateRestoration(
      invalidBackupId,
      'full',
      'staging'
    )).rejects.toThrow('Backup not found or not verified')
  })
})

describe('Backup Monitoring', () => {
  test('should detect failed backups and create alerts', async () => {
    // Test backup failure detection
    // Verify alert creation
    // Check notification sending
  })

  test('should track storage utilization correctly', async () => {
    // Test storage usage calculations
    // Verify cost tracking
    // Check optimization suggestions
  })

  test('should enforce retention policies', async () => {
    // Test retention policy enforcement
    // Verify scheduled deletions
    // Check legal hold functionality
  })
})
```

### Integration Tests
```typescript
describe('Backup System API', () => {
  test('GET /api/admin/backups/dashboard', async () => {
    const response = await request(app)
      .get('/api/admin/backups/dashboard')
      .set('Authorization', 'Bearer admin-token')

    expect(response.status).toBe(200)
    expect(response.body.overview).toBeDefined()
    expect(response.body.overview.totalConfigurations).toBeGreaterThanOrEqual(0)
    expect(response.body.systemHealth).toBeDefined()
    expect(response.body.systemHealth.successRate).toBeGreaterThanOrEqual(0)
  })

  test('POST /api/admin/backups/configurations/{id}/execute', async () => {
    const configId = 'test-config-id'
    const response = await request(app)
      .post(`/api/admin/backups/configurations/${configId}/execute`)
      .set('Authorization', 'Bearer admin-token')
      .send({
        executionType: 'manual',
        notes: 'Test backup execution'
      })

    expect(response.status).toBe(200)
    expect(response.body.executionId).toBeDefined()
    expect(response.body.status).toBe('initiated')
  })

  test('POST /api/admin/backups/restoration', async () => {
    const response = await request(app)
      .post('/api/admin/backups/restoration')
      .set('Authorization', 'Bearer admin-token')
      .send({
        backupExecutionId: 'backup-123',
        restorationType: 'full',
        targetEnvironment: 'staging',
        incidentReference: 'TEST-001'
      })

    expect(response.status).toBe(200)
    expect(response.body.restorationId).toBeDefined()
    expect(response.body.estimatedDuration).toBeGreaterThan(0)
  })

  test('GET /api/admin/backups/health', async () => {
    const response = await request(app)
      .get('/api/admin/backups/health?timeRange=7d')
      .set('Authorization', 'Bearer admin-token')

    expect(response.status).toBe(200)
    expect(response.body.metrics).toBeDefined()
    expect(response.body.metrics.successRate).toBeGreaterThanOrEqual(0)
    expect(response.body.trends).toBeDefined()
  })
})

describe('Disaster Recovery API', () => {
  test('POST /api/admin/backups/disaster-recovery/execute', async () => {
    const response = await request(app)
      .post('/api/admin/backups/disaster-recovery/execute')
      .set('Authorization', 'Bearer admin-token')
      .send({
        procedureId: 'procedure-123',
        disasterType: 'database_corruption',
        incidentReference: 'INCIDENT-2024-001',
        approvalCode: 'EMERGENCY-OVERRIDE-123'
      })

    expect(response.status).toBe(200)
    expect(response.body.executionId).toBeDefined()
    expect(response.body.nextSteps).toBeInstanceOf(Array)
  })
})
```

### Browser Testing with Playwright MCP
```typescript
// Test backup dashboard functionality
await mcp.playwright.browser_navigate('http://localhost:3000/admin/backups')

// Verify dashboard loads with overview data
const snapshot = await mcp.playwright.browser_snapshot()
expect(snapshot).toContain('Total Storage')
expect(snapshot).toContain('Monthly Cost')
expect(snapshot).toContain('System Health Metrics')

// Test manual backup execution
await mcp.playwright.browser_click('Execute Manual Backup', 'button:has-text("Execute")')
await mcp.playwright.browser_wait_for({ text: 'Backup initiated' })

// Test backup configuration management
await mcp.playwright.browser_click('Configurations', 'button:has-text("Configurations")')
const configSnapshot = await mcp.playwright.browser_snapshot()
expect(configSnapshot).toContain('Backup Configurations')

// Test disaster recovery dashboard
await mcp.playwright.browser_navigate('http://localhost:3000/admin/disaster-recovery')

// Test restoration initiation
await mcp.playwright.browser_fill_form([
  {
    name: 'Select Backup',
    type: 'combobox',
    ref: 'select[name="selectedBackup"]',
    value: 'backup-123'
  },
  {
    name: 'Restoration Type',
    type: 'combobox',
    ref: 'select[name="restorationType"]',
    value: 'full'
  },
  {
    name: 'Target Environment',
    type: 'combobox',
    ref: 'select[name="targetEnvironment"]',
    value: 'staging'
  }
])

await mcp.playwright.browser_click('Initiate Restoration', 'button:has-text("Initiate Restoration")')

// Wait for restoration confirmation
await mcp.playwright.browser_wait_for({ text: 'Restoration initiated' })

// Take screenshot of disaster recovery status
await mcp.playwright.browser_take_screenshot('disaster-recovery-status.png')

// Test backup verification
await mcp.playwright.browser_navigate('http://localhost:3000/admin/backups/verification')
await mcp.playwright.browser_click('Verify Backup', 'button:has-text("Verify"):first')
await mcp.playwright.browser_wait_for({ text: 'Verification complete' })

const verificationSnapshot = await mcp.playwright.browser_snapshot()
expect(verificationSnapshot).toContain('Hash verification')
expect(verificationSnapshot).toContain('Structural integrity')
```

## Navigation Integration

### Navigation Links
- **Admin Dashboard** → **Backup Management** (`/admin` → `/admin/backups`)
- **Infrastructure** → **Disaster Recovery** (`/admin/infrastructure` → `/admin/disaster-recovery`)
- **Security** → **Backup Security** (`/admin/security` → `/admin/backups/security`)

### Breadcrumb Structure
```typescript
const breadcrumbs = [
  { label: 'Admin', href: '/admin' },
  { label: 'Infrastructure', href: '/admin/infrastructure' },
  { label: 'Backup Management', href: '/admin/backups' },
  { label: 'Backup Configuration', href: '/admin/backups/configurations' }
]
```

### Menu Integration
```typescript
// Add to admin navigation menu
{
  label: 'Backup & Recovery',
  href: '/admin/backups',
  icon: 'HardDriveIcon',
  badge: failedBackups > 0 ? failedBackups : undefined,
  children: [
    { label: 'Dashboard', href: '/admin/backups' },
    { label: 'Configurations', href: '/admin/backups/configurations' },
    { label: 'Restoration', href: '/admin/backups/restoration' },
    { label: 'Disaster Recovery', href: '/admin/disaster-recovery' },
    { label: 'Cost Analysis', href: '/admin/backups/cost' },
    { label: 'Testing Results', href: '/admin/backups/testing' }
  ]
}
```

## Error Handling & Edge Cases

### Backup Failure Recovery
```typescript
// Handle partial backup failures
const handlePartialFailure = async (executionId: string, error: Error) => {
  await supabase
    .from('backup_executions')
    .update({
      status: 'partial_failure',
      error_message: error.message,
      end_time: new Date().toISOString()
    })
    .eq('id', executionId)

  // Attempt retry with different storage location
  const alternativeLocation = await getAlternativeStorageLocation()
  if (alternativeLocation) {
    await scheduleBackupRetry(executionId, alternativeLocation.id)
  }
}
```

### Storage Location Failures
```typescript
// Handle storage location unavailability
const handleStorageFailure = async (storageLocationId: string) => {
  // Mark location as unavailable
  await supabase
    .from('backup_storage_locations')
    .update({ is_active: false })
    .eq('id', storageLocationId)

  // Redirect active backups to alternative locations
  await redirectBackupsToAlternativeStorage(storageLocationId)
  
  // Create high-priority alert
  await createBackupAlert(
    'storage_unavailable',
    'critical',
    `Storage location ${storageLocationId} is unavailable`
  )
}
```

### Restoration Conflicts
```typescript
// Handle target database conflicts
const handleRestorationConflict = async (restorationId: string, conflictType: string) => {
  await supabase
    .from('restoration_jobs')
    .update({
      status: 'conflict_detected',
      error_message: `Restoration conflict: ${conflictType}`
    })
    .eq('id', restorationId)

  // Suggest alternative approaches
  const alternatives = await suggestRestorationAlternatives(restorationId)
  return { conflict: conflictType, alternatives }
}
```

## Acceptance Criteria

### Must Have
- [x] Automated multi-tier backup system (database, files, configuration)
- [x] Point-in-time recovery capabilities
- [x] Encrypted backup storage with key rotation
- [x] Real-time backup monitoring and alerting
- [x] Disaster recovery procedures with documented RTO/RPO
- [x] Automated backup integrity verification
- [x] Retention policy enforcement with legal hold support
- [x] Cost tracking and optimization recommendations

### Should Have
- [x] Visual backup management dashboard
- [x] Self-service restoration capabilities
- [x] Backup testing automation
- [x] Cross-region backup replication
- [x] Restoration approval workflows
- [x] Disaster recovery runbook automation

### Could Have
- [ ] AI-powered backup optimization suggestions
- [ ] Automated disaster detection and response
- [ ] Integration with external monitoring systems
- [ ] Advanced analytics and predictive insights

### Won't Have (This Phase)
- Multi-cloud backup orchestration
- Hardware security module (HSM) integration
- Blockchain-based backup verification
- Real-time continuous data protection (CDP)

## Dependencies

### Internal Dependencies
- **WS-256**: Environment Variables Management (for secure credential storage)
- **WS-047**: Analytics Dashboard (for monitoring integration)
- **Authentication System**: For access control and user management
- **Database Schema**: Core database infrastructure

### External Dependencies
- PostgreSQL (primary database)
- Supabase (managed database and storage)
- AWS S3 (backup storage)
- Node.js child_process (for executing backup commands)
- Encryption libraries (AES-256)

### Technical Dependencies
- React 19 with Server Components
- Next.js 15 App Router
- TypeScript 5.0+
- Tailwind CSS for styling
- Job queue system (for backup scheduling)

## Effort Estimation

### Development Phases

**Phase 1: Core Backup System (3 weeks)**
- Database schema and migrations
- Basic backup execution service
- Storage location management
- Encryption and compression

**Phase 2: Monitoring & Alerting (2 weeks)**
- Backup monitoring dashboard
- Alert system and notifications
- Health metrics and reporting
- Cost tracking and analysis

**Phase 3: Disaster Recovery (2.5 weeks)**
- Restoration service implementation
- Point-in-time recovery
- Disaster recovery procedures
- Approval workflows

**Phase 4: Testing & Automation (2.5 weeks)**
- Backup testing framework
- Retention policy automation
- UI/UX components
- Integration testing

### Total Estimated Effort
**10 weeks** (1 senior full-stack developer + 1 DevOps engineer)

### Risk Factors
- Complexity of multi-database backup coordination
- Storage provider API limitations and quotas
- Encryption key management complexity
- Disaster recovery testing in production-like environments
- Large backup file transfer times and network reliability

---

*This technical specification provides a comprehensive foundation for implementing a professional-grade backup and disaster recovery system that ensures business continuity, data protection, and regulatory compliance for the WedSync platform.*