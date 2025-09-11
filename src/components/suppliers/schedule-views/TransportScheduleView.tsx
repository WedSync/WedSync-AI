'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, CheckCircle2 } from 'lucide-react';
import { VendorSpecificScheduleViewProps } from './types';

export function TransportScheduleView({
  schedule,
  vendorData,
  onConfirmSchedule,
  onRequestChange,
  onUpdateStatus,
}: VendorSpecificScheduleViewProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Truck className="h-6 w-6" />
            <div>
              <div className="text-xl font-bold">{schedule.supplierName}</div>
              <div className="text-sm font-normal text-gray-500">
                Transport Schedule
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Transportation schedule with route optimization, timing alerts, and
            passenger manifest.
          </p>
          <Button
            onClick={() =>
              onConfirmSchedule({
                scheduleId: schedule.supplierId,
                supplierId: schedule.supplierId,
                confirmedAt: new Date(),
                status: 'confirmed',
                notes: '',
                conditions: [],
                signedBy: schedule.supplierName,
              })
            }
            className="w-full"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirm Transport Schedule
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
