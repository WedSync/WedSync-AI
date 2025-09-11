/**
 * Localized Content Manager - WS-247 Multilingual Platform System
 * Manages wedding content localization with cultural adaptation and context awareness
 *
 * Features:
 * - Wedding-specific content localization (invitations, contracts, timelines, etc.)
 * - Cultural adaptation beyond translation (etiquette, customs, formats)
 * - Template management with locale-specific variants
 * - Dynamic content generation with wedding context
 * - Vendor-specific content localization
 * - Content versioning and approval workflows
 * - Real-time content adaptation based on user context
 */

import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';
import { TranslationService } from '@/lib/i18n/translation-service';
import { LocaleManager } from '@/lib/services/i18n/LocaleManager';
import { WeddingTraditionService } from '@/lib/services/i18n/WeddingTraditionService';
import { CulturalCalendarService } from '@/lib/services/i18n/CulturalCalendarService';

// Wedding Content Types
export interface LocalizedContent {
  id: string;
  content_type: WeddingContentType;
  content_key: string;
  locale: string;
  title: string;
  content: string;
  metadata: ContentMetadata;
  cultural_adaptations: CulturalAdaptation[];
  approval_status: 'draft' | 'pending' | 'approved' | 'rejected';
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  approved_by?: string;
}

export type WeddingContentType =
  | 'invitation'
  | 'contract'
  | 'timeline'
  | 'questionnaire'
  | 'email_template'
  | 'sms_template'
  | 'website_content'
  | 'form_field'
  | 'notification'
  | 'legal_document'
  | 'marketing_material'
  | 'vendor_communication'
  | 'client_communication'
  | 'ceremony_script'
  | 'menu_description'
  | 'service_description';

export interface ContentMetadata {
  tags: string[];
  audience: 'couple' | 'vendor' | 'guest' | 'admin' | 'public';
  formality_level: 'casual' | 'formal' | 'very_formal';
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  cultural_sensitivity: 'low' | 'medium' | 'high' | 'critical';
  gender_inclusive: boolean;
  requires_cultural_review: boolean;
  variables: ContentVariable[];
}

export interface ContentVariable {
  name: string;
  type: 'string' | 'date' | 'number' | 'currency' | 'address' | 'name';
  required: boolean;
  cultural_formatting: boolean;
  example_value: string;
  description: string;
}

export interface CulturalAdaptation {
  aspect:
    | 'etiquette'
    | 'format'
    | 'terminology'
    | 'imagery'
    | 'color'
    | 'symbolism';
  description: string;
  original_version: string;
  adapted_version: string;
  cultural_context: string[];
  sensitivity_level: 'low' | 'medium' | 'high';
}

export interface ContentTemplate {
  id: string;
  name: string;
  content_type: WeddingContentType;
  base_locale: string;
  template_content: string;
  variables: ContentVariable[];
  cultural_variants: { [locale: string]: LocalizedContent };
  usage_guidelines: string;
  created_at: string;
  updated_at: string;
}

export interface LocalizationRequest {
  content_id: string;
  source_locale: string;
  target_locales: string[];
  preserve_formatting: boolean;
  cultural_adaptation_level:
    | 'translation_only'
    | 'light_adaptation'
    | 'full_cultural_adaptation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  wedding_context?: WeddingContext;
  approval_required: boolean;
}

export interface WeddingContext {
  ceremony_type: 'religious' | 'civil' | 'spiritual' | 'cultural_fusion';
  cultural_backgrounds: string[];
  venue_type: 'indoor' | 'outdoor' | 'destination' | 'home' | 'religious_venue';
  guest_count: number;
  formality_level: 'casual' | 'semi_formal' | 'formal' | 'black_tie';
  budget_tier: 'budget' | 'mid_range' | 'luxury' | 'ultra_luxury';
  special_requirements: string[];
}

export interface ContentGenerationRequest {
  content_type: WeddingContentType;
  locale: string;
  wedding_context: WeddingContext;
  template_id?: string;
  variables: { [key: string]: any };
  customization_preferences?: {
    tone: 'friendly' | 'professional' | 'elegant' | 'playful';
    length: 'concise' | 'standard' | 'detailed';
    include_cultural_elements: boolean;
  };
}

/**
 * Localized Content Manager Implementation
 */
class LocalizedContentManagerClass {
  private supabase = createClient();
  private translationService = TranslationService;
  private localeManager = LocaleManager;
  private weddingTraditionService = WeddingTraditionService;
  private culturalCalendarService = CulturalCalendarService;
  private cache = new Map<string, any>();
  private cacheExpiry = 60 * 60 * 1000; // 1 hour

