# TEAM C - ROUND 1: WS-318 - Couple Onboarding Section Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Integrate couple onboarding with external wedding services, social platforms, and vendor discovery systems
**FEATURE ID:** WS-318 (Track all work with this ID)

## 🚨 EVIDENCE REQUIREMENTS
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/onboarding/
npm test integration/onboarding  # All tests passing
npx playwright test onboarding-integrations  # E2E integration tests
```

## 🎯 INTEGRATION FOCUS
- **Wedding Planning Platform Integration:** The Knot, WeddingWire, Zola for vendor discovery and inspiration
- **Social Media Integration:** Instagram, Pinterest for wedding inspiration during onboarding
- **Calendar Integration:** Google Calendar, Apple Calendar for wedding timeline setup
- **Location Services:** Google Places, venue databases for accurate venue information
- **Communication Platform Integration:** Email, SMS services for vendor invitation workflows
- **Registry Platform Integration:** Amazon, Target registries for gift management setup

## 💕 REAL COUPLE INTEGRATION SCENARIO
**Integration Story:** "During Sarah and Tom's onboarding, they want to import their wedding inspiration from their Pinterest boards, automatically sync their wedding date to their Google Calendar, find their venue using Google Places integration, invite vendors they discovered on The Knot, and set up their Amazon registry - all without leaving the WedMe onboarding flow. The integrations should feel seamless and reduce duplicate data entry across their wedding planning tools."

## 🔌 WEDDING PLANNING PLATFORM INTEGRATION

### The Knot Integration
```typescript
interface TheKnotIntegration {
  vendorDiscovery: {
    searchApi: boolean;
    reviewsImport: boolean;
    portfolioSync: boolean;
    contactInformation: boolean;
  };
  inspirationImport: {
    savedVendors: boolean;
    favoritePhotos: boolean;
    budgetEstimates: boolean;
    timelineTemplates: boolean;
  };
  profileSync: {
    weddingBasics: boolean;
    guestListSize: boolean;
    budgetRange: boolean;
    weddingStyle: boolean;
  };
}

export class TheKnotIntegrationService {
  async importVendorFavorites(
    theKnotUserId: string,
    coupleId: string
  ): Promise<ImportedVendor[]> {
    // Fetch saved vendors from The Knot profile
    const savedVendors = await this.theKnotAPI.getSavedVendors(theKnotUserId);
    
    // Transform to WedMe vendor invitation format
    const vendorInvitations = savedVendors.map(vendor => ({
      businessName: vendor.businessName,
      email: vendor.contactEmail,
      serviceType: this.mapServiceType(vendor.category),
      source: 'the_knot',
      theKnotRating: vendor.rating,
      reviewCount: vendor.reviewCount
    }));
    
    // Generate invitation suggestions for couple approval
    return await this.processVendorInvitationSuggestions(coupleId, vendorInvitations);
  }

  async syncWeddingBasics(
    theKnotProfileData: TheKnotProfile,
    coupleId: string
  ): Promise<void> {
    // Import wedding date, venue, guest count from The Knot profile
    const weddingBasics = {
      weddingDate: theKnotProfileData.weddingDate,
      venue: theKnotProfileData.venue,
      guestCount: theKnotProfileData.guestCount,
      budgetRange: theKnotProfileData.budgetRange,
      weddingStyle: theKnotProfileData.style
    };
    
    await this.weddingBasicsService.updateFromExternal(coupleId, weddingBasics, 'the_knot');
  }
}
```

### WeddingWire Integration
```typescript
export class WeddingWireIntegrationService {
  async importWeddingWireData(
    weddingWireAuth: OAuth2Token,
    coupleId: string
  ): Promise<WeddingWireImportResult> {
    const [vendors, inspiration, timeline] = await Promise.all([
      this.importFavoriteVendors(weddingWireAuth),
      this.importWeddingInspiration(weddingWireAuth),
      this.importPlanningTimeline(weddingWireAuth)
    ]);
    
    return {
      vendors: await this.processVendorImport(coupleId, vendors),
      inspiration: await this.processInspirationImport(coupleId, inspiration),
      timeline: await this.processTimelineImport(coupleId, timeline),
      importDate: new Date()
    };
  }

