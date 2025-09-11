'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Share,
  Download,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert } from '@/components/ui/alert';
import type {
  MobileSeatingDashboardProps,
  SeatingStats,
  QuickAction,
} from '@/types/mobile-seating';

/**
 * MobileSeatingDashboard - WS-154 Mobile Overview Component
 *
 * Quick stats and actions for mobile seating interface
 * Features:
 * - Seating completion progress
 * - Conflict alerts
 * - Quick action buttons
 * - Recent activity feed
 * - Touch-optimized layout
 */
export const MobileSeatingDashboard: React.FC<MobileSeatingDashboardProps> = ({
  arrangement,
  stats,
  quickActions,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [recentActivity, setRecentActivity] = useState<string[]>([]);

  // Mock data - replace with real API calls
  const defaultStats: SeatingStats = stats || {
    totalGuests: 150,
    seatedGuests: 142,
    unseatedGuests: 8,
    totalTables: 18,
    emptyTables: 2,
    conflictCount: 3,
    completionPercentage: 95,
  };

  const defaultQuickActions: QuickAction[] = quickActions || [
    {
      id: 'auto-assign',
      label: 'Auto Assign',
      icon: <Settings className="w-4 h-4" />,
      action: () => handleAutoAssign(),
      disabled: defaultStats.unseatedGuests === 0,
    },
    {
      id: 'share',
      label: 'Share',
      icon: <Share className="w-4 h-4" />,
      action: () => handleShare(),
    },
    {
      id: 'export',
      label: 'Export',
      icon: <Download className="w-4 h-4" />,
      action: () => handleExport(),
    },
  ];

  useEffect(() => {
    // Mock recent activity
    setRecentActivity([
      'Moved John Smith to Table 5',
      'Resolved dietary conflict at Table 8',
      'Added plus-one for Sarah Johnson',
    ]);
  }, []);

  const handleAutoAssign = async () => {
    try {
      // Call auto-assignment API
      const response = await fetch('/api/seating/auto-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          arrangementId: arrangement?.id,
          preferences: {
            keepFamiliesTogether: true,
            separateExes: true,
            respectDietaryNeeds: true,
          },
        }),
      });

      if (response.ok) {
        // Trigger refresh of seating data
        window.location.reload();
      }
    } catch (error) {
      console.error('Auto-assignment failed:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share && arrangement) {
      navigator.share({
        title: `Seating Plan: ${arrangement.name}`,
        text: 'Check out our wedding seating arrangement!',
        url: window.location.href,
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleExport = () => {
    // Export seating chart as PDF or image
    window.open(`/api/seating/${arrangement?.id}/export?format=pdf`, '_blank');
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-green-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConflictSeverity = (count: number) => {
    if (count === 0) return { color: 'text-green-600', label: 'No conflicts' };
    if (count <= 3)
      return { color: 'text-yellow-600', label: 'Minor conflicts' };
    return { color: 'text-red-600', label: 'Needs attention' };
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Completion Progress */}
        <Card className="p-3 touch-manipulation">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700">
                  Progress
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {defaultStats.completionPercentage}%
              </span>
            </div>
            <Progress
              value={defaultStats.completionPercentage}
              className="h-2"
            />
            <div className="text-xs text-gray-500">
              {defaultStats.seatedGuests} of {defaultStats.totalGuests} seated
            </div>
          </div>
        </Card>

        {/* Conflicts */}
        <Card className="p-3 touch-manipulation">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-gray-700">
                  Conflicts
                </span>
              </div>
              <span
                className={`text-lg font-bold ${getConflictSeverity(defaultStats.conflictCount).color}`}
              >
                {defaultStats.conflictCount}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {getConflictSeverity(defaultStats.conflictCount).label}
            </div>
          </div>
        </Card>
      </div>

      {/* Unassigned Guests Alert */}
      {defaultStats.unseatedGuests > 0 && (
        <Alert className="py-3">
          <Clock className="w-4 h-4" />
          <div className="ml-2">
            <div className="font-medium text-sm">
              {defaultStats.unseatedGuests} guests need seating
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Use auto-assign or manually place remaining guests
            </div>
          </div>
        </Alert>
      )}

      {/* Quick Actions */}
      <div className="flex space-x-2">
        {defaultQuickActions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={action.action}
            disabled={action.disabled}
            className="flex-1 touch-manipulation min-h-[44px] flex items-center justify-center space-x-2"
          >
            {action.icon}
            <span className="text-sm">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Expandable Details */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between touch-manipulation min-h-[44px]"
        >
          <span className="text-sm font-medium">
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </span>
          <div
            className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          >
            ↓
          </div>
        </Button>

        {isExpanded && (
          <div className="space-y-3 pt-2 border-t border-gray-200">
            {/* Detailed Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-gray-600">Total Tables</div>
                <div className="font-semibold text-gray-900">
                  {defaultStats.totalTables}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-600">Empty Tables</div>
                <div className="font-semibold text-gray-900">
                  {defaultStats.emptyTables}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">
                Recent Changes
              </div>
              <div className="space-y-1">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="text-xs text-gray-600 p-2 bg-gray-50 rounded"
                  >
                    {activity}
                  </div>
                ))}
              </div>
            </div>

            {/* Arrangement Info */}
            {arrangement && (
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                <div>Arrangement: {arrangement.name}</div>
                <div>
                  Last modified:{' '}
                  {new Date(arrangement.lastModified).toLocaleDateString()}
                </div>
                <div>Version: {arrangement.version}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
