import * as React from 'react';
import { Card, CardBody } from '../components/Card';
import { Button } from '../components/Button';
export default function DashboardCouple() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8">
      <header className="flex items-start justify-between">
        <div><h1>Welcome back</h1><p className="mt-1 text-sm text-muted-foreground">Your wedding planning at a glance.</p></div>
        <Button>Invite supplier</Button>
      </header>
      <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card><CardBody><div className="text-sm font-medium text-muted-foreground">Days to go</div><div className="mt-2 text-2xl font-semibold">126</div></CardBody></Card>
        <Card><CardBody><div className="text-sm font-medium text-muted-foreground">Confirmed suppliers</div><div className="mt-2 text-2xl font-semibold">7</div></CardBody></Card>
        <Card><CardBody><div className="text-sm font-medium text-muted-foreground">Tasks due this week</div><div className="mt-2 text-2xl font-semibold">3</div></CardBody></Card>
      </section>
      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-border p-6 shadow-md">
            <h2 className="text-xl font-medium">Next steps</h2>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
              <li>Share venue details with photographer</li>
              <li>Confirm menu with catering</li>
              <li>Upload guest list CSV</li>
            </ul>
          </div>
          <div className="rounded-lg border border-border p-6 shadow-md">
            <h2 className="text-xl font-medium">Latest activity</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div>Florist sent proposal • 2h ago</div>
              <div>DJ accepted invite • Yesterday</div>
              <div>Venue added floor plan • Mon</div>
            </div>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-lg border border-border p-6 shadow-md">
            <h2 className="text-xl font-medium">Shortcuts</h2>
            <div className="mt-4 grid gap-2">
              <Button variant="secondary">View suppliers</Button>
              <Button variant="secondary">Share timeline</Button>
              <Button variant="secondary">Manage files</Button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
