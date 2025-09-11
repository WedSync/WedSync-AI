'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  Heart,
  Play,
  Pause,
  Square,
  RefreshCw,
  Calendar,
  Users,
  Camera,
  MapPin,
  Flower,
  ChefHat,
  Music,
  Car,
  Gift,
  Star,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  FileText,
  Zap,
} from 'lucide-react';

// Wedding Test Scenario Types
export interface WeddingTestScenario {
  id: string;
  name: string;
  description: string;
  category: ScenarioCategory;
  complexity: ScenarioComplexity;
  supplierTypes: SupplierType[];
  coupleProfile: CoupleProfile;
  weddingDetails: WeddingDetails;
  testObjectives: TestObjective[];
  expectedDuration: number;
  actualDuration?: number;
  status: ScenarioStatus;
  createdAt: Date;
  lastRun?: Date;
  runCount: number;
  successRate: number;
  averageExecutionTime: number;
  dataRequirements: DataRequirement[];
  validationRules: ValidationRule[];
  customParameters: CustomParameter[];
}

export interface CoupleProfile {
  names: string[];
  weddingDate: string;
  guestCount: number;
  budget: number;
  venue: string;
  theme: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  preferences: WeddingPreference[];
  communicationStyle: 'formal' | 'casual' | 'mixed';
  techSavviness: 'low' | 'medium' | 'high';
}

export interface WeddingDetails {
  ceremonyTime: string;
  receptionTime: string;
  location: string;
  guestCategories: GuestCategory[];
  specialRequirements: string[];
  timeline: TimelineEvent[];
  budget: BudgetBreakdown;
}

export interface TestObjective {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  type:
    | 'functionality'
    | 'performance'
    | 'integration'
    | 'user-experience'
    | 'data-integrity';
  successCriteria: string[];
  metrics: ObjectiveMetric[];
}

export interface ObjectiveMetric {
  name: string;
  expectedValue: number | string;
  actualValue?: number | string;
  unit?: string;
  tolerance?: number;
}

export interface DataRequirement {
  id: string;
  type: 'supplier-data' | 'couple-data' | 'wedding-data' | 'integration-data';
  description: string;
  source: string;
  format: 'json' | 'csv' | 'xml' | 'form-data';
  sampleSize: number;
  isRequired: boolean;
  generationRules?: string[];
}

export interface ValidationRule {
  id: string;
  field: string;
  rule: string;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
}

export interface CustomParameter {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'date';
  value: any;
  options?: string[];
  description?: string;
}

export interface WeddingPreference {
  category: string;
  preference: string;
  importance: 'low' | 'medium' | 'high';
}

export interface GuestCategory {
  name: string;
  count: number;
  description: string;
}

export interface TimelineEvent {
  time: string;
  event: string;
  duration: number;
  suppliers: string[];
}

export interface BudgetBreakdown {
  total: number;
  categories: {
    venue: number;
    photography: number;
    catering: number;
    flowers: number;
    music: number;
    transport: number;
    other: number;
  };
}

export interface ScenarioExecution {
  id: string;
  scenarioId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  results: TestResult[];
  logs: ExecutionLog[];
  performance: PerformanceMetrics;
  errors: ExecutionError[];
}

export interface TestResult {
  objectiveId: string;
  status: 'passed' | 'failed' | 'skipped' | 'warning';
  message?: string;
  metrics: ObjectiveMetric[];
  duration: number;
}

export interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: any;
}

export interface ExecutionError {
  id: string;
  type: string;
  message: string;
  stackTrace?: string;
  context?: any;
  timestamp: Date;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  resourceUsage: ResourceUsage;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  database: number;
  network: number;
}

export type ScenarioCategory =
  | 'end-to-end'
  | 'supplier-integration'
  | 'couple-journey'
  | 'performance'
  | 'stress'
  | 'regression';
export type ScenarioComplexity =
  | 'simple'
  | 'moderate'
  | 'complex'
  | 'enterprise';
