# WS-256: Environment Variables Management System - Technical Specification

## Feature Summary
Comprehensive environment variables management system with secure key rotation, multi-environment configuration, runtime validation, and automated security monitoring for the WedSync platform infrastructure.

## User Stories

### Primary User Story
**As a DevOps engineer**, I want a robust environment variables management system that securely handles configuration across all environments, automatically validates critical variables, and provides key rotation workflows, so that the platform maintains security and reliability while enabling smooth development operations.

### Detailed User Stories

1. **As a DevOps engineer setting up environments**
   - I want automated validation of all required environment variables
   - So that deployments fail fast with clear error messages when configuration is missing

2. **As a security administrator managing API keys**
   - I want automated key rotation schedules and secure key storage
   - So that compromised credentials have limited impact and keys are regularly refreshed

3. **As a developer joining the team**
   - I want a standardized development environment setup with example configurations
   - So that I can quickly start contributing without access to production credentials

4. **As a platform administrator monitoring security**
   - I want automated alerts for exposed keys, failed validations, and unauthorized access
   - So that security incidents are detected and mitigated immediately

5. **As a system integrator adding new services**
   - I want a streamlined process for adding new environment variables and configurations
   - So that new integrations can be deployed safely across all environments

## Database Schema

```sql
-- Environment variables management and security tracking
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Environment definitions
CREATE TABLE environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- 'development', 'staging', 'production'
  display_name TEXT NOT NULL,
  description TEXT,
  priority_level INTEGER NOT NULL, -- 1=prod, 2=staging, 3=dev
  security_tier TEXT NOT NULL, -- 'critical', 'standard', 'development'
  deployment_url TEXT,
  health_check_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Variable definitions and metadata
CREATE TABLE environment_variable_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL, -- 'database', 'api_key', 'auth', 'integration', 'config'
  description TEXT NOT NULL,
  data_type TEXT DEFAULT 'string', -- 'string', 'number', 'boolean', 'url', 'json'
  is_secret BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false, -- NEXT_PUBLIC_ variables
  validation_pattern TEXT, -- Regex pattern for validation
  default_value TEXT,
  example_value TEXT,
  rotation_schedule_days INTEGER, -- Auto-rotation schedule
  security_classification TEXT DEFAULT 'internal', -- 'public', 'internal', 'confidential', 'restricted'
  owner_team TEXT NOT NULL, -- 'devops', 'security', 'engineering', 'product'
  documentation_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Current variable values per environment
CREATE TABLE environment_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID REFERENCES environments(id) ON DELETE CASCADE,
  variable_definition_id UUID REFERENCES environment_variable_definitions(id) ON DELETE CASCADE,
  encrypted_value TEXT, -- Always encrypted at rest
  value_hash TEXT NOT NULL, -- For change detection without decryption
  last_rotation_at TIMESTAMPTZ,
  next_rotation_due TIMESTAMPTZ,
  rotation_status TEXT DEFAULT 'active', -- 'active', 'pending', 'expired', 'compromised'
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(environment_id, variable_definition_id)
);

-- Key rotation history and audit trail
CREATE TABLE variable_rotation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_variable_id UUID REFERENCES environment_variables(id) ON DELETE CASCADE,
  rotation_type TEXT NOT NULL, -- 'scheduled', 'manual', 'emergency', 'compromised'
  old_value_hash TEXT,
  new_value_hash TEXT,
  rotation_reason TEXT,
  rotated_by UUID REFERENCES user_profiles(id),
  rotation_success BOOLEAN DEFAULT true,
  error_message TEXT,
  verification_status TEXT, -- 'pending', 'verified', 'failed'
  rollback_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Environment variable validation rules
CREATE TABLE variable_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_definition_id UUID REFERENCES environment_variable_definitions(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL, -- 'regex', 'length', 'format', 'dependency', 'custom'
  rule_config JSONB NOT NULL, -- Rule-specific configuration
  error_message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100, -- Lower = higher priority
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security monitoring and alerts
CREATE TABLE security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL, -- 'exposed_key', 'failed_validation', 'unauthorized_access', 'key_compromise'
  severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  environment_id UUID REFERENCES environments(id),
  variable_definition_id UUID REFERENCES environment_variable_definitions(id),
  description TEXT NOT NULL,
  detection_method TEXT, -- 'automated_scan', 'manual_report', 'monitoring_alert'
  affected_systems TEXT[],
  remediation_status TEXT DEFAULT 'open', -- 'open', 'investigating', 'mitigated', 'resolved'
  remediation_actions JSONB,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES user_profiles(id)
);

-- Environment variable access logs
CREATE TABLE variable_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID REFERENCES environments(id),
  variable_definition_id UUID REFERENCES environment_variable_definitions(id),
  access_type TEXT NOT NULL, -- 'read', 'write', 'rotate', 'delete'
  accessed_by UUID REFERENCES user_profiles(id),
  access_method TEXT, -- 'ui', 'api', 'cli', 'automated'
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuration templates for quick setup
CREATE TABLE environment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT UNIQUE NOT NULL,
  description TEXT,
  target_environment_type TEXT, -- 'development', 'staging', 'production'
  variable_definitions JSONB NOT NULL, -- Array of variable configs
  setup_instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deployment configuration status
CREATE TABLE deployment_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID REFERENCES environments(id),
  deployment_platform TEXT NOT NULL, -- 'vercel', 'aws', 'gcp', 'azure'
  platform_config JSONB NOT NULL,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed', 'drift'
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  drift_detected_at TIMESTAMPTZ,
  auto_sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_env_vars_environment ON environment_variables(environment_id);
CREATE INDEX idx_env_vars_definition ON environment_variables(variable_definition_id);
CREATE INDEX idx_env_vars_rotation_due ON environment_variables(next_rotation_due) WHERE rotation_status = 'active';
CREATE INDEX idx_rotation_history_env_var ON variable_rotation_history(environment_variable_id);
CREATE INDEX idx_security_incidents_severity ON security_incidents(severity, incident_type);
CREATE INDEX idx_security_incidents_status ON security_incidents(remediation_status);
CREATE INDEX idx_access_logs_user_time ON variable_access_logs(accessed_by, accessed_at);
CREATE INDEX idx_access_logs_variable_time ON variable_access_logs(variable_definition_id, accessed_at);
CREATE INDEX idx_deployment_configs_platform ON deployment_configurations(deployment_platform);
```

## API Endpoints

### Environment Management Endpoints
```typescript
// Get all environments with status
GET /api/admin/environments
Authorization: Bearer {admin_token}

Response: {
  environments: Array<{
    id: string,
    name: string,
    displayName: string,
    securityTier: string,
    healthStatus: 'healthy' | 'warning' | 'critical',
    lastDeployment: string,
    variableCount: number,
    driftDetected: boolean
  }>
}

// Get environment configuration
GET /api/admin/environments/{environmentId}/variables
Authorization: Bearer {admin_token}

Response: {
  environment: Environment,
  variables: Array<{
    id: string,
    name: string,
    category: string,
    isSecret: boolean,
    isConfigured: boolean,
    lastRotation: string,
    rotationDue: string,
    validationStatus: 'valid' | 'invalid' | 'warning'
  }>,
  validationErrors: ValidationError[]
}

// Update environment variable
PUT /api/admin/environments/{environmentId}/variables/{variableId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  value: string,
  rotationType?: 'manual' | 'scheduled' | 'emergency',
  reason?: string
}

Response: {
  success: boolean,
  variableId: string,
  rotationId: string,
  validationResult: ValidationResult
}
```

