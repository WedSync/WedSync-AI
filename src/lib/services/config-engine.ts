/**
 * WS-212 ConfigEngine - Section Configuration Management Service
 * Central service for managing wedding dashboard section visibility and permissions
 * Handles wedding planner customization of section access per wedding
 */

import { createClient } from '@/lib/supabase/client';
import {
  SectionConfiguration,
  SectionPermission,
  EffectivePermissions,
  SectionType,
  UserRole,
  ConfigContext,
  UpdateSectionConfigRequest,
  DEFAULT_SECTION_PERMISSIONS,
  getDefaultPermissions,
  mergeFieldRestrictions,
} from '@/types/section-config';

export class ConfigEngine {
  private supabase = createClient();

  /**
   * Get section configuration with effective permissions for a user
   */
  async getSectionConfig(
    weddingId: string,
    sectionType: SectionType,
    context: ConfigContext,
  ): Promise<SectionConfiguration | null> {
    try {
      // Get section configuration
      const { data: config, error: configError } = await this.supabase
        .from('section_configurations')
        .select(
          `
          *,
          section_permissions (
            id,
            user_role,
            can_view,
            can_edit,
            can_create,
            can_delete,
            can_export,
            field_restrictions,
            created_at,
            updated_at
          )
        `,
        )
        .eq('wedding_id', weddingId)
        .eq('section_type', sectionType)
        .single();

      if (configError) {
        console.error(
          'ConfigEngine: Error fetching section config:',
          configError,
        );
        return null;
      }

      if (!config) {
        // Return default configuration if none exists
        return this.getDefaultSectionConfig(
          weddingId,
          sectionType,
          context.userId,
        );
      }

      // Transform database response to match interface
      const sectionConfig: SectionConfiguration = {
        id: config.id,
        weddingId: config.wedding_id,
        sectionType: config.section_type as SectionType,
        isVisible: config.is_visible,
        customSettings: config.custom_settings || {},
        visibilityRules: config.visibility_rules || {},
        displayOrder: config.display_order,
        customTitle: config.custom_title || undefined,
        customDescription: config.custom_description || undefined,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
        createdBy: config.created_by,
        updatedBy: config.updated_by || undefined,
        permissions:
          config.section_permissions?.map((p: any) => ({
            id: p.id,
            sectionConfigId: config.id,
            userRole: p.user_role as UserRole,
            canView: p.can_view,
            canEdit: p.can_edit,
            canCreate: p.can_create,
            canDelete: p.can_delete,
            canExport: p.can_export,
            fieldRestrictions: p.field_restrictions || {},
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          })) || [],
      };

      return sectionConfig;
    } catch (error) {
      console.error('ConfigEngine: Failed to get section config:', error);
      return null;
    }
  }

