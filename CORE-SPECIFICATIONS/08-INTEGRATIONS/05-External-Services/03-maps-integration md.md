# 03-maps-integration.md

## What to Build

Implement comprehensive maps integration for venue visualization, travel time calculations, and guest navigation assistance using Google Maps API.

## Key Technical Requirements

### Maps Service Setup

```
// app/lib/maps/maps-service.ts
export class MapsService {
  private directionsService: google.maps.DirectionsService;
  private distanceMatrixService: google.maps.DistanceMatrixService;
  private geocoder: google.maps.Geocoder;
  
  constructor() {
    this.directionsService = new google.maps.DirectionsService();
    this.distanceMatrixService = new google.maps.DistanceMatrixService();
    this.geocoder = new google.maps.Geocoder();
  }
  
  async calculateTravelTime(
    origin: string | google.maps.LatLng,
    destination: string | google.maps.LatLng,
    departureTime: Date,
    mode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
  ) {
    const request: google.maps.DirectionsRequest = {
      origin,
      destination,
      travelMode: mode,
      drivingOptions: {
        departureTime,
        trafficModel: [google.maps.TrafficModel.BEST](http://google.maps.TrafficModel.BEST)_GUESS
      },
      provideRouteAlternatives: true
    };
    
    const response = await this.directionsService.route(request);
    
    return {
      routes: [response.routes.map](http://response.routes.map)(route => ({
        duration: route.legs[0].duration,
        durationInTraffic: route.legs[0].duration_in_traffic,
        distance: route.legs[0].distance,
        summary: route.summary,
        warnings: route.warnings,
        steps: route.legs[0].[steps.map](http://steps.map)(step => ({
          instruction: step.instructions,
          distance: step.distance.text,
          duration: step.duration.text
        }))
      })),
      recommendedDeparture: this.calculateDepartureTime(
        response.routes[0],
        departureTime
      )
    };
  }
  
  async getMultipleRouteTimes(origins: string[], destination: string) {
    const response = await this.distanceMatrixService.getDistanceMatrix({
      origins,
      destinations: [destination],
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
      durationInTraffic: true,
      departureTime: new Date()
    });
    
    return [response.rows.map](http://response.rows.map)((row, index) => ({
      origin: origins[index],
      duration: row.elements[0].duration,
      distance: row.elements[0].distance,
      status: row.elements[0].status
    }));
  }
}
```

### Interactive Venue Map Component

