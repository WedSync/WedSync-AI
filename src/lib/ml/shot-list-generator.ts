/**
 * WS-130: AI-Powered Shot List Generation Service
 * Comprehensive shot list generation based on event type, style, and preferences
 */

import { openai } from '@/lib/services/openai-service';
import { supabase } from '@/lib/supabase/client';

// Types for shot list generation
export interface ShotListGenerationRequest {
  eventType: 'wedding' | 'engagement' | 'portrait' | 'commercial' | 'family';
  photographyStyle: string; // Style ID or name
  eventDetails: {
    date: string;
    location: string;
    duration: number; // minutes
    guestCount?: number;
    specialRequests?: string[];
    budgetLevel?: 'basic' | 'standard' | 'premium' | 'luxury';
  };
  preferences: {
    mustHaveShots: string[];
    avoidShots: string[];
    priorityLevel: 'essential' | 'comprehensive' | 'extensive';
    clientPersonality: 'traditional' | 'modern' | 'adventurous' | 'intimate';
  };
  technicalRequirements: {
    equipment?: string[];
    lightingConditions?: 'natural' | 'mixed' | 'indoor' | 'low-light';
    deliveryFormat?: 'digital' | 'print' | 'both';
  };
}

export interface GeneratedShotCategory {
  categoryName: string;
  description: string;
  estimatedDuration: number; // minutes
  priority: 'critical' | 'high' | 'medium' | 'low';
  shots: GeneratedShot[];
  equipmentNeeded: string[];
  lightingRequirements: string[];
  locationNotes: string;
}

export interface GeneratedShot {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'must-have' | 'recommended' | 'optional';
  estimatedTime: number; // minutes
  technicalNotes: string;
  compositionTips: string[];
  lightingNotes: string;
  alternativeOptions: string[];
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  bestTiming: string; // 'early', 'midday', 'golden-hour', 'evening', 'any'
}

export interface GeneratedShotList {
  id: string;
  name: string;
  description: string;
  eventType: string;
  photographyStyle: string;
  categories: GeneratedShotCategory[];
  totalEstimatedDuration: number;
  totalShotCount: number;
  timeline: ShotListTimeline[];
  equipmentChecklist: string[];
  aiGenerationNotes: string;
  customizationSuggestions: string[];
}

export interface ShotListTimeline {
  timeSlot: string;
  duration: number;
  categoryName: string;
  shots: string[]; // Shot IDs
  notes: string;
  backupPlans: string[];
}

export interface ShotListTemplate {
  id: string;
  name: string;
  description: string;
  eventType: string;
  shotCategories: any; // JSONB from database
  estimatedDuration: number;
  difficultyLevel: number;
  equipmentRequirements: string[];
  usageCount: number;
}

/**
 * AI-Powered Shot List Generation Service
 */
export class ShotListGeneratorService {
  private readonly aiModel = 'gpt-4-turbo-preview';
  private readonly maxRetries = 3;

