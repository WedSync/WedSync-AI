# 01-photography-ai.md

## What to Build

AI features specifically for wedding photographers including shot list generation and timeline optimization.

## Key Technical Requirements

### Sunset/Golden Hour Calculator

```
interface PhotoTimeCalculator {
  weddingDate: Date
  venueCoordinates: { lat: number, lng: number }
  
  async calculateOptimalTimes() {
    const sunTimes = await fetch(`[https://api.sunrise-sunset.org/json?lat=${this.venueCoordinates.lat}&lng=${this.venueCoordinates.lng}&date=${this.weddingDate.toISOString().split('T')[0]}`](https://api.sunrise-sunset.org/json?lat=${this.venueCoordinates.lat}&lng=${this.venueCoordinates.lng}&date=${this.weddingDate.toISOString().split('T')[0]}`))
    
    return {
      sunrise: sunTimes.sunrise,
      goldenHourMorning: this.addMinutes(sunTimes.sunrise, 60),
      sunset: sunTimes.sunset,
      goldenHourEvening: this.subtractMinutes(sunTimes.sunset, 60),
      blueHour: this.addMinutes(sunTimes.sunset, 30)
    }
  }
}
```

### Smart Shot List Generator

```
class ShotListAI {
  async generateShotList(weddingDetails: WeddingInfo) {
    const prompt = `Generate wedding shot list for:
    - Venue: ${weddingDetails.venue}
    - Style: ${[weddingDetails.style](http://weddingDetails.style)}
    - Guest count: ${weddingDetails.guestCount}
    - Special requests: ${weddingDetails.notes}
    
    Include: must-have shots, family groupings, venue-specific opportunities`
    
    const shots = await openai.complete({
      prompt,
      model: 'gpt-4',
      temperature: 0.3 // Lower for consistency
    })
    
    return this.formatShotList(shots)
  }
}
```

### Venue-Specific Intelligence

```
interface VenueIntelligence {
  analyzeVenuePhotos(venueImages: string[]) {
    // Use vision API to identify best photo spots
    // Natural lighting conditions
    // Architecture features
    // Backup indoor locations
  }
  
  suggestTimeline(venue: VenueData, ceremony: Date) {
    const optimalTimes = this.calculatePhotoTimes(venue, ceremony)
    return {
      gettingReady: optimalTimes.morning,
      firstLook: optimalTimes.preGoldenHour,
      familyPhotos: optimalTimes.postCeremony,
      couplePortraits: optimalTimes.goldenHour
    }
  }
}
```

## Critical Implementation Notes

- Cache venue analysis for repeat locations
- Account for seasonal lighting changes
- Include weather contingency suggestions
- Generate timeline with buffer time

## Database Structure

```
CREATE TABLE photo_venue_data (
  venue_id UUID PRIMARY KEY,
  best_photo_spots JSONB,
  lighting_analysis JSONB,
  seasonal_notes TEXT,
  photographer_tips TEXT[]
);
```