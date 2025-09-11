# 03-wedding-basics.md

## What to Build

Quick capture of essential wedding details immediately after signup to enable core fields functionality.

## UI Components

### Step-by-Step Form

```
interface WeddingBasics {
  wedding_date: Date; // Required
  ceremony_venue: string; // Autocomplete via Google Places
  ceremony_venue_id?: string; // Google Place ID
  reception_venue?: string; // Optional, defaults to same
  guest_count_estimated: number; // Rough number OK
  wedding_style?: string[]; // Tags: casual, formal, rustic, etc.
}
```

### Venue Autocomplete

```
// Google Places integration
const venueSearch = new google.maps.places.Autocomplete(
  inputElement,
  {
    types: ['establishment'],
    fields: ['name', 'place_id', 'formatted_address', 'geometry']
  }
);
```

### Smart Defaults

- Reception venue = Ceremony venue (unless changed)
- Guest count rounds: 50, 75, 100, 125, 150, 200+
- Date validation: Must be future date
- Style multi-select with common options

## Database Updates

```
UPDATE core_fields SET
  wedding_date = $1,
  ceremony_venue_name = $2,
  ceremony_venue_address = $3,
  guest_count = $4,
  field_states = jsonb_set(field_states, 
    '{wedding_date}', '"complete"')
WHERE couple_id = $5;
```

## Validation Rules

- Wedding date: 30 days to 3 years future
- Guest count: 2-500 (warn if outside)
- Venue: Validate against Google Places
- Allow skip (but mark as incomplete)

## Critical Notes

- Save on each field blur (not just submit)
- Show progress indicator (Step 1 of 3)
- Mobile date picker native
- "Why we need this" tooltips