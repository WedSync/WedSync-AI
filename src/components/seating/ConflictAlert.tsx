'use client';

import React, { useState } from 'react';
import { type Guest, type Table } from '@/types/seating';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronRight,
  X,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConflictDetails {
  type:
    | 'guest_conflict'
    | 'dietary_conflict'
    | 'accessibility_conflict'
    | 'capacity_exceeded';
  severity: 'high' | 'medium' | 'low';
  affectedGuests: Guest[];
  table: Table;
  message: string;
  suggestions?: string[];
}

interface ConflictAlertProps {
  conflicts: ConflictDetails[];
  onResolve?: (conflict: ConflictDetails, action: string) => void;
  onDismiss?: (conflict: ConflictDetails) => void;
  showSuggestions?: boolean;
  compact?: boolean;
  className?: string;
}

const severityStyles = {
  high: {
    alert: 'border-red-500 bg-red-50',
    icon: 'text-red-500',
    badge: 'bg-red-500 hover:bg-red-600',
    title: 'text-red-700',
  },
  medium: {
    alert: 'border-yellow-500 bg-yellow-50',
    icon: 'text-yellow-500',
    badge: 'bg-yellow-500 hover:bg-yellow-600',
    title: 'text-yellow-700',
  },
  low: {
    alert: 'border-blue-500 bg-blue-50',
    icon: 'text-blue-500',
    badge: 'bg-blue-500 hover:bg-blue-600',
    title: 'text-blue-700',
  },
};

const conflictTypeLabels = {
  guest_conflict: 'Guest Relationship Conflict',
  dietary_conflict: 'Dietary Requirements Conflict',
  accessibility_conflict: 'Accessibility Needs Conflict',
  capacity_exceeded: 'Table Over Capacity',
};

const conflictIcons = {
  guest_conflict: AlertTriangle,
  dietary_conflict: Users,
  accessibility_conflict: Users,
  capacity_exceeded: Users,
};

function ConflictItem({
  conflict,
  onResolve,
  onDismiss,
  showSuggestions,
  compact,
}: {
  conflict: ConflictDetails;
  onResolve?: (conflict: ConflictDetails, action: string) => void;
  onDismiss?: (conflict: ConflictDetails) => void;
  showSuggestions?: boolean;
  compact?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const styles = severityStyles[conflict.severity];
  const ConflictIcon = conflictIcons[conflict.type];

  return (
    <Alert className={cn(styles.alert, 'transition-all duration-200')}>
      <div className="flex items-start gap-3">
        <ConflictIcon className={cn('h-5 w-5 mt-0.5', styles.icon)} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <AlertTitle className={cn('text-sm font-semibold', styles.title)}>
              {conflictTypeLabels[conflict.type]} at {conflict.table.name}
            </AlertTitle>

            <div className="flex items-center gap-1">
              <Badge className={cn('text-xs', styles.badge)}>
                {conflict.severity}
              </Badge>

              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(conflict)}
                  className="h-6 w-6 p-0 hover:bg-white/50"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <AlertDescription className="text-sm text-slate-600 mt-1">
            {conflict.message}
          </AlertDescription>

          {/* Affected guests */}
          <div className="flex flex-wrap gap-1 mt-2">
            {conflict.affectedGuests.map((guest) => (
              <Badge key={guest.id} variant="outline" className="text-xs">
                {guest.name}
              </Badge>
            ))}
          </div>

          {/* Expandable suggestions */}
          {showSuggestions &&
            conflict.suggestions &&
            conflict.suggestions.length > 0 && (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 p-1 mt-2 text-xs hover:bg-white/50"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 mr-1" />
                    ) : (
                      <ChevronRight className="h-3 w-3 mr-1" />
                    )}
                    <Lightbulb className="h-3 w-3 mr-1" />
                    {isExpanded ? 'Hide' : 'Show'} suggestions (
                    {conflict.suggestions.length})
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-2">
                  <div className="bg-white/50 rounded-md p-3 space-y-2">
                    {conflict.suggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <ArrowRight className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-slate-700">
                          {suggestion}
                        </span>
                      </div>
                    ))}

                    {/* Quick action buttons */}
                    {onResolve && (
                      <div className="flex gap-2 mt-3 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs"
                          onClick={() => onResolve(conflict, 'auto_resolve')}
                        >
                          Auto-resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs"
                          onClick={() => onResolve(conflict, 'move_guests')}
                        >
                          Move guests
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs"
                          onClick={() => onResolve(conflict, 'ignore')}
                        >
                          Ignore
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
        </div>
      </div>
    </Alert>
  );
}

