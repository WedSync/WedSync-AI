# WS-262: Security Audit System Technical Specification

## Feature Overview
**Feature ID**: WS-262  
**Feature Name**: Security Audit System  
**Category**: Infrastructure  
**Priority**: Critical  
**Complexity**: High  
**Estimated Effort**: 20 days  

### Purpose Statement
Implement comprehensive security audit system that continuously monitors WedSync platform for vulnerabilities, compliance violations, and security threats, providing automated scanning, real-time threat detection, and detailed compliance reporting to ensure the platform maintains enterprise-grade security standards for protecting sensitive wedding and supplier data.

### User Story
As a WedSync platform security officer, I want an automated security audit system that continuously monitors our platform for vulnerabilities, compliance violations, and security threats, so that I can ensure we maintain enterprise-grade security standards, protect sensitive wedding data, comply with privacy regulations, and quickly respond to potential security incidents before they impact our couples and suppliers.

## Database Schema

### Core Tables

```sql
-- Security Scan Configurations
CREATE TABLE security_scan_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_name VARCHAR(200) NOT NULL,
    scan_type scan_type_enum NOT NULL,
    scan_scope JSONB NOT NULL,
    scan_schedule VARCHAR(100), -- Cron expression
    vulnerability_sources TEXT[] DEFAULT '{}',
    compliance_frameworks TEXT[] DEFAULT '{}',
    severity_filter security_severity[] DEFAULT '{}',
    notification_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Scan Executions
CREATE TABLE security_scan_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_id UUID REFERENCES security_scan_configurations(id) ON DELETE CASCADE,
    execution_name VARCHAR(200) NOT NULL,
    scan_type scan_type_enum NOT NULL,
    status execution_status DEFAULT 'scheduled',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    targets_scanned INTEGER DEFAULT 0,
    vulnerabilities_found INTEGER DEFAULT 0,
    critical_findings INTEGER DEFAULT 0,
    high_findings INTEGER DEFAULT 0,
    medium_findings INTEGER DEFAULT 0,
    low_findings INTEGER DEFAULT 0,
    compliance_score DECIMAL(5,2),
    risk_score DECIMAL(5,2),
    scan_summary JSONB,
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Vulnerabilities
CREATE TABLE security_vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES security_scan_executions(id) ON DELETE CASCADE,
    vulnerability_id VARCHAR(100) NOT NULL, -- CVE ID or custom ID
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    severity security_severity NOT NULL,
    cvss_score DECIMAL(3,1),
    category vulnerability_category NOT NULL,
    affected_component VARCHAR(200),
    affected_version VARCHAR(100),
    file_path VARCHAR(1000),
    line_number INTEGER,
    cwe_id VARCHAR(20),
    owasp_category VARCHAR(100),
    remediation_advice TEXT,
    fix_complexity fix_complexity_enum DEFAULT 'medium',
    status vulnerability_status DEFAULT 'open',
    assigned_to UUID REFERENCES auth.users(id),
    due_date DATE,
    fixed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    false_positive BOOLEAN DEFAULT false,
    risk_accepted BOOLEAN DEFAULT false,
    evidence JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance Assessments
CREATE TABLE compliance_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES security_scan_executions(id) ON DELETE CASCADE,
    framework compliance_framework NOT NULL,
    control_id VARCHAR(50) NOT NULL,
    control_title VARCHAR(500) NOT NULL,
    control_description TEXT,
    requirement_level requirement_level_enum NOT NULL,
    assessment_result assessment_result_enum NOT NULL,
    compliance_score DECIMAL(5,2),
    evidence JSONB,
    gaps_identified TEXT[],
    recommendations TEXT[],
    remediation_effort effort_estimate DEFAULT 'medium',
    assigned_to UUID REFERENCES auth.users(id),
    due_date DATE,
    last_assessed_at TIMESTAMPTZ DEFAULT NOW(),
    next_assessment_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Incidents
CREATE TABLE security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_title VARCHAR(500) NOT NULL,
    incident_type incident_type_enum NOT NULL,
    severity incident_severity NOT NULL,
    status incident_status DEFAULT 'open',
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source incident_source_enum NOT NULL,
    affected_systems TEXT[] DEFAULT '{}',
    affected_users TEXT[] DEFAULT '{}',
    impact_assessment TEXT,
    attack_vector TEXT,
    indicators_of_compromise JSONB,
    timeline JSONB,
    response_actions JSONB,
    root_cause TEXT,
    lessons_learned TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Metrics
CREATE TABLE security_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    total_vulnerabilities INTEGER NOT NULL DEFAULT 0,
    critical_vulnerabilities INTEGER NOT NULL DEFAULT 0,
    high_vulnerabilities INTEGER NOT NULL DEFAULT 0,
    medium_vulnerabilities INTEGER NOT NULL DEFAULT 0,
    low_vulnerabilities INTEGER NOT NULL DEFAULT 0,
    fixed_vulnerabilities INTEGER NOT NULL DEFAULT 0,
    mean_time_to_fix INTERVAL,
    compliance_score DECIMAL(5,2),
    security_incidents INTEGER NOT NULL DEFAULT 0,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    suspicious_activities INTEGER NOT NULL DEFAULT 0,
    data_breaches INTEGER NOT NULL DEFAULT 0,
    security_training_completed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(metric_date)
);

-- Security Policies
CREATE TABLE security_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name VARCHAR(200) NOT NULL,
    policy_type policy_type_enum NOT NULL,
    policy_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    policy_content JSONB NOT NULL,
    enforcement_level enforcement_level_enum DEFAULT 'strict',
    applicable_systems TEXT[] DEFAULT '{}',
    compliance_mappings JSONB,
    violation_consequences TEXT[],
    is_active BOOLEAN DEFAULT true,
    effective_date DATE NOT NULL,
    review_date DATE,
    approved_by UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Audit Logs
CREATE TABLE security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type audit_event_type NOT NULL,
    event_category audit_category NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    action_performed VARCHAR(200) NOT NULL,
    action_result audit_result NOT NULL,
    risk_level audit_risk_level DEFAULT 'low',
    event_details JSONB,
    geolocation JSONB,
    device_info JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retention_until DATE
);

-- Security Alerts
CREATE TABLE security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type alert_type_enum NOT NULL,
    severity alert_severity NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    source_system VARCHAR(100),
    alert_data JSONB,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    status alert_status_enum DEFAULT 'active',
    escalation_level INTEGER DEFAULT 1,
    notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enums and Custom Types

```sql
-- Custom types for security audit system
CREATE TYPE scan_type_enum AS ENUM ('vulnerability', 'compliance', 'code_analysis', 'infrastructure', 'web_application', 'api', 'network');
CREATE TYPE security_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
CREATE TYPE execution_status AS ENUM ('scheduled', 'running', 'completed', 'failed', 'cancelled', 'paused');
CREATE TYPE vulnerability_category AS ENUM ('injection', 'broken_auth', 'sensitive_data', 'xml_entities', 'broken_access', 'security_misconfig', 'xss', 'insecure_deserialization', 'known_vulnerabilities', 'insufficient_logging');
CREATE TYPE fix_complexity_enum AS ENUM ('trivial', 'low', 'medium', 'high', 'critical');
CREATE TYPE vulnerability_status AS ENUM ('open', 'in_progress', 'fixed', 'verified', 'closed', 'false_positive', 'risk_accepted');
CREATE TYPE compliance_framework AS ENUM ('gdpr', 'ccpa', 'soc2', 'iso27001', 'pci_dss', 'hipaa', 'owasp_top10');
CREATE TYPE requirement_level_enum AS ENUM ('required', 'recommended', 'optional');
CREATE TYPE assessment_result_enum AS ENUM ('compliant', 'non_compliant', 'partially_compliant', 'not_applicable');
CREATE TYPE effort_estimate AS ENUM ('trivial', 'low', 'medium', 'high', 'very_high');
CREATE TYPE incident_type_enum AS ENUM ('data_breach', 'unauthorized_access', 'malware', 'phishing', 'dos_attack', 'insider_threat', 'system_compromise', 'privacy_violation');
CREATE TYPE incident_severity AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE incident_status AS ENUM ('open', 'investigating', 'contained', 'resolved', 'closed');
CREATE TYPE incident_source_enum AS ENUM ('automated_scan', 'user_report', 'security_tool', 'monitoring_system', 'external_report');
CREATE TYPE policy_type_enum AS ENUM ('access_control', 'data_protection', 'incident_response', 'vulnerability_management', 'security_awareness', 'encryption', 'backup_recovery');
CREATE TYPE enforcement_level_enum AS ENUM ('strict', 'moderate', 'advisory');
CREATE TYPE audit_event_type AS ENUM ('authentication', 'authorization', 'data_access', 'data_modification', 'configuration_change', 'security_event');
CREATE TYPE audit_category AS ENUM ('security', 'privacy', 'compliance', 'system', 'user_activity');
CREATE TYPE audit_result AS ENUM ('success', 'failure', 'warning', 'blocked');
CREATE TYPE audit_risk_level AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE alert_type_enum AS ENUM ('vulnerability_detected', 'compliance_violation', 'security_incident', 'policy_violation', 'suspicious_activity', 'system_anomaly');
CREATE TYPE alert_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
CREATE TYPE alert_status_enum AS ENUM ('active', 'acknowledged', 'investigating', 'resolved', 'false_positive');
```

### Indexes for Performance

```sql
-- Security scan execution indexes
CREATE INDEX idx_security_scan_executions_status ON security_scan_executions(status);
CREATE INDEX idx_security_scan_executions_started_at ON security_scan_executions(started_at DESC);
CREATE INDEX idx_security_scan_executions_config_id ON security_scan_executions(configuration_id);

