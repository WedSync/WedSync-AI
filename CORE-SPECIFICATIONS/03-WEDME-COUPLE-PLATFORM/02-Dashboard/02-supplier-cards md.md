# 02-supplier-cards.md

## What to Build

Grid of connected supplier cards showing status, recent activity, and quick actions for each vendor.

## Card Component Structure

```
interface SupplierCard {
  supplier: {
    id: string;
    business_name: string;
    vendor_type: string;
    logo_url?: string;
    primary_contact: string;
  };
  connection: {
    status: 'connected' | 'invited' | 'pending';
    connected_at?: Date;
    last_activity?: Date;
  };
  tasks: {
    pending_forms: number;
    unread_messages: number;
    upcoming_meetings: number;
  };
}
```

## Visual Design

```
<Card className="supplier-card">
  <CardHeader>
    <Avatar src={supplier.logo_url} />
    <div>
      <h3>{[supplier.business](http://supplier.business)_name}</h3>
      <Badge>{supplier.vendor_type}</Badge>
    </div>
    <StatusIndicator status={connection.status} />
  </CardHeader>
  
  <CardBody>
    {tasks.pending_forms > 0 && (
      <Alert>📝 {tasks.pending_forms} forms to complete</Alert>
    )}
    <LastActivity>{timeAgo(connection.last_activity)}</LastActivity>
  </CardBody>
  
  <CardActions>
    <Button size="sm">View Details</Button>
    <Button size="sm" variant="outline">Message</Button>
  </CardActions>
</Card>
```

## Status Indicators

- 🟢 Connected & syncing
- 🟡 Pending action required
- 🔴 Invitation pending
- ⚪ Not yet invited

## Grid Layout

```
.supplier-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}
```

## Critical Notes

- Lazy load supplier logos
- Show skeleton while loading
- Click card for detail view
- Drag to reorder priority