/**
 * Couple Factory
 * WS-192 Team B - Backend/API Focus
 * 
 * Factory for generating realistic wedding couple test data
 */

import { CoupleTestData } from './types';
import { FactoryConfig } from './index';

export class CoupleFactory {
  /**
   * Create a couple with realistic wedding data
   */
  static async createCouple(config: FactoryConfig): Promise<CoupleTestData> {
    const firstNames = ['John', 'Michael', 'David', 'James', 'Robert', 'William', 'Richard', 'Thomas'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const partnerFirstNames = ['Sarah', 'Emily', 'Jessica', 'Ashley', 'Amanda', 'Jennifer', 'Michelle', 'Lisa'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const partnerFirstName = partnerFirstNames[Math.floor(Math.random() * partnerFirstNames.length)];
    const partnerLastName = Math.random() > 0.5 ? lastName : lastNames[Math.floor(Math.random() * lastNames.length)];

    const venues = [
      'The Grand Ballroom',
      'Sunset Garden Estate',
      'Historic Manor House',
      'Riverside Country Club',
      'Mountain View Lodge',
      'Oceanside Resort'
    ];

    const weddingStyles = ['traditional', 'modern', 'rustic', 'luxury', 'bohemian', 'minimalist'] as const;

    return {
      id: config.generateIds ? `couple_${config.testId}_${Date.now()}` : undefined,
      organization_id: config.organizationId,
      first_name: firstName,
      last_name: lastName,
      email: config.realisticData 
        ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`
        : `couple-${config.testId}@test.com`,
      phone: config.includeOptionalFields ? this.generatePhoneNumber() : undefined,
      partner_first_name: partnerFirstName,
      partner_last_name: partnerLastName,
      partner_email: config.includeOptionalFields 
        ? `${partnerFirstName.toLowerCase()}.${partnerLastName.toLowerCase()}@email.com`
        : undefined,
      partner_phone: config.includeOptionalFields ? this.generatePhoneNumber() : undefined,
      wedding_date: this.generateWeddingDate(),
      venue: venues[Math.floor(Math.random() * venues.length)],
      venue_address: config.includeOptionalFields ? '123 Wedding Lane, Love City, LC 12345' : undefined,
      guest_count: 50 + Math.floor(Math.random() * 200), // 50-250 guests
      budget: 20000 + Math.floor(Math.random() * 80000), // $20,000-$100,000
      wedding_style: weddingStyles[Math.floor(Math.random() * weddingStyles.length)],
      special_requirements: config.includeOptionalFields ? this.generateSpecialRequirements() : undefined,
      dietary_restrictions: config.includeOptionalFields ? this.generateDietaryRestrictions() : undefined,
      photography_preferences: config.includeOptionalFields ? {
        style: ['candid', 'posed', 'artistic', 'photojournalistic'][Math.floor(Math.random() * 4)] as any,
        must_have_shots: ['First kiss', 'Ring exchange', 'First dance', 'Family portraits'],
        group_photos_required: Math.random() > 0.3
      } : undefined,
      contact_preferences: {
        preferred_method: ['email', 'phone', 'text'][Math.floor(Math.random() * 3)] as any,
        best_time_to_contact: ['Morning', 'Afternoon', 'Evening'][Math.floor(Math.random() * 3)]
      },
      referral_source: config.includeOptionalFields ? this.generateReferralSource() : undefined,
      created_at: config.realisticData ? new Date().toISOString() : undefined,
      updated_at: config.realisticData ? new Date().toISOString() : undefined
    };
  }

  /**
   * Generate realistic phone number
   */
  private static generatePhoneNumber(): string {
    const areaCode = 200 + Math.floor(Math.random() * 700);
    const exchange = 200 + Math.floor(Math.random() * 700);
    const number = 1000 + Math.floor(Math.random() * 9000);
    return `(${areaCode}) ${exchange}-${number}`;
  }

  /**
   * Generate future wedding date (3-18 months out)
   */
  private static generateWeddingDate(): string {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (90 + Math.floor(Math.random() * 450)) * 24 * 60 * 60 * 1000); // 3-18 months
    return futureDate.toISOString().split('T')[0];
  }

  /**
   * Generate special requirements
   */
  private static generateSpecialRequirements(): string[] {
    const requirements = [
      'Wheelchair accessibility needed',
      'Pet-friendly venue required',
      'Outdoor ceremony preferred',
      'Vegetarian catering required',
      'Live music during ceremony',
      'Late night snacks needed'
    ];
    
    const count = Math.floor(Math.random() * 3);
    return requirements.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  /**
   * Generate dietary restrictions
   */
  private static generateDietaryRestrictions(): string[] {
    const restrictions = [
      'Vegetarian options needed',
      'Gluten-free options required',
      'Nut allergy considerations',
      'Vegan options preferred',
      'Kosher meal required',
      'Dairy-free options needed'
    ];
    
    const count = Math.floor(Math.random() * 2);
    return restrictions.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  /**
   * Generate referral source
   */
  private static generateReferralSource(): string {
    const sources = [
      'Google search',
      'Instagram',
      'Friend referral',
      'Wedding website',
      'Bridal show',
      'Vendor referral',
      'Facebook',
      'Previous client'
    ];
    
    return sources[Math.floor(Math.random() * sources.length)];
  }
}