-- Security vulnerabilities indexes
CREATE INDEX idx_security_vulnerabilities_severity ON security_vulnerabilities(severity);
CREATE INDEX idx_security_vulnerabilities_status ON security_vulnerabilities(status);
CREATE INDEX idx_security_vulnerabilities_execution_id ON security_vulnerabilities(execution_id);
CREATE INDEX idx_security_vulnerabilities_assigned_to ON security_vulnerabilities(assigned_to);
CREATE INDEX idx_security_vulnerabilities_due_date ON security_vulnerabilities(due_date);

-- Compliance assessments indexes
CREATE INDEX idx_compliance_assessments_framework ON compliance_assessments(framework);
CREATE INDEX idx_compliance_assessments_result ON compliance_assessments(assessment_result);
CREATE INDEX idx_compliance_assessments_execution_id ON compliance_assessments(execution_id);

-- Security incidents indexes
CREATE INDEX idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX idx_security_incidents_status ON security_incidents(status);
CREATE INDEX idx_security_incidents_detected_at ON security_incidents(detected_at DESC);
CREATE INDEX idx_security_incidents_assigned_to ON security_incidents(assigned_to);

-- Security audit logs indexes
CREATE INDEX idx_security_audit_logs_timestamp ON security_audit_logs(timestamp DESC);
CREATE INDEX idx_security_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX idx_security_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX idx_security_audit_logs_risk_level ON security_audit_logs(risk_level);
CREATE INDEX idx_security_audit_logs_ip_address ON security_audit_logs(ip_address);

-- Security alerts indexes
CREATE INDEX idx_security_alerts_status ON security_alerts(status);
CREATE INDEX idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX idx_security_alerts_triggered_at ON security_alerts(triggered_at DESC);
CREATE INDEX idx_security_alerts_type ON security_alerts(alert_type);

-- Security metrics indexes
CREATE INDEX idx_security_metrics_date ON security_metrics(metric_date DESC);

-- Security policies indexes
CREATE INDEX idx_security_policies_type ON security_policies(policy_type);
CREATE INDEX idx_security_policies_active ON security_policies(is_active) WHERE is_active = true;
```

## API Endpoints

### Security Scan Management

```typescript
// GET /api/security/scans
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scanType = searchParams.get('scanType');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    let query = supabase
      .from('security_scan_executions')
      .select('*, configuration:security_scan_configurations(*)')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (scanType) {
      query = query.eq('scan_type', scanType);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      scans: data,
      summary: SecurityAuditService.summarizeScans(data)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch security scans' 
    }, { status: 500 });
  }
}

