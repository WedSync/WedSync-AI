/**
 * Dashboard Template Service - WS-065 Team B Round 2 Implementation
 * Extends dashboardService.ts patterns for template management
 * Handles CRUD operations, assignment rules, and performance tracking
 */

import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { z } from 'zod';

type SupabaseClient = ReturnType<typeof createClient>;

// Template-related type definitions extending dashboardService patterns
export interface DashboardTemplate {
  id: string;
  supplier_id: string;
  name: string;
  description: string;
  category:
    | 'luxury'
    | 'standard'
    | 'budget'
    | 'destination'
    | 'traditional'
    | 'modern'
    | 'venue_specific'
    | 'photographer'
    | 'planner'
    | 'caterer'
    | 'florist'
    | 'musician';
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  target_criteria: Record<string, any>;
  assignment_rules: any[];
  brand_color: string;
  custom_css?: string;
  logo_url?: string;
  background_image_url?: string;
  cache_duration_minutes: number;
  priority_loading: boolean;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardSection {
  id: string;
  template_id: string;
  section_type: string;
  title: string;
  description: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  is_active: boolean;
  is_required: boolean;
  sort_order: number;
  section_config: Record<string, any>;
  conditional_rules?: any;
  mobile_config?: any;
  tablet_config?: any;
  created_at: string;
  updated_at: string;
}

export interface ClientTemplateAssignment {
  id: string;
  client_id: string;
  template_id: string;
  supplier_id: string;
  assigned_at: string;
  assigned_by?: string;
  assignment_reason: 'automatic' | 'manual' | 'client_preference';
  assignment_criteria?: Record<string, any>;
  custom_sections?: any[];
  custom_branding?: Record<string, any>;
  custom_config?: Record<string, any>;
  is_active: boolean;
  last_rendered_at?: string;
  render_count: number;
  avg_render_time_ms?: number;
}

export interface TemplateAssignmentRule {
  id: string;
  template_id: string;
  supplier_id: string;
  rule_name: string;
  rule_description?: string;
  priority: number;
  is_active: boolean;
  conditions: any[];
  actions: Record<string, any>;
  match_count: number;
  last_matched_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SectionLibraryItem {
  id: string;
  section_type: string;
  name: string;
  description: string;
  category: string;
  default_config: Record<string, any>;
  default_width: number;
  default_height: number;
  wedding_stage?: string[];
  client_types?: string[];
  required_data_sources?: string[];
  api_endpoints?: string[];
  permissions_required?: string[];
  icon_name: string;
  preview_image_url?: string;
  demo_data?: Record<string, any>;
  is_active: boolean;
  is_premium: boolean;
  usage_count: number;
  avg_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface TemplatePerformanceMetrics {
  template_id: string;
  client_id: string;
  render_time_ms: number;
  cache_hit: boolean;
  sections_count: number;
  data_load_time_ms: number;
  page_views: number;
  bounce_rate?: number;
  avg_session_duration?: number;
  error_count: number;
  last_error?: string;
  measured_at: string;
}

// Validation schemas extending dashboardService patterns
const templateCategorySchema = z.enum([
  'luxury',
  'standard',
  'budget',
  'destination',
  'traditional',
  'modern',
  'venue_specific',
  'photographer',
  'planner',
  'caterer',
  'florist',
  'musician',
]);

const sectionTypeSchema = z.enum([
  'welcome',
  'timeline',
  'budget_tracker',
  'vendor_portfolio',
  'guest_list',
  'task_manager',
  'gallery',
  'documents',
  'contracts',
  'payments',
  'communication',
  'booking_calendar',
  'notes',
  'activity_feed',
  'weather',
  'travel_info',
  'rsvp_manager',
  'seating_chart',
  'menu_planning',
  'music_playlist',
  'ceremony_details',
  'reception_details',
  'vendor_contacts',
  'emergency_contacts',
  'countdown',
  'inspiration_board',
  'checklist',
]);

const dashboardTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().min(1, 'Template description is required'),
  category: templateCategorySchema,
  brand_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  priority_loading: z.boolean().default(false),
  cache_duration_minutes: z.number().min(1).max(60).default(5),
  target_criteria: z.record(z.any()).default({}),
  assignment_rules: z.array(z.any()).default([]),
  logo_url: z.string().url().optional(),
  background_image_url: z.string().url().optional(),
  custom_css: z.string().optional(),
});

const dashboardSectionSchema = z.object({
  section_type: sectionTypeSchema,
  title: z.string().min(1, 'Section title is required'),
  description: z.string().optional(),
  position_x: z.number().min(0).max(11),
  position_y: z.number().min(0),
  width: z.number().min(1).max(12),
  height: z.number().min(1).max(12),
  is_active: z.boolean().default(true),
  is_required: z.boolean().default(false),
  sort_order: z.number().default(0),
  section_config: z.record(z.any()).default({}),
  conditional_rules: z.any().optional(),
  mobile_config: z.record(z.any()).optional(),
  tablet_config: z.record(z.any()).optional(),
});

export type CreateTemplateInput = z.infer<typeof dashboardTemplateSchema>;
export type CreateSectionInput = z.infer<typeof dashboardSectionSchema>;

export class DashboardTemplateService {
  private supabase: SupabaseClient;
  private supplierId: string;

