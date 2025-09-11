# 01-google-places.md

## What to Build

Integrate Google Places API for venue autocomplete, address validation, venue details enrichment, and location-based search functionality throughout WedSync.

## Key Technical Requirements

### Google Places API Setup

```
// app/lib/google/places-client.ts
import { Client } from '@googlemaps/google-maps-services-js';

export class GooglePlacesService {
  private client: Client;
  private apiKey: string;
  
  constructor() {
    this.client = new Client({});
    this.apiKey = [process.env.GOOGLE](http://process.env.GOOGLE)_PLACES_API_KEY!;
  }
  
  async autocompleteVenue(input: string, location?: LatLng) {
    const response = await this.client.placeAutocomplete({
      params: {
        input,
        key: this.apiKey,
        types: 'establishment',
        components: ['country:uk', 'country:us'], // Limit to specific countries
        location: location,
        radius: 50000, // 50km radius from location if provided
        fields: ['place_id', 'name', 'formatted_address', 'types']
      }
    });
    
    // Filter for wedding-relevant venues
    return [response.data](http://response.data).predictions.filter(place => 
      this.isWeddingVenue(place.types)
    );
  }
  
  private isWeddingVenue(types: string[]): boolean {
    const weddingTypes = [
      'church', 'place_of_worship', 'lodging', 'restaurant',
      'museum', 'art_gallery', 'park', 'tourist_attraction',
      'event_venue', 'banquet_hall'
    ];
    
    return types.some(type => weddingTypes.includes(type));
  }
  
  async getVenueDetails(placeId: string) {
    const response = await this.client.placeDetails({
      params: {
        place_id: placeId,
        key: this.apiKey,
        fields: [
          'name', 'formatted_address', 'formatted_phone_number',
          'website', 'photos', 'geometry', 'opening_hours',
          'rating', 'user_ratings_total', 'price_level',
          'types', 'business_status', 'vicinity'
        ]
      }
    });
    
    return this.enrichVenueData([response.data](http://response.data).result);
  }
  
  private enrichVenueData(place: any): VenueDetails {
    return {
      id: [place.place](http://place.place)_id,
      name: [place.name](http://place.name),
      address: place.formatted_address,
      phone: place.formatted_phone_number,
      website: [place.website](http://place.website),
      coordinates: {
        lat: [place.geometry.location.lat](http://place.geometry.location.lat),
        lng: place.geometry.location.lng
      },
      photos: [place.photos](http://place.photos)?.map(photo => ({
        url: this.getPhotoUrl([photo.photo](http://photo.photo)_reference),
        attribution: photo.html_attributions
      })),
      rating: place.rating,
      reviewCount: place.user_ratings_total,
      priceLevel: place.price_level,
      openingHours: place.opening_hours,
      venueTypes: place.types,
      mapUrl: `[https://maps.google.com/?q=place_id:${place.place_id}`](https://maps.google.com/?q=place_id:${place.place_id}`)
    };
  }
  
  private getPhotoUrl(photoReference: string): string {
    return `[https://maps.googleapis.com/maps/api/place/photo?`](https://maps.googleapis.com/maps/api/place/photo?`) +
      `maxwidth=800&photo_reference=${photoReference}&key=${this.apiKey}`;
  }
}
```

### Venue Autocomplete Component

```
// app/components/forms/VenueAutocomplete.tsx
export const VenueAutocomplete = ({ 
  value, 
  onChange,
  onVenueSelect 
}: VenueAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const placesService = new GooglePlacesService();
  
  const searchVenues = useDebouncedCallback(
    async (input: string) => {
      if (input.length < 3) {
        setSuggestions([]);
        return;
      }
      
      setLoading(true);
      try {
        const results = await placesService.autocompleteVenue(input);
        setSuggestions(results);
      } catch (error) {
        console.error('Places search error:', error);
      } finally {
        setLoading(false);
      }
    },
    300
  );
  
  const handleSelect = async (placeId: string) => {
    // Fetch full venue details
    const details = await placesService.getVenueDetails(placeId);
    
    // Update form with venue data
    onVenueSelect({
      venue_name: [details.name](http://details.name),
      venue_address: details.address,
      venue_phone: [details.phone](http://details.phone),
      venue_website: [details.website](http://details.website),
      venue_coordinates: details.coordinates,
      venue_place_id: placeId
    });
    
    // Store in our database for future reference
    await saveVenueToDatabase(details);
  };
  
  return (
    <Combobox value={value} onChange={handleSelect}>
      <div className="relative">
        <ComboboxInput
          className="form-input"
          onChange={(e) => {
            onChange([e.target](http://e.target).value);
            searchVenues([e.target](http://e.target).value);
          }}
          placeholder="Start typing venue name..."
        />
        
        {loading && (
          <Spinner className="absolute right-2 top-2" />
        )}
        
        <ComboboxOptions className="absolute z-10 mt-1 max-h-60 
                                    overflow-auto rounded-md bg-white 
                                    shadow-lg">
          {[suggestions.map](http://suggestions.map)(place => (
            <ComboboxOption
              key={[place.place](http://place.place)_id}
              value={[place.place](http://place.place)_id}
              className="cursor-pointer hover:bg-gray-100 p-2"
            >
              <div className="font-medium">{place.structured_formatting.main_text}</div>
              <div className="text-sm text-gray-500">
                {place.structured_formatting.secondary_text}
              </div>
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
};
```

### Address Validation

```
// app/lib/google/address-validator.ts
export class AddressValidator {
  async validateAddress(address: string): Promise<ValidationResult> {
    const response = await fetch(
      '[https://addressvalidation.googleapis.com/v1:validateAddress](https://addressvalidation.googleapis.com/v1:validateAddress)',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': [process.env.GOOGLE](http://process.env.GOOGLE)_PLACES_API_KEY!
        },
        body: JSON.stringify({
          address: {
            addressLines: [address]
          },
          enableUspsCass: true // US addresses only
        })
      }
    );
    
    const data = await response.json();
    
    return {
      isValid: data.result.verdict.addressComplete,
      standardizedAddress: data.result.address.formattedAddress,
      components: {
        streetNumber: data.result.address.streetNumber,
        streetName: data.result.address.streetName,
        city: data.result.address.locality,
        state: data.result.address.administrativeArea,
        postalCode: data.result.address.postalCode,
        country: [data.result.address.country](http://data.result.address.country)
      },
      confidence: data.result.verdict.validationGranularity
    };
  }
}
```

### Nearby Vendors Search

```
// app/lib/google/nearby-search.ts
export class NearbyVendorSearch {
  async findNearbyVendors(
    venueLocation: LatLng,
    vendorType: string,
    radius = 10000 // 10km default
  ) {
    const searchTypes = this.getSearchTypes(vendorType);
    
    const response = await this.client.placesNearby({
      params: {
        location: venueLocation,
        radius,
        type: searchTypes,
        key: this.apiKey,
        keyword: 'wedding'
      }
    });
    
    // Cross-reference with our database
    const googleResults = [response.data](http://response.data).results;
    const ourVendors = await this.matchWithOurVendors(googleResults);
    
    return {
      verified: ourVendors, // Vendors in our system
      suggested: googleResults.filter(r => 
        !ourVendors.find(v => [v.place](http://v.place)_id === [r.place](http://r.place)_id)
      ) // Google results not in our system
    };
  }
  
  private getSearchTypes(vendorType: string): string {
    const typeMap = {
      photographer: 'photography',
      caterer: 'meal_delivery|restaurant|catering',
      florist: 'florist',
      venue: 'event_venue|banquet_hall',
      bakery: 'bakery',
      beauty: 'beauty_salon|hair_care'
    };
    
    return typeMap[vendorType] || 'business';
  }
}
```

### Database Schema

```
-- Cache venue information
CREATE TABLE venue_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  coordinates POINT,
  photos JSONB,
  rating DECIMAL(2,1),
  review_count INTEGER,
  price_level INTEGER,
  venue_types TEXT[],
  raw_data JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link venues to events
CREATE TABLE event_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  venue_id UUID REFERENCES venue_cache(id),
  event_type TEXT, -- 'ceremony', 'reception', 'both'
  custom_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for geographic queries
CREATE INDEX idx_venue_coordinates ON venue_cache USING GIST(coordinates);
```

### Rate Limiting & Caching

```
// app/lib/google/rate-limiter.ts
export class GoogleAPIRateLimiter {
  private requestCounts = new Map<string, number>();
  private cache = new Map<string, CachedResult>();
  
  async executeWithLimit<T>(
    key: string,
    fn: () => Promise<T>,
    cacheTime = 3600000 // 1 hour default
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && [Date.now](http://Date.now)() - cached.timestamp < cacheTime) {
      return [cached.data](http://cached.data) as T;
    }
    
    // Check rate limit (Google allows 6000 requests per minute)
    await this.checkRateLimit();
    
    // Execute request
    const result = await fn();
    
    // Cache result
    this.cache.set(key, {
      data: result,
      timestamp: [Date.now](http://Date.now)()
    });
    
    return result;
  }
  
  private async checkRateLimit() {
    const minute = Math.floor([Date.now](http://Date.now)() / 60000);
    const count = this.requestCounts.get(minute.toString()) || 0;
    
    if (count >= 100) { // Conservative limit
      // Wait until next minute
      const waitTime = (minute + 1) * 60000 - [Date.now](http://Date.now)();
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requestCounts.set(minute.toString(), count + 1);
  }
}
```

## Critical Implementation Notes

1. **API Key Security**: Never expose API key to client - proxy through backend
2. **Usage Limits**: Monitor quotas - Places API has cost per request
3. **Caching Strategy**: Cache venue details for 7 days minimum
4. **Attribution**: Must display "Powered by Google" for Places data
5. **Photo Usage**: Google Place photos require attribution HTML
6. **Geocoding Fallback**: Use geocoding API if address validation fails
7. **Session Tokens**: Use for Autocomplete to reduce costs
8. **Field Masking**: Only request fields you need to minimize cost

## Testing Checklist

- [ ]  Venue autocomplete returns relevant results
- [ ]  International addresses work correctly
- [ ]  Photo URLs load with proper attribution
- [ ]  Rate limiting prevents quota exceeded errors
- [ ]  Cache reduces redundant API calls
- [ ]  Address validation handles edge cases
- [ ]  Nearby search returns accurate results
- [ ]  API errors handled gracefully