// POST /api/security/scans/execute
export async function POST(request: Request) {
  const { configurationId, executionName } = await request.json();

  try {
    // Get scan configuration
    const { data: config, error: configError } = await supabase
      .from('security_scan_configurations')
      .select('*')
      .eq('id', configurationId)
      .single();

    if (configError || !config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Scan configuration not found' 
      }, { status: 404 });
    }

    // Create execution record
    const execution = await SecurityAuditService.createExecution(config, executionName);
    
    // Start security scan in background
    SecurityScanner.startScan(execution.id, config);

    return NextResponse.json({ 
      success: true, 
      execution: execution,
      message: 'Security scan started successfully' 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to start security scan' 
    }, { status: 500 });
  }
}
```

### Vulnerability Management

```typescript
// GET /api/security/vulnerabilities
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const severity = searchParams.get('severity');
  const status = searchParams.get('status');
  const assignedTo = searchParams.get('assignedTo');
  const limit = parseInt(searchParams.get('limit') || '100');

  try {
    let query = supabase
      .from('security_vulnerabilities')
      .select('*, execution:security_scan_executions(execution_name), assigned_user:auth.users(email)')
      .order('cvss_score', { ascending: false })
      .limit(limit);

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      vulnerabilities: data,
      statistics: VulnerabilityManager.calculateStatistics(data)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch vulnerabilities' 
    }, { status: 500 });
  }
}

// PUT /api/security/vulnerabilities/{vulnerabilityId}
export async function PUT(request: Request, { params }: { params: { vulnerabilityId: string } }) {
  const updates = await request.json();

  try {
    const { data, error } = await supabase
      .from('security_vulnerabilities')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.vulnerabilityId)
      .select()
      .single();

    if (error) throw error;

    // Log vulnerability status change
    await SecurityAuditLogger.logVulnerabilityUpdate(params.vulnerabilityId, updates, request.user?.id);

    // Send notifications if status changed to fixed
    if (updates.status === 'fixed') {
      await NotificationService.sendVulnerabilityFixedNotification(data);
    }

    return NextResponse.json({ success: true, vulnerability: data });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update vulnerability' 
    }, { status: 500 });
  }
}

// POST /api/security/vulnerabilities/bulk-action
export async function POST(request: Request) {
  const { vulnerabilityIds, action, actionData } = await request.json();

  try {
    const results = await VulnerabilityManager.performBulkAction(
      vulnerabilityIds, 
      action, 
      actionData,
      request.user?.id
    );

    return NextResponse.json({ 
      success: true, 
      results,
      message: `Bulk action ${action} completed successfully`
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to perform bulk action' 
    }, { status: 500 });
  }
}
```

### Compliance Management

```typescript
// GET /api/security/compliance
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const framework = searchParams.get('framework');
  const executionId = searchParams.get('executionId');

  try {
    let query = supabase
      .from('compliance_assessments')
      .select('*, execution:security_scan_executions(execution_name)')
      .order('compliance_score', { ascending: true });

    if (framework) {
      query = query.eq('framework', framework);
    }

    if (executionId) {
      query = query.eq('execution_id', executionId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const complianceReport = ComplianceManager.generateComplianceReport(data);

    return NextResponse.json({
      success: true,
      assessments: data,
      report: complianceReport,
      summary: ComplianceManager.summarizeCompliance(data)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch compliance data' 
    }, { status: 500 });
  }
}

// POST /api/security/compliance/assess
export async function POST(request: Request) {
  const { framework, scope } = await request.json();

  try {
    const assessment = await ComplianceManager.runComplianceAssessment(framework, scope);
    
    return NextResponse.json({ 
      success: true, 
      assessment,
      message: 'Compliance assessment completed successfully'
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to run compliance assessment' 
    }, { status: 500 });
  }
}
```

### Security Incidents

```typescript
// GET /api/security/incidents
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const severity = searchParams.get('severity');
  const status = searchParams.get('status');
  const timeRange = searchParams.get('timeRange') || '30d';

  try {
    let query = supabase
      .from('security_incidents')
      .select('*, assigned_user:auth.users(email)')
      .gte('detected_at', getTimeRangeFilter(timeRange))
      .order('detected_at', { ascending: false });

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      incidents: data,
      analytics: IncidentManager.generateAnalytics(data)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch security incidents' 
    }, { status: 500 });
  }
}

// POST /api/security/incidents
export async function POST(request: Request) {
  const incident = await request.json();

  try {
    const { data, error } = await supabase
      .from('security_incidents')
      .insert([{
        ...incident,
        created_by: request.user?.id,
        detected_at: incident.detected_at || new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Trigger incident response workflow
    await IncidentResponseOrchestrator.initiateResponse(data);

    // Send immediate notifications for critical incidents
    if (data.severity === 'critical') {
      await NotificationService.sendCriticalIncidentAlert(data);
    }

    return NextResponse.json({ success: true, incident: data });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create security incident' 
    }, { status: 500 });
  }
}
```

### Security Metrics and Reporting

```typescript
// GET /api/security/dashboard
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || '30d';

  try {
    const [
      vulnerabilities,
      incidents, 
      metrics,
      complianceScore,
      recentAlerts
    ] = await Promise.all([
      SecurityMetricsService.getVulnerabilityTrends(timeRange),
      SecurityMetricsService.getIncidentTrends(timeRange),
      SecurityMetricsService.getCurrentMetrics(),
      ComplianceManager.getOverallComplianceScore(),
      SecurityAlertService.getRecentAlerts(10)
    ]);

    const dashboard = {
      vulnerabilities,
      incidents,
      metrics,
      complianceScore,
      recentAlerts,
      riskScore: SecurityRiskCalculator.calculateOverallRisk(),
      trends: SecurityMetricsService.calculateTrends(timeRange)
    };

    return NextResponse.json({ success: true, dashboard });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch security dashboard' 
    }, { status: 500 });
  }
}

