/**
 * WS-116: Service Radius Calculation System
 * Advanced service area management and calculation for suppliers
 */

import { createClient } from '@supabase/supabase-js';
import {
  RouteCalculator,
  createRouteCalculator,
} from '@/lib/maps/route-calculator';

export interface ServiceAreaConfig {
  supplierId: string;
  baseLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  serviceType: 'radius' | 'polygon' | 'regions' | 'nationwide';

  // Radius-based configuration
  radiusKm?: number;
  travelTimeMaxMinutes?: number;

  // Polygon-based configuration
  polygonCoordinates?: Array<[number, number]>; // [lng, lat] pairs

  // Region-based configuration
  specificRegions?: {
    countries?: string[];
    states?: string[];
    cities?: string[];
    postcodes?: string[];
  };

  // Service limitations
  maxDistanceKm?: number;
  additionalTravelCost?: number; // Cost per km beyond base radius
  minimumBookingValue?: number;

  // Coverage preferences
  nationwideCoverage?: boolean;
  internationalCoverage?: boolean;

  notes?: string;
}

export interface ServiceAreaAnalysis {
  totalArea: number; // in square kilometers
  populationCovered: number;
  citiesCovered: string[];
  averageTravelTime: number; // in minutes
  competitorCount: number;
  marketPotential: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface LocationServiceCheck {
  isServed: boolean;
  distance: number; // in kilometers
  travelTime?: number; // in minutes
  additionalCost?: number;
  serviceLevel: 'primary' | 'secondary' | 'extended' | 'not_served';
  notes?: string;
}

export interface ServiceAreaOptimization {
  currentCoverage: ServiceAreaAnalysis;
  suggestedRadius?: number;
  suggestedRegions?: string[];
  potentialMarketGains: number;
  costImplications: {
    additionalTravelCosts: number;
    potentialRevenue: number;
    netBenefit: number;
  };
}

class ServiceRadiusCalculator {
  private supabase;
  private routeCalculator: RouteCalculator;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.routeCalculator = createRouteCalculator({
      apiKey: process.env.GOOGLE_MAPS_API_KEY!,
      defaultBufferTime: 15,
    });
  }

