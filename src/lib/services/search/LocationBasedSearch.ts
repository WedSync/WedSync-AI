/**
 * WS-248: Advanced Search System - Location-Based Search
 *
 * LocationBasedSearch: Geographic proximity algorithms with intelligent
 * location matching, radius optimization, and travel cost analysis.
 *
 * Team B - Round 1 - Advanced Search Backend Focus
 */

// =====================================================================================
// TYPES & INTERFACES
// =====================================================================================

interface LocationContext {
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number; // km
  userLocation?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  searchPreferences?: {
    preferLocal?: boolean;
    maxTravelDistance?: number;
    destinationWedding?: boolean;
  };
}

interface SearchResult {
  id: string;
  type: 'vendor' | 'venue' | 'service';
  title: string;
  description: string;
  vendor: {
    id: string;
    name: string;
    type: string;
    verified: boolean;
    rating: number;
    reviewCount: number;
    location: {
      address: string;
      city: string;
      state: string;
      latitude: number;
      longitude: number;
    };
    contact: {
      email: string;
      phone: string;
      website?: string;
    };
  };
  services: Array<{
    id: string;
    name: string;
    category: string;
    priceRange: {
      min: number;
      max: number;
      currency: string;
    };
    availability: boolean;
  }>;
  searchMetadata: {
    score: number;
    distance?: number;
    highlights: Record<string, string[]>;
    matchedTerms: string[];
  };
}

interface LocationScoring {
  distanceScore: number;
  travelCostScore: number;
  serviceAreaScore: number;
  localKnowledgeScore: number;
  logisticsScore: number;
  destinationScore: number;
}

interface TravelAnalysis {
  distance: number;
  estimatedTravelTime: number;
  estimatedTravelCost: number;
  travelComplexity: 'simple' | 'moderate' | 'complex';
  requiresOvernight: boolean;
  recommendations: string[];
}

// =====================================================================================
// LOCATION-BASED SEARCH SERVICE
// =====================================================================================

export class LocationBasedSearch {
  private supabase: any;
  private distanceCache: Map<string, number>;
  private travelAnalysisCache: Map<string, TravelAnalysis>;

  constructor(supabase: any) {
    this.supabase = supabase;
    this.distanceCache = new Map();
    this.travelAnalysisCache = new Map();
  }

  // =====================================================================================
  // MAIN LOCATION FILTERING AND SCORING
  // =====================================================================================

  async filterAndScoreByLocation(
    results: SearchResult[],
    context: LocationContext,
  ): Promise<SearchResult[]> {
    try {
      console.log(
        `Applying location-based filtering and scoring to ${results.length} results`,
      );
      console.log(
        `Search center: ${context.center.latitude}, ${context.center.longitude} (${context.radius}km radius)`,
      );

      // Filter results within expanded search radius (with some flexibility)
      const expandedRadius = context.radius * 1.2; // 20% buffer for edge cases
      const filteredResults = results.filter((result) => {
        const distance = this.calculateDistance(
          context.center.latitude,
          context.center.longitude,
          result.vendor.location.latitude,
          result.vendor.location.longitude,
        );
        return distance <= expandedRadius;
      });

      console.log(
        `${filteredResults.length} results within ${expandedRadius}km radius`,
      );

      // Enhanced results with location analysis
      const enhancedResults = await this.enhanceWithLocationAnalysis(
        filteredResults,
        context,
      );

      // Apply location-based scoring
      const scoredResults = await Promise.all(
        enhancedResults.map(async (result) => {
          const distance = this.calculateDistance(
            context.center.latitude,
            context.center.longitude,
            result.vendor.location.latitude,
            result.vendor.location.longitude,
          );

          const locationFactors = await this.calculateLocationFactors(
            result,
            context,
            distance,
          );
          const locationScore = this.calculateLocationScore(
            locationFactors,
            context,
          );

          // Combine with existing score (location gets 30% weight)
          const combinedScore =
            result.searchMetadata.score * 0.7 + locationScore * 0.3;

          return {
            ...result,
            searchMetadata: {
              ...result.searchMetadata,
              score: combinedScore,
              distance: distance,
              locationFactors,
              locationScore,
              travelAnalysis: await this.getTravelAnalysis(result, context),
            },
          };
        }),
      );

      // Sort by combined score (includes location factors)
      const sortedResults = scoredResults.sort(
        (a, b) => b.searchMetadata.score - a.searchMetadata.score,
      );

      console.log(
        `Location scoring completed. Distance range: ${Math.min(...sortedResults.map((r) => r.searchMetadata.distance || 0))}km - ${Math.max(...sortedResults.map((r) => r.searchMetadata.distance || 0))}km`,
      );

      return sortedResults;
    } catch (error) {
      console.error('Location-based filtering error:', error);
      return results;
    }
  }

