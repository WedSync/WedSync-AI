'use client';

import React, { useState } from 'react';
import { type Guest, type Table } from '@/types/seating';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Save,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeatingArrangement {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
}

interface SeatingControlsProps {
  guests: Guest[];
  tables: Table[];
  currentArrangement?: SeatingArrangement;
  arrangements?: SeatingArrangement[];
  conflicts?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  isSaving?: boolean;
  isAutoSaving?: boolean;
  lastSaved?: Date;
  onSave?: (name: string, setAsDefault?: boolean) => void;
  onLoad?: (arrangementId: string) => void;
  onDelete?: (arrangementId: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onReset?: () => void;
  onToggleAutoSave?: () => void;
  onTogglePreview?: () => void;
  showPreview?: boolean;
  readonly?: boolean;
  className?: string;
}

export function SeatingControls({
  guests,
  tables,
  currentArrangement,
  arrangements = [],
  conflicts = 0,
  canUndo = false,
  canRedo = false,
  isSaving = false,
  isAutoSaving = false,
  lastSaved,
  onSave,
  onLoad,
  onDelete,
  onUndo,
  onRedo,
  onReset,
  onToggleAutoSave,
  onTogglePreview,
  showPreview = false,
  readonly = false,
  className,
}: SeatingControlsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [arrangementName, setArrangementName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [showArrangements, setShowArrangements] = useState(false);

  // Calculate statistics
  const assignedGuests = guests.filter((g) => g.assignedTableId).length;
  const totalGuests = guests.length;
  const assignmentProgress =
    totalGuests > 0 ? (assignedGuests / totalGuests) * 100 : 0;
  const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);
  const utilizationRate =
    totalCapacity > 0 ? (assignedGuests / totalCapacity) * 100 : 0;

  // Status indicators
  const getStatusColor = () => {
    if (conflicts > 0) return 'text-red-600';
    if (assignedGuests === totalGuests) return 'text-green-600';
    if (assignedGuests > 0) return 'text-yellow-600';
    return 'text-slate-600';
  };

  const getStatusText = () => {
    if (conflicts > 0)
      return `${conflicts} conflict${conflicts > 1 ? 's' : ''}`;
    if (assignedGuests === totalGuests) return 'Complete';
    if (assignedGuests > 0) return 'In progress';
    return 'Not started';
  };

  const handleSave = () => {
    if (onSave && arrangementName.trim()) {
      onSave(arrangementName.trim(), setAsDefault);
      setArrangementName('');
      setSetAsDefault(false);
      setShowSaveDialog(false);
    }
  };

  const formatLastSaved = () => {
    if (!lastSaved) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return lastSaved.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 p-4 bg-white border rounded-lg shadow-sm',
        className,
      )}
    >
      {/* Status and Progress */}
      <div className="flex items-center gap-4">
        {/* Current arrangement */}
        {currentArrangement && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {currentArrangement.name}
            </Badge>
            {currentArrangement.isDefault && (
              <Badge className="text-xs bg-blue-500">Default</Badge>
            )}
          </div>
        )}

        {/* Progress indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium">
              {assignedGuests}/{totalGuests}
            </span>
            <div className="w-24">
              <Progress value={assignmentProgress} className="h-2" />
            </div>
            <span className="text-xs text-slate-500">
              {Math.round(assignmentProgress)}%
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <div className={cn('flex items-center gap-1', getStatusColor())}>
              {conflicts > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : assignedGuests === totalGuests ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>
          </div>
        </div>

        {/* Capacity utilization */}
        <div className="text-xs text-slate-600">
          Capacity: {Math.round(utilizationRate)}% ({assignedGuests}/
          {totalCapacity})
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* History controls */}
        {!readonly && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo last action"
              className="h-8 w-8 p-0"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo last action"
              className="h-8 w-8 p-0"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            {onReset && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                title="Reset arrangement"
                className="h-8 w-8 p-0"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Preview toggle */}
        {onTogglePreview && (
          <Button
            variant="outline"
            size="sm"
            onClick={onTogglePreview}
            title={showPreview ? 'Hide preview' : 'Show preview'}
            className="h-8 w-8 p-0"
          >
            {showPreview ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Auto-save toggle */}
        {onToggleAutoSave && !readonly && (
          <Button
            variant={isAutoSaving ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleAutoSave}
            title={isAutoSaving ? 'Auto-save enabled' : 'Auto-save disabled'}
            className="h-8 w-8 p-0"
          >
            {isAutoSaving ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Save status */}
        {!readonly && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {isSaving ? (
              <span>Saving...</span>
            ) : isAutoSaving ? (
              <span>Auto-save: {formatLastSaved()}</span>
            ) : (
              <span>Last saved: {formatLastSaved()}</span>
            )}
          </div>
        )}

        {/* Arrangements menu */}
        {arrangements.length > 0 && (
          <Popover open={showArrangements} onOpenChange={setShowArrangements}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Arrangements ({arrangements.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Saved Arrangements</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {arrangements.map((arrangement) => (
                    <div
                      key={arrangement.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {arrangement.name}
                          </span>
                          {arrangement.isDefault && (
                            <Badge className="text-xs bg-blue-500">
                              Default
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          Updated {arrangement.updatedAt.toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onLoad?.(arrangement.id)}
                          className="h-6 px-2 text-xs"
                        >
                          Load
                        </Button>
                        {!arrangement.isDefault && onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(arrangement.id)}
                            className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Save button */}
        {onSave && !readonly && (
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                disabled={isSaving || tables.length === 0}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save Arrangement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Save Seating Arrangement</DialogTitle>
                <DialogDescription>
                  Save the current table layout and guest assignments for future
                  use.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="arrangement-name">Arrangement Name</Label>
                  <Input
                    id="arrangement-name"
                    placeholder="e.g., Final Seating Plan"
                    value={arrangementName}
                    onChange={(e) => setArrangementName(e.target.value)}
                    maxLength={50}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="set-default"
                    checked={setAsDefault}
                    onChange={(e) => setSetAsDefault(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="set-default" className="text-sm">
                    Set as default arrangement
                  </Label>
                </div>

                {/* Current stats */}
                <div className="p-3 bg-slate-50 rounded-lg text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span>Tables:</span>
                    <span>{tables.length}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span>Assigned guests:</span>
                    <span>
                      {assignedGuests}/{totalGuests}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Conflicts:</span>
                    <span
                      className={
                        conflicts > 0 ? 'text-red-600' : 'text-green-600'
                      }
                    >
                      {conflicts}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!arrangementName.trim() || isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Arrangement'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
