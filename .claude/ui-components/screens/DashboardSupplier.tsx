import * as React from 'react';
import { StatCard } from '../components/StatCard';
import { Table } from '../components/Table';
import { Button } from '../components/Button';
import { ClientStatusesCard } from '../components/ClientStatusesCard';
import { WeddingTodayCard } from '../components/WeddingTodayCard';

const jobs = [
  { id: '1', client: 'Evie & Max', date: '12 Sep 2025', status: 'Booked' },
  { id: '2', client: 'Hannah & Tom', date: '20 Sep 2025', status: 'Proposal sent' },
  { id: '3', client: 'Ruby & Jack', date: '04 Oct 2025', status: 'Deposit due' },
  { id: '4', client: 'Ava & Leo', date: '18 Oct 2025', status: 'New enquiry' },
];

export default function DashboardSupplier() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8">
      <header className="flex items-start justify-between">
        <div><h1>Overview</h1><p className="mt-1 text-sm text-muted-foreground">Key activity across your pipeline.</p></div>
        <Button>New job</Button>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <WeddingTodayCard coupleName="Evie & Max" venueName="The Barn at Ashton" location="Northamptonshire" ceremonyTime="13:30"
            drive={{ durationText: '42 min', distanceText: '28 km' }} weather={{ description: 'Mostly clear', temperatureC: 21, icon: '🌤️' }}
            sunsetTime="20:41" agenda={[
              { time: '10:00', label: 'Bridal prep' },
              { time: '12:15', label: 'Groom photos' },
              { time: '13:30', label: 'Ceremony' },
              { time: '14:15', label: 'Confetti & drinks' },
              { time: '16:00', label: 'Speeches' },
              { time: '19:45', label: 'Golden hour portraits' },
            ]} />
          <div className="grid gap-6 sm:grid-cols-2">
            <StatCard title="Active Jobs" value="12" delta="+2 this week" />
            <StatCard title="New Enquiries" value="4" />
          </div>
        </div>
        <div className="space-y-6">
          <ClientStatusesCard counts={{ newEnquiries: 4, proposals: 3, depositsDue: 2, booked: 7 }} trend={[1,2,3,4,3,2,4]} />
          <div>
            <h2 className="text-xl font-medium">Upcoming</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-md border border-border p-3 shadow-sm">Send contract to Ruby & Jack</div>
              <div className="rounded-md border border-border p-3 shadow-sm">Follow up with Ava & Leo</div>
              <div className="rounded-md border border-border p-3 shadow-sm">Prepare invoice for Hannah & Tom</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-medium">Recent jobs</h2>
        <div className="mt-4">
          <Table columns={[{ key: 'client', header: 'Client' }, { key: 'date', header: 'Date' }, { key: 'status', header: 'Status' }]} rows={jobs} />
        </div>
      </section>
    </div>
  );
}