  // =====================================================================================
  // LOCATION FACTOR CALCULATIONS
  // =====================================================================================

  private async calculateLocationFactors(
    result: SearchResult,
    context: LocationContext,
    distance: number,
  ): Promise<LocationScoring> {
    const factors: LocationScoring = {
      distanceScore: this.calculateDistanceScore(distance, context.radius),
      travelCostScore: await this.calculateTravelCostScore(
        result,
        context,
        distance,
      ),
      serviceAreaScore: await this.calculateServiceAreaScore(result, context),
      localKnowledgeScore: await this.calculateLocalKnowledgeScore(
        result,
        context,
      ),
      logisticsScore: this.calculateLogisticsScore(result, context, distance),
      destinationScore: this.calculateDestinationScore(result, context),
    };

    return factors;
  }

  private calculateDistanceScore(
    distance: number,
    searchRadius: number,
  ): number {
    // Distance scoring with diminishing returns
    // 0km = 1.0, searchRadius = 0.5, 2x searchRadius = 0.1

    if (distance <= 5) return 1.0; // Perfect score for very close vendors
    if (distance <= searchRadius * 0.3) return 0.9;
    if (distance <= searchRadius * 0.6) return 0.7;
    if (distance <= searchRadius) return 0.5;
    if (distance <= searchRadius * 1.5) return 0.3;
    return Math.max(0.1, 1 - distance / (searchRadius * 3));
  }

  private async calculateTravelCostScore(
    result: SearchResult,
    context: LocationContext,
    distance: number,
  ): Promise<number> {
    try {
      // Estimate travel costs based on distance and vendor type
      const baseCostPerKm = this.getBaseCostPerKm(result.vendor.type);
      const estimatedTravelCost = distance * baseCostPerKm;

      // Travel cost scoring (lower costs = higher scores)
      if (estimatedTravelCost <= 50) return 1.0; // $0-50: Excellent
      if (estimatedTravelCost <= 100) return 0.8; // $51-100: Good
      if (estimatedTravelCost <= 200) return 0.6; // $101-200: Fair
      if (estimatedTravelCost <= 400) return 0.4; // $201-400: Expensive
      return 0.2; // $400+: Very expensive
    } catch (error) {
      console.error('Travel cost calculation error:', error);
      return 0.5;
    }
  }

  private async calculateServiceAreaScore(
    result: SearchResult,
    context: LocationContext,
  ): Promise<number> {
    try {
      // Check if vendor explicitly serves the search location
      const { data: serviceAreas } = await this.supabase
        .from('supplier_service_areas')
        .select('area_type, coordinates, travel_fee_per_km')
        .eq('supplier_id', result.vendor.id);

      if (!serviceAreas || serviceAreas.length === 0) {
        return 0.5; // Unknown service area
      }

      // Check if search location is within any defined service area
      const searchPoint = {
        lat: context.center.latitude,
        lng: context.center.longitude,
      };

      for (const area of serviceAreas) {
        if (area.area_type === 'radius') {
          // Simple radius-based service area
          const areaCenter = area.coordinates?.[0];
          if (areaCenter) {
            const distanceToCenter = this.calculateDistance(
              areaCenter.lat,
              areaCenter.lng,
              searchPoint.lat,
              searchPoint.lng,
            );

            if (distanceToCenter <= (area.coordinates?.[1]?.radius || 50)) {
              // Within primary service area
              return area.travel_fee_per_km ? 0.8 : 1.0; // Lower score if travel fees apply
            }
          }
        } else if (area.area_type === 'polygon') {
          // Polygon-based service area
          if (this.isPointInPolygon(searchPoint, area.coordinates)) {
            return area.travel_fee_per_km ? 0.8 : 1.0;
          }
        }
      }

      return 0.3; // Outside defined service areas
    } catch (error) {
      console.error('Service area calculation error:', error);
      return 0.5;
    }
  }

