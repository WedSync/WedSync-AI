/**
 * Supplier Factory
 * WS-192 Team B - Backend/API Focus
 * 
 * Factory for generating realistic wedding supplier test data
 */

import { SupplierTestData, VendorType } from './types';
import { FactoryConfig } from './index';

export class SupplierFactory {
  /**
   * Create a photographer supplier with realistic data
   */
  static async createPhotographer(config: FactoryConfig): Promise<SupplierTestData> {
    const businessNames = [
      'Elegant Moments Photography',
      'Forever Captured Studios',
      'Golden Hour Photography',
      'Love Story Visuals',
      'Timeless Wedding Photos',
      'Dream Day Photography',
      'Perfect Moment Studios',
      'Cherished Memories Photo'
    ];

    const photographerNames = [
      'Sarah Johnson',
      'Michael Chen',
      'Emma Rodriguez',
      'David Thompson',
      'Ashley Kim',
      'James Wilson',
      'Maria Garcia',
      'Ryan O\'Connor'
    ];

    const randomName = photographerNames[Math.floor(Math.random() * photographerNames.length)];
    const randomBusiness = businessNames[Math.floor(Math.random() * businessNames.length)];
    const firstName = randomName.split(' ')[0];

    return {
      id: config.generateIds ? `photographer_${config.testId}_${Date.now()}` : undefined,
      organization_id: config.organizationId,
      email: config.realisticData 
        ? `${firstName.toLowerCase()}@${randomBusiness.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
        : `photographer-${config.testId}@test.com`,
      full_name: randomName,
      business_name: randomBusiness,
      vendor_type: 'photographer',
      phone: config.includeOptionalFields ? this.generatePhoneNumber() : undefined,
      website: config.includeOptionalFields ? `https://${randomBusiness.toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : undefined,
      services: [
        'Wedding Day Coverage (8 hours)',
        'Engagement Session',
        'Bridal Portraits',
        'Wedding Album',
        'High-Resolution Digital Gallery',
        'Print Release',
        'Online Gallery Sharing'
      ],
      pricing_structure: {
        base_price: 2500 + Math.floor(Math.random() * 5000), // $2,500 - $7,500
        additional_services: [
          { name: 'Additional Hour', price: 200 + Math.floor(Math.random() * 100) },
          { name: 'Second Photographer', price: 500 + Math.floor(Math.random() * 300) },
          { name: 'Engagement Session', price: 350 + Math.floor(Math.random() * 150) },
          { name: 'Wedding Album Upgrade', price: 400 + Math.floor(Math.random() * 200) },
          { name: 'Same Day Sneak Peek', price: 100 + Math.floor(Math.random() * 50) }
        ]
      },
      availability: {
        weekends_only: Math.random() > 0.3, // 70% weekend only
        blackout_dates: this.generateBlackoutDates(),
        booking_lead_time: 30 + Math.floor(Math.random() * 90) // 30-120 days
      },
      portfolio: {
        images: this.generatePortfolioImages('photography'),
        testimonials: this.generateTestimonials()
      },
      location: {
        city: this.getRandomCity(),
        state: this.getRandomState(),
        travel_radius: 50 + Math.floor(Math.random() * 100) // 50-150 miles
      },
      created_at: config.realisticData ? new Date().toISOString() : undefined,
      updated_at: config.realisticData ? new Date().toISOString() : undefined
    };
  }

