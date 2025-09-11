import {
  AppStoreMetadata,
  ComplianceResult,
  PlatformRequirements,
  AppStoreAsset,
  ComplianceCheckerInterface,
} from './types';

// Interfaces now imported from types.ts

export class ComplianceChecker implements ComplianceCheckerInterface {
  private platformRequirements: { [platform: string]: PlatformRequirements };

  constructor() {
    this.platformRequirements = this.initializePlatformRequirements();
  }

  async validateForPlatform(
    platform: 'microsoft' | 'google' | 'apple',
    metadata: AppStoreMetadata,
  ): Promise<ComplianceResult> {
    const requirements = this.platformRequirements[platform];
    if (!requirements) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    const violations: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate metadata compliance
    const metadataResult = this.validateMetadata(
      metadata,
      requirements.metadata,
    );
    violations.push(...metadataResult.violations);
    warnings.push(...metadataResult.warnings);
    recommendations.push(...metadataResult.recommendations);

    // Validate content compliance
    const contentResult = this.validateContent(metadata, requirements.content);
    violations.push(...contentResult.violations);
    warnings.push(...contentResult.warnings);
    recommendations.push(...contentResult.recommendations);

    // Validate wedding industry specific requirements
    const weddingResult = this.validateWeddingIndustryCompliance(
      metadata,
      platform,
    );
    violations.push(...weddingResult.violations);
    warnings.push(...weddingResult.warnings);
    recommendations.push(...weddingResult.recommendations);

    // Platform-specific validations
    switch (platform) {
      case 'microsoft':
        const msResult = this.validateMicrosoftSpecific(metadata);
        violations.push(...msResult.violations);
        warnings.push(...msResult.warnings);
        recommendations.push(...msResult.recommendations);
        break;
      case 'google':
        const googleResult = this.validateGooglePlaySpecific(metadata);
        violations.push(...googleResult.violations);
        warnings.push(...googleResult.warnings);
        recommendations.push(...googleResult.recommendations);
        break;
      case 'apple':
        const appleResult = this.validateAppStoreSpecific(metadata);
        violations.push(...appleResult.violations);
        warnings.push(...appleResult.warnings);
        recommendations.push(...appleResult.recommendations);
        break;
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      warnings,
      recommendations,
    };
  }

  private validateMetadata(
    metadata: AppStoreMetadata,
    requirements: PlatformRequirements['metadata'],
  ): ComplianceResult {
    const violations: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Title validation
    if (
      !metadata.title ||
      metadata.title.length < requirements.titleMinLength
    ) {
      violations.push(
        `Title must be at least ${requirements.titleMinLength} characters long`,
      );
    }
    if (metadata.title && metadata.title.length > requirements.titleMaxLength) {
      violations.push(
        `Title must be no more than ${requirements.titleMaxLength} characters long`,
      );
    }

    // Short description validation
    if (
      !metadata.shortDescription ||
      metadata.shortDescription.length < requirements.shortDescriptionMinLength
    ) {
      violations.push(
        `Short description must be at least ${requirements.shortDescriptionMinLength} characters long`,
      );
    }
    if (
      metadata.shortDescription &&
      metadata.shortDescription.length > requirements.shortDescriptionMaxLength
    ) {
      violations.push(
        `Short description must be no more than ${requirements.shortDescriptionMaxLength} characters long`,
      );
    }

    // Full description validation
    if (
      !metadata.fullDescription ||
      metadata.fullDescription.length < requirements.fullDescriptionMinLength
    ) {
      violations.push(
        `Full description must be at least ${requirements.fullDescriptionMinLength} characters long`,
      );
    }
    if (
      metadata.fullDescription &&
      metadata.fullDescription.length > requirements.fullDescriptionMaxLength
    ) {
      violations.push(
        `Full description must be no more than ${requirements.fullDescriptionMaxLength} characters long`,
      );
    }

    // Keywords validation
    if (metadata.keywords.length > requirements.keywordsMaxCount) {
      violations.push(
        `Maximum ${requirements.keywordsMaxCount} keywords allowed`,
      );
    }

    for (const keyword of metadata.keywords) {
      if (keyword.length > requirements.keywordMaxLength) {
        violations.push(
          `Keyword "${keyword}" exceeds maximum length of ${requirements.keywordMaxLength} characters`,
        );
      }
    }

    // Required fields validation
    for (const field of requirements.requiredFields) {
      if (!(field in metadata) || !metadata[field as keyof AppStoreMetadata]) {
        violations.push(`Required field "${field}" is missing or empty`);
      }
    }

    // Wedding-specific content recommendations
    if (!metadata.fullDescription.toLowerCase().includes('wedding')) {
      recommendations.push(
        'Consider explicitly mentioning "wedding" in your description for better discoverability',
      );
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      warnings,
      recommendations,
    };
  }