  /**
   * Generate localized wedding content
   */
  async generateLocalizedContent(
    request: ContentGenerationRequest,
  ): Promise<LocalizedContent> {
    try {
      const cacheKey = `generate_${JSON.stringify(request)}`;

      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.data;
        }
      }

      // Get base template if specified
      let baseTemplate: ContentTemplate | null = null;
      if (request.template_id) {
        baseTemplate = await this.getContentTemplate(request.template_id);
      }

      // Get cultural context for the locale
      const localeInfo = await this.localeManager.getLocaleInfo(request.locale);
      const culturalTraditions =
        await this.weddingTraditionService.searchTraditions(
          request.locale,
          request.wedding_context.ceremony_type,
          request.wedding_context.cultural_backgrounds,
        );

      // Generate culturally appropriate content
      const generatedContent = await this.generateCulturallyAdaptedContent(
        request,
        baseTemplate,
        localeInfo,
        culturalTraditions,
      );

      // Apply cultural adaptations
      const culturalAdaptations = await this.applyCulturalAdaptations(
        generatedContent.content,
        request.locale,
        request.wedding_context,
      );

      const localizedContent: LocalizedContent = {
        id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content_type: request.content_type,
        content_key: `${request.content_type}_${request.locale}_${Date.now()}`,
        locale: request.locale,
        title: generatedContent.title,
        content: generatedContent.content,
        metadata: generatedContent.metadata,
        cultural_adaptations: culturalAdaptations,
        approval_status: 'draft',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'system',
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: localizedContent,
        timestamp: Date.now(),
      });

      // Save to database
      await this.saveLocalizedContent(localizedContent);

      return localizedContent;
    } catch (error) {
      console.error('Error generating localized content:', error);
      throw new Error('Failed to generate localized content');
    }
  }

  /**
   * Localize existing content to target locales
   */
  async localizeContent(
    request: LocalizationRequest,
  ): Promise<LocalizedContent[]> {
    try {
      const sourceContent = await this.getLocalizedContent(request.content_id);
      if (!sourceContent) {
        throw new Error('Source content not found');
      }

      const localizedContents: LocalizedContent[] = [];

      for (const targetLocale of request.target_locales) {
        if (targetLocale === request.source_locale) {
          continue; // Skip same locale
        }

        // Translate the content
        const translatedText = await this.translationService.translateText(
          sourceContent.content,
          request.source_locale,
          targetLocale,
          {
            context: 'wedding_industry',
            preserve_formatting: request.preserve_formatting,
            quality_threshold: 0.8,
          },
        );

        const translatedTitle = await this.translationService.translateText(
          sourceContent.title,
          request.source_locale,
          targetLocale,
          {
            context: 'wedding_industry',
            preserve_formatting: false,
            quality_threshold: 0.8,
          },
        );

        // Apply cultural adaptations if requested
        let culturalAdaptations: CulturalAdaptation[] = [];
        let finalContent = translatedText.translatedText;

        if (request.cultural_adaptation_level !== 'translation_only') {
          culturalAdaptations = await this.applyCulturalAdaptations(
            finalContent,
            targetLocale,
            request.wedding_context,
          );

          if (
            request.cultural_adaptation_level === 'full_cultural_adaptation'
          ) {
            finalContent = await this.applyFullCulturalAdaptation(
              finalContent,
              targetLocale,
              request.wedding_context,
              culturalAdaptations,
            );
          }
        }

        const localizedContent: LocalizedContent = {
          id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content_type: sourceContent.content_type,
          content_key: `${sourceContent.content_key}_${targetLocale}`,
          locale: targetLocale,
          title: translatedTitle.translatedText,
          content: finalContent,
          metadata: {
            ...sourceContent.metadata,
            requires_cultural_review:
              request.cultural_adaptation_level === 'full_cultural_adaptation',
          },
          cultural_adaptations: culturalAdaptations,
          approval_status: request.approval_required ? 'pending' : 'approved',
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'system',
        };

        localizedContents.push(localizedContent);
        await this.saveLocalizedContent(localizedContent);
      }

      return localizedContents;
    } catch (error) {
      console.error('Error localizing content:', error);
      throw new Error('Failed to localize content');
    }
  }

  /**
   * Get localized content by key and locale
   */
  async getLocalizedContentByKey(
    contentKey: string,
    locale: string,
    fallbackLocale: string = 'en-US',
  ): Promise<LocalizedContent | null> {
    try {
      const cacheKey = `content_${contentKey}_${locale}`;

      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.data;
        }
      }

      // Try to get content in requested locale
      let content = await this.queryLocalizedContent(contentKey, locale);

      // If not found, try fallback locale
      if (!content && locale !== fallbackLocale) {
        content = await this.queryLocalizedContent(contentKey, fallbackLocale);
      }

      // Cache if found
      if (content) {
        this.cache.set(cacheKey, {
          data: content,
          timestamp: Date.now(),
        });
      }

      return content;
    } catch (error) {
      console.error('Error getting localized content:', error);
      return null;
    }
  }

  /**
   * Create or update content template
   */
  async createContentTemplate(
    template: Omit<ContentTemplate, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<ContentTemplate> {
    try {
      const newTemplate: ContentTemplate = {
        ...template,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save to database
      const { data, error } = await this.supabase
        .from('content_templates')
        .insert(newTemplate)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating content template:', error);
      throw new Error('Failed to create content template');
    }
  }

  /**
   * Get wedding content templates by type and locale
   */
  async getContentTemplates(
    contentType?: WeddingContentType,
    locale?: string,
  ): Promise<ContentTemplate[]> {
    try {
      let query = this.supabase.from('content_templates').select('*');

      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      if (locale) {
        query = query.eq('base_locale', locale);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting content templates:', error);
      return [];
    }
  }

  /**
   * Bulk localize content for multiple locales
   */
  async bulkLocalizeContent(
    contentIds: string[],
    targetLocales: string[],
    options: {
      cultural_adaptation_level:
        | 'translation_only'
        | 'light_adaptation'
        | 'full_cultural_adaptation';
      preserve_formatting: boolean;
      approval_required: boolean;
      wedding_context?: WeddingContext;
    },
  ): Promise<{
    success: LocalizedContent[];
    errors: Array<{ contentId: string; error: string }>;
  }> {
    const success: LocalizedContent[] = [];
    const errors: Array<{ contentId: string; error: string }> = [];

    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < contentIds.length; i += batchSize) {
      const batch = contentIds.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (contentId) => {
          try {
            const sourceContent = await this.getLocalizedContent(contentId);
            if (!sourceContent) {
              errors.push({ contentId, error: 'Content not found' });
              return;
            }

            const request: LocalizationRequest = {
              content_id: contentId,
              source_locale: sourceContent.locale,
              target_locales: targetLocales,
              preserve_formatting: options.preserve_formatting,
              cultural_adaptation_level: options.cultural_adaptation_level,
              priority: 'medium',
              wedding_context: options.wedding_context,
              approval_required: options.approval_required,
            };

            const localizedContents = await this.localizeContent(request);
            success.push(...localizedContents);
          } catch (error) {
            errors.push({
              contentId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }),
      );

      // Small delay between batches
      if (i + batchSize < contentIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return { success, errors };
  }

  /**
   * Get content localization statistics
   */
  async getLocalizationStats(contentType?: WeddingContentType): Promise<{
    total_content: number;
    localized_content_by_locale: { [locale: string]: number };
    approval_stats: { [status: string]: number };
    cultural_adaptation_stats: { [level: string]: number };
    recent_activity: Array<{
      date: string;
      localizations_created: number;
      approvals: number;
    }>;
  }> {
    try {
      let query = this.supabase.from('localized_content').select('*');

      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const contents = data || [];

      // Calculate statistics
      const localized_content_by_locale: { [locale: string]: number } = {};
      const approval_stats: { [status: string]: number } = {};
      const cultural_adaptation_stats: { [level: string]: number } = {};

      for (const content of contents) {
        // Locale stats
        localized_content_by_locale[content.locale] =
          (localized_content_by_locale[content.locale] || 0) + 1;

        // Approval stats
        approval_stats[content.approval_status] =
          (approval_stats[content.approval_status] || 0) + 1;

        // Cultural adaptation stats
        const adaptationLevel =
          content.cultural_adaptations.length > 0
            ? content.cultural_adaptations.length > 3
              ? 'full'
              : 'light'
            : 'none';
        cultural_adaptation_stats[adaptationLevel] =
          (cultural_adaptation_stats[adaptationLevel] || 0) + 1;
      }

      return {
        total_content: contents.length,
        localized_content_by_locale,
        approval_stats,
        cultural_adaptation_stats,
        recent_activity: [], // Would be calculated from actual data
      };
    } catch (error) {
      console.error('Error getting localization stats:', error);
      throw new Error('Failed to get localization statistics');
    }
  }

  /**
   * Private helper methods
   */

  private async generateCulturallyAdaptedContent(
    request: ContentGenerationRequest,
    baseTemplate: ContentTemplate | null,
    localeInfo: any,
    culturalTraditions: any[],
  ) {
    // Generate content based on template and cultural context
    let content = '';
    let title = '';
    let variables: ContentVariable[] = [];

    if (baseTemplate) {
      content = baseTemplate.template_content;
      title = baseTemplate.name;
      variables = baseTemplate.variables;
    } else {
      // Generate from scratch based on content type
      const generated = await this.generateContentFromScratch(request);
      content = generated.content;
      title = generated.title;
      variables = generated.variables;
    }

    // Replace variables with actual values
    content = this.replaceContentVariables(content, request.variables);

    // Apply cultural context
    if (culturalTraditions.length > 0) {
      content = await this.incorporateCulturalElements(
        content,
        culturalTraditions,
        request.locale,
      );
    }

    const metadata: ContentMetadata = {
      tags: [request.content_type, request.locale],
      audience: this.determineAudience(request.content_type),
      formality_level:
        request.customization_preferences?.tone === 'elegant'
          ? 'formal'
          : 'casual',
      urgency: 'medium',
      cultural_sensitivity: 'medium',
      gender_inclusive: true,
      requires_cultural_review:
        request.wedding_context.cultural_backgrounds.length > 1,
      variables,
    };

    return { content, title, metadata };
  }

  private async applyCulturalAdaptations(
    content: string,
    locale: string,
    wedding_context?: WeddingContext,
  ): Promise<CulturalAdaptation[]> {
    const adaptations: CulturalAdaptation[] = [];

    // Get cultural guidelines for the locale
    const localeInfo = await this.localeManager.getLocaleInfo(locale);

    // Apply etiquette adaptations
    if (wedding_context) {
      const etiquetteAdaptation = await this.adaptContentEtiquette(
        content,
        locale,
        wedding_context,
      );
      if (etiquetteAdaptation) {
        adaptations.push(etiquetteAdaptation);
      }

      // Apply format adaptations (dates, addresses, etc.)
      const formatAdaptation = await this.adaptContentFormat(content, locale);
      if (formatAdaptation) {
        adaptations.push(formatAdaptation);
      }
    }

    return adaptations;
  }

  private async applyFullCulturalAdaptation(
    content: string,
    locale: string,
    wedding_context: WeddingContext | undefined,
    adaptations: CulturalAdaptation[],
  ): Promise<string> {
    let adaptedContent = content;

    // Apply each cultural adaptation
    for (const adaptation of adaptations) {
      adaptedContent = adaptedContent.replace(
        adaptation.original_version,
        adaptation.adapted_version,
      );
    }

    return adaptedContent;
  }

  private replaceContentVariables(
    content: string,
    variables: { [key: string]: any },
  ): string {
    let processedContent = content;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processedContent = processedContent.replace(
        new RegExp(placeholder, 'g'),
        String(value),
      );
    }

    return processedContent;
  }

  private async incorporateCulturalElements(
    content: string,
    traditions: any[],
    locale: string,
  ): Promise<string> {
    // Add cultural elements based on traditions
    let enhancedContent = content;

    for (const tradition of traditions.slice(0, 2)) {
      // Limit to 2 traditions
      if (tradition.cultural_significance > 80) {
        enhancedContent += `\n\nCultural Note: ${tradition.description}`;
      }
    }

    return enhancedContent;
  }

  private determineAudience(
    contentType: WeddingContentType,
  ): 'couple' | 'vendor' | 'guest' | 'admin' | 'public' {
    const audienceMap: {
      [key in WeddingContentType]:
        | 'couple'
        | 'vendor'
        | 'guest'
        | 'admin'
        | 'public';
    } = {
      invitation: 'guest',
      contract: 'couple',
      timeline: 'couple',
      questionnaire: 'couple',
      email_template: 'couple',
      sms_template: 'couple',
      website_content: 'public',
      form_field: 'couple',
      notification: 'couple',
      legal_document: 'couple',
      marketing_material: 'public',
      vendor_communication: 'vendor',
      client_communication: 'couple',
      ceremony_script: 'couple',
      menu_description: 'guest',
      service_description: 'public',
    };

    return audienceMap[contentType];
  }

  private async generateContentFromScratch(request: ContentGenerationRequest) {
    // Basic content generation based on type
    const contentTemplates = {
      invitation: {
        title: 'Wedding Invitation',
        content:
          'You are cordially invited to celebrate the wedding of {{bride_name}} and {{groom_name}} on {{wedding_date}} at {{venue_name}}.',
        variables: [
          {
            name: 'bride_name',
            type: 'name',
            required: true,
            cultural_formatting: true,
            example_value: 'Sarah',
            description: "Bride's name",
          },
          {
            name: 'groom_name',
            type: 'name',
            required: true,
            cultural_formatting: true,
            example_value: 'John',
            description: "Groom's name",
          },
          {
            name: 'wedding_date',
            type: 'date',
            required: true,
            cultural_formatting: true,
            example_value: '2024-06-15',
            description: 'Wedding date',
          },
          {
            name: 'venue_name',
            type: 'string',
            required: true,
            cultural_formatting: false,
            example_value: 'Grand Ballroom',
            description: 'Venue name',
          },
        ] as ContentVariable[],
      },
      email_template: {
        title: 'Email Template',
        content:
          'Dear {{recipient_name}},\n\n{{email_content}}\n\nBest regards,\n{{sender_name}}',
        variables: [
          {
            name: 'recipient_name',
            type: 'name',
            required: true,
            cultural_formatting: true,
            example_value: 'Mr. Smith',
            description: 'Recipient name',
          },
          {
            name: 'email_content',
            type: 'string',
            required: true,
            cultural_formatting: false,
            example_value: 'Thank you for your inquiry...',
            description: 'Email content',
          },
          {
            name: 'sender_name',
            type: 'name',
            required: true,
            cultural_formatting: true,
            example_value: 'Jane Doe',
            description: 'Sender name',
          },
        ] as ContentVariable[],
      },
    };

    const template =
      contentTemplates[request.content_type as keyof typeof contentTemplates] ||
      contentTemplates['email_template'];

    return template;
  }

  private async adaptContentEtiquette(
    content: string,
    locale: string,
    wedding_context: WeddingContext,
  ): Promise<CulturalAdaptation | null> {
    // Apply cultural etiquette rules
    if (
      locale.startsWith('ja-') &&
      wedding_context.formality_level === 'formal'
    ) {
      return {
        aspect: 'etiquette',
        description: 'Applied Japanese formal language etiquette',
        original_version: content,
        adapted_version: content.replace(/you/g, 'you (respectful form)'),
        cultural_context: ['japanese', 'formal_communication'],
        sensitivity_level: 'high',
      };
    }

    return null;
  }

  private async adaptContentFormat(
    content: string,
    locale: string,
  ): Promise<CulturalAdaptation | null> {
    // Apply format adaptations (dates, addresses, etc.)
    if (locale.startsWith('en-GB')) {
      return {
        aspect: 'format',
        description: 'Applied British date and address formatting',
        original_version: content,
        adapted_version: content, // Would actually modify dates/addresses
        cultural_context: ['british', 'formatting'],
        sensitivity_level: 'low',
      };
    }

    return null;
  }

  private async saveLocalizedContent(content: LocalizedContent): Promise<void> {
    const { error } = await this.supabase
      .from('localized_content')
      .insert(content);

    if (error) {
      console.error('Error saving localized content:', error);
      throw error;
    }
  }

  private async getLocalizedContent(
    contentId: string,
  ): Promise<LocalizedContent | null> {
    const { data, error } = await this.supabase
      .from('localized_content')
      .select('*')
      .eq('id', contentId)
      .single();

    if (error) {
      console.error('Error getting localized content:', error);
      return null;
    }

    return data;
  }

  private async queryLocalizedContent(
    contentKey: string,
    locale: string,
  ): Promise<LocalizedContent | null> {
    const { data, error } = await this.supabase
      .from('localized_content')
      .select('*')
      .eq('content_key', contentKey)
      .eq('locale', locale)
      .eq('approval_status', 'approved')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  private async getContentTemplate(
    templateId: string,
  ): Promise<ContentTemplate | null> {
    const { data, error } = await this.supabase
      .from('content_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Clear service cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      cache_size: this.cache.size,
      supported_content_types: [
        'invitation',
        'contract',
        'timeline',
        'questionnaire',
        'email_template',
        'sms_template',
        'website_content',
        'form_field',
        'notification',
        'legal_document',
        'marketing_material',
        'vendor_communication',
        'client_communication',
        'ceremony_script',
        'menu_description',
        'service_description',
      ],
      service_version: '1.0.0',
      last_updated: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const LocalizedContentManager = new LocalizedContentManagerClass();
export default LocalizedContentManager;