export type SupplierType =
  | 'photographer'
  | 'venue'
  | 'florist'
  | 'caterer'
  | 'musician'
  | 'transport'
  | 'other';
export type ScenarioStatus =
  | 'draft'
  | 'active'
  | 'running'
  | 'completed'
  | 'failed'
  | 'archived';
export type ExecutionStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface WeddingScenarioRunnerProps {
  scenarios: WeddingTestScenario[];
  executions: ScenarioExecution[];
  onCreateScenario: (scenario: Partial<WeddingTestScenario>) => void;
  onEditScenario: (id: string, scenario: Partial<WeddingTestScenario>) => void;
  onDeleteScenario: (id: string) => void;
  onRunScenario: (id: string, parameters?: CustomParameter[]) => void;
  onStopExecution: (executionId: string) => void;
  onCloneScenario: (id: string) => void;
  onExportScenario: (id: string) => void;
  onImportScenario: (file: File) => void;
}

const WeddingScenarioRunner: React.FC<WeddingScenarioRunnerProps> = ({
  scenarios,
  executions,
  onCreateScenario,
  onEditScenario,
  onDeleteScenario,
  onRunScenario,
  onStopExecution,
  onCloneScenario,
  onExportScenario,
  onImportScenario,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<
    ScenarioCategory | 'all'
  >('all');
  const [complexityFilter, setComplexityFilter] = useState<
    ScenarioComplexity | 'all'
  >('all');
  const [newScenario, setNewScenario] = useState<Partial<WeddingTestScenario>>(
    {},
  );
  const [executionLogs, setExecutionLogs] = useState<{
    [key: string]: ExecutionLog[];
  }>({});

  // Real-time execution monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      // Mock real-time log updates
      executions.forEach((execution) => {
        if (execution.status === 'running') {
          // Update logs would happen here
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [executions]);

  const getSupplierIcon = (type: SupplierType) => {
    switch (type) {
      case 'photographer':
        return <Camera className="h-4 w-4 text-blue-500" />;
      case 'venue':
        return <MapPin className="h-4 w-4 text-green-500" />;
      case 'florist':
        return <Flower className="h-4 w-4 text-pink-500" />;
      case 'caterer':
        return <ChefHat className="h-4 w-4 text-orange-500" />;
      case 'musician':
        return <Music className="h-4 w-4 text-purple-500" />;
      case 'transport':
        return <Car className="h-4 w-4 text-gray-500" />;
      default:
        return <Gift className="h-4 w-4 text-indigo-500" />;
    }
  };

  const getStatusIcon = (status: ScenarioStatus) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'active':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'archived':
        return <FileText className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getComplexityColor = (complexity: ScenarioComplexity) => {
    switch (complexity) {
      case 'simple':
        return 'bg-green-100 text-green-800';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800';
      case 'complex':
        return 'bg-orange-100 text-orange-800';
      case 'enterprise':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilteredScenarios = () => {
    return scenarios.filter((scenario) => {
      if (categoryFilter !== 'all' && scenario.category !== categoryFilter)
        return false;
      if (
        complexityFilter !== 'all' &&
        scenario.complexity !== complexityFilter
      )
        return false;
      return true;
    });
  };

  const getRunningExecutions = () => {
    return executions.filter((exec) => exec.status === 'running');
  };

  const getScenarioStats = () => {
    const total = scenarios.length;
    const active = scenarios.filter((s) => s.status === 'active').length;
    const running = getRunningExecutions().length;
    const avgSuccessRate =
      scenarios.length > 0
        ? Math.round(
            scenarios.reduce((acc, s) => acc + s.successRate, 0) /
              scenarios.length,
          )
        : 0;

    return { total, active, running, avgSuccessRate };
  };

  const handleCreateScenario = () => {
    if (newScenario.name && newScenario.description) {
      onCreateScenario({
        ...newScenario,
        id: `scenario-${Date.now()}`,
        status: 'draft' as ScenarioStatus,
        createdAt: new Date(),
        runCount: 0,
        successRate: 0,
        averageExecutionTime: 0,
      });
      setNewScenario({});
      setShowCreateForm(false);
    }
  };

  const stats = getScenarioStats();

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Wedding Scenario Runner
          </h2>
          <p className="text-gray-600">
            Industry-specific test scenario configuration and execution
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Scenario
          </Button>
          <input
            type="file"
            id="import-scenario"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onImportScenario(e.target.files[0]);
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('import-scenario')?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Scenarios
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Heart className="h-8 w-8 text-rose-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.active}
                </p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Running</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.running}
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Success Rate
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.avgSuccessRate}%
                </p>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label>Category:</Label>
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value as any)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="end-to-end">End-to-End</SelectItem>
                  <SelectItem value="supplier-integration">
                    Supplier Integration
                  </SelectItem>
                  <SelectItem value="couple-journey">Couple Journey</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="stress">Stress</SelectItem>
                  <SelectItem value="regression">Regression</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Label>Complexity:</Label>
              <Select
                value={complexityFilter}
                onValueChange={(value) => setComplexityFilter(value as any)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="complex">Complex</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Running Executions */}
      {getRunningExecutions().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
              <span>Running Executions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getRunningExecutions().map((execution) => {
                const scenario = scenarios.find(
                  (s) => s.id === execution.scenarioId,
                );
                if (!scenario) return null;

                const progress = Math.round(
                  (execution.results.filter((r) => r.status !== 'skipped')
                    .length /
                    scenario.testObjectives.length) *
                    100,
                );

                return (
                  <div key={execution.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                        <span className="font-medium">{scenario.name}</span>
                        <Badge variant="default">Running</Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onStopExecution(execution.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="text-xs text-gray-600">
                        Running for{' '}
                        {Math.round(
                          (Date.now() - execution.startTime.getTime()) / 1000,
                        )}
                        s
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {getFilteredScenarios().map((scenario) => (
          <Card
            key={scenario.id}
            className={cn(
              'transition-all duration-200',
              selectedScenario === scenario.id && 'ring-2 ring-blue-500',
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center space-x-2">
                  {getStatusIcon(scenario.status)}
                  <span>{scenario.name}</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge
                    className={cn(
                      'text-xs',
                      getComplexityColor(scenario.complexity),
                    )}
                  >
                    {scenario.complexity}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {scenario.category.replace('-', ' ')}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600">{scenario.description}</p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Wedding Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{scenario.coupleProfile.weddingDate}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span>{scenario.coupleProfile.guestCount} guests</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>
                    {Math.round(scenario.expectedDuration / 60000)}min
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-gray-500" />
                  <span>{scenario.successRate}% success</span>
                </div>
              </div>

              {/* Suppliers */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Suppliers ({scenario.supplierTypes.length})
                </h4>
                <div className="flex flex-wrap gap-1">
                  {scenario.supplierTypes.map((type) => (
                    <div
                      key={type}
                      className="flex items-center space-x-1 bg-gray-100 rounded px-2 py-1"
                    >
                      {getSupplierIcon(type)}
                      <span className="text-xs capitalize">{type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Objectives */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Test Objectives ({scenario.testObjectives.length})
                </h4>
                <div className="space-y-1">
                  {scenario.testObjectives.slice(0, 3).map((objective) => (
                    <div
                      key={objective.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="truncate">{objective.description}</span>
                      <Badge
                        variant={
                          objective.priority === 'critical'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {objective.priority}
                      </Badge>
                    </div>
                  ))}
                  {scenario.testObjectives.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{scenario.testObjectives.length - 3} more objectives
                    </div>
                  )}
                </div>
              </div>

              {/* Execution Stats */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Runs:</span>
                  <span className="ml-1 font-medium">{scenario.runCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Avg Time:</span>
                  <span className="ml-1 font-medium">
                    {Math.round(scenario.averageExecutionTime / 1000)}s
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Last Run:</span>
                  <span className="ml-1 font-medium">
                    {scenario.lastRun
                      ? scenario.lastRun.toLocaleDateString()
                      : 'Never'}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onRunScenario(scenario.id)}
                    disabled={scenario.status === 'running'}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Run
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedScenario(
                        selectedScenario === scenario.id ? null : scenario.id,
                      )
                    }
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    {selectedScenario === scenario.id ? 'Hide' : 'Details'}
                  </Button>
                </div>

                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCloneScenario(scenario.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onExportScenario(scenario.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteScenario(scenario.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>

            {/* Expanded Details */}
            {selectedScenario === scenario.id && (
              <CardContent className="pt-0 border-t">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Couple Profile
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        Couple: {scenario.coupleProfile.names.join(' & ')}
                      </div>
                      <div>
                        Budget: £
                        {scenario.coupleProfile.budget.toLocaleString()}
                      </div>
                      <div>Theme: {scenario.coupleProfile.theme}</div>
                      <div>Season: {scenario.coupleProfile.season}</div>
                      <div>
                        Tech Level: {scenario.coupleProfile.techSavviness}
                      </div>
                      <div>
                        Communication:{' '}
                        {scenario.coupleProfile.communicationStyle}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Data Requirements ({scenario.dataRequirements.length})
                    </h4>
                    <div className="space-y-1">
                      {scenario.dataRequirements.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                        >
                          <div>
                            <span className="font-medium">
                              {req.type.replace('-', ' ')}
                            </span>
                            <span className="ml-2 text-gray-600">
                              {req.description}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {req.format}
                            </Badge>
                            {req.isRequired && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Validation Rules ({scenario.validationRules.length})
                    </h4>
                    <div className="space-y-1">
                      {scenario.validationRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                        >
                          <div>
                            <span className="font-medium">{rule.field}</span>
                            <span className="ml-2 text-gray-600">
                              {rule.rule}
                            </span>
                          </div>
                          <Badge
                            variant={
                              rule.severity === 'error'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {rule.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Create New Scenario Modal */}
      {showCreateForm && (
        <Card className="fixed inset-4 z-50 bg-white shadow-2xl overflow-y-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create New Wedding Scenario</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm(false)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Scenario Name</Label>
                <Input
                  value={newScenario.name || ''}
                  onChange={(e) =>
                    setNewScenario({ ...newScenario, name: e.target.value })
                  }
                  placeholder="e.g., Summer Garden Wedding E2E"
                />
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={newScenario.category}
                  onValueChange={(value) =>
                    setNewScenario({ ...newScenario, category: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="end-to-end">End-to-End</SelectItem>
                    <SelectItem value="supplier-integration">
                      Supplier Integration
                    </SelectItem>
                    <SelectItem value="couple-journey">
                      Couple Journey
                    </SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="stress">Stress</SelectItem>
                    <SelectItem value="regression">Regression</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Complexity</Label>
                <Select
                  value={newScenario.complexity}
                  onValueChange={(value) =>
                    setNewScenario({ ...newScenario, complexity: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select complexity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="complex">Complex</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Expected Duration (minutes)</Label>
                <Input
                  type="number"
                  value={
                    newScenario.expectedDuration
                      ? Math.round(newScenario.expectedDuration / 60000)
                      : ''
                  }
                  onChange={(e) =>
                    setNewScenario({
                      ...newScenario,
                      expectedDuration: parseInt(e.target.value) * 60000,
                    })
                  }
                  placeholder="15"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newScenario.description || ''}
                onChange={(e) =>
                  setNewScenario({
                    ...newScenario,
                    description: e.target.value,
                  })
                }
                placeholder="Describe what this scenario tests..."
                className="h-20"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateScenario}>Create Scenario</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {getFilteredScenarios().length === 0 && !showCreateForm && (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              No wedding scenarios match the current filters
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Scenario
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WeddingScenarioRunner;
