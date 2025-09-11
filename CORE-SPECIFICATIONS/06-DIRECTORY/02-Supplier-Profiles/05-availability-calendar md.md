# 05-availability-calendar.md

## What to Build

A real-time availability calendar system that shows supplier availability and integrates with their existing calendar systems.

## Key Technical Requirements

### Calendar Structure

```
interface AvailabilityCalendar {
  supplier_id: string;
  calendar_type: 'simple' | 'detailed' | 'integration';
  availability_data: AvailabilityData[];
  booking_buffer: number; // Days between bookings
  advance_booking_limit: number; // Max days in future
  last_sync: Date;
}

interface AvailabilityData {
  date: Date;
  status: 'available' | 'booked' | 'tentative' | 'blocked';
  booking_type?: 'wedding' | 'engagement' | 'other';
  notes?: string;
  price_modifier?: number; // Peak pricing
}

interface CalendarIntegration {
  provider: 'google' | 'outlook' | 'apple' | 'ical';
  calendar_id: string;
  access_token: string;
  sync_frequency: number; // Minutes
  is_active: boolean;
}
```

### Calendar Display Options

1. **Simple View**
    - Available/Unavailable only
    - Quick setup for new suppliers
    - Manual date blocking
2. **Detailed View**
    - Different booking types
    - Peak/off-peak pricing
    - Travel days marked
3. **Integrated View**
    - Synced with Google/Outlook
    - Real-time updates
    - Automatic blocking

## Critical Implementation Notes

### Calendar Components

```
export function AvailabilityCalendar({ supplierId, viewMode = 'public' }: Props) {
  const [availability, setAvailability] = useState<AvailabilityData[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const handleDateClick = useCallback((date: Date) => {
    if (viewMode === 'edit') {
      setSelectedDate(date);
      openEditModal(date);
    } else {
      // Public view - show inquiry form
      openInquiryForm(date);
    }
  }, [viewMode]);
  
  const getDateStatus = useCallback((date: Date) => {
    const dayAvailability = availability.find(a => 
      isSameDay([a.date](http://a.date), date)
    );
    
    return dayAvailability?.status || 'unknown';
  }, [availability]);
  
  return (
    <div className="availability-calendar">
      <CalendarGrid
        onDateClick={handleDateClick}
        getDateStatus={getDateStatus}
        selectedDate={selectedDate}
      />
      
      {viewMode === 'public' && (
        <div className="calendar-legend">
          <span className="available">● Available</span>
          <span className="booked">● Booked</span>
          <span className="tentative">● Tentative</span>
        </div>
      )}
    </div>
  );
}
```

### Calendar Sync Integration

```
// Google Calendar integration
export class GoogleCalendarSync {
  private accessToken: string;
  
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
  
  async syncAvailability(supplierId: string): Promise<void> {
    const events = await this.getCalendarEvents();
    const availabilityUpdates: AvailabilityData[] = [];
    
    for (const event of events) {
      if (this.isWeddingEvent(event)) {
        availabilityUpdates.push({
          date: new Date([event.start.date](http://event.start.date)),
          status: 'booked',
          booking_type: 'wedding',
          notes: `Synced from Google Calendar: ${event.summary}`
        });
      }
    }
    
    await updateSupplierAvailability(supplierId, availabilityUpdates);
  }
  
  private async getCalendarEvents() {
    const response = await fetch(
      '[https://www.googleapis.com/calendar/v3/calendars/primary/events](https://www.googleapis.com/calendar/v3/calendars/primary/events)',
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      }
    );
    
    return response.json();
  }
  
  private isWeddingEvent(event: any): boolean {
    const title = event.summary?.toLowerCase() || '';
    const keywords = ['wedding', 'marriage', 'ceremony', 'reception'];
    
    return keywords.some(keyword => title.includes(keyword));
  }
}
```

### Availability API

```
// API endpoints for calendar management
export const availabilityRouter = express.Router();

// Get supplier availability for date range
availabilityRouter.get('/:supplierId', async (req, res) => {
  const { supplierId } = req.params;
  const { start_date, end_date } = req.query;
  
  const availability = await getSupplierAvailability(
    supplierId,
    new Date(start_date as string),
    new Date(end_date as string)
  );
  
  res.json(availability);
});

// Update availability (supplier only)
availabilityRouter.put('/:supplierId', requireAuth, async (req, res) => {
  const { supplierId } = req.params;
  const updates = req.body;
  
  // Verify supplier owns this calendar
  await verifySupplierOwnership([req.user.id](http://req.user.id), supplierId);
  
  await updateAvailability(supplierId, updates);
  res.json({ success: true });
});

// Sync with external calendar
[availabilityRouter.post](http://availabilityRouter.post)('/:supplierId/sync', requireAuth, async (req, res) => {
  const { supplierId } = req.params;
  const { provider, access_token } = req.body;
  
  const syncService = createSyncService(provider, access_token);
  await syncService.syncAvailability(supplierId);
  
  res.json({ success: true, last_sync: new Date() });
});
```

### Database Schema

```
CREATE TABLE supplier_availability (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('available', 'booked', 'tentative', 'blocked')),
  booking_type VARCHAR(50),
  notes TEXT,
  price_modifier DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, date)
);

CREATE TABLE calendar_integrations (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  provider VARCHAR(20) NOT NULL,
  calendar_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  sync_frequency INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_availability_supplier_date 
ON supplier_availability(supplier_id, date);

CREATE INDEX idx_availability_date_status 
ON supplier_availability(date, status);
```