  private async importFavoriteVendors(auth: OAuth2Token): Promise<WeddingWireVendor[]> {
    // Fetch favorited vendors from WeddingWire
    const response = await this.weddingWireAPI.getFavorites(auth);
    
    return response.vendors.map(vendor => ({
      businessName: vendor.name,
      serviceType: vendor.category,
      location: vendor.address,
      rating: vendor.averageRating,
      priceRange: vendor.priceRange,
      contactEmail: vendor.email,
      website: vendor.website,
      weddingWireId: vendor.id
    }));
  }
}
```

## 📱 SOCIAL MEDIA INSPIRATION INTEGRATION

### Pinterest Wedding Inspiration Import
```typescript
export class PinterestOnboardingIntegration {
  async importWeddingBoards(
    pinterestAuth: OAuth2Token,
    coupleId: string
  ): Promise<InspirationImport> {
    // Find wedding-related Pinterest boards
    const boards = await this.pinterestAPI.getUserBoards(pinterestAuth);
    const weddingBoards = boards.filter(board => 
      this.isWeddingRelatedBoard(board.name, board.description)
    );
    
    const inspirationData = [];
    
    for (const board of weddingBoards) {
      const pins = await this.pinterestAPI.getBoardPins(board.id, pinterestAuth);
      
      for (const pin of pins) {
        inspirationData.push({
          type: this.categorizeWeddingInspiration(pin.description, pin.note),
          imageUrl: pin.images.original.url,
          source: 'pinterest',
          description: pin.description,
          category: this.mapToCategoryType(board.name),
          colors: await this.extractColors(pin.images.original.url),
          tags: this.extractTags(pin.description)
        });
      }
    }
    
    return await this.processInspirationData(coupleId, inspirationData);
  }

  private categorizeWeddingInspiration(description: string, note?: string): WeddingCategory {
    const text = `${description} ${note || ''}`.toLowerCase();
    
    if (text.includes('dress') || text.includes('gown')) return 'bridal_attire';
    if (text.includes('flower') || text.includes('bouquet')) return 'florals';
    if (text.includes('venue') || text.includes('location')) return 'venue';
    if (text.includes('cake') || text.includes('dessert')) return 'catering';
    if (text.includes('decor') || text.includes('centerpiece')) return 'decor';
    if (text.includes('photo') || text.includes('pose')) return 'photography';
    
    return 'general';
  }
}
```

### Instagram Wedding Content Integration
```typescript
export class InstagramOnboardingIntegration {
  async setupWeddingHashtagTracking(
    coupleId: string,
    weddingHashtag: string
  ): Promise<void> {
    // Set up hashtag monitoring for couple's wedding
    await this.instagramAPI.createHashtagSubscription(weddingHashtag, {
      webhookUrl: this.generateWebhookUrl(coupleId),
      events: ['new_post', 'story_mention']
    });
    
    // Store hashtag tracking preferences
    await this.onboardingPreferences.setHashtagTracking(coupleId, {
      primaryHashtag: weddingHashtag,
      trackingEnabled: true,
      notifyCouple: true,
      shareWithVendors: false // Default to private
    });
  }

