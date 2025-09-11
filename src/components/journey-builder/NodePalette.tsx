'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Mail,
  Calendar,
  FileText,
  GitBranch,
  Star,
  Users,
  Split,
  PlayCircle,
  CheckCircle,
} from 'lucide-react';

interface DraggableNodeProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

function DraggableNode({ id, label, icon, description }: DraggableNodeProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-node-type={id}
      draggable="true"
      className={`
        p-3 bg-card border rounded-lg cursor-move transition-all
        hover:shadow-md hover:border-primary/50
        ${isDragging ? 'opacity-50 shadow-lg scale-105' : ''}
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="text-primary mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground">{label}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}

const nodeCategories = [
  {
    name: 'Triggers',
    nodes: [
      {
        id: 'start',
        label: 'Start',
        icon: <PlayCircle className="h-5 w-5" />,
        description: 'Journey entry point',
      },
      {
        id: 'end',
        label: 'End',
        icon: <CheckCircle className="h-5 w-5" />,
        description: 'Journey completion',
      },
    ],
  },
  {
    name: 'Communication',
    nodes: [
      {
        id: 'email',
        label: 'Email',
        icon: <Mail className="h-5 w-5" />,
        description: 'Send automated emails',
      },
      {
        id: 'form',
        label: 'Form',
        icon: <FileText className="h-5 w-5" />,
        description: 'Collect information',
      },
      {
        id: 'review',
        label: 'Review Request',
        icon: <Star className="h-5 w-5" />,
        description: 'Request client reviews',
      },
    ],
  },
  {
    name: 'Timing',
    nodes: [
      {
        id: 'timeline',
        label: 'Timeline',
        icon: <Calendar className="h-5 w-5" />,
        description: 'Wedding date milestone',
      },
      {
        id: 'meeting',
        label: 'Meeting',
        icon: <Users className="h-5 w-5" />,
        description: 'Schedule consultation',
      },
    ],
  },
  {
    name: 'Logic',
    nodes: [
      {
        id: 'condition',
        label: 'Condition',
        icon: <GitBranch className="h-5 w-5" />,
        description: 'If/then branching',
      },
      {
        id: 'split',
        label: 'Split Test',
        icon: <Split className="h-5 w-5" />,
        description: 'A/B testing paths',
      },
    ],
  },
];

export function NodePalette() {
  return (
    <div className="w-72 border-r bg-background p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Journey Nodes</h2>
      <div className="space-y-6">
        {nodeCategories.map((category) => (
          <div key={category.name}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {category.name}
            </h3>
            <div className="space-y-2">
              {category.nodes.map((node) => (
                <DraggableNode
                  key={node.id}
                  id={node.id}
                  label={node.label}
                  icon={node.icon}
                  description={node.description}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-3 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Tip:</strong> Drag nodes onto the canvas to build your journey
        </p>
      </div>
    </div>
  );
}
