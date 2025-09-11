/**
 * WS-212 SectionService - High-level Section Management Orchestration
 * Unified service for managing wedding dashboard section visibility and data
 * Handles permission-based data filtering and section orchestration
 */

import { ConfigEngine } from './config-engine';
import { createClient } from '@/lib/supabase/client';
import {
  SectionData,
  SectionConfiguration,
  EffectivePermissions,
  SectionType,
  ConfigContext,
  UpdateSectionConfigRequest,
  hasAnyPermission,
} from '@/types/section-config';

export class SectionService {
  private configEngine: ConfigEngine;
  private supabase = createClient();

  constructor() {
    this.configEngine = new ConfigEngine();
  }

  /**
   * Get section data filtered by user permissions
   * This is the main method frontend components will use
   */
  async getSectionData<T = any>(
    weddingId: string,
    sectionType: SectionType,
    rawData: T,
    context: ConfigContext,
  ): Promise<SectionData<T>> {
    try {
      // Get effective permissions for this user and section
      const permissions = await this.configEngine.getEffectivePermissions(
        weddingId,
        sectionType,
        context,
      );

      // Get section configuration
      const sectionConfig = await this.configEngine.getSectionConfig(
        weddingId,
        sectionType,
        context,
      );

      // If section is not visible or user has no permissions, return empty data
      if (!sectionConfig?.isVisible || !permissions.canView) {
        return {
          sectionType,
          isVisible: false,
          data: null,
          permissions,
          customSettings: sectionConfig?.customSettings || {},
          customTitle: sectionConfig?.customTitle,
          customDescription: sectionConfig?.customDescription,
          displayOrder: sectionConfig?.displayOrder || 0,
          message:
            sectionConfig?.isVisible === false
              ? 'Section is hidden for this wedding'
              : 'You do not have permission to view this section',
        };
      }

      // Filter data based on field restrictions
      let filteredData = rawData;
      if (rawData && permissions.fieldRestrictions) {
        filteredData = this.configEngine.filterDataByRestrictions(
          rawData,
          permissions.fieldRestrictions,
        ) as T;
      }

      // Apply custom visibility rules if any
      if (sectionConfig.visibilityRules && filteredData) {
        filteredData = this.applyVisibilityRules(
          filteredData,
          sectionConfig.visibilityRules,
          permissions,
        );
      }

      return {
        sectionType,
        isVisible: true,
        data: filteredData,
        permissions,
        customSettings: sectionConfig.customSettings,
        customTitle: sectionConfig.customTitle,
        customDescription: sectionConfig.customDescription,
        displayOrder: sectionConfig.displayOrder,
      };
    } catch (error) {
      console.error('SectionService: Error getting section data:', error);
      return {
        sectionType,
        isVisible: false,
        data: null,
        permissions: {
          canView: false,
          canEdit: false,
          canCreate: false,
          canDelete: false,
          canExport: false,
          fieldRestrictions: {},
          userRole: 'guest',
        },
        customSettings: {},
        displayOrder: 0,
        error: 'Failed to load section data',
      };
    }
  }

  /**
   * Get all sections for a wedding dashboard
   * Returns sections ordered by displayOrder with permissions applied
   */
  async getWeddingDashboard(
    weddingId: string,
    context: ConfigContext,
    sectionsData?: Record<SectionType, any>,
  ): Promise<SectionData[]> {
    try {
      // Get all section configurations for the wedding
      const sectionConfigs = await this.configEngine.getWeddingSectionConfigs(
        weddingId,
        context,
      );

      // Process each section and filter by permissions
      const sectionDataPromises = sectionConfigs.map(async (config) => {
        const rawData = sectionsData?.[config.sectionType] || null;
        return this.getSectionData(
          weddingId,
          config.sectionType,
          rawData,
          context,
        );
      });

      const allSections = await Promise.all(sectionDataPromises);

      // Filter out invisible sections and sort by display order
      return allSections
        .filter(
          (section) =>
            section.isVisible && hasAnyPermission(section.permissions),
        )
        .sort((a, b) => a.displayOrder - b.displayOrder);
    } catch (error) {
      console.error('SectionService: Error getting wedding dashboard:', error);
      return [];
    }
  }