  /**
   * Get all section configurations for a wedding
   */
  async getWeddingSectionConfigs(
    weddingId: string,
    context: ConfigContext,
  ): Promise<SectionConfiguration[]> {
    try {
      const { data: configs, error } = await this.supabase
        .from('section_configurations')
        .select(
          `
          *,
          section_permissions (
            id,
            user_role,
            can_view,
            can_edit,
            can_create,
            can_delete,
            can_export,
            field_restrictions,
            created_at,
            updated_at
          )
        `,
        )
        .eq('wedding_id', weddingId)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('ConfigEngine: Error fetching wedding configs:', error);
        return [];
      }

      return (
        configs?.map((config) => ({
          id: config.id,
          weddingId: config.wedding_id,
          sectionType: config.section_type as SectionType,
          isVisible: config.is_visible,
          customSettings: config.custom_settings || {},
          visibilityRules: config.visibility_rules || {},
          displayOrder: config.display_order,
          customTitle: config.custom_title || undefined,
          customDescription: config.custom_description || undefined,
          createdAt: config.created_at,
          updatedAt: config.updated_at,
          createdBy: config.created_by,
          updatedBy: config.updated_by || undefined,
          permissions:
            config.section_permissions?.map((p: any) => ({
              id: p.id,
              sectionConfigId: config.id,
              userRole: p.user_role as UserRole,
              canView: p.can_view,
              canEdit: p.can_edit,
              canCreate: p.can_create,
              canDelete: p.can_delete,
              canExport: p.can_export,
              fieldRestrictions: p.field_restrictions || {},
              createdAt: p.created_at,
              updatedAt: p.updated_at,
            })) || [],
        })) || []
      );
    } catch (error) {
      console.error(
        'ConfigEngine: Failed to get wedding section configs:',
        error,
      );
      return [];
    }
  }

  /**
   * Calculate effective permissions for a user on a section
   */
  async getEffectivePermissions(
    weddingId: string,
    sectionType: SectionType,
    context: ConfigContext,
  ): Promise<EffectivePermissions> {
    try {
      // Get user's role in this wedding context
      const userRole = await this.getUserRole(context.userId, weddingId);

      // Get section configuration
      const sectionConfig = await this.getSectionConfig(
        weddingId,
        sectionType,
        context,
      );

      if (!sectionConfig || !sectionConfig.isVisible) {
        return {
          canView: false,
          canEdit: false,
          canCreate: false,
          canDelete: false,
          canExport: false,
          fieldRestrictions: {},
          userRole,
        };
      }

      // Find role-based permissions
      const rolePermissions = sectionConfig.permissions?.find(
        (p) => p.userRole === userRole,
      );

      // Use default permissions if none configured
      const defaultPerms = getDefaultPermissions(sectionType, userRole);

      const effectivePermissions: EffectivePermissions = {
        canView: rolePermissions?.canView ?? defaultPerms.canView ?? false,
        canEdit: rolePermissions?.canEdit ?? defaultPerms.canEdit ?? false,
        canCreate:
          rolePermissions?.canCreate ?? defaultPerms.canCreate ?? false,
        canDelete:
          rolePermissions?.canDelete ?? defaultPerms.canDelete ?? false,
        canExport:
          rolePermissions?.canExport ?? defaultPerms.canExport ?? false,
        fieldRestrictions: mergeFieldRestrictions(
          defaultPerms.fieldRestrictions,
          rolePermissions?.fieldRestrictions,
        ),
        userRole,
      };

      return effectivePermissions;
    } catch (error) {
      console.error(
        'ConfigEngine: Failed to get effective permissions:',
        error,
      );
      return {
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canExport: false,
        fieldRestrictions: {},
        userRole: 'guest',
      };
    }
  }

  /**
   * Update section configuration (planner only)
   */
  async updateSectionConfig(
    request: UpdateSectionConfigRequest,
    context: ConfigContext,
  ): Promise<boolean> {
    try {
      // Verify user has permission to configure this wedding
      const canConfigure = await this.verifyConfigurationPermission(
        request.weddingId,
        context.userId,
      );

      if (!canConfigure) {
        console.error('ConfigEngine: User lacks configuration permissions');
        return false;
      }

      // Update or insert section configuration
      const { error } = await this.supabase.rpc(
        'update_section_configuration',
        {
          p_wedding_id: request.weddingId,
          p_section_type: request.sectionType,
          p_is_visible: request.isVisible,
          p_display_order: request.displayOrder,
          p_custom_settings: request.customSettings || {},
          p_custom_title: request.customTitle,
          p_custom_description: request.customDescription,
        },
      );

      if (error) {
        console.error('ConfigEngine: Error updating section config:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('ConfigEngine: Failed to update section config:', error);
      return false;
    }
  }

  /**
   * Initialize default section configurations for a new wedding
   */
  async initializeWeddingSections(
    weddingId: string,
    plannerUserId: string,
  ): Promise<boolean> {
    try {
      const sectionTypes: SectionType[] = [
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

      // Create configurations for each section type
      for (const sectionType of sectionTypes) {
        const { error: configError } = await this.supabase
          .from('section_configurations')
          .insert({
            wedding_id: weddingId,
            section_type: sectionType,
            is_visible: this.getDefaultVisibility(sectionType),
            display_order: sectionTypes.indexOf(sectionType),
            custom_settings: this.getDefaultCustomSettings(sectionType),
            visibility_rules: {},
            created_by: plannerUserId,
            updated_by: plannerUserId,
          });

        if (configError) {
          console.error(
            `ConfigEngine: Error creating ${sectionType} config:`,
            configError,
          );
          continue;
        }

        // Get the created configuration ID
        const { data: createdConfig } = await this.supabase
          .from('section_configurations')
          .select('id')
          .eq('wedding_id', weddingId)
          .eq('section_type', sectionType)
          .single();

        if (createdConfig) {
          // Create default permissions for each role
          await this.createDefaultPermissions(createdConfig.id, sectionType);
        }
      }

      return true;
    } catch (error) {
      console.error(
        'ConfigEngine: Failed to initialize wedding sections:',
        error,
      );
      return false;
    }
  }

  /**
   * Get user's role in the wedding context
   */
  private async getUserRole(
    userId: string,
    weddingId: string,
  ): Promise<UserRole> {
    try {
      // Check if user is the planner
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
        return 'planner';
      }

      // Check if user is part of the couple
      const { data: coupleCheck } = await this.supabase
        .from('weddings')
        .select('couple_user_id, partner_user_id')
        .eq('id', weddingId)
        .single();

      if (
        coupleCheck &&
        (coupleCheck.couple_user_id === userId ||
          coupleCheck.partner_user_id === userId)
      ) {
        return 'couple';
      }

      // Check if user is a vendor
      const { data: vendorCheck } = await this.supabase
        .from('wedding_vendors')
        .select(
          `
          vendor_type,
          vendors!inner (
            organization_id,
            organizations!inner (
              user_profiles!inner (
                user_id
              )
            )
          )
        `,
        )
        .eq('wedding_id', weddingId)
        .eq('vendors.organizations.user_profiles.user_id', userId)
        .single();

      if (vendorCheck) {
        // Return specific vendor role if available
        if (vendorCheck.vendor_type === 'photographer') return 'photographer';
        if (vendorCheck.vendor_type === 'venue') return 'venue';
        return 'vendor';
      }

      // Default to guest
      return 'guest';
    } catch (error) {
      console.error('ConfigEngine: Error determining user role:', error);
      return 'guest';
    }
  }

  /**
   * Verify if user can configure sections for this wedding
   */
  private async verifyConfigurationPermission(
    weddingId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId, weddingId);
      return userRole === 'planner' || userRole === 'admin';
    } catch (error) {
      console.error(
        'ConfigEngine: Error verifying configuration permission:',
        error,
      );
      return false;
    }
  }

  /**
   * Get default section configuration
   */
  private async getDefaultSectionConfig(
    weddingId: string,
    sectionType: SectionType,
    userId: string,
  ): Promise<SectionConfiguration> {
    return {
      id: `temp-${weddingId}-${sectionType}`,
      weddingId,
      sectionType,
      isVisible: this.getDefaultVisibility(sectionType),
      customSettings: this.getDefaultCustomSettings(sectionType),
      visibilityRules: {},
      displayOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId,
      permissions: [],
    };
  }

  /**
   * Get default visibility for section type
   */
  private getDefaultVisibility(sectionType: SectionType): boolean {
    const visibilityDefaults = {
      timeline: true,
      budget: true,
      vendors: true,
      tasks: true,
      photos: true,
      documents: true,
      contracts: false, // Hidden by default - sensitive
      payments: false, // Hidden by default - sensitive
      guests: true,
      analytics: false, // Hidden by default - for planners
    };

    return visibilityDefaults[sectionType] ?? true;
  }

  /**
   * Get default custom settings for section type
   */
  private getDefaultCustomSettings(
    sectionType: SectionType,
  ): Record<string, any> {
    const settingsDefaults = {
      timeline: { defaultView: 'day', showPrivateNotes: false },
      budget: { showTotals: true, showVendorCosts: false, currency: 'GBP' },
      vendors: { showContactInfo: true, showContracts: false },
      tasks: { enableAssignments: true, showDeadlines: true },
      photos: { allowGuestUploads: false, showMetadata: false },
      documents: { allowDownloads: true, requireApproval: false },
      contracts: { showSummaryOnly: true, hideTerms: true },
      payments: { showSchedule: true, hideAmounts: true },
      guests: { showRSVP: true, allowUpdates: true },
      analytics: { realTimeUpdates: true, showTrends: false },
    };

    return settingsDefaults[sectionType] || {};
  }

  /**
   * Create default permissions for a section configuration
   */
  private async createDefaultPermissions(
    sectionConfigId: string,
    sectionType: SectionType,
  ): Promise<void> {
    try {
      const defaultPerms = DEFAULT_SECTION_PERMISSIONS[sectionType];
      const roles: UserRole[] = [
        'planner',
        'couple',
        'vendor',
        'guest',
        'admin',
        'photographer',
        'venue',
      ];

      for (const role of roles) {
        const perms = defaultPerms[role];
        if (perms) {
          const { error } = await this.supabase
            .from('section_permissions')
            .insert({
              section_config_id: sectionConfigId,
              user_role: role,
              can_view: perms.canView ?? false,
              can_edit: perms.canEdit ?? false,
              can_create: perms.canCreate ?? false,
              can_delete: perms.canDelete ?? false,
              can_export: perms.canExport ?? false,
              field_restrictions: perms.fieldRestrictions || {},
            });

          if (error) {
            console.error(
              `ConfigEngine: Error creating ${role} permissions:`,
              error,
            );
          }
        }
      }
    } catch (error) {
      console.error('ConfigEngine: Error creating default permissions:', error);
    }
  }

  /**
   * Apply field restrictions to data based on effective permissions
   */
  filterDataByRestrictions<T extends Record<string, any>>(
    data: T,
    restrictions: EffectivePermissions['fieldRestrictions'],
  ): Partial<T> {
    if (!data || !restrictions) return data;

    const filteredData = { ...data };

    // Hide specified fields
    if (restrictions.hideFields) {
      restrictions.hideFields.forEach((field) => {
        delete filteredData[field];
      });
    }

    // Mask specified fields
    if (restrictions.maskFields) {
      restrictions.maskFields.forEach((field) => {
        if (filteredData[field] !== undefined) {
          filteredData[field] = '***';
        }
      });
    }

    return filteredData;
  }
}
