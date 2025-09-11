'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Calendar,
  Clock,
  Mail,
  FileText,
  MessageSquare,
  CreditCard,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface TimelineNode {
  id: string;
  title: string;
  description: string;
  scheduledDate: Date;
  status: 'pending' | 'active' | 'completed' | 'delayed';
  type: 'email' | 'form' | 'reminder' | 'meeting' | 'payment';
  clientId: string;
  clientName: string;
  weddingDate: Date;
  isAutomated: boolean;
  triggerCondition?: string;
  daysBeforeWedding?: number;
  content?: string;
}

interface NodeEditorProps {
  node: TimelineNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (node: TimelineNode) => void;
  onDelete?: (nodeId: string) => void;
}

const nodeTypes = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'form', label: 'Form', icon: FileText },
  { value: 'reminder', label: 'Reminder', icon: Clock },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'payment', label: 'Payment', icon: CreditCard },
];

const triggerTemplates = [
  { value: 'days-before', label: 'Days before wedding' },
  { value: 'form-completion', label: 'After form completion' },
  { value: 'payment-received', label: 'After payment received' },
  { value: 'manual-trigger', label: 'Manual trigger only' },
];

export default function NodeEditor({
  node,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: NodeEditorProps) {
  const [editedNode, setEditedNode] = useState<TimelineNode | null>(null);
  const [daysSlider, setDaysSlider] = useState([30]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (node) {
      setEditedNode({ ...node });
      setDaysSlider([node.daysBeforeWedding || 30]);
      setIsDirty(false);
    } else {
      // Create new node template
      setEditedNode({
        id: `node_${Date.now()}`,
        title: '',
        description: '',
        scheduledDate: new Date(),
        status: 'pending',
        type: 'email',
        clientId: '',
        clientName: '',
        weddingDate: new Date(),
        isAutomated: true,
        daysBeforeWedding: 30,
      });
      setDaysSlider([30]);
      setIsDirty(false);
    }
  }, [node]);

  const handleFieldChange = (field: string, value: any) => {
    if (!editedNode) return;

    setEditedNode((prev) => ({
      ...prev!,
      [field]: value,
    }));
    setIsDirty(true);
  };

  const handleDaysChange = (value: number[]) => {
    setDaysSlider(value);
    handleFieldChange('daysBeforeWedding', value[0]);

    // Auto-calculate scheduled date
    if (editedNode?.weddingDate) {
      const scheduledDate = new Date(editedNode.weddingDate);
      scheduledDate.setDate(scheduledDate.getDate() - value[0]);
      handleFieldChange('scheduledDate', scheduledDate);
    }
  };

  const handleSave = () => {
    if (editedNode && editedNode.title.trim()) {
      onSave(editedNode);
      setIsDirty(false);
      onClose();
    }
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = nodeTypes.find((t) => t.value === type);
    const Icon = typeConfig?.icon || Mail;
    return <Icon className="w-5 h-5" />;
  };

  if (!isOpen || !editedNode) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-white rounded-t-xl sm:rounded-xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              {getTypeIcon(editedNode.type)}
              <h2 className="text-lg font-semibold">
                {node ? 'Edit Timeline Node' : 'New Timeline Node'}
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Form content */}
          <div className="overflow-y-auto max-h-[70vh] p-4 space-y-6">
            {/* Node Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={editedNode.type}
                onValueChange={(value) => handleFieldChange('type', value)}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {nodeTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={editedNode.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="e.g., Welcome Email"
                className="h-12 text-base"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedNode.description}
                onChange={(e) =>
                  handleFieldChange('description', e.target.value)
                }
                placeholder="Brief description of this node's purpose"
                className="min-h-[80px] text-base resize-none"
              />
            </div>

            {/* Trigger Configuration */}
            <div className="space-y-4">
              <Label>Trigger Configuration</Label>

              {/* Days before wedding slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Days before wedding
                  </span>
                  <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {daysSlider[0]} days
                  </span>
                </div>
                <Slider
                  value={daysSlider}
                  onValueChange={handleDaysChange}
                  max={365}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1 day</span>
                  <span>1 year</span>
                </div>
              </div>

              {/* Calculated trigger date */}
              {editedNode.scheduledDate && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Will trigger on:</span>
                    <span className="text-blue-700">
                      {editedNode.scheduledDate.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Content/Template */}
            {editedNode.type === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="content">Email Content</Label>
                <Textarea
                  id="content"
                  value={editedNode.content || ''}
                  onChange={(e) => handleFieldChange('content', e.target.value)}
                  placeholder="Email content or template reference"
                  className="min-h-[100px] text-base resize-none"
                />
              </div>
            )}

            {/* Automation toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium">Automated Execution</span>
                <p className="text-sm text-gray-600">
                  {editedNode.isAutomated
                    ? 'Will trigger automatically'
                    : 'Requires manual activation'}
                </p>
              </div>
              <Button
                variant={editedNode.isAutomated ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  handleFieldChange('isAutomated', !editedNode.isAutomated)
                }
              >
                {editedNode.isAutomated ? 'Auto' : 'Manual'}
              </Button>
            </div>
          </div>

          {/* Footer actions */}
          <div className="border-t bg-gray-50 p-4 flex gap-3">
            {onDelete && node && (
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete(node.id);
                  onClose();
                }}
                className="flex-1"
              >
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!editedNode.title.trim() || !isDirty}
              className="flex-2"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