  private async calculateLocalKnowledgeScore(
    result: SearchResult,
    context: LocationContext,
  ): Promise<number> {
    try {
      const searchCity = await this.reverseGeocode(
        context.center.latitude,
        context.center.longitude,
      );
      const vendorCity = result.vendor.location.city;

      // Same city = excellent local knowledge
      if (
        searchCity &&
        vendorCity.toLowerCase().includes(searchCity.toLowerCase())
      ) {
        return 1.0;
      }

      // Check for local venue partnerships or portfolio work
      const { data: localWork } = await this.supabase
        .from('supplier_portfolios')
        .select('location_city, location_state')
        .eq('supplier_id', result.vendor.id)
        .limit(20);

      if (localWork && localWork.length > 0) {
        const localProjects = localWork.filter(
          (work) =>
            work.location_city &&
            searchCity &&
            work.location_city.toLowerCase().includes(searchCity.toLowerCase()),
        ).length;

        const localKnowledgeRatio = localProjects / localWork.length;
        return 0.5 + localKnowledgeRatio * 0.4; // 0.5 base + up to 0.4 boost
      }

      // Distance-based local knowledge estimation
      const distance = this.calculateDistance(
        context.center.latitude,
        context.center.longitude,
        result.vendor.location.latitude,
        result.vendor.location.longitude,
      );

      if (distance <= 25) return 0.8; // Good local knowledge within 25km
      if (distance <= 50) return 0.6; // Moderate knowledge within 50km
      return 0.4; // Limited local knowledge
    } catch (error) {
      console.error('Local knowledge calculation error:', error);
      return 0.5;
    }
  }

  private calculateLogisticsScore(
    result: SearchResult,
    context: LocationContext,
    distance: number,
  ): Promise<number> {
    // Logistics complexity based on vendor type and distance
    const vendorType = result.vendor.type.toLowerCase();

    // Different vendor types have different logistics complexity
    const logisticsComplexity = {
      photographer: 0.2, // Low complexity - portable equipment
      videographer: 0.3, // Low-medium - more equipment
      dj: 0.5, // Medium - sound equipment transport
      catering: 0.8, // High - food transport, setup
      florist: 0.6, // Medium-high - delicate transport
      venue: 0.1, // Very low - fixed location
      planner: 0.2, // Low - mostly coordination
    };

    const baseComplexity = logisticsComplexity[vendorType] || 0.5;

    // Distance affects logistics
    let distancePenalty = 0;
    if (distance > 50) distancePenalty = 0.2;
    else if (distance > 100) distancePenalty = 0.4;
    else if (distance > 200) distancePenalty = 0.6;

    const logisticsScore =
      1.0 - Math.min(baseComplexity + distancePenalty, 0.8);

    return Promise.resolve(Math.max(logisticsScore, 0.2));
  }

