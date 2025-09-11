'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface GuestAnalyticsDashboardProps {
  coupleId: string;
}

function GuestAnalyticsDashboard({ coupleId }: GuestAnalyticsDashboardProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Guest Analytics</h3>
      <p className="text-gray-600">Analytics dashboard for client {coupleId}</p>
    </Card>
  );
}

export { GuestAnalyticsDashboard };
export default GuestAnalyticsDashboard;
