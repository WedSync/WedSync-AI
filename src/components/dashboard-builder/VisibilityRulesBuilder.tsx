'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Play,
  Pause,
  RotateCcw,
  Target,
  Filter,
  Zap,
  Settings,
  Users,
  Shield,
  Code2,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Input } from '@/components/ui/input-untitled';
import { Card } from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, differenceInDays, addDays, subDays } from 'date-fns';

interface VisibilityRule {
  id: string;
  type:
    | 'timeline'
    | 'package'
    | 'form_state'
    | 'custom'
    | 'milestone_completed'
    | 'client_metadata';
  condition: string;
  value: any;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'between'
    | 'in'
    | 'not_in'
    | 'contains'
    | 'exists';
  logic?: 'and' | 'or';
  description?: string;
  isActive: boolean;
  priority: number;
}

interface ClientContext {
  weddingDate?: Date;
  packageLevel?: string;
  budget?: number;
  guestCount?: number;
  venueType?: string;
  weddingStyle?: string;
  completedForms?: string[];
  completedMilestones?: string[];
  customFields?: Record<string, any>;
  bookingDate?: Date;
  lastActivity?: Date;
}

interface VisibilityRulesBuilderProps {
  rules: VisibilityRule[];
  clientContext?: ClientContext;
  onRulesChange: (rules: VisibilityRule[]) => void;
  onTestRules?: (
    results: { ruleId: string; passed: boolean; message: string }[],
  ) => void;
  allowRealTime?: boolean;
}

const RULE_TEMPLATES = [
  {
    id: 'early_planning',
    name: 'Early Planning Phase',
    description: 'Show section 6+ months before wedding',
    template: {
      type: 'timeline' as const,
      condition: 'days_until_wedding',
      operator: 'greater_than' as const,
      value: 180,
      description: 'Visible during early planning phase',
    },
  },
  {
    id: 'final_preparations',
    name: 'Final Preparations',
    description: 'Show section in final month before wedding',
    template: {
      type: 'timeline' as const,
      condition: 'days_until_wedding',
      operator: 'between' as const,
      value: '0,30',
      description: 'Visible during final preparations',
    },
  },
  {
    id: 'premium_only',
    name: 'Premium Features',
    description: 'Only show for premium packages',
    template: {
      type: 'package' as const,
      condition: 'package_level',
      operator: 'in' as const,
      value: ['gold', 'platinum', 'custom'],
      description: 'Premium package features only',
    },
  },
  {
    id: 'form_dependent',
    name: 'Form Completion',
    description: 'Show after specific form is completed',
    template: {
      type: 'form_state' as const,
      condition: 'completed_forms',
      operator: 'contains' as const,
      value: '',
      description: 'Show after form completion',
    },
  },
  {
    id: 'budget_based',
    name: 'Budget Threshold',
    description: 'Show based on wedding budget',
    template: {
      type: 'custom' as const,
      condition: 'budget',
      operator: 'greater_than' as const,
      value: 25000,
      description: 'Budget-based visibility',
    },
  },
];