  private validateContent(
    metadata: AppStoreMetadata,
    requirements: PlatformRequirements['content'],
  ): ComplianceResult {
    const violations: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check for prohibited words
    const allText =
      `${metadata.title} ${metadata.shortDescription} ${metadata.fullDescription} ${metadata.keywords.join(' ')}`.toLowerCase();

    for (const prohibitedWord of requirements.prohibitedWords) {
      if (allText.includes(prohibitedWord.toLowerCase())) {
        violations.push(
          `Content contains prohibited word: "${prohibitedWord}"`,
        );
      }
    }

    // Privacy policy validation
    if (requirements.privacyPolicyRequired && !metadata.privacyPolicyUrl) {
      violations.push('Privacy policy URL is required');
    }

    // Validate URLs are accessible
    if (
      metadata.privacyPolicyUrl &&
      !this.isValidURL(metadata.privacyPolicyUrl)
    ) {
      warnings.push('Privacy policy URL format appears invalid');
    }

    if (metadata.supportUrl && !this.isValidURL(metadata.supportUrl)) {
      warnings.push('Support URL format appears invalid');
    }

    if (metadata.websiteUrl && !this.isValidURL(metadata.websiteUrl)) {
      warnings.push('Website URL format appears invalid');
    }

    // Age rating validation
    const contentRating = metadata.contentRating || 'general';
    const ratingRequirements =
      requirements.ageRatingRequirements[contentRating];

    if (ratingRequirements) {
      for (const requirement of ratingRequirements) {
        if (!allText.includes(requirement.toLowerCase())) {
          warnings.push(
            `Content rated "${contentRating}" should include: ${requirement}`,
          );
        }
      }
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      warnings,
      recommendations,
    };
  }

  private validateWeddingIndustryCompliance(
    metadata: AppStoreMetadata,
    platform: string,
  ): ComplianceResult {
    const violations: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const weddingData = metadata.weddingSpecific;

    // Validate target audience
    const validAudiences = ['photographers', 'planners', 'couples', 'vendors'];
    if (!validAudiences.includes(weddingData.targetAudience)) {
      violations.push(
        `Invalid target audience: ${weddingData.targetAudience}. Must be one of: ${validAudiences.join(', ')}`,
      );
    }

    // Wedding categories validation
    if (weddingData.weddingCategories.length === 0) {
      warnings.push(
        'No wedding categories specified. Consider adding relevant categories for better discoverability',
      );
    }

    const validCategories = [
      'photography',
      'videography',
      'planning',
      'coordination',
      'venue-management',
      'catering',
      'floral',
      'music',
      'transportation',
      'guest-management',
    ];

    for (const category of weddingData.weddingCategories) {
      if (!validCategories.includes(category)) {
        warnings.push(`Unknown wedding category: ${category}`);
      }
    }

    // Geographic focus validation
    if (weddingData.geographicFocus.length === 0) {
      recommendations.push(
        'Consider specifying geographic focus for local wedding market targeting',
      );
    }

    // Seasonality considerations
    if (weddingData.seasonality === 'seasonal') {
      recommendations.push(
        'Consider highlighting seasonal features in your description to attract appropriate wedding clients',
      );
    }

    // Professional credibility checks
    const description = metadata.fullDescription.toLowerCase();
    const professionalKeywords = [
      'professional',
      'certified',
      'experienced',
      'portfolio',
      'testimonials',
      'reviews',
      'licensed',
      'insured',
      'award',
      'years of experience',
    ];

    const hasCredibilityIndicators = professionalKeywords.some((keyword) =>
      description.includes(keyword),
    );

    if (!hasCredibilityIndicators) {
      recommendations.push(
        'Consider adding credibility indicators (experience, certifications, reviews) to build trust with wedding clients',
      );
    }

    // Wedding-specific feature validation
    const weddingFeatures = [
      'timeline',
      'budget',
      'vendor',
      'guest',
      'planning',
      'coordination',
      'photo',
      'video',
      'checklist',
      'schedule',
      'invitation',
    ];

    const hasWeddingFeatures = weddingFeatures.some((feature) =>
      description.includes(feature),
    );

    if (!hasWeddingFeatures) {
      warnings.push(
        'Description lacks wedding-specific feature mentions. Consider highlighting key wedding functionality',
      );
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      warnings,
      recommendations,
    };
  }

