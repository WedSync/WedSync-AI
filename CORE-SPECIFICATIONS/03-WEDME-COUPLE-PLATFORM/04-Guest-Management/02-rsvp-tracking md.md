# 02-rsvp-tracking.md

## What to Build

Build a comprehensive RSVP management system with digital responses, meal selections, and accommodation tracking.

## Key Technical Requirements

### RSVP Data Structure

```
// types/rsvp.ts
interface RSVP {
  guest_id: string;
  status: 'pending' | 'attending' | 'declined' | 'maybe';
  responded_at?: Date;
  meal_choice?: string;
  dietary_restrictions?: string[];
  accommodation_needed: boolean;
  arrival_date?: Date;
  departure_date?: Date;
  notes?: string;
  response_method: 'website' | 'email' | 'phone' | 'mail';
}

interface RSVPReminder {
  guest_id: string;
  reminder_count: number;
  last_sent: Date;
  next_reminder?: Date;
}
```

### RSVP Form Component

```
// components/rsvp/RSVPForm.tsx
const RSVPForm = ({ guestId, prefilledData }) => {
  const [attending, setAttending] = useState<boolean | null>(null);
  
  return (
    <form className="rsvp-form">
      <RadioGroup 
        value={attending} 
        onChange={setAttending}
        options={[
          { value: true, label: 'Joyfully Accept' },
          { value: false, label: 'Regretfully Decline' }
        ]}
      />
      
      {attending && (
        <>
          <MealSelection 
            options={mealOptions}
            dietary={dietaryOptions}
          />
          <AccommodationSection />
          <PlusOneSection enabled={[guest.plus](http://guest.plus)_one} />
        </>
      )}
      
      <SubmitButton />
    </form>
  );
};
```

### Tracking Dashboard

```
// components/couple/RSVPDashboard.tsx
const RSVPMetrics = () => {
  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard 
        label="Attending" 
        value={counts.attending} 
        percentage={percentages.attending}
        color="green"
      />
      <MetricCard 
        label="Declined" 
        value={counts.declined}
        percentage={percentages.declined} 
        color="red"
      />
      <MetricCard 
        label="Pending" 
        value={counts.pending}
        percentage={percentages.pending}
        color="yellow" 
      />
      <MetricCard 
        label="Response Rate" 
        value={`${responseRate}%`}
      />
    </div>
  );
};
```

## Critical Implementation Notes

- Auto-send reminders after 2 weeks of no response
- QR codes for easy mobile RSVP
- Track meal counts for caterer
- Export attending list for venue
- Show RSVP deadline countdown

## API Endpoints

```
// app/api/rsvp/submit/route.ts
export async function POST(request: Request) {
  const { guestId, status, mealChoice, dietary } = await request.json();
  
  await updateRSVP({ guestId, status, mealChoice, dietary });
  
  // Update guest count in core fields
  await recalculateGuestCount();
  
  // Notify couple of response
  await sendRSVPNotification(guestId, status);
  
  return NextResponse.json({ success: true });
}
```