  /**
   * Create a venue supplier with realistic data
   */
  static async createVenue(config: FactoryConfig): Promise<SupplierTestData> {
    const venueNames = [
      'Garden Manor Estate',
      'The Crystal Ballroom',
      'Riverside Wedding Venue',
      'Historic Oak Grove',
      'Sunset Hills Country Club',
      'The Grand Pavilion',
      'Wildflower Farm Venue',
      'Lakeside Reception Hall'
    ];

    const venueManagers = [
      'Jennifer Martinez',
      'Robert Taylor',
      'Lisa Anderson',
      'Mark Stevens',
      'Amanda Foster',
      'Christopher Lee',
      'Michelle Brown',
      'Daniel Parker'
    ];

    const randomName = venueManagers[Math.floor(Math.random() * venueManagers.length)];
    const randomVenue = venueNames[Math.floor(Math.random() * venueNames.length)];
    const firstName = randomName.split(' ')[0];

    return {
      id: config.generateIds ? `venue_${config.testId}_${Date.now()}` : undefined,
      organization_id: config.organizationId,
      email: config.realisticData 
        ? `${firstName.toLowerCase()}@${randomVenue.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
        : `venue-${config.testId}@test.com`,
      full_name: randomName,
      business_name: randomVenue,
      vendor_type: 'venue',
      phone: config.includeOptionalFields ? this.generatePhoneNumber() : undefined,
      website: config.includeOptionalFields ? `https://${randomVenue.toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : undefined,
      services: [
        'Ceremony Space',
        'Reception Hall',
        'Bridal Suite',
        'Groom\'s Room',
        'Full Bar Service',
        'Catering Kitchen',
        'Tables and Chairs',
        'Dance Floor',
        'Sound System',
        'Wedding Coordination'
      ],
      pricing_structure: {
        base_price: 8000 + Math.floor(Math.random() * 12000), // $8,000 - $20,000
        additional_services: [
          { name: 'Additional Hour', price: 300 + Math.floor(Math.random() * 200) },
          { name: 'Ceremony Setup', price: 500 + Math.floor(Math.random() * 300) },
          { name: 'Upgraded Linens', price: 200 + Math.floor(Math.random() * 100) },
          { name: 'Valet Parking', price: 400 + Math.floor(Math.random() * 200) },
          { name: 'Late Night Snack', price: 300 + Math.floor(Math.random() * 150) }
        ]
      },
      availability: {
        weekends_only: Math.random() > 0.8, // 80% available weekdays too
        blackout_dates: this.generateBlackoutDates(),
        booking_lead_time: 90 + Math.floor(Math.random() * 270) // 90-360 days
      },
      portfolio: {
        images: this.generatePortfolioImages('venue'),
        testimonials: this.generateTestimonials()
      },
      location: {
        city: this.getRandomCity(),
        state: this.getRandomState(),
        travel_radius: 0 // Venues don't travel
      },
      created_at: config.realisticData ? new Date().toISOString() : undefined,
      updated_at: config.realisticData ? new Date().toISOString() : undefined
    };
  }

  /**
   * Create a florist supplier with realistic data
   */
  static async createFlorist(config: FactoryConfig): Promise<SupplierTestData> {
    const floristNames = [
      'Bloom & Blossom Florals',
      'Petals & Stems Design',
      'Garden Rose Creations',
      'Wildflower Wedding Flowers',
      'Elegant Blooms Studio',
      'Fresh Flower Co.',
      'Botanical Beauty Designs',
      'Seasonal Stems Florist'
    ];

    const floristDesigners = [
      'Isabella Romano',
      'Grace Mitchell',
      'Sophie Turner',
      'Olivia Davis',
      'Natalie Wright',
      'Emily Clark',
      'Victoria Hill',
      'Chloe Adams'
    ];

    const randomName = floristDesigners[Math.floor(Math.random() * floristDesigners.length)];
    const randomBusiness = floristNames[Math.floor(Math.random() * floristNames.length)];
    const firstName = randomName.split(' ')[0];

    return {
      id: config.generateIds ? `florist_${config.testId}_${Date.now()}` : undefined,
      organization_id: config.organizationId,
      email: config.realisticData 
        ? `${firstName.toLowerCase()}@${randomBusiness.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
        : `florist-${config.testId}@test.com`,
      full_name: randomName,
      business_name: randomBusiness,
      vendor_type: 'florist',
      phone: config.includeOptionalFields ? this.generatePhoneNumber() : undefined,
      website: config.includeOptionalFields ? `https://${randomBusiness.toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : undefined,
      services: [
        'Bridal Bouquet',
        'Bridesmaids Bouquets',
        'Boutonnieres',
        'Ceremony Arrangements',
        'Reception Centerpieces',
        'Aisle Petals',
        'Arch Decorations',
        'Corsages'
      ],
      pricing_structure: {
        base_price: 1200 + Math.floor(Math.random() * 2800), // $1,200 - $4,000
        additional_services: [
          { name: 'Additional Centerpiece', price: 75 + Math.floor(Math.random() * 50) },
          { name: 'Flower Girl Petals', price: 25 + Math.floor(Math.random() * 25) },
          { name: 'Ceremony Aisle Runner', price: 100 + Math.floor(Math.random() * 50) },
          { name: 'Upgraded Premium Flowers', price: 200 + Math.floor(Math.random() * 100) },
          { name: 'Same Day Delivery', price: 50 + Math.floor(Math.random() * 30) }
        ]
      },
      availability: {
        weekends_only: Math.random() > 0.4, // 60% weekend only
        blackout_dates: this.generateBlackoutDates(),
        booking_lead_time: 60 + Math.floor(Math.random() * 120) // 60-180 days
      },
      portfolio: {
        images: this.generatePortfolioImages('floristry'),
        testimonials: this.generateTestimonials()
      },
      location: {
        city: this.getRandomCity(),
        state: this.getRandomState(),
        travel_radius: 25 + Math.floor(Math.random() * 50) // 25-75 miles
      },
      created_at: config.realisticData ? new Date().toISOString() : undefined,
      updated_at: config.realisticData ? new Date().toISOString() : undefined
    };
  }

