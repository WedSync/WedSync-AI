'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Download,
  Search,
  Filter,
} from 'lucide-react';

interface ComplianceRule {
  id: string;
  rule_name: string;
  description: string;
  category:
    | 'gdpr'
    | 'data_retention'
    | 'backup_frequency'
    | 'security'
    | 'audit';
  severity: 'critical' | 'high' | 'medium' | 'low';
  compliance_status:
    | 'compliant'
    | 'non_compliant'
    | 'needs_review'
    | 'in_progress';
  last_checked: string;
  next_check_due: string;
  requirements: string[];
  evidence_required: string[];
  responsible_team: string;
  remediation_steps?: string[];
  wedding_impact: 'high' | 'medium' | 'low';
}

interface ComplianceViolation {
  id: string;
  rule_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  detected_at: string;
  description: string;
  affected_data: string;
  resolution_required_by: string;
  status: 'open' | 'in_progress' | 'resolved' | 'false_positive';
  wedding_ids_affected?: string[];
}

interface ComplianceMetrics {
  overall_score: number;
  total_rules: number;
  compliant_rules: number;
  violations_count: number;
  critical_violations: number;
  wedding_protection_score: number;
}

export default function BackupComplianceTracker() {
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const supabase = createClient();

  useEffect(() => {
    loadComplianceData();
    const interval = setInterval(loadComplianceData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadComplianceData = async () => {
    try {
      setLoading(true);

      // Load compliance rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('backup_compliance_rules')
        .select('*')
        .order('severity', { ascending: false });

      if (rulesError) throw rulesError;

      // Load violations
      const { data: violationsData, error: violationsError } = await supabase
        .from('compliance_violations')
        .select('*')
        .eq('status', 'open')
        .order('detected_at', { ascending: false });

      if (violationsError) throw violationsError;

      // Calculate metrics
      const totalRules = rulesData?.length || 0;
      const compliantRules =
        rulesData?.filter((r) => r.compliance_status === 'compliant').length ||
        0;
      const violationsCount = violationsData?.length || 0;
      const criticalViolations =
        violationsData?.filter((v) => v.severity === 'critical').length || 0;
      const weddingProtectionRules =
        rulesData?.filter((r) => r.wedding_impact === 'high').length || 0;
      const compliantWeddingRules =
        rulesData?.filter(
          (r) =>
            r.wedding_impact === 'high' && r.compliance_status === 'compliant',
        ).length || 0;

      setRules(rulesData || []);
      setViolations(violationsData || []);
      setMetrics({
        overall_score:
          totalRules > 0 ? Math.round((compliantRules / totalRules) * 100) : 0,
        total_rules: totalRules,
        compliant_rules: compliantRules,
        violations_count: violationsCount,
        critical_violations: criticalViolations,
        wedding_protection_score:
          weddingProtectionRules > 0
            ? Math.round((compliantWeddingRules / weddingProtectionRules) * 100)
            : 100,
      });
    } catch (error) {
      console.error('Error loading compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      rule.rule_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || rule.category === selectedCategory;
    const matchesSeverity =
      selectedSeverity === 'all' || rule.severity === selectedSeverity;
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-500';
      case 'non_compliant':
        return 'bg-red-500';
      case 'needs_review':
        return 'bg-yellow-500';
      case 'in_progress':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const exportComplianceReport = async () => {
    try {
      const reportData = {
        generated_at: new Date().toISOString(),
        metrics,
        rules: filteredRules,
        violations,
        summary: {
          total_rules_assessed: rules.length,
          compliance_percentage: metrics?.overall_score || 0,
          critical_violations: metrics?.critical_violations || 0,
          wedding_protection_status: metrics?.wedding_protection_score || 0,
        },
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting compliance report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Backup Compliance Tracker
          </h1>
          <p className="text-gray-600 mt-1">
            Wedding Data Protection & Regulatory Compliance
          </p>
        </div>
        <Button
          onClick={exportComplianceReport}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${metrics?.overall_score >= 90 ? 'bg-green-100' : metrics?.overall_score >= 75 ? 'bg-yellow-100' : 'bg-red-100'}`}
            >
              <Shield
                className={`h-5 w-5 ${metrics?.overall_score >= 90 ? 'text-green-600' : metrics?.overall_score >= 75 ? 'text-yellow-600' : 'text-red-600'}`}
              />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics?.overall_score}%</p>
              <p className="text-sm text-gray-600">Overall Compliance</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${metrics?.wedding_protection_score >= 95 ? 'bg-green-100' : 'bg-red-100'}`}
            >
              <CheckCircle
                className={`h-5 w-5 ${metrics?.wedding_protection_score >= 95 ? 'text-green-600' : 'text-red-600'}`}
              />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {metrics?.wedding_protection_score}%
              </p>
              <p className="text-sm text-gray-600">Wedding Protection</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${metrics?.critical_violations === 0 ? 'bg-green-100' : 'bg-red-100'}`}
            >
              <AlertCircle
                className={`h-5 w-5 ${metrics?.critical_violations === 0 ? 'text-green-600' : 'text-red-600'}`}
              />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {metrics?.critical_violations}
              </p>
              <p className="text-sm text-gray-600">Critical Issues</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics?.total_rules}</p>
              <p className="text-sm text-gray-600">Total Rules</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Critical Violations Alert */}
      {violations.length > 0 && (
        <Card className="border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-800">
              Active Compliance Violations
            </h3>
          </div>
          <div className="space-y-2">
            {violations.slice(0, 3).map((violation) => (
              <div
                key={violation.id}
                className="flex items-center justify-between bg-white p-3 rounded-lg"
              >
                <div>
                  <p className="font-medium text-red-800">
                    {violation.description}
                  </p>
                  <p className="text-sm text-red-600">
                    Detected:{' '}
                    {new Date(violation.detected_at).toLocaleDateString()}
                  </p>
                  {violation.wedding_ids_affected &&
                    violation.wedding_ids_affected.length > 0 && (
                      <p className="text-xs text-red-500">
                        Affects {violation.wedding_ids_affected.length} weddings
                      </p>
                    )}
                </div>
                <Badge
                  className={getSeverityColor(violation.severity)}
                  variant="secondary"
                >
                  {violation.severity}
                </Badge>
              </div>
            ))}
            {violations.length > 3 && (
              <p className="text-sm text-red-600">
                + {violations.length - 3} more violations
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search compliance rules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Categories</option>
            <option value="gdpr">GDPR</option>
            <option value="data_retention">Data Retention</option>
            <option value="backup_frequency">Backup Frequency</option>
            <option value="security">Security</option>
            <option value="audit">Audit</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </Card>

      {/* Compliance Rules */}
      <div className="grid gap-4">
        {filteredRules.map((rule) => (
          <Card key={rule.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{rule.rule_name}</h3>
                  <Badge
                    className={getSeverityColor(rule.severity)}
                    variant="secondary"
                  >
                    {rule.severity}
                  </Badge>
                  <Badge
                    className={getStatusColor(rule.compliance_status)}
                    variant="secondary"
                  >
                    {rule.compliance_status.replace('_', ' ')}
                  </Badge>
                  {rule.wedding_impact === 'high' && (
                    <Badge
                      className="bg-purple-100 text-purple-800"
                      variant="secondary"
                    >
                      Wedding Critical
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 mb-3">{rule.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="font-medium text-sm text-gray-700 mb-1">
                      Requirements:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {rule.requirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-gray-400">•</span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium text-sm text-gray-700 mb-1">
                      Evidence Required:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {rule.evidence_required.map((evidence, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-gray-400">•</span>
                          {evidence}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium text-sm text-gray-700 mb-1">
                      Schedule:
                    </p>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        Last Checked:{' '}
                        {new Date(rule.last_checked).toLocaleDateString()}
                      </p>
                      <p>
                        Next Due:{' '}
                        {new Date(rule.next_check_due).toLocaleDateString()}
                      </p>
                      <p>Team: {rule.responsible_team}</p>
                    </div>
                  </div>
                </div>

                {rule.remediation_steps &&
                  rule.remediation_steps.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                      <p className="font-medium text-sm text-yellow-800 mb-2">
                        Remediation Steps:
                      </p>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {rule.remediation_steps.map((step, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <span className="text-yellow-500">
                              {index + 1}.
                            </span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredRules.length === 0 && (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No rules found
          </h3>
          <p className="text-gray-600">
            Try adjusting your search criteria or filters.
          </p>
        </div>
      )}
    </div>
  );
}
