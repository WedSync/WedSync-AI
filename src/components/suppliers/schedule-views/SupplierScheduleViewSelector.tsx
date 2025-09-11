'use client';

import React from 'react';
import {
  VendorSpecificScheduleViewProps,
  VendorScheduleViewType,
} from './types';
import { PhotographerScheduleView } from './PhotographerScheduleView';
import { DJScheduleView } from './DJScheduleView';
import { CatererScheduleView } from './CatererScheduleView';
import { FloristScheduleView } from './FloristScheduleView';
import { CoordinatorScheduleView } from './CoordinatorScheduleView';
import { TransportScheduleView } from './TransportScheduleView';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SupplierScheduleViewSelectorProps
  extends VendorSpecificScheduleViewProps {
  vendorType: VendorScheduleViewType;
}

export function SupplierScheduleViewSelector({
  vendorType,
  schedule,
  vendorData,
  onConfirmSchedule,
  onRequestChange,
  onUpdateStatus,
}: SupplierScheduleViewSelectorProps) {
  const commonProps = {
    schedule,
    vendorData,
    onConfirmSchedule,
    onRequestChange,
    onUpdateStatus,
  };

  // Select appropriate view based on vendor type
  switch (vendorType) {
    case 'photographer':
      return <PhotographerScheduleView {...commonProps} />;

    case 'dj':
      return <DJScheduleView {...commonProps} />;

    case 'caterer':
      return <CatererScheduleView {...commonProps} />;

    case 'florist':
      return <FloristScheduleView {...commonProps} />;

    case 'coordinator':
      return <CoordinatorScheduleView {...commonProps} />;

    case 'transport':
      return <TransportScheduleView {...commonProps} />;

    default:
      return (
        <Card>
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Unsupported vendor type: {vendorType}. Please contact support.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
  }
}

// Helper function to get vendor type from supplier data
export function getVendorTypeFromSupplier(
  supplierType: string,
): VendorScheduleViewType {
  const typeMapping: Record<string, VendorScheduleViewType> = {
    photography: 'photographer',
    photographer: 'photographer',
    dj: 'dj',
    'disc-jockey': 'dj',
    music: 'dj',
    catering: 'caterer',
    caterer: 'caterer',
    food: 'caterer',
    florist: 'florist',
    flowers: 'florist',
    floral: 'florist',
    coordination: 'coordinator',
    coordinator: 'coordinator',
    'wedding-planner': 'coordinator',
    transport: 'transport',
    transportation: 'transport',
    car: 'transport',
    limo: 'transport',
  };

  const normalizedType = supplierType.toLowerCase();
  return typeMapping[normalizedType] || 'coordinator';
}