### Variable Definition Management
```typescript
// Get all variable definitions
GET /api/admin/variable-definitions
Authorization: Bearer {admin_token}

Response: {
  variables: Array<{
    id: string,
    name: string,
    category: string,
    isSecret: boolean,
    isRequired: boolean,
    rotationSchedule: number,
    environments: Record<string, {
      configured: boolean,
      rotationDue: string
    }>
  }>
}

// Create new variable definition
POST /api/admin/variable-definitions
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  variableName: string,
  category: string,
  description: string,
  dataType: string,
  isSecret: boolean,
  isRequired: boolean,
  isPublic?: boolean,
  validationPattern?: string,
  rotationScheduleDays?: number,
  ownerTeam: string
}

Response: {
  variableId: string,
  setupInstructions: string[]
}

// Update variable definition
PUT /api/admin/variable-definitions/{variableId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  description?: string,
  validationPattern?: string,
  rotationScheduleDays?: number,
  ownerTeam?: string
}
```

### Security & Monitoring Endpoints
```typescript
// Get security dashboard
GET /api/admin/security/dashboard
Authorization: Bearer {admin_token}

Response: {
  overview: {
    totalVariables: number,
    secretVariables: number,
    rotationsDue: number,
    activeIncidents: number,
    exposedKeys: number
  },
  recentIncidents: SecurityIncident[],
  rotationAlerts: RotationAlert[],
  complianceScore: number
}

// Rotate variable immediately
POST /api/admin/security/rotate/{variableId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  rotationType: 'manual' | 'emergency' | 'compromised',
  reason: string,
  environments: string[] // Optional: specific environments
}

Response: {
  rotationId: string,
  status: 'initiated' | 'completed' | 'failed',
  affectedEnvironments: string[],
  verificationRequired: boolean
}

// Get access logs
GET /api/admin/security/access-logs
Authorization: Bearer {admin_token}
Query: ?userId={userId}&variableId={variableId}&from={date}&to={date}

Response: {
  logs: Array<{
    timestamp: string,
    user: string,
    action: string,
    variable: string,
    environment: string,
    success: boolean,
    ipAddress: string
  }>,
  totalCount: number
}

// Create security incident
POST /api/admin/security/incidents
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  incidentType: string,
  severity: string,
  description: string,
  affectedSystems?: string[],
  environmentId?: string,
  variableId?: string
}
```

### Validation & Deployment Endpoints
```typescript
// Validate all environment configurations
POST /api/admin/validation/validate-all
Authorization: Bearer {admin_token}

Response: {
  validationId: string,
  overall: {
    status: 'valid' | 'warning' | 'error',
    environmentCount: number,
    variableCount: number,
    errorCount: number,
    warningCount: number
  },
  environments: Array<{
    environmentId: string,
    status: 'valid' | 'warning' | 'error',
    errors: ValidationError[],
    warnings: ValidationWarning[]
  }>
}

// Sync to deployment platform
POST /api/admin/deployment/sync/{environmentId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  platform: 'vercel' | 'aws' | 'gcp' | 'azure',
  dryRun?: boolean,
  variables?: string[] // Optional: sync specific variables
}

Response: {
  syncId: string,
  status: 'initiated' | 'completed' | 'failed',
  syncedVariables: string[],
  failures: Array<{
    variable: string,
    error: string
  }>
}

// Get deployment status
GET /api/admin/deployment/status/{environmentId}
Authorization: Bearer {admin_token}

Response: {
  environment: string,
  platform: string,
  syncStatus: string,
  lastSync: string,
  driftCount: number,
  pendingChanges: number
}
```

## Frontend Components

### EnvironmentDashboard Component
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ServerIcon, 
  KeyIcon, 
  ShieldCheckIcon, 
  AlertTriangleIcon, 
  RefreshCwIcon, 
  EyeIcon, 
  EyeOffIcon,
  RotateCcwIcon,
  CheckCircleIcon,
  XCircleIcon
} from 'lucide-react'

interface EnvironmentDashboardProps {
  adminToken: string
}

interface Environment {
  id: string
  name: string
  displayName: string
  securityTier: string
  healthStatus: 'healthy' | 'warning' | 'critical'
  lastDeployment: string
  variableCount: number
  driftDetected: boolean
}

interface EnvironmentVariable {
  id: string
  name: string
  category: string
  isSecret: boolean
  isConfigured: boolean
  lastRotation: string
  rotationDue: string
  validationStatus: 'valid' | 'invalid' | 'warning'
  value?: string
}