  /**
   * Create or update a supplier's service area configuration
   */
  async updateServiceArea(
    config: ServiceAreaConfig,
  ): Promise<{ success: boolean; serviceAreaId: string }> {
    try {
      // Validate base location
      if (!config.baseLocation.latitude || !config.baseLocation.longitude) {
        throw new Error('Valid base location coordinates are required');
      }

      // Prepare service area data
      const serviceAreaData: any = {
        supplier_id: config.supplierId,
        service_type: config.serviceType,
        service_radius_km: config.radiusKm,
        travel_time_max_minutes: config.travelTimeMaxMinutes,
        additional_travel_cost: config.additionalTravelCost,
        minimum_booking_value: config.minimumBookingValue,
        nationwide_coverage: config.nationwideCoverage || false,
        international_coverage: config.internationalCoverage || false,
        notes: config.notes,
        is_primary_area: true,
        priority_level: 1,
      };

      // Handle polygon coordinates
      if (config.serviceType === 'polygon' && config.polygonCoordinates) {
        const polygonWKT = this.createPolygonWKT(config.polygonCoordinates);
        serviceAreaData.service_polygon = polygonWKT;
      }

      // Handle specific regions
      if (config.serviceType === 'regions' && config.specificRegions) {
        const { countries, states, cities, postcodes } = config.specificRegions;

        if (countries?.length) {
          serviceAreaData.countries = await this.getCountryIds(countries);
        }
        if (states?.length) {
          serviceAreaData.states = await this.getStateIds(states);
        }
        if (cities?.length) {
          serviceAreaData.cities = await this.getCityIds(cities);
        }
        if (postcodes?.length) {
          serviceAreaData.postcodes = await this.getPostcodeIds(postcodes);
        }
      }

      // Insert or update service area
      const { data, error } = await this.supabase
        .from('supplier_service_areas')
        .upsert(serviceAreaData, {
          onConflict: 'supplier_id',
          ignoreDuplicates: false,
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      // Update supplier's main service radius for compatibility
      if (config.radiusKm) {
        await this.supabase
          .from('suppliers')
          .update({
            service_radius_miles: Math.round(config.radiusKm * 0.621371), // Convert km to miles
          })
          .eq('id', config.supplierId);
      }

      return {
        success: true,
        serviceAreaId: data.id,
      };
    } catch (error: any) {
      console.error('Error updating service area:', error);
      throw new Error(`Failed to update service area: ${error.message}`);
    }
  }

  /**
   * Analyze a supplier's current service area
   */
  async analyzeServiceArea(supplierId: string): Promise<ServiceAreaAnalysis> {
    try {
      // Get supplier and service area data
      const { data: supplier } = await this.supabase
        .from('suppliers')
        .select(
          `
          *,
          supplier_service_areas(*)
        `,
        )
        .eq('id', supplierId)
        .single();

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      const serviceArea = supplier.supplier_service_areas?.[0];
      if (!serviceArea) {
        throw new Error('No service area configured');
      }

      // Calculate covered cities within service area
      const coveredCities = await this.getCitiesInServiceArea(
        supplier,
        serviceArea,
      );

      // Estimate population coverage
      const populationCovered =
        await this.estimatePopulationCoverage(coveredCities);

      // Count competitors in the same area
      const competitorCount = await this.countCompetitorsInArea(
        supplier.latitude,
        supplier.longitude,
        serviceArea.service_radius_km || 50,
        supplier.primary_category,
      );

      // Calculate total area
      const totalArea = this.calculateServiceAreaSize(serviceArea);

      // Determine market potential
      const marketPotential = this.assessMarketPotential(
        populationCovered,
        competitorCount,
        totalArea,
      );

      // Generate recommendations
      const recommendations = this.generateServiceAreaRecommendations(
        serviceArea,
        competitorCount,
        populationCovered,
      );

      return {
        totalArea,
        populationCovered,
        citiesCovered: coveredCities.map((city) => city.name),
        averageTravelTime: serviceArea.travel_time_max_minutes || 60,
        competitorCount,
        marketPotential,
        recommendations,
      };
    } catch (error: any) {
      console.error('Error analyzing service area:', error);
      throw new Error(`Failed to analyze service area: ${error.message}`);
    }
  }

  /**
   * Check if a supplier serves a specific location
   */
  async checkLocationService(
    supplierId: string,
    latitude: number,
    longitude: number,
    includeRouting: boolean = false,
  ): Promise<LocationServiceCheck> {
    try {
      // Get supplier location and service areas
      const { data: supplier } = await this.supabase
        .from('suppliers')
        .select(
          `
          *,
          supplier_service_areas(*)
        `,
        )
        .eq('id', supplierId)
        .single();

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      // Calculate straight-line distance
      const distance = this.calculateDistance(
        supplier.latitude,
        supplier.longitude,
        latitude,
        longitude,
      );

      let travelTime: number | undefined;
      let isServed = false;
      let serviceLevel: 'primary' | 'secondary' | 'extended' | 'not_served' =
        'not_served';
      let additionalCost: number | undefined;

      // Check each service area
      for (const serviceArea of supplier.supplier_service_areas || []) {
        const areaCheck = await this.checkServiceAreaCoverage(
          serviceArea,
          supplier,
          latitude,
          longitude,
          distance,
        );

        if (areaCheck.isServed) {
          isServed = true;
          serviceLevel = areaCheck.serviceLevel;
          additionalCost = areaCheck.additionalCost;
          break;
        }
      }

      // Calculate travel time if routing requested and location is served
      if (includeRouting && isServed) {
        try {
          const route = await this.routeCalculator.calculateRoute([
            {
              id: 'origin',
              location: {
                lat: supplier.latitude,
                lng: supplier.longitude,
                name: 'Supplier Location',
              },
              name: 'Supplier',
              type: 'pickup',
            },
            {
              id: 'destination',
              location: {
                lat: latitude,
                lng: longitude,
                name: 'Service Location',
              },
              name: 'Service Location',
              type: 'destination',
            },
          ]);

          travelTime = Math.round(route.totalDurationInTraffic / 60); // Convert to minutes
        } catch (routeError) {
          console.warn('Route calculation failed:', routeError);
        }
      }

      return {
        isServed,
        distance: Math.round(distance * 10) / 10,
        travelTime,
        additionalCost,
        serviceLevel,
        notes: this.generateServiceNotes(serviceLevel, distance, travelTime),
      };
    } catch (error: any) {
      console.error('Error checking location service:', error);
      throw new Error(`Failed to check location service: ${error.message}`);
    }
  }

  /**
   * Optimize service area based on market data and performance
   */
  async optimizeServiceArea(
    supplierId: string,
  ): Promise<ServiceAreaOptimization> {
    try {
      // Get current service area analysis
      const currentCoverage = await this.analyzeServiceArea(supplierId);

      // Get supplier's booking and inquiry data for analysis
      const { data: supplier } = await this.supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .single();

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      // Analyze booking patterns by distance (this would require booking data)
      const bookingAnalysis = await this.analyzeBookingPatterns(supplierId);

      // Calculate optimal radius based on booking density and competition
      const suggestedRadius = this.calculateOptimalRadius(
        supplier,
        bookingAnalysis,
        currentCoverage,
      );

      // Identify high-potential regions
      const suggestedRegions = await this.identifyHighPotentialRegions(
        supplier.latitude,
        supplier.longitude,
        supplier.primary_category,
      );

      // Calculate cost implications
      const costImplications = this.calculateCostImplications(
        currentCoverage,
        suggestedRadius,
        supplier,
      );

      return {
        currentCoverage,
        suggestedRadius,
        suggestedRegions,
        potentialMarketGains:
          costImplications.potentialRevenue -
          costImplications.additionalTravelCosts,
        costImplications,
      };
    } catch (error: any) {
      console.error('Error optimizing service area:', error);
      throw new Error(`Failed to optimize service area: ${error.message}`);
    }
  }

  /**
   * Helper methods
   */

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private createPolygonWKT(coordinates: Array<[number, number]>): string {
    const coordString = coordinates
      .map((coord) => `${coord[0]} ${coord[1]}`)
      .join(', ');
    return `POLYGON((${coordString}))`;
  }

  private async getCountryIds(countryNames: string[]): Promise<string[]> {
    const { data } = await this.supabase
      .from('countries')
      .select('id')
      .in('name', countryNames);
    return data?.map((c) => c.id) || [];
  }

  private async getStateIds(stateNames: string[]): Promise<string[]> {
    const { data } = await this.supabase
      .from('states')
      .select('id')
      .in('name', stateNames);
    return data?.map((s) => s.id) || [];
  }

  private async getCityIds(cityNames: string[]): Promise<string[]> {
    const { data } = await this.supabase
      .from('cities')
      .select('id')
      .in('name', cityNames);
    return data?.map((c) => c.id) || [];
  }

  private async getPostcodeIds(postcodes: string[]): Promise<string[]> {
    const { data } = await this.supabase
      .from('postcodes')
      .select('id')
      .in('code', postcodes);
    return data?.map((p) => p.id) || [];
  }

  private async getCitiesInServiceArea(
    supplier: any,
    serviceArea: any,
  ): Promise<any[]> {
    if (
      serviceArea.service_type === 'radius' &&
      serviceArea.service_radius_km
    ) {
      const { data } = await this.supabase.rpc('find_cities_in_radius', {
        center_lat: supplier.latitude,
        center_lng: supplier.longitude,
        radius_km: serviceArea.service_radius_km,
      });
      return data || [];
    }

    // For other service types, return empty array for now
    return [];
  }

  private async estimatePopulationCoverage(cities: any[]): Promise<number> {
    return cities.reduce((total, city) => total + (city.population || 0), 0);
  }

  private async countCompetitorsInArea(
    lat: number,
    lng: number,
    radius: number,
    category: string,
  ): Promise<number> {
    const { count } = await this.supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
      .eq('primary_category', category)
      .eq('is_published', true)
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Exclude current supplier

    return count || 0;
  }

  private calculateServiceAreaSize(serviceArea: any): number {
    if (
      serviceArea.service_type === 'radius' &&
      serviceArea.service_radius_km
    ) {
      return Math.PI * Math.pow(serviceArea.service_radius_km, 2);
    }
    return 0; // Would need PostGIS calculation for polygons
  }

  private assessMarketPotential(
    population: number,
    competitors: number,
    area: number,
  ): 'low' | 'medium' | 'high' {
    const marketDensity = population / Math.max(area, 1);
    const competition = competitors / Math.max(population / 10000, 1);

    if (marketDensity > 50 && competition < 2) return 'high';
    if (marketDensity > 20 && competition < 5) return 'medium';
    return 'low';
  }

  private generateServiceAreaRecommendations(
    serviceArea: any,
    competitors: number,
    population: number,
  ): string[] {
    const recommendations: string[] = [];

    if (competitors > 10) {
      recommendations.push(
        'Consider specializing in a niche to stand out from high competition',
      );
    }

    if (population < 50000) {
      recommendations.push(
        'Consider expanding service area to reach more potential clients',
      );
    }

    if (serviceArea.service_radius_km && serviceArea.service_radius_km > 100) {
      recommendations.push(
        'Large service area may increase travel costs - consider regional pricing',
      );
    }

    return recommendations;
  }

  private async checkServiceAreaCoverage(
    serviceArea: any,
    supplier: any,
    lat: number,
    lng: number,
    distance: number,
  ): Promise<{
    isServed: boolean;
    serviceLevel: any;
    additionalCost?: number;
  }> {
    // Nationwide coverage
    if (serviceArea.nationwide_coverage) {
      return {
        isServed: true,
        serviceLevel: 'extended',
        additionalCost: distance * (serviceArea.additional_travel_cost || 0),
      };
    }

    // Radius-based coverage
    if (
      serviceArea.service_type === 'radius' &&
      serviceArea.service_radius_km
    ) {
      if (distance <= serviceArea.service_radius_km) {
        const level =
          distance <= serviceArea.service_radius_km * 0.5
            ? 'primary'
            : 'secondary';
        return {
          isServed: true,
          serviceLevel: level,
          additionalCost:
            Math.max(0, distance - serviceArea.service_radius_km * 0.5) *
            (serviceArea.additional_travel_cost || 0),
        };
      }
    }

    return { isServed: false, serviceLevel: 'not_served' };
  }

  private generateServiceNotes(
    serviceLevel: string,
    distance: number,
    travelTime?: number,
  ): string {
    switch (serviceLevel) {
      case 'primary':
        return 'Within primary service area - standard rates apply';
      case 'secondary':
        return 'Within service area - travel time may affect availability';
      case 'extended':
        return 'Extended coverage area - additional travel costs may apply';
      default:
        return 'Location not currently served';
    }
  }

  private async analyzeBookingPatterns(supplierId: string): Promise<any> {
    // This would analyze actual booking data
    // For now, return mock data
    return {
      averageBookingDistance: 25,
      bookingsByDistance: {
        '0-10': 40,
        '10-25': 35,
        '25-50': 20,
        '50+': 5,
      },
    };
  }

  private calculateOptimalRadius(
    supplier: any,
    bookingAnalysis: any,
    currentCoverage: ServiceAreaAnalysis,
  ): number {
    // Simple optimization based on booking patterns and competition
    const currentRadius = supplier.service_radius_miles * 1.60934; // Convert to km
    const bookingEfficiency = bookingAnalysis.bookingsByDistance['0-25'] / 100;
    const competitionFactor = Math.max(
      0.5,
      1 - currentCoverage.competitorCount / 20,
    );

    return Math.round(currentRadius * bookingEfficiency * competitionFactor);
  }

  private async identifyHighPotentialRegions(
    lat: number,
    lng: number,
    category: string,
  ): Promise<string[]> {
    // This would analyze market data to suggest high-potential regions
    const { data: nearbyHotspots } = await this.supabase
      .from('wedding_location_hotspots')
      .select('name')
      .order('weddings_per_year', { ascending: false })
      .limit(5);

    return nearbyHotspots?.map((h) => h.name) || [];
  }

  private calculateCostImplications(
    currentCoverage: ServiceAreaAnalysis,
    suggestedRadius?: number,
    supplier?: any,
  ): {
    additionalTravelCosts: number;
    potentialRevenue: number;
    netBenefit: number;
  } {
    // Simple cost-benefit calculation
    const additionalArea = suggestedRadius
      ? Math.PI * Math.pow(suggestedRadius, 2) - currentCoverage.totalArea
      : 0;

    const additionalTravelCosts = additionalArea * 0.1; // £0.10 per km²
    const potentialRevenue = additionalArea * 0.5; // £0.50 per km² potential
    const netBenefit = potentialRevenue - additionalTravelCosts;

    return {
      additionalTravelCosts,
      potentialRevenue,
      netBenefit,
    };
  }
}

export const serviceRadiusCalculator = new ServiceRadiusCalculator();