  private calculateDestinationScore(
    result: SearchResult,
    context: LocationContext,
  ): number {
    // Check if this appears to be a destination wedding search
    const isDestinationWedding =
      context.searchPreferences?.destinationWedding ||
      (context.userLocation &&
        this.calculateDistance(
          context.userLocation.latitude,
          context.userLocation.longitude,
          context.center.latitude,
          context.center.longitude,
        ) > 200);

    if (!isDestinationWedding) {
      return 0.5; // Neutral for local weddings
    }

    // For destination weddings, favor vendors with destination experience
    const description = result.description.toLowerCase();
    const destinationKeywords = [
      'destination',
      'travel',
      'wedding travel',
      'out of town',
      'resort',
      'beach',
      'mountain',
      'international',
    ];

    let destinationScore = 0.5; // Base score

    destinationKeywords.forEach((keyword) => {
      if (description.includes(keyword)) {
        destinationScore += 0.1;
      }
    });

    // Premium locations get boost for destination weddings
    const premiumDestinations = [
      'napa',
      'sonoma',
      'hawaii',
      "martha's vineyard",
      'nantucket',
      'charleston',
      'savannah',
      'key west',
      'santa barbara',
      'carmel',
    ];

    const location = result.vendor.location.city.toLowerCase();
    if (premiumDestinations.some((dest) => location.includes(dest))) {
      destinationScore += 0.2;
    }

    return Math.min(destinationScore, 1.0);
  }

  // =====================================================================================
  // LOCATION SCORING COMBINATION
  // =====================================================================================

  private calculateLocationScore(
    factors: LocationScoring,
    context: LocationContext,
  ): number {
    // Weighted combination of location factors
    const weights = this.getLocationWeights(context);

    const weightedScore =
      factors.distanceScore * weights.distance +
      factors.travelCostScore * weights.travelCost +
      factors.serviceAreaScore * weights.serviceArea +
      factors.localKnowledgeScore * weights.localKnowledge +
      factors.logisticsScore * weights.logistics +
      factors.destinationScore * weights.destination;

    const totalWeight = Object.values(weights).reduce(
      (sum, weight) => sum + weight,
      0,
    );

    return Math.min(Math.max(weightedScore / totalWeight, 0), 1.0);
  }

  private getLocationWeights(context: LocationContext): Record<string, number> {
    const baseWeights = {
      distance: 0.35, // Primary factor
      travelCost: 0.15, // Cost consideration
      serviceArea: 0.2, // Service coverage
      localKnowledge: 0.15, // Local expertise
      logistics: 0.1, // Practical considerations
      destination: 0.05, // Destination wedding factor
    };

    // Adjust weights based on search preferences
    if (context.searchPreferences?.preferLocal) {
      baseWeights.distance += 0.1;
      baseWeights.localKnowledge += 0.1;
      baseWeights.travelCost -= 0.1;
      baseWeights.destination -= 0.1;
    }

    if (context.searchPreferences?.destinationWedding) {
      baseWeights.destination += 0.15;
      baseWeights.logistics += 0.05;
      baseWeights.distance -= 0.1;
      baseWeights.localKnowledge -= 0.1;
    }

    return baseWeights;
  }

  // =====================================================================================
  // TRAVEL ANALYSIS
  // =====================================================================================