export default function VisibilityRulesBuilder({
  rules,
  clientContext,
  onRulesChange,
  onTestRules,
  allowRealTime = false,
}: VisibilityRulesBuilderProps) {
  const [activeTestClient, setActiveTestClient] =
    useState<ClientContext | null>(null);
  const [testResults, setTestResults] = useState<
    { ruleId: string; passed: boolean; message: string }[]
  >([]);
  const [isRealTimeMode, setIsRealTimeMode] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1); // 1x, 2x, 5x speed
  const [simulationDate, setSimulationDate] = useState<Date>(new Date());

  // Real-time simulation effect
  useEffect(() => {
    if (!isRealTimeMode || !allowRealTime) return;

    const interval = setInterval(() => {
      const newDate = addDays(simulationDate, simulationSpeed);
      setSimulationDate(newDate);

      if (activeTestClient) {
        testRulesWithContext({
          ...activeTestClient,
          weddingDate: activeTestClient.weddingDate,
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRealTimeMode, simulationSpeed, simulationDate, activeTestClient]);

  // Wedding milestone calculator
  const getWeddingMilestone = (
    weddingDate: Date,
    currentDate: Date = new Date(),
  ) => {
    const daysUntil = differenceInDays(weddingDate, currentDate);

    if (daysUntil > 365) return { phase: 'early', milestone: '12+ months out' };
    if (daysUntil > 270)
      return { phase: 'early', milestone: '9-12 months out' };
    if (daysUntil > 180)
      return { phase: 'planning', milestone: '6-9 months out' };
    if (daysUntil > 90)
      return { phase: 'planning', milestone: '3-6 months out' };
    if (daysUntil > 30)
      return { phase: 'details', milestone: '1-3 months out' };
    if (daysUntil > 7) return { phase: 'final', milestone: '1-4 weeks out' };
    if (daysUntil > 0) return { phase: 'final', milestone: 'Final week' };
    if (daysUntil === 0) return { phase: 'wedding', milestone: 'Wedding day!' };
    if (daysUntil > -7) return { phase: 'post', milestone: 'First week after' };
    if (daysUntil > -30)
      return { phase: 'post', milestone: 'First month after' };
    return { phase: 'post', milestone: 'Post-wedding' };
  };

  // Evaluate a single rule
  const evaluateRule = (
    rule: VisibilityRule,
    context: ClientContext,
  ): { passed: boolean; message: string } => {
    if (!rule.isActive) {
      return { passed: false, message: 'Rule is disabled' };
    }

    try {
      switch (rule.type) {
        case 'timeline':
          if (!context.weddingDate) {
            return { passed: false, message: 'No wedding date set' };
          }

          const daysUntil = differenceInDays(
            context.weddingDate,
            simulationDate,
          );
          const milestone = getWeddingMilestone(
            context.weddingDate,
            simulationDate,
          );

          switch (rule.operator) {
            case 'equals':
              const targetDays = parseInt(rule.value);
              const passed = Math.abs(daysUntil - targetDays) <= 7;
              return {
                passed,
                message: `${daysUntil} days until wedding (target: ${targetDays}±7)`,
              };

            case 'greater_than':
              return {
                passed: daysUntil > parseInt(rule.value),
                message: `${daysUntil} days until wedding (need >${rule.value})`,
              };

            case 'less_than':
              return {
                passed: daysUntil < parseInt(rule.value),
                message: `${daysUntil} days until wedding (need <${rule.value})`,
              };

            case 'between':
              const [min, max] = rule.value.split(',').map(Number);
              const inRange = daysUntil >= min && daysUntil <= max;
              return {
                passed: inRange,
                message: `${daysUntil} days until wedding (need ${min}-${max})`,
              };

            default:
              return { passed: false, message: 'Unknown timeline operator' };
          }

        case 'package':
          if (!context.packageLevel) {
            return { passed: false, message: 'No package level set' };
          }

          const packages = Array.isArray(rule.value)
            ? rule.value
            : [rule.value];
          const packageMatch =
            rule.operator === 'in'
              ? packages.includes(context.packageLevel)
              : !packages.includes(context.packageLevel);

          return {
            passed: packageMatch,
            message: `Package ${context.packageLevel} ${rule.operator === 'in' ? 'is' : 'is not'} in [${packages.join(', ')}]`,
          };

        case 'form_state':
          if (!context.completedForms) {
            return { passed: false, message: 'No form completion data' };
          }

          const formRequired = rule.value;
          const formCompleted = context.completedForms.includes(formRequired);
          const formMatch =
            rule.operator === 'contains' ? formCompleted : !formCompleted;

          return {
            passed: formMatch,
            message: `Form '${formRequired}' ${formCompleted ? 'completed' : 'not completed'}`,
          };

        case 'milestone_completed':
          if (!context.completedMilestones) {
            return { passed: false, message: 'No milestone completion data' };
          }

          const milestoneRequired = rule.value;
          const milestoneCompleted =
            context.completedMilestones.includes(milestoneRequired);
          const milestoneMatch =
            rule.operator === 'contains'
              ? milestoneCompleted
              : !milestoneCompleted;

          return {
            passed: milestoneMatch,
            message: `Milestone '${milestoneRequired}' ${milestoneCompleted ? 'completed' : 'not completed'}`,
          };

        case 'custom':
          // Handle custom field evaluation
          const fieldValue =
            context.customFields?.[rule.condition] ??
            context[rule.condition as keyof ClientContext];

          if (fieldValue === undefined) {
            return {
              passed: false,
              message: `Field '${rule.condition}' not found`,
            };
          }

          let customPassed = false;
          let customMessage = '';

          switch (rule.operator) {
            case 'equals':
              customPassed = fieldValue === rule.value;
              customMessage = `${rule.condition} = ${fieldValue} (expected: ${rule.value})`;
              break;
            case 'greater_than':
              customPassed = Number(fieldValue) > Number(rule.value);
              customMessage = `${rule.condition} = ${fieldValue} (need >${rule.value})`;
              break;
            case 'less_than':
              customPassed = Number(fieldValue) < Number(rule.value);
              customMessage = `${rule.condition} = ${fieldValue} (need <${rule.value})`;
              break;
            case 'contains':
              customPassed = String(fieldValue).includes(String(rule.value));
              customMessage = `${rule.condition} contains '${rule.value}': ${customPassed}`;
              break;
            case 'exists':
              customPassed =
                fieldValue !== null &&
                fieldValue !== undefined &&
                fieldValue !== '';
              customMessage = `${rule.condition} exists: ${customPassed}`;
              break;
            default:
              return {
                passed: false,
                message: `Unknown operator: ${rule.operator}`,
              };
          }

          return { passed: customPassed, message: customMessage };

        default:
          return { passed: false, message: `Unknown rule type: ${rule.type}` };
      }
    } catch (error) {
      return {
        passed: false,
        message: `Rule evaluation error: ${error.message}`,
      };
    }
  };

  // Test all rules with given context
  const testRulesWithContext = (context: ClientContext) => {
    const results = rules.map((rule) => ({
      ruleId: rule.id,
      ...evaluateRule(rule, context),
    }));

    setTestResults(results);

    if (onTestRules) {
      onTestRules(results);
    }

    return results;
  };

  // Quick test with mock clients
  const testWithMockClient = (
    type: 'luxury' | 'standard' | 'budget' | 'early' | 'late',
  ) => {
    const baseDate = new Date();

    const mockClients: Record<string, ClientContext> = {
      luxury: {
        weddingDate: addDays(baseDate, 180),
        packageLevel: 'platinum',
        budget: 75000,
        guestCount: 150,
        venueType: 'luxury_hotel',
        weddingStyle: 'traditional',
        completedForms: ['venue_questionnaire', 'catering_preferences'],
        completedMilestones: ['venue_booked', 'save_the_date_sent'],
        bookingDate: subDays(baseDate, 30),
      },
      standard: {
        weddingDate: addDays(baseDate, 120),
        packageLevel: 'gold',
        budget: 25000,
        guestCount: 80,
        venueType: 'garden',
        weddingStyle: 'modern',
        completedForms: ['initial_planning'],
        completedMilestones: ['venue_visited'],
        bookingDate: subDays(baseDate, 14),
      },
      budget: {
        weddingDate: addDays(baseDate, 90),
        packageLevel: 'silver',
        budget: 12000,
        guestCount: 50,
        venueType: 'community_hall',
        weddingStyle: 'rustic',
        completedForms: [],
        completedMilestones: [],
        bookingDate: subDays(baseDate, 7),
      },
      early: {
        weddingDate: addDays(baseDate, 365),
        packageLevel: 'gold',
        budget: 35000,
        guestCount: 100,
        venueType: 'vineyard',
        weddingStyle: 'destination',
        completedForms: [],
        completedMilestones: [],
        bookingDate: baseDate,
      },
      late: {
        weddingDate: addDays(baseDate, 14),
        packageLevel: 'platinum',
        budget: 50000,
        guestCount: 120,
        venueType: 'ballroom',
        weddingStyle: 'elegant',
        completedForms: ['all_forms_completed'],
        completedMilestones: ['everything_confirmed'],
        bookingDate: subDays(baseDate, 180),
      },
    };

    const mockClient = mockClients[type];
    setActiveTestClient(mockClient);
    testRulesWithContext(mockClient);
  };

  // Add rule from template
  const addRuleFromTemplate = (template: (typeof RULE_TEMPLATES)[0]) => {
    const newRule: VisibilityRule = {
      id: `rule-${Date.now()}`,
      ...template.template,
      logic: rules.length > 0 ? 'and' : undefined,
      isActive: true,
      priority: rules.length,
    };

    onRulesChange([...rules, newRule]);
  };

  // Toggle rule active state
  const toggleRule = (ruleId: string) => {
    onRulesChange(
      rules.map((rule) =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule,
      ),
    );
  };

  // Update rule
  const updateRule = (ruleId: string, updates: Partial<VisibilityRule>) => {
    onRulesChange(
      rules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...updates } : rule,
      ),
    );
  };

  // Calculate overall visibility
  const calculateOverallVisibility = (): {
    visible: boolean;
    reason: string;
  } => {
    if (rules.length === 0) {
      return { visible: true, reason: 'No rules defined - always visible' };
    }

    if (!activeTestClient) {
      return { visible: false, reason: 'No test context - visibility unknown' };
    }

    const activeRules = rules.filter((r) => r.isActive);
    if (activeRules.length === 0) {
      return { visible: true, reason: 'All rules disabled - always visible' };
    }

    let result = null;
    let reasons: string[] = [];

    for (let i = 0; i < activeRules.length; i++) {
      const rule = activeRules[i];
      const ruleResult = evaluateRule(rule, activeTestClient);

      if (i === 0) {
        result = ruleResult.passed;
        reasons.push(`${rule.description || rule.type}: ${ruleResult.message}`);
      } else {
        if (rule.logic === 'or') {
          result = result || ruleResult.passed;
          reasons.push(
            `OR ${rule.description || rule.type}: ${ruleResult.message}`,
          );
        } else {
          // 'and' or undefined
          result = result && ruleResult.passed;
          reasons.push(
            `AND ${rule.description || rule.type}: ${ruleResult.message}`,
          );
        }
      }
    }

    return {
      visible: result || false,
      reason: reasons.join(' • '),
    };
  };

  const overallVisibility = calculateOverallVisibility();

  return (
    <div className="space-y-6">
      {/* Header with Real-time Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Visibility Rules Engine
          </h3>
          <p className="text-sm text-gray-600">
            Configure intelligent section visibility based on timeline and
            client data
          </p>
        </div>

        {allowRealTime && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={
                isRealTimeMode ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )
              }
              onClick={() => setIsRealTimeMode(!isRealTimeMode)}
            >
              {isRealTimeMode ? 'Pause' : 'Simulate'}
            </Button>

            {isRealTimeMode && (
              <select
                className="px-2 py-1 text-sm border rounded"
                value={simulationSpeed}
                onChange={(e) => setSimulationSpeed(Number(e.target.value))}
              >
                <option value={1}>1x Speed</option>
                <option value={2}>2x Speed</option>
                <option value={5}>5x Speed</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* Overall Visibility Status */}
      <Card
        className={cn(
          'p-4 border-2',
          overallVisibility.visible
            ? 'bg-success-50 border-success-200'
            : 'bg-gray-50 border-gray-200',
        )}
      >
        <div className="flex items-start gap-3">
          {overallVisibility.visible ? (
            <Eye className="h-5 w-5 text-success-600 mt-0.5" />
          ) : (
            <EyeOff className="h-5 w-5 text-gray-600 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant={overallVisibility.visible ? 'success' : 'secondary'}
                className="font-medium"
              >
                {overallVisibility.visible ? 'VISIBLE' : 'HIDDEN'}
              </Badge>
              {activeTestClient && (
                <Badge variant="outline" className="text-xs">
                  {activeTestClient.packageLevel} •{' '}
                  {differenceInDays(
                    activeTestClient.weddingDate!,
                    simulationDate,
                  )}{' '}
                  days until wedding
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-700 mt-1">
              {overallVisibility.reason}
            </p>
          </div>
        </div>
      </Card>

      {/* Test Client Selection */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Test Context
          </h4>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => testWithMockClient('luxury')}
            >
              Luxury Client
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => testWithMockClient('standard')}
            >
              Standard Client
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => testWithMockClient('budget')}
            >
              Budget Client
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => testWithMockClient('early')}
            >
              Early Planning
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => testWithMockClient('late')}
            >
              Final Week
            </Button>
          </div>
        </div>

        {activeTestClient && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="font-medium">Wedding Date:</span>
                <br />
                {format(activeTestClient.weddingDate!, 'MMM d, yyyy')}
              </div>
              <div>
                <span className="font-medium">Package:</span>
                <br />
                {activeTestClient.packageLevel}
              </div>
              <div>
                <span className="font-medium">Budget:</span>
                <br />£{activeTestClient.budget?.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Guests:</span>
                <br />
                {activeTestClient.guestCount}
              </div>
            </div>
            {isRealTimeMode && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <span className="font-medium">Simulation Date:</span>{' '}
                {format(simulationDate, 'PPP p')}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Rule Templates */}
      <Card className="p-4">
        <h4 className="font-medium mb-3">Rule Templates</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {RULE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => addRuleFromTemplate(template)}
              className="text-left p-3 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <h5 className="font-medium text-sm">{template.name}</h5>
              <p className="text-xs text-gray-600 mt-1">
                {template.description}
              </p>
            </button>
          ))}
        </div>
      </Card>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map((rule, index) => {
          const testResult = testResults.find((r) => r.ruleId === rule.id);

          return (
            <Card
              key={rule.id}
              className={cn(
                'p-4 transition-all',
                rule.isActive
                  ? 'border-primary-200'
                  : 'border-gray-200 opacity-60',
                testResult?.passed && 'bg-success-50 border-success-200',
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={cn(
                      'mt-1 p-1 rounded transition-colors',
                      rule.isActive
                        ? 'text-primary-600 hover:text-primary-700 bg-primary-100'
                        : 'text-gray-400 hover:text-gray-600 bg-gray-100',
                    )}
                  >
                    {rule.isActive ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {index > 0 && (
                        <select
                          className="px-2 py-1 text-xs border border-gray-300 rounded"
                          value={rule.logic || 'and'}
                          onChange={(e) =>
                            updateRule(rule.id, {
                              logic: e.target.value as 'and' | 'or',
                            })
                          }
                        >
                          <option value="and">AND</option>
                          <option value="or">OR</option>
                        </select>
                      )}

                      <Badge variant="outline" className="text-xs">
                        {rule.type.replace('_', ' ')}
                      </Badge>

                      <Badge variant="outline" className="text-xs">
                        {rule.operator.replace('_', ' ')}
                      </Badge>

                      {testResult && (
                        <Badge
                          variant={testResult.passed ? 'success' : 'secondary'}
                          className="text-xs"
                        >
                          {testResult.passed ? 'PASS' : 'FAIL'}
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm">
                      <Input
                        placeholder="Rule description..."
                        value={rule.description || ''}
                        onChange={(e) =>
                          updateRule(rule.id, { description: e.target.value })
                        }
                        className="text-sm mb-2"
                      />

                      {testResult && (
                        <p className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                          {testResult.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Badge variant="outline" className="text-xs">
                    #{rule.priority}
                  </Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {rules.length === 0 && (
        <Card className="p-8 text-center">
          <Zap className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <h4 className="font-medium text-gray-900 mb-2">
            No Rules Configured
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Add visibility rules to control when sections appear based on
            wedding timeline, package level, and client data.
          </p>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Sparkles className="h-4 w-4" />}
            onClick={() => addRuleFromTemplate(RULE_TEMPLATES[0])}
          >
            Add Your First Rule
          </Button>
        </Card>
      )}
    </div>
  );
}