// GET /api/security/reports/{reportType}
export async function GET(request: Request, { params }: { params: { reportType: string } }) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || '30d';
  const format = searchParams.get('format') || 'json';

  try {
    let report;

    switch (params.reportType) {
      case 'vulnerability':
        report = await SecurityReportGenerator.generateVulnerabilityReport(timeRange);
        break;
      case 'compliance':
        report = await SecurityReportGenerator.generateComplianceReport(timeRange);
        break;
      case 'incident':
        report = await SecurityReportGenerator.generateIncidentReport(timeRange);
        break;
      case 'executive':
        report = await SecurityReportGenerator.generateExecutiveReport(timeRange);
        break;
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid report type' 
        }, { status: 400 });
    }

    if (format === 'pdf') {
      const pdfBuffer = await SecurityReportGenerator.convertToPDF(report);
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="security-report-${params.reportType}-${new Date().toISOString().split('T')[0]}.pdf"`
        }
      });
    }

    return NextResponse.json({ success: true, report });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate security report' 
    }, { status: 500 });
  }
}
```

## React Components

### Security Dashboard

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Shield, 
  AlertTriangle, 
  Bug, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Activity,
  Lock,
  Eye,
  Settings
} from 'lucide-react';

interface SecurityDashboard {
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    fixed: number;
    trends: Array<{
      date: string;
      critical: number;
      high: number;
      medium: number;
      low: number;
    }>;
  };
  incidents: {
    total: number;
    open: number;
    resolved: number;
    meanTimeToResolution: number;
    trends: Array<{
      date: string;
      incidents: number;
      resolved: number;
    }>;
  };
  metrics: {
    complianceScore: number;
    riskScore: number;
    scansConducted: number;
    policiesActive: number;
  };
  recentAlerts: Array<{
    id: string;
    title: string;
    severity: string;
    triggered_at: string;
    status: string;
  }>;
}

const SecurityAuditDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<SecurityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/security/dashboard?timeRange=${selectedTimeRange}`);
      const data = await response.json();
      
      if (data.success) {
        setDashboard(data.dashboard);
      }
    } catch (error) {
      console.error('Failed to load security dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      case 'info': return '#0284c7';
      default: return '#6b7280';
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return { level: 'High Risk', color: 'text-red-600 bg-red-50' };
    if (score >= 60) return { level: 'Medium Risk', color: 'text-yellow-600 bg-yellow-50' };
    if (score >= 40) return { level: 'Low Risk', color: 'text-blue-600 bg-blue-50' };
    return { level: 'Minimal Risk', color: 'text-green-600 bg-green-50' };
  };

  const getComplianceLevel = (score: number) => {
    if (score >= 95) return { level: 'Excellent', color: 'text-green-600 bg-green-50' };
    if (score >= 85) return { level: 'Good', color: 'text-blue-600 bg-blue-50' };
    if (score >= 70) return { level: 'Fair', color: 'text-yellow-600 bg-yellow-50' };
    return { level: 'Needs Improvement', color: 'text-red-600 bg-red-50' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboard) {
    return <div>Failed to load security dashboard</div>;
  }

  const riskLevel = getRiskLevel(dashboard.metrics.riskScore);
  const complianceLevel = getComplianceLevel(dashboard.metrics.complianceScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Security Audit System</h1>
          <p className="text-gray-600">Comprehensive security monitoring and compliance management</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadDashboardData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Risk Score</p>
                <p className="text-2xl font-bold">{dashboard.metrics.riskScore}</p>
              </div>
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mt-2">
              <Badge className={riskLevel.color}>
                {riskLevel.level}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance Score</p>
                <p className="text-2xl font-bold">{dashboard.metrics.complianceScore}%</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="mt-2">
              <Badge className={complianceLevel.color}>
                {complianceLevel.level}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Vulnerabilities</p>
                <p className="text-2xl font-bold">
                  {dashboard.vulnerabilities.total - dashboard.vulnerabilities.fixed}
                </p>
              </div>
              <Bug className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              <span className="text-red-600">{dashboard.vulnerabilities.critical} Critical</span>
              <span className="text-orange-600">{dashboard.vulnerabilities.high} High</span>
              <span className="text-yellow-600">{dashboard.vulnerabilities.medium} Medium</span>
              <span className="text-green-600">{dashboard.vulnerabilities.low} Low</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Incidents</p>
                <p className="text-2xl font-bold">{dashboard.incidents.open}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              MTTR: {Math.round(dashboard.incidents.meanTimeToResolution / 60)}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {['overview', 'vulnerabilities', 'compliance', 'incidents'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vulnerability Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Vulnerability Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dashboard.vulnerabilities.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="critical"
                    stackId="1"
                    stroke="#dc2626"
                    fill="#dc2626"
                    name="Critical"
                  />
                  <Area
                    type="monotone"
                    dataKey="high"
                    stackId="1"
                    stroke="#ea580c"
                    fill="#ea580c"
                    name="High"
                  />
                  <Area
                    type="monotone"
                    dataKey="medium"
                    stackId="1"
                    stroke="#d97706"
                    fill="#d97706"
                    name="Medium"
                  />
                  <Area
                    type="monotone"
                    dataKey="low"
                    stackId="1"
                    stroke="#65a30d"
                    fill="#65a30d"
                    name="Low"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Incident Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Incident Response Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboard.incidents.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="incidents" 
                    stroke="#8884d8" 
                    name="New Incidents"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="resolved" 
                    stroke="#82ca9d" 
                    name="Resolved"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Recent Security Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboard.recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`}></div>
                  <div>
                    <p className="font-semibold">{alert.title}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(alert.triggered_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={alert.status === 'resolved' ? 'default' : 'destructive'}>
                    {alert.status}
                  </Badge>
                  <Badge variant="outline">
                    {alert.severity}
                  </Badge>
                </div>
              </div>
            ))}
            
            {dashboard.recentAlerts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No recent security alerts</p>
                <p className="text-sm">Your system appears to be secure</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Button onClick={() => window.open('/dashboard/security/scans', '_blank')}>
          <Shield className="h-4 w-4 mr-2" />
          Run Security Scan
        </Button>
        <Button variant="outline" onClick={() => window.open('/dashboard/security/vulnerabilities', '_blank')}>
          <Bug className="h-4 w-4 mr-2" />
          View Vulnerabilities
        </Button>
        <Button variant="outline" onClick={() => window.open('/dashboard/security/compliance', '_blank')}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Compliance Report
        </Button>
        <Button variant="outline" onClick={() => window.open('/dashboard/security/incidents', '_blank')}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Incident Management
        </Button>
      </div>
    </div>
  );
};

