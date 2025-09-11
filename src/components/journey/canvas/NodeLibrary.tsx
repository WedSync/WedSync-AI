'use client';

import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import {
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  GitBranch,
  Clock,
  CheckCircle,
  Play,
  Stop,
  Users,
  Phone,
  Settings,
  Zap,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NodeLibraryProps {
  onNodeDrag: (nodeType: string, config: any) => void;
  tierLevel?: 'basic' | 'pro' | 'enterprise';
}

export interface NodeDefinition {
  type: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category:
    | 'communication'
    | 'data_collection'
    | 'scheduling'
    | 'logic'
    | 'system';
  tierRequired: 'basic' | 'pro' | 'enterprise';
  defaultConfig: any;
  color: string;
}

const nodeDefinitions: NodeDefinition[] = [
  // Communication Nodes
  {
    type: 'email',
    name: 'Email',
    description: 'Send automated email messages',
    icon: Mail,
    category: 'communication',
    tierRequired: 'basic',
    color: 'bg-blue-500',
    defaultConfig: {
      subject: '',
      template_id: null,
      delay_hours: 0,
      send_immediately: true,
    },
  },
  {
    type: 'sms',
    name: 'SMS',
    description: 'Send text messages',
    icon: MessageSquare,
    category: 'communication',
    tierRequired: 'pro',
    color: 'bg-green-500',
    defaultConfig: {
      message: '',
      template_id: null,
      delay_hours: 0,
    },
  },
  {
    type: 'phone',
    name: 'Phone Call',
    description: 'Schedule phone call reminder',
    icon: Phone,
    category: 'communication',
    tierRequired: 'pro',
    color: 'bg-yellow-500',
    defaultConfig: {
      call_type: 'reminder',
      notes: '',
    },
  },

  // Data Collection Nodes
  {
    type: 'form',
    name: 'Form Request',
    description: 'Send form to collect information',
    icon: FileText,
    category: 'data_collection',
    tierRequired: 'basic',
    color: 'bg-purple-500',
    defaultConfig: {
      form_type: 'custom',
      required_fields: [],
      reminder_enabled: true,
      reminder_days: 3,
    },
  },
  {
    type: 'review',
    name: 'Review Request',
    description: 'Request client review/feedback',
    icon: CheckCircle,
    category: 'data_collection',
    tierRequired: 'pro',
    color: 'bg-orange-500',
    defaultConfig: {
      review_type: 'service',
      platforms: ['google', 'facebook'],
    },
  },

  // Scheduling Nodes
  {
    type: 'timeline',
    name: 'Timeline Anchor',
    description: 'Schedule based on wedding/booking date',
    icon: Calendar,
    category: 'scheduling',
    tierRequired: 'basic',
    color: 'bg-indigo-500',
    defaultConfig: {
      anchor_type: 'wedding_date',
      offset: {
        value: 1,
        unit: 'weeks',
        direction: 'before',
      },
      business_hours: {
        enabled: true,
        start: '09:00',
        end: '17:00',
      },
      skip_weekends: true,
      timezone: 'America/New_York',
    },
  },
  {
    type: 'delay',
    name: 'Wait/Delay',
    description: 'Add delays between actions',
    icon: Timer,
    category: 'scheduling',
    tierRequired: 'basic',
    color: 'bg-gray-500',
    defaultConfig: {
      delay_type: 'fixed',
      duration: {
        value: 1,
        unit: 'days',
      },
    },
  },
  {
    type: 'meeting',
    name: 'Meeting Scheduler',
    description: 'Schedule meetings with clients',
    icon: Users,
    category: 'scheduling',
    tierRequired: 'pro',
    color: 'bg-teal-500',
    defaultConfig: {
      meeting_type: 'consultation',
      duration_minutes: 60,
      calendar_integration: true,
    },
  },

  // Logic Nodes
  {
    type: 'condition',
    name: 'Condition',
    description: 'Branch based on conditions',
    icon: GitBranch,
    category: 'logic',
    tierRequired: 'pro',
    color: 'bg-red-500',
    defaultConfig: {
      condition_type: 'field_value',
      field: '',
      operator: 'equals',
      value: '',
    },
  },
  {
    type: 'split',
    name: 'A/B Split',
    description: 'Split traffic for testing',
    icon: GitBranch,
    category: 'logic',
    tierRequired: 'enterprise',
    color: 'bg-pink-500',
    defaultConfig: {
      split_type: 'random',
      percentages: [50, 50],
      tracking_enabled: true,
    },
  },

  // System Nodes
  {
    type: 'start',
    name: 'Journey Start',
    description: 'Entry point for journey',
    icon: Play,
    category: 'system',
    tierRequired: 'basic',
    color: 'bg-emerald-500',
    defaultConfig: {
      trigger_type: 'manual',
      conditions: [],
    },
  },
  {
    type: 'end',
    name: 'Journey End',
    description: 'Exit point for journey',
    icon: Stop,
    category: 'system',
    tierRequired: 'basic',
    color: 'bg-slate-500',
    defaultConfig: {
      completion_actions: [],
      track_conversion: true,
    },
  },
];

// Draggable Node Component
interface DraggableNodeProps {
  node: NodeDefinition;
  isDisabled: boolean;
  onDrag: (nodeType: string, config: any) => void;
}

function DraggableNode({ node, isDisabled, onDrag }: DraggableNodeProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'new-node',
    item: {
      type: 'new-node',
      nodeType: node.type,
      defaultConfig: node.defaultConfig,
    },
    canDrag: !isDisabled,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const IconComponent = node.icon;

  return (
    <div
      ref={drag}
      className={cn(
        'flex flex-col items-center p-3 rounded-lg border-2 border-dashed cursor-grab transition-all duration-200',
        isDisabled
          ? 'opacity-50 cursor-not-allowed border-gray-300 bg-gray-50'
          : 'border-gray-200 bg-white hover:border-primary hover:shadow-md active:cursor-grabbing',
        isDragging && 'opacity-50 scale-95',
      )}
      title={
        isDisabled ? `Requires ${node.tierRequired} tier` : node.description
      }
    >
      <div
        className={cn(
          'w-8 h-8 rounded-md flex items-center justify-center mb-2',
          node.color,
          isDisabled && 'bg-gray-400',
        )}
      >
        <IconComponent className="w-4 h-4 text-white" />
      </div>
      <span className="text-xs font-medium text-center text-gray-700">
        {node.name}
      </span>
      {isDisabled && (
        <span className="text-xs text-gray-500 mt-1 capitalize">
          {node.tierRequired} Required
        </span>
      )}
    </div>
  );
}

export function NodeLibrary({
  onNodeDrag,
  tierLevel = 'basic',
}: NodeLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Nodes', icon: Settings },
    { id: 'communication', name: 'Communication', icon: Mail },
    { id: 'data_collection', name: 'Data Collection', icon: FileText },
    { id: 'scheduling', name: 'Scheduling', icon: Calendar },
    { id: 'logic', name: 'Logic', icon: GitBranch },
    { id: 'system', name: 'System', icon: Zap },
  ];

  const tierHierarchy = {
    basic: ['basic'],
    pro: ['basic', 'pro'],
    enterprise: ['basic', 'pro', 'enterprise'],
  };

  const allowedTiers = tierHierarchy[tierLevel];

  const filteredNodes = nodeDefinitions.filter((node) => {
    const categoryMatch =
      selectedCategory === 'all' || node.category === selectedCategory;
    return categoryMatch;
  });

  const groupedNodes = filteredNodes.reduce(
    (acc, node) => {
      const category = node.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(node);
      return acc;
    },
    {} as Record<string, NodeDefinition[]>,
  );

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2">Node Library</h3>
        <p className="text-sm text-gray-600">
          Drag nodes onto the canvas to build your journey
        </p>
        <div className="mt-2 text-xs">
          <span className="inline-block px-2 py-1 bg-primary/10 text-primary rounded capitalize">
            {tierLevel} Tier
          </span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                )}
              >
                <IconComponent className="w-4 h-4" />
                <span className="truncate">{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Node Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedCategory === 'all' ? (
          Object.entries(groupedNodes).map(([category, nodes]) => (
            <div key={category} className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3 capitalize">
                {category.replace('_', ' ')}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {nodes.map((node) => (
                  <DraggableNode
                    key={node.type}
                    node={node}
                    isDisabled={!allowedTiers.includes(node.tierRequired)}
                    onDrag={onNodeDrag}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredNodes.map((node) => (
              <DraggableNode
                key={node.type}
                node={node}
                isDisabled={!allowedTiers.includes(node.tierRequired)}
                onDrag={onNodeDrag}
              />
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <p className="mb-2">
            <strong>Tip:</strong> Start with a "Journey Start" node and connect
            other nodes to build your workflow.
          </p>
          <p>
            Timeline nodes automatically schedule actions based on important
            dates.
          </p>
        </div>
      </div>
    </div>
  );
}

export default NodeLibrary;