  /**
   * Check if user can perform a specific action on a section
   */
  async canPerformAction(
    weddingId: string,
    sectionType: SectionType,
    action: 'view' | 'edit' | 'create' | 'delete' | 'export',
    context: ConfigContext,
  ): Promise<boolean> {
    try {
      const permissions = await this.configEngine.getEffectivePermissions(
        weddingId,
        sectionType,
        context,
      );

      switch (action) {
        case 'view':
          return permissions.canView;
        case 'edit':
          return permissions.canEdit;
        case 'create':
          return permissions.canCreate;
        case 'delete':
          return permissions.canDelete;
        case 'export':
          return permissions.canExport;
        default:
          return false;
      }
    } catch (error) {
      console.error('SectionService: Error checking action permission:', error);
      return false;
    }
  }

  /**
   * Get sections available for configuration (planner view)
   * Returns all section types with their current configuration status
   */
  async getConfigurableSections(
    weddingId: string,
    context: ConfigContext,
  ): Promise<Array<SectionConfiguration & { hasPermissions: boolean }>> {
    try {
      // Verify user can configure sections
      const canConfigure = await this.verifyConfigurationPermission(
        context.userId,
        weddingId,
      );

      if (!canConfigure) {
        throw new Error('User does not have configuration permissions');
      }

      // Get all section configurations
      const sectionConfigs = await this.configEngine.getWeddingSectionConfigs(
        weddingId,
        context,
      );

      // Check which sections have permissions configured
      return sectionConfigs.map((config) => ({
        ...config,
        hasPermissions: (config.permissions?.length || 0) > 0,
      }));
    } catch (error) {
      console.error(
        'SectionService: Error getting configurable sections:',
        error,
      );
      return [];
    }
  }

  /**
   * Update section configuration with validation
   */
  async updateSectionConfiguration(
    request: UpdateSectionConfigRequest,
    context: ConfigContext,
  ): Promise<{
    success: boolean;
    message: string;
    updatedConfig?: SectionConfiguration;
  }> {
    try {
      // Verify user can configure sections
      const canConfigure = await this.verifyConfigurationPermission(
        context.userId,
        request.weddingId,
      );

      if (!canConfigure) {
        return {
          success: false,
          message:
            'You do not have permission to configure sections for this wedding',
        };
      }

      // Validate section type
      const validSectionTypes: SectionType[] = [
        'timeline',
        'budget',
        'vendors',
        'tasks',
        'photos',
        'documents',
        'contracts',
        'payments',
        'guests',
        'analytics',
      ];

      if (!validSectionTypes.includes(request.sectionType)) {
        return {
          success: false,
          message: `Invalid section type: ${request.sectionType}`,
        };
      }

      // Update configuration
      const success = await this.configEngine.updateSectionConfig(
        request,
        context,
      );

      if (!success) {
        return {
          success: false,
          message: 'Failed to update section configuration',
        };
      }

      // Get updated configuration
      const updatedConfig = await this.configEngine.getSectionConfig(
        request.weddingId,
        request.sectionType,
        context,
      );

      return {
        success: true,
        message: 'Section configuration updated successfully',
        updatedConfig: updatedConfig || undefined,
      };
    } catch (error) {
      console.error(
        'SectionService: Error updating section configuration:',
        error,
      );
      return {
        success: false,
        message: 'An error occurred while updating the section configuration',
      };
    }
  }

  /**
   * Initialize sections for a new wedding
   */
  async initializeWeddingSections(
    weddingId: string,
    plannerUserId: string,
  ): Promise<{ success: boolean; message: string; totalSections?: number }> {
    try {
      // Verify the wedding exists and user has access
      const { data: wedding, error: weddingError } = await this.supabase
        .from('weddings')
        .select('id, organization_id')
        .eq('id', weddingId)
        .single();

      if (weddingError || !wedding) {
        return {
          success: false,
          message: 'Wedding not found or access denied',
        };
      }

      // Verify user is planner for this wedding
      const canConfigure = await this.verifyConfigurationPermission(
        plannerUserId,
        weddingId,
      );
      if (!canConfigure) {
        return {
          success: false,
          message:
            'Only wedding planners can initialize section configurations',
        };
      }

      // Check if already initialized
      const { data: existing } = await this.supabase
        .from('section_configurations')
        .select('id')
        .eq('wedding_id', weddingId)
        .limit(1);

      if (existing && existing.length > 0) {
        return {
          success: false,
          message:
            'Section configurations have already been initialized for this wedding',
        };
      }

      // Initialize sections
      const success = await this.configEngine.initializeWeddingSections(
        weddingId,
        plannerUserId,
      );

      if (!success) {
        return {
          success: false,
          message: 'Failed to initialize wedding sections',
        };
      }

      // Count created sections
      const { data: createdSections } = await this.supabase
        .from('section_configurations')
        .select('id')
        .eq('wedding_id', weddingId);

      return {
        success: true,
        message: 'Wedding sections initialized successfully',
        totalSections: createdSections?.length || 0,
      };
    } catch (error) {
      console.error(
        'SectionService: Error initializing wedding sections:',
        error,
      );
      return {
        success: false,
        message: 'An error occurred while initializing wedding sections',
      };
    }
  }