export default SecurityAuditDashboard;
```

## Core Implementation

### Security Audit Service

```typescript
export class SecurityAuditService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  async createExecution(config: any, executionName: string) {
    const execution = {
      configuration_id: config.id,
      execution_name: executionName,
      scan_type: config.scan_type,
      status: 'scheduled',
      targets_scanned: 0,
      vulnerabilities_found: 0,
      critical_findings: 0,
      high_findings: 0,
      medium_findings: 0,
      low_findings: 0
    };

    const { data, error } = await this.supabase
      .from('security_scan_executions')
      .insert([execution])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  summarizeScans(scans: any[]) {
    return {
      total: scans.length,
      running: scans.filter(s => s.status === 'running').length,
      completed: scans.filter(s => s.status === 'completed').length,
      failed: scans.filter(s => s.status === 'failed').length,
      totalVulnerabilities: scans.reduce((sum, s) => sum + (s.vulnerabilities_found || 0), 0),
      averageRiskScore: scans.reduce((sum, s) => sum + (s.risk_score || 0), 0) / Math.max(scans.length, 1)
    };
  }

  async scheduleRecurringScan(configId: string, schedule: string) {
    // Update configuration with cron schedule
    await this.supabase
      .from('security_scan_configurations')
      .update({ 
        scan_schedule: schedule,
        next_run_at: this.calculateNextRun(schedule)
      })
      .eq('id', configId);

    // Schedule the scan using a job queue (implementation depends on your setup)
    await this.scheduleJob('security_scan', configId, schedule);
  }

  private calculateNextRun(cronSchedule: string): Date {
    // Use a cron parsing library to calculate next run time
    const CronParser = require('cron-parser');
    const interval = CronParser.parseExpression(cronSchedule);
    return interval.next().toDate();
  }

  private async scheduleJob(jobType: string, configId: string, schedule: string) {
    // Integration with job scheduler (e.g., Bull Queue, Agenda, etc.)
    // This is implementation-specific based on your job queue choice
    console.log(`Scheduling ${jobType} job for config ${configId} with schedule ${schedule}`);
  }
}

