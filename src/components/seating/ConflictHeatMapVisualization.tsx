'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle,
  Users,
  Eye,
  EyeOff,
  Zap,
  Heart,
  UserX,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConflictType {
  id: string;
  type:
    | 'relationship'
    | 'dietary'
    | 'accessibility'
    | 'age_group'
    | 'preference';
  severity: 'low' | 'medium' | 'high' | 'critical';
  guestIds: string[];
  tableId?: string;
  message: string;
  suggestion?: string;
  impact: number; // 1-10 scale
}

export interface Guest {
  id: string;
  name: string;
  email: string;
  dietaryRequirements?: string[];
  accessibilityNeeds?: string[];
  ageGroup?: 'child' | 'adult' | 'senior';
  category?: 'family' | 'friends' | 'work' | 'other';
  side?: 'bride' | 'groom' | 'mutual';
  tableId?: string;
  conflictsWith?: string[];
}

export interface Table {
  id: string;
  name: string;
  capacity: number;
  shape: 'round' | 'rectangle' | 'long-rectangle';
  guests: Guest[];
  x: number;
  y: number;
  isVip?: boolean;
}

interface ConflictHeatMapVisualizationProps {
  tables: Table[];
  guests: Guest[];
  conflicts: ConflictType[];
  onResolveConflict?: (
    conflictId: string,
    resolution: 'move_guest' | 'ignore' | 'manual',
  ) => void;
  className?: string;
}

const HEAT_MAP_COLORS = {
  none: 'bg-green-50 border-green-200 text-green-800',
  low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  medium: 'bg-orange-50 border-orange-200 text-orange-800',
  high: 'bg-red-50 border-red-200 text-red-800',
  critical: 'bg-red-100 border-red-300 text-red-900',
} as const;

const CONFLICT_ICONS = {
  relationship: UserX,
  dietary: Calendar,
  accessibility: Heart,
  age_group: Users,
  preference: Zap,
} as const;

const SEVERITY_COLORS = {
  low: 'text-yellow-600 bg-yellow-100',
  medium: 'text-orange-600 bg-orange-100',
  high: 'text-red-600 bg-red-100',
  critical: 'text-red-800 bg-red-200',
} as const;