  /**
   * Generate a comprehensive shot list using AI
   */
  async generateShotList(
    request: ShotListGenerationRequest,
  ): Promise<GeneratedShotList> {
    try {
      // Get relevant templates and style information
      const templates = await this.getRelevantTemplates(request.eventType);
      const styleInfo = await this.getPhotographyStyleInfo(
        request.photographyStyle,
      );

      // Build AI prompt
      const prompt = this.buildGenerationPrompt(request, templates, styleInfo);

      // Call OpenAI API
      const aiResponse = await openai.chat.completions.create({
        model: this.aiModel,
        messages: [
          {
            role: 'system',
            content: `You are an expert wedding photographer and shot list specialist. Generate comprehensive, professional shot lists that are practical, creative, and tailored to the specific event and style requirements. Always consider timing, logistics, and the flow of the event.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });

      // Parse AI response
      const generatedContent = this.parseAIResponse(
        aiResponse.choices[0].message.content,
      );

      // Structure the shot list
      const shotList = await this.structureShotList(generatedContent, request);

      // Save to database
      await this.saveShotList(shotList, request);

      return shotList;
    } catch (error) {
      console.error('Shot list generation failed:', error);
      throw new Error(`Shot list generation failed: ${error.message}`);
    }
  }

  /**
   * Generate shot list from existing template with customizations
   */
  async generateFromTemplate(
    templateId: string,
    customizations: Partial<ShotListGenerationRequest>,
  ): Promise<GeneratedShotList> {
    try {
      // Get template
      const template = await this.getTemplate(templateId);

      if (!template) {
        throw new Error('Template not found');
      }

      // Merge template with customizations
      const request: ShotListGenerationRequest = {
        eventType: template.eventType as any,
        photographyStyle:
          customizations.photographyStyle || 'classic-traditional',
        eventDetails: customizations.eventDetails || {
          date: new Date().toISOString().split('T')[0],
          location: 'TBD',
          duration: template.estimatedDuration,
        },
        preferences: customizations.preferences || {
          mustHaveShots: [],
          avoidShots: [],
          priorityLevel: 'comprehensive',
          clientPersonality: 'traditional',
        },
        technicalRequirements: customizations.technicalRequirements || {
          equipment: template.equipmentRequirements,
          lightingConditions: 'mixed',
          deliveryFormat: 'digital',
        },
      };

      // Generate enhanced shot list
      return await this.generateShotList(request);
    } catch (error) {
      console.error('Template-based generation failed:', error);
      throw error;
    }
  }

  /**
   * Customize existing shot list based on feedback
   */
  async customizeShotList(
    shotListId: string,
    customizations: {
      addShots?: string[];
      removeShots?: string[];
      modifyPriorities?: { shotId: string; newPriority: string }[];
      adjustTiming?: { categoryName: string; newDuration: number }[];
      additionalNotes?: string;
    },
  ): Promise<GeneratedShotList> {
    try {
      // Get existing shot list
      const existingShotList = await this.getShotListById(shotListId);

      if (!existingShotList) {
        throw new Error('Shot list not found');
      }

      // Apply customizations
      const customizedShotList = this.applyCustomizations(
        existingShotList,
        customizations,
      );

      // Update in database
      await this.updateShotList(customizedShotList);

      return customizedShotList;
    } catch (error) {
      console.error('Shot list customization failed:', error);
      throw error;
    }
  }

  /**
   * Generate timeline for shot list execution
   */
  generateOptimalTimeline(
    shotList: GeneratedShotList,
    eventDuration: number,
  ): ShotListTimeline[] {
    const timeline: ShotListTimeline[] = [];
    let currentTime = 0;

    // Sort categories by priority and logical flow
    const sortedCategories = [...shotList.categories].sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const category of sortedCategories) {
      if (currentTime + category.estimatedDuration <= eventDuration) {
        timeline.push({
          timeSlot: this.formatTimeSlot(
            currentTime,
            category.estimatedDuration,
          ),
          duration: category.estimatedDuration,
          categoryName: category.categoryName,
          shots: category.shots.map((s) => s.id),
          notes: category.locationNotes,
          backupPlans: this.generateBackupPlans(category),
        });

        currentTime += category.estimatedDuration;
      }
    }

    return timeline;
  }

  // Private helper methods

  private buildGenerationPrompt(
    request: ShotListGenerationRequest,
    templates: ShotListTemplate[],
    styleInfo: any,
  ): string {
    return `Generate a comprehensive photography shot list for the following event:

EVENT DETAILS:
- Type: ${request.eventType}
- Photography Style: ${request.photographyStyle}
- Date: ${request.eventDetails.date}
- Location: ${request.eventDetails.location}
- Duration: ${request.eventDetails.duration} minutes
- Guest Count: ${request.eventDetails.guestCount || 'Not specified'}
- Budget Level: ${request.eventDetails.budgetLevel || 'standard'}

CLIENT PREFERENCES:
- Must-have shots: ${request.preferences.mustHaveShots.join(', ') || 'None specified'}
- Shots to avoid: ${request.preferences.avoidShots.join(', ') || 'None specified'}
- Priority level: ${request.preferences.priorityLevel}
- Client personality: ${request.preferences.clientPersonality}

TECHNICAL REQUIREMENTS:
- Equipment: ${request.technicalRequirements.equipment?.join(', ') || 'Standard DSLR setup'}
- Lighting conditions: ${request.technicalRequirements.lightingConditions}
- Delivery format: ${request.technicalRequirements.deliveryFormat}

STYLE CHARACTERISTICS:
${styleInfo ? JSON.stringify(styleInfo, null, 2) : 'Classic traditional approach'}

Please generate a detailed shot list with the following structure:
1. Organized by logical categories (preparation, ceremony, reception, etc.)
2. Each shot should include:
   - Clear name and description
   - Priority level (must-have, recommended, optional)
   - Estimated time needed
   - Technical and composition notes
   - Best timing for the shot
3. Include equipment recommendations
4. Provide a suggested timeline
5. Add backup options for challenging conditions

Format the response as structured JSON that can be parsed programmatically.`;
  }

  private async getRelevantTemplates(
    eventType: string,
  ): Promise<ShotListTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('shot_list_templates')
        .select('*')
        .eq('event_type', eventType)
        .eq('is_public', true)
        .order('usage_count', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching templates:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get templates:', error);
      return [];
    }
  }

  private async getPhotographyStyleInfo(styleName: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('photography_styles')
        .select('*')
        .eq('name', styleName)
        .single();

      if (error) {
        console.error('Error fetching style info:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get style info:', error);
      return null;
    }
  }

  private parseAIResponse(content: string | null): any {
    if (!content) {
      throw new Error('Empty AI response');
    }

    try {
      // Extract JSON from response
      const jsonMatch = content.match(/```json\n?(.*?)\n?```/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to parse the entire content as JSON
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse AI response:', error);

      // Fallback: create a basic structure
      return {
        categories: [
          {
            categoryName: 'Essential Shots',
            description: 'Core shots for the event',
            shots: [
              {
                name: 'Main Event Coverage',
                description: 'Key moments and highlights',
                priority: 'must-have',
                estimatedTime: 30,
              },
            ],
          },
        ],
      };
    }
  }

  private async structureShotList(
    generatedContent: any,
    request: ShotListGenerationRequest,
  ): Promise<GeneratedShotList> {
    const categories: GeneratedShotCategory[] = [];
    let totalDuration = 0;
    let totalShots = 0;

    // Process AI-generated categories
    if (generatedContent.categories) {
      for (const cat of generatedContent.categories) {
        const shots: GeneratedShot[] =
          cat.shots?.map((shot: any, index: number) => ({
            id: `shot_${Date.now()}_${index}`,
            name: shot.name || 'Untitled Shot',
            description: shot.description || 'Shot description',
            category: cat.categoryName,
            priority: shot.priority || 'recommended',
            estimatedTime: shot.estimatedTime || 5,
            technicalNotes: shot.technicalNotes || 'Standard settings',
            compositionTips: shot.compositionTips || ['Rule of thirds'],
            lightingNotes: shot.lightingNotes || 'Available light',
            alternativeOptions: shot.alternativeOptions || [],
            difficultyLevel: shot.difficultyLevel || 2,
            bestTiming: shot.bestTiming || 'any',
          })) || [];

        const categoryDuration = shots.reduce(
          (sum, shot) => sum + shot.estimatedTime,
          0,
        );

        categories.push({
          categoryName: cat.categoryName,
          description: cat.description || 'Category description',
          estimatedDuration: categoryDuration,
          priority: cat.priority || 'medium',
          shots,
          equipmentNeeded: cat.equipmentNeeded || [
            'DSLR camera',
            'Standard lens',
          ],
          lightingRequirements: cat.lightingRequirements || ['Natural light'],
          locationNotes: cat.locationNotes || 'Flexible location',
        });

        totalDuration += categoryDuration;
        totalShots += shots.length;
      }
    }

    return {
      id: `shot_list_${Date.now()}`,
      name: `${request.eventType} Shot List - ${request.photographyStyle}`,
      description: `AI-generated shot list for ${request.eventType} in ${request.photographyStyle} style`,
      eventType: request.eventType,
      photographyStyle: request.photographyStyle,
      categories,
      totalEstimatedDuration: totalDuration,
      totalShotCount: totalShots,
      timeline: this.generateOptimalTimeline(
        {
          categories,
          totalEstimatedDuration: totalDuration,
        } as GeneratedShotList,
        request.eventDetails.duration,
      ),
      equipmentChecklist: this.generateEquipmentChecklist(categories),
      aiGenerationNotes:
        'Generated using AI based on event requirements and style preferences',
      customizationSuggestions: this.generateCustomizationSuggestions(request),
    };
  }

  private async getTemplate(
    templateId: string,
  ): Promise<ShotListTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('shot_list_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        console.error('Error fetching template:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get template:', error);
      return null;
    }
  }

  private async getShotListById(
    shotListId: string,
  ): Promise<GeneratedShotList | null> {
    try {
      const { data, error } = await supabase
        .from('shot_lists')
        .select('*')
        .eq('id', shotListId)
        .single();

      if (error) {
        console.error('Error fetching shot list:', error);
        return null;
      }

      // Convert database format to GeneratedShotList format
      return this.convertDbToShotList(data);
    } catch (error) {
      console.error('Failed to get shot list:', error);
      return null;
    }
  }

  private convertDbToShotList(data: any): GeneratedShotList {
    // Convert database JSONB format to typed structure
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      eventType: data.event_type || 'wedding',
      photographyStyle: data.photography_style || 'classic-traditional',
      categories: data.shots?.categories || [],
      totalEstimatedDuration: data.shots?.totalDuration || 0,
      totalShotCount: data.shots?.totalShots || 0,
      timeline: data.estimated_timeline || [],
      equipmentChecklist: data.shots?.equipment || [],
      aiGenerationNotes: data.ai_analysis?.notes || '',
      customizationSuggestions: data.ai_analysis?.suggestions || [],
    };
  }

  private applyCustomizations(
    shotList: GeneratedShotList,
    customizations: any,
  ): GeneratedShotList {
    const customized = { ...shotList };

    // Add new shots
    if (customizations.addShots) {
      // Implementation would add shots to appropriate categories
    }

    // Remove shots
    if (customizations.removeShots) {
      customized.categories = customized.categories.map((cat) => ({
        ...cat,
        shots: cat.shots.filter(
          (shot) => !customizations.removeShots.includes(shot.id),
        ),
      }));
    }

    // Modify priorities
    if (customizations.modifyPriorities) {
      for (const priorityChange of customizations.modifyPriorities) {
        for (const category of customized.categories) {
          const shot = category.shots.find(
            (s) => s.id === priorityChange.shotId,
          );
          if (shot) {
            shot.priority = priorityChange.newPriority as any;
          }
        }
      }
    }

    return customized;
  }

  private async saveShotList(
    shotList: GeneratedShotList,
    request: ShotListGenerationRequest,
  ): Promise<void> {
    try {
      const { error } = await supabase.from('shot_lists').insert({
        name: shotList.name,
        description: shotList.description,
        shots: {
          categories: shotList.categories,
          totalDuration: shotList.totalEstimatedDuration,
          totalShots: shotList.totalShotCount,
          equipment: shotList.equipmentChecklist,
        },
        ai_analysis: {
          notes: shotList.aiGenerationNotes,
          suggestions: shotList.customizationSuggestions,
        },
        generation_criteria: request,
        estimated_timeline: shotList.timeline,
        status: 'draft',
      });

      if (error) {
        console.error('Error saving shot list:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to save shot list:', error);
      throw error;
    }
  }

  private async updateShotList(shotList: GeneratedShotList): Promise<void> {
    try {
      const { error } = await supabase
        .from('shot_lists')
        .update({
          shots: {
            categories: shotList.categories,
            totalDuration: shotList.totalEstimatedDuration,
            totalShots: shotList.totalShotCount,
            equipment: shotList.equipmentChecklist,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', shotList.id);

      if (error) {
        console.error('Error updating shot list:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update shot list:', error);
      throw error;
    }
  }

  private generateEquipmentChecklist(
    categories: GeneratedShotCategory[],
  ): string[] {
    const equipment = new Set<string>();

    categories.forEach((cat) => {
      cat.equipmentNeeded.forEach((item) => equipment.add(item));
    });

    return Array.from(equipment).sort();
  }

  private generateCustomizationSuggestions(
    request: ShotListGenerationRequest,
  ): string[] {
    const suggestions = [];

    if (request.preferences.priorityLevel === 'essential') {
      suggestions.push('Consider adding more creative shots for variety');
    }

    if (
      request.eventDetails.guestCount &&
      request.eventDetails.guestCount > 150
    ) {
      suggestions.push('Include crowd shots and wide-angle ceremony coverage');
    }

    if (request.preferences.clientPersonality === 'adventurous') {
      suggestions.push(
        'Add unconventional angles and creative composition shots',
      );
    }

    return suggestions;
  }

  private formatTimeSlot(startTime: number, duration: number): string {
    const start = Math.floor(startTime / 60);
    const end = Math.floor((startTime + duration) / 60);
    return `${start}:${(startTime % 60).toString().padStart(2, '0')} - ${end}:${((startTime + duration) % 60).toString().padStart(2, '0')}`;
  }

  private generateBackupPlans(category: GeneratedShotCategory): string[] {
    return [
      'Indoor alternative if weather is poor',
      'Available light alternative if flash fails',
      'Alternative composition if space is limited',
    ];
  }
}

// Export singleton instance
export const shotListGenerator = new ShotListGeneratorService();

// Export convenience methods
export const generateShotList = (request: ShotListGenerationRequest) =>
  shotListGenerator.generateShotList(request);

export const generateFromTemplate = (
  templateId: string,
  customizations: Partial<ShotListGenerationRequest>,
) => shotListGenerator.generateFromTemplate(templateId, customizations);

export const customizeShotList = (shotListId: string, customizations: any) =>
  shotListGenerator.customizeShotList(shotListId, customizations);
