import * as React from 'react';
import { Card, CardBody, CardHeader } from './Card';
import { BarChart } from './charts/BarChart';
export interface StatusCounts { newEnquiries: number; proposals: number; depositsDue: number; booked: number; }
export function ClientStatusesCard({ counts, trend }: { counts: StatusCounts; trend?: number[] }) {
  return (
    <Card>
      <CardHeader title="Client statuses" subtitle="This week" />
      <CardBody>
        <div className="grid gap-4 sm:grid-cols-4">
          <div><div className="text-sm text-muted-foreground">New enquiries</div><div className="text-xl font-semibold mt-1">{counts.newEnquiries}</div></div>
          <div><div className="text-sm text-muted-foreground">Proposal sent</div><div className="text-xl font-semibold mt-1">{counts.proposals}</div></div>
          <div><div className="text-sm text-muted-foreground">Deposit due</div><div className="text-xl font-semibold mt-1">{counts.depositsDue}</div></div>
          <div><div className="text-sm text-muted-foreground">Booked</div><div className="text-xl font-semibold mt-1">{counts.booked}</div></div>
        </div>
        {trend && trend.length>0 && <div className="mt-6"><BarChart values={trend} labels={['Mon','Tue','Wed','Thu','Fri','Sat','Sun']} title="Weekly trend" /></div>}
      </CardBody>
    </Card>
  );
}
