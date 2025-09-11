/**
 * User Context Enrichment Service
 * Enriches feature requests with user context and metadata
 */

export interface UserContext {
  userId: string;
  userType: 'couple' | 'vendor' | 'admin';
  subscriptionTier: string;
  accountAge: number;
  activityLevel: 'low' | 'medium' | 'high';
  preferences: Record<string, any>;
}

export interface EnrichedFeatureRequest {
  id: string;
  title: string;
  description: string;
  userContext: UserContext;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  userId: string;
  category?: string;
  priority?: string;
}

export class UserContextEnrichmentService {
  async enrichFeatureRequest(
    request: FeatureRequest,
  ): Promise<EnrichedFeatureRequest> {
    try {
      const userContext = await this.getUserContext(request.userId);
      const priority = this.calculatePriority(request, userContext);
      const tags = this.generateTags(request, userContext);
      const metadata = this.generateMetadata(request, userContext);

      return {
        ...request,
        userContext,
        priority,
        category: request.category || 'general',
        tags,
        metadata,
      };
    } catch (error) {
      console.error('Error enriching feature request:', error);
      throw new Error('Failed to enrich feature request');
    }
  }

  private async getUserContext(userId: string): Promise<UserContext> {
    // TODO: Implement actual user context retrieval
    // This would typically fetch from database and analytics services
    return {
      userId,
      userType: 'couple', // Default placeholder
      subscriptionTier: 'basic',
      accountAge: 30,
      activityLevel: 'medium',
      preferences: {},
    };
  }

  private calculatePriority(
    request: FeatureRequest,
    context: UserContext,
  ): 'low' | 'medium' | 'high' | 'critical' {
    // TODO: Implement priority calculation logic
    if (request.priority) {
      return request.priority as 'low' | 'medium' | 'high' | 'critical';
    }

    // Default priority calculation based on user context
    if (
      context.subscriptionTier === 'premium' &&
      context.activityLevel === 'high'
    ) {
      return 'high';
    }

    return 'medium';
  }

  private generateTags(
    request: FeatureRequest,
    context: UserContext,
  ): string[] {
    const tags: string[] = [];

    // Add user type tag
    tags.push(`user-${context.userType}`);

    // Add subscription tier tag
    tags.push(`tier-${context.subscriptionTier}`);

    // Add activity level tag
    tags.push(`activity-${context.activityLevel}`);

    // Add category tag if available
    if (request.category) {
      tags.push(`category-${request.category}`);
    }

    return tags;
  }

  private generateMetadata(
    request: FeatureRequest,
    context: UserContext,
  ): Record<string, any> {
    return {
      enrichedAt: new Date().toISOString(),
      userAccountAge: context.accountAge,
      userActivityLevel: context.activityLevel,
      subscriptionTier: context.subscriptionTier,
      requestLength: request.description.length,
      hasCategory: !!request.category,
    };
  }
}

export const userContextEnrichmentService = new UserContextEnrichmentService();