  constructor(supabase: SupabaseClient, supplierId: string) {
    this.supabase = supabase;
    this.supplierId = supplierId;
  }

  /**
   * Get all templates for the current supplier
   */
  async getTemplates(filters?: {
    category?: string;
    is_active?: boolean;
    includeUsageStats?: boolean;
  }): Promise<DashboardTemplate[]> {
    let query = this.supabase
      .from('dashboard_templates')
      .select('*')
      .eq('supplier_id', this.supplierId)
      .order('sort_order', { ascending: true });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a specific template with its sections
   */
  async getTemplateById(templateId: string): Promise<{
    template: DashboardTemplate;
    sections: DashboardSection[];
  } | null> {
    // Fetch template and sections in parallel
    const [templateResult, sectionsResult] = await Promise.all([
      this.supabase
        .from('dashboard_templates')
        .select('*')
        .eq('id', templateId)
        .eq('supplier_id', this.supplierId)
        .single(),
      this.supabase
        .from('dashboard_template_sections')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true }),
    ]);

    if (templateResult.error || !templateResult.data) {
      if (templateResult.error.code === 'PGRST116') {
        return null;
      }
      throw new Error(
        `Failed to fetch template: ${templateResult.error.message}`,
      );
    }

    if (sectionsResult.error) {
      throw new Error(
        `Failed to fetch template sections: ${sectionsResult.error.message}`,
      );
    }

    return {
      template: templateResult.data as DashboardTemplate,
      sections: (sectionsResult.data as DashboardSection[]) || [],
    };
  }

  /**
   * Create a new template with sections
   */
  async createTemplate(
    templateData: CreateTemplateInput,
    sections: CreateSectionInput[],
  ): Promise<{ template: DashboardTemplate; sections: DashboardSection[] }> {
    // Validate input data
    const validatedTemplate = dashboardTemplateSchema.parse(templateData);
    const validatedSections = sections.map((section) =>
      dashboardSectionSchema.parse(section),
    );

    // Start transaction
    const { data: template, error: templateError } = await this.supabase
      .from('dashboard_templates')
      .insert({
        ...validatedTemplate,
        supplier_id: this.supplierId,
      })
      .select()
      .single();

    if (templateError) {
      throw new Error(`Failed to create template: ${templateError.message}`);
    }

    // Create sections
    let createdSections: DashboardSection[] = [];
    if (validatedSections.length > 0) {
      const sectionsWithTemplateId = validatedSections.map((section) => ({
        ...section,
        template_id: template.id,
      }));

      const { data: sections, error: sectionsError } = await this.supabase
        .from('dashboard_template_sections')
        .insert(sectionsWithTemplateId)
        .select();

      if (sectionsError) {
        // Clean up template if sections fail
        await this.supabase
          .from('dashboard_templates')
          .delete()
          .eq('id', template.id);

        throw new Error(
          `Failed to create template sections: ${sectionsError.message}`,
        );
      }

      createdSections = sections as DashboardSection[];
    }

    return {
      template: template as DashboardTemplate,
      sections: createdSections,
    };
  }

  /**
   * Update an existing template and its sections
   */
  async updateTemplate(
    templateId: string,
    templateData: Partial<CreateTemplateInput>,
    sections?: CreateSectionInput[],
  ): Promise<{ template: DashboardTemplate; sections: DashboardSection[] }> {
    // Validate template ownership
    const { data: existingTemplate, error: checkError } = await this.supabase
      .from('dashboard_templates')
      .select('id')
      .eq('id', templateId)
      .eq('supplier_id', this.supplierId)
      .single();

    if (checkError || !existingTemplate) {
      throw new Error('Template not found or access denied');
    }

    // Update template
    const { data: updatedTemplate, error: templateError } = await this.supabase
      .from('dashboard_templates')
      .update({
        ...templateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .eq('supplier_id', this.supplierId)
      .select()
      .single();

    if (templateError) {
      throw new Error(`Failed to update template: ${templateError.message}`);
    }

    // Update sections if provided
    let updatedSections: DashboardSection[] = [];
    if (sections) {
      // Delete existing sections
      await this.supabase
        .from('dashboard_template_sections')
        .delete()
        .eq('template_id', templateId);

      // Create new sections
      if (sections.length > 0) {
        const sectionsWithTemplateId = sections.map((section) =>
          dashboardSectionSchema.parse({
            ...section,
            template_id: templateId,
          }),
        );

        const { data: newSections, error: sectionsError } = await this.supabase
          .from('dashboard_template_sections')
          .insert(sectionsWithTemplateId)
          .select();

        if (sectionsError) {
          throw new Error(
            `Failed to update template sections: ${sectionsError.message}`,
          );
        }

        updatedSections = newSections as DashboardSection[];
      }
    } else {
      // Fetch existing sections
      const { data: existingSections } = await this.supabase
        .from('dashboard_template_sections')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true });

      updatedSections = (existingSections as DashboardSection[]) || [];
    }

    return {
      template: updatedTemplate as DashboardTemplate,
      sections: updatedSections,
    };
  }