  /**
   * Get section summary for wedding overview
   * Returns count of visible/hidden sections per role
   */
  async getSectionSummary(
    weddingId: string,
    context: ConfigContext,
  ): Promise<{
    totalSections: number;
    visibleSections: number;
    hiddenSections: number;
    rolePermissions: Record<string, { canView: number; canEdit: number }>;
  }> {
    try {
      const sectionConfigs = await this.configEngine.getWeddingSectionConfigs(
        weddingId,
        context,
      );

      const summary = {
        totalSections: sectionConfigs.length,
        visibleSections: sectionConfigs.filter((s) => s.isVisible).length,
        hiddenSections: sectionConfigs.filter((s) => !s.isVisible).length,
        rolePermissions: {} as Record<
          string,
          { canView: number; canEdit: number }
        >,
      };

      // Analyze permissions by role
      const roles = ['couple', 'vendor', 'guest', 'photographer', 'venue'];

      for (const role of roles) {
        let canViewCount = 0;
        let canEditCount = 0;

        for (const config of sectionConfigs) {
          if (!config.isVisible) continue;

          const rolePermission = config.permissions?.find(
            (p) => p.userRole === role,
          );
          if (rolePermission?.canView) canViewCount++;
          if (rolePermission?.canEdit) canEditCount++;
        }

        summary.rolePermissions[role] = {
          canView: canViewCount,
          canEdit: canEditCount,
        };
      }

      return summary;
    } catch (error) {
      console.error('SectionService: Error getting section summary:', error);
      return {
        totalSections: 0,
        visibleSections: 0,
        hiddenSections: 0,
        rolePermissions: {},
      };
    }
  }

  /**
   * Apply custom visibility rules to data
   */
  private applyVisibilityRules<T>(
    data: T,
    visibilityRules: Record<string, any>,
    permissions: EffectivePermissions,
  ): T {
    if (!data || !visibilityRules || typeof data !== 'object') {
      return data;
    }

    const filteredData = { ...data } as any;

    // Apply role-specific rules
    const roleRules = visibilityRules[permissions.userRole];
    if (roleRules && typeof roleRules === 'object') {
      // Hide fields specified for this role
      if (roleRules.hideFields && Array.isArray(roleRules.hideFields)) {
        roleRules.hideFields.forEach((field: string) => {
          delete filteredData[field];
        });
      }

      // Apply custom transformations
      if (
        roleRules.transformations &&
        typeof roleRules.transformations === 'object'
      ) {
        Object.keys(roleRules.transformations).forEach((field) => {
          if (filteredData[field] !== undefined) {
            const transformation = roleRules.transformations[field];

            if (transformation === 'mask') {
              filteredData[field] = '***';
            } else if (
              transformation === 'summarize' &&
              typeof filteredData[field] === 'string'
            ) {
              filteredData[field] =
                filteredData[field].substring(0, 50) + '...';
            }
          }
        });
      }
    }

    return filteredData as T;
  }

  /**
   * Verify if user can configure sections for this wedding
   */
  private async verifyConfigurationPermission(
    userId: string,
    weddingId: string,
  ): Promise<boolean> {
    try {
      // Check if user is a planner for this wedding
      const { data: plannerCheck } = await this.supabase
        .from('weddings')
        .select(
          `
          organization_id,
          organizations!inner (
            user_profiles!inner (
              user_id,
              role
            )
          )
        `,
        )
        .eq('id', weddingId)
        .eq('organizations.user_profiles.user_id', userId)
        .single();

      if (
        plannerCheck &&
        plannerCheck.organizations?.user_profiles?.[0]?.role === 'planner'
      ) {
        return true;
      }

      // Also check if user is admin
      const { data: adminCheck } = await this.supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      return !!adminCheck;
    } catch (error) {
      console.error(
        'SectionService: Error verifying configuration permission:',
        error,
      );
      return false;
    }
  }
}