  private validateMicrosoftSpecific(
    metadata: AppStoreMetadata,
  ): ComplianceResult {
    const violations: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Microsoft Store specific validations
    if (!metadata.category) {
      violations.push('App category is required for Microsoft Store');
    }

    // PWA specific requirements
    if (
      metadata.version &&
      !this.isValidVersionFormat(metadata.version, 'microsoft')
    ) {
      violations.push(
        'Version format must follow Microsoft Store guidelines (e.g., 1.0.0.0)',
      );
    }

    // Microsoft Store content policies
    const contentPolicies = [
      'No misleading functionality claims',
      'Accurate description of app capabilities',
      'Professional wedding service representation',
    ];

    recommendations.push(
      ...contentPolicies.map((policy) => `Microsoft Store: ${policy}`),
    );

    return {
      isCompliant: violations.length === 0,
      violations,
      warnings,
      recommendations,
    };
  }

  private validateGooglePlaySpecific(
    metadata: AppStoreMetadata,
  ): ComplianceResult {
    const violations: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Google Play specific validations
    if (!metadata.contentRating) {
      violations.push('Content rating is required for Google Play');
    }

    // Data safety requirements
    if (!metadata.privacyPolicyUrl) {
      violations.push(
        'Privacy policy URL is required for Google Play apps that collect user data',
      );
    }

    // Google Play content policies
    if (metadata.fullDescription.length < 80) {
      warnings.push(
        'Google Play recommends at least 80 characters in the full description',
      );
    }

    // Wedding industry specific for Google Play
    const weddingProfessionalGuidelines = [
      'Clearly state target wedding professionals (photographers, planners, etc.)',
      'Include screenshots showing wedding-specific workflows',
      'Mention compliance with wedding industry standards',
      'Highlight data privacy features for sensitive wedding information',
    ];

    recommendations.push(...weddingProfessionalGuidelines);

    return {
      isCompliant: violations.length === 0,
      violations,
      warnings,
      recommendations,
    };
  }

  private validateAppStoreSpecific(
    metadata: AppStoreMetadata,
  ): ComplianceResult {
    const violations: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Apple App Store specific validations
    if (!metadata.privacyPolicyUrl) {
      violations.push('Privacy policy URL is required for App Store apps');
    }

    // App Store Review Guidelines
    const reviewGuidelines = [
      'App must provide clear value to wedding professionals',
      'No misleading claims about app capabilities',
      'Proper data handling for sensitive wedding information',
      'Clear explanation of subscription features if applicable',
    ];

    recommendations.push(...reviewGuidelines);

    // Wedding industry specific for App Store
    if (
      !metadata.features.some((feature) =>
        feature.toLowerCase().includes('photo'),
      )
    ) {
      warnings.push(
        'Consider highlighting photo management features for wedding photographer market',
      );
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      warnings,
      recommendations,
    };
  }

  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidVersionFormat(version: string, platform: string): boolean {
    const patterns = {
      microsoft: /^\d+\.\d+\.\d+\.\d+$/,
      google: /^\d+\.\d+\.\d+$/,
      apple: /^\d+\.\d+(\.\d+)?$/,
    };

    const pattern = patterns[platform as keyof typeof patterns];
    return pattern ? pattern.test(version) : true;
  }