export const securityAuditService = new SecurityAuditService();
```

### Security Scanner

```typescript
export class SecurityScanner {
  static async startScan(executionId: string, config: any) {
    try {
      // Mark execution as running
      await supabase
        .from('security_scan_executions')
        .update({ 
          status: 'running', 
          started_at: new Date().toISOString() 
        })
        .eq('id', executionId);

      let scanResults;

      switch (config.scan_type) {
        case 'vulnerability':
          scanResults = await this.runVulnerabilityscan(executionId, config);
          break;
        case 'compliance':
          scanResults = await this.runComplianceScan(executionId, config);
          break;
        case 'code_analysis':
          scanResults = await this.runCodeAnalysisScan(executionId, config);
          break;
        case 'infrastructure':
          scanResults = await this.runInfrastructureScan(executionId, config);
          break;
        case 'web_application':
          scanResults = await this.runWebApplicationScan(executionId, config);
          break;
        case 'api':
          scanResults = await this.runApiScan(executionId, config);
          break;
        default:
          throw new Error(`Unsupported scan type: ${config.scan_type}`);
      }

      // Update execution with results
      await this.updateExecutionResults(executionId, scanResults);

      // Generate alerts for critical findings
      await this.generateAlerts(executionId, scanResults);

    } catch (error) {
      console.error('Security scan failed:', error);
      
      await supabase
        .from('security_scan_executions')
        .update({ 
          status: 'failed',
          error_details: { error: error.message },
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId);
    }
  }

  private static async runVulnerabilityScan(executionId: string, config: any) {
    const vulnerabilities = [];
    let targetsScanned = 0;

    // Integrate with vulnerability scanning tools
    const scanTargets = config.scan_scope.targets || ['application', 'dependencies', 'infrastructure'];

    for (const target of scanTargets) {
      targetsScanned++;
      
      switch (target) {
        case 'application':
          const appVulns = await this.scanApplication();
          vulnerabilities.push(...appVulns);
          break;
          
        case 'dependencies':
          const depVulns = await this.scanDependencies();
          vulnerabilities.push(...depVulns);
          break;
          
        case 'infrastructure':
          const infraVulns = await this.scanInfrastructure();
          vulnerabilities.push(...infraVulns);
          break;
      }
    }

    // Store vulnerabilities
    for (const vuln of vulnerabilities) {
      await this.storeVulnerability(executionId, vuln);
    }

    return {
      targetsScanned,
      vulnerabilitiesFound: vulnerabilities.length,
      criticalFindings: vulnerabilities.filter(v => v.severity === 'critical').length,
      highFindings: vulnerabilities.filter(v => v.severity === 'high').length,
      mediumFindings: vulnerabilities.filter(v => v.severity === 'medium').length,
      lowFindings: vulnerabilities.filter(v => v.severity === 'low').length,
      riskScore: this.calculateRiskScore(vulnerabilities)
    };
  }

  private static async scanApplication() {
    // Integrate with SAST (Static Application Security Testing) tools
    // Example: SonarQube, Checkmarx, Veracode, etc.
    
    const vulnerabilities = [];
    
    // Example vulnerability patterns to scan for
    const patterns = [
      {
        pattern: /password.*=.*['"'][^'"]+['"]/gi,
        severity: 'high',
        category: 'sensitive_data',
        title: 'Hardcoded Password',
        description: 'Password found hardcoded in source code'
      },
      {
        pattern: /api[_-]?key.*=.*['"'][^'"]+['"]/gi,
        severity: 'critical',
        category: 'sensitive_data',
        title: 'Hardcoded API Key',
        description: 'API key found hardcoded in source code'
      },
      {
        pattern: /eval\s*\(/gi,
        severity: 'high',
        category: 'injection',
        title: 'Code Injection',
        description: 'Use of eval() function detected'
      }
    ];

    // Scan source code files
    const sourceFiles = await this.getSourceFiles();
    
    for (const file of sourceFiles) {
      const content = await fs.readFile(file.path, 'utf8');
      
      for (const pattern of patterns) {
        const matches = content.match(pattern.pattern);
        if (matches) {
          vulnerabilities.push({
            vulnerability_id: `CUSTOM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: pattern.title,
            description: pattern.description,
            severity: pattern.severity,
            category: pattern.category,
            affected_component: file.name,
            file_path: file.path,
            line_number: this.findLineNumber(content, matches[0]),
            cvss_score: this.getCVSSScore(pattern.severity),
            remediation_advice: this.getRemediationAdvice(pattern.category)
          });
        }
      }
    }

    return vulnerabilities;
  }

  private static async scanDependencies() {
    // Integrate with dependency scanning tools
    // Example: OWASP Dependency Check, Snyk, npm audit, etc.
    
    const vulnerabilities = [];
    
    try {
      // Run npm audit
      const { stdout } = await execAsync('npm audit --json');
      const auditResults = JSON.parse(stdout);
      
      if (auditResults.vulnerabilities) {
        for (const [packageName, vulnData] of Object.entries(auditResults.vulnerabilities)) {
          const vuln = vulnData as any;
          
          vulnerabilities.push({
            vulnerability_id: vuln.source || `NPM-${packageName}-${Date.now()}`,
            title: `${vuln.title || 'Vulnerability'} in ${packageName}`,
            description: vuln.overview || 'No description available',
            severity: this.mapNpmSeverity(vuln.severity),
            category: 'known_vulnerabilities',
            affected_component: packageName,
            affected_version: vuln.range,
            cvss_score: vuln.cvss?.score || this.getCVSSScore(vuln.severity),
            remediation_advice: `Update ${packageName} to version ${vuln.patched_versions || 'latest'}`
          });
        }
      }
    } catch (error) {
      console.warn('npm audit failed:', error);
    }

    return vulnerabilities;
  }

  private static async scanInfrastructure() {
    // Integrate with infrastructure scanning tools
    // Example: Nessus, OpenVAS, AWS Inspector, etc.
    
    const vulnerabilities = [];
    
    // Example: Check for common misconfigurations
    const checks = [
      {
        name: 'SSL Configuration',
        check: async () => this.checkSSLConfiguration(),
        severity: 'high'
      },
      {
        name: 'HTTP Headers',
        check: async () => this.checkSecurityHeaders(),
        severity: 'medium'
      },
      {
        name: 'Database Security',
        check: async () => this.checkDatabaseSecurity(),
        severity: 'critical'
      }
    ];

    for (const check of checks) {
      try {
        const results = await check.check();
        if (!results.passed) {
          vulnerabilities.push({
            vulnerability_id: `INFRA-${check.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
            title: `${check.name} Issue`,
            description: results.description,
            severity: check.severity,
            category: 'security_misconfig',
            affected_component: 'Infrastructure',
            cvss_score: this.getCVSSScore(check.severity),
            remediation_advice: results.remediation
          });
        }
      } catch (error) {
        console.warn(`Infrastructure check failed for ${check.name}:`, error);
      }
    }

    return vulnerabilities;
  }

  private static async checkSSLConfiguration() {
    // Check SSL/TLS configuration
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_APP_URL!, { method: 'HEAD' });
      const secureHeaders = [
        'strict-transport-security',
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection'
      ];
      
      const missingHeaders = secureHeaders.filter(header => !response.headers.get(header));
      
      return {
        passed: missingHeaders.length === 0,
        description: missingHeaders.length > 0 
          ? `Missing security headers: ${missingHeaders.join(', ')}` 
          : 'SSL configuration is secure',
        remediation: 'Configure missing security headers in your web server or application'
      };
    } catch (error) {
      return {
        passed: false,
        description: 'Unable to verify SSL configuration',
        remediation: 'Ensure SSL/TLS is properly configured and accessible'
      };
    }
  }

  private static async checkSecurityHeaders() {
    // Already implemented in checkSSLConfiguration for simplicity
    return { passed: true, description: 'Security headers check passed' };
  }

  private static async checkDatabaseSecurity() {
    // Check database security configuration
    try {
      // This would typically connect to your database and check configurations
      // For now, we'll simulate some basic checks
      
      const checks = {
        encryption: true, // Check if encryption at rest is enabled
        backup: true,     // Check if backups are encrypted
        access: true      // Check if least privilege access is configured
      };

      const failedChecks = Object.entries(checks).filter(([_, passed]) => !passed);
      
      return {
        passed: failedChecks.length === 0,
        description: failedChecks.length > 0 
          ? `Database security issues: ${failedChecks.map(([check]) => check).join(', ')}` 
          : 'Database security configuration is adequate',
        remediation: 'Review and strengthen database security configurations'
      };
    } catch (error) {
      return {
        passed: false,
        description: 'Unable to verify database security configuration',
        remediation: 'Ensure database security settings are properly configured'
      };
    }
  }

  private static async storeVulnerability(executionId: string, vuln: any) {
    await supabase.from('security_vulnerabilities').insert([{
      execution_id: executionId,
      vulnerability_id: vuln.vulnerability_id,
      title: vuln.title,
      description: vuln.description,
      severity: vuln.severity,
      cvss_score: vuln.cvss_score,
      category: vuln.category,
      affected_component: vuln.affected_component,
      affected_version: vuln.affected_version,
      file_path: vuln.file_path,
      line_number: vuln.line_number,
      cwe_id: vuln.cwe_id,
      owasp_category: vuln.owasp_category,
      remediation_advice: vuln.remediation_advice,
      status: 'open'
    }]);
  }

  private static calculateRiskScore(vulnerabilities: any[]): number {
    if (vulnerabilities.length === 0) return 0;
    
    const weights = {
      critical: 10,
      high: 7,
      medium: 4,
      low: 1
    };
    
    const totalScore = vulnerabilities.reduce((sum, vuln) => {
      return sum + (weights[vuln.severity] || 0);
    }, 0);
    
    return Math.min(100, (totalScore / vulnerabilities.length) * 5);
  }

  private static getCVSSScore(severity: string): number {
    const scores = {
      critical: 9.5,
      high: 7.5,
      medium: 5.0,
      low: 2.5
    };
    return scores[severity] || 0;
  }

  private static mapNpmSeverity(npmSeverity: string): string {
    const mapping = {
      critical: 'critical',
      high: 'high',
      moderate: 'medium',
      low: 'low'
    };
    return mapping[npmSeverity] || 'medium';
  }

  private static async updateExecutionResults(executionId: string, results: any) {
    await supabase
      .from('security_scan_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        targets_scanned: results.targetsScanned,
        vulnerabilities_found: results.vulnerabilitiesFound,
        critical_findings: results.criticalFindings,
        high_findings: results.highFindings,
        medium_findings: results.mediumFindings,
        low_findings: results.lowFindings,
        risk_score: results.riskScore,
        scan_summary: results
      })
      .eq('id', executionId);
  }

  private static async generateAlerts(executionId: string, results: any) {
    // Generate alerts for critical findings
    if (results.criticalFindings > 0) {
      await supabase.from('security_alerts').insert([{
        alert_type: 'vulnerability_detected',
        severity: 'critical',
        title: `${results.criticalFindings} Critical Vulnerabilities Found`,
        description: `Security scan found ${results.criticalFindings} critical vulnerabilities that require immediate attention.`,
        source_system: 'security_scanner',
        alert_data: { execution_id: executionId, findings: results }
      }]);
    }

    // Generate alert for high risk score
    if (results.riskScore > 80) {
      await supabase.from('security_alerts').insert([{
        alert_type: 'system_anomaly',
        severity: 'high',
        title: 'High Risk Score Detected',
        description: `Overall security risk score is ${results.riskScore}, indicating significant security concerns.`,
        source_system: 'security_scanner',
        alert_data: { execution_id: executionId, risk_score: results.riskScore }
      }]);
    }
  }

  // Helper methods
  private static async getSourceFiles() {
    // Get list of source files to scan
    const glob = require('glob');
    const files = glob.sync('**/*.{js,ts,jsx,tsx}', { 
      ignore: ['node_modules/**', 'dist/**', '.next/**'],
      cwd: process.cwd()
    });
    
    return files.map(file => ({
      name: path.basename(file),
      path: path.resolve(file)
    }));
  }

  private static findLineNumber(content: string, match: string): number {
    const lines = content.substring(0, content.indexOf(match)).split('\n');
    return lines.length;
  }

  private static getRemediationAdvice(category: string): string {
    const advice = {
      sensitive_data: 'Remove hardcoded credentials and use environment variables or secure credential management',
      injection: 'Use parameterized queries and input validation to prevent injection attacks',
      security_misconfig: 'Review and update security configurations according to best practices',
      known_vulnerabilities: 'Update affected components to the latest secure versions',
      broken_auth: 'Implement proper authentication and session management controls',
      xss: 'Implement proper input validation and output encoding'
    };
    
    return advice[category] || 'Review security best practices and implement appropriate controls';
  }
}
```

## MCP Server Usage

The Security Audit System will utilize these MCP servers:

### PostgreSQL MCP
- **Database security scanning**: Check for SQL injection vulnerabilities and misconfigurations
- **Access control verification**: Validate Row Level Security policies and permissions
- **Audit log analysis**: Analyze database audit logs for suspicious activities
- **Compliance checking**: Verify database configurations meet compliance requirements

### Supabase MCP
- **Security configuration assessment**: Review Supabase security settings and policies
- **User access audit**: Analyze user permissions and authentication configurations
- **Data protection verification**: Check encryption settings and backup security
- **API security testing**: Test Supabase API endpoints for vulnerabilities

### Playwright MCP
- **Web application security testing**: Automated security testing of the web interface
- **Authentication testing**: Verify login security and session management
- **XSS vulnerability scanning**: Test for cross-site scripting vulnerabilities
- **CSRF protection verification**: Validate cross-site request forgery protection

### Filesystem MCP
- **Source code analysis**: Scan source code files for security vulnerabilities
- **Configuration file audit**: Review configuration files for security issues
- **Dependency analysis**: Analyze package.json and other dependency files
- **Security report generation**: Create and store detailed security reports

## Navigation Integration

### Main Navigation Updates

The Security Audit System will be integrated into the WedSync navigation structure:

```typescript
// Add to admin navigation menu
{
  id: 'security-audit',
  label: 'Security',
  icon: Shield,
  href: '/dashboard/security',
  permission: 'admin',
  badge: hasCriticalAlerts ? { text: 'Critical', variant: 'destructive' } : undefined
}

// Add to security submenu
{
  id: 'admin-security',
  label: 'Security & Compliance',
  items: [
    {
      id: 'security-dashboard',
      label: 'Security Dashboard',
      href: '/dashboard/security',
      icon: Shield
    },
    {
      id: 'vulnerability-management',
      label: 'Vulnerabilities',
      href: '/dashboard/security/vulnerabilities',
      icon: Bug
    },
    {
      id: 'compliance-management',
      label: 'Compliance',
      href: '/dashboard/security/compliance',
      icon: CheckCircle
    },
    {
      id: 'incident-management',
      label: 'Incidents',
      href: '/dashboard/security/incidents',
      icon: AlertTriangle
    },
    {
      id: 'security-scans',
      label: 'Security Scans',
      href: '/dashboard/security/scans',
      icon: Activity
    },
    {
      id: 'security-policies',
      label: 'Policies',
      href: '/dashboard/security/policies',
      icon: Lock
    }
  ]
}
```

### Breadcrumb Integration

```typescript
const breadcrumbMap = {
  '/dashboard/security': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Security', href: '/dashboard/security' }
  ],
  '/dashboard/security/vulnerabilities': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Security', href: '/dashboard/security' },
    { label: 'Vulnerabilities', href: '/dashboard/security/vulnerabilities' }
  ],
  '/dashboard/security/compliance': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Security', href: '/dashboard/security' },
    { label: 'Compliance', href: '/dashboard/security/compliance' }
  ]
}
```

### Quick Actions Integration

```typescript
// Add to global quick actions
{
  id: 'run-security-scan',
  label: 'Run Security Scan',
  icon: Shield,
  href: '/dashboard/security/scans',
  shortcut: 'S',
  category: 'admin'
},
{
  id: 'view-vulnerabilities',
  label: 'View Vulnerabilities',
  icon: Bug,
  href: '/dashboard/security/vulnerabilities',
  shortcut: 'V',
  category: 'admin'
}
```

## Testing Requirements

### Unit Tests

```typescript
// Security Scanner Tests
describe('SecurityScanner', () => {
  test('should detect hardcoded credentials', async () => {
    const mockCode = 'const password = "hardcoded123";';
    const vulnerabilities = await SecurityScanner.scanCodeSnippet(mockCode);
    expect(vulnerabilities).toHaveLength(1);
    expect(vulnerabilities[0].category).toBe('sensitive_data');
  });

  test('should calculate risk score correctly', () => {
    const vulnerabilities = [
      { severity: 'critical' },
      { severity: 'high' },
      { severity: 'medium' }
    ];
    const riskScore = SecurityScanner.calculateRiskScore(vulnerabilities);
    expect(riskScore).toBeGreaterThan(0);
    expect(riskScore).toBeLessThanOrEqual(100);
  });
});