  private async getTravelAnalysis(
    result: SearchResult,
    context: LocationContext,
  ): Promise<TravelAnalysis> {
    const cacheKey = `${result.vendor.id}_${context.center.latitude}_${context.center.longitude}`;

    if (this.travelAnalysisCache.has(cacheKey)) {
      return this.travelAnalysisCache.get(cacheKey)!;
    }

    try {
      const distance = this.calculateDistance(
        context.center.latitude,
        context.center.longitude,
        result.vendor.location.latitude,
        result.vendor.location.longitude,
      );

      const analysis: TravelAnalysis = {
        distance: distance,
        estimatedTravelTime: this.estimateTravelTime(distance),
        estimatedTravelCost: this.estimateTravelCost(
          distance,
          result.vendor.type,
        ),
        travelComplexity: this.assessTravelComplexity(
          distance,
          result.vendor.type,
        ),
        requiresOvernight: distance > 150, // Over 150km typically requires overnight
        recommendations: this.generateTravelRecommendations(
          distance,
          result.vendor.type,
        ),
      };

      // Cache for 1 hour
      this.travelAnalysisCache.set(cacheKey, analysis);
      setTimeout(
        () => {
          this.travelAnalysisCache.delete(cacheKey);
        },
        60 * 60 * 1000,
      );

      return analysis;
    } catch (error) {
      console.error('Travel analysis error:', error);
      return {
        distance: 0,
        estimatedTravelTime: 0,
        estimatedTravelCost: 0,
        travelComplexity: 'simple',
        requiresOvernight: false,
        recommendations: [],
      };
    }
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const cacheKey = `${lat1},${lon1}_${lat2},${lon2}`;

    if (this.distanceCache.has(cacheKey)) {
      return this.distanceCache.get(cacheKey)!;
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) *
        Math.cos(this.degreesToRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    this.distanceCache.set(cacheKey, distance);
    return distance;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private estimateTravelTime(distance: number): number {
    // Simple travel time estimation (in minutes)
    // Assumes average speed of 60km/h for longer distances, slower for city driving
    if (distance <= 20) return distance * 2; // City driving - 30km/h average
    if (distance <= 100) return 20 * 2 + (distance - 20) * 1.2; // Mixed driving - 50km/h average
    return 20 * 2 + 80 * 1.2 + (distance - 100) * 1; // Highway driving - 60km/h average
  }

  private estimateTravelCost(distance: number, vendorType: string): number {
    const baseCostPerKm = this.getBaseCostPerKm(vendorType);
    const travelCost = distance * baseCostPerKm;

    // Add setup/logistics costs for certain vendor types
    const setupCosts = {
      catering: 100, // Food transport complexity
      dj: 50, // Equipment setup
      florist: 75, // Delicate transport
      photographer: 25, // Equipment transport
      videographer: 35, // Equipment transport
      planner: 15, // Travel only
      venue: 0, // No travel required
    };

    const setupCost = setupCosts[vendorType.toLowerCase()] || 30;
    return travelCost + (distance > 50 ? setupCost : 0);
  }

  private getBaseCostPerKm(vendorType: string): number {
    // Base cost per kilometer by vendor type (includes gas, wear, time)
    const costs = {
      photographer: 1.2, // Light equipment
      videographer: 1.4, // Medium equipment
      dj: 2.0, // Heavy equipment
      catering: 2.5, // Complex transport needs
      florist: 1.8, // Delicate transport
      planner: 1.0, // Travel only
      venue: 0, // No travel
    };

    return costs[vendorType.toLowerCase()] || 1.5;
  }

  private assessTravelComplexity(
    distance: number,
    vendorType: string,
  ): 'simple' | 'moderate' | 'complex' {
    const vendorComplexity = {
      photographer: 1,
      videographer: 2,
      dj: 3,
      catering: 4,
      florist: 3,
      planner: 1,
      venue: 0,
    };

    const baseComplexity = vendorComplexity[vendorType.toLowerCase()] || 2;
    const distanceComplexity = distance > 100 ? 2 : distance > 50 ? 1 : 0;

    const totalComplexity = baseComplexity + distanceComplexity;

    if (totalComplexity <= 2) return 'simple';
    if (totalComplexity <= 4) return 'moderate';
    return 'complex';
  }

  private generateTravelRecommendations(
    distance: number,
    vendorType: string,
  ): string[] {
    const recommendations = [];

    if (distance > 150) {
      recommendations.push('Consider overnight accommodations for vendor');
      recommendations.push('Factor in additional travel time for wedding day');
    }

    if (distance > 100) {
      recommendations.push('Discuss travel costs upfront');
      recommendations.push(
        'Confirm vendor is comfortable with travel distance',
      );
    }

    if (distance > 50) {
      recommendations.push('Schedule extra setup time for equipment transport');
    }

    // Vendor-specific recommendations
    if (vendorType.toLowerCase() === 'catering' && distance > 75) {
      recommendations.push(
        'Verify food safety protocols for long-distance transport',
      );
    }

    if (vendorType.toLowerCase() === 'florist' && distance > 50) {
      recommendations.push('Discuss flower freshness and transport conditions');
    }

    if (
      ['dj', 'videographer'].includes(vendorType.toLowerCase()) &&
      distance > 100
    ) {
      recommendations.push('Confirm backup equipment availability at venue');
    }

    return recommendations;
  }

  private async enhanceWithLocationAnalysis(
    results: SearchResult[],
    context: LocationContext,
  ): Promise<SearchResult[]> {
    // Pre-fetch service areas for all vendors to avoid N+1 queries
    const vendorIds = results.map((r) => r.vendor.id);

    try {
      const { data: serviceAreas } = await this.supabase
        .from('supplier_service_areas')
        .select(
          'supplier_id, area_type, coordinates, travel_fee_per_km, max_travel_distance',
        )
        .in('supplier_id', vendorIds);

      const serviceAreaMap = new Map();
      serviceAreas?.forEach((area) => {
        if (!serviceAreaMap.has(area.supplier_id)) {
          serviceAreaMap.set(area.supplier_id, []);
        }
        serviceAreaMap.get(area.supplier_id).push(area);
      });

      return results.map((result) => ({
        ...result,
        locationData: {
          serviceAreas: serviceAreaMap.get(result.vendor.id) || [],
          searchDistance: this.calculateDistance(
            context.center.latitude,
            context.center.longitude,
            result.vendor.location.latitude,
            result.vendor.location.longitude,
          ),
        },
      }));
    } catch (error) {
      console.error('Location analysis enhancement error:', error);
      return results;
    }
  }

  private async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<string | null> {
    // Simple reverse geocoding - in production would use proper geocoding service
    try {
      // For now, return null and rely on other location matching methods
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  private isPointInPolygon(
    point: { lat: number; lng: number },
    polygon: any[],
  ): boolean {
    // Simple point-in-polygon algorithm
    // In production, would use more sophisticated geospatial library
    if (!polygon || polygon.length < 3) return false;

    let inside = false;
    const x = point.lat;
    const y = point.lng;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat;
      const yi = polygon[i].lng;
      const xj = polygon[j].lat;
      const yj = polygon[j].lng;

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  // =====================================================================================
  // LOCATION INSIGHTS AND RECOMMENDATIONS
  // =====================================================================================

  async generateLocationInsights(
    results: SearchResult[],
    context: LocationContext,
  ): Promise<any[]> {
    const insights = [];

    try {
      // Distance distribution analysis
      const distances = results.map((r) => r.searchMetadata.distance || 0);
      const avgDistance =
        distances.reduce((sum, d) => sum + d, 0) / distances.length;

      if (avgDistance > context.radius * 0.8) {
        insights.push({
          type: 'location_suggestion',
          message: `Most vendors are near your maximum search distance (${context.radius}km)`,
          recommendation:
            'Consider expanding your search radius to see more options',
        });
      }

      // Travel cost analysis
      const totalTravelCosts = await Promise.all(
        results.map(async (result) => {
          const analysis = await this.getTravelAnalysis(result, context);
          return analysis.estimatedTravelCost;
        }),
      );

      const avgTravelCost =
        totalTravelCosts.reduce((sum, cost) => sum + cost, 0) /
        totalTravelCosts.length;

      if (avgTravelCost > 200) {
        insights.push({
          type: 'budget_consideration',
          message: `Average vendor travel costs: $${Math.round(avgTravelCost)}`,
          recommendation:
            'Factor travel costs into your wedding budget planning',
        });
      }

      // Service area coverage
      const vendorsOutsideServiceArea = results.filter(
        (result) =>
          result.searchMetadata.locationFactors?.serviceAreaScore < 0.5,
      ).length;

      if (vendorsOutsideServiceArea > results.length * 0.3) {
        insights.push({
          type: 'service_area_warning',
          message: 'Some vendors may not typically serve your wedding location',
          recommendation:
            'Confirm service availability and any additional fees upfront',
        });
      }

      return insights;
    } catch (error) {
      console.error('Location insights error:', error);
      return [];
    }
  }

  // =====================================================================================
  // CLEANUP
  // =====================================================================================

  clearCaches(): void {
    this.distanceCache.clear();
    this.travelAnalysisCache.clear();
  }
}
