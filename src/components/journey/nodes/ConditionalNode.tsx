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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  GitBranch,
  Plus,
  Trash2,
  Settings,
  Eye,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  Condition,
  ConditionGroup,
  ConditionalBranch,
} from '@/lib/journey/branching/conditionalEngine';

interface ConditionalNodeProps {
  node: {
    id: string;
    type: 'conditional';
    data: ConditionalBranch;
    position: { x: number; y: number };
  };
  onUpdate: (nodeId: string, data: Partial<ConditionalBranch>) => void;
  onConnect: (
    sourceId: string,
    targetId: string,
    type: 'true' | 'false',
  ) => void;
  availableNodes: Array<{ id: string; label: string; type: string }>;
  variables: Record<string, any>;
  isReadOnly?: boolean;
}

export const ConditionalNode: React.FC<ConditionalNodeProps> = ({
  node,
  onUpdate,
  onConnect,
  availableNodes,
  variables,
  isReadOnly = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewResult, setPreviewResult] = useState<boolean | null>(null);
  const [isEditingConditions, setIsEditingConditions] = useState(false);

  const handleConditionUpdate = useCallback(
    (conditionGroup: ConditionGroup) => {
      onUpdate(node.id, { conditionGroup });
    },
    [node.id, onUpdate],
  );

  const handlePathUpdate = useCallback(
    (type: 'true' | 'false', nodeId: string) => {
      const updates =
        type === 'true' ? { truePath: nodeId } : { falsePath: nodeId };
      onUpdate(node.id, updates);
    },
    [node.id, onUpdate],
  );

  const handleABTestToggle = useCallback(() => {
    const currentConfig = node.data.abTestConfig;
    onUpdate(node.id, {
      abTestConfig: {
        enabled: !currentConfig?.enabled,
        splitPercentage: currentConfig?.splitPercentage || 50,
        variants: currentConfig?.variants || [],
      },
    });
  }, [node.id, onUpdate, node.data.abTestConfig]);

  const previewCondition = useCallback(async () => {
    // Simulate condition evaluation for preview
    try {
      // This would normally call the ConditionalEngine
      // For now, we'll simulate the result
      const mockResult = Math.random() > 0.5;
      setPreviewResult(mockResult);

      setTimeout(() => setPreviewResult(null), 3000);
    } catch (error) {
      console.error('Preview failed:', error);
    }
  }, []);

  return (
    <Card
      className={`w-80 border-2 ${isExpanded ? 'border-blue-300' : 'border-gray-200'} bg-white shadow-lg`}
    >
      {/* Node Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-800">Conditional</span>
            {node.data.abTestConfig?.enabled && (
              <Badge
                variant="secondary"
                className="text-xs bg-green-100 text-green-800"
              >
                A/B Test
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {previewResult !== null &&
              (previewResult ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              ))}
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
          onChange={(e) => onUpdate(node.id, { name: e.target.value })}
          placeholder="Branch name..."
          className="text-sm"
          disabled={isReadOnly}
        />
      </div>

      {/* Quick Preview */}
      <div className="p-3 bg-gray-50">
        <div className="text-xs text-gray-600 mb-1">Quick Preview:</div>
        <div className="text-sm font-mono bg-white p-2 rounded border text-gray-800">
          {node.data.conditionGroup ? (
            <ConditionGroupPreview
              group={node.data.conditionGroup}
              variables={variables}
            />
          ) : (
            <span className="text-gray-400">No conditions set</span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={previewCondition}
            className="text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </Button>
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingConditions(true)}
              className="text-xs"
            >
              <Settings className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Configuration */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Condition Builder */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Conditions</Label>
            {isEditingConditions ? (
              <ConditionBuilder
                conditionGroup={node.data.conditionGroup}
                variables={variables}
                onChange={handleConditionUpdate}
                onClose={() => setIsEditingConditions(false)}
              />
            ) : (
              <div className="border rounded p-3 bg-gray-50">
                <ConditionGroupDisplay group={node.data.conditionGroup} />
              </div>
            )}
          </div>

          {/* Path Configuration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium mb-1 block text-green-700">
                True Path
              </Label>
              <Select
                value={node.data.truePath}
                onValueChange={(value) => handlePathUpdate('true', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select next node..." />
                </SelectTrigger>
                <SelectContent>
                  {availableNodes.map((availableNode) => (
                    <SelectItem key={availableNode.id} value={availableNode.id}>
                      {availableNode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1 block text-red-700">
                False Path
              </Label>
              <Select
                value={node.data.falsePath}
                onValueChange={(value) => handlePathUpdate('false', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select next node..." />
                </SelectTrigger>
                <SelectContent>
                  {availableNodes.map((availableNode) => (
                    <SelectItem key={availableNode.id} value={availableNode.id}>
                      {availableNode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* A/B Testing Configuration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">A/B Testing</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleABTestToggle}
                disabled={isReadOnly}
                className={node.data.abTestConfig?.enabled ? 'bg-green-50' : ''}
              >
                {node.data.abTestConfig?.enabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            {node.data.abTestConfig?.enabled && (
              <ABTestConfig
                config={node.data.abTestConfig}
                availableNodes={availableNodes}
                onChange={(config) =>
                  onUpdate(node.id, { abTestConfig: config })
                }
                isReadOnly={isReadOnly}
              />
            )}
          </div>
        </div>
      )}

      {/* Connection Points */}
      <div className="p-2 border-t bg-gray-50 flex justify-between text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>True: {node.data.truePath || 'Not set'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span>False: {node.data.falsePath || 'Not set'}</span>
        </div>
      </div>
    </Card>
  );
};

/**
 * Condition Group Preview Component
 */
const ConditionGroupPreview: React.FC<{
  group: ConditionGroup;
  variables: Record<string, any>;
}> = ({ group, variables }) => {
  if (!group || !group.conditions || group.conditions.length === 0) {
    return <span className="text-gray-400">No conditions</span>;
  }

  return (
    <div className="space-y-1">
      {group.conditions.map((condition, index) => (
        <div key={index} className="flex items-center gap-1 text-xs">
          {index > 0 && (
            <span className="text-blue-600 font-semibold px-1">
              {group.operator}
            </span>
          )}
          {'field' in condition ? (
            <span>
              <span className="text-purple-600">{condition.field}</span>
              <span className="text-gray-500 mx-1">{condition.operator}</span>
              <span className="text-green-600">
                {JSON.stringify(condition.value)}
              </span>
            </span>
          ) : (
            <span className="text-gray-500">[Nested Group]</span>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Condition Group Display Component
 */
const ConditionGroupDisplay: React.FC<{ group: ConditionGroup }> = ({
  group,
}) => {
  if (!group) {
    return (
      <div className="text-gray-400 text-sm">No conditions configured</div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {group.operator}
        </Badge>
        <span className="text-sm text-gray-600">
          {group.conditions.length} condition(s)
        </span>
      </div>

      {group.conditions.map((condition, index) => (
        <div key={index} className="pl-4 border-l-2 border-gray-200">
          {'field' in condition ? (
            <div className="text-sm space-y-1">
              <div className="font-mono text-xs bg-white p-1 rounded border">
                {condition.field} {condition.operator}{' '}
                {JSON.stringify(condition.value)}
              </div>
              <div className="text-xs text-gray-500">
                Type: {condition.dataType}
              </div>
            </div>
          ) : (
            <ConditionGroupDisplay group={condition} />
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Condition Builder Component
 */
const ConditionBuilder: React.FC<{
  conditionGroup: ConditionGroup;
  variables: Record<string, any>;
  onChange: (group: ConditionGroup) => void;
  onClose: () => void;
}> = ({ conditionGroup, variables, onChange, onClose }) => {
  const [editingGroup, setEditingGroup] = useState<ConditionGroup>(
    conditionGroup || {
      id: `group_${Date.now()}`,
      operator: 'AND',
      conditions: [],
    },
  );

  const addCondition = () => {
    const newCondition: Condition = {
      id: `condition_${Date.now()}`,
      type: 'comparison',
      field: '',
      operator: 'equals',
      value: '',
      dataType: 'string',
    };

    setEditingGroup({
      ...editingGroup,
      conditions: [...editingGroup.conditions, newCondition],
    });
  };

  const removeCondition = (index: number) => {
    setEditingGroup({
      ...editingGroup,
      conditions: editingGroup.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const updatedConditions = [...editingGroup.conditions];
    updatedConditions[index] = {
      ...updatedConditions[index],
      ...updates,
    } as Condition;
    setEditingGroup({
      ...editingGroup,
      conditions: updatedConditions,
    });
  };

  const handleSave = () => {
    onChange(editingGroup);
    onClose();
  };

  return (
    <div className="space-y-4 border rounded p-4 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Condition Builder</h3>
        <div className="flex gap-2">
          <Select
            value={editingGroup.operator}
            onValueChange={(value: 'AND' | 'OR') =>
              setEditingGroup({ ...editingGroup, operator: value })
            }
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {editingGroup.conditions.map(
          (condition, index) =>
            'field' in condition && (
              <ConditionEditor
                key={condition.id}
                condition={condition}
                variables={variables}
                onChange={(updates) => updateCondition(index, updates)}
                onRemove={() => removeCondition(index)}
              />
            ),
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={addCondition}>
          <Plus className="h-4 w-4 mr-1" />
          Add Condition
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Individual Condition Editor
 */
const ConditionEditor: React.FC<{
  condition: Condition;
  variables: Record<string, any>;
  onChange: (updates: Partial<Condition>) => void;
  onRemove: () => void;
}> = ({ condition, variables, onChange, onRemove }) => {
  const availableFields = Object.keys(variables);

  return (
    <div className="grid grid-cols-12 gap-2 items-center p-3 border rounded bg-gray-50">
      {/* Field */}
      <div className="col-span-3">
        <Select
          value={condition.field}
          onValueChange={(value) => onChange({ field: value })}
        >
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="Field..." />
          </SelectTrigger>
          <SelectContent>
            {availableFields.map((field) => (
              <SelectItem key={field} value={field}>
                {field}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Operator */}
      <div className="col-span-3">
        <Select
          value={condition.operator}
          onValueChange={(value: Condition['operator']) =>
            onChange({ operator: value })
          }
        >
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals">Equals</SelectItem>
            <SelectItem value="not_equals">Not Equals</SelectItem>
            <SelectItem value="greater_than">Greater Than</SelectItem>
            <SelectItem value="less_than">Less Than</SelectItem>
            <SelectItem value="contains">Contains</SelectItem>
            <SelectItem value="starts_with">Starts With</SelectItem>
            <SelectItem value="ends_with">Ends With</SelectItem>
            <SelectItem value="exists">Exists</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Value */}
      <div className="col-span-4">
        <Input
          value={condition.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="Value..."
          className="text-xs"
        />
      </div>

      {/* Data Type */}
      <div className="col-span-1">
        <Select
          value={condition.dataType}
          onValueChange={(value: Condition['dataType']) =>
            onChange({ dataType: value })
          }
        >
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="string">Text</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="boolean">Boolean</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="array">Array</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Remove */}
      <div className="col-span-1">
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

/**
 * A/B Test Configuration Component
 */
const ABTestConfig: React.FC<{
  config: ConditionalBranch['abTestConfig'];
  availableNodes: Array<{ id: string; label: string; type: string }>;
  onChange: (config: ConditionalBranch['abTestConfig']) => void;
  isReadOnly: boolean;
}> = ({ config, availableNodes, onChange, isReadOnly }) => {
  if (!config) return null;

  const addVariant = () => {
    onChange({
      ...config,
      variants: [...(config.variants || []), ''],
    });
  };

  const updateVariant = (index: number, nodeId: string) => {
    const newVariants = [...(config.variants || [])];
    newVariants[index] = nodeId;
    onChange({ ...config, variants: newVariants });
  };

  const removeVariant = (index: number) => {
    onChange({
      ...config,
      variants: (config.variants || []).filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-3 border rounded p-3 bg-blue-50">
      <div>
        <Label className="text-sm">Split Percentage</Label>
        <Input
          type="number"
          min="0"
          max="100"
          value={config.splitPercentage}
          onChange={(e) =>
            onChange({ ...config, splitPercentage: Number(e.target.value) })
          }
          disabled={isReadOnly}
          className="w-20 text-sm"
        />
        <span className="text-xs text-gray-600 ml-2">
          % of users see variants
        </span>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm">Variants</Label>
          {!isReadOnly && (
            <Button variant="outline" size="sm" onClick={addVariant}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {(config.variants || []).map((variantId, index) => (
            <div key={index} className="flex gap-2">
              <Select
                value={variantId}
                onValueChange={(value) => updateVariant(index, value)}
                disabled={isReadOnly}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select node..." />
                </SelectTrigger>
                <SelectContent>
                  {availableNodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVariant(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConditionalNode;
