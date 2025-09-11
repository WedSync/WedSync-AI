/**
 * Test Data Factory System
 * WS-192 Team B - Backend/API Focus
 * 
 * Comprehensive factory system for generating realistic wedding industry test data
 */

export { SupplierFactory } from './supplier-factory';
export { CoupleFactory } from './couple-factory';
export { FormFactory } from './form-factory';
export { WeddingFactory } from './wedding-factory';

// Re-export types for convenience
export type {
  SupplierTestData,
  CoupleTestData, 
  FormTestData,
  WeddingTestData,
  WeddingScenario,
  VendorType
} from './types';

// Factory configuration
export interface FactoryConfig {
  organizationId: string;
  testId: string;
  realisticData: boolean;
  includeOptionalFields: boolean;
  generateIds: boolean;
}

// Default factory configuration
export const DEFAULT_FACTORY_CONFIG: Partial<FactoryConfig> = {
  realisticData: true,
  includeOptionalFields: true,
  generateIds: true
};

/**
 * Factory manager for coordinating multiple factories
 */
export class TestDataFactoryManager {
  private config: FactoryConfig;

  constructor(config: FactoryConfig) {
    this.config = { ...DEFAULT_FACTORY_CONFIG, ...config } as FactoryConfig;
  }

  /**
   * Create a complete wedding scenario with all related data
   */
  async createWeddingScenario(scenarioType: 'simple' | 'complex' | 'luxury' = 'simple'): Promise<{
    photographer: any;
    couple: any;
    venue?: any;
    florist?: any;
    forms: any[];
    submissions: any[];
    journey?: any;
  }> {
    const scenario: any = {};

    // Always create photographer and couple
    scenario.photographer = await SupplierFactory.createPhotographer(this.config);
    scenario.couple = await CoupleFactory.createCouple(this.config);
    
    // Create photography booking form
    scenario.forms = [
      await FormFactory.createBookingForm(this.config, 'photography')
    ];

    // Create form submission
    scenario.submissions = [
      await FormFactory.createSubmission(
        this.config, 
        scenario.forms[0].id, 
        scenario.couple
      )
    ];

    if (scenarioType === 'complex' || scenarioType === 'luxury') {
      // Add venue
      scenario.venue = await SupplierFactory.createVenue(this.config);
      scenario.forms.push(
        await FormFactory.createBookingForm(this.config, 'venue')
      );
      scenario.submissions.push(
        await FormFactory.createSubmission(
          this.config,
          scenario.forms[1].id,
          scenario.couple
        )
      );

      // Add florist
      scenario.florist = await SupplierFactory.createFlorist(this.config);
      scenario.forms.push(
        await FormFactory.createBookingForm(this.config, 'floristry')
      );
      scenario.submissions.push(
        await FormFactory.createSubmission(
          this.config,
          scenario.forms[2].id,
          scenario.couple
        )
      );
    }

    if (scenarioType === 'luxury') {
      // Add customer journey
      scenario.journey = await WeddingFactory.createLuxuryJourney(
        this.config,
        scenario.couple.id
      );
    }

    return scenario;
  }

  /**
   * Create bulk test data for performance testing
   */
  async createBulkTestData(counts: {
    photographers?: number;
    couples?: number;
    venues?: number;
    forms?: number;
  }): Promise<{
    photographers: any[];
    couples: any[];
    venues: any[];
    forms: any[];
  }> {
    const results: any = {
      photographers: [],
      couples: [],
      venues: [],
      forms: []
    };

    // Create photographers
    if (counts.photographers) {
      for (let i = 0; i < counts.photographers; i++) {
        results.photographers.push(
          await SupplierFactory.createPhotographer({
            ...this.config,
            testId: `${this.config.testId}_photo_${i}`
          })
        );
      }
    }

    // Create couples
    if (counts.couples) {
      for (let i = 0; i < counts.couples; i++) {
        results.couples.push(
          await CoupleFactory.createCouple({
            ...this.config,
            testId: `${this.config.testId}_couple_${i}`
          })
        );
      }
    }

    // Create venues
    if (counts.venues) {
      for (let i = 0; i < counts.venues; i++) {
        results.venues.push(
          await SupplierFactory.createVenue({
            ...this.config,
            testId: `${this.config.testId}_venue_${i}`
          })
        );
      }
    }

    // Create forms
    if (counts.forms) {
      for (let i = 0; i < counts.forms; i++) {
        results.forms.push(
          await FormFactory.createBookingForm(
            this.config,
            i % 2 === 0 ? 'photography' : 'venue'
          )
        );
      }
    }

    return results;
  }

  /**
   * Create seasonal wedding data (peak season scenarios)
   */
  async createSeasonalWeddingData(season: 'spring' | 'summer' | 'fall' | 'winter'): Promise<any[]> {
    const seasonalData = [];
    const weddingCounts = {
      spring: 25,
      summer: 50, // Peak season
      fall: 30,
      winter: 10
    };

    const count = weddingCounts[season];
    
    for (let i = 0; i < count; i++) {
      const scenario = await this.createWeddingScenario('simple');
      
      // Update wedding date to match season
      scenario.couple.wedding_date = WeddingFactory.getSeasonalWeddingDate(season);
      
      seasonalData.push(scenario);
    }

    return seasonalData;
  }

  /**
   * Get factory configuration
   */
  getConfig(): FactoryConfig {
    return { ...this.config };
  }

  /**
   * Update factory configuration
   */
  updateConfig(newConfig: Partial<FactoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}