```
// app/components/maps/VenueMap.tsx
export const VenueMap = ({ venue, nearbySuppliers, guestOrigins }) => {
  const mapRef = useRef<[google.maps.Map](http://google.maps.Map)>();
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = new [google.maps.Map](http://google.maps.Map)(mapRef.current, {
      center: venue.coordinates,
      zoom: 14,
      styles: [mapStyles.wedding](http://mapStyles.wedding), // Custom wedding-themed styles
      mapTypeControl: true,
      streetViewControl: true
    });
    
    // Add venue marker
    const venueMarker = new google.maps.Marker({
      position: venue.coordinates,
      map,
      title: [venue.name](http://venue.name),
      icon: {
        url: '/icons/venue-marker.png',
        scaledSize: new google.maps.Size(50, 50)
      }
    });
    
    // Add info window
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="venue-info">
          <h3>${[venue.name](http://venue.name)}</h3>
          <p>${venue.address}</p>
          <p>Capacity: ${venue.capacity} guests</p>
          <a href="${[venue.website](http://venue.website)}" target="_blank">Website</a>
        </div>
      `
    });
    
    venueMarker.addListener('click', () => {
      [infoWindow.open](http://infoWindow.open)(map, venueMarker);
    });
    
    // Add nearby supplier markers
    nearbySuppliers?.forEach(supplier => {
      const marker = new google.maps.Marker({
        position: supplier.coordinates,
        map,
        title: [supplier.name](http://supplier.name),
        icon: getSupplierIcon(supplier.type)
      });
      
      marker.addListener('click', () => {
        setSelectedSupplier(supplier);
      });
    });
    
    // Add traffic layer
    if (showTraffic) {
      const trafficLayer = new google.maps.TrafficLayer();
      trafficLayer.setMap(map);
    }
    
    // Add transit layer
    if (showTransit) {
      const transitLayer = new google.maps.TransitLayer();
      transitLayer.setMap(map);
    }
  }, [venue, nearbySuppliers, showTraffic, showTransit]);
  
  return (
    <div className="venue-map-container">
      <div className="map-controls">
        <button onClick={() => setShowTraffic(!showTraffic)}>
          {showTraffic ? 'Hide' : 'Show'} Traffic
        </button>
        <button onClick={() => setShowTransit(!showTransit)}>
          {showTransit ? 'Hide' : 'Show'} Transit
        </button>
        <button onClick={calculateGuestTravelTimes}>
          Calculate Guest Travel Times
        </button>
      </div>
      
      <div ref={mapRef} className="map" style={{ height: '500px' }} />
      
      {selectedSupplier && (
        <SupplierDetails 
          supplier={selectedSupplier}
          venue={venue}
          onClose={() => setSelectedSupplier(null)}
        />
      )}
    </div>
  );
};
```

### Travel Time Dashboard

```
// app/components/maps/TravelTimeDashboard.tsx
export const TravelTimeDashboard = ({ wedding }) => {
  const [supplierTravelTimes, setSupplierTravelTimes] = useState([]);
  const [guestTravelAnalysis, setGuestTravelAnalysis] = useState(null);
  
  useEffect(() => {
    calculateAllTravelTimes();
  }, [wedding]);
  
  const calculateAllTravelTimes = async () => {
    // Calculate supplier arrival times
    const supplierTimes = await Promise.all(
      [wedding.suppliers.map](http://wedding.suppliers.map)(async supplier => {
        const travelTime = await mapsService.calculateTravelTime(
          supplier.address,
          wedding.venue.address,
          wedding.getSupplierArrivalTime(supplier),
          google.maps.TravelMode.DRIVING
        );
        
        return {
          supplier,
          ...travelTime,
          suggestedDeparture: subMinutes(
            wedding.getSupplierArrivalTime(supplier),
            travelTime.durationInTraffic.value / 60 + 15 // Add buffer
          )
        };
      })
    );
    
    setSupplierTravelTimes(supplierTimes);
    
    // Analyze guest travel patterns
    const guestAnalysis = await analyzeGuestTravel();
    setGuestTravelAnalysis(guestAnalysis);
  };
  
  const analyzeGuestTravel = async () => {
    const guestOrigins = wedding.guests
      .map(guest => guest.address)
      .filter(Boolean);
    
    const travelTimes = await mapsService.getMultipleRouteTimes(
      guestOrigins,
      wedding.venue.address
    );
    
    return {
      averageTravelTime: average([travelTimes.map](http://travelTimes.map)(t => t.duration.value)),
      maxTravelTime: Math.max(...[travelTimes.map](http://travelTimes.map)(t => t.duration.value)),
      guestsOver30Min: travelTimes.filter(t => t.duration.value > 1800).length,
      guestsOver60Min: travelTimes.filter(t => t.duration.value > 3600).length,
      recommendations: generateTravelRecommendations(travelTimes)
    };
  };
  
  return (
    <div className="travel-time-dashboard">
      <div className="supplier-travel">
        <h3>Supplier Travel Times</h3>
        {[supplierTravelTimes.map](http://supplierTravelTimes.map)(({ supplier, duration, suggestedDeparture }) => (
          <div key={[supplier.id](http://supplier.id)} className="travel-card">
            <h4>{[supplier.name](http://supplier.name)}</h4>
            <p>Travel time: {duration.text}</p>
            <p>Leave by: {format(suggestedDeparture, 'h:mm a')}</p>
            <button onClick={() => sendDepartureReminder(supplier)}>
              Set Reminder
            </button>
          </div>
        ))}
      </div>
      
      <div className="guest-travel-analysis">
        <h3>Guest Travel Analysis</h3>
        {guestTravelAnalysis && (
          <>
            <div className="stats-grid">
              <Stat 
                label="Average Travel Time"
                value={`${Math.round(guestTravelAnalysis.averageTravelTime / 60)} min`}
              />
              <Stat 
                label="Guests > 30 min away"
                value={guestTravelAnalysis.guestsOver30Min}
              />
              <Stat 
                label="Guests > 1 hour away"
                value={guestTravelAnalysis.guestsOver60Min}
              />
            </div>
            
            <div className="recommendations">
              {[guestTravelAnalysis.recommendations.map](http://guestTravelAnalysis.recommendations.map)(rec => (
                <Recommendation key={[rec.id](http://rec.id)} {...rec} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

### Venue Directions Generator

```
// app/lib/maps/directions-generator.ts
export class DirectionsGenerator {
  async generateGuestDirections(venue: Venue, customInstructions?: string) {
    const directions = {
      venue: {
        name: [venue.name](http://venue.name),
        address: venue.address,
        coordinates: venue.coordinates,
        what3words: await this.getWhat3Words(venue.coordinates)
      },
      parking: venue.parkingInstructions || 'Parking available on-site',
      entrances: venue.entrances || [{ type: 'main', description: 'Main entrance' }],
      customInstructions,
      mapUrl: this.generateMapUrl(venue),
      alternativeRoutes: await this.getAlternativeRoutes(venue)
    };
    
    return directions;
  }
  
  generateMapUrl(venue: Venue): string {
    const params = new URLSearchParams({
      api: '1',
      destination: `${[venue.coordinates.lat](http://venue.coordinates.lat)},${venue.coordinates.lng}`,
      destination_place_id: venue.googlePlaceId || '',
      travelmode: 'driving'
    });
    
    return `[https://www.google.com/maps/dir/?${params}`](https://www.google.com/maps/dir/?${params}`);
  }
  
  async generatePrintableMap(venue: Venue) {
    const staticMapUrl = `[https://maps.googleapis.com/maps/api/staticmap?`](https://maps.googleapis.com/maps/api/staticmap?`) +
      `center=${[venue.coordinates.lat](http://venue.coordinates.lat)},${venue.coordinates.lng}` +
      `&zoom=15` +
      `&size=600x400` +
      `&markers=color:red|label:V|${[venue.coordinates.lat](http://venue.coordinates.lat)},${venue.coordinates.lng}` +
      `&key=${[process.env.NEXT](http://process.env.NEXT)_PUBLIC_GOOGLE_MAPS_KEY}`;
    
    return {
      imageUrl: staticMapUrl,
      qrCode: await this.generateQRCode(this.generateMapUrl(venue))
    };
  }
}
```

### Database Schema

```
-- Store travel time calculations
CREATE TABLE travel_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_address TEXT,
  destination_id UUID REFERENCES venues(id),
  travel_mode TEXT,
  departure_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  duration_in_traffic_seconds INTEGER,
  distance_meters INTEGER,
  route_summary TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Venue accessibility information
CREATE TABLE venue_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id),
  entrance_type TEXT, -- 'main', 'accessible', 'service', 'emergency'
  description TEXT,
  coordinates POINT,
  accessibility_features TEXT[],
  parking_instructions TEXT,
  photo_url TEXT
);

-- Guest travel analysis
CREATE TABLE guest_travel_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID,
  total_guests INTEGER,
  analyzed_guests INTEGER,
  avg_travel_time_minutes INTEGER,
  max_travel_time_minutes INTEGER,
  guests_needing_accommodation INTEGER,
  analysis_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Critical Implementation Notes

1. **API Key Restrictions**: Restrict Google Maps API key by HTTP referrer
2. **Cost Management**: Cache direction results, use Distance Matrix sparingly
3. **Traffic Data**: Only available with departure time in future (max 30 days)
4. **Rate Limiting**: Implement client-side throttling for bulk calculations
5. **Mobile Optimization**: Use lightweight map options on mobile
6. **Offline Support**: Generate static maps for offline viewing
7. **Privacy**: Don't store guest addresses permanently
8. **Accuracy**: Always provide multiple route options

## Testing Checklist

- [ ]  Travel time calculations with traffic
- [ ]  Multiple route alternatives work
- [ ]  International address support
- [ ]  Mobile map performance
- [ ]  Static map generation
- [ ]  QR code generation for directions
- [ ]  Bulk travel time calculations
- [ ]  Cache invalidation works