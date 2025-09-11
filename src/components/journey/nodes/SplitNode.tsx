'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Shuffle,
  Plus,
  Trash2,
  Settings,
  TrendingUp,
  Users,
  Target,
  BarChart3,
} from 'lucide-react';

interface SplitBranch {
  id: string;
  name: string;
  percentage: number;
  targetNodeId: string;
  color: string;
  metadata?: {
    description?: string;
    targetAudience?: string;
    expectedOutcome?: string;
  };
}

interface SplitNodeData {
  id: string;
  name: string;
  type: 'random' | 'weighted' | 'rule_based';
  branches: SplitBranch[];
  fallbackNodeId?: string;
  analytics?: {
    trackConversions: boolean;
    conversionGoal?: string;
    trackingMetrics: string[];
  };
}

interface SplitNodeProps {
  node: {
    id: string;
    type: 'split';
    data: SplitNodeData;
    position: { x: number; y: number };
  };
  onUpdate: (nodeId: string, data: Partial<SplitNodeData>) => void;
  onConnect: (sourceId: string, targetId: string, branchId: string) => void;
  availableNodes: Array<{ id: string; label: string; type: string }>;
  isReadOnly?: boolean;
}

const BRANCH_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
];

export const SplitNode: React.FC<SplitNodeProps> = ({
  node,
  onUpdate,
  onConnect,
  availableNodes,
  isReadOnly = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingAnalytics, setIsEditingAnalytics] = useState(false);

  const handleNameChange = useCallback(
    (name: string) => {
      onUpdate(node.id, { name });
    },
    [node.id, onUpdate],
  );

  const handleTypeChange = useCallback(
    (type: SplitNodeData['type']) => {
      onUpdate(node.id, { type });
    },
    [node.id, onUpdate],
  );

  const addBranch = useCallback(() => {
    const existingBranches = node.data.branches || [];
    const newBranch: SplitBranch = {
      id: `branch_${Date.now()}`,
      name: `Branch ${existingBranches.length + 1}`,
      percentage: 0,
      targetNodeId: '',
      color: BRANCH_COLORS[existingBranches.length % BRANCH_COLORS.length],
    };

    onUpdate(node.id, {
      branches: [...existingBranches, newBranch],
    });
  }, [node.id, onUpdate, node.data.branches]);

  const updateBranch = useCallback(
    (branchId: string, updates: Partial<SplitBranch>) => {
      const updatedBranches = (node.data.branches || []).map((branch) =>
        branch.id === branchId ? { ...branch, ...updates } : branch,
      );

      onUpdate(node.id, { branches: updatedBranches });
    },
    [node.id, onUpdate, node.data.branches],
  );

  const removeBranch = useCallback(
    (branchId: string) => {
      const updatedBranches = (node.data.branches || []).filter(
        (branch) => branch.id !== branchId,
      );
      onUpdate(node.id, { branches: updatedBranches });
    },
    [node.id, onUpdate, node.data.branches],
  );

  const normalizeBranches = useCallback(() => {
    const branches = node.data.branches || [];
    if (branches.length === 0) return;

    const totalPercentage = branches.reduce(
      (sum, branch) => sum + branch.percentage,
      0,
    );
    if (totalPercentage === 100) return;

    const normalizedBranches = branches.map((branch) => ({
      ...branch,
      percentage: Math.round((branch.percentage / totalPercentage) * 100),
    }));

    // Adjust for rounding errors
    const newTotal = normalizedBranches.reduce(
      (sum, branch) => sum + branch.percentage,
      0,
    );
    if (newTotal !== 100 && normalizedBranches.length > 0) {
      normalizedBranches[0].percentage += 100 - newTotal;
    }

    onUpdate(node.id, { branches: normalizedBranches });
  }, [node.id, onUpdate, node.data.branches]);

  const evenlyDistributeBranches = useCallback(() => {
    const branches = node.data.branches || [];
    if (branches.length === 0) return;

    const percentage = Math.floor(100 / branches.length);
    const remainder = 100 % branches.length;

    const updatedBranches = branches.map((branch, index) => ({
      ...branch,
      percentage: percentage + (index < remainder ? 1 : 0),
    }));

    onUpdate(node.id, { branches: updatedBranches });
  }, [node.id, onUpdate, node.data.branches]);

  const updateAnalytics = useCallback(
    (analytics: SplitNodeData['analytics']) => {
      onUpdate(node.id, { analytics });
    },
    [node.id, onUpdate],
  );

  const totalPercentage = (node.data.branches || []).reduce(
    (sum, branch) => sum + branch.percentage,
    0,
  );
  const isValidSplit = totalPercentage === 100;

  return (
    <Card
      className={`w-80 border-2 ${isExpanded ? 'border-purple-300' : 'border-gray-200'} bg-white shadow-lg`}
    >
      {/* Node Header */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-purple-600" />
            <span className="font-semibold text-gray-800">Split Test</span>
            {node.data.analytics?.trackConversions && (
              <Badge
                variant="secondary"
                className="text-xs bg-blue-100 text-blue-800"
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                Tracked
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Badge
              variant={isValidSplit ? 'default' : 'destructive'}
              className="text-xs"
            >
              {totalPercentage}%
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Input
          value={node.data.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Split test name..."
          className="text-sm"
          disabled={isReadOnly}
        />
      </div>

      {/* Split Type & Quick Stats */}
      <div className="p-3 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <Select
            value={node.data.type}
            onValueChange={handleTypeChange}
            disabled={isReadOnly}
          >
            <SelectTrigger className="w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="random">Random</SelectItem>
              <SelectItem value="weighted">Weighted</SelectItem>
              <SelectItem value="rule_based">Rule Based</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-xs text-gray-600">
            {(node.data.branches || []).length} branches
          </div>
        </div>

        {/* Branch Preview */}
        <div className="space-y-1">
          {(node.data.branches || []).slice(0, 3).map((branch) => (
            <div key={branch.id} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: branch.color }}
              />
              <span className="flex-1 truncate">{branch.name}</span>
              <span className="font-mono">{branch.percentage}%</span>
            </div>
          ))}
          {(node.data.branches || []).length > 3 && (
            <div className="text-xs text-gray-400 text-center">
              +{(node.data.branches || []).length - 3} more...
            </div>
          )}
        </div>
      </div>

      {/* Expanded Configuration */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Branch Management */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Branches</Label>
              <div className="flex gap-1">
                {!isReadOnly && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={evenlyDistributeBranches}
                      className="text-xs"
                    >
                      <Target className="h-3 w-3 mr-1" />
                      Even
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addBranch}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {(node.data.branches || []).map((branch, index) => (
                <BranchEditor
                  key={branch.id}
                  branch={branch}
                  availableNodes={availableNodes}
                  onUpdate={(updates) => updateBranch(branch.id, updates)}
                  onRemove={() => removeBranch(branch.id)}
                  isReadOnly={isReadOnly}
                  canRemove={(node.data.branches || []).length > 1}
                />
              ))}
            </div>

            {!isValidSplit && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                <div className="flex items-center gap-1 text-amber-800">
                  <Target className="h-3 w-3" />
                  <span>
                    Total percentage is {totalPercentage}%. Should be 100%.
                  </span>
                </div>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={normalizeBranches}
                    className="mt-1 text-xs"
                  >
                    Auto-fix percentages
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Fallback Configuration */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Fallback Node
            </Label>
            <Select
              value={node.data.fallbackNodeId || ''}
              onValueChange={(value) =>
                onUpdate(node.id, { fallbackNodeId: value })
              }
              disabled={isReadOnly}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select fallback node..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {availableNodes.map((availableNode) => (
                  <SelectItem key={availableNode.id} value={availableNode.id}>
                    {availableNode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-gray-500 mt-1">
              Used when branch selection fails
            </div>
          </div>

          {/* Analytics Configuration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Analytics</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingAnalytics(!isEditingAnalytics)}
                disabled={isReadOnly}
                className={
                  node.data.analytics?.trackConversions ? 'bg-blue-50' : ''
                }
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                {node.data.analytics?.trackConversions ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            {isEditingAnalytics && (
              <AnalyticsConfig
                analytics={node.data.analytics}
                onChange={updateAnalytics}
                isReadOnly={isReadOnly}
              />
            )}
          </div>
        </div>
      )}

      {/* Connection Summary */}
      <div className="p-2 border-t bg-gray-50">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Branches:</span>
            <span>{(node.data.branches || []).length}</span>
          </div>
          <div className="flex justify-between">
            <span>Total:</span>
            <span className={isValidSplit ? 'text-green-600' : 'text-red-600'}>
              {totalPercentage}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * Branch Editor Component
 */
const BranchEditor: React.FC<{
  branch: SplitBranch;
  availableNodes: Array<{ id: string; label: string; type: string }>;
  onUpdate: (updates: Partial<SplitBranch>) => void;
  onRemove: () => void;
  isReadOnly: boolean;
  canRemove: boolean;
}> = ({
  branch,
  availableNodes,
  onUpdate,
  onRemove,
  isReadOnly,
  canRemove,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded p-3 bg-white space-y-2">
      {/* Branch Header */}
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full border-2 border-white shadow"
          style={{ backgroundColor: branch.color }}
        />
        <Input
          value={branch.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 text-sm"
          placeholder="Branch name..."
          disabled={isReadOnly}
        />
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="0"
            max="100"
            value={branch.percentage}
            onChange={(e) => onUpdate({ percentage: Number(e.target.value) })}
            className="w-16 text-sm text-center"
            disabled={isReadOnly}
          />
          <span className="text-xs text-gray-500">%</span>
        </div>
        {canRemove && !isReadOnly && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Target Node Selection */}
      <div className="grid grid-cols-2 gap-2 items-center">
        <Label className="text-xs text-gray-600">Target Node:</Label>
        <Select
          value={branch.targetNodeId}
          onValueChange={(value) => onUpdate({ targetNodeId: value })}
          disabled={isReadOnly}
        >
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {availableNodes.map((node) => (
              <SelectItem key={node.id} value={node.id}>
                {node.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Percentage Slider */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Weight</span>
          <span>{branch.percentage}%</span>
        </div>
        <Slider
          value={[branch.percentage]}
          onValueChange={([value]) => onUpdate({ percentage: value })}
          max={100}
          step={1}
          className="w-full"
          disabled={isReadOnly}
        />
      </div>

      {/* Expandable Metadata */}
      {!isReadOnly && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-xs"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </Button>
      )}

      {isExpanded && (
        <div className="space-y-2 pt-2 border-t">
          <div>
            <Label className="text-xs">Description</Label>
            <Input
              value={branch.metadata?.description || ''}
              onChange={(e) =>
                onUpdate({
                  metadata: { ...branch.metadata, description: e.target.value },
                })
              }
              placeholder="Branch description..."
              className="text-xs"
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label className="text-xs">Target Audience</Label>
            <Input
              value={branch.metadata?.targetAudience || ''}
              onChange={(e) =>
                onUpdate({
                  metadata: {
                    ...branch.metadata,
                    targetAudience: e.target.value,
                  },
                })
              }
              placeholder="Who is this for..."
              className="text-xs"
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label className="text-xs">Expected Outcome</Label>
            <Input
              value={branch.metadata?.expectedOutcome || ''}
              onChange={(e) =>
                onUpdate({
                  metadata: {
                    ...branch.metadata,
                    expectedOutcome: e.target.value,
                  },
                })
              }
              placeholder="What do you expect..."
              className="text-xs"
              disabled={isReadOnly}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Analytics Configuration Component
 */
const AnalyticsConfig: React.FC<{
  analytics: SplitNodeData['analytics'];
  onChange: (analytics: SplitNodeData['analytics']) => void;
  isReadOnly: boolean;
}> = ({ analytics, onChange, isReadOnly }) => {
  const currentAnalytics = analytics || {
    trackConversions: false,
    trackingMetrics: [],
  };

  const toggleTracking = () => {
    onChange({
      ...currentAnalytics,
      trackConversions: !currentAnalytics.trackConversions,
    });
  };

  const updateConversionGoal = (conversionGoal: string) => {
    onChange({
      ...currentAnalytics,
      conversionGoal,
    });
  };

  const toggleMetric = (metric: string) => {
    const currentMetrics = currentAnalytics.trackingMetrics || [];
    const updatedMetrics = currentMetrics.includes(metric)
      ? currentMetrics.filter((m) => m !== metric)
      : [...currentMetrics, metric];

    onChange({
      ...currentAnalytics,
      trackingMetrics: updatedMetrics,
    });
  };

  const availableMetrics = [
    'click_through_rate',
    'conversion_rate',
    'time_to_convert',
    'bounce_rate',
    'engagement_score',
    'completion_rate',
  ];

  return (
    <div className="space-y-3 border rounded p-3 bg-blue-50">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Track Conversions</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTracking}
          disabled={isReadOnly}
          className={currentAnalytics.trackConversions ? 'bg-green-100' : ''}
        >
          {currentAnalytics.trackConversions ? 'On' : 'Off'}
        </Button>
      </div>

      {currentAnalytics.trackConversions && (
        <>
          <div>
            <Label className="text-sm">Conversion Goal</Label>
            <Input
              value={currentAnalytics.conversionGoal || ''}
              onChange={(e) => updateConversionGoal(e.target.value)}
              placeholder="e.g., booking_completed"
              className="text-sm"
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label className="text-sm mb-2 block">Tracking Metrics</Label>
            <div className="grid grid-cols-2 gap-1">
              {availableMetrics.map((metric) => (
                <Button
                  key={metric}
                  variant={
                    currentAnalytics.trackingMetrics?.includes(metric)
                      ? 'default'
                      : 'outline'
                  }
                  size="sm"
                  onClick={() => toggleMetric(metric)}
                  disabled={isReadOnly}
                  className="text-xs justify-start"
                >
                  {metric.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SplitNode;