  private initializePlatformRequirements(): {
    [platform: string]: PlatformRequirements;
  } {
    return {
      microsoft: {
        metadata: {
          titleMinLength: 3,
          titleMaxLength: 50,
          shortDescriptionMinLength: 10,
          shortDescriptionMaxLength: 200,
          fullDescriptionMinLength: 200,
          fullDescriptionMaxLength: 10000,
          keywordsMaxCount: 7,
          keywordMaxLength: 30,
          requiredFields: [
            'title',
            'shortDescription',
            'fullDescription',
            'category',
            'version',
          ],
        },
        assets: {
          requiredIcons: [
            { size: '44x44', format: ['png'] },
            { size: '150x150', format: ['png'] },
            { size: '310x150', format: ['png'] },
          ],
          requiredScreenshots: [
            { size: '1366x768', minCount: 1, maxCount: 10 },
          ],
          maxFileSize: 50 * 1024 * 1024, // 50MB
          supportedFormats: ['png', 'jpg', 'jpeg'],
        },
        content: {
          prohibitedWords: ['crack', 'hack', 'pirate', 'adult', 'gambling'],
          requiredDisclosures: ['privacy policy', 'terms of service'],
          ageRatingRequirements: {
            general: ['suitable for all audiences'],
            mature: ['age restriction notices'],
          },
          privacyPolicyRequired: true,
        },
        technical: {
          minVersion: '1.0.0.0',
          supportedPlatforms: ['windows', 'web'],
          requiredPermissions: ['internetClient'],
          prohibitedPermissions: ['camera', 'microphone'],
        },
      },
      google: {
        metadata: {
          titleMinLength: 2,
          titleMaxLength: 50,
          shortDescriptionMinLength: 80,
          shortDescriptionMaxLength: 80,
          fullDescriptionMinLength: 80,
          fullDescriptionMaxLength: 4000,
          keywordsMaxCount: 50,
          keywordMaxLength: 30,
          requiredFields: [
            'title',
            'shortDescription',
            'fullDescription',
            'contentRating',
          ],
        },
        assets: {
          requiredIcons: [
            { size: '512x512', format: ['png'] },
            { size: '192x192', format: ['png'] },
          ],
          requiredScreenshots: [
            { size: '1080x1920', minCount: 2, maxCount: 8 },
            { size: '1920x1080', minCount: 1, maxCount: 8 },
          ],
          maxFileSize: 100 * 1024 * 1024, // 100MB
          supportedFormats: ['png', 'jpg', 'jpeg', 'webp'],
        },
        content: {
          prohibitedWords: [
            'illegal',
            'violence',
            'adult',
            'gambling',
            'drugs',
          ],
          requiredDisclosures: ['data safety', 'privacy policy'],
          ageRatingRequirements: {
            everyone: ['content appropriate for all ages'],
            teen: ['mild content warnings'],
            mature: ['age verification required'],
          },
          privacyPolicyRequired: true,
        },
        technical: {
          minVersion: '1.0.0',
          supportedPlatforms: ['android'],
          requiredPermissions: ['INTERNET'],
          prohibitedPermissions: ['CAMERA', 'RECORD_AUDIO'],
        },
      },
      apple: {
        metadata: {
          titleMinLength: 2,
          titleMaxLength: 30,
          shortDescriptionMinLength: 10,
          shortDescriptionMaxLength: 170,
          fullDescriptionMinLength: 10,
          fullDescriptionMaxLength: 4000,
          keywordsMaxCount: 100,
          keywordMaxLength: 100,
          requiredFields: ['title', 'fullDescription', 'privacyPolicyUrl'],
        },
        assets: {
          requiredIcons: [
            { size: '1024x1024', format: ['png'] },
            { size: '512x512', format: ['png'] },
          ],
          requiredScreenshots: [
            { size: '1284x2778', minCount: 1, maxCount: 10 },
            { size: '2048x2732', minCount: 1, maxCount: 10 },
          ],
          maxFileSize: 500 * 1024 * 1024, // 500MB
          supportedFormats: ['png', 'jpg', 'jpeg'],
        },
        content: {
          prohibitedWords: [
            'jailbreak',
            'crack',
            'adult',
            'gambling',
            'violence',
          ],
          requiredDisclosures: ['privacy policy', 'data usage'],
          ageRatingRequirements: {
            '4+': ['no objectionable content'],
            '9+': ['mild content'],
            '12+': ['moderate content'],
            '17+': ['mature content warnings'],
          },
          privacyPolicyRequired: true,
        },
        technical: {
          minVersion: '1.0',
          supportedPlatforms: ['ios', 'ipados', 'macos'],
          requiredPermissions: ['network'],
          prohibitedPermissions: ['camera', 'microphone', 'location'],
        },
      },
    };
  }

  async generateComplianceReport(
    metadata: AppStoreMetadata,
    platforms: ('microsoft' | 'google' | 'apple')[],
  ): Promise<{ [platform: string]: ComplianceResult }> {
    const results: { [platform: string]: ComplianceResult } = {};

    for (const platform of platforms) {
      results[platform] = await this.validateForPlatform(platform, metadata);
    }

    return results;
  }

  async suggestImprovements(
    metadata: AppStoreMetadata,
    platforms: ('microsoft' | 'google' | 'apple')[],
  ): Promise<string[]> {
    const suggestions: Set<string> = new Set();

    for (const platform of platforms) {
      const result = await this.validateForPlatform(platform, metadata);
      result.recommendations.forEach((rec) => suggestions.add(rec));
    }

    return Array.from(suggestions);
  }
}