  async importEngagementPhotos(
    instagramAuth: OAuth2Token,
    coupleId: string
  ): Promise<void> {
    // Look for recent engagement photos in couple's Instagram
    const recentMedia = await this.instagramAPI.getUserMedia(instagramAuth, {
      limit: 50,
      fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp'
    });
    
    // Filter for engagement-related content
    const engagementContent = recentMedia.data.filter(post =>
      this.isEngagementRelated(post.caption)
    );
    
    // Offer to import for wedding website
    await this.suggestEngagementPhotoImport(coupleId, engagementContent);
  }
}
```

## 📅 CALENDAR INTEGRATION FOR ONBOARDING

### Google Calendar Wedding Timeline Setup
```typescript
export class GoogleCalendarOnboardingIntegration {
  async setupWeddingCalendar(
    googleAuth: OAuth2Token,
    coupleId: string,
    weddingDate: Date
  ): Promise<void> {
    // Create dedicated wedding planning calendar
    const weddingCalendar = await this.googleCalendarAPI.createCalendar({
      summary: `${await this.getCoupleNames(coupleId)} Wedding Planning`,
      description: 'Wedding planning timeline and vendor appointments',
      timeZone: await this.getCoupleTimezone(coupleId)
    }, googleAuth);
    
    // Add main wedding event
    await this.googleCalendarAPI.createEvent(weddingCalendar.id, {
      summary: `${await this.getCoupleNames(coupleId)} Wedding Day`,
      start: { date: weddingDate.toISOString().split('T')[0] },
      end: { date: weddingDate.toISOString().split('T')[0] },
      description: 'Our special day! 💍',
      colorId: '11' // Wedding-appropriate color
    }, googleAuth);
    
    // Set up automatic vendor appointment sync
    await this.setupVendorAppointmentSync(coupleId, weddingCalendar.id, googleAuth);
  }

  async importExistingWeddingEvents(
    googleAuth: OAuth2Token,
    coupleId: string
  ): Promise<ImportedEvent[]> {
    // Search for existing wedding-related events
    const events = await this.googleCalendarAPI.searchEvents({
      q: 'wedding venue cake tasting dress fitting',
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    }, googleAuth);
    
    // Process and suggest importing relevant events
    const weddingEvents = events.items.filter(event =>
      this.isWeddingRelated(event.summary, event.description)
    );
    
    return await this.processEventImportSuggestions(coupleId, weddingEvents);
  }
}
```

## 🗺️ LOCATION AND VENUE INTEGRATION

### Google Places Venue Discovery
```typescript
export class GooglePlacesVenueIntegration {
  async searchWeddingVenues(
    location: string,
    preferences: VenuePreferences
  ): Promise<VenueSearchResult[]> {
    // Search for wedding venues using Google Places API
    const searchQuery = `wedding venue ${location}`;
    const placesResult = await this.googlePlacesAPI.textSearch(searchQuery);
    
    const venues = [];
    
    for (const place of placesResult.results) {
      // Get detailed venue information
      const details = await this.googlePlacesAPI.getPlaceDetails(place.place_id, {
        fields: 'name,formatted_address,international_phone_number,website,photos,rating,price_level,opening_hours'
      });
      
      // Enrich with wedding-specific data if available
      const venueInfo = {
        name: details.name,
        address: details.formatted_address,
        phone: details.international_phone_number,
        website: details.website,
        rating: details.rating,
        priceLevel: details.price_level,
        photos: details.photos?.map(photo => this.getPhotoUrl(photo.photo_reference)),
        weddingCapacity: await this.estimateWeddingCapacity(place.place_id),
        venueType: this.categorizeVenueType(details.name, details.types),
        googlePlaceId: place.place_id
      };
      
      venues.push(venueInfo);
    }
    
    return this.rankVenues(venues, preferences);
  }

