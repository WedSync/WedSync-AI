import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { APISchema } from './types';

interface CulturalMarket {
  region: string;
  country: string;
  primaryCulture: string;
  secondaryCultures: string[];
  languages: string[];
  calendarSystems: string[];
  weddingTraditions: WeddingTradition[];
  businessRegulations: BusinessRegulation[];
  localizationRequirements: LocalizationRequirement[];
}

interface WeddingTradition {
  name: string;
  culture: string;
  description: string;
  requiredFields: string[];
  forbiddenPeriods: Array<{
    name: string;
    startDate: string;
    endDate: string;
    reason: string;
  }>;
  auspiciousPeriods: Array<{
    name: string;
    startDate: string;
    endDate: string;
    significance: string;
  }>;
  ceremonyRequirements: Array<{
    element: string;
    mandatory: boolean;
    description: string;
  }>;
  documentationNeeded: string[];
}

interface BusinessRegulation {
  type: string;
  requirement: string;
  applicableRegions: string[];
  complianceLevel: 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL';
  implementationDetails: string[];
}

interface LocalizationRequirement {
  aspect:
    | 'DATE_FORMAT'
    | 'NUMBER_FORMAT'
    | 'CURRENCY'
    | 'LANGUAGE'
    | 'TIMEZONE'
    | 'CULTURAL_TERMS';
  specification: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  implementation: string;
}

interface CulturalCompatibilityAnalysis {
  overallCompatibilityScore: number;
  culturalCompatibility: Array<{
    culture: string;
    compatibilityScore: number;
    supportLevel: 'FULL' | 'PARTIAL' | 'MINIMAL' | 'NONE';
    missingFeatures: string[];
    riskFactors: Array<{
      factor: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      impact: string;
      recommendation: string;
    }>;
    requiredModifications: APIModification[];
  }>;
  localizationGaps: Array<{
    region: string;
    gaps: string[];
    priority: string;
    effort: string;
  }>;
  recommendedAPIModifications: APIModification[];
  culturalTestingRequirements: Array<{
    culture: string;
    testScenarios: string[];
    validationCriteria: string[];
    culturalExperts: string[];
  }>;
  deploymentConsiderations: Array<{
    culture: string;
    timing: string;
    restrictions: string[];
    recommendations: string[];
  }>;
}

interface APIModification {
  type:
    | 'ADD_FIELD'
    | 'MODIFY_FIELD'
    | 'ADD_ENDPOINT'
    | 'MODIFY_ENDPOINT'
    | 'ADD_VALIDATION'
    | 'ADD_LOCALIZATION';
  target: string; // endpoint or model name
  modification: {
    name: string;
    description: string;
    implementation: string;
    culturalContext: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    estimatedEffort: number; // hours
  };
  affectedCultures: string[];
  backwardCompatibility: boolean;
  testingRequirements: string[];
}

export class CulturalAPIIntelligence {
  private openai: OpenAI;
  private supabase: ReturnType<typeof createClient>;
  private redis: Redis;
  private culturalDatabase: Map<string, WeddingTradition[]>;
  private localizationRules: Map<string, LocalizationRequirement[]>;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.redis = new Redis(process.env.REDIS_URL!);
    this.culturalDatabase = new Map();
    this.localizationRules = new Map();