  /**
   * Create a supplier of any type
   */
  static async createSupplier(config: FactoryConfig, vendorType: VendorType): Promise<SupplierTestData> {
    switch (vendorType) {
      case 'photographer':
        return this.createPhotographer(config);
      case 'venue':
        return this.createVenue(config);
      case 'florist':
        return this.createFlorist(config);
      default:
        throw new Error(`Supplier factory not implemented for vendor type: ${vendorType}`);
    }
  }

  /**
   * Generate a realistic phone number
   */
  private static generatePhoneNumber(): string {
    const areaCode = 200 + Math.floor(Math.random() * 700); // Valid area codes
    const exchange = 200 + Math.floor(Math.random() * 700);
    const number = 1000 + Math.floor(Math.random() * 9000);
    return `(${areaCode}) ${exchange}-${number}`;
  }

  /**
   * Generate blackout dates (holidays, personal time)
   */
  private static generateBlackoutDates(): string[] {
    const currentYear = new Date().getFullYear();
    return [
      `${currentYear}-12-25`, // Christmas
      `${currentYear}-01-01`, // New Year's Day
      `${currentYear}-07-04`, // July 4th
      `${currentYear}-11-28`, // Thanksgiving (approximate)
      `${currentYear + 1}-12-25`, // Next year's Christmas
      `${currentYear + 1}-01-01`  // Next year's New Year's
    ];
  }

  /**
   * Generate portfolio images based on vendor type
   */
  private static generatePortfolioImages(vendorType: string): string[] {
    const baseImages = [
      `https://images.unsplash.com/photo-1519741497674-611481863552`, // Wedding
      `https://images.unsplash.com/photo-1511285560929-80b456fea0bc`, // Wedding ceremony
      `https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6`, // Wedding couple
      `https://images.unsplash.com/photo-1520854221256-17451cc331bf`, // Wedding reception
      `https://images.unsplash.com/photo-1469371670807-013ccf25f16a`  // Wedding details
    ];

    // Add vendor-specific images
    switch (vendorType) {
      case 'photography':
        return baseImages.concat([
          'https://images.unsplash.com/photo-1606216794074-735e91aa2c92', // Wedding photos
          'https://images.unsplash.com/photo-1583939003579-730e3918a45a'  // Engagement photos
        ]);
      case 'venue':
        return baseImages.concat([
          'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3', // Venue exterior
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3'  // Venue interior
        ]);
      case 'floristry':
        return baseImages.concat([
          'https://images.unsplash.com/photo-1522673607200-164d1b6ce486', // Bridal bouquet
          'https://images.unsplash.com/photo-1606216794074-735e91aa2c92'  // Wedding flowers
        ]);
      default:
        return baseImages;
    }
  }

  /**
   * Generate realistic testimonials
   */
  private static generateTestimonials(): Array<{ client_name: string; rating: number; comment: string }> {
    const testimonials = [
      {
        client_name: 'Sarah & Mike Johnson',
        rating: 5,
        comment: 'Absolutely amazing experience! Everything was perfect and exceeded our expectations.'
      },
      {
        client_name: 'Jennifer & David Chen',
        rating: 5,
        comment: 'Professional, creative, and so easy to work with. Our wedding day was magical!'
      },
      {
        client_name: 'Emily & Ryan Thompson',
        rating: 4,
        comment: 'Beautiful work and great attention to detail. Highly recommend for your special day.'
      },
      {
        client_name: 'Ashley & James Martinez',
        rating: 5,
        comment: 'From start to finish, the service was exceptional. Could not have asked for better!'
      }
    ];

    // Return 2-4 random testimonials
    const count = 2 + Math.floor(Math.random() * 3);
    const shuffled = testimonials.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get random city for realistic location data
   */
  private static getRandomCity(): string {
    const cities = [
      'Atlanta', 'Austin', 'Boston', 'Chicago', 'Dallas', 'Denver',
      'Los Angeles', 'Miami', 'Nashville', 'New York', 'Portland',
      'San Francisco', 'Seattle', 'Washington DC'
    ];
    return cities[Math.floor(Math.random() * cities.length)];
  }

  /**
   * Get random state for realistic location data
   */
  private static getRandomState(): string {
    const states = [
      'GA', 'TX', 'MA', 'IL', 'TX', 'CO', 'CA', 'FL', 'TN', 
      'NY', 'OR', 'CA', 'WA', 'DC'
    ];
    return states[Math.floor(Math.random() * states.length)];
  }
}