  /**
   * Delete a template and its associated data
   */
  async deleteTemplate(templateId: string): Promise<void> {
    // Verify ownership
    const { data: template, error: checkError } = await this.supabase
      .from('dashboard_templates')
      .select('id')
      .eq('id', templateId)
      .eq('supplier_id', this.supplierId)
      .single();

    if (checkError || !template) {
      throw new Error('Template not found or access denied');
    }

    // Check if template is assigned to any clients
    const { data: assignments, error: assignmentError } = await this.supabase
      .from('client_template_assignments')
      .select('id')
      .eq('template_id', templateId)
      .eq('is_active', true);

    if (assignmentError) {
      throw new Error(
        `Failed to check template assignments: ${assignmentError.message}`,
      );
    }

    if (assignments && assignments.length > 0) {
      throw new Error(
        'Cannot delete template that is currently assigned to clients',
      );
    }

    // Delete template (cascades to sections and other related data)
    const { error: deleteError } = await this.supabase
      .from('dashboard_templates')
      .delete()
      .eq('id', templateId)
      .eq('supplier_id', this.supplierId);

    if (deleteError) {
      throw new Error(`Failed to delete template: ${deleteError.message}`);
    }
  }

  /**
   * Get section library items
   */
  async getSectionLibrary(filters?: {
    category?: string;
    client_types?: string[];
    wedding_stage?: string;
  }): Promise<SectionLibraryItem[]> {
    let query = this.supabase
      .from('dashboard_section_library')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.client_types && filters.client_types.length > 0) {
      query = query.overlaps('client_types', filters.client_types);
    }