export function ConflictHeatMapVisualization({
  tables,
  guests,
  conflicts,
  onResolveConflict,
  className,
}: ConflictHeatMapVisualizationProps) {
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const [showHeatMap, setShowHeatMap] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string[]>([
    'high',
    'critical',
  ]);

  // Calculate conflict intensity for each table
  const tableConflictData = useMemo(() => {
    const data: Record<
      string,
      {
        conflictLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
        conflictCount: number;
        conflicts: ConflictType[];
        totalImpact: number;
        guestsAffected: number;
      }
    > = {};

    tables.forEach((table) => {
      data[table.id] = {
        conflictLevel: 'none',
        conflictCount: 0,
        conflicts: [],
        totalImpact: 0,
        guestsAffected: 0,
      };
    });

    conflicts.forEach((conflict) => {
      if (conflict.tableId && data[conflict.tableId]) {
        data[conflict.tableId].conflicts.push(conflict);
        data[conflict.tableId].conflictCount++;
        data[conflict.tableId].totalImpact += conflict.impact;
        data[conflict.tableId].guestsAffected = Math.max(
          data[conflict.tableId].guestsAffected,
          conflict.guestIds.length,
        );

        // Determine overall conflict level for table
        if (conflict.severity === 'critical') {
          data[conflict.tableId].conflictLevel = 'critical';
        } else if (
          conflict.severity === 'high' &&
          data[conflict.tableId].conflictLevel !== 'critical'
        ) {
          data[conflict.tableId].conflictLevel = 'high';
        } else if (
          conflict.severity === 'medium' &&
          !['critical', 'high'].includes(data[conflict.tableId].conflictLevel)
        ) {
          data[conflict.tableId].conflictLevel = 'medium';
        } else if (
          conflict.severity === 'low' &&
          data[conflict.tableId].conflictLevel === 'none'
        ) {
          data[conflict.tableId].conflictLevel = 'low';
        }
      }
    });

    return data;
  }, [tables, conflicts]);

  // Filter conflicts by severity
  const filteredConflicts = useMemo(() => {
    return conflicts.filter((conflict) =>
      filterSeverity.includes(conflict.severity),
    );
  }, [conflicts, filterSeverity]);

  // Group conflicts by type
  const conflictsByType = useMemo(() => {
    return filteredConflicts.reduce(
      (acc, conflict) => {
        if (!acc[conflict.type]) acc[conflict.type] = [];
        acc[conflict.type].push(conflict);
        return acc;
      },
      {} as Record<string, ConflictType[]>,
    );
  }, [filteredConflicts]);

  const handleResolveConflict = useCallback(
    (conflictId: string, resolution: 'move_guest' | 'ignore' | 'manual') => {
      onResolveConflict?.(conflictId, resolution);
      setSelectedConflict(null);
    },
    [onResolveConflict],
  );

  return (
    <TooltipProvider>
      <div className={cn('space-y-6', className)}>
        {/* Header Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold">Conflict Analysis</h3>
            <Badge variant="outline">
              {filteredConflicts.length} active conflicts
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHeatMap(!showHeatMap)}
            >
              {showHeatMap ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {showHeatMap ? 'Hide Heat Map' : 'Show Heat Map'}
            </Button>
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Filter by severity:</span>
          {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
            <Button
              key={severity}
              variant={
                filterSeverity.includes(severity) ? 'default' : 'outline'
              }
              size="sm"
              onClick={() => {
                setFilterSeverity((prev) =>
                  prev.includes(severity)
                    ? prev.filter((s) => s !== severity)
                    : [...prev, severity],
                );
              }}
              className={cn(
                filterSeverity.includes(severity) && SEVERITY_COLORS[severity],
              )}
            >
              {severity.charAt(0).toUpperCase() + severity.slice(1)}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Heat Map Visualization */}
          {showHeatMap && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Table Heat Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {tables.map((table) => {
                    const conflictData = tableConflictData[table.id];
                    const IconComponent =
                      CONFLICT_ICONS[conflictData.conflicts[0]?.type] ||
                      AlertTriangle;

                    return (
                      <Tooltip key={table.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md',
                              HEAT_MAP_COLORS[conflictData.conflictLevel],
                            )}
                            onClick={() => {
                              if (conflictData.conflicts.length > 0) {
                                setSelectedConflict(
                                  conflictData.conflicts[0].id,
                                );
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">
                                  {table.name}
                                </div>
                                <div className="text-xs opacity-80">
                                  {table.guests.length}/{table.capacity} guests
                                </div>
                              </div>
                              {conflictData.conflictCount > 0 && (
                                <div className="flex items-center">
                                  <IconComponent className="h-4 w-4 mr-1" />
                                  <span className="text-xs font-bold">
                                    {conflictData.conflictCount}
                                  </span>
                                </div>
                              )}
                            </div>

                            {conflictData.conflictLevel !== 'none' && (
                              <div className="mt-2">
                                <div
                                  className={cn(
                                    'text-xs px-2 py-1 rounded',
                                    SEVERITY_COLORS[
                                      conflictData.conflictLevel as keyof typeof SEVERITY_COLORS
                                    ],
                                  )}
                                >
                                  {conflictData.conflictLevel.toUpperCase()}{' '}
                                  RISK
                                </div>
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="max-w-xs">
                            <div className="font-medium">{table.name}</div>
                            <div className="text-sm">
                              {conflictData.conflictCount === 0 ? (
                                'No conflicts detected'
                              ) : (
                                <>
                                  {conflictData.conflictCount} conflict
                                  {conflictData.conflictCount !== 1
                                    ? 's'
                                    : ''}{' '}
                                  detected
                                  <br />
                                  Impact Score:{' '}
                                  {conflictData.totalImpact.toFixed(1)}
                                  <br />
                                  {conflictData.guestsAffected} guest
                                  {conflictData.guestsAffected !== 1
                                    ? 's'
                                    : ''}{' '}
                                  affected
                                </>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 pt-4 border-t">
                  <div className="text-sm font-medium mb-3">
                    Conflict Intensity
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(HEAT_MAP_COLORS).map(([level, color]) => (
                      <div key={level} className="flex items-center">
                        <div
                          className={cn('w-4 h-4 rounded border mr-2', color)}
                        />
                        <span className="text-xs capitalize">{level}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Conflict List */}
          <Card>
            <CardHeader>
              <CardTitle>Conflict Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(conflictsByType).map(
                  ([type, typeConflicts]) => {
                    const IconComponent =
                      CONFLICT_ICONS[type as keyof typeof CONFLICT_ICONS];

                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center text-sm font-medium text-muted-foreground">
                          <IconComponent className="h-4 w-4 mr-2" />
                          {type.replace('_', ' ').toUpperCase()} (
                          {typeConflicts.length})
                        </div>

                        {typeConflicts.map((conflict) => {
                          const affectedGuests = guests.filter((g) =>
                            conflict.guestIds.includes(g.id),
                          );
                          const table = tables.find(
                            (t) => t.id === conflict.tableId,
                          );

                          return (
                            <div
                              key={conflict.id}
                              className={cn(
                                'p-3 rounded-lg border cursor-pointer transition-all',
                                selectedConflict === conflict.id
                                  ? 'border-blue-300 bg-blue-50'
                                  : 'border-border hover:border-muted-foreground',
                              )}
                              onClick={() => setSelectedConflict(conflict.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center mb-2">
                                    <Badge
                                      className={
                                        SEVERITY_COLORS[conflict.severity]
                                      }
                                    >
                                      {conflict.severity.toUpperCase()}
                                    </Badge>
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      Impact: {conflict.impact.toFixed(1)}
                                    </span>
                                  </div>

                                  <p className="text-sm mb-2">
                                    {conflict.message}
                                  </p>

                                  <div className="text-xs text-muted-foreground">
                                    <div>
                                      Guests:{' '}
                                      {affectedGuests
                                        .map((g) => g.name)
                                        .join(', ')}
                                    </div>
                                    {table && <div>Table: {table.name}</div>}
                                  </div>

                                  {conflict.suggestion && (
                                    <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                      💡 {conflict.suggestion}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {selectedConflict === conflict.id &&
                                onResolveConflict && (
                                  <div className="mt-3 pt-3 border-t flex space-x-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResolveConflict(
                                          conflict.id,
                                          'move_guest',
                                        );
                                      }}
                                    >
                                      Auto Fix
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResolveConflict(
                                          conflict.id,
                                          'ignore',
                                        );
                                      }}
                                    >
                                      Ignore
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResolveConflict(
                                          conflict.id,
                                          'manual',
                                        );
                                      }}
                                    >
                                      Manual Fix
                                    </Button>
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  },
                )}

                {filteredConflicts.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-green-600 mb-2">
                      <AlertTriangle className="h-12 w-12 mx-auto opacity-50" />
                    </div>
                    <div className="text-sm font-medium">
                      No conflicts found
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Your seating arrangement looks great!
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Conflict Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['critical', 'high', 'medium', 'low'] as const).map(
                (severity) => {
                  const count = conflicts.filter(
                    (c) => c.severity === severity,
                  ).length;
                  const percentage =
                    conflicts.length > 0 ? (count / conflicts.length) * 100 : 0;

                  return (
                    <div key={severity} className="text-center">
                      <div
                        className={cn(
                          'text-2xl font-bold',
                          severity === 'critical'
                            ? 'text-red-600'
                            : severity === 'high'
                              ? 'text-orange-600'
                              : severity === 'medium'
                                ? 'text-yellow-600'
                                : 'text-green-600',
                        )}
                      >
                        {count}
                      </div>
                      <div className="text-sm capitalize font-medium">
                        {severity}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