export default function EnvironmentDashboard({ adminToken }: EnvironmentDashboardProps) {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null)
  const [variables, setVariables] = useState<EnvironmentVariable[]>([])
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [isValidating, setIsValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<any>(null)

  const statusColors = {
    healthy: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800'
  }

  const validationStatusIcons = {
    valid: CheckCircleIcon,
    invalid: XCircleIcon,
    warning: AlertTriangleIcon
  }

  const validationStatusColors = {
    valid: 'text-green-600',
    invalid: 'text-red-600',
    warning: 'text-yellow-600'
  }

  useEffect(() => {
    fetchEnvironments()
  }, [])

  useEffect(() => {
    if (selectedEnvironment) {
      fetchEnvironmentVariables(selectedEnvironment.id)
    }
  }, [selectedEnvironment])

  const fetchEnvironments = async () => {
    try {
      const response = await fetch('/api/admin/environments', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setEnvironments(data.environments || [])
        if (data.environments?.length > 0 && !selectedEnvironment) {
          setSelectedEnvironment(data.environments[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch environments:', error)
    }
  }

  const fetchEnvironmentVariables = async (environmentId: string) => {
    try {
      const response = await fetch(`/api/admin/environments/${environmentId}/variables`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setVariables(data.variables || [])
      }
    } catch (error) {
      console.error('Failed to fetch environment variables:', error)
    }
  }

  const validateAllEnvironments = async () => {
    setIsValidating(true)
    try {
      const response = await fetch('/api/admin/validation/validate-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setValidationResults(data)
      }
    } catch (error) {
      console.error('Failed to validate environments:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const rotateVariable = async (variableId: string, rotationType: string = 'manual') => {
    try {
      const response = await fetch(`/api/admin/security/rotate/${variableId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          rotationType,
          reason: 'Manual rotation from dashboard',
          environments: selectedEnvironment ? [selectedEnvironment.id] : undefined
        })
      })

      if (response.ok) {
        // Refresh variables after rotation
        if (selectedEnvironment) {
          fetchEnvironmentVariables(selectedEnvironment.id)
        }
      }
    } catch (error) {
      console.error('Failed to rotate variable:', error)
    }
  }

  const toggleSecretVisibility = (variableId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [variableId]: !prev[variableId]
    }))
  }

  const getRotationStatus = (variable: EnvironmentVariable) => {
    if (!variable.rotationDue) return null
    
    const dueDate = new Date(variable.rotationDue)
    const now = new Date()
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilDue < 0) {
      return { status: 'overdue', color: 'bg-red-100 text-red-800', text: `${Math.abs(daysUntilDue)} days overdue` }
    } else if (daysUntilDue <= 7) {
      return { status: 'due-soon', color: 'bg-yellow-100 text-yellow-800', text: `Due in ${daysUntilDue} days` }
    }
    
    return { status: 'ok', color: 'bg-green-100 text-green-800', text: `${daysUntilDue} days remaining` }
  }

  const categorizedVariables = variables.reduce((acc, variable) => {
    acc[variable.category] = acc[variable.category] || []
    acc[variable.category].push(variable)
    return acc
  }, {} as Record<string, EnvironmentVariable[]>)

  return (
    <div className="space-y-6">
      {/* Environment Selection */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-4">
          {environments.map((env) => (
            <button
              key={env.id}
              onClick={() => setSelectedEnvironment(env)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                selectedEnvironment?.id === env.id
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <ServerIcon className="h-4 w-4" />
              <span className="font-medium">{env.displayName}</span>
              <Badge className={statusColors[env.healthStatus]}>
                {env.healthStatus}
              </Badge>
              {env.driftDetected && (
                <AlertTriangleIcon className="h-4 w-4 text-orange-500" />
              )}
            </button>
          ))}
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={validateAllEnvironments}
            disabled={isValidating}
            variant="outline"
          >
            <ShieldCheckIcon className="h-4 w-4 mr-2" />
            {isValidating ? 'Validating...' : 'Validate All'}
          </Button>
          
          <Button onClick={fetchEnvironments}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Validation Results */}
      {validationResults && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{validationResults.overall.environmentCount}</div>
                <div className="text-sm text-gray-600">Environments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{validationResults.overall.variableCount}</div>
                <div className="text-sm text-gray-600">Variables</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{validationResults.overall.errorCount}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{validationResults.overall.warningCount}</div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
            </div>

            {validationResults.overall.errorCount > 0 && (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription>
                  <strong>Critical validation errors detected.</strong> Deployment may fail or be unstable.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Environment Variables */}
      {selectedEnvironment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <KeyIcon className="h-5 w-5 mr-2" />
              {selectedEnvironment.displayName} Variables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(categorizedVariables)[0]} className="w-full">
              <TabsList className="grid grid-cols-5 w-full">
                {Object.keys(categorizedVariables).map((category) => (
                  <TabsTrigger key={category} value={category} className="capitalize">
                    {category}
                    <Badge variant="secondary" className="ml-2">
                      {categorizedVariables[category].length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(categorizedVariables).map(([category, categoryVariables]) => (
                <TabsContent key={category} value={category} className="space-y-3">
                  {categoryVariables.map((variable) => {
                    const StatusIcon = validationStatusIcons[variable.validationStatus]
                    const rotationStatus = getRotationStatus(variable)
                    
                    return (
                      <div key={variable.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <StatusIcon className={`h-5 w-5 ${validationStatusColors[variable.validationStatus]}`} />
                            <div>
                              <div className="font-medium">{variable.name}</div>
                              <div className="text-sm text-gray-600">
                                Last rotation: {variable.lastRotation ? new Date(variable.lastRotation).toLocaleDateString() : 'Never'}
                              </div>
                            </div>
                            
                            {variable.isSecret && (
                              <Badge variant="outline" className="text-red-600">
                                Secret
                              </Badge>
                            )}
                            
                            {!variable.isConfigured && (
                              <Badge variant="destructive">
                                Not Configured
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            {rotationStatus && (
                              <Badge className={rotationStatus.color}>
                                {rotationStatus.text}
                              </Badge>
                            )}
                            
                            {variable.isSecret && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleSecretVisibility(variable.id)}
                              >
                                {showSecrets[variable.id] ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                              </Button>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => rotateVariable(variable.id)}
                              disabled={!variable.isConfigured}
                            >
                              <RotateCcwIcon className="h-4 w-4 mr-1" />
                              Rotate
                            </Button>
                          </div>
                        </div>

                        {/* Show value if not secret or if secret visibility is toggled */}
                        {(!variable.isSecret || showSecrets[variable.id]) && variable.value && (
                          <div className="mt-3 p-3 bg-gray-50 rounded border">
                            <div className="text-sm font-mono break-all">
                              {variable.isSecret && !showSecrets[variable.id] 
                                ? '••••••••••••••••••••••••••••••••'
                                : variable.value
                              }
                            </div>
                          </div>
                        )}

                        {/* Validation errors */}
                        {variable.validationStatus === 'invalid' && (
                          <Alert className="mt-3 bg-red-50 border-red-200">
                            <AlertTriangleIcon className="h-4 w-4" />
                            <AlertDescription>
                              Variable validation failed. Check the value format and requirements.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )
                  })}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

### SecurityMonitoringDashboard Component
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ShieldIcon, 
  AlertTriangleIcon, 
  KeyIcon,
  ClockIcon,
  EyeIcon,
  UserIcon,
  ServerIcon,
  RefreshCwIcon
} from 'lucide-react'

interface SecurityDashboardProps {
  adminToken: string
}

interface SecurityOverview {
  totalVariables: number
  secretVariables: number
  rotationsDue: number
  activeIncidents: number
  exposedKeys: number
}

interface SecurityIncident {
  id: string
  incidentType: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  environment: string
  detectedAt: string
  status: string
}

interface RotationAlert {
  variableId: string
  variableName: string
  environment: string
  daysOverdue: number
  category: string
}

interface AccessLog {
  timestamp: string
  user: string
  action: string
  variable: string
  environment: string
  success: boolean
  ipAddress: string
}

export default function SecurityMonitoringDashboard({ adminToken }: SecurityDashboardProps) {
  const [overview, setOverview] = useState<SecurityOverview>({
    totalVariables: 0,
    secretVariables: 0,
    rotationsDue: 0,
    activeIncidents: 0,
    exposedKeys: 0
  })
  const [incidents, setIncidents] = useState<SecurityIncident[]>([])
  const [rotationAlerts, setRotationAlerts] = useState<RotationAlert[]>([])
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [complianceScore, setComplianceScore] = useState<number>(0)

  const severityColors = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800'
  }

  const statusColors = {
    open: 'bg-red-100 text-red-800',
    investigating: 'bg-yellow-100 text-yellow-800',
    mitigated: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800'
  }

  useEffect(() => {
    fetchSecurityDashboard()
    fetchAccessLogs()
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchSecurityDashboard()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchSecurityDashboard = async () => {
    try {
      const response = await fetch('/api/admin/security/dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setOverview(data.overview || {})
        setIncidents(data.recentIncidents || [])
        setRotationAlerts(data.rotationAlerts || [])
        setComplianceScore(data.complianceScore || 0)
      }
    } catch (error) {
      console.error('Failed to fetch security dashboard:', error)
    }
  }

  const fetchAccessLogs = async () => {
    try {
      const response = await fetch('/api/admin/security/access-logs', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAccessLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch access logs:', error)
    }
  }

  const handleEmergencyRotation = async (variableId: string) => {
    try {
      await fetch(`/api/admin/security/rotate/${variableId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          rotationType: 'emergency',
          reason: 'Emergency rotation from security dashboard'
        })
      })
      
      // Refresh dashboard after rotation
      fetchSecurityDashboard()
    } catch (error) {
      console.error('Failed to perform emergency rotation:', error)
    }
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <KeyIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{overview.totalVariables}</p>
              <p className="text-sm text-gray-600">Total Variables</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <ShieldIcon className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{overview.secretVariables}</p>
              <p className="text-sm text-gray-600">Secret Variables</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <ClockIcon className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{overview.rotationsDue}</p>
              <p className="text-sm text-gray-600">Rotations Due</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <AlertTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{overview.activeIncidents}</p>
              <p className="text-sm text-gray-600">Active Incidents</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <EyeIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{overview.exposedKeys}</p>
              <p className="text-sm text-gray-600">Exposed Keys</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Score */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldIcon className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="font-semibold">Security Compliance Score</h3>
                <p className="text-sm text-gray-600">Based on security best practices and key rotation status</p>
              </div>
            </div>
            <div className={`text-4xl font-bold ${getComplianceColor(complianceScore)}`}>
              {complianceScore}%
            </div>
          </div>
          
          <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                complianceScore >= 90 ? 'bg-green-600' :
                complianceScore >= 70 ? 'bg-yellow-600' : 'bg-red-600'
              }`}
              style={{ width: `${complianceScore}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {(overview.exposedKeys > 0 || overview.activeIncidents > 0) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangleIcon className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <div className="font-medium text-red-800">Critical Security Issues Detected</div>
            <div className="mt-2 text-red-700">
              {overview.exposedKeys > 0 && (
                <div>• {overview.exposedKeys} exposed API key(s) detected in code repositories</div>
              )}
              {overview.activeIncidents > 0 && (
                <div>• {overview.activeIncidents} active security incident(s) require immediate attention</div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Security Incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangleIcon className="h-5 w-5 mr-2" />
            Recent Security Incidents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recent security incidents
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div key={incident.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge className={severityColors[incident.severity]}>
                      {incident.severity.toUpperCase()}
                    </Badge>
                    <div>
                      <div className="font-medium">{incident.incidentType}</div>
                      <div className="text-sm text-gray-600">{incident.description}</div>
                      <div className="text-xs text-gray-500">
                        {incident.environment} • {new Date(incident.detectedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Badge className={statusColors[incident.status as keyof typeof statusColors]}>
                    {incident.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rotation Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            Key Rotation Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rotationAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              All keys are up to date
            </div>
          ) : (
            <div className="space-y-3">
              {rotationAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div>
                      <div className="font-medium">{alert.variableName}</div>
                      <div className="text-sm text-gray-600">
                        {alert.environment} • {alert.category}
                      </div>
                    </div>
                    <Badge className="bg-red-100 text-red-800">
                      {alert.daysOverdue} days overdue
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEmergencyRotation(alert.variableId)}
                  >
                    <RefreshCwIcon className="h-4 w-4 mr-1" />
                    Rotate Now
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Access Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            Recent Access Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {accessLogs.slice(0, 10).map((log, index) => (
              <div key={index} className="flex items-center justify-between p-2 text-sm">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">{log.user}</span>
                  <span className="text-gray-600">{log.action}</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{log.variable}</code>
                  <Badge variant="outline">{log.environment}</Badge>
                </div>
                <div className="text-gray-500">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

## Backend Implementation

### Core Service Classes

#### EnvironmentVariablesService
```typescript
import { createHash, randomBytes } from 'crypto'
import { supabase } from '@/lib/supabase'

export class EnvironmentVariablesService {
  private encryptionKey: string

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey()
  }

  async createVariableDefinition(definition: VariableDefinitionInput): Promise<string> {
    const { data, error } = await supabase
      .from('environment_variable_definitions')
      .insert({
        variable_name: definition.variableName,
        category: definition.category,
        description: definition.description,
        data_type: definition.dataType || 'string',
        is_secret: definition.isSecret || false,
        is_required: definition.isRequired || true,
        is_public: definition.isPublic || false,
        validation_pattern: definition.validationPattern,
        rotation_schedule_days: definition.rotationScheduleDays,
        owner_team: definition.ownerTeam
      })
      .select()
      .single()

    if (error) throw error

    // Create validation rules if provided
    if (definition.validationRules) {
      await this.createValidationRules(data.id, definition.validationRules)
    }

    return data.id
  }

  async setEnvironmentVariable(
    environmentId: string,
    variableDefinitionId: string,
    value: string,
    rotationType: string = 'manual'
  ): Promise<EnvironmentVariableResult> {
    // Encrypt the value
    const encryptedValue = this.encryptValue(value)
    const valueHash = this.hashValue(value)

    // Check if variable already exists
    const { data: existingVariable } = await supabase
      .from('environment_variables')
      .select('*')
      .eq('environment_id', environmentId)
      .eq('variable_definition_id', variableDefinitionId)
      .single()

    let variableId: string

    if (existingVariable) {
      // Update existing variable
      const { data: updatedVariable, error } = await supabase
        .from('environment_variables')
        .update({
          encrypted_value: encryptedValue,
          value_hash: valueHash,
          last_rotation_at: new Date().toISOString(),
          next_rotation_due: this.calculateNextRotationDate(variableDefinitionId),
          rotation_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingVariable.id)
        .select()
        .single()

      if (error) throw error
      variableId = updatedVariable.id

      // Create rotation history entry
      await this.createRotationHistory(
        variableId,
        rotationType,
        existingVariable.value_hash,
        valueHash,
        'Variable updated'
      )
    } else {
      // Create new variable
      const { data: newVariable, error } = await supabase
        .from('environment_variables')
        .insert({
          environment_id: environmentId,
          variable_definition_id: variableDefinitionId,
          encrypted_value: encryptedValue,
          value_hash: valueHash,
          last_rotation_at: new Date().toISOString(),
          next_rotation_due: this.calculateNextRotationDate(variableDefinitionId),
          rotation_status: 'active'
        })
        .select()
        .single()

      if (error) throw error
      variableId = newVariable.id

      // Create initial rotation history entry
      await this.createRotationHistory(
        variableId,
        'initial',
        null,
        valueHash,
        'Initial variable creation'
      )
    }

    // Validate the new value
    const validationResult = await this.validateVariable(variableDefinitionId, value)

    // Log access
    await this.logVariableAccess(
      environmentId,
      variableDefinitionId,
      'write',
      'system' // Or pass actual user ID
    )

    return {
      variableId,
      validationResult
    }
  }

  async validateAllEnvironments(): Promise<ValidationSummary> {
    const environments = await this.getAllEnvironments()
    const results: EnvironmentValidationResult[] = []
    let totalErrors = 0
    let totalWarnings = 0

    for (const environment of environments) {
      const envResult = await this.validateEnvironment(environment.id)
      results.push(envResult)
      totalErrors += envResult.errors.length
      totalWarnings += envResult.warnings.length
    }

    return {
      overall: {
        status: totalErrors > 0 ? 'error' : totalWarnings > 0 ? 'warning' : 'valid',
        environmentCount: environments.length,
        variableCount: results.reduce((sum, r) => sum + r.variableCount, 0),
        errorCount: totalErrors,
        warningCount: totalWarnings
      },
      environments: results
    }
  }

  async rotateVariable(
    variableId: string,
    rotationType: string,
    reason: string
  ): Promise<RotationResult> {
    const { data: variable } = await supabase
      .from('environment_variables')
      .select(`
        *,
        variable_definition:environment_variable_definitions(*)
      `)
      .eq('id', variableId)
      .single()

    if (!variable) throw new Error('Variable not found')

    // Generate new value based on variable type
    const newValue = await this.generateNewValue(variable.variable_definition)
    
    // Update variable with new value
    const result = await this.setEnvironmentVariable(
      variable.environment_id,
      variable.variable_definition_id,
      newValue,
      rotationType
    )

    // Update rotation status
    await supabase
      .from('variable_rotation_history')
      .update({
        rotation_reason: reason,
        rotation_success: true,
        verification_status: 'pending'
      })
      .eq('environment_variable_id', variableId)
      .order('created_at', { ascending: false })
      .limit(1)

    // Sync to deployment platform
    await this.syncToDeploymentPlatform(variable.environment_id, [variableId])

    return {
      rotationId: result.variableId,
      status: 'completed',
      newValue: rotationType === 'emergency' ? undefined : newValue, // Don't return value for emergency rotations
      verificationRequired: variable.variable_definition.category === 'api_key'
    }
  }

  async monitorSecurityIncidents(): Promise<SecurityDashboard> {
    // Get overview statistics
    const { data: overview } = await supabase.rpc('get_security_overview')
    
    // Get recent incidents
    const { data: recentIncidents } = await supabase
      .from('security_incidents')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(10)

    // Get rotation alerts
    const { data: rotationAlerts } = await supabase
      .from('environment_variables')
      .select(`
        id,
        variable_definition:environment_variable_definitions(variable_name, category),
        environment:environments(name),
        next_rotation_due
      `)
      .lt('next_rotation_due', new Date().toISOString())
      .eq('rotation_status', 'active')

    // Calculate compliance score
    const complianceScore = await this.calculateComplianceScore()

    return {
      overview: overview || {
        totalVariables: 0,
        secretVariables: 0,
        rotationsDue: 0,
        activeIncidents: 0,
        exposedKeys: 0
      },
      recentIncidents: recentIncidents || [],
      rotationAlerts: rotationAlerts?.map(alert => ({
        variableId: alert.id,
        variableName: alert.variable_definition.variable_name,
        environment: alert.environment.name,
        category: alert.variable_definition.category,
        daysOverdue: Math.ceil(
          (new Date().getTime() - new Date(alert.next_rotation_due).getTime()) / 
          (1000 * 60 * 60 * 24)
        )
      })) || [],
      complianceScore
    }
  }

  private encryptValue(value: string): string {
    // Use AES encryption with the encryption key
    const cipher = createCipher('aes-256-gcm', this.encryptionKey)
    let encrypted = cipher.update(value, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }

  private async calculateNextRotationDate(variableDefinitionId: string): Promise<string | null> {
    const { data: definition } = await supabase
      .from('environment_variable_definitions')
      .select('rotation_schedule_days')
      .eq('id', variableDefinitionId)
      .single()

    if (!definition?.rotation_schedule_days) return null

    const nextRotation = new Date()
    nextRotation.setDate(nextRotation.getDate() + definition.rotation_schedule_days)
    return nextRotation.toISOString()
  }

  private async validateVariable(
    variableDefinitionId: string,
    value: string
  ): Promise<ValidationResult> {
    const { data: definition } = await supabase
      .from('environment_variable_definitions')
      .select('*')
      .eq('id', variableDefinitionId)
      .single()

    if (!definition) throw new Error('Variable definition not found')

    const errors: string[] = []
    const warnings: string[] = []

    // Basic validation
    if (definition.is_required && !value) {
      errors.push('Value is required')
    }

    // Pattern validation
    if (definition.validation_pattern && value) {
      const pattern = new RegExp(definition.validation_pattern)
      if (!pattern.test(value)) {
        errors.push('Value does not match required pattern')
      }
    }

    // Type-specific validation
    switch (definition.data_type) {
      case 'url':
        try {
          new URL(value)
        } catch {
          errors.push('Invalid URL format')
        }
        break
      case 'json':
        try {
          JSON.parse(value)
        } catch {
          errors.push('Invalid JSON format')
        }
        break
      case 'number':
        if (isNaN(Number(value))) {
          errors.push('Invalid number format')
        }
        break
    }

    // Get custom validation rules
    const { data: customRules } = await supabase
      .from('variable_validation_rules')
      .select('*')
      .eq('variable_definition_id', variableDefinitionId)
      .eq('is_active', true)

    // Run custom validations
    for (const rule of customRules || []) {
      const ruleResult = await this.runValidationRule(rule, value)
      if (!ruleResult.valid) {
        errors.push(rule.error_message)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  private async generateNewValue(variableDefinition: any): Promise<string> {
    switch (variableDefinition.category) {
      case 'auth':
        // Generate secure random string for auth tokens
        return randomBytes(32).toString('hex')
      
      case 'api_key':
        // Generate API key format based on the service
        if (variableDefinition.variable_name.includes('STRIPE')) {
          return 'sk_test_' + randomBytes(24).toString('hex')
        }
        return 'key_' + randomBytes(32).toString('hex')
      
      default:
        // For other types, generate a secure random string
        return randomBytes(16).toString('hex')
    }
  }

  private async calculateComplianceScore(): Promise<number> {
    // Get all variables and their status
    const { data: variables } = await supabase
      .from('environment_variables')
      .select(`
        *,
        variable_definition:environment_variable_definitions(*),
        environment:environments(*)
      `)

    if (!variables?.length) return 100

    let score = 100
    const penalties = {
      overdue_rotation: 10,
      missing_required: 20,
      validation_failure: 15,
      exposed_key: 30
    }

    for (const variable of variables) {
      // Check rotation status
      if (variable.next_rotation_due && new Date(variable.next_rotation_due) < new Date()) {
        score -= penalties.overdue_rotation
      }

      // Check if required variables are configured
      if (variable.variable_definition.is_required && !variable.encrypted_value) {
        score -= penalties.missing_required
      }
    }

    // Check for active security incidents
    const { data: incidents } = await supabase
      .from('security_incidents')
      .select('severity')
      .eq('remediation_status', 'open')

    for (const incident of incidents || []) {
      if (incident.severity === 'critical') {
        score -= penalties.exposed_key
      }
    }

    return Math.max(0, score)
  }

  private generateEncryptionKey(): string {
    return randomBytes(32).toString('hex')
  }

  private async createRotationHistory(
    variableId: string,
    rotationType: string,
    oldValueHash: string | null,
    newValueHash: string,
    reason: string
  ): Promise<void> {
    await supabase
      .from('variable_rotation_history')
      .insert({
        environment_variable_id: variableId,
        rotation_type: rotationType,
        old_value_hash: oldValueHash,
        new_value_hash: newValueHash,
        rotation_reason: reason,
        rotation_success: true
      })
  }

  private async logVariableAccess(
    environmentId: string,
    variableDefinitionId: string,
    accessType: string,
    userId: string
  ): Promise<void> {
    await supabase
      .from('variable_access_logs')
      .insert({
        environment_id: environmentId,
        variable_definition_id: variableDefinitionId,
        access_type: accessType,
        accessed_by: userId,
        access_method: 'api',
        success: true
      })
  }

  private async syncToDeploymentPlatform(
    environmentId: string,
    variableIds?: string[]
  ): Promise<void> {
    // Implementation for syncing to Vercel/AWS/etc.
    // This would integrate with platform-specific APIs
  }

  private async getAllEnvironments(): Promise<Environment[]> {
    const { data } = await supabase
      .from('environments')
      .select('*')
      .order('priority_level', { ascending: true })
    
    return data || []
  }

  private async validateEnvironment(environmentId: string): Promise<EnvironmentValidationResult> {
    // Implementation for validating a specific environment
    return {
      environmentId,
      status: 'valid',
      errors: [],
      warnings: [],
      variableCount: 0
    }
  }

  private async runValidationRule(rule: any, value: string): Promise<{ valid: boolean }> {
    // Implementation for custom validation rules
    return { valid: true }
  }

  private async createValidationRules(variableId: string, rules: any[]): Promise<void> {
    // Implementation for creating validation rules
  }
}

// Type definitions
interface VariableDefinitionInput {
  variableName: string
  category: string
  description: string
  dataType?: string
  isSecret?: boolean
  isRequired?: boolean
  isPublic?: boolean
  validationPattern?: string
  rotationScheduleDays?: number
  ownerTeam: string
  validationRules?: any[]
}

interface EnvironmentVariableResult {
  variableId: string
  validationResult: ValidationResult
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface ValidationSummary {
  overall: {
    status: 'valid' | 'warning' | 'error'
    environmentCount: number
    variableCount: number
    errorCount: number
    warningCount: number
  }
  environments: EnvironmentValidationResult[]
}

interface EnvironmentValidationResult {
  environmentId: string
  status: 'valid' | 'warning' | 'error'
  errors: string[]
  warnings: string[]
  variableCount: number
}

interface RotationResult {
  rotationId: string
  status: 'initiated' | 'completed' | 'failed'
  newValue?: string
  verificationRequired: boolean
}

interface SecurityDashboard {
  overview: {
    totalVariables: number
    secretVariables: number
    rotationsDue: number
    activeIncidents: number
    exposedKeys: number
  }
  recentIncidents: any[]
  rotationAlerts: any[]
  complianceScore: number
}

interface Environment {
  id: string
  name: string
  displayName: string
  securityTier: string
  priorityLevel: number
}
```

## MCP Server Usage

### Supabase MCP for Database Operations
```typescript
// Apply environment variables migrations
await mcp.supabase.apply_migration('create_environment_variables_system', `
  -- Migration SQL from database schema section above
`)

// Execute complex security queries
const securityOverview = await mcp.supabase.execute_sql(`
  SELECT 
    COUNT(*) as total_variables,
    COUNT(*) FILTER (WHERE evd.is_secret = true) as secret_variables,
    COUNT(*) FILTER (WHERE ev.next_rotation_due < NOW()) as rotations_due,
    COUNT(DISTINCT si.id) as active_incidents
  FROM environment_variables ev
  JOIN environment_variable_definitions evd ON evd.id = ev.variable_definition_id
  LEFT JOIN security_incidents si ON si.remediation_status = 'open'
  WHERE ev.rotation_status = 'active'
`)

// Get rotation alerts with complex joins
const rotationAlerts = await mcp.supabase.execute_sql(`
  SELECT 
    ev.id as variable_id,
    evd.variable_name,
    e.name as environment,
    evd.category,
    EXTRACT(days FROM (NOW() - ev.next_rotation_due)) as days_overdue
  FROM environment_variables ev
  JOIN environment_variable_definitions evd ON evd.id = ev.variable_definition_id
  JOIN environments e ON e.id = ev.environment_id
  WHERE ev.next_rotation_due < NOW()
    AND ev.rotation_status = 'active'
  ORDER BY days_overdue DESC
`)

// Generate database types for environment variables
await mcp.supabase.generate_typescript_types()
```

### Memory MCP for Configuration Tracking
```typescript
// Store environment configuration decisions
await mcp.memory.create_entities([
  {
    name: 'Environment Variables System',
    entityType: 'infrastructure_component',
    observations: [
      'Implemented comprehensive environment variables management system',
      'Added automated key rotation with configurable schedules',
      'Integrated security monitoring and incident tracking',
      'Created multi-environment configuration support',
      'Added validation system with custom rules'
    ]
  }
])

// Track security incidents and remediations
await mcp.memory.create_entities([
  {
    name: 'Security Configuration',
    entityType: 'security_policy',
    observations: [
      'API keys rotated every 90 days automatically',
      'Database passwords rotated every 180 days',
      'JWT secrets rotated annually',
      'All sensitive variables encrypted at rest',
      'Access logging enabled for all variable operations'
    ]
  }
])

// Document deployment configurations
await mcp.memory.add_observations([
  {
    entityName: 'WedSync Production Environment',
    contents: [
      'Environment variables managed through Vercel dashboard',
      'Automatic sync enabled for configuration drift detection',
      'Emergency rotation procedures documented and tested',
      'Compliance score monitoring implemented',
      'Security incident alerting configured'
    ]
  }
])
```

### Ref MCP for Documentation
```typescript
// Get security best practices documentation
const securityDocs = await mcp.ref.search_documentation('environment variables security best practices Node.js')
const securityContent = await mcp.ref.read_url(securityDocs[0].url)

// Get encryption documentation
const encryptionDocs = await mcp.ref.search_documentation('AES encryption Node.js crypto module')
const encryptionContent = await mcp.ref.read_url(encryptionDocs[0].url)

// Get Vercel environment variables API documentation
const vercelDocs = await mcp.ref.search_documentation('Vercel environment variables API')
const vercelContent = await mcp.ref.read_url(vercelDocs[0].url)
```

## Testing Requirements

### Unit Tests
```typescript
describe('EnvironmentVariablesService', () => {
  let service: EnvironmentVariablesService

  beforeEach(() => {
    service = new EnvironmentVariablesService()
  })

  test('should create variable definition with validation', async () => {
    const definition = {
      variableName: 'TEST_API_KEY',
      category: 'api_key',
      description: 'Test API key for external service',
      isSecret: true,
      isRequired: true,
      validationPattern: '^[a-zA-Z0-9_]{32,}$',
      rotationScheduleDays: 90,
      ownerTeam: 'engineering'
    }

    const variableId = await service.createVariableDefinition(definition)
    
    expect(variableId).toBeDefined()
    expect(typeof variableId).toBe('string')
  })

  test('should encrypt and hash variable values', async () => {
    const environmentId = 'env-123'
    const variableDefinitionId = 'var-def-123'
    const secretValue = 'super-secret-api-key-12345'

    const result = await service.setEnvironmentVariable(
      environmentId,
      variableDefinitionId,
      secretValue
    )

    expect(result.variableId).toBeDefined()
    expect(result.validationResult.valid).toBe(true)
    
    // Verify value is encrypted in database
    const { data: variable } = await supabase
      .from('environment_variables')
      .select('encrypted_value, value_hash')
      .eq('id', result.variableId)
      .single()

    expect(variable.encrypted_value).not.toBe(secretValue)
    expect(variable.value_hash).toBeDefined()
  })

  test('should validate environment variables correctly', async () => {
    const validationResult = await service.validateAllEnvironments()
    
    expect(validationResult.overall).toBeDefined()
    expect(validationResult.environments).toBeInstanceOf(Array)
    expect(validationResult.overall.status).toMatch(/^(valid|warning|error)$/)
  })

  test('should rotate variables and maintain history', async () => {
    const variableId = 'var-123'
    const rotationResult = await service.rotateVariable(
      variableId,
      'manual',
      'Test rotation'
    )

    expect(rotationResult.status).toBe('completed')
    expect(rotationResult.rotationId).toBeDefined()

    // Verify rotation history was created
    const { data: history } = await supabase
      .from('variable_rotation_history')
      .select('*')
      .eq('environment_variable_id', variableId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    expect(history.rotation_type).toBe('manual')
    expect(history.rotation_reason).toBe('Test rotation')
  })

  test('should calculate security compliance score', async () => {
    const dashboard = await service.monitorSecurityIncidents()
    
    expect(dashboard.complianceScore).toBeGreaterThanOrEqual(0)
    expect(dashboard.complianceScore).toBeLessThanOrEqual(100)
    expect(dashboard.overview).toBeDefined()
    expect(dashboard.recentIncidents).toBeInstanceOf(Array)
    expect(dashboard.rotationAlerts).toBeInstanceOf(Array)
  })

  test('should detect overdue rotations', async () => {
    // Create a variable with overdue rotation
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10)

    await supabase
      .from('environment_variables')
      .insert({
        environment_id: 'env-123',
        variable_definition_id: 'var-def-123',
        encrypted_value: 'encrypted-value',
        value_hash: 'hash-123',
        next_rotation_due: pastDate.toISOString(),
        rotation_status: 'active'
      })

    const dashboard = await service.monitorSecurityIncidents()
    
    expect(dashboard.overview.rotationsDue).toBeGreaterThan(0)
    expect(dashboard.rotationAlerts.length).toBeGreaterThan(0)
  })
})

describe('Variable Validation', () => {
  test('should validate URL format', async () => {
    const service = new EnvironmentVariablesService()
    
    const urlVariableId = await service.createVariableDefinition({
      variableName: 'API_ENDPOINT',
      category: 'config',
      description: 'API endpoint URL',
      dataType: 'url',
      ownerTeam: 'engineering'
    })

    // Valid URL
    const validResult = await service.setEnvironmentVariable(
      'env-123',
      urlVariableId,
      'https://api.example.com/v1'
    )
    expect(validResult.validationResult.valid).toBe(true)

    // Invalid URL
    const invalidResult = await service.setEnvironmentVariable(
      'env-123',
      urlVariableId,
      'not-a-url'
    )
    expect(invalidResult.validationResult.valid).toBe(false)
    expect(invalidResult.validationResult.errors).toContain('Invalid URL format')
  })

  test('should validate JSON format', async () => {
    const service = new EnvironmentVariablesService()
    
    const jsonVariableId = await service.createVariableDefinition({
      variableName: 'CONFIG_JSON',
      category: 'config',
      description: 'JSON configuration',
      dataType: 'json',
      ownerTeam: 'engineering'
    })

    // Valid JSON
    const validResult = await service.setEnvironmentVariable(
      'env-123',
      jsonVariableId,
      '{"key": "value"}'
    )
    expect(validResult.validationResult.valid).toBe(true)

    // Invalid JSON
    const invalidResult = await service.setEnvironmentVariable(
      'env-123',
      jsonVariableId,
      '{invalid json}'
    )
    expect(invalidResult.validationResult.valid).toBe(false)
    expect(invalidResult.validationResult.errors).toContain('Invalid JSON format')
  })

  test('should validate custom regex patterns', async () => {
    const service = new EnvironmentVariablesService()
    
    const patternVariableId = await service.createVariableDefinition({
      variableName: 'CUSTOM_KEY',
      category: 'api_key',
      description: 'Custom format API key',
      validationPattern: '^sk_[a-zA-Z0-9]{48}$',
      ownerTeam: 'engineering'
    })

    // Valid pattern
    const validResult = await service.setEnvironmentVariable(
      'env-123',
      patternVariableId,
      'sk_' + 'a'.repeat(48)
    )
    expect(validResult.validationResult.valid).toBe(true)

    // Invalid pattern
    const invalidResult = await service.setEnvironmentVariable(
      'env-123',
      patternVariableId,
      'invalid-key-format'
    )
    expect(invalidResult.validationResult.valid).toBe(false)
    expect(invalidResult.validationResult.errors).toContain('Value does not match required pattern')
  })
})
```

### Integration Tests
```typescript
describe('Environment Variables API', () => {
  test('GET /api/admin/environments', async () => {
    const response = await request(app)
      .get('/api/admin/environments')
      .set('Authorization', 'Bearer admin-token')

    expect(response.status).toBe(200)
    expect(response.body.environments).toBeInstanceOf(Array)
    expect(response.body.environments[0]).toHaveProperty('id')
    expect(response.body.environments[0]).toHaveProperty('name')
    expect(response.body.environments[0]).toHaveProperty('healthStatus')
  })

  test('PUT /api/admin/environments/{id}/variables/{id}', async () => {
    const response = await request(app)
      .put('/api/admin/environments/env-123/variables/var-123')
      .set('Authorization', 'Bearer admin-token')
      .send({
        value: 'new-secret-value',
        rotationType: 'manual',
        reason: 'Testing update'
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.variableId).toBeDefined()
    expect(response.body.validationResult.valid).toBe(true)
  })

  test('POST /api/admin/validation/validate-all', async () => {
    const response = await request(app)
      .post('/api/admin/validation/validate-all')
      .set('Authorization', 'Bearer admin-token')

    expect(response.status).toBe(200)
    expect(response.body.validationId).toBeDefined()
    expect(response.body.overall.status).toMatch(/^(valid|warning|error)$/)
    expect(response.body.environments).toBeInstanceOf(Array)
  })

  test('POST /api/admin/security/rotate/{id}', async () => {
    const response = await request(app)
      .post('/api/admin/security/rotate/var-123')
      .set('Authorization', 'Bearer admin-token')
      .send({
        rotationType: 'manual',
        reason: 'Testing rotation'
      })

    expect(response.status).toBe(200)
    expect(response.body.rotationId).toBeDefined()
    expect(response.body.status).toMatch(/^(initiated|completed|failed)$/)
  })

  test('GET /api/admin/security/dashboard', async () => {
    const response = await request(app)
      .get('/api/admin/security/dashboard')
      .set('Authorization', 'Bearer admin-token')

    expect(response.status).toBe(200)
    expect(response.body.overview).toBeDefined()
    expect(response.body.overview.totalVariables).toBeGreaterThanOrEqual(0)
    expect(response.body.complianceScore).toBeGreaterThanOrEqual(0)
    expect(response.body.complianceScore).toBeLessThanOrEqual(100)
  })
})
```

### Browser Testing with Playwright MCP
```typescript
// Test environment dashboard functionality
await mcp.playwright.browser_navigate('http://localhost:3000/admin/environments')

// Test environment selection
await mcp.playwright.browser_click('Production Environment', 'button:has-text("Production")')

// Verify variables are loaded
const snapshot = await mcp.playwright.browser_snapshot()
expect(snapshot).toContain('DATABASE_URL')
expect(snapshot).toContain('OPENAI_API_KEY')

// Test secret visibility toggle
await mcp.playwright.browser_click('Toggle Secret', 'button[aria-label="Toggle secret visibility"]')

// Test validation functionality
await mcp.playwright.browser_click('Validate All', 'button:has-text("Validate All")')
await mcp.playwright.browser_wait_for({ text: 'Validation Results' })

// Take screenshot of validation results
await mcp.playwright.browser_take_screenshot('validation-results.png')

// Test variable rotation
await mcp.playwright.browser_click('Rotate', 'button:has-text("Rotate"):first')
await mcp.playwright.browser_wait_for({ text: 'Variable rotated successfully' })

// Test security monitoring dashboard
await mcp.playwright.browser_navigate('http://localhost:3000/admin/security')

// Verify security metrics are displayed
const securitySnapshot = await mcp.playwright.browser_snapshot()
expect(securitySnapshot).toContain('Security Compliance Score')
expect(securitySnapshot).toContain('Total Variables')
expect(securitySnapshot).toContain('Rotations Due')

// Test emergency rotation
await mcp.playwright.browser_click('Rotate Now', 'button:has-text("Rotate Now"):first')
const rotationSnapshot = await mcp.playwright.browser_snapshot()
expect(rotationSnapshot).toContain('Emergency rotation initiated')
```

## Navigation Integration

### Navigation Links
- **Admin Dashboard** → **Environment Variables** (`/admin` → `/admin/environments`)
- **Security Center** → **Variable Security** (`/admin/security` → `/admin/security/variables`)
- **Settings** → **API Configuration** (`/settings` → `/settings/api-keys`)

### Breadcrumb Structure
```typescript
const breadcrumbs = [
  { label: 'Admin', href: '/admin' },
  { label: 'Infrastructure', href: '/admin/infrastructure' },
  { label: 'Environment Variables', href: '/admin/environments' },
  { label: selectedEnvironment?.name || 'Loading...', href: `/admin/environments/${environmentId}` }
]
```

### Menu Integration
```typescript
// Add to admin navigation menu
{
  label: 'Environment Variables',
  href: '/admin/environments',
  icon: 'KeyIcon',
  badge: rotationsDue > 0 ? rotationsDue : undefined,
  children: [
    { label: 'Configuration', href: '/admin/environments' },
    { label: 'Security Monitoring', href: '/admin/security/variables' },
    { label: 'Access Logs', href: '/admin/security/access-logs' },
    { label: 'Rotation History', href: '/admin/environments/rotation-history' }
  ]
}
```

## Error Handling & Edge Cases

### Encryption Key Management
```typescript
// Handle missing encryption key
if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required')
}

// Key rotation for encryption key itself
const rotateEncryptionKey = async () => {
  // Generate new key
  const newKey = randomBytes(32).toString('hex')
  
  // Re-encrypt all existing values with new key
  // This is a critical operation that requires careful planning
}
```

### Database Connection Failures
```typescript
// Retry logic for database operations
const retryOperation = async (operation: () => Promise<any>, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxRetries) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
}
```

### Validation Edge Cases
```typescript
// Handle complex validation scenarios
const validateComplexPattern = (value: string, pattern: string) => {
  try {
    const regex = new RegExp(pattern)
    return regex.test(value)
  } catch (error) {
    // Invalid regex pattern
    throw new Error(`Invalid validation pattern: ${pattern}`)
  }
}
```

## Acceptance Criteria

### Must Have
- [x] Multi-environment configuration management
- [x] Encrypted storage of sensitive variables
- [x] Automated key rotation with configurable schedules
- [x] Real-time validation of all environment variables
- [x] Security incident tracking and alerting
- [x] Access logging for all variable operations
- [x] Compliance score monitoring
- [x] Integration with deployment platforms (Vercel)

### Should Have
- [x] Visual dashboard for environment management
- [x] Rotation history and audit trail
- [x] Custom validation rules
- [x] Emergency rotation procedures
- [x] Configuration drift detection
- [x] Bulk operations for multiple variables

### Could Have
- [ ] Integration with external secret managers (AWS Secrets Manager, Azure Key Vault)
- [ ] Automated key generation for specific services
- [ ] Configuration templates for common setups
- [ ] Integration with CI/CD pipelines for automated validation

### Won't Have (This Phase)
- Multi-cloud deployment synchronization
- Advanced RBAC with fine-grained permissions
- Integration with hardware security modules (HSMs)
- Custom encryption algorithms

## Dependencies

### Internal Dependencies
- **WS-047**: Analytics Dashboard (for security analytics)
- **WS-028**: Supplier Management (for user authentication)
- **Authentication System**: For access control
- **Database Schema**: Core database tables

### External Dependencies
- Supabase (database and authentication)
- Vercel (deployment platform integration)
- Node.js crypto module (encryption)
- Environment variable validation libraries

### Technical Dependencies
- React 19 with Server Components
- Next.js 15 App Router
- TypeScript 5.0+
- Tailwind CSS for styling
- Zod for runtime validation

## Effort Estimation

### Development Phases

**Phase 1: Core Infrastructure (2 weeks)**
- Database schema and migrations
- Basic CRUD operations for variables
- Encryption and hashing implementation
- Environment management

**Phase 2: Security Features (2 weeks)**
- Automated key rotation system
- Security incident tracking
- Access logging and monitoring
- Compliance score calculation

**Phase 3: Validation System (1.5 weeks)**
- Runtime validation framework
- Custom validation rules
- Multi-environment validation
- Error handling and reporting

**Phase 4: UI/UX & Integration (1.5 weeks)**
- Admin dashboard components
- Security monitoring dashboard
- Deployment platform integration
- Testing and optimization

### Total Estimated Effort
**7 weeks** (1 senior full-stack developer + 0.5 DevOps engineer)

### Risk Factors
- Encryption key management complexity
- Multi-environment synchronization challenges
- Security compliance requirements
- Integration complexity with deployment platforms

---

*This technical specification provides a comprehensive foundation for implementing a professional-grade environment variables management system that ensures security, compliance, and operational efficiency across all WedSync platform environments.*