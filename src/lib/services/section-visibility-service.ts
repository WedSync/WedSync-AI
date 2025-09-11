import { createClient } from '@supabase/supabase-js';
import {
  sectionVisibilityEngine,
  type VisibilityRule,
  type ClientContext,
} from '../section-visibility-engine';
import { differenceInDays, addDays, isBefore, isAfter } from 'date-fns';

interface SectionVisibilityRule {
  id: string;
  supplier_id: string;
  section_id: string;
  rule_type: string;
  condition_field: string;
  operator: string;
  condition_value: any;
  logic_operator?: 'and' | 'or';
  description?: string;
  priority: number;
  is_active: boolean;
  cache_duration_minutes?: number;
}

interface ClientMilestone {
  client_id: string;
  milestone_key: string;
  completed_at: Date;
  completed_by?: string;
  auto_completed: boolean;
}

interface WeddingMilestone {
  milestone_key: string;
  name: string;
  description: string;
  days_from_wedding: number;
  category: string;
  suggested_actions: string[];
  forms_to_trigger: string[];
  content_to_reveal: string[];
}

class SectionVisibilityService {
  private supabase: any;
  private processQueue = new Map<string, NodeJS.Timeout>();

  constructor(supabaseClient?: any) {
    this.supabase =
      supabaseClient ||
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
  }

  /**
   * Evaluate section visibility for a specific client
   */
  async evaluateSectionVisibility(
    sectionId: string,
    clientId: string,
    options: {
      useCache?: boolean;
      debugMode?: boolean;
    } = {},
  ): Promise<{
    visible: boolean;
    reason: string;
    matchedRules: string[];
    cacheExpiry?: Date;
  }> {
    const { useCache = true, debugMode = false } = options;

    try {
      // Check cache first
      if (useCache) {
        const cached = await this.getCachedVisibility(sectionId, clientId);
        if (cached && cached.expires_at > new Date()) {
          return {
            visible: cached.is_visible,
            reason: cached.visibility_reason || 'Cached result',
            matchedRules: cached.matched_rules || [],
            cacheExpiry: new Date(cached.expires_at),
          };
        }
      }

      // Get section rules
      const rules = await this.getSectionVisibilityRules(sectionId);
      if (rules.length === 0) {
        return {
          visible: true,
          reason: 'No visibility rules defined',
          matchedRules: [],
        };
      }

      // Get client context
      const clientContext = await this.buildClientContext(clientId);
      if (!clientContext) {
        return {
          visible: false,
          reason: 'Client not found',
          matchedRules: [],
        };
      }

      // Convert database rules to engine format
      const engineRules: VisibilityRule[] = rules.map((rule) => ({
        id: rule.id,
        type: rule.rule_type as any,
        condition: rule.condition_field,
        value: rule.condition_value,
        operator: rule.operator as any,
        logic: rule.logic_operator,
        description: rule.description,
        isActive: rule.is_active,
        priority: rule.priority,
      }));

      // Evaluate with visibility engine
      const result = await sectionVisibilityEngine.evaluateSection(
        engineRules,
        clientContext,
        debugMode,
      );

      // Cache the result
      if (result.cacheable && useCache) {
        await this.cacheVisibilityResult(
          sectionId,
          clientId,
          result,
          clientContext,
        );
      }

      return {
        visible: result.visible,
        reason: result.reason,
        matchedRules: result.matchedRules,
        cacheExpiry: result.cacheExpiry,
      };
    } catch (error) {
      console.error('Section visibility evaluation error:', error);
      return {
        visible: true, // Fail open for safety
        reason: `Evaluation error: ${error.message}`,
        matchedRules: [],
      };
    }
  }