  async validateVenueInformation(venueData: VenueInput): Promise<VenueValidationResult> {
    // Validate and enrich venue data using Google Places
    const searchResult = await this.googlePlacesAPI.findPlace(
      `${venueData.name} ${venueData.address}`,
      'textquery'
    );
    
    if (searchResult.candidates.length > 0) {
      const place = searchResult.candidates[0];
      const details = await this.googlePlacesAPI.getPlaceDetails(place.place_id);
      
      return {
        isValid: true,
        enrichedData: {
          ...venueData,
          verifiedAddress: details.formatted_address,
          phone: details.international_phone_number,
          website: details.website,
          googlePlaceId: place.place_id,
          coordinates: {
            lat: details.geometry.location.lat,
            lng: details.geometry.location.lng
          }
        },
        suggestions: []
      };
    }
    
    return {
      isValid: false,
      errors: ['Venue not found in Google Places database'],
      suggestions: ['Please verify the venue name and address']
    };
  }
}
```

## 💾 REQUIRED FILES TO CREATE
```
$WS_ROOT/wedsync/src/lib/integrations/onboarding/
├── wedding-platforms/
│   ├── the-knot-integration.ts       # The Knot vendor and data import
│   ├── weddingwire-integration.ts    # WeddingWire data synchronization
│   ├── zola-registry-integration.ts  # Zola registry and planning tools
│   └── wedding-platform-aggregator.ts # Multi-platform data aggregation
├── social-media/
│   ├── pinterest-inspiration.ts      # Pinterest wedding board import
│   ├── instagram-engagement.ts       # Instagram wedding content integration
│   ├── facebook-event-sync.ts        # Facebook wedding event integration
│   └── social-media-orchestrator.ts  # Unified social media management
├── calendar-integration/
│   ├── google-calendar-onboarding.ts # Google Calendar wedding setup
│   ├── apple-calendar-sync.ts        # iCloud Calendar integration
│   ├── outlook-calendar-service.ts   # Outlook Calendar integration
│   └── calendar-timeline-sync.ts     # Cross-platform calendar coordination
├── location-services/
│   ├── google-places-venues.ts       # Google Places venue discovery
│   ├── venue-database-integration.ts # Wedding venue database connections
│   ├── location-validator.ts         # Address and location validation
│   └── travel-time-calculator.ts     # Vendor travel time estimation
├── communication/
│   ├── email-invitation-service.ts   # Vendor invitation email system
│   ├── sms-notification-service.ts   # SMS notifications for onboarding
│   ├── whatsapp-integration.ts       # WhatsApp vendor communication
│   └── communication-orchestrator.ts # Multi-channel communication
├── registry-integration/
│   ├── amazon-registry-sync.ts       # Amazon wedding registry setup
│   ├── target-registry-integration.ts # Target registry management
│   ├── registry-aggregator.ts        # Multi-registry coordination
│   └── gift-tracking-setup.ts        # Gift tracking initialization
└── __tests__/
    ├── wedding-platform-integration.test.ts
    ├── social-media-integration.test.ts
    ├── calendar-integration.test.ts
    └── venue-discovery.test.ts

$WS_ROOT/wedsync/src/app/api/integrations/onboarding/
├── wedding-platforms/
│   ├── the-knot/route.ts            # The Knot API integration
│   ├── weddingwire/route.ts         # WeddingWire API integration
│   └── import/route.ts              # Platform data import processing
├── social-media/
│   ├── pinterest/route.ts           # Pinterest OAuth and data import
│   ├── instagram/route.ts           # Instagram integration
│   └── inspiration/route.ts         # Wedding inspiration processing
├── calendar/
│   ├── google/route.ts              # Google Calendar integration
│   ├── apple/route.ts               # Apple Calendar sync
│   └── setup/route.ts               # Calendar setup automation
├── venues/
│   ├── search/route.ts              # Venue discovery API
│   ├── validate/route.ts            # Venue information validation
│   └── enrich/route.ts              # Venue data enrichment
└── communications/
    ├── email/route.ts               # Email invitation processing
    ├── sms/route.ts                 # SMS notification handling
    └── invitations/route.ts         # Vendor invitation management