    this.initializeCulturalDatabase();
  }

  async analyzeCulturalAPIRequirements(
    apiVersionChanges: any[],
    targetMarkets: CulturalMarket[],
    options?: {
      includeLocalizationAnalysis?: boolean;
      culturalExpertReview?: boolean;
      generateTestScenarios?: boolean;
    },
  ): Promise<CulturalCompatibilityAnalysis> {
    try {
      console.log(
        `Analyzing cultural API requirements for ${targetMarkets.length} markets`,
      );

      // Load cultural traditions and requirements for target markets
      const culturalRequirements =
        await this.loadCulturalRequirements(targetMarkets);

      // Analyze API changes against cultural requirements
      const culturalImpactAnalysis = await this.analyzeCulturalImpact(
        apiVersionChanges,
        culturalRequirements,
      );

      // Use AI to perform deep cultural compatibility analysis
      const aiCompatibilityAnalysis = await this.performAICulturalAnalysis(
        apiVersionChanges,
        targetMarkets,
        culturalRequirements,
      );

      // Generate specific API modifications needed for cultural compatibility
      const recommendedModifications =
        await this.generateCulturalAPIModifications(
          apiVersionChanges,
          aiCompatibilityAnalysis,
          culturalRequirements,
        );

      // Analyze localization requirements if requested
      const localizationGaps = options?.includeLocalizationAnalysis
        ? await this.analyzeLocalizationGaps(targetMarkets, apiVersionChanges)
        : [];

      // Generate cultural testing requirements
      const culturalTestingRequirements = options?.generateTestScenarios
        ? await this.generateCulturalTestingRequirements(
            targetMarkets,
            recommendedModifications,
          )
        : [];

      // Generate deployment considerations
      const deploymentConsiderations =
        await this.generateDeploymentConsiderations(
          targetMarkets,
          culturalImpactAnalysis,
        );

      // Calculate overall compatibility score
      const overallCompatibilityScore = this.calculateOverallCompatibilityScore(
        aiCompatibilityAnalysis.culturalCompatibility,
      );

      const analysis: CulturalCompatibilityAnalysis = {
        overallCompatibilityScore,
        culturalCompatibility: aiCompatibilityAnalysis.culturalCompatibility,
        localizationGaps,
        recommendedAPIModifications: recommendedModifications,
        culturalTestingRequirements,
        deploymentConsiderations,
      };

      // Cache and store results
      await this.cacheCompatibilityAnalysis(targetMarkets, analysis);
      await this.storeCompatibilityResults(
        apiVersionChanges,
        targetMarkets,
        analysis,
      );

      console.log('Cultural API requirements analysis completed');
      return analysis;
    } catch (error) {
      console.error('Cultural API analysis failed:', error);
      throw new Error(`Cultural API analysis failed: ${error.message}`);
    }
  }

  private async initializeCulturalDatabase() {
    // Hindu wedding traditions
    const hinduTraditions: WeddingTradition[] = [
      {
        name: 'Vedic Wedding',
        culture: 'Hindu',
        description:
          'Traditional Hindu wedding ceremony following Vedic rituals',
        requiredFields: [
          'gotra',
          'nakshatra',
          'rashi',
          'manglik_status',
          'varna',
          'ashram',
        ],
        forbiddenPeriods: [
          {
            name: 'Pitru Paksha',
            startDate: 'September 10',
            endDate: 'September 25',
            reason: 'Period dedicated to ancestors, inauspicious for weddings',
          },
          {
            name: 'Kharmas',
            startDate: 'December 15',
            endDate: 'January 15',
            reason: 'Malefic period according to Hindu calendar',
          },
        ],
        auspiciousPeriods: [
          {
            name: 'Akshaya Tritiya',
            startDate: 'April 29',
            endDate: 'April 29',
            significance: 'Most auspicious day of the year for weddings',
          },
          {
            name: 'Kartik Purnima',
            startDate: 'November 15',
            endDate: 'November 15',
            significance: 'Full moon day in Kartik month, highly auspicious',
          },
        ],
        ceremonyRequirements: [
          {
            element: 'Sacred Fire (Agni)',
            mandatory: true,
            description: 'Central element for Hindu wedding ceremonies',
          },
          {
            element: 'Pandit/Priest',
            mandatory: true,
            description: 'Qualified priest to conduct the ceremony',
          },
          {
            element: 'Mandap',
            mandatory: true,
            description: 'Sacred wedding pavilion',
          },
        ],
        documentationNeeded: [
          'Horoscope matching report',
          'Gotra verification',
          'Astrological compatibility certificate',
        ],
      },
    ];

    // Islamic wedding traditions
    const islamicTraditions: WeddingTradition[] = [
      {
        name: 'Nikah',
        culture: 'Islamic',
        description: 'Islamic marriage contract ceremony',
        requiredFields: [
          'mahr_amount',
          'wali_consent',
          'witness_details',
          'islamic_date',
        ],
        forbiddenPeriods: [
          {
            name: 'Ramadan',
            startDate: 'March 10',
            endDate: 'April 9',
            reason: 'Holy month of fasting, weddings generally avoided',
          },
          {
            name: 'Muharram',
            startDate: 'July 17',
            endDate: 'July 26',
            reason: 'Period of mourning in Islamic calendar',
          },
        ],
        auspiciousPeriods: [
          {
            name: 'Shawwal',
            startDate: 'April 10',
            endDate: 'May 8',
            significance: 'Month following Ramadan, auspicious for weddings',
          },
        ],
        ceremonyRequirements: [
          {
            element: 'Imam/Religious Scholar',
            mandatory: true,
            description: 'Islamic scholar to conduct the Nikah',
          },
          {
            element: 'Two Male Witnesses',
            mandatory: true,
            description: 'Required witnesses for Islamic marriage contract',
          },
          {
            element: 'Mahr Agreement',
            mandatory: true,
            description: 'Dower amount agreed upon',
          },
        ],
        documentationNeeded: [
          'Nikah certificate',
          'Mahr agreement document',
          'Witness identification',
        ],
      },
    ];

    // Jewish wedding traditions
    const jewishTraditions: WeddingTradition[] = [
      {
        name: 'Jewish Wedding',
        culture: 'Jewish',
        description: 'Traditional Jewish wedding ceremony',
        requiredFields: [
          'hebrew_names',
          'jewish_date',
          'ketubah_terms',
          'kosher_requirements',
        ],
        forbiddenPeriods: [
          {
            name: 'Three Weeks',
            startDate: 'July 6',
            endDate: 'July 27',
            reason: 'Period of mourning in Jewish calendar',
          },
          {
            name: 'Counting of Omer',
            startDate: 'April 15',
            endDate: 'June 3',
            reason: 'Semi-mourning period, weddings restricted',
          },
        ],
        auspiciousPeriods: [
          {
            name: 'Month of Elul',
            startDate: 'August 18',
            endDate: 'September 15',
            significance: 'Month of preparation before High Holy Days',
          },
        ],
        ceremonyRequirements: [
          {
            element: 'Rabbi',
            mandatory: true,
            description: 'Jewish religious leader to officiate',
          },
          {
            element: 'Chuppah',
            mandatory: true,
            description: 'Wedding canopy',
          },
          {
            element: 'Ketubah',
            mandatory: true,
            description: 'Jewish marriage contract',
          },
        ],
        documentationNeeded: [
          'Ketubah (marriage contract)',
          'Kosher catering certification',
          'Rabbi certification',
        ],
      },
    ];

    // Store in cultural database
    this.culturalDatabase.set('hindu', hinduTraditions);
    this.culturalDatabase.set('islamic', islamicTraditions);
    this.culturalDatabase.set('jewish', jewishTraditions);

    // Initialize localization rules
    const hindiLocalization: LocalizationRequirement[] = [
      {
        aspect: 'DATE_FORMAT',
        specification: 'DD/MM/YYYY format with Devanagari numerals option',
        priority: 'HIGH',
        implementation: 'Support both Gregorian and Hindu lunar calendar dates',
      },
      {
        aspect: 'CULTURAL_TERMS',
        specification: 'Sanskrit/Hindi wedding terminology',
        priority: 'HIGH',
        implementation:
          'Localized terms for ceremony elements (mandap, pandit, etc.)',
      },
    ];

    const arabicLocalization: LocalizationRequirement[] = [
      {
        aspect: 'DATE_FORMAT',
        specification: 'Hijri calendar support with Arabic numerals',
        priority: 'HIGH',
        implementation: 'Dual calendar display (Gregorian + Hijri)',
      },
      {
        aspect: 'LANGUAGE',
        specification: 'Right-to-left text support',
        priority: 'HIGH',
        implementation: 'Full RTL layout and text rendering',
      },
    ];

    this.localizationRules.set('hindi', hindiLocalization);
    this.localizationRules.set('arabic', arabicLocalization);
  }

  private async loadCulturalRequirements(targetMarkets: CulturalMarket[]) {
    const requirements = new Map();

    for (const market of targetMarkets) {
      // Load from database
      const { data: culturalData } = await this.supabase
        .from('cultural_wedding_data')
        .select('*')
        .eq('region', market.region);

      // Combine with in-memory cultural database
      const primaryCultureTraditions =
        this.culturalDatabase.get(market.primaryCulture.toLowerCase()) || [];
      const secondaryCulturesTraditions = market.secondaryCultures.flatMap(
        (culture) => this.culturalDatabase.get(culture.toLowerCase()) || [],
      );

      requirements.set(market.region, {
        market,
        traditions: [
          ...primaryCultureTraditions,
          ...secondaryCulturesTraditions,
        ],
        localization:
          this.localizationRules.get(market.languages[0]?.toLowerCase()) || [],
        databaseData: culturalData || [],
      });
    }

    return requirements;
  }

  private async analyzeCulturalImpact(
    apiVersionChanges: any[],
    culturalRequirements: Map<string, any>,
  ) {
    const impact = {
      affectedCultures: new Set<string>(),
      missingRequirements: new Map<string, string[]>(),
      conflictingChanges: [],
      preservedFeatures: [],
    };

    // Analyze each API change for cultural impact
    for (const change of apiVersionChanges) {
      for (const [region, requirements] of culturalRequirements) {
        const traditions = requirements.traditions;

        // Check if change affects cultural fields
        for (const tradition of traditions) {
          const affectedFields = tradition.requiredFields.filter(
            (field: string) =>
              change.description.toLowerCase().includes(field.toLowerCase()),
          );

          if (affectedFields.length > 0) {
            impact.affectedCultures.add(tradition.culture);

            if (change.type === 'REMOVE') {
              const existing =
                impact.missingRequirements.get(tradition.culture) || [];
              impact.missingRequirements.set(tradition.culture, [
                ...existing,
                ...affectedFields,
              ]);
            }
          }
        }
      }
    }

    return impact;
  }

  private async performAICulturalAnalysis(
    apiVersionChanges: any[],
    targetMarkets: CulturalMarket[],
    culturalRequirements: Map<string, any>,
  ) {
    const analysisPrompt = `
You are a cultural anthropologist and API design expert specializing in wedding traditions globally.

Analyze API changes for cultural compatibility across diverse wedding markets:

API Version Changes:
${apiVersionChanges
  .map(
    (change) => `
- Type: ${change.type}
- Category: ${change.category} 
- Description: ${change.description}
- Breaking Change: ${change.breakingChange}
- Wedding Impact: ${JSON.stringify(change.weddingIndustryImpact)}
`,
  )
  .join('\n')}

Target Markets:
${targetMarkets
  .map(
    (market) => `
- Region: ${market.region}
- Primary Culture: ${market.primaryCulture}
- Secondary Cultures: ${market.secondaryCultures.join(', ')}
- Languages: ${market.languages.join(', ')}
- Calendar Systems: ${market.calendarSystems.join(', ')}
`,
  )
  .join('\n')}

Cultural Requirements Context:
${Array.from(culturalRequirements.entries())
  .map(
    ([region, req]) => `
- ${region}: ${req.traditions.length} traditions, ${req.localization.length} localization rules
  Key traditions: ${req.traditions.map((t: any) => t.name).join(', ')}
`,
  )
  .join('\n')}

Analyze for:
1. Cultural compatibility score for each culture (0.0-1.0)
2. Support level (FULL/PARTIAL/MINIMAL/NONE) 
3. Missing features that affect wedding ceremonies
4. Risk factors with severity levels
5. Specific API modifications needed for cultural support

Focus on:
- Wedding ceremony requirements (religious, traditional)
- Calendar system compatibility (Gregorian, Lunar, Hijri, Hebrew)
- Required documentation and certifications
- Cultural field requirements (gotra, mahr, ketubah, etc.)
- Auspicious/inauspicious period handling
- Language and localization needs

Return detailed JSON analysis for each culture.
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are a wedding industry cultural expert. Return comprehensive JSON analysis.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const aiAnalysis = JSON.parse(response.choices[0].message.content);

    // Validate and enhance AI analysis
    return this.enhanceAIAnalysisWithCulturalData(
      aiAnalysis,
      culturalRequirements,
    );
  }

  private enhanceAIAnalysisWithCulturalData(
    aiAnalysis: any,
    culturalRequirements: Map<string, any>,
  ) {
    const enhancedAnalysis = {
      culturalCompatibility: [] as any[],
    };

    // Process each culture from AI analysis
    if (aiAnalysis.culturalCompatibility) {
      enhancedAnalysis.culturalCompatibility =
        aiAnalysis.culturalCompatibility.map((culture: any) => {
          // Get actual cultural data for validation
          const cultureName = culture.culture.toLowerCase();
          const traditions = this.culturalDatabase.get(cultureName) || [];

          // Validate missing features against actual requirements
          const actualRequiredFields = traditions.flatMap(
            (t) => t.requiredFields,
          );
          const validatedMissingFeatures =
            culture.missingFeatures?.filter((feature: string) =>
              actualRequiredFields.some(
                (field) =>
                  field.toLowerCase().includes(feature.toLowerCase()) ||
                  feature.toLowerCase().includes(field.toLowerCase()),
              ),
            ) || [];

          // Add ceremony-specific risk factors
          const ceremonyRisks = traditions.map((tradition) => ({
            factor: `${tradition.name} ceremony requirements`,
            severity:
              validatedMissingFeatures.length > 3
                ? 'CRITICAL'
                : validatedMissingFeatures.length > 1
                  ? 'HIGH'
                  : 'MEDIUM',
            impact: `Missing ${validatedMissingFeatures.length} required fields for ${tradition.name}`,
            recommendation: `Implement support for: ${validatedMissingFeatures.join(', ')}`,
          }));

          return {
            culture: culture.culture,
            compatibilityScore: this.adjustCompatibilityScore(
              culture.compatibilityScore,
              validatedMissingFeatures.length,
            ),
            supportLevel: this.determineSupportLevel(
              culture.compatibilityScore,
              validatedMissingFeatures.length,
            ),
            missingFeatures: validatedMissingFeatures,
            riskFactors: [...(culture.riskFactors || []), ...ceremonyRisks],
            requiredModifications: this.generateModificationsForCulture(
              cultureName,
              validatedMissingFeatures,
            ),
          };
        });
    }

    return enhancedAnalysis;
  }

  private adjustCompatibilityScore(
    aiScore: number,
    missingFeaturesCount: number,
  ): number {
    let adjustedScore = aiScore || 0.5;

    // Reduce score based on missing critical features
    adjustedScore -= missingFeaturesCount * 0.1;

    // Cap score between 0 and 1
    return Math.max(0, Math.min(1, adjustedScore));
  }

  private determineSupportLevel(
    score: number,
    missingCount: number,
  ): 'FULL' | 'PARTIAL' | 'MINIMAL' | 'NONE' {
    if (score >= 0.9 && missingCount === 0) return 'FULL';
    if (score >= 0.7 && missingCount <= 2) return 'PARTIAL';
    if (score >= 0.3 && missingCount <= 5) return 'MINIMAL';
    return 'NONE';
  }

  private generateModificationsForCulture(
    cultureName: string,
    missingFeatures: string[],
  ): APIModification[] {
    const modifications: APIModification[] = [];

    const traditions = this.culturalDatabase.get(cultureName) || [];

    for (const feature of missingFeatures) {
      // Find which tradition requires this feature
      const requiringTradition = traditions.find((t) =>
        t.requiredFields.some((field) =>
          field.toLowerCase().includes(feature.toLowerCase()),
        ),
      );

      if (requiringTradition) {
        modifications.push({
          type: 'ADD_FIELD',
          target: 'wedding_ceremony',
          modification: {
            name: `add_${feature}_field`,
            description: `Add ${feature} field for ${requiringTradition.name} support`,
            implementation: `Add optional ${feature} field to wedding data model with cultural validation`,
            culturalContext: `Required for ${requiringTradition.culture} wedding ceremonies`,
            priority: 'HIGH',
            estimatedEffort: 4,
          },
          affectedCultures: [requiringTradition.culture],
          backwardCompatibility: true,
          testingRequirements: [
            `Test ${feature} field validation`,
            `Test cultural ceremony workflow`,
            'Test backward compatibility',
          ],
        });
      }
    }

    return modifications;
  }

  private async generateCulturalAPIModifications(
    apiVersionChanges: any[],
    aiAnalysis: any,
    culturalRequirements: Map<string, any>,
  ): Promise<APIModification[]> {
    const modifications: APIModification[] = [];

    // Generate modifications for each culture with compatibility issues
    for (const cultural of aiAnalysis.culturalCompatibility) {
      if (
        cultural.supportLevel === 'NONE' ||
        cultural.supportLevel === 'MINIMAL'
      ) {
        // Add critical modifications for unsupported cultures
        modifications.push(...cultural.requiredModifications);

        // Add calendar system support if needed
        const calendarModification =
          await this.generateCalendarSupportModification(cultural.culture);
        if (calendarModification) {
          modifications.push(calendarModification);
        }

        // Add localization support
        const localizationModification =
          await this.generateLocalizationModification(cultural.culture);
        if (localizationModification) {
          modifications.push(localizationModification);
        }
      }
    }

    // Remove duplicates and sort by priority
    const uniqueModifications = this.deduplicateModifications(modifications);
    return uniqueModifications.sort(
      (a, b) =>
        this.getPriorityWeight(a.modification.priority) -
        this.getPriorityWeight(b.modification.priority),
    );
  }

  private async generateCalendarSupportModification(
    culture: string,
  ): Promise<APIModification | null> {
    const calendarSystems = {
      Hindu: 'Hindu lunar calendar',
      Islamic: 'Hijri calendar',
      Jewish: 'Hebrew calendar',
      Buddhist: 'Buddhist calendar',
    };

    const calendarSystem =
      calendarSystems[culture as keyof typeof calendarSystems];
    if (!calendarSystem) return null;

    return {
      type: 'ADD_ENDPOINT',
      target: 'calendar_conversion',
      modification: {
        name: `add_${culture.toLowerCase()}_calendar_support`,
        description: `Add ${calendarSystem} support for ${culture} weddings`,
        implementation: `Implement ${calendarSystem} conversion endpoints and date validation`,
        culturalContext: `Essential for ${culture} wedding date selection and ceremony planning`,
        priority: 'HIGH',
        estimatedEffort: 16,
      },
      affectedCultures: [culture],
      backwardCompatibility: true,
      testingRequirements: [
        `Test ${calendarSystem} date conversions`,
        'Test auspicious date calculations',
        'Test forbidden period validations',
      ],
    };
  }

  private async generateLocalizationModification(
    culture: string,
  ): Promise<APIModification | null> {
    const localizationNeeds = {
      Hindu: 'Sanskrit/Hindi terms and Devanagari script',
      Islamic: 'Arabic script and RTL layout',
      Jewish: 'Hebrew script and Jewish terminology',
      Chinese: 'Simplified/Traditional Chinese characters',
    };

    const localization =
      localizationNeeds[culture as keyof typeof localizationNeeds];
    if (!localization) return null;

    return {
      type: 'ADD_LOCALIZATION',
      target: 'wedding_terminology',
      modification: {
        name: `add_${culture.toLowerCase()}_localization`,
        description: `Add ${localization} localization support`,
        implementation: `Implement cultural terminology and script support for ${culture} weddings`,
        culturalContext: `Required for proper ${culture} wedding ceremony representation`,
        priority: 'MEDIUM',
        estimatedEffort: 12,
      },
      affectedCultures: [culture],
      backwardCompatibility: true,
      testingRequirements: [
        `Test ${culture} terminology display`,
        'Test cultural script rendering',
        'Test localization completeness',
      ],
    };
  }

  private async analyzeLocalizationGaps(
    targetMarkets: CulturalMarket[],
    apiVersionChanges: any[],
  ) {
    const gaps = [];

    for (const market of targetMarkets) {
      const marketGaps = [];

      // Check date format support
      if (market.calendarSystems.length > 1) {
        marketGaps.push('Multi-calendar system support needed');
      }

      // Check language support
      if (market.languages.some((lang) => ['ar', 'he', 'ur'].includes(lang))) {
        marketGaps.push('Right-to-left text support needed');
      }

      // Check currency support
      marketGaps.push('Local currency formatting required');

      // Check cultural terminology
      if (market.primaryCulture !== 'Christian') {
        marketGaps.push('Cultural wedding terminology localization needed');
      }

      if (marketGaps.length > 0) {
        gaps.push({
          region: market.region,
          gaps: marketGaps,
          priority: marketGaps.length > 2 ? 'HIGH' : 'MEDIUM',
          effort: `${marketGaps.length * 8} hours`,
        });
      }
    }

    return gaps;
  }

  private async generateCulturalTestingRequirements(
    targetMarkets: CulturalMarket[],
    modifications: APIModification[],
  ) {
    const testingRequirements = [];

    for (const market of targetMarkets) {
      const culturalTests = {
        culture: market.primaryCulture,
        testScenarios: [
          `Create ${market.primaryCulture} wedding with all required cultural fields`,
          `Validate ${market.primaryCulture} calendar date conversions`,
          `Test cultural ceremony workflow end-to-end`,
          `Verify cultural terminology displays correctly`,
          `Test forbidden period date validation`,
          `Validate required documentation collection`,
        ],
        validationCriteria: [
          'All cultural fields properly validated',
          'Calendar conversions accurate to cultural standards',
          'Ceremony requirements properly enforced',
          'Cultural experts approve terminology usage',
          'Date restrictions properly implemented',
        ],
        culturalExperts: [
          `${market.primaryCulture} wedding tradition expert`,
          `${market.primaryCulture} religious leader`,
          `Local wedding planner familiar with ${market.primaryCulture} customs`,
        ],
      };

      testingRequirements.push(culturalTests);
    }

    return testingRequirements;
  }

  private async generateDeploymentConsiderations(
    targetMarkets: CulturalMarket[],
    culturalImpactAnalysis: any,
  ) {
    const considerations = [];

    for (const market of targetMarkets) {
      const traditions =
        this.culturalDatabase.get(market.primaryCulture.toLowerCase()) || [];

      // Find upcoming cultural periods
      const upcomingRestrictions = traditions
        .flatMap((t) => t.forbiddenPeriods)
        .filter((period) => {
          const periodStart = new Date(
            `${new Date().getFullYear()}-${period.startDate}`,
          );
          return periodStart > new Date();
        });

      const deployment = {
        culture: market.primaryCulture,
        timing:
          upcomingRestrictions.length > 0
            ? `Deploy before ${upcomingRestrictions[0].startDate}`
            : 'No cultural timing restrictions',
        restrictions: upcomingRestrictions.map(
          (r) => `Avoid ${r.name}: ${r.reason}`,
        ),
        recommendations: [
          'Notify cultural community leaders before deployment',
          'Provide cultural feature documentation in local language',
          'Have cultural expert available during rollout',
          'Test with local wedding planners before full deployment',
        ],
      };

      considerations.push(deployment);
    }

    return considerations;
  }

  private calculateOverallCompatibilityScore(
    culturalCompatibility: any[],
  ): number {
    if (culturalCompatibility.length === 0) return 1.0;

    const totalScore = culturalCompatibility.reduce(
      (sum, culture) => sum + culture.compatibilityScore,
      0,
    );

    return totalScore / culturalCompatibility.length;
  }

  private deduplicateModifications(
    modifications: APIModification[],
  ): APIModification[] {
    const seen = new Set();
    return modifications.filter((mod) => {
      const key = `${mod.type}-${mod.target}-${mod.modification.name}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private getPriorityWeight(priority: string): number {
    switch (priority) {
      case 'HIGH':
        return 1;
      case 'MEDIUM':
        return 2;
      case 'LOW':
        return 3;
      default:
        return 2;
    }
  }

  private async cacheCompatibilityAnalysis(
    targetMarkets: CulturalMarket[],
    analysis: CulturalCompatibilityAnalysis,
  ) {
    const cacheKey = `cultural_analysis:${targetMarkets.map((m) => m.region).join(':')}`;
    await this.redis.setex(cacheKey, 3600, JSON.stringify(analysis)); // 1 hour cache
  }

  private async storeCompatibilityResults(
    apiVersionChanges: any[],
    targetMarkets: CulturalMarket[],
    analysis: CulturalCompatibilityAnalysis,
  ) {
    await this.supabase.from('cultural_compatibility_analysis').insert({
      api_changes: apiVersionChanges,
      target_markets: targetMarkets.map((m) => m.region),
      analysis_result: analysis,
      overall_score: analysis.overallCompatibilityScore,
      created_at: new Date().toISOString(),
    });
  }
}