  /**
   * Process milestone completion and update affected sections
   */
  async processMilestoneCompletion(
    clientId: string,
    milestoneKey: string,
    completedBy?: string,
    autoCompleted = false,
  ): Promise<{
    milestonesCompleted: number;
    sectionsUpdated: number;
    newlyVisibleSections: string[];
  }> {
    try {
      // Record milestone completion
      await this.supabase.from('client_milestone_completion').upsert(
        {
          client_id: clientId,
          milestone_key: milestoneKey,
          completed_by: completedBy,
          auto_completed: autoCompleted,
          completed_at: new Date().toISOString(),
        },
        {
          onConflict: 'client_id,milestone_key',
        },
      );

      // Get milestone details
      const { data: milestone } = await this.supabase
        .from('wedding_milestones')
        .select('*')
        .eq('milestone_key', milestoneKey)
        .single();

      if (!milestone) {
        throw new Error(`Milestone ${milestoneKey} not found`);
      }

      // Invalidate visibility cache for this client
      await this.invalidateClientVisibilityCache(clientId);

      // Get all sections that might be affected by this milestone
      const affectedSections =
        await this.getSectionsAffectedByMilestone(milestoneKey);

      const newlyVisibleSections: string[] = [];
      let sectionsUpdated = 0;

      // Re-evaluate visibility for affected sections
      for (const sectionId of affectedSections) {
        const previousVisibility = await this.getCachedVisibility(
          sectionId,
          clientId,
        );
        const newVisibility = await this.evaluateSectionVisibility(
          sectionId,
          clientId,
          { useCache: false },
        );

        if (
          newVisibility.visible &&
          (!previousVisibility || !previousVisibility.is_visible)
        ) {
          newlyVisibleSections.push(sectionId);
        }

        if (
          !previousVisibility ||
          previousVisibility.is_visible !== newVisibility.visible
        ) {
          sectionsUpdated++;
        }
      }

      // Trigger content reveals if specified in milestone
      if (
        milestone.content_to_reveal &&
        milestone.content_to_reveal.length > 0
      ) {
        await this.triggerContentReveal(clientId, milestone.content_to_reveal);
      }

      // Trigger forms if specified in milestone
      if (milestone.forms_to_trigger && milestone.forms_to_trigger.length > 0) {
        await this.triggerFormActivation(clientId, milestone.forms_to_trigger);
      }

      return {
        milestonesCompleted: 1,
        sectionsUpdated,
        newlyVisibleSections,
      };
    } catch (error) {
      console.error('Milestone processing error:', error);
      throw error;
    }
  }

