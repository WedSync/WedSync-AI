'use client';

import React, { useState } from 'react';
import { type Table } from '@/types/seating';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Square,
  Circle,
  Rectangle,
  Copy,
  Trash2,
  Settings,
  Users,
  RotateCcw,
  Save,
  Download,
  Upload,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableToolbarProps {
  tables: Table[];
  selectedTableId?: string;
  onAddTable: (shape: Table['shape'], capacity: number, name?: string) => void;
  onDuplicateTable: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onDeleteAllTables: () => void;
  onAutoArrange?: () => void;
  onSaveLayout?: () => void;
  onLoadLayout?: (file: File) => void;
  onExportLayout?: () => void;
  readonly?: boolean;
  className?: string;
}

const TABLE_SHAPES = [
  { value: 'round' as const, label: 'Round', icon: Circle, capacity: 8 },
  { value: 'square' as const, label: 'Square', icon: Square, capacity: 8 },
  {
    value: 'rectangular' as const,
    label: 'Rectangular',
    icon: Rectangle,
    capacity: 12,
  },
];

const PRESET_CAPACITIES = [2, 4, 6, 8, 10, 12, 16, 20];

export function TableToolbar({
  tables,
  selectedTableId,
  onAddTable,
  onDuplicateTable,
  onDeleteTable,
  onDeleteAllTables,
  onAutoArrange,
  onSaveLayout,
  onLoadLayout,
  onExportLayout,
  readonly = false,
  className,
}: TableToolbarProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTableShape, setNewTableShape] = useState<Table['shape']>('round');
  const [newTableCapacity, setNewTableCapacity] = useState(8);
  const [newTableName, setNewTableName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const selectedTable = selectedTableId
    ? tables.find((t) => t.id === selectedTableId)
    : null;
  const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);
  const totalTables = tables.length;

  // Handle add table
  const handleAddTable = () => {
    const tableName = newTableName.trim() || `Table ${totalTables + 1}`;
    onAddTable(newTableShape, newTableCapacity, tableName);

    // Reset form
    setNewTableName('');
    setNewTableCapacity(8);
    setNewTableShape('round');
    setIsAddDialogOpen(false);
  };

  // Handle file upload for layout import
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onLoadLayout) {
      onLoadLayout(file);
    }
    // Reset input
    event.target.value = '';
  };

  // Handle bulk delete
  const handleDeleteAll = () => {
    onDeleteAllTables();
    setShowDeleteConfirm(false);
  };

  // Quick add functions for common table types
  const quickAddTable = (shape: Table['shape'], capacity: number) => {
    const tableName = `Table ${totalTables + 1}`;
    onAddTable(shape, capacity, tableName);
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 p-3 bg-white border rounded-lg shadow-sm',
        className,
      )}
    >
      {/* Stats */}
      <div className="flex items-center gap-4 mr-4">
        <Badge variant="outline" className="text-xs">
          <Square className="h-3 w-3 mr-1" />
          {totalTables} tables
        </Badge>
        <Badge variant="outline" className="text-xs">
          <Users className="h-3 w-3 mr-1" />
          {totalCapacity} seats
        </Badge>
      </div>

      <div className="h-6 w-px bg-slate-200" />

      {/* Quick add buttons */}
      {!readonly && (
        <>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 mr-1">Quick add:</span>
            {TABLE_SHAPES.map((shape) => {
              const ShapeIcon = shape.icon;
              return (
                <Button
                  key={shape.value}
                  variant="outline"
                  size="sm"
                  onClick={() => quickAddTable(shape.value, shape.capacity)}
                  className="h-7 w-7 p-0"
                  title={`Add ${shape.label} table (${shape.capacity} seats)`}
                >
                  <ShapeIcon className="h-3 w-3" />
                </Button>
              );
            })}
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* Advanced add button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Table
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Table</DialogTitle>
                <DialogDescription>
                  Configure the new table's shape, capacity, and name.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="table-name">Table Name</Label>
                  <Input
                    id="table-name"
                    placeholder={`Table ${totalTables + 1}`}
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    maxLength={30}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="table-shape">Table Shape</Label>
                  <Select
                    value={newTableShape}
                    onValueChange={(value: Table['shape']) =>
                      setNewTableShape(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TABLE_SHAPES.map((shape) => {
                        const ShapeIcon = shape.icon;
                        return (
                          <SelectItem key={shape.value} value={shape.value}>
                            <div className="flex items-center gap-2">
                              <ShapeIcon className="h-4 w-4" />
                              {shape.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="table-capacity">Capacity</Label>
                  <div className="flex gap-2">
                    <Select
                      value={newTableCapacity.toString()}
                      onValueChange={(value) =>
                        setNewTableCapacity(parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESET_CAPACITIES.map((capacity) => (
                          <SelectItem
                            key={capacity}
                            value={capacity.toString()}
                          >
                            {capacity} guests
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={newTableCapacity}
                      onChange={(e) =>
                        setNewTableCapacity(
                          Math.max(1, parseInt(e.target.value) || 1),
                        )
                      }
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddTable}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Table
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Selected table actions */}
      {selectedTable && !readonly && (
        <>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 mr-1">Selected:</span>
            <Badge variant="secondary" className="text-xs">
              {selectedTable.name}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDuplicateTable(selectedTable.id)}
              className="h-7 w-7 p-0"
              title="Duplicate table"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDeleteTable(selectedTable.id)}
              className="h-7 w-7 p-0 hover:bg-red-50 hover:border-red-300"
              title="Delete table"
            >
              <Trash2 className="h-3 w-3 text-red-600" />
            </Button>
          </div>
        </>
      )}

      {/* Layout actions */}
      <div className="h-6 w-px bg-slate-200" />
      <div className="flex items-center gap-1">
        {/* Auto-arrange */}
        {onAutoArrange && !readonly && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAutoArrange}
            disabled={tables.length === 0}
            title="Auto-arrange tables"
          >
            <Wand2 className="h-4 w-4 mr-1" />
            Auto-arrange
          </Button>
        )}

        {/* Save/Load/Export */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              Layout
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-2">
              {onSaveLayout && !readonly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSaveLayout}
                  className="w-full justify-start"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Layout
                </Button>
              )}

              {onLoadLayout && !readonly && (
                <div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="layout-upload"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      document.getElementById('layout-upload')?.click()
                    }
                    className="w-full justify-start"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Layout
                  </Button>
                </div>
              )}

              {onExportLayout && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExportLayout}
                  className="w-full justify-start"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Layout
                </Button>
              )}

              {tables.length > 0 && !readonly && (
                <>
                  <div className="border-t pt-2">
                    <Dialog
                      open={showDeleteConfirm}
                      onOpenChange={setShowDeleteConfirm}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete All Tables
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete All Tables</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete all {totalTables}{' '}
                            tables? This action cannot be undone and will
                            unassign all guests.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDeleteAll}
                          >
                            Delete All
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Reset view */}
      {tables.length > 0 && (
        <>
          <div className="h-6 w-px bg-slate-200" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // This would trigger a reset view action in the parent component
              // For now, we'll just indicate the functionality
            }}
            title="Reset view to show all tables"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