export function ConflictAlert({
  conflicts,
  onResolve,
  onDismiss,
  showSuggestions = true,
  compact = false,
  className,
}: ConflictAlertProps) {
  if (conflicts.length === 0) return null;

  // Group conflicts by severity
  const groupedConflicts = conflicts.reduce(
    (acc, conflict) => {
      if (!acc[conflict.severity]) {
        acc[conflict.severity] = [];
      }
      acc[conflict.severity].push(conflict);
      return acc;
    },
    {} as Record<string, ConflictDetails[]>,
  );

  const severityOrder: Array<keyof typeof groupedConflicts> = [
    'high',
    'medium',
    'low',
  ];
  const totalConflicts = conflicts.length;
  const highSeverityCount = groupedConflicts.high?.length || 0;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Summary header for multiple conflicts */}
      {totalConflicts > 1 && (
        <div className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">
              {totalConflicts} seating conflict{totalConflicts > 1 ? 's' : ''}{' '}
              detected
            </span>
            {highSeverityCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {highSeverityCount} critical
              </Badge>
            )}
          </div>

          {onResolve && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                conflicts.forEach((conflict) =>
                  onResolve(conflict, 'auto_resolve_all'),
                );
              }}
              className="text-xs"
            >
              Auto-resolve all
            </Button>
          )}
        </div>
      )}

      {/* Individual conflict alerts */}
      <div className="space-y-2">
        {severityOrder.map((severity) => {
          const severityConflicts = groupedConflicts[severity];
          if (!severityConflicts) return null;

          return severityConflicts.map((conflict, index) => (
            <ConflictItem
              key={`${conflict.type}-${conflict.table.id}-${index}`}
              conflict={conflict}
              onResolve={onResolve}
              onDismiss={onDismiss}
              showSuggestions={showSuggestions}
              compact={compact}
            />
          ));
        })}
      </div>
    </div>
  );
}

// Utility function to create conflict details
export function createConflictDetails(
  type: ConflictDetails['type'],
  severity: ConflictDetails['severity'],
  table: Table,
  affectedGuests: Guest[],
  customMessage?: string,
  suggestions?: string[],
): ConflictDetails {
  let message = customMessage;
  let defaultSuggestions = suggestions || [];

  // Generate default messages and suggestions based on conflict type
  switch (type) {
    case 'guest_conflict':
      if (!message) {
        message = `${affectedGuests.length} guests have relationship conflicts at this table.`;
      }
      if (defaultSuggestions.length === 0) {
        defaultSuggestions = [
          'Move conflicting guests to different tables',
          'Check guest relationship settings',
          'Consider creating a separate table for one of the groups',
        ];
      }
      break;

    case 'dietary_conflict':
      if (!message) {
        message = `Guests with conflicting dietary requirements are assigned to this table.`;
      }
      if (defaultSuggestions.length === 0) {
        defaultSuggestions = [
          'Group guests with similar dietary needs',
          'Ensure kitchen can accommodate all requirements at this table',
          'Consider creating specialized dietary tables',
        ];
      }
      break;

    case 'accessibility_conflict':
      if (!message) {
        message = `Table accessibility may not meet all guest requirements.`;
      }
      if (defaultSuggestions.length === 0) {
        defaultSuggestions = [
          'Move guests with accessibility needs to accessible tables',
          'Verify table position allows wheelchair access',
          'Check proximity to accessible facilities',
        ];
      }
      break;

    case 'capacity_exceeded':
      if (!message) {
        message = `This table has ${affectedGuests.length} guests but capacity is ${table.capacity}.`;
      }
      if (defaultSuggestions.length === 0) {
        defaultSuggestions = [
          'Move some guests to available tables',
          'Increase table capacity if space allows',
          'Create an additional table nearby',
        ];
      }
      break;
  }

  return {
    type,
    severity,
    affectedGuests,
    table,
    message: message || 'Unspecified conflict detected.',
    suggestions: defaultSuggestions,
  };
}