    if (filters?.wedding_stage) {
      query = query.contains('wedding_stage', [filters.wedding_stage]);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch section library: ${error.message}`);
    }

    return (data as SectionLibraryItem[]) || [];
  }

  /**
   * Assign a template to a client
   */
  async assignTemplateToClient(
    clientId: string,
    templateId: string,
    reason: 'automatic' | 'manual' | 'client_preference' = 'manual',
    customizations?: {
      sections?: any[];
      branding?: Record<string, any>;
      config?: Record<string, any>;
    },
  ): Promise<ClientTemplateAssignment> {
    // Verify template ownership
    const { data: template, error: templateError } = await this.supabase
      .from('dashboard_templates')
      .select('id, is_active')
      .eq('id', templateId)
      .eq('supplier_id', this.supplierId)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found or access denied');
    }

    if (!template.is_active) {
      throw new Error('Cannot assign inactive template');
    }

    // Create or update assignment
    const assignmentData = {
      client_id: clientId,
      template_id: templateId,
      supplier_id: this.supplierId,
      assignment_reason: reason,
      custom_sections: customizations?.sections || [],
      custom_branding: customizations?.branding || {},
      custom_config: customizations?.config || {},
      is_active: true,
    };

    const { data: assignment, error: assignmentError } = await this.supabase
      .from('client_template_assignments')
      .upsert(assignmentData, {
        onConflict: 'client_id,supplier_id',
      })
      .select()
      .single();

    if (assignmentError) {
      throw new Error(`Failed to assign template: ${assignmentError.message}`);
    }

    // Update template usage count
    await this.supabase.rpc('increment_template_usage', {
      template_id: templateId,
    });

    return assignment as ClientTemplateAssignment;
  }

  /**
   * Get client's assigned template
   */
  async getClientTemplate(clientId: string): Promise<{
    assignment: ClientTemplateAssignment;
    template: DashboardTemplate;
    sections: DashboardSection[];
  } | null> {
    const { data: assignment, error: assignmentError } = await this.supabase
      .from('client_template_assignments')
      .select(
        `
        *,
        dashboard_templates (*),
        dashboard_template_sections (*)
      `,
      )
      .eq('client_id', clientId)
      .eq('supplier_id', this.supplierId)
      .eq('is_active', true)
      .single();

    if (assignmentError) {
      if (assignmentError.code === 'PGRST116') {
        return null;
      }
      throw new Error(
        `Failed to fetch client template: ${assignmentError.message}`,
      );
    }

    return assignment as any;
  }

  /**
   * Track template performance metrics
   */
  async trackTemplatePerformance(
    templateId: string,
    clientId: string,
    metrics: {
      render_time_ms: number;
      cache_hit?: boolean;
      sections_count?: number;
      data_load_time_ms?: number;
      error_count?: number;
      last_error?: string;
    },
  ): Promise<void> {
    const { error } = await this.supabase
      .from('template_performance_metrics')
      .insert({
        template_id: templateId,
        client_id: clientId,
        ...metrics,
        measured_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to track template performance:', error);
      // Don't throw here as performance tracking shouldn't break functionality
    }

    // Update assignment render count and average render time
    const { error: updateError } = await this.supabase.rpc(
      'update_assignment_render_stats',
      {
        p_client_id: clientId,
        p_template_id: templateId,
        p_render_time: metrics.render_time_ms,
      },
    );

    if (updateError) {
      console.error('Failed to update assignment render stats:', updateError);
    }
  }

  /**
   * Get template performance analytics
   */
  async getTemplateAnalytics(
    templateId?: string,
    dateRange: 'week' | 'month' | 'quarter' = 'month',
  ): Promise<{
    templates: Array<{
      id: string;
      name: string;
      category: string;
      clients_count: number;
      render_count: number;
      avg_render_time: number;
      last_used_at?: string;
      usage_category: 'high_usage' | 'medium_usage' | 'low_usage';
      performance_category: 'fast' | 'medium' | 'slow';
    }>;
    summary: {
      total_templates: number;
      active_assignments: number;
      avg_render_time: number;
      performance_score: number;
    };
  }> {
    // Use materialized view for analytics
    let query = this.supabase
      .from('dashboard_template_analytics')
      .select('*')
      .eq('supplier_id', this.supplierId);

    if (templateId) {
      query = query.eq('id', templateId);
    }

    const { data: analytics, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch template analytics: ${error.message}`);
    }

    const templates = analytics || [];

    const summary = {
      total_templates: templates.length,
      active_assignments: templates.reduce(
        (sum, t) => sum + (t.clients_count || 0),
        0,
      ),
      avg_render_time:
        templates.length > 0
          ? templates.reduce((sum, t) => sum + (t.avg_render_time || 0), 0) /
            templates.length
          : 0,
      performance_score:
        templates.length > 0
          ? (templates.filter((t) => t.performance_category === 'fast').length /
              templates.length) *
            100
          : 0,
    };

    return { templates, summary };
  }

  /**
   * Auto-assign templates based on client characteristics
   */
  async autoAssignTemplate(
    clientId: string,
    clientData: {
      budget_range?: string;
      guest_count?: number;
      venue_type?: string;
      wedding_style?: string;
      package_name?: string;
    },
  ): Promise<ClientTemplateAssignment | null> {
    // Call the database function for template matching
    const { data, error } = await this.supabase.rpc(
      'auto_assign_template_to_client',
      {
        p_client_id: clientId,
        p_supplier_id: this.supplierId,
      },
    );

    if (error) {
      throw new Error(`Failed to auto-assign template: ${error.message}`);
    }

    if (data) {
      // Fetch the created assignment
      const assignment = await this.getClientTemplate(clientId);
      return assignment?.assignment || null;
    }

    return null;
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(
    templateId: string,
    newName: string,
  ): Promise<DashboardTemplate> {
    const existingTemplate = await this.getTemplateById(templateId);

    if (!existingTemplate) {
      throw new Error('Template not found');
    }

    const { template: originalTemplate, sections: originalSections } =
      existingTemplate;

    // Create duplicate template
    const duplicateTemplateData = {
      ...originalTemplate,
      name: newName,
      is_default: false, // Duplicates shouldn't be default
      sort_order: 999, // Put at end
    };

    // Remove id and timestamps
    delete (duplicateTemplateData as any).id;
    delete (duplicateTemplateData as any).created_at;
    delete (duplicateTemplateData as any).updated_at;
    delete (duplicateTemplateData as any).usage_count;
    delete (duplicateTemplateData as any).last_used_at;

    const duplicateSections = originalSections.map((section) => {
      const sectionCopy = { ...section };
      delete (sectionCopy as any).id;
      delete (sectionCopy as any).template_id;
      delete (sectionCopy as any).created_at;
      delete (sectionCopy as any).updated_at;
      return sectionCopy;
    });

    const result = await this.createTemplate(
      duplicateTemplateData as CreateTemplateInput,
      duplicateSections,
    );
    return result.template;
  }
}