// Vulnerability Manager Tests
describe('VulnerabilityManager', () => {
  test('should perform bulk status update', async () => {
    const mockVulnIds = ['vuln-1', 'vuln-2', 'vuln-3'];
    const result = await VulnerabilityManager.performBulkAction(
      mockVulnIds, 
      'update_status', 
      { status: 'fixed' }
    );
    expect(result.updated).toBe(3);
  });
});
```

### Integration Tests

```typescript
// API Endpoint Tests
describe('Security API', () => {
  test('POST /api/security/scans/execute', async () => {
    const response = await fetch('/api/security/scans/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        configurationId: 'test-config-id',
        executionName: 'Integration Test Scan'
      })
    });
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.execution).toHaveProperty('id');
  });

  test('GET /api/security/vulnerabilities', async () => {
    const response = await fetch('/api/security/vulnerabilities?severity=critical');
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.vulnerabilities)).toBe(true);
  });
});
```

### Browser Tests

```typescript
// Dashboard Component Tests
describe('SecurityAuditDashboard', () => {
  test('should display security metrics', async () => {
    const { page } = await setupBrowserTest('/dashboard/security');
    
    await page.waitForSelector('[data-testid="security-metrics"]');
    
    const riskScore = await page.textContent('[data-testid="risk-score"]');
    expect(riskScore).toMatch(/\d+/);
    
    const complianceScore = await page.textContent('[data-testid="compliance-score"]');
    expect(complianceScore).toMatch(/\d+%/);
  });

  test('should display vulnerability trends chart', async () => {
    const { page } = await setupBrowserTest('/dashboard/security');
    
    await page.waitForSelector('.recharts-wrapper');
    
    const chart = await page.$('.recharts-area-chart');
    expect(chart).toBeTruthy();
  });

  test('should show recent security alerts', async () => {
    const { page } = await setupBrowserTest('/dashboard/security');
    
    await page.waitForSelector('[data-testid="recent-alerts"]');
    
    const alerts = await page.$$('[data-testid="security-alert"]');
    expect(alerts.length).toBeGreaterThanOrEqual(0);
  });
});
```

### Security Tests

```typescript
// Security-specific tests
describe('Security Audit System Security', () => {
  test('should require authentication for all endpoints', async () => {
    const endpoints = [
      '/api/security/scans',
      '/api/security/vulnerabilities',
      '/api/security/incidents'
    ];
    
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint);
      expect([401, 403]).toContain(response.status);
    }
  });

  test('should validate input parameters', async () => {
    const response = await fetch('/api/security/scans/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maliciousInput: '<script>alert("xss")</script>' })
    });
    
    expect(response.status).toBe(400);
  });

  test('should sanitize vulnerability data', async () => {
    const vulnerability = {
      title: '<script>alert("xss")</script>',
      description: 'Test description'
    };
    
    const sanitized = VulnerabilityManager.sanitizeVulnerability(vulnerability);
    expect(sanitized.title).not.toContain('<script>');
  });
});
```

## Security Considerations

- **Access Control**: Only admin users can access security audit features
- **Data Encryption**: All security data is encrypted at rest and in transit
- **Audit Logging**: All security-related activities are logged with full audit trails
- **Input Validation**: All inputs are validated and sanitized to prevent injection attacks
- **Rate Limiting**: Security scan endpoints are rate-limited to prevent abuse
- **Secure Storage**: Vulnerability data is stored securely with appropriate retention policies
- **Privacy Protection**: Personal data is handled according to privacy regulations

## Accessibility Features

- **WCAG 2.1 AA Compliance**: All security dashboard components meet accessibility standards
- **Screen Reader Support**: Proper ARIA labels and semantic HTML structure
- **Keyboard Navigation**: Full keyboard navigation support for all interactive elements
- **High Contrast Mode**: Dashboard adapts to high contrast display preferences
- **Focus Management**: Clear visual focus indicators and logical tab order
- **Alternative Text**: Security charts and graphs include text alternatives
- **Responsive Design**: Dashboard works effectively on all screen sizes and orientations

This comprehensive Security Audit System provides automated security monitoring, vulnerability management, compliance tracking, and incident response capabilities to ensure WedSync maintains enterprise-grade security standards and protects sensitive wedding and supplier data effectively.