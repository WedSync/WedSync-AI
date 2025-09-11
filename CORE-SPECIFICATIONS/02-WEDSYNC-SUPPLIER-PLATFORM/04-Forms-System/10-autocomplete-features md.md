# 10-autocomplete-features.md

## What to Build

Implement intelligent autocomplete for form fields using Google Places API for venues, custom databases for vendor-specific data, and smart suggestions based on core fields.

## Key Technical Requirements

### Google Places Integration

```
interface AutocompleteConfig {
  venueFields: {
    api: 'google-places',
    types: ['establishment', 'lodging'],
    componentRestrictions: { country: 'gb' },
    fields: ['name', 'address', 'photos', 'geometry']
  }
}
```

### Custom Autocomplete Sources

- **Music Database**: Spotify/Apple Music APIs for song selection
- **Flower Database**: Local JSON with seasonal availability
- **Dietary Requirements**: Pre-defined allergen/diet combinations
- **Vendor Names**: Pull from connected suppliers in database

### Implementation Structure

```
// components/forms/AutocompleteField.tsx
const AutocompleteField = ({
  source: 'google' | 'spotify' | 'custom',
  fieldType: string,
  onSelect: (value: any) => void
}) => {
  const [suggestions, setSuggestions] = useState([])
  const debouncedSearch = useDebouncedValue(query, 300)
  
  // Fetch suggestions based on source
  useEffect(() => {
    if (source === 'google') loadGoogleSuggestions()
    if (source === 'spotify') loadSpotifySongs()
  }, [debouncedSearch])
}
```

## Critical Implementation Notes

- Cache frequently used suggestions in localStorage
- Implement debouncing (300ms) to avoid API rate limits
- Show "Powered by Google" attribution for Places API
- Pre-populate from core fields when available
- Handle offline gracefully with fallback to manual input

## Database Structure

```
-- Store common selections for learning
CREATE TABLE autocomplete_history (
  field_type VARCHAR(50),
  value TEXT,
  usage_count INT DEFAULT 1,
  supplier_id UUID
);
```