/**
 * WedSync Conflict Resolution Breadcrumb Navigation
 * Feature: WS-172 - Offline Functionality - Conflict Resolution
 * Team: C - Batch 21 - Round 3
 *
 * Navigation breadcrumb component with wedding-specific context
 */

'use client';

import {
  ChevronRight,
  AlertTriangle,
  Home,
  Database,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import type { WeddingDataType } from '@/lib/offline/conflict-resolution';

interface ConflictBreadcrumbProps {
  conflictCount?: number;
  currentDataType?: WeddingDataType;
  isOfflineMode?: boolean;
  weddingName?: string;
}

export function ConflictBreadcrumb({
  conflictCount = 0,
  currentDataType,
  isOfflineMode = false,
  weddingName,
}: ConflictBreadcrumbProps) {
  const formatDataType = (dataType: WeddingDataType): string => {
    return dataType
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="flex items-center justify-between py-2 px-1">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/dashboard"
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator>
            <ChevronRight className="w-4 h-4" />
          </BreadcrumbSeparator>

          {weddingName && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href="/weddings">Weddings</BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator>
                <ChevronRight className="w-4 h-4" />
              </BreadcrumbSeparator>

              <BreadcrumbItem>
                <BreadcrumbLink
                  href={`/weddings/${weddingName.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {weddingName}
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator>
                <ChevronRight className="w-4 h-4" />
              </BreadcrumbSeparator>
            </>
          )}

          <BreadcrumbItem>
            <BreadcrumbLink href="/offline" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Offline Sync
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator>
            <ChevronRight className="w-4 h-4" />
          </BreadcrumbSeparator>

          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {currentDataType ? (
                <>{formatDataType(currentDataType)} Conflicts</>
              ) : (
                'Conflict Resolution'
              )}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        {/* Offline Mode Indicator */}
        <div className="flex items-center gap-2">
          {isOfflineMode ? (
            <>
              <WifiOff className="w-4 h-4 text-orange-500" />
              <Badge
                variant="outline"
                className="bg-orange-50 text-orange-700 border-orange-200"
              >
                Offline Mode
              </Badge>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                Online
              </Badge>
            </>
          )}
        </div>

        {/* Conflict Count Badge */}
        {conflictCount > 0 && (
          <Badge
            variant={
              conflictCount > 10
                ? 'destructive'
                : conflictCount > 5
                  ? 'secondary'
                  : 'outline'
            }
            className="flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            {conflictCount} Conflicts
          </Badge>
        )}
      </div>
    </div>
  );
}