```

## 🔧 IMPLEMENTATION DETAILS

### OAuth Integration Manager
```typescript
export class OnboardingOAuthManager {
  async initiatePlatformConnection(
    coupleId: string,
    platform: IntegrationPlatform,
    scopes: string[]
  ): Promise<OAuthInitiation> {
    // Generate secure state parameter for OAuth flow
    const state = await this.generateSecureState(coupleId, platform);
    
    // Build OAuth authorization URL with wedding-specific scopes
    const authUrl = this.buildOAuthUrl(platform, scopes, state);
    
    // Store OAuth initiation for security validation
    await this.storeOAuthState(state, {
      coupleId,
      platform,
      scopes,
      initiatedAt: new Date()
    });
    
    return {
      authUrl,
      state,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
  }

  async handleOAuthCallback(
    platform: IntegrationPlatform,
    code: string,
    state: string
  ): Promise<IntegrationSetupResult> {
    // Validate OAuth state and exchange code for tokens
    const oauthState = await this.validateAndRetrieveState(state);
    const tokens = await this.exchangeCodeForTokens(platform, code);
    
    // Store encrypted tokens securely
    await this.storeIntegrationTokens(oauthState.coupleId, platform, tokens);
    
    // Begin data import process
    const importResult = await this.initiateDataImport(
      oauthState.coupleId,
      platform,
      tokens
    );
    
    return {
      success: true,
      platform,
      importResult,
      setupComplete: importResult.completed
    };
  }
}
```

### Multi-Platform Data Aggregation
```typescript
export class OnboardingDataAggregator {
  async aggregateWeddingData(coupleId: string): Promise<AggregatedWeddingData> {
    // Get all connected integration platforms
    const integrations = await this.getActiveIntegrations(coupleId);
    
    // Fetch data from all connected platforms
    const dataPromises = integrations.map(integration =>
      this.fetchPlatformData(integration.platform, integration.tokens)
    );
    
    const platformData = await Promise.allSettled(dataPromises);
    
    // Aggregate and deduplicate data across platforms
    return {
      vendors: this.aggregateVendorData(platformData),
      inspiration: this.aggregateInspirationData(platformData),
      timeline: this.aggregateTimelineData(platformData),
      venues: this.aggregateVenueData(platformData),
      registries: this.aggregateRegistryData(platformData),
      conflicts: this.identifyDataConflicts(platformData)
    };
  }

  private aggregateVendorData(platformData: PlatformDataResult[]): AggregatedVendors {
    // Combine vendor data from multiple platforms
    // Deduplicate based on business name and contact information
    // Score vendors based on ratings across platforms
    // Identify vendor availability conflicts
  }
}
```

## 🎯 ACCEPTANCE CRITERIA

### Integration Functionality
- [ ] OAuth flows work correctly for all supported wedding platforms
- [ ] Data import completes without loss from external services
- [ ] Venue discovery provides accurate, wedding-appropriate results
- [ ] Calendar integration sets up wedding timeline automatically
- [ ] Social media inspiration imports and categorizes correctly
- [ ] Vendor invitation emails deliver successfully with proper formatting

### Data Quality & Consistency
- [ ] Imported data validates correctly and integrates with onboarding
- [ ] Duplicate data detection prevents redundant entries
- [ ] Platform data conflicts identified and resolved appropriately
- [ ] Venue information enriched and validated through Google Places
- [ ] Wedding inspiration categorized accurately for vendor sharing

### Security & Privacy Compliance
- [ ] All OAuth integrations use secure authentication flows
- [ ] Third-party access tokens stored and managed securely
- [ ] Couple consent required for all external platform connections
- [ ] Data import respects platform rate limits and terms of service
- [ ] Imported data deletion available for privacy compliance

## 📊 WEDDING INDUSTRY INTEGRATION FEATURES

### Wedding Planning Ecosystem
- Cross-platform vendor recommendation scoring
- Wedding inspiration trend analysis across social platforms
- Budget coordination between registry and planning platforms
- Timeline synchronization with vendor booking platforms

### Vendor Discovery Optimization
- Multi-platform vendor rating aggregation
- Availability synchronization across wedding platforms
- Review sentiment analysis for vendor recommendations
- Geographic vendor coverage optimization

### Wedding Timeline Intelligence
- Seasonal booking trend integration from planning platforms
- Vendor availability coordination across multiple systems
- Cultural wedding tradition integration from social media
- Emergency vendor replacement suggestions from platform networks

**EXECUTE IMMEDIATELY - Build comprehensive integration layer that seamlessly connects couple onboarding with their existing wedding planning ecosystem!**