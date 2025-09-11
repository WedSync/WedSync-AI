# 03-rsvp-system.md

## What to Build

Guest RSVP collection system integrated with the website, syncing responses to the main guest management module.

## Key Technical Requirements

### Database Schema

```
interface WebsiteRSVP {
  id: string
  couple_id: string
  guest_id?: string // Links to main guest list
  name: string
  email: string
  attending: 'yes' | 'no' | 'maybe'
  guest_count: number
  dietary_requirements?: string
  message?: string
  submitted_at: Date
  ip_address: string
}

interface RSVPSettings {
  couple_id: string
  enabled: boolean
  deadline: Date
  allow_plus_ones: boolean
  collect_dietary: boolean
  custom_questions: CustomQuestion[]
  confirmation_message: string
}
```

### RSVP Form Component

```
const RSVPForm = () => {
  const [step, setStep] = useState(1)
  const [guestData, setGuestData] = useState({})
  
  return (
    <form onSubmit={handleSubmit}>
      {step === 1 && <GuestLookup onFound={setGuestData} />}
      {step === 2 && <AttendanceSelection guest={guestData} />}
      {step === 3 && <DietaryRequirements />}
      {step === 4 && <Confirmation />}
    </form>
  )
}
```

### API Endpoints

```
// POST /api/public/rsvp/:website_id
// Public endpoint for guest submissions

// GET /api/wedme/website/rsvp-responses
// Couple's view of all responses
```

## Critical Implementation Notes

1. **Guest matching** by name and email to existing guest list
2. **Rate limiting** to prevent spam (3 submissions per IP per hour)
3. **Email confirmation** sent to both guest and couple
4. **Sync with guest management** module in real-time
5. **Mobile-optimized** form with large touch targets