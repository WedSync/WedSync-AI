// WS-119: Portfolio Management Service
// Team B Batch 9 Round 2

import { createClient } from '@/lib/supabase/client';
import type {
  PortfolioProject,
  PortfolioMedia,
  PortfolioTestimonial,
  PortfolioCollection,
  PortfolioSettings,
  PortfolioGalleryLayout,
  PortfolioStats,
  MediaUploadOptions,
  PortfolioFilters,
} from '@/types/portfolio';

export class PortfolioService {
  private supabase = createClient();

  // Portfolio Projects
  async getProjects(vendorId: string, filters?: PortfolioFilters) {
    let query = this.supabase
      .from('portfolio_projects')
      .select(
        `
        *,
        cover_image:portfolio_media!portfolio_projects_cover_image_id_fkey(*),
        media:portfolio_media(*)
      `,
      )
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.featured_only) {
      query = query.eq('featured', true);
    }

    if (filters?.event_type) {
      query = query.eq('event_type', filters.event_type);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    if (filters?.date_range) {
      query = query
        .gte('event_date', filters.date_range.start)
        .lte('event_date', filters.date_range.end);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as PortfolioProject[];
  }

  async getProjectBySlug(vendorId: string, slug: string) {
    const { data, error } = await this.supabase
      .from('portfolio_projects')
      .select(
        `
        *,
        cover_image:portfolio_media!portfolio_projects_cover_image_id_fkey(*),
        media:portfolio_media(*),
        testimonials:portfolio_testimonials(*)
      `,
      )
      .eq('vendor_id', vendorId)
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data as PortfolioProject;
  }

  async createProject(project: Partial<PortfolioProject>) {
    // Generate slug if not provided
    if (!project.slug && project.title) {
      const { data: slugData } = await this.supabase.rpc(
        'generate_portfolio_slug',
        {
          title: project.title,
          vendor_id: project.vendor_id,
        },
      );
      project.slug = slugData;
    }

    const { data, error } = await this.supabase
      .from('portfolio_projects')
      .insert(project)
      .select()
      .single();

    if (error) throw error;
    return data as PortfolioProject;
  }

  async updateProject(projectId: string, updates: Partial<PortfolioProject>) {
    const { data, error } = await this.supabase
      .from('portfolio_projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data as PortfolioProject;
  }

  async deleteProject(projectId: string) {
    const { error } = await this.supabase
      .from('portfolio_projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
  }

  async publishProject(projectId: string) {
    return this.updateProject(projectId, {
      status: 'published',
      published_at: new Date().toISOString(),
    });
  }

  async archiveProject(projectId: string) {
    return this.updateProject(projectId, {
      status: 'archived',
    });
  }

  // Portfolio Media
  async uploadMedia(options: MediaUploadOptions): Promise<PortfolioMedia> {
    const {
      file,
      project_id,
      vendor_id,
      title,
      caption,
      alt_text,
      tags = [],
      is_cover = false,
      onProgress,
    } = options;

    // Upload file to storage
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `portfolio/${vendor_id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('portfolio')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const {
      data: { publicUrl },
    } = this.supabase.storage.from('portfolio').getPublicUrl(filePath);

    // Determine media type
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

    // Create media record
    const mediaData: Partial<PortfolioMedia> = {
      project_id,
      vendor_id,
      media_type: mediaType,
      media_url: publicUrl,
      title: title || file.name,
      caption,
      alt_text,
      file_size: file.size,
      mime_type: file.type,
      tags,
      is_cover,
      organization_id: await this.getOrganizationId(vendor_id),
    };

    // If it's an image, we could get dimensions
    if (mediaType === 'image') {
      await this.getImageDimensions(file)
        .then(({ width, height }) => {
          mediaData.width = width;
          mediaData.height = height;
        })
        .catch(() => {
          // Ignore dimension errors
        });
    }

    const { data, error } = await this.supabase
      .from('portfolio_media')
      .insert(mediaData)
      .select()
      .single();

    if (error) throw error;

    // If marked as cover, update project
    if (is_cover && project_id) {
      await this.supabase
        .from('portfolio_projects')
        .update({ cover_image_id: data.id })
        .eq('id', project_id);
    }

    return data as PortfolioMedia;
  }

  async getMedia(projectId: string) {
    const { data, error } = await this.supabase
      .from('portfolio_media')
      .select('*')
      .eq('project_id', projectId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data as PortfolioMedia[];
  }

  async updateMedia(mediaId: string, updates: Partial<PortfolioMedia>) {
    const { data, error } = await this.supabase
      .from('portfolio_media')
      .update(updates)
      .eq('id', mediaId)
      .select()
      .single();

    if (error) throw error;
    return data as PortfolioMedia;
  }

  async deleteMedia(mediaId: string) {
    // Get media info first
    const { data: media, error: fetchError } = await this.supabase
      .from('portfolio_media')
      .select('media_url')
      .eq('id', mediaId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    if (media?.media_url) {
      const path = media.media_url.split('/').slice(-2).join('/');
      await this.supabase.storage.from('portfolio').remove([path]);
    }

    // Delete record
    const { error } = await this.supabase
      .from('portfolio_media')
      .delete()
      .eq('id', mediaId);

    if (error) throw error;
  }

  async reorderMedia(projectId: string, mediaIds: string[]) {
    const updates = mediaIds.map((id, index) => ({
      id,
      display_order: index,
    }));

    const { error } = await this.supabase
      .from('portfolio_media')
      .upsert(updates);

    if (error) throw error;
  }

  // Portfolio Testimonials
  async getTestimonials(vendorId: string) {
    const { data, error } = await this.supabase
      .from('portfolio_testimonials')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data as PortfolioTestimonial[];
  }

  async createTestimonial(testimonial: Partial<PortfolioTestimonial>) {
    const { data, error } = await this.supabase
      .from('portfolio_testimonials')
      .insert(testimonial)
      .select()
      .single();

    if (error) throw error;
    return data as PortfolioTestimonial;
  }

  async updateTestimonial(
    testimonialId: string,
    updates: Partial<PortfolioTestimonial>,
  ) {
    const { data, error } = await this.supabase
      .from('portfolio_testimonials')
      .update(updates)
      .eq('id', testimonialId)
      .select()
      .single();

    if (error) throw error;
    return data as PortfolioTestimonial;
  }

  async deleteTestimonial(testimonialId: string) {
    const { error } = await this.supabase
      .from('portfolio_testimonials')
      .delete()
      .eq('id', testimonialId);

    if (error) throw error;
  }

  // Portfolio Collections
  async getCollections(vendorId: string) {
    const { data, error } = await this.supabase
      .from('portfolio_collections')
      .select(
        `
        *,
        projects:portfolio_project_collections(
          portfolio_projects(*)
        )
      `,
      )
      .eq('vendor_id', vendorId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data as PortfolioCollection[];
  }

  async createCollection(collection: Partial<PortfolioCollection>) {
    const { data, error } = await this.supabase
      .from('portfolio_collections')
      .insert(collection)
      .select()
      .single();

    if (error) throw error;
    return data as PortfolioCollection;
  }

  async updateCollection(
    collectionId: string,
    updates: Partial<PortfolioCollection>,
  ) {
    const { data, error } = await this.supabase
      .from('portfolio_collections')
      .update(updates)
      .eq('id', collectionId)
      .select()
      .single();

    if (error) throw error;
    return data as PortfolioCollection;
  }

  async deleteCollection(collectionId: string) {
    const { error } = await this.supabase
      .from('portfolio_collections')
      .delete()
      .eq('id', collectionId);

    if (error) throw error;
  }

  async addProjectToCollection(projectId: string, collectionId: string) {
    const { error } = await this.supabase
      .from('portfolio_project_collections')
      .insert({
        project_id: projectId,
        collection_id: collectionId,
      });

    if (error) throw error;
  }

  async removeProjectFromCollection(projectId: string, collectionId: string) {
    const { error } = await this.supabase
      .from('portfolio_project_collections')
      .delete()
      .eq('project_id', projectId)
      .eq('collection_id', collectionId);

    if (error) throw error;
  }

  // Gallery Layouts
  async getGalleryLayouts(vendorId: string) {
    const { data, error } = await this.supabase
      .from('portfolio_gallery_layouts')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PortfolioGalleryLayout[];
  }

  async createGalleryLayout(layout: Partial<PortfolioGalleryLayout>) {
    const { data, error } = await this.supabase
      .from('portfolio_gallery_layouts')
      .insert(layout)
      .select()
      .single();

    if (error) throw error;
    return data as PortfolioGalleryLayout;
  }

  async updateGalleryLayout(
    layoutId: string,
    updates: Partial<PortfolioGalleryLayout>,
  ) {
    const { data, error } = await this.supabase
      .from('portfolio_gallery_layouts')
      .update(updates)
      .eq('id', layoutId)
      .select()
      .single();

    if (error) throw error;
    return data as PortfolioGalleryLayout;
  }

  async setDefaultLayout(vendorId: string, layoutId: string) {
    // First, unset all defaults
    await this.supabase
      .from('portfolio_gallery_layouts')
      .update({ is_default: false })
      .eq('vendor_id', vendorId);

    // Then set the new default
    return this.updateGalleryLayout(layoutId, { is_default: true });
  }

  // Portfolio Settings
  async getSettings(vendorId: string) {
    const { data, error } = await this.supabase
      .from('portfolio_settings')
      .select('*')
      .eq('vendor_id', vendorId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as PortfolioSettings | null;
  }

  async updateSettings(vendorId: string, settings: Partial<PortfolioSettings>) {
    const { data, error } = await this.supabase
      .from('portfolio_settings')
      .upsert({
        ...settings,
        vendor_id: vendorId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PortfolioSettings;
  }

  // Analytics
  async trackView(vendorId: string, projectId?: string, mediaId?: string) {
    await this.supabase.rpc('track_portfolio_view', {
      p_vendor_id: vendorId,
      p_project_id: projectId,
      p_media_id: mediaId,
      p_visitor_id: this.getVisitorId(),
      p_referrer: document.referrer,
    });
  }

  async getStats(vendorId: string): Promise<PortfolioStats> {
    const { data, error } = await this.supabase
      .rpc('get_portfolio_stats', { p_vendor_id: vendorId })
      .single();

    if (error) throw error;
    return data as PortfolioStats;
  }

  async getAnalytics(
    vendorId: string,
    dateRange?: { start: string; end: string },
  ) {
    let query = this.supabase
      .from('portfolio_analytics')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  // Helper functions
  private async getOrganizationId(vendorId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('vendors')
      .select('organization_id')
      .eq('id', vendorId)
      .single();

    if (error) throw error;
    return data.organization_id;
  }

  private getVisitorId(): string {
    let visitorId = localStorage.getItem('portfolio_visitor_id');
    if (!visitorId) {
      visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('portfolio_visitor_id', visitorId);
    }
    return visitorId;
  }

  private getImageDimensions(
    file: File,
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
}

export const portfolioService = new PortfolioService();