  /**
   * Auto-complete milestones based on wedding date
   */
  async processTimelineMilestones(
    clientId: string,
    weddingDate: Date,
  ): Promise<{
    milestonesCompleted: number;
    sectionsUpdated: number;
    newlyVisibleSections: string[];
  }> {
    try {
      const daysUntilWedding = differenceInDays(weddingDate, new Date());

      // Get milestones that should be auto-completed
      const { data: milestones } = await this.supabase
        .from('wedding_milestones')
        .select('*')
        .lte('days_from_wedding', -daysUntilWedding)
        .eq('is_system_milestone', true);

      if (!milestones || milestones.length === 0) {
        return {
          milestonesCompleted: 0,
          sectionsUpdated: 0,
          newlyVisibleSections: [],
        };
      }

      // Get already completed milestones
      const { data: completed } = await this.supabase
        .from('client_milestone_completion')
        .select('milestone_key')
        .eq('client_id', clientId);

      const completedKeys = new Set(
        completed?.map((c) => c.milestone_key) || [],
      );
      const milestonesToComplete = milestones.filter(
        (m) => !completedKeys.has(m.milestone_key),
      );

      let totalSectionsUpdated = 0;
      const allNewlyVisibleSections: string[] = [];

      // Process each milestone
      for (const milestone of milestonesToComplete) {
        const result = await this.processMilestoneCompletion(
          clientId,
          milestone.milestone_key,
          'system',
          true,
        );

        totalSectionsUpdated += result.sectionsUpdated;
        allNewlyVisibleSections.push(...result.newlyVisibleSections);
      }

      return {
        milestonesCompleted: milestonesToComplete.length,
        sectionsUpdated: totalSectionsUpdated,
        newlyVisibleSections: [...new Set(allNewlyVisibleSections)],
      };
    } catch (error) {
      console.error('Timeline milestone processing error:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic milestone processing
   */
  async scheduleAutomaticMilestoneProcessing(
    clientId: string,
    weddingDate: Date,
  ): Promise<void> {
    // Cancel existing schedule
    const existingSchedule = this.processQueue.get(clientId);
    if (existingSchedule) {
      clearTimeout(existingSchedule);
    }

    // Calculate next milestone date
    const { data: milestones } = await this.supabase
      .from('wedding_milestones')
      .select('milestone_key, days_from_wedding')
      .eq('is_system_milestone', true)
      .order('days_from_wedding', { ascending: false });

    if (!milestones) return;

    const daysUntilWedding = differenceInDays(weddingDate, new Date());
    const nextMilestone = milestones.find(
      (m) => m.days_from_wedding > -daysUntilWedding,
    );

    if (nextMilestone) {
      const nextMilestoneDate = addDays(
        weddingDate,
        nextMilestone.days_from_wedding,
      );
      const msUntilMilestone =
        nextMilestoneDate.getTime() - new Date().getTime();

      // Schedule processing (with a maximum of 7 days to prevent excessive delays)
      const maxDelay = 7 * 24 * 60 * 60 * 1000; // 7 days
      const delay = Math.min(msUntilMilestone, maxDelay);

      if (delay > 0) {
        const timeout = setTimeout(async () => {
          await this.processTimelineMilestones(clientId, weddingDate);
          this.processQueue.delete(clientId);
        }, delay);

        this.processQueue.set(clientId, timeout);
      }
    }
  }

  /**
   * Get section visibility rules from database
   */
  private async getSectionVisibilityRules(
    sectionId: string,
  ): Promise<SectionVisibilityRule[]> {
    const { data, error } = await this.supabase
      .from('section_visibility_rules')
      .select('*')
      .eq('section_id', sectionId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch visibility rules: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Build client context for visibility evaluation
   */
  private async buildClientContext(
    clientId: string,
  ): Promise<ClientContext | null> {
    // Get client data
    const { data: client } = await this.supabase
      .from('clients')
      .select(
        `
        id,
        wedding_date,
        budget,
        guest_count,
        venue_type,
        wedding_style,
        package_level,
        booking_date,
        last_activity_at,
        custom_fields
      `,
      )
      .eq('id', clientId)
      .single();

    if (!client) return null;

    // Get completed forms
    const { data: forms } = await this.supabase
      .from('form_submissions')
      .select('form_type')
      .eq('client_id', clientId)
      .eq('status', 'completed');

    // Get completed milestones
    const { data: milestones } = await this.supabase
      .from('client_milestone_completion')
      .select('milestone_key')
      .eq('client_id', clientId);

    return {
      id: client.id,
      weddingDate: client.wedding_date
        ? new Date(client.wedding_date)
        : undefined,
      packageLevel: client.package_level,
      budget: client.budget,
      guestCount: client.guest_count,
      venueType: client.venue_type,
      weddingStyle: client.wedding_style,
      completedForms: forms?.map((f) => f.form_type) || [],
      completedMilestones: milestones?.map((m) => m.milestone_key) || [],
      customFields: client.custom_fields || {},
      bookingDate: client.booking_date
        ? new Date(client.booking_date)
        : undefined,
      lastActivity: client.last_activity_at
        ? new Date(client.last_activity_at)
        : undefined,
    };
  }

  /**
   * Cache visibility result
   */
  private async cacheVisibilityResult(
    sectionId: string,
    clientId: string,
    result: any,
    context: ClientContext,
  ): Promise<void> {
    const contextHash = this.generateContextHash(context);
    const expiresAt = result.cacheExpiry || addDays(new Date(), 1);

    await this.supabase.from('section_visibility_cache').upsert(
      {
        client_id: clientId,
        section_id: sectionId,
        is_visible: result.visible,
        visibility_reason: result.reason,
        matched_rules: result.matchedRules,
        context_hash: contextHash,
        expires_at: expiresAt.toISOString(),
        cached_at: new Date().toISOString(),
      },
      {
        onConflict: 'client_id,section_id,context_hash',
      },
    );
  }

  /**
   * Get cached visibility result
   */
  private async getCachedVisibility(sectionId: string, clientId: string) {
    const { data } = await this.supabase
      .from('section_visibility_cache')
      .select('*')
      .eq('client_id', clientId)
      .eq('section_id', sectionId)
      .gt('expires_at', new Date().toISOString())
      .order('cached_at', { ascending: false })
      .limit(1)
      .single();

    return data;
  }

  /**
   * Invalidate visibility cache for client
   */
  private async invalidateClientVisibilityCache(
    clientId: string,
  ): Promise<void> {
    await this.supabase
      .from('section_visibility_cache')
      .delete()
      .eq('client_id', clientId);
  }

  /**
   * Get sections affected by milestone
   */
  private async getSectionsAffectedByMilestone(
    milestoneKey: string,
  ): Promise<string[]> {
    const { data } = await this.supabase
      .from('section_visibility_rules')
      .select('section_id')
      .or(
        `condition_field.eq.${milestoneKey},condition_value.cs.["${milestoneKey}"]`,
      )
      .eq('is_active', true);

    return data?.map((d) => d.section_id) || [];
  }

  /**
   * Trigger content reveal for milestone
   */
  private async triggerContentReveal(
    clientId: string,
    contentTypes: string[],
  ): Promise<void> {
    // This would integrate with content management system
    // For now, just log the action
    console.log(
      `Triggering content reveal for client ${clientId}:`,
      contentTypes,
    );
  }

  /**
   * Trigger form activation for milestone
   */
  private async triggerFormActivation(
    clientId: string,
    formTypes: string[],
  ): Promise<void> {
    // This would integrate with form management system
    // For now, just log the action
    console.log(
      `Triggering form activation for client ${clientId}:`,
      formTypes,
    );
  }

  /**
   * Generate context hash for cache invalidation
   */
  private generateContextHash(context: ClientContext): string {
    const hashData = {
      weddingDate: context.weddingDate?.getTime(),
      packageLevel: context.packageLevel,
      completedForms: context.completedForms?.sort(),
      completedMilestones: context.completedMilestones?.sort(),
      budget: context.budget,
      guestCount: context.guestCount,
    };

    return Buffer.from(JSON.stringify(hashData))
      .toString('base64')
      .slice(0, 64);
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<number> {
    const { data } = await this.supabase
      .from('section_visibility_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    return data?.length || 0;
  }

  /**
   * Get visibility statistics for monitoring
   */
  async getVisibilityStats(supplierId?: string): Promise<{
    totalRules: number;
    activeRules: number;
    cachedResults: number;
    cacheHitRate: number;
  }> {
    let query = this.supabase.from('section_visibility_rules').select('*');

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data: rules } = await query;

    const { data: cache } = await this.supabase
      .from('section_visibility_cache')
      .select('*')
      .gt('expires_at', new Date().toISOString());

    const performanceMetrics = sectionVisibilityEngine.getPerformanceMetrics();

    return {
      totalRules: rules?.length || 0,
      activeRules: rules?.filter((r) => r.is_active).length || 0,
      cachedResults: cache?.length || 0,
      cacheHitRate: performanceMetrics.cacheHitRate,
    };
  }
}

// Export singleton instance
export const sectionVisibilityService = new SectionVisibilityService();
export type { SectionVisibilityRule, ClientMilestone, WeddingMilestone };
