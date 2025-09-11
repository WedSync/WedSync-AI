'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ScalingPolicy,
  ScalingPolicyCreate,
  ScalingPolicyUpdate,
  PolicyGroup,
  ScalingTrigger,
  ScalingAction,
  WeddingAwareRule,
  PolicyPerformance,
} from '@/types/scalability';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Switch,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Modal,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui';
import {
  Plus,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Heart,
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Zap,
  Calendar,
} from 'lucide-react';

interface ScalingPoliciesManagerProps {
  policies: ScalingPolicy[];
  onPolicyCreate: (policy: ScalingPolicyCreate) => void;
  onPolicyUpdate: (policy: ScalingPolicyUpdate) => void;
  onPolicyToggle: (policyId: string, enabled: boolean) => void;
}

/**
 * ScalingPoliciesManager
 * Comprehensive auto-scaling policy management interface
 * - Create, edit, and manage scaling policies
 * - Wedding-aware rule configuration
 * - Policy performance monitoring
 * - Template-based policy creation
 */
export const ScalingPoliciesManager: React.FC<ScalingPoliciesManagerProps> = ({
  policies,
  onPolicyCreate,
  onPolicyUpdate,
  onPolicyToggle,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ScalingPolicy | null>(
    null,
  );
  const [selectedPolicyGroup, setSelectedPolicyGroup] =
    useState<PolicyGroup>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [showPolicyHistory, setShowPolicyHistory] = useState<string | null>(
    null,
  );

  // Filter policies by group
  const filteredPolicies = useMemo(() => {
    return policies
      .filter((policy) => {
        switch (selectedPolicyGroup) {
          case 'wedding':
            return policy.weddingAwareRules.length > 0;
          case 'general':
            return policy.weddingAwareRules.length === 0;
          case 'emergency':
            return policy.priority >= 8; // High priority policies
          default:
            return true;
        }
      })
      .sort((a, b) => b.priority - a.priority); // Sort by priority
  }, [policies, selectedPolicyGroup]);

  // Get policy group counts
  const policyGroupCounts = useMemo(() => {
    return {
      all: policies.length,
      wedding: policies.filter((p) => p.weddingAwareRules.length > 0).length,
      general: policies.filter((p) => p.weddingAwareRules.length === 0).length,
      emergency: policies.filter((p) => p.priority >= 8).length,
    };
  }, [policies]);

  // Event handlers
  const handlePolicyDuplicate = useCallback(
    (policy: ScalingPolicy) => {
      const duplicatedPolicy: ScalingPolicyCreate = {
        name: `${policy.name} (Copy)`,
        service: policy.service,
        description: `Copy of ${policy.description}`,
        triggers: policy.triggers.map(({ id, ...trigger }) => trigger),
        actions: policy.actions.map(({ id, ...action }) => action),
        weddingAwareRules: policy.weddingAwareRules.map(
          ({ id, ...rule }) => rule,
        ),
        cooldownPeriod: policy.cooldownPeriod,
        priority: policy.priority,
      };
      onPolicyCreate(duplicatedPolicy);
    },
    [onPolicyCreate],
  );

  const handlePolicyDelete = useCallback((policyId: string) => {
    setShowDeleteConfirm(policyId);
  }, []);

  const confirmDelete = useCallback(() => {
    if (showDeleteConfirm) {
      // Would call delete API
      console.log('Deleting policy:', showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  }, [showDeleteConfirm]);

  const showPolicyHistoryModal = useCallback((policyId: string) => {
    setShowPolicyHistory(policyId);
  }, []);

  const getWeddingAwarePolicyTemplates = useCallback(() => {
    return [
      {
        name: 'Saturday Wedding Peak',
        description: 'Auto-scale for Saturday wedding traffic peaks',
        triggers: [
          {
            metric: 'requests' as const,
            condition: '>=' as const,
            threshold: 5000,
            duration: 300,
            aggregation: 'avg' as const,
            windowSize: 300,
          },
        ],
        weddingAwareRules: [
          {
            name: 'Saturday Peak Hours',
            condition: 'saturday_peak' as const,
            parameters: {
              hoursBeforeWedding: 2,
              timeWindow: { start: '10:00', end: '18:00' },
              dayOfWeek: [6], // Saturday
            },
            scalingModifier: {
              capacityMultiplier: 2.5,
              priorityBoost: 3,
              cooldownReduction: 0.5,
            },
            enabled: true,
          },
        ],
      },
      {
        name: 'Wedding Season Scale',
        description: 'Proactive scaling during wedding season months',
        weddingAwareRules: [
          {
            name: 'Peak Wedding Season',
            condition: 'wedding_season' as const,
            parameters: {
              seasonMultiplier: 1.8,
              weddingCountThreshold: 50,
            },
            scalingModifier: {
              capacityMultiplier: 1.8,
              priorityBoost: 2,
              cooldownReduction: 0.3,
            },
            enabled: true,
          },
        ],
      },
    ];
  }, []);

  return (
    <Card className="scaling-policies-manager">
      <div className="policies-header p-6 pb-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Auto-scaling Policies
          </h3>

          <div className="header-controls flex items-center space-x-4">
            {/* Policy Group Filter */}
            <div className="policy-group-filter flex items-center bg-gray-100 rounded-lg p-1">
              {[
                { key: 'all', label: 'All', count: policyGroupCounts.all },
                {
                  key: 'wedding',
                  label: 'Wedding',
                  count: policyGroupCounts.wedding,
                  icon: <Heart className="w-3 h-3" />,
                },
                {
                  key: 'general',
                  label: 'General',
                  count: policyGroupCounts.general,
                },
                {
                  key: 'emergency',
                  label: 'Emergency',
                  count: policyGroupCounts.emergency,
                  icon: <AlertTriangle className="w-3 h-3" />,
                },
              ].map((group) => (
                <Button
                  key={group.key}
                  variant={
                    selectedPolicyGroup === group.key ? 'default' : 'ghost'
                  }
                  size="sm"
                  onClick={() =>
                    setSelectedPolicyGroup(group.key as PolicyGroup)
                  }
                  className="px-3 py-1 text-xs"
                >
                  <div className="flex items-center space-x-1">
                    {group.icon}
                    <span>{group.label}</span>
                    <Badge variant="secondary" className="text-xs ml-1">
                      {group.count}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="create-policy-btn bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Policy
            </Button>
          </div>
        </div>
      </div>

      {/* Policies Grid */}
      <div className="policies-grid p-6">
        {filteredPolicies.length === 0 ? (
          <div className="empty-state text-center py-12">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              No policies found
            </h4>
            <p className="text-gray-600 mb-6">
              Create your first auto-scaling policy to start managing
              infrastructure automatically.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Policy
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPolicies.map((policy) => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                onEdit={() => setEditingPolicy(policy)}
                onToggle={(enabled) => onPolicyToggle(policy.id, enabled)}
                onDuplicate={() => handlePolicyDuplicate(policy)}
                onDelete={() => handlePolicyDelete(policy.id)}
                onViewHistory={() => showPolicyHistoryModal(policy.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Policy Modal */}
      {showCreateModal && (
        <PolicyCreateModal
          onSave={(policy) => {
            onPolicyCreate(policy);
            setShowCreateModal(false);
          }}
          onCancel={() => setShowCreateModal(false)}
          weddingAwareTemplates={getWeddingAwarePolicyTemplates()}
        />
      )}

      {/* Edit Policy Modal */}
      {editingPolicy && (
        <PolicyEditModal
          policy={editingPolicy}
          onSave={(policy) => {
            onPolicyUpdate(policy);
            setEditingPolicy(null);
          }}
          onCancel={() => setEditingPolicy(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Dialog open={true} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Scaling Policy</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Are you sure you want to delete this scaling policy? This action
                cannot be undone.
              </p>
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-800">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Deleting this policy may affect automatic scaling behavior.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Policy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

// PolicyCard Component
const PolicyCard: React.FC<{
  policy: ScalingPolicy;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
}> = ({ policy, onEdit, onToggle, onDuplicate, onDelete, onViewHistory }) => {
  const isWeddingAware = policy.weddingAwareRules.length > 0;
  const isHighPriority = policy.priority >= 8;

  const recentEvents = useMemo(() => {
    // Mock recent events - would come from API
    return [
      {
        id: '1',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        action: 'scale_up',
        success: true,
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        action: 'scale_down',
        success: true,
      },
    ];
  }, [policy.id]);

  const formatRelativeTime = (date: Date): string => {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  return (
    <Card
      className={`policy-card transition-all hover:shadow-md ${
        policy.enabled
          ? 'border-l-4 border-l-blue-500'
          : 'border-l-4 border-l-gray-300'
      } ${isHighPriority ? 'ring-2 ring-red-200' : ''}`}
    >
      <div className="p-4">
        {/* Policy Header */}
        <div className="policy-header flex items-start justify-between mb-3">
          <div className="policy-info flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-gray-900">{policy.name}</h4>
              {isWeddingAware && (
                <Badge className="bg-pink-100 text-pink-800 border-pink-200">
                  <Heart className="w-3 h-3 mr-1" />
                  Wedding-Aware
                </Badge>
              )}
              {isHighPriority && (
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  <Zap className="w-3 h-3 mr-1" />
                  High Priority
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{policy.service}</p>
          </div>

          <div className="policy-controls flex items-center space-x-2">
            <Switch
              checked={policy.enabled}
              onCheckedChange={onToggle}
              size="sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Policy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onViewHistory}>
                  <Clock className="w-4 h-4 mr-2" />
                  View History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Policy Description */}
        <p className="text-sm text-gray-700 mb-4">{policy.description}</p>

        {/* Policy Content */}
        <div className="policy-content space-y-4">
          {/* Triggers Summary */}
          <div className="policy-triggers">
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Triggers ({policy.triggers.length})
            </h5>
            <div className="space-y-1">
              {policy.triggers.slice(0, 2).map((trigger, index) => (
                <div
                  key={index}
                  className="trigger-summary bg-gray-50 rounded p-2 text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <Target className="w-3 h-3 text-blue-500" />
                    <span className="font-medium capitalize">
                      {trigger.metric.replace('_', ' ')}
                    </span>
                    <span className="text-gray-500">{trigger.condition}</span>
                    <span className="font-mono text-blue-600">
                      {trigger.threshold}
                    </span>
                  </div>
                  <div className="text-gray-500 mt-1">
                    Duration: {trigger.duration}s, Window: {trigger.windowSize}s
                  </div>
                </div>
              ))}
              {policy.triggers.length > 2 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{policy.triggers.length - 2} more triggers
                </div>
              )}
            </div>
          </div>

          {/* Wedding-Aware Rules */}
          {isWeddingAware && (
            <div className="wedding-aware-rules">
              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                <Heart className="w-3 h-3 inline mr-1" />
                Wedding Rules ({policy.weddingAwareRules.length})
              </h5>
              <div className="space-y-1">
                {policy.weddingAwareRules.map((rule, index) => (
                  <div
                    key={index}
                    className="wedding-rule bg-pink-50 rounded p-2 text-xs border border-pink-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-pink-800">
                        {rule.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {rule.scalingModifier.capacityMultiplier}x capacity
                      </Badge>
                    </div>
                    <div className="text-pink-600 mt-1 capitalize">
                      {rule.condition.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          <div className="policy-performance">
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Performance
            </h5>
            <div className="performance-metrics grid grid-cols-3 gap-2">
              <div className="metric text-center">
                <div
                  className={`text-lg font-bold ${
                    policy.performance.accuracy > 90
                      ? 'text-green-600'
                      : policy.performance.accuracy > 75
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {policy.performance.accuracy.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">Accuracy</div>
              </div>
              <div className="metric text-center">
                <div
                  className={`text-lg font-bold ${
                    policy.performance.averageResponseTime < 30
                      ? 'text-green-600'
                      : policy.performance.averageResponseTime < 60
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {policy.performance.averageResponseTime.toFixed(0)}s
                </div>
                <div className="text-xs text-gray-500">Avg Response</div>
              </div>
              <div className="metric text-center">
                <div
                  className={`text-lg font-bold ${
                    policy.performance.costImpact < 5
                      ? 'text-green-600'
                      : policy.performance.costImpact < 15
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {policy.performance.costImpact > 0 ? '+' : ''}
                  {policy.performance.costImpact.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">Cost Impact</div>
              </div>
            </div>
          </div>

          {/* Recent Events */}
          {recentEvents.length > 0 && (
            <div className="recent-events">
              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Recent Activity
              </h5>
              <div className="events-list space-y-1">
                {recentEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className="event-item flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      {event.action === 'scale_up' ? (
                        <TrendingUp className="w-3 h-3 text-blue-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-orange-500" />
                      )}
                      <span className="capitalize">
                        {event.action.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                      {event.success ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Policy Footer */}
        <div className="policy-footer mt-4 pt-3 border-t text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span>Priority: {policy.priority}/10</span>
              <span>Cooldown: {policy.cooldownPeriod}s</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>Updated {formatRelativeTime(policy.lastModified)}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// PolicyCreateModal Component
const PolicyCreateModal: React.FC<{
  onSave: (policy: ScalingPolicyCreate) => void;
  onCancel: () => void;
  weddingAwareTemplates: any[];
}> = ({ onSave, onCancel, weddingAwareTemplates }) => {
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Scaling Policy</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Template Selection */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Switch checked={useTemplate} onCheckedChange={setUseTemplate} />
              <label className="text-sm font-medium">
                Use Wedding-Aware Template
              </label>
            </div>

            {useTemplate && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weddingAwareTemplates.map((template, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-all ${
                      selectedTemplate === template
                        ? 'ring-2 ring-blue-500 border-blue-300'
                        : ''
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Heart className="w-4 h-4 text-pink-500" />
                        <h4 className="font-medium">{template.name}</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        {template.description}
                      </p>
                      <div className="mt-2 text-xs text-gray-500">
                        {template.triggers?.length || 0} triggers,{' '}
                        {template.weddingAwareRules?.length || 0} wedding rules
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Manual Policy Creation Form would go here */}
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Policy creation form would be implemented here</p>
            <p className="text-sm">
              Including triggers, actions, and wedding-aware rules configuration
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              // Mock policy creation
              const mockPolicy: ScalingPolicyCreate = {
                name: selectedTemplate?.name || 'New Policy',
                service: 'web',
                description:
                  selectedTemplate?.description || 'New scaling policy',
                triggers: selectedTemplate?.triggers || [],
                actions: [],
                weddingAwareRules: selectedTemplate?.weddingAwareRules || [],
                cooldownPeriod: 300,
                priority: 5,
              };
              onSave(mockPolicy);
            }}
          >
            Create Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// PolicyEditModal Component
const PolicyEditModal: React.FC<{
  policy: ScalingPolicy;
  onSave: (policy: ScalingPolicyUpdate) => void;
  onCancel: () => void;
}> = ({ policy, onSave, onCancel }) => {
  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Policy: {policy.name}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="text-center py-8 text-gray-500">
            <Edit className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Policy editing form would be implemented here</p>
            <p className="text-sm">
              Including all policy configuration options
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              // Mock policy update
              onSave({
                id: policy.id,
                name: policy.name,
                description: policy.description,
              });
            }}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScalingPoliciesManager;
