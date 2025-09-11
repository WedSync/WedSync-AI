'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Database,
  FileImage,
  Search,
  Play,
  RefreshCw,
  Download,
  Calendar,
  Users,
  Camera,
} from 'lucide-react';

interface ValidationRun {
  id: string;
  run_name: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'scheduled';
  started_at: string;
  completed_at?: string;
  progress: number;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  warnings: number;

  // Scope
  scope:
    | 'full_system'
    | 'wedding_specific'
    | 'vendor_specific'
    | 'date_range'
    | 'backup_verification';
  wedding_id?: string;
  vendor_id?: string;
  date_range?: { start: string; end: string };
  backup_id?: string;

  // Results
  overall_score: number;
  data_completeness: number;
  referential_integrity: number;
  constraint_compliance: number;
  media_integrity: number;

  // Categories
  validation_categories: ValidationCategory[];
  critical_issues: ValidationIssue[];

  initiated_by: string;
}

interface ValidationCategory {
  category:
    | 'database'
    | 'media_files'
    | 'documents'
    | 'user_data'
    | 'financial'
    | 'wedding_timeline';
  total_items: number;
  validated_items: number;
  passed: number;
  failed: number;
  warnings: number;
  score: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  estimated_completion?: string;
}

interface ValidationIssue {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue_type:
    | 'missing_data'
    | 'corruption'
    | 'orphaned_record'
    | 'constraint_violation'
    | 'media_missing'
    | 'checksum_mismatch';
  description: string;
  affected_table?: string;
  affected_record_id?: string;
  wedding_impact: boolean;
  vendor_impact: boolean;
  auto_fixable: boolean;
  suggested_action: string;
  detected_at: string;
}

interface ValidationMetrics {
  total_runs_today: number;
  average_score_7days: number;
  critical_issues_open: number;
  wedding_data_score: number;
  media_integrity_score: number;
  last_full_validation: string;
}

