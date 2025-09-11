'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSwipeable } from 'react-swipeable';

interface TimelineNode {
  id: string;
  title: string;
  description: string;
  scheduledDate: Date;
  actualDate?: Date;
  status: 'pending' | 'active' | 'completed' | 'delayed';
  type: 'email' | 'form' | 'reminder' | 'meeting' | 'payment';
  clientId: string;
  clientName: string;
  weddingDate: Date;
  isAutomated: boolean;
  triggerCondition?: string;
}

interface TimelineNodesProps {
  nodes: TimelineNode[];
  onNodeEdit: (node: TimelineNode) => void;
  onNodeToggle: (nodeId: string, active: boolean) => void;
  offlineMode?: boolean;
}

export default function TimelineNodes({
  nodes,
  onNodeEdit,
  onNodeToggle,
  offlineMode = false,
}: TimelineNodesProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [swipedNode, setSwipedNode] = useState<string | null>(null);

  // Touch-friendly swipe handlers
  const createSwipeHandlers = (nodeId: string) =>
    useSwipeable({
      onSwipedLeft: () => setSwipedNode(nodeId),
      onSwipedRight: () => setSwipedNode(null),
      trackMouse: true,
      preventScrollOnSwipe: true,
    });

  // Mobile-optimized status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'active':
        return 'bg-blue-500';
      case 'delayed':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'active':
        return <Play className="w-5 h-5 text-blue-600" />;
      case 'delayed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Pause className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getDaysUntilTrigger = (scheduledDate: Date) => {
    const today = new Date();
    const diffTime = scheduledDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days`;
  };

  return (
    <div className="space-y-3 p-4 pb-20">
      {/* Offline indicator */}
      {offlineMode && (
        <div className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg text-sm mb-4">
          📱 Offline mode - Changes will sync when online
        </div>
      )}

      <AnimatePresence>
        {nodes.map((node) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative"
            {...createSwipeHandlers(node.id)}
          >
            <Card
              className={`p-4 border-l-4 ${getStatusColor(node.status).replace('bg-', 'border-')} 
              ${selectedNode === node.id ? 'ring-2 ring-blue-500' : ''}
              ${swipedNode === node.id ? 'transform -translate-x-4' : ''}
              transition-all duration-200 touch-pan-y`}
              onClick={() =>
                setSelectedNode(selectedNode === node.id ? null : node.id)
              }
            >
              {/* Node header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(node.status)}
                    <h3 className="font-semibold text-lg leading-tight">
                      {node.title}
                    </h3>
                    {node.isAutomated && (
                      <Badge variant="secondary" className="text-xs">
                        Auto
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {node.description}
                  </p>
                </div>
              </div>

              {/* Client info */}
              <div className="flex items-center gap-3 mb-3 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{node.clientName}</span>
                </div>
                <div className="text-gray-500">
                  Wedding: {formatDate(node.weddingDate)}
                </div>
              </div>

              {/* Timing info */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>
                    Triggers: {getDaysUntilTrigger(node.scheduledDate)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-gray-600">
                    {formatDate(node.scheduledDate)}
                  </div>
                  {node.actualDate && (
                    <div className="text-xs text-green-600">
                      Sent: {formatDate(node.actualDate)}
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {selectedNode === node.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 pt-4 border-t"
                  >
                    {node.triggerCondition && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-700">
                          Trigger:
                        </span>
                        <p className="text-sm text-gray-600 mt-1">
                          {node.triggerCondition}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNodeEdit(node);
                        }}
                        className="flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          node.status === 'active' ? 'destructive' : 'default'
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          onNodeToggle(node.id, node.status !== 'active');
                        }}
                        className="flex-1"
                      >
                        {node.status === 'active' ? 'Pause' : 'Activate'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* Swipe action indicator */}
            <AnimatePresence>
              {swipedNode === node.id && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
                >
                  Edit
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>

      {nodes.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No timeline nodes configured</p>
          <p className="text-sm">
            Add automated actions to your client journeys
          </p>
        </div>
      )}
    </div>
  );
}