export default function DataIntegrityValidator() {
  const [runs, setRuns] = useState<ValidationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ValidationRun | null>(null);
  const [metrics, setMetrics] = useState<ValidationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningValidation, setRunningValidation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [validationScope, setValidationScope] = useState<string>('full_system');
  const [specificId, setSpecificId] = useState('');

  const supabase = createClient();

  useEffect(() => {
    loadValidationData();
    const interval = setInterval(loadValidationData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadValidationData = async () => {
    try {
      // Load validation runs
      const { data: runsData, error: runsError } = await supabase
        .from('validation_runs')
        .select(
          `
          *,
          validation_categories(*),
          critical_issues:validation_issues(*)
        `,
        )
        .order('started_at', { ascending: false })
        .limit(20);

      if (runsError) throw runsError;

      // Load metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('validation_metrics_summary')
        .select('*')
        .single();

      if (metricsError) throw metricsError;

      setRuns(runsData || []);
      setMetrics(metricsData);

      // Update selected run if it's running
      if (
        selectedRun &&
        ['running', 'scheduled'].includes(selectedRun.status)
      ) {
        const updatedRun = runsData?.find((run) => run.id === selectedRun.id);
        if (updatedRun) {
          setSelectedRun(updatedRun);
        }
      }
    } catch (error) {
      console.error('Error loading validation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startValidation = async () => {
    try {
      setRunningValidation(true);

      const validationConfig = {
        run_name: `${validationScope.replace('_', ' ')} - ${new Date().toLocaleString()}`,
        scope: validationScope,
        wedding_id: validationScope === 'wedding_specific' ? specificId : null,
        vendor_id: validationScope === 'vendor_specific' ? specificId : null,
        initiated_by: 'system_admin', // This should come from auth context
      };

      const { data, error } = await supabase
        .from('validation_runs')
        .insert([validationConfig])
        .select()
        .single();

      if (error) throw error;

      // Trigger validation process
      await supabase.functions.invoke('start-data-validation', {
        body: { validation_run_id: data.id },
      });

      setSelectedRun(data);
      loadValidationData(); // Refresh data
    } catch (error) {
      console.error('Error starting validation:', error);
    } finally {
      setRunningValidation(false);
    }
  };

  const downloadReport = async (runId: string) => {
    try {
      const run = runs.find((r) => r.id === runId);
      if (!run) return;

      const reportData = {
        run_id: runId,
        generated_at: new Date().toISOString(),
        summary: {
          overall_score: run.overall_score,
          total_checks: run.total_checks,
          passed_checks: run.passed_checks,
          failed_checks: run.failed_checks,
          warnings: run.warnings,
        },
        categories: run.validation_categories,
        critical_issues: run.critical_issues,
        recommendations: generateRecommendations(run),
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `validation-report-${runId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const generateRecommendations = (run: ValidationRun): string[] => {
    const recommendations: string[] = [];

    if (run.overall_score < 85) {
      recommendations.push(
        'Overall data integrity is below recommended threshold. Investigate critical issues immediately.',
      );
    }

    if (run.media_integrity < 90) {
      recommendations.push(
        'Media files integrity issues detected. Check storage systems and backup validity.',
      );
    }

    const criticalIssues = run.critical_issues.filter(
      (i) => i.severity === 'critical',
    );
    if (criticalIssues.length > 0) {
      recommendations.push(
        `${criticalIssues.length} critical issues require immediate attention before next backup cycle.`,
      );
    }

    const weddingIssues = run.critical_issues.filter((i) => i.wedding_impact);
    if (weddingIssues.length > 0) {
      recommendations.push(
        `${weddingIssues.length} issues may affect wedding data. Prioritize resolution for upcoming weddings.`,
      );
    }

    return recommendations;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      case 'scheduled':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'database':
        return Database;
      case 'media_files':
        return FileImage;
      case 'wedding_timeline':
        return Calendar;
      case 'user_data':
        return Users;
      case 'documents':
        return FileImage;
      default:
        return Database;
    }
  };

  const filteredRuns = runs.filter(
    (run) =>
      run.run_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      run.scope.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
            Data Integrity Validator
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive wedding data validation & integrity monitoring
          </p>
        </div>
        <Button
          onClick={startValidation}
          disabled={runningValidation}
          className="flex items-center gap-2"
        >
          {runningValidation ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Start Validation
        </Button>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${metrics?.wedding_data_score >= 95 ? 'bg-green-100' : metrics?.wedding_data_score >= 85 ? 'bg-yellow-100' : 'bg-red-100'}`}
            >
              <Calendar
                className={`h-5 w-5 ${metrics?.wedding_data_score >= 95 ? 'text-green-600' : metrics?.wedding_data_score >= 85 ? 'text-yellow-600' : 'text-red-600'}`}
              />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {metrics?.wedding_data_score || 0}%
              </p>
              <p className="text-sm text-gray-600">Wedding Data</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${metrics?.media_integrity_score >= 98 ? 'bg-green-100' : 'bg-yellow-100'}`}
            >
              <Camera
                className={`h-5 w-5 ${metrics?.media_integrity_score >= 98 ? 'text-green-600' : 'text-yellow-600'}`}
              />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {metrics?.media_integrity_score || 0}%
              </p>
              <p className="text-sm text-gray-600">Media Integrity</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${metrics?.critical_issues_open === 0 ? 'bg-green-100' : 'bg-red-100'}`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${metrics?.critical_issues_open === 0 ? 'text-green-600' : 'text-red-600'}`}
              />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {metrics?.critical_issues_open || 0}
              </p>
              <p className="text-sm text-gray-600">Critical Issues</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {metrics?.average_score_7days || 0}%
              </p>
              <p className="text-sm text-gray-600">7-Day Average</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-100">
              <CheckCircle className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {metrics?.total_runs_today || 0}
              </p>
              <p className="text-sm text-gray-600">Runs Today</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Start New Validation */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Start New Validation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Validation Scope
            </label>
            <select
              value={validationScope}
              onChange={(e) => setValidationScope(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="full_system">Full System Validation</option>
              <option value="wedding_specific">Wedding-Specific Data</option>
              <option value="vendor_specific">Vendor-Specific Data</option>
              <option value="backup_verification">Backup Verification</option>
              <option value="date_range">Date Range Validation</option>
            </select>
          </div>

          {['wedding_specific', 'vendor_specific'].includes(
            validationScope,
          ) && (
            <div>
              <label className="block text-sm font-medium mb-2">
                {validationScope === 'wedding_specific'
                  ? 'Wedding ID'
                  : 'Vendor ID'}
              </label>
              <Input
                value={specificId}
                onChange={(e) => setSpecificId(e.target.value)}
                placeholder={`Enter ${validationScope === 'wedding_specific' ? 'wedding' : 'vendor'} ID`}
              />
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Validation Runs List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Validation History</h2>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search validations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>

          {filteredRuns.length === 0 ? (
            <Card className="p-8 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Validations Found
              </h3>
              <p className="text-gray-600">
                Start your first data validation to begin monitoring integrity.
              </p>
            </Card>
          ) : (
            filteredRuns.map((run) => (
              <Card
                key={run.id}
                className={`p-6 cursor-pointer transition-all hover:shadow-md ${
                  selectedRun?.id === run.id ? 'ring-2 ring-purple-500' : ''
                }`}
                onClick={() => setSelectedRun(run)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{run.run_name}</h3>
                    <p className="text-sm text-gray-600">
                      {run.scope.replace('_', ' ')} •{' '}
                      {new Date(run.started_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(run.status)}>
                      {run.status}
                    </Badge>
                    <div
                      className={`text-right ${run.overall_score >= 90 ? 'text-green-600' : run.overall_score >= 75 ? 'text-yellow-600' : 'text-red-600'}`}
                    >
                      <p className="text-xl font-bold">{run.overall_score}%</p>
                    </div>
                  </div>
                </div>

                {run.status === 'running' && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-gray-600">
                        {run.progress}%
                      </span>
                    </div>
                    <Progress value={run.progress} className="h-2" />
                  </div>
                )}

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Passed: </span>
                    <span className="font-medium text-green-600">
                      {run.passed_checks}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Failed: </span>
                    <span className="font-medium text-red-600">
                      {run.failed_checks}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Warnings: </span>
                    <span className="font-medium text-yellow-600">
                      {run.warnings}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total: </span>
                    <span className="font-medium">{run.total_checks}</span>
                  </div>
                </div>

                {run.critical_issues && run.critical_issues.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800">
                        {run.critical_issues.length} Critical Issue(s)
                      </span>
                    </div>
                  </div>
                )}

                {run.status === 'completed' && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <span className="text-sm text-gray-600">
                      Completed:{' '}
                      {run.completed_at
                        ? new Date(run.completed_at).toLocaleString()
                        : 'Unknown'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadReport(run.id);
                      }}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Report
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Detailed Results */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Validation Details</h2>

          {selectedRun ? (
            <div className="space-y-4">
              {/* Categories */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Validation Categories</h3>
                <div className="space-y-3">
                  {selectedRun.validation_categories.map((category) => {
                    const Icon = getCategoryIcon(category.category);
                    return (
                      <div
                        key={category.category}
                        className="border rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4 text-gray-600" />
                          <span className="font-medium text-sm capitalize">
                            {category.category.replace('_', ' ')}
                          </span>
                          <Badge
                            className={getStatusColor(category.status)}
                            variant="secondary"
                          >
                            {category.status}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Score: {category.score}%</span>
                            <span>
                              {category.validated_items}/{category.total_items}
                            </span>
                          </div>
                          <Progress
                            value={
                              (category.validated_items /
                                category.total_items) *
                              100
                            }
                            className="h-1"
                          />

                          <div className="flex justify-between text-xs text-gray-600">
                            <span className="text-green-600">
                              ✓ {category.passed}
                            </span>
                            <span className="text-red-600">
                              ✗ {category.failed}
                            </span>
                            <span className="text-yellow-600">
                              ⚠ {category.warnings}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Critical Issues */}
              {selectedRun.critical_issues &&
                selectedRun.critical_issues.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4 text-red-800">
                      Critical Issues
                    </h3>
                    <div className="space-y-3">
                      {selectedRun.critical_issues.slice(0, 5).map((issue) => (
                        <div
                          key={issue.id}
                          className={`border rounded-lg p-3 ${getSeverityColor(issue.severity)}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">
                              {issue.issue_type.replace('_', ' ')}
                            </span>
                            <div className="flex gap-1">
                              {issue.wedding_impact && (
                                <Badge variant="secondary" className="text-xs">
                                  Wedding
                                </Badge>
                              )}
                              {issue.auto_fixable && (
                                <Badge variant="secondary" className="text-xs">
                                  Auto-fix
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm mb-2">{issue.description}</p>
                          <p className="text-xs font-medium">
                            Suggested: {issue.suggested_action}
                          </p>
                        </div>
                      ))}
                      {selectedRun.critical_issues.length > 5 && (
                        <p className="text-sm text-gray-600">
                          + {selectedRun.critical_issues.length - 5} more issues
                        </p>
                      )}
                    </div>
                  </Card>
                )}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select Validation
              </h3>
              <p className="text-gray-600">
                Choose a validation run to view detailed results